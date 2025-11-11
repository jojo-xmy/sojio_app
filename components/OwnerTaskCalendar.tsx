"use client";
import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef, useRef } from 'react';
import { useUserStore } from '@/store/userStore';
import { TaskStatusBadge } from '@/components/TaskStatusBadge';
import { TaskStatus } from '@/types/task';
import { getCalendarTasks, getOwnerCalendarTasks, getCleaningTasksByOwner, getAvailableCleanersForDate, assignTaskToCleaners } from '@/lib/calendar';
import { TaskCalendarEvent, AvailableCleaner } from '@/types/calendar';
import { TaskDetailPanel } from '@/components/TaskDetailPanel';
import { supabase } from '@/lib/supabase';
import { addDays, startOfWeek, endOfWeek, isBefore, isAfter, min, max, isSameDay, startOfDay, differenceInCalendarDays, format } from 'date-fns';

interface OwnerTaskCalendarProps {
  className?: string;
  onDataRefresh?: () => void;
}

interface TaskSegment {
  id: string;
  title: string;
  start: Date;
  end: Date;
  originalEvent: TaskCalendarEvent;
  weekIndex: number;
}

/**
 * 把跨周的任务拆成多个周段
 */
function splitTaskByWeek(event: TaskCalendarEvent, weekStartDates: Date[]): TaskSegment[] {
  const segments: TaskSegment[] = [];
  const checkInDate = new Date((event.task as any).check_in_date || event.task.checkInDate);
  const checkOutDate = new Date((event.task as any).check_out_date || event.task.checkOutDate);
  
  let currentStart = checkInDate;
  let weekIndex = 0;

  while (isBefore(currentStart, checkOutDate) || isSameDay(currentStart, checkOutDate)) {
    // 找到当前日期属于哪一周
    const currentWeekStart = weekStartDates.find(weekStart => 
      isSameDay(currentStart, weekStart) || 
      (isAfter(currentStart, weekStart) && isBefore(currentStart, addDays(weekStart, 7)))
    );
    
    if (!currentWeekStart) {
      currentStart = addDays(currentStart, 1);
      continue;
    }
    
    const weekEnd = addDays(currentWeekStart, 6);
    const segmentEnd = min([checkOutDate, weekEnd]);

    segments.push({
      id: `${event.id}-${weekIndex}`,
      title: event.task.hotelName || '未知酒店',
      start: currentStart,
      end: segmentEnd,
      originalEvent: event,
      weekIndex: weekStartDates.indexOf(currentWeekStart)
    });

    currentStart = addDays(segmentEnd, 1);
    weekIndex++;
  }

  return segments;
}

/**
 * 获取任务在当天的堆叠索引
 */
function getStackIndex(segment: TaskSegment, dayEvents: TaskSegment[]): number {
  // 按开始时间排序，确保堆叠顺序一致
  const sortedSegments = [...dayEvents].sort((a, b) => {
    const aStart = new Date((a.originalEvent.task as any).check_in_date || a.originalEvent.task.checkInDate);
    const bStart = new Date((b.originalEvent.task as any).check_in_date || b.originalEvent.task.checkInDate);
    return aStart.getTime() - bStart.getTime();
  });
  
  return sortedSegments.indexOf(segment);
}

/**
 * 为每周内的任务段分配层级（lane），避免相互覆盖
 */
function assignWeekLanes(segments: TaskSegment[]): Record<string, number> {
  const lanes: Record<string, number> = {};
  const occupied: Array<Record<number, boolean>> = []; // occupied[lane][dayOfWeek]

  // 按开始星期几和长度排序，以稳定分配
  const sorted = [...segments].sort((a, b) => {
    const aStart = a.start.getDay();
    const bStart = b.start.getDay();
    if (aStart !== bStart) return aStart - bStart;
    const aLen = Math.floor((a.end.getTime() - a.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const bLen = Math.floor((b.end.getTime() - b.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return bLen - aLen; // 长的优先
  });

  for (const seg of sorted) {
    const startDow = seg.start.getDay();
    const endDow = seg.end.getDay();
    let lane = 0;

    while (true) {
      if (!occupied[lane]) occupied[lane] = {};
      let conflict = false;
      for (let d = startDow; d <= endDow; d++) {
        if (occupied[lane][d]) { conflict = true; break; }
      }
      if (!conflict) {
        for (let d = startDow; d <= endDow; d++) {
          occupied[lane][d] = true;
        }
        lanes[seg.id] = lane;
        break;
      }
      lane++;
    }
  }

  return lanes;
}

export const OwnerTaskCalendar = forwardRef<{ refreshData: () => void }, OwnerTaskCalendarProps>(
  ({ className, onDataRefresh }, ref) => {
    const user = useUserStore(s => s.user);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<TaskCalendarEvent[]>([]);
    const [cleaningTasks, setCleaningTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<TaskCalendarEvent | null>(null);
    const [availableCleaners, setAvailableCleaners] = useState<AvailableCleaner[]>([]);
    const [selectedCleanerIds, setSelectedCleanerIds] = useState<string[]>([]);
    const [assignNotes, setAssignNotes] = useState('');
    const [assigning, setAssigning] = useState(false);
    const [isDetailExpanded, setIsDetailExpanded] = useState(false);
    
    // 任务条覆盖层顶部偏移（与日期行高度对应）
    const BAR_TOP = 28;

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
        // 房东只能看到自己的任务（只获取入住任务）
        const calendarEvents = await getOwnerCalendarTasks(startDate, endDate, user.id.toString());
        console.log('📅 OwnerTaskCalendar - 获取到的日历事件:', calendarEvents);
        
        // 获取清扫任务数据
        const cleaningTasksData = await getCleaningTasksByOwner(user.id.toString(), startDate, endDate);
        console.log('🧹 OwnerTaskCalendar - 获取到的清扫任务:', cleaningTasksData);
        setCleaningTasks(cleaningTasksData);
        
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
            confirmed: 5,
            open: 6,
            accepted: 7
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
      setIsDetailExpanded(true); // 展开详情面板
      
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
      const weekStartDates = [];
      
      for (let week = 0; week < 6; week++) {
        const weekStart = new Date(startDate);
        weekStart.setDate(startDate.getDate() + week * 7);
        weekStartDates.push(weekStart);
        
        const weekData = [];
        for (let day = 0; day < 7; day++) {
          const currentDate = new Date(startDate);
          currentDate.setDate(startDate.getDate() + week * 7 + day);
          
          weekData.push({
            date: currentDate,
            isCurrentMonth: currentDate.getMonth() === date.getMonth(),
            isToday: currentDate.toDateString() === new Date().toDateString(),
            weekIndex: week,
            dayIndex: day
          });
        }
        grid.push(weekData);
      }
      return { grid, weekStartDates };
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

    const { grid: calendarGrid, weekStartDates } = getCalendarGrid(currentDate);
    const monthName = currentDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
    
    // 拆分所有任务为周段（只处理入住任务，清扫任务通过状态徽章显示）
    const allSegments = events.flatMap(event => {
      const segments = splitTaskByWeek(event, weekStartDates);
      return segments;
    });

    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`} style={{ position: 'relative', zIndex: 0 }}>
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
          <div 
            className="transition-all duration-500 ease-in-out cursor-pointer"
            style={{ 
              flex: isDetailExpanded ? '0 0 35%' : '1',
              minWidth: isDetailExpanded ? '400px' : 'auto'
            }}
            onClick={() => isDetailExpanded && setIsDetailExpanded(false)}
          >
            {/* 星期标题 */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                <div key={day} className="p-2 text-center font-medium text-gray-600 text-sm">
                  {day}
                </div>
              ))}
            </div>

            {/* 日历网格 - 每周一行 + 行级覆盖层渲染任务条 */}
            <div className="flex flex-col">
              {calendarGrid.map((week, weekIndex) => {
                const weekSegments = allSegments.filter(s => s.weekIndex === weekIndex);
                const laneMap = assignWeekLanes(weekSegments);
                const maxLane = Math.max(-1, ...Object.values(laneMap)) + 1; // 该周需要的层数

                return (
                  <div key={`week-${weekIndex}`} className="relative">
                    {/* 一周的7个日期格子 */}
                    <div className="grid grid-cols-7">
                      {week.map((day, dayIndex) => (
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
                          <div className="text-sm font-medium mb-2">{day.date.getDate()}</div>
                          {/* 为任务条覆盖层预留高度（避免覆盖日期文字） */}
                          <div style={{ height: `${Math.max(0, maxLane) * 28}px` }} />
                        </div>
                      ))}
                    </div>

                    {/* 覆盖层：该周的任务条（使用 Grid 精准对齐） */}
                    <div
                      className="absolute inset-x-0"
                      style={{
                        top: BAR_TOP,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                        gridAutoRows: '28px'
                      }}
                    >
                      {weekSegments.map(segment => {
                        const startDow = segment.start.getDay();
                        const endDow = segment.end.getDay();
                        const spanDays = endDow - startDow + 1;
                        const lane = laneMap[segment.id] || 0;

                        // 颜色
                        const taskColors = [
                          'bg-blue-200 border-blue-300 text-blue-800',
                          'bg-green-200 border-green-300 text-green-800', 
                          'bg-yellow-200 border-yellow-300 text-yellow-800',
                          'bg-pink-200 border-pink-300 text-pink-800',
                          'bg-indigo-200 border-indigo-300 text-indigo-800',
                          'bg-purple-200 border-purple-300 text-purple-800'
                        ];
                        const hashCode = (str: string) => {
                          let hash = 0;
                          for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash = hash & hash; }
                          return Math.abs(hash);
                        };
                        const colorIndex = hashCode(segment.originalEvent.id) % taskColors.length;
                        const taskColor = taskColors[colorIndex];

                        const gridColumn = `${startDow + 1} / span ${spanDays}`;
                        const gridRow = `${lane + 1}`;

                        const segStart = new Date(segment.start);
                        segStart.setHours(0, 0, 0, 0);
                        const segEnd = new Date(segment.end);
                        segEnd.setHours(0, 0, 0, 0);
                        const totalDays = differenceInCalendarDays(segEnd, segStart) + 1;

                        const entryId = (segment.originalEvent.task as any).calendar_entry_id;
                        const startStr = format(segStart, 'yyyy-MM-dd');
                        const endStr = format(segEnd, 'yyyy-MM-dd');
                        // 仅匹配当前入住登记的清扫任务，并限定在该周段的日期范围内
                        const ctInSegment = cleaningTasks.filter((t: any) => {
                          return t.calendar_entry_id === entryId && t.cleaning_date >= startStr && t.cleaning_date <= endStr;
                        });
                        // 去重：同一天只显示一个徽章（按状态优先级汇总）
                        const statusPriority: Record<TaskStatus, number> = {
                          draft: 1,
                          open: 2,
                          assigned: 3,
                          accepted: 4,
                          in_progress: 5,
                          completed: 6,
                          confirmed: 7
                        };
                        const dedupByDate = new Map<string, any>();
                        ctInSegment.forEach((ct: any) => {
                          const existing = dedupByDate.get(ct.cleaning_date);
                          if (!existing) {
                            dedupByDate.set(ct.cleaning_date, ct);
                          } else {
                            const a = statusPriority[existing.status as TaskStatus] || 0;
                            const b = statusPriority[ct.status as TaskStatus] || 0;
                            if (b >= a) dedupByDate.set(ct.cleaning_date, ct);
                          }
                        });
                        const cleaningBadges = Array.from(dedupByDate.values());

                        return (
                          <div key={segment.id} style={{ gridColumn, gridRow }} className="px-0.5">
                            <div
                              className={`h-6 rounded border ${taskColor} relative cursor-pointer flex items-center px-2`}
                              title={`${segment.originalEvent.task.hotelName || '未知酒店'}`}
                              onClick={(e) => { e.stopPropagation(); handleTaskClick(segment.originalEvent); }}
                            >
                              {!(segment.originalEvent as any).isCleaningTask && (
                                <div className="text-xs truncate font-medium">
                                  {`${segment.originalEvent.task.hotelName || '未知酒店'}`}
                                </div>
                              )}

                              {cleaningBadges.map((ct: any, idx: number) => {
                                const ctDate = new Date(ct.cleaning_date);
                                ctDate.setHours(0, 0, 0, 0);
                                const dayOffset = Math.max(0, Math.min(
                                  differenceInCalendarDays(ctDate, segStart),
                                  totalDays - 1
                                ));
                                const leftPercent = (dayOffset / totalDays) * 100;

                                return (
                                  <div
                                    key={`${ct.id}-${idx}`}
                                    className="absolute"
                                    style={{ top: -6, left: `calc(${leftPercent}% + 2px)` }}
                                  >
                                    <TaskStatusBadge status={ct.status} size="small" />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 右侧任务面板 */}
          <div 
            className="shrink-0 border-l pl-4 transition-all duration-500 ease-in-out"
            style={{ 
              width: isDetailExpanded ? 'calc(65% - 1rem)' : '360px',
              flex: isDetailExpanded ? '1' : '0 0 360px'
            }}
          >
            <div className="sticky" style={{ top: 16 }}>
              {!selectedEvent ? (
                <div 
                  className="text-gray-500 flex items-center justify-center transition-opacity duration-300"
                  style={{ height: 'calc(100vh - 32px)' }}
                >
                  <div className="text-center px-4">
                    <div className="text-lg font-medium mb-2">📅</div>
                    <div className="text-sm">点击日历中的任务以查看详情</div>
                  </div>
                </div>
              ) : (
                <div className="max-h-[calc(100vh-32px)] overflow-y-auto">
                  <div className="mb-3 flex items-center justify-between">
                    <button
                      onClick={() => setIsDetailExpanded(!isDetailExpanded)}
                      className="text-xs px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-all duration-200 flex items-center gap-1.5 shadow-sm hover:shadow"
                      title={isDetailExpanded ? "收缩详情面板" : "展开详情面板"}
                    >
                      <span>{isDetailExpanded ? '◀' : '▶'}</span>
                      <span>{isDetailExpanded ? '收缩' : '展开'}</span>
                    </button>
                  </div>
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
