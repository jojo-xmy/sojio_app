"use client";
import { useParams } from 'next/navigation';
import { tasks } from '@/data/tasks';
import { TaskDetailPanel } from '@/components/TaskDetailPanel';

export default function TaskDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const task = tasks.find(t => t.id === id);

  if (!task) {
    return <div style={{ maxWidth: 600, margin: '2rem auto', color: 'red' }}>未找到该任务</div>;
  }

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto' }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>任务详情</h2>
      <TaskDetailPanel task={task} />
    </div>
  );
} 