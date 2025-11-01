-- 009_add_manager_report_notes_to_tasks.sql
-- 在 tasks 表新增 manager_report_notes，用于保存经理确认后的清扫报告

alter table public.tasks
  add column if not exists manager_report_notes text;

comment on column public.tasks.manager_report_notes is '经理确认后提交给房东的清扫报告';


