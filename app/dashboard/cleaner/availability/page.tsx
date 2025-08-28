"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/userStore';
import { 
  getCleanerAvailability, 
  setCleanerAvailability, 
  batchSetCleanerAvailability 
} from '@/lib/hotelManagement';
import { CleanerAvailability, AvailabilityData } from '@/types/hotel';

export default function CleanerAvailabilityPage() {
  const router = useRouter();
  const user = useUserStore(s => s.user);
  const [availability, setAvailability] = useState<CleanerAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartDate, setDragStartDate] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    loadAvailability();
  }, [user, router, currentMonth]);

  const loadAvailability = async () => {
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
    } catch (err) {
      setError('加载可用性数据失败');
      console.error('加载可用性数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const getLastDayOfMonth = (yearMonth: string): string => {
    const [year, month] = yearMonth.split('-');
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    return `${yearMonth}-${String(lastDay).padStart(2, '0')}`;
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

  const getAvailabilityForDate = (date: Date): CleanerAvailability | null => {
    const dateStr = date.toISOString().split('T')[0];
    return availability.find(a => a.date === dateStr) || null;
  };

  const isDateAvailable = (date: Date): boolean => {
    const dateStr = date.toISOString().split('T')[0];
    return availability.some(a => a.date === dateStr);
  };

  const handleDateClick = (date: Date, event: React.MouseEvent) => {
    event.preventDefault();
    const dateStr = date.toISOString().split('T')[0];
    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
    
    if (isPast) return;

    // 单击切换选择状态
    const newSelected = new Set(selectedDates);
    if (newSelected.has(dateStr)) {
      newSelected.delete(dateStr);
    } else {
      newSelected.add(dateStr);
    }
    setSelectedDates(newSelected);
  };

  const handleMouseDown = (date: Date, event: React.MouseEvent) => {
    event.preventDefault();
    const dateStr = date.toISOString().split('T')[0];
    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
    
    if (isPast) return;

    setIsDragging(true);
    setDragStartDate(dateStr);
    
    // 开始拖拽时不立即切换状态，等待拖拽结束
  };

  const handleMouseEnter = (date: Date) => {
    if (!isDragging || !dragStartDate) return;
    
    const dateStr = date.toISOString().split('T')[0];
    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
    
    if (isPast) return;

    // 拖拽过程中选择范围内的日期
    const startDate = new Date(dragStartDate);
    const endDate = date;
    const [from, to] = startDate <= endDate ? [startDate, endDate] : [endDate, startDate];
    
    const newSelected = new Set<string>();
    const current = new Date(from);
    
    // 拖拽时总是添加范围内的日期
    while (current <= to) {
      const currentStr = current.toISOString().split('T')[0];
      const currentDate = new Date(current);
      const isCurrentPast = currentDate < new Date(new Date().setHours(0, 0, 0, 0));
      
      if (!isCurrentPast) {
        newSelected.add(currentStr);
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    setSelectedDates(newSelected);
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
    const days = getDaysInMonth(currentMonth);
    const newSelected = new Set<string>();

    if (pattern !== 'clear') {
      days.forEach(day => {
        const dayOfWeek = day.getDay(); // 0 = Sunday, 6 = Saturday
        const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));
        
        if (isPast) return;
        
        let shouldSet = false;
        switch (pattern) {
          case 'weekdays':
            shouldSet = dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
            break;
          case 'weekends':
            shouldSet = dayOfWeek === 0 || dayOfWeek === 6; // Saturday and Sunday
            break;
          case 'all':
            shouldSet = true;
            break;
        }

        if (shouldSet) {
          newSelected.add(day.toISOString().split('T')[0]);
        }
      });
    }

    setSelectedDates(newSelected);
  };

  const handleSave = async () => {
    if (!user || saving) return;

    const availabilityList: AvailabilityData[] = Array.from(selectedDates).map(dateStr => ({
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
      await batchSetCleanerAvailability(user.id.toString(), availabilityList);
      await loadAvailability();
      setError(null);
    } catch (err) {
      setError('保存日程失败');
      console.error('保存日程失败:', err);
    } finally {
      setSaving(false);
    }
  };

  // 初始化选中状态
  useEffect(() => {
    const availableDates = new Set(availability.map(a => a.date));
    setSelectedDates(availableDates);
  }, [availability]);

  const changeMonth = (direction: 'prev' | 'next') => {
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

    setCurrentMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  if (!user || user.role !== 'cleaner') {
    return <div className="p-6">无权访问此页面</div>;
  }

  const days = getDaysInMonth(currentMonth);
  const monthNames = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ];
  const [year, month] = currentMonth.split('-');
  const monthName = monthNames[parseInt(month) - 1];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">日程注册</h1>
        <div className="flex gap-2">
          <button
            onClick={() => handleQuickSet('weekdays')}
            disabled={saving}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 disabled:opacity-50 transition-colors shadow-sm hover:shadow-md"
          >
            工作日
          </button>
          <button
            onClick={() => handleQuickSet('weekends')}
            disabled={saving}
            className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 disabled:opacity-50 transition-colors shadow-sm hover:shadow-md"
          >
            周末
          </button>
          <button
            onClick={() => handleQuickSet('all')}
            disabled={saving}
            className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200 disabled:opacity-50 transition-colors shadow-sm hover:shadow-md"
          >
            全月
          </button>
          <button
            onClick={() => handleQuickSet('clear')}
            disabled={saving}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50 transition-colors shadow-sm hover:shadow-md"
          >
            清空
          </button>
        </div>
      </div>

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
          ← 上个月
        </button>
                 <h2 className="text-xl font-semibold text-blue-600">
           {year}年{monthName}
         </h2>
        <button
          onClick={() => changeMonth('next')}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          下个月 →
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">加载中...</div>
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
               {['周日', '周一', '周二', '周三', '周四', '周五', '周六'].map((dayName) => (
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
                  
                  const dateStr = cellDate.toISOString().split('T')[0];
                  const isCurrentMonth = cellDate.getMonth() === parseInt(month) - 1;
                  const isToday = cellDate.getTime() === today.getTime();
                  const isPast = cellDate < today;
                  const isSelected = selectedDates.has(dateStr);
                  const isAvailable = isDateAvailable(cellDate);
                  
                  cells.push(
                    <div
                      key={dateStr}
                                             className={`
                         aspect-square p-1 border-r border-b border-gray-100 cursor-pointer transition-colors
                         ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''}
                         ${isPast ? 'opacity-30 cursor-not-allowed' : 'hover:bg-blue-50'}
                         ${isToday && !isSelected ? 'bg-yellow-100' : ''}
                         ${isSelected ? 'bg-blue-500 text-white shadow-md' : ''}
                         ${isDragging ? 'user-select-none' : ''}
                       `}
                      onMouseDown={(e) => handleMouseDown(cellDate, e)}
                      onMouseEnter={() => handleMouseEnter(cellDate)}
                      onClick={(e) => handleDateClick(cellDate, e)}
                    >
                                             <div className="h-full flex flex-col items-center justify-center relative">
                         <div className="text-sm font-medium">
                           {cellDate.getDate()}
                         </div>
                         {isAvailable && (
                           <div className="absolute bottom-1 w-2 h-2 bg-green-500 rounded-full shadow-sm"></div>
                         )}
                         {isSelected && (
                           <div className="absolute top-0.5 right-0.5 w-2 h-2 bg-white rounded-full opacity-80"></div>
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

      {/* 操作按钮 */}
      <div className="mt-8 flex justify-between items-center max-w-2xl mx-auto">
        <div className="text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg">
          已选择 <span className="font-semibold text-blue-600">{selectedDates.size}</span> 天
        </div>
        <div className="flex gap-3">
                     <button
             onClick={handleSave}
             disabled={saving}
             className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
           >
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                保存中...
              </div>
            ) : (
              '保存日程'
            )}
          </button>
        </div>
      </div>

      {/* 图例 */}
      <div className="mt-8 max-w-2xl mx-auto">
                 <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            使用说明
          </h3>
                     <div className="grid grid-cols-2 gap-3 text-xs">
             <div className="flex items-center gap-2">
               <div className="w-3 h-3 bg-blue-500 rounded shadow-sm"></div>
               <span>已选择日期</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded shadow-sm"></div>
               <span>今天</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-2 h-2 bg-green-500 rounded-full shadow-sm"></div>
               <span>已保存的可用日期</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-2 h-2 bg-red-500 rounded-full shadow-sm"></div>
               <span>已分配任务</span>
             </div>
          </div>
          <div className="mt-3 text-xs text-gray-600 space-y-1">
            <p className="flex items-center gap-2">
              <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
              单击日期选择/取消选择
            </p>
            <p className="flex items-center gap-2">
              <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
              按住鼠标拖拽可批量选择日期
            </p>
            <p className="flex items-center gap-2">
              <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
              使用快捷按钮可快速选择工作日、周末或全月
            </p>
          </div>
        </div>
      </div>

      {saving && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 shadow-2xl">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <div className="text-gray-700 font-medium">正在保存日程...</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
