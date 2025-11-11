import { TaskStatus, UserRole } from '@/types/task';

// 通知类型定义
export interface NotificationData {
  taskId: string;
  taskName: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  userId: string;
  userName: string;
  userRole: UserRole;
  timestamp: string;
  additionalData?: Record<string, any>;
}

// LINE消息模板类型
export interface LineMessageTemplate {
  type: 'text' | 'flex';
  content: any;
}

// 通知配置
export interface NotificationConfig {
  enableNotifications: boolean;
  debugMode: boolean;
}

// 默认配置
const defaultConfig: NotificationConfig = {
  enableNotifications: true,
  debugMode: true,
};

// 通知服务类
export class NotificationService {
  private config: NotificationConfig;

  constructor(config: Partial<NotificationConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  // 发送LINE消息 - 通过后端API
  async sendLineMessage(userId: string, message: LineMessageTemplate): Promise<boolean> {
    if (!this.config.enableNotifications) {
      console.log('[通知] 通知功能已禁用');
      return false;
    }

    console.log('[通知] 准备发送LINE消息:', {
      userId,
      messageType: message.type,
      hasContent: !!message.content,
      contentText: message.content?.text
    });

    try {
      // 转换消息格式为LINE API需要的格式
      let lineMessage;
      if (message.type === 'text' && message.content && message.content.text) {
        lineMessage = { 
          type: 'text', 
          text: message.content.text 
        };
      } else {
        console.error('[通知] 消息格式错误:', message);
        throw new Error('消息格式错误或文本为空');
      }

      console.log('[通知] 调用API发送消息:', {
        type: lineMessage.type,
        textLength: lineMessage.text?.length,
        textPreview: lineMessage.text?.substring(0, 50)
      });

      const response = await fetch('/api/line/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          message: lineMessage,
        }),
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('[通知] LINE API返回错误:', {
          status: response.status,
          error: responseData
        });
        return false;
      }

      console.log('[通知] LINE消息发送成功');
      return true;
    } catch (error) {
      console.error('[通知] 发送LINE消息时出错:', error);
      return false;
    }
  }

  // 发送任务状态变更通知（直接使用LINE User ID）
  async sendTaskStatusNotificationToLine(lineUserId: string, notification: NotificationData): Promise<boolean> {
    if (!lineUserId) {
      console.log('[通知] LINE User ID 为空');
      return false;
    }

    console.log('[通知] 创建消息模板，通知数据:', {
      taskName: notification.taskName,
      fromStatus: notification.fromStatus,
      toStatus: notification.toStatus,
      userName: notification.userName
    });

    const message = this.createTaskStatusMessage(notification);
    
    console.log('[通知] 消息模板创建完成:', {
      type: message.type,
      hasContent: !!message.content,
      hasText: !!(message.content as any)?.text,
      textLength: (message.content as any)?.text?.length
    });

    return await this.sendLineMessage(lineUserId, message);
  }

  // 发送任务状态变更通知（通过数据库查询LINE ID）
  async sendTaskStatusNotification(notification: NotificationData): Promise<boolean> {
    const message = this.createTaskStatusMessage(notification);
    
    // 获取用户的LINE ID
    const lineUserId = await this.getUserLineId(notification.userId);
    
    if (!lineUserId) {
      console.log('用户未绑定LINE账号');
      return false;
    }

    return await this.sendLineMessage(lineUserId, message);
  }

  // 创建任务状态变更消息
  private createTaskStatusMessage(notification: NotificationData): LineMessageTemplate {
    const { taskName, fromStatus, toStatus, userName, timestamp } = notification;
    
    console.log('[通知] createTaskStatusMessage 输入参数:', {
      taskName,
      fromStatus,
      toStatus,
      userName,
      timestamp
    });
    
    const statusDisplay = {
      draft: '草稿',
      open: '待分配',
      assigned: '已分配',
      accepted: '已接受',
      in_progress: '进行中',
      completed: '已完成',
      confirmed: '已确认'
    };

    const statusSpecificMsg = this.getStatusSpecificMessage(fromStatus, toStatus);
    
    const messageText = `🔄 任务状态更新

📋 任务：${taskName || '未知任务'}
👤 操作人：${userName || '未知用户'}
📊 状态：${statusDisplay[fromStatus] || fromStatus} → ${statusDisplay[toStatus] || toStatus}
⏰ 时间：${new Date(timestamp).toLocaleString('zh-CN', { timeZone: 'Asia/Tokyo' })}

${statusSpecificMsg}`;

    console.log('[通知] createTaskStatusMessage 生成的消息文本长度:', messageText.length);
    console.log('[通知] createTaskStatusMessage 消息预览:', messageText.substring(0, 100));

    if (!messageText || messageText.trim().length === 0) {
      console.error('[通知] 生成的消息文本为空!');
      throw new Error('生成的消息文本为空');
    }

    return {
      type: 'text',
      content: {
        text: messageText
      }
    };
  }

  // 获取状态特定的消息
  private getStatusSpecificMessage(fromStatus: TaskStatus, toStatus: TaskStatus): string {
    switch (toStatus) {
      case 'assigned':
        return '✅ 任务已分配给您，请及时接受！';
      case 'accepted':
        return '🎯 任务已接受，请按时开始工作！';
      case 'in_progress':
        return '🚀 任务已开始，请认真完成清洁工作！';
      case 'completed':
        return '🎉 任务已完成，等待确认！';
      case 'confirmed':
        return '🏆 任务已确认完成，感谢您的工作！';
      default:
        return '';
    }
  }

  // 获取用户的LINE ID
  private async getUserLineId(userId: string): Promise<string | null> {
    try {
      const { supabase } = await import('./supabase');
      const { data, error } = await supabase
        .from('user_profiles')
        .select('line_user_id')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('查询用户LINE ID失败:', error);
        return null;
      }

      return data?.line_user_id || null;
    } catch (error) {
      console.error('获取用户LINE ID时出错:', error);
      return null;
    }
  }

  // 批量发送通知
  async sendBatchNotifications(notifications: NotificationData[]): Promise<{
    success: number;
    failed: number;
    results: Array<{ notification: NotificationData; success: boolean; error?: string }>;
  }> {
    const results = [];
    let success = 0;
    let failed = 0;

    for (const notification of notifications) {
      try {
        const result = await this.sendTaskStatusNotification(notification);
        results.push({ notification, success: result });
        if (result) success++; else failed++;
      } catch (error) {
        results.push({ 
          notification, 
          success: false, 
          error: error instanceof Error ? error.message : '未知错误' 
        });
        failed++;
      }
    }

    return { success, failed, results };
  }

  // 测试通知功能
  async testNotification(userId: string): Promise<boolean> {
    const testMessage: LineMessageTemplate = {
      type: 'text',
      content: {
        text: '🧪 这是一条测试消息\n\nSoJio清洁管理系统通知功能测试成功！'
      }
    };

    return await this.sendLineMessage(userId, testMessage);
  }
}

// 创建全局通知服务实例
export const notificationService = new NotificationService();

// 便捷函数
export const sendTaskNotification = (notification: NotificationData) => 
  notificationService.sendTaskStatusNotification(notification);

export const sendTestNotification = (userId: string) => 
  notificationService.testNotification(userId); 