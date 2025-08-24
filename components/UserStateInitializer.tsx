"use client";
import { useEffect } from 'react';
import { useUserStore } from '@/store/userStore';
import { verifyJWTToken } from '@/lib/lineAuth';

export const UserStateInitializer: React.FC = () => {
  const { setUser, setInitialized } = useUserStore();

  useEffect(() => {
    const initializeUserState = async () => {
      try {
        // 从cookies中读取用户信息
        const userInfoCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('user_info='));
        
        if (userInfoCookie) {
          const userInfo = JSON.parse(decodeURIComponent(userInfoCookie.split('=')[1]));
          setUser(userInfo);
        } else {
          // 如果没有用户信息cookie，尝试从JWT token中获取
          const authTokenCookie = document.cookie
            .split('; ')
            .find(row => row.startsWith('auth_token='));
          
          if (authTokenCookie) {
            const token = authTokenCookie.split('=')[1];
            const payload = verifyJWTToken(token);
            
            if (payload) {
              // 从JWT payload中获取用户信息
              setUser({
                id: payload.userId,
                line_user_id: payload.userId,
                name: '用户', // 这里可以从数据库获取详细信息
                katakana: '',
                role: payload.role as 'cleaner' | 'manager' | 'owner',
                avatar: '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            }
          }
        }
      } catch (error) {
        console.error('初始化用户状态失败:', error);
      } finally {
        setInitialized(true);
      }
    };

    initializeUserState();
  }, [setUser, setInitialized]);

  return null; // 这个组件不渲染任何内容
}; 