import { NextRequest, NextResponse } from 'next/server';
import { getLineAuthConfig } from '@/lib/lineAuth';

export async function GET(request: NextRequest) {
  try {
    const config = getLineAuthConfig();
    
    // 检查配置完整性
    const missingVars = [];
    if (!config.channelId) missingVars.push('LINE_LOGIN_CHANNEL_ID');
    if (!config.channelSecret) missingVars.push('LINE_LOGIN_CHANNEL_SECRET');
    if (!config.redirectUri) missingVars.push('LINE_REDIRECT_URI');
    if (!config.jwtSecret) missingVars.push('JWT_SECRET');

    const status = {
      configured: missingVars.length === 0,
      missingVariables: missingVars,
      config: {
        channelId: config.channelId ? `${config.channelId.substring(0, 8)}...` : '未设置',
        channelSecret: config.channelSecret ? `${config.channelSecret.substring(0, 8)}...` : '未设置',
        redirectUri: config.redirectUri || '未设置',
        jwtSecret: config.jwtSecret ? `${config.jwtSecret.substring(0, 8)}...` : '未设置'
      },
      recommendations: [] as string[]
    };

    // 添加建议
    if (missingVars.length > 0) {
      status.recommendations.push('请在 .env.local 文件中设置缺失的环境变量');
    }
    
    if (config.redirectUri && !config.redirectUri.includes('localhost:3000')) {
      status.recommendations.push('LINE_REDIRECT_URI 应该指向 http://localhost:3000/api/auth/line');
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error('配置检查失败:', error);
    return NextResponse.json(
      { error: '配置检查失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
} 