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
    
    console.log('--- useTaskData refresh start ---');
    console.log('Task ID:', task.id);
    console.log('User ID:', user?.id);
    
    const attendanceList = await getAttendanceByTaskId(task.id);
    console.log('attendances:', attendanceList);
    
    const latestStatus = user ? await getUserLatestAttendance(task.id, user.id.toString()) : 'none' as const;
    console.log('latest status:', latestStatus);
    
    const imageList = await getTaskImages(task.id);
    console.log('images:', imageList);
    
    setAllAttendances(attendanceList);
    setCurrentStatus(latestStatus);
    setImages(imageList);
    console.log('--- useTaskData refresh end ---');
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
    
    console.log('--- useTaskDetails refresh start ---');
    console.log('Task ID:', taskId);
    
    const task = await getTaskById(taskId);
    console.log('task details:', task);
    
    setTaskDetails(task);
    console.log('--- useTaskDetails refresh end ---');
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
    
    console.log('--- useCalendarEntry refresh start ---');
    console.log('Task ID:', taskId);
    
    const entry = await getCalendarEntryByTaskId(taskId);
    console.log('calendar entry:', entry);
    
    setCalendarEntry(entry);
    console.log('--- useCalendarEntry refresh end ---');
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
    console.log('--- refresh start ---');
    const attendances = await getAttendanceByTaskId(task.id);
    console.log('attendances:', attendances);

    const latest = user ? await getUserLatestAttendance(task.id, user.id.toString()) : null;
    console.log('latest status:', latest);

    const imgs = await getTaskImages(task.id);
    console.log('images:', imgs);

    const calendarEntryData = await getCalendarEntryByTaskId(task.id);
    console.log('calendar entry:', calendarEntryData);
    console.log('--- refresh end ---');
    
    await Promise.all([
      taskData.refresh(),
      taskDetails.refresh(),
      calendarEntry.refresh()
    ]);
  }, [task.id, user?.id]);

  // Initial load
  useEffect(() => {
    if (task?.id) {
      refresh();
    }
  }, [task?.id]); // 只在 task.id 变化时执行，避免无限循环

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
