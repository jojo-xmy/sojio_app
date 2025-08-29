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

  // 字段映射：owner_notes -> ownerNotes
  const mapped = (data || []).map((row: any) => ({
    id: row.id,
    hotelId: row.hotel_id,
    checkInDate: row.check_in_date,
    checkOutDate: row.check_out_date,
    guestCount: row.guest_count,
    roomNumber: row.room_number || '',
    ownerNotes: row.owner_notes || '',
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
      room_number: entryData.roomNumber,
      owner_notes: entryData.ownerNotes,
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
  if (Object.prototype.hasOwnProperty.call(mapped, 'roomNumber')) {
    mapped.room_number = mapped.roomNumber;
    delete mapped.roomNumber;
  }
  if (Object.prototype.hasOwnProperty.call(mapped, 'ownerNotes')) {
    mapped.owner_notes = mapped.ownerNotes;
    delete mapped.ownerNotes;
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
export async function getCalendarEntryByTaskId(taskId: string): Promise<CalendarEntry | null> {
  const { data, error } = await supabase
    .from('calendar_entries')
    .select('*')
    .eq('task_id', taskId)
    .maybeSingle();

  if (error) {
    console.error('通过 task_id 获取日历条目失败:', error);
    throw new Error('获取入住登记失败');
  }

  if (!data) return null;

  return {
    id: data.id,
    hotelId: data.hotel_id,
    checkInDate: data.check_in_date,
    checkOutDate: data.check_out_date,
    guestCount: data.guest_count,
    roomNumber: data.room_number || '',
    ownerNotes: data.owner_notes || '',
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  } as CalendarEntry;
}

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
    .eq('user_profiles.role', 'cleaner');

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
    .eq('task_id', taskId);

  if (error) {
    console.error('获取任务分配失败:', error);
    throw new Error('获取任务分配失败');
  }

  return data || [];
}

// 获取清洁员的任务列表
export async function getCleanerTasks(cleanerId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('task_assignments')
    .select(`
      *,
      tasks!inner(*)
    `)
    .eq('cleaner_id', cleanerId)
    .order('assigned_at', { ascending: false });

  if (error) {
    console.error('获取清洁员任务失败:', error);
    throw new Error('获取清洁员任务失败');
  }

  return data || [];
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
      room_number,
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
      room_number,
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
