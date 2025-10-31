"use client";
import React, { useState, useEffect } from 'react';

export interface CalendarEntryFormData {
  hotelId: string;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  ownerNotes: string;
  cleaningDates: string[];
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
}

export const CalendarEntryForm: React.FC<CalendarEntryFormProps> = ({
  initialData = {},
  onSubmit,
  onCancel,
  loading = false,
  title = "入住登记",
  className = "",
  hotels = [],
  showHotelSelection = false
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
            onChange={(e) => {
              setFormData({ ...formData, checkInDate: e.target.value });
              setValidationError(null);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            退房日期 *
          </label>
          <input
            type="date"
            required
            value={formData.checkOutDate}
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
          />
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
