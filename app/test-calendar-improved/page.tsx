"use client";
import { OwnerTaskCalendar } from '@/components/OwnerTaskCalendar';
import { useUserStore } from '@/store/userStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function TestCalendarImprovedPage() {
  const user = useUserStore(s => s.user);
  const router = useRouter();

  useEffect(() => {
    if (!user || user.role !== 'owner') {
      router.push('/dashboard');
    }
  }, [user, router]);

  if (!user || user.role !== 'owner') {
    return <div className="p-6">无权访问此页面</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">改进版日历组件测试</h1>
        <p className="text-gray-600">
          测试改进后的日历组件功能：
        </p>
        <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
          <li>✅ 修复容器定位问题 - 日期格子使用position: relative</li>
          <li>✅ 实现跨周折断算法 - 按周拆分任务bar</li>
          <li>✅ 修复z-index层级冲突 - 确保弹出层在顶层</li>
          <li>✅ 实现重叠任务堆叠 - 基于当天bar数量分配层级</li>
          <li>✅ 任务条不再跑到日历顶端</li>
          <li>✅ 跨多日bar正确折断，不会横跨整行</li>
          <li>✅ 弹出表格不再被覆盖</li>
        </ul>
      </div>
      
      <OwnerTaskCalendar className="w-full" />
    </div>
  );
}
