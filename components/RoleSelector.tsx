"use client";
import { useState, useEffect } from 'react';
import { useUserStore } from '@/store/userStore';
import { useRouter } from 'next/navigation';

interface UserRole {
  id: string;
  name: string;
  katakana: string;
  role: string;
  avatar?: string;
  created_at: string;
}

interface RoleSelectorProps {
  showLogout?: boolean;
  compactMode?: boolean;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({ 
  showLogout = false, 
  compactMode = false 
}) => {
  const { user, setUser, clearUser } = useUserStore();
  const router = useRouter();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.lineUserId) {
      fetchUserRoles(user.lineUserId);
    } else {
      // 如果没有lineUserId，设置loading为false，这样至少可以显示退出按钮
      setLoading(false);
    }
  }, [user]);

  const fetchUserRoles = async (lineUserId: string) => {
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

  const switchRole = async (role: UserRole) => {
    if (!user?.lineUserId) return;
    
    try {
      const response = await fetch('/api/auth/user-roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lineUserId: user.lineUserId,
          role: role.role
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        router.push('/dashboard');
      } else {
        setError('切换角色失败');
      }
    } catch (error) {
      setError('切换角色失败');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/line?action=logout', { method: 'POST' });
      clearUser();
      router.push('/login');
    } catch (error) {
      console.error('登出失败:', error);
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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'cleaner':
        return '🧹';
      case 'manager':
        return '👨‍💼';
      case 'owner':
        return '🏠';
      default:
        return '👤';
    }
  };

  if (loading) {
    return (
      <div style={{ 
        padding: compactMode ? '0.5rem' : '1rem',
        textAlign: 'center',
        color: '#6b7280'
      }}>
        加载中...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: compactMode ? '0.5rem' : '1rem',
        color: '#dc2626',
        textAlign: 'center'
      }}>
        {error}
      </div>
    );
  }

  // 即使没有多个角色，如果showLogout为true，也要显示退出按钮
  if (roles.length === 0 && !showLogout) {
    return null;
  }

  return (
    <div style={{
      padding: compactMode ? '0.75rem' : '1.5rem',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      marginBottom: compactMode ? '1rem' : '1.5rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
    }}>
      {roles.length > 1 && (
        <>
          <h3 style={{ 
            marginBottom: compactMode ? '0.75rem' : '1rem', 
            fontSize: compactMode ? '1rem' : '1.125rem', 
            fontWeight: '700',
            color: '#1f2937',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ fontSize: '1.25rem' }}>👤</span>
            身份切换 ({roles.length}个身份)
          </h3>
          <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            flexWrap: 'wrap',
            marginBottom: showLogout ? '1rem' : '0'
          }}>
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => switchRole(role)}
                style={{
                  padding: compactMode ? '0.5rem 1rem' : '0.75rem 1.25rem',
                  background: user?.id === parseInt(role.id) 
                    ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
                    : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                  color: user?.id === parseInt(role.id) ? 'white' : '#374151',
                  border: user?.id === parseInt(role.id) ? '2px solid #2563eb' : '2px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: compactMode ? '0.875rem' : '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontWeight: user?.id === parseInt(role.id) ? '700' : '500',
                  boxShadow: user?.id === parseInt(role.id) 
                    ? '0 2px 4px rgba(59, 130, 246, 0.3)' 
                    : '0 1px 3px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem'
                }}
                onMouseOver={(e) => {
                  if (user?.id !== parseInt(role.id)) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.15)';
                  }
                }}
                onMouseOut={(e) => {
                  if (user?.id !== parseInt(role.id)) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                  }
                }}
              >
                <span style={{ fontSize: compactMode ? '1rem' : '1.125rem' }}>
                  {getRoleIcon(role.role)}
                </span>
                {getRoleDisplayName(role.role)}
                {user?.id === parseInt(role.id) && (
                  <span style={{ fontSize: '0.75rem', marginLeft: '0.25rem' }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
      
      {showLogout && (
        <div style={{ 
          paddingTop: roles.length > 1 ? '1rem' : '0',
          borderTop: roles.length > 1 ? '2px solid #e5e7eb' : 'none'
        }}>
          {roles.length === 0 && (
            <h3 style={{ 
              marginBottom: '1rem', 
              fontSize: compactMode ? '1rem' : '1.125rem', 
              fontWeight: '700',
              color: '#1f2937',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span style={{ fontSize: '1.25rem' }}>⚙️</span>
              账号管理
            </h3>
          )}
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: compactMode ? '0.75rem 1rem' : '1rem 1.25rem',
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: compactMode ? '0.875rem' : '1rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontWeight: '600',
              boxShadow: '0 2px 4px rgba(220, 38, 38, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(220, 38, 38, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(220, 38, 38, 0.3)';
            }}
          >
            <span style={{ fontSize: '1.125rem' }}>🚪</span>
            退出登录
          </button>
        </div>
      )}
      
      {roles.length > 1 && (
        <div style={{
          marginTop: '0.5rem',
          fontSize: '0.75rem',
          color: '#6b7280',
          textAlign: 'center'
        }}>
          当前身份：{getRoleDisplayName(user?.role || '')}
        </div>
      )}
    </div>
  );
};
