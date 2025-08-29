import { NextRequest, NextResponse } from 'next/server';
import { processLineLogin, processLineRegistration, generateLineAuthUrl, parseState } from '@/lib/lineAuth';
import { supabase } from '@/lib/supabase';

// 处理LINE OAuth登录
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const mode = searchParams.get('mode'); // 登录或注册模式

  // 处理错误
  if (error) {
    console.error('LINE OAuth error:', error);
    const redirectUrl = mode === 'register' ? '/register?error=oauth_failed' : '/login?error=oauth_failed';
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  // 如果没有授权码，重定向到LINE授权页面
  if (!code) {
    // 从URL参数或state中获取mode
    let authMode = mode;
    if (state && !mode) {
      try {
        const stateData = parseState(state);
        authMode = stateData.mode;
      } catch (error) {
        console.error('Failed to parse state:', error);
        authMode = 'login';
      }
    }
    
    const authUrl = generateLineAuthUrl(state || undefined, authMode || undefined);
    return NextResponse.redirect(authUrl);
  }

  try {
    // 从state中解析mode
    let authMode = mode;
    if (state && !mode) {
      try {
        const stateData = parseState(state);
        authMode = stateData.mode;
      } catch (error) {
        console.error('Failed to parse state:', error);
        authMode = 'login';
      }
    }

    console.log('Processing LINE auth with mode:', authMode);

    if (authMode === 'register') {
      // 注册模式：只获取用户信息，不创建档案
      console.log('Processing LINE registration with code:', code);
      const userProfile = await processLineRegistration(code);
      console.log('LINE registration successful, user profile:', userProfile);
      
      // 将用户信息存储到临时session（这里简化处理，直接重定向到注册页面）
      // 在实际生产环境中，应该使用Redis或数据库临时存储
      const redirectUrl = new URL('/register', request.url);
      redirectUrl.searchParams.set('lineUserId', userProfile.userId);
      redirectUrl.searchParams.set('displayName', userProfile.displayName);
      if (userProfile.pictureUrl) {
        redirectUrl.searchParams.set('pictureUrl', userProfile.pictureUrl);
      }
      console.log('Redirecting to registration page:', redirectUrl.toString());
      
      return NextResponse.redirect(redirectUrl);
    } else if (authMode === 'check_roles') {
      // 角色检测模式：检查用户是否已有注册的角色
      console.log('Processing LINE role check with code:', code);
      const userProfile = await processLineRegistration(code);
      console.log('LINE role check successful, user profile:', userProfile);
      
      // 检查该LINE用户是否已有注册的角色
      const { data: existingRoles, error } = await supabase
        .from('user_profiles')
        .select('id, name, katakana, role')
        .eq('line_user_id', userProfile.userId);
      
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('lineUserId', userProfile.userId);
      
      if (existingRoles && existingRoles.length > 0) {
        // 找到已有角色，显示角色选择器
        redirectUrl.searchParams.set('hasRoles', 'true');
        console.log(`Found ${existingRoles.length} existing roles for user:`, userProfile.userId);
      } else {
        // 没有找到角色，跳转到注册页面
        redirectUrl.searchParams.set('hasRoles', 'false');
        redirectUrl.searchParams.set('displayName', userProfile.displayName);
        if (userProfile.pictureUrl) {
          redirectUrl.searchParams.set('pictureUrl', userProfile.pictureUrl);
        }
        console.log('No existing roles found for user:', userProfile.userId);
      }
      
      return NextResponse.redirect(redirectUrl);
    } else {
      // 登录模式：处理完整登录流程
      console.log('Processing LINE login with code:', code);
      const { user, token } = await processLineLogin(code);
      console.log('LINE login successful, user:', user);

      const response = NextResponse.redirect(new URL('/dashboard', request.url));
      
      // 设置JWT token到cookie
      response.cookies.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // 开发环境不强制HTTPS
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
        secure: process.env.NODE_ENV === 'production', // 开发环境不强制HTTPS
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7天
        path: '/'
      });

      return response;
    }
  } catch (error) {
    console.error('LINE auth failed:', error);
    
    // 详细记录错误信息
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
    
    const errorMessage = mode === 'register' ? 'registration_failed' : 'login_failed';
    const redirectUrl = mode === 'register' ? '/register?error=' + errorMessage : '/login?error=' + errorMessage;
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }
}

// 处理POST请求（用于登出）
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'logout') {
    const response = NextResponse.json({ success: true });
    
    // 清除cookies
    response.cookies.set('auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });

    response.cookies.set('user_info', '', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });

    return response;
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
} 