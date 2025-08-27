"use client";
import { useUserStore } from '@/store/userStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { RoleSelector } from '@/components/RoleSelector';
import { TaskCalendar } from '@/components/TaskCalendar';
import { TaskCreateForm } from '@/components/TaskCreateForm';


export default function OwnerDashboard() {
  const { user } = useUserStore();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'dashboard' | 'calendar'>('dashboard');
  const [tasksWithAttendance, setTasksWithAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // 加载房东的任务数据（用于仪表板统计）
  const loadOwnerTasksStats = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // 这里可以添加获取房东任务统计的逻辑
      // 暂时使用模拟数据
      const mockTasks = [
        { id: '1', status: 'completed', hotelName: '测试酒店1', roomNumber: '101' },
        { id: '2', status: 'in_progress', hotelName: '测试酒店2', roomNumber: '102' },
        { id: '3', status: 'assigned', hotelName: '测试酒店3', roomNumber: '103' },
      ];
      
      setTasksWithAttendance(mockTasks);
    } catch (error) {
      console.error('加载房东任务统计失败:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    if (user.role !== 'owner') {
      router.push('/dashboard');
      return;
    }

    loadOwnerTasksStats();
  }, [user, router, loadOwnerTasksStats]);

  if (!user || user.role !== 'owner') {
    return null;
  }

  // 如果是日历视图，使用完整宽度布局
  if (viewMode === 'calendar') {
    return (
      <div style={{ maxWidth: 1200, margin: '2rem auto', padding: '0 1rem' }}>
        <RoleSelector showLogout={true} compactMode={false} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>我的任务日历</h2>
          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              onClick={() => setViewMode('dashboard')}
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
              返回仪表板
            </button>
            <button 
              onClick={() => router.push('/dashboard/owner/hotels')}
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
              管理酒店
            </button>
          </div>
        </div>
        
        {/* 日历视图（内部已包含右侧任务详情面板） */}
        <TaskCalendar className="w-full" />
      </div>
    );
  }

  // 默认仪表板视图
  return (
    <div style={{ maxWidth: 800, margin: '2rem auto', padding: 24 }}>
      <RoleSelector showLogout={true} compactMode={false} />
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>
          房东仪表板
        </h1>
        <p style={{ color: '#666', fontSize: 16 }}>
          欢迎回来，{user.name}！这里是您的任务概览。
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: 24,
        marginBottom: 32
      }}>
        <div style={{ 
          background: '#f8fafc', 
          padding: 24, 
          borderRadius: 12, 
          border: '1px solid #e2e8f0' 
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>总任务数</h3>
          <p style={{ fontSize: 32, fontWeight: 700, color: '#3b82f6' }}>{tasksWithAttendance.length}</p>
          <p style={{ color: '#666', fontSize: 14 }}>个任务</p>
        </div>

        <div style={{ 
          background: '#f8fafc', 
          padding: 24, 
          borderRadius: 12, 
          border: '1px solid #e2e8f0' 
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>已完成</h3>
          <p style={{ fontSize: 32, fontWeight: 700, color: '#10b981' }}>
            {tasksWithAttendance.filter(t => t.status === 'completed' || t.status === 'confirmed').length}
          </p>
          <p style={{ color: '#666', fontSize: 14 }}>个任务已完成</p>
        </div>

        <div style={{ 
          background: '#f8fafc', 
          padding: 24, 
          borderRadius: 12, 
          border: '1px solid #e2e8f0' 
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>进行中</h3>
          <p style={{ fontSize: 32, fontWeight: 700, color: '#f59e0b' }}>
            {tasksWithAttendance.filter(t => t.status === 'assigned' || t.status === 'accepted' || t.status === 'in_progress').length}
          </p>
          <p style={{ color: '#666', fontSize: 14 }}>个任务进行中</p>
        </div>
      </div>

      <div style={{ 
        background: 'white', 
        padding: 24, 
        borderRadius: 12, 
        border: '1px solid #e2e8f0' 
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>快速操作</h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: 16 
        }}>
          <button 
            onClick={() => setShowCreateForm(true)}
            style={{ 
              background: '#f59e0b', 
              color: 'white', 
              padding: '12px 16px', 
              borderRadius: 8, 
              border: 'none', 
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500
            }}
          >
            新建入住任务
          </button>
          <button 
            onClick={() => setViewMode('calendar')}
            style={{ 
              background: '#3b82f6', 
              color: 'white', 
              padding: '12px 16px', 
              borderRadius: 8, 
              border: 'none', 
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500
            }}
          >
            任务日历
          </button>
          <button 
            onClick={() => router.push('/dashboard/owner/hotels')}
            style={{ 
              background: '#10b981', 
              color: 'white', 
              padding: '12px 16px', 
              borderRadius: 8, 
              border: 'none', 
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500
            }}
          >
            管理酒店
          </button>
        </div>
      </div>

      <div style={{ 
        background: 'white', 
        padding: 24, 
        borderRadius: 12, 
        border: '1px solid #e2e8f0',
        marginTop: 24
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>最近任务</h2>
        {loading ? (
          <div style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>加载中...</div>
        ) : tasksWithAttendance.length === 0 ? (
          <div style={{ color: '#666' }}>暂无任务</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tasksWithAttendance.slice(0, 5).map(task => (
              <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <span style={{ fontWeight: 500 }}>{task.hotelName}</span>
                  {task.roomNumber && <span style={{ color: '#666', marginLeft: 8 }}>- {task.roomNumber}</span>}
                </div>
                <div style={{ 
                  padding: '4px 8px', 
                  borderRadius: 4, 
                  fontSize: 12, 
                  fontWeight: 500,
                  backgroundColor: task.status === 'completed' || task.status === 'confirmed' ? '#dcfce7' : 
                                  task.status === 'in_progress' ? '#fef3c7' : '#e2e8f0',
                  color: task.status === 'completed' || task.status === 'confirmed' ? '#166534' : 
                         task.status === 'in_progress' ? '#92400e' : '#374151'
                }}>
                  {task.status === 'draft' ? '草稿' :
                   task.status === 'open' ? '待分配' :
                   task.status === 'assigned' ? '已分配' :
                   task.status === 'accepted' ? '已接受' :
                   task.status === 'in_progress' ? '进行中' :
                   task.status === 'completed' ? '已完成' :
                   task.status === 'confirmed' ? '已确认' : task.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 任务创建表单 */}
      <TaskCreateForm 
        isOpen={showCreateForm} 
        onClose={() => setShowCreateForm(false)}
        onTaskCreated={() => {
          // 刷新任务列表
          loadOwnerTasksStats();
          console.log('房东任务创建成功，刷新统计数据');
        }}
      />
    </div>
  );
} 