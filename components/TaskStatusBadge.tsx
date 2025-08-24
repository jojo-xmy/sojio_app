"use client";
import { TaskStatus, TASK_STATUS_DISPLAY, TASK_STATUS_COLOR } from '@/types/task';
import { getStatusIcon } from '@/lib/taskStatus';

interface TaskStatusBadgeProps {
  status: TaskStatus;
  showIcon?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const TaskStatusBadge: React.FC<TaskStatusBadgeProps> = ({
  status,
  showIcon = true,
  size = 'medium',
  className = ''
}) => {
  const displayName = TASK_STATUS_DISPLAY[status];
  const color = TASK_STATUS_COLOR[status];
  const icon = getStatusIcon(status);

  const sizeClasses = {
    small: 'px-1 py-0.5 text-[9px]',
    medium: 'px-3 py-1.5 text-sm',
    large: 'px-4 py-2 text-base'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}40`
      }}
    >
      {showIcon && <span>{icon}</span>}
      <span>{displayName}</span>
    </span>
  );
}; 