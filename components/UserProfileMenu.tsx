"use client";
import { useState, useEffect, useRef } from 'react';
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

export const UserProfileMenu: React.FC = () => {
  const { user, setUser, clearUser, isInitialized } = useUserStore();
  const router = useRouter();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hasFetchedRoles, setHasFetchedRoles] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ left?: number; right?: number; top?: number; bottom?: number }>({});
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 计算弹窗最佳位置
  const calculateMenuPosition = () => {
    if (!buttonRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 280; // 弹窗宽度
    const menuMaxHeight = 500; // 弹窗最大高度
    const gap = 8; // 与按钮的间距
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const position: { left?: number; right?: number; top?: number; bottom?: number } = {};

    // 水平定位：优先向右展开，空间不足则向左
    if (buttonRect.left + menuWidth <= viewportWidth - 16) {
      // 向右展开有足够空间
      position.left = 0;
    } else if (buttonRect.right - menuWidth >= 16) {
      // 向左展开
      position.right = 0;
    } else {
      // 都不够，优先向右但限制在视口内
      position.left = 0;
    }

    // 垂直定位：优先向下，空间不足则向上
    const spaceBelow = viewportHeight - buttonRect.bottom - gap;
    const spaceAbove = buttonRect.top - gap;

    if (spaceBelow >= Math.min(menuMaxHeight, 300)) {
      // 向下展开
      position.top = buttonRect.height + gap;
    } else if (spaceAbove >= Math.min(menuMaxHeight, 300)) {
      // 向上展开
      position.bottom = buttonRect.height + gap;
    } else {
      // 都不够，使用向下但会被滚动条限制
      position.top = buttonRect.height + gap;
    }

    setMenuPosition(position);
  };

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      calculateMenuPosition();
      
      // 监听窗口大小变化
      window.addEventListener('resize', calculateMenuPosition);
      window.addEventListener('scroll', calculateMenuPosition, true);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', calculateMenuPosition);
      window.removeEventListener('scroll', calculateMenuPosition, true);
    };
  }, [isOpen]);

  // 获取用户角色列表
  useEffect(() => {
    if (isInitialized && user?.line_user_id && !hasFetchedRoles && isOpen) {
      fetchUserRoles(user.line_user_id);
    }
  }, [isInitialized, user?.line_user_id, hasFetchedRoles, isOpen]);

  const fetchUserRoles = async (lineUserId: string) => {
    if (hasFetchedRoles) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/auth/user-roles?lineUserId=${lineUserId}`);
      if (response.ok) {
        const data = await response.json();
        setRoles(data.roles || []);
        setHasFetchedRoles(true);
      } else {
        setError('获取角色列表失败');
      }
    } catch (error) {
      console.error('获取角色列表失败:', error);
      setError('获取角色列表失败');
    } finally {
      setLoading(false);
    }
  };

  const switchRole = async (role: UserRole) => {
    if (!user?.line_user_id) return;
    
    try {
      setError(null);
      setIsOpen(false);
      
      const response = await fetch('/api/auth/user-roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lineUserId: user.line_user_id,
          role: role.role
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const loginResponse = await fetch('/api/auth/line/login-with-role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user: data.user })
        });
        if (!loginResponse.ok) {
          throw new Error('写入登录cookie失败');
        }
        setUser(data.user);
        router.push('/dashboard');
      } else {
        setError('切换角色失败');
      }
    } catch (error) {
      console.error('切换角色失败:', error);
      setError('切换角色失败');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/line?action=logout', { method: 'POST' });
      clearUser();
      setIsOpen(false);
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
        return '管理员';
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

  if (!isInitialized || !user) {
    return null;
  }

  return (
    <div ref={menuRef} style={{ position: 'relative', zIndex: 50 }}>
      {/* 用户头像按钮 */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: '2px solid #e5e7eb',
          background: user.avatar 
            ? `url(${user.avatar}) center/cover no-repeat` 
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: isOpen 
            ? '0 0 0 3px rgba(59, 130, 246, 0.3)' 
            : '0 2px 8px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '1.25rem',
          fontWeight: '600',
          overflow: 'hidden',
          position: 'relative'
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
          }
        }}
      >
        {!user.avatar && (user.name ? user.name.charAt(0).toUpperCase() : '?')}
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div
          className="user-profile-menu-dropdown"
          style={{
            position: 'absolute',
            ...menuPosition,
            minWidth: '280px',
            maxWidth: '320px',
            maxHeight: 'calc(100vh - 80px)',
            background: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
            overflowY: 'auto',
            overflowX: 'hidden',
            animation: menuPosition.bottom ? 'slideUp 0.2s ease-out' : 'slideDown 0.2s ease-out',
            zIndex: 1000
          }}
        >
          <style jsx>{`
            @keyframes slideDown {
              from {
                opacity: 0;
                transform: translateY(-10px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            @keyframes slideUp {
              from {
                opacity: 0;
                transform: translateY(10px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            .user-profile-menu-dropdown::-webkit-scrollbar {
              width: 6px;
            }
            .user-profile-menu-dropdown::-webkit-scrollbar-track {
              background: transparent;
            }
            .user-profile-menu-dropdown::-webkit-scrollbar-thumb {
              background: #d1d5db;
              border-radius: 3px;
            }
            .user-profile-menu-dropdown::-webkit-scrollbar-thumb:hover {
              background: #9ca3af;
            }
          `}</style>

          {/* 用户信息区域 */}
          <div style={{
            padding: '20px',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: user.avatar 
                  ? `url(${user.avatar}) center/cover no-repeat` 
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '1.5rem',
                fontWeight: '600',
                overflow: 'hidden',
                border: '2px solid #fff',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
              }}>
                {!user.avatar && (user.name ? user.name.charAt(0).toUpperCase() : '?')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1f2937',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {user.name}
                </div>
                <div style={{
                  fontSize: '13px',
                  color: '#6b7280',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {user.katakana}
                </div>
              </div>
            </div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: '#fff',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              <span>{getRoleIcon(user.role)}</span>
              <span>当前身份：{getRoleDisplayName(user.role)}</span>
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div style={{
              padding: '12px 20px',
              background: '#fef2f2',
              color: '#dc2626',
              fontSize: '14px',
              borderBottom: '1px solid #fee2e2'
            }}>
              {error}
            </div>
          )}

          {/* 身份切换区域 */}
          {loading ? (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '14px'
            }}>
              加载中...
            </div>
          ) : roles.length > 1 ? (
            <div style={{ padding: '8px 0' }}>
              <div style={{
                padding: '8px 20px',
                fontSize: '12px',
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                切换身份
              </div>
              {roles.map((role) => {
                const isCurrentRole = user.id === role.id;
                return (
                  <button
                    key={role.id}
                    onClick={() => !isCurrentRole && switchRole(role)}
                    disabled={isCurrentRole}
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      background: isCurrentRole ? '#f3f4f6' : '#ffffff',
                      border: 'none',
                      textAlign: 'left',
                      cursor: isCurrentRole ? 'default' : 'pointer',
                      transition: 'background 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      color: isCurrentRole ? '#6b7280' : '#374151'
                    }}
                    onMouseEnter={(e) => {
                      if (!isCurrentRole) {
                        e.currentTarget.style.background = '#f9fafb';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isCurrentRole) {
                        e.currentTarget.style.background = '#ffffff';
                      }
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>{getRoleIcon(role.role)}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: '500' }}>
                        {getRoleDisplayName(role.role)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                        {role.name}
                      </div>
                    </div>
                    {isCurrentRole && (
                      <span style={{ 
                        fontSize: '16px', 
                        color: '#3b82f6',
                        fontWeight: '600'
                      }}>
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : null}

          {/* 分隔线 */}
          {roles.length > 1 && (
            <div style={{ 
              height: '1px', 
              background: '#e5e7eb', 
              margin: '8px 0' 
            }} />
          )}

          {/* 登出按钮 */}
          <div style={{ padding: '8px' }}>
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: '#dc2626',
                fontSize: '14px',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#fef2f2';
                e.currentTarget.style.color = '#b91c1c';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.color = '#dc2626';
              }}
            >
              <span style={{ fontSize: '18px' }}>🚪</span>
              <span>退出登录</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

