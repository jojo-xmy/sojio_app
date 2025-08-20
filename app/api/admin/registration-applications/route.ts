import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 获取所有待审核的注册申请
export async function GET(request: NextRequest) {
  try {
    const { data: applications, error } = await supabase
      .from('registration_applications')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取注册申请失败:', error);
      return NextResponse.json(
        { error: '获取注册申请失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      applications: applications || []
    });
  } catch (error) {
    console.error('获取注册申请失败:', error);
    return NextResponse.json(
      { error: '获取注册申请失败' },
      { status: 500 }
    );
  }
}

// 审核注册申请
export async function POST(request: NextRequest) {
  try {
    const { applicationId, action, reviewNotes, reviewerId } = await request.json();

    if (!applicationId || !action || !reviewerId) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    if (!['approved', 'rejected'].includes(action)) {
      return NextResponse.json(
        { error: '无效的审核操作' },
        { status: 400 }
      );
    }

    // 获取注册申请详情
    const { data: application, error: fetchError } = await supabase
      .from('registration_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      return NextResponse.json(
        { error: '注册申请不存在' },
        { status: 404 }
      );
    }

    if (application.status !== 'pending') {
      return NextResponse.json(
        { error: '该申请已被审核' },
        { status: 400 }
      );
    }

    // 更新注册申请状态
    const { error: updateError } = await supabase
      .from('registration_applications')
      .update({
        status: action,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes || null
      })
      .eq('id', applicationId);

    if (updateError) {
      console.error('更新注册申请状态失败:', updateError);
      return NextResponse.json(
        { error: '更新申请状态失败' },
        { status: 500 }
      );
    }

    if (action === 'approved') {
      // 创建用户档案
      const { data: user, error: userError } = await supabase
        .from('user_profiles')
        .insert({
          line_user_id: application.line_user_id,
          name: application.name,
          avatar: application.avatar,
          role: application.role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (userError) {
        console.error('创建用户档案失败:', userError);
        return NextResponse.json(
          { error: '创建用户档案失败' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: '注册申请已批准，用户档案已创建',
        user
      });
    } else {
      return NextResponse.json({
        success: true,
        message: '注册申请已拒绝'
      });
    }
  } catch (error) {
    console.error('审核注册申请失败:', error);
    return NextResponse.json(
      { error: '审核失败' },
      { status: 500 }
    );
  }
}
