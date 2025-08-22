"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getTaskScheduleView, getPendingTasks } from '@/lib/hotelManagement';

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const runDebug = async () => {
    setLoading(true);
    const info: any = {};

    try {
      // 1. 检查Supabase连接
      console.log('1. 检查Supabase连接');
      const { data: authData, error: authError } = await supabase.auth.getSession();
      info.supabaseConnection = {
        success: !authError,
        error: authError?.message,
        hasSession: !!authData.session
      };

      // 2. 检查tasks表结构
      console.log('2. 检查tasks表结构');
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .limit(1);
      
      info.tasksTable = {
        success: !tasksError,
        error: tasksError?.message,
        hasData: tasksData && tasksData.length > 0,
        sampleData: tasksData?.[0]
      };

      // 3. 测试getTaskScheduleView函数
      console.log('3. 测试getTaskScheduleView函数');
      try {
        const today = new Date().toISOString().split('T')[0];
        const scheduleData = await getTaskScheduleView(today, today);
        info.getTaskScheduleView = {
          success: true,
          dataCount: scheduleData.length,
          data: scheduleData
        };
      } catch (error) {
        info.getTaskScheduleView = {
          success: false,
          error: error instanceof Error ? error.message : '未知错误'
        };
      }

      // 4. 测试getPendingTasks函数
      console.log('4. 测试getPendingTasks函数');
      try {
        const pendingData = await getPendingTasks();
        info.getPendingTasks = {
          success: true,
          dataCount: pendingData.length,
          data: pendingData
        };
      } catch (error) {
        info.getPendingTasks = {
          success: false,
          error: error instanceof Error ? error.message : '未知错误'
        };
      }

      // 5. 检查所有相关表
      console.log('5. 检查所有相关表');
      const tables = ['hotels', 'calendar_entries', 'cleaner_availability', 'task_assignments', 'user_profiles'];
      info.tables = {};

      for (const table of tables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(1);
          
          info.tables[table] = {
            success: !error,
            error: error?.message,
            hasData: data && data.length > 0
          };
        } catch (error) {
          info.tables[table] = {
            success: false,
            error: error instanceof Error ? error.message : '未知错误'
          };
        }
      }

    } catch (error) {
      console.error('调试过程中发生错误:', error);
      info.generalError = error;
    }

    setDebugInfo(info);
    setLoading(false);
  };

  const getRecommendations = () => {
    const recommendations = [];

    if (debugInfo.supabaseConnection && !debugInfo.supabaseConnection.success) {
      recommendations.push('❌ Supabase连接失败，请检查环境变量配置');
    }

    if (debugInfo.tasksTable && !debugInfo.tasksTable.success) {
      recommendations.push('❌ tasks表访问失败，可能需要运行数据库迁移');
    }

    if (debugInfo.getTaskScheduleView && !debugInfo.getTaskScheduleView.success) {
      recommendations.push('❌ getTaskScheduleView函数失败，可能是表结构问题');
    }

    if (debugInfo.tables) {
      Object.entries(debugInfo.tables).forEach(([table, info]: [string, any]) => {
        if (!info.success) {
          recommendations.push(`❌ ${table}表访问失败: ${info.error}`);
        }
      });
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ 所有检查都通过了，系统应该正常工作');
    }

    return recommendations;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">系统调试页面</h1>
      
      <button
        onClick={runDebug}
        disabled={loading}
        className="mb-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? '调试中...' : '运行调试'}
      </button>

      {Object.keys(debugInfo).length > 0 && (
        <div className="space-y-6">
          {/* 建议 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">建议和解决方案</h3>
            <ul className="space-y-1">
              {getRecommendations().map((rec, index) => (
                <li key={index} className="text-blue-700">{rec}</li>
              ))}
            </ul>
          </div>

          {/* 详细调试信息 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">详细调试信息</h3>
            
            {Object.entries(debugInfo).map(([key, value]: [string, any]) => (
              <div key={key} className="border rounded-lg p-4">
                <h4 className="text-md font-semibold mb-2">{key}</h4>
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                  {JSON.stringify(value, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}



