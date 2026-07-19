-- 0001 — Enums y funciones utilitarias sin dependencia de tablas.

-- Roles de usuario.
create type user_role as enum ('admin', 'caregiver');

-- Tipo de frecuencia de un medicamento (spec 3.2).
create type schedule_type as enum ('fixed', 'interval', 'prn');

-- Estados de un log de medicamento (spec 3.4).
create type med_log_status as enum ('given', 'skipped', 'postponed');

-- Estados de un log de tarea.
create type task_log_status as enum ('done', 'skipped');

-- Estados de una cita.
create type appointment_status as enum (
  'upcoming',
  'completed',
  'cancelled',
  'rescheduled'
);

-- Acciones del activity feed (spec 3.8). El texto legible se compone en el
-- front desde action + metadata; aquí solo guardamos el verbo estructurado.
create type activity_action as enum (
  'med_given',
  'med_skipped',
  'med_postponed',
  'med_corrected',
  'task_done',
  'task_skipped',
  'appt_created',
  'appt_completed',
  'appt_cancelled',
  'appt_rescheduled',
  'note_added',
  'note_updated'
);

-- Mantiene updated_at al día en UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
