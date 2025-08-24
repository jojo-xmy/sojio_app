| create_function_sql                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CREATE OR REPLACE FUNCTION public.generate_cleaning_tasks() RETURNS trigger LANGUAGE plpgsql AS $$ 

BEGIN
    -- 当有新的退房日期时，自动创建清扫任务
    INSERT INTO tasks (
        hotel_name,
        date,
        status,
        created_by,
        room_number,
        description
    )
    SELECT 
        h.name,
        NEW.check_out_date,
        'draft',
        NEW.created_by,
        NEW.room_number,
        '退房后清扫任务 - 房间: ' || COALESCE(NEW.room_number, '未指定')
    FROM hotels h
    WHERE h.id = NEW.hotel_id
      AND NOT EXISTS (
          SELECT 1 FROM tasks t 
          WHERE t.hotel_name = h.name 
            AND t.date = NEW.check_out_date
            AND t.room_number = NEW.room_number
      );
    
    RETURN NEW;
END;

$$;

 |
| CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$ 

begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;

$$;

                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql AS $$ 

BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;

$$;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |