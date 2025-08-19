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
  date: string;
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
    date: taskData.date,
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

// 更新任务详情
export async function updateTaskDetails(
  taskId: string, 
  updates: Partial<{
    hotelName: string;
    date: string;
    checkInTime: string;
    assignedCleaners: string[];
    description: string;
    note: string;
    hotelAddress: string;
    roomNumber: string;
    lockPassword: string;
    specialInstructions: string;
    inventory: Record<string, number>;
  }>
): Promise<{ success: boolean; error?: string }> {
  const updateData: any = {
    updated_at: new Date().toISOString()
  };

  // 转换字段名
  if (updates.hotelName) updateData.hotel_name = updates.hotelName;
  if (updates.date) updateData.date = updates.date;
  if (updates.checkInTime) updateData.check_in_time = updates.checkInTime;
  if (updates.assignedCleaners) updateData.assigned_cleaners = updates.assignedCleaners;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.note !== undefined) updateData.note = updates.note;
  if (updates.hotelAddress !== undefined) updateData.hotel_address = updates.hotelAddress;
  if (updates.roomNumber !== undefined) updateData.room_number = updates.roomNumber;
  if (updates.lockPassword !== undefined) updateData.lock_password = updates.lockPassword;
  if (updates.specialInstructions !== undefined) updateData.special_instructions = updates.specialInstructions;
  if (updates.inventory) updateData.inventory = updates.inventory;

  const { error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', taskId);
  
  if (error) {
    console.error('Error updating task details:', error);
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// 删除任务
export async function deleteTask(taskId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);
  
  if (error) {
    console.error('Error deleting task:', error);
    return { success: false, error: error.message };
  }
  
  return { success: true };
} 