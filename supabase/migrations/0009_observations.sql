-- 0009 — Signos / observaciones del paciente (encamado).
-- Inmutable como los logs: solo SELECT e INSERT (sin update/delete).

create type observation_type as enum (
  'weight',
  'blood_pressure',
  'temperature',
  'glucose',
  'heart_rate',
  'oxygen',
  'pain',
  'fluid_intake',
  'fluid_output',
  'bowel',
  'skin',
  'mood',
  'other'
);

create table public.observations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  type observation_type not null,
  value_num numeric,   -- peso, temperatura, glucosa, dolor, líquidos, etc.
  value_text text,     -- presión ("120/80"), piel/úlceras, ánimo, texto libre
  unit text,           -- lb, °F, mg/dL, mmHg, mL, %, lpm…
  note text,
  measured_at timestamptz not null default now(),
  recorded_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);
create index observations_patient_idx
  on public.observations (patient_id, measured_at desc);
create index observations_patient_type_idx
  on public.observations (patient_id, type, measured_at desc);

alter table public.observations enable row level security;

create policy observations_select on public.observations
  for select using (public.has_patient_access(patient_id));
create policy observations_insert on public.observations
  for insert with check (
    recorded_by = auth.uid() and public.has_patient_access(patient_id)
  );
-- Sin UPDATE/DELETE: historial de signos inmutable.
