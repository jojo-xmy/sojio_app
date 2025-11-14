"use client";
import React, { useState, useRef, useEffect } from 'react';
import { format, addDays, isAfter, isBefore, isSameDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface MultiDateSelectorProps {
  selectedDates: string[];
  onDatesChange: (dates: string[]) => void;
  minDate?: string;
  maxDate?: string;
  placeholder?: string;
  className?: string;
}

export const MultiDateSelector: React.FC<MultiDateSelectorProps> = ({
  selectedDates,
  onDatesChange,
  minDate,
  maxDate,
  placeholder = "选择清扫日期",
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 生成日历网格
  const generateCalendarGrid = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // 从周日开始

    const grid = [];
    for (let week = 0; week < 6; week++) {
      const weekData = [];
      for (let day = 0; day < 7; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + week * 7 + day);
        weekData.push(currentDate);
      }
      grid.push(weekData);
    }
    return grid;
  };

  // 处理日期选择
  const handleDateClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // 检查日期是否在允许范围内
    if (minDate && isBefore(date, new Date(minDate))) return;
    if (maxDate && isAfter(date, new Date(maxDate))) return;

    const newDates = selectedDates.includes(dateStr)
      ? selectedDates.filter(d => d !== dateStr)
      : [...selectedDates, dateStr].sort();

    onDatesChange(newDates);
  };

  // 移除日期
  const removeDate = (dateToRemove: string) => {
    onDatesChange(selectedDates.filter(date => date !== dateToRemove));
  };

  // 导航到上个月
  const goToPreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  // 导航到下个月
  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const calendarGrid = generateCalendarGrid(currentMonth);
  const monthName = format(currentMonth, 'yyyy年MM月', { locale: zhCN });

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* 输入框 */}
      <div
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer bg-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedDates.length === 0 ? (
          <span className="text-gray-500">{placeholder}</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {selectedDates.map(date => (
              <span
                key={date}
                className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md"
              >
                {format(new Date(date), 'MM/dd')}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeDate(date);
                  }}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 下拉日历 */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 w-80">
          {/* 日历头部 */}
          <div className="flex justify-between items-center p-3 border-b">
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="p-1 hover:bg-gray-100 rounded"
            >
              ←
            </button>
            <span className="font-medium">{monthName}</span>
            <button
              type="button"
              onClick={goToNextMonth}
              className="p-1 hover:bg-gray-100 rounded"
            >
              →
            </button>
          </div>

          {/* 星期标题 */}
          <div className="grid grid-cols-7 gap-1 p-2">
            {['日', '一', '二', '三', '四', '五', '六'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-600 p-1">
                {day}
              </div>
            ))}
          </div>

          {/* 日期网格 */}
          <div className="p-2">
            {calendarGrid.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-1">
                {week.map((date, dayIndex) => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                  const isSelected = selectedDates.includes(dateStr);
                  const isToday = isSameDay(date, new Date());
                  const isDisabled = Boolean((minDate && isBefore(date, new Date(minDate))) || 
                                   (maxDate && isAfter(date, new Date(maxDate))));

                  return (
                    <button
                      key={dayIndex}
                      type="button"
                      onClick={() => handleDateClick(date)}
                      disabled={isDisabled}
                      className={`
                        w-8 h-8 text-sm rounded transition-colors
                        ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                        ${isSelected ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}
                        ${isToday ? 'ring-2 ring-blue-300' : ''}
                        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* 底部操作 */}
          <div className="p-3 border-t flex justify-between">
            <button
              type="button"
              onClick={() => onDatesChange([])}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              清空
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
            >
              确定
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
