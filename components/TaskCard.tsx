"use client";
import React from 'react';

export interface TaskCardProps {
  id: string;
  hotelName: string;
  date: string;
  checkInTime: string;
  assignedCleaners: string[];
  status: string;
  description?: string;
  note?: string;
  images?: string[];
  showDetail?: boolean;
  onClick?: () => void;
  attendanceStatus?: 'none' | 'checked_in' | 'checked_out';
}

export const TaskCard: React.FC<TaskCardProps> = ({ id, hotelName, date, checkInTime, assignedCleaners, status, description, note, images, showDetail, onClick, attendanceStatus }) => {
  return (
    <div
      onClick={onClick}
      style={{
        border: '1px solid #eee',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: '0 1px 4px #f0f0f0',
        transition: 'box-shadow 0.2s',
        background: showDetail ? '#f9fafb' : '#fff',
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 18 }}>{hotelName}</div>
      <div style={{ color: '#888', fontSize: 14, margin: '4px 0 8px 0' }}>任务ID：{id}</div>
      <div style={{ fontSize: 14 }}>日期：{date}</div>
      <div style={{ fontSize: 14 }}>入住时间：{checkInTime}</div>
      <div style={{ fontSize: 14 }}>清扫人员：{assignedCleaners.join('，')}</div>
      <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span style={{
          display: 'inline-block',
          padding: '2px 10px',
          borderRadius: 12,
          background: status === '已完成' ? '#4ade80' : status === '进行中' ? '#facc15' : '#e5e7eb',
          color: status === '已完成' ? '#fff' : '#222',
          fontSize: 12,
          fontWeight: 500,
        }}>{status}</span>
        {attendanceStatus && (
          <span style={{
            display: 'inline-block',
            padding: '2px 10px',
            borderRadius: 12,
            background: attendanceStatus === 'checked_out' ? '#22c55e' : attendanceStatus === 'checked_in' ? '#f59e0b' : '#e5e7eb',
            color: attendanceStatus === 'checked_out' ? '#fff' : '#222',
            fontSize: 12,
            fontWeight: 500,
          }}>
            {attendanceStatus === 'checked_out' ? '已退勤' : attendanceStatus === 'checked_in' ? '已出勤' : '未打卡'}
          </span>
        )}
      </div>
      {showDetail && (
        <div style={{ marginTop: 16, borderTop: '1px dashed #ddd', paddingTop: 12 }}>
          {description && <div style={{ marginBottom: 8 }}><b>任务描述：</b>{description}</div>}
          {note && <div style={{ marginBottom: 8 }}><b>备注：</b>{note}</div>}
          {images && images.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {images.map((img, i) => (
                <img key={i} src={img} alt={`任务图片${i+1}`} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee' }} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 