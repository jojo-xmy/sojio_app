-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.attendance (
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
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  hotel_id uuid,
  check_in_date date NOT NULL,
  check_out_date date NOT NULL,
  guest_count integer NOT NULL DEFAULT 1,
  room_number text,
  special_notes text,
  created_by uuid,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT calendar_entries_pkey PRIMARY KEY (id),
  CONSTRAINT calendar_entries_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id),
  CONSTRAINT calendar_entries_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id)
);
CREATE TABLE public.cleaner_availability (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cleaner_id uuid,
  date date NOT NULL,
  available_hours jsonb DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT cleaner_availability_pkey PRIMARY KEY (id),
  CONSTRAINT cleaner_availability_cleaner_id_fkey FOREIGN KEY (cleaner_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.hotels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  image_url text,
  owner_id uuid,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT hotels_pkey PRIMARY KEY (id),
  CONSTRAINT hotels_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.registration_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  line_user_id text NOT NULL,
  name text NOT NULL,
  avatar text,
  role text NOT NULL CHECK (role = ANY (ARRAY['owner'::text, 'manager'::text, 'cleaner'::text])),
  phone text,
  katakana text,
  reason text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  reviewed_by uuid,
  reviewed_at timestamp without time zone,
  review_notes text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT registration_applications_pkey PRIMARY KEY (id),
  CONSTRAINT registration_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.task_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid,
  cleaner_id uuid,
  assigned_by uuid,
  assigned_at timestamp without time zone DEFAULT now(),
  status text DEFAULT 'assigned'::text CHECK (status = ANY (ARRAY['assigned'::text, 'accepted'::text, 'declined'::text])),
  notes text,
  CONSTRAINT task_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT task_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.user_profiles(id),
  CONSTRAINT task_assignments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id),
  CONSTRAINT task_assignments_cleaner_id_fkey FOREIGN KEY (cleaner_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.task_images (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  task_id uuid,
  image_url text NOT NULL,
  uploaded_by text NOT NULL,
  uploaded_at timestamp with time zone DEFAULT now(),
  CONSTRAINT task_images_pkey PRIMARY KEY (id),
  CONSTRAINT task_images_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id)
);
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  hotel_name text NOT NULL,
  date date NOT NULL,
  check_in_time text,
  description text,
  status text DEFAULT 'draft'::text,
  created_at timestamp with time zone DEFAULT now(),
  created_by text NOT NULL,
  assigned_cleaners jsonb DEFAULT '[]'::jsonb,
  accepted_by ARRAY,
  completed_at timestamp without time zone,
  confirmed_at timestamp without time zone,
  room_number text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tasks_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  line_user_id text NOT NULL,
  name text NOT NULL,
  katakana text,
  avatar text,
  role text NOT NULL CHECK (role = ANY (ARRAY['owner'::text, 'manager'::text, 'cleaner'::text])),
  phone text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id)
);
