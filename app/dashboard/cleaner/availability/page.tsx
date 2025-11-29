"use client";
import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/userStore';
import { 
  getCleanerAvailability, 
  batchSetCleanerAvailability,
  getCleanerTasks
} from '@/lib/hotelManagement';
import { CleanerAvailability, AvailabilityData } from '@/types/hotel';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/hooks/useTranslation';

export default function CleanerAvailabilityPage() {
  const router = useRouter();
  const user = useUserStore(s => s.user);
  const { t, locale } = useTranslation('cleanerAvailability');
  const [availability, setAvailability] = useState<CleanerAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartDate, setDragStartDate] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [confirmedDates, setConfirmedDates] = useState<Set<string>>(new Set());
  const [assignedTaskDates, setAssignedTaskDates] = useState<Set<string>>(new Set());
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingDates, setEditingDates] = useState<Set<string>>(new Set());

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 当前月份
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    if (!user || user.role !== 'cleaner') {
      router.push('/dashboard');
      return;
    }
    loadMonthData();
  }, [user, router, currentMonth]);

  // 订阅可用性与任务变更，当前月视图刷新
  useEffect(() => {
    if (!user || user.role !== 'cleaner') return;
    const channel = supabase
      .channel(`realtime-cleaner-availability-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cleaner_availability' }, () => {
        loadMonthData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        loadMonthData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, currentMonth]);



  const loadMonthData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const startDate = `${currentMonth}-01`;
      const [year, month] = currentMonth.split('-');
      const lastDay = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
      const endDate = `${currentMonth}-${String(lastDay).padStart(2, '0')}`;

      const availabilityList = await getCleanerAvailability(
        user.id.toString(), 
        startDate, 
        endDate
      );
      setAvailability(availabilityList);

      let cleanerTaskAssignments: any[] = [];
      try {
        cleanerTaskAssignments = await getCleanerTasks(user.id.toString(), true);
      } catch (taskError) {
        console.error('加载清洁员任务失败:', taskError);
      }

      const taskDateSet = new Set<string>();
      cleanerTaskAssignments.forEach(assignment => {
        const task = assignment.tasks;
        if (!task) return;
        const rawDate = task.cleaning_date || task.check_out_date || task.check_in_date;
        if (!rawDate) return;
        if (rawDate >= startDate && rawDate <= endDate) {
          taskDateSet.add(rawDate);
        }
      });
      setAssignedTaskDates(taskDateSet);
      setError(null);
    } catch (err) {
      setError(t('loadFailed'));
      console.error('加载可用性数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (yearMonth: string): Date[] => {
    const [year, month] = yearMonth.split('-');
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    const days: Date[] = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(parseInt(year), parseInt(month) - 1, day));
    }
    
    return days;
  };

  const isDateAvailable = (date: Date): boolean => {
    const dateStr = formatDate(date);
    return confirmedDates.has(dateStr);
  };

  const pendingAdditions = useMemo(() => {
    if (!isEditMode) return [];
    return Array.from(editingDates).filter(date => !confirmedDates.has(date));
  }, [editingDates, confirmedDates, isEditMode]);

  const pendingRemovals = useMemo(() => {
    if (!isEditMode) return [];
    return Array.from(confirmedDates).filter(date => !editingDates.has(date));
  }, [editingDates, confirmedDates, isEditMode]);

  const hasChanges = pendingAdditions.length > 0 || pendingRemovals.length > 0;

  const handleDateClick = (date: Date, event: React.MouseEvent) => {
    event.preventDefault();
    if (!isEditMode) return;
    
    const dateStr = formatDate(date);
    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
    
    if (isPast) return;

    const newEditing = new Set(editingDates);
    if (newEditing.has(dateStr)) {
      newEditing.delete(dateStr);
    } else {
      newEditing.add(dateStr);
    }
    setEditingDates(newEditing);
  };

  const handleMouseDown = (date: Date, event: React.MouseEvent) => {
    event.preventDefault();
    if (!isEditMode) return;
    
    const dateStr = formatDate(date);
    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
    
    if (isPast) return;

    setIsDragging(true);
    setDragStartDate(dateStr);
  };

  const handleMouseEnter = (date: Date) => {
    if (!isDragging || !dragStartDate || !isEditMode) return;
    
    const dateStr = formatDate(date);
    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
    
    if (isPast) return;

    const startDate = new Date(dragStartDate);
    const endDate = date;
    const [from, to] = startDate <= endDate ? [startDate, endDate] : [endDate, startDate];
    
    const newEditing = new Set<string>(editingDates);
    const current = new Date(from);
    
    while (current <= to) {
      const currentStr = formatDate(current);
      const currentDate = new Date(current);
      const isCurrentPast = currentDate < new Date(new Date().setHours(0, 0, 0, 0));
      
      if (!isCurrentPast) {
        newEditing.add(currentStr);
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    setEditingDates(newEditing);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragStartDate(null);
    }
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setDragStartDate(null);
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging]);

  const handleQuickSet = (pattern: 'weekdays' | 'weekends' | 'all' | 'clear') => {
    if (!isEditMode) return;
    
    const days = getDaysInMonth(currentMonth);
    const newEditing = new Set<string>();

    if (pattern !== 'clear') {
      days.forEach(day => {
        const dayOfWeek = day.getDay();
        const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));
        
        if (isPast) return;
        
        let shouldSet = false;
        switch (pattern) {
          case 'weekdays':
            shouldSet = dayOfWeek >= 1 && dayOfWeek <= 5;
            break;
          case 'weekends':
            shouldSet = dayOfWeek === 0 || dayOfWeek === 6;
            break;
          case 'all':
            shouldSet = true;
            break;
        }

        if (shouldSet) {
          newEditing.add(formatDate(day));
        }
      });
    }

    setEditingDates(newEditing);
  };

  const handleEnterEditMode = () => {
    setIsEditMode(true);
    setEditingDates(new Set(confirmedDates));
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditingDates(new Set());
  };

  const handleSave = async () => {
    if (!user || saving || !isEditMode) return;

    if (!hasChanges) {
      setIsEditMode(false);
      return;
    }

    const availabilityList: AvailabilityData[] = pendingAdditions.map(dateStr => ({
      date: dateStr,
      availableHours: {
        morning: true,
        afternoon: true,
        evening: true
      },
      notes: ''
    }));

    try {
      setSaving(true);
      await batchSetCleanerAvailability(user.id.toString(), availabilityList, pendingRemovals);
      await loadMonthData();
      setIsEditMode(false);
      setEditingDates(new Set());
      setError(null);
    } catch (err) {
      setError(t('saveFailed'));
      console.error('保存日程失败:', err);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const confirmedSet = new Set(availability.map(a => a.date));
    setConfirmedDates(confirmedSet);
  }, [availability]);

  const changeMonth = (direction: 'prev' | 'next') => {
    if (isEditMode && hasChanges) {
      const confirmed = window.confirm(t('unsavedChanges'));
      if (!confirmed) return;
    }

    const [year, month] = currentMonth.split('-');
    let newYear = parseInt(year);
    let newMonth = parseInt(month);

    if (direction === 'prev') {
      if (newMonth === 1) {
        newMonth = 12;
        newYear--;
      } else {
        newMonth--;
      }
    } else {
      if (newMonth === 12) {
        newMonth = 1;
        newYear++;
      } else {
        newMonth++;
      }
    }

    setIsEditMode(false);
    setEditingDates(new Set());
    setSelectedDates(new Set());
    setConfirmedDates(new Set());
    setAssignedTaskDates(new Set());
    setCurrentMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  if (!user || user.role !== 'cleaner') {
    return <div className="p-6">{t('noAccess')}</div>;
  }

  const days = getDaysInMonth(currentMonth);
  // 根据语言获取月份名称数组
  const monthNames = locale === 'zh' 
    ? ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
    : locale === 'ja'
    ? ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const [year, month] = currentMonth.split('-');
  const monthName = monthNames[parseInt(month) - 1];
  
  // 根据语言获取星期数组
  const weekDays = locale === 'zh'
    ? ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    : locale === 'ja'
    ? ['日', '月', '火', '水', '木', '金', '土']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* 顶部导航栏 */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('scheduleManagement')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isEditMode ? t('editModeHint') : t('viewModeHint')}
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/cleaner')}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-lg transition-all duration-200 shadow-sm hover:shadow"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="text-sm font-medium">{t('backToHome')}</span>
        </button>
      </div>

      {isEditMode && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-blue-800">
              <span className="font-semibold">{t('quickSelect')}</span>
              <span className="ml-2 text-blue-600">{t('quickSelectHint')}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleQuickSet('weekdays')}
                disabled={saving}
                className="px-3 py-1.5 bg-white text-blue-700 border border-blue-300 rounded-md text-xs font-medium hover:bg-blue-50 disabled:opacity-50 transition-colors"
              >
                {t('weekdays')}
              </button>
              <button
                onClick={() => handleQuickSet('weekends')}
                disabled={saving}
                className="px-3 py-1.5 bg-white text-green-700 border border-green-300 rounded-md text-xs font-medium hover:bg-green-50 disabled:opacity-50 transition-colors"
              >
                {t('weekends')}
              </button>
              <button
                onClick={() => handleQuickSet('all')}
                disabled={saving}
                className="px-3 py-1.5 bg-white text-purple-700 border border-purple-300 rounded-md text-xs font-medium hover:bg-purple-50 disabled:opacity-50 transition-colors"
              >
                {t('allMonth')}
              </button>
              <button
                onClick={() => handleQuickSet('clear')}
                disabled={saving}
                className="px-3 py-1.5 bg-white text-gray-700 border border-gray-300 rounded-md text-xs font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {t('clear')}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* 月份导航 */}
      <div className="flex justify-between items-center mb-8 max-w-2xl mx-auto">
        <button
          onClick={() => changeMonth('prev')}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          ← {t('previousMonth')}
        </button>
                 <h2 className="text-xl font-semibold text-blue-600">
           {year}{locale === 'zh' ? '年' : locale === 'ja' ? '年' : ''}{monthName}
         </h2>
        <button
          onClick={() => changeMonth('next')}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          {t('nextMonth')} →
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">{t('loading')}</div>
        </div>
      ) : (
        <div className="flex justify-center">
          <div 
            className="bg-white border border-gray-200 rounded-xl overflow-hidden select-none shadow-lg max-w-2xl"
            ref={containerRef}
            onMouseUp={handleMouseUp}
          >
                         {/* 日历表头 */}
             <div className="grid grid-cols-7 bg-blue-50 border-b border-gray-200">
               {weekDays.map((dayName) => (
                 <div key={dayName} className="p-3 text-sm font-semibold text-gray-700 text-center">
                   {dayName}
                 </div>
               ))}
             </div>

            {/* 日历主体 */}
            <div className="grid grid-cols-7">
              {(() => {
                const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1);
                const lastDay = new Date(parseInt(year), parseInt(month), 0);
                const startDate = new Date(firstDay);
                startDate.setDate(startDate.getDate() - firstDay.getDay()); // 从周日开始
                
                const cells = [];
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                for (let i = 0; i < 42; i++) { // 6周 x 7天
                  const cellDate = new Date(startDate);
                  cellDate.setDate(startDate.getDate() + i);
                  
                  const dateStr = formatDate(cellDate);
                  const isCurrentMonth = cellDate.getMonth() === parseInt(month) - 1;
                  const isToday = cellDate.getTime() === today.getTime();
                  const isPast = cellDate < today;
                  const isConfirmed = confirmedDates.has(dateStr);
                  const isEditing = editingDates.has(dateStr);
                  const hasTask = assignedTaskDates.has(dateStr);
                  
                  let cellBg = 'bg-white';
                  let cellBorder = 'border-gray-100';
                  let cellHover = 'hover:bg-blue-50';
                  let textColor = '';
                  
                  if (!isCurrentMonth) {
                    cellBg = 'bg-gray-50';
                    textColor = 'text-gray-400';
                  } else if (isPast) {
                    cellBg = 'bg-gray-50';
                    textColor = 'text-gray-400 opacity-50';
                    cellHover = '';
                  } else if (isEditMode) {
                    if (isEditing) {
                      cellBg = 'bg-blue-500';
                      textColor = 'text-white';
                      cellHover = 'hover:bg-blue-600';
                    } else {
                      cellHover = isEditMode ? 'hover:bg-blue-50 hover:border-blue-200' : 'hover:bg-gray-50';
                    }
                  } else {
                    if (isToday) {
                      cellBg = 'bg-yellow-50';
                      cellBorder = 'border-yellow-200';
                    }
                    cellHover = '';
                  }

                  cells.push(
                    <div
                      key={dateStr}
                      className={`
                        aspect-square p-1 border-r border-b ${cellBorder} transition-all duration-200 relative
                        ${cellBg}
                        ${cellHover}
                        ${isEditMode && !isPast ? 'cursor-pointer' : 'cursor-default'}
                        ${isDragging ? 'user-select-none' : ''}
                      `}
                      onMouseDown={(e) => handleMouseDown(cellDate, e)}
                      onMouseEnter={() => handleMouseEnter(cellDate)}
                      onClick={(e) => handleDateClick(cellDate, e)}
                    >
                      <div className="h-full flex flex-col items-center justify-center relative">
                        <div className={`text-sm font-medium ${textColor}`}>
                          {cellDate.getDate()}
                        </div>
                        
                        {!isEditMode && (isConfirmed || hasTask) && (
                          <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full shadow-sm ${
                            hasTask ? 'bg-red-500' : 'bg-green-500'
                          }`}></div>
                        )}
                        
                        {isEditMode && isEditing && (
                          <div className="absolute top-1 right-1">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                
                return cells;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* 日历下方操作按钮 */}
      <div className="mt-8 flex justify-center max-w-2xl mx-auto">
        {!isEditMode ? (
          <button
            onClick={handleEnterEditMode}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg text-base font-medium hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {t('addOrEditSchedule')}
          </button>
        ) : (
          <div className="flex gap-4">
            <button
              onClick={handleCancelEdit}
              disabled={saving}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg text-base font-medium hover:bg-gray-200 disabled:opacity-50 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={`px-8 py-3 rounded-lg text-base font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 ${
                saving || !hasChanges
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {t('saving')}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('save')}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* 状态统计 */}
      {isEditMode && (
        <div className="mt-6 max-w-2xl mx-auto">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span className="text-gray-700">{t('selected')}</span>
                  <span className="font-bold text-blue-600 text-lg">{editingDates.size}</span>
                  <span className="text-gray-500">{t('days')}</span>
                </div>
                {hasChanges && (
                  <>
                    <div className="h-4 w-px bg-gray-300"></div>
                    <div className="flex items-center gap-4">
                      {pendingAdditions.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          <span className="text-green-700 font-medium">+{pendingAdditions.length}</span>
                        </div>
                      )}
                      {pendingRemovals.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                          <span className="text-red-700 font-medium">-{pendingRemovals.length}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              {!hasChanges && (
                <span className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full">{t('noChanges')}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {!isEditMode && (
        <div className="mt-6 max-w-2xl mx-auto">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-green-500 rounded-full">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{t('confirmedAvailableSchedule')}</div>
                  <div className="text-xs text-gray-600 mt-0.5">{t('totalDaysAvailable').replace('{count}', confirmedDates.size.toString())}</div>
                </div>
              </div>
              {assignedTaskDates.size > 0 && (
                <div className="text-xs text-gray-600 bg-white px-3 py-1.5 rounded-full border border-gray-200">
                  <span className="text-red-600 font-semibold">{assignedTaskDates.size}</span> {t('daysWithTasks')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 图例说明 */}
      <div className="mt-6 max-w-2xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {isEditMode ? t('editModeDescription') : t('legendDescription')}
            </h3>
          </div>
          
          {isEditMode ? (
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded mt-0.5 flex-shrink-0"></div>
                <p><span className="font-medium text-gray-800">{t('blueBackground')}</span>{t('selectedDate')}</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 bg-white border border-gray-300 rounded mt-0.5 flex-shrink-0"></div>
                <p><span className="font-medium text-gray-800">{t('whiteBackground')}</span>{t('unselectedDate')}</p>
              </div>
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
                <p><span className="font-medium text-gray-800">{t('dragSelect')}</span>{t('dragSelectHint')}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-sm"></div>
                <span className="text-gray-700">{t('confirmedAvailable')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-sm"></div>
                <span className="text-gray-700">{t('hasTask')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-50 border border-yellow-200 rounded"></div>
                <span className="text-gray-700">{t('today')}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {saving && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 shadow-2xl">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <div className="text-gray-700 font-medium">{t('savingSchedule')}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
