import { supabase } from './supabase';
import {
  DEMO_OWNER_ID,
  DEMO_MANAGER_ID,
  DEMO_CLEANER_ID,
  DEMO_USERS,
} from './demoUsers';

/**
 * 初始化测试账号的演示数据
 * 创建：测试用户、酒店、日历条目、任务、任务分配
 */
export async function initDemoData(): Promise<{ success: boolean; error?: string }> {
  try {
    // 0. 确保测试用户存在
    const testUsers = [DEMO_USERS.owner, DEMO_USERS.manager, DEMO_USERS.cleaner];
    const { error: userError } = await supabase
      .from('user_profiles')
      .upsert(
        testUsers.map((user) => ({
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
        { onConflict: 'id' },
      );
    if (userError) {
      console.error('创建测试用户失败:', userError);
      return { success: false, error: `创建测试用户失败: ${userError.message}` };
    }

    // 1. 创建酒店
    const hotels = [
      {
        id: '00000000-0000-0000-0000-000000000101', 
        name: '加茂ホテル',
        address: '京都府京都市中京区河原町通三条上ル',
        owner_id: DEMO_OWNER_ID,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '00000000-0000-0000-0000-000000000102', 
        name: '北野ホスト',
        address: '京都府京都市北野町349-2',
        owner_id: DEMO_OWNER_ID,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    await supabase.from('hotels').upsert(hotels, { onConflict: 'id' });

    // 2. manager 酒店权限
    const managerHotels = [
      {
        manager_id: DEMO_MANAGER_ID,
        hotel_id: hotels[0].id,
        created_at: new Date().toISOString(),
      },
      {
        manager_id: DEMO_MANAGER_ID,
        hotel_id: hotels[1].id,
        created_at: new Date().toISOString(),
      },
    ];
    await supabase.from('manager_hotels').upsert(managerHotels, { onConflict: 'manager_id,hotel_id' });

    // 日期准备
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    // 3. 创建日历条目（owner 页面使用）
    const calendarEntries = [
      {
        id: '00000000-0000-0000-0000-000000000301',
        hotel_id: hotels[0].id,
        check_in_date: today.toISOString().split('T')[0],
        check_out_date: tomorrow.toISOString().split('T')[0],
        guest_count: 3,
        owner_notes: 'お客様は午後3時に到着予定です。',
        cleaning_dates: [tomorrow.toISOString().split('T')[0]],
        created_by: DEMO_OWNER_ID,
        created_at: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '00000000-0000-0000-0000-000000000302',
        hotel_id: hotels[1].id,
        check_in_date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        check_out_date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        guest_count: 2,
        owner_notes: null,
        cleaning_dates: [new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]],
        created_by: DEMO_OWNER_ID,
        created_at: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '00000000-0000-0000-0000-000000000303',
        hotel_id: hotels[0].id,
        check_in_date: dayAfterTomorrow.toISOString().split('T')[0],
        check_out_date: new Date(dayAfterTomorrow.getTime() + 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        guest_count: 1,
        owner_notes: null,
        cleaning_dates: [
          new Date(dayAfterTomorrow.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        ],
        created_by: DEMO_OWNER_ID,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    await supabase.from('calendar_entries').delete().in('id', calendarEntries.map((e) => e.id));
    await supabase.from('calendar_entries').insert(calendarEntries);

    // 先清理可能由触发器自动创建的任务，避免重复（按 calendar_entry_id 清理）
    await supabase
      .from('tasks')
      .delete()
      .in('calendar_entry_id', calendarEntries.map((e) => e.id));

    // 4. 创建任务（manager/cleaner 页面使用），并关联日历条目
    const tasks = [
      {
        id: '00000000-0000-0000-0000-000000000201',
        hotel_id: hotels[0].id,
        hotel_name: hotels[0].name,
        hotel_address: hotels[0].address,
        check_in_date: today.toISOString().split('T')[0],
        check_out_date: tomorrow.toISOString().split('T')[0],
        cleaning_date: tomorrow.toISOString().split('T')[0],
        check_in_time: '15:00',
        guest_count: 3,
        status: 'accepted',
        description: 'お客様は3名で、午後3時までに清掃を終えていただければ大丈夫です。',
        created_by: DEMO_OWNER_ID,
        assigned_cleaners: [DEMO_CLEANER_ID],
        accepted_by: [DEMO_CLEANER_ID],
        lock_password: '123456',
        owner_notes:'お客様は午後3時に到着予定です。',
        cleaner_notes: null,
        manager_report_notes: null,
        calendar_entry_id: calendarEntries[0].id,
        created_at: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '00000000-0000-0000-0000-000000000202',
        hotel_id: hotels[1].id,
        hotel_name: hotels[1].name,
        hotel_address: hotels[1].address,
        check_in_date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        check_out_date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        cleaning_date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        check_in_time: '15:00',
        guest_count: 2,
        status: 'completed',
        description: 'お客様は2名です。洗面用品を2セットと、傘を2本ご準備ください。',
        created_by: DEMO_OWNER_ID,
        assigned_cleaners: [DEMO_CLEANER_ID],
        accepted_by: [DEMO_CLEANER_ID],
        lock_password: '789012',
        owner_notes: null,
        cleaner_notes: '電気ポットが故障しました。',
        manager_report_notes: '電気ポットが故障しました。交換をお願いします。',
        calendar_entry_id: calendarEntries[1].id,
        completed_at: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '00000000-0000-0000-0000-000000000203',
        hotel_id: hotels[0].id,
        hotel_name: hotels[0].name,
        hotel_address: hotels[0].address,
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
        calendar_entry_id: calendarEntries[2].id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    await supabase.from('tasks').delete().in('id', tasks.map((t) => t.id));
    await supabase.from('tasks').insert(tasks);

    // 5. 任务分配记录
    const taskAssignments = [
      {
        task_id: tasks[0].id,
        cleaner_id: DEMO_CLEANER_ID,
        assigned_by: DEMO_MANAGER_ID,
        status: 'accepted',
        notes: 'お客様3名、15：00までに完了、ドアパスワード123456',
        assigned_at: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        task_id: tasks[1].id,
        cleaner_id: DEMO_CLEANER_ID,
        assigned_by: DEMO_MANAGER_ID,
        status: 'accepted',
        notes: null,
        assigned_at: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
    await supabase
      .from('task_assignments')
      .delete()
      .in(
        'task_id',
        taskAssignments.map((a) => a.task_id),
      );
    await supabase.from('task_assignments').insert(taskAssignments);

    console.log('测试数据初始化成功');
    return { success: true };
  } catch (error) {
    console.error('初始化测试数据失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

