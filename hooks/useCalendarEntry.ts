/**
 * useCalendarEntry Hook
 * 
 * 统一入住登记的数据操作逻辑
 * 这是 Owner 界面创建和编辑入住登记的标准 Hook
 */

import { useState, useCallback } from 'react';
import { createCalendarEntry, updateCalendarEntry, deleteCalendarEntry } from '@/lib/services/calendarEntryService';
import { CalendarEntry, CreateCalendarEntryData } from '@/types/hotel';

interface UseCalendarEntryReturn {
  loading: boolean;
  error: string | null;
  createEntry: (data: CreateCalendarEntryData, userId: string) => Promise<CalendarEntry | null>;
  updateEntry: (entryId: string, data: Partial<CreateCalendarEntryData>) => Promise<CalendarEntry | null>;
  deleteEntry: (entryId: string) => Promise<boolean>;
  clearError: () => void;
}

export function useCalendarEntry(): UseCalendarEntryReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createEntry = useCallback(async (
    data: CreateCalendarEntryData,
    userId: string
  ): Promise<CalendarEntry | null> => {
    try {
      setLoading(true);
      setError(null);
      const entry = await createCalendarEntry(data, userId);
      console.log('入住登记创建成功:', entry);
      return entry;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '创建入住登记失败';
      setError(errorMessage);
      console.error('创建入住登记失败:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateEntry = useCallback(async (
    entryId: string,
    data: Partial<CreateCalendarEntryData>
  ): Promise<CalendarEntry | null> => {
    try {
      setLoading(true);
      setError(null);
      const entry = await updateCalendarEntry(entryId, data);
      console.log('入住登记更新成功:', entry);
      return entry;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新入住登记失败';
      setError(errorMessage);
      console.error('更新入住登记失败:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteEntry = useCallback(async (entryId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await deleteCalendarEntry(entryId);
      console.log('入住登记删除成功');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除入住登记失败';
      setError(errorMessage);
      console.error('删除入住登记失败:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    createEntry,
    updateEntry,
    deleteEntry,
    clearError
  };
}

