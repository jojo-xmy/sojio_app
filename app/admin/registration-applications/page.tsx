"use client";
import { useState, useEffect } from 'react';
import { useUserStore } from '@/store/userStore';
import { useRouter } from 'next/navigation';

interface RegistrationApplication {
  id: string;
  line_user_id: string;
  name: string;
  avatar?: string;
  role: string;
  status: string;
  created_at: string;
  review_notes?: string;
}

export default function RegistrationApplicationsPage() {
  const { user } = useUserStore();
  const router = useRouter();
  const [applications, setApplications] = useState<RegistrationApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // 只有owner和manager可以访问审核页面
    if (user.role !== 'owner' && user.role !== 'manager') {
      router.push('/dashboard');
      return;
    }

    fetchApplications();
  }, [user, router]);

  const fetchApplications = async () => {
    try {
      const response = await fetch('/api/admin/registration-applications');
      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications);
      } else {
        setError('获取注册申请失败');
      }
    } catch (error) {
      setError('获取注册申请失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (applicationId: string, action: 'approved' | 'rejected') => {
    if (!user) return;

    setReviewing(applicationId);
    try {
      const response = await fetch('/api/admin/registration-applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationId,
          action,
          reviewNotes,
          reviewerId: user.id
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        setReviewNotes('');
        fetchApplications(); // 刷新列表
      } else {
        const errorData = await response.json();
        alert('审核失败: ' + errorData.error);
      }
    } catch (error) {
      alert('审核失败');
    } finally {
      setReviewing(null);
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'cleaner':
        return '清洁员';
      case 'manager':
        return '管理者';
      case 'owner':
        return '房东';
      default:
        return role;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div>加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ color: 'red' }}>{error}</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '2rem auto', padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
          注册申请审核
        </h1>
        <p style={{ color: '#666' }}>
          审核待处理的注册申请
        </p>
      </div>

      {applications.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem', 
          background: '#f9fafb', 
          borderRadius: '8px',
          color: '#666'
        }}>
          暂无待审核的注册申请
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {applications.map((application) => (
            <div
              key={application.id}
              style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                {application.avatar && (
                  <img
                    src={application.avatar}
                    alt={application.name}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      marginRight: '1rem'
                    }}
                  />
                )}
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                    {application.name}
                  </h3>
                  <p style={{ color: '#666', fontSize: '0.875rem' }}>
                    LINE ID: {application.line_user_id}
                  </p>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    background: '#3b82f6',
                    color: 'white',
                    borderRadius: '12px',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}>
                    {getRoleDisplayName(application.role)}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <p style={{ color: '#666', fontSize: '0.875rem' }}>
                  申请时间: {formatDate(application.created_at)}
                </p>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  审核备注:
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="输入审核备注（可选）"
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => handleReview(application.id, 'approved')}
                  disabled={reviewing === application.id}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: reviewing === application.id ? 'not-allowed' : 'pointer',
                    opacity: reviewing === application.id ? 0.6 : 1
                  }}
                >
                  {reviewing === application.id ? '审核中...' : '批准'}
                </button>
                <button
                  onClick={() => handleReview(application.id, 'rejected')}
                  disabled={reviewing === application.id}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: reviewing === application.id ? 'not-allowed' : 'pointer',
                    opacity: reviewing === application.id ? 0.6 : 1
                  }}
                >
                  {reviewing === application.id ? '审核中...' : '拒绝'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          返回Dashboard
        </button>
      </div>
    </div>
  );
}
