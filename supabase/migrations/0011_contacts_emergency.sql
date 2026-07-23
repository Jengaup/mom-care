-- 0011 — Contactos e información de emergencia del paciente.

-- Información clave del paciente (la edita el admin). En una emergencia debe
-- estar a uno o dos taps.
alter table public.patients
  add column if not exists blood_type text,
  add column if not exists allergies text,
  add column if not exists conditions text,   -- diagnósticos / condiciones
  add column if not exists insurance text,     -- seguro / plan médico
  add column if not exists emergency_note text; -- indicaciones, DNR, etc.

-- Contactos (médicos, familia, emergencia). A diferencia de los logs, los
-- contactos SÍ se pueden editar y borrar (no son historial).
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  name text not null,
  role text,          -- "Médico", "Familiar", "Emergencia", "Farmacia"…
  phone text,
  note text,
  is_emergency boolean not null default false,
  sort_order int not null default 0,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index if not exists contacts_patient_idx
  on public.contacts (patient_id, is_emergency desc, sort_order, name);

alter table public.contacts enable row level security;

-- Todos los cuidadores con acceso ven los contactos.
create policy contacts_select on public.contacts
  for select using (public.has_patient_access(patient_id));
-- Solo el admin los gestiona.
create policy contacts_insert on public.contacts
  for insert with check (
    public.is_admin() and public.has_patient_access(patient_id)
  );
create policy contacts_update on public.contacts
  for update using (
    public.is_admin() and public.has_patient_access(patient_id)
  ) with check (
    public.is_admin() and public.has_patient_access(patient_id)
  );
create policy contacts_delete on public.contacts
  for delete using (
    public.is_admin() and public.has_patient_access(patient_id)
  );
