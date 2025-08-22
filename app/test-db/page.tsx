"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestDBPage() {
  const [testResults, setTestResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    const results: any = {};

    try {
      // 测试1: 检查tasks表
      console.log('测试1: 检查tasks表');
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .limit(5);
      
      results.tasks = {
        success: !tasksError,
        error: tasksError?.message,
        count: tasksData?.length || 0,
        data: tasksData
      };

      // 测试2: 检查hotels表
      console.log('测试2: 检查hotels表');
      const { data: hotelsData, error: hotelsError } = await supabase
        .from('hotels')
        .select('*')
        .limit(5);
      
      results.hotels = {
        success: !hotelsError,
        error: hotelsError?.message,
        count: hotelsData?.length || 0,
        data: hotelsData
      };

      // 测试3: 检查calendar_entries表
      console.log('测试3: 检查calendar_entries表');
      const { data: calendarData, error: calendarError } = await supabase
        .from('calendar_entries')
        .select('*')
        .limit(5);
      
      results.calendar_entries = {
        success: !calendarError,
        error: calendarError?.message,
        count: calendarData?.length || 0,
        data: calendarData
      };

      // 测试4: 检查cleaner_availability表
      console.log('测试4: 检查cleaner_availability表');
      const { data: availabilityData, error: availabilityError } = await supabase
        .from('cleaner_availability')
        .select('*')
        .limit(5);
      
      results.cleaner_availability = {
        success: !availabilityError,
        error: availabilityError?.message,
        count: availabilityData?.length || 0,
        data: availabilityData
      };

      // 测试5: 检查task_assignments表
      console.log('测试5: 检查task_assignments表');
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('task_assignments')
        .select('*')
        .limit(5);
      
      results.task_assignments = {
        success: !assignmentsError,
        error: assignmentsError?.message,
        count: assignmentsData?.length || 0,
        data: assignmentsData
      };

      // 测试6: 检查user_profiles表
      console.log('测试6: 检查user_profiles表');
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('*')
        .limit(5);
      
      results.user_profiles = {
        success: !usersError,
        error: usersError?.message,
        count: usersData?.length || 0,
        data: usersData
      };

    } catch (error) {
      console.error('测试过程中发生错误:', error);
      results.generalError = error;
    }

    setTestResults(results);
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">数据库连接测试</h1>
      
      <button
        onClick={runTests}
        disabled={loading}
        className="mb-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? '测试中...' : '运行测试'}
      </button>

      {Object.keys(testResults).length > 0 && (
        <div className="space-y-4">
          {Object.entries(testResults).map(([tableName, result]: [string, any]) => (
            <div key={tableName} className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">{tableName}</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">状态:</span>
                  <span className={`px-2 py-1 rounded text-sm ${
                    result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {result.success ? '成功' : '失败'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">记录数:</span> {result.count}
                </div>
                {result.error && (
                  <div>
                    <span className="font-medium text-red-600">错误:</span> {result.error}
                  </div>
                )}
                {result.data && result.data.length > 0 && (
                  <div>
                    <span className="font-medium">示例数据:</span>
                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                      {JSON.stringify(result.data[0], null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



