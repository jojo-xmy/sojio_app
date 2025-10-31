-- =====================================================
-- Migration: 清理旧的触发器函数
-- 版本: 006
-- 描述: 删除已废弃的触发器函数
-- =====================================================

-- 删除已废弃的触发器函数
DROP FUNCTION IF EXISTS backup_manage_calendar_task_association() CASCADE;
DROP FUNCTION IF EXISTS generate_cleaning_tasks() CASCADE;
DROP FUNCTION IF EXISTS manage_calendar_task_association() CASCADE;
DROP FUNCTION IF EXISTS handle_calendar_task_delete() CASCADE;

-- 如果确认不再需要 calendar_entries.task_id 字段，可以执行以下命令
-- 执行前请确保没有现有数据依赖该字段

-- ALTER TABLE public.calendar_entries 
--     DROP CONSTRAINT IF EXISTS calendar_entries_task_id_fkey;

-- ALTER TABLE public.calendar_entries 
--     DROP COLUMN IF EXISTS task_id;

