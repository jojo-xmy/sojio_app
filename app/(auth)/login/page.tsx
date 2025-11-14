"use client";
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserStore } from '@/store/userStore';
import { LoginRoleSelector } from '@/components/LoginRoleSelector';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTranslation } from '@/hooks/useTranslation';
import { MessageCircle, UserPlus, Loader2, Sparkles, ArrowLeft, AlertCircle } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t: tLogin } = useTranslation('login');
  const { t: tCommon } = useTranslation();
  const { user, isInitialized } = useUserStore();
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingRegister, setLoadingRegister] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [detectedLineUserId, setDetectedLineUserId] = useState<string | null>(null);

  // 检查URL参数中的错误
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      switch (errorParam) {
        case 'oauth_failed':
        case 'login_failed':
          setErrorCode(errorParam);
          break;
        default:
          setErrorCode('generic');
      }
    } else {
      setErrorCode(null);
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
    setErrorCode(null);
    
    // 重定向到LINE OAuth授权页面进行登录检测
    window.location.href = '/api/auth/line?mode=check_roles';
  };

  const handleLineRegister = () => {
    setLoadingRegister(true);
    setErrorCode(null);
    
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

  const errorMessage = errorCode
    ? (() => {
        switch (errorCode) {
          case 'oauth_failed':
            return tLogin('errors.oauthFailed');
          case 'login_failed':
            return tLogin('errors.loginFailed');
          default:
            return tLogin('errors.generic');
        }
      })()
    : null;

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
          padding: '2.5rem',
          borderRadius: '18px',
          boxShadow: '0 18px 45px rgba(31, 41, 55, 0.18)',
          width: '100%',
          maxWidth: '428px',
          textAlign: 'center',
          border: '1px solid rgba(148, 163, 184, 0.18)'
        }}>
          <div style={{ 
            marginBottom: '1.85rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(253, 224, 71, 0.32), rgba(251, 191, 36, 0.18))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 12px 24px rgba(250, 204, 21, 0.22)'
            }}>
              <Sparkles size={30} color="#CA8A04" strokeWidth={1.8} />
            </div>
            <div>
              <h1
                style={{ 
                fontSize: '1.6rem', 
                fontWeight: 700, 
                color: '#111827',
                marginBottom: '0.4rem'
              }}
                data-translatable
              >
                {tLogin('welcomeTitle')}
              </h1>
              <p style={{ color: '#475569', fontSize: '0.95rem', margin: 0 }} data-translatable>
                {tLogin('newUserDetected')}
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push(`/register?lineUserId=${detectedLineUserId}`)}
            style={{
              width: '100%',
              padding: '1.05rem 1.25rem',
              background: 'linear-gradient(135deg, #22C55E, #16A34A)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.65rem',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              boxShadow: '0 18px 30px rgba(34, 197, 94, 0.28)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 22px 36px rgba(34, 197, 94, 0.32)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 18px 30px rgba(34, 197, 94, 0.28)';
            }}
          >
            <UserPlus size={20} />
            {tLogin('registerNow')}
          </button>

          <button
            onClick={() => {
              setDetectedLineUserId(null);
              setShowRoleSelector(false);
            }}
            style={{
              width: '100%',
              padding: '0.95rem 1.2rem',
              background: 'linear-gradient(135deg, #E2E8F0, #CBD5F5)',
              color: '#1E293B',
              border: 'none',
              borderRadius: '12px',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.55rem',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              boxShadow: '0 12px 22px rgba(148, 163, 184, 0.25)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 16px 28px rgba(148, 163, 184, 0.28)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 12px 22px rgba(148, 163, 184, 0.25)';
            }}
          >
            <ArrowLeft size={18} />
            {tLogin('backToLogin')}
          </button>

          <div style={{ 
            marginTop: '1.65rem', 
            padding: '1.1rem', 
            background: 'linear-gradient(135deg, rgba(239, 246, 255, 0.85), rgba(221, 214, 254, 0.45))', 
            borderRadius: '14px',
            fontSize: '0.82rem',
            color: '#1F2937',
            border: '1px solid rgba(191, 219, 254, 0.6)',
            textAlign: 'left'
          }}>
            <p style={{ margin: 0, lineHeight: 1.55 }} data-translatable>
              {tLogin('registerSuccessNote')}
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
        padding: '2.5rem',
        borderRadius: '18px',
        boxShadow: '0 18px 45px rgba(31, 41, 55, 0.18)',
        width: '100%',
        maxWidth: '428px',
        textAlign: 'center',
        border: '1px solid rgba(148, 163, 184, 0.18)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <LanguageSwitcher />
        </div>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '0.9rem',
          marginBottom: '1.75rem'
        }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(56,189,248,0.28))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 12px 24px rgba(59,130,246,0.16)'
          }}>
            <Sparkles size={26} color="#2563EB" strokeWidth={1.8} />
          </div>
          <h1 style={{ 
            fontSize: '2.05rem', 
            fontWeight: 700, 
            color: '#111827',
            margin: 0,
            letterSpacing: '0.02em'
          }}>
            {tCommon('common.appName')}
          </h1>
        </div>

        {errorMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            background: 'linear-gradient(135deg, rgba(254, 226, 226, 0.85), rgba(254, 202, 202, 0.65))',
            border: '1px solid rgba(248, 113, 113, 0.45)',
            color: '#B91C1C',
            padding: '0.95rem 1.15rem',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
            boxShadow: '0 6px 18px rgba(248, 113, 113, 0.18)'
          }}>
            <AlertCircle size={20} style={{ marginTop: '1px' }} />
            <span>{errorMessage}</span>
          </div>
        )}

        <button
          onClick={handleLineLogin}
          disabled={loadingLogin}
          style={{
            width: '100%',
            padding: '1.05rem 1.25rem',
            background: loadingLogin ? 'linear-gradient(135deg, #94A3B8, #CBD5F5)' : 'linear-gradient(135deg, #0EA5E9, #1D4ED8)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: loadingLogin ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.65rem',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            boxShadow: loadingLogin ? 'none' : '0 18px 30px rgba(14, 165, 233, 0.3)',
            marginBottom: '0.85rem'
          }}
          onMouseEnter={(e) => {
            if (!loadingLogin) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 22px 40px rgba(14, 165, 233, 0.35)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = loadingLogin ? 'none' : '0 18px 30px rgba(14, 165, 233, 0.3)';
          }}
        >
          {loadingLogin ? (
            <>
              <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
              {tLogin('states.loggingIn')}
            </>
          ) : (
            <>
              <MessageCircle size={20} />
              {tLogin('lineLogin')}
            </>
          )}
        </button>

        <button
          onClick={handleLineRegister}
          disabled={loadingRegister}
          style={{
            width: '100%',
            padding: '1.05rem 1.25rem',
            background: loadingRegister ? 'linear-gradient(135deg, #94A3B8, #CBD5F5)' : 'linear-gradient(135deg, #22C55E, #16A34A)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: loadingRegister ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.65rem',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            boxShadow: loadingRegister ? 'none' : '0 18px 30px rgba(34, 197, 94, 0.28)'
          }}
          onMouseEnter={(e) => {
            if (!loadingRegister) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 22px 36px rgba(34, 197, 94, 0.32)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = loadingRegister ? 'none' : '0 18px 30px rgba(34, 197, 94, 0.28)';
          }}
        >
          {loadingRegister ? (
            <>
              <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
              {tLogin('states.registering')}
            </>
          ) : (
            <>
              <UserPlus size={20} />
              {tLogin('lineRegister')}
            </>
          )}
        </button>

        <div style={{ 
          marginTop: '2rem', 
          padding: '1.15rem', 
          background: 'linear-gradient(135deg, rgba(239, 246, 255, 0.85), rgba(209, 250, 229, 0.55))', 
          borderRadius: '14px',
          fontSize: '0.88rem',
          color: '#1F2937',
          textAlign: 'left',
          border: '1px solid rgba(191, 219, 254, 0.6)'
        }}>
          <h3
            style={{ 
            margin: 0, 
            marginBottom: '0.75rem', 
            fontWeight: 600, 
            color: '#1E3A8A',
            fontSize: '0.95rem'
          }}
            data-translatable
          >
            {tLogin('loginDescriptionTitle')}
          </h3>
          <ul style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.65rem', 
            margin: 0, 
            padding: 0, 
            listStyle: 'none' 
          }}>
            {[tLogin('descriptionOne'), tLogin('descriptionTwo'), tLogin('descriptionThree')].map((item) => (
              <li key={item} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', color: '#0F172A' }} data-translatable>
                <span style={{
                  marginTop: '2px',
                  minWidth: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #38BDF8, #22C55E)',
                  boxShadow: '0 4px 10px rgba(56, 189, 248, 0.35)'
                }} />
                <span style={{ lineHeight: 1.5 }}>{item}</span>
              </li>
            ))}
          </ul>
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

export default function LoginPage() {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <LoginContent />
    </Suspense>
  );
}

function SuspenseFallback() {
  const { t: tCommon } = useTranslation();
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
        <p>{tCommon('common.loading')}</p>
      </div>
    </div>
  );
}