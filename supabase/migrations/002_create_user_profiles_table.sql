-- 创建用户档案表
-- 迁移文件: 002_create_user_profiles_table.sql

-- 创建user_profiles表
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  line_user_id TEXT UNIQUE NOT NULL,
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

-- 插入一些测试数据（可选）
INSERT INTO user_profiles (line_user_id, name, katakana, role, avatar) VALUES
  ('U1234567890abcdef', '山田太郎', 'ヤマダタロウ', 'cleaner', 'https://example.com/avatar1.jpg'),
  ('U2345678901bcdefg', '佐藤花子', 'サトウハナコ', 'manager', 'https://example.com/avatar2.jpg'),
  ('U3456789012cdefgh', '鈴木一郎', 'スズキイチロウ', 'owner', 'https://example.com/avatar3.jpg')
ON CONFLICT (line_user_id) DO NOTHING; 