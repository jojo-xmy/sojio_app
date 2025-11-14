// app/dashboard/manager/page.tsx
"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/userStore';
import { TaskCreateForm } from '@/components/TaskCreateForm';
import { DashboardHeader } from '@/components/DashboardHeader';
import { HeaderButton } from '@/components/HeaderButton';
import { TaskCalendar } from '@/components/TaskCalendar';
import { TaskCard } from '@/components/TaskCard';
import { TaskDetailPanel } from '@/components/TaskDetailPanel';
import { getTaskCapabilities } from '@/lib/taskCapabilities';
import { useManagerDashboard } from '@/hooks/usePageRefresh';
import { Task } from '@/types/task';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/hooks/useTranslation';


export default function ManagerDashboard() {
  const router = useRouter();
  const user = useUserStore(s => s.user);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailExpanded, setIsDetailExpanded] = useState(false);
  const calendarRef = useRef<{ refreshData: () => void }>(null);
  
  // 使用新的全局 refresh 管理器
  const { tasksWithAttendance, loading, refresh: loadAllAttendanceStatus } = useManagerDashboard();
  const { t } = useTranslation('dashboard.manager');



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
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <DashboardHeader 
        title={t('title')}
        actions={
          <>
            <HeaderButton 
              onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
              variant="secondary"
            >
              {viewMode === 'list' ? t('actions.toggleViewToCalendar') : t('actions.toggleViewToList')}
            </HeaderButton>
            <HeaderButton 
              onClick={() => router.push('/dashboard/manager/hotels')}
              variant="primary"
            >
              {t('actions.hotels')}
            </HeaderButton>
            <HeaderButton 
              onClick={() => router.push('/dashboard/manager/applications')}
              variant="success"
            >
              {t('actions.applications')}
            </HeaderButton>
            <HeaderButton 
              onClick={() => setShowCreateForm(true)}
              variant="primary"
            >
              {t('actions.createTask')}
            </HeaderButton>
          </>
        }
      />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1rem' }}>
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
          <div 
            className="transition-all duration-500 ease-in-out cursor-pointer"
            style={{ 
              flex: isDetailExpanded ? '0 0 35%' : '1',
              minWidth: isDetailExpanded ? '400px' : 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
            onClick={() => isDetailExpanded && setIsDetailExpanded(false)}
          >
            {loading ? (
              <div style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>{t('list.loading')}</div>
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
                      onClick={() => {
                        setSelectedTask(task);
                        setIsDetailExpanded(true);
                      }}
                      capabilities={caps}
                    />
                  );
                })}
                {tasksWithAttendance.length === 0 && <div style={{ color: '#888' }}>{t('list.empty')}</div>}
              </>
            )}
          </div>

          {/* 右侧任务面板（sticky 居中显示，滚动时保持） */}
          <div 
            className="shrink-0 transition-all duration-500 ease-in-out"
            style={{ 
              width: isDetailExpanded ? 'calc(65% - 1.5rem)' : '360px',
              flex: isDetailExpanded ? '1' : '0 0 360px'
            }}
          >
            <div className="sticky" style={{ top: 16 }}>
              {!selectedTask ? (
                <div 
                  className="text-gray-500 flex items-center justify-center transition-opacity duration-300"
                  style={{ height: 'calc(100vh - 32px)' }}
                >
                  <div className="text-center px-4">
                    <div className="text-lg font-medium mb-2">📋</div>
                    <div className="text-sm">{t('list.detailHint')}</div>
                  </div>
                </div>
              ) : (
                <div className="max-h-[calc(100vh-32px)] overflow-y-auto">
                  <div className="mb-3 flex items-center justify-between">
                    <button
                      onClick={() => setIsDetailExpanded(!isDetailExpanded)}
                      className="text-xs px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-all duration-200 flex items-center gap-1.5 shadow-sm hover:shadow"
                      title={isDetailExpanded ? t('list.collapseTooltip') : t('list.expandTooltip')}
                    >
                      <span>{isDetailExpanded ? '◀' : '▶'}</span>
                      <span>{isDetailExpanded ? t('list.collapse') : t('list.expand')}</span>
                    </button>
                  </div>
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
    </div>
  );
} 