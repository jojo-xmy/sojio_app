// components/TaskAssignmentModal.tsx
"use client";
import React, { useState } from 'react';
import { TaskCalendarEvent, AvailableCleaner } from '@/types/calendar';

interface TaskAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskCalendarEvent;
  availableCleaners: AvailableCleaner[];
  onAssign: (cleanerIds: string[], notes?: string) => Promise<void>;
}

export function TaskAssignmentModal({
  isOpen,
  onClose,
  task,
  availableCleaners,
  onAssign
}: TaskAssignmentModalProps) {
  console.log('TaskAssignmentModal - props:', { isOpen, task, availableCleaners });
  const [selectedCleaners, setSelectedCleaners] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleCleanerToggle = (cleanerId: string) => {
    setSelectedCleaners(prev => 
      prev.includes(cleanerId)
        ? prev.filter(id => id !== cleanerId)
        : [...prev, cleanerId]
    );
  };

  const handleSubmit = async () => {
    if (selectedCleaners.length === 0) {
      alert('请至少选择一个清洁员');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAssign(selectedCleaners, notes);
      setSelectedCleaners([]);
      setNotes('');
    } catch (error) {
      console.error('分配任务失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedCleaners([]);
    setNotes('');
    onClose();
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.5)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      zIndex: 1000 
    }}>
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: 8, 
        padding: 24, 
        width: '100%', 
        maxWidth: 640, 
        maxHeight: '90vh', 
        overflowY: 'auto' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>分配任务</h2>
          <button
            onClick={handleClose}
            style={{ 
              color: '#6b7280', 
              fontSize: 24, 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer' 
            }}
          >
            ×
          </button>
        </div>

        {/* 任务信息 */}
        <div style={{ marginBottom: 24, padding: 16, backgroundColor: '#f9fafb', borderRadius: 8 }}>
          <h3 style={{ fontWeight: 500, marginBottom: 8 }}>任务详情</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 14 }}>
            <div>
              <span style={{ color: '#6b7280' }}>酒店：</span>
              <span>{task.task.hotelName}</span>
            </div>
            <div>
              <span style={{ color: '#6b7280' }}>房间号：</span>
              <span>{task.task.roomNumber || '未指定'}</span>
            </div>
            <div>
              <span style={{ color: '#6b7280' }}>日期：</span>
              <span>{task.task.checkInDate || task.task.date}</span>
            </div>
            <div>
              <span style={{ color: '#6b7280' }}>时间：</span>
              <span>{task.task.checkInTime || '未指定'}</span>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <span style={{ color: '#6b7280' }}>描述：</span>
              <span>{task.task.description || task.task.note || '无'}</span>
            </div>
          </div>
        </div>

        {/* 可用清洁员列表 */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontWeight: 500, marginBottom: 12 }}>可用清洁员 ({availableCleaners.length})</h3>
          {(() => { 
            console.log('TaskAssignmentModal - availableCleaners:', availableCleaners);
            console.log('TaskAssignmentModal - availableCleaners.length:', availableCleaners.length);
            console.log('TaskAssignmentModal - availableCleaners[0]:', availableCleaners[0]);
            console.log('TaskAssignmentModal - 开始渲染清洁员列表');
            return null; 
          })()}
          {availableCleaners.length === 0 ? (
            <div style={{ color: '#6b7280', textAlign: 'center', padding: 16 }}>
              该日期没有可用的清洁员
            </div>
          ) : (
            <div style={{ maxHeight: 240, overflowY: 'auto' }}>
              {(() => {
                console.log('TaskAssignmentModal - 准备映射清洁员列表');
                return null;
              })()}
              {availableCleaners.map((cleaner, index) => {
                console.log(`TaskAssignmentModal - 渲染清洁员 ${index}:`, cleaner);
                const isSelected = selectedCleaners.includes(cleaner.id);
                return (
                  <div
                    key={cleaner.id}
                    onClick={() => handleCleanerToggle(cleaner.id)}
                    style={{ 
                      padding: 12,
                      border: `1px solid ${isSelected ? '#3b82f6' : '#d1d5db'}`,
                      borderRadius: 8,
                      cursor: 'pointer',
                      marginBottom: 8,
                      backgroundColor: isSelected ? '#dbeafe' : '#ffffff',
                      minHeight: 60,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleCleanerToggle(cleaner.id)}
                        style={{ width: 16, height: 16 }}
                      />
                      <div>
                        <div style={{ fontWeight: 500, marginBottom: 4 }}>{cleaner.name || '未知姓名'}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>
                          当前任务: {cleaner.currentTaskCount || 0}/{cleaner.maxTaskCapacity || 0}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: 12 }}>
                      {(cleaner.currentTaskCount || 0) < (cleaner.maxTaskCapacity || 0) ? (
                        <span style={{ color: '#059669' }}>可用</span>
                      ) : (
                        <span style={{ color: '#dc2626' }}>已满</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 备注 */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 8 }}>
            备注（可选）
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="添加分配备注..."
            style={{ 
              width: '100%', 
              padding: 8, 
              border: '1px solid #d1d5db', 
              borderRadius: 8, 
              resize: 'none',
              fontFamily: 'inherit'
            }}
            rows={3}
          />
        </div>

        {/* 操作按钮 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            style={{ 
              padding: '8px 16px', 
              color: '#4b5563', 
              backgroundColor: 'transparent',
              border: '1px solid #d1d5db', 
              borderRadius: 8, 
              cursor: isSubmitting ? 'not-allowed' : 'pointer' 
            }}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedCleaners.length === 0}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: (isSubmitting || selectedCleaners.length === 0) ? '#d1d5db' : '#2563eb', 
              color: 'white', 
              border: 'none', 
              borderRadius: 8, 
              cursor: (isSubmitting || selectedCleaners.length === 0) ? 'not-allowed' : 'pointer' 
            }}
          >
            {isSubmitting ? '分配中...' : '确认分配'}
          </button>
        </div>
      </div>
    </div>
  );
}
