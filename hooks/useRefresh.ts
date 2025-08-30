"use client";
import { useCallback, useEffect, useState } from 'react';
import { Task } from '@/types/task';
import { CalendarEntry } from '@/types/hotel';
import { Attendance, getAttendanceByTaskId, getUserLatestAttendance } from '@/lib/attendance';
import { TaskImage, getTaskImages } from '@/lib/upload';
import { getTaskById } from '@/lib/tasks';
import { getCalendarEntryByTaskId } from '@/lib/hotelManagement';
import { useUserStore } from '@/store/userStore';

// Hook for task-related data (attendance, images, status)
export function useTaskData(task: Task) {
  const user = useUserStore(s => s.user);
  const [allAttendances, setAllAttendances] = useState<Attendance[]>([]);
  const [currentStatus, setCurrentStatus] = useState<'none' | 'checked_in' | 'checked_out'>('none');
  const [images, setImages] = useState<TaskImage[]>([]);

  const refresh = useCallback(async () => {
    if (!task) return;
    
    const attendanceList = await getAttendanceByTaskId(task.id);
    const latestStatus = user ? await getUserLatestAttendance(task.id, user.id.toString()) : 'none' as const;
    const imageList = await getTaskImages(task.id);
    
    setAllAttendances(attendanceList);
    setCurrentStatus(latestStatus);
    setImages(imageList);
  }, [task?.id, user?.id]);

  return {
    allAttendances,
    currentStatus,
    images,
    refresh
  };
}

// Hook for task details (description, notes, etc.)
export function useTaskDetails(taskId: string) {
  const [taskDetails, setTaskDetails] = useState<Task | null>(null);

  const refresh = useCallback(async () => {
    if (!taskId) return;
    
    const task = await getTaskById(taskId);
    setTaskDetails(task);
  }, [taskId]);

  return {
    taskDetails,
    refresh
  };
}

// Hook for calendar entry data
export function useCalendarEntry(taskId: string) {
  const [calendarEntry, setCalendarEntry] = useState<CalendarEntry | null>(null);

  const refresh = useCallback(async () => {
    if (!taskId) return;
    
    const entry = await getCalendarEntryByTaskId(taskId);
    setCalendarEntry(entry);
  }, [taskId]);

  return {
    calendarEntry,
    refresh
  };
}

// Global refresh manager that combines all data hooks
export function useGlobalRefresh(task: Task) {
  const user = useUserStore(s => s.user);
  const taskData = useTaskData(task);
  const taskDetails = useTaskDetails(task.id);
  const calendarEntry = useCalendarEntry(task.id);

  // Global refresh function that refreshes all data sources
  const refresh = useCallback(async () => {
    // 保护：确保 task.id 存在
    if (!task?.id) {
      console.warn('refresh skipped: invalid task.id', task);
      return;
    }

    // 依次刷新，便于定位问题（也减少瞬时并发对后端的压力）
    await taskData.refresh();
    await taskDetails.refresh();
    await calendarEntry.refresh();

    // 添加日志输出
    console.log("refresh end: task.id =", task.id);
    console.log("refresh end: calendarEntry =", calendarEntry.calendarEntry);
    console.log("refresh end: allAttendances =", taskData.allAttendances);
    console.log("refresh end: taskImages =", taskData.images);
  }, [task?.id, taskData.refresh, taskDetails.refresh, calendarEntry.refresh]);

  // Initial load
  useEffect(() => {
    if (task?.id) {
      refresh();
    }
  }, [task?.id, refresh]); // 添加 refresh 依赖，但 refresh 本身已经稳定

  return {
    // Task data
    allAttendances: taskData.allAttendances,
    currentStatus: taskData.currentStatus,
    images: taskData.images,
    
    // Task details
    taskDetails: taskDetails.taskDetails,
    
    // Calendar entry
    calendarEntry: calendarEntry.calendarEntry,
    
    // Global refresh function
    refresh
  };
}
