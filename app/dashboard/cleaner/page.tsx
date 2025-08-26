"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TaskCard } from '@/components/TaskCard';
import { TaskDetailPanel } from '@/components/TaskDetailPanel';
import { useUserStore } from '@/store/userStore';
import { getUserLatestAttendance, getAttendanceByTaskId, calculateTaskStatus } from '@/lib/attendance';
import { Task } from '@/types/task';
import { RoleSelector } from '@/components/RoleSelector';
import { getCalendarTasks } from '@/lib/calendar';

// 假设当前登录用户为 'Yamada Taro'，后续可从 userStore 获取
const currentUser = 'Yamada Taro';

export default function CleanerDashboard() {
  const user = useUserStore(s => s.user);
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tasksWithAttendance, setTasksWithAttendance] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const selectedTask = tasksWithAttendance.find(t => t.id === selectedId);

  // 加载所有任务的打卡状态
  useEffect(() => {
    loadAllAttendanceStatus();
  }, [user]);

  async function loadAllAttendanceStatus() {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // 从数据库加载任务数据
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1); // 获取过去一个月的数据
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1); // 获取未来一个月的数据
      
      const calendarEvents = await getCalendarTasks(startDate, endDate);
      
      // 过滤出分配给当前用户的任务
      const myTasks = calendarEvents.filter(event => 
        event.assignedCleaners?.some(cleaner => cleaner.name === currentUser)
      );
      
      // 转换为Task格式并加载打卡状态
      const tasksWithStatus = await Promise.all(
        myTasks.map(async (event) => {
          const task = event.task as any; // 使用any类型来访问数据库字段
          const latestStatus = await getUserLatestAttendance(task.id, user.id.toString());
          const attendanceRecords = await getAttendanceByTaskId(task.id);
          const taskStatus = calculateTaskStatus(attendanceRecords, event.assignedCleaners?.map(c => c.name) || []);
          
          return {
            id: task.id,
            hotelName: task.hotel_name || '',
            checkInTime: task.check_in_time || '',
            date: task.date,
            assignedCleaners: event.assignedCleaners?.map(c => c.name) || [],
            status: task.status,
            description: task.description || '',
            note: task.notes || '',
            images: task.images || [],
            attendanceStatus: latestStatus,
            acceptedBy: event.assignedCleaners?.map(c => c.name) || [],
            createdBy: task.created_by || '',
            createdAt: task.created_at || '',
            updatedAt: task.updated_at || '',
            hotelAddress: task.hotel_address || '',
            roomNumber: task.room_number || '',
            lockPassword: task.lock_password || '',
            specialInstructions: task.special_instructions || '',
            inventory: task.inventory || {
              towel: 0,
              soap: 0,
              shampoo: 0,
              conditioner: 0,
              toiletPaper: 0
            }
          } as Task;
        })
      );
      
      setTasksWithAttendance(tasksWithStatus);
      
      // 设置默认选中的任务
      if (tasksWithStatus.length > 0 && !selectedId) {
        setSelectedId(tasksWithStatus[0].id);
      }
    } catch (error) {
      console.error('加载任务数据失败:', error);
    } finally {
      setLoading(false);
    }
  }

  // 刷新打卡状态的回调函数
  function handleAttendanceUpdate() {
    loadAllAttendanceStatus();
  }

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto' }}>
      <RoleSelector showLogout={true} compactMode={false} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>我的清扫任务</h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            onClick={() => router.push('/dashboard/cleaner/availability')}
            style={{ 
              padding: '8px 20px', 
              background: '#10b981', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 6, 
              fontWeight: 600, 
              fontSize: 16, 
              cursor: 'pointer' 
            }}
          >
            可用性设置
          </button>
          <button 
            onClick={() => router.push('/dashboard/cleaner/tasks')}
            style={{ 
              padding: '8px 20px', 
              background: '#3b82f6', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 6, 
              fontWeight: 600, 
              fontSize: 16, 
              cursor: 'pointer' 
            }}
          >
            查看所有任务
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {loading ? (
          <div style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>加载中...</div>
        ) : (
          <>
            {tasksWithAttendance.map(task => (
              <TaskCard
                key={task.id}
                {...task}
                showDetail={false}
                onClick={() => setSelectedId(task.id)}
              />
            ))}
            {tasksWithAttendance.length === 0 && <div style={{ color: '#888' }}>暂无任务</div>}
          </>
        )}
      </div>
      {selectedTask && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>任务详情</h3>
          <TaskDetailPanel task={selectedTask} onAttendanceUpdate={handleAttendanceUpdate} />
        </div>
      )}
    </div>
  );
} 