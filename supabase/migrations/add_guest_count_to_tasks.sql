-- 为tasks表添加guest_count列
-- 这样可以避免复杂的表关联查询，保持数据的独立性

ALTER TABLE public.tasks 
ADD COLUMN guest_count integer DEFAULT 1;

-- 添加注释
COMMENT ON COLUMN public.tasks.guest_count IS '入住人数';
