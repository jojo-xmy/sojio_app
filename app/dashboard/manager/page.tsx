"use client";
import { useState, useEffect } from 'react';
import { TaskCard } from '@/components/TaskCard';
import { tasks } from '@/data/tasks';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/userStore';
import { getAttendanceByTaskId, calculateTaskStatus } from '@/lib/attendance';
import { Task } from '@/types/task';
import { TaskCreateForm } from '@/components/TaskCreateForm';
import { RoleSelector } from '@/components/RoleSelector';
import { TaskCalendar } from '@/components/TaskCalendar';

export default function ManagerDashboard() {
  const router = useRouter();
  const user = useUserStore(s => s.user);
  const [tasksWithAttendance, setTasksWithAttendance] = useState<Task[]>(tasks);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');

  // 加载所有任务的打卡状态
  useEffect(() => {
    loadAllAttendanceStatus();
  }, [user]);

  async function loadAllAttendanceStatus() {
    if (!user) return;
    
    const tasksWithStatus = await Promise.all(
      tasks.map(async (task) => {
        const attendanceRecords = await getAttendanceByTaskId(task.id);
        const taskStatus = calculateTaskStatus(attendanceRecords, task.assignedCleaners);
        
        // 计算总体打卡状态：如果有任何人已退勤，显示"已退勤"；如果有任何人已出勤，显示"已出勤"；否则显示"未打卡"
        let overallStatus: 'none' | 'checked_in' | 'checked_out' = 'none';
        const hasCheckedOut = attendanceRecords.some(record => record.status === 'checked_out');
        const hasCheckedIn = attendanceRecords.some(record => record.status === 'checked_in');
        
        if (hasCheckedOut) {
          overallStatus = 'checked_out';
        } else if (hasCheckedIn) {
          overallStatus = 'checked_in';
        }
        
        return {
          ...task,
          attendanceStatus: overallStatus,
          // 保持原始的任务状态，不覆盖
          // status: taskStatus
        };
      })
    );
    
    setTasksWithAttendance(tasksWithStatus);
  }

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
            onClick={() => router.push('/admin/registration-applications')}
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
        <TaskCalendar className="w-full" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tasksWithAttendance.map(task => (
            <TaskCard key={task.id} {...task} showDetail={false} onClick={() => router.push(`/task/${task.id}`)} />
          ))}
          {tasksWithAttendance.length === 0 && <div style={{ color: '#888' }}>暂无任务</div>}
        </div>
      )}
      
      <TaskCreateForm 
        isOpen={showCreateForm} 
        onClose={() => setShowCreateForm(false)}
        onTaskCreated={() => {
          // TODO: 刷新任务列表，从数据库获取最新数据
          console.log('任务创建成功，需要刷新列表');
          loadAllAttendanceStatus();
        }}
      />
    </div>
  );
} 