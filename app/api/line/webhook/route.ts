import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// LINE Webhook处理
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-line-signature');

    // 验证Webhook签名
    if (!verifyWebhookSignature(body, signature)) {
      console.error('Webhook签名验证失败');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const events = JSON.parse(body).events;
    
    // 处理每个事件
    for (const event of events) {
      await handleLineEvent(event);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook处理错误:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 验证Webhook签名
function verifyWebhookSignature(body: string, signature: string | null): boolean {
  if (!signature) return false;
  
  const channelSecret = process.env.LINE_MESSAGING_CHANNEL_SECRET;
  if (!channelSecret) {
    console.error('LINE_MESSAGING_CHANNEL_SECRET 未配置');
    return false;
  }

  const hash = crypto
    .createHmac('SHA256', channelSecret)
    .update(body)
    .digest('base64');

  return signature === hash;
}

// 处理LINE事件
async function handleLineEvent(event: any) {
  console.log('收到LINE事件:', event.type);

  switch (event.type) {
    case 'message':
      await handleMessageEvent(event);
      break;
    case 'postback':
      await handlePostbackEvent(event);
      break;
    case 'follow':
      await handleFollowEvent(event);
      break;
    case 'unfollow':
      await handleUnfollowEvent(event);
      break;
    default:
      console.log('未处理的事件类型:', event.type);
  }
}

// 处理消息事件
async function handleMessageEvent(event: any) {
  const { message, source } = event;
  
  if (message.type === 'text') {
    const text = message.text.toLowerCase();
    
    // 解析用户指令
    if (text.includes('接受任务') || text.includes('accept')) {
      await handleAcceptTask(source.userId);
    } else if (text.includes('完成任务') || text.includes('complete')) {
      await handleCompleteTask(source.userId);
    } else if (text.includes('开始任务') || text.includes('start')) {
      await handleStartTask(source.userId);
    } else if (text.includes('查看任务') || text.includes('tasks')) {
      await handleViewTasks(source.userId);
    } else {
      // 默认回复
      await sendDefaultReply(source.userId);
    }
  }
}

// 处理快速回复事件
async function handlePostbackEvent(event: any) {
  const { postback, source } = event;
  const data = postback.data;
  
  switch (data) {
    case 'accept_task':
      await handleAcceptTask(source.userId);
      break;
    case 'complete_task':
      await handleCompleteTask(source.userId);
      break;
    case 'start_task':
      await handleStartTask(source.userId);
      break;
    case 'view_tasks':
      await handleViewTasks(source.userId);
      break;
    default:
      console.log('未知的postback数据:', data);
  }
}

// 处理关注事件
async function handleFollowEvent(event: any) {
  const { source } = event;
  
  // 发送欢迎消息
  await sendWelcomeMessage(source.userId);
}

// 处理取消关注事件
async function handleUnfollowEvent(event: any) {
  const { source } = event;
  
  // 可以在这里处理用户取消关注的逻辑
  console.log('用户取消关注:', source.userId);
}

// 处理接受任务
async function handleAcceptTask(userId: string) {
  // TODO: 实现接受任务的逻辑
  console.log('用户接受任务:', userId);
  
  // 发送确认消息
  await sendLineMessage(userId, {
    type: 'text',
    content: {
      text: '✅ 任务已接受！\n\n请按时开始工作，如有问题请及时联系。'
    }
  });
}

// 处理完成任务
async function handleCompleteTask(userId: string) {
  // TODO: 实现完成任务的逻辑
  console.log('用户完成任务:', userId);
  
  // 发送确认消息
  await sendLineMessage(userId, {
    type: 'text',
    content: {
      text: '🎉 任务已完成！\n\n请上传清洁照片并填写备品信息。'
    }
  });
}

// 处理开始任务
async function handleStartTask(userId: string) {
  // TODO: 实现开始任务的逻辑
  console.log('用户开始任务:', userId);
  
  // 发送确认消息
  await sendLineMessage(userId, {
    type: 'text',
    content: {
      text: '🚀 任务已开始！\n\n请认真完成清洁工作，注意安全。'
    }
  });
}

// 处理查看任务
async function handleViewTasks(userId: string) {
  // TODO: 实现查看任务的逻辑
  console.log('用户查看任务:', userId);
  
  // 发送任务列表
  await sendLineMessage(userId, {
    type: 'text',
    content: {
      text: '📋 您的任务列表：\n\n1. 京都Villa - 3楼A房\n   状态：已分配\n   时间：今天 15:00\n\n2. 大阪Inn - 2楼B房\n   状态：进行中\n   时间：今天 16:00'
    }
  });
}

// 发送默认回复
async function sendDefaultReply(userId: string) {
  await sendLineMessage(userId, {
    type: 'text',
    content: {
      text: '👋 欢迎使用SoJio清洁管理系统！\n\n可用指令：\n• 接受任务\n• 开始任务\n• 完成任务\n• 查看任务\n\n或点击下方按钮快速操作。'
    }
  });
}

// 发送欢迎消息
async function sendWelcomeMessage(userId: string) {
  await sendLineMessage(userId, {
    type: 'text',
    content: {
      text: '🎉 欢迎关注SoJio清洁管理系统！\n\n我是您的清洁任务助手，可以帮您：\n• 接收任务通知\n• 快速响应任务操作\n• 查看任务状态\n\n请等待任务分配通知！'
    }
  });
}

// 发送LINE消息
async function sendLineMessage(userId: string, message: any) {
  const accessToken = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.error('LINE_MESSAGING_CHANNEL_ACCESS_TOKEN 未配置');
    return;
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [message],
      }),
    });

    if (!response.ok) {
      console.error('发送LINE消息失败:', response.statusText);
    } else {
      console.log('LINE消息发送成功');
    }
  } catch (error) {
    console.error('发送LINE消息时出错:', error);
  }
} 