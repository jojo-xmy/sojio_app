"use client";
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { TaskDetailPanel } from '@/components/TaskDetailPanel';
import { Task } from '@/types/task';
import { getTaskWithAssignments } from '@/lib/calendar';

export default function TaskDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTask() {
      if (!id) return;
      
      try {
        setLoading(true);
        const calendarEvent = await getTaskWithAssignments(id);
        
        if (calendarEvent) {
          // 转换为Task格式
          const taskData = calendarEvent.task as any;
          const taskObj: Task = {
            id: taskData.id,
            hotelName: taskData.hotel_name || '',
            checkInTime: taskData.check_in_time || '',
            date: taskData.date,
            assignedCleaners: calendarEvent.assignedCleaners?.map(c => c.name) || [],
            status: taskData.status,
            description: taskData.description || '',
            note: taskData.notes || '',
            images: taskData.images || [],
            acceptedBy: calendarEvent.assignedCleaners?.map(c => c.name) || [],
            createdBy: taskData.created_by || '',
            createdAt: taskData.created_at || '',
            updatedAt: taskData.updated_at || '',
            hotelAddress: taskData.hotel_address || '',
            roomNumber: taskData.room_number || '',
            lockPassword: taskData.lock_password || '',
            specialInstructions: taskData.special_instructions || '',
            inventory: taskData.inventory || {
              towel: 0,
              soap: 0,
              shampoo: 0,
              conditioner: 0,
              toiletPaper: 0
            }
          };
          setTask(taskObj);
        } else {
          setError('未找到该任务');
        }
      } catch (err) {
        console.error('加载任务失败:', err);
        setError('加载任务失败');
      } finally {
        setLoading(false);
      }
    }

    loadTask();
  }, [id]);

  if (loading) {
    return <div style={{ maxWidth: 600, margin: '2rem auto', textAlign: 'center' }}>加载中...</div>;
  }

  if (error || !task) {
    return <div style={{ maxWidth: 600, margin: '2rem auto', color: 'red' }}>{error || '未找到该任务'}</div>;
  }

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto' }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>任务详情</h2>
      <TaskDetailPanel task={task} />
    </div>
  );
} 