// app/dashboard/manager/page.tsx
"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/userStore';
import { TaskCreateForm } from '@/components/TaskCreateForm';
import { RoleSelector } from '@/components/RoleSelector';
import { TaskCalendar } from '@/components/TaskCalendar';
import { TaskCard } from '@/components/TaskCard';
import { TaskDetailPanel } from '@/components/TaskDetailPanel';
import { getTaskCapabilities } from '@/lib/taskCapabilities';
import { useManagerDashboard } from '@/hooks/usePageRefresh';
import { Task } from '@/types/task';
import { supabase } from '@/lib/supabase';


export default function ManagerDashboard() {
  const router = useRouter();
  const user = useUserStore(s => s.user);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const calendarRef = useRef<{ refreshData: () => void }>(null);
  
  // 使用新的全局 refresh 管理器
  const { tasksWithAttendance, loading, refresh: loadAllAttendanceStatus } = useManagerDashboard();



  // 刷新打卡状态的回调函数
  const handleAttendanceUpdate = useCallback(() => {
    loadAllAttendanceStatus();
  }, [loadAllAttendanceStatus]);

  // 初始化加载
  useEffect(() => {
    loadAllAttendanceStatus();
  }, [loadAllAttendanceStatus]);

  // 订阅实时变更：tasks 与 attendance 与 task_assignments
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`realtime-manager-dashboard-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        loadAllAttendanceStatus();
        if (calendarRef.current) calendarRef.current.refreshData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
        loadAllAttendanceStatus();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignments' }, () => {
        loadAllAttendanceStatus();
        if (calendarRef.current) calendarRef.current.refreshData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, loadAllAttendanceStatus]);



  return (
    <div style={{ maxWidth: 1200, margin: '2rem auto', padding: '0 1rem' }}>
      <RoleSelector showLogout={true} compactMode={false} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>任务管理</h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
            style={{ 
              padding: '8px 20px', 
              background: '#6b7280', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 6, 
              fontWeight: 600, 
              fontSize: 16, 
              cursor: 'pointer' 
            }}
          >
            {viewMode === 'list' ? '日历视图' : '列表视图'}
          </button>
          <button 
            onClick={() => router.push('/dashboard/manager/applications')}
            style={{ 
              padding: '8px 20px', 
              background: '#059669', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 6, 
              fontWeight: 600, 
              fontSize: 16, 
              cursor: 'pointer' 
            }}
          >
            审核申请
          </button>
          <button 
            onClick={() => setShowCreateForm(true)}
            style={{ 
              padding: '8px 20px', 
              background: '#2563eb', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 6, 
              fontWeight: 600, 
              fontSize: 16, 
              cursor: 'pointer' 
            }}
          >
            新建任务
          </button>
        </div>
      </div>
      {viewMode === 'calendar' ? (
        <TaskCalendar 
          ref={calendarRef}
          className="w-full" 
          onDataRefresh={() => {
            console.log('管理者日历数据已刷新');
            // 移除这里的loadAllAttendanceStatus调用，避免循环刷新
          }}
        />
      ) : (
        <div style={{ display: 'flex', gap: 24 }}>
          {/* 任务列表 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {loading ? (
              <div style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>加载中...</div>
            ) : (
              <>
                {tasksWithAttendance.map(task => {
                  const caps = getTaskCapabilities('manager', task.status, {});
                  return (
                    <TaskCard 
                      key={task.id} 
                      id={task.id}
                      hotelName={task.hotelName}
                      date={task.checkInDate || task.date || ''}
                      checkInDate={task.checkInDate}
                      checkInTime={task.checkInTime}
                      checkOutDate={task.checkOutDate}
                      cleaningDate={task.cleaningDate}
                      assignedCleaners={task.assignedCleaners}
                      status={task.status}
                      description={task.description}
                      note={task.note}
                      images={task.images}
                      attendanceStatus={task.attendanceStatus}
                      hotelAddress={task.hotelAddress}
                      lockPassword={task.lockPassword}
                      acceptedBy={task.acceptedBy}
                      completedAt={task.completedAt}
                      confirmedAt={task.confirmedAt}
                      guestCount={task.guestCount}
                      showDetail={false} 
                      onClick={() => setSelectedTask(task)}
                      capabilities={caps}
                    />
                  );
                })}
                {tasksWithAttendance.length === 0 && <div style={{ color: '#888' }}>暂无任务</div>}
              </>
            )}
          </div>

          {/* 右侧任务面板（sticky 居中显示，滚动时保持） */}
          <div style={{ width: 360 }}>
            <div className="sticky" style={{ top: 16 }}>
              {!selectedTask ? (
                <div className="text-gray-500 flex items-center justify-center" style={{ height: 'calc(100vh - 32px)' }}>选择一个任务查看详情</div>
              ) : (
                <div className="max-h-[calc(100vh-32px)] overflow-y-auto">
                  <TaskDetailPanel 
                    task={selectedTask} 
                    onAttendanceUpdate={handleAttendanceUpdate}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <TaskCreateForm 
        isOpen={showCreateForm} 
        onClose={() => setShowCreateForm(false)}
        onTaskCreated={() => {
          // 刷新任务列表，从数据库获取最新数据
          console.log('任务创建成功，需要刷新列表');
          loadAllAttendanceStatus();
          // 同时刷新日历数据
          if (calendarRef.current) {
            calendarRef.current.refreshData();
          }
        }}
      />


    </div>
  );
} 