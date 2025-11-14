"use client";
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Task } from '@/types/task';

interface CleaningCompletionFormProps {
  task: Task;
  onSubmitSuccess?: () => void;
  isCheckedOut?: boolean; // 是否已退勤
}

export const CleaningCompletionForm: React.FC<CleaningCompletionFormProps> = ({
  task,
  onSubmitSuccess,
  isCheckedOut = false
}) => {
  const [notes, setNotes] = useState(task.cleanerNotes || '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          cleaner_notes: notes.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);

      if (error) throw error;

      onSubmitSuccess?.();
    } catch (error) {
      console.error('提交失败:', error);
      alert('提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const hasChanges = notes !== (task.cleanerNotes || '');

  // 已退勤：只读模式
  if (isCheckedOut) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-sm font-semibold text-blue-900">清扫备注</h3>
          <span className="ml-auto text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">已提交</span>
        </div>
        {task.cleanerNotes ? (
          <div className="text-sm text-blue-800 whitespace-pre-wrap pl-7">
            {task.cleanerNotes}
          </div>
        ) : (
          <div className="text-sm text-blue-600 italic pl-7">
            未填写备注
          </div>
        )}
      </div>
    );
  }

  // 工作中：可编辑模式
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="text-sm font-semibold text-gray-900">清扫备注（可选）</h3>
      </div>
      
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="请输入清扫过程中的备注信息（可选）..."
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none mb-3"
        rows={4}
      />

      <button
        onClick={handleSubmit}
        disabled={submitting || !hasChanges}
        className={`w-full py-2 rounded-lg text-sm font-semibold transition-all ${
          submitting || !hasChanges
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
        }`}
      >
        {submitting ? '保存中...' : hasChanges ? '保存备注' : task.cleanerNotes ? '已保存' : '暂不填写'}
      </button>
    </div>
  );
};
