-- 0010 — Inventario / reabastecimiento de medicamentos.
-- Filosofía del app: el saldo NO se materializa; se deriva.
--   restante = Σ(reabastecimientos) − (dosis administradas × unidades_por_dosis)
-- Los reabastecimientos son un registro inmutable (solo SELECT/INSERT).

-- Configuración de inventario por medicamento (la edita el admin).
alter table public.patient_medications
  add column if not exists track_stock boolean not null default false,
  add column if not exists units_per_dose numeric not null default 1
    check (units_per_dose > 0),
  add column if not exists stock_unit_label text,          -- "tabletas", "mL", "cápsulas"…
  add column if not exists low_stock_threshold numeric;    -- avisar cuando restante <= umbral

-- Registro inmutable de reabastecimientos (y ajustes de conteo).
create table if not exists public.medication_restocks (
  id uuid primary key default gen_random_uuid(),
  patient_medication_id uuid not null
    references public.patient_medications (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  units numeric not null,   -- positivo al añadir; negativo para corregir el conteo
  note text,
  recorded_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);
create index if not exists medication_restocks_med_idx
  on public.medication_restocks (patient_medication_id, created_at);
create index if not exists medication_restocks_patient_idx
  on public.medication_restocks (patient_id, created_at desc);

alter table public.medication_restocks enable row level security;

-- Todos los cuidadores con acceso pueden ver el historial de reabastecimiento.
create policy medication_restocks_select on public.medication_restocks
  for select using (public.has_patient_access(patient_id));

-- Solo el admin reabastece (gestión de medicamentos = tarea de admin).
create policy medication_restocks_insert on public.medication_restocks
  for insert with check (
    recorded_by = auth.uid()
    and public.is_admin()
    and public.has_patient_access(patient_id)
  );
-- Sin UPDATE/DELETE: historial inmutable. Los errores se corrigen con un
-- reabastecimiento negativo.
