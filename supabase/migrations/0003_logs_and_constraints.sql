-- 0003 — Tablas de logs + constraints anti-doble-dosis (spec 3.5).

create table public.medication_logs (
  id uuid primary key default gen_random_uuid(),
  patient_medication_id uuid not null references public.patient_medications (id) on delete cascade,
  schedule_id uuid references public.medication_schedules (id),
  -- NULL para PRN (no tiene hora programada); presente para fixed/interval.
  scheduled_for timestamptz,
  administered_at timestamptz,
  status med_log_status not null,
  postponed_to timestamptz,
  note text,
  recorded_by uuid not null references public.profiles (id),
  -- Corrección de historial (spec 3.6). Nunca DELETE.
  previous_status med_log_status,
  corrected_by uuid references public.profiles (id),
  corrected_at timestamptz,
  created_at timestamptz not null default now()
);

-- Anti-doble-dosis: una sola dosis por (medicamento, hora programada).
-- Parcial porque los logs PRN (scheduled_for NULL) sí pueden repetirse (spec 3.5).
create unique index medication_logs_unique_scheduled
  on public.medication_logs (patient_medication_id, scheduled_for)
  where scheduled_for is not null;

create index medication_logs_med_scheduled_idx
  on public.medication_logs (patient_medication_id, scheduled_for);
create index medication_logs_recorded_idx
  on public.medication_logs (recorded_by, created_at desc);

create table public.task_logs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  schedule_id uuid references public.task_schedules (id),
  scheduled_for timestamptz,
  completed_at timestamptz,
  status task_log_status not null,
  note text,
  recorded_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

-- Índice parcial por consistencia con medication_logs (decisión #4 del plan).
create unique index task_logs_unique_scheduled
  on public.task_logs (task_id, scheduled_for)
  where scheduled_for is not null;

create index task_logs_task_scheduled_idx
  on public.task_logs (task_id, scheduled_for);
