import { TaskStatus, TASK_STATUS_TRANSITIONS, canTransitionTask, UserRole } from '@/types/task';
import { supabase } from './supabase';
import { sendTaskNotification, NotificationData } from './notifications';
import { 
  createMessageTemplate, 
  NotificationTemplateType,
  shouldReceiveNotification 
} from './notificationTemplates';

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
    
    // 短暂延迟确保数据库写入完成
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 发送LINE通知
    await sendStatusChangeNotification(taskId, currentStatus, newStatus, userId, userRole, additionalData);
    
    return { success: true };
  } catch (error) {
    console.error('状态转换失败:', error);
    return { 
      success: false, 
      error: `状态转换失败: ${error}` 
    };
  }
}

// 获取通知接收者
async function getNotificationRecipients(
  taskId: string,
  toStatus: TaskStatus
): Promise<Array<{ userId: string; role: UserRole }>> {
  const recipients: Array<{ userId: string; role: UserRole }> = [];

  try {
    // 获取任务信息（包括酒店ID）
    const { data: task } = await supabase
      .from('tasks')
      .select('*, assigned_cleaners, created_by, hotel_id')
      .eq('id', taskId)
      .single();

    if (!task) {
      console.error('[通知] 任务不存在');
      return recipients;
    }

    console.log('[通知] 任务酒店ID:', task.hotel_id);

    switch (toStatus) {
      case 'assigned':
        // 通知被分配的清洁员
        if (task.assigned_cleaners && Array.isArray(task.assigned_cleaners)) {
          task.assigned_cleaners.forEach((cleanerId: string) => {
            recipients.push({ userId: cleanerId, role: 'cleaner' });
          });
        }
        break;

      case 'accepted':
      case 'in_progress':
      case 'completed':
        // 通知该酒店的Manager（根据 manager_hotels 表查询）
        if (task.hotel_id) {
          const { data: managerRelations } = await supabase
            .from('manager_hotels')
            .select('manager_id')
            .eq('hotel_id', task.hotel_id);
          
          if (managerRelations && managerRelations.length > 0) {
            console.log('[通知] 找到该酒店的Manager:', managerRelations.length, '个');
            managerRelations.forEach(relation => {
              recipients.push({ userId: relation.manager_id, role: 'manager' });
            });
          } else {
            console.log('[通知] 该酒店没有分配Manager');
          }
        }
        break;

      case 'confirmed':
        // 通知任务创建者（Owner）
        if (task.created_by) {
          recipients.push({ userId: task.created_by, role: 'owner' });
        }
        break;
    }

    return recipients;
  } catch (error) {
    console.error('[通知] 获取通知接收者失败:', error);
    return recipients;
  }
}

// 发送状态变更通知
async function sendStatusChangeNotification(
  taskId: string,
  fromStatus: TaskStatus,
  toStatus: TaskStatus,
  userId: string,
  userRole: UserRole,
  additionalData?: Record<string, any>
) {
  console.log('[通知] ===== 开始发送状态变更通知 =====');
  console.log('[通知] 任务ID:', taskId);
  console.log('[通知] 状态变更:', `${fromStatus} → ${toStatus}`);
  console.log('[通知] 操作用户ID:', userId);
  
  try {
    // 获取任务信息
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (!task) {
      console.error('[通知] 任务不存在，无法发送通知');
      return;
    }
    console.log('[通知] 任务信息:', { hotel_name: task.hotel_name, cleaning_date: task.cleaning_date });

    // 获取操作用户信息
    const { data: user } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!user) {
      console.error('[通知] 用户不存在，无法发送通知');
      return;
    }
    console.log('[通知] 操作用户:', user.name);

    // 确定通知类型
    const notificationType = getNotificationType(fromStatus, toStatus);
    if (!notificationType) {
      console.log('[通知] 无需发送通知的状态转换');
      return;
    }
    console.log('[通知] 通知类型:', notificationType);

    // 获取通知接收者
    const recipients = await getNotificationRecipients(taskId, toStatus);
    if (recipients.length === 0) {
      console.log('[通知] 没有需要通知的接收者');
      return;
    }

    console.log(`[通知] 准备通知 ${recipients.length} 个接收者:`, recipients);

    // 为每个接收者创建通知数据并发送
    for (const recipient of recipients) {
      try {
        // 获取接收者的LINE ID
        const { data: recipientUser } = await supabase
          .from('user_profiles')
          .select('line_user_id, name')
          .eq('id', recipient.userId)
          .single();

        if (!recipientUser || !recipientUser.line_user_id) {
          console.log(`[通知] 接收者 ${recipient.userId} 未绑定LINE账号，跳过`);
          continue;
        }

        console.log(`[通知] 准备发送给: ${recipientUser.name} (LINE ID: ${recipientUser.line_user_id})`);

        // 创建通知数据
        const notificationData: NotificationData = {
          taskId,
          taskName: task.hotel_name,
          fromStatus,
          toStatus,
          userId,
          userName: user.name,
          userRole,
          timestamp: new Date().toISOString(),
          additionalData: {
            ...additionalData,
            lockPassword: task.lock_password,
            hotelAddress: task.hotel_address,
            cleaningDate: task.cleaning_date
          }
        };

        // 发送通知（直接使用LINE User ID）
        const { notificationService } = await import('./notifications');
        const success = await notificationService.sendTaskStatusNotificationToLine(
          recipientUser.line_user_id,
          notificationData
        );
        
        console.log(`[通知] 发送结果: ${success ? '✅ 成功' : '❌ 失败'} - ${recipientUser.name} (${recipient.role})`);

      } catch (error) {
        console.error(`[通知] 向接收者 ${recipient.userId} 发送通知失败:`, error);
      }
    }

    console.log('[通知] ===== 通知发送流程结束 =====');

  } catch (error) {
    console.error('[通知] 发送通知失败:', error);
  }
}

// 根据状态转换确定通知类型
function getNotificationType(fromStatus: TaskStatus, toStatus: TaskStatus): NotificationTemplateType | null {
  switch (toStatus) {
    case 'assigned':
      return 'task_assigned';
    case 'accepted':
      return 'task_accepted';
    case 'in_progress':
      return 'task_started';
    case 'completed':
      return 'task_completed';
    case 'confirmed':
      return 'task_confirmed';
    default:
      return null;
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

// 手动通知Manager（用于Owner创建入住登记后）
export async function notifyManagersAboutNewEntry(
  taskId: string,
  userId: string
): Promise<{ success: boolean; error?: string; notifiedCount: number }> {
  console.log('[通知] ===== 手动通知Manager =====');
  console.log('[通知] 任务ID:', taskId);
  console.log('[通知] 操作用户ID:', userId);

  try {
    // 获取任务信息
    const { data: task } = await supabase
      .from('tasks')
      .select('*, hotel_id')
      .eq('id', taskId)
      .single();

    if (!task) {
      console.error('[通知] 任务不存在');
      return { success: false, error: '任务不存在', notifiedCount: 0 };
    }

    // 获取操作用户信息
    const { data: user } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!user) {
      console.error('[通知] 用户不存在');
      return { success: false, error: '用户不存在', notifiedCount: 0 };
    }

    // 获取该酒店的所有Manager
    if (!task.hotel_id) {
      console.error('[通知] 任务没有关联酒店');
      return { success: false, error: '任务没有关联酒店', notifiedCount: 0 };
    }

    const { data: managerRelations } = await supabase
      .from('manager_hotels')
      .select('manager_id')
      .eq('hotel_id', task.hotel_id);

    if (!managerRelations || managerRelations.length === 0) {
      console.log('[通知] 该酒店没有分配Manager');
      return { success: false, error: '该酒店没有分配Manager', notifiedCount: 0 };
    }

    console.log('[通知] 找到 Manager:', managerRelations.length, '个');

    let successCount = 0;

    // 为每个Manager发送通知
    for (const relation of managerRelations) {
      try {
        // 获取Manager的LINE ID
        const { data: manager } = await supabase
          .from('user_profiles')
          .select('line_user_id, name')
          .eq('id', relation.manager_id)
          .single();

        if (!manager || !manager.line_user_id) {
          console.log(`[通知] Manager ${relation.manager_id} 未绑定LINE账号，跳过`);
          continue;
        }

        console.log(`[通知] 准备发送给: ${manager.name} (LINE ID: ${manager.line_user_id})`);

        // 创建通知数据（使用统一格式）
        const notificationData: NotificationData = {
          taskId,
          taskName: task.hotel_name,
          fromStatus: task.status,
          toStatus: task.status,
          userId,
          userName: user.name,
          userRole: 'owner',
          timestamp: new Date().toISOString(),
          additionalData: {
            lockPassword: task.lock_password,
            hotelAddress: task.hotel_address,
            cleaningDate: task.cleaning_date,
            checkInDate: task.check_in_date,
            checkOutDate: task.check_out_date,
            guestCount: task.guest_count,
            isManualNotification: true
          }
        };

        // 使用消息模板系统创建消息
        const { createMessageTemplate } = await import('./notificationTemplates');
        const message = createMessageTemplate('new_entry_created', notificationData);

        // 发送通知
        const { notificationService } = await import('./notifications');
        const success = await notificationService.sendLineMessage(
          manager.line_user_id,
          message
        );

        if (success) {
          successCount++;
          console.log(`[通知] 通知发送成功: ${manager.name}`);
        } else {
          console.log(`[通知] 通知发送失败: ${manager.name}`);
        }

      } catch (error) {
        console.error(`[通知] 向Manager ${relation.manager_id} 发送通知失败:`, error);
      }
    }

    console.log('[通知] ===== 通知Manager完成 =====');
    console.log('[通知] 成功通知:', successCount, '个Manager');

    return { 
      success: successCount > 0, 
      notifiedCount: successCount,
      error: successCount === 0 ? '所有Manager都未能成功通知' : undefined
    };

  } catch (error) {
    console.error('[通知] 通知Manager失败:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '未知错误',
      notifiedCount: 0
    };
  }
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