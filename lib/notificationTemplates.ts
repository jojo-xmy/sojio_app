import { TaskStatus, UserRole } from '@/types/task';
import { LineMessageTemplate, NotificationData } from './notifications';

// 通知模板类型
export type NotificationTemplateType = 
  | 'task_assigned'      // 任务分配
  | 'task_accepted'      // 任务接受
  | 'task_started'       // 任务开始
  | 'task_completed'     // 任务完成
  | 'task_confirmed'     // 任务确认
  | 'task_reminder'      // 任务提醒
  | 'daily_summary'      // 每日总结
  | 'weekly_report'      // 周报
  | 'new_entry_created'; // 新入住登记创建（Owner手动通知Manager）

// 通知模板配置
export interface NotificationTemplate {
  type: NotificationTemplateType;
  title: string;
  description: string;
  emoji: string;
  priority: 'low' | 'medium' | 'high';
  roles: UserRole[];
  statuses: TaskStatus[];
}

// 模板配置
export const NOTIFICATION_TEMPLATES: Record<NotificationTemplateType, NotificationTemplate> = {
  task_assigned: {
    type: 'task_assigned',
    title: '任务分配通知',
    description: '您有新的清洁任务需要接受',
    emoji: '📋',
    priority: 'high',
    roles: ['cleaner'],
    statuses: ['assigned']
  },
  task_accepted: {
    type: 'task_accepted',
    title: '任务接受确认',
    description: '清洁员已接受任务',
    emoji: '✅',
    priority: 'medium',
    roles: ['manager', 'owner'],
    statuses: ['accepted']
  },
  task_started: {
    type: 'task_started',
    title: '任务开始通知',
    description: '清洁工作已开始',
    emoji: '🚀',
    priority: 'medium',
    roles: ['manager', 'owner'],
    statuses: ['in_progress']
  },
  task_completed: {
    type: 'task_completed',
    title: '任务完成通知',
    description: '清洁工作已完成，等待确认',
    emoji: '🎉',
    priority: 'high',
    roles: ['manager', 'owner'],
    statuses: ['completed']
  },
  task_confirmed: {
    type: 'task_confirmed',
    title: '任务确认通知',
    description: '任务已确认完成',
    emoji: '🏆',
    priority: 'medium',
    roles: ['cleaner'],
    statuses: ['confirmed']
  },
  task_reminder: {
    type: 'task_reminder',
    title: '任务提醒',
    description: '提醒您有即将到期的任务',
    emoji: '⏰',
    priority: 'medium',
    roles: ['cleaner', 'manager'],
    statuses: ['assigned', 'accepted']
  },
  daily_summary: {
    type: 'daily_summary',
    title: '每日总结',
    description: '今日任务完成情况总结',
    emoji: '📊',
    priority: 'low',
    roles: ['manager', 'owner'],
    statuses: ['completed', 'confirmed']
  },
  weekly_report: {
    type: 'weekly_report',
    title: '周报',
    description: '本周任务完成情况报告',
    emoji: '📈',
    priority: 'low',
    roles: ['manager', 'owner'],
    statuses: ['completed', 'confirmed']
  },
  new_entry_created: {
    type: 'new_entry_created',
    title: '新入住登记通知',
    description: 'Owner创建了新的入住登记，需要Manager安排清洁任务',
    emoji: '📋',
    priority: 'high',
    roles: ['manager'],
    statuses: ['draft', 'open']
  }
};

// 创建消息模板
export function createMessageTemplate(
  templateType: NotificationTemplateType,
  data: NotificationData
): LineMessageTemplate {
  const template = NOTIFICATION_TEMPLATES[templateType];
  
  switch (templateType) {
    case 'task_assigned':
      return createTaskAssignedMessage(data);
    case 'task_accepted':
      return createTaskAcceptedMessage(data);
    case 'task_started':
      return createTaskStartedMessage(data);
    case 'task_completed':
      return createTaskCompletedMessage(data);
    case 'task_confirmed':
      return createTaskConfirmedMessage(data);
    case 'task_reminder':
      return createTaskReminderMessage(data);
    case 'daily_summary':
      return createDailySummaryMessage(data);
    case 'weekly_report':
      return createWeeklyReportMessage(data);
    case 'new_entry_created':
      return createNewEntryMessage(data);
    default:
      return createDefaultMessage(data);
  }
}

// 任务分配消息
function createTaskAssignedMessage(data: NotificationData): LineMessageTemplate {
  return {
    type: 'text',
    content: {
      text: `${NOTIFICATION_TEMPLATES.task_assigned.emoji} ${NOTIFICATION_TEMPLATES.task_assigned.title}

📋 任务：${data.taskName}
👤 分配人：${data.userName}
⏰ 时间：${new Date(data.timestamp).toLocaleString()}

✅ 请及时接受任务并开始工作！
🔐 门锁密码：${data.additionalData?.lockPassword || '请查看任务详情'}

点击下方链接查看任务详情：
https://hug-app.com/task/${data.taskId}`
    }
  };
}

// 任务接受消息
function createTaskAcceptedMessage(data: NotificationData): LineMessageTemplate {
  return {
    type: 'text',
    content: {
      text: `${NOTIFICATION_TEMPLATES.task_accepted.emoji} ${NOTIFICATION_TEMPLATES.task_accepted.title}

📋 任务：${data.taskName}
👤 清洁员：${data.userName}
⏰ 接受时间：${new Date(data.timestamp).toLocaleString()}

✅ 清洁员已接受任务，将按时开始工作。

任务状态：已接受 → 进行中`
    }
  };
}

// 任务开始消息
function createTaskStartedMessage(data: NotificationData): LineMessageTemplate {
  return {
    type: 'text',
    content: {
      text: `${NOTIFICATION_TEMPLATES.task_started.emoji} ${NOTIFICATION_TEMPLATES.task_started.title}

📋 任务：${data.taskName}
👤 清洁员：${data.userName}
⏰ 开始时间：${new Date(data.timestamp).toLocaleString()}

🚀 清洁工作已开始，预计2-3小时完成。

任务状态：已接受 → 进行中`
    }
  };
}

// 任务完成消息
function createTaskCompletedMessage(data: NotificationData): LineMessageTemplate {
  return {
    type: 'text',
    content: {
      text: `${NOTIFICATION_TEMPLATES.task_completed.emoji} ${NOTIFICATION_TEMPLATES.task_completed.title}

📋 任务：${data.taskName}
👤 清洁员：${data.userName}
⏰ 完成时间：${new Date(data.timestamp).toLocaleString()}

🎉 清洁工作已完成！
📸 已上传 ${data.additionalData?.imageCount || 0} 张照片
📦 备品统计：${formatInventory(data.additionalData?.inventory)}

请及时确认任务完成情况。

任务状态：进行中 → 已完成`
    }
  };
}

// 任务确认消息
function createTaskConfirmedMessage(data: NotificationData): LineMessageTemplate {
  return {
    type: 'text',
    content: {
      text: `${NOTIFICATION_TEMPLATES.task_confirmed.emoji} ${NOTIFICATION_TEMPLATES.task_confirmed.title}

📋 任务：${data.taskName}
👤 确认人：${data.userName}
⏰ 确认时间：${new Date(data.timestamp).toLocaleString()}

🏆 任务已确认完成！
💯 工作质量：优秀
⭐ 感谢您的辛勤工作！

任务状态：已完成 → 已确认`
    }
  };
}

// 任务提醒消息
function createTaskReminderMessage(data: NotificationData): LineMessageTemplate {
  return {
    type: 'text',
    content: {
      text: `${NOTIFICATION_TEMPLATES.task_reminder.emoji} ${NOTIFICATION_TEMPLATES.task_reminder.title}

📋 任务：${data.taskName}
⏰ 提醒时间：${new Date(data.timestamp).toLocaleString()}

⚠️ 提醒：您有即将到期的任务需要处理！

请及时：
• 接受分配的任务
• 开始进行中的任务
• 完成即将到期的任务

任务状态：${data.fromStatus}`
    }
  };
}

// 每日总结消息
function createDailySummaryMessage(data: NotificationData): LineMessageTemplate {
  return {
    type: 'text',
    content: {
      text: `${NOTIFICATION_TEMPLATES.daily_summary.emoji} ${NOTIFICATION_TEMPLATES.daily_summary.title}

📅 日期：${new Date(data.timestamp).toLocaleDateString()}
👤 报告人：${data.userName}

📊 今日统计：
• 总任务数：${data.additionalData?.totalTasks || 0}
• 已完成：${data.additionalData?.completedTasks || 0}
• 进行中：${data.additionalData?.inProgressTasks || 0}
• 待处理：${data.additionalData?.pendingTasks || 0}

✅ 完成率：${data.additionalData?.completionRate || 0}%`
    }
  };
}

// 周报消息
function createWeeklyReportMessage(data: NotificationData): LineMessageTemplate {
  return {
    type: 'text',
    content: {
      text: `${NOTIFICATION_TEMPLATES.weekly_report.emoji} ${NOTIFICATION_TEMPLATES.weekly_report.title}

📅 周期：${data.additionalData?.weekRange || '本周'}
👤 报告人：${data.userName}

📈 本周统计：
• 总任务数：${data.additionalData?.totalTasks || 0}
• 已完成：${data.additionalData?.completedTasks || 0}
• 平均完成时间：${data.additionalData?.avgCompletionTime || 'N/A'}
• 客户满意度：${data.additionalData?.satisfaction || 'N/A'}

🏆 优秀清洁员：${data.additionalData?.topCleaner || 'N/A'}`
    }
  };
}

// 新入住登记通知消息
function createNewEntryMessage(data: NotificationData): LineMessageTemplate {
  const checkInDate = data.additionalData?.checkInDate 
    ? new Date(data.additionalData.checkInDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
    : '未设置';
  const checkOutDate = data.additionalData?.checkOutDate 
    ? new Date(data.additionalData.checkOutDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
    : '未设置';
  const cleaningDate = data.additionalData?.cleaningDate 
    ? new Date(data.additionalData.cleaningDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
    : '未设置';

  return {
    type: 'text',
    content: {
      text: `${NOTIFICATION_TEMPLATES.new_entry_created.emoji} ${NOTIFICATION_TEMPLATES.new_entry_created.title}

🏨 酒店：${data.taskName}
📍 地址：${data.additionalData?.hotelAddress || '未提供'}
👤 登记人：${data.userName}

📅 入住日期：${checkInDate}
📤 退房日期：${checkOutDate}
🧹 清扫日期：${cleaningDate}
👥 入住人数：${data.additionalData?.guestCount || 1}人

🔐 门锁密码：${data.additionalData?.lockPassword || '请查看详情'}

⏰ 通知时间：${new Date(data.timestamp).toLocaleString('zh-CN', { timeZone: 'Asia/Tokyo' })}

请及时安排清洁员进行任务分配。`
    }
  };
}

// 默认消息
function createDefaultMessage(data: NotificationData): LineMessageTemplate {
  return {
    type: 'text',
    content: {
      text: `🔄 任务状态更新

📋 任务：${data.taskName}
👤 操作人：${data.userName}
📊 状态：${data.fromStatus} → ${data.toStatus}
⏰ 时间：${new Date(data.timestamp).toLocaleString()}`
    }
  };
}

// 格式化备品信息
function formatInventory(inventory: any): string {
  if (!inventory) return '无数据';
  
  const items = [];
  for (const [key, value] of Object.entries(inventory)) {
    if (typeof value === 'number' && value > 0) {
      items.push(`${key}: ${value}`);
    }
  }
  
  return items.length > 0 ? items.join(', ') : '无备品';
}

// 获取模板配置
export function getTemplateConfig(type: NotificationTemplateType): NotificationTemplate {
  return NOTIFICATION_TEMPLATES[type];
}

// 检查用户是否应该接收此类型的通知
export function shouldReceiveNotification(
  templateType: NotificationTemplateType,
  userRole: UserRole
): boolean {
  const template = NOTIFICATION_TEMPLATES[templateType];
  return template.roles.includes(userRole);
} 