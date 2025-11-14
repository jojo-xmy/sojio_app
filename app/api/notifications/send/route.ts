import { NextRequest, NextResponse } from 'next/server';
import { sendPendingLineNotifications } from '@/lib/notificationService';

// LINE Bot配置（从环境变量获取）
const LINE_BOT_CONFIG = {
  channelAccessToken: process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_MESSAGING_CHANNEL_SECRET || ''
};

export async function POST(request: NextRequest) {
  try {
    // 验证请求权限（可以添加API密钥验证）
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.NOTIFICATION_API_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 发送待发送的通知
    const result = await sendPendingLineNotifications(LINE_BOT_CONFIG);

    return NextResponse.json({
      success: result.success,
      sentCount: result.sentCount,
      errors: result.errors
    });
  } catch (error) {
    console.error('发送通知API错误:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 定时任务触发（可选）
export async function GET() {
  try {
    // 简单的健康检查
    return NextResponse.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      message: 'Notification service is running'
    });
  } catch (error) {
    console.error('通知服务健康检查失败:', error);
    return NextResponse.json(
      { error: 'Service unavailable' },
      { status: 503 }
    );
  }
}
