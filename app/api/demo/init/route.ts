import { NextRequest, NextResponse } from 'next/server';
import { initDemoData, checkDemoDataInitialized } from '@/lib/initDemoData';
import { isDemoUser } from '@/lib/demoUsers';

/**
 * 初始化测试账号的演示数据
 * GET: 检查是否已初始化
 * POST: 初始化数据
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lineUserId = searchParams.get('lineUserId');

    // 只允许测试账号初始化
    if (!lineUserId || !isDemoUser(lineUserId)) {
      return NextResponse.json(
        { error: '只有测试账号可以初始化数据' },
        { status: 403 }
      );
    }

    const initialized = await checkDemoDataInitialized();
    return NextResponse.json({ initialized });
  } catch (error) {
    console.error('检查测试数据状态失败:', error);
    return NextResponse.json(
      { error: '检查失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { lineUserId } = await request.json();

    // 只允许测试账号初始化
    if (!lineUserId || !isDemoUser(lineUserId)) {
      return NextResponse.json(
        { error: '只有测试账号可以初始化数据' },
        { status: 403 }
      );
    }

    const result = await initDemoData();
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: '测试数据初始化成功' 
      });
    } else {
      return NextResponse.json(
        { error: result.error || '初始化失败' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('初始化测试数据失败:', error);
    return NextResponse.json(
      { error: '初始化失败' },
      { status: 500 }
    );
  }
}


