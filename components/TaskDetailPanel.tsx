"use client";
import { useState, ChangeEvent, FormEvent, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Task } from '@/types/task';
import { UserProfile } from '@/types/user';
import { useUserStore } from '@/store/userStore';
import { getUserAttendanceByTaskId, checkIn, checkOut, Attendance, getAttendanceByTaskId, getUserLatestAttendance } from '@/lib/attendance';
import { uploadImagesToExistingTask, getTaskImages, TaskImage } from '@/lib/upload';
import { AttendanceSummary } from '@/components/AttendanceSummary';
import { AttendanceActions } from '@/components/AttendanceActions';
import { ImageUpload } from '@/components/ImageUpload';
import { AttachmentGallery } from '@/components/AttachmentGallery';
import { getTaskCapabilities } from '@/lib/taskCapabilities';
import { TaskCard } from '@/components/TaskCard';
import { useGlobalRefresh } from '@/hooks/useRefresh';
import { getAvailableCleanersForDate, assignTaskToCleaners, getTaskWithAssignments } from '@/lib/calendar';
import { updateCalendarEntry, deleteCalendarEntry } from '@/lib/services/calendarEntryService';
// 使用基于 tasks.calendar_entry_id 的查询，避免依赖 calendar_entries.task_id
// import { getCalendarEntryByTaskId } from '@/lib/hotelManagement'; // 不再使用
import { publishTask, acceptTask, rejectTask, updateTaskDetails, updateOwnerNotes, deleteTask, confirmTaskWithManagerReport } from '@/lib/tasks';
import { CalendarEntryForm, CalendarEntryFormData } from './CalendarEntryForm';

interface TaskDetailPanelProps {
  task: Task;
  onAttendanceUpdate?: () => void; // 回调函数，用于通知父组件刷新打卡状态
  onTaskUpdate?: () => void; // 回调函数，用于通知父组件刷新任务详情
}

export const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({ task, onAttendanceUpdate, onTaskUpdate }) => {
  const user = useUserStore(s => s.user);
  const { allAttendances, currentStatus, images: taskImages, taskDetails, calendarEntry, refresh } = useGlobalRefresh(task);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [availableCleaners, setAvailableCleaners] = useState<any[]>([]);
  const [assignedCleanerProfiles, setAssignedCleanerProfiles] = useState<UserProfile[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [selectedCleaners, setSelectedCleaners] = useState<string[]>([]);
  const [selectionDirty, setSelectionDirty] = useState(false);
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [editingTask, setEditingTask] = useState(false);
  const [editFormData, setEditFormData] = useState({
    description: task.description || '',
    cleaningDate: task.cleaningDate || '',
    lockPassword: task.lockPassword || ''
  });
  const [ownerNotesDraft, setOwnerNotesDraft] = useState(task.ownerNotes || '');
  const [managerReportDraft, setManagerReportDraft] = useState(task.managerReportNotes || task.cleanerNotes || '');
  const [savingReport, setSavingReport] = useState(false);
  // 备品统计（保留，暂不抽离）
  const [inventory, setInventory] = useState({ towel: '', soap: '' });
  const [inventorySubmitted, setInventorySubmitted] = useState(false);
  const [ownerEditingEntry, setOwnerEditingEntry] = useState<null | {
    id: string;
    checkInDate: string;
    checkOutDate: string;
    guestCount: number;
    ownerNotes?: string;
    cleaningDates?: string[];
  }>(null);

 useEffect(() => {
   setManagerReportDraft(task.managerReportNotes ?? task.cleanerNotes ?? '');
 }, [task.id, task.managerReportNotes, task.cleanerNotes]);

  const loadAssignedCleanerProfiles = useCallback(async () => {
    try {
      const result = await getTaskWithAssignments(task.id);
      if (result?.assignedCleaners) {
        setAssignedCleanerProfiles(result.assignedCleaners);
      } else {
        setAssignedCleanerProfiles([]);
      }
    } catch (error) {
      console.error('加载任务分配详情失败:', error);
      setAssignedCleanerProfiles([]);
    }
  }, [task.id]);

  useEffect(() => {
    loadAssignedCleanerProfiles();
  }, [loadAssignedCleanerProfiles]);

  const assignedCleanerIds = useMemo(() => {
    if (assignedCleanerProfiles.length > 0) {
      return assignedCleanerProfiles
        .map(profile => profile.id)
        .filter((id): id is string => Boolean(id));
    }
    if (taskDetails?.assignedCleaners && taskDetails.assignedCleaners.length > 0) {
      return taskDetails.assignedCleaners;
    }
    return [];
  }, [assignedCleanerProfiles, taskDetails?.assignedCleaners]);

  const hasAssignedCleaners = assignedCleanerIds.length > 0 || (task.assignedCleaners?.length ?? 0) > 0;
  const currentAssignedCleaners = assignedCleanerIds;

  useEffect(() => {
    if (showAssignPanel && !selectionDirty && assignedCleanerIds.length > 0) {
      setSelectedCleaners(assignedCleanerIds);
    }
  }, [showAssignPanel, selectionDirty, assignedCleanerIds]);

  const assignedCleanerNameMap = useMemo(() => {
    const map = new Map<string, string>();

    assignedCleanerProfiles.forEach(profile => {
      if (profile?.id) {
        map.set(profile.id, profile.name || '未知清洁员');
      }
    });

    if (assignedCleanerProfiles.length === 0 && taskDetails?.assignedCleaners && task.assignedCleaners) {
      taskDetails.assignedCleaners.forEach((cleanerId: string, index: number) => {
        const name = task.assignedCleaners?.[index];
        if (cleanerId && name) {
          map.set(cleanerId, name);
        }
      });
    }

    availableCleaners.forEach((cleaner: any) => {
      if (cleaner?.id && cleaner?.name) {
        map.set(cleaner.id, cleaner.name);
      }
    });

    return map;
  }, [assignedCleanerProfiles, taskDetails?.assignedCleaners, task.assignedCleaners, availableCleaners]);

  const selectedCleanerChips = useMemo(() => {
    return selectedCleaners.map(cleanerId => ({
      id: cleanerId,
      name: assignedCleanerNameMap.get(cleanerId) || '未知清洁员'
    }));
  }, [selectedCleaners, assignedCleanerNameMap]);

  const handleRemoveSelectedCleaner = (cleanerId: string) => {
    setSelectionDirty(true);
    setSelectedCleaners(prev => prev.filter(id => id !== cleanerId));
  };

  useEffect(() => { /* useTask 内部已处理加载 */ }, [task.id, user?.id]);

  // Owner 打开入住登记编辑
  const openOwnerEdit = () => {
    if (!calendarEntry) {
      alert('未找到对应的入住登记');
      return;
    }
    setOwnerEditingEntry({
      id: calendarEntry.id,
      checkInDate: calendarEntry.checkInDate,
      checkOutDate: calendarEntry.checkOutDate,
      guestCount: calendarEntry.guestCount,
      ownerNotes: calendarEntry.ownerNotes || '',
      cleaningDates: calendarEntry.cleaningDates || []
    });
  };

  const saveOwnerEntry = async (formData: CalendarEntryFormData) => {
    if (!ownerEditingEntry) return;
    try {
      await updateCalendarEntry(ownerEditingEntry.id, {
        checkInDate: formData.checkInDate,
        checkOutDate: formData.checkOutDate,
        guestCount: formData.guestCount,
        ownerNotes: formData.ownerNotes,
        cleaningDates: formData.cleaningDates
      });
      
      console.log('入住登记已更新，清扫任务将根据新的清扫日期差异同步');
      
      setOwnerEditingEntry(null);
      await refresh();
      onAttendanceUpdate?.();
      onTaskUpdate?.();
    } catch (e) {
      console.error('更新入住登记失败:', e);
      alert('更新入住登记失败');
    }
  };

  const deleteOwnerEntry = async () => {
    try {
      if (!calendarEntry) {
        alert('未找到对应的入住登记');
        return;
      }
      if (!confirm('确定删除该入住登记及其关联任务？该操作不可恢复。')) return;
      await deleteCalendarEntry(calendarEntry.id);
      setOwnerEditingEntry(null);
      await refresh();
      onAttendanceUpdate?.();
      onTaskUpdate?.();
      alert('已删除入住登记与关联任务');
    } catch (e) {
      console.error('删除入住登记失败:', e);
      alert('删除入住登记失败');
    }
  };

  // 通知Manager
  const notifyManagers = async () => {
    if (!confirm('确定要通知该酒店的Manager吗？')) return;
    
    try {
      setLoading(true);
      const { notifyManagersAboutNewEntry } = await import('@/lib/taskStatus');
      const result = await notifyManagersAboutNewEntry(task.id, user.id);
      
      if (result.success) {
        alert(`成功通知 ${result.notifiedCount} 个Manager！`);
      } else {
        alert(`通知失败：${result.error || '未知错误'}`);
      }
    } catch (e) {
      console.error('通知Manager失败:', e);
      alert('通知Manager失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理清洁工选择
  const handleCleanerToggle = (cleanerId: string) => {
    setSelectionDirty(true);
    setSelectedCleaners(prev => 
      prev.includes(cleanerId)
        ? prev.filter(id => id !== cleanerId)
        : [...prev, cleanerId]
    );
  };

  // 处理分配任务
  const handleAssignSubmit = async () => {
    if (!user) return;
    try {
      setAssigning(true);
      
      // 完全替换清洁员分配
      const res = await assignTaskToCleaners(task.id, selectedCleaners, user.id, assignmentNotes, true);
      if (res.success) {
        await refresh();
        await loadAssignedCleanerProfiles();
        onAttendanceUpdate?.();
        onTaskUpdate?.();
        setShowAssignPanel(false);
        setSelectedCleaners([]);
        setAssignmentNotes('');
        setSelectionDirty(false);
        alert('人员分配已更新');
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

  const handleManagerReportConfirm = async () => {
    if (!user) return;
    try {
      setSavingReport(true);
      const trimmed = managerReportDraft.trim();
      if (!trimmed) {
        alert('请填写清扫报告内容');
        setSavingReport(false);
        return;
      }

      const result = await confirmTaskWithManagerReport(task.id, user.id.toString(), trimmed);
      if (!result.success) {
        alert(result.error || '确认失败');
        return;
      }

      await refresh();
      onAttendanceUpdate?.();
      onTaskUpdate?.();
      alert('清扫报告已确认并推送给房东');
    } catch (error) {
      console.error('确认清扫报告失败:', error);
      alert('确认清扫报告失败');
    } finally {
      setSavingReport(false);
    }
  };

  // 处理任务编辑保存
  const handleEditSave = async () => {
    try {
      const result = await updateTaskDetails(task.id, {
        description: editFormData.description,
        cleaningDate: editFormData.cleaningDate,
        lockPassword: editFormData.lockPassword
      });

      if (result.success) {
        await refresh();
        onAttendanceUpdate?.();
        onTaskUpdate?.();
        setEditingTask(false);
        alert('任务详情更新成功！');
      } else {
        alert(result.error || '更新失败');
      }
    } catch (error) {
      console.error('更新任务详情失败:', error);
      alert('更新任务详情失败');
    }
  };

  // 处理任务发布
  const handlePublishTask = async () => {
    try {
      const result = await publishTask(task.id);
      if (result.success) {
        await refresh();
        onAttendanceUpdate?.();
        onTaskUpdate?.();
        alert('任务发布成功！');
      } else {
        alert(result.error || '发布失败');
      }
    } catch (error) {
      console.error('发布任务失败:', error);
      alert('发布任务失败');
    }
  };

  // 处理任务接受
  const handleAcceptTask = async () => {
    if (!user) return;
    try {
      const result = await acceptTask(task.id, user.id.toString());
      if (result.success) {
        await refresh();
        onAttendanceUpdate?.();
        onTaskUpdate?.();
        alert('任务接受成功！');
      } else {
        alert(result.error || '接受失败');
      }
    } catch (error) {
      console.error('接受任务失败:', error);
      alert('接受任务失败');
    }
  };

  // 处理任务拒绝
  const handleRejectTask = async () => {
    if (!user) return;
    try {
      const result = await rejectTask(task.id, user.id.toString());
      if (result.success) {
        await refresh();
        onAttendanceUpdate?.();
        onTaskUpdate?.();
        alert('任务已拒绝');
      } else {
        alert(result.error || '拒绝失败');
      }
    } catch (error) {
      console.error('拒绝任务失败:', error);
      alert('拒绝任务失败');
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
        lockPassword={task.lockPassword}
        acceptedBy={task.acceptedBy}
        completedAt={task.completedAt}
        confirmedAt={task.confirmedAt}
        guestCount={task.guestCount}
        viewerRole={user.role}
        viewMode={'detail'}
        capabilities={caps}
        renderBlocks={{
          ownerMessage: (user.role === 'owner' || user.role === 'manager') && (
            <div style={{ 
              border: '1px solid #e5e7eb', 
              borderRadius: 8, 
              padding: 12, 
              backgroundColor: '#f9fafb',
              marginBottom: 12
            }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#6b7280' }}>
                房东备注
              </h4>
              <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.5 }}>
                {task.ownerNotes || '—'}
              </div>
              {user.role === 'owner' && (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                  <button onClick={notifyManagers} style={{ padding: '6px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>📢 通知Manager</button>
                  <button onClick={openOwnerEdit} style={{ padding: '6px 12px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>编辑入住登记</button>
                  <button onClick={deleteOwnerEntry} style={{ padding: '6px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>删除</button>
                </div>
              )}
            </div>
          ),
          taskDescription: task.description && user.role !== 'owner' && (
            <div style={{ 
              border: '1px solid #e5e7eb', 
              borderRadius: 8, 
              padding: 12, 
              backgroundColor: '#f9fafb',
              marginBottom: 12
            }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#6b7280' }}>
                任务描述
              </h4>
              <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.5 }}>
                {task.description}
              </div>
            </div>
          ),
          cleanerNotes: user.role === 'manager' && (
            <div style={{
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: 12,
              backgroundColor: '#f1f5f9',
              marginBottom: 12
            }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#475569' }}>
                清洁员备注
              </h4>
              <div style={{ fontSize: 14, color: '#1f2937', lineHeight: 1.6 }}>
                {task.cleanerNotes ? task.cleanerNotes : '清洁员尚未填写退勤备注。'}
              </div>
            </div>
          ),
          managerReport: user.role === 'manager'
            ? (
              <div style={{
                border: '1px solid #dbeafe',
                borderRadius: 8,
                padding: 16,
                backgroundColor: '#eff6ff',
                marginBottom: 16
              }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#1d4ed8' }}>
                  推送给房东的清扫报告
                </h4>
                <textarea
                  value={managerReportDraft}
                  onChange={(e) => setManagerReportDraft(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: 120,
                    padding: 10,
                    borderRadius: 8,
                    border: '1px solid #bfdbfe',
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: '#1f2937'
                  }}
                  placeholder={task.cleanerNotes ? '基于清洁员备注整理后推送给房东' : '填写需推送给房东的清扫报告'}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                  <span style={{ fontSize: 12, color: '#2563eb' }}>
                    {task.status === 'confirmed'
                      ? '任务已确认，修改后再次推送会同步给房东'
                      : '确认后任务状态将变为“已确认”，并通知房东'}
                  </span>
                  <button
                    onClick={handleManagerReportConfirm}
                    disabled={savingReport || managerReportDraft.trim().length === 0}
                    style={{
                      padding: '8px 18px',
                      background: savingReport || managerReportDraft.trim().length === 0 ? '#9ca3af' : '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: savingReport || managerReportDraft.trim().length === 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {savingReport
                      ? '处理中...'
                      : task.status === 'confirmed' ? '更新并通知房东' : '确认并通知房东'}
                  </button>
                </div>
              </div>
            )
            : user.role === 'owner'
              ? (
                <div style={{
                  border: '1px solid #bef264',
                  borderRadius: 8,
                  padding: 16,
                  backgroundColor: '#ecfccb',
                  marginBottom: 16
                }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#3f6212' }}>
                    管理员确认的清扫报告
                  </h4>
                  <div style={{ fontSize: 14, color: '#1f2937', lineHeight: 1.6 }}>
                    {task.managerReportNotes && task.managerReportNotes.trim().length > 0
                      ? task.managerReportNotes
                      : '经理尚未推送清扫报告。'}
                  </div>
                </div>
              )
              : null,
          managerActions: user.role === 'manager' ? (
            <div style={{ marginTop: 16 }}>
              {/* 编辑任务表单 */}
              {editingTask && (
                <div style={{ 
                  border: '1px solid #e5e7eb', 
                  borderRadius: 8, 
                  padding: 16, 
                  backgroundColor: '#f9fafb',
                  marginBottom: 16
                }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#6b7280' }}>
                    编辑任务详情
                  </h4>
                  
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                      任务描述
                    </label>
                    <textarea
                      value={editFormData.description}
                      onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                      style={{ 
                        width: '100%', 
                        padding: 8, 
                        border: '1px solid #d1d5db', 
                        borderRadius: 6, 
                        fontSize: 14,
                        minHeight: 60
                      }}
                      placeholder="输入任务描述"
                    />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                      清扫日期
                    </label>
                    <input
                      type="date"
                      value={editFormData.cleaningDate}
                      onChange={(e) => setEditFormData({...editFormData, cleaningDate: e.target.value})}
                      style={{ 
                        width: '100%', 
                        padding: 8, 
                        border: '1px solid #d1d5db', 
                        borderRadius: 6, 
                        fontSize: 14
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                      门锁密码
                    </label>
                    <input
                      type="text"
                      value={editFormData.lockPassword}
                      onChange={(e) => setEditFormData({...editFormData, lockPassword: e.target.value})}
                      style={{ 
                        width: '100%', 
                        padding: 8, 
                        border: '1px solid #d1d5db', 
                        borderRadius: 6, 
                        fontSize: 14
                      }}
                      placeholder="输入门锁密码"
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', alignItems: 'center' }}>
                    <button
                      onClick={() => setEditingTask(false)}
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
                      onClick={handleEditSave}
                      style={{ 
                        padding: '8px 16px', 
                        background: '#10b981', 
                        color: '#fff', 
                        border: 'none', 
                        borderRadius: 6, 
                        fontWeight: 500, 
                        cursor: 'pointer' 
                      }}
                    >
                      保存
                    </button>
                  </div>
                </div>
              )}

              {/* Manager操作按钮 */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {caps.canEditTaskDetails && !editingTask && (
                  <button
                    onClick={() => setEditingTask(true)}
                    style={{ 
                      padding: '8px 16px', 
                      background: '#6b7280', 
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: 6, 
                      fontWeight: 600, 
                      fontSize: 14, 
                      cursor: 'pointer' 
                    }}
                  >
                    编辑任务
                  </button>
                )}
                
                {caps.showTaskPublish && (
                  <button
                    onClick={handlePublishTask}
                    style={{ 
                      padding: '8px 16px', 
                      background: '#f59e0b', 
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: 6, 
                      fontWeight: 600, 
                      fontSize: 14, 
                      cursor: 'pointer' 
                    }}
                  >
                    发布任务
                  </button>
                )}
                
                {caps.canOpenAssignmentModal && (
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
                      // 初始化已选择的清洁员为当前已分配的清洁员
                      setSelectionDirty(false);
                      setSelectedCleaners(currentAssignedCleaners);
                      setShowAssignPanel(true);
                    }}
                    style={{ 
                      padding: '8px 16px', 
                      background: '#2563eb', 
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: 6, 
                      fontWeight: 600, 
                      fontSize: 14, 
                      cursor: 'pointer' 
                    }}
                  >
                    {hasAssignedCleaners ? '更改人员分配' : '分配清洁人员'}
                  </button>
                )}
              </div>
              
              {caps.showTaskPublish && (
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
                  发布后任务将变为"待分配"状态
                </div>
              )}
            </div>
          ) : null,
          taskAcceptance: caps.showTaskAcceptance ? (
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <button
                onClick={handleAcceptTask}
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
                onClick={handleRejectTask}
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
              onAfterUpdate={async () => { await refresh(); onAttendanceUpdate?.(); onTaskUpdate?.(); }}
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

      {/* Owner 入住登记编辑弹窗（Portal） */}
      {user.role === 'owner' && ownerEditingEntry && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ width: '90%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto' }}>
            <CalendarEntryForm
              initialData={{
                checkInDate: ownerEditingEntry.checkInDate,
                checkOutDate: ownerEditingEntry.checkOutDate,
                guestCount: ownerEditingEntry.guestCount,
                ownerNotes: ownerEditingEntry.ownerNotes || '',
                cleaningDates: ownerEditingEntry.cleaningDates || []
              }}
              onSubmit={saveOwnerEntry}
              onCancel={() => setOwnerEditingEntry(null)}
              title="编辑入住登记"
            />
          </div>
        </div>,
        document.body
      )}

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
              更改清洁人员
            </h3>
            <button
              onClick={() => {
                setShowAssignPanel(false);
                setSelectedCleaners([]);
                setAssignmentNotes('');
                setSelectionDirty(false);
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

          {/* 当前已选择的清洁工显示 */}
          {selectedCleanerChips.length > 0 && (
            <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#dbeafe', borderRadius: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#1e40af', marginBottom: 8 }}>
                当前已选择清洁工：
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {selectedCleanerChips.map(({ id, name }) => (
                  <div
                    key={id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 8px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #3b82f6',
                      borderRadius: 4,
                      fontSize: 12
                    }}
                  >
                    <span style={{ color: '#1e40af' }}>{name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSelectedCleaner(id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: 14,
                        padding: 0,
                        width: 16,
                        height: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              {task.status === 'assigned' && (
                <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 8 }}>
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
                setSelectionDirty(false);
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