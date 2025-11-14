"use client";
import { useState, ChangeEvent, useEffect } from 'react';
import { useUserStore } from '@/store/userStore';

import { supabase } from '@/lib/supabase';

interface TaskCreateFormProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated?: () => void; // 回调函数，用于通知父组件刷新任务列表
}

export const TaskCreateForm: React.FC<TaskCreateFormProps> = ({ isOpen, onClose, onTaskCreated }) => {
  const user = useUserStore(s => s.user);
  const [formData, setFormData] = useState({
    hotelId: '',
    checkInDate: '',
    checkOutDate: '',
    guestCount: 1, // 入住人数
    details: ''
  });
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ownerHotels, setOwnerHotels] = useState<Array<{id: string; name: string; address: string}>>([]);

  // 加载owner的酒店列表
  useEffect(() => {
    if (isOpen && user?.role === 'owner') {
      loadOwnerHotels();
    }
  }, [isOpen, user]);

  const loadOwnerHotels = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('hotels')
        .select('id, name, address')
        .eq('owner_id', user.id)
        .order('name');

      if (error) {
        console.error('加载酒店列表失败:', error);
        setError('加载酒店列表失败');
        return;
      }

      setOwnerHotels(data || []);
    } catch (error) {
      console.error('加载酒店列表失败:', error);
      setError('加载酒店列表失败');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('请先登录');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('开始创建任务:', formData);
      
      // 获取选中的酒店信息
      const selectedHotel = ownerHotels.find(hotel => hotel.id === formData.hotelId);
      if (!selectedHotel) {
        setError('请选择酒店');
        return;
      }

      // 使用新的服务层API创建入住登记（触发器会自动创建清扫任务）
      const { createCalendarEntry } = await import('@/lib/services/calendarEntryService');
      
      const entryData = {
        hotelId: formData.hotelId,
        checkInDate: formData.checkInDate,
        checkOutDate: formData.checkOutDate,
        guestCount: formData.guestCount,
        ownerNotes: formData.details || undefined,
        cleaningDates: formData.checkOutDate
          ? [formData.checkOutDate]
          : formData.checkInDate
            ? [formData.checkInDate]
            : []
      };
      
      const data = await createCalendarEntry(entryData, user.id.toString());
      
      console.log('Calendar entry创建成功，触发器将自动创建task:', data);
      alert('任务创建成功！');
      onTaskCreated?.(); // 通知父组件刷新
      onClose();
      
      // 重置表单
      setFormData({
        hotelId: '',
        checkInDate: '',
        checkOutDate: '',
        guestCount: 1,
        details: ''
      });
      setSelectedImages([]);
    } catch (error) {
      console.error('创建任务时出错:', error);
      setError('创建任务时发生错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | string[] | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setSelectedImages(Array.from(files));
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#fff',
        padding: 24,
        borderRadius: 8,
        width: '90%',
        maxWidth: 500,
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>创建新任务</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* 酒店选择 */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>选择酒店 *</label>
            <select
              value={formData.hotelId}
              onChange={(e) => handleInputChange('hotelId', e.target.value)}
              required
              style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
            >
              <option value="">请选择酒店</option>
              {ownerHotels.map(hotel => (
                <option key={hotel.id} value={hotel.id}>
                  {hotel.name} - {hotel.address}
                </option>
              ))}
            </select>
            {ownerHotels.length === 0 && (
              <div style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>
                您暂无管理的酒店，请联系管理员
              </div>
            )}
          </div>

          {/* 入住日期 */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>入住日期 *</label>
            <input
              type="date"
              value={formData.checkInDate}
              onChange={(e) => handleInputChange('checkInDate', e.target.value)}
              required
              style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
            />
          </div>

          {/* 退房日期 */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>退房日期 *</label>
            <input
              type="date"
              value={formData.checkOutDate}
              onChange={(e) => handleInputChange('checkOutDate', e.target.value)}
              required
              style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
            />
          </div>

          {/* 入住人数 */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>入住人数 *</label>
            <input
              type="number"
              min="1"
              max="10"
              value={formData.guestCount}
              onChange={(e) => handleInputChange('guestCount', parseInt(e.target.value) || 1)}
              required
              style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
            />
          </div>





          {/* 详细信息 */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>详细信息</label>
            <textarea
              value={formData.details}
              onChange={(e) => handleInputChange('details', e.target.value)}
              placeholder="请输入任务详细信息..."
              rows={4}
              style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4, resize: 'vertical' }}
            />
          </div>

          {/* 错误信息 */}
          {error && (
            <div style={{ color: 'red', marginBottom: 16, fontSize: 14 }}>
              {error}
            </div>
          )}

          {/* 按钮 */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{ padding: '8px 16px', border: '1px solid #ddd', background: '#fff', borderRadius: 4, cursor: 'pointer' }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ 
                padding: '8px 16px', 
                background: loading ? '#ccc' : '#2563eb', 
                color: '#fff', 
                border: 'none', 
                borderRadius: 4, 
                cursor: loading ? 'not-allowed' : 'pointer' 
              }}
            >
              {loading ? '创建中...' : '创建任务'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 