"use client";
import { useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const roles = [
  { value: 'owner', label: '业主' },
  { value: 'manager', label: '管理者' },
  { value: 'cleaner', label: '清洁人员' },
];

export default function RegisterPage() {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setAvatar(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
    const katakana = (form.elements.namedItem('katakana') as HTMLInputElement).value;
    const phone = (form.elements.namedItem('phone') as HTMLInputElement).value;
    const role = (form.elements.namedItem('role') as HTMLSelectElement).value;
    let avatar_url = '';
    try {
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { data, error: uploadError } = await supabase.storage.from('avatar').upload(fileName, avatarFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('avatar').getPublicUrl(fileName);
        avatar_url = urlData.publicUrl;
      }
      const { error: insertError } = await supabase.from('user_profiles').insert([
        { name, katakana, phone, role, avatar_url }
      ]);
      if (insertError) throw insertError;
      alert('注册成功！');
      form.reset();
      setAvatar(null);
      setAvatarFile(null);
    } catch (err: any) {
      setError(err.message || '注册失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '4rem auto', padding: 24, border: '1px solid #eee', borderRadius: 8 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>注册</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label>本名</label>
          <input name="name" type="text" placeholder="请输入本名" style={{ width: '100%', padding: 8, marginTop: 4 }} required />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>片假名</label>
          <input name="katakana" type="text" placeholder="请输入片假名" style={{ width: '100%', padding: 8, marginTop: 4 }} required />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>手机号</label>
          <input name="phone" type="tel" placeholder="请输入手机号" style={{ width: '100%', padding: 8, marginTop: 4 }} required />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>头像</label><br />
          <input name="avatar" type="file" accept="image/*" ref={fileInputRef} onChange={handleAvatarChange} style={{ marginTop: 4 }} />
          {avatar && <img src={avatar} alt="头像预览" style={{ width: 64, height: 64, borderRadius: '50%', marginTop: 8 }} />}
        </div>
        <div style={{ marginBottom: 24 }}>
          <label>身份</label>
          <select name="role" style={{ width: '100%', padding: 8, marginTop: 4 }} required>
            <option value="">请选择身份</option>
            {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 10, background: '#222', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 600 }}>
          {loading ? '注册中...' : '注册'}
        </button>
        {error && <div style={{ color: 'red', marginTop: 12 }}>{error}</div>}
      </form>
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        已有账号？<Link href="/login">去登录</Link>
      </div>
    </div>
  );
} 
