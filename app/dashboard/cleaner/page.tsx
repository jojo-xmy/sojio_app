"use client";

import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { useUserStore } from '@/store/userStore';
import { DashboardHeader } from '@/components/DashboardHeader';
import { HeaderButton } from '@/components/HeaderButton';
import { TaskCalendar } from '@/components/TaskCalendar';
import { useTranslation } from '@/hooks/useTranslation';



export default function CleanerDashboard() {
  const user = useUserStore(s => s.user);
  const router = useRouter();
  const calendarRef = useRef<{ refreshData: () => void }>(null);
  const { t } = useTranslation('dashboard.cleaner');

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <DashboardHeader 
        title={t('title')}
        actions={
          <>
            <HeaderButton 
              onClick={() => router.push('/dashboard/cleaner/availability')}
              variant="success"
            >
              {t('actions.availability')}
            </HeaderButton>
            <HeaderButton 
              onClick={() => router.push('/dashboard/cleaner/tasks')}
              variant="primary"
            >
              {t('actions.viewAllTasks')}
            </HeaderButton>
          </>
        }
      />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1rem' }}>
        {/* 日历视图（内部已包含右侧任务详情面板） */}
        <TaskCalendar 
          ref={calendarRef}
          className="w-full" 
          onDataRefresh={() => {
            console.log('清洁员日历数据已刷新');
          }}
        />
      </div>
    </div>
  );
} 