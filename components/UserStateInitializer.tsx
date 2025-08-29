"use client";
import { useEffect, useRef } from 'react';
import { useUserStore } from '@/store/userStore';
import { verifyJWTToken } from '@/lib/lineAuth';

export const UserStateInitializer: React.FC = () => {
  const { setUser, setInitialized } = useUserStore();
  const hasInitialized = useRef(false);

  useEffect(() => {
    // 防止重复初始化
    if (hasInitialized.current) return;
    
    const initializeUserState = async () => {
      try {
        // 从cookies中读取用户信息
        const userInfoCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('user_info='));
        
        if (userInfoCookie) {
          try {
            const userInfo = JSON.parse(decodeURIComponent(userInfoCookie.split('=')[1]));
            if (userInfo && userInfo.id) {
              const normalized = {
                ...userInfo,
                line_user_id: userInfo.line_user_id || userInfo.lineUserId,
              };
              setUser(normalized);
              hasInitialized.current = true;
              setInitialized(true);
              return;
            }
          } catch (parseError) {
            console.warn('解析用户信息cookie失败:', parseError);
          }
        }

        // 如果没有用户信息cookie，尝试从JWT token中获取
        const authTokenCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('auth_token='));
        
        if (authTokenCookie) {
          try {
            const token = authTokenCookie.split('=')[1];
            const payload = verifyJWTToken(token);
            
            if (payload && payload.userId) {
              // 从JWT payload中获取用户信息（payload只包含必要字段）
              const userInfo = {
                id: payload.userId,
                line_user_id: (payload as any).lineUserId || payload.userId,
                name: '用户',
                katakana: '',
                role: payload.role as 'cleaner' | 'manager' | 'owner',
                avatar: '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              
              setUser(userInfo);
              hasInitialized.current = true;
              setInitialized(true);
              return;
            }
          } catch (tokenError) {
            console.warn('解析JWT token失败:', tokenError);
          }
        }

        // 如果都没有有效的用户信息，设置初始化完成但用户为空
        hasInitialized.current = true;
        setInitialized(true);
      } catch (error) {
        console.error('初始化用户状态失败:', error);
        // 即使出错也要设置初始化完成，避免无限加载
        hasInitialized.current = true;
        setInitialized(true);
      }
    };

    initializeUserState();
  }, [setUser, setInitialized]);

  return null; // 这个组件不渲染任何内容
}; 