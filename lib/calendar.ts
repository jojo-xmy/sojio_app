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
    .order('date', { ascending: true });

  // 开发环境：如果查询指定日期范围没有数据，则查询所有数据
  const { data: tasksInRange, error: rangeError } = await query
    .gte('date', startDateStr)
    .lte('date', endDateStr);

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


  // 开发环境：如果没有数据，使用模拟数据
  let tasksToUse = tasks;
  if (!tasks || tasks.length === 0) {
    console.log('数据库中没有任务数据，使用模拟数据');
    tasksToUse = [
      {
        id: 'mock-1',
        hotel_name: 'Kyoto Villa',
        date: new Date().toISOString().split('T')[0], // 今天
        check_in_time: '15:00',
        status: 'draft',
        room_number: '3A',
        task_assignments: []
      },
      {
        id: 'mock-2',
        hotel_name: 'Osaka Inn',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 明天
        check_in_time: '16:00',
        status: 'assigned',
        room_number: '2B',
        task_assignments: []
      },
      {
        id: 'mock-3',
        hotel_name: 'Tokyo Stay',
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 后天
        check_in_time: '14:00',
        status: 'completed',
        room_number: '5C',
        task_assignments: []
      }
    ];
  }

  // 转换为前端日历事件格式
  const calendarEvents: TaskCalendarEvent[] = (tasksToUse || []).map(task => {
    const taskDate = new Date(task.date);
    const startTime = task.check_in_time ? new Date(`${task.date}T${task.check_in_time}`) : taskDate;
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 默认 2 小时

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

  return calendarEvents;
}


// 获取指定日期的可用清洁员
export async function getAvailableCleanersForDate(date: string): Promise<AvailableCleaner[]> {
  const { data, error } = await supabase
    .from('cleaner_availability')
    .select(`
      cleaner_id,
      available_hours,
      notes,
      user_profiles!inner(
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
    `)
    .eq('date', date)
    .eq('user_profiles.role', 'cleaner');

  if (error) {
    console.error('获取可用清洁员失败:', error);
    throw new Error('获取可用清洁员失败');
  }

  // 获取清洁员当天的任务数量
  const cleanerTaskCounts = await getCleanerTaskCountsForDate(date);

  const availableCleaners: AvailableCleaner[] = (data || [])
    .filter(item => item.user_profiles && item.user_profiles.length > 0)
    .map(item => {
      const taskCount = cleanerTaskCounts[item.cleaner_id] || 0;
      
      return {
        id: item.cleaner_id,
        name: item.user_profiles?.[0]?.name || '未知',
        role: item.user_profiles?.[0]?.role || 'cleaner',
        availableHours: item.available_hours || {},
        currentTaskCount: taskCount,
        maxTaskCapacity: 1 // 默认每天最多1个任务
      };
    });

  return availableCleaners;
}

// 获取清洁员在指定日期的任务数量
async function getCleanerTaskCountsForDate(date: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('task_assignments')
    .select(`
      cleaner_id,
      tasks!inner(date)
    `)
    .eq('tasks.date', date);

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

  const taskDate = new Date(data.date);
  const startTime = data.check_in_time ? new Date(`${data.date}T${data.check_in_time}`) : taskDate;
  const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

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
