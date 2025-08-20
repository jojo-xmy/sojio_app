import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserProfile {
  id: number;
  name: string;
  katakana: string;
  role: string;
  avatar: string;
  lineUserId?: string; // 添加LINE用户ID用于多角色支持
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