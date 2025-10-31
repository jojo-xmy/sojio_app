-- =====================================================
-- Migration: 优化 calendar_entries 和 tasks 的关联
-- 版本: 005
-- 描述: 
--   1. 移除 calendar_entries.task_id 字段（信息不完整）
--   2. 优化触发器支持多清扫日期
--   3. 确保任务创建和删除的一致性
-- =====================================================

-- =====================================================
-- 第一步：备份旧触发器函数
-- =====================================================

-- 如果有旧的触发器，先备份
CREATE OR REPLACE FUNCTION backup_manage_calendar_task_association()
RETURNS TRIGGER AS $$
BEGIN
  RAISE WARNING '已废弃的函数被调用';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 第二步：创建新的触发器函数（支持多清扫日期）
-- =====================================================

-- 新的触发器函数：根据 cleaning_dates 创建多个任务
CREATE OR REPLACE FUNCTION manage_calendar_tasks_v2()
RETURNS TRIGGER AS $$
DECLARE
    cleaning_date TEXT;
    hotel_name_value TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- 获取酒店名称
        SELECT h.name INTO hotel_name_value
        FROM public.hotels h
        WHERE h.id = NEW.hotel_id;
        
        -- 如果没有指定清扫日期，使用退房日期作为默认清扫日期
        IF NEW.cleaning_dates IS NULL OR jsonb_array_length(NEW.cleaning_dates) = 0 THEN
            -- 创建一个清扫任务（退房日清扫）
            INSERT INTO public.tasks (
                hotel_name,
                hotel_id,
                check_in_date,
                check_out_date,
                cleaning_date,
                guest_count,
                status,
                created_by,
                owner_notes,
                calendar_entry_id
            )
            VALUES (
                hotel_name_value,
                NEW.hotel_id,
                NEW.check_in_date,
                NEW.check_out_date,
                NEW.check_out_date,  -- 清扫日期默认为退房日期
                NEW.guest_count,
                'draft',
                NEW.created_by,
                NEW.owner_notes,
                NEW.id
            );
        ELSE
            -- 根据 cleaning_dates 数组创建多个清扫任务
            FOR cleaning_date IN SELECT jsonb_array_elements_text(NEW.cleaning_dates)
            LOOP
                -- 检查是否已存在相同的任务（避免重复创建）
                IF NOT EXISTS (
                    SELECT 1
                    FROM public.tasks
                    WHERE hotel_id = NEW.hotel_id
                      AND calendar_entry_id = NEW.id
                      AND cleaning_date = cleaning_date::date
                ) THEN
                    INSERT INTO public.tasks (
                        hotel_name,
                        hotel_id,
                        check_in_date,
                        check_out_date,
                        cleaning_date,
                        guest_count,
                        status,
                        created_by,
                        owner_notes,
                        calendar_entry_id
                    )
                    VALUES (
                        hotel_name_value,
                        NEW.hotel_id,
                        NEW.check_in_date,
                        NEW.check_out_date,
                        cleaning_date::date,
                        NEW.guest_count,
                        'draft',
                        NEW.created_by,
                        NEW.owner_notes,
                        NEW.id
                    );
                END IF;
            END LOOP;
        END IF;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- 更新任务信息
        -- 注意：这里只更新基本信息，不更新清扫日期
        -- 如果需要更改清扫日期，需要手动删除旧任务并重新创建
        
        UPDATE public.tasks 
        SET 
            hotel_id = NEW.hotel_id,
            check_in_date = NEW.check_in_date,
            check_out_date = NEW.check_out_date,
            guest_count = NEW.guest_count,
            owner_notes = NEW.owner_notes,
            updated_at = NOW()
        WHERE calendar_entry_id = NEW.id;
        
        -- 如果 cleaning_dates 发生变化，需要重新生成任务
        -- 删除旧任务
        DELETE FROM public.tasks 
        WHERE calendar_entry_id = NEW.id;
        
        -- 重新创建任务
        SELECT h.name INTO hotel_name_value
        FROM public.hotels h
        WHERE h.id = NEW.hotel_id;
        
        IF NEW.cleaning_dates IS NULL OR jsonb_array_length(NEW.cleaning_dates) = 0 THEN
            INSERT INTO public.tasks (
                hotel_name,
                hotel_id,
                check_in_date,
                check_out_date,
                cleaning_date,
                guest_count,
                status,
                created_by,
                owner_notes,
                calendar_entry_id
            )
            VALUES (
                hotel_name_value,
                NEW.hotel_id,
                NEW.check_in_date,
                NEW.check_out_date,
                NEW.check_out_date,
                NEW.guest_count,
                'draft',
                NEW.created_by,
                NEW.owner_notes,
                NEW.id
            );
        ELSE
            FOR cleaning_date IN SELECT jsonb_array_elements_text(NEW.cleaning_dates)
            LOOP
                INSERT INTO public.tasks (
                    hotel_name,
                    hotel_id,
                    check_in_date,
                    check_out_date,
                    cleaning_date,
                    guest_count,
                    status,
                    created_by,
                    owner_notes,
                    calendar_entry_id
                )
                VALUES (
                    hotel_name_value,
                    NEW.hotel_id,
                    NEW.check_in_date,
                    NEW.check_out_date,
                    cleaning_date::date,
                    NEW.guest_count,
                    'draft',
                    NEW.created_by,
                    NEW.owner_notes,
                    NEW.id
                );
            END LOOP;
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 第三步：创建删除触发器函数（级联删除任务）
-- =====================================================

CREATE OR REPLACE FUNCTION handle_calendar_entries_delete_v2()
RETURNS TRIGGER AS $$
BEGIN
    -- 删除所有关联的任务
    DELETE FROM public.tasks 
    WHERE calendar_entry_id = OLD.id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 第四步：删除旧的触发器
-- =====================================================

DROP TRIGGER IF EXISTS trigger_manage_calendar_task_association ON public.calendar_entries;
DROP TRIGGER IF EXISTS trigger_handle_calendar_task_delete ON public.calendar_entries;

-- =====================================================
-- 第五步：创建新的触发器
-- =====================================================

-- INSERT 和 UPDATE 触发器（BEFORE，因为需要修改 NEW 对象）
CREATE TRIGGER trigger_manage_calendar_tasks_v2
    BEFORE INSERT OR UPDATE ON public.calendar_entries
    FOR EACH ROW
    EXECUTE FUNCTION manage_calendar_tasks_v2();

-- DELETE 触发器（AFTER，因为需要访问 OLD 对象）
CREATE TRIGGER trigger_handle_calendar_entries_delete_v2
    AFTER DELETE ON public.calendar_entries
    FOR EACH ROW
    EXECUTE FUNCTION handle_calendar_entries_delete_v2();

-- =====================================================
-- 第六步：移除 calendar_entries.task_id 字段
-- =====================================================
-- 注意：这一步需要谨慎，如果有现有数据依赖这个字段
-- 建议先检查是否有数据

-- ALTER TABLE public.calendar_entries 
--     DROP CONSTRAINT IF EXISTS calendar_entries_task_id_fkey;

-- ALTER TABLE public.calendar_entries 
--     DROP COLUMN IF EXISTS task_id;

-- 暂时不删除该字段，保持向后兼容
-- 待确认所有代码都不再使用该字段后再删除

-- =====================================================
-- 完成
-- =====================================================

COMMENT ON FUNCTION manage_calendar_tasks_v2() IS 
'优化后的触发器函数，支持根据 cleaning_dates 数组创建多个清扫任务';

COMMENT ON FUNCTION handle_calendar_entries_delete_v2() IS 
'优化后的删除触发器函数，级联删除所有关联的清扫任务';

