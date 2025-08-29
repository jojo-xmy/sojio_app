"use client";
import React, { useState, useEffect } from 'react';
import { Attendance } from '@/lib/attendance';
import { supabase } from '@/lib/supabase';

interface AttendanceSummaryProps {
  assignedCleaners?: string[];
  attendances: Attendance[];
}

interface UserProfile {
  id: string;
  name: string;
}

export const AttendanceSummary: React.FC<AttendanceSummaryProps> = ({ assignedCleaners, attendances }) => {
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const checkedInRecords = attendances.filter(a => a.status === 'checked_in');
  const checkedOutRecords = attendances.filter(a => a.status === 'checked_out');
  const totalAssigned = (assignedCleaners || []).length;

  // 获取用户信息
  useEffect(() => {
    const fetchUserProfiles = async () => {
      if (attendances.length === 0) return;
      
      const userIds = [...new Set(attendances.map(a => a.user_id))];
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, name')
        .in('id', userIds);
      
      if (!error && data) {
        setUserProfiles(data);
      }
    };

    fetchUserProfiles();
  }, [attendances]);

  // 根据用户ID获取姓名
  const getUserName = (userId: string) => {
    const userProfile = userProfiles.find(u => u.id === userId);
    if (userProfile) {
      return userProfile.name;
    }
    // 如果assignedCleaners包含名字，尝试匹配
    if (assignedCleaners && assignedCleaners.length > 0) {
      // 这里简化处理，实际项目中应该通过用户ID查询用户信息
      // 暂时返回用户ID的最后4位作为标识
      return `用户${userId.slice(-4)}`;
    }
    return `用户${userId.slice(-4)}`;
  };

  return (
    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
      <div style={{ fontWeight: 600, marginBottom: 8, color: '#374151' }}>👥 出勤状态</div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
        <div style={{ color: '#16a34a' }}>✅ 出勤：{checkedInRecords.length}/{totalAssigned} 人</div>
        <div style={{ color: '#2563eb' }}>🏁 退勤：{checkedOutRecords.length}/{totalAssigned} 人</div>
      </div>
      
      {checkedInRecords.length > 0 && (
        <div style={{ marginTop: 12, padding: '8px 0' }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#16a34a', marginBottom: 4 }}>📅 出勤记录：</div>
          {checkedInRecords.map(record => (
            <div key={record.id} style={{ marginLeft: 8, fontSize: 12, color: '#065f46', marginBottom: 2 }}>
              • {getUserName(record.user_id)}: {record.check_in_time ? new Date(record.check_in_time).toLocaleString('zh-CN') : '未记录'}
            </div>
          ))}
        </div>
      )}
      
      {checkedOutRecords.length > 0 && (
        <div style={{ marginTop: 12, padding: '8px 0' }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#2563eb', marginBottom: 4 }}>🏁 退勤记录：</div>
          {checkedOutRecords.map(record => (
            <div key={record.id} style={{ marginLeft: 8, fontSize: 12, color: '#1e40af', marginBottom: 2 }}>
              • {getUserName(record.user_id)}: {record.check_out_time ? new Date(record.check_out_time).toLocaleString('zh-CN') : '未记录'}
            </div>
          ))}
        </div>
      )}
      
      {attendances.length === 0 && (
        <div style={{ color: '#6b7280', fontSize: 12, fontStyle: 'italic' }}>暂无打卡记录</div>
      )}
    </div>
  );
};


