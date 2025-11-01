"use client";
import { useCallback, useEffect, useState } from 'react';
import { Task } from '@/types/task';
import { getCalendarTasks, getOwnerCalendarTasks } from '@/lib/calendar';
import { getCleanerTasks, getUserHotels, getHotelCalendarEntries, getCleanerAvailability } from '@/lib/hotelManagement';
import { getAttendanceByTaskId, calculateTaskStatus } from '@/lib/attendance';
import { TaskCalendarEvent } from '@/types/calendar';
import { useUserStore } from '@/store/userStore';

// Hook for manager dashboard - handles calendar and task data
export function useManagerDashboard() {
  const user = useUserStore(s => s.user);
  const [tasksWithAttendance, setTasksWithAttendance] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // 获取日历任务数据
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      
      const calendarEvents = await getCalendarTasks(startDate, endDate, undefined, true);
      
      // 加载打卡状态
      const tasksWithStatus = await Promise.all(
        calendarEvents.map(async (event: TaskCalendarEvent) => {
          const task = event.task;
          const attendanceRecords = await getAttendanceByTaskId(task.id);
          
          let overallStatus: 'none' | 'checked_in' | 'checked_out' = 'none';
          const hasCheckedOut = attendanceRecords.some(record => record.status === 'checked_out');
          const hasCheckedIn = attendanceRecords.some(record => record.status === 'checked_in');
          
          if (hasCheckedOut) {
            overallStatus = 'checked_out';
          } else if (hasCheckedIn) {
            overallStatus = 'checked_in';
          }
          
          return {
            ...task,
            attendanceStatus: overallStatus,
            assignedCleaners: event.assignedCleaners?.map(c => c.name) || task.assignedCleaners || [],
            acceptedBy: event.assignedCleaners?.map(c => c.name) || task.acceptedBy || []
          } as Task;
        })
      );
      
      setTasksWithAttendance(tasksWithStatus);
    } catch (error) {
      console.error('加载管理员数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    tasksWithAttendance,
    loading,
    refresh
  };
}

// Hook for cleaner tasks page
export function useCleanerTasks() {
  const user = useUserStore(s => s.user);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      console.log('useCleanerTasks: 用户未登录');
      return;
    }
    
    try {
      console.log('useCleanerTasks: 开始加载任务，用户ID:', user.id);
      setLoading(true);
      const taskList = await getCleanerTasks(user.id.toString(), true);
      console.log('useCleanerTasks: 成功加载任务，数量:', taskList.length);
      setTasks(taskList);
    } catch (error) {
      console.error('useCleanerTasks: 加载清洁员任务失败:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    tasks,
    loading,
    refresh
  };
}

// Hook for owner hotels page
export function useOwnerHotels() {
  const user = useUserStore(s => s.user);
  const [hotels, setHotels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const hotelList = await getUserHotels(user.id.toString());
      setHotels(hotelList);
    } catch (error) {
      console.error('加载酒店列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    hotels,
    loading,
    refresh
  };
}

// Hook for hotel calendar page
export function useHotelCalendar(hotelId: string) {
  const user = useUserStore(s => s.user);
  const [hotel, setHotel] = useState<any>(null);
  const [calendarEntries, setCalendarEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user || !hotelId) return;
    
    try {
      setLoading(true);
      const [hotelData, entries] = await Promise.all([
        // 这里应该有 getHotelById，暂时用 getUserHotels 替代
        getUserHotels(user.id.toString()).then(hotels => hotels.find(h => h.id === hotelId)),
        getHotelCalendarEntries(hotelId)
      ]);
      
      setHotel(hotelData);
      setCalendarEntries(entries);
    } catch (error) {
      console.error('加载酒店日历失败:', error);
    } finally {
      setLoading(false);
    }
  }, [user, hotelId]);

  return {
    hotel,
    calendarEntries,
    loading,
    refresh
  };
}

// Hook for cleaner availability page
export function useCleanerAvailability(currentMonth: string) {
  const user = useUserStore(s => s.user);
  const [availability, setAvailability] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const startDate = `${currentMonth}-01`;
      const endDate = getLastDayOfMonth(currentMonth);
      const availabilityList = await getCleanerAvailability(
        user.id.toString(), 
        startDate, 
        endDate
      );
      setAvailability(availabilityList);
    } catch (error) {
      console.error('加载可用性数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [user, currentMonth]);

  return {
    availability,
    loading,
    refresh
  };
}

// Utility function
function getLastDayOfMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  return new Date(year, month, 0).toISOString().split('T')[0];
}
