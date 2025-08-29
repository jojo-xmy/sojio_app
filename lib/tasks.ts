import { supabase } from './supabase';
import { Task, TaskStatus, UserRole, canTransitionTask } from '@/types/task';

// 获取所有任务
export async function getAllTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
  
  return data || [];
}

// 根据ID获取任务
export async function getTaskById(id: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching task:', error);
    return null;
  }
  
  return data;
}

// 创建新任务
export async function createTask(taskData: {
  hotelName: string;
  hotelId?: string;
  checkInDate: string;
  checkOutDate?: string;
  guestCount?: number;
  checkInTime: string;
  assignedCleaners: string[];
  description?: string;
  note?: string;
  hotelAddress?: string;
  roomNumber?: string;
  lockPassword?: string;
  specialInstructions?: string;
  createdBy: string;
}): Promise<Task | null> {
  const newTask = {
    hotel_name: taskData.hotelName,
    hotel_id: taskData.hotelId || null,
    check_in_date: taskData.checkInDate,
    check_out_date: taskData.checkOutDate || null,
    guest_count: taskData.guestCount || 1,
    check_in_time: taskData.checkInTime,
    assigned_cleaners: taskData.assignedCleaners,
    description: taskData.description || null,
    note: taskData.note || null,
    status: 'draft' as TaskStatus,
    hotel_address: taskData.hotelAddress || null,
    room_number: taskData.roomNumber || null,
    lock_password: taskData.lockPassword || null,
    special_instructions: taskData.specialInstructions || null,
    created_by: taskData.createdBy,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('tasks')
    .insert([newTask])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating task:', error);
    return null;
  }
  
  return data;
}

// 更新任务状态（带权限验证）
export async function updateTaskStatus(
  taskId: string, 
  currentStatus: TaskStatus,
  newStatus: TaskStatus, 
  userId: string,
  userRole: UserRole
): Promise<{ success: boolean; error?: string }> {
  // 权限检查
  if (!canTransitionTask(currentStatus, newStatus, userRole)) {
    return { 
      success: false, 
      error: `用户角色 ${userRole} 无法将任务从 ${currentStatus} 转换为 ${newStatus}` 
    };
  }

  const updateData: any = {
    status: newStatus,
    updated_at: new Date().toISOString()
  };

  // 根据新状态添加特定字段
  switch (newStatus) {
    case 'accepted':
      updateData.accepted_by = [userId];
      break;
    case 'completed':
      updateData.completed_at = new Date().toISOString();
      break;
    case 'confirmed':
      updateData.confirmed_at = new Date().toISOString();
      break;
  }

  const { error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', taskId);
  
  if (error) {
    console.error('Error updating task status:', error);
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// 获取用户的任务
export async function getTasksByUser(userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .contains('assigned_cleaners', [userId])
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching user tasks:', error);
    return [];
  }
  
  return data || [];
}

// 获取用户创建的任务
export async function getTasksCreatedByUser(userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('created_by', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching tasks created by user:', error);
    return [];
  }
  
  return data || [];
}

// 根据状态获取任务
export async function getTasksByStatus(status: TaskStatus): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching tasks by status:', error);
    return [];
  }
  
  return data || [];
}

// 发布任务（draft -> open状态转换）
export async function publishTask(taskId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('tasks')
      .update({
        status: 'open',
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .eq('status', 'draft'); // 只有draft状态的任务可以发布

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('发布任务失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '发布任务失败' };
  }
}

// 接受任务（assigned -> accepted状态转换）
export async function acceptTask(taskId: string, cleanerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('tasks')
      .update({
        status: 'accepted',
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .eq('status', 'assigned'); // 只有assigned状态的任务可以接受

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('接受任务失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '接受任务失败' };
  }
}

// 拒绝任务（assigned -> open状态转换）
export async function rejectTask(taskId: string, cleanerId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 将任务状态改回open，需要重新分配
    const { error } = await supabase
      .from('tasks')
      .update({
        status: 'open',
        assigned_cleaners: [],
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .eq('status', 'assigned'); // 只有assigned状态的任务可以拒绝

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('拒绝任务失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '拒绝任务失败' };
  }
}

// 更新任务详情（备注、清扫日期等）
export async function updateTaskDetails(
  taskId: string, 
  updates: {
    description?: string;
    note?: string;
    cleaningDate?: string;
    roomNumber?: string;
    lockPassword?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.note !== undefined) updateData.note = updates.note;
    if (updates.cleaningDate !== undefined) updateData.cleaning_date = updates.cleaningDate;
    if (updates.roomNumber !== undefined) updateData.room_number = updates.roomNumber;
    if (updates.lockPassword !== undefined) updateData.lock_password = updates.lockPassword;

    const { error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('更新任务详情失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '更新任务详情失败' };
  }
}

// 清洁员退勤备注：写入 tasks.cleaner_notes
export async function updateCleanerNotes(taskId: string, cleanerNotes: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('tasks')
      .update({ cleaner_notes: cleanerNotes || null, updated_at: new Date().toISOString() })
      .eq('id', taskId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('更新清洁员备注失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '更新清洁员备注失败' };
  }
}

// 房东备注：写入 tasks.owner_notes
export async function updateOwnerNotes(taskId: string, ownerNotes: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('tasks')
      .update({ owner_notes: ownerNotes || null, updated_at: new Date().toISOString() })
      .eq('id', taskId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('更新房东备注失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '更新房东备注失败' };
  }
}

// 删除任务（清理依赖：task_assignments、task_images、attendance）
export async function deleteTask(taskId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 删除关联分配
    const { error: assignErr } = await supabase
      .from('task_assignments')
      .delete()
      .eq('task_id', taskId);
    if (assignErr) throw assignErr;

    // 删除关联图片
    const { error: imgErr } = await supabase
      .from('task_images')
      .delete()
      .eq('task_id', taskId);
    if (imgErr) throw imgErr;

    // 删除打卡记录
    const { error: attErr } = await supabase
      .from('attendance')
      .delete()
      .eq('task_id', taskId);
    if (attErr) throw attErr;

    // 删除任务
    const { error: taskErr } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);
    if (taskErr) throw taskErr;

    return { success: true };
  } catch (error) {
    console.error('删除任务失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '删除任务失败' };
  }
}



// 获取owner管理的任务（通过hotel_id关联hotels表的owner_id）
export async function getTasksByOwner(ownerId: string): Promise<Task[]> {
  try {
    // 首先获取owner管理的酒店ID列表
    const { data: hotels, error: hotelError } = await supabase
      .from('hotels')
      .select('id')
      .eq('owner_id', ownerId);

    if (hotelError) {
      console.error('Error fetching owner hotels:', hotelError);
      return [];
    }

    if (!hotels || hotels.length === 0) {
      console.log('Owner has no hotels');
      return [];
    }

    const hotelIds = hotels.map(h => h.id);

    // 然后查询这些酒店的任务
    const { data: tasks, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .in('hotel_id', hotelIds)
      .order('created_at', { ascending: false });
    
    if (taskError) {
      console.error('Error fetching tasks by owner:', taskError);
      return [];
    }
    
    // 将数据库字段名转换为Task接口字段名
    const mappedTasks = (tasks || []).map(task => ({
      ...task,
      hotelName: task.hotel_name,
      checkInDate: task.check_in_date,
      checkOutDate: task.check_out_date,
      checkInTime: task.check_in_time,
      roomNumber: task.room_number,
      lockPassword: task.lock_password,
      specialInstructions: task.special_instructions,
      hotelAddress: task.hotel_address,
      createdBy: task.created_by,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
      guestCount: task.guest_count
    }));

    console.log(`Loaded ${mappedTasks.length} tasks for owner ${ownerId}`);
    return mappedTasks;
  } catch (error) {
    console.error('Error in getTasksByOwner:', error);
    return [];
  }
}

// 删除任务
// (移除重复的简单删除实现，统一使用上方包含级联清理的 deleteTask)