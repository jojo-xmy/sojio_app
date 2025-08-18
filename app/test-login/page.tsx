"use client";
import { useState } from 'react';
import { useUserStore } from '@/store/userStore';
import { LoginStatusCheck } from '@/components/LoginStatusCheck';

const mockUsers = [
  { id: 1, name: '山田太郎', katakana: 'ヤマダ タロウ', role: 'cleaner', avatar: 'https://randomuser.me/api/portraits/men/1.jpg' },
  { id: 2, name: '佐藤花子', katakana: 'サトウ ハナコ', role: 'manager', avatar: 'https://randomuser.me/api/portraits/women/2.jpg' },
  { id: 3, name: '鈴木一郎', katakana: 'スズキ イチロウ', role: 'owner', avatar: 'https://randomuser.me/api/portraits/men/3.jpg' },
];

export default function TestLoginPage() {
  const { user, setUser, clearUser } = useUserStore();
  const [selectedUser, setSelectedUser] = useState<number | null>(null);

  const handleLogin = (userId: number) => {
    const user = mockUsers.find(u => u.id === userId);
    if (user) {
      setUser(user);
      setSelectedUser(userId);
    }
  };

  const handleLogout = () => {
    clearUser();
    setSelectedUser(null);
  };

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>登录状态测试</h1>
      
      {/* 登录状态检查 */}
      <LoginStatusCheck />
      
      {/* 快速登录 */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>快速登录测试</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {mockUsers.map(u => (
            <button
              key={u.id}
              onClick={() => handleLogin(u.id)}
              disabled={selectedUser === u.id}
              style={{
                padding: '12px 16px',
                background: selectedUser === u.id ? '#22c55e' : '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: selectedUser === u.id ? 'default' : 'pointer',
                fontSize: 14,
                fontWeight: 600
              }}
            >
              {selectedUser === u.id ? '✅ 已登录' : `登录为 ${u.name}`}
            </button>
          ))}
        </div>
      </div>

      {/* 登出 */}
      {user && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>登出</h2>
          <button
            onClick={handleLogout}
            style={{
              padding: '12px 16px',
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600
            }}
          >
            登出当前用户
          </button>
        </div>
      )}

      {/* 用户信息显示 */}
      {user && (
        <div style={{ 
          padding: 16, 
          background: '#f0f9ff', 
          borderRadius: 8,
          border: '1px solid #0ea5e9'
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>当前登录用户信息</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <img 
              src={user.avatar} 
              alt={user.name} 
              style={{ width: 48, height: 48, borderRadius: '50%' }} 
            />
            <div>
              <div style={{ fontWeight: 600 }}>{user.name}</div>
              <div style={{ fontSize: 14, color: '#666' }}>{user.katakana}</div>
              <div style={{ fontSize: 14, color: '#666' }}>
                角色：{user.role === 'owner' ? '房东' : user.role === 'manager' ? '管理者' : '清洁员'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 测试链接 */}
      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>测试链接</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a 
            href="/test-status-transition" 
            style={{
              padding: '8px 16px',
              background: '#10b981',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600
            }}
          >
            状态转换测试
          </a>
          <a 
            href="/test-task-status" 
            style={{
              padding: '8px 16px',
              background: '#f59e0b',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600
            }}
          >
            任务状态测试
          </a>
          <a 
            href="/dashboard/manager" 
            style={{
              padding: '8px 16px',
              background: '#8b5cf6',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600
            }}
          >
            管理者面板
          </a>
        </div>
      </div>

      {/* 存储信息 */}
      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>存储信息</h2>
        <div style={{ 
          padding: 12, 
          background: '#f9fafb', 
          borderRadius: 6,
          fontSize: 12,
          fontFamily: 'monospace'
        }}>
          <div>存储键名: hug-user-storage</div>
          <div>存储类型: localStorage</div>
          <div>持久化: 是</div>
        </div>
      </div>
    </div>
  );
} 