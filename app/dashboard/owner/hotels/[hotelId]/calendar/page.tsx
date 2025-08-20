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

  // 表单状态
  const [formData, setFormData] = useState<CreateCalendarEntryData>({
    hotelId: hotelId,
    checkInDate: '',
    checkOutDate: '',
    guestCount: 1,
    roomNumber: '',
    specialNotes: ''
  });

  useEffect(() => {
    if (!user || user.role !== 'owner') {
      router.push('/dashboard');
      return;
    }
    loadHotelData();
  }, [user, router, hotelId]);

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

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setCreating(true);
      await createCalendarEntry(formData, user.id.toString());
      setFormData({
        hotelId: hotelId,
        checkInDate: '',
        checkOutDate: '',
        guestCount: 1,
        roomNumber: '',
        specialNotes: ''
      });
      setShowCreateForm(false);
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
        specialNotes: ''
      });
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
      specialNotes: entry.specialNotes || ''
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
      specialNotes: ''
    });
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
    <div className="p-6 max-w-6xl mx-auto">
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

      {calendarEntries.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">暂无入住登记</div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            添加第一个入住登记
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
                    {entry.roomNumber ? `房间 ${entry.roomNumber}` : '未指定房间'}
                  </h3>
                  <p className="text-gray-600">
                    👥 {entry.guestCount} 位客人
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditEntry(entry)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    删除
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <span className="text-sm font-medium text-gray-700">入住日期:</span>
                  <p className="text-gray-900">{new Date(entry.checkInDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">退房日期:</span>
                  <p className="text-gray-900">{new Date(entry.checkOutDate).toLocaleDateString()}</p>
                </div>
              </div>
              
              {entry.specialNotes && (
                <div>
                  <span className="text-sm font-medium text-gray-700">特殊说明:</span>
                  <p className="text-gray-900 mt-1">{entry.specialNotes}</p>
                </div>
              )}
              
              <div className="text-xs text-gray-500 mt-4">
                创建时间: {new Date(entry.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 创建/编辑表单 */}
      {(showCreateForm || editingEntry) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingEntry ? '编辑入住登记' : '添加入住登记'}
            </h2>
            <form onSubmit={editingEntry ? handleUpdateEntry : handleCreateEntry}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  入住日期 *
                </label>
                <input
                  type="date"
                  required
                  value={formData.checkInDate}
                  onChange={(e) => setFormData({ ...formData, checkInDate: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, checkOutDate: e.target.value })}
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
                  特殊说明（可选）
                </label>
                <textarea
                  value={formData.specialNotes}
                  onChange={(e) => setFormData({ ...formData, specialNotes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="输入特殊说明"
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
