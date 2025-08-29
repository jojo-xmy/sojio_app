// components/TaskCalendar.tsx
"use client";
import React, { forwardRef } from 'react';
import { CustomTaskCalendar } from '@/components/CustomTaskCalendar';

interface TaskCalendarProps {
  className?: string;
  onDataRefresh?: () => void;
}

// 停用 react-big-calendar，统一转发到自定义日历（CustomTaskCalendar）
export const TaskCalendar = forwardRef<{ refreshData: () => void }, TaskCalendarProps>(
  ({ className, onDataRefresh }, ref) => {
    return <CustomTaskCalendar ref={ref} className={className} onDataRefresh={onDataRefresh} />;
  }
);

TaskCalendar.displayName = 'TaskCalendar';
