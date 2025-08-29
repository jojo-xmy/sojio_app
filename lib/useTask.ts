"use client";
import { useCallback, useEffect, useState } from 'react';
import { Task } from '@/types/task';
import { Attendance, getAttendanceByTaskId, getUserLatestAttendance } from '@/lib/attendance';
import { TaskImage, getTaskImages } from '@/lib/upload';
import { useUserStore } from '@/store/userStore';

export function useTask(task: Task) {
  const user = useUserStore(s => s.user);
  const [allAttendances, setAllAttendances] = useState<Attendance[]>([]);
  const [currentStatus, setCurrentStatus] = useState<'none' | 'checked_in' | 'checked_out'>('none');
  const [images, setImages] = useState<TaskImage[]>([]);

  const refresh = useCallback(async () => {
    if (!task) return;
    const list = await getAttendanceByTaskId(task.id);
    setAllAttendances(list);
    if (user) {
      const latest = await getUserLatestAttendance(task.id, user.id.toString());
      setCurrentStatus(latest);
    }
    const imgs = await getTaskImages(task.id);
    setImages(imgs);
  }, [task.id, user?.id]); // 只依赖task.id和user.id，而不是整个task和user对象

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    allAttendances,
    currentStatus,
    images,
    refresh
  };
}


