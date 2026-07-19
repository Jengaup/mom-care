-- Verificación de RLS (spec 5).
-- Simula una sesión de caregiver e intenta 5 operaciones prohibidas.
-- TODAS deben fallar: los INSERT lanzan excepción; los UPDATE/DELETE afectan 0
-- filas (RLS deny). Si alguna prohibición no se cumple, el script aborta con error.
--
-- Uso (contra el stack local o hosted):
--   psql "$DATABASE_URL" -f supabase/rls_verify.sql
-- Requiere que el seed se haya ejecutado (usa el caregiver de prueba).

-- Segundo paciente NO vinculado al caregiver, para probar aislamiento (test 4).
insert into public.patients (id, full_name)
values ('dd000000-0000-0000-0000-0000000000d2', 'Paciente Ajeno')
on conflict (id) do nothing;

-- ── Adoptar identidad de caregiver ───────────────────────────────────────────
select set_config(
  'request.jwt.claims',
  '{"sub":"c0000000-0000-0000-0000-0000000000c1","role":"authenticated"}',
  false
);
set role authenticated;

-- Test 1 — DELETE de un medication_log (nadie puede borrar logs).
do $$
declare n int;
begin
  delete from public.medication_logs where id = '10000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n > 0 then
    raise exception 'FAIL test1: caregiver pudo BORRAR un medication_log';
  end if;
  raise notice 'PASS test1: DELETE de medication_log bloqueado';
end $$;

-- Test 2 — UPDATE de patient_medications (solo admin edita medicamentos).
do $$
declare n int;
begin
  update public.patient_medications set dose = 999
    where id = 'a1000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n > 0 then
    raise exception 'FAIL test2: caregiver pudo EDITAR patient_medications';
  end if;
  raise notice 'PASS test2: UPDATE de patient_medications bloqueado';
end $$;

-- Test 3 — Cambiar el propio rol a admin (solo admin cambia roles).
do $$
declare blocked boolean := false;
begin
  begin
    update public.profiles set role = 'admin'
      where id = 'c0000000-0000-0000-0000-0000000000c1';
  exception when others then
    blocked := true;
  end;
  -- Puede fallar por excepción (trigger) o afectar 0 filas; ambos son bloqueo.
  if not blocked and (
    select role from public.profiles where id = 'c0000000-0000-0000-0000-0000000000c1'
  ) = 'admin' then
    raise exception 'FAIL test3: caregiver se ASCENDIÓ a admin';
  end if;
  raise notice 'PASS test3: cambio de rol propio bloqueado';
end $$;

-- Test 4 — Leer datos de un paciente no vinculado (aislamiento por paciente).
do $$
declare n int;
begin
  select count(*) into n from public.patients
    where id = 'dd000000-0000-0000-0000-0000000000d2';
  if n > 0 then
    raise exception 'FAIL test4: caregiver LEYÓ un paciente ajeno';
  end if;
  raise notice 'PASS test4: lectura de paciente ajeno bloqueada';
end $$;

-- Test 5 — INSERT de una cita (solo admin crea citas).
do $$
declare blocked boolean := false;
begin
  begin
    insert into public.appointments (patient_id, title, scheduled_at, created_by)
    values ('d0000000-0000-0000-0000-0000000000d1', 'Cita no autorizada',
            now(), 'c0000000-0000-0000-0000-0000000000c1');
  exception when others then
    blocked := true;
  end;
  if not blocked then
    raise exception 'FAIL test5: caregiver pudo INSERTAR una cita';
  end if;
  raise notice 'PASS test5: INSERT de cita bloqueado';
end $$;

reset role;
select set_config('request.jwt.claims', '', false);

-- Limpieza del paciente de prueba (como superusuario de nuevo).
delete from public.patients where id = 'dd000000-0000-0000-0000-0000000000d2';

do $$ begin raise notice 'RLS OK: las 5 operaciones prohibidas fueron bloqueadas.'; end $$;
