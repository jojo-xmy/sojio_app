"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/userStore';
import { useTranslation } from '@/hooks/useTranslation';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isInitialized } = useUserStore();
  const { t } = useTranslation('dashboard');

  useEffect(() => {
    // 等待用户状态初始化
    if (!isInitialized) return;

    // 如果用户未登录，重定向到登录页面
    if (!user) {
      router.push('/login');
      return;
    }

    // 根据用户角色重定向到对应的dashboard
    switch (user.role) {
      case 'cleaner':
        router.push('/dashboard/cleaner');
        break;
      case 'manager':
        router.push('/dashboard/manager');
        break;
      case 'owner':
        router.push('/dashboard/owner');
        break;
      default:
        // 默认重定向到cleaner页面
        router.push('/dashboard/cleaner');
    }
  }, [user, isInitialized, router]);

  // 显示加载状态
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #e5e7eb',
          borderTop: '3px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 1rem'
        }} />
        <p style={{ color: '#6b7280', fontSize: '1rem' }}>
          {t('loadingMessage')}
        </p>
        
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
} 