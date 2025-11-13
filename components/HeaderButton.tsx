"use client";
import { CSSProperties, ReactNode } from 'react';

interface HeaderButtonProps {
  onClick: () => void;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  icon?: ReactNode;
}

// 优化配色：无渐变、使用全局配色变量
const variantStyles: Record<string, { background: string; hoverBackground: string; color: string }> = {
  primary: {
    background: '#0061ff',
    hoverBackground: '#0051d5',
    color: '#ffffff'
  },
  secondary: {
    background: '#f7f6f3',
    hoverBackground: '#e8e6e0',
    color: '#1e1919'
  },
  success: {
    background: '#007a5a',
    hoverBackground: '#006344',
    color: '#ffffff'
  },
  warning: {
    background: '#f59e0b',
    hoverBackground: '#d97706',
    color: '#ffffff'
  },
  danger: {
    background: '#e01e5a',
    hoverBackground: '#c01848',
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
        border: variant === 'secondary' ? '1px solid #e3e2df' : 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: variant === 'secondary' ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.05)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        whiteSpace: 'nowrap'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = styles.hoverBackground;
        e.currentTarget.style.transform = 'scale(1.02)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = styles.background;
        e.currentTarget.style.transform = 'scale(1)';
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.98)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1.02)';
      }}
    >
      <span>{children}</span>
    </button>
  );
};

