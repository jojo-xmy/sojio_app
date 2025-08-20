"use client";
import { useState } from 'react';

export default function TestConfigPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testConfig = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/test-config');
      if (!response.ok) {
        throw new Error('配置检查失败');
      }
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>LINE配置测试</h1>
      
      <button 
        onClick={testConfig}
        disabled={loading}
        style={{
          padding: '1rem 2rem',
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '2rem'
        }}
      >
        {loading ? '检查中...' : '检查LINE配置'}
      </button>

      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}

      {config && (
        <div style={{
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          padding: '1rem',
          borderRadius: '8px'
        }}>
          <h3>配置状态：</h3>
          <pre style={{ whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(config, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <h3>需要配置的环境变量：</h3>
        <ul>
          <li><code>LINE_LOGIN_CHANNEL_ID</code> - LINE Login Channel ID</li>
          <li><code>LINE_LOGIN_CHANNEL_SECRET</code> - LINE Login Channel Secret</li>
          <li><code>LINE_REDIRECT_URI</code> - 回调URL (http://localhost:3000/api/auth/line)</li>
          <li><code>JWT_SECRET</code> - JWT签名密钥</li>
        </ul>
      </div>
    </div>
  );
} 