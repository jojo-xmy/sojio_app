"use client";
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserStore } from '@/store/userStore';
import { useTranslation } from '@/hooks/useTranslation';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

type UserRole = 'owner' | 'manager' | 'cleaner';

interface RegistrationData {
  lineUserId: string;
  name: string;
  avatar?: string;
  role: UserRole;
}

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setUser } = useUserStore();
  const { t, locale } = useTranslation('register');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('cleaner');

  // 检查是否从LINE授权回调
  useEffect(() => {
    const lineUserId = searchParams.get('lineUserId');
    const displayName = searchParams.get('displayName');
    const pictureUrl = searchParams.get('pictureUrl');
    const error = searchParams.get('error');

    if (error) {
      setError(t('oauthFailed'));
      return;
    }

    if (lineUserId && displayName) {
      // 从URL参数获取用户信息
      setRegistrationData({
        lineUserId,
        name: displayName,
        avatar: pictureUrl || undefined,
        role: 'cleaner', // 默认身份
      });
    }
  }, [searchParams]);

  // 如果用户已登录，重定向到dashboard
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleLineRegister = () => {
    setLoading(true);
    setError(null);
    
    // 重定向到LINE OAuth授权页面（注册模式）
    window.location.href = '/api/auth/line?mode=register';
  };

  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registrationData) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...registrationData,
          role: selectedRole,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('registrationFailed'));
      }

      const result = await response.json();
      
      if (result.status === 'pending') {
        // 需要管理员审核
        alert(t('registrationSubmitted'));
        router.push('/login');
      } else if (result.status === 'approved') {
        // 直接注册成功
        alert(t('registrationSuccess'));
        router.push('/login');
      }
    } catch (error) {
      console.error('Registration failed:', error);
      setError(error instanceof Error ? error.message : t('registrationFailedRetry'));
    } finally {
      setLoading(false);
    }
  };

  if (loading && !registrationData) {
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
            {t('fetchingUserInfo')}
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

  if (registrationData) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          zIndex: 10
        }}>
          <LanguageSwitcher />
        </div>
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '500px'
        }}>
          <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
            <h1 style={{ 
              fontSize: '2rem', 
              fontWeight: '700', 
              color: '#1f2937',
              marginBottom: '0.5rem'
            }}>
              {t('title')}
            </h1>
            <p style={{ color: '#6b7280', fontSize: '1rem' }}>
              {t('subtitle')}
            </p>
          </div>

          {registrationData.avatar && (
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <img 
                src={registrationData.avatar} 
                alt={t('avatar')} 
                style={{ 
                  width: '80px', 
                  height: '80px', 
                  borderRadius: '50%',
                  border: '3px solid #e5e7eb'
                }} 
              />
            </div>
          )}

                     <form onSubmit={handleSubmitRegistration}>
             <div style={{ marginBottom: '1.5rem' }}>
               <div style={{ 
                 padding: '1rem', 
                 background: '#f9fafb', 
                 borderRadius: '8px',
                 border: '1px solid #e5e7eb'
               }}>
                 <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>{t('userInfo')}</div>
                 <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                   <div>{t('name')}{registrationData.name}</div>
                   <div>{t('lineId')}{registrationData.lineUserId}</div>
                 </div>
               </div>
             </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                {t('selectRole')}
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  { value: 'cleaner', label: t('roles.cleaner.label'), desc: t('roles.cleaner.desc') },
                  { value: 'manager', label: t('roles.manager.label'), desc: t('roles.manager.desc') },
                  { value: 'owner', label: t('roles.owner.label'), desc: t('roles.owner.desc') }
                ].map((role) => (
                  <label key={role.value} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '0.75rem',
                    border: selectedRole === role.value ? '2px solid #3b82f6' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: selectedRole === role.value ? '#eff6ff' : 'white'
                  }}>
                    <input
                      type="radio"
                      name="role"
                      value={role.value}
                      checked={selectedRole === role.value}
                      onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                      style={{ marginRight: '0.75rem' }}
                    />
                    <div>
                      <div style={{ fontWeight: '600' }}>{role.label}</div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{role.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
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
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '1rem',
                background: loading ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginBottom: '1rem'
              }}
            >
              {loading ? t('submitting') : t('submitRegistration')}
            </button>

            <button
              type="button"
              onClick={() => router.push('/login')}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'transparent',
                color: '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              {t('backToLogin')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      position: 'relative'
    }}>
      <div style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        zIndex: 10
      }}>
        <LanguageSwitcher />
      </div>
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
            {t('welcomeTitle')}
          </h1>
          <p style={{ 
            color: '#6b7280', 
            fontSize: '1rem' 
          }}>
            {t('welcomeSubtitle')}
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
          onClick={handleLineRegister}
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
            transition: 'background-color 0.2s',
            marginBottom: '1.5rem'
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
              {t('authorizing')}
            </>
          ) : (
            <>
              <span style={{ fontSize: '1.25rem' }}>📱</span>
              {t('registerWithLine')}
            </>
          )}
        </button>

        <div style={{ 
          padding: '1rem', 
          background: '#f9fafb', 
          borderRadius: '8px',
          fontSize: '0.875rem',
          color: '#6b7280'
        }}>
          <h3 style={{ marginBottom: '0.5rem', fontWeight: '600' }}>{t('instructions')}</h3>
          <ul style={{ textAlign: 'left', margin: 0, paddingLeft: '1rem' }}>
            <li>{t('instruction1')}</li>
            <li>{t('instruction2')}</li>
            <li>{t('instruction3')}</li>
            <li>{t('instruction4')}</li>
          </ul>
        </div>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <a 
            href="/login" 
            style={{ 
              color: '#3b82f6', 
              textDecoration: 'none',
              fontSize: '0.875rem'
            }}
          >
            {t('hasAccount')}
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

function SuspenseFallback() {
  const { t } = useTranslation('register');
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center text-gray-600">{t('loading')}</div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <RegisterContent />
    </Suspense>
  );
}
 