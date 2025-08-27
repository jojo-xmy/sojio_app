import { supabase } from './supabase';
import { createTask } from './tasks';
import { Task } from '@/types/task';

export interface TaskImage {
  id: string;
  task_id: string;
  image_url: string;
  uploaded_by: string;
  uploaded_at: string;
}

// 创建任务并上传图片的完整流程
export async function createTaskWithImages(taskData: {
  hotel_name: string;
  date: string;
  check_in_date?: string;
  check_out_date?: string;
  guest_count?: number;
  check_in_time: string | null;
  assigned_cleaners: string[];
  description: string | null;
  created_by: string;
}, images: File[]): Promise<{ task: Task | null; images: TaskImage[] }> {
  try {
    console.log('开始创建任务:', taskData);
    
    // 1. 创建任务（插入 tasks 表），获取返回的 UUID id
    const task = await createTask({
      hotelName: taskData.hotel_name,
      date: taskData.date,
      checkInDate: taskData.check_in_date || taskData.date,
      checkOutDate: taskData.check_out_date,
      guestCount: taskData.guest_count,
      checkInTime: taskData.check_in_time || '',
      assignedCleaners: taskData.assigned_cleaners,
      description: taskData.description || undefined,
      createdBy: taskData.created_by
    });
    if (!task) {
      console.error('任务创建失败');
      return { task: null, images: [] };
    }
    
    console.log('任务创建成功，获得UUID:', task.id);
    
    // 2. 使用该 UUID 作为 task_id 上传图片
    const uploadedImages = await uploadMultipleImages(images, task.id);
    
    console.log('图片上传完成，共上传:', uploadedImages.length, '张');
    
    return { task, images: uploadedImages };
  } catch (error) {
    console.error('创建任务和上传图片时发生错误:', error);
    return { task: null, images: [] };
  }
}

// 上传单张图片到 Supabase Storage
export async function uploadImage(file: File, taskId: string, userId: string): Promise<TaskImage | null> {
  try {
    console.log('开始上传单张图片:', { taskId, userId, fileName: file.name });
    
    // 生成唯一文件名
    const fileExt = file.name.split('.').pop();
    const fileName = `${taskId}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    
    // 3. 上传图片 URL 到 Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('task-images')
      .upload(fileName, file);
    
    if (uploadError) {
      console.error('Storage 上传错误:', uploadError);
      return null;
    }
    
    console.log('Storage 上传成功:', uploadData);
    
    // 获取公开URL
    const { data: urlData } = supabase.storage
      .from('task-images')
      .getPublicUrl(fileName);
    
    console.log('获取到图片URL:', urlData.publicUrl);
    
    // 4. 把路径存进 task_images.image_url
    const insertData = {
      task_id: taskId,
      image_url: urlData.publicUrl,
      uploaded_by: userId
    };
    
    console.log('准备插入数据库:', insertData);
    
    const { data: dbData, error: dbError } = await supabase
      .from('task_images')
      .insert(insertData)
      .select()
      .single();
    
    if (dbError) {
      console.error('数据库插入错误:', dbError);
      console.error('错误详情:', {
        code: dbError.code,
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint
      });
      return null;
    }
    
    console.log('数据库插入成功:', dbData);
    return dbData;
  } catch (error) {
    console.error('上传图片时发生异常:', error);
    return null;
  }
}

// 批量上传多张图片
export async function uploadMultipleImages(files: File[], taskId: string, userId?: string): Promise<TaskImage[]> {
  const uploadPromises = files.map(file => uploadImage(file, taskId, userId || 'system'));
  const results = await Promise.all(uploadPromises);
  return results.filter(result => result !== null) as TaskImage[];
}

// 为现有任务上传图片
export async function uploadImagesToExistingTask(files: FileList, taskId: string, userId: string): Promise<TaskImage[]> {
  const fileArray = Array.from(files);
  return await uploadMultipleImages(fileArray, taskId, userId);
}

// 获取任务的图片
export async function getTaskImages(taskId: string): Promise<TaskImage[]> {
  const { data, error } = await supabase
    .from('task_images')
    .select('*')
    .eq('task_id', taskId)
    .order('uploaded_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching task images:', error);
    return [];
  }
  
  return data || [];
}

// 删除图片
export async function deleteImage(imageId: string): Promise<boolean> {
  const { error } = await supabase
    .from('task_images')
    .delete()
    .eq('id', imageId);
  
  if (error) {
    console.error('Error deleting image:', error);
    return false;
  }
  
  return true;
} 