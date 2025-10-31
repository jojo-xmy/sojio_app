// app/dashboard/manager/schedule/page.tsx
"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/userStore';
import { 
  getTaskScheduleView, 
  getAvailableCleaners, 
  assignTask,
  getPendingTasks 
} from '@/lib/hotelManagement';
import { TaskStatusBadge } from '@/components/TaskStatusBadge';
import { TaskStatus } from '@/types/task';
import { AssignTaskData } from '@/types/hotel';

export default function TaskSchedulePage() {
  const router = useRouter();
  const user = useUserStore(s => s.user);
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [availableCleaners, setAvailableCleaners] = useState<any[]>([]);
  const [assigning, setAssigning] = useState(false);

  // 分配表单状态
  const [assignForm, setAssignForm] = useState<AssignTaskData>({
    taskId: '',
    cleanerIds: [],
    notes: ''
  });

  useEffect(() => {
    if (!user || user.role !== 'manager') {
      router.push('/dashboard');
      return;
    }
    loadScheduleData();
  }, [user, router, selectedDate]);

  const loadScheduleData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const startDate = selectedDate;
      const endDate = selectedDate; // 暂时只显示单日视图
      
      console.log('正在加载任务安排数据:', { startDate, endDate });
      
      const [schedule, pending] = await Promise.all([
        getTaskScheduleView(startDate, endDate),
        getPendingTasks()
      ]);
      
      console.log('任务安排数据:', schedule);
      console.log('待安排任务:', pending);
      
      setScheduleData(schedule);
      setPendingTasks(pending);
    } catch (err) {
      console.error('加载任务安排数据失败:', err);
      setError(`加载任务安排数据失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTask = async (task: any) => {
    setSelectedTask(task);
    setAssignForm({
      taskId: task.id,
      cleanerIds: [],
      notes: ''
    });

    try {
      const cleaners = await getAvailableCleaners(task.date);
      setAvailableCleaners(cleaners);
      setShowAssignModal(true);
    } catch (err) {
      setError('获取可用清洁员失败');
      console.error('获取可用清洁员失败:', err);
    }
  };

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTask || assignForm.cleanerIds.length === 0) return;

    try {
      setAssigning(true);
      await assignTask(assignForm, user.id.toString());
      setShowAssignModal(false);
      setSelectedTask(null);
      setAssignForm({ taskId: '', cleanerIds: [], notes: '' });
      await loadScheduleData(); // 重新加载数据
    } catch (err) {
      setError('分配任务失败');
      console.error('分配任务失败:', err);
    } finally {
      setAssigning(false);
    }
  };

  const handleCleanerToggle = (cleanerId: string) => {
    setAssignForm(prev => ({
      ...prev,
      cleanerIds: prev.cleanerIds.includes(cleanerId)
        ? prev.cleanerIds.filter(id => id !== cleanerId)
        : [...prev.cleanerIds, cleanerId]
    }));
  };

  const getTaskStatusColor = (status: TaskStatus): string => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      open: 'bg-yellow-100 text-yellow-800',
      assigned: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      in_progress: 'bg-orange-100 text-orange-800',
      completed: 'bg-emerald-100 text-emerald-800',
      confirmed: 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getHotelsFromData = () => {
    const hotels = new Map();
    
    scheduleData.forEach(task => {
      if (!hotels.has(task.hotel_name)) {
        hotels.set(task.hotel_name, {
          name: task.hotel_name,
          tasks: []
        });
      }
      hotels.get(task.hotel_name).tasks.push(task);
    });
    
    return Array.from(hotels.values());
  };

  if (!user || user.role !== 'manager') {
    return <div className="p-6">无权访问此页面</div>;
  }

  const hotels = getHotelsFromData();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">任务安排视图</h1>
        <div className="flex gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
      ) : (
        <div className="space-y-6">
          {/* 任务安排矩阵 */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {new Date(selectedDate).toLocaleDateString('zh-CN', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  weekday: 'long'
                })} - 任务安排
              </h2>
            </div>
            
            {hotels.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                该日期暂无任务安排
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        酒店
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        房间号
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        状态
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        已分配清洁员
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {hotels.map((hotel) => (
                      hotel.tasks.map((task: any) => (
                        <tr key={task.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {hotel.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-xs text-gray-500">
                              {task.hotel_address || ''}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <TaskStatusBadge status={task.status} size="small" />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {task.assigned_cleaners && task.assigned_cleaners.length > 0
                                ? task.assigned_cleaners.join(', ')
                                : '未分配'
                              }
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {task.status === 'open' && (
                              <button
                                onClick={() => handleAssignTask(task)}
                                className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                              >
                                分配任务
                              </button>
                            )}
                            {task.status === 'assigned' && (
                              <span className="text-gray-500 text-sm">等待接受</span>
                            )}
                            {['accepted', 'in_progress', 'completed', 'confirmed'].includes(task.status) && (
                              <span className="text-green-600 text-sm">进行中</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 待安排任务列表 */}
          {pendingTasks.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-yellow-50 px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-yellow-800">
                  待安排任务 ({pendingTasks.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        酒店
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        日期
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        房间号
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        状态
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingTasks.map((task) => (
                      <tr key={task.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {task.hotel_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(task.date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-xs text-gray-500">
                            {task.hotel_address || ''}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <TaskStatusBadge status={task.status} size="small" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleAssignTask(task)}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          >
                            分配任务
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 分配任务模态框 */}
      {showAssignModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">分配任务</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>酒店:</strong> {selectedTask.hotel_name}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>日期:</strong> {new Date(selectedTask.date).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                <strong>地址:</strong> {selectedTask.hotel_address || '未提供'}
              </p>
            </div>
            
            <form onSubmit={handleSubmitAssignment}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择清洁员 *
                </label>
                {availableCleaners.length === 0 ? (
                  <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded">
                    该日期暂无可用清洁员
                  </div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {availableCleaners.map((cleaner) => (
                      <label key={cleaner.cleaner_id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={assignForm.cleanerIds.includes(cleaner.cleaner_id)}
                          onChange={() => handleCleanerToggle(cleaner.cleaner_id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-900">
                          {cleaner.user_profiles?.name || '未知清洁员'}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  备注（可选）
                </label>
                <textarea
                  value={assignForm.notes}
                  onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="输入备注信息"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={assigning || assignForm.cleanerIds.length === 0}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {assigning ? '分配中...' : '确认分配'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
