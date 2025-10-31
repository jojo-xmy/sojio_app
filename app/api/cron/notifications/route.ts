import { NextRequest, NextResponse } from 'next/server';
import { sendPendingLineNotifications } from '@/lib/notificationService';

// LINE Bot配置
const LINE_BOT_CONFIG = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || ''
};

export async function GET(request: NextRequest) {
  try {
    // 验证Cron Secret（Vercel Cron Jobs会发送这个header）
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('开始执行定时通知任务...');
    
    // 发送待发送的通知
    const result = await sendPendingLineNotifications(LINE_BOT_CONFIG);

    console.log('定时通知任务完成:', {
      success: result.success,
      sentCount: result.sentCount,
      errorCount: result.errors.length
    });

    return NextResponse.json({
      success: result.success,
      sentCount: result.sentCount,
      errors: result.errors,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('定时通知任务失败:', error);
    return NextResponse.json(
      { 
        error: 'Cron job failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
