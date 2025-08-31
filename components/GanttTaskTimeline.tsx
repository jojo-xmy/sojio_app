"use client";
import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef, useRef } from 'react';
import { useUserStore } from '@/store/userStore';
import { TaskStatusBadge } from '@/components/TaskStatusBadge';
import { TaskStatus } from '@/types/task';
import { getOwnerCalendarTasks } from '@/lib/calendar';
import { TaskCalendarEvent } from '@/types/calendar';
import { TaskDetailPanel } from '@/components/TaskDetailPanel';
import { GanttTask, GanttLink, GanttConfig } from '@/types/gantt';
import { TASK_STATUS_COLOR } from '@/types/task';
// 暂时注释掉 react-gantt-timeline，使用自定义实现
// const Gantt = React.lazy(() => import('react-gantt-timeline').then(module => ({ default: module.default })));

interface GanttTaskTimelineProps {
  className?: string;
  onDataRefresh?: () => void;
}

export const GanttTaskTimeline = forwardRef<{ refreshData: () => void }, GanttTaskTimelineProps>(
  ({ className, onDataRefresh }, ref) => {
    const user = useUserStore(s => s.user);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<TaskCalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<TaskCalendarEvent | null>(null);
    const [ganttTasks, setGanttTasks] = useState<GanttTask[]>([]);
    const [ganttLinks, setGanttLinks] = useState<GanttLink[]>([]);
    const ganttRef = useRef(null);

    // 加载日历数据
    const loadCalendarData = useCallback(async (startDate: Date, endDate: Date) => {
      if (!user) return;
      
      try {
        setLoading(true);
        const calendarEvents = await getOwnerCalendarTasks(startDate, endDate, user.id.toString());
        
        // 对任务进行优先级排序
        const sortedEvents = calendarEvents.sort((a, b) => {
          const aIsUnassigned = a.task.status === 'draft' || !a.assignedCleaners?.length;
          const bIsUnassigned = b.task.status === 'draft' || !b.assignedCleaners?.length;
          
          if (aIsUnassigned && !bIsUnassigned) return -1;
          if (!aIsUnassigned && bIsUnassigned) return 1;
          
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
        onDataRefresh?.();
      } catch (error) {
        console.error('加载日历数据失败:', error);
      } finally {
        setLoading(false);
      }
    }, [user, onDataRefresh]);

    // 转换数据为 Gantt 格式
    const convertToGanttData = useCallback((events: TaskCalendarEvent[]) => {
      const tasks: GanttTask[] = [];
      const links: GanttLink[] = [];
      let taskCounter = 0;

      events.forEach((event) => {
        const task = event.task;
        const checkInDate = new Date((task as any).check_in_date || task.checkInDate);
        const checkOutDate = new Date((task as any).check_out_date || task.checkOutDate);
        const cleaningDate = new Date((task as any).cleaning_date || task.cleaningDate);

        // 主任务（入住期间）
        const mainTaskId = `task_${task.id}`;
        const mainTask: GanttTask = {
          id: mainTaskId,
          text: `${task.hotelName || '未知酒店'} - ${task.roomNumber || '未指定房间'}`,
          start_date: checkInDate.toISOString().split('T')[0],
          end_date: checkOutDate.toISOString().split('T')[0],
          progress: getProgressByStatus(task.status),
          color: TASK_STATUS_COLOR[task.status],
          taskData: task,
          taskType: 'checkin',
          status: task.status,
          open: true
        };
        tasks.push(mainTask);

        // 清扫任务（里程碑）
        const cleaningTaskId = `cleaning_${task.id}`;
        const cleaningTask: GanttTask = {
          id: cleaningTaskId,
          text: `清扫任务`,
          start_date: cleaningDate.toISOString().split('T')[0],
          end_date: cleaningDate.toISOString().split('T')[0],
          progress: getProgressByStatus(task.status),
          color: TASK_STATUS_COLOR[task.status],
          taskData: task,
          taskType: 'cleaning',
          status: task.status,
          type: 'milestone',
          parent: mainTaskId,
          open: true
        };
        tasks.push(cleaningTask);

        // 创建链接
        const link: GanttLink = {
          id: `link_${task.id}`,
          source: mainTaskId,
          target: cleaningTaskId,
          type: '0' // finish-to-start
        };
        links.push(link);
      });

      return { tasks, links };
    }, []);

    // 根据状态获取进度
    const getProgressByStatus = (status: TaskStatus): number => {
      const progressMap: Record<TaskStatus, number> = {
        draft: 0,
        open: 10,
        assigned: 20,
        accepted: 40,
        in_progress: 60,
        completed: 80,
        confirmed: 100
      };
      return progressMap[status] || 0;
    };

    // 暴露刷新方法给父组件
    useImperativeHandle(ref, () => ({
      refreshData: () => {
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);
        loadCalendarData(startDate, endDate);
      }
    }));

    // 处理任务点击
    const handleTaskClick = (taskId: string) => {
      const event = events.find(e => e.id === taskId.replace('task_', ''));
      if (event) {
        setSelectedEvent(event);
      }
    };

    // 获取月份范围
    const getMonthRange = (date: Date) => {
      const firstDay = new Date(date.getFullYear(), date.getMonth() - 1, 1);
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 2, 0);
      return { firstDay, lastDay };
    };

    // 初始化加载
    useEffect(() => {
      const { firstDay, lastDay } = getMonthRange(currentDate);
      loadCalendarData(firstDay, lastDay);
    }, [loadCalendarData, currentDate]);

    // 转换数据
    useEffect(() => {
      const { tasks, links } = convertToGanttData(events);
      setGanttTasks(tasks);
      setGanttLinks(links);
    }, [events, convertToGanttData]);

    if (loading) {
      return (
        <div className={`flex items-center justify-center h-96 ${className}`}>
          <div className="text-lg">加载中...</div>
        </div>
      );
    }

    // 甘特图配置
    const ganttConfig: GanttConfig = {
      header_height: 50,
      column_width: 30,
      step: 24,
      view_modes: ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month'],
      bar_height: 20,
      date_format: '%Y-%m-%d',
      language: 'zh',
      readonly: false,
      select_task: true,
      show_progress: true,
      show_critical_path: false,
      show_links: true
    };

    // 处理甘特图任务点击
    const handleGanttTaskClick = (task: any) => {
      const event = events.find(e => e.id === task.id.replace('task_', ''));
      if (event) {
        setSelectedEvent(event);
      }
    };

    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="flex gap-4">
          {/* 左侧甘特图 */}
          <div className="flex-1">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">任务甘特图</h2>
              <div className="text-sm text-gray-600">
                显示入住任务和清扫任务的时间安排
              </div>
            </div>
            
            {/* 自定义甘特图视图 */}
            <div className="border rounded-lg overflow-hidden" style={{ height: '600px' }}>
              <CustomGanttChart 
                tasks={ganttTasks}
                onTaskClick={handleGanttTaskClick}
              />
            </div>
          </div>

          {/* 右侧任务面板 */}
          <div className="w-[360px] shrink-0 border-l pl-4">
            <div className="sticky" style={{ top: 16 }}>
              {!selectedEvent ? (
                <div className="text-gray-500 flex items-center justify-center" style={{ height: 'calc(100vh - 32px)' }}>
                  选择一个任务以查看详情
                </div>
              ) : (
                <div className="max-h-[calc(100vh-32px)] overflow-y-auto">
                  <TaskDetailPanel 
                    task={selectedEvent.task}
                    onAttendanceUpdate={async () => {
                      const { firstDay, lastDay } = getMonthRange(currentDate);
                      await loadCalendarData(firstDay, lastDay);
                    }}
                    onTaskUpdate={async () => {
                      const { firstDay, lastDay } = getMonthRange(currentDate);
                      await loadCalendarData(firstDay, lastDay);
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

GanttTaskTimeline.displayName = 'GanttTaskTimeline';

// 自定义甘特图组件
interface CustomGanttChartProps {
  tasks: GanttTask[];
  onTaskClick: (task: any) => void;
}

const CustomGanttChart: React.FC<CustomGanttChartProps> = ({ tasks, onTaskClick }) => {
  // 使用 useMemo 优化计算
  const { start, end, totalDays, dateLabels } = React.useMemo(() => {
    if (tasks.length === 0) {
      const today = new Date();
      return {
        start: today,
        end: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), // 默认显示一周
        totalDays: 7,
        dateLabels: Array.from({ length: 7 }, (_, i) => {
          const date = new Date(today);
          date.setDate(date.getDate() + i);
          return date;
        })
      };
    }
    
    const dates = tasks.flatMap(task => [
      new Date(task.start_date),
      new Date(task.end_date)
    ]);
    
    const startDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const endDate = new Date(Math.max(...dates.map(d => d.getTime())));
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // 限制显示天数，避免性能问题
    const maxDays = 60;
    const displayDays = Math.min(days, maxDays);
    
    const labels = Array.from({ length: displayDays }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      return date;
    });
    
    return {
      start: startDate,
      end: endDate,
      totalDays: displayDays,
      dateLabels: labels
    };
  }, [tasks]);

  // 使用 useMemo 优化任务位置计算
  const taskPositions = React.useMemo(() => {
    const positions = new Map();
    
    tasks.filter(task => task.taskType === 'checkin').forEach(task => {
      const taskStart = new Date(task.start_date);
      const taskEnd = new Date(task.end_date);
      
      const startOffset = Math.max(0, (taskStart.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const duration = (taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24) + 1;
      
      positions.set(task.id, {
        left: `${(startOffset / totalDays) * 100}%`,
        width: `${(duration / totalDays) * 100}%`
      });
    });
    
    return positions;
  }, [tasks, start, totalDays]);

  return (
    <div className="h-full flex flex-col">
      {/* 时间轴头部 */}
      <div className="flex border-b bg-gray-50 sticky top-0 z-10">
        <div className="w-48 p-2 border-r font-medium text-sm bg-gray-50">任务</div>
        <div className="flex-1 flex overflow-x-auto">
          {dateLabels.map((date, index) => (
            <div key={index} className="flex-shrink-0 p-1 text-xs text-center border-r min-w-[40px]">
              <div className="font-medium">{date.getDate()}</div>
              <div className="text-gray-500">
                {date.toLocaleDateString('zh-CN', { weekday: 'short' })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 任务列表 */}
      <div className="flex-1 overflow-y-auto">
        {tasks.filter(task => task.taskType === 'checkin').map((task) => {
          const position = taskPositions.get(task.id);
          if (!position) return null;
          
          return (
            <div key={task.id} className="flex border-b h-16 relative hover:bg-gray-50">
              {/* 任务名称 */}
              <div className="w-48 p-2 border-r flex items-center">
                <div className="text-sm font-medium truncate" title={task.text}>
                  {task.text}
                </div>
              </div>
              
              {/* 甘特图区域 */}
              <div className="flex-1 relative">
                {/* 任务条形 */}
                <div
                  className="absolute top-3 h-10 rounded cursor-pointer flex items-center px-3 transition-all hover:opacity-90 hover:shadow-md"
                  style={{
                    left: position.left,
                    width: position.width,
                    backgroundColor: task.color || '#3b82f6',
                    minWidth: '60px' // 确保最小宽度
                  }}
                  onClick={() => onTaskClick(task)}
                >
                  <span className="text-xs font-medium text-white truncate flex-1">
                    {task.text}
                  </span>
                  <div className="ml-2 flex-shrink-0">
                    <TaskStatusBadge 
                      status={task.status as TaskStatus} 
                      size="small" 
                      className="text-xs"
                    />
                  </div>
                </div>
                
                {/* 进度条 */}
                <div
                  className="absolute bottom-2 h-1 rounded"
                  style={{
                    left: position.left,
                    width: position.width,
                    backgroundColor: 'rgba(0,0,0,0.1)',
                    minWidth: '60px'
                  }}
                >
                  <div
                    className="h-full rounded transition-all duration-300"
                    style={{
                      width: `${task.progress}%`,
                      backgroundColor: 'rgba(255,255,255,0.9)'
                    }}
                  />
                </div>
                
                {/* 任务信息提示 */}
                <div className="absolute top-1 right-2 text-xs text-gray-500">
                  {task.progress}%
                </div>
              </div>
            </div>
          );
        })}
        
        {/* 空状态 */}
        {tasks.filter(task => task.taskType === 'checkin').length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <div className="text-center">
              <div className="text-lg mb-2">📅</div>
              <div>暂无任务数据</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
