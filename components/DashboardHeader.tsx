"use client";
import { UserProfileMenu } from './UserProfileMenu';
import { ReactNode } from 'react';
import { LanguageSwitcher } from './LanguageSwitcher';

interface DashboardHeaderProps {
  title?: string;
  actions?: ReactNode;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ 
  title, 
  actions 
}) => {
  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 40,
      background: '#ffffff',
      borderBottom: '1px solid #e5e7eb',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      marginBottom: '24px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '24px'
      }}>
        {/* 左侧：用户头像 + 标题 */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px',
          minWidth: 0
        }}>
          <UserProfileMenu />
          {title && (
            <h1 style={{
              fontSize: '22px',
              fontWeight: '700',
              color: '#1f2937',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {title}
            </h1>
          )}
        </div>

        {/* 右侧：语言切换 + 操作按钮 */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          gap: '12px',
          flexShrink: 0
        }}>
          <LanguageSwitcher />
          {actions && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

