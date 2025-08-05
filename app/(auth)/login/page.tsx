"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/userStore';

const mockUsers = [
  { id: 1, name: '山田太郎', katakana: 'ヤマダ タロウ', role: 'cleaner', avatar: 'https://randomuser.me/api/portraits/men/1.jpg' },
  { id: 2, name: '佐藤花子', katakana: 'サトウ ハナコ', role: 'manager', avatar: 'https://randomuser.me/api/portraits/women/2.jpg' },
  { id: 3, name: '鈴木一郎', katakana: 'スズキ イチロウ', role: 'owner', avatar: 'https://randomuser.me/api/portraits/men/3.jpg' },
];

export default function LoginPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const setUser = useUserStore(s => s.setUser);
  const router = useRouter();

  const filtered = mockUsers.filter(u =>
    u.katakana.includes(search) || u.name.includes(search)
  );
  const user = mockUsers.find(u => u.id === selected);

  function handleSendCode() {
    setShowCode(true);
    setError('');
  }

  function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (code === '123456' && user) {
      setUser(user);
      router.push(`/dashboard/${user.role}`);
    } else {
      setError('验证码错误，请重试');
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '4rem auto', padding: 24, border: '1px solid #eee', borderRadius: 8 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>选择员工登录</h1>
      <input
        type="text"
        placeholder="搜索片假名或姓名"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', padding: 8, marginBottom: 16 }}
      />
      <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 16 }}>
        {filtered.length === 0 && <div style={{ color: '#888' }}>无匹配员工</div>}
        {filtered.map(u => (
          <div
            key={u.id}
            onClick={() => { setSelected(u.id); setShowCode(false); setCode(''); setError(''); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: 8, border: selected === u.id ? '2px solid #222' : '1px solid #eee', borderRadius: 6, marginBottom: 8, cursor: 'pointer', background: selected === u.id ? '#f5f5f5' : '#fff'
            }}
          >
            <img src={u.avatar} alt={u.name} style={{ width: 40, height: 40, borderRadius: '50%' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500 }}>{u.katakana}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{u.role}</div>
            </div>
          </div>
        ))}
      </div>
      {selected && !showCode && (
        <button onClick={handleSendCode} style={{ width: '100%', padding: 10, background: '#222', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 600 }}>
          发送验证码
        </button>
      )}
      {showCode && (
        <form onSubmit={handleVerify} style={{ marginTop: 16 }}>
          <input
            type="text"
            maxLength={6}
            pattern="[0-9]{6}"
            placeholder="请输入6位验证码"
            value={code}
            onChange={e => setCode(e.target.value)}
            style={{ width: '100%', padding: 8, marginBottom: 8, letterSpacing: 4, fontSize: 18, textAlign: 'center' }}
            required
          />
          <button type="submit" style={{ width: '100%', padding: 10, background: '#222', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 600 }}>
            登录
          </button>
          {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
        </form>
      )}
    </div>
  );
} 