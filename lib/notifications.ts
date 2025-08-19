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
      console.log('通知功能已禁用');
      return false;
    }

    try {
      const response = await fetch('/api/line/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          message,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('发送LINE消息失败:', error);
        return false;
      }

      console.log('LINE消息发送成功');
      return true;
    } catch (error) {
      console.error('发送LINE消息时出错:', error);
      return false;
    }
  }

  // 发送任务状态变更通知
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
    
    const statusDisplay = {
      draft: '草稿',
      open: '待分配',
      assigned: '已分配',
      accepted: '已接受',
      in_progress: '进行中',
      completed: '已完成',
      confirmed: '已确认'
    };

    const messageText = `🔄 任务状态更新

📋 任务：${taskName}
👤 操作人：${userName}
📊 状态：${statusDisplay[fromStatus]} → ${statusDisplay[toStatus]}
⏰ 时间：${new Date(timestamp).toLocaleString()}

${this.getStatusSpecificMessage(fromStatus, toStatus)}`;

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

  // 获取用户的LINE ID（模拟）
  private async getUserLineId(userId: string): Promise<string | null> {
    // TODO: 从数据库获取用户的LINE ID
    // 这里暂时返回模拟数据
    const mockLineIds: Record<string, string> = {
      '1': 'U1234567890abcdef', // 山田太郎
      '2': 'U2345678901bcdefg', // 佐藤花子
      '3': 'U3456789012cdefgh', // 鈴木一郎
    };
    
    return mockLineIds[userId] || null;
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
        text: '🧪 这是一条测试消息\n\nHUG清洁任务管理系统通知功能测试成功！'
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