"use client";
import { useState, useEffect } from 'react';
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

  const handleDateToggle = async (date: Date, timeSlot: 'morning' | 'afternoon' | 'evening') => {
    if (!user || saving) return;

    const dateStr = date.toISOString().split('T')[0];
    const existingAvailability = getAvailabilityForDate(date);
    
    const newAvailableHours = {
      ...(existingAvailability?.availableHours || {}),
      [timeSlot]: !(existingAvailability?.availableHours?.[timeSlot] || false)
    };

    // 如果所有时间段都未选中，则删除该日期的记录
    const hasAnyTimeSlot = Object.values(newAvailableHours).some(Boolean);
    
    try {
      setSaving(true);
      
      if (hasAnyTimeSlot) {
        await setCleanerAvailability(user.id.toString(), {
          date: dateStr,
          availableHours: newAvailableHours,
          notes: existingAvailability?.notes || ''
        });
      } else {
        // 删除该日期的可用性记录
        // 这里需要在API中添加删除功能，暂时跳过
        console.log('需要删除可用性记录:', dateStr);
      }
      
      await loadAvailability(); // 重新加载数据
    } catch (err) {
      setError('更新可用性失败');
      console.error('更新可用性失败:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickSet = async (pattern: 'weekdays' | 'weekends' | 'all') => {
    if (!user || saving) return;

    const days = getDaysInMonth(currentMonth);
    const availabilityList: AvailabilityData[] = [];

    days.forEach(day => {
      const dayOfWeek = day.getDay(); // 0 = Sunday, 6 = Saturday
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
        availabilityList.push({
          date: day.toISOString().split('T')[0],
          availableHours: {
            morning: true,
            afternoon: true,
            evening: true
          },
          notes: ''
        });
      }
    });

    try {
      setSaving(true);
      await batchSetCleanerAvailability(user.id.toString(), availabilityList);
      await loadAvailability();
    } catch (err) {
      setError('批量设置可用性失败');
      console.error('批量设置可用性失败:', err);
    } finally {
      setSaving(false);
    }
  };

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
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">我的可用性设置</h1>
        <div className="flex gap-2">
          <button
            onClick={() => handleQuickSet('weekdays')}
            disabled={saving}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 disabled:opacity-50"
          >
            工作日
          </button>
          <button
            onClick={() => handleQuickSet('weekends')}
            disabled={saving}
            className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 disabled:opacity-50"
          >
            周末
          </button>
          <button
            onClick={() => handleQuickSet('all')}
            disabled={saving}
            className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200 disabled:opacity-50"
          >
            全月
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* 月份导航 */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => changeMonth('prev')}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          ← 上个月
        </button>
        <h2 className="text-xl font-semibold text-gray-900">
          {year}年{monthName}
        </h2>
        <button
          onClick={() => changeMonth('next')}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          下个月 →
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">加载中...</div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* 表头 */}
          <div className="grid grid-cols-8 bg-gray-50 border-b border-gray-200">
            <div className="p-3 text-sm font-medium text-gray-700">日期</div>
            <div className="p-3 text-sm font-medium text-gray-700 text-center">周一</div>
            <div className="p-3 text-sm font-medium text-gray-700 text-center">周二</div>
            <div className="p-3 text-sm font-medium text-gray-700 text-center">周三</div>
            <div className="p-3 text-sm font-medium text-gray-700 text-center">周四</div>
            <div className="p-3 text-sm font-medium text-gray-700 text-center">周五</div>
            <div className="p-3 text-sm font-medium text-gray-700 text-center">周六</div>
            <div className="p-3 text-sm font-medium text-gray-700 text-center">周日</div>
          </div>

          {/* 时间段行 */}
          {[
            { key: 'morning', label: '上午 (9:00-12:00)', color: 'bg-yellow-100 text-yellow-800' },
            { key: 'afternoon', label: '下午 (13:00-17:00)', color: 'bg-blue-100 text-blue-800' },
            { key: 'evening', label: '晚上 (18:00-21:00)', color: 'bg-purple-100 text-purple-800' }
          ].map((timeSlot) => (
            <div key={timeSlot.key} className="grid grid-cols-8 border-b border-gray-200 last:border-b-0">
              <div className="p-3 text-sm font-medium text-gray-700 border-r border-gray-200">
                {timeSlot.label}
              </div>
              {[1, 2, 3, 4, 5, 6, 0].map((dayOfWeek) => {
                const day = days.find(d => d.getDay() === dayOfWeek);
                if (!day) return <div key={dayOfWeek} className="p-3 border-r border-gray-200 last:border-r-0" />;
                
                const availability = getAvailabilityForDate(day);
                const isAvailable = availability?.availableHours?.[timeSlot.key as keyof typeof availability.availableHours] || false;
                const isToday = day.toDateString() === new Date().toDateString();
                const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));

                return (
                  <div key={dayOfWeek} className="p-3 border-r border-gray-200 last:border-r-0">
                    <div className="text-xs text-gray-500 mb-1">
                      {day.getDate()}
                      {isToday && <span className="ml-1 text-red-500">●</span>}
                    </div>
                    <button
                      onClick={() => handleDateToggle(day, timeSlot.key as any)}
                      disabled={saving || isPast}
                      className={`w-full py-1 px-2 text-xs rounded transition-colors ${
                        isAvailable 
                          ? timeSlot.color 
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      } ${isPast ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
                    >
                      {isAvailable ? '✓' : '○'}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* 图例 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 mb-2">图例说明</h3>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
            <span>上午可用</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
            <span>下午可用</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded"></div>
            <span>晚上可用</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-500">●</span>
            <span>今天</span>
          </div>
        </div>
      </div>

      {saving && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6">
            <div className="text-center">
              <div className="text-gray-500 mb-2">保存中...</div>
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
