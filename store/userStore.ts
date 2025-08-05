import { create } from 'zustand';

export interface UserProfile {
  id: number;
  name: string;
  katakana: string;
  role: string;
  avatar: string;
}

interface UserState {
  user: UserProfile | null;
  setUser: (user: UserProfile) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
})); 