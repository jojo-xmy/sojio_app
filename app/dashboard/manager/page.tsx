// app/dashboard/manager/page.tsx
"use client";
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/userStore';
import { TaskCreateForm } from '@/components/TaskCreateForm';
import { RoleSelector } from '@/components/RoleSelector';
import { CustomTaskCalendar } from '@/components/CustomTaskCalendar';
import { TaskCard } from '@/components/TaskCard';
import { TaskDetailPanel } from '@/components/TaskDetailPanel';
import { getCalendarTasks } from '@/lib/calendar';
import { getAttendanceByTaskId, calculateTaskStatus } from '@/lib/attendance';
import { Task } from '@/types/task';
import { TaskCalendarEvent } from '@/types/calendar';

export default function ManagerDashboard() {
  const router = useRouter();
  const user = useUserStore(s => s.user);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [tasksWithAttendance, setTasksWithAttendance] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // 加载所有任务的打卡状态
  const loadAllAttendanceStatus = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // 从数据库加载任务数据
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1); // 获取过去一个月的数据
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1); // 获取未来一个月的数据
      
      const calendarEvents = await getCalendarTasks(startDate, endDate);
      
      // 转换为Task格式并加载打卡状态
      const tasksWithStatus = await Promise.all(
        calendarEvents.map(async (event: TaskCalendarEvent) => {
          const task = event.task as any; // 使用any类型来访问数据库字段
          const attendanceRecords = await getAttendanceByTaskId(task.id);
          const taskStatus = calculateTaskStatus(attendanceRecords, event.assignedCleaners?.map(c => c.name) || []);
          
          // 计算总体打卡状态：如果有任何人已退勤，显示"已退勤"；如果有任何人已出勤，显示"已出勤"；否则显示"未打卡"
          let overallStatus: 'none' | 'checked_in' | 'checked_out' = 'none';
          const hasCheckedOut = attendanceRecords.some(record => record.status === 'checked_out');
          const hasCheckedIn = attendanceRecords.some(record => record.status === 'checked_in');
          
          if (hasCheckedOut) {
            overallStatus = 'checked_out';
          } else if (hasCheckedIn) {
            overallStatus = 'checked_in';
          }
          
          return {
            id: task.id,
            hotelName: task.hotel_name || '',
            checkInDate: task.check_in_date || '',
            checkInTime: task.check_in_time || '',
            checkOutDate: task.check_out_date || '',
            assignedCleaners: event.assignedCleaners?.map(c => c.name) || [],
            status: task.status,
            description: task.description || '',
            note: task.notes || '',
            images: task.images || [],
            attendanceStatus: overallStatus,
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
            },
            // 保持兼容性
            date: task.check_in_date || ''
          } as Task;
        })
      );
      
      setTasksWithAttendance(tasksWithStatus);
    } catch (error) {
      console.error('加载任务数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 刷新打卡状态的回调函数
  const handleAttendanceUpdate = useCallback(() => {
    loadAllAttendanceStatus();
  }, [loadAllAttendanceStatus]);

  // 初始化加载
  useEffect(() => {
    loadAllAttendanceStatus();
  }, [loadAllAttendanceStatus]);

  return (
    <div style={{ maxWidth: 1200, margin: '2rem auto', padding: '0 1rem' }}>
      <RoleSelector showLogout={true} compactMode={false} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>任务管理</h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
            style={{ 
              padding: '8px 20px', 
              background: '#6b7280', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 6, 
              fontWeight: 600, 
              fontSize: 16, 
              cursor: 'pointer' 
            }}
          >
            {viewMode === 'list' ? '日历视图' : '列表视图'}
          </button>
          <button 
            onClick={() => router.push('/admin/registration-applications')}
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
            审核申请
          </button>
          <button 
            onClick={() => setShowCreateForm(true)}
            style={{ 
              padding: '8px 20px', 
              background: '#2563eb', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 6, 
              fontWeight: 600, 
              fontSize: 16, 
              cursor: 'pointer' 
            }}
          >
            新建任务
          </button>
        </div>
      </div>
      {viewMode === 'calendar' ? (
        <CustomTaskCalendar className="w-full" />
      ) : (
        <div style={{ display: 'flex', gap: 24 }}>
          {/* 任务列表 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {loading ? (
              <div style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>加载中...</div>
            ) : (
              <>
                {tasksWithAttendance.map(task => (
                  <TaskCard 
                    key={task.id} 
                    {...task} 
                    showDetail={false} 
                    onClick={() => setSelectedTask(task)} 
                  />
                ))}
                {tasksWithAttendance.length === 0 && <div style={{ color: '#888' }}>暂无任务</div>}
              </>
            )}
          </div>

          {/* 任务详情面板 */}
          {selectedTask && (
            <div style={{ flex: 1 }}>
              <TaskDetailPanel 
                task={selectedTask} 
                onAttendanceUpdate={handleAttendanceUpdate}
              />
            </div>
          )}
        </div>
      )}
      
      <TaskCreateForm 
        isOpen={showCreateForm} 
        onClose={() => setShowCreateForm(false)}
        onTaskCreated={() => {
          // 刷新任务列表，从数据库获取最新数据
          console.log('任务创建成功，需要刷新列表');
          loadAllAttendanceStatus();
        }}
      />
    </div>
  );
} 