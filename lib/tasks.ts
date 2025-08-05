import { supabase } from './supabase';

export interface Task {
  id: string;
  hotel_name: string;
  date: string;
  check_in_time: string | null;
  assigned_cleaners: string[];
  description: string | null;
  status: string;
  created_at: string;
  created_by: string;
}

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
  hotel_name: string;
  date: string;
  check_in_time: string | null;
  assigned_cleaners: string[];
  description: string | null;
  created_by: string;
}): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .insert([taskData])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating task:', error);
    return null;
  }
  
  return data;
}

// 更新任务状态
export async function updateTaskStatus(taskId: string, status: string): Promise<boolean> {
  const { error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', taskId);
  
  if (error) {
    console.error('Error updating task status:', error);
    return false;
  }
  
  return true;
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