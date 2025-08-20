import { supabase } from './supabase';
import jwt from 'jsonwebtoken';

// LINE OAuth配置
export interface LineAuthConfig {
  channelId: string;
  channelSecret: string;
  redirectUri: string;
  jwtSecret: string;
}

// LINE用户信息
export interface LineUserProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

// JWT Token载荷
export interface JWTPayload {
  userId: string;
  lineUserId: string;
  role: string;
  iat: number;
  exp: number;
}

// 获取LINE OAuth配置
export function getLineAuthConfig(): LineAuthConfig {
  return {
    channelId: process.env.LINE_LOGIN_CHANNEL_ID || '',
    channelSecret: process.env.LINE_LOGIN_CHANNEL_SECRET || '',
    redirectUri: process.env.LINE_REDIRECT_URI || '',
    jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret'
  };
}

// 生成LINE OAuth授权URL
export function generateLineAuthUrl(state?: string, mode?: string): string {
  const config = getLineAuthConfig();
  
  // 将mode编码到state中
  const stateData = {
    state: state || Math.random().toString(36).substring(7),
    mode: mode || 'login'
  };
  const encodedState = Buffer.from(JSON.stringify(stateData)).toString('base64');
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.channelId,
    redirect_uri: config.redirectUri,
    scope: 'profile openid',
    state: encodedState
  });
  
  return `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;
}

// 解析state中的mode信息
export function parseState(state: string): { state: string; mode: string } {
  try {
    const decoded = Buffer.from(state, 'base64').toString();
    return JSON.parse(decoded);
  } catch (error) {
    // 如果解析失败，返回默认值
    return { state, mode: 'login' };
  }
}

// 通过授权码获取访问令牌
export async function getLineAccessToken(code: string): Promise<string> {
  const config = getLineAuthConfig();
  
  console.log('Getting LINE access token with config:', {
    channelId: config.channelId ? `${config.channelId.substring(0, 8)}...` : '未设置',
    redirectUri: config.redirectUri,
    code: code ? `${code.substring(0, 10)}...` : '未设置'
  });
  
  const response = await fetch('https://api.line.me/oauth2/v2.1/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
      client_id: config.channelId,
      client_secret: config.channelSecret,
    }),
  });

  console.log('LINE token response status:', response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('LINE OAuth token request failed:', {
      status: response.status,
      statusText: response.statusText,
      errorText
    });
    throw new Error(`LINE OAuth token request failed: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  console.log('LINE token response success:', {
    accessToken: data.access_token ? `${data.access_token.substring(0, 10)}...` : '未返回'
  });
  return data.access_token;
}

// 获取LINE用户信息
export async function getLineUserProfile(accessToken: string): Promise<LineUserProfile> {
  const response = await fetch('https://api.line.me/v2/profile', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get LINE user profile: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    userId: data.userId,
    displayName: data.displayName,
    pictureUrl: data.pictureUrl,
    statusMessage: data.statusMessage,
  };
}

// 创建或更新用户档案
export async function createOrUpdateUserProfile(lineProfile: LineUserProfile): Promise<any> {
  const { data: existingUser } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('line_user_id', lineProfile.userId)
    .single();

  if (existingUser) {
    // 更新现有用户
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        name: lineProfile.displayName,
        avatar: lineProfile.pictureUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('line_user_id', lineProfile.userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    // 创建新用户
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        line_user_id: lineProfile.userId,
        name: lineProfile.displayName,
        katakana: '', // 需要用户后续填写
        avatar: lineProfile.pictureUrl,
        role: 'cleaner', // 默认角色，后续可修改
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

// 生成JWT Token
export function generateJWTToken(userId: string, lineUserId: string, role: string): string {
  const config = getLineAuthConfig();
  const payload: JWTPayload = {
    userId,
    lineUserId,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7天过期
  };

  return jwt.sign(payload, config.jwtSecret);
}

// 验证JWT Token
export function verifyJWTToken(token: string): JWTPayload | null {
  try {
    const config = getLineAuthConfig();
    return jwt.verify(token, config.jwtSecret) as JWTPayload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

// 完整的LINE登录流程
export async function processLineLogin(code: string): Promise<{
  user: any;
  token: string;
}> {
  try {
    // 1. 获取访问令牌
    const accessToken = await getLineAccessToken(code);
    
    // 2. 获取用户信息
    const lineProfile = await getLineUserProfile(accessToken);
    
    // 3. 创建或更新用户档案
    const user = await createOrUpdateUserProfile(lineProfile);
    
    // 4. 生成JWT Token
    const token = generateJWTToken(user.id.toString(), lineProfile.userId, user.role);
    
    return { user, token };
  } catch (error) {
    console.error('LINE login process failed:', error);
    throw error;
  }
} 

// 处理LINE注册流程（只获取用户信息，不创建档案）
export async function processLineRegistration(code: string): Promise<LineUserProfile> {
  try {
    // 获取访问令牌
    const accessToken = await getLineAccessToken(code);
    
    // 获取用户信息
    const userProfile = await getLineUserProfile(accessToken);
    
    return userProfile;
  } catch (error) {
    console.error('LINE registration failed:', error);
    throw new Error('LINE注册失败');
  }
} 