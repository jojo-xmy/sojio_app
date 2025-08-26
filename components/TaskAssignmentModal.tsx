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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">分配任务</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* 任务信息 */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-2">任务详情</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">酒店：</span>
              <span>{(task.task as any).hotel_name || task.task.hotelName}</span>
            </div>
            <div>
              <span className="text-gray-600">房间号：</span>
              <span>{(task.task as any).room_number || task.task.roomNumber || '未指定'}</span>
            </div>
            <div>
              <span className="text-gray-600">日期：</span>
              <span>{task.task.checkInDate || task.task.date}</span>
            </div>
            <div>
              <span className="text-gray-600">时间：</span>
              <span>{(task.task as any).check_in_time || task.task.checkInTime || '未指定'}</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-600">描述：</span>
              <span>{task.task.description || task.task.note || '无'}</span>
            </div>
          </div>
        </div>

        {/* 可用清洁员列表 */}
        <div className="mb-6">
          <h3 className="font-medium mb-3">可用清洁员 ({availableCleaners.length})</h3>
          {(() => { 
            console.log('TaskAssignmentModal - availableCleaners:', availableCleaners);
            console.log('TaskAssignmentModal - availableCleaners.length:', availableCleaners.length);
            console.log('TaskAssignmentModal - availableCleaners[0]:', availableCleaners[0]);
            return null; 
          })()}
          {availableCleaners.length === 0 ? (
            <div className="text-gray-500 text-center py-4">
              该日期没有可用的清洁员
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableCleaners.map(cleaner => (
                <div
                  key={cleaner.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedCleaners.includes(cleaner.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleCleanerToggle(cleaner.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedCleaners.includes(cleaner.id)}
                        onChange={() => handleCleanerToggle(cleaner.id)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div>
                        <div className="font-medium">{cleaner.name}</div>
                        <div className="text-sm text-gray-600">
                          当前任务: {cleaner.currentTaskCount}/{cleaner.maxTaskCapacity}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {cleaner.currentTaskCount < cleaner.maxTaskCapacity ? (
                        <span className="text-green-600">可用</span>
                      ) : (
                        <span className="text-red-600">已满</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 备注 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            备注（可选）
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg resize-none"
            rows={3}
            placeholder="添加分配备注..."
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={isSubmitting}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedCleaners.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '分配中...' : '确认分配'}
          </button>
        </div>
      </div>
    </div>
  );
}
