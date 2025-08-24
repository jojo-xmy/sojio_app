// 与数据库user_profiles表结构完全一致的UserProfile接口
export interface UserProfile {
  id: string; // uuid
  line_user_id: string;
  name: string;
  katakana?: string;
  avatar?: string;
  role: 'owner' | 'manager' | 'cleaner';
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  role: 'owner' | 'manager' | 'cleaner';
  permissions: string[];
}

export interface CleanerAvailability {
  id: string;
  cleaner_id: string;
  date: string;
  available_hours: Record<string, any>;
  notes?: string;
  created_at: string;
  updated_at: string;
}
