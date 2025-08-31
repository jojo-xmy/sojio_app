"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUserStore } from '@/store/userStore';
import { 
  getHotelById, 
  getHotelCalendarEntries, 
  createCalendarEntry,
  updateCalendarEntry,
  deleteCalendarEntry 
} from '@/lib/hotelManagement';
import { Hotel, CalendarEntry, CreateCalendarEntryData } from '@/types/hotel';
import { supabase } from '@/lib/supabase';
// 临时移除复杂的日历组件引用

export default function HotelCalendarPage() {
  const params = useParams();
  const router = useRouter();
  const user = useUserStore(s => s.user);
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
  const [formData, setFormData] = useState<CreateCalendarEntryData>({
    hotelId: hotelId,
    checkInDate: '',
    checkOutDate: '',
    guestCount: 1,
    roomNumber: '',
    ownerNotes: ''
  });

  // 表单验证状态
  const [validationError, setValidationError] = useState<string | null>(null);

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
      const [hotelData, entries] = await Promise.all([
        getHotelById(hotelId),
        getHotelCalendarEntries(hotelId)
      ]);
      
      if (!hotelData) {
        setError('酒店不存在');
        return;
      }
      
      setHotel(hotelData);
      setCalendarEntries(entries);
    } catch (err) {
      setError('加载酒店数据失败');
      console.error('加载酒店数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 验证表单数据
  const validateFormData = () => {
    if (!formData.checkInDate || !formData.checkOutDate) {
      setValidationError('请选择入住和退房日期');
      return false;
    }

    if (new Date(formData.checkInDate) >= new Date(formData.checkOutDate)) {
      setValidationError('退房日期必须晚于入住日期');
      return false;
    }

    setValidationError(null);
    return true;
  };

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!validateFormData()) {
      return;
    }

    try {
      setCreating(true);
      await createCalendarEntry(formData, user.id.toString());
      setFormData({
        hotelId: hotelId,
        checkInDate: '',
        checkOutDate: '',
        guestCount: 1,
        roomNumber: '',
        ownerNotes: ''
      });
      setShowCreateForm(false);
      setValidationError(null);
      await loadHotelData(); // 重新加载数据
    } catch (err) {
      setError('创建日历条目失败');
      console.error('创建日历条目失败:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    if (!validateFormData()) {
      return;
    }

    try {
      setCreating(true);
      await updateCalendarEntry(editingEntry.id, formData);
      setEditingEntry(null);
      setFormData({
        hotelId: hotelId,
        checkInDate: '',
        checkOutDate: '',
        guestCount: 1,
        roomNumber: '',
        ownerNotes: ''
      });
      setValidationError(null);
      await loadHotelData(); // 重新加载数据
    } catch (err) {
      setError('更新日历条目失败');
      console.error('更新日历条目失败:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('确定要删除这个日历条目吗？')) return;

    try {
      await deleteCalendarEntry(entryId);
      await loadHotelData(); // 重新加载数据
    } catch (err) {
      setError('删除日历条目失败');
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
      roomNumber: entry.roomNumber || '',
      ownerNotes: entry.ownerNotes || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setFormData({
      hotelId: hotelId,
      checkInDate: '',
      checkOutDate: '',
      guestCount: 1,
      roomNumber: '',
      ownerNotes: ''
    });
    setValidationError(null);
  };

  const handleDateSelect = (date: string) => {
    if (!showCreateForm && !editingEntry) {
      // 如果不在编辑模式，点击日期可以快速创建新记录
      setFormData(prev => ({
        ...prev,
        checkInDate: date,
        checkOutDate: date
      }));
      setShowCreateForm(true);
    }
  };

  const handleEntryClick = (entry: CalendarEntry) => {
    setSelectedEntry(entry);
  };

  if (!user || user.role !== 'owner') {
    return <div className="p-6">无权访问此页面</div>;
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">加载中...</div>
        </div>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">酒店不存在</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{hotel.name} - 入住日历</h1>
          <p className="text-gray-600 mt-1">📍 {hotel.address}</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          添加入住登记
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* 日历视图 - 临时简化 */}
      <div className="mb-8 p-8 bg-gray-50 border border-gray-200 rounded-lg text-center">
        <p className="text-gray-600">日历视图功能正在开发中...</p>
        <p className="text-sm text-gray-500 mt-2">当前有 {calendarEntries.length} 个日历条目</p>
      </div>

      {/* 选中的入住登记详情 */}
      {selectedEntry && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedEntry.roomNumber ? `房间 ${selectedEntry.roomNumber}` : '未指定房间'}
              </h3>
              <p className="text-gray-600">
                👥 {selectedEntry.guestCount} 位客人
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleEditEntry(selectedEntry)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                编辑
              </button>
              <button
                onClick={() => handleDeleteEntry(selectedEntry.id)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                删除
              </button>
              <button
                onClick={() => setSelectedEntry(null)}
                className="text-gray-600 hover:text-gray-800 text-sm"
              >
                关闭
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <span className="text-sm font-medium text-gray-700">入住日期:</span>
              <p className="text-gray-900">{new Date(selectedEntry.checkInDate).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">退房日期:</span>
              <p className="text-gray-900">{new Date(selectedEntry.checkOutDate).toLocaleDateString()}</p>
            </div>
          </div>
          
          {selectedEntry.ownerNotes && (
            <div>
              <span className="text-sm font-medium text-gray-700">房东备注:</span>
              <p className="text-gray-900 mt-1">{selectedEntry.ownerNotes}</p>
            </div>
          )}
          
          <div className="text-xs text-gray-500 mt-4">
            创建时间: {new Date(selectedEntry.createdAt).toLocaleString()}
          </div>
        </div>
      )}

      {/* 创建/编辑表单 */}
      {(showCreateForm || editingEntry) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingEntry ? '编辑入住登记' : '添加入住登记'}
            </h2>
            
            {validationError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {validationError}
              </div>
            )}
            
            <form onSubmit={editingEntry ? handleUpdateEntry : handleCreateEntry}>
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
                    setFormData({ ...formData, checkOutDate: e.target.value });
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
                  房间号（可选）
                </label>
                <input
                  type="text"
                  value={formData.roomNumber}
                  onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入房间号"
                />
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
                  onClick={editingEntry ? handleCancelEdit : () => setShowCreateForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {creating ? '保存中...' : (editingEntry ? '更新' : '创建')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
