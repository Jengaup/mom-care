-- 0004 — Helpers de seguridad, auto-perfil, RLS y políticas (spec 5).

-- ── Helpers security definer con search_path fijado ──────────────────────────
-- Bypasean RLS al leer profiles/caregiver_patients, evitando recursión.

create or replace function public.auth_role()
returns user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.auth_role() = 'admin', false);
$$;

create or replace function public.has_patient_access(pid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.caregiver_patients
    where profile_id = auth.uid() and patient_id = pid
  );
$$;

-- ── Auto-creación de perfil al registrarse (spec 3.9) ────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'caregiver'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Solo un admin puede cambiar el rol de un perfil (spec 5).
create or replace function public.prevent_unauthorized_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Solo un admin puede cambiar el rol';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_role_change
  before update on public.profiles
  for each row execute function public.prevent_unauthorized_role_change();

-- ── Habilitar RLS en TODAS las tablas ────────────────────────────────────────
alter table public.profiles            enable row level security;
alter table public.patients            enable row level security;
alter table public.caregiver_patients  enable row level security;
alter table public.medication_catalog  enable row level security;
alter table public.patient_medications enable row level security;
alter table public.medication_schedules enable row level security;
alter table public.medication_logs     enable row level security;
alter table public.tasks               enable row level security;
alter table public.task_schedules      enable row level security;
alter table public.task_logs           enable row level security;
alter table public.appointments        enable row level security;
alter table public.appointment_notes   enable row level security;
alter table public.daily_notes         enable row level security;
alter table public.activity_logs       enable row level security;

-- ── profiles ─────────────────────────────────────────────────────────────────
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ── patients ─────────────────────────────────────────────────────────────────
create policy patients_select on public.patients
  for select using (public.has_patient_access(id));
create policy patients_update on public.patients
  for update using (public.is_admin() and public.has_patient_access(id))
  with check (public.is_admin() and public.has_patient_access(id));
create policy patients_insert on public.patients
  for insert with check (public.is_admin());

-- ── caregiver_patients ───────────────────────────────────────────────────────
create policy caregiver_patients_select on public.caregiver_patients
  for select using (public.has_patient_access(patient_id));
create policy caregiver_patients_insert on public.caregiver_patients
  for insert with check (public.is_admin());
create policy caregiver_patients_update on public.caregiver_patients
  for update using (public.is_admin()) with check (public.is_admin());

-- ── medication_catalog (instancia-local, legible por cualquier autenticado) ──
create policy medication_catalog_select on public.medication_catalog
  for select using (auth.uid() is not null);
create policy medication_catalog_insert on public.medication_catalog
  for insert with check (public.is_admin());
create policy medication_catalog_update on public.medication_catalog
  for update using (public.is_admin()) with check (public.is_admin());

-- ── patient_medications ──────────────────────────────────────────────────────
create policy patient_medications_select on public.patient_medications
  for select using (public.has_patient_access(patient_id));
create policy patient_medications_insert on public.patient_medications
  for insert with check (public.is_admin() and public.has_patient_access(patient_id));
create policy patient_medications_update on public.patient_medications
  for update using (public.is_admin() and public.has_patient_access(patient_id))
  with check (public.is_admin() and public.has_patient_access(patient_id));

-- ── medication_schedules (acceso vía el medicamento → paciente) ──────────────
create policy medication_schedules_select on public.medication_schedules
  for select using (
    exists (
      select 1 from public.patient_medications pm
      where pm.id = patient_medication_id and public.has_patient_access(pm.patient_id)
    )
  );
create policy medication_schedules_insert on public.medication_schedules
  for insert with check (
    public.is_admin() and exists (
      select 1 from public.patient_medications pm
      where pm.id = patient_medication_id and public.has_patient_access(pm.patient_id)
    )
  );
create policy medication_schedules_update on public.medication_schedules
  for update using (
    public.is_admin() and exists (
      select 1 from public.patient_medications pm
      where pm.id = patient_medication_id and public.has_patient_access(pm.patient_id)
    )
  ) with check (
    public.is_admin() and exists (
      select 1 from public.patient_medications pm
      where pm.id = patient_medication_id and public.has_patient_access(pm.patient_id)
    )
  );

-- ── medication_logs (caregiver INSERT; admin UPDATE = corrección; sin DELETE) ─
create policy medication_logs_select on public.medication_logs
  for select using (
    exists (
      select 1 from public.patient_medications pm
      where pm.id = patient_medication_id and public.has_patient_access(pm.patient_id)
    )
  );
create policy medication_logs_insert on public.medication_logs
  for insert with check (
    recorded_by = auth.uid() and exists (
      select 1 from public.patient_medications pm
      where pm.id = patient_medication_id and public.has_patient_access(pm.patient_id)
    )
  );
create policy medication_logs_update on public.medication_logs
  for update using (
    public.is_admin() and exists (
      select 1 from public.patient_medications pm
      where pm.id = patient_medication_id and public.has_patient_access(pm.patient_id)
    )
  ) with check (
    public.is_admin() and exists (
      select 1 from public.patient_medications pm
      where pm.id = patient_medication_id and public.has_patient_access(pm.patient_id)
    )
  );

-- ── tasks ────────────────────────────────────────────────────────────────────
create policy tasks_select on public.tasks
  for select using (public.has_patient_access(patient_id));
create policy tasks_insert on public.tasks
  for insert with check (public.is_admin() and public.has_patient_access(patient_id));
create policy tasks_update on public.tasks
  for update using (public.is_admin() and public.has_patient_access(patient_id))
  with check (public.is_admin() and public.has_patient_access(patient_id));

-- ── task_schedules (acceso vía la tarea → paciente) ──────────────────────────
create policy task_schedules_select on public.task_schedules
  for select using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id and public.has_patient_access(t.patient_id)
    )
  );
create policy task_schedules_insert on public.task_schedules
  for insert with check (
    public.is_admin() and exists (
      select 1 from public.tasks t
      where t.id = task_id and public.has_patient_access(t.patient_id)
    )
  );
create policy task_schedules_update on public.task_schedules
  for update using (
    public.is_admin() and exists (
      select 1 from public.tasks t
      where t.id = task_id and public.has_patient_access(t.patient_id)
    )
  ) with check (
    public.is_admin() and exists (
      select 1 from public.tasks t
      where t.id = task_id and public.has_patient_access(t.patient_id)
    )
  );

-- ── task_logs (caregiver INSERT; admin UPDATE; sin DELETE) ───────────────────
create policy task_logs_select on public.task_logs
  for select using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id and public.has_patient_access(t.patient_id)
    )
  );
create policy task_logs_insert on public.task_logs
  for insert with check (
    recorded_by = auth.uid() and exists (
      select 1 from public.tasks t
      where t.id = task_id and public.has_patient_access(t.patient_id)
    )
  );
create policy task_logs_update on public.task_logs
  for update using (
    public.is_admin() and exists (
      select 1 from public.tasks t
      where t.id = task_id and public.has_patient_access(t.patient_id)
    )
  ) with check (
    public.is_admin() and exists (
      select 1 from public.tasks t
      where t.id = task_id and public.has_patient_access(t.patient_id)
    )
  );

-- ── appointments ─────────────────────────────────────────────────────────────
create policy appointments_select on public.appointments
  for select using (public.has_patient_access(patient_id));
create policy appointments_insert on public.appointments
  for insert with check (public.is_admin() and public.has_patient_access(patient_id));
create policy appointments_update on public.appointments
  for update using (public.is_admin() and public.has_patient_access(patient_id))
  with check (public.is_admin() and public.has_patient_access(patient_id));

-- ── appointment_notes (additivo; cualquier cuidador con acceso puede añadir) ─
create policy appointment_notes_select on public.appointment_notes
  for select using (
    exists (
      select 1 from public.appointments a
      where a.id = appointment_id and public.has_patient_access(a.patient_id)
    )
  );
create policy appointment_notes_insert on public.appointment_notes
  for insert with check (
    created_by = auth.uid() and exists (
      select 1 from public.appointments a
      where a.id = appointment_id and public.has_patient_access(a.patient_id)
    )
  );

-- ── daily_notes (caregiver INSERT; UPDATE propio dentro de 24h) ──────────────
create policy daily_notes_select on public.daily_notes
  for select using (public.has_patient_access(patient_id));
create policy daily_notes_insert on public.daily_notes
  for insert with check (
    author_id = auth.uid() and public.has_patient_access(patient_id)
  );
create policy daily_notes_update on public.daily_notes
  for update using (
    public.has_patient_access(patient_id) and (
      public.is_admin()
      or (author_id = auth.uid() and created_at > now() - interval '24 hours')
    )
  ) with check (
    public.has_patient_access(patient_id) and (
      public.is_admin()
      or (author_id = auth.uid() and created_at > now() - interval '24 hours')
    )
  );

-- ── activity_logs (solo lectura para clientes; escritura vía triggers) ───────
create policy activity_logs_select on public.activity_logs
  for select using (public.has_patient_access(patient_id));
-- Sin política de INSERT: solo los triggers security definer escriben aquí.
