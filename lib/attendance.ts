import { supabase } from './supabase';
import { transitionTask } from './taskStatus';
import type { TaskStatus, UserRole } from '@/types/task';

export interface Attendance {
  id: string;
  task_id: string;
  user_id: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
  created_at: string;
}

// 查询任务的打卡状态
export async function getAttendanceByTaskId(taskId: string): Promise<Attendance[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false }); // 确保获取最新记录
  
  if (error) {
    console.error('Error fetching attendance:', error);
    return [];
  }
  
  return data || [];
}

// 查询用户对特定任务的打卡状态
export async function getUserAttendanceByTaskId(taskId: string, userId: string): Promise<Attendance | null> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('task_id', taskId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (error) {
    console.error('Error fetching user attendance:', error);
    return null;
  }
  
  return data;
}

// 插入出勤记录
export async function checkIn(taskId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('attendance')
    .insert({
      task_id: taskId,
      user_id: userId,
      check_in_time: new Date().toISOString(),
      status: 'checked_in'
    });
  
  if (error) {
    console.error('Error checking in:', error);
    return false;
  }

  await syncTaskStatusWithAttendance(taskId, userId, 'check_in');
  return true;
}

// 插入退勤记录（保留出勤历史）
export async function checkOut(taskId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('attendance')
    .insert({
      task_id: taskId,
      user_id: userId,
      check_out_time: new Date().toISOString(),
      status: 'checked_out'
    });
  
  if (error) {
    console.error('Error checking out:', error);
    return false;
  }

  await syncTaskStatusWithAttendance(taskId, userId, 'check_out');
  return true;
}

// 获取用户最新的打卡状态（用于显示当前状态）
export async function getUserLatestAttendance(taskId: string, userId: string): Promise<'none' | 'checked_in' | 'checked_out'> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('task_id', taskId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (error || !data) {
    return 'none';
  }
  
  return data.status as 'none' | 'checked_in' | 'checked_out';
}

// 计算任务状态
export function calculateTaskStatus(attendanceRecords: Attendance[], assignedCleaners: string[]): '未打卡' | '进行中' | '已完成' {
  const checkedInUsers = new Set(attendanceRecords.filter(record => record.status === 'checked_in').map(record => record.user_id));
  const checkedOutUsers = new Set(attendanceRecords.filter(record => record.status === 'checked_out').map(record => record.user_id));
  
  // 如果所有人员都已退勤，任务完成
  if (checkedOutUsers.size === assignedCleaners.length) {
    return '已完成';
  }
  
  // 如果有人员已出勤但未全部退勤，任务进行中
  if (checkedInUsers.size > 0) {
    return '进行中';
  }
  
  // 否则未打卡
  return '未打卡';
} 

type AttendanceAction = 'check_in' | 'check_out';

async function syncTaskStatusWithAttendance(
  taskId: string,
  userId: string,
  action: AttendanceAction
): Promise<void> {
  try {
    const { data: taskRow, error: taskError } = await supabase
      .from('tasks')
      .select('status, assigned_cleaners')
      .eq('id', taskId)
      .single();

    if (taskError || !taskRow) {
      console.error('获取任务状态失败:', taskError);
      return;
    }

    let currentStatus = taskRow.status as TaskStatus;

    if (currentStatus === 'completed' || currentStatus === 'confirmed') {
      return;
    }

    const cleanerRole: UserRole = 'cleaner';

    if (action === 'check_in') {
      if (currentStatus === 'accepted') {
        const result = await transitionTask(taskId, currentStatus, 'in_progress', userId, cleanerRole, {
          autoTransition: 'check_in'
        });

        if (!result.success) {
          console.warn('自动将任务状态更新为进行中失败:', result.error);
        }
      }
      return;
    }

    const assignedCleaners: string[] = Array.isArray(taskRow.assigned_cleaners)
      ? taskRow.assigned_cleaners.map((id: any) => id?.toString()).filter(Boolean)
      : [];

    if (assignedCleaners.length === 0) {
      return;
    }

    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('attendance')
      .select('user_id, status')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (attendanceError || !attendanceRecords) {
      console.error('获取任务打卡记录失败:', attendanceError);
      return;
    }

    const latestStatusByUser = new Map<string, string>();
    for (const record of attendanceRecords) {
      const uid = record.user_id?.toString();
      if (!uid || latestStatusByUser.has(uid)) continue;
      latestStatusByUser.set(uid, record.status);
    }

    const allCheckedOut = assignedCleaners.every(cleanerId => latestStatusByUser.get(cleanerId) === 'checked_out');

    if (!allCheckedOut) {
      return;
    }

    if (currentStatus === 'accepted') {
      const toInProgress = await transitionTask(taskId, currentStatus, 'in_progress', userId, cleanerRole, {
        autoTransition: 'check_out_promote_in_progress'
      });

      if (!toInProgress.success) {
        console.warn('自动将任务状态更新为进行中失败:', toInProgress.error);
        return;
      }

      currentStatus = 'in_progress';
    }

    if (currentStatus === 'in_progress') {
      const toCompleted = await transitionTask(taskId, currentStatus, 'completed', userId, cleanerRole, {
        autoTransition: 'check_out_complete'
      });

      if (!toCompleted.success) {
        console.warn('自动将任务状态更新为已完成失败:', toCompleted.error);
      }
    }
  } catch (error) {
    console.error('同步任务状态（打卡）失败:', error);
  }
}