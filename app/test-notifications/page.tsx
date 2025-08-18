"use client";
import { useState } from 'react';
import { useUserStore } from '@/store/userStore';
import { LoginStatusCheck } from '@/components/LoginStatusCheck';
import { notificationService, sendTestNotification } from '@/lib/notifications';
import { createMessageTemplate, NOTIFICATION_TEMPLATES } from '@/lib/notificationTemplates';
import { TaskStatus, UserRole } from '@/types/task';

export default function TestNotificationsPage() {
  const user = useUserStore(s => s.user);
  const [testLineId, setTestLineId] = useState('U1234567890abcdef');
  const [notificationResult, setNotificationResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleTestNotification = async () => {
    if (!testLineId.trim()) {
      setNotificationResult('❌ 请输入LINE用户ID');
      return;
    }

    setLoading(true);
    setNotificationResult('');

    try {
      const result = await sendTestNotification(testLineId);
      if (result) {
        setNotificationResult('✅ 测试通知发送成功！');
      } else {
        setNotificationResult('❌ 测试通知发送失败，请检查配置');
      }
    } catch (error) {
      setNotificationResult(`❌ 发送失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestTaskNotification = async () => {
    if (!user) {
      setNotificationResult('❌ 请先登录');
      return;
    }

    setLoading(true);
    setNotificationResult('');

    try {
      // 模拟任务状态变更通知
      const mockNotification = {
        taskId: 'test-123',
        taskName: '测试酒店',
        fromStatus: 'assigned' as TaskStatus,
        toStatus: 'accepted' as TaskStatus,
        userId: user.id.toString(),
        userName: user.name,
        userRole: user.role as UserRole,
        timestamp: new Date().toISOString(),
        additionalData: {
          lockPassword: '1234',
          roomNumber: 'A101',
          hotelAddress: '测试地址'
        }
      };

      const result = await notificationService.sendTaskStatusNotification(mockNotification);
      if (result) {
        setNotificationResult('✅ 任务状态通知发送成功！');
      } else {
        setNotificationResult('❌ 任务状态通知发送失败');
      }
    } catch (error) {
      setNotificationResult(`❌ 发送失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '2rem auto', padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>通知功能测试</h1>
      
      {/* 登录状态检查 */}
      <LoginStatusCheck />
      
      {/* 通知配置信息 */}
      <div style={{ 
        padding: 16, 
        background: '#f0f9ff', 
        borderRadius: 8, 
        marginBottom: 24,
        border: '1px solid #0ea5e9'
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>通知配置</h3>
        <div style={{ fontSize: 14, lineHeight: 1.6 }}>
          <div><strong>通知功能：</strong>{notificationService['config'].enableNotifications ? '✅ 已启用' : '❌ 已禁用'}</div>
          <div><strong>调试模式：</strong>{notificationService['config'].debugMode ? '✅ 已启用' : '❌ 已禁用'}</div>
          <div><strong>LINE Token：</strong>{notificationService['config'].lineChannelAccessToken ? '✅ 已配置' : '❌ 未配置'}</div>
        </div>
      </div>

      {/* 测试通知 */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>测试通知</h2>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            LINE用户ID（测试用）：
          </label>
          <input
            type="text"
            value={testLineId}
            onChange={(e) => setTestLineId(e.target.value)}
            placeholder="输入LINE用户ID"
            style={{ 
              width: '100%', 
              padding: 8, 
              border: '1px solid #ddd', 
              borderRadius: 4,
              fontSize: 14
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <button
            onClick={handleTestNotification}
            disabled={loading}
            style={{
              padding: '12px 20px',
              background: loading ? '#ccc' : '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 600
            }}
          >
            {loading ? '发送中...' : '发送测试通知'}
          </button>

          <button
            onClick={handleTestTaskNotification}
            disabled={loading || !user}
            style={{
              padding: '12px 20px',
              background: loading || !user ? '#ccc' : '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: loading || !user ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 600
            }}
          >
            {loading ? '发送中...' : '发送任务状态通知'}
          </button>
        </div>

        {notificationResult && (
          <div style={{ 
            padding: 12, 
            background: notificationResult.includes('✅') ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${notificationResult.includes('✅') ? '#22c55e' : '#f87171'}`,
            borderRadius: 6,
            color: notificationResult.includes('✅') ? '#166534' : '#dc2626',
            fontSize: 14
          }}>
            {notificationResult}
          </div>
        )}
      </div>

      {/* 通知模板预览 */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>通知模板预览</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Object.entries(NOTIFICATION_TEMPLATES).map(([type, template]) => (
            <div key={type} style={{ 
              padding: 16, 
              border: '1px solid #e5e7eb', 
              borderRadius: 8,
              background: '#f9fafb'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>{template.emoji}</span>
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>{template.title}</h3>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: 12,
                  background: template.priority === 'high' ? '#ef4444' : 
                             template.priority === 'medium' ? '#f59e0b' : '#6b7280',
                  color: '#fff'
                }}>
                  {template.priority}
                </span>
              </div>
              <p style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                {template.description}
              </p>
              <div style={{ fontSize: 12, color: '#888' }}>
                <strong>适用角色：</strong>{template.roles.join(', ')} | 
                <strong> 适用状态：</strong>{template.statuses.join(', ')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 配置说明 */}
      <div style={{ 
        padding: 16, 
        background: '#fef3c7', 
        borderRadius: 8,
        border: '1px solid #f59e0b'
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>配置说明</h3>
        <div style={{ fontSize: 14, lineHeight: 1.6 }}>
          <p><strong>1. LINE Bot配置：</strong></p>
          <ul style={{ marginLeft: 20, marginBottom: 12 }}>
            <li>创建LINE Bot并获取Channel Access Token</li>
            <li>设置环境变量：NEXT_PUBLIC_LINE_CHANNEL_ACCESS_TOKEN</li>
            <li>启用通知功能：设置enableNotifications为true</li>
          </ul>
          
          <p><strong>2. 用户LINE绑定：</strong></p>
          <ul style={{ marginLeft: 20, marginBottom: 12 }}>
            <li>用户需要绑定LINE账号</li>
            <li>在数据库中存储用户的LINE ID</li>
            <li>实现LINE登录功能</li>
          </ul>
          
          <p><strong>3. 通知触发：</strong></p>
          <ul style={{ marginLeft: 20 }}>
            <li>任务状态变更时自动触发</li>
            <li>支持批量通知</li>
            <li>可配置通知模板和优先级</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 