"use client";
import { useEffect, useState } from 'react';
import { useUserStore } from '@/store/userStore';

export const LoginStatusCheck: React.FC = () => {
  const user = useUserStore(s => s.user);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div style={{ 
        padding: 12, 
        background: '#fef3c7', 
        border: '1px solid #f59e0b', 
        borderRadius: 6,
        marginBottom: 16
      }}>
        <strong>🔄 正在加载用户状态...</strong>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ 
        padding: 12, 
        background: '#fef2f2', 
        border: '1px solid #f87171', 
        borderRadius: 6,
        marginBottom: 16
      }}>
        <strong>❌ 未登录</strong>
        <div style={{ fontSize: 12, marginTop: 4 }}>
          请先访问 <a href="/login" style={{ color: '#dc2626' }}>登录页面</a> 进行登录
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: 12, 
      background: '#f0fdf4', 
      border: '1px solid #22c55e', 
      borderRadius: 6,
      marginBottom: 16
    }}>
      <strong>✅ 已登录</strong>
      <div style={{ fontSize: 12, marginTop: 4 }}>
        用户：{user.name} ({user.katakana}) | 角色：{user.role}
      </div>
    </div>
  );
}; 