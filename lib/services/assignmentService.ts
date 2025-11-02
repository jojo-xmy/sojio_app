/**
 * 任务分配服务
 * 
 * 统一管理任务分配相关的所有操作
 */

import { supabase } from '../supabase';
import { TaskAssignment, AssignTaskData } from '@/types/hotel';
import { TaskStatus } from '@/types/task';

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

    // 短暂延迟确保数据库写入完成
    await new Promise(resolve => setTimeout(resolve, 100));

    // 使用新的通知系统发送通知
    try {
      console.log('[分配任务-service] 触发通知发送给清洁员...');
      
      // 获取任务和Manager信息
      const { data: taskData } = await supabase
        .from('tasks')
        .select('*, hotel_id')
        .eq('id', assignmentData.taskId)
        .single();

      const { data: managerData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', assignedBy)
        .single();

      if (taskData && managerData) {
        // 为每个被分配的清洁员发送通知
        for (const cleanerId of assignmentData.cleanerIds) {
          try {
            // 获取清洁员的LINE ID
            const { data: cleanerData } = await supabase
              .from('user_profiles')
              .select('line_user_id, name')
              .eq('id', cleanerId)
              .single();

            if (!cleanerData || !cleanerData.line_user_id) {
              console.log(`[分配任务-service] 清洁员 ${cleanerId} 未绑定LINE账号，跳过`);
              continue;
            }

            console.log(`[分配任务-service] 发送通知给: ${cleanerData.name}`);

            // 创建通知数据
            const notificationData: any = {
              taskId: assignmentData.taskId,
              taskName: taskData.hotel_name,
              fromStatus: 'open',
              toStatus: 'assigned',
              userId: assignedBy,
              userName: managerData.name,
              userRole: 'manager',
              timestamp: new Date().toISOString(),
              additionalData: {
                lockPassword: taskData.lock_password,
                hotelAddress: taskData.hotel_address,
                cleaningDate: taskData.cleaning_date
              }
            };

            // 使用消息模板创建消息
            const { createMessageTemplate } = await import('@/lib/notificationTemplates');
            const message = createMessageTemplate('task_assigned', notificationData);

            // 发送通知
            const { notificationService } = await import('@/lib/notifications');
            const success = await notificationService.sendLineMessage(
              cleanerData.line_user_id,
              message
            );

            console.log(`[分配任务-service] 通知${success ? '成功' : '失败'}: ${cleanerData.name}`);
          } catch (error) {
            console.error(`[分配任务-service] 向清洁员 ${cleanerId} 发送通知失败:`, error);
          }
        }
      }
    } catch (notifyError) {
      console.error('[分配任务-service] 发送分配通知失败:', notifyError);
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

