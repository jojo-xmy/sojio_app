"use client";
import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, { background: string; hover: string; text: string }> = {
  primary: {
    background: '#3b82f6',
    hover: '#2563eb',
    text: '#ffffff'
  },
  secondary: {
    background: '#e5e7eb',
    hover: '#d1d5db',
    text: '#374151'
  },
  success: {
    background: '#10b981',
    hover: '#059669',
    text: '#ffffff'
  },
  warning: {
    background: '#f59e0b',
    hover: '#d97706',
    text: '#ffffff'
  },
  danger: {
    background: '#ef4444',
    hover: '#dc2626',
    text: '#ffffff'
  },
  ghost: {
    background: 'transparent',
    hover: '#f3f4f6',
    text: '#374151'
  }
};

const sizeStyles: Record<ButtonSize, { padding: string; height: string; fontSize: string }> = {
  sm: { padding: '6px 12px', height: '32px', fontSize: '13px' },
  md: { padding: '8px 16px', height: '40px', fontSize: '14px' },
  lg: { padding: '12px 24px', height: '48px', fontSize: '16px' }
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  className = '',
  children,
  ...props
}) => {
  const styles = variantStyles[variant];
  const sizeStyle = sizeStyles[size];
  const isResponsive = className.includes('responsive-text');
  const isFlexShrink = className.includes('flex-shrink-btn');

  return (
    <>
      <style jsx>{`
        .btn-responsive {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .btn-responsive span {
          display: inline-block;
          transition: all 0.3s ease;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .flex-shrink-btn {
          flex-shrink: 1;
          min-width: 0 !important;
        }
        
        /* 备用方案：使用媒体查询 */
        @media (max-width: 768px) {
          .btn-responsive.responsive-text span {
            font-size: 0.9em;
          }
        }
        
        @media (max-width: 480px) {
          .btn-responsive.responsive-text span {
            font-size: 0.85em;
          }
        }
      `}</style>
      <button
        className={`btn-responsive ${className}`}
        disabled={disabled || loading}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          borderRadius: '8px',
          border: 'none',
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          opacity: disabled || loading ? 0.5 : 1,
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          background: styles.background,
          color: styles.text,
          width: fullWidth ? '100%' : 'auto',
          padding: isFlexShrink ? '6px 8px' : sizeStyle.padding,
          height: sizeStyle.height,
          fontSize: isResponsive ? 'clamp(10px, 2.5vw, ' + sizeStyle.fontSize + ')' : sizeStyle.fontSize,
          minWidth: isFlexShrink ? '0' : (size === 'sm' ? '60px' : size === 'md' ? '80px' : '100px'),
          flexShrink: isFlexShrink ? 1 : 0
        }}
        onMouseEnter={(e) => {
          if (!disabled && !loading) {
            e.currentTarget.style.background = styles.hover;
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !loading) {
            e.currentTarget.style.background = styles.background;
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
          }
        }}
        onMouseDown={(e) => {
          if (!disabled && !loading) {
            e.currentTarget.style.transform = 'translateY(0)';
          }
        }}
        {...props}
      >
        {loading && (
          <span style={{ 
            display: 'inline-block', 
            marginRight: '8px', 
            width: '14px', 
            height: '14px', 
            border: '2px solid currentColor', 
            borderTopColor: 'transparent', 
            borderRadius: '50%', 
            animation: 'spin 0.6s linear infinite' 
          }} />
        )}
        <span>{children}</span>
      </button>
    </>
  );
};

