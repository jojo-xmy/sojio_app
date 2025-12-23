import { UserProfile } from '@/types/user';

// 测试账号的固定 line_user_id
export const DEMO_LINE_USER_ID = 'demo_test_account';

// 测试账号的固定 UUID
export const DEMO_OWNER_ID = '00000000-0000-0000-0000-000000000001';
export const DEMO_MANAGER_ID = '00000000-0000-0000-0000-000000000002';
export const DEMO_CLEANER_ID = '00000000-0000-0000-0000-000000000003';

// 测试用户数据
export const DEMO_USERS: Record<'owner' | 'manager' | 'cleaner', UserProfile> = {
  owner: {
    id: DEMO_OWNER_ID,
    line_user_id: DEMO_LINE_USER_ID,
    name: 'test owner',
    katakana: 'テストオーナー',
    avatar: undefined,
    role: 'owner',
    phone: undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  manager: {
    id: DEMO_MANAGER_ID,
    line_user_id: DEMO_LINE_USER_ID,
    name: 'test manager',
    katakana: 'テストマネージャー',
    avatar: undefined,
    role: 'manager',
    phone: undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  cleaner: {
    id: DEMO_CLEANER_ID,
    line_user_id: DEMO_LINE_USER_ID,
    name: 'test cleaner',
    katakana: 'テストクリーナー',
    avatar: undefined,
    role: 'cleaner',
    phone: undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
};

// 检查是否为测试账号
export function isDemoUser(lineUserId: string | undefined): boolean {
  return lineUserId === DEMO_LINE_USER_ID;
}

// 获取所有测试用户角色
export function getDemoUserRoles(): UserProfile[] {
  return [DEMO_USERS.owner, DEMO_USERS.manager, DEMO_USERS.cleaner];
}

// 根据角色获取测试用户
export function getDemoUserByRole(role: 'owner' | 'manager' | 'cleaner'): UserProfile {
  return DEMO_USERS[role];
}

