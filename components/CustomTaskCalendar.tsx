"use client";
import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef, useRef } from 'react';
import { useUserStore } from '@/store/userStore';
import { TaskStatusBadge } from '@/components/TaskStatusBadge';
import { TaskStatus } from '@/types/task';
import { getCalendarTasks, getOwnerCalendarTasks, getAvailableCleanersForDate, assignTaskToCleaners } from '@/lib/calendar';
import { TaskCalendarEvent, AvailableCleaner } from '@/types/calendar';
import { TaskDetailPanel } from '@/components/TaskDetailPanel';
import { supabase } from '@/lib/supabase';
import { useTaskStore } from '@/store/taskStore';

interface CustomTaskCalendarProps {
  className?: string;
  onDataRefresh?: () => void; // 添加数据刷新回调
}

export const CustomTaskCalendar = forwardRef<{ refreshData: () => void }, CustomTaskCalendarProps>(
  ({ className, onDataRefresh }, ref) => {
    const user = useUserStore(s => s.user);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<TaskCalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const { selectedTaskId, setSelectedTask } = useTaskStore();
    // 直接使用全局状态中的选中任务，确保数据一致性
    const selectedEvent = events.find(event => event.task.id === selectedTaskId) || null;
    useEffect(() => {
      if (!selectedEvent) return;
      if (!selectedEvent.task?.id) return;
      // 监控选择的任务ID，帮助定位 refresh 使用的 task.id 是否丢失
      console.log('CustomTaskCalendar selectedTaskId =', selectedTaskId, 'selectedEvent.task.id =', selectedEvent.task.id);
    }, [selectedTaskId, selectedEvent?.task?.id]);
    const [availableCleaners, setAvailableCleaners] = useState<AvailableCleaner[]>([]);
    const [selectedCleanerIds, setSelectedCleanerIds] = useState<string[]>([]);
    const [assignNotes, setAssignNotes] = useState('');
    const [assigning, setAssigning] = useState(false);

    // 使用 ref 保存 onDataRefresh，避免作为依赖导致回调重建引发重复刷新
    const onDataRefreshRef = useRef(onDataRefresh);
    useEffect(() => {
      onDataRefreshRef.current = onDataRefresh;
    }, [onDataRefresh]);

    // 加载日历数据
    const loadCalendarData = useCallback(async (startDate: Date, endDate: Date) => {
      if (!user) return;
      
      try {
        setLoading(true);
        // 根据用户角色调用不同的数据加载函数，强制刷新
        const calendarEvents = user.role === 'owner' 
          ? await getOwnerCalendarTasks(startDate, endDate, user.id.toString())
          : await getCalendarTasks(startDate, endDate, undefined, true); // 强制刷新
        
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
        
        // 通知父组件数据已刷新（通过 ref 调用，避免依赖导致的重建）
        onDataRefreshRef.current?.();
      } catch (error) {
        console.error('加载日历数据失败:', error);
      } finally {
        setLoading(false);
      }
    }, [user]);



    // 暴露刷新方法给父组件
    useImperativeHandle(ref, () => ({
      refreshData: () => {
        const { firstDay, lastDay } = getMonthRange(currentDate);
        loadCalendarData(firstDay, lastDay);
      }
    }), [currentDate, loadCalendarData]);

    // 订阅实时变更：tasks 与 task_assignments
    useEffect(() => {
      if (!user) return;
      const channel = supabase
        .channel(`realtime-calendar-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
          const { firstDay, lastDay } = getMonthRange(currentDate);
          loadCalendarData(firstDay, lastDay);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignments' }, () => {
          const { firstDay, lastDay } = getMonthRange(currentDate);
          loadCalendarData(firstDay, lastDay);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }, [user?.id, currentDate]); // 移除 loadCalendarData 依赖，避免循环

    // 处理任务点击（仅改变选择状态，不重新加载数据）
    const handleTaskClick = useCallback((event: TaskCalendarEvent) => {
      console.log('任务被点击:', event);
      // 只更新选中状态，不重新加载数据
      setSelectedTask(event.task.id);
      
      // 异步加载可用清洁员（不影响全局状态）
      const loadAvailableCleaners = async () => {
        try {
          const dateStr = event.task.cleaningDate || event.task.checkInDate || event.task.date || '';
          console.log('CustomTaskCalendar - 查询日期:', dateStr);
          if (dateStr) {
            const cleaners = await getAvailableCleanersForDate(dateStr);
            console.log('CustomTaskCalendar - 获取到的可用清洁员:', cleaners);
            setAvailableCleaners(cleaners);
            setSelectedCleanerIds([]);
          } else {
            setAvailableCleaners([]);
          }
        } catch (error) {
          console.error('获取可用清洁员失败:', error);
        }
      };
      
      loadAvailableCleaners();
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
        setAssigning(true);
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
          
          alert('任务分配成功！');
          setSelectedCleanerIds([]);
          if (selectedEvent) {
            const dateStr = selectedEvent.task.cleaningDate || selectedEvent.task.checkInDate || selectedEvent.task.date || '';
            if (dateStr) {
              const cleaners = await getAvailableCleanersForDate(dateStr);
              setAvailableCleaners(cleaners);
            }
          }
        } else {
          alert(`分配失败: ${result.error}`);
        }
      } catch (error) {
        console.error('分配任务失败:', error);
        alert('分配任务失败');
      } finally {
        setAssigning(false);
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
          </div>

          {/* 右侧任务面板（固定在视口垂直居中，随滚动保持中部） */}
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
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {(() => { console.log('CustomTaskCalendar - 渲染状态(侧栏):', { selectedEvent, availableCleaners, selectedCleanerIds }); return null; })()}
      </div>
    );
  }
);

CustomTaskCalendar.displayName = 'CustomTaskCalendar';
