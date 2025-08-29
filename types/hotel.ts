import type { TaskStatus } from './task';
// 酒店管理相关类型定义

// 酒店接口
export interface Hotel {
  id: string;
  name: string;
  address: string;
  imageUrl?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

// 日历条目接口（入住/退房登记）
export interface CalendarEntry {
  id: string;
  hotelId: string;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  roomNumber?: string;
  ownerNotes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// 清洁员可用性接口
export interface CleanerAvailability {
  id: string;
  cleanerId: string;
  date: string;
  availableHours: {
    morning?: boolean;
    afternoon?: boolean;
    evening?: boolean;
    [key: string]: boolean | undefined;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// 任务分配接口
export interface TaskAssignment {
  id: string;
  taskId: string;
  cleanerId: string;
  assignedBy: string;
  assignedAt: string;
  status: 'assigned' | 'accepted' | 'declined';
  notes?: string;
}

// 酒店创建表单数据
export interface CreateHotelData {
  name: string;
  address: string;
  imageUrl?: string;
}

// 日历条目创建表单数据
export interface CreateCalendarEntryData {
  hotelId: string;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  roomNumber?: string;
  ownerNotes?: string;
}

// 可用性设置数据
export interface AvailabilityData {
  date: string;
  availableHours: {
    morning?: boolean;
    afternoon?: boolean;
    evening?: boolean;
  };
  notes?: string;
}

// 任务安排视图数据
export interface TaskScheduleView {
  date: string;
  hotels: {
    hotelId: string;
    hotelName: string;
    tasks: {
      taskId: string;
      status: TaskStatus;
      assignedCleaners: string[];
      availableCleaners: string[];
    }[];
  }[];
}

// 任务分配数据
export interface AssignTaskData {
  taskId: string;
  cleanerIds: string[];
  notes?: string;
}
