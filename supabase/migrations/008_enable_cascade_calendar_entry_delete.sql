-- 008_enable_cascade_calendar_entry_delete.sql
-- 目的：允许房东删除入住登记时自动清理关联任务及其子表记录

BEGIN;

-- 1. 确保 calendar_entries 删除时可级联删除 tasks
ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_calendar_entry_id_fkey;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_calendar_entry_id_fkey
  FOREIGN KEY (calendar_entry_id)
  REFERENCES public.calendar_entries(id)
  ON DELETE CASCADE;

-- 2. 任务删除时同步清理 task_assignments / task_images / task_notifications
ALTER TABLE public.task_assignments
  DROP CONSTRAINT IF EXISTS task_assignments_task_id_fkey;

ALTER TABLE public.task_assignments
  ADD CONSTRAINT task_assignments_task_id_fkey
  FOREIGN KEY (task_id)
  REFERENCES public.tasks(id)
  ON DELETE CASCADE;

ALTER TABLE public.task_images
  DROP CONSTRAINT IF EXISTS task_images_task_id_fkey;

ALTER TABLE public.task_images
  ADD CONSTRAINT task_images_task_id_fkey
  FOREIGN KEY (task_id)
  REFERENCES public.tasks(id)
  ON DELETE CASCADE;

ALTER TABLE public.task_notifications
  DROP CONSTRAINT IF EXISTS task_notifications_task_id_fkey;

ALTER TABLE public.task_notifications
  ADD CONSTRAINT task_notifications_task_id_fkey
  FOREIGN KEY (task_id)
  REFERENCES public.tasks(id)
  ON DELETE CASCADE;

-- 3. calendar_entries.task_id 字段保留，但不会阻止任务删除
ALTER TABLE public.calendar_entries
  DROP CONSTRAINT IF EXISTS calendar_entries_task_id_fkey;

ALTER TABLE public.calendar_entries
  ADD CONSTRAINT calendar_entries_task_id_fkey
  FOREIGN KEY (task_id)
  REFERENCES public.tasks(id)
  ON DELETE SET NULL;

-- 4. 删除已不再需要的触发器与函数
DROP TRIGGER IF EXISTS trigger_handle_calendar_entries_delete_v2 ON public.calendar_entries;
DROP FUNCTION IF EXISTS handle_calendar_entries_delete_v2();

COMMIT;

