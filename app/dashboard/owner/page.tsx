"use client";
import { useUserStore } from '@/store/userStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { RoleSelector } from '@/components/RoleSelector';

export default function OwnerDashboard() {
  const { user } = useUserStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    if (user.role !== 'owner') {
      router.push('/dashboard');
    }
  }, [user, router]);

  if (!user || user.role !== 'owner') {
    return null;
  }

  return (
    <div style={{ maxWidth: 800, margin: '2rem auto', padding: 24 }}>
      <RoleSelector showLogout={true} compactMode={false} />
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>
          房东仪表板
        </h1>
        <p style={{ color: '#666', fontSize: 16 }}>
          欢迎回来，{user.name}！这里是您的任务概览。
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: 24,
        marginBottom: 32
      }}>
        <div style={{ 
          background: '#f8fafc', 
          padding: 24, 
          borderRadius: 12, 
          border: '1px solid #e2e8f0' 
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>今日任务</h3>
          <p style={{ fontSize: 32, fontWeight: 700, color: '#3b82f6' }}>5</p>
          <p style={{ color: '#666', fontSize: 14 }}>个任务待处理</p>
        </div>

        <div style={{ 
          background: '#f8fafc', 
          padding: 24, 
          borderRadius: 12, 
          border: '1px solid #e2e8f0' 
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>已完成</h3>
          <p style={{ fontSize: 32, fontWeight: 700, color: '#10b981' }}>12</p>
          <p style={{ color: '#666', fontSize: 14 }}>个任务已完成</p>
        </div>

        <div style={{ 
          background: '#f8fafc', 
          padding: 24, 
          borderRadius: 12, 
          border: '1px solid #e2e8f0' 
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>清洁员</h3>
          <p style={{ fontSize: 32, fontWeight: 700, color: '#f59e0b' }}>8</p>
          <p style={{ color: '#666', fontSize: 14 }}>名清洁员在线</p>
        </div>
      </div>

      <div style={{ 
        background: 'white', 
        padding: 24, 
        borderRadius: 12, 
        border: '1px solid #e2e8f0' 
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>快速操作</h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: 16 
        }}>
          <button 
            onClick={() => router.push('/dashboard/owner/hotels')}
            style={{ 
              background: '#3b82f6', 
              color: 'white', 
              padding: '12px 16px', 
              borderRadius: 8, 
              border: 'none', 
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500
            }}
          >
            管理酒店
          </button>
          <button 
            onClick={() => router.push('/dashboard/owner/tasks')}
            style={{ 
              background: '#10b981', 
              color: 'white', 
              padding: '12px 16px', 
              borderRadius: 8, 
              border: 'none', 
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500
            }}
          >
            查看任务
          </button>
        </div>
      </div>

      <div style={{ 
        background: 'white', 
        padding: 24, 
        borderRadius: 12, 
        border: '1px solid #e2e8f0',
        marginTop: 24
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>最近任务</h2>
        <div style={{ color: '#666' }}>
          <p>• 京都Villa - 3楼A房 (已完成)</p>
          <p>• 大阪Inn - 2楼B房 (进行中)</p>
          <p>• 东京Stay - 1楼C房 (待分配)</p>
        </div>
      </div>


    </div>
  );
} 