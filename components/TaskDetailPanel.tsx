"use client";
import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { Task } from '@/types/task';
import { useUserStore } from '@/store/userStore';
import { getUserAttendanceByTaskId, checkIn, checkOut, Attendance, getAttendanceByTaskId, getUserLatestAttendance } from '@/lib/attendance';
import { uploadImagesToExistingTask, getTaskImages, TaskImage } from '@/lib/upload';
import { AttendanceSummary } from '@/components/AttendanceSummary';
import { AttendanceActions } from '@/components/AttendanceActions';
import { ImageUpload } from '@/components/ImageUpload';
import { AttachmentGallery } from '@/components/AttachmentGallery';
import { getTaskCapabilities } from '@/lib/taskCapabilities';
import { TaskCard } from '@/components/TaskCard';
import { useTask } from '@/lib/useTask';
import { getAvailableCleanersForDate, assignTaskToCleaners } from '@/lib/calendar';

interface TaskDetailPanelProps {
  task: Task;
  onAttendanceUpdate?: () => void; // 回调函数，用于通知父组件刷新打卡状态
}

export const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({ task, onAttendanceUpdate }) => {
  const user = useUserStore(s => s.user);
  const { allAttendances, currentStatus, images: taskImages, refresh } = useTask(task);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [availableCleaners, setAvailableCleaners] = useState<any[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [selectedCleaners, setSelectedCleaners] = useState<string[]>([]);
  const [assignmentNotes, setAssignmentNotes] = useState('');
  // 备品统计（保留，暂不抽离）
  const [inventory, setInventory] = useState({ towel: '', soap: '' });
  const [inventorySubmitted, setInventorySubmitted] = useState(false);

  useEffect(() => { /* useTask 内部已处理加载 */ }, [task.id, user?.id]);

  // 处理清洁工选择
  const handleCleanerToggle = (cleanerId: string) => {
    setSelectedCleaners(prev => 
      prev.includes(cleanerId)
        ? prev.filter(id => id !== cleanerId)
        : [...prev, cleanerId]
    );
  };

  // 处理分配任务
  const handleAssignSubmit = async () => {
    if (selectedCleaners.length === 0) {
      alert('请至少选择一个清洁员');
      return;
    }

    if (!user) return;
    try {
      setAssigning(true);
      const res = await assignTaskToCleaners(task.id, selectedCleaners, user.id, assignmentNotes);
      if (res.success) {
        await refresh();
        onAttendanceUpdate?.();
        setShowAssignPanel(false);
        setSelectedCleaners([]);
        setAssignmentNotes('');
      } else {
        alert(res.error || '分配失败');
      }
    } catch (error) {
      console.error('分配任务失败:', error);
      alert('分配任务失败');
    } finally {
      setAssigning(false);
    }
  };

  function handleInventoryChange(e: ChangeEvent<HTMLInputElement>) {
    setInventory({ ...inventory, [e.target.name]: e.target.value });
  }
  function handleInventorySubmit(e: FormEvent) {
    e.preventDefault();
    setInventorySubmitted(true);
  }

  if (!user) {
    return <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 20, background: '#f9fafb' }}>请先登录查看任务详情</div>;
  }

  const caps = getTaskCapabilities(user.role, task.status, {
    isAssignedCleaner: task.assignedCleaners?.some(name => name === user.name),
    hasAccepted: false,
    attendance: {
      hasCheckIn: currentStatus === 'checked_in' || currentStatus === 'checked_out',
      hasCheckOut: currentStatus === 'checked_out'
    },
    assignedCleanersCount: task.assignedCleaners?.length || 0,
    pendingCleanerAck: false
  });

  return (
    <div>
      <TaskCard
        id={task.id}
        hotelName={task.hotelName}
        date={task.checkInDate || task.date || ''}
        checkInDate={task.checkInDate}
        checkInTime={task.checkInTime}
        checkOutDate={task.checkOutDate}
        cleaningDate={task.cleaningDate}
        assignedCleaners={task.assignedCleaners}
        status={task.status}
        description={task.description}
        note={task.note}
        images={task.images}
        showDetail={true}
        attendanceStatus={undefined}
        hotelAddress={task.hotelAddress}
        roomNumber={task.roomNumber}
        lockPassword={task.lockPassword}
        acceptedBy={task.acceptedBy}
        completedAt={task.completedAt}
        confirmedAt={task.confirmedAt}
        viewerRole={user.role}
        viewMode={'detail'}
        capabilities={caps}
        renderBlocks={{
          assignmentAction: caps.canOpenAssignmentModal ? (
            <button
              onClick={async () => {
                // 打开前加载可用清洁员
                try {
                  const dateStr = task.cleaningDate || task.checkInDate || task.date || '';
                  console.log('TaskDetailPanel - 获取清洁员，日期:', dateStr);
                  if (dateStr) {
                    const cleaners = await getAvailableCleanersForDate(dateStr);
                    console.log('TaskDetailPanel - 获取到清洁员:', cleaners);
                    setAvailableCleaners(cleaners);
                  } else {
                    console.log('TaskDetailPanel - 没有有效日期');
                    setAvailableCleaners([]);
                  }
                } catch (e) {
                  console.error('TaskDetailPanel - 获取清洁员失败:', e);
                  setAvailableCleaners([]);
                }
                setShowAssignPanel(true);
              }}
              style={{ alignSelf: 'flex-start', padding: '6px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
            >
              {task.assignedCleaners && task.assignedCleaners.length > 0 ? '追加人员' : '分配清洁工'}
            </button>
          ) : null,
          taskAcceptance: caps.showTaskAcceptance ? (
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <button
                onClick={async () => {
                  // TODO: 实现接受任务逻辑
                  console.log('接受任务:', task.id);
                  alert('任务接受功能开发中...');
                }}
                style={{ 
                  flex: 1,
                  padding: '8px 16px', 
                  background: '#10b981', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: 6, 
                  fontWeight: 600, 
                  fontSize: 14, 
                  cursor: 'pointer' 
                }}
              >
                接受任务
              </button>
              <button
                onClick={async () => {
                  // TODO: 实现拒绝任务逻辑
                  console.log('拒绝任务:', task.id);
                  alert('任务拒绝功能开发中...');
                }}
                style={{ 
                  flex: 1,
                  padding: '8px 16px', 
                  background: '#ef4444', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: 6, 
                  fontWeight: 600, 
                  fontSize: 14, 
                  cursor: 'pointer' 
                }}
              >
                拒绝任务
              </button>
            </div>
          ) : null,
          attendanceSummary: caps.showAttendanceSummary ? (
            <AttendanceSummary assignedCleaners={task.assignedCleaners} attendances={allAttendances} />
          ) : null,
          attendanceActions: caps.showAttendanceActions ? (
            <AttendanceActions
              taskId={task.id}
              userId={user.id.toString()}
              currentStatus={currentStatus}
              allAttendances={allAttendances}
              loading={loading}
              onLoadingChange={setLoading}
              onAfterUpdate={async () => { await refresh(); onAttendanceUpdate?.(); }}
            />
          ) : null,
          attachments: (
            <>
              {user.role === 'cleaner' && (
                <ImageUpload
                  taskId={task.id}
                  userId={user.id.toString()}
                  disabled={uploading}
                  onUploaded={async (count) => { if (count > 0) { await refresh(); } }}
                />
              )}
              <AttachmentGallery images={taskImages} />
            </>
          ),
          notes: (
            <div>
              <b>备品统计：</b>
              <form onSubmit={handleInventorySubmit} style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
                <label>毛巾数：<input name="towel" type="number" min={0} value={inventory.towel} onChange={handleInventoryChange} style={{ width: 60, marginLeft: 4 }} /></label>
                <label>香皂数：<input name="soap" type="number" min={0} value={inventory.soap} onChange={handleInventoryChange} style={{ width: 60, marginLeft: 4 }} /></label>
                <button type="submit" style={{ padding: '6px 18px', background: '#f59e42', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>提交</button>
              </form>
              {inventorySubmitted && <div style={{ color: '#16a34a', marginTop: 8 }}>已提交：毛巾 {inventory.towel}，香皂 {inventory.soap}</div>}
            </div>
          )
        }}
      />

      {/* 分配清洁工面板 - 在任务卡片下方展开 */}
      {showAssignPanel && (
        <div style={{
          marginTop: 16,
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: 16,
          backgroundColor: '#f9fafb'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
              {task.assignedCleaners && task.assignedCleaners.length > 0 ? '追加清洁人员' : '分配清洁工'}
            </h3>
            <button
              onClick={() => {
                setShowAssignPanel(false);
                setSelectedCleaners([]);
                setAssignmentNotes('');
              }}
              style={{ 
                color: '#6b7280', 
                fontSize: 20, 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer' 
              }}
            >
              ×
            </button>
          </div>

          {/* 当前已分配的清洁工显示 */}
          {task.assignedCleaners && task.assignedCleaners.length > 0 && (
            <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#dbeafe', borderRadius: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#1e40af', marginBottom: 4 }}>
                已分配清洁工：
              </div>
              <div style={{ fontSize: 14, color: '#1e40af' }}>
                {task.assignedCleaners.join('、')}
              </div>
              {task.status === 'assigned' && (
                <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 4 }}>
                  状态：已分配，待接收
                </div>
              )}
            </div>
          )}

          {/* 可用清洁员列表 */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 8 }}>
              选择清洁员 *
            </label>
            {availableCleaners.length === 0 ? (
              <div style={{ fontSize: 14, color: '#6b7280', padding: 12, backgroundColor: '#f3f4f6', borderRadius: 6 }}>
                该日期暂无可用清洁员
              </div>
            ) : (
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {availableCleaners.map((cleaner) => {
                  const isSelected = selectedCleaners.includes(cleaner.id);
                  return (
                    <div
                      key={cleaner.id}
                      onClick={() => handleCleanerToggle(cleaner.id)}
                      style={{ 
                        padding: 12,
                        border: `1px solid ${isSelected ? '#3b82f6' : '#d1d5db'}`,
                        borderRadius: 6,
                        cursor: 'pointer',
                        marginBottom: 8,
                        backgroundColor: isSelected ? '#dbeafe' : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleCleanerToggle(cleaner.id)}
                        style={{ width: 16, height: 16 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, marginBottom: 2 }}>{cleaner.name || '未知姓名'}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>
                          当前任务: {cleaner.currentTaskCount || 0}/{cleaner.maxTaskCapacity || 0}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 备注输入 */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 8 }}>
              备注（可选）
            </label>
            <textarea
              value={assignmentNotes}
              onChange={(e) => setAssignmentNotes(e.target.value)}
              style={{ 
                width: '100%', 
                padding: 8, 
                border: '1px solid #d1d5db', 
                borderRadius: 6, 
                fontSize: 14,
                resize: 'vertical',
                minHeight: 60
              }}
              placeholder="输入备注信息"
            />
          </div>

          {/* 操作按钮 */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                setShowAssignPanel(false);
                setSelectedCleaners([]);
                setAssignmentNotes('');
              }}
              style={{ 
                padding: '8px 16px', 
                background: '#f3f4f6', 
                color: '#374151', 
                border: 'none', 
                borderRadius: 6, 
                fontWeight: 500, 
                cursor: 'pointer' 
              }}
            >
              取消
            </button>
            <button
              onClick={handleAssignSubmit}
              disabled={assigning || selectedCleaners.length === 0}
              style={{ 
                padding: '8px 16px', 
                background: assigning || selectedCleaners.length === 0 ? '#9ca3af' : '#2563eb', 
                color: '#fff', 
                border: 'none', 
                borderRadius: 6, 
                fontWeight: 500, 
                cursor: assigning || selectedCleaners.length === 0 ? 'not-allowed' : 'pointer' 
              }}
            >
              {assigning ? '分配中...' : '确认分配'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 