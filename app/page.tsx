export default function Home() {
  return (
    <main style={{ maxWidth: 800, margin: '2rem auto', padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 24 }}>HUG Cleaning App</h1>
      <p style={{ fontSize: 16, color: '#666', marginBottom: 32 }}>
        欢迎使用HUG清洁任务管理系统
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <a href="/login" style={{ 
          display: 'block', 
          padding: '16px 24px', 
          background: '#3b82f6', 
          color: '#fff', 
          textDecoration: 'none', 
          borderRadius: 8, 
          fontWeight: 600,
          textAlign: 'center',
          transition: 'background-color 0.2s'
        }}>🔐 登录系统</a>
      </div>
    </main>
  );
} 