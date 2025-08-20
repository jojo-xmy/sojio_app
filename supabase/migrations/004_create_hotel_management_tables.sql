-- 酒店管理和日程登记相关表
-- 迁移文件: 004_create_hotel_management_tables.sql

-- 1. 酒店表
CREATE TABLE IF NOT EXISTS hotels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    image_url TEXT,
    owner_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. 日历条目表（入住/退房登记）
CREATE TABLE IF NOT EXISTS calendar_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    guest_count INTEGER NOT NULL DEFAULT 1,
    room_number TEXT,
    special_notes TEXT,
    created_by UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. 清洁员可用性表
CREATE TABLE IF NOT EXISTS cleaner_availability (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cleaner_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    available_hours JSONB DEFAULT '{}', -- 可用时间段
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(cleaner_id, date)
);

-- 4. 任务分配表
CREATE TABLE IF NOT EXISTS task_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    cleaner_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT NOW(),
    status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'accepted', 'declined')),
    notes TEXT,
    UNIQUE(task_id, cleaner_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_hotels_owner_id ON hotels(owner_id);
CREATE INDEX IF NOT EXISTS idx_calendar_entries_hotel_id ON calendar_entries(hotel_id);
CREATE INDEX IF NOT EXISTS idx_calendar_entries_dates ON calendar_entries(check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_cleaner_availability_cleaner_id ON cleaner_availability(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_cleaner_availability_date ON cleaner_availability(date);
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_cleaner_id ON task_assignments(cleaner_id);

-- 创建触发器自动更新updated_at字段
CREATE TRIGGER IF NOT EXISTS update_hotels_updated_at 
    BEFORE UPDATE ON hotels 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_calendar_entries_updated_at 
    BEFORE UPDATE ON calendar_entries 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_cleaner_availability_updated_at 
    BEFORE UPDATE ON cleaner_availability 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 创建函数：自动生成清扫任务
CREATE OR REPLACE FUNCTION generate_cleaning_tasks()
RETURNS TRIGGER AS $$
BEGIN
    -- 当有新的退房日期时，自动创建清扫任务
    INSERT INTO tasks (
        hotel_name,
        date,
        status,
        created_by,
        hotel_address,
        room_number,
        description
    )
    SELECT 
        h.name,
        NEW.check_out_date,
        'draft',
        NEW.created_by,
        h.address,
        NEW.room_number,
        '退房后清扫任务 - 房间: ' || COALESCE(NEW.room_number, '未指定')
    FROM hotels h
    WHERE h.id = NEW.hotel_id
    AND NOT EXISTS (
        SELECT 1 FROM tasks t 
        WHERE t.hotel_name = h.name 
        AND t.date = NEW.check_out_date
        AND t.room_number = NEW.room_number
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器：当添加日历条目时自动生成清扫任务
CREATE TRIGGER IF NOT EXISTS trigger_generate_cleaning_tasks
    AFTER INSERT ON calendar_entries
    FOR EACH ROW
    EXECUTE FUNCTION generate_cleaning_tasks();
