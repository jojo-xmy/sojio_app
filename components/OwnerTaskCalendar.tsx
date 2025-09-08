"use client";
import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef, useRef } from 'react';
import { useUserStore } from '@/store/userStore';
import { TaskStatusBadge } from '@/components/TaskStatusBadge';
import { TaskStatus } from '@/types/task';
import { getCalendarTasks, getOwnerCalendarTasks, getAvailableCleanersForDate, assignTaskToCleaners } from '@/lib/calendar';
import { TaskCalendarEvent, AvailableCleaner } from '@/types/calendar';
import { TaskDetailPanel } from '@/components/TaskDetailPanel';
import { supabase } from '@/lib/supabase';

interface OwnerTaskCalendarProps {
  className?: string;
  onDataRefresh?: () => void;
}

export const OwnerTaskCalendar = forwardRef<{ refreshData: () => void }, OwnerTaskCalendarProps>(
  ({ className, onDataRefresh }, ref) => {
    const user = useUserStore(s => s.user);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<TaskCalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<TaskCalendarEvent | null>(null);
    const [availableCleaners, setAvailableCleaners] = useState<AvailableCleaner[]>([]);
    const [selectedCleanerIds, setSelectedCleanerIds] = useState<string[]>([]);
    const [assignNotes, setAssignNotes] = useState('');
    const [assigning, setAssigning] = useState(false);

    // 加载日历数据
    const loadCalendarData = useCallback(async (startDate: Date, endDate: Date) => {
      if (!user) return;
      
      console.log('🔄 OwnerTaskCalendar - loadCalendarData 被调用:', { 
        startDate: startDate.toISOString().split('T')[0], 
        endDate: endDate.toISOString().split('T')[0],
        userId: user.id 
      });
      
      try {
        setLoading(true);
        // 房东只能看到自己的任务
        const calendarEvents = await getOwnerCalendarTasks(startDate, endDate, user.id.toString());
        console.log('📅 OwnerTaskCalendar - 获取到的日历事件:', calendarEvents);
        
        // 对任务进行优先级排序
        const sortedEvents = calendarEvents.sort((a, b) => {
          // 待分配任务优先
          const aIsUnassigned = a.task.status === 'draft' || !a.assignedCleaners?.length;
          const bIsUnassigned = b.task.status === 'draft' || !b.assignedCleaners?.length;
          
          if (aIsUnassigned && !bIsUnassigned) return -1;
          if (!aIsUnassigned && bIsUnassigned) return 1;
          
          // 按状态优先级排序
          const statusPriority: Record<TaskStatus, number> = {
            draft: 1,
            assigned: 2,
            in_progress: 3,
            completed: 4,
            confirmed: 5
          };
          
          return statusPriority[a.task.status] - statusPriority[b.task.status];
        });
        
        console.log('📊 OwnerTaskCalendar - 排序后的事件:', sortedEvents);
        setEvents(sortedEvents);
        onDataRefresh?.();
      } catch (error) {
        console.error('❌ OwnerTaskCalendar - 加载日历数据失败:', error);
      } finally {
        setLoading(false);
      }
    }, [user, onDataRefresh]);

    // 同步更新 selectedEvent，确保侧栏显示最新数据
    useEffect(() => {
      if (selectedEvent && events.length > 0) {
        const updatedEvent = events.find(event => event.task.id === selectedEvent.task.id);
        if (updatedEvent && JSON.stringify(updatedEvent) !== JSON.stringify(selectedEvent)) {
          console.log('🔄 OwnerTaskCalendar - 同步更新 selectedEvent:', updatedEvent);
          setSelectedEvent(updatedEvent);
        }
      }
    }, [events, selectedEvent]);

    // 暴露刷新方法给父组件
    useImperativeHandle(ref, () => ({
      refreshData: () => {
        const { firstDay, lastDay } = getMonthRange(currentDate);
        loadCalendarData(firstDay, lastDay);
      }
    }));

    // 处理任务点击
    const handleTaskClick = async (event: TaskCalendarEvent) => {
      console.log('🎯 OwnerTaskCalendar - 任务被点击:', event);
      setSelectedEvent(event);
      
      // 如果是待分配任务，加载可用清洁工
      if (event.task.status === 'draft' || !event.assignedCleaners?.length) {
        try {
          const cleaningDate = new Date((event.task as any).cleaning_date || event.task.cleaningDate);
          console.log('🧹 OwnerTaskCalendar - 查询清扫日期:', cleaningDate.toISOString().split('T')[0]);
          const cleaners = await getAvailableCleanersForDate(cleaningDate.toISOString().split('T')[0]);
          console.log('👥 OwnerTaskCalendar - 获取到的可用清洁员:', cleaners);
          setAvailableCleaners(cleaners);
        } catch (error) {
          console.error('❌ OwnerTaskCalendar - 加载可用清洁工失败:', error);
        }
      }
    };

    // 获取月份范围
    const getMonthRange = (date: Date) => {
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      return { firstDay, lastDay };
    };

    // 获取日历网格数据 - 房东专用：支持连续条形显示
    const getCalendarGrid = (date: Date) => {
      const { firstDay, lastDay } = getMonthRange(date);
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - firstDay.getDay()); // 从周日开始

      const grid = [];
      for (let week = 0; week < 6; week++) {
        const weekData = [];
        for (let day = 0; day < 7; day++) {
          const currentDate = new Date(startDate);
          currentDate.setDate(startDate.getDate() + week * 7 + day);
          
          // 获取当天的任务 - 支持入住期间的连续显示
          const dayEvents = events.filter(event => {
            const checkInDate = new Date((event.task as any).check_in_date || event.task.checkInDate);
            const checkOutDate = new Date((event.task as any).check_out_date || event.task.checkOutDate);
            
            // 检查当前日期是否在入住期间内（包含入住日和退房日）
            return currentDate >= checkInDate && currentDate <= checkOutDate;
          });

          weekData.push({
            date: currentDate,
            events: dayEvents,
            isCurrentMonth: currentDate.getMonth() === date.getMonth(),
            isToday: currentDate.toDateString() === new Date().toDateString()
          });
        }
        grid.push(weekData);
      }
      return grid;
    };

    // 导航到上个月
    const goToPreviousMonth = () => {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    // 导航到下个月
    const goToNextMonth = () => {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    // 导航到今天
    const goToToday = () => {
      setCurrentDate(new Date());
    };

    // 订阅实时变更：tasks 与 task_assignments
    useEffect(() => {
      if (!user) return;
      const channel = supabase
        .channel(`realtime-owner-calendar-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
          console.log('🔄 OwnerTaskCalendar - 检测到tasks表变更，刷新数据');
          const { firstDay, lastDay } = getMonthRange(currentDate);
          loadCalendarData(firstDay, lastDay);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignments' }, () => {
          console.log('🔄 OwnerTaskCalendar - 检测到task_assignments表变更，刷新数据');
          const { firstDay, lastDay } = getMonthRange(currentDate);
          loadCalendarData(firstDay, lastDay);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }, [user?.id, currentDate, loadCalendarData]);

    // 初始化加载
    useEffect(() => {
      const { firstDay, lastDay } = getMonthRange(currentDate);
      loadCalendarData(firstDay, lastDay);
    }, [loadCalendarData, currentDate]);

    if (loading) {
      return (
        <div className={`flex items-center justify-center h-96 ${className}`}>
          <div className="text-lg">加载中...</div>
        </div>
      );
    }

    const calendarGrid = getCalendarGrid(currentDate);
    const monthName = currentDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });

    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        {/* 日历头部 */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">{monthName}</h2>
          <div className="flex gap-2">
            <button
              onClick={goToPreviousMonth}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              上个月
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1 bg-blue-500 text-white hover:bg-blue-600 rounded-md transition-colors"
            >
              今天
            </button>
            <button
              onClick={goToNextMonth}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              下个月
            </button>
          </div>
        </div>

        {/* 主体：左侧日历 + 右侧任务面板 */}
        <div className="flex gap-4">
          <div className="flex-1">
            {/* 星期标题 */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                <div key={day} className="p-2 text-center font-medium text-gray-600 text-sm">
                  {day}
                </div>
              ))}
            </div>

            {/* 日历网格 - 房东专用连续条形显示 */}
            <div className="grid grid-cols-7">
              {calendarGrid.map((week, weekIndex) =>
                week.map((day, dayIndex) => (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className={`
                      min-h-[120px] border-r border-b border-gray-200 p-2 relative
                      ${dayIndex === 0 ? 'border-l' : ''} 
                      ${weekIndex === 0 ? 'border-t' : ''}
                      ${!day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}
                      ${day.isToday ? 'bg-blue-50 border-blue-300' : ''}
                    `}
                  >
                    {/* 日期 */}
                    <div className="text-sm font-medium mb-2">
                      {day.date.getDate()}
                    </div>

                    {/* 入住任务显示 */}
                    <div className="space-y-1">
                      {day.events.map((event, index) => {
                        const checkInDate = new Date((event.task as any).check_in_date || event.task.checkInDate);
                        const checkOutDate = new Date((event.task as any).check_out_date || event.task.checkOutDate);
                        const cleaningDate = new Date((event.task as any).cleaning_date || event.task.cleaningDate);
                        
                        const isCleaningDay = day.date.toDateString() === cleaningDate.toDateString();
                        
                        // 为每个任务生成一致的颜色
                        const taskColors = [
                          'bg-blue-200 border-blue-300',
                          'bg-green-200 border-green-300', 
                          'bg-yellow-200 border-yellow-300',
                          'bg-pink-200 border-pink-300',
                          'bg-indigo-200 border-indigo-300',
                          'bg-purple-200 border-purple-300'
                        ];
                        // 简单的字符串哈希函数
                        const hashCode = (str: string) => {
                          let hash = 0;
                          for (let i = 0; i < str.length; i++) {
                            const char = str.charCodeAt(i);
                            hash = ((hash << 5) - hash) + char;
                            hash = hash & hash; // 转换为32位整数
                          }
                          return Math.abs(hash);
                        };
                        const colorIndex = hashCode(event.id) % taskColors.length;
                        const taskColor = taskColors[colorIndex];
                        
                        const isFirstDay = day.date.toDateString() === checkInDate.toDateString();
                        const isLastDay = day.date.toDateString() === checkOutDate.toDateString();
                        const isSingleDay = isFirstDay && isLastDay;
                        
                        return (
                          <div key={`${event.id}-${index}`} className="relative">
                            {/* 入住条形背景 - 连续样式 */}
                            <div
                              className={`
                                h-6 ${taskColor} cursor-pointer transition-colors
                                ${isSingleDay ? 'rounded border' : ''}
                                ${isFirstDay && !isSingleDay ? 'rounded-l border-l border-t border-b' : ''}
                                ${isLastDay && !isSingleDay ? 'rounded-r border-r border-t border-b' : ''}
                                ${!isFirstDay && !isLastDay ? 'border-t border-b' : ''}
                              `}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTaskClick(event);
                              }}
                              title={`${event.task.hotelName || '未知酒店'} - ${event.task.roomNumber || '未指定房间'}`}
                            >
                              <div className="text-xs px-1 py-0.5 truncate text-gray-700">
                                {isFirstDay || isSingleDay ? (event.task.hotelName || '未知酒店') + ' - ' + (event.task.roomNumber || '未指定房间') : ''}
                              </div>
                            </div>
                            
                            {/* 清扫任务状态标签 - 只在清扫日显示 */}
                            {isCleaningDay && (
                              <div className="absolute -top-1 -right-1 z-10">
                                <TaskStatusBadge status={event.task.status} size="small" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 右侧任务面板 */}
          <div className="w-[360px] shrink-0 border-l pl-4">
            <div className="sticky" style={{ top: 16 }}>
              {!selectedEvent ? (
                <div className="text-gray-500 flex items-center justify-center" style={{ height: 'calc(100vh - 32px)' }}>
                  选择一个任务以查看详情并进行分配
                </div>
              ) : (
                <div className="max-h-[calc(100vh-32px)] overflow-y-auto">
                  <TaskDetailPanel 
                    task={selectedEvent.task}
                    onAttendanceUpdate={async () => {
                      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
                      await loadCalendarData(startDate, endDate);
                    }}
                    onTaskUpdate={async () => {
                      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
                      await loadCalendarData(startDate, endDate);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

OwnerTaskCalendar.displayName = 'OwnerTaskCalendar';
