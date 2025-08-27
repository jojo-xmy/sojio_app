// components/TaskCalendar.tsx
"use client";
import React from 'react';
import { CustomTaskCalendar } from '@/components/CustomTaskCalendar';

interface TaskCalendarProps {
  className?: string;
}

// 停用 react-big-calendar，统一转发到自定义日历（CustomTaskCalendar）
export function TaskCalendar({ className }: TaskCalendarProps) {
  return <CustomTaskCalendar className={className} />;
}
