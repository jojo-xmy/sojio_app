"use client";
import React from 'react';
import { Attendance, checkIn, checkOut } from '@/lib/attendance';

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
    const ok = await checkOut(taskId, userId);
    if (ok) await onAfterUpdate();
    onLoadingChange(false);
  }

  if (currentStatus === 'none') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={handleCheckIn} disabled={loading} style={{ padding: '6px 18px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          {loading ? '打卡中...' : '出勤打卡'}
        </button>
        {/* 清洁工可见：自己的打卡时间（无则不显示） */}
        {selfCheckIn?.check_in_time && (
          <span style={{ color: '#16a34a' }}>已出勤：{new Date(selfCheckIn.check_in_time).toLocaleString()}</span>
        )}
      </div>
    );
  }

  if (currentStatus === 'checked_in') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {selfCheckIn?.check_in_time && (
          <span style={{ color: '#16a34a' }}>已出勤：{new Date(selfCheckIn.check_in_time).toLocaleString()}</span>
        )}
        <button onClick={handleCheckOut} disabled={loading} style={{ padding: '6px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          {loading ? '打卡中...' : '退勤打卡'}
        </button>
      </div>
    );
  }

  // checked_out
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {selfCheckIn?.check_in_time && (
        <span style={{ color: '#16a34a' }}>已出勤：{new Date(selfCheckIn.check_in_time).toLocaleString()}</span>
      )}
      {selfCheckOut?.check_out_time && (
        <span style={{ color: '#2563eb' }}>已退勤：{new Date(selfCheckOut.check_out_time).toLocaleString()}</span>
      )}
    </div>
  );
};


