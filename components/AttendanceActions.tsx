"use client";
import React from 'react';
import { Attendance, checkIn, checkOut } from '@/lib/attendance';
import { Button } from './Button';
import { Clock, CheckCircle2, LogOut as LogOutIcon } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface AttendanceActionsProps {
  taskId: string;
  userId: string;
  currentStatus: 'none' | 'checked_in' | 'checked_out';
  allAttendances: Attendance[]; // 用于展示自己的打卡时间
  loading: boolean;
  onLoadingChange: (loading: boolean) => void;
  onAfterUpdate: () => Promise<void> | void; // 更新后刷新
}

export const AttendanceActions: React.FC<AttendanceActionsProps> = ({
  taskId,
  userId,
  currentStatus,
  allAttendances,
  loading,
  onLoadingChange,
  onAfterUpdate
}) => {
  const { t, locale } = useTranslation('attendanceActions');
  const selfCheckIn = allAttendances.find(a => a.status === 'checked_in' && a.user_id === userId);
  const selfCheckOut = allAttendances.find(a => a.status === 'checked_out' && a.user_id === userId);

  async function handleCheckIn() {
    onLoadingChange(true);
    const ok = await checkIn(taskId, userId);
    if (ok) await onAfterUpdate();
    onLoadingChange(false);
  }

  async function handleCheckOut() {
    onLoadingChange(true);
    const ok = await checkOut(taskId, userId);
    if (ok) await onAfterUpdate();
    onLoadingChange(false);
  }

  if (currentStatus === 'none') {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 12,
        padding: '12px 16px',
        background: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      }}>
        <Button onClick={handleCheckIn} disabled={loading} variant="success" size="sm" className="responsive-text">
          {loading ? t('checking') : t('checkIn')}
        </Button>
        {selfCheckIn?.check_in_time && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6,
            fontSize: '14px',
            color: '#059669',
            fontWeight: 500
          }}>
            <CheckCircle2 size={16} />
            <span>{t('checkedIn')}{new Date(selfCheckIn.check_in_time).toLocaleString(locale === 'zh' ? 'zh-CN' : locale === 'ja' ? 'ja-JP' : 'en-US', { 
              month: '2-digit', 
              day: '2-digit', 
              hour: '2-digit', 
              minute: '2-digit' 
            })}</span>
          </div>
        )}
      </div>
    );
  }

  if (currentStatus === 'checked_in') {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        gap: 12,
        padding: '12px 16px',
        background: '#f0fdf4',
        borderRadius: '8px',
        border: '1px solid #bbf7d0'
      }}>
        {selfCheckIn?.check_in_time && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6,
            fontSize: '14px',
            color: '#059669',
            fontWeight: 500
          }}>
            <CheckCircle2 size={16} />
            <span>{t('checkedIn')}{new Date(selfCheckIn.check_in_time).toLocaleString(locale === 'zh' ? 'zh-CN' : locale === 'ja' ? 'ja-JP' : 'en-US', { 
              month: '2-digit', 
              day: '2-digit', 
              hour: '2-digit', 
              minute: '2-digit' 
            })}</span>
          </div>
        )}
        <Button onClick={handleCheckOut} disabled={loading} variant="primary" size="sm" className="responsive-text">
          {loading ? t('checking') : t('checkOut')}
        </Button>
      </div>
    );
  }

  // checked_out
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      gap: 8,
      padding: '12px 16px',
      background: '#eff6ff',
      borderRadius: '8px',
      border: '1px solid #bfdbfe'
    }}>
      {selfCheckIn?.check_in_time && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 6,
          fontSize: '14px',
          color: '#059669',
          fontWeight: 500
        }}>
          <CheckCircle2 size={16} />
            <span>{t('checkedIn')}{new Date(selfCheckIn.check_in_time).toLocaleString(locale === 'zh' ? 'zh-CN' : locale === 'ja' ? 'ja-JP' : 'en-US', { 
              month: '2-digit', 
              day: '2-digit', 
              hour: '2-digit', 
              minute: '2-digit' 
            })}</span>
          </div>
        )}
      {selfCheckOut?.check_out_time && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 6,
          fontSize: '14px',
          color: '#2563eb',
          fontWeight: 500
        }}>
          <LogOutIcon size={16} />
          <span>{t('checkedOut')}{new Date(selfCheckOut.check_out_time).toLocaleString(locale === 'zh' ? 'zh-CN' : locale === 'ja' ? 'ja-JP' : 'en-US', { 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit' 
          })}</span>
        </div>
      )}
    </div>
  );
};


