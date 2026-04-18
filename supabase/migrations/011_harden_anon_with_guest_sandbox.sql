-- 011_harden_anon_with_guest_sandbox.sql
-- 目标：
-- 1) 关闭 anon / authenticated 的危险表权限（尤其 TRUNCATE/TRIGGER/REFERENCES）
-- 2) anon 仅允许访问 guest/demo 沙箱数据（固定 demo 用户链路）
-- 3) 正式数据默认不允许 anon 直接读写
--
-- 注意：
-- - 本迁移不会自动为“正式登录用户”开放权限；若正式模式仍走前端 anon 直连，将被拦截（这是预期的安全收敛）
-- - 建议先在 staging 执行并回归

BEGIN;

-- ------------------------------------------------------------
-- 基础：定义 demo 用户常量函数（避免各 policy 重复写常量）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_demo_user_id(target_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT target_id IN (
    '00000000-0000-0000-0000-000000000001'::uuid, -- demo owner
    '00000000-0000-0000-0000-000000000002'::uuid, -- demo manager
    '00000000-0000-0000-0000-000000000003'::uuid  -- demo cleaner
  );
$$;

-- ------------------------------------------------------------
-- 1) 收紧 GRANT：先全撤销，再只给 DML
-- ------------------------------------------------------------
REVOKE ALL PRIVILEGES ON TABLE public.attendance FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.calendar_entries FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.cleaner_availability FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.hotels FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.manager_hotels FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.registration_applications FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.task_assignments FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.task_images FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.task_notifications FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.tasks FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.user_profiles FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.attendance TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.calendar_entries TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cleaner_availability TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.hotels TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.manager_hotels TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.registration_applications TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.task_assignments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.task_images TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.task_notifications TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tasks TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_profiles TO anon, authenticated;

-- ------------------------------------------------------------
-- 2) 清理旧的“全放开”策略（幂等）
-- ------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        policyname ILIKE 'allow_all_%'
        OR policyname ILIKE 'Enable % for all%'
        OR policyname ILIKE 'Enable read access for all%'
        OR policyname ILIKE 'Enable SELECT access for all%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 3) anon 仅可访问 demo/guest 沙箱数据
-- ------------------------------------------------------------

-- user_profiles
DROP POLICY IF EXISTS anon_demo_user_profiles_select ON public.user_profiles;
DROP POLICY IF EXISTS anon_demo_user_profiles_insert ON public.user_profiles;
DROP POLICY IF EXISTS anon_demo_user_profiles_update ON public.user_profiles;
DROP POLICY IF EXISTS anon_demo_user_profiles_delete ON public.user_profiles;

CREATE POLICY anon_demo_user_profiles_select ON public.user_profiles
  FOR SELECT TO anon
  USING (line_user_id = 'demo_test_account');

CREATE POLICY anon_demo_user_profiles_insert ON public.user_profiles
  FOR INSERT TO anon
  WITH CHECK (line_user_id = 'demo_test_account' AND public.is_demo_user_id(id));

CREATE POLICY anon_demo_user_profiles_update ON public.user_profiles
  FOR UPDATE TO anon
  USING (line_user_id = 'demo_test_account' AND public.is_demo_user_id(id))
  WITH CHECK (line_user_id = 'demo_test_account' AND public.is_demo_user_id(id));

CREATE POLICY anon_demo_user_profiles_delete ON public.user_profiles
  FOR DELETE TO anon
  USING (line_user_id = 'demo_test_account' AND public.is_demo_user_id(id));

-- hotels
DROP POLICY IF EXISTS anon_demo_hotels_select ON public.hotels;
DROP POLICY IF EXISTS anon_demo_hotels_insert ON public.hotels;
DROP POLICY IF EXISTS anon_demo_hotels_update ON public.hotels;
DROP POLICY IF EXISTS anon_demo_hotels_delete ON public.hotels;

CREATE POLICY anon_demo_hotels_select ON public.hotels
  FOR SELECT TO anon
  USING (public.is_demo_user_id(owner_id));

CREATE POLICY anon_demo_hotels_insert ON public.hotels
  FOR INSERT TO anon
  WITH CHECK (public.is_demo_user_id(owner_id));

CREATE POLICY anon_demo_hotels_update ON public.hotels
  FOR UPDATE TO anon
  USING (public.is_demo_user_id(owner_id))
  WITH CHECK (public.is_demo_user_id(owner_id));

CREATE POLICY anon_demo_hotels_delete ON public.hotels
  FOR DELETE TO anon
  USING (public.is_demo_user_id(owner_id));

-- manager_hotels
DROP POLICY IF EXISTS anon_demo_manager_hotels_select ON public.manager_hotels;
DROP POLICY IF EXISTS anon_demo_manager_hotels_insert ON public.manager_hotels;
DROP POLICY IF EXISTS anon_demo_manager_hotels_update ON public.manager_hotels;
DROP POLICY IF EXISTS anon_demo_manager_hotels_delete ON public.manager_hotels;

CREATE POLICY anon_demo_manager_hotels_select ON public.manager_hotels
  FOR SELECT TO anon
  USING (
    public.is_demo_user_id(manager_id)
    AND EXISTS (
      SELECT 1 FROM public.hotels h
      WHERE h.id = manager_hotels.hotel_id
        AND public.is_demo_user_id(h.owner_id)
    )
  );

CREATE POLICY anon_demo_manager_hotels_insert ON public.manager_hotels
  FOR INSERT TO anon
  WITH CHECK (
    public.is_demo_user_id(manager_id)
    AND EXISTS (
      SELECT 1 FROM public.hotels h
      WHERE h.id = manager_hotels.hotel_id
        AND public.is_demo_user_id(h.owner_id)
    )
  );

CREATE POLICY anon_demo_manager_hotels_update ON public.manager_hotels
  FOR UPDATE TO anon
  USING (
    public.is_demo_user_id(manager_id)
    AND EXISTS (
      SELECT 1 FROM public.hotels h
      WHERE h.id = manager_hotels.hotel_id
        AND public.is_demo_user_id(h.owner_id)
    )
  )
  WITH CHECK (
    public.is_demo_user_id(manager_id)
    AND EXISTS (
      SELECT 1 FROM public.hotels h
      WHERE h.id = manager_hotels.hotel_id
        AND public.is_demo_user_id(h.owner_id)
    )
  );

CREATE POLICY anon_demo_manager_hotels_delete ON public.manager_hotels
  FOR DELETE TO anon
  USING (
    public.is_demo_user_id(manager_id)
    AND EXISTS (
      SELECT 1 FROM public.hotels h
      WHERE h.id = manager_hotels.hotel_id
        AND public.is_demo_user_id(h.owner_id)
    )
  );

-- calendar_entries
DROP POLICY IF EXISTS anon_demo_calendar_entries_select ON public.calendar_entries;
DROP POLICY IF EXISTS anon_demo_calendar_entries_insert ON public.calendar_entries;
DROP POLICY IF EXISTS anon_demo_calendar_entries_update ON public.calendar_entries;
DROP POLICY IF EXISTS anon_demo_calendar_entries_delete ON public.calendar_entries;

CREATE POLICY anon_demo_calendar_entries_select ON public.calendar_entries
  FOR SELECT TO anon
  USING (
    public.is_demo_user_id(created_by)
    AND EXISTS (
      SELECT 1 FROM public.hotels h
      WHERE h.id = calendar_entries.hotel_id
        AND public.is_demo_user_id(h.owner_id)
    )
  );

CREATE POLICY anon_demo_calendar_entries_insert ON public.calendar_entries
  FOR INSERT TO anon
  WITH CHECK (
    public.is_demo_user_id(created_by)
    AND EXISTS (
      SELECT 1 FROM public.hotels h
      WHERE h.id = calendar_entries.hotel_id
        AND public.is_demo_user_id(h.owner_id)
    )
  );

CREATE POLICY anon_demo_calendar_entries_update ON public.calendar_entries
  FOR UPDATE TO anon
  USING (
    public.is_demo_user_id(created_by)
    AND EXISTS (
      SELECT 1 FROM public.hotels h
      WHERE h.id = calendar_entries.hotel_id
        AND public.is_demo_user_id(h.owner_id)
    )
  )
  WITH CHECK (
    public.is_demo_user_id(created_by)
    AND EXISTS (
      SELECT 1 FROM public.hotels h
      WHERE h.id = calendar_entries.hotel_id
        AND public.is_demo_user_id(h.owner_id)
    )
  );

CREATE POLICY anon_demo_calendar_entries_delete ON public.calendar_entries
  FOR DELETE TO anon
  USING (
    public.is_demo_user_id(created_by)
    AND EXISTS (
      SELECT 1 FROM public.hotels h
      WHERE h.id = calendar_entries.hotel_id
        AND public.is_demo_user_id(h.owner_id)
    )
  );

-- tasks
DROP POLICY IF EXISTS anon_demo_tasks_select ON public.tasks;
DROP POLICY IF EXISTS anon_demo_tasks_insert ON public.tasks;
DROP POLICY IF EXISTS anon_demo_tasks_update ON public.tasks;
DROP POLICY IF EXISTS anon_demo_tasks_delete ON public.tasks;

CREATE POLICY anon_demo_tasks_select ON public.tasks
  FOR SELECT TO anon
  USING (
    public.is_demo_user_id(created_by)
    AND EXISTS (
      SELECT 1 FROM public.hotels h
      WHERE h.id = tasks.hotel_id
        AND public.is_demo_user_id(h.owner_id)
    )
  );

CREATE POLICY anon_demo_tasks_insert ON public.tasks
  FOR INSERT TO anon
  WITH CHECK (
    public.is_demo_user_id(created_by)
    AND EXISTS (
      SELECT 1 FROM public.hotels h
      WHERE h.id = tasks.hotel_id
        AND public.is_demo_user_id(h.owner_id)
    )
  );

CREATE POLICY anon_demo_tasks_update ON public.tasks
  FOR UPDATE TO anon
  USING (
    public.is_demo_user_id(created_by)
    AND EXISTS (
      SELECT 1 FROM public.hotels h
      WHERE h.id = tasks.hotel_id
        AND public.is_demo_user_id(h.owner_id)
    )
  )
  WITH CHECK (
    public.is_demo_user_id(created_by)
    AND EXISTS (
      SELECT 1 FROM public.hotels h
      WHERE h.id = tasks.hotel_id
        AND public.is_demo_user_id(h.owner_id)
    )
  );

CREATE POLICY anon_demo_tasks_delete ON public.tasks
  FOR DELETE TO anon
  USING (
    public.is_demo_user_id(created_by)
    AND EXISTS (
      SELECT 1 FROM public.hotels h
      WHERE h.id = tasks.hotel_id
        AND public.is_demo_user_id(h.owner_id)
    )
  );

-- task_assignments
DROP POLICY IF EXISTS anon_demo_task_assignments_select ON public.task_assignments;
DROP POLICY IF EXISTS anon_demo_task_assignments_insert ON public.task_assignments;
DROP POLICY IF EXISTS anon_demo_task_assignments_update ON public.task_assignments;
DROP POLICY IF EXISTS anon_demo_task_assignments_delete ON public.task_assignments;

CREATE POLICY anon_demo_task_assignments_select ON public.task_assignments
  FOR SELECT TO anon
  USING (
    public.is_demo_user_id(cleaner_id)
    AND public.is_demo_user_id(assigned_by)
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_assignments.task_id
        AND public.is_demo_user_id(t.created_by)
    )
  );

CREATE POLICY anon_demo_task_assignments_insert ON public.task_assignments
  FOR INSERT TO anon
  WITH CHECK (
    public.is_demo_user_id(cleaner_id)
    AND public.is_demo_user_id(assigned_by)
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_assignments.task_id
        AND public.is_demo_user_id(t.created_by)
    )
  );

CREATE POLICY anon_demo_task_assignments_update ON public.task_assignments
  FOR UPDATE TO anon
  USING (
    public.is_demo_user_id(cleaner_id)
    AND public.is_demo_user_id(assigned_by)
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_assignments.task_id
        AND public.is_demo_user_id(t.created_by)
    )
  )
  WITH CHECK (
    public.is_demo_user_id(cleaner_id)
    AND public.is_demo_user_id(assigned_by)
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_assignments.task_id
        AND public.is_demo_user_id(t.created_by)
    )
  );

CREATE POLICY anon_demo_task_assignments_delete ON public.task_assignments
  FOR DELETE TO anon
  USING (
    public.is_demo_user_id(cleaner_id)
    AND public.is_demo_user_id(assigned_by)
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_assignments.task_id
        AND public.is_demo_user_id(t.created_by)
    )
  );

-- task_notifications
DROP POLICY IF EXISTS anon_demo_task_notifications_select ON public.task_notifications;
DROP POLICY IF EXISTS anon_demo_task_notifications_insert ON public.task_notifications;
DROP POLICY IF EXISTS anon_demo_task_notifications_update ON public.task_notifications;
DROP POLICY IF EXISTS anon_demo_task_notifications_delete ON public.task_notifications;

CREATE POLICY anon_demo_task_notifications_select ON public.task_notifications
  FOR SELECT TO anon
  USING (
    public.is_demo_user_id(recipient_id)
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_notifications.task_id
        AND public.is_demo_user_id(t.created_by)
    )
  );

CREATE POLICY anon_demo_task_notifications_insert ON public.task_notifications
  FOR INSERT TO anon
  WITH CHECK (
    public.is_demo_user_id(recipient_id)
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_notifications.task_id
        AND public.is_demo_user_id(t.created_by)
    )
  );

CREATE POLICY anon_demo_task_notifications_update ON public.task_notifications
  FOR UPDATE TO anon
  USING (
    public.is_demo_user_id(recipient_id)
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_notifications.task_id
        AND public.is_demo_user_id(t.created_by)
    )
  )
  WITH CHECK (
    public.is_demo_user_id(recipient_id)
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_notifications.task_id
        AND public.is_demo_user_id(t.created_by)
    )
  );

CREATE POLICY anon_demo_task_notifications_delete ON public.task_notifications
  FOR DELETE TO anon
  USING (
    public.is_demo_user_id(recipient_id)
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_notifications.task_id
        AND public.is_demo_user_id(t.created_by)
    )
  );

-- task_images
DROP POLICY IF EXISTS anon_demo_task_images_select ON public.task_images;
DROP POLICY IF EXISTS anon_demo_task_images_insert ON public.task_images;
DROP POLICY IF EXISTS anon_demo_task_images_update ON public.task_images;
DROP POLICY IF EXISTS anon_demo_task_images_delete ON public.task_images;

CREATE POLICY anon_demo_task_images_select ON public.task_images
  FOR SELECT TO anon
  USING (
    uploaded_by IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003'
    )
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_images.task_id
        AND public.is_demo_user_id(t.created_by)
    )
  );

CREATE POLICY anon_demo_task_images_insert ON public.task_images
  FOR INSERT TO anon
  WITH CHECK (
    uploaded_by IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003'
    )
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_images.task_id
        AND public.is_demo_user_id(t.created_by)
    )
  );

CREATE POLICY anon_demo_task_images_update ON public.task_images
  FOR UPDATE TO anon
  USING (
    uploaded_by IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003'
    )
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_images.task_id
        AND public.is_demo_user_id(t.created_by)
    )
  )
  WITH CHECK (
    uploaded_by IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003'
    )
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_images.task_id
        AND public.is_demo_user_id(t.created_by)
    )
  );

CREATE POLICY anon_demo_task_images_delete ON public.task_images
  FOR DELETE TO anon
  USING (
    uploaded_by IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003'
    )
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_images.task_id
        AND public.is_demo_user_id(t.created_by)
    )
  );

-- attendance（user_id 是 text）
DROP POLICY IF EXISTS anon_demo_attendance_select ON public.attendance;
DROP POLICY IF EXISTS anon_demo_attendance_insert ON public.attendance;
DROP POLICY IF EXISTS anon_demo_attendance_update ON public.attendance;
DROP POLICY IF EXISTS anon_demo_attendance_delete ON public.attendance;

CREATE POLICY anon_demo_attendance_select ON public.attendance
  FOR SELECT TO anon
  USING (
    user_id IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003'
    )
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id::text = attendance.task_id
        AND public.is_demo_user_id(t.created_by)
    )
  );

CREATE POLICY anon_demo_attendance_insert ON public.attendance
  FOR INSERT TO anon
  WITH CHECK (
    user_id IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003'
    )
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id::text = attendance.task_id
        AND public.is_demo_user_id(t.created_by)
    )
  );

CREATE POLICY anon_demo_attendance_update ON public.attendance
  FOR UPDATE TO anon
  USING (
    user_id IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003'
    )
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id::text = attendance.task_id
        AND public.is_demo_user_id(t.created_by)
    )
  )
  WITH CHECK (
    user_id IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003'
    )
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id::text = attendance.task_id
        AND public.is_demo_user_id(t.created_by)
    )
  );

CREATE POLICY anon_demo_attendance_delete ON public.attendance
  FOR DELETE TO anon
  USING (
    user_id IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003'
    )
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id::text = attendance.task_id
        AND public.is_demo_user_id(t.created_by)
    )
  );

-- cleaner_availability
DROP POLICY IF EXISTS anon_demo_cleaner_availability_select ON public.cleaner_availability;
DROP POLICY IF EXISTS anon_demo_cleaner_availability_insert ON public.cleaner_availability;
DROP POLICY IF EXISTS anon_demo_cleaner_availability_update ON public.cleaner_availability;
DROP POLICY IF EXISTS anon_demo_cleaner_availability_delete ON public.cleaner_availability;

CREATE POLICY anon_demo_cleaner_availability_select ON public.cleaner_availability
  FOR SELECT TO anon
  USING (public.is_demo_user_id(cleaner_id));

CREATE POLICY anon_demo_cleaner_availability_insert ON public.cleaner_availability
  FOR INSERT TO anon
  WITH CHECK (public.is_demo_user_id(cleaner_id));

CREATE POLICY anon_demo_cleaner_availability_update ON public.cleaner_availability
  FOR UPDATE TO anon
  USING (public.is_demo_user_id(cleaner_id))
  WITH CHECK (public.is_demo_user_id(cleaner_id));

CREATE POLICY anon_demo_cleaner_availability_delete ON public.cleaner_availability
  FOR DELETE TO anon
  USING (public.is_demo_user_id(cleaner_id));

-- registration_applications
DROP POLICY IF EXISTS anon_demo_registration_applications_select ON public.registration_applications;
DROP POLICY IF EXISTS anon_demo_registration_applications_insert ON public.registration_applications;
DROP POLICY IF EXISTS anon_demo_registration_applications_update ON public.registration_applications;
DROP POLICY IF EXISTS anon_demo_registration_applications_delete ON public.registration_applications;

CREATE POLICY anon_demo_registration_applications_select ON public.registration_applications
  FOR SELECT TO anon
  USING (line_user_id = 'demo_test_account');

CREATE POLICY anon_demo_registration_applications_insert ON public.registration_applications
  FOR INSERT TO anon
  WITH CHECK (line_user_id = 'demo_test_account');

CREATE POLICY anon_demo_registration_applications_update ON public.registration_applications
  FOR UPDATE TO anon
  USING (line_user_id = 'demo_test_account')
  WITH CHECK (line_user_id = 'demo_test_account');

CREATE POLICY anon_demo_registration_applications_delete ON public.registration_applications
  FOR DELETE TO anon
  USING (line_user_id = 'demo_test_account');

-- ------------------------------------------------------------
-- 4) authenticated 临时兜底（避免未来接入 Supabase Auth 时无策略）
-- ------------------------------------------------------------
DROP POLICY IF EXISTS authenticated_full_access_user_profiles ON public.user_profiles;
DROP POLICY IF EXISTS authenticated_full_access_hotels ON public.hotels;
DROP POLICY IF EXISTS authenticated_full_access_manager_hotels ON public.manager_hotels;
DROP POLICY IF EXISTS authenticated_full_access_calendar_entries ON public.calendar_entries;
DROP POLICY IF EXISTS authenticated_full_access_tasks ON public.tasks;
DROP POLICY IF EXISTS authenticated_full_access_task_assignments ON public.task_assignments;
DROP POLICY IF EXISTS authenticated_full_access_task_notifications ON public.task_notifications;
DROP POLICY IF EXISTS authenticated_full_access_task_images ON public.task_images;
DROP POLICY IF EXISTS authenticated_full_access_attendance ON public.attendance;
DROP POLICY IF EXISTS authenticated_full_access_cleaner_availability ON public.cleaner_availability;
DROP POLICY IF EXISTS authenticated_full_access_registration_applications ON public.registration_applications;

CREATE POLICY authenticated_full_access_user_profiles ON public.user_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_full_access_hotels ON public.hotels FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_full_access_manager_hotels ON public.manager_hotels FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_full_access_calendar_entries ON public.calendar_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_full_access_tasks ON public.tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_full_access_task_assignments ON public.task_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_full_access_task_notifications ON public.task_notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_full_access_task_images ON public.task_images FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_full_access_attendance ON public.attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_full_access_cleaner_availability ON public.cleaner_availability FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_full_access_registration_applications ON public.registration_applications FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMIT;
