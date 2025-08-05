"use client";
import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { Task } from '@/types/task';
import { useUserStore } from '@/store/userStore';
import { getUserAttendanceByTaskId, checkIn, checkOut, Attendance, getAttendanceByTaskId, getUserLatestAttendance } from '@/lib/attendance';
import { uploadImagesToExistingTask, getTaskImages, TaskImage } from '@/lib/upload';

interface TaskDetailPanelProps {
  task: Task;
  onAttendanceUpdate?: () => void; // 回调函数，用于通知父组件刷新打卡状态
}

export const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({ task, onAttendanceUpdate }) => {
  const user = useUserStore(s => s.user);
  // 打卡状态
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [allAttendances, setAllAttendances] = useState<Attendance[]>([]);
  const [currentStatus, setCurrentStatus] = useState<'none' | 'checked_in' | 'checked_out'>('none');
  const [loading, setLoading] = useState(false);
  // 图片上传
  const [taskImages, setTaskImages] = useState<TaskImage[]>([]);
  const [uploading, setUploading] = useState(false);
  // 备品统计
  const [inventory, setInventory] = useState({ towel: '', soap: '' });
  const [inventorySubmitted, setInventorySubmitted] = useState(false);

  // 加载打卡状态和图片
  useEffect(() => {
    if (user) {
      loadAttendanceStatus();
      loadTaskImages();
    }
  }, [user, task.id]);

  async function loadAttendanceStatus() {
    if (!user) return;
    
    // 加载当前用户的最新打卡状态
    const latestStatus = await getUserLatestAttendance(task.id, user.id.toString());
    setCurrentStatus(latestStatus);
    
    // 如果是manager，加载所有用户的打卡记录
    if (user.role === 'manager') {
      const allAttendanceRecords = await getAttendanceByTaskId(task.id);
      setAllAttendances(allAttendanceRecords);
    }
  }

  async function loadTaskImages() {
    const images = await getTaskImages(task.id);
    setTaskImages(images);
  }

  // 处理图片上传
  async function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;
    
    setUploading(true);
    
    try {
      // 使用批量上传函数
      const uploadedImages = await uploadImagesToExistingTask(files, task.id, user.id.toString());
      if (uploadedImages.length > 0) {
        await loadTaskImages(); // 重新加载图片列表
        console.log(`成功上传 ${uploadedImages.length} 张图片`);
      }
    } catch (error) {
      console.error('上传图片时出错:', error);
    }
    
    setUploading(false);
    e.target.value = ''; // 清空文件输入
  }

  // 处理打卡
  async function handleCheckIn() {
    if (!user) return;
    setLoading(true);
    const success = await checkIn(task.id, user.id.toString());
    if (success) {
      await loadAttendanceStatus();
      onAttendanceUpdate?.(); // 通知父组件刷新
    }
    setLoading(false);
  }

  async function handleCheckOut() {
    if (!user) return;
    setLoading(true);
    const success = await checkOut(task.id, user.id.toString());
    if (success) {
      await loadAttendanceStatus();
      onAttendanceUpdate?.(); // 通知父组件刷新
    }
    setLoading(false);
  }

  // 处理备品统计
  function handleInventoryChange(e: ChangeEvent<HTMLInputElement>) {
    setInventory({ ...inventory, [e.target.name]: e.target.value });
  }
  function handleInventorySubmit(e: FormEvent) {
    e.preventDefault();
    setInventorySubmitted(true);
  }

  // 渲染打卡信息
  function renderAttendanceInfo() {
    if (!user) {
      return <span style={{ color: 'red', marginLeft: 8 }}>请先登录后再打卡</span>;
    }

    // Manager 显示所有用户的打卡状态
    if (user.role === 'manager') {
      const checkedInRecords = allAttendances.filter(a => a.status === 'checked_in');
      const checkedOutRecords = allAttendances.filter(a => a.status === 'checked_out');
      const totalAssigned = task.assignedCleaners.length;
      
      return (
        <div style={{ marginLeft: 8 }}>
          <div>出勤：{checkedInRecords.length}/{totalAssigned} 人</div>
          <div>退勤：{checkedOutRecords.length}/{totalAssigned} 人</div>
          {checkedInRecords.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#16a34a' }}>
              <b>出勤时间：</b>
              {checkedInRecords.map(record => (
                <div key={record.id} style={{ marginLeft: 8 }}>
                  {record.user_id}: {new Date(record.check_in_time!).toLocaleString()}
                </div>
              ))}
            </div>
          )}
          {checkedOutRecords.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#2563eb' }}>
              <b>退勤时间：</b>
              {checkedOutRecords.map(record => (
                <div key={record.id} style={{ marginLeft: 8 }}>
                  {record.user_id}: {new Date(record.check_out_time!).toLocaleString()}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Cleaner 显示自己的打卡状态
    if (currentStatus === 'none') {
      return (
        <button onClick={handleCheckIn} disabled={loading} style={{ marginLeft: 8, padding: '6px 18px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          {loading ? '打卡中...' : '出勤打卡'}
        </button>
      );
    }
    
    if (currentStatus === 'checked_in') {
      // 找到出勤记录显示时间
      const checkInRecord = allAttendances.find(a => a.status === 'checked_in' && a.user_id === user.id.toString());
      return (
        <>
          <span style={{ color: '#16a34a', marginLeft: 8 }}>
            已出勤：{checkInRecord?.check_in_time ? new Date(checkInRecord.check_in_time).toLocaleString() : ''}
          </span>
          <button onClick={handleCheckOut} disabled={loading} style={{ marginLeft: 12, padding: '6px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            {loading ? '打卡中...' : '退勤打卡'}
          </button>
        </>
      );
    }
    
    if (currentStatus === 'checked_out') {
      // 找到退勤记录显示时间
      const checkOutRecord = allAttendances.find(a => a.status === 'checked_out' && a.user_id === user.id.toString());
      return (
        <span style={{ color: '#2563eb', marginLeft: 8 }}>
          已退勤：{checkOutRecord?.check_out_time ? new Date(checkOutRecord.check_out_time).toLocaleString() : ''}
        </span>
      );
    }
  }

  return (
    <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 20, background: '#f9fafb' }}>
      <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>{task.hotelName}</div>
      <div style={{ color: '#888', fontSize: 14, marginBottom: 8 }}>任务ID：{task.id} | 日期：{task.date} | 入住时间：{task.checkInTime}</div>
      <div style={{ fontSize: 14, marginBottom: 8 }}>清扫人员：{task.assignedCleaners.join('，')}</div>
      <div style={{ marginBottom: 8 }}><b>任务描述：</b>{task.description}</div>
      <div style={{ marginBottom: 8 }}><b>备注：</b>{task.note}</div>
      {/* 打卡功能 */}
      <div style={{ margin: '16px 0' }}>
        <b>打卡：</b>
        {renderAttendanceInfo()}
      </div>
      {/* 上传图片功能 */}
      <div style={{ margin: '16px 0' }}>
        <b>清扫图片：</b>
        <input 
          type="file" 
          accept="image/*" 
          multiple
          onChange={handleImageChange}
          disabled={uploading}
          style={{ marginLeft: 8 }} 
        />
        {uploading && <span style={{ marginLeft: 8, color: '#666' }}>上传中...</span>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          {taskImages.map((image) => (
            <div key={image.id} style={{ position: 'relative' }}>
              <img 
                src={image.image_url} 
                alt={`清扫图片`} 
                style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee' }} 
              />
              <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
                {new Date(image.uploaded_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* 备品统计功能 */}
      <div style={{ margin: '16px 0' }}>
        <b>备品统计：</b>
        <form onSubmit={handleInventorySubmit} style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
          <label>毛巾数：<input name="towel" type="number" min={0} value={inventory.towel} onChange={handleInventoryChange} style={{ width: 60, marginLeft: 4 }} /></label>
          <label>香皂数：<input name="soap" type="number" min={0} value={inventory.soap} onChange={handleInventoryChange} style={{ width: 60, marginLeft: 4 }} /></label>
          <button type="submit" style={{ padding: '6px 18px', background: '#f59e42', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>提交</button>
        </form>
        {inventorySubmitted && <div style={{ color: '#16a34a', marginTop: 8 }}>已提交：毛巾 {inventory.towel}，香皂 {inventory.soap}</div>}
      </div>
    </div>
  );
}; 