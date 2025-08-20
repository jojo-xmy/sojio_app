"use client";
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserStore } from '@/store/userStore';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setUser, isInitialized } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 检查URL参数中的错误
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      switch (errorParam) {
        case 'oauth_failed':
          setError('LINE登录失败，请重试');
          break;
        case 'login_failed':
          setError('登录处理失败，请重试');
          break;
        default:
          setError('登录过程中发生错误');
      }
    }
  }, [searchParams]);

  // 如果用户已登录，重定向到dashboard
  useEffect(() => {
    if (isInitialized && user) {
      router.push('/dashboard');
    }
  }, [user, isInitialized, router]);

  const handleLineLogin = () => {
    setLoading(true);
    setError(null);
    
    // 重定向到LINE OAuth授权页面
    window.location.href = '/api/auth/line';
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/line?action=logout', { method: 'POST' });
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

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
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: '700', 
            color: '#1f2937',
            marginBottom: '0.5rem'
          }}>
            HUG Cleaning App
          </h1>
          <p style={{ 
            color: '#6b7280', 
            fontSize: '1rem' 
          }}>
            使用LINE账号登录清洁任务管理系统
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleLineLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '1rem',
            background: loading ? '#9ca3af' : '#00B900',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'background-color 0.2s'
          }}
        >
          {loading ? (
            <>
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid transparent',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              登录中...
            </>
          ) : (
            <>
              <span style={{ fontSize: '1.25rem' }}>📱</span>
              使用LINE登录
            </>
          )}
        </button>

        <div style={{ 
          marginTop: '2rem', 
          padding: '1rem', 
          background: '#f9fafb', 
          borderRadius: '8px',
          fontSize: '0.875rem',
          color: '#6b7280'
        }}>
          <h3 style={{ marginBottom: '0.5rem', fontWeight: '600' }}>登录说明</h3>
          <ul style={{ textAlign: 'left', margin: 0, paddingLeft: '1rem' }}>
            <li>使用LINE账号快速登录</li>
            <li>系统会自动创建或更新您的档案</li>
            <li>首次登录默认角色为清洁员</li>
            <li>角色可在登录后由管理员调整</li>
          </ul>
        </div>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <a 
            href="/register" 
            style={{ 
              color: '#3b82f6', 
              textDecoration: 'none',
              fontSize: '0.875rem'
            }}
          >
            没有账号？立即注册
          </a>
        </div>

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