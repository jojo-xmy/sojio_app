"use client";
import React from 'react';
import { TaskStatusBadge } from './TaskStatusBadge';
import { Task, TaskStatus } from '@/types/task';
import { TaskCapabilities } from '@/lib/taskCapabilities';
import { MapPin, Calendar, Clock, LogOut, Users, Lock, CheckCircle, PartyPopper, Trophy, FileText } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

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
  renderBlocks?: Partial<Record<'attendanceSummary' | 'attendanceActions' | 'attachments' | 'notes' | 'acknowledgement' | 'assignmentAction' | 'taskAcceptance' | 'taskPublish' | 'taskEdit' | 'ownerMessage' | 'taskDescription' | 'managerActions' | 'cleanerNotes' | 'managerReport', React.ReactNode>>;
  onClick?: () => void;
  attendanceStatus?: 'none' | 'checked_in' | 'checked_out';
  // 新增字段
  hotelAddress?: string;
  lockPassword?: string;
  acceptedBy?: string[];
  completedAt?: string;
  confirmedAt?: string;
  guestCount?: number; // 添加入住人数字段
  isEditing?: boolean; // 是否处于编辑模式
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
  isEditing = false, 
  images, 
  showDetail, 
  capabilities,
  renderBlocks,
  onClick, 
  attendanceStatus,
  hotelAddress,
  lockPassword,
  acceptedBy,
  completedAt,
  confirmedAt,
  viewerRole,
  viewMode,
  guestCount
}) => {
  const { t, locale } = useTranslation('taskCard');
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
          <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>{hotelName}</div>
          {hotelAddress && (
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <MapPin size={16} color="#9ca3af" /> {hotelAddress}
            </div>
          )}
        </div>
        <TaskStatusBadge status={status} size="small" />
      </div>

      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 6,
        padding: '12px 0',
        borderTop: '1px solid #f3f4f6'
      }}>
        <div style={{ fontSize: 14, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={16} color="#6b7280" /> 
          <span style={{ fontWeight: 500 }}>{t('fields.checkInDate')}</span>
          <span>{checkInDate || date}</span>
        </div>
        {checkOutDate && (
          <div style={{ fontSize: 14, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
            <LogOut size={16} color="#6b7280" /> 
            <span style={{ fontWeight: 500 }}>{t('fields.checkOutDate')}</span>
            <span>{checkOutDate}</span>
          </div>
        )}
        {guestCount !== undefined && (
          <div style={{ fontSize: 14, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={16} color="#6b7280" /> 
            <span style={{ fontWeight: 500 }}>{t('fields.guestCount')}</span>
            <span>{guestCount}</span>
          </div>
        )}
        <div style={{ fontSize: 14, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={16} color="#6b7280" /> 
          <span style={{ fontWeight: 500 }}>{t('fields.cleaningDate')}</span>
          <span>{cleaningDate || checkOutDate || t('fields.cleaningDateUnset')}</span>
        </div>
      </div>
      
      {/* 清扫人员信息 */}
      <div style={{ 
        fontSize: 14, 
        marginBottom: 8, 
        display: 'flex', 
        alignItems: 'center', 
        gap: 8,
        paddingTop: 12,
        color: '#374151'
      }}>
        <Users size={16} color="#6b7280" /> 
        <span style={{ fontWeight: 500 }}>{t('crew.label')}</span>
        {!assignedCleaners || assignedCleaners.length === 0 ? (
          <span style={{ color: '#ef4444', fontWeight: 500 }}>{t('crew.unassigned')}</span>
        ) : (
          <>
            <span style={{ color: '#059669', fontWeight: 500 }}>{assignedCleaners.join(', ')}</span>
            {status === 'assigned' && (
              <span style={{ color: '#f59e0b', fontSize: 12, marginLeft: 4 }}>
                {t('crew.assignedPending')}
              </span>
            )}
          </>
        )}
      </div>

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
            {attendanceStatus === 'checked_out'
              ? t('attendance.checkedOut')
              : attendanceStatus === 'checked_in'
              ? t('attendance.checkedIn')
              : t('attendance.none')}
          </span>
        )}

        {/* 接受状态 */}
        {acceptedBy && acceptedBy.length > 0 && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 10px',
            borderRadius: 12,
            background: '#10b981',
            color: '#fff',
            fontSize: 12,
            fontWeight: 500,
          }}>
            <CheckCircle size={12} />
            {t('badges.accepted')} ({acceptedBy.length}/{assignedCleaners.length})
          </span>
        )}

        {/* 完成时间 */}
        {completedAt && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 10px',
            borderRadius: 12,
            background: '#22c55e',
            color: '#fff',
            fontSize: 12,
            fontWeight: 500,
          }}>
            <PartyPopper size={12} />
            {t('badges.completedAt')} {new Date(completedAt).toLocaleString(locale === 'zh' ? 'zh-CN' : locale === 'ja' ? 'ja-JP' : 'en-US')}
          </span>
        )}

        {/* 确认时间 */}
        {confirmedAt && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 10px',
            borderRadius: 12,
            background: '#059669',
            color: '#fff',
            fontSize: 12,
            fontWeight: 500,
          }}>
            <Trophy size={12} />
            {t('badges.confirmedAt')} {new Date(confirmedAt).toLocaleString(locale === 'zh' ? 'zh-CN' : locale === 'ja' ? 'ja-JP' : 'en-US')}
          </span>
        )}
      </div>

      {/* 能力矩阵驱动的可插拔区块 - 按照新的顺序显示 */}
      {capabilities && renderBlocks && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* 1. 房东备注 */}
          {renderBlocks.ownerMessage}
          
          {/* 2. 任务描述（Manager编辑） */}
          {renderBlocks.taskDescription}
          
          {/* 3. 门锁密码 */}
          {lockPassword && viewerRole !== 'owner' && !isEditing && (
            <div style={{ 
              padding: '12px 16px',
              background: 'var(--success)',
              color: 'var(--success-foreground)',
              borderRadius: 'var(--radius)',
              display: 'flex', 
              alignItems: 'center', 
              gap: 10,
              fontSize: '14px',
              fontWeight: 500,
              boxShadow: '0 1px 3px rgba(0, 122, 90, 0.2)'
            }}>
              <Lock size={18} /> 
              <span>{t('extras.lockPassword')}</span>
              <span style={{ fontWeight: 700, letterSpacing: '2px', fontSize: '16px' }}>{lockPassword}</span>
            </div>
          )}
          
          {/* 4. Manager操作按钮 */}
          {renderBlocks.managerActions}
          
          {/* 5. 出勤状态 */}
          {capabilities.visibleBlocks.includes('attendanceSummary') && renderBlocks.attendanceSummary}
          {capabilities.visibleBlocks.includes('attendanceActions') && renderBlocks.attendanceActions}
          
          {/* 6. 清洁工备注和图片 */}
          {capabilities.visibleBlocks.includes('cleanerNotes') && renderBlocks.cleanerNotes}
          {capabilities.visibleBlocks.includes('attachments') && renderBlocks.attachments}
          
          {/* 7. Manager确认报告 */}
          {capabilities.visibleBlocks.includes('managerReport') && renderBlocks.managerReport}
          
          {/* 其他可选区块 */}
          {capabilities.visibleBlocks.includes('taskAcceptance') && renderBlocks.taskAcceptance}
          {capabilities.visibleBlocks.includes('notes') && renderBlocks.notes}
          {capabilities.visibleBlocks.includes('acknowledgement') && renderBlocks.acknowledgement}
        </div>
      )}

      {showDetail && (
        <div style={{ marginTop: 16, borderTop: '1px dashed #ddd', paddingTop: 12 }}>
          {note && (
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <FileText size={14} style={{ marginTop: 2, flexShrink: 0 }} />
              <div><strong>{t('extras.note')}</strong>{note}</div>
            </div>
          )}
          {images && images.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <strong style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Calendar size={14} />
                {t('extras.images')}
              </strong>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                {images.map((img, i) => (
                  <img 
                    key={i} 
                    src={img} 
                    alt={`${t('extras.imageAlt')} ${i+1}`} 
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