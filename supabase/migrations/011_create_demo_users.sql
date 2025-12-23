-- 011_create_demo_users.sql
-- 创建测试账号的用户数据
-- 
-- 说明：
-- 1. 代码会在首次登录时自动创建这些用户，通常不需要手动执行
-- 2. 如果代码初始化失败，可以手动执行此SQL来创建测试用户
-- 3. 使用 ON CONFLICT 确保可以重复执行而不会报错

-- 插入测试用户（使用 ON CONFLICT 避免重复）
INSERT INTO public.user_profiles (
  id,
  line_user_id,
  name,
  katakana,
  avatar,
  role,
  phone,
  created_at,
  updated_at
) VALUES
  (
    '00000000-0000-0000-0000-000000000001', -- DEMO_OWNER_ID
    'demo_test_account',
    '测试业主',
    'テストオーナー',
    NULL,
    'owner',
    NULL,
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000002', -- DEMO_MANAGER_ID
    'demo_test_account',
    '测试管理者',
    'テストマネージャー',
    NULL,
    'manager',
    NULL,
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000003', -- DEMO_CLEANER_ID
    'demo_test_account',
    '测试清洁员',
    'テストクリーナー',
    NULL,
    'cleaner',
    NULL,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  line_user_id = EXCLUDED.line_user_id,
  name = EXCLUDED.name,
  katakana = EXCLUDED.katakana,
  role = EXCLUDED.role,
  updated_at = NOW();

