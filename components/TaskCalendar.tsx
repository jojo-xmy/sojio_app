"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { TaskCalendarEvent, AvailableCleaner } from '@/types/calendar';
import { getCalendarTasks, getAvailableCleanersForDate, assignTaskToCleaners } from '@/lib/calendar.js';
import { useUserStore } from '@/store/userStore';
import { TaskAssignmentModal } from '@/components/TaskAssignmentModal';
import { TaskStatusBadge } from '@/components/TaskStatusBadge';
import { TaskStatus } from '@/types/task';

const locales = {
  'zh-CN': zhCN,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface TaskCalendarProps {
  className?: string;
}

export function TaskCalendar({ className }: TaskCalendarProps) {
  const user = useUserStore(s => s.user);
  const [events, setEvents] = useState<TaskCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<TaskCalendarEvent | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [availableCleaners, setAvailableCleaners] = useState<AvailableCleaner[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

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

  // 处理日期范围变化
  const handleRangeChange = useCallback((range: any) => {
    if (range.start && range.end) {
      loadCalendarData(range.start, range.end);
    }
  }, [loadCalendarData]);

  // 处理事件点击
  const handleEventClick = useCallback(async (event: TaskCalendarEvent) => {
    setSelectedEvent(event);
    
    // 如果是未分配的任务，加载可用清洁员
    if (event.task.status === 'draft' || !event.assignedCleaners?.length) {
      try {
        const dateStr = event.task.date;
        const cleaners = await getAvailableCleanersForDate(dateStr);
        setAvailableCleaners(cleaners);
        setShowAssignmentModal(true);
      } catch (error) {
        console.error('获取可用清洁员失败:', error);
      }
    }
  }, []);

  // 处理任务分配
  const handleTaskAssignment = useCallback(async (cleanerIds: string[], notes?: string) => {
    if (!selectedEvent || !user) return;

    try {
      const result = await assignTaskToCleaners(
        selectedEvent.task.id,
        cleanerIds,
        user.id,
        notes
      );

      if (result.success) {
        // 刷新日历数据
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        await loadCalendarData(startDate, endDate);
        
        setShowAssignmentModal(false);
        setSelectedEvent(null);
      } else {
        alert(`分配失败: ${result.error}`);
      }
    } catch (error) {
      console.error('分配任务失败:', error);
      alert('分配任务失败');
    }
  }, [selectedEvent, user, currentDate, loadCalendarData]);

  // 自定义事件组件
  const EventComponent = ({ event }: { event: TaskCalendarEvent }) => {
    const isUnassigned = event.task.status === 'draft' || !event.assignedCleaners?.length;
    const isCompleted = event.task.status === 'completed' || event.task.status === 'confirmed';
    
    return (
      <div 
        className={`p-2 text-xs cursor-pointer rounded border transition-colors hover:shadow-sm w-full mb-1 ${
          isUnassigned 
            ? 'bg-red-50 text-red-800 border-red-300 hover:bg-red-100' 
            : isCompleted
            ? 'bg-green-50 text-green-800 border-green-300 hover:bg-green-100'
            : 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100'
        }`}
        title={`${event.title} - ${event.task.status}`}
        style={{ 
          minHeight: '40px',
          maxWidth: '100%', 
          overflow: 'hidden',
          display: 'block'
        }}
      >
        <div className="font-medium truncate mb-1 text-[10px] leading-tight">{event.title}</div>
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
  };

  // 初始化加载
  useEffect(() => {
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    loadCalendarData(startDate, endDate);
  }, [loadCalendarData, currentDate]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className={className}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 800 }}
        onRangeChange={handleRangeChange}
        onSelectEvent={handleEventClick}
        components={{
          event: EventComponent
        }}
        messages={{
          next: "下月",
          previous: "上月",
          today: "今天",
          month: "月",
          week: "周",
          day: "日",
          agenda: "议程",
          date: "日期",
          time: "时间",
          event: "事件",
          noEventsInRange: "此范围内没有事件。",
          showMore: total => `+ ${total} 更多`
        }}
        defaultView="month"
        views={['month', 'week', 'day']}
        step={60}
        timeslots={1}
        selectable
        popup
        onNavigate={(newDate) => setCurrentDate(newDate)}
        // 增加每天任务栏的高度
        dayPropGetter={(date) => ({
          style: {
            minHeight: '120px',
            height: 'auto'
          }
        })}
        // 自定义样式
        className="custom-calendar"
      />

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

      <style jsx global>{`
        .custom-calendar .rbc-month-view {
          height: auto !important;
        }
        
        .custom-calendar .rbc-month-row {
          min-height: 120px !important;
        }
        
        .custom-calendar .rbc-date-cell {
          min-height: 120px !important;
          padding: 4px !important;
          overflow: visible !important;
        }
        
        /* 重置默认事件样式，让我们的自定义组件生效 */
        .custom-calendar .rbc-event {
          background: none !important;
          border: none !important;
          padding: 0 !important;
          margin: 0 !important;
          min-height: auto !important;
          max-width: none !important;
          overflow: visible !important;
        }
        
        .custom-calendar .rbc-event-content {
          padding: 0 !important;
          margin: 0 !important;
        }
        
        .custom-calendar .rbc-show-more {
          background-color: rgba(0, 0, 0, 0.1) !important;
          color: #666 !important;
          font-size: 10px !important;
          padding: 1px 3px !important;
          border-radius: 2px !important;
        }
        
        /* 确保事件容器不会溢出 */
        .custom-calendar .rbc-event-wrapper {
          overflow: visible !important;
        }
        
        /* 调整日期单元格内容区域 */
        .custom-calendar .rbc-day-bg {
          min-height: 120px !important;
        }
        
        /* 确保我们的自定义组件样式不被覆盖 */
        .custom-calendar .rbc-event > div {
          width: 100% !important;
          height: auto !important;
        }
      `}</style>
    </div>
  );
}
