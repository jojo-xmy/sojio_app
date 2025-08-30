"use client";
import { create } from 'zustand';
import { Task } from '@/types/task';
import { CalendarEntry } from '@/types/hotel';
import { Attendance } from '@/lib/attendance';
import { TaskImage } from '@/lib/upload';

interface TaskState {
  // 当前选中的任务
  selectedTaskId: string | null;
  
  // 任务相关数据
  taskData: {
    [taskId: string]: {
      attendances: Attendance[];
      currentStatus: 'none' | 'checked_in' | 'checked_out';
      images: TaskImage[];
      taskDetails: Task | null;
      calendarEntry: CalendarEntry | null;
    };
  };
  
  // Actions
  setSelectedTask: (taskId: string | null) => void;
  updateTaskData: (taskId: string, data: Partial<TaskState['taskData'][string]>) => void;
  clearTaskData: (taskId: string) => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  selectedTaskId: null,
  taskData: {},
  
  setSelectedTask: (taskId) => set({ selectedTaskId: taskId }),
  
  updateTaskData: (taskId, data) => set((state) => {
    const currentTaskData = state.taskData[taskId] || {};
    
    // 确保对象引用刷新，避免直接修改原对象
    const updatedTaskData = {
      ...currentTaskData,
      ...data,
      // 特殊处理数组和对象，确保引用刷新
      ...(data.attendances && { attendances: [...data.attendances] }),
      ...(data.images && { images: [...data.images] }),
      ...(data.taskDetails && { taskDetails: { ...data.taskDetails } }),
      ...(data.calendarEntry && { calendarEntry: { ...data.calendarEntry } }),
    };
    
    return {
      taskData: {
        ...state.taskData,
        [taskId]: updatedTaskData,
      },
    };
  }),
  
  clearTaskData: (taskId) => set((state) => {
    const newTaskData = { ...state.taskData };
    delete newTaskData[taskId];
    // 注意：不清除 selectedTaskId，避免后续 refresh 拿不到 task.id
    return { taskData: newTaskData };
  }),
}));
