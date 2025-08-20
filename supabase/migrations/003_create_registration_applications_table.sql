-- 创建注册申请表
-- 迁移文件: 003_create_registration_applications_table.sql

-- 创建registration_applications表
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
CREATE INDEX IF NOT EXISTS idx_registration_applications_line_user_id ON registration_applications(line_user_id);
CREATE INDEX IF NOT EXISTS idx_registration_applications_status ON registration_applications(status);
CREATE INDEX IF NOT EXISTS idx_registration_applications_role ON registration_applications(role);

-- 创建触发器自动更新updated_at字段
CREATE TRIGGER IF NOT EXISTS update_registration_applications_updated_at 
    BEFORE UPDATE ON registration_applications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 