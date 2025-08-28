"use client";

import { useRouter } from 'next/navigation';

import { useUserStore } from '@/store/userStore';
import { RoleSelector } from '@/components/RoleSelector';
import { TaskCalendar } from '@/components/TaskCalendar';



export default function CleanerDashboard() {
  const user = useUserStore(s => s.user);
  const router = useRouter();

  return (
    <div style={{ maxWidth: 1200, margin: '2rem auto', padding: '0 1rem' }}>
      <RoleSelector showLogout={true} compactMode={false} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>我的清扫任务</h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            onClick={() => router.push('/dashboard/cleaner/availability')}
            style={{ 
              padding: '8px 20px', 
              background: '#10b981', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 6, 
              fontWeight: 600, 
              fontSize: 16, 
              cursor: 'pointer' 
            }}
          >
            日程注册
          </button>
          <button 
            onClick={() => router.push('/dashboard/cleaner/tasks')}
            style={{ 
              padding: '8px 20px', 
              background: '#3b82f6', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 6, 
              fontWeight: 600, 
              fontSize: 16, 
              cursor: 'pointer' 
            }}
          >
            查看所有任务
          </button>
        </div>
      </div>
      
      {/* 日历视图（内部已包含右侧任务详情面板） */}
      <TaskCalendar className="w-full" />
    </div>
  );
} 