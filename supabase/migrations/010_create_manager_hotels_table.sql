-- 010_create_manager_hotels_table.sql
-- 创建 manager_hotels 关联表，用于记录经理管理的酒店列表

create table if not exists public.manager_hotels (
  id uuid not null default gen_random_uuid(),
  manager_id uuid not null,
  hotel_id uuid not null,
  created_at timestamp without time zone default now(),
  constraint manager_hotels_pkey primary key (id),
  constraint manager_hotels_manager_id_fkey foreign key (manager_id) references public.user_profiles(id) on delete cascade,
  constraint manager_hotels_hotel_id_fkey foreign key (hotel_id) references public.hotels(id) on delete cascade,
  constraint manager_hotels_unique unique (manager_id, hotel_id)
);

comment on table public.manager_hotels is '经理管理的酒店关联表';
comment on column public.manager_hotels.manager_id is '经理用户ID';
comment on column public.manager_hotels.hotel_id is '酒店ID';

