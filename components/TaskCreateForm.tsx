"use client";
import { useState, ChangeEvent } from 'react';
import { useUserStore } from '@/store/userStore';
import { createTaskWithImages } from '@/lib/upload';

interface TaskCreateFormProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated?: () => void; // 回调函数，用于通知父组件刷新任务列表
}

export const TaskCreateForm: React.FC<TaskCreateFormProps> = ({ isOpen, onClose, onTaskCreated }) => {
  const user = useUserStore(s => s.user);
  const [formData, setFormData] = useState({
    hotelName: '',
    date: '',
    hasCheckIn: 'yes', // 'yes' | 'no'
    assignedCleaners: [] as string[],
    details: ''
  });
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      
      // 准备任务数据
      const taskData = {
        hotel_name: formData.hotelName,
        date: formData.date,
        check_in_time: formData.hasCheckIn === 'yes' ? '15:00' : null, // 默认时间，后续可优化
        assigned_cleaners: formData.assignedCleaners,
        description: formData.details,
        created_by: user.id.toString()
      };

      // 使用新的完整流程创建任务和上传图片
      const result = await createTaskWithImages(taskData, selectedImages);
      
      if (result.task) {
        console.log('任务创建成功:', result.task);
        console.log('图片上传成功:', result.images.length, '张');
        alert('任务创建成功！');
        onTaskCreated?.(); // 通知父组件刷新
        onClose();
        
        // 重置表单
        setFormData({
          hotelName: '',
          date: '',
          hasCheckIn: 'yes',
          assignedCleaners: [],
          details: ''
        });
        setSelectedImages([]);
      } else {
        setError('任务创建失败，请重试');
      }
    } catch (error) {
      console.error('创建任务时出错:', error);
      setError('创建任务时发生错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | string[]) => {
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
          {/* 酒店名称 */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>酒店名称 *</label>
            <input
              type="text"
              value={formData.hotelName}
              onChange={(e) => handleInputChange('hotelName', e.target.value)}
              placeholder="请输入酒店名称"
              required
              style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
            />
          </div>

          {/* 日期 */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>日期 *</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              required
              style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
            />
          </div>

          {/* Check-in 有/无 */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Check-in *</label>
            <div style={{ display: 'flex', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="radio"
                  name="hasCheckIn"
                  value="yes"
                  checked={formData.hasCheckIn === 'yes'}
                  onChange={(e) => handleInputChange('hasCheckIn', e.target.value)}
                />
                有
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="radio"
                  name="hasCheckIn"
                  value="no"
                  checked={formData.hasCheckIn === 'no'}
                  onChange={(e) => handleInputChange('hasCheckIn', e.target.value)}
                />
                无
              </label>
            </div>
          </div>

          {/* 清扫人员选择 */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>清扫人员 *</label>
            <div style={{ border: '1px solid #ddd', borderRadius: 4, padding: 8, minHeight: 100 }}>
              <div style={{ color: '#888', fontSize: 14, marginBottom: 8 }}>请选择清扫人员（预留接口）</div>
              <div style={{ color: '#666', fontSize: 12 }}>
                示例：Yamada Taro, Nguyen Linh
              </div>
              {/* 临时添加一些清扫人员选项 */}
              <div style={{ marginTop: 8 }}>
                {['Yamada Taro', 'Nguyen Linh', 'Sato Hanako'].map(cleaner => (
                  <label key={cleaner} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <input
                      type="checkbox"
                      checked={formData.assignedCleaners.includes(cleaner)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleInputChange('assignedCleaners', [...formData.assignedCleaners, cleaner]);
                        } else {
                          handleInputChange('assignedCleaners', formData.assignedCleaners.filter(c => c !== cleaner));
                        }
                      }}
                    />
                    {cleaner}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* 图片上传 */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>任务图片</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
            />
            {selectedImages.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                已选择 {selectedImages.length} 张图片
              </div>
            )}
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