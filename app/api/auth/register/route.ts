import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const {
      lineUserId,
      name,
      avatar,
      role
    } = await request.json();

    console.log('Registration request received:', {
      lineUserId,
      name,
      role,
      avatar: avatar ? 'provided' : 'not provided'
    });

    // 验证必填字段
    if (!lineUserId || !name || !role) {
      console.error('Missing required fields:', { lineUserId, name, role });
      return NextResponse.json(
        { error: '缺少必填字段' },
        { status: 400 }
      );
    }

    // 检查用户是否已存在（同一LINE ID + 角色）
    try {
      const { data: existingUser, error: checkError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('line_user_id', lineUserId)
        .eq('role', role)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing user:', checkError);
        return NextResponse.json(
          { error: '检查用户状态失败' },
          { status: 500 }
        );
      }

      if (existingUser) {
        console.log('User already exists with this role:', existingUser);
        const roleName = role === 'cleaner' ? '清洁员' : role === 'manager' ? '管理员' : '房东';
        return NextResponse.json(
          { error: `该LINE账号已注册为${roleName}` },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error('Error in user check:', error);
      return NextResponse.json(
        { error: '检查用户状态失败' },
        { status: 500 }
      );
    }

    // 检查是否需要管理员审核
    const requiresApproval = role === 'manager' || role === 'owner';

    // 尝试创建注册申请记录
    let registration = null;
    try {
      const { data: regData, error: registrationError } = await supabase
        .from('registration_applications')
        .insert({
          line_user_id: lineUserId,
          name,
          avatar,
          role,
          status: requiresApproval ? 'pending' : 'approved',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (registrationError) {
        console.error('创建注册申请失败:', registrationError);
        
        // 如果表不存在，直接创建用户档案
        if (registrationError.code === '42P01') {
          console.log('registration_applications表不存在，直接创建用户档案');
        } else {
          return NextResponse.json(
            { error: '创建注册申请失败: ' + registrationError.message },
            { status: 500 }
          );
        }
      } else {
        registration = regData;
      }
    } catch (error) {
      console.error('注册申请创建异常:', error);
      // 继续执行，尝试直接创建用户档案
    }

    if (requiresApproval) {
      // 需要管理员审核
      console.log('新注册申请需要审核:', registration);
      
      return NextResponse.json({
        status: 'pending',
        message: '注册申请已提交，等待管理员审核'
      });
    } else {
      // 直接创建用户档案
      try {
        const { data: user, error: userError } = await supabase
          .from('user_profiles')
          .insert({
            line_user_id: lineUserId,
            name,
            avatar,
            role,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (userError) {
          console.error('创建用户档案失败:', userError);
          return NextResponse.json(
            { error: '创建用户档案失败: ' + userError.message },
            { status: 500 }
          );
        }

        console.log('用户档案创建成功:', user);

        // 如果注册申请存在，更新状态
        if (registration) {
          try {
            await supabase
              .from('registration_applications')
              .update({ status: 'approved', approved_at: new Date().toISOString() })
              .eq('id', registration.id);
          } catch (error) {
            console.error('更新注册申请状态失败:', error);
            // 不影响主流程
          }
        }

        return NextResponse.json({
          status: 'approved',
          message: '注册成功',
          user
        });
      } catch (error) {
        console.error('用户档案创建异常:', error);
        return NextResponse.json(
          { error: '创建用户档案失败' },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error('注册失败:', error);
    return NextResponse.json(
      { error: '注册失败: ' + (error instanceof Error ? error.message : '未知错误') },
      { status: 500 }
    );
  }
} 