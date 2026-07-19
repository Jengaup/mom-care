-- 0002 — Tablas núcleo (sin logs). Nombres en inglés.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role user_role not null default 'caregiver',
  phone text,
  created_at timestamptz not null default now()
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  birth_date date,
  notes text,
  -- Ventana de gracia configurable (spec 3.4). Vive aquí por decisión #3 del plan.
  grace_minutes int not null default 60 check (grace_minutes >= 0),
  created_at timestamptz not null default now()
);

-- Vínculo cuidador↔paciente. Prepara multi-paciente sin implementarlo (spec 4).
create table public.caregiver_patients (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (profile_id, patient_id)
);
create index caregiver_patients_profile_idx on public.caregiver_patients (profile_id);
create index caregiver_patients_patient_idx on public.caregiver_patients (patient_id);

create table public.medication_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_unit text,
  is_custom boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index medication_catalog_name_idx on public.medication_catalog (lower(name));

create table public.patient_medications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  catalog_id uuid references public.medication_catalog (id),
  name text not null,
  dose numeric,
  unit text,
  instructions text,
  is_active boolean not null default true,
  prn_reason text,
  prn_min_hours_between int check (prn_min_hours_between is null or prn_min_hours_between >= 0),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index patient_medications_patient_idx on public.patient_medications (patient_id);

create table public.medication_schedules (
  id uuid primary key default gen_random_uuid(),
  patient_medication_id uuid not null references public.patient_medications (id) on delete cascade,
  schedule_type schedule_type not null,
  time_of_day time,                 -- solo fixed
  days_of_week int[],               -- solo fixed (1-7, null = diario)
  interval_hours int,               -- solo interval
  anchor_time time,                 -- solo interval (primera dosis del día)
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  -- Coherencia de campos según el tipo (spec 3.2 / modelo 4).
  constraint schedule_fields_coherent check (
    (schedule_type = 'fixed'
      and time_of_day is not null
      and interval_hours is null
      and anchor_time is null)
    or (schedule_type = 'interval'
      and interval_hours is not null and interval_hours > 0
      and anchor_time is not null
      and time_of_day is null
      and days_of_week is null)
    or (schedule_type = 'prn'
      and time_of_day is null
      and interval_hours is null
      and anchor_time is null
      and days_of_week is null)
  )
);
create index medication_schedules_med_idx on public.medication_schedules (patient_medication_id);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  title text not null,
  description text,
  category text,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index tasks_patient_idx on public.tasks (patient_id);

create table public.task_schedules (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  time_of_day time not null,
  days_of_week int[],
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index task_schedules_task_idx on public.task_schedules (task_id);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  title text not null,
  doctor_name text,
  specialty text,
  clinic text,
  scheduled_at timestamptz not null,
  address text,
  phone text,
  notes text,
  accompanied_by uuid references public.profiles (id),
  status appointment_status not null default 'upcoming',
  rescheduled_to uuid references public.appointments (id),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index appointments_patient_idx on public.appointments (patient_id, scheduled_at);

create table public.appointment_notes (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  summary text,
  next_steps text,
  medication_changes text,
  next_appointment_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index appointment_notes_appt_idx on public.appointment_notes (appointment_id);

create table public.daily_notes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  note_date date not null,
  content text,
  author_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index daily_notes_patient_date_idx on public.daily_notes (patient_id, note_date);
create trigger daily_notes_set_updated_at
  before update on public.daily_notes
  for each row execute function public.set_updated_at();

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  actor_id uuid references public.profiles (id),
  action activity_action not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index activity_logs_patient_created_idx on public.activity_logs (patient_id, created_at desc);
