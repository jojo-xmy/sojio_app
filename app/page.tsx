export default function Home() {
  return (
    <main style={{ maxWidth: 800, margin: '2rem auto', padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 24 }}>HUG Cleaning App</h1>
      <p style={{ fontSize: 16, color: '#666', marginBottom: 32 }}>
        欢迎使用HUG清洁任务管理系统
      </p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <a 
          href="/test-login" 
          style={{
            padding: '16px 24px',
            background: '#3b82f6',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            textAlign: 'center'
          }}
        >
          🧪 登录状态测试
        </a>
        
        <a 
          href="/test-status-transition" 
          style={{
            padding: '16px 24px',
            background: '#10b981',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            textAlign: 'center'
          }}
        >
          🔄 状态转换测试
        </a>
        
        <a 
          href="/test-task-status" 
          style={{
            padding: '16px 24px',
            background: '#f59e0b',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            textAlign: 'center'
          }}
        >
          📊 任务状态测试
        </a>
        
        <a 
          href="/test-notifications" 
          style={{
            padding: '16px 24px',
            background: '#ec4899',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            textAlign: 'center'
          }}
        >
          📱 通知功能测试
        </a>
        
        <a 
          href="/login" 
          style={{
            padding: '16px 24px',
            background: '#8b5cf6',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            textAlign: 'center'
          }}
        >
          🔐 正式登录
        </a>
      </div>
    </main>
  );
} 