"use client";
import React from 'react';
import { TaskStatusBadge } from './TaskStatusBadge';
import { Task, TaskStatus } from '@/types/task';

export interface TaskCardProps {
  id: string;
  hotelName: string;
  date: string;
  checkInTime: string;
  assignedCleaners: string[];
  status: TaskStatus;
  description?: string;
  note?: string;
  images?: string[];
  showDetail?: boolean;
  onClick?: () => void;
  attendanceStatus?: 'none' | 'checked_in' | 'checked_out';
  // 新增字段
  hotelAddress?: string;
  roomNumber?: string;
  lockPassword?: string;
  acceptedBy?: string[];
  completedAt?: string;
  confirmedAt?: string;
}

export const TaskCard: React.FC<TaskCardProps> = ({ 
  id, 
  hotelName, 
  date, 
  checkInTime, 
  assignedCleaners, 
  status, 
  description, 
  note, 
  images, 
  showDetail, 
  onClick, 
  attendanceStatus,
  hotelAddress,
  roomNumber,
  lockPassword,
  acceptedBy,
  completedAt,
  confirmedAt
}) => {
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 4 }}>{hotelName}</div>
          {roomNumber && (
            <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
              房间：{roomNumber}
            </div>
          )}
          {hotelAddress && (
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
              📍 {hotelAddress}
            </div>
          )}
        </div>
        <TaskStatusBadge status={status} size="small" />
      </div>

      <div style={{ color: '#888', fontSize: 14, marginBottom: 8 }}>任务ID：{id}</div>
      <div style={{ fontSize: 14, marginBottom: 4 }}>📅 日期：{date}</div>
      <div style={{ fontSize: 14, marginBottom: 4 }}>🕐 入住时间：{checkInTime}</div>
      <div style={{ fontSize: 14, marginBottom: 8 }}>👥 清扫人员：{assignedCleaners.join('，')}</div>

      {/* 门锁密码 */}
      {lockPassword && (
        <div style={{ fontSize: 14, marginBottom: 8, color: '#059669', fontWeight: 500 }}>
          🔐 门锁密码：{lockPassword}
        </div>
      )}

      {/* 状态信息 */}
      <div style={{ marginBottom: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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

        {/* 接受状态 */}
        {acceptedBy && acceptedBy.length > 0 && (
          <span style={{
            display: 'inline-block',
            padding: '2px 10px',
            borderRadius: 12,
            background: '#10b981',
            color: '#fff',
            fontSize: 12,
            fontWeight: 500,
          }}>
            ✅ 已接受 ({acceptedBy.length}/{assignedCleaners.length})
          </span>
        )}

        {/* 完成时间 */}
        {completedAt && (
          <span style={{
            display: 'inline-block',
            padding: '2px 10px',
            borderRadius: 12,
            background: '#22c55e',
            color: '#fff',
            fontSize: 12,
            fontWeight: 500,
          }}>
            🎉 完成于 {new Date(completedAt).toLocaleString()}
          </span>
        )}

        {/* 确认时间 */}
        {confirmedAt && (
          <span style={{
            display: 'inline-block',
            padding: '2px 10px',
            borderRadius: 12,
            background: '#059669',
            color: '#fff',
            fontSize: 12,
            fontWeight: 500,
          }}>
            🏆 确认于 {new Date(confirmedAt).toLocaleString()}
          </span>
        )}
      </div>

      {showDetail && (
        <div style={{ marginTop: 16, borderTop: '1px dashed #ddd', paddingTop: 12 }}>
          {description && (
            <div style={{ marginBottom: 8 }}>
              <strong>📋 任务描述：</strong>{description}
            </div>
          )}
          {note && (
            <div style={{ marginBottom: 8 }}>
              <strong>📝 备注：</strong>{note}
            </div>
          )}
          {images && images.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <strong>📸 任务图片：</strong>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                {images.map((img, i) => (
                  <img 
                    key={i} 
                    src={img} 
                    alt={`任务图片${i+1}`} 
                    style={{ 
                      width: 80, 
                      height: 80, 
                      objectFit: 'cover', 
                      borderRadius: 6, 
                      border: '1px solid #eee' 
                    }} 
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 