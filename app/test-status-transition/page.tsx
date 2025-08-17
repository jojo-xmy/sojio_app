"use client";
import { useState } from 'react';
import { TaskActionButtons } from '@/components/TaskActionButtons';
import { TaskStatusBadge } from '@/components/TaskStatusBadge';
import { TaskCard } from '@/components/TaskCard';
import { Task, TaskStatus } from '@/types/task';
import { tasks } from '@/data/tasks';
import { useUserStore } from '@/store/userStore';

export default function TestStatusTransitionPage() {
  const user = useUserStore(s => s.user);
  const [selectedTask, setSelectedTask] = useState<Task>(tasks[0]);
  const [currentTask, setCurrentTask] = useState<Task>(tasks[0]);
  const [message, setMessage] = useState<string>('');

  const handleStatusChange = (newStatus: TaskStatus) => {
    setCurrentTask(prev => ({ ...prev, status: newStatus }));
    setMessage(`✅ 任务状态已更新为: ${newStatus}`);
    
    // 3秒后清除消息
    setTimeout(() => setMessage(''), 3000);
  };

  if (!user) {
    return (
      <div style={{ maxWidth: 800, margin: '2rem auto', padding: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>状态转换测试</h1>
        <div style={{ color: 'red', padding: 16, background: '#fef2f2', borderRadius: 8 }}>
          请先登录后再测试状态转换功能
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '2rem auto', padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>状态转换测试</h1>
      
      {/* 用户信息 */}
      <div style={{ 
        padding: 16, 
        background: '#f0f9ff', 
        borderRadius: 8, 
        marginBottom: 24,
        border: '1px solid #0ea5e9'
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>当前用户</h3>
        <div style={{ fontSize: 14 }}>
          <strong>姓名：</strong>{user.name} ({user.katakana})<br />
          <strong>角色：</strong>{user.role === 'owner' ? '房东' : user.role === 'manager' ? '管理者' : '清洁员'}
        </div>
      </div>

      {/* 消息提示 */}
      {message && (
        <div style={{ 
          padding: 12, 
          background: '#f0fdf4', 
          border: '1px solid #22c55e', 
          borderRadius: 6, 
          marginBottom: 16,
          color: '#166534'
        }}>
          {message}
        </div>
      )}

      {/* 任务选择 */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>选择测试任务</h2>
        <select 
          value={selectedTask.id} 
          onChange={(e) => {
            const task = tasks.find(t => t.id === e.target.value) || tasks[0];
            setSelectedTask(task);
            setCurrentTask(task);
          }}
          style={{ 
            padding: 8, 
            border: '1px solid #ddd', 
            borderRadius: 4, 
            width: '100%',
            fontSize: 14
          }}
        >
          {tasks.map(task => (
            <option key={task.id} value={task.id}>
              {task.hotelName} - {task.status} - {task.assignedCleaners.join(', ')}
            </option>
          ))}
        </select>
      </div>

      {/* 当前任务状态 */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>当前任务状态</h2>
        <div style={{ 
          padding: 16, 
          background: '#f9fafb', 
          borderRadius: 8,
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 16, fontWeight: 600 }}>状态：</span>
            <TaskStatusBadge status={currentTask.status} />
          </div>
          <div style={{ fontSize: 14, color: '#666' }}>
            任务ID: {currentTask.id} | 创建时间: {currentTask.createdAt ? new Date(currentTask.createdAt).toLocaleString() : 'N/A'}
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>可用操作</h2>
        <TaskActionButtons 
          task={currentTask} 
          onStatusChange={handleStatusChange}
        />
      </div>

      {/* 任务卡片预览 */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>任务卡片预览</h2>
        <TaskCard 
          {...currentTask}
          showDetail={true}
        />
      </div>

      {/* 状态转换说明 */}
      <div style={{ 
        padding: 16, 
        background: '#fef3c7', 
        borderRadius: 8,
        border: '1px solid #f59e0b'
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>状态转换说明</h3>
        <div style={{ fontSize: 14, lineHeight: 1.6 }}>
          <strong>状态流程：</strong><br />
          📝 草稿 → ⏳ 待分配 → 👥 已分配 → ✅ 已接受 → 🔄 进行中 → 🎉 已完成 → 🏆 已确认<br /><br />
          <strong>权限说明：</strong><br />
          • 房东/管理者：可以编辑草稿、分配任务、确认完成<br />
          • 清洁员：可以接受任务、开始任务、完成任务<br />
          • 所有状态转换都会实时更新到数据库
        </div>
      </div>
    </div>
  );
} 