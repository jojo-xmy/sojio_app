"use client";
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserStore } from '@/store/userStore';

type UserRole = 'owner' | 'manager' | 'cleaner';

interface RegistrationData {
  lineUserId: string;
  name: string;
  avatar?: string;
  role: UserRole;
}

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setUser } = useUserStore();
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
      setError('LINE授权失败，请重试');
      return;
    }

    if (lineUserId && displayName) {
      // 从URL参数获取用户信息
      setRegistrationData({
        lineUserId,
        name: displayName,
        avatar: pictureUrl || undefined,
        role: 'cleaner', // 默认角色
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
        throw new Error(errorData.error || '注册失败');
      }

      const result = await response.json();
      
      if (result.status === 'pending') {
        // 需要管理员审核
        alert('注册申请已提交，等待管理员审核。审核通过后您将收到LINE通知。');
        router.push('/login');
      } else if (result.status === 'approved') {
        // 直接注册成功
        alert('注册成功！');
        router.push('/login');
      }
    } catch (error) {
      console.error('注册失败:', error);
      setError(error instanceof Error ? error.message : '注册失败，请重试');
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
            正在获取LINE用户信息...
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
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
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
              完成注册
            </h1>
            <p style={{ color: '#6b7280', fontSize: '1rem' }}>
              请确认您的信息并选择角色
            </p>
          </div>

          {registrationData.avatar && (
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <img 
                src={registrationData.avatar} 
                alt="头像" 
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
                 <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>用户信息</div>
                 <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                   <div>姓名：{registrationData.name}</div>
                   <div>LINE ID：{registrationData.lineUserId}</div>
                 </div>
               </div>
             </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                选择角色 *
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  { value: 'cleaner', label: '清洁员', desc: '执行清洁任务' },
                  { value: 'manager', label: '管理者', desc: '分配和管理任务' },
                  { value: 'owner', label: '房东', desc: '查看任务完成情况' }
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
              {loading ? '提交中...' : '提交注册申请'}
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
              返回登录
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
            使用LINE账号注册清洁任务管理系统
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
              授权中...
            </>
          ) : (
            <>
              <span style={{ fontSize: '1.25rem' }}>📱</span>
              使用LINE注册
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
          <h3 style={{ marginBottom: '0.5rem', fontWeight: '600' }}>注册说明</h3>
          <ul style={{ textAlign: 'left', margin: 0, paddingLeft: '1rem' }}>
            <li>使用LINE账号快速注册</li>
            <li>选择适合的角色（清洁员/管理者/房东）</li>
            <li>提交申请后等待管理员审核</li>
            <li>审核通过后即可登录使用</li>
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
            已有账号？立即登录
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
 