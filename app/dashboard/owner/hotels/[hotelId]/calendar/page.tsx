"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUserStore } from '@/store/userStore';
import { useTranslation } from '@/hooks/useTranslation';
import { 
  getHotelById, 
  getHotelCalendarEntries, 
} from '@/lib/hotelManagement';
import { 
  createCalendarEntry,
  updateCalendarEntry,
  deleteCalendarEntry,
  getHotelCalendarEntries as getHotelCalendarEntriesService
} from '@/lib/services/calendarEntryService';
import { CalendarEntryForm, CalendarEntryFormData } from '@/components/CalendarEntryForm';
import { Hotel, CalendarEntry, CreateCalendarEntryData } from '@/types/hotel';
import { supabase } from '@/lib/supabase';
// 临时移除复杂的日历组件引用

export default function HotelCalendarPage() {
  const params = useParams();
  const router = useRouter();
  const user = useUserStore(s => s.user);
  const { t, locale } = useTranslation('hotelCalendar');
  const hotelId = params.hotelId as string;

  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [calendarEntries, setCalendarEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CalendarEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<CalendarEntry | null>(null);

  // 表单状态
  const [formData, setFormData] = useState<CalendarEntryFormData>({
    hotelId: '',
    checkInDate: '',
    checkOutDate: '',
    guestCount: 1,
    ownerNotes: '',
    cleaningDates: []
  });

  useEffect(() => {
    if (!user || user.role !== 'owner') {
      router.push('/dashboard');
      return;
    }
    loadHotelData();
  }, [user, router, hotelId]);

  // 订阅酒店相关的条目与任务变更
  useEffect(() => {
    if (!user || user.role !== 'owner') return;
    const channel = supabase
      .channel('realtime-owner-hotel-calendar')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_entries' }, () => {
        loadHotelData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        loadHotelData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, hotelId]);

  const loadHotelData = async () => {
    try {
      setLoading(true);
      const hotelData = await getHotelById(hotelId);
      
      if (!hotelData) {
        setError(t('hotelNotFound'));
        return;
      }
      
      setHotel(hotelData);
      
      // 使用新的服务层API获取入住登记
      const entries = await getHotelCalendarEntriesService(hotelId);
      setCalendarEntries(entries);
    } catch (err) {
      setError(t('loadFailed'));
      console.error('加载酒店数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEntry = async (formData: CalendarEntryFormData) => {
    if (!user) return;

    try {
      setCreating(true);
      const entryData: CreateCalendarEntryData = {
        hotelId: hotelId,
        checkInDate: formData.checkInDate,
        checkOutDate: formData.checkOutDate,
        guestCount: formData.guestCount,
        ownerNotes: formData.ownerNotes,
        cleaningDates: formData.cleaningDates
      };

      // 使用新的服务层API创建入住登记（触发器会自动创建清扫任务）
      const entry = await createCalendarEntry(entryData, user.id.toString());
      setShowCreateForm(false);
      await loadHotelData(); // 重新加载数据
    } catch (err) {
      setError(t('createFailed'));
      console.error('创建日历条目失败:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateEntry = async (formData: CalendarEntryFormData) => {
    if (!editingEntry) return;

    try {
      setCreating(true);
      const updateData: Partial<CreateCalendarEntryData> = {
        checkInDate: formData.checkInDate,
        checkOutDate: formData.checkOutDate,
        guestCount: formData.guestCount,
        ownerNotes: formData.ownerNotes,
        cleaningDates: formData.cleaningDates
      };

      await updateCalendarEntry(editingEntry.id, updateData);
      setEditingEntry(null);
      await loadHotelData(); // 重新加载数据
    } catch (err) {
      setError(t('updateFailed'));
      console.error('更新日历条目失败:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm(t('deleteConfirm'))) return;

    try {
      await deleteCalendarEntry(entryId);
      await loadHotelData(); // 重新加载数据
    } catch (err) {
      setError(t('deleteFailed'));
      console.error('删除日历条目失败:', err);
    }
  };

  const handleEditEntry = (entry: CalendarEntry) => {
    setEditingEntry(entry);
    setFormData({
      hotelId: entry.hotelId,
      checkInDate: entry.checkInDate,
      checkOutDate: entry.checkOutDate,
      guestCount: entry.guestCount,
      ownerNotes: entry.ownerNotes || '',
      cleaningDates: entry.cleaningDates || []
    });
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setFormData({
      hotelId: '',
      checkInDate: '',
      checkOutDate: '',
      guestCount: 1,
      ownerNotes: '',
      cleaningDates: []
    });
  };

  const handleDateSelect = (date: string) => {
    if (!showCreateForm && !editingEntry) {
      // 如果不在编辑模式，点击日期可以快速创建新记录
      setFormData({
        hotelId: hotelId || '',
        checkInDate: date,
        checkOutDate: date,
        guestCount: 1,
        ownerNotes: '',
        cleaningDates: []
      });
      setShowCreateForm(true);
    }
  };

  const handleEntryClick = (entry: CalendarEntry) => {
    setSelectedEntry(entry);
  };

  if (!user || user.role !== 'owner') {
    return <div className="p-6">{t('noAccess')}</div>;
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">{t('loading')}</div>
        </div>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">{t('hotelNotFound')}</div>
      </div>
    );
  }

  // 根据当前语言格式化日期
  const localeMap: Record<string, string> = { zh: 'zh-CN', en: 'en-US', ja: 'ja-JP' };
  const dateLocale = localeMap[locale] || 'zh-CN';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{hotel.name} - {t('title')}</h1>
          <p className="text-gray-600 mt-1">📍 {hotel.address}</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t('addEntry')}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

       {/* 入住登记列表视图 */}
       {calendarEntries.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">{t('noEntries')}</div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('addFirstEntry')}
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {calendarEntries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white border border-gray-200 rounded-lg p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {hotel?.name || '酒店'}
                  </h3>
                  <p className="text-gray-600">
                    👥 {entry.guestCount} {t('guests')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditEntry(entry)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    {t('edit')}
                  </button>
                  <button
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    {t('delete')}
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <span className="text-sm font-medium text-gray-700">{t('checkInDate')}:</span>
                  <p className="text-gray-900">{new Date(entry.checkInDate).toLocaleDateString(dateLocale)}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">{t('checkOutDate')}:</span>
                  <p className="text-gray-900">{new Date(entry.checkOutDate).toLocaleDateString(dateLocale)}</p>
                </div>
              </div>
              
              {entry.cleaningDates && entry.cleaningDates.length > 0 && (
                <div className="mb-4">
                  <span className="text-sm font-medium text-gray-700">{t('cleaningDate')}:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {entry.cleaningDates.map(date => (
                      <span
                        key={date}
                        className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-sm rounded-md"
                      >
                        {new Date(date).toLocaleDateString(dateLocale)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {entry.ownerNotes && (
                <div>
                  <span className="text-sm font-medium text-gray-700">{t('ownerNotes')}:</span>
                  <p className="text-gray-900 mt-1">{entry.ownerNotes}</p>
                </div>
              )}
              
              <div className="text-xs text-gray-500 mt-4">
                {t('createdAt')}: {new Date(entry.createdAt).toLocaleString(dateLocale)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 选中的入住登记详情 */}
      {selectedEntry && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {hotel?.name || '酒店'}
              </h3>
              <p className="text-gray-600">
                👥 {selectedEntry.guestCount} {t('guests')}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleEditEntry(selectedEntry)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                {t('edit')}
              </button>
              <button
                onClick={() => handleDeleteEntry(selectedEntry.id)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                {t('delete')}
              </button>
              <button
                onClick={() => setSelectedEntry(null)}
                className="text-gray-600 hover:text-gray-800 text-sm"
              >
                {t('close')}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <span className="text-sm font-medium text-gray-700">{t('checkInDate')}:</span>
              <p className="text-gray-900">{new Date(selectedEntry.checkInDate).toLocaleDateString(dateLocale)}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">{t('checkOutDate')}:</span>
              <p className="text-gray-900">{new Date(selectedEntry.checkOutDate).toLocaleDateString(dateLocale)}</p>
            </div>
          </div>
          
          {selectedEntry.cleaningDates && selectedEntry.cleaningDates.length > 0 && (
            <div className="mb-4">
              <span className="text-sm font-medium text-gray-700">{t('cleaningDate')}:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedEntry.cleaningDates.map(date => (
                  <span
                    key={date}
                    className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-sm rounded-md"
                  >
                    {new Date(date).toLocaleDateString(dateLocale)}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {selectedEntry.ownerNotes && (
            <div>
              <span className="text-sm font-medium text-gray-700">{t('ownerNotes')}:</span>
              <p className="text-gray-900 mt-1">{selectedEntry.ownerNotes}</p>
            </div>
          )}
          
          <div className="text-xs text-gray-500 mt-4">
            {t('createdAt')}: {new Date(selectedEntry.createdAt).toLocaleString(dateLocale)}
          </div>
        </div>
      )}

      {/* 创建/编辑表单 */}
      {(showCreateForm || editingEntry) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <CalendarEntryForm
              initialData={{
                checkInDate: formData.checkInDate,
                checkOutDate: formData.checkOutDate,
                guestCount: formData.guestCount,
                ownerNotes: formData.ownerNotes,
                cleaningDates: formData.cleaningDates
              }}
              onSubmit={editingEntry ? handleUpdateEntry : handleCreateEntry}
              onCancel={editingEntry ? handleCancelEdit : () => setShowCreateForm(false)}
              loading={creating}
              title={editingEntry ? t('editTitle') : t('addTitle')}
            />
          </div>
        </div>
      )}
    </div>
  );
}
