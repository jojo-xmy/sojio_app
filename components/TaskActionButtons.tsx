"use client";
import { useState } from 'react';
import { Task, TaskStatus, UserRole } from '@/types/task';
import { canOperateTask, transitionTask } from '@/lib/taskStatus';
import { useUserStore } from '@/store/userStore';

interface TaskActionButtonsProps {
  task: Task;
  onStatusChange?: (newStatus: TaskStatus) => void;
  className?: string;
}

export const TaskActionButtons: React.FC<TaskActionButtonsProps> = ({
  task,
  onStatusChange,
  className = ''
}) => {
  const user = useUserStore(s => s.user);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return <div className={className}>请先登录</div>;
  }

  const userRole = user.role as UserRole;

  const handleAction = async (action: string, newStatus: TaskStatus) => {
    setLoading(action);
    setError(null);

    try {
      const result = await transitionTask(
        task.id,
        task.status,
        newStatus,
        user.id.toString(),
        userRole
      );

      if (result.success) {
        onStatusChange?.(newStatus);
        console.log(`任务状态已更新为: ${newStatus}`);
      } else {
        setError(result.error || '操作失败');
      }
    } catch (err) {
      setError('操作失败，请重试');
      console.error('操作失败:', err);
    } finally {
      setLoading(null);
    }
  };

  const getActionButton = (action: string, newStatus: TaskStatus, label: string, color: string) => {
    const canOperate = canOperateTask(task.status, userRole, action);
    const isLoading = loading === action;

    if (!canOperate) return null;

    return (
      <button
        key={action}
        onClick={() => handleAction(action, newStatus)}
        disabled={isLoading}
        style={{
          padding: '8px 16px',
          background: isLoading ? '#ccc' : color,
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          fontSize: 14,
          fontWeight: 600,
          cursor: isLoading ? 'not-allowed' : 'pointer',
          marginRight: 8,
          marginBottom: 8
        }}
      >
        {isLoading ? '处理中...' : label}
      </button>
    );
  };

  const actionButtons = [
    {
      action: 'assign',
      newStatus: 'assigned' as TaskStatus,
      label: '分配任务',
      color: '#3b82f6'
    },
    {
      action: 'accept',
      newStatus: 'accepted' as TaskStatus,
      label: '接受任务',
      color: '#10b981'
    },
    {
      action: 'start',
      newStatus: 'in_progress' as TaskStatus,
      label: '开始任务',
      color: '#f59e0b'
    },
    {
      action: 'complete',
      newStatus: 'completed' as TaskStatus,
      label: '完成任务',
      color: '#22c55e'
    },
    {
      action: 'confirm',
      newStatus: 'confirmed' as TaskStatus,
      label: '确认完成',
      color: '#059669'
    }
  ];

  return (
    <div className={className}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {actionButtons.map(({ action, newStatus, label, color }) =>
          getActionButton(action, newStatus, label, color)
        )}
      </div>
      
      {error && (
        <div style={{ 
          color: 'red', 
          fontSize: 14, 
          marginTop: 8,
          padding: 8,
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 4
        }}>
          {error}
        </div>
      )}
    </div>
  );
}; 