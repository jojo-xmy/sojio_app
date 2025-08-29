"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/userStore';
import { getUserHotels, createHotel, updateHotel } from '@/lib/hotelManagement';
import { Hotel, CreateHotelData } from '@/types/hotel';

export default function HotelsPage() {
  const router = useRouter();
  const user = useUserStore(s => s.user);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<{ hotelId: string; name: string; address: string; imageUrl: string }>({ hotelId: '', name: '', address: '', imageUrl: '' });

  // 表单状态
  const [formData, setFormData] = useState<CreateHotelData>({
    name: '',
    address: '',
    imageUrl: ''
  });

  useEffect(() => {
    if (!user || user.role !== 'owner') {
      router.push('/dashboard');
      return;
    }
    loadHotels();
  }, [user, router]);

  const loadHotels = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const hotelList = await getUserHotels(user.id.toString());
      setHotels(hotelList);
    } catch (err) {
      setError('加载酒店列表失败');
      console.error('加载酒店列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setCreating(true);
      await createHotel(formData, user.id.toString());
      setFormData({ name: '', address: '', imageUrl: '' });
      setShowCreateForm(false);
      await loadHotels(); // 重新加载列表
    } catch (err) {
      setError('创建酒店失败');
      console.error('创建酒店失败:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleHotelClick = (hotelId: string) => {
    router.push(`/dashboard/owner/hotels/${hotelId}/calendar`);
  };

  if (!user || user.role !== 'owner') {
    return <div className="p-6">无权访问此页面</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">我的酒店</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            添加酒店
          </button>
          <button
            onClick={() => {
              // 打开编辑表单，初始化为第一个酒店（可在表单中切换）
              const first = hotels[0];
              setEditForm({ hotelId: first?.id || '', name: first?.name || '', address: first?.address || '', imageUrl: first?.imageUrl || '' });
              setShowEditForm(true);
            }}
            className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            disabled={hotels.length === 0}
          >
            编辑酒店信息
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">加载中...</div>
        </div>
      ) : hotels.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">暂无酒店</div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            添加第一个酒店
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hotels.map((hotel) => (
            <div
              key={hotel.id}
              onClick={() => handleHotelClick(hotel.id)}
              className="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow"
            >
              {hotel.imageUrl && (
                <div className="w-full h-48 bg-gray-200 rounded-lg mb-4 overflow-hidden">
                  <img
                    src={hotel.imageUrl}
                    alt={hotel.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {hotel.name}
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                📍 {hotel.address}
              </p>
              <div className="text-xs text-gray-500">
                创建时间: {new Date(hotel.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 创建酒店表单 */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">添加新酒店</h2>
            <form onSubmit={handleCreateHotel}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  酒店名称 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入酒店名称"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  地址 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入酒店地址"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  图片URL（可选）
                </label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入图片URL"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {creating ? '创建中...' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 编辑酒店信息表单（带酒店选择） */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">编辑酒店信息</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">选择酒店 *</label>
              <select
                value={editForm.hotelId}
                onChange={(e) => {
                  const h = hotels.find(x => x.id === e.target.value);
                  setEditForm({ hotelId: h?.id || '', name: h?.name || '', address: h?.address || '', imageUrl: h?.imageUrl || '' });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {hotels.map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">酒店名称 *</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">地址 *</label>
              <input
                type="text"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">图片URL（可选）</label>
              <input
                type="url"
                value={editForm.imageUrl}
                onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowEditForm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={async () => {
                  if (!editForm.hotelId) return;
                  try {
                    setEditing(true);
                    await updateHotel(editForm.hotelId, { name: editForm.name, address: editForm.address, imageUrl: editForm.imageUrl });
                    await loadHotels();
                    setShowEditForm(false);
                  } catch (err) {
                    alert('更新失败');
                    console.error(err);
                  } finally {
                    setEditing(false);
                  }
                }}
                disabled={editing}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {editing ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
