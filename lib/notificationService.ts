import { supabase } from './supabase';

// 通知类型定义
export interface TaskNotification {
  id: string;
  taskId: string;
  type: 'task_created' | 'task_assigned' | 'task_date_changed' | 'task_cancelled' | 'cleaning_dates_updated';
  recipientId: string;
  recipientRole: 'owner' | 'manager' | 'cleaner';
  message: string;
  data?: any;
  sent: boolean;
  createdAt: string;
  sentAt?: string;
}

// 创建通知记录
export async function createNotification(notification: Omit<TaskNotification, 'id' | 'sent' | 'createdAt'>): Promise<TaskNotification> {
  const { data, error } = await supabase
    .from('task_notifications')
    .insert({
      task_id: notification.taskId,
      type: notification.type,
      recipient_id: notification.recipientId,
      recipient_role: notification.recipientRole,
      message: notification.message,
      data: notification.data || null,
      sent: false,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('创建通知失败:', error);
    throw new Error('创建通知失败');
  }

  return data;
}

// 获取待发送的通知
export async function getPendingNotifications(): Promise<TaskNotification[]> {
  const { data, error } = await supabase
    .from('task_notifications')
    .select('*')
    .eq('sent', false)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('获取待发送通知失败:', error);
    return [];
  }

  return data || [];
}

// 标记通知为已发送
export async function markNotificationAsSent(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('task_notifications')
    .update({
      sent: true,
      sent_at: new Date().toISOString()
    })
    .eq('id', notificationId);

  if (error) {
    console.error('标记通知为已发送失败:', error);
    throw new Error('标记通知为已发送失败');
  }
}

// 通知模板
export const NotificationTemplates = {
  taskCreated: (hotelName: string, cleaningDate: string) => 
    `新的清扫任务已创建：${hotelName}，清扫日期：${cleaningDate}`,
  
  taskAssigned: (hotelName: string, cleaningDate: string) => 
    `您已被分配到清扫任务：${hotelName}，清扫日期：${cleaningDate}`,
  
  taskDateChanged: (hotelName: string, oldDate: string, newDate: string) => 
    `清扫任务日期已更改：${hotelName}，从 ${oldDate} 改为 ${newDate}`,
  
  taskCancelled: (hotelName: string, cleaningDate: string) => 
    `清扫任务已取消：${hotelName}，原清扫日期：${cleaningDate}`,
  
  cleaningDatesUpdated: (hotelName: string, dates: string[]) => 
    `清扫日期已更新：${hotelName}，新的清扫日期：${dates.join('、')}`
};

// 任务创建通知
export async function notifyTaskCreated(taskId: string, hotelName: string, cleaningDate: string, managerId: string): Promise<void> {
  try {
    await createNotification({
      taskId,
      type: 'task_created',
      recipientId: managerId,
      recipientRole: 'manager',
      message: NotificationTemplates.taskCreated(hotelName, cleaningDate),
      data: { hotelName, cleaningDate }
    });
  } catch (error) {
    console.error('创建任务创建通知失败:', error);
  }
}

// 任务分配通知
export async function notifyTaskAssigned(taskId: string, hotelName: string, cleaningDate: string, cleanerIds: string[]): Promise<void> {
  try {
    const notifications = cleanerIds.map(cleanerId => ({
      taskId,
      type: 'task_assigned',
      recipientId: cleanerId,
      recipientRole: 'cleaner' as const,
      message: NotificationTemplates.taskAssigned(hotelName, cleaningDate),
      data: { hotelName, cleaningDate }
    }));

    for (const notification of notifications) {
      await createNotification(notification);
    }
  } catch (error) {
    console.error('创建任务分配通知失败:', error);
  }
}

// 任务日期更改通知
export async function notifyTaskDateChanged(taskId: string, hotelName: string, oldDate: string, newDate: string, affectedUserIds: string[]): Promise<void> {
  try {
    const notifications = affectedUserIds.map(userId => ({
      taskId,
      type: 'task_date_changed',
      recipientId: userId,
      recipientRole: 'cleaner' as const, // 这里需要根据实际用户角色调整
      message: NotificationTemplates.taskDateChanged(hotelName, oldDate, newDate),
      data: { hotelName, oldDate, newDate }
    }));

    for (const notification of notifications) {
      await createNotification(notification);
    }
  } catch (error) {
    console.error('创建任务日期更改通知失败:', error);
  }
}

// 清扫日期更新通知
export async function notifyCleaningDatesUpdated(entryId: string, hotelName: string, dates: string[], managerId: string): Promise<void> {
  try {
    await createNotification({
      taskId: entryId, // 使用entryId作为标识
      type: 'cleaning_dates_updated',
      recipientId: managerId,
      recipientRole: 'manager',
      message: NotificationTemplates.cleaningDatesUpdated(hotelName, dates),
      data: { hotelName, dates }
    });
  } catch (error) {
    console.error('创建清扫日期更新通知失败:', error);
  }
}

// LINE Bot API 接口（预留）
export interface LineBotConfig {
  channelAccessToken: string;
  channelSecret: string;
}

// 发送LINE消息（预留接口）
export async function sendLineMessage(userId: string, message: string, config: LineBotConfig): Promise<{ success: boolean; error?: string }> {
  // 这里是预留的LINE Bot API接口
  // 实际实现需要根据LINE Bot的API文档进行开发
  
  console.log('LINE Bot 消息发送（预留接口）:', {
    userId,
    message,
    timestamp: new Date().toISOString()
  });

  // 模拟发送成功
  return { success: true };
}

// 批量发送LINE通知
export async function sendPendingLineNotifications(config: LineBotConfig): Promise<{ success: boolean; sentCount: number; errors: string[] }> {
  try {
    const pendingNotifications = await getPendingNotifications();
    const errors: string[] = [];
    let sentCount = 0;

    for (const notification of pendingNotifications) {
      try {
        // 这里需要根据用户ID获取LINE用户ID
        // 实际实现需要查询用户表获取line_user_id
        
        // 模拟发送
        const result = await sendLineMessage(notification.recipientId, notification.message, config);
        
        if (result.success) {
          await markNotificationAsSent(notification.id);
          sentCount++;
        } else {
          errors.push(`通知 ${notification.id} 发送失败: ${result.error}`);
        }
      } catch (error) {
        errors.push(`通知 ${notification.id} 处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }

    return { success: true, sentCount, errors };
  } catch (error) {
    console.error('批量发送LINE通知失败:', error);
    return { 
      success: false, 
      sentCount: 0, 
      errors: [error instanceof Error ? error.message : '批量发送失败'] 
    };
  }
}
