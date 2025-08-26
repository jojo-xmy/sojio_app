"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useUserStore } from '@/store/userStore';
import { TaskAssignmentModal } from '@/components/TaskAssignmentModal';
import { TaskStatusBadge } from '@/components/TaskStatusBadge';
import { TaskStatus } from '@/types/task';
import { getCalendarTasks, getAvailableCleanersForDate, assignTaskToCleaners } from '@/lib/calendar';
import { TaskCalendarEvent, AvailableCleaner } from '@/types/calendar';

interface CustomTaskCalendarProps {
  className?: string;
}

export function CustomTaskCalendar({ className }: CustomTaskCalendarProps) {
  const user = useUserStore(s => s.user);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<TaskCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<TaskCalendarEvent | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [availableCleaners, setAvailableCleaners] = useState<AvailableCleaner[]>([]);

  // 加载日历数据
  const loadCalendarData = useCallback(async (startDate: Date, endDate: Date) => {
    if (!user) return;
    
    try {
      setLoading(true);
      const calendarEvents = await getCalendarTasks(startDate, endDate);
      
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
          open: 2,
          assigned: 3,
          accepted: 4,
          in_progress: 5,
          completed: 6,
          confirmed: 7
        };
        
        return statusPriority[a.task.status] - statusPriority[b.task.status];
      });
      
      setEvents(sortedEvents);
    } catch (error) {
      console.error('加载日历数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 处理任务点击
  const handleTaskClick = useCallback(async (event: TaskCalendarEvent) => {
    console.log('任务被点击:', event);
    setSelectedEvent(event);
    
    // 如果是未分配的任务，加载可用清洁员
    if (event.task.status === 'draft' || !event.assignedCleaners?.length) {
      console.log('加载可用清洁员...');
      try {
                 const dateStr = (event.task as any).check_in_date || event.task.checkInDate;
        console.log('查询日期:', dateStr);
        const cleaners = await getAvailableCleanersForDate(dateStr);
        console.log('CustomTaskCalendar - 获取到的可用清洁员:', cleaners);
        setAvailableCleaners(cleaners);
        console.log('CustomTaskCalendar - 设置availableCleaners后:', cleaners);
        setShowAssignmentModal(true);
      } catch (error) {
        console.error('获取可用清洁员失败:', error);
        alert('获取可用清洁员失败');
      }
    } else {
      console.log('任务已分配，显示任务详情');
      // 对于已分配的任务，可以显示任务详情或其他操作
    }
  }, []);

  // 处理任务分配
  const handleTaskAssignment = useCallback(async (cleanerIds: string[], notes?: string) => {
    console.log('开始分配任务:', { selectedEvent, cleanerIds, notes });
    if (!selectedEvent || !user) {
      console.log('缺少必要参数:', { selectedEvent: !!selectedEvent, user: !!user });
      return;
    }

    try {
      console.log('调用assignTaskToCleaners...');
      const result = await assignTaskToCleaners(
        selectedEvent.task.id,
        cleanerIds,
        user.id,
        notes
      );

      console.log('分配结果:', result);

      if (result.success) {
        console.log('分配成功，刷新日历数据...');
        // 刷新日历数据
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        await loadCalendarData(startDate, endDate);
        
        setShowAssignmentModal(false);
        setSelectedEvent(null);
        alert('任务分配成功！');
      } else {
        alert(`分配失败: ${result.error}`);
      }
    } catch (error) {
      console.error('分配任务失败:', error);
      alert('分配任务失败');
    }
  }, [selectedEvent, user, currentDate, loadCalendarData]);

  // 获取月份的第一天和最后一天
  const getMonthRange = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return { firstDay, lastDay };
  };

  // 获取日历网格数据
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
        
        // 获取当天的任务
        const dayEvents = events.filter(event => {
                     const eventDate = new Date((event.task as any).check_in_date || event.task.checkInDate);
          return eventDate.toDateString() === currentDate.toDateString();
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
  const monthNames = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ];

  return (
    <div className={className}>
      {/* 日历头部 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">
          {currentDate.getFullYear()}年 {monthNames[currentDate.getMonth()]}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={goToPreviousMonth}
            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
          >
            上月
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
          >
            今天
          </button>
          <button
            onClick={goToNextMonth}
            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
          >
            下月
          </button>
        </div>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['日', '一', '二', '三', '四', '五', '六'].map(day => (
          <div key={day} className="p-2 text-center font-medium text-gray-600 text-sm">
            {day}
          </div>
        ))}
      </div>

      {/* 日历网格 */}
      <div className="grid grid-cols-7 gap-1">
        {calendarGrid.map((week, weekIndex) =>
          week.map((day, dayIndex) => (
            <div
              key={`${weekIndex}-${dayIndex}`}
              className={`
                min-h-[120px] border border-gray-200 p-2
                ${!day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}
                ${day.isToday ? 'bg-blue-50 border-blue-300' : ''}
              `}
            >
              {/* 日期 */}
              <div className="text-sm font-medium mb-2">
                {day.date.getDate()}
              </div>

              {/* 任务列表 */}
              <div className="space-y-1">
                {day.events.map((event) => {
                  const isUnassigned = event.task.status === 'draft' || !event.assignedCleaners?.length;
                  const isCompleted = event.task.status === 'completed' || event.task.status === 'confirmed';
                  
                  return (
                                         <div
                       key={event.id}
                       className={`
                         p-1 text-xs rounded cursor-pointer border transition-colors
                         ${isUnassigned 
                           ? 'bg-red-50 text-red-800 border-red-300 hover:bg-red-100' 
                           : isCompleted
                           ? 'bg-green-50 text-green-800 border-green-300 hover:bg-green-100'
                           : 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100'
                         }
                       `}
                       onClick={(e) => {
                         e.stopPropagation();
                         handleTaskClick(event);
                       }}
                       title={`${event.title} - ${event.task.status} (点击${isUnassigned ? '分配任务' : '查看详情'})`}
                     >
                      <div className="font-medium truncate text-[10px] leading-tight">
                        {event.title}
                      </div>
                      <div className="mb-1">
                        <TaskStatusBadge status={event.task.status} size="small" />
                      </div>
                      {event.assignedCleaners && event.assignedCleaners.length > 0 && (
                        <div className="text-[9px] opacity-75 truncate leading-tight">
                          {event.assignedCleaners.map(c => c.name).join(', ')}
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

      {/* 任务分配模态框 */}
      {showAssignmentModal && selectedEvent && (
        <TaskAssignmentModal
          isOpen={showAssignmentModal}
          onClose={() => {
            setShowAssignmentModal(false);
            setSelectedEvent(null);
          }}
          task={selectedEvent}
          availableCleaners={availableCleaners}
          onAssign={handleTaskAssignment}
        />
      )}
      {(() => { console.log('CustomTaskCalendar - 渲染状态:', { showAssignmentModal, selectedEvent, availableCleaners }); return null; })()}
    </div>
  );
}
