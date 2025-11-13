"use client";
import React, { useState, useEffect } from 'react';
import { Attendance } from '@/lib/attendance';
import { supabase } from '@/lib/supabase';
import { Users, CheckCircle2, LogOut, Clock } from 'lucide-react';

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
    <div style={{ 
      padding: '16px', 
      background: '#ffffff', 
      borderRadius: '8px', 
      border: '1px solid #e5e7eb',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
    }}>
      {/* 标题 */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 8,
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: '1px solid #f3f4f6'
      }}>
        <Users size={18} color="#6b7280" />
        <span style={{ fontWeight: 600, fontSize: '15px', color: '#1f2937' }}>出勤状态</span>
      </div>
      
      {/* 统计概览 */}
      <div style={{ 
        display: 'flex', 
        gap: 12, 
        marginBottom: 16,
        flexWrap: 'wrap'
      }}>
        <div style={{ 
          flex: 1,
          minWidth: '120px',
          padding: '10px 12px',
          background: '#f0fdf4',
          borderRadius: '6px',
          border: '1px solid #bbf7d0'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6,
            marginBottom: 4
          }}>
            <CheckCircle2 size={16} color="#059669" />
            <span style={{ fontSize: '13px', color: '#059669', fontWeight: 500 }}>出勤</span>
          </div>
          <div style={{ 
            fontSize: '20px', 
            fontWeight: 600, 
            color: '#059669' 
          }}>
            {checkedInRecords.length}<span style={{ fontSize: '14px', fontWeight: 400 }}>/{totalAssigned}</span>
          </div>
        </div>
        
        <div style={{ 
          flex: 1,
          minWidth: '120px',
          padding: '10px 12px',
          background: '#eff6ff',
          borderRadius: '6px',
          border: '1px solid #bfdbfe'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6,
            marginBottom: 4
          }}>
            <LogOut size={16} color="#2563eb" />
            <span style={{ fontSize: '13px', color: '#2563eb', fontWeight: 500 }}>退勤</span>
          </div>
          <div style={{ 
            fontSize: '20px', 
            fontWeight: 600, 
            color: '#2563eb' 
          }}>
            {checkedOutRecords.length}<span style={{ fontSize: '14px', fontWeight: 400 }}>/{totalAssigned}</span>
          </div>
        </div>
      </div>
      
      {/* 出勤记录详情 */}
      {checkedInRecords.length > 0 && (
        <div style={{ 
          marginBottom: 12,
          padding: '12px',
          background: '#f9fafb',
          borderRadius: '6px'
        }}>
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 600, 
            fontSize: '13px', 
            color: '#374151', 
            marginBottom: 8 
          }}>
            <Clock size={14} color="#6b7280" />
            <span>出勤记录</span>
          </div>
          {checkedInRecords.map(record => (
            <div key={record.id} style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '13px', 
              color: '#059669',
              marginBottom: 4,
              paddingLeft: 20
            }}>
              <span style={{ 
                width: 4, 
                height: 4, 
                borderRadius: '50%', 
                background: '#059669',
                flexShrink: 0
              }} />
              <span style={{ fontWeight: 500 }}>{getUserName(record.user_id)}</span>
              <span style={{ color: '#6b7280' }}>
                {record.check_in_time ? new Date(record.check_in_time).toLocaleString('zh-CN', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : '未记录'}
              </span>
            </div>
          ))}
        </div>
      )}
      
      {/* 退勤记录详情 */}
      {checkedOutRecords.length > 0 && (
        <div style={{ 
          padding: '12px',
          background: '#f9fafb',
          borderRadius: '6px'
        }}>
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 600, 
            fontSize: '13px', 
            color: '#374151', 
            marginBottom: 8 
          }}>
            <Clock size={14} color="#6b7280" />
            <span>退勤记录</span>
          </div>
          {checkedOutRecords.map(record => (
            <div key={record.id} style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '13px', 
              color: '#2563eb',
              marginBottom: 4,
              paddingLeft: 20
            }}>
              <span style={{ 
                width: 4, 
                height: 4, 
                borderRadius: '50%', 
                background: '#2563eb',
                flexShrink: 0
              }} />
              <span style={{ fontWeight: 500 }}>{getUserName(record.user_id)}</span>
              <span style={{ color: '#6b7280' }}>
                {record.check_out_time ? new Date(record.check_out_time).toLocaleString('zh-CN', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : '未记录'}
              </span>
            </div>
          ))}
        </div>
      )}
      
      {/* 无记录状态 */}
      {attendances.length === 0 && (
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          color: '#9ca3af', 
          fontSize: '14px',
          fontStyle: 'italic'
        }}>
          <Clock size={16} style={{ marginRight: 6, opacity: 0.5 }} />
          暂无打卡记录
        </div>
      )}
    </div>
  );
};


