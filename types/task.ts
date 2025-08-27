// 任务状态枚举
export type TaskStatus = 
  | 'draft'        // 任务未提交（Owner / Manager 新建）
  | 'open'         // 等待分配人员
  | 'assigned'     // 已分配人员，等待接受
  | 'accepted'     // Cleaner 确认任务
  | 'in_progress'  // 出勤打卡后自动开始
  | 'completed'    // 打扫完成，照片上传，填写备品
  | 'confirmed';   // Manager 确认无误后归档

// 任务状态显示名称映射
export const TASK_STATUS_DISPLAY: Record<TaskStatus, string> = {
  draft: '任务创建中',
  open: '待分配',
  assigned: '已分配',
  accepted: '已接受',
  in_progress: '进行中',
  completed: '已完成',
  confirmed: '已确认'
};

// 任务状态颜色映射
export const TASK_STATUS_COLOR: Record<TaskStatus, string> = {
  draft: '#9ca3af',      // gray
  open: '#f59e0b',       // amber
  assigned: '#3b82f6',   // blue
  accepted: '#10b981',   // emerald
  in_progress: '#f59e0b', // amber
  completed: '#22c55e',  // green
  confirmed: '#059669'   // emerald-600
};

// 任务接口定义
export interface Task {
  id: string;
  hotelName: string;
  checkInDate: string;    // 入住日期
  checkInTime: string;    // 入住时间
  checkOutDate?: string;  // 退房日期
  cleaningDate?: string;  // 清扫日期（默认为退房日期，可修改）
  assignedCleaners: string[];
  status: TaskStatus;
  description?: string;
  note?: string;
  images?: string[];
  attendanceStatus?: 'none' | 'checked_in' | 'checked_out';
  
  // 兼容性字段（废弃但保留）
  date?: string;
  
  // 新增字段
  acceptedBy?: string[];        // 已接受任务的清洁员
  completedAt?: string;         // 完成时间
  confirmedAt?: string;         // 确认时间
  createdBy?: string;           // 创建者
  createdAt?: string;           // 创建时间
  updatedAt?: string;           // 更新时间
  
  // 任务详情
  hotelAddress?: string;        // 酒店地址
  roomNumber?: string;          // 房间号
  lockPassword?: string;        // 门锁密码
  specialInstructions?: string; // 特殊说明
  
  // 备品信息
  inventory?: {
    towel: number;
    soap: number;
    shampoo: number;
    conditioner: number;
    toiletPaper: number;
    [key: string]: number;
  };
}

// 任务状态转换规则
export const TASK_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  draft: ['open'],
  open: ['assigned', 'draft'],
  assigned: ['accepted', 'open'],
  accepted: ['in_progress', 'assigned'],
  in_progress: ['completed', 'accepted'],
  completed: ['confirmed', 'in_progress'],
  confirmed: [] // 最终状态，不可再转换
};

// 用户角色
export type UserRole = 'owner' | 'manager' | 'cleaner';

// 用户权限检查
export const canTransitionTask = (
  currentStatus: TaskStatus, 
  newStatus: TaskStatus, 
  userRole: UserRole
): boolean => {
  const allowedTransitions = TASK_STATUS_TRANSITIONS[currentStatus];
  
  if (!allowedTransitions.includes(newStatus)) {
    return false;
  }
  
  // 角色权限检查
  switch (newStatus) {
    case 'open':
      return ['owner', 'manager'].includes(userRole);
    case 'assigned':
      return userRole === 'manager';
    case 'accepted':
      return userRole === 'cleaner';
    case 'in_progress':
      return userRole === 'cleaner';
    case 'completed':
      return userRole === 'cleaner';
    case 'confirmed':
      return ['owner', 'manager'].includes(userRole);
    default:
      return false;
  }
}; 