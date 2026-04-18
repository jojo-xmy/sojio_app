

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."backup_manage_calendar_task_association"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RAISE WARNING '已废弃的函数被调用';
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."backup_manage_calendar_task_association"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_cleaning_tasks"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  /*
    当插入新的 calendar_entries 记录时，自动创建一条 draft 任务：
    - 不再写入 tasks.description
    - 将 owner_notes 同步到 tasks.owner_notes
    - 使用 check_out_date 作为 tasks.check_in_date（退房日清扫）
    - 避免重复（同 hotel_id + check_in_date + room_number）
  */
  insert into public.tasks (
    hotel_name,
    hotel_id,
    check_in_date,
    check_out_date,
    guest_count,
    status,
    created_by,
    room_number,
    owner_notes
  )
  select
    h.name,
    new.hotel_id,
    new.check_out_date,
    new.check_out_date,
    new.guest_count,
    'draft',
    new.created_by,
    new.room_number,
    new.owner_notes
  from public.hotels h
  where h.id = new.hotel_id
    and not exists (
      select 1
      from public.tasks t
      where t.hotel_id = new.hotel_id
        and t.check_in_date = new.check_out_date
        -- 兼容空房间号的等价判断
        and t.room_number is not distinct from new.room_number
    );

  return new;
end;
$$;


ALTER FUNCTION "public"."generate_cleaning_tasks"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_calendar_task_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- 删除对应的任务
    IF OLD.task_id IS NOT NULL THEN
        DELETE FROM public.tasks WHERE id = OLD.task_id;
    END IF;
    RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."handle_calendar_task_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."manage_calendar_task_association"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."manage_calendar_task_association"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."manage_calendar_tasks_v2"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."manage_calendar_tasks_v2"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."manage_calendar_tasks_v2"() IS '优化后的触发器函数，仅在 INSERT 时依据 cleaning_dates 创建清扫任务；更新逻辑由服务层按需同步。';



CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."attendance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "check_in_time" timestamp with time zone,
    "check_out_time" timestamp with time zone,
    "status" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "name" "text"
);


ALTER TABLE "public"."attendance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."calendar_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "hotel_id" "uuid",
    "check_in_date" "date" NOT NULL,
    "check_out_date" "date" NOT NULL,
    "guest_count" integer DEFAULT 1 NOT NULL,
    "owner_notes" "text",
    "created_by" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "task_id" "uuid",
    "cleaning_dates" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."calendar_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cleaner_availability" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cleaner_id" "uuid",
    "date" "date" NOT NULL,
    "available_hours" "jsonb" DEFAULT '{}'::"jsonb",
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."cleaner_availability" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hotels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "address" "text" NOT NULL,
    "image_url" "text",
    "owner_id" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."hotels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."manager_hotels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "manager_id" "uuid" NOT NULL,
    "hotel_id" "uuid" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."manager_hotels" OWNER TO "postgres";


COMMENT ON TABLE "public"."manager_hotels" IS '经理管理的酒店关联表';



COMMENT ON COLUMN "public"."manager_hotels"."manager_id" IS '经理用户ID';



COMMENT ON COLUMN "public"."manager_hotels"."hotel_id" IS '酒店ID';



CREATE TABLE IF NOT EXISTS "public"."registration_applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "line_user_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "avatar" "text",
    "role" "text" NOT NULL,
    "phone" "text",
    "katakana" "text",
    "reason" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp without time zone,
    "review_notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "registration_applications_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'manager'::"text", 'cleaner'::"text"]))),
    CONSTRAINT "registration_applications_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."registration_applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid",
    "cleaner_id" "uuid",
    "assigned_by" "uuid",
    "assigned_at" timestamp without time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'assigned'::"text",
    "notes" "text",
    CONSTRAINT "task_assignments_status_check" CHECK (("status" = ANY (ARRAY['assigned'::"text", 'accepted'::"text", 'declined'::"text"])))
);


ALTER TABLE "public"."task_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_images" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "task_id" "uuid",
    "image_url" "text" NOT NULL,
    "uploaded_by" "text" NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."task_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "recipient_role" "text" NOT NULL,
    "message" "text" NOT NULL,
    "data" "jsonb",
    "sent" boolean DEFAULT false,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "sent_at" timestamp without time zone,
    CONSTRAINT "task_notifications_recipient_role_check" CHECK (("recipient_role" = ANY (ARRAY['owner'::"text", 'manager'::"text", 'cleaner'::"text"]))),
    CONSTRAINT "task_notifications_type_check" CHECK (("type" = ANY (ARRAY['task_created'::"text", 'task_assigned'::"text", 'task_date_changed'::"text", 'task_cancelled'::"text", 'cleaning_dates_updated'::"text"])))
);


ALTER TABLE "public"."task_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "hotel_name" "text" NOT NULL,
    "check_in_date" "date" NOT NULL,
    "check_in_time" "text",
    "description" "text",
    "status" "text" DEFAULT 'draft'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid" NOT NULL,
    "assigned_cleaners" "jsonb" DEFAULT '[]'::"jsonb",
    "accepted_by" "uuid"[],
    "completed_at" timestamp without time zone,
    "confirmed_at" timestamp without time zone,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "hotel_address" "text",
    "lock_password" "text",
    "notes" "text",
    "attendance_status" "text",
    "hotel_id" "uuid",
    "check_out_date" "date",
    "cleaning_date" "date",
    "guest_count" integer DEFAULT 1,
    "owner_notes" "text",
    "cleaner_notes" "text",
    "calendar_entry_id" "uuid",
    "manager_report_notes" "text"
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tasks"."manager_report_notes" IS '经理确认后提交给房东的清扫报告';



CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "line_user_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "katakana" "text",
    "avatar" "text",
    "role" "text" NOT NULL,
    "phone" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "user_profiles_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'manager'::"text", 'cleaner'::"text"])))
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendence_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendar_entries"
    ADD CONSTRAINT "calendar_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cleaner_availability"
    ADD CONSTRAINT "cleaner_availability_cleaner_id_date_key" UNIQUE ("cleaner_id", "date");



ALTER TABLE ONLY "public"."cleaner_availability"
    ADD CONSTRAINT "cleaner_availability_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hotels"
    ADD CONSTRAINT "hotels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."manager_hotels"
    ADD CONSTRAINT "manager_hotels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."manager_hotels"
    ADD CONSTRAINT "manager_hotels_unique" UNIQUE ("manager_id", "hotel_id");



ALTER TABLE ONLY "public"."registration_applications"
    ADD CONSTRAINT "registration_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_assignments"
    ADD CONSTRAINT "task_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_assignments"
    ADD CONSTRAINT "task_assignments_task_id_cleaner_id_key" UNIQUE ("task_id", "cleaner_id");



ALTER TABLE ONLY "public"."task_images"
    ADD CONSTRAINT "task_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_notifications"
    ADD CONSTRAINT "task_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_line_user_id_role_unique" UNIQUE ("line_user_id", "role");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_calendar_entries_dates" ON "public"."calendar_entries" USING "btree" ("check_in_date", "check_out_date");



CREATE INDEX "idx_calendar_entries_hotel_id" ON "public"."calendar_entries" USING "btree" ("hotel_id");



CREATE INDEX "idx_cleaner_availability_cleaner_id" ON "public"."cleaner_availability" USING "btree" ("cleaner_id");



CREATE INDEX "idx_cleaner_availability_date" ON "public"."cleaner_availability" USING "btree" ("date");



CREATE INDEX "idx_hotels_owner_id" ON "public"."hotels" USING "btree" ("owner_id");



CREATE INDEX "idx_registration_applications_line_user_id" ON "public"."registration_applications" USING "btree" ("line_user_id");



CREATE INDEX "idx_registration_applications_role" ON "public"."registration_applications" USING "btree" ("role");



CREATE INDEX "idx_registration_applications_status" ON "public"."registration_applications" USING "btree" ("status");



CREATE INDEX "idx_task_assignments_cleaner_id" ON "public"."task_assignments" USING "btree" ("cleaner_id");



CREATE INDEX "idx_task_assignments_task_id" ON "public"."task_assignments" USING "btree" ("task_id");



CREATE INDEX "idx_task_notifications_created_at" ON "public"."task_notifications" USING "btree" ("created_at");



CREATE INDEX "idx_task_notifications_recipient" ON "public"."task_notifications" USING "btree" ("recipient_id");



CREATE INDEX "idx_task_notifications_sent" ON "public"."task_notifications" USING "btree" ("sent");



CREATE INDEX "idx_tasks_calendar_entry_id" ON "public"."tasks" USING "btree" ("calendar_entry_id");



CREATE INDEX "idx_user_profiles_line_user_id" ON "public"."user_profiles" USING "btree" ("line_user_id");



CREATE INDEX "idx_user_profiles_role" ON "public"."user_profiles" USING "btree" ("role");



CREATE OR REPLACE TRIGGER "trigger_manage_calendar_tasks_v2" AFTER INSERT OR UPDATE ON "public"."calendar_entries" FOR EACH ROW EXECUTE FUNCTION "public"."manage_calendar_tasks_v2"();



CREATE OR REPLACE TRIGGER "update_calendar_entries_updated_at" BEFORE UPDATE ON "public"."calendar_entries" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_cleaner_availability_updated_at" BEFORE UPDATE ON "public"."cleaner_availability" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_hotels_updated_at" BEFORE UPDATE ON "public"."hotels" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_registration_applications_updated_at" BEFORE UPDATE ON "public"."registration_applications" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tasks_updated_at" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."calendar_entries"
    ADD CONSTRAINT "calendar_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_entries"
    ADD CONSTRAINT "calendar_entries_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_entries"
    ADD CONSTRAINT "calendar_entries_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cleaner_availability"
    ADD CONSTRAINT "cleaner_availability_cleaner_id_fkey" FOREIGN KEY ("cleaner_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hotels"
    ADD CONSTRAINT "hotels_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."manager_hotels"
    ADD CONSTRAINT "manager_hotels_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."manager_hotels"
    ADD CONSTRAINT "manager_hotels_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."registration_applications"
    ADD CONSTRAINT "registration_applications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."task_assignments"
    ADD CONSTRAINT "task_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_assignments"
    ADD CONSTRAINT "task_assignments_cleaner_id_fkey" FOREIGN KEY ("cleaner_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_assignments"
    ADD CONSTRAINT "task_assignments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_images"
    ADD CONSTRAINT "task_images_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_notifications"
    ADD CONSTRAINT "task_notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."task_notifications"
    ADD CONSTRAINT "task_notifications_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_calendar_entry_id_fkey" FOREIGN KEY ("calendar_entry_id") REFERENCES "public"."calendar_entries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id");



CREATE POLICY "Enable SELECT access for all" ON "public"."task_images" FOR SELECT USING (true);



CREATE POLICY "Enable insert for all" ON "public"."attendance" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable insert for all" ON "public"."task_images" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable insert for all" ON "public"."tasks" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable read access for all" ON "public"."tasks" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."attendance" FOR SELECT USING (true);



CREATE POLICY "Enable update for all" ON "public"."attendance" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "Enable update for all" ON "public"."task_images" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "Enable update for all" ON "public"."tasks" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_delete" ON "public"."attendance" FOR DELETE USING (true);



CREATE POLICY "allow_all_delete" ON "public"."calendar_entries" FOR DELETE USING (true);



CREATE POLICY "allow_all_delete" ON "public"."cleaner_availability" FOR DELETE USING (true);



CREATE POLICY "allow_all_delete" ON "public"."hotels" FOR DELETE USING (true);



CREATE POLICY "allow_all_delete" ON "public"."manager_hotels" FOR DELETE USING (true);



CREATE POLICY "allow_all_delete" ON "public"."registration_applications" FOR DELETE USING (true);



CREATE POLICY "allow_all_delete" ON "public"."task_assignments" FOR DELETE USING (true);



CREATE POLICY "allow_all_delete" ON "public"."task_images" FOR DELETE USING (true);



CREATE POLICY "allow_all_delete" ON "public"."task_notifications" FOR DELETE USING (true);



CREATE POLICY "allow_all_delete" ON "public"."tasks" FOR DELETE USING (true);



CREATE POLICY "allow_all_delete" ON "public"."user_profiles" FOR DELETE USING (true);



CREATE POLICY "allow_all_insert" ON "public"."attendance" FOR INSERT WITH CHECK (true);



CREATE POLICY "allow_all_insert" ON "public"."calendar_entries" FOR INSERT WITH CHECK (true);



CREATE POLICY "allow_all_insert" ON "public"."cleaner_availability" FOR INSERT WITH CHECK (true);



CREATE POLICY "allow_all_insert" ON "public"."hotels" FOR INSERT WITH CHECK (true);



CREATE POLICY "allow_all_insert" ON "public"."manager_hotels" FOR INSERT WITH CHECK (true);



CREATE POLICY "allow_all_insert" ON "public"."registration_applications" FOR INSERT WITH CHECK (true);



CREATE POLICY "allow_all_insert" ON "public"."task_assignments" FOR INSERT WITH CHECK (true);



CREATE POLICY "allow_all_insert" ON "public"."task_images" FOR INSERT WITH CHECK (true);



CREATE POLICY "allow_all_insert" ON "public"."task_notifications" FOR INSERT WITH CHECK (true);



CREATE POLICY "allow_all_insert" ON "public"."tasks" FOR INSERT WITH CHECK (true);



CREATE POLICY "allow_all_insert" ON "public"."user_profiles" FOR INSERT WITH CHECK (true);



CREATE POLICY "allow_all_select" ON "public"."attendance" FOR SELECT USING (true);



CREATE POLICY "allow_all_select" ON "public"."calendar_entries" FOR SELECT USING (true);



CREATE POLICY "allow_all_select" ON "public"."cleaner_availability" FOR SELECT USING (true);



CREATE POLICY "allow_all_select" ON "public"."hotels" FOR SELECT USING (true);



CREATE POLICY "allow_all_select" ON "public"."manager_hotels" FOR SELECT USING (true);



CREATE POLICY "allow_all_select" ON "public"."registration_applications" FOR SELECT USING (true);



CREATE POLICY "allow_all_select" ON "public"."task_assignments" FOR SELECT USING (true);



CREATE POLICY "allow_all_select" ON "public"."task_images" FOR SELECT USING (true);



CREATE POLICY "allow_all_select" ON "public"."task_notifications" FOR SELECT USING (true);



CREATE POLICY "allow_all_select" ON "public"."tasks" FOR SELECT USING (true);



CREATE POLICY "allow_all_select" ON "public"."user_profiles" FOR SELECT USING (true);



CREATE POLICY "allow_all_update" ON "public"."attendance" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_update" ON "public"."calendar_entries" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_update" ON "public"."cleaner_availability" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_update" ON "public"."hotels" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_update" ON "public"."manager_hotels" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_update" ON "public"."registration_applications" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_update" ON "public"."task_assignments" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_update" ON "public"."task_images" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_update" ON "public"."task_notifications" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_update" ON "public"."tasks" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_update" ON "public"."user_profiles" FOR UPDATE USING (true) WITH CHECK (true);



ALTER TABLE "public"."attendance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."calendar_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cleaner_availability" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hotels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."manager_hotels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."registration_applications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."backup_manage_calendar_task_association"() TO "anon";
GRANT ALL ON FUNCTION "public"."backup_manage_calendar_task_association"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."backup_manage_calendar_task_association"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_cleaning_tasks"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_cleaning_tasks"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_cleaning_tasks"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_calendar_task_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_calendar_task_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_calendar_task_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."manage_calendar_task_association"() TO "anon";
GRANT ALL ON FUNCTION "public"."manage_calendar_task_association"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."manage_calendar_task_association"() TO "service_role";



GRANT ALL ON FUNCTION "public"."manage_calendar_tasks_v2"() TO "anon";
GRANT ALL ON FUNCTION "public"."manage_calendar_tasks_v2"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."manage_calendar_tasks_v2"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."attendance" TO "anon";
GRANT ALL ON TABLE "public"."attendance" TO "authenticated";
GRANT ALL ON TABLE "public"."attendance" TO "service_role";



GRANT ALL ON TABLE "public"."calendar_entries" TO "anon";
GRANT ALL ON TABLE "public"."calendar_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_entries" TO "service_role";



GRANT ALL ON TABLE "public"."cleaner_availability" TO "anon";
GRANT ALL ON TABLE "public"."cleaner_availability" TO "authenticated";
GRANT ALL ON TABLE "public"."cleaner_availability" TO "service_role";



GRANT ALL ON TABLE "public"."hotels" TO "anon";
GRANT ALL ON TABLE "public"."hotels" TO "authenticated";
GRANT ALL ON TABLE "public"."hotels" TO "service_role";



GRANT ALL ON TABLE "public"."manager_hotels" TO "anon";
GRANT ALL ON TABLE "public"."manager_hotels" TO "authenticated";
GRANT ALL ON TABLE "public"."manager_hotels" TO "service_role";



GRANT ALL ON TABLE "public"."registration_applications" TO "anon";
GRANT ALL ON TABLE "public"."registration_applications" TO "authenticated";
GRANT ALL ON TABLE "public"."registration_applications" TO "service_role";



GRANT ALL ON TABLE "public"."task_assignments" TO "anon";
GRANT ALL ON TABLE "public"."task_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."task_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."task_images" TO "anon";
GRANT ALL ON TABLE "public"."task_images" TO "authenticated";
GRANT ALL ON TABLE "public"."task_images" TO "service_role";



GRANT ALL ON TABLE "public"."task_notifications" TO "anon";
GRANT ALL ON TABLE "public"."task_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."task_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
