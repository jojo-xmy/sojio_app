import { Task } from './task';
import { UserProfile } from './user';



// 日历事件类型
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: any;
  task?: Task;
  type: 'task' | 'availability' | 'calendar_entry';
}

// 日历任务事件
export interface TaskCalendarEvent extends CalendarEvent {
  type: 'task';
  task: Task;
  assignedCleaners?: UserProfile[];
  availableCleaners?: UserProfile[];
}

// 清洁员可用性事件
export interface AvailabilityCalendarEvent extends CalendarEvent {
  type: 'availability';
  cleanerId: string;
  cleanerName: string;
  availableHours: Record<string, any>;
}

// 日历条目事件
export interface CalendarEntryEvent extends CalendarEvent {
  type: 'calendar_entry';
  hotelId: string;
  hotelName: string;
  guestCount: number;
}

// 日历视图配置
export interface CalendarViewConfig {
  view: 'month' | 'week' | 'day';
  date: Date;
  showUnassignedOnly: boolean;
  showCompletedTasks: boolean;
  filterByHotel?: string;
  filterByCleaner?: string;
}

// 任务分配数据
export interface TaskAssignmentData {
  taskId: string;
  cleanerIds: string[];
  assignedBy: string;
  notes?: string;
}

// 可用清洁员查询结果
export interface AvailableCleaner {
  id: string;
  name: string;
  role: string;
  availableHours: Record<string, any>;
  currentTaskCount: number;
  maxTaskCapacity: number;
}
