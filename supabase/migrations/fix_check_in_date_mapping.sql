-- 修正 manage_calendar_task_association 函数中的入住日期映射错误
-- 问题：入住日期被错误地设置为退房日期，导致右侧边栏任务卡片显示错误的入住日期

-- 第一步：修正数据库触发器函数
CREATE OR REPLACE FUNCTION public.manage_calendar_task_association()
RETURNS trigger AS $$
DECLARE
    new_task_id UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- 创建对应的清扫任务
        INSERT INTO public.tasks (
            hotel_name,
            hotel_id,
            check_in_date,
            check_out_date,
            cleaning_date,
            guest_count,
            status,
            created_by,
            room_number,
            owner_notes
        )
        SELECT
            h.name,
            NEW.hotel_id,
            NEW.check_in_date,  -- 修正：使用正确的入住日期
            NEW.check_out_date,
            NEW.check_out_date,
            NEW.guest_count,
            'draft',
            NEW.created_by,
            NEW.room_number,
            NEW.owner_notes
        FROM public.hotels h
        WHERE h.id = NEW.hotel_id
            AND NOT EXISTS (
                SELECT 1
                FROM public.tasks t
                WHERE t.hotel_id = NEW.hotel_id
                    AND t.check_in_date = NEW.check_in_date  -- 修正：使用正确的入住日期进行重复检查
                    AND t.room_number IS NOT DISTINCT FROM NEW.room_number
            )
        RETURNING id INTO new_task_id;
        
        -- 回写 task_id 到 calendar_entries
        NEW.task_id = new_task_id;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- 更新对应的任务信息
        IF NEW.task_id IS NOT NULL THEN
            UPDATE public.tasks 
            SET 
                check_in_date = NEW.check_in_date,  -- 修正：使用正确的入住日期
                check_out_date = NEW.check_out_date,
                cleaning_date = NEW.check_out_date,
                room_number = NEW.room_number,
                guest_count = NEW.guest_count,
                owner_notes = NEW.owner_notes,
                updated_at = NOW()
            WHERE id = NEW.task_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 第二步：修复已存在的错误数据
-- 对于已存在的任务，如果入住日期等于退房日期，则从对应的calendar_entries中获取正确的入住日期
UPDATE public.tasks t
SET 
    check_in_date = ce.check_in_date,
    updated_at = NOW()
FROM public.calendar_entries ce
WHERE t.id = ce.task_id 
    AND t.check_in_date = t.check_out_date  -- 只修复错误的记录
    AND ce.check_in_date != ce.check_out_date;  -- 确保calendar_entries中有不同的入住和退房日期

-- 注释：此修正解决了右侧边栏任务卡片入住日期显示错误的问题
-- 之前入住日期被强制设置为退房日期，现在使用正确的入住日期
