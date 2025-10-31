/**
 * 任务分配服务
 * 
 * 统一管理任务分配相关的所有操作
 */

import { supabase } from '../supabase';
import { TaskAssignment, AssignTaskData } from '@/types/hotel';
import { TaskStatus } from '@/types/task';
import { notifyTaskAssigned } from '../notificationService';

/**
 * 将数据库字段（snake_case）映射为前端类型（camelCase）
 */
function mapTaskAssignmentFromDB(row: any): TaskAssignment {
  return {
    id: row.id,
    taskId: row.task_id,
    cleanerId: row.cleaner_id,
    assignedBy: row.assigned_by,
    assignedAt: row.assigned_at,
    status: row.status,
    notes: row.notes
  };
}

/**
 * 分配任务给清洁员
 */
export async function assignTaskToCleaners(
  assignmentData: AssignTaskData,
  assignedBy: string
): Promise<{ success: boolean; error?: string; assignments?: TaskAssignment[] }> {
  try {
    const assignments = assignmentData.cleanerIds.map(cleanerId => ({
      task_id: assignmentData.taskId,
      cleaner_id: cleanerId,
      assigned_by: assignedBy,
      notes: assignmentData.notes || null
    }));

    const { data, error } = await supabase
      .from('task_assignments')
      .insert(assignments)
      .select();

    if (error) {
      console.error('分配任务失败:', error);
      return { success: false, error: error.message };
    }

    // 更新任务状态为已分配
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ 
        status: 'assigned',
        assigned_cleaners: assignmentData.cleanerIds
      })
      .eq('id', assignmentData.taskId);

    if (updateError) {
      console.error('更新任务状态失败:', updateError);
      // 不返回错误，因为分配已经成功
    }

    console.log('任务分配成功:', data);

    // 发送通知
    try {
      await notifyTaskAssigned(assignmentData.taskId, assignmentData.cleanerIds);
    } catch (notifyError) {
      console.error('发送分配通知失败:', notifyError);
      // 不阻断主流程
    }

    return { 
      success: true, 
      assignments: (data || []).map(mapTaskAssignmentFromDB) 
    };
  } catch (error) {
    console.error('分配任务异常:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '分配任务失败' 
    };
  }
}

/**
 * 获取任务的分配情况
 */
export async function getTaskAssignments(taskId: string): Promise<TaskAssignment[]> {
  try {
    const { data, error } = await supabase
      .from('task_assignments')
      .select(`
        *,
        user_profiles!cleaner_id(id, name, role, avatar)
      `)
      .eq('task_id', taskId)
      .order('assigned_at', { ascending: false });

    if (error) {
      console.error('获取任务分配失败:', error);
      return [];
    }

    // 只返回分配数据，不包含用户信息
    return (data || []).map((row: any) => ({
      id: row.id,
      taskId: row.task_id,
      cleanerId: row.cleaner_id,
      assignedBy: row.assigned_by,
      assignedAt: row.assigned_at,
      status: row.status,
      notes: row.notes
    }));
  } catch (error) {
    console.error('获取任务分配异常:', error);
    return [];
  }
}

/**
 * 获取任务的分配情况（包含用户信息）
 */
export async function getTaskAssignmentsWithUsers(taskId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('task_assignments')
      .select(`
        *,
        user_profiles!cleaner_id(id, name, role, avatar, katakana, phone)
      `)
      .eq('task_id', taskId)
      .order('assigned_at', { ascending: false });

    if (error) {
      console.error('获取任务分配（含用户信息）失败:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('获取任务分配（含用户信息）异常:', error);
    return [];
  }
}

/**
 * 获取清洁员的任务列表
 */
export async function getCleanerTasks(
  cleanerId: string,
  forceRefresh: boolean = false
): Promise<any[]> {
  try {
    let query = supabase
      .from('task_assignments')
      .select(`
        *,
        tasks!inner(*)
      `)
      .eq('cleaner_id', cleanerId)
      .order('assigned_at', { ascending: false });

    // 强制刷新时添加 limit 避免缓存
    if (forceRefresh) {
      query = query.limit(1000);
    }

    const { data, error } = await query;

    if (error) {
      console.error('获取清洁员任务失败:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('获取清洁员任务异常:', error);
    return [];
  }
}

/**
 * 取消任务分配
 */
export async function unassignTask(
  taskId: string,
  cleanerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('task_assignments')
      .delete()
      .eq('task_id', taskId)
      .eq('cleaner_id', cleanerId);

    if (error) {
      console.error('取消任务分配失败:', error);
      return { success: false, error: error.message };
    }

    // 检查是否还有其他分配
    const { count } = await supabase
      .from('task_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('task_id', taskId);

    // 如果没有其他分配，将任务状态改回 open
    if (count === 0) {
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ 
          status: 'open',
          assigned_cleaners: []
        })
        .eq('id', taskId);

      if (updateError) {
        console.error('更新任务状态失败:', updateError);
      }
    } else {
      // 更新 assigned_cleaners 数组
      const { data: remaining } = await supabase
        .from('task_assignments')
        .select('cleaner_id')
        .eq('task_id', taskId);

      if (remaining) {
        const cleanerIds = remaining.map(a => a.cleaner_id);
        const { error: updateError } = await supabase
          .from('tasks')
          .update({ assigned_cleaners: cleanerIds })
          .eq('id', taskId);

        if (updateError) {
          console.error('更新任务分配列表失败:', updateError);
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('取消任务分配异常:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '取消任务分配失败' 
    };
  }
}

