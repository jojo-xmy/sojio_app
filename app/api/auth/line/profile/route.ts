import { NextRequest, NextResponse } from 'next/server';
import { getLineAccessToken, getLineUserProfile } from '@/lib/lineAuth';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: '缺少授权码' },
        { status: 400 }
      );
    }

    // 获取访问令牌
    const accessToken = await getLineAccessToken(code);
    
    // 获取用户信息
    const userProfile = await getLineUserProfile(accessToken);

    return NextResponse.json({
      userId: userProfile.userId,
      displayName: userProfile.displayName,
      pictureUrl: userProfile.pictureUrl,
      statusMessage: userProfile.statusMessage
    });
  } catch (error) {
    console.error('获取LINE用户信息失败:', error);
    return NextResponse.json(
      { error: '获取用户信息失败' },
      { status: 500 }
    );
  }
} 