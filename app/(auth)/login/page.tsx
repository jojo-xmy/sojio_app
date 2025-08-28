"use client";
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserStore } from '@/store/userStore';
import { LoginRoleSelector } from '@/components/LoginRoleSelector';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isInitialized } = useUserStore();
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingRegister, setLoadingRegister] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [detectedLineUserId, setDetectedLineUserId] = useState<string | null>(null);

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

  // 如果用户已登录且不在角色选择状态，重定向到dashboard
  useEffect(() => {
    if (isInitialized && user && !showRoleSelector) {
      router.push('/dashboard');
    }
  }, [user, isInitialized, router, showRoleSelector]);

  const handleLineLogin = () => {
    setLoadingLogin(true);
    setError(null);
    
    // 重定向到LINE OAuth授权页面进行登录检测
    window.location.href = '/api/auth/line?mode=check_roles';
  };

  const handleLineRegister = () => {
    setLoadingRegister(true);
    setError(null);
    
    // 重定向到LINE OAuth授权页面进行注册
    window.location.href = '/api/auth/line?mode=register';
  };

  // 检查URL参数中是否有角色检测结果
  useEffect(() => {
    const lineUserId = searchParams.get('lineUserId');
    const hasRoles = searchParams.get('hasRoles');
    
    if (lineUserId && hasRoles === 'true') {
      setDetectedLineUserId(lineUserId);
      setShowRoleSelector(true);
    } else if (lineUserId && hasRoles === 'false') {
      // 没有找到角色，显示注册选项而不是自动跳转
      setDetectedLineUserId(lineUserId);
      // 不自动跳转，让用户选择是否要注册
    }
  }, [searchParams, router]);

  // 注：登录页不再提供退出登录按钮

  // 显示角色选择器
  if (showRoleSelector && detectedLineUserId) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <LoginRoleSelector 
          lineUserId={detectedLineUserId}
          onRegisterNew={() => {
            router.push(`/register?lineUserId=${detectedLineUserId}`);
          }}
        />
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // 如果检测到LINE用户但没有角色，显示注册提示
  if (detectedLineUserId && !showRoleSelector) {
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
              fontSize: '1.5rem', 
              fontWeight: '700', 
              color: '#1f2937',
              marginBottom: '0.5rem'
            }}>
              欢迎使用HUG清洁系统
            </h1>
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              检测到您是新用户，请选择要注册的身份
            </p>
          </div>

          <button
            onClick={() => router.push(`/register?lineUserId=${detectedLineUserId}`)}
            style={{
              width: '100%',
              padding: '1rem',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '0.75rem',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#059669';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#10b981';
            }}
          >
            <span style={{ fontSize: '1.25rem', marginRight: '0.5rem' }}>✨</span>
            立即注册账号
          </button>

          <button
            onClick={() => {
              setDetectedLineUserId(null);
              setShowRoleSelector(false);
            }}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#4b5563';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#6b7280';
            }}
          >
            返回登录页面
          </button>

          <div style={{ 
            marginTop: '1.5rem', 
            padding: '1rem', 
            background: '#f9fafb', 
            borderRadius: '8px',
            fontSize: '0.75rem',
            color: '#6b7280'
          }}>
            <p style={{ margin: 0 }}>
              注册后您可以使用同一LINE账号注册多个身份（清洁员、管理者、房东），并随时切换。
            </p>
          </div>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

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
            使用LINE账号登录或注册清洁任务管理系统
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

        {/* 登录按钮 */}
        <button
          onClick={handleLineLogin}
          disabled={loadingLogin}
          style={{
            width: '100%',
            padding: '1rem',
            background: loadingLogin ? '#9ca3af' : '#00B900',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: loadingLogin ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'background-color 0.2s',
            marginBottom: '0.75rem'
          }}
        >
          {loadingLogin ? (
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

        {/* 注册按钮 */}
        <button
          onClick={handleLineRegister}
          disabled={loadingRegister}
          style={{
            width: '100%',
            padding: '1rem',
            background: loadingRegister ? '#9ca3af' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: loadingRegister ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'background-color 0.2s'
          }}
        >
          {loadingRegister ? (
            <>
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid transparent',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              注册中...
            </>
          ) : (
            <>
              <span style={{ fontSize: '1.25rem' }}>✨</span>
              没有账号？使用LINE注册
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
          <h3 style={{ marginBottom: '0.5rem', fontWeight: '600' }}>说明</h3>
          <ul style={{ textAlign: 'left', margin: 0, paddingLeft: '1rem' }}>
            <li>如果您已有账号，系统会检测您的所有身份</li>
            <li>同一LINE账号可注册多个角色（清洁员、管理者、房东）</li>
            <li>可以随时在系统中切换身份</li>
            <li>首次注册默认角色为清洁员</li>
          </ul>
        </div>

        {/* 登录页不显示退出登录按钮 */}

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