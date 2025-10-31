-- =====================================================
-- Migration: 修复 calendar_entries 触发器的触发时机问题
-- 版本: 007
-- 描述: 
--   1. 将触发器从 BEFORE 改为 AFTER，解决外键约束问题
--   2. 移除 UPDATE 生命周期逻辑，由应用层按差异同步任务
-- =====================================================

-- =====================================================
-- 第一步：删除旧的触发器（如果存在）
-- =====================================================

DROP TRIGGER IF EXISTS trigger_manage_calendar_tasks_v2 ON public.calendar_entries;

-- =====================================================
-- 第二步：重新创建触发器函数
-- =====================================================

CREATE OR REPLACE FUNCTION manage_calendar_tasks_v2()
RETURNS TRIGGER AS $$
DECLARE
    cleaning_date TEXT;
    hotel_name_value TEXT;
BEGIN
    -- 获取酒店名称（INSERT 和 UPDATE 都需要）
    SELECT h.name INTO hotel_name_value
    FROM public.hotels h
    WHERE h.id = NEW.hotel_id;
    
    -- 如果酒店不存在，记录错误但继续执行（避免阻塞整个插入）
    IF hotel_name_value IS NULL THEN
        RAISE WARNING '酒店 ID % 不存在', NEW.hotel_id;
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'INSERT' THEN
        -- INSERT 逻辑：创建新任务
        
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
                NEW.check_out_date,
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
-- 第三步：重新创建触发器（改为 AFTER）
-- =====================================================

-- INSERT 和 UPDATE 触发器（改为 AFTER，确保数据已插入才能创建外键关联）
CREATE TRIGGER trigger_manage_calendar_tasks_v2
    AFTER INSERT OR UPDATE ON public.calendar_entries
    FOR EACH ROW
    EXECUTE FUNCTION manage_calendar_tasks_v2();

-- =====================================================
-- 注释
-- =====================================================

COMMENT ON FUNCTION manage_calendar_tasks_v2() IS 
'优化后的触发器函数，仅在 INSERT 时依据 cleaning_dates 创建清扫任务；更新逻辑由服务层按需同步。';

