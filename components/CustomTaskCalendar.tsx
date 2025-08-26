"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useUserStore } from '@/store/userStore';
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
  const [availableCleaners, setAvailableCleaners] = useState<AvailableCleaner[]>([]);
  const [selectedCleanerIds, setSelectedCleanerIds] = useState<string[]>([]);
  const [assignNotes, setAssignNotes] = useState('');
  const [assigning, setAssigning] = useState(false);

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

  // 处理任务点击（右侧面板展示并加载可用清洁员）
  const handleTaskClick = useCallback(async (event: TaskCalendarEvent) => {
    console.log('任务被点击:', event);
    setSelectedEvent(event);
    
    console.log('加载可用清洁员...');
    try {
      const dateStr = (event.task as any).check_in_date || event.task.checkInDate;
      console.log('查询日期:', dateStr);
      const cleaners = await getAvailableCleanersForDate(dateStr);
      console.log('CustomTaskCalendar - 获取到的可用清洁员:', cleaners);
      setAvailableCleaners(cleaners);
      setSelectedCleanerIds([]);
    } catch (error) {
      console.error('获取可用清洁员失败:', error);
      alert('获取可用清洁员失败');
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
          const dateStr = (selectedEvent.task as any).check_in_date || selectedEvent.task.checkInDate;
          const cleaners = await getAvailableCleanersForDate(dateStr);
          setAvailableCleaners(cleaners);
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

        {/* 右侧任务面板（布局内） */}
        <div className="w-[360px] shrink-0 border-l pl-4">
          {!selectedEvent ? (
            <div className="text-gray-500 h-full flex items-center">选择一个任务以查看详情并进行分配</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-semibold">{(selectedEvent.task as any).hotel_name || (selectedEvent.task as any).hotelName}</div>
                  <div className="text-sm text-gray-600">房间：{(selectedEvent.task as any).room_number || (selectedEvent.task as any).roomNumber || '未指定'}</div>
                </div>
                <button
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => { setSelectedEvent(null); setAvailableCleaners([]); setSelectedCleanerIds([]); setAssignNotes(''); }}
                >
                  ×
                </button>
              </div>

              <div className="bg-gray-50 rounded p-3 text-sm space-y-1">
                <div>日期：{(selectedEvent.task as any).checkInDate || (selectedEvent.task as any).check_in_date}</div>
                <div>时间：{(selectedEvent.task as any).check_in_time || (selectedEvent.task as any).checkInTime || '未指定'}</div>
                <div className="flex items-center gap-2">状态：<TaskStatusBadge status={selectedEvent.task.status} size="small" /></div>
                {selectedEvent.assignedCleaners && selectedEvent.assignedCleaners.length > 0 && (
                  <div>已分配：{selectedEvent.assignedCleaners.map(c => c.name).join(', ')}</div>
                )}
              </div>

              <div>
                <div className="font-medium mb-2">可用清洁员（{availableCleaners.length}）</div>
                {availableCleaners.length === 0 ? (
                  <div className="text-gray-500 text-sm">该日期没有可用清洁员</div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {availableCleaners.map(c => (
                      <label key={c.id} className={`flex items-center justify-between p-2 border rounded cursor-pointer ${selectedCleanerIds.includes(c.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedCleanerIds.includes(c.id)}
                            onChange={() => setSelectedCleanerIds(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id])}
                            className="w-4 h-4 text-blue-600"
                          />
                          <div>
                            <div className="font-medium text-sm">{c.name}</div>
                            <div className="text-xs text-gray-500">当前任务 {c.currentTaskCount}/{c.maxTaskCapacity}</div>
                          </div>
                        </div>
                        <div className={`text-xs ${c.currentTaskCount < c.maxTaskCapacity ? 'text-green-600' : 'text-red-600'}`}>
                          {c.currentTaskCount < c.maxTaskCapacity ? '可用' : '已满'}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="text-sm text-gray-700 mb-1">备注（可选）</div>
                <textarea
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded resize-none text-sm"
                  rows={3}
                  placeholder="添加分配备注..."
                />
              </div>

              <div className="flex justify-end">
                <button
                  disabled={assigning || selectedCleanerIds.length === 0}
                  onClick={() => handleTaskAssignment(selectedCleanerIds, assignNotes)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {assigning ? '分配中...' : '确认分配'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 右侧固定任务侧栏 */}
      {selectedEvent && (
        <div className="fixed inset-y-0 right-0 w-[360px] bg-white border-l shadow-xl p-4 z-[9999] pointer-events-auto overflow-y-auto">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-lg font-semibold">{(selectedEvent.task as any).hotel_name || (selectedEvent.task as any).hotelName}</div>
              <div className="text-sm text-gray-600">房间：{(selectedEvent.task as any).room_number || (selectedEvent.task as any).roomNumber || '未指定'}</div>
            </div>
            <button
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              onClick={() => { setSelectedEvent(null); setAvailableCleaners([]); setSelectedCleanerIds([]); setAssignNotes(''); }}
              aria-label="close"
            >
              ×
            </button>
          </div>

          <div className="bg-gray-50 rounded p-3 text-sm space-y-1 mb-4">
            <div>日期：{(selectedEvent.task as any).checkInDate || (selectedEvent.task as any).check_in_date}</div>
            <div>时间：{(selectedEvent.task as any).check_in_time || (selectedEvent.task as any).checkInTime || '未指定'}</div>
            <div className="flex items-center gap-2">状态：<TaskStatusBadge status={selectedEvent.task.status} size="small" /></div>
            {selectedEvent.assignedCleaners && selectedEvent.assignedCleaners.length > 0 && (
              <div>已分配：{selectedEvent.assignedCleaners.map(c => c.name).join(', ')}</div>
            )}
          </div>

          <div className="mb-4">
            <div className="font-medium mb-2">可用清洁员（{availableCleaners.length}）</div>
            {availableCleaners.length === 0 ? (
              <div className="text-gray-500 text-sm">该日期没有可用清洁员</div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {availableCleaners.map(c => (
                  <label key={c.id} className={`flex items-center justify-between p-2 border rounded cursor-pointer ${selectedCleanerIds.includes(c.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedCleanerIds.includes(c.id)}
                        onChange={() => setSelectedCleanerIds(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id])}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div>
                        <div className="font-medium text-sm">{c.name}</div>
                        <div className="text-xs text-gray-500">当前任务 {c.currentTaskCount}/{c.maxTaskCapacity}</div>
                      </div>
                    </div>
                    <div className={`text-xs ${c.currentTaskCount < c.maxTaskCapacity ? 'text-green-600' : 'text-red-600'}`}>
                      {c.currentTaskCount < c.maxTaskCapacity ? '可用' : '已满'}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="mb-4">
            <div className="text-sm text-gray-700 mb-1">备注（可选）</div>
            <textarea
              value={assignNotes}
              onChange={(e) => setAssignNotes(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded resize-none text-sm"
              rows={3}
              placeholder="添加分配备注..."
            />
          </div>

          <div className="flex justify-end">
            <button
              disabled={assigning || selectedCleanerIds.length === 0}
              onClick={() => handleTaskAssignment(selectedCleanerIds, assignNotes)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {assigning ? '分配中...' : '确认分配'}
            </button>
          </div>
        </div>
      )}
      {(() => { console.log('CustomTaskCalendar - 渲染状态(侧栏):', { selectedEvent, availableCleaners, selectedCleanerIds }); return null; })()}
    </div>
  );
}
