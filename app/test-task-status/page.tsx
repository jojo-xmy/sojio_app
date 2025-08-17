"use client";
import { useState } from 'react';
import { TaskStatusBadge } from '@/components/TaskStatusBadge';
import { TaskStatus, TASK_STATUS_DISPLAY, canTransitionTask, UserRole } from '@/types/task';
import { getAvailableTransitions, canOperateTask, getTaskProgress } from '@/lib/taskStatus';
import { tasks } from '@/data/tasks';

export default function TestTaskStatusPage() {
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus>('draft');
  const [selectedRole, setSelectedRole] = useState<UserRole>('manager');
  const [selectedTask, setSelectedTask] = useState(tasks[0]);

  const allStatuses: TaskStatus[] = ['draft', 'open', 'assigned', 'accepted', 'in_progress', 'completed', 'confirmed'];
  const allRoles: UserRole[] = ['owner', 'manager', 'cleaner'];

  return (
    <div style={{ maxWidth: 800, margin: '2rem auto', padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>任务状态系统测试</h1>
      
      {/* 状态显示测试 */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>状态显示测试</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {allStatuses.map(status => (
            <TaskStatusBadge key={status} status={status} />
          ))}
        </div>
      </div>

      {/* 状态转换测试 */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>状态转换测试</h2>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8 }}>当前状态：</label>
            <select 
              value={selectedStatus} 
              onChange={(e) => setSelectedStatus(e.target.value as TaskStatus)}
              style={{ padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
            >
              {allStatuses.map(status => (
                <option key={status} value={status}>
                  {TASK_STATUS_DISPLAY[status]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8 }}>用户角色：</label>
            <select 
              value={selectedRole} 
              onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              style={{ padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
            >
              {allRoles.map(role => (
                <option key={role} value={role}>
                  {role === 'owner' ? '房东' : role === 'manager' ? '管理者' : '清洁员'}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <strong>可转换状态：</strong>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {getAvailableTransitions(selectedStatus).map(status => (
              <TaskStatusBadge 
                key={status} 
                status={status} 
                size="small"
                className={canTransitionTask(selectedStatus, status, selectedRole) ? '' : 'opacity-50'}
              />
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <strong>可执行操作：</strong>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {['edit', 'assign', 'accept', 'start', 'complete', 'confirm'].map(operation => (
              <span
                key={operation}
                style={{
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: 12,
                  background: canOperateTask(selectedStatus, selectedRole, operation) ? '#22c55e' : '#e5e7eb',
                  color: canOperateTask(selectedStatus, selectedRole, operation) ? '#fff' : '#6b7280'
                }}
              >
                {operation === 'edit' ? '编辑' :
                 operation === 'assign' ? '分配' :
                 operation === 'accept' ? '接受' :
                 operation === 'start' ? '开始' :
                 operation === 'complete' ? '完成' :
                 operation === 'confirm' ? '确认' : operation}
              </span>
            ))}
          </div>
        </div>

        <div>
          <strong>任务进度：</strong> {getTaskProgress(selectedStatus)}%
          <div style={{ 
            width: '100%', 
            height: 8, 
            background: '#e5e7eb', 
            borderRadius: 4, 
            marginTop: 8,
            overflow: 'hidden'
          }}>
            <div style={{ 
              width: `${getTaskProgress(selectedStatus)}%`, 
              height: '100%', 
              background: '#22c55e',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      </div>

      {/* 真实任务测试 */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>真实任务测试</h2>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>选择任务：</label>
          <select 
            value={selectedTask.id} 
            onChange={(e) => setSelectedTask(tasks.find(t => t.id === e.target.value) || tasks[0])}
            style={{ padding: 8, border: '1px solid #ddd', borderRadius: 4, width: '100%' }}
          >
            {tasks.map(task => (
              <option key={task.id} value={task.id}>
                {task.hotelName} - {TASK_STATUS_DISPLAY[task.status]}
              </option>
            ))}
          </select>
        </div>
        
        <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600 }}>{selectedTask.hotelName}</h3>
            <TaskStatusBadge status={selectedTask.status} />
          </div>
          <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
            日期：{selectedTask.date} | 入住时间：{selectedTask.checkInTime}
          </div>
          <div style={{ fontSize: 14, marginBottom: 8 }}>
            清洁员：{selectedTask.assignedCleaners.join('，')}
          </div>
          {selectedTask.description && (
            <div style={{ fontSize: 14, marginBottom: 8 }}>
              描述：{selectedTask.description}
            </div>
          )}
          {selectedTask.lockPassword && (
            <div style={{ fontSize: 14, color: '#059669' }}>
              门锁密码：{selectedTask.lockPassword}
            </div>
          )}
        </div>
      </div>

      {/* 状态流程图 */}
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>状态流程图</h2>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: 16,
          background: '#f9fafb',
          borderRadius: 8,
          overflowX: 'auto'
        }}>
          {allStatuses.map((status, index) => (
            <div key={status} style={{ textAlign: 'center', minWidth: 80 }}>
              <TaskStatusBadge status={status} size="small" />
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                {TASK_STATUS_DISPLAY[status]}
              </div>
              {index < allStatuses.length - 1 && (
                <div style={{ marginTop: 8, fontSize: 16 }}>→</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 