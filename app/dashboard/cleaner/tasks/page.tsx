"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/userStore';
import { useCleanerTasks } from '@/hooks/usePageRefresh';
import { TaskStatusBadge } from '@/components/TaskStatusBadge';
import { TaskActionButtons } from '@/components/TaskActionButtons';
import { TaskStatus } from '@/types/task';
import { supabase } from '@/lib/supabase';
import { getAttendanceByTaskId } from '@/lib/attendance';

export default function CleanerTasksPage() {
  const router = useRouter();
  const user = useUserStore(s => s.user);
  const { tasks, loading, refresh } = useCleanerTasks();
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, any[]>>({});

  useEffect(() => {
    console.log('CleanerTasksPage: 状态更新', { 
      loading, 
      tasksCount: tasks.length, 
      user: user?.id 
    });
  }, [loading, tasks, user]);

  // 加载考勤记录
  useEffect(() => {
    const loadAttendanceRecords = async () => {
      if (!tasks.length || !user) return;
      
      console.log('开始加载考勤记录，任务数量:', tasks.length, '用户ID:', user.id);
      const records: Record<string, any[]> = {};
      for (const taskAssignment of tasks) {
        const taskId = taskAssignment.task_id;
        if (taskId) {
          try {
            const attendance = await getAttendanceByTaskId(taskId);
            console.log(`任务 ${taskId} 的考勤记录:`, attendance);
            // 只保留当前用户的考勤记录（注意：使用 user_id 字段）
            records[taskId] = attendance.filter(record => record.user_id === user.id.toString());
            console.log(`任务 ${taskId} 当前用户的考勤记录:`, records[taskId]);
          } catch (error) {
            console.error(`获取任务 ${taskId} 考勤记录失败:`, error);
          }
        }
      }
      setAttendanceRecords(records);
    };

    loadAttendanceRecords();
  }, [tasks, user]);

  useEffect(() => {
    if (!user || user.role !== 'cleaner') {
      router.push('/dashboard');
      return;
    }
  }, [user, router]);

  // 订阅实时变更：与用户相关的任务、分配、任务状态
  useEffect(() => {
    if (!user || user.role !== 'cleaner') return;
    const channel = supabase
      .channel(`realtime-cleaner-tasks-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        refresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignments' }, (payload) => {
        // 分配变更也会触发
        refresh();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, refresh]);

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    // 触发全局刷新以获取最新数据
    refresh();
  };

  const getFilteredTasks = () => {
    if (filterStatus === 'all') {
      return tasks;
    }
    return tasks.filter(task => task.tasks?.status === filterStatus);
  };

  const getStatusCount = (status: TaskStatus) => {
    return tasks.filter(task => task.tasks?.status === status).length;
  };

  const getTaskPriority = (task: any) => {
    const taskData = task.tasks;
    if (!taskData) return 'normal';
    
    const dateStr = taskData.cleaning_date || taskData.check_out_date || taskData.check_in_date;
    if (!dateStr) return 'normal';
    
    const taskDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    taskDate.setHours(0, 0, 0, 0);
    
    const diffTime = taskDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'today';
    if (diffDays <= 2) return 'urgent';
    return 'normal';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'overdue': return 'border-red-500 bg-red-50';
      case 'today': return 'border-orange-500 bg-orange-50';
      case 'urgent': return 'border-yellow-500 bg-yellow-50';
      default: return 'border-gray-200 bg-white';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'overdue': return '已逾期';
      case 'today': return '今天';
      case 'urgent': return '紧急';
      default: return '';
    }
  };

  if (!user || user.role !== 'cleaner') {
    return <div className="p-6">无权访问此页面</div>;
  }

  const filteredTasks = getFilteredTasks();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">我的任务</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1 rounded text-sm ${
              filterStatus === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            全部 ({tasks.length})
          </button>
          <button
            onClick={() => setFilterStatus('assigned')}
            className={`px-3 py-1 rounded text-sm ${
              filterStatus === 'assigned' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            待接受 ({getStatusCount('assigned')})
          </button>
          <button
            onClick={() => setFilterStatus('accepted')}
            className={`px-3 py-1 rounded text-sm ${
              filterStatus === 'accepted' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            已接受 ({getStatusCount('accepted')})
          </button>
          <button
            onClick={() => setFilterStatus('in_progress')}
            className={`px-3 py-1 rounded text-sm ${
              filterStatus === 'in_progress' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            进行中 ({getStatusCount('in_progress')})
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-3 py-1 rounded text-sm ${
              filterStatus === 'completed' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            已完成 ({getStatusCount('completed')})
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">加载中...</div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            {filterStatus === 'all' ? '暂无任务' : `暂无${filterStatus}状态的任务`}
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredTasks.map((taskAssignment) => {
            const task = taskAssignment.tasks;
            const priority = getTaskPriority(taskAssignment);
            const priorityColor = getPriorityColor(priority);
            const priorityText = getPriorityText(priority);

            return (
              <div
                key={taskAssignment.id}
                className={`border rounded-lg p-6 ${priorityColor} hover:shadow-md transition-shadow`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {task.hotel_name}
                      </h3>
                      <TaskStatusBadge status={task.status} />
                      {priorityText && (
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          priority === 'overdue' ? 'bg-red-100 text-red-800' :
                          priority === 'today' ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {priorityText}
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">清扫日期:</span> {task.cleaning_date ? new Date(task.cleaning_date).toLocaleDateString() : '未设置'}
                      </div>
                      <div>
                        <span className="font-medium">门锁密码:</span> {task.lock_password || '未提供'}
                      </div>
                      <div>
                        <span className="font-medium">酒店地址:</span> {task.hotel_address || '未提供'}
                      </div>
                    </div>
                  </div>
                  
                </div>

                {/* 考勤记录 */}
                {(() => {
                  const taskId = taskAssignment.task_id;
                  const attendance = attendanceRecords[taskId] || [];
                  
                  // 找到出勤和退勤记录
                  const checkInRecord = attendance.find(record => record.status === 'checked_in' && record.check_in_time);
                  const checkOutRecord = attendance.find(record => record.status === 'checked_out' && record.check_out_time);
                  
                  return (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                            </svg>
                            <span className="text-xs font-medium text-green-800">出勤时间</span>
                          </div>
                          <div className="text-sm font-semibold text-green-900">
                            {checkInRecord?.check_in_time 
                              ? new Date(checkInRecord.check_in_time).toLocaleString('zh-CN', {
                                  month: 'numeric',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : '未出勤'}
                          </div>
                        </div>
                        
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span className="text-xs font-medium text-orange-800">退勤时间</span>
                          </div>
                          <div className="text-sm font-semibold text-orange-900">
                            {checkOutRecord?.check_out_time 
                              ? new Date(checkOutRecord.check_out_time).toLocaleString('zh-CN', {
                                  month: 'numeric',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : '未退勤'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 任务操作按钮 */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <TaskActionButtons
                    task={task}
                    onStatusChange={(newStatus) => handleStatusChange(taskAssignment.task_id, newStatus)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
