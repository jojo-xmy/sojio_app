"use client";
import React from 'react';
import { Attendance, checkIn, checkOut } from '@/lib/attendance';
import { updateCleanerNotes } from '@/lib/tasks';
import { Button } from './Button';
import { Clock, CheckCircle2, LogOut as LogOutIcon } from 'lucide-react';

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
    // 退勤前收集清洁员备注
    let ok = true;
    try {
      const note = window.prompt('退勤备注（可选）：');
      if (note !== null) {
        const res = await updateCleanerNotes(taskId, note.trim());
        if (!res.success) {
          console.error('保存清洁员备注失败:', res.error);
        }
      }
    } catch (e) {
      console.error('收集或保存退勤备注失败:', e);
    }
    ok = ok && await checkOut(taskId, userId);
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
          {loading ? '打卡中...' : '出勤打卡'}
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
            <span>已出勤：{new Date(selfCheckIn.check_in_time).toLocaleString('zh-CN', { 
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
            <span>已出勤：{new Date(selfCheckIn.check_in_time).toLocaleString('zh-CN', { 
              month: '2-digit', 
              day: '2-digit', 
              hour: '2-digit', 
              minute: '2-digit' 
            })}</span>
          </div>
        )}
        <Button onClick={handleCheckOut} disabled={loading} variant="primary" size="sm" className="responsive-text">
          {loading ? '打卡中...' : '退勤打卡'}
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
          <span>已出勤：{new Date(selfCheckIn.check_in_time).toLocaleString('zh-CN', { 
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
          <span>已退勤：{new Date(selfCheckOut.check_out_time).toLocaleString('zh-CN', { 
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


