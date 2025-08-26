import { supabase } from './supabase';
import { 
  CalendarEvent, 
  TaskCalendarEvent, 
  CalendarViewConfig,
  AvailableCleaner 
} from '@/types/calendar';
import { Task } from '@/types/task';
import { UserProfile } from '@/types/user';


// 获取日历视图的任务数据
export async function getCalendarTasks(
  startDate: Date,
  endDate: Date,
  config?: Partial<CalendarViewConfig>
): Promise<TaskCalendarEvent[]> {
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // 构建基础 query
  let query = supabase
    .from('tasks')
    .select(`
      *,
      task_assignments(
        *,
        user_profiles:user_profiles!task_assignments_cleaner_id_fkey(
          id, 
          line_user_id, 
          name, 
          katakana, 
          avatar, 
          role, 
          phone, 
          created_at, 
          updated_at
        )
      )
    `)
    .order('check_in_date', { ascending: true });

  // 开发环境：如果查询指定日期范围没有数据，则查询所有数据
  const { data: tasksInRange, error: rangeError } = await query
    .gte('check_in_date', startDateStr)
    .lte('check_in_date', endDateStr);

  if (rangeError) {
    console.error('获取日历任务失败:', rangeError.message, rangeError.details, rangeError.hint);
    throw new Error('获取日历任务失败');
  }

  // 如果指定日期范围内没有数据，尝试获取所有数据
  let tasks = tasksInRange;
  if (!tasksInRange || tasksInRange.length === 0) {
    console.log('指定日期范围内没有数据，尝试获取所有任务数据');
    const { data: allTasks, error: allError } = await query;
    
    if (allError) {
      console.error('获取所有任务失败:', allError.message, allError.details, allError.hint);
      throw new Error('获取任务失败');
    }
    
    tasks = allTasks;
  }

  // 应用过滤条件
  /*
  if (tasks && tasks.length > 0) {
    // 仅显示未分配任务
    if (config?.showUnassignedOnly) {
      tasks = tasks.filter(task => task.status === 'draft');
    }

    // 按酒店名过滤
    if (config?.filterByHotel) {
      tasks = tasks.filter(task => 
        task.hotel_name?.toLowerCase().includes(config.filterByHotel!.toLowerCase())
      );
    }

    // 排除已完成或已确认任务
    if (!config?.showCompletedTasks) {
      tasks = tasks.filter(task => 
        task.status !== 'completed' && task.status !== 'confirmed'
      );
    }
  }
  */

  // 使用真实数据库数据
  const tasksToUse = tasks || [];

  // 转换为前端日历事件格式
  const calendarEvents: TaskCalendarEvent[] = (tasksToUse || []).map(task => {
    // 使用数据库字段：check_in_date 和 check_in_time
    const taskDate = new Date(task.check_in_date);
    
    // 构建开始时间：check_in_date + check_in_time
    let startTime: Date;
    if (task.check_in_time) {
      // 如果有时刻，组合日期和时间
      startTime = new Date(`${task.check_in_date}T${task.check_in_time}`);
    } else {
      // 如果没有时刻，使用日期当天的默认时间（下午3点）
      startTime = new Date(`${task.check_in_date}T15:00:00`);
    }
    
    // 构建结束时间：如果有check_out_date使用它，否则默认2小时后
    let endTime: Date;
    if (task.check_out_date) {
      // 如果有退房日期，使用退房日期的默认时间（上午10点）
      endTime = new Date(`${task.check_out_date}T10:00:00`);
    } else {
      // 否则使用开始时间后2小时
      endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);
    }
    //查看已经被分配任务的清洁人员列表
    const assignedCleaners: UserProfile[] =
      task.task_assignments?.map((a: any) => a.user_profiles).filter(Boolean).flat() || [];

    const availableCleaners: UserProfile[] = []; // 后续可从其他接口或逻辑填充

    return {
      id: task.id,
      title: task.hotel_name,
      start: startTime,
      end: endTime,
      status: task.status,
      roomNumber: task.room_number,
      assignedCleaners,
      availableCleaners,
      type: 'task',
      task: task,
    };
  });
  console.log("calendarEvents:", calendarEvents);
  return calendarEvents;
}


// 获取指定日期的可用清洁员
export async function getAvailableCleanersForDate(date: string): Promise<AvailableCleaner[]> {
  // 第一步：取当天可用性条目（不做联表，避免因缺失外键导致结果被过滤）
  const { data: availability, error: availError } = await supabase
    .from('cleaner_availability')
    .select('cleaner_id, available_hours, notes')
    .eq('date', date);

  console.log('可用性原始数据:', availability);
  console.log('可用性查询错误:', availError);
  console.log('查询日期:', date);

  if (availError) {
    console.error('获取可用性数据失败:', availError);
    throw new Error('获取可用性数据失败');
  }

  if (!availability || availability.length === 0) {
    console.log('当天没有可用性记录');
    return [];
  }

  // 去重后的清洁员ID集合
  const cleanerIds = Array.from(new Set(availability.map(a => a.cleaner_id))).filter(Boolean);

  if (cleanerIds.length === 0) {
    console.log('可用性记录中没有有效的cleaner_id');
    return [];
  }

  // 第二步：批量查询清洁员档案
  const { data: profiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select('id, name, role, katakana, avatar, phone')
    .in('id', cleanerIds)
    .eq('role', 'cleaner');

  console.log('清洁员档案数据:', profiles);
  console.log('清洁员档案查询错误:', profilesError);

  if (profilesError) {
    console.error('获取清洁员档案失败:', profilesError);
    throw new Error('获取清洁员档案失败');
  }

  const idToProfile = new Map<string, any>((profiles || []).map(p => [p.id, p]));

  // 获取清洁员当天的任务数量
  const cleanerTaskCounts = await getCleanerTaskCountsForDate(date);
  console.log('清洁员任务数量:', cleanerTaskCounts);

  // 以cleaner_id为单位去重后合并信息
  const seen = new Set<string>();
  const availableCleaners: AvailableCleaner[] = [];
  for (const a of availability) {
    const cleanerId = a.cleaner_id as string;
    if (!cleanerId || seen.has(cleanerId)) continue;
    seen.add(cleanerId);

    const profile = idToProfile.get(cleanerId);
    const taskCount = cleanerTaskCounts[cleanerId] || 0;

    availableCleaners.push({
      id: cleanerId,
      name: profile?.name || '未知',
      role: profile?.role || 'cleaner',
      availableHours: a.available_hours || {},
      currentTaskCount: taskCount,
      maxTaskCapacity: 2
    });
  }

  console.log('最终可用清洁员列表:', availableCleaners);
  return availableCleaners;
}


// 获取清洁员在指定日期的任务数量
async function getCleanerTaskCountsForDate(date: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('task_assignments')
    .select(`
      cleaner_id,
      tasks!inner(check_in_date)
    `)
    .eq('tasks.check_in_date', date);

  if (error) {
    console.error('获取清洁员任务数量失败:', error);
    return {};
  }

  const counts: Record<string, number> = {};
  (data || []).forEach(item => {
    counts[item.cleaner_id] = (counts[item.cleaner_id] || 0) + 1;
  });

  return counts;
}


// 分配任务给清洁员
export async function assignTaskToCleaners(
  taskId: string,
  cleanerIds: string[],
  assignedBy: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 创建任务分配记录
    const assignments = cleanerIds.map(cleanerId => ({
      task_id: taskId,
      cleaner_id: cleanerId,
      assigned_by: assignedBy,
      notes: notes || null
    }));

    const { error: assignmentError } = await supabase
      .from('task_assignments')
      .insert(assignments);

    if (assignmentError) {
      throw assignmentError;
    }

    // 更新任务状态和分配的清洁员
    const { error: taskError } = await supabase
      .from('tasks')
      .update({
        status: 'assigned',
        assigned_cleaners: cleanerIds,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);

    if (taskError) {
      throw taskError;
    }

    return { success: true };
  } catch (error) {
    console.error('分配任务失败:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '分配任务失败' 
    };
  }
}

// 获取任务详情（包括分配的清洁员信息）
export async function getTaskWithAssignments(taskId: string): Promise<TaskCalendarEvent | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      task_assignments(
        *,
        user_profiles!cleaner_id(
          id, 
          line_user_id, 
          name, 
          katakana, 
          avatar, 
          role, 
          phone, 
          created_at, 
          updated_at
        )
      )
    `)
    .eq('id', taskId)
    .single();

  if (error) {
    console.error('获取任务详情失败:', error);
    return null;
  }

  if (!data) return null;

  // 使用新的字段结构：check_in_date 和 check_in_time
  const taskDate = new Date(data.check_in_date);
  
  // 构建开始时间：check_in_date + check_in_time
  let startTime: Date;
  if (data.check_in_time) {
    // 如果有时刻，组合日期和时间
    startTime = new Date(`${data.check_in_date}T${data.check_in_time}`);
  } else {
    // 如果没有时刻，使用日期当天的默认时间（比如上午9点）
    startTime = new Date(`${data.check_in_date}T09:00:00`);
  }
  
  // 构建结束时间：如果有check_out_date使用它，否则默认2小时后
  let endTime: Date;
  if (data.check_out_date) {
    // 如果有退房日期，使用退房日期的默认时间（比如下午3点）
    endTime = new Date(`${data.check_out_date}T15:00:00`);
  } else {
    // 否则使用开始时间后2小时
    endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);
  }

  const assignedCleaners = data.task_assignments?.map((assignment: any) => assignment.user_profiles).filter(Boolean) || [];

  return {
    id: data.id,
    title: `${data.hotel_name}${data.room_number ? ` - ${data.room_number}` : ''}`,
    start: startTime,
    end: endTime,
    type: 'task',
    task: data,
    assignedCleaners
  };
}

// 更新任务状态
export async function updateTaskStatus(
  taskId: string,
  status: string,
  updatedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    // 根据状态添加特定字段
    switch (status) {
      case 'completed':
        updateData.completed_at = new Date().toISOString();
        break;
      case 'confirmed':
        updateData.confirmed_at = new Date().toISOString();
        break;
    }

    const { error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('更新任务状态失败:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '更新任务状态失败' 
    };
  }
}
