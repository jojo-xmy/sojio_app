/**
 * 任务服务
 * 
 * 统一管理任务查询和状态管理
 * 注意：任务创建由 database trigger 自动完成，不在此处提供创建接口
 */

import { supabase } from '../supabase';
import { Task, TaskStatus, UserRole } from '@/types/task';
import { transitionTask } from '../taskStatus';

/**
 * 将数据库字段（snake_case）映射为前端类型（camelCase）
 */
function mapTaskFromDB(row: any): Task {
  return {
    id: row.id,
    hotelId: row.hotel_id,
    hotelName: row.hotel_name,
    checkInDate: row.check_in_date,
    checkInTime: row.check_in_time,
    checkOutDate: row.check_out_date,
    cleaningDate: row.cleaning_date,
    assignedCleaners: row.assigned_cleaners || [],
    status: row.status,
    description: row.description,
    note: row.note,
    images: row.images || [],
    hotelAddress: row.hotel_address,
    lockPassword: row.lock_password,
    specialInstructions: row.special_instructions,
    guestCount: row.guest_count,
    ownerNotes: row.owner_notes,
    cleanerNotes: row.cleaner_notes,
    acceptedBy: row.accepted_by || [],
    completedAt: row.completed_at,
    confirmedAt: row.confirmed_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // 兼容性字段
    date: row.check_in_date
  };
}

/**
 * 获取所有任务
 */
export async function getAllTasks(): Promise<Task[]> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取任务列表失败:', error);
      return [];
    }

    return (data || []).map(mapTaskFromDB);
  } catch (error) {
    console.error('获取任务列表异常:', error);
    return [];
  }
}

/**
 * 根据ID获取任务
 */
export async function getTaskById(taskId: string): Promise<Task | null> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error) {
      console.error('获取任务失败:', error);
      return null;
    }

    return mapTaskFromDB(data);
  } catch (error) {
    console.error('获取任务异常:', error);
    return null;
  }
}

/**
 * 获取用户的任务列表（通过任务分配）
 */
export async function getTasksByUser(userId: string): Promise<Task[]> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .contains('assigned_cleaners', [userId])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取用户任务失败:', error);
      return [];
    }

    return (data || []).map(mapTaskFromDB);
  } catch (error) {
    console.error('获取用户任务异常:', error);
    return [];
  }
}

/**
 * 获取用户创建的任务列表
 */
export async function getTasksCreatedByUser(userId: string): Promise<Task[]> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取用户创建的任务失败:', error);
      return [];
    }

    return (data || []).map(mapTaskFromDB);
  } catch (error) {
    console.error('获取用户创建的任务异常:', error);
    return [];
  }
}

/**
 * 获取指定状态的任务列表
 */
export async function getTasksByStatus(status: TaskStatus): Promise<Task[]> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取指定状态任务失败:', error);
      return [];
    }

    return (data || []).map(mapTaskFromDB);
  } catch (error) {
    console.error('获取指定状态任务异常:', error);
    return [];
  }
}

/**
 * 获取Owner管理的任务（通过酒店关联）
 */
export async function getTasksByOwner(ownerId: string): Promise<Task[]> {
  try {
    // 先获取owner的酒店ID列表
    const { data: hotels, error: hotelError } = await supabase
      .from('hotels')
      .select('id')
      .eq('owner_id', ownerId);

    if (hotelError) {
      console.error('获取Owner酒店失败:', hotelError);
      return [];
    }

    if (!hotels || hotels.length === 0) {
      return [];
    }

    const hotelIds = hotels.map(h => h.id);

    // 查询这些酒店的任务
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .in('hotel_id', hotelIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取Owner任务失败:', error);
      return [];
    }

    return (data || []).map(mapTaskFromDB);
  } catch (error) {
    console.error('获取Owner任务异常:', error);
    return [];
  }
}

/**
 * 更新任务状态（带权限验证）
 * 
 * 这是任务状态变更的统一入口
 */
export async function updateTaskStatus(
  taskId: string,
  currentStatus: TaskStatus,
  newStatus: TaskStatus,
  userId: string,
  userRole: UserRole
): Promise<{ success: boolean; error?: string }> {
  try {
    return await transitionTask(taskId, currentStatus, newStatus, userId, userRole);
  } catch (error) {
    console.error('更新任务状态异常:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '更新任务状态失败' 
    };
  }
}

/**
 * 更新任务详细信息（备注、清扫日期等）
 */
export async function updateTaskDetails(
  taskId: string,
  updates: {
    description?: string;
    note?: string;
    cleaningDate?: string;
    lockPassword?: string;
    ownerNotes?: string;
    cleanerNotes?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.note !== undefined) updateData.note = updates.note;
    if (updates.cleaningDate !== undefined) updateData.cleaning_date = updates.cleaningDate;
    if (updates.lockPassword !== undefined) updateData.lock_password = updates.lockPassword;
    if (updates.ownerNotes !== undefined) updateData.owner_notes = updates.ownerNotes;
    if (updates.cleanerNotes !== undefined) updateData.cleaner_notes = updates.cleanerNotes;

    const { error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId);

    if (error) {
      console.error('更新任务详情失败:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('更新任务详情异常:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '更新任务详情失败' 
    };
  }
}

/**
 * 删除任务及关联数据
 */
export async function deleteTask(taskId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 删除关联的分配
    const { error: assignErr } = await supabase
      .from('task_assignments')
      .delete()
      .eq('task_id', taskId);

    if (assignErr) {
      console.error('删除任务分配失败:', assignErr);
    }

    // 删除关联的图片
    const { error: imgErr } = await supabase
      .from('task_images')
      .delete()
      .eq('task_id', taskId);

    if (imgErr) {
      console.error('删除任务图片失败:', imgErr);
    }

    // 删除打卡记录
    const { error: attErr } = await supabase
      .from('attendance')
      .delete()
      .eq('task_id', taskId);

    if (attErr) {
      console.error('删除打卡记录失败:', attErr);
    }

    // 删除任务
    const { error: taskErr } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (taskErr) {
      console.error('删除任务失败:', taskErr);
      return { success: false, error: taskErr.message };
    }

    console.log('任务及其关联数据已删除');
    return { success: true };
  } catch (error) {
    console.error('删除任务异常:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '删除任务失败' 
    };
  }
}

/**
 * 获取与日历条目关联的所有任务
 */
export async function getTasksByCalendarEntry(entryId: string): Promise<Task[]> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('calendar_entry_id', entryId)
      .order('cleaning_date', { ascending: true });

    if (error) {
      console.error('获取日历条目任务失败:', error);
      return [];
    }

    return (data || []).map(mapTaskFromDB);
  } catch (error) {
    console.error('获取日历条目任务异常:', error);
    return [];
  }
}

/**
 * @deprecated 此函数已废弃，请勿直接创建任务
 * 任务应通过 calendar_entries 创建，触发器会自动生成
 * 
 * 保留此函数仅用于向后兼容，将在未来版本中移除
 */
export async function createTask(taskData: any): Promise<Task | null> {
  console.warn('⚠️ createTask 函数已废弃，请使用 createCalendarEntry 创建任务');
  return null;
}

