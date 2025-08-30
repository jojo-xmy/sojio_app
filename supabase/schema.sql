-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.attendance (
  name text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id text NOT NULL,
  user_id text NOT NULL,
  check_in_time timestamp with time zone,
  check_out_time timestamp with time zone,
  status text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT attendance_pkey PRIMARY KEY (id)
);
CREATE TABLE public.calendar_entries (
  task_id uuid,
  hotel_id uuid,
  check_in_date date NOT NULL,
  check_out_date date NOT NULL,
  room_number text,
  created_by uuid,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guest_count integer NOT NULL DEFAULT 1,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  owner_notes text,
  CONSTRAINT calendar_entries_pkey PRIMARY KEY (id),
  CONSTRAINT calendar_entries_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id),
  CONSTRAINT calendar_entries_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id),
  CONSTRAINT calendar_entries_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id)
);
CREATE TABLE public.cleaner_availability (
  cleaner_id uuid,
  date date NOT NULL,
  notes text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  available_hours jsonb DEFAULT '{}'::jsonb,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT cleaner_availability_pkey PRIMARY KEY (id),
  CONSTRAINT cleaner_availability_cleaner_id_fkey FOREIGN KEY (cleaner_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.hotels (
  name text NOT NULL,
  address text NOT NULL,
  image_url text,
  owner_id uuid,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT hotels_pkey PRIMARY KEY (id),
  CONSTRAINT hotels_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.registration_applications (
  line_user_id text NOT NULL,
  name text NOT NULL,
  avatar text,
  role text NOT NULL CHECK (role = ANY (ARRAY['owner'::text, 'manager'::text, 'cleaner'::text])),
  phone text,
  katakana text,
  reason text,
  reviewed_by uuid,
  reviewed_at timestamp without time zone,
  review_notes text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT registration_applications_pkey PRIMARY KEY (id),
  CONSTRAINT registration_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.task_assignments (
  task_id uuid,
  cleaner_id uuid,
  assigned_by uuid,
  notes text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assigned_at timestamp without time zone DEFAULT now(),
  status text DEFAULT 'assigned'::text CHECK (status = ANY (ARRAY['assigned'::text, 'accepted'::text, 'declined'::text])),
  CONSTRAINT task_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT task_assignments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id),
  CONSTRAINT task_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.user_profiles(id),
  CONSTRAINT task_assignments_cleaner_id_fkey FOREIGN KEY (cleaner_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.task_images (
  task_id uuid,
  image_url text NOT NULL,
  uploaded_by text NOT NULL,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  uploaded_at timestamp with time zone DEFAULT now(),
  CONSTRAINT task_images_pkey PRIMARY KEY (id),
  CONSTRAINT task_images_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id)
);
CREATE TABLE public.tasks (
  cleaning_date date,
  guest_count integer DEFAULT 1,
  notes text,
  owner_notes text,
  cleaner_notes text,
  created_by uuid NOT NULL,
  check_in_date date NOT NULL,
  hotel_name text NOT NULL,
  check_in_time text,
  description text,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'draft'::text,
  completed_at timestamp without time zone,
  confirmed_at timestamp without time zone,
  assigned_cleaners jsonb DEFAULT '[]'::jsonb,
  accepted_by ARRAY,
  room_number text,
  updated_at timestamp with time zone DEFAULT now(),
  hotel_address text,
  lock_password text,
  attendance_status text,
  hotel_id uuid,
  check_out_date date,
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id),
  CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.user_profiles (
  line_user_id text NOT NULL,
  name text NOT NULL,
  katakana text,
  avatar text,
  role text NOT NULL CHECK (role = ANY (ARRAY['owner'::text, 'manager'::text, 'cleaner'::text])),
  phone text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id)
);