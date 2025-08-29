"use client";
import React from 'react';
import { TaskStatusBadge } from './TaskStatusBadge';
import { Task, TaskStatus } from '@/types/task';
import { TaskCapabilities } from '@/lib/taskCapabilities';

export interface TaskCardProps {
  id: string;
  hotelName: string;
  date: string; // 保持兼容性，但优先使用具体日期字段
  checkInDate?: string;    // 入住日期
  checkInTime: string;
  checkOutDate?: string;   // 退房日期  
  cleaningDate?: string;   // 清扫日期
  assignedCleaners: string[];
  status: TaskStatus;
  description?: string;
  note?: string;
  images?: string[];
  showDetail?: boolean;
  // 视图与角色（新增，可选，仅用于后续显隐控制）
  viewerRole?: 'owner' | 'manager' | 'cleaner';
  viewMode?: 'list' | 'calendar' | 'detail';
  // 能力矩阵与插槽（可选）
  capabilities?: TaskCapabilities;
  renderBlocks?: Partial<Record<'attendanceSummary' | 'attendanceActions' | 'attachments' | 'notes' | 'acknowledgement' | 'assignmentAction' | 'taskAcceptance' | 'taskPublish' | 'taskEdit' | 'ownerMessage', React.ReactNode>>;
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
  checkInDate,
  checkInTime, 
  checkOutDate,
  cleaningDate,
  assignedCleaners, 
  status, 
  description, 
  note, 
  images, 
  showDetail, 
  capabilities,
  renderBlocks,
  onClick, 
  attendanceStatus,
  hotelAddress,
  roomNumber,
  lockPassword,
  acceptedBy,
  completedAt,
  confirmedAt,
  viewerRole,
  viewMode
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
      <div style={{ fontSize: 14, marginBottom: 4 }}>📅 入住日期：{checkInDate || date}</div>
      <div style={{ fontSize: 14, marginBottom: 4 }}>🕐 入住时间：{checkInTime}</div>
      {checkOutDate && (
        <div style={{ fontSize: 14, marginBottom: 4 }}>📤 退房日期：{checkOutDate}</div>
      )}
      <div style={{ fontSize: 14, marginBottom: 4 }}>🧹 清扫日期：{cleaningDate || checkOutDate || '未设置'}</div>
      
      {/* 清扫人员信息 */}
      <div style={{ fontSize: 14, marginBottom: 8 }}>
        👥 清扫人员：
        {!assignedCleaners || assignedCleaners.length === 0 ? (
          <span style={{ color: '#ef4444', fontWeight: 500 }}> 未分配</span>
        ) : (
          <>
            <span style={{ color: '#059669', fontWeight: 500 }}> {assignedCleaners.join('，')}</span>
            {status === 'assigned' && (
              <span style={{ color: '#f59e0b', fontSize: 12, marginLeft: 8 }}>
                （已分配，待接收）
              </span>
            )}
          </>
        )}
      </div>

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

      {/* 能力矩阵驱动的可插拔区块（仅在传入时显示；不改变默认渲染） */}
      {capabilities && renderBlocks && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {renderBlocks.ownerMessage}
          {capabilities.visibleBlocks.includes('taskEdit') && renderBlocks.taskEdit}
          {capabilities.visibleBlocks.includes('taskPublish') && renderBlocks.taskPublish}
          {capabilities.visibleBlocks.includes('assignmentAction') && renderBlocks.assignmentAction}
          {capabilities.visibleBlocks.includes('taskAcceptance') && renderBlocks.taskAcceptance}
          {capabilities.visibleBlocks.includes('attendanceSummary') && renderBlocks.attendanceSummary}
          {capabilities.visibleBlocks.includes('attendanceActions') && renderBlocks.attendanceActions}
          {capabilities.visibleBlocks.includes('attachments') && renderBlocks.attachments}
          {capabilities.visibleBlocks.includes('notes') && renderBlocks.notes}
          {capabilities.visibleBlocks.includes('acknowledgement') && renderBlocks.acknowledgement}
        </div>
      )}

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