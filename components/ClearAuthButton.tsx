"use client";
import { useState } from 'react';
import { useUserStore } from '@/store/userStore';
import { useRouter } from 'next/navigation';

export const ClearAuthButton: React.FC = () => {
  const { clearUser, setInitialized } = useUserStore();
  const router = useRouter();
  const [isClearing, setIsClearing] = useState(false);

  const handleClearAuth = async () => {
    try {
      setIsClearing(true);
      
      // 清除所有认证相关的cookies
      document.cookie = 'user_info=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'line_access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'line_refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
      // 清除本地存储
      localStorage.removeItem('hug-user-storage');
      sessionStorage.clear();
      
      // 清除用户状态
      clearUser();
      setInitialized(false);
      
      // 重新加载页面以确保完全清除
      window.location.reload();
    } catch (error) {
      console.error('清除认证状态失败:', error);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <button
      onClick={handleClearAuth}
      disabled={isClearing}
      style={{
        padding: '0.5rem 1rem',
        background: '#f3f4f6',
        color: '#6b7280',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '0.875rem',
        cursor: isClearing ? 'not-allowed' : 'pointer',
        opacity: isClearing ? 0.6 : 1,
        transition: 'all 0.2s'
      }}
      onMouseOver={(e) => {
        if (!isClearing) {
          e.currentTarget.style.background = '#e5e7eb';
          e.currentTarget.style.borderColor = '#9ca3af';
        }
      }}
      onMouseOut={(e) => {
        if (!isClearing) {
          e.currentTarget.style.background = '#f3f4f6';
          e.currentTarget.style.borderColor = '#d1d5db';
        }
      }}
    >
      {isClearing ? '清除中...' : '清除登录状态'}
    </button>
  );
};

