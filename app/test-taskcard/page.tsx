import { TaskCard } from '@/components/TaskCard';

export default function TestTaskCardPage() {
  const mockTask = {
    id: '123',
    hotelName: 'Kyoto Villa',
    checkInTime: '15:00',
    date: '2025-06-09',
    assignedCleaners: ['Yamada Taro', 'Nguyen Linh'],
    status: 'assigned' as const,
  };

  return (
    <div style={{ maxWidth: 480, margin: '2rem auto' }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>TaskCard 组件测试</h2>
      <TaskCard {...mockTask} onClick={() => alert('点击了任务卡片！')} />
    </div>
  );
} 