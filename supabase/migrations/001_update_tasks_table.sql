-- 更新tasks表结构以支持新的状态模型
-- 迁移文件: 001_update_tasks_table.sql

-- 添加新字段
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_cleaners JSONB DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS accepted_by TEXT[] DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS hotel_address TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS room_number TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS lock_password TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS special_instructions TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS inventory JSONB DEFAULT '{}';

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_cleaners ON tasks USING GIN(assigned_cleaners);

-- 添加约束
ALTER TABLE tasks ADD CONSTRAINT IF NOT EXISTS check_status 
  CHECK (status IN ('draft', 'open', 'assigned', 'accepted', 'in_progress', 'completed', 'confirmed'));

-- 更新现有数据的status字段（如果有的话）
UPDATE tasks SET status = 'draft' WHERE status IS NULL;

-- 创建触发器自动更新updated_at字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER IF NOT EXISTS update_tasks_updated_at 
    BEFORE UPDATE ON tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 