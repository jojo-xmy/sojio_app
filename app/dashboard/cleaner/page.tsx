"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TaskCard } from '@/components/TaskCard';
import { tasks } from '@/data/tasks';
import { TaskDetailPanel } from '@/components/TaskDetailPanel';
import { useUserStore } from '@/store/userStore';
import { getUserLatestAttendance, getAttendanceByTaskId, calculateTaskStatus } from '@/lib/attendance';
import { Task } from '@/types/task';
import { RoleSelector } from '@/components/RoleSelector';

// 假设当前登录用户为 'Yamada Taro'，后续可从 userStore 获取
const currentUser = 'Yamada Taro';

export default function CleanerDashboard() {
  const user = useUserStore(s => s.user);
  const myTasks = tasks.filter(task => task.assignedCleaners.includes(currentUser));
  const [selectedId, setSelectedId] = useState<string | null>(myTasks[0]?.id || null);
  const [tasksWithAttendance, setTasksWithAttendance] = useState<Task[]>(myTasks);
  const selectedTask = tasksWithAttendance.find(t => t.id === selectedId);

  // 加载所有任务的打卡状态
  useEffect(() => {
    loadAllAttendanceStatus();
  }, [user]);

  async function loadAllAttendanceStatus() {
    if (!user) return;
    
    const tasksWithStatus = await Promise.all(
      myTasks.map(async (task) => {
        const latestStatus = await getUserLatestAttendance(task.id, user.id.toString());
        const attendanceRecords = await getAttendanceByTaskId(task.id);
        const taskStatus = calculateTaskStatus(attendanceRecords, task.assignedCleaners);
        
        return {
          ...task,
          attendanceStatus: latestStatus,
          status: taskStatus
        };
      })
    );
    
    setTasksWithAttendance(tasksWithStatus);
  }

  // 刷新打卡状态的回调函数
  function handleAttendanceUpdate() {
    loadAllAttendanceStatus();
  }

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto' }}>
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
            可用性设置
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {tasksWithAttendance.map(task => (
          <TaskCard
            key={task.id}
            {...task}
            showDetail={false}
            onClick={() => setSelectedId(task.id)}
          />
        ))}
        {tasksWithAttendance.length === 0 && <div style={{ color: '#888' }}>暂无任务</div>}
      </div>
      {selectedTask && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>任务详情</h3>
          <TaskDetailPanel task={selectedTask} onAttendanceUpdate={handleAttendanceUpdate} />
        </div>
      )}
    </div>
  );
} 