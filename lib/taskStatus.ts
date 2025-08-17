import { TaskStatus, TASK_STATUS_TRANSITIONS, canTransitionTask, UserRole } from '@/types/task';
import { supabase } from './supabase';

// 状态转换验证
export function canTransitionTo(currentStatus: TaskStatus, newStatus: TaskStatus): boolean {
  const allowedTransitions = TASK_STATUS_TRANSITIONS[currentStatus];
  return allowedTransitions.includes(newStatus);
}

// 获取状态转换选项
export function getAvailableTransitions(currentStatus: TaskStatus): TaskStatus[] {
  return TASK_STATUS_TRANSITIONS[currentStatus] || [];
}

// 状态转换执行 - 集成Supabase
export async function transitionTask(
  taskId: string, 
  currentStatus: TaskStatus,
  newStatus: TaskStatus, 
  userId: string, 
  userRole: UserRole,
  additionalData?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    // 验证权限
    if (!canTransitionTask(currentStatus, newStatus, userRole)) {
      return { 
        success: false, 
        error: '用户无权执行此状态转换' 
      };
    }

    // 构建更新数据
    const updateData: any = {
      status: newStatus,
      updated_at: new Date().toISOString()
    };

    // 根据状态添加特定字段
    switch (newStatus) {
      case 'accepted':
        updateData.accepted_by = additionalData?.acceptedBy || [];
        break;
      case 'completed':
        updateData.completed_at = new Date().toISOString();
        break;
      case 'confirmed':
        updateData.confirmed_at = new Date().toISOString();
        break;
    }

    // 调用 Supabase 更新数据库
    const { error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId);

    if (error) {
      console.error('数据库更新失败:', error);
      return { 
        success: false, 
        error: `数据库更新失败: ${error.message}` 
      };
    }

    console.log(`任务 ${taskId} 状态从 ${currentStatus} 转换为 ${newStatus}`);
    
    // TODO: 这里可以添加LINE通知逻辑
    // await sendLineNotification(taskId, currentStatus, newStatus, userId);
    
    return { success: true };
  } catch (error) {
    console.error('状态转换失败:', error);
    return { 
      success: false, 
      error: `状态转换失败: ${error}` 
    };
  }
}

// 批量状态转换
export async function batchTransitionTasks(
  taskIds: string[],
  newStatus: TaskStatus,
  userId: string,
  userRole: UserRole
): Promise<{ success: boolean; results: Array<{ taskId: string; success: boolean; error?: string }> }> {
  const results = [];
  
  for (const taskId of taskIds) {
    // 先获取当前任务状态
    const { data: task } = await supabase
      .from('tasks')
      .select('status')
      .eq('id', taskId)
      .single();
    
    if (!task) {
      results.push({ taskId, success: false, error: '任务不存在' });
      continue;
    }
    
    const result = await transitionTask(taskId, task.status, newStatus, userId, userRole);
    results.push({ taskId, success: result.success, error: result.error });
  }
  
  const allSuccess = results.every(r => r.success);
  return { success: allSuccess, results };
}

// 获取状态显示名称
export function getStatusDisplayName(status: TaskStatus): string {
  const statusNames = {
    draft: '草稿',
    open: '待分配',
    assigned: '已分配',
    accepted: '已接受',
    in_progress: '进行中',
    completed: '已完成',
    confirmed: '已确认'
  };
  return statusNames[status] || status;
}

// 获取状态颜色
export function getStatusColor(status: TaskStatus): string {
  const statusColors = {
    draft: '#9ca3af',      // gray
    open: '#f59e0b',       // amber
    assigned: '#3b82f6',   // blue
    accepted: '#10b981',   // emerald
    in_progress: '#f59e0b', // amber
    completed: '#22c55e',  // green
    confirmed: '#059669'   // emerald-600
  };
  return statusColors[status] || '#6b7280';
}

// 检查任务是否可以操作
export function canOperateTask(taskStatus: TaskStatus, userRole: UserRole, operation: string): boolean {
  switch (operation) {
    case 'edit':
      return ['draft', 'open'].includes(taskStatus) && ['owner', 'manager'].includes(userRole);
    case 'assign':
      return taskStatus === 'open' && userRole === 'manager';
    case 'accept':
      return taskStatus === 'assigned' && userRole === 'cleaner';
    case 'start':
      return taskStatus === 'accepted' && userRole === 'cleaner';
    case 'complete':
      return taskStatus === 'in_progress' && userRole === 'cleaner';
    case 'confirm':
      return taskStatus === 'completed' && ['owner', 'manager'].includes(userRole);
    default:
      return false;
  }
}

// 获取任务进度百分比
export function getTaskProgress(status: TaskStatus): number {
  const progressMap = {
    draft: 0,
    open: 10,
    assigned: 30,
    accepted: 50,
    in_progress: 70,
    completed: 90,
    confirmed: 100
  };
  return progressMap[status] || 0;
}

// 检查任务是否已完成
export function isTaskCompleted(status: TaskStatus): boolean {
  return ['completed', 'confirmed'].includes(status);
}

// 检查任务是否可编辑
export function isTaskEditable(status: TaskStatus): boolean {
  return ['draft', 'open'].includes(status);
}

// 获取状态图标
export function getStatusIcon(status: TaskStatus): string {
  const icons = {
    draft: '📝',
    open: '⏳',
    assigned: '👥',
    accepted: '✅',
    in_progress: '🔄',
    completed: '🎉',
    confirmed: '🏆'
  };
  return icons[status] || '❓';
}

// 获取任务状态统计
export async function getTaskStatusStats(): Promise<Record<TaskStatus, number>> {
  const { data, error } = await supabase
    .from('tasks')
    .select('status');
  
  if (error) {
    console.error('获取任务状态统计失败:', error);
    return {
      draft: 0,
      open: 0,
      assigned: 0,
      accepted: 0,
      in_progress: 0,
      completed: 0,
      confirmed: 0
    };
  }
  
  const stats = {
    draft: 0,
    open: 0,
    assigned: 0,
    accepted: 0,
    in_progress: 0,
    completed: 0,
    confirmed: 0
  };
  
  data?.forEach(task => {
    if (task.status in stats) {
      stats[task.status as TaskStatus]++;
    }
  });
  
  return stats;
} 