export interface Task {
  id: string;
  hotelName: string;
  date: string;
  checkInTime: string;
  assignedCleaners: string[];
  status: string;
  description?: string;
  note?: string;
  images?: string[];
  attendanceStatus?: 'none' | 'checked_in' | 'checked_out'; // 打卡状态
} 