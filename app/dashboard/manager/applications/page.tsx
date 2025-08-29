"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/userStore';

interface RegistrationApplication {
  id: string;
  line_user_id: string;
  name: string;
  avatar?: string;
  role: string;
  phone?: string;
  katakana?: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  review_notes?: string;
}

export default function ManagerApplicationsPage() {
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

    // 只有manager可以访问审核页面
    if (user.role !== 'manager') {
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

    try {
      setReviewing(applicationId);
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
        setReviewNotes('');
        fetchApplications(); // 重新加载申请列表
      } else {
        const errorData = await response.json();
        setError(errorData.error || '审核失败');
      }
    } catch (error) {
      setError('审核失败');
    } finally {
      setReviewing(null);
    }
  };

  const getRoleDisplayName = (role: string) => {
    const roleNames = {
      owner: '房东',
      manager: '管理者',
      cleaner: '清洁员'
    };
    return roleNames[role as keyof typeof roleNames] || role;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: '#f59e0b', bgColor: '#fef3c7', text: '待审核' },
      approved: { color: '#10b981', bgColor: '#d1fae5', text: '已批准' },
      rejected: { color: '#ef4444', bgColor: '#fee2e2', text: '已拒绝' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <span style={{
        display: 'inline-block',
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: '600',
        color: config.color,
        backgroundColor: config.bgColor
      }}>
        {config.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '50vh' 
      }}>
        <div style={{ color: '#6b7280' }}>加载中...</div>
      </div>
    );
  }

  const pendingApplications = applications.filter(app => app.status === 'pending');
  const reviewedApplications = applications.filter(app => app.status !== 'pending');

  return (
    <div style={{ maxWidth: 1200, margin: '2rem auto', padding: '0 1rem' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '2rem' 
      }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827' }}>
          注册申请审核
        </h1>
        <button
          onClick={() => router.push('/dashboard/manager')}
          style={{
            padding: '0.5rem 1rem',
            background: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          返回管理页面
        </button>
      </div>

      {error && (
        <div style={{
          background: '#fee2e2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem'
        }}>
          {error}
        </div>
      )}

      {/* 待审核申请 */}
      {pendingApplications.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            background: '#fef3c7',
            padding: '1rem 1.5rem',
            borderRadius: '8px 8px 0 0',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <h2 style={{ 
              fontSize: '1.125rem', 
              fontWeight: '600', 
              color: '#92400e',
              margin: 0 
            }}>
              待审核申请 ({pendingApplications.length})
            </h2>
          </div>
          
          <div style={{ 
            background: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '0 0 8px 8px' 
          }}>
            {pendingApplications.map((application) => (
              <div
                key={application.id}
                style={{
                  padding: '1.5rem',
                  borderBottom: '1px solid #f3f4f6'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                      {application.avatar && (
                        <img
                          src={application.avatar}
                          alt={application.name}
                          style={{
                            width: '3rem',
                            height: '3rem',
                            borderRadius: '50%',
                            objectFit: 'cover'
                          }}
                        />
                      )}
                      <div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0 }}>
                          {application.name}
                        </h3>
                        <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0.25rem 0' }}>
                          申请角色：{getRoleDisplayName(application.role)}
                        </p>
                        {application.katakana && (
                          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
                            片假名：{application.katakana}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {application.phone && (
                      <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}>
                        <strong>联系电话：</strong>{application.phone}
                      </p>
                    )}
                    
                    {application.reason && (
                      <div style={{ margin: '1rem 0' }}>
                        <strong style={{ fontSize: '0.875rem' }}>申请理由：</strong>
                        <p style={{ 
                          margin: '0.5rem 0', 
                          padding: '0.75rem', 
                          background: '#f9fafb', 
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          lineHeight: '1.5'
                        }}>
                          {application.reason}
                        </p>
                      </div>
                    )}
                    
                    <p style={{ color: '#6b7280', fontSize: '0.75rem', margin: '0.5rem 0' }}>
                      申请时间：{new Date(application.created_at).toLocaleString('zh-CN')}
                    </p>

                    <div style={{ marginTop: '1rem' }}>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '0.875rem', 
                        fontWeight: '500', 
                        marginBottom: '0.5rem' 
                      }}>
                        审核备注（可选）：
                      </label>
                      <textarea
                        value={reviewing === application.id ? reviewNotes : ''}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        placeholder="输入审核备注..."
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          resize: 'vertical',
                          minHeight: '4rem'
                        }}
                      />
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginLeft: '1rem' }}>
                    {getStatusBadge(application.status)}
                  </div>
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  gap: '0.75rem', 
                  marginTop: '1.5rem',
                  justifyContent: 'flex-end'
                }}>
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
        </div>
      )}

      {/* 已审核申请 */}
      {reviewedApplications.length > 0 && (
        <div>
          <div style={{
            background: '#f3f4f6',
            padding: '1rem 1.5rem',
            borderRadius: '8px 8px 0 0',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <h2 style={{ 
              fontSize: '1.125rem', 
              fontWeight: '600', 
              color: '#374151',
              margin: 0 
            }}>
              已审核申请 ({reviewedApplications.length})
            </h2>
          </div>
          
          <div style={{ 
            background: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '0 0 8px 8px',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {reviewedApplications.map((application) => (
              <div
                key={application.id}
                style={{
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid #f3f4f6',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontWeight: '500' }}>{application.name}</span>
                    <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      ({getRoleDisplayName(application.role)})
                    </span>
                    {getStatusBadge(application.status)}
                  </div>
                  <p style={{ 
                    color: '#6b7280', 
                    fontSize: '0.75rem', 
                    margin: '0.25rem 0 0 0' 
                  }}>
                    审核时间：{new Date(application.created_at).toLocaleString('zh-CN')}
                  </p>
                  {application.review_notes && (
                    <p style={{ 
                      color: '#374151', 
                      fontSize: '0.875rem', 
                      margin: '0.5rem 0 0 0',
                      fontStyle: 'italic'
                    }}>
                      备注：{application.review_notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {applications.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          color: '#6b7280'
        }}>
          暂无注册申请
        </div>
      )}
    </div>
  );
}
