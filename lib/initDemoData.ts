import { supabase } from './supabase';
import { DEMO_OWNER_ID, DEMO_MANAGER_ID, DEMO_CLEANER_ID, DEMO_USERS } from './demoUsers';

// 测试酒店的固定UUID
export const DEMO_HOTEL_1_ID = '00000000-0000-0000-0000-000000000101'; // 河源町之宿
export const DEMO_HOTEL_2_ID = '00000000-0000-0000-0000-000000000102'; // 北野kitano

/**
 * 初始化测试账号的演示数据
 * 包括：两个酒店、manager权限、三个任务
 */
export async function initDemoData(): Promise<{ success: boolean; error?: string }> {
  try {
    // 0. 首先确保测试用户存在于数据库中
    const testUsers = [
      DEMO_USERS.owner,
      DEMO_USERS.manager,
      DEMO_USERS.cleaner,
    ];

    // 使用 upsert 创建或更新测试用户
    const { error: userError } = await supabase
      .from('user_profiles')
      .upsert(
        testUsers.map(user => ({
          id: user.id,
          line_user_id: user.line_user_id,
          name: user.name,
          katakana: user.katakana,
          avatar: user.avatar,
          role: user.role,
          phone: user.phone,
          created_at: user.created_at,
          updated_at: user.updated_at,
        })),
        { onConflict: 'id' }
      );

    if (userError) {
      console.error('创建测试用户失败:', userError);
      return { success: false, error: `创建测试用户失败: ${userError.message}` };
    }

    console.log('测试用户创建/更新成功');

    // 1. 创建两个酒店
    const hotels = [
      {
        id: DEMO_HOTEL_1_ID,
        name: '河源町之宿',
        address: '京都府京都市中京区河原町通四条上ル',
        owner_id: DEMO_OWNER_ID,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: DEMO_HOTEL_2_ID,
        name: '北野kitano',
        address: '兵庫県神戸市北区北野町',
        owner_id: DEMO_OWNER_ID,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // 使用 upsert 避免重复创建
    const { error: hotelError } = await supabase
      .from('hotels')
      .upsert(hotels, { onConflict: 'id' });

    if (hotelError) {
      console.error('创建酒店失败:', hotelError);
      return { success: false, error: '创建酒店失败' };
    }

    // 2. 为manager添加酒店管理权限
    const managerHotels = [
      {
        manager_id: DEMO_MANAGER_ID,
        hotel_id: DEMO_HOTEL_1_ID,
        created_at: new Date().toISOString(),
      },
      {
        manager_id: DEMO_MANAGER_ID,
        hotel_id: DEMO_HOTEL_2_ID,
        created_at: new Date().toISOString(),
      },
    ];

    const { error: managerHotelError } = await supabase
      .from('manager_hotels')
      .upsert(managerHotels, { onConflict: 'manager_id,hotel_id' });

    if (managerHotelError) {
      console.error('创建manager酒店权限失败:', managerHotelError);
      return { success: false, error: '创建manager酒店权限失败' };
    }

    // 3. 创建三个任务
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    const tasks = [
      // 任务1：状态为accepted，已分配给cleaner
      {
        id: '00000000-0000-0000-0000-000000000201',
        hotel_id: DEMO_HOTEL_1_ID,
        hotel_name: '河源町之宿',
        hotel_address: '京都府京都市中京区河原町通四条上ル',
        check_in_date: today.toISOString().split('T')[0],
        check_out_date: tomorrow.toISOString().split('T')[0],
        cleaning_date: tomorrow.toISOString().split('T')[0],
        check_in_time: '15:00',
        guest_count: 3,
        status: 'accepted',
        description: '清掃タスク',
        created_by: DEMO_OWNER_ID,
        assigned_cleaners: [DEMO_CLEANER_ID],
        accepted_by: [DEMO_CLEANER_ID],
        lock_password: '123456',
        owner_notes: null,
        cleaner_notes: null,
        manager_report_notes: null,
        created_at: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2天前创建
        updated_at: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1天前更新
      },
      // 任务2：状态为completed，有manager报告
      {
        id: '00000000-0000-0000-0000-000000000202',
        hotel_id: DEMO_HOTEL_2_ID,
        hotel_name: '北野kitano',
        hotel_address: '兵庫県神戸市北区北野町',
        check_in_date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3天前入住
        check_out_date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1天前退房
        cleaning_date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1天前清扫
        check_in_time: '15:00',
        guest_count: 2,
        status: 'completed',
        description: '清掃タスク',
        created_by: DEMO_OWNER_ID,
        assigned_cleaners: [DEMO_CLEANER_ID],
        accepted_by: [DEMO_CLEANER_ID],
        lock_password: '789012',
        owner_notes: null,
        cleaner_notes: '清掃完了しました。',
        manager_report_notes: '電気ポットが故障しました。交換をお願いします。',
        completed_at: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4天前创建
        updated_at: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1天前更新
      },
      // 任务3：状态为open，待分配
      {
        id: '00000000-0000-0000-0000-000000000203',
        hotel_id: DEMO_HOTEL_1_ID,
        hotel_name: '河源町之宿',
        hotel_address: '京都府京都市中京区河原町通四条上ル',
        check_in_date: dayAfterTomorrow.toISOString().split('T')[0],
        check_out_date: new Date(dayAfterTomorrow.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        cleaning_date: new Date(dayAfterTomorrow.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        check_in_time: '15:00',
        guest_count: 1,
        status: 'open',
        description: '清掃タスク',
        created_by: DEMO_OWNER_ID,
        assigned_cleaners: [],
        accepted_by: [],
        lock_password: null,
        owner_notes: null,
        cleaner_notes: null,
        manager_report_notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // 先删除可能存在的旧任务
    await supabase
      .from('tasks')
      .delete()
      .in('id', tasks.map(t => t.id));

    const { error: taskError } = await supabase
      .from('tasks')
      .insert(tasks);

    if (taskError) {
      console.error('创建任务失败:', taskError);
      return { success: false, error: `创建任务失败: ${taskError.message}` };
    }

    // 4. 创建任务分配记录（任务1的分配记录，包含manager备注）
    const taskAssignments = [
      {
        task_id: '00000000-0000-0000-0000-000000000201',
        cleaner_id: DEMO_CLEANER_ID,
        assigned_by: DEMO_MANAGER_ID,
        status: 'accepted',
        notes: 'お客様3名、15：00までに完了、ドアパスワード123456',
        assigned_at: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        task_id: '00000000-0000-0000-0000-000000000202',
        cleaner_id: DEMO_CLEANER_ID,
        assigned_by: DEMO_MANAGER_ID,
        status: 'accepted',
        notes: null,
        assigned_at: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    // 先删除可能存在的旧记录
    await supabase
      .from('task_assignments')
      .delete()
      .in('task_id', ['00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000202']);

    const { error: assignmentError } = await supabase
      .from('task_assignments')
      .insert(taskAssignments);

    if (assignmentError) {
      console.error('创建任务分配失败:', assignmentError);
      // 不返回错误，因为任务已经创建成功
      console.warn('任务分配创建失败，但任务已创建');
    }

    console.log('测试数据初始化成功');
    return { success: true };
  } catch (error) {
    console.error('初始化测试数据失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

/**
 * 检查测试数据是否已初始化
 */
export async function checkDemoDataInitialized(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('hotels')
      .select('id')
      .eq('id', DEMO_HOTEL_1_ID)
      .single();

    if (error || !data) {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
}

