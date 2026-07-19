-- 0005 — Activity feed por triggers de Postgres (spec 3.8).
-- Ninguna ruta de la app puede olvidarse de registrar actividad: lo hace la BD.
-- El actor sale de la columna de autoría de la fila (decisión #1 del plan), así
-- funciona también con service role (seed) donde auth.uid() es NULL.

create or replace function public.log_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid;
  v_actor_id uuid;
  v_action activity_action;
  v_metadata jsonb := '{}'::jsonb;
  v_med_name text;
  v_med_dose numeric;
  v_med_unit text;
  v_task_title text;
begin
  if tg_table_name = 'medication_logs' then
    select pm.patient_id, pm.name, pm.dose, pm.unit
      into v_patient_id, v_med_name, v_med_dose, v_med_unit
      from public.patient_medications pm
      where pm.id = new.patient_medication_id;

    if tg_op = 'UPDATE'
       and new.corrected_at is not null
       and new.corrected_at is distinct from old.corrected_at then
      v_action := 'med_corrected';
      v_actor_id := new.corrected_by;
    else
      v_actor_id := new.recorded_by;
      v_action := case new.status
        when 'given' then 'med_given'::activity_action
        when 'skipped' then 'med_skipped'::activity_action
        when 'postponed' then 'med_postponed'::activity_action
      end;
    end if;

    v_metadata := jsonb_build_object(
      'med_name', v_med_name,
      'dose', v_med_dose,
      'unit', v_med_unit,
      'status', new.status,
      'scheduled_for', new.scheduled_for,
      'administered_at', new.administered_at,
      'postponed_to', new.postponed_to,
      'previous_status', new.previous_status
    );

    insert into public.activity_logs
      (patient_id, actor_id, action, entity_type, entity_id, metadata)
    values (v_patient_id, v_actor_id, v_action, 'medication_log', new.id, v_metadata);

  elsif tg_table_name = 'task_logs' then
    select t.patient_id, t.title into v_patient_id, v_task_title
      from public.tasks t where t.id = new.task_id;

    v_actor_id := new.recorded_by;
    v_action := case new.status
      when 'done' then 'task_done'::activity_action
      when 'skipped' then 'task_skipped'::activity_action
    end;
    v_metadata := jsonb_build_object(
      'task_title', v_task_title,
      'status', new.status,
      'scheduled_for', new.scheduled_for,
      'completed_at', new.completed_at
    );

    insert into public.activity_logs
      (patient_id, actor_id, action, entity_type, entity_id, metadata)
    values (v_patient_id, v_actor_id, v_action, 'task_log', new.id, v_metadata);

  elsif tg_table_name = 'appointments' then
    v_patient_id := new.patient_id;
    -- appointments no tiene columna de "quién actualizó"; usamos el request y
    -- caemos a created_by cuando no hay sesión (seed).
    v_actor_id := coalesce(auth.uid(), new.created_by);

    if tg_op = 'INSERT' then
      v_action := 'appt_created';
    else
      if new.status is not distinct from old.status then
        return new; -- sin cambio de estado, no ensuciar el feed
      end if;
      v_action := case new.status
        when 'completed' then 'appt_completed'::activity_action
        when 'cancelled' then 'appt_cancelled'::activity_action
        when 'rescheduled' then 'appt_rescheduled'::activity_action
        else 'appt_created'::activity_action
      end;
    end if;

    v_metadata := jsonb_build_object(
      'title', new.title,
      'doctor_name', new.doctor_name,
      'scheduled_at', new.scheduled_at,
      'status', new.status
    );

    insert into public.activity_logs
      (patient_id, actor_id, action, entity_type, entity_id, metadata)
    values (v_patient_id, v_actor_id, v_action, 'appointment', new.id, v_metadata);

  elsif tg_table_name = 'daily_notes' then
    v_patient_id := new.patient_id;
    v_actor_id := new.author_id;
    v_action := case
      when tg_op = 'INSERT' then 'note_added'::activity_action
      else 'note_updated'::activity_action
    end;
    v_metadata := jsonb_build_object('note_date', new.note_date);

    insert into public.activity_logs
      (patient_id, actor_id, action, entity_type, entity_id, metadata)
    values (v_patient_id, v_actor_id, v_action, 'daily_note', new.id, v_metadata);
  end if;

  return new;
end;
$$;

create trigger medication_logs_activity
  after insert or update on public.medication_logs
  for each row execute function public.log_activity();

create trigger task_logs_activity
  after insert or update on public.task_logs
  for each row execute function public.log_activity();

create trigger appointments_activity
  after insert or update on public.appointments
  for each row execute function public.log_activity();

create trigger daily_notes_activity
  after insert or update on public.daily_notes
  for each row execute function public.log_activity();
