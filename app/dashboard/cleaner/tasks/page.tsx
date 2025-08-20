"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/userStore';
import { getCleanerTasks } from '@/lib/hotelManagement';
import { TaskStatusBadge } from '@/components/TaskStatusBadge';
import { TaskActionButtons } from '@/components/TaskActionButtons';
import { TaskStatus } from '@/types/task';

export default function CleanerTasksPage() {
  const router = useRouter();
  const user = useUserStore(s => s.user);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');

  useEffect(() => {
    if (!user || user.role !== 'cleaner') {
      router.push('/dashboard');
      return;
    }
    loadTasks();
  }, [user, router]);

  const loadTasks = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const taskList = await getCleanerTasks(user.id.toString());
      setTasks(taskList);
    } catch (err) {
      setError('加载任务列表失败');
      console.error('加载任务列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(task => 
      task.task_id === taskId 
        ? { ...task, tasks: { ...task.tasks, status: newStatus } }
        : task
    ));
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
    const taskDate = new Date(task.tasks?.date);
    const today = new Date();
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
                        <span className="font-medium">日期:</span> {new Date(task.date).toLocaleDateString()}
                      </div>
                      <div>
                        <span className="font-medium">房间号:</span> {task.room_number || '未指定'}
                      </div>
                      <div>
                        <span className="font-medium">门锁密码:</span> {task.lock_password || '未提供'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    分配时间: {new Date(taskAssignment.assigned_at).toLocaleString()}
                  </div>
                </div>

                {task.description && (
                  <div className="mb-4">
                    <span className="text-sm font-medium text-gray-700">任务描述:</span>
                    <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                  </div>
                )}

                {task.note && (
                  <div className="mb-4">
                    <span className="text-sm font-medium text-gray-700">备注:</span>
                    <p className="text-sm text-gray-600 mt-1">{task.note}</p>
                  </div>
                )}

                {taskAssignment.notes && (
                  <div className="mb-4">
                    <span className="text-sm font-medium text-gray-700">分配备注:</span>
                    <p className="text-sm text-gray-600 mt-1">{taskAssignment.notes}</p>
                  </div>
                )}

                {task.hotel_address && (
                  <div className="mb-4">
                    <span className="text-sm font-medium text-gray-700">地址:</span>
                    <p className="text-sm text-gray-600 mt-1">📍 {task.hotel_address}</p>
                  </div>
                )}

                {task.special_instructions && (
                  <div className="mb-4">
                    <span className="text-sm font-medium text-gray-700">特殊说明:</span>
                    <p className="text-sm text-gray-600 mt-1">{task.special_instructions}</p>
                  </div>
                )}

                {/* 任务操作按钮 */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <TaskActionButtons
                    task={task}
                    onStatusChange={(newStatus) => handleStatusChange(taskAssignment.task_id, newStatus)}
                  />
                </div>

                {/* 任务进度 */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>任务进度</span>
                    <span>{Math.round((task.status === 'draft' ? 0 : 
                      task.status === 'open' ? 10 :
                      task.status === 'assigned' ? 30 :
                      task.status === 'accepted' ? 50 :
                      task.status === 'in_progress' ? 70 :
                      task.status === 'completed' ? 90 : 100))}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${task.status === 'draft' ? 0 : 
                          task.status === 'open' ? 10 :
                          task.status === 'assigned' ? 30 :
                          task.status === 'accepted' ? 50 :
                          task.status === 'in_progress' ? 70 :
                          task.status === 'completed' ? 90 : 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
