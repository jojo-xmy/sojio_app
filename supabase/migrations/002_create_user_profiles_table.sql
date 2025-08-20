-- 创建用户档案表
-- 迁移文件: 002_create_user_profiles_table.sql

-- 创建user_profiles表
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  line_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  katakana TEXT,
  avatar TEXT,
  role TEXT NOT NULL DEFAULT 'cleaner' CHECK (role IN ('owner', 'manager', 'cleaner')),
  phone TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_profiles_line_user_id ON user_profiles(line_user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- 创建触发器自动更新updated_at字段
CREATE TRIGGER IF NOT EXISTS update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 添加复合唯一约束，确保同一LINE账号在同一角色下只有一个档案
ALTER TABLE user_profiles ADD CONSTRAINT IF NOT EXISTS user_profiles_line_user_id_role_unique 
  UNIQUE (line_user_id, role); 