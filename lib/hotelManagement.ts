import { supabase } from './supabase';
import { 
  Hotel, 
  CalendarEntry, 
  CleanerAvailability, 
  TaskAssignment,
  CreateHotelData,
  CreateCalendarEntryData,
  AvailabilityData,
  AssignTaskData
} from '@/types/hotel';
import { TaskStatus } from '@/types/task';
import { notifyTaskCreated, notifyCleaningDatesUpdated } from './notificationService';

// 酒店管理API

// 获取用户所属的酒店列表
export async function getUserHotels(userId: string): Promise<Hotel[]> {
  const { data, error } = await supabase
    .from('hotels')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取酒店列表失败:', error);
    throw new Error('获取酒店列表失败');
  }

  return data || [];
}

// 创建新酒店
export async function createHotel(hotelData: CreateHotelData, ownerId: string): Promise<Hotel> {
  const { data, error } = await supabase
    .from('hotels')
    .insert({
      name: hotelData.name,
      address: hotelData.address,
      image_url: hotelData.imageUrl,
      owner_id: ownerId
    })
    .select()
    .single();

  if (error) {
    console.error('创建酒店失败:', error);
    throw new Error('创建酒店失败');
  }

  return data;
}

// 获取酒店详情
export async function getHotelById(hotelId: string): Promise<Hotel | null> {
  const { data, error } = await supabase
    .from('hotels')
    .select('*')
    .eq('id', hotelId)
    .single();

  if (error) {
    console.error('获取酒店详情失败:', error);
    return null;
  }

  return data;
}

// 更新酒店信息
export async function updateHotel(hotelId: string, updates: Partial<Pick<Hotel, 'name' | 'address' | 'imageUrl'>>): Promise<Hotel> {
  const payload: any = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.address !== undefined) payload.address = updates.address;
  if (updates.imageUrl !== undefined) payload.image_url = updates.imageUrl;

  const { data, error } = await supabase
    .from('hotels')
    .update(payload)
    .eq('id', hotelId)
    .select()
    .single();

  if (error) {
    console.error('更新酒店信息失败:', error);
    throw new Error('更新酒店信息失败');
  }

  return data as Hotel;
}

// 日历管理API

// 获取酒店的日历条目
export async function getHotelCalendarEntries(
  hotelId: string, 
  startDate?: string, 
  endDate?: string
): Promise<CalendarEntry[]> {
  let query = supabase
    .from('calendar_entries')
    .select('*')
    .eq('hotel_id', hotelId)
    .order('check_in_date', { ascending: true });

  if (startDate) {
    query = query.gte('check_in_date', startDate);
  }
  if (endDate) {
    query = query.lte('check_out_date', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('获取日历条目失败:', error);
    throw new Error('获取日历条目失败');
  }

  // 字段映射：owner_notes -> ownerNotes, cleaning_dates -> cleaningDates
  const mapped = (data || []).map((row: any) => ({
    id: row.id,
    hotelId: row.hotel_id,
    checkInDate: row.check_in_date,
    checkOutDate: row.check_out_date,
    guestCount: row.guest_count,
    ownerNotes: row.owner_notes || '',
    cleaningDates: row.cleaning_dates || [],
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  })) as CalendarEntry[];

  return mapped;
}

// 创建日历条目
export async function createCalendarEntry(entryData: CreateCalendarEntryData, userId: string): Promise<CalendarEntry> {
  const { data, error } = await supabase
    .from('calendar_entries')
    .insert({
      hotel_id: entryData.hotelId,
      check_in_date: entryData.checkInDate,
      check_out_date: entryData.checkOutDate,
      guest_count: entryData.guestCount,
      owner_notes: entryData.ownerNotes,
      cleaning_dates: entryData.cleaningDates || [],
      created_by: userId
    })
    .select()
    .single();

  if (error) {
    console.error('创建日历条目失败:', error);
    throw new Error('创建日历条目失败');
  }

  return data;
}

// 更新日历条目
export async function updateCalendarEntry(
  entryId: string, 
  updates: Partial<CreateCalendarEntryData>
): Promise<CalendarEntry> {
  const mapped: any = { ...updates };
  // 字段映射 camelCase -> snake_case（仅映射存在的字段）
  if (Object.prototype.hasOwnProperty.call(mapped, 'hotelId')) {
    mapped.hotel_id = mapped.hotelId;
    delete mapped.hotelId;
  }
  if (Object.prototype.hasOwnProperty.call(mapped, 'checkInDate')) {
    mapped.check_in_date = mapped.checkInDate;
    delete mapped.checkInDate;
  }
  if (Object.prototype.hasOwnProperty.call(mapped, 'checkOutDate')) {
    mapped.check_out_date = mapped.checkOutDate;
    delete mapped.checkOutDate;
  }
  if (Object.prototype.hasOwnProperty.call(mapped, 'guestCount')) {
    mapped.guest_count = mapped.guestCount;
    delete mapped.guestCount;
  }
  if (Object.prototype.hasOwnProperty.call(mapped, 'ownerNotes')) {
    mapped.owner_notes = mapped.ownerNotes;
    delete mapped.ownerNotes;
  }
  if (Object.prototype.hasOwnProperty.call(mapped, 'cleaningDates')) {
    mapped.cleaning_dates = mapped.cleaningDates;
    delete mapped.cleaningDates;
  }

  const { data, error } = await supabase
    .from('calendar_entries')
    .update(mapped)
    .eq('id', entryId)
    .select()
    .single();

  if (error) {
    console.error('更新日历条目失败:', error);
    throw new Error('更新日历条目失败');
  }
  
  return data;
}

// 删除日历条目
export async function deleteCalendarEntry(entryId: string): Promise<void> {
  const { error } = await supabase
    .from('calendar_entries')
    .delete()
    .eq('id', entryId);

  if (error) {
    console.error('删除日历条目失败:', error);
    throw new Error('删除日历条目失败');
  }
}

// 通过 task_id 获取对应的入住登记（用于从任务侧反查日历条目）
// 已按新架构迁移：通过 tasks.calendar_entry_id 反查，见 services/calendarEntryService.getCalendarEntryByTaskId

// 清洁员可用性管理API

// 获取清洁员的可用性
export async function getCleanerAvailability(
  cleanerId: string, 
  startDate?: string, 
  endDate?: string
): Promise<CleanerAvailability[]> {
  let query = supabase
    .from('cleaner_availability')
    .select('*')
    .eq('cleaner_id', cleanerId)
    .order('date', { ascending: true });

  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('获取清洁员可用性失败:', error);
    throw new Error('获取清洁员可用性失败');
  }

  return data || [];
}

// 设置清洁员可用性
export async function setCleanerAvailability(
  cleanerId: string, 
  availabilityData: AvailabilityData
): Promise<CleanerAvailability> {
  const { data, error } = await supabase
    .from('cleaner_availability')
    .upsert({
      cleaner_id: cleanerId,
      date: availabilityData.date,
      available_hours: availabilityData.availableHours,
      notes: availabilityData.notes
    })
    .select()
    .single();

  if (error) {
    console.error('设置清洁员可用性失败:', error);
    throw new Error('设置清洁员可用性失败');
  }

  return data;
}

// 批量设置清洁员可用性
export async function batchSetCleanerAvailability(
  cleanerId: string, 
  availabilityList: AvailabilityData[]
): Promise<CleanerAvailability[]> {
  const availabilityData = availabilityList.map(item => ({
    cleaner_id: cleanerId,
    date: item.date,
    available_hours: item.availableHours,
    notes: item.notes
  }));

  const { data, error } = await supabase
    .from('cleaner_availability')
    .upsert(availabilityData)
    .select();

  if (error) {
    console.error('批量设置清洁员可用性失败:', error);
    throw new Error('批量设置清洁员可用性失败');
  }

  // 短暂延迟确保数据库写入完成
  await new Promise(resolve => setTimeout(resolve, 100));

  return data || [];
}

// 获取指定日期的可用清洁员
export async function getAvailableCleaners(date: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('cleaner_availability')
    .select(`
      cleaner_id,
      available_hours,
      notes,
      user_profiles!inner(id, name, role)
    `)
    .eq('date', date)
    .eq('user_profiles.role', 'cleaner')
    .order('created_at', { ascending: false }); // 确保获取最新可用性

  if (error) {
    console.error('获取可用清洁员失败:', error);
    throw new Error('获取可用清洁员失败');
  }

  return data || [];
}

// 任务分配管理API

// 分配任务给清洁员
export async function assignTask(assignmentData: AssignTaskData, assignedBy: string): Promise<TaskAssignment[]> {
  const assignments = assignmentData.cleanerIds.map(cleanerId => ({
    task_id: assignmentData.taskId,
    cleaner_id: cleanerId,
    assigned_by: assignedBy,
    notes: assignmentData.notes
  }));

  const { data, error } = await supabase
    .from('task_assignments')
    .insert(assignments)
    .select();

  if (error) {
    console.error('分配任务失败:', error);
    throw new Error('分配任务失败');
  }

  // 更新任务状态为已分配
  await supabase
    .from('tasks')
    .update({ 
      status: 'assigned',
      assigned_cleaners: assignmentData.cleanerIds
    })
    .eq('id', assignmentData.taskId);

  return data || [];
}

// 获取任务的分配情况
export async function getTaskAssignments(taskId: string): Promise<TaskAssignment[]> {
  const { data, error } = await supabase
    .from('task_assignments')
    .select(`
      *,
      user_profiles!cleaner_id(id, name, role)
    `)
    .eq('task_id', taskId)
    .order('assigned_at', { ascending: false }); // 确保获取最新分配

  if (error) {
    console.error('获取任务分配失败:', error);
    throw new Error('获取任务分配失败');
  }

  return data || [];
}

// 获取清洁员的任务列表
export async function getCleanerTasks(cleanerId: string, forceRefresh: boolean = false): Promise<any[]> {
  let query = supabase
    .from('task_assignments')
    .select(`
      *,
      tasks!inner(*)
    `)
    .eq('cleaner_id', cleanerId)
    .order('assigned_at', { ascending: false });

  // 强制刷新时添加 limit 避免缓存
  if (forceRefresh) {
    query = query.limit(1000);
  }

  const { data, error } = await query;

  if (error) {
    console.error('获取清洁员任务失败:', error);
    throw new Error('获取清洁员任务失败');
  }

  return data || [];
}

/**
 * @deprecated 此函数已废弃，请勿手动生成任务
 * 
 * 任务应通过数据库触发器自动生成
 * 触发器 `manage_calendar_tasks_v2` 会在创建/更新 calendar_entries 时自动创建清扫任务
 * 
 * 迁移指南：
 * - 旧代码：generateTasksFromCalendarEntry(entryId)
 * - 新代码：无需手动调用，触发器会自动处理
 * 
 * 此函数保留仅用于向后兼容，将在未来版本中移除
 */
export async function generateTasksFromCalendarEntry(entryId: string): Promise<{ success: boolean; error?: string; taskIds?: string[] }> {
  console.warn('⚠️ generateTasksFromCalendarEntry() 已废弃，任务由数据库触发器自动创建');
  try {
    // 直接通过entryId获取日历条目
    const { data: entryData, error: entryError } = await supabase
      .from('calendar_entries')
      .select('*')
      .eq('id', entryId)
      .single();

    if (entryError || !entryData) {
      console.error('获取日历条目失败:', entryError);
      return { success: false, error: '日历条目不存在' };
    }

    const entry = {
      id: entryData.id,
      hotelId: entryData.hotel_id,
      checkInDate: entryData.check_in_date,
      checkOutDate: entryData.check_out_date,
      guestCount: entryData.guest_count,
      ownerNotes: entryData.owner_notes || '',
      cleaningDates: entryData.cleaning_dates || [],
      createdBy: entryData.created_by,
      createdAt: entryData.created_at,
      updatedAt: entryData.updated_at
    };

    // 获取酒店信息
    const hotel = await getHotelById(entry.hotelId);
    if (!hotel) {
      return { success: false, error: '酒店不存在' };
    }

    // 先删除该日历条目关联的所有清扫任务，避免重复创建
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('calendar_entry_id', entryId);

    if (deleteError) {
      console.error('删除旧清扫任务失败:', deleteError);
      return { success: false, error: '删除旧任务失败' };
    }

    const taskIds: string[] = [];
    const cleaningDates = entry.cleaningDates || [];

    // 如果没有指定清扫日期，使用退房日期作为默认清扫日期
    if (cleaningDates.length === 0) {
      cleaningDates.push(entry.checkOutDate);
    }

    // 为每个清扫日期创建任务
    for (const cleaningDate of cleaningDates) {
      const taskData = {
        hotel_name: hotel.name,
        hotel_id: hotel.id,
        check_in_date: entry.checkInDate,
        check_out_date: entry.checkOutDate,
        cleaning_date: cleaningDate,
        guest_count: entry.guestCount,
        check_in_time: '15:00', // 默认入住时间
        assigned_cleaners: [],
        description: `清扫任务 - ${hotel.name}`,
        owner_notes: entry.ownerNotes || null,
        status: 'draft' as const,
        hotel_address: hotel.address,
        lock_password: null,
        created_by: entry.createdBy,
        calendar_entry_id: entryId, // 关联日历条目
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert([taskData])
        .select()
        .single();

      if (taskError) {
        console.error('创建任务失败:', taskError);
        return { success: false, error: `创建清扫任务失败: ${taskError.message}` };
      }

      taskIds.push(task.id);
    }

    // 更新日历条目，关联第一个任务ID
    if (taskIds.length > 0) {
      const { error: updateError } = await supabase
        .from('calendar_entries')
        .update({ task_id: taskIds[0] })
        .eq('id', entryId);

      if (updateError) {
        console.error('更新日历条目关联失败:', updateError);
        // 不返回错误，因为任务已经创建成功
      }

      // 发送通知给管理员
      try {
        // 获取管理员ID（这里需要根据实际业务逻辑获取）
        // 暂时使用创建者ID，实际应该获取该酒店的管理员ID
        await notifyTaskCreated(taskIds[0], hotel.name, cleaningDates[0], entry.createdBy);
      } catch (error) {
        console.error('发送任务创建通知失败:', error);
        // 不阻断主流程
      }
    }

    return { success: true, taskIds };
  } catch (error) {
    console.error('生成任务失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '生成任务失败' };
  }
}

// 获取与日历条目相关的所有任务
export async function getTasksByCalendarEntry(entryId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        task_assignments(
          id,
          cleaner_id,
          assigned_by,
          assigned_at,
          status,
          notes,
          user_profiles!cleaner_id(id, name, role)
        )
      `)
      .eq('hotel_id', (await supabase
        .from('calendar_entries')
        .select('hotel_id')
        .eq('id', entryId)
        .single()
      ).data?.hotel_id)
      .gte('check_in_date', (await supabase
        .from('calendar_entries')
        .select('check_in_date')
        .eq('id', entryId)
        .single()
      ).data?.check_in_date)
      .lte('check_out_date', (await supabase
        .from('calendar_entries')
        .select('check_out_date')
        .eq('id', entryId)
        .single()
      ).data?.check_out_date);

    if (error) {
      console.error('获取日历条目相关任务失败:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('获取日历条目相关任务失败:', error);
    return [];
  }
}

// 任务安排视图API

// 获取任务安排视图数据
export async function getTaskScheduleView(startDate: string, endDate: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      id,
      hotel_name,
      date,
      status,
      assigned_cleaners,
      description,
      created_at
    `)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (error) {
    console.error('获取任务安排视图失败:', error);
    throw new Error('获取任务安排视图失败');
  }

  return data || [];
}

// 获取待安排任务列表
export async function getPendingTasks(): Promise<any[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      id,
      hotel_name,
      date,
      status,
      assigned_cleaners,
      description,
      created_at
    `)
    .in('status', ['draft', 'open'])
    .order('date', { ascending: true });

  if (error) {
    console.error('获取待安排任务失败:', error);
    throw new Error('获取待安排任务失败');
  }

  return data || [];
}
