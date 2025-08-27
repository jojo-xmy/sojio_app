import { supabase } from './supabase';

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
    .eq('task_id', taskId);
  
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