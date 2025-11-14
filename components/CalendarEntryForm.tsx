"use client";
import React, { useState, useEffect, useMemo } from 'react';

export interface CalendarEntryFormData {
  hotelId: string;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  ownerNotes: string;
  cleaningDates: string[];
  roomNumber?: string;
}

export interface ExistingCalendarEntry {
  id: string;
  checkInDate: string;
  checkOutDate: string;
  roomNumber?: string;
}

interface CalendarEntryFormProps {
  initialData?: Partial<CalendarEntryFormData>;
  onSubmit: (data: CalendarEntryFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  title?: string;
  className?: string;
  hotels?: Array<{id: string; name: string; address: string}>;
  showHotelSelection?: boolean;
  existingEntries?: ExistingCalendarEntry[];
  currentEntryId?: string;
}

export const CalendarEntryForm: React.FC<CalendarEntryFormProps> = ({
  initialData = {},
  onSubmit,
  onCancel,
  loading = false,
  title = "入住登记",
  className = "",
  hotels = [],
  showHotelSelection = false,
  existingEntries = [],
  currentEntryId
}) => {
  const buildInitialCleaningDates = (data: Partial<CalendarEntryFormData>) => {
    if (data.cleaningDates && data.cleaningDates.length > 0) {
      return data.cleaningDates.slice(0, 1);
    }
    if (data.checkOutDate) {
      return [data.checkOutDate];
    }
    return [];
  };

  const [formData, setFormData] = useState<CalendarEntryFormData>({
    hotelId: '',
    checkInDate: '',
    checkOutDate: '',
    guestCount: 1,
    ownerNotes: '',
    cleaningDates: buildInitialCleaningDates(initialData),
    ...initialData
  });

  const [cleaningDateTouched, setCleaningDateTouched] = useState<boolean>(
    !!(initialData.cleaningDates && initialData.cleaningDates.length > 0 &&
      initialData.checkOutDate && initialData.cleaningDates[0] !== initialData.checkOutDate)
  );

  const [validationError, setValidationError] = useState<string | null>(null);
  const [dateConflictMessage, setDateConflictMessage] = useState<string>('');

  /**
   * 计算已占用日期集合（Airbnb 逻辑）
   * 已占用区间：[check_in_date, check_out_date)（左闭右开）
   * 退房日可作为新入住日
   */
  const getOccupiedDates = useMemo(() => {
    const occupied = new Set<string>();
    
    existingEntries.forEach(entry => {
      // 跳过当前正在编辑的登记
      if (currentEntryId && entry.id === currentEntryId) {
        return;
      }
      
      const checkIn = new Date(entry.checkInDate);
      const checkOut = new Date(entry.checkOutDate);
      
      // 遍历 [checkInDate, checkOutDate) 区间（不包含退房日）
      const current = new Date(checkIn);
      while (current < checkOut) {
        occupied.add(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    });
    
    return occupied;
  }, [existingEntries, currentEntryId]);

  /**
   * 检查日期是否被占用
   */
  const isDateOccupied = (dateStr: string): boolean => {
    return getOccupiedDates.has(dateStr);
  };

  /**
   * 获取可选的最小入住日期（今天）
   */
  const getMinCheckInDate = (): string => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  /**
   * 获取可选的最小退房日期（基于入住日期）
   */
  const getMinCheckOutDate = (checkInDate: string): string => {
    if (!checkInDate) return '';
    const minDate = new Date(checkInDate);
    minDate.setDate(minDate.getDate() + 1);
    return minDate.toISOString().split('T')[0];
  };

  /**
   * 获取可选的最大退房日期（基于入住日期后的第一个占用日）
   */
  const getMaxCheckOutDate = (checkInDate: string): string | undefined => {
    if (!checkInDate) return undefined;
    
    const current = new Date(checkInDate);
    current.setDate(current.getDate() + 1); // 从入住日的下一天开始检查
    
    // 找到第一个被占用的日期
    while (true) {
      const dateStr = current.toISOString().split('T')[0];
      if (isDateOccupied(dateStr)) {
        // 返回该占用日（可以作为退房日）
        return dateStr;
      }
      current.setDate(current.getDate() + 1);
      // 设置一个合理的上限（如1年后）
      if (current.getTime() > Date.now() + 365 * 24 * 60 * 60 * 1000) {
        return undefined;
      }
    }
  };

  // 当初始数据变化时更新表单数据
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      ...initialData,
      cleaningDates: buildInitialCleaningDates(initialData)
    }));
    setCleaningDateTouched(!!(initialData.cleaningDates && initialData.cleaningDates.length > 0 &&
      initialData.checkOutDate && initialData.cleaningDates[0] !== initialData.checkOutDate));
  }, [initialData]);

  // 验证表单数据
  const validateFormData = () => {
    if (showHotelSelection && !formData.hotelId) {
      setValidationError('请选择酒店');
      return false;
    }

    if (!formData.checkInDate || !formData.checkOutDate) {
      setValidationError('请选择入住和退房日期');
      return false;
    }

    if (new Date(formData.checkInDate) >= new Date(formData.checkOutDate)) {
      setValidationError('退房日期必须晚于入住日期');
      return false;
    }

    // 检查入住日期是否被占用
    if (isDateOccupied(formData.checkInDate)) {
      setValidationError('所选入住日期已被占用，请选择其他日期');
      return false;
    }

    // 检查入住到退房期间是否有占用日期（不包括退房日本身）
    const checkIn = new Date(formData.checkInDate);
    const checkOut = new Date(formData.checkOutDate);
    const current = new Date(checkIn);
    current.setDate(current.getDate() + 1); // 从入住日的下一天开始检查
    
    while (current < checkOut) {
      const dateStr = current.toISOString().split('T')[0];
      if (isDateOccupied(dateStr)) {
        setValidationError(`入住期间存在已被占用的日期（${dateStr}），请调整日期范围`);
        return false;
      }
      current.setDate(current.getDate() + 1);
    }

    const cleaningDate = formData.cleaningDates[0] || formData.checkOutDate;

    if (!cleaningDate) {
      setValidationError('请选择清扫日期');
      return false;
    }

    if (cleaningDate < formData.checkInDate || cleaningDate > formData.checkOutDate) {
      setValidationError('清扫日期必须在入住与退房日期之间');
      return false;
    }

    setValidationError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateFormData()) {
      return;
    }

    try {
      const submissionData: CalendarEntryFormData = {
        ...formData,
        cleaningDates: formData.cleaningDates.length > 0
          ? formData.cleaningDates.slice(0, 1)
          : formData.checkOutDate ? [formData.checkOutDate] : []
      };

      await onSubmit(submissionData);
    } catch (error) {
      console.error('提交表单失败:', error);
    }
  };

  return (
    <div className={`bg-white rounded-lg p-6 ${className}`}>
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      
      {validationError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {validationError}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        {showHotelSelection && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择酒店 *
            </label>
            <select
              required={showHotelSelection}
              value={formData.hotelId}
              onChange={(e) => {
                setFormData({ ...formData, hotelId: e.target.value });
                setValidationError(null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">请选择酒店</option>
              {hotels.map(hotel => (
                <option key={hotel.id} value={hotel.id}>
                  {hotel.name} - {hotel.address}
                </option>
              ))}
            </select>
            {hotels.length === 0 && (
              <p className="text-sm text-red-500 mt-1">
                您暂无管理的酒店，请联系管理员
              </p>
            )}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            入住日期 *
          </label>
          <input
            type="date"
            required
            value={formData.checkInDate}
            min={getMinCheckInDate()}
            onChange={(e) => {
              const selectedDate = e.target.value;
              setFormData({ ...formData, checkInDate: selectedDate, checkOutDate: '' });
              setValidationError(null);
              
              // 实时检查日期冲突
              if (selectedDate && isDateOccupied(selectedDate)) {
                setDateConflictMessage('⚠️ 该日期已有客人入住');
              } else {
                setDateConflictMessage('');
              }
            }}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              formData.checkInDate && isDateOccupied(formData.checkInDate)
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300'
            }`}
          />
          {dateConflictMessage && (
            <p className="text-xs text-red-600 mt-1">{dateConflictMessage}</p>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            退房日期 *
          </label>
          <input
            type="date"
            required
            value={formData.checkOutDate}
            min={formData.checkInDate ? getMinCheckOutDate(formData.checkInDate) : undefined}
            max={formData.checkInDate ? getMaxCheckOutDate(formData.checkInDate) : undefined}
            onChange={(e) => {
              const newValue = e.target.value;
              setFormData(prev => {
                const shouldAutoUpdateCleaningDate = !cleaningDateTouched || prev.cleaningDates.length === 0;
                return {
                  ...prev,
                  checkOutDate: newValue,
                  cleaningDates: shouldAutoUpdateCleaningDate && newValue
                    ? [newValue]
                    : prev.cleaningDates
                };
              });
              setValidationError(null);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!formData.checkInDate}
          />
          {!formData.checkInDate && (
            <p className="text-xs text-gray-500 mt-1">请先选择入住日期</p>
          )}
          {formData.checkInDate && getMaxCheckOutDate(formData.checkInDate) && (
            <p className="text-xs text-amber-600 mt-1">
              ⚠️ 受已有入住影响，最晚可选退房日期为 {getMaxCheckOutDate(formData.checkInDate)}
            </p>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            入住人数 *
          </label>
          <input
            type="number"
            required
            min="1"
            value={formData.guestCount}
            onChange={(e) => setFormData({ ...formData, guestCount: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            清扫日期
          </label>
          <input
            type="date"
            value={formData.cleaningDates[0] || ''}
            onChange={(e) => {
              const value = e.target.value;
              setCleaningDateTouched(true);
              setFormData(prev => ({
                ...prev,
                cleaningDates: value ? [value] : []
              }));
              setValidationError(null);
            }}
            min={formData.checkInDate || undefined}
            max={formData.checkOutDate || undefined}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            默认使用退房日期作为清扫日期，必要时可手动调整
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            房东备注（可选）
          </label>
          <textarea
            value={formData.ownerNotes}
            onChange={(e) => setFormData({ ...formData, ownerNotes: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="输入房东备注"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </div>
  );
};
