"use client";

import React, { useState } from 'react';
import { TaskCalendar } from '@/components/TaskCalendar';
import { useUserStore } from '@/store/userStore';

export default function TestCalendarPage() {
  const user = useUserStore(s => s.user);
  const [debugInfo, setDebugInfo] = useState<string>('');

  // 模拟用户登录状态（用于测试）
  const mockUser = {
    id: 'test-user-id',
    name: '测试用户',
    role: 'manager' as const,
    line_user_id: 'test-line-id',
    katakana: 'テストユーザー',
    avatar: null,
    phone: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // 如果没有用户，使用模拟用户
  const currentUser = user || mockUser;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题和说明 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            日历视图测试页面
          </h1>
          <p className="text-gray-600 mb-4">
            这是一个用于测试日历功能的页面，可以查看任务分配、状态显示等功能。
          </p>
          
          {/* 用户信息显示 */}
          <div className="bg-white p-4 rounded-lg shadow-sm border mb-4">
            <h2 className="text-lg font-semibold mb-2">当前用户信息</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">用户ID:</span> {currentUser.id}
              </div>
              <div>
                <span className="font-medium">姓名:</span> {currentUser.name}
              </div>
              <div>
                <span className="font-medium">角色:</span> {currentUser.role}
              </div>
              <div>
                <span className="font-medium">LINE ID:</span> {currentUser.line_user_id}
              </div>
            </div>
            {!user && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                ⚠️ 当前使用模拟用户数据，实际功能可能受限
              </div>
            )}
          </div>

          {/* 功能说明 */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">测试功能说明</h3>
            <ul className="text-blue-800 space-y-1 text-sm">
              <li>• 查看任务在日历上的显示效果</li>
              <li>• 测试任务状态标签的显示</li>
              <li>• 测试点击待分配任务打开分配模态框</li>
              <li>• 测试任务排序（待分配任务优先）</li>
              <li>• 测试日历导航和视图切换</li>
            </ul>
          </div>
        </div>

        {/* 日历组件 */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="text-xl font-semibold text-gray-900">任务日历</h2>
            <p className="text-gray-600 text-sm mt-1">
              点击任务卡片可以查看详情或进行分配操作
            </p>
          </div>
          
          <div className="p-4">
            <TaskCalendar className="w-full" />
          </div>
        </div>

        {/* 调试信息区域 */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">调试信息</h3>
            <p className="text-gray-600 text-sm mt-1">
              这里会显示日历组件的调试信息
            </p>
          </div>
          
          <div className="p-4">
            <div className="bg-gray-100 p-3 rounded text-sm font-mono">
              {debugInfo || '等待调试信息...'}
            </div>
            
            <div className="mt-4 space-y-2">
              <button
                onClick={() => setDebugInfo('测试按钮点击时间: ' + new Date().toLocaleString())}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                测试按钮
              </button>
              
              <button
                onClick={() => setDebugInfo('')}
                className="ml-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                清空调试信息
              </button>
            </div>
          </div>
        </div>

        {/* 数据说明 */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">数据说明</h3>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">测试数据来源</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• 数据库中的真实任务数据</li>
                  <li>• 日期范围：2025年8月</li>
                  <li>• 酒店：Tokyo Central Hotel</li>
                  <li>• 状态：draft（待分配）</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">功能特性</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• 智能数据获取（范围查询 + 全量查询）</li>
                  <li>• 任务状态优先级排序</li>
                  <li>• 自定义事件组件渲染</li>
                  <li>• 响应式日历布局</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
