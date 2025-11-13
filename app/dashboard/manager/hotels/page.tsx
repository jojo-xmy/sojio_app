"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/userStore';
import { RoleSelector } from '@/components/RoleSelector';
import {
  getManagerHotels,
  getAllHotels,
  addManagerHotel,
  removeManagerHotel,
  Hotel
} from '@/lib/services/managerHotelService';

export default function ManagerHotelsPage() {
  const router = useRouter();
  const user = useUserStore(s => s.user);
  const [managedHotels, setManagedHotels] = useState<Hotel[]>([]);
  const [allHotels, setAllHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'manager') {
      router.push('/dashboard');
      return;
    }
    loadData();
  }, [user, router]);

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [managed, all] = await Promise.all([
        getManagerHotels(user.id.toString()),
        getAllHotels()
      ]);
      setManagedHotels(managed);
      setAllHotels(all);
    } catch (error) {
      console.error('加载酒店数据失败:', error);
      alert('加载酒店数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddHotel = async (hotelId: string) => {
    if (!user) return;
    try {
      setProcessing(true);
      const result = await addManagerHotel(user.id.toString(), hotelId);
      if (result.success) {
        await loadData();
        setShowAddModal(false);
        alert('添加成功');
      } else {
        alert(result.error || '添加失败');
      }
    } catch (error) {
      console.error('添加酒店失败:', error);
      alert('添加酒店失败');
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveHotel = async (hotelId: string, hotelName: string) => {
    if (!user) return;
    if (!confirm(`确定要移除酒店"${hotelName}"吗？`)) return;
    
    try {
      setProcessing(true);
      const result = await removeManagerHotel(user.id.toString(), hotelId);
      if (result.success) {
        await loadData();
        alert('移除成功');
      } else {
        alert(result.error || '移除失败');
      }
    } catch (error) {
      console.error('移除酒店失败:', error);
      alert('移除酒店失败');
    } finally {
      setProcessing(false);
    }
  };

  const managedHotelIds = new Set(managedHotels.map(h => h.id));
  const availableHotels = allHotels.filter(h => !managedHotelIds.has(h.id));

  if (loading) {
    return (
      <div style={{ maxWidth: 1200, margin: '2rem auto', padding: '0 1rem' }}>
        <RoleSelector showLogout={true} compactMode={false} />
        <div style={{ textAlign: 'center', marginTop: 40 }}>加载中...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '2rem auto', padding: '0 1rem' }}>
      <RoleSelector showLogout={true} compactMode={false} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>管理的酒店列表</h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => router.push('/dashboard/manager')}
            style={{
              padding: '8px 20px',
              background: '#6b7280',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 16,
              cursor: 'pointer'
            }}
          >
            返回
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '8px 20px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 16,
              cursor: 'pointer'
            }}
          >
            添加酒店
          </button>
        </div>
      </div>

      {managedHotels.length === 0 ? (
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: 40,
          textAlign: 'center',
          color: '#6b7280'
        }}>
          暂无管理的酒店，点击"添加酒店"按钮开始添加
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {managedHotels.map(hotel => (
            <div
              key={hotel.id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: 16,
                backgroundColor: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{hotel.name}</h3>
              <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 12 }}>📍 {hotel.address}</p>
              <button
                onClick={() => handleRemoveHotel(hotel.id, hotel.name)}
                disabled={processing}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: processing ? '#9ca3af' : '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: processing ? 'not-allowed' : 'pointer'
                }}
              >
                移除
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 添加酒店弹窗 */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              width: '90%',
              maxWidth: 600,
              maxHeight: '80vh',
              overflow: 'auto',
              background: '#fff',
              borderRadius: 12,
              padding: 24
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600 }}>添加管理的酒店</h3>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ×
              </button>
            </div>

            {availableHotels.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>
                所有酒店都已添加到管理列表
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {availableHotels.map(hotel => (
                  <div
                    key={hotel.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      padding: 16,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{hotel.name}</div>
                      <div style={{ fontSize: 14, color: '#6b7280' }}>📍 {hotel.address}</div>
                    </div>
                    <button
                      onClick={() => handleAddHotel(hotel.id)}
                      disabled={processing}
                      style={{
                        padding: '8px 16px',
                        background: processing ? '#9ca3af' : '#2563eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: processing ? 'not-allowed' : 'pointer'
                      }}
                    >
                      添加
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}






