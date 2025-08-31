"use client";
import { useUserStore } from '@/store/userStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { RoleSelector } from '@/components/RoleSelector';
import { GanttTaskTimeline } from '@/components/GanttTaskTimeline';
import { TaskCreateForm } from '@/components/TaskCreateForm';


export default function OwnerDashboard() {
  const { user, isInitialized } = useUserStore();
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const calendarRef = useRef<{ refreshData: () => void }>(null);

  useEffect(() => {
    if (!isInitialized) return;

    if (!user) {
      router.push('/login');
      return;
    }
    
    // 移除角色检查的重定向逻辑，让主dashboard页面处理角色重定向
  }, [user, isInitialized, router]);

  // 移除角色检查的返回null逻辑，让页面正常渲染
  // 如果用户角色不匹配，主dashboard页面会自动重定向

  return (
    <div style={{ maxWidth: 1200, margin: '2rem auto', padding: '0 1rem' }}>
      <RoleSelector showLogout={true} compactMode={false} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>我的任务日历</h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            onClick={() => setShowCreateForm(true)}
            style={{ 
              padding: '8px 20px', 
              background: '#f59e0b', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 6, 
              fontWeight: 600, 
              fontSize: 16, 
              cursor: 'pointer' 
            }}
          >
            新建入住任务
          </button>
          <button 
            onClick={() => router.push('/dashboard/owner/hotels')}
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
            管理酒店
          </button>
        </div>
      </div>

      {/* 日历视图（内部已包含右侧任务详情面板） */}
      <GanttTaskTimeline 
        ref={calendarRef}
        className="w-full" 
        onDataRefresh={() => {
          console.log('时间线数据已刷新');
        }}
      />

      {/* 任务创建表单 */}
      <TaskCreateForm 
        isOpen={showCreateForm} 
        onClose={() => setShowCreateForm(false)}
        onTaskCreated={() => {
          console.log('房东任务创建成功');
          // 使用ref调用日历组件的刷新方法
          if (calendarRef.current) {
            calendarRef.current.refreshData();
          }
        }}
      />
    </div>
  );
} 