"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/userStore';

interface UserRole {
  id: string;
  name: string;
  katakana: string;
  role: string;
  avatar?: string;
  created_at: string;
}

interface LoginRoleSelectorProps {
  lineUserId: string;
  onRegisterNew: () => void;
}

export const LoginRoleSelector: React.FC<LoginRoleSelectorProps> = ({ 
  lineUserId, 
  onRegisterNew 
}) => {
  const router = useRouter();
  const { setUser } = useUserStore();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserRoles();
  }, [lineUserId]);

  const fetchUserRoles = async () => {
    try {
      const response = await fetch(`/api/auth/user-roles?lineUserId=${lineUserId}`);
      if (response.ok) {
        const data = await response.json();
        setRoles(data.roles);
      } else {
        setError('获取角色列表失败');
      }
    } catch (error) {
      setError('获取角色列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loginWithRole = async (role: UserRole) => {
    try {
      const response = await fetch('/api/auth/user-roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lineUserId,
          role: role.role
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // 设置登录状态和cookie
        const loginResponse = await fetch('/api/auth/line/login-with-role', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user: data.user
          }),
        });

        if (loginResponse.ok) {
          setUser(data.user);
          router.push('/dashboard');
        } else {
          setError('登录失败');
        }
      } else {
        setError('角色切换失败');
      }
    } catch (error) {
      setError('登录失败');
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'cleaner':
        return '清洁员';
      case 'manager':
        return '管理者';
      case 'owner':
        return '房东';
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '400px',
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
        <p style={{ color: '#6b7280' }}>正在加载您的账号...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center'
      }}>
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem'
        }}>
          {error}
        </div>
        <button
          onClick={onRegisterNew}
          style={{
            width: '100%',
            padding: '1rem',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
        >
          重新注册
        </button>
      </div>
    );
  }

  return (
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
          选择登录身份
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          检测到您有 {roles.length} 个身份，请选择要登录的身份
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => loginWithRole(role)}
            style={{
              padding: '1rem',
              background: '#f8fafc',
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'left'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.borderColor = '#3b82f6';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>
              登入{getRoleDisplayName(role.role)}账号
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {role.name} ({role.katakana})
            </div>
          </button>
        ))}
      </div>

      <div style={{
        padding: '1rem',
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        marginBottom: '1rem'
      }}>
        <button
          onClick={onRegisterNew}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#059669';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = '#10b981';
          }}
        >
          注册新身份
        </button>
        <p style={{ 
          fontSize: '0.75rem', 
          color: '#6b7280', 
          marginTop: '0.5rem',
          marginBottom: '0'
        }}>
          使用同一LINE账号注册另一个角色
        </p>
      </div>
    </div>
  );
};

