"use client";
import { useState } from 'react';
import { useUserStore } from '@/store/userStore';
import { createTaskWithImages } from '@/lib/upload';

export default function TestUploadPage() {
  const user = useUserStore(s => s.user);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setSelectedImages(Array.from(files));
    }
  };

  const handleTestCreate = async () => {
    if (!user) {
      setResult('请先登录');
      return;
    }

    setLoading(true);
    setResult('');

    try {
      const taskData = {
        hotel_name: '测试酒店',
        date: new Date().toISOString().split('T')[0],
        check_in_time: '15:00',
        assigned_cleaners: ['测试清洁员'],
        description: '这是一个测试任务',
        created_by: user.id.toString()
      };

      console.log('开始测试创建任务:', taskData);
      const result = await createTaskWithImages(taskData, selectedImages);
      
      if (result.task) {
        setResult(`✅ 任务创建成功！\n任务ID: ${result.task.id}\n图片数量: ${result.images.length}张`);
        console.log('测试成功:', result);
      } else {
        setResult('❌ 任务创建失败');
      }
    } catch (error) {
      console.error('测试失败:', error);
      setResult(`❌ 测试失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>测试任务创建和图片上传</h1>
      
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>选择图片：</label>
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

      <button
        onClick={handleTestCreate}
        disabled={loading || !user}
        style={{
          width: '100%',
          padding: 12,
          background: loading || !user ? '#ccc' : '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          fontWeight: 600,
          cursor: loading || !user ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? '测试中...' : '测试创建任务和上传图片'}
      </button>

      {!user && (
        <div style={{ marginTop: 16, color: 'red', fontSize: 14 }}>
          请先登录后再测试
        </div>
      )}

      {result && (
        <div style={{ 
          marginTop: 24, 
          padding: 16, 
          background: result.includes('✅') ? '#f0f9ff' : '#fef2f2', 
          border: `1px solid ${result.includes('✅') ? '#0ea5e9' : '#f87171'}`,
          borderRadius: 6,
          whiteSpace: 'pre-line',
          fontSize: 14
        }}>
          {result}
        </div>
      )}
    </div>
  );
} 