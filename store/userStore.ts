import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserProfile {
  id: string; // 数据库中是uuid类型
  line_user_id: string;
  name: string;
  katakana?: string;
  avatar?: string;
  role: 'owner' | 'manager' | 'cleaner';
  phone?: string;
  created_at: string;
  updated_at: string;
}

interface UserState {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  clearUser: () => void;
  isInitialized: boolean;
  setInitialized: (initialized: boolean) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
      isInitialized: false,
      setInitialized: (initialized) => set({ isInitialized: initialized }),
    }),
    {
      name: 'hug-user-storage', // 存储键名
      partialize: (state) => ({ user: state.user }), // 只持久化用户信息
    }
  )
); 