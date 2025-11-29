"use client";
import { TaskStatus, TASK_STATUS_DISPLAY, TASK_STATUS_COLOR } from '@/types/task';
import { FileEdit, Clock, Users, CheckCircle, Loader, CheckCircle2, Award, HelpCircle } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface TaskStatusBadgeProps {
  status: TaskStatus;
  showIcon?: boolean;
  iconOnly?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const statusIcons = {
  draft: FileEdit,
  open: Clock,
  assigned: Users,
  accepted: CheckCircle,
  in_progress: Loader,
  completed: CheckCircle2,
  confirmed: Award
};

export const TaskStatusBadge: React.FC<TaskStatusBadgeProps> = ({
  status,
  showIcon = true,
  iconOnly = false,
  size = 'medium',
  className = ''
}) => {
  const { t } = useTranslation('taskStatus');
  const displayName = t(status, TASK_STATUS_DISPLAY[status]);
  const color = TASK_STATUS_COLOR[status];
  const IconComponent = statusIcons[status] || HelpCircle;

  const sizeClasses = {
    small: iconOnly ? 'p-0.5' : 'px-1 py-0.5 text-[9px]',
    medium: iconOnly ? 'p-1' : 'px-3 py-1.5 text-sm',
    large: iconOnly ? 'p-1.5' : 'px-4 py-2 text-base'
  };

  const iconSizes = {
    small: 10,
    medium: 14,
    large: 16
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}40`
      }}
      title={iconOnly ? displayName : undefined}
    >
      {showIcon && <IconComponent size={iconSizes[size]} />}
      {!iconOnly && <span>{displayName}</span>}
    </span>
  );
}; 