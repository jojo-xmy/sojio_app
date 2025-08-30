[
  {
    "schema_name": "public",
    "function_name": "generate_cleaning_tasks",
    "routine_type": "FUNCTION",
    "return_type": "trigger",
    "definition": "\nbegin\n  /*\n    当插入新的 calendar_entries 记录时，自动创建一条 draft 任务：\n    - 不再写入 tasks.description\n    - 将 owner_notes 同步到 tasks.owner_notes\n    - 使用 check_out_date 作为 tasks.check_in_date（退房日清扫）\n    - 避免重复（同 hotel_id + check_in_date + room_number）\n  */\n  insert into public.tasks (\n    hotel_name,\n    hotel_id,\n    check_in_date,\n    check_out_date,\n    guest_count,\n    status,\n    created_by,\n    room_number,\n    owner_notes\n  )\n  select\n    h.name,\n    new.hotel_id,\n    new.check_out_date,\n    new.check_out_date,\n    new.guest_count,\n    'draft',\n    new.created_by,\n    new.room_number,\n    new.owner_notes\n  from public.hotels h\n  where h.id = new.hotel_id\n    and not exists (\n      select 1\n      from public.tasks t\n      where t.hotel_id = new.hotel_id\n        and t.check_in_date = new.check_out_date\n        -- 兼容空房间号的等价判断\n        and t.room_number is not distinct from new.room_number\n    );\n\n  return new;\nend;\n"
  },
  {
    "schema_name": "public",
    "function_name": "handle_calendar_task_delete",
    "routine_type": "FUNCTION",
    "return_type": "trigger",
    "definition": "\nBEGIN\n    -- 删除对应的任务\n    IF OLD.task_id IS NOT NULL THEN\n        DELETE FROM public.tasks WHERE id = OLD.task_id;\n    END IF;\n    RETURN OLD;\nEND;\n"
  },
  {
    "schema_name": "public",
    "function_name": "handle_new_user",
    "routine_type": "FUNCTION",
    "return_type": "trigger",
    "definition": "\nbegin\n  insert into public.profiles (id, full_name, avatar_url)\n  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');\n  return new;\nend;\n"
  },
  {
    "schema_name": "public",
    "function_name": "manage_calendar_task_association",
    "routine_type": "FUNCTION",
    "return_type": "trigger",
    "definition": "\nDECLARE\n    new_task_id UUID;\nBEGIN\n    IF TG_OP = 'INSERT' THEN\n        -- 创建对应的清扫任务\n        INSERT INTO public.tasks (\n            hotel_name,\n            hotel_id,\n            check_in_date,\n            check_out_date,\n            cleaning_date,\n            guest_count,\n            status,\n            created_by,\n            room_number,\n            owner_notes\n        )\n        SELECT\n            h.name,\n            NEW.hotel_id,\n            NEW.check_out_date,\n            NEW.check_out_date,\n            NEW.check_out_date,\n            NEW.guest_count,\n            'draft',\n            NEW.created_by,\n            NEW.room_number,\n            NEW.owner_notes\n        FROM public.hotels h\n        WHERE h.id = NEW.hotel_id\n            AND NOT EXISTS (\n                SELECT 1\n                FROM public.tasks t\n                WHERE t.hotel_id = NEW.hotel_id\n                    AND t.check_in_date = NEW.check_out_date\n                    AND t.room_number IS NOT DISTINCT FROM NEW.room_number\n            )\n        RETURNING id INTO new_task_id;\n        \n        -- 回写 task_id 到 calendar_entries\n        NEW.task_id = new_task_id;\n        \n    ELSIF TG_OP = 'UPDATE' THEN\n        -- 更新对应的任务信息\n        IF NEW.task_id IS NOT NULL THEN\n            UPDATE public.tasks \n            SET \n                check_in_date = NEW.check_out_date,\n                check_out_date = NEW.check_out_date,\n                cleaning_date = NEW.check_out_date,\n                room_number = NEW.room_number,\n                guest_count = NEW.guest_count,\n                owner_notes = NEW.owner_notes,\n                updated_at = NOW()\n            WHERE id = NEW.task_id;\n        END IF;\n    END IF;\n    \n    RETURN NEW;\nEND;\n"
  },
  {
    "schema_name": "public",
    "function_name": "update_updated_at_column",
    "routine_type": "FUNCTION",
    "return_type": "trigger",
    "definition": "\nBEGIN\n  NEW.updated_at = NOW();\n  RETURN NEW;\nEND;\n"
  }
]