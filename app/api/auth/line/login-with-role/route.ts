import { NextRequest, NextResponse } from 'next/server';
import { generateJWTToken } from '@/lib/lineAuth';
import { isDemoUser, DEMO_LINE_USER_ID } from '@/lib/demoUsers';
import { initDemoData, checkDemoDataInitialized } from '@/lib/initDemoData';

// 通过选定的角色登录
export async function POST(request: NextRequest) {
  try {
    const { user } = await request.json();

    if (!user) {
      return NextResponse.json(
        { error: '缺少用户信息' },
        { status: 400 }
      );
    }

    // 如果是测试账号，自动初始化测试数据（如果尚未初始化）
    if (isDemoUser(user.line_user_id)) {
      try {
        const initialized = await checkDemoDataInitialized();
        if (!initialized) {
          console.log('检测到测试账号首次登录，开始初始化测试数据...');
          await initDemoData();
          console.log('测试数据初始化完成');
        }
      } catch (initError) {
        console.error('初始化测试数据失败（不影响登录）:', initError);
        // 不阻止登录，即使初始化失败
      }
    }

    // 生成JWT Token
    const token = generateJWTToken(user.id.toString(), user.line_user_id, user.role);

    const response = NextResponse.json({
      success: true,
      user,
      token
    });

    // 设置JWT token到cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7天
      path: '/'
    });

    // 设置用户信息到cookie（用于客户端访问）- 统一使用 line_user_id 字段名
    response.cookies.set('user_info', JSON.stringify({
      id: user.id,
      name: user.name,
      katakana: user.katakana,
      role: user.role,
      avatar: user.avatar,
      line_user_id: user.line_user_id
    }), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7天
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('角色登录失败:', error);
    return NextResponse.json(
      { error: '登录失败' },
      { status: 500 }
    );
  }
}

