-- Seed idempotente (re-ejecutable sin duplicar). UUIDs fijos + ON CONFLICT.
-- Credenciales de prueba (documentadas en README):
--   admin@josealbertopr.com     / momcare123   (rol admin)
--   caregiver@josealbertopr.com / momcare123   (rol caregiver)
--
-- Las horas de los logs se calculan relativas a "ayer"/"anteayer" en AST para
-- que /historial nunca salga vacío.
-- Nota de sintaxis: AT TIME ZONE liga más fuerte que "+", por eso el paréntesis
-- envuelve (día + interval) antes del AT TIME ZONE.

-- ── Usuarios de auth ─────────────────────────────────────────────────────────
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000000',
   'a0000000-0000-0000-0000-0000000000a1', 'authenticated', 'authenticated',
   'admin@josealbertopr.com', crypt('momcare123', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Ana Admin"}', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000',
   'c0000000-0000-0000-0000-0000000000c1', 'authenticated', 'authenticated',
   'caregiver@josealbertopr.com', crypt('momcare123', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Carlos Cuidador"}', '', '', '', '')
on conflict (id) do nothing;

insert into auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values
  ('a0000000-0000-0000-0000-0000000000a1', 'a0000000-0000-0000-0000-0000000000a1',
   '{"sub":"a0000000-0000-0000-0000-0000000000a1","email":"admin@josealbertopr.com"}',
   'email', now(), now(), now()),
  ('c0000000-0000-0000-0000-0000000000c1', 'c0000000-0000-0000-0000-0000000000c1',
   '{"sub":"c0000000-0000-0000-0000-0000000000c1","email":"caregiver@josealbertopr.com"}',
   'email', now(), now(), now())
on conflict (provider_id, provider) do nothing;

-- El trigger handle_new_user ya creó los profiles como 'caregiver'.
-- Ascendemos al admin (desactivando la guarda de rol solo durante el seed).
alter table public.profiles disable trigger profiles_prevent_role_change;
update public.profiles set full_name = 'Ana Admin', role = 'admin'
  where id = 'a0000000-0000-0000-0000-0000000000a1';
update public.profiles set full_name = 'Carlos Cuidador', role = 'caregiver'
  where id = 'c0000000-0000-0000-0000-0000000000c1';
alter table public.profiles enable trigger profiles_prevent_role_change;

-- ── Paciente + vínculos ──────────────────────────────────────────────────────
insert into public.patients (id, full_name, birth_date, notes, grace_minutes)
values ('d0000000-0000-0000-0000-0000000000d1', 'María del Carmen Rivera',
        '1945-03-12', 'Encamada. Alergia a la penicilina.', 60)
on conflict (id) do nothing;

insert into public.caregiver_patients (id, profile_id, patient_id) values
  ('e0000000-0000-0000-0000-0000000000e1', 'a0000000-0000-0000-0000-0000000000a1',
   'd0000000-0000-0000-0000-0000000000d1'),
  ('e0000000-0000-0000-0000-0000000000e2', 'c0000000-0000-0000-0000-0000000000c1',
   'd0000000-0000-0000-0000-0000000000d1')
on conflict (profile_id, patient_id) do nothing;

-- ── Catálogo de medicamentos (comunes) ───────────────────────────────────────
insert into public.medication_catalog (id, name, default_unit, is_custom, created_by) values
  ('c1000000-0000-0000-0000-000000000001', 'Atorvastatina', 'mg', false, null),
  ('c1000000-0000-0000-0000-000000000002', 'Acetaminofén', 'mg', false, null),
  ('c1000000-0000-0000-0000-000000000003', 'Amoxicilina', 'mg', false, null),
  ('c1000000-0000-0000-0000-000000000004', 'Ibuprofeno', 'mg', false, null),
  ('c1000000-0000-0000-0000-000000000005', 'Metformina', 'mg', false, null),
  ('c1000000-0000-0000-0000-000000000006', 'Losartán', 'mg', false, null),
  ('c1000000-0000-0000-0000-000000000007', 'Omeprazol', 'mg', false, null),
  ('c1000000-0000-0000-0000-000000000008', 'Aspirina', 'mg', false, null),
  ('c1000000-0000-0000-0000-000000000009', 'Furosemida', 'mg', false, null),
  ('c1000000-0000-0000-0000-00000000000a', 'Levotiroxina', 'mcg', false, null)
on conflict (id) do nothing;

-- ── Medicamentos del paciente (cubren los 3 tipos) ───────────────────────────
insert into public.patient_medications
  (id, patient_id, catalog_id, name, dose, unit, instructions, is_active,
   prn_reason, prn_min_hours_between, created_by) values
  ('a1000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-0000000000d1',
   'c1000000-0000-0000-0000-000000000001', 'Atorvastatina', 20, 'mg',
   'Tomar en la noche con comida.', true, null, null,
   'a0000000-0000-0000-0000-0000000000a1'),
  ('a1000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-0000000000d1',
   'c1000000-0000-0000-0000-000000000002', 'Acetaminofén', 500, 'mg',
   'Con las comidas.', true, null, null,
   'a0000000-0000-0000-0000-0000000000a1'),
  ('a1000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-0000000000d1',
   'c1000000-0000-0000-0000-000000000003', 'Amoxicilina', 500, 'mg',
   'Completar el ciclo de 7 días.', true, null, null,
   'a0000000-0000-0000-0000-0000000000a1'),
  ('a1000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-0000000000d1',
   'c1000000-0000-0000-0000-000000000004', 'Ibuprofeno', 400, 'mg',
   'Según necesidad para el dolor.', true, 'dolor', 6,
   'a0000000-0000-0000-0000-0000000000a1')
on conflict (id) do nothing;

insert into public.medication_schedules
  (id, patient_medication_id, schedule_type, time_of_day, days_of_week,
   interval_hours, anchor_time, is_active) values
  ('50000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001',
   'fixed', '20:00', null, null, null, true),
  ('50000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002',
   'fixed', '08:00', null, null, null, true),
  ('50000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000002',
   'fixed', '14:00', null, null, null, true),
  ('50000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000002',
   'fixed', '20:00', null, null, null, true),
  ('50000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000003',
   'interval', null, null, 8, '06:00', true),
  ('50000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000004',
   'prn', null, null, null, null, true)
on conflict (id) do nothing;

-- ── Tareas recurrentes ───────────────────────────────────────────────────────
insert into public.tasks (id, patient_id, title, description, category, is_active, created_by) values
  ('7a000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-0000000000d1',
   'Cambio de posición', 'Girar para evitar úlceras por presión.', 'movilidad', true,
   'a0000000-0000-0000-0000-0000000000a1'),
  ('7a000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-0000000000d1',
   'Higiene', 'Aseo y cambio de ropa.', 'higiene', true,
   'a0000000-0000-0000-0000-0000000000a1'),
  ('7a000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-0000000000d1',
   'Alimentación', 'Comida asistida.', 'nutrición', true,
   'a0000000-0000-0000-0000-0000000000a1'),
  ('7a000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-0000000000d1',
   'Hidratación', 'Ofrecer líquidos.', 'nutrición', true,
   'a0000000-0000-0000-0000-0000000000a1')
on conflict (id) do nothing;

insert into public.task_schedules (id, task_id, time_of_day, days_of_week, is_active) values
  ('75000000-0000-0000-0000-000000000001', '7a000000-0000-0000-0000-000000000001', '08:00', null, true),
  ('75000000-0000-0000-0000-000000000002', '7a000000-0000-0000-0000-000000000001', '16:00', null, true),
  ('75000000-0000-0000-0000-000000000003', '7a000000-0000-0000-0000-000000000002', '09:00', null, true),
  ('75000000-0000-0000-0000-000000000004', '7a000000-0000-0000-0000-000000000003', '12:00', null, true),
  ('75000000-0000-0000-0000-000000000005', '7a000000-0000-0000-0000-000000000004', '10:00', null, true)
on conflict (id) do nothing;

-- ── Citas: una futura y una pasada con notas ─────────────────────────────────
insert into public.appointments
  (id, patient_id, title, doctor_name, specialty, clinic, scheduled_at, address,
   phone, notes, accompanied_by, status, created_by) values
  ('a9000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-0000000000d1',
   'Control de cardiología', 'Dr. Pérez', 'Cardiología', 'Hospital Auxilio Mutuo',
   (((current_date + 7)::timestamp + interval '10 hours') at time zone 'America/Puerto_Rico'),
   'Av. Ponce de León 735, San Juan', '787-555-0100',
   'Llevar lista de medicamentos.', 'a0000000-0000-0000-0000-0000000000a1',
   'upcoming', 'a0000000-0000-0000-0000-0000000000a1'),
  ('a9000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-0000000000d1',
   'Evaluación de nutrición', 'Dra. Gómez', 'Nutrición', 'Clínica San Pablo',
   (((current_date - 5)::timestamp + interval '9 hours') at time zone 'America/Puerto_Rico'),
   'Calle Marginal 12, Bayamón', '787-555-0180',
   null, 'c0000000-0000-0000-0000-0000000000c1',
   'completed', 'a0000000-0000-0000-0000-0000000000a1')
on conflict (id) do nothing;

insert into public.appointment_notes
  (id, appointment_id, summary, next_steps, medication_changes, next_appointment_at, created_by)
values
  ('a8000000-0000-0000-0000-000000000001', 'a9000000-0000-0000-0000-000000000002',
   'Peso estable. Buen estado general.', 'Aumentar líquidos y proteína.',
   'Sin cambios en medicamentos.',
   (((current_date + 30)::timestamp + interval '9 hours') at time zone 'America/Puerto_Rico'),
   'c0000000-0000-0000-0000-0000000000c1')
on conflict (id) do nothing;

-- ── Notas diarias ────────────────────────────────────────────────────────────
insert into public.daily_notes (id, patient_id, note_date, content, author_id) values
  ('40000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-0000000000d1',
   current_date - 1, 'Durmió bien. Buen apetito en el almuerzo.',
   'c0000000-0000-0000-0000-0000000000c1'),
  ('40000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-0000000000d1',
   current_date - 2, 'Molestia leve en la espalda por la tarde.',
   'a0000000-0000-0000-0000-0000000000a1')
on conflict (id) do nothing;

-- ── Logs de ayer y anteayer (para que /historial no salga vacío) ─────────────
insert into public.medication_logs
  (id, patient_medication_id, schedule_id, scheduled_for, administered_at, status, recorded_by)
values
  ('10000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001',
   '50000000-0000-0000-0000-000000000001',
   (((current_date - 1)::timestamp + interval '20 hours') at time zone 'America/Puerto_Rico'),
   (((current_date - 1)::timestamp + interval '20 hours 3 minutes') at time zone 'America/Puerto_Rico'),
   'given', 'c0000000-0000-0000-0000-0000000000c1'),
  ('10000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001',
   '50000000-0000-0000-0000-000000000001',
   (((current_date - 2)::timestamp + interval '20 hours') at time zone 'America/Puerto_Rico'),
   (((current_date - 2)::timestamp + interval '20 hours 5 minutes') at time zone 'America/Puerto_Rico'),
   'given', 'a0000000-0000-0000-0000-0000000000a1'),
  ('10000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000002',
   '50000000-0000-0000-0000-000000000002',
   (((current_date - 1)::timestamp + interval '8 hours') at time zone 'America/Puerto_Rico'),
   (((current_date - 1)::timestamp + interval '8 hours 10 minutes') at time zone 'America/Puerto_Rico'),
   'given', 'c0000000-0000-0000-0000-0000000000c1'),
  ('10000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000002',
   '50000000-0000-0000-0000-000000000003',
   (((current_date - 1)::timestamp + interval '14 hours') at time zone 'America/Puerto_Rico'),
   (((current_date - 1)::timestamp + interval '14 hours 6 minutes') at time zone 'America/Puerto_Rico'),
   'given', 'c0000000-0000-0000-0000-0000000000c1'),
  ('10000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002',
   '50000000-0000-0000-0000-000000000004',
   (((current_date - 1)::timestamp + interval '20 hours') at time zone 'America/Puerto_Rico'),
   null, 'skipped', 'a0000000-0000-0000-0000-0000000000a1'),
  ('10000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000003',
   '50000000-0000-0000-0000-000000000005',
   (((current_date - 1)::timestamp + interval '6 hours') at time zone 'America/Puerto_Rico'),
   (((current_date - 1)::timestamp + interval '6 hours 4 minutes') at time zone 'America/Puerto_Rico'),
   'given', 'c0000000-0000-0000-0000-0000000000c1'),
  ('10000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000003',
   '50000000-0000-0000-0000-000000000005',
   (((current_date - 1)::timestamp + interval '14 hours') at time zone 'America/Puerto_Rico'),
   (((current_date - 1)::timestamp + interval '14 hours 2 minutes') at time zone 'America/Puerto_Rico'),
   'given', 'c0000000-0000-0000-0000-0000000000c1'),
  ('10000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000004',
   '50000000-0000-0000-0000-000000000006',
   null,
   (((current_date - 1)::timestamp + interval '15 hours') at time zone 'America/Puerto_Rico'),
   'given', 'c0000000-0000-0000-0000-0000000000c1')
on conflict (id) do nothing;

insert into public.task_logs
  (id, task_id, schedule_id, scheduled_for, completed_at, status, recorded_by)
values
  ('20000000-0000-0000-0000-000000000001', '7a000000-0000-0000-0000-000000000001',
   '75000000-0000-0000-0000-000000000001',
   (((current_date - 1)::timestamp + interval '8 hours') at time zone 'America/Puerto_Rico'),
   (((current_date - 1)::timestamp + interval '8 hours 12 minutes') at time zone 'America/Puerto_Rico'),
   'done', 'c0000000-0000-0000-0000-0000000000c1'),
  ('20000000-0000-0000-0000-000000000002', '7a000000-0000-0000-0000-000000000003',
   '75000000-0000-0000-0000-000000000003',
   (((current_date - 1)::timestamp + interval '9 hours') at time zone 'America/Puerto_Rico'),
   (((current_date - 1)::timestamp + interval '9 hours 20 minutes') at time zone 'America/Puerto_Rico'),
   'done', 'c0000000-0000-0000-0000-0000000000c1')
on conflict (id) do nothing;

-- Los logs sembrados son históricos (1–2 días atrás): su created_at debe
-- reflejarlo, no el momento del seed. Así la ventana de "deshacer" (10 min,
-- migración 0012) no los alcanza y siguen siendo inmutables.
update public.medication_logs
  set created_at = coalesce(administered_at, scheduled_for, created_at)
  where id::text like '10000000-%';
update public.task_logs
  set created_at = coalesce(completed_at, scheduled_for, created_at)
  where id::text like '20000000-%';

-- ── Catálogo ampliado (idempotente; requiere unaccent de la migración 0007) ──
-- 2) Catálogo ampliado (genéricos comunes + marcas). No duplica (compara sin
--    acentos ni mayúsculas). Puedes seguir añadiendo los tuyos desde la app.
insert into public.medication_catalog (name, default_unit, is_custom)
select c.name, c.unit, false
from (values
  -- Dolor / antiinflamatorios
  ('Acetaminofén','mg'), ('Ibuprofeno','mg'), ('Naproxeno','mg'), ('Aspirina','mg'),
  ('Diclofenaco','mg'), ('Ketorolaco','mg'), ('Celecoxib','mg'), ('Meloxicam','mg'),
  ('Tramadol','mg'), ('Codeína','mg'), ('Morfina','mg'), ('Oxicodona','mg'),
  ('Gabapentina','mg'), ('Pregabalina','mg'),
  -- Antibióticos
  ('Amoxicilina','mg'), ('Amoxicilina/Clavulánico','mg'), ('Azitromicina','mg'),
  ('Ciprofloxacino','mg'), ('Levofloxacino','mg'), ('Cefalexina','mg'),
  ('Clindamicina','mg'), ('Doxiciclina','mg'), ('Metronidazol','mg'),
  ('Nitrofurantoína','mg'), ('Trimetoprim/Sulfametoxazol','mg'), ('Penicilina','mg'),
  -- Diabetes
  ('Metformina','mg'), ('Glipizida','mg'), ('Glimepirida','mg'), ('Sitagliptina','mg'),
  ('Empagliflozina','mg'), ('Dapagliflozina','mg'), ('Semaglutida','mg'),
  ('Insulina glargina','unidades'), ('Insulina lispro','unidades'), ('Insulina NPH','unidades'),
  -- Presión / corazón
  ('Losartán','mg'), ('Valsartán','mg'), ('Lisinopril','mg'), ('Enalapril','mg'),
  ('Amlodipino','mg'), ('Nifedipino','mg'), ('Hidroclorotiazida','mg'), ('Clortalidona','mg'),
  ('Furosemida','mg'), ('Espironolactona','mg'), ('Metoprolol','mg'), ('Carvedilol','mg'),
  ('Atenolol','mg'), ('Bisoprolol','mg'), ('Propranolol','mg'), ('Diltiazem','mg'),
  ('Verapamilo','mg'), ('Hidralazina','mg'), ('Clonidina','mg'), ('Digoxina','mg'),
  -- Colesterol
  ('Atorvastatina','mg'), ('Rosuvastatina','mg'), ('Simvastatina','mg'), ('Pravastatina','mg'),
  ('Ezetimiba','mg'), ('Fenofibrato','mg'), ('Gemfibrozilo','mg'),
  -- Anticoagulantes / antiplaquetarios
  ('Warfarina','mg'), ('Apixabán','mg'), ('Rivaroxabán','mg'), ('Clopidogrel','mg'),
  ('Enoxaparina','mg'),
  -- Estómago
  ('Omeprazol','mg'), ('Esomeprazol','mg'), ('Pantoprazol','mg'), ('Lansoprazol','mg'),
  ('Famotidina','mg'), ('Ranitidina','mg'), ('Sucralfato','mg'),
  ('Ondansetrón','mg'), ('Metoclopramida','mg'), ('Loperamida','mg'),
  ('Bisacodilo','mg'), ('Docusato','mg'), ('Polietilenglicol','g'), ('Senósidos','mg'),
  ('Lactulosa','mL'),
  -- Tiroides / esteroides
  ('Levotiroxina','mcg'), ('Prednisona','mg'), ('Prednisolona','mg'),
  ('Dexametasona','mg'), ('Metilprednisolona','mg'), ('Hidrocortisona','mg'),
  -- Respiratorio / alergia
  ('Albuterol','mcg'), ('Salbutamol','mcg'), ('Ipratropio','mcg'), ('Tiotropio','mcg'),
  ('Budesonida','mcg'), ('Fluticasona','mcg'), ('Montelukast','mg'),
  ('Loratadina','mg'), ('Cetirizina','mg'), ('Fexofenadina','mg'),
  ('Difenhidramina','mg'), ('Clorfeniramina','mg'),
  -- Salud mental / sueño
  ('Sertralina','mg'), ('Fluoxetina','mg'), ('Escitalopram','mg'), ('Citalopram','mg'),
  ('Paroxetina','mg'), ('Venlafaxina','mg'), ('Duloxetina','mg'), ('Bupropión','mg'),
  ('Mirtazapina','mg'), ('Trazodona','mg'), ('Amitriptilina','mg'),
  ('Alprazolam','mg'), ('Lorazepam','mg'), ('Clonazepam','mg'), ('Diazepam','mg'),
  ('Zolpidem','mg'), ('Melatonina','mg'),
  ('Quetiapina','mg'), ('Risperidona','mg'), ('Olanzapina','mg'), ('Haloperidol','mg'),
  ('Aripiprazol','mg'),
  -- Neurología / próstata / gota
  ('Donepezilo','mg'), ('Memantina','mg'), ('Rivastigmina','mg'),
  ('Levodopa/Carbidopa','mg'), ('Tamsulosina','mg'), ('Finasterida','mg'),
  ('Oxibutinina','mg'), ('Alopurinol','mg'), ('Colchicina','mg'),
  -- Vitaminas / suplementos
  ('Vitamina D','UI'), ('Vitamina B12','mcg'), ('Ácido fólico','mg'),
  ('Vitamina C','mg'), ('Sulfato ferroso','mg'), ('Carbonato de calcio','mg'),
  ('Cloruro de potasio','mEq'), ('Óxido de magnesio','mg'), ('Multivitamínico',null),
  ('Complejo B',null),
  -- Marcas comunes (PR/EE.UU.)
  ('Tylenol','mg'), ('Advil','mg'), ('Motrin','mg'), ('Aleve','mg'), ('Bayer','mg'),
  ('Excedrin','mg'), ('Eliquis','mg'), ('Xarelto','mg'), ('Plavix','mg'),
  ('Coumadin','mg'), ('Lipitor','mg'), ('Crestor','mg'), ('Zocor','mg'),
  ('Nexium','mg'), ('Prilosec','mg'), ('Protonix','mg'), ('Pepcid','mg'),
  ('Synthroid','mcg'), ('Glucophage','mg'), ('Januvia','mg'), ('Jardiance','mg'),
  ('Farxiga','mg'), ('Ozempic','mg'), ('Trulicity','mg'), ('Lantus','unidades'),
  ('Humalog','unidades'), ('Lasix','mg'), ('Norvasc','mg'), ('Cozaar','mg'),
  ('Diovan','mg'), ('Toprol XL','mg'), ('Coreg','mg'), ('Cardizem','mg'),
  ('Lyrica','mg'), ('Neurontin','mg'), ('Percocet','mg'), ('Oxycontin','mg'),
  ('Xanax','mg'), ('Ativan','mg'), ('Klonopin','mg'), ('Valium','mg'), ('Ambien','mg'),
  ('Zoloft','mg'), ('Prozac','mg'), ('Lexapro','mg'), ('Cymbalta','mg'),
  ('Effexor','mg'), ('Wellbutrin','mg'), ('Seroquel','mg'), ('Abilify','mg'),
  ('Aricept','mg'), ('Namenda','mg'), ('Ventolin','mcg'), ('ProAir','mcg'),
  ('Spiriva','mcg'), ('Symbicort','mcg'), ('Advair','mcg'), ('Singulair','mg'),
  ('Flonase','mcg'), ('Zyrtec','mg'), ('Claritin','mg'), ('Allegra','mg'),
  ('Benadryl','mg'), ('Flomax','mg'), ('Viagra','mg'), ('Cialis','mg')
) as c(name, unit)
where not exists (
  select 1 from public.medication_catalog m
  where unaccent(lower(m.name)) = unaccent(lower(c.name))
);
