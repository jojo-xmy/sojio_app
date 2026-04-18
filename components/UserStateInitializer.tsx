"use client";
import { useEffect, useRef } from 'react';
import { useUserStore } from '@/store/userStore';

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

        // 如果没有可用的 user_info cookie，保持未登录状态并完成初始化。
        // auth_token 是 HttpOnly，客户端无法安全验证，验证应仅在服务端进行。
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