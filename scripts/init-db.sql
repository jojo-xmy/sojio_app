-- 数据库初始化脚本
-- 手动创建必要的表

-- 创建用户档案表
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  line_user_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  katakana TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'cleaner')),
  phone TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建注册申请表
CREATE TABLE IF NOT EXISTS registration_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  line_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'cleaner')),
  phone TEXT,
  katakana TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES user_profiles(id),
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_profiles_line_user_id ON user_profiles(line_user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_registration_applications_line_user_id ON registration_applications(line_user_id);
CREATE INDEX IF NOT EXISTS idx_registration_applications_status ON registration_applications(status);
CREATE INDEX IF NOT EXISTS idx_registration_applications_role ON registration_applications(role);

-- 创建触发器函数（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 创建触发器
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_registration_applications_updated_at ON registration_applications;
CREATE TRIGGER update_registration_applications_updated_at 
    BEFORE UPDATE ON registration_applications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 