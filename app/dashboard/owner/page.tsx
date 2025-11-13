"use client";
import { useUserStore } from '@/store/userStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { HeaderButton } from '@/components/HeaderButton';
import { OwnerTaskCalendar } from '@/components/OwnerTaskCalendar';
import { CalendarEntryForm, CalendarEntryFormData } from '@/components/CalendarEntryForm';
import { createCalendarEntry } from '@/lib/services/calendarEntryService';
import { supabase } from '@/lib/supabase';


export default function OwnerDashboard() {
  const { user, isInitialized } = useUserStore();
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [ownerHotels, setOwnerHotels] = useState<Array<{id: string; name: string; address: string}>>([]);
  const calendarRef = useRef<{ refreshData: () => void }>(null);

  useEffect(() => {
    if (!isInitialized) return;

    if (!user) {
      router.push('/login');
      return;
    }
    
    if (user.role === 'owner') {
      loadOwnerHotels();
    }
  }, [user, isInitialized, router]);

  const loadOwnerHotels = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('hotels')
        .select('id, name, address')
        .eq('owner_id', user.id)
        .order('name');

      if (error) {
        console.error('加载酒店列表失败:', error);
        return;
      }

      setOwnerHotels(data || []);
    } catch (error) {
      console.error('加载酒店列表失败:', error);
    }
  };

  const handleCreateEntry = async (formData: CalendarEntryFormData) => {
    if (!user) return;

    try {
      setCreating(true);
      
      // 使用表单中选择的酒店ID
      if (!formData.hotelId) {
        alert('请选择酒店');
        return;
      }
      
      const entryData = {
        hotelId: formData.hotelId,
        checkInDate: formData.checkInDate,
        checkOutDate: formData.checkOutDate,
        guestCount: formData.guestCount,
        ownerNotes: formData.ownerNotes,
        cleaningDates: formData.cleaningDates
      };

      // 使用新的服务层API创建入住登记（触发器会自动创建清扫任务）
      const entry = await createCalendarEntry(entryData, user.id.toString());
      
      setShowCreateForm(false);
      
      // 刷新日历数据
      if (calendarRef.current) {
        calendarRef.current.refreshData();
      }
    } catch (err) {
      console.error('创建入住登记失败:', err);
      alert('创建入住登记失败');
    } finally {
      setCreating(false);
    }
  };

  // 移除角色检查的返回null逻辑，让页面正常渲染
  // 如果用户角色不匹配，主dashboard页面会自动重定向

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <DashboardHeader 
        title="入住日历"
        actions={
          <>
            <HeaderButton 
              onClick={() => setShowCreateForm(true)}
              variant="warning"
            >
              添加入住登记
            </HeaderButton>
            <HeaderButton 
              onClick={() => router.push('/dashboard/owner/hotels')}
              variant="success"
            >
              管理酒店
            </HeaderButton>
          </>
        }
      />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1rem' }}>
        {/* 日历视图（内部已包含右侧任务详情面板） */}
        <OwnerTaskCalendar 
          ref={calendarRef}
          className="w-full" 
          onDataRefresh={() => {
            console.log('日历数据已刷新');
          }}
        />

        {/* 任务创建表单 */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
              <CalendarEntryForm
                initialData={{
                  hotelId: ownerHotels.length > 0 ? ownerHotels[0].id : '',
                  checkInDate: '',
                  checkOutDate: '',
                  guestCount: 1,
                  ownerNotes: '',
                  cleaningDates: []
                }}
                onSubmit={handleCreateEntry}
                onCancel={() => setShowCreateForm(false)}
                loading={creating}
                title="添加入住登记"
                hotels={ownerHotels}
                showHotelSelection={true}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 