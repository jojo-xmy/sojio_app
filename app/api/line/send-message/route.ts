import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('[API] ===== LINE消息发送API被调用 =====');
  
  try {
    const body = await request.json();
    const { userId, message } = body;

    console.log('[API] 请求参数:', {
      userId,
      messageType: message?.type,
      hasText: !!message?.text
    });

    if (!userId || !message) {
      console.error('[API] 缺少必要参数');
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const lineToken = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;
    if (!lineToken) {
      console.error('[API] LINE_MESSAGING_CHANNEL_ACCESS_TOKEN 未配置');
      return NextResponse.json(
        { error: 'LINE Messaging Channel Access Token 未配置' },
        { status: 500 }
      );
    }

    console.log('[API] 准备调用LINE Push API...');
    console.log('[API] 目标用户:', userId);
    console.log('[API] 消息内容:', JSON.stringify(message, null, 2));

    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lineToken}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [message],
      }),
    });

    console.log('[API] LINE API响应状态:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] LINE API返回错误:', {
        status: response.status,
        error: errorText
      });
      
      return NextResponse.json(
        { error: 'LINE API 调用失败', details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('[API] LINE API返回成功:', result);
    console.log('[API] ===== LINE消息发送完成 =====');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] 发送LINE消息时出错:', error);
    return NextResponse.json(
      { error: '服务器内部错误', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
} 