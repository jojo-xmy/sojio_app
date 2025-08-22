import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 获取用户的所有角色
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lineUserId = searchParams.get('lineUserId');

    if (!lineUserId) {
      return NextResponse.json(
        { error: '缺少LINE用户ID' },
        { status: 400 }
      );
    }

    const { data: userRoles, error } = await supabase
      .from('user_profiles')
      .select('id, name, katakana, role, avatar, created_at')
      .eq('line_user_id', lineUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取用户角色失败:', error);
      return NextResponse.json(
        { error: '获取用户角色失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      lineUserId,
      roles: userRoles || []
    });
  } catch (error) {
    console.error('获取用户角色失败:', error);
    return NextResponse.json(
      { error: '获取用户角色失败' },
      { status: 500 }
    );
  }
}

// 切换用户角色
export async function POST(request: NextRequest) {
  try {
    const { lineUserId, role } = await request.json();

    if (!lineUserId || !role) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 查找指定角色的用户档案
    const { data: userProfile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('line_user_id', lineUserId)
      .eq('role', role)
      .single();

    if (error || !userProfile) {
      return NextResponse.json(
        { error: '未找到该角色的用户档案' },
        { status: 404 }
      );
    }

    // 为返回的用户数据添加lineUserId字段
    const userData = {
      ...userProfile,
      lineUserId: userProfile.line_user_id
    };

    return NextResponse.json({
      success: true,
      user: userData
    });
  } catch (error) {
    console.error('切换角色失败:', error);
    return NextResponse.json(
      { error: '切换角色失败' },
      { status: 500 }
    );
  }
}

