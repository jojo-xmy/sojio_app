"use client";
import { CSSProperties, ReactNode } from 'react';

interface HeaderButtonProps {
  onClick: () => void;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  icon?: ReactNode;
}

const variantStyles: Record<string, { background: string; hoverBackground: string; color: string }> = {
  primary: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    hoverBackground: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    color: '#ffffff'
  },
  secondary: {
    background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
    hoverBackground: 'linear-gradient(135deg, #4b5563 0%, #374151 100%)',
    color: '#ffffff'
  },
  success: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    hoverBackground: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    color: '#ffffff'
  },
  warning: {
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    hoverBackground: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    color: '#ffffff'
  },
  danger: {
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    hoverBackground: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
    color: '#ffffff'
  }
};

export const HeaderButton: React.FC<HeaderButtonProps> = ({ 
  onClick, 
  children, 
  variant = 'primary',
  icon 
}) => {
  const styles = variantStyles[variant];

  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 18px',
        background: styles.background,
        color: styles.color,
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        whiteSpace: 'nowrap'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = styles.hoverBackground;
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = styles.background;
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {icon && <span style={{ fontSize: '16px' }}>{icon}</span>}
      <span>{children}</span>
    </button>
  );
};

