-- 0008 — El admin puede quitar el vínculo cuidador↔paciente.
-- (Los logs siguen sin DELETE; esto es solo el vínculo de acceso.)

create policy caregiver_patients_delete on public.caregiver_patients
  for delete using (
    public.is_admin() and public.has_patient_access(patient_id)
  );

-- Auditoría de correcciones en task_logs (paridad con medication_logs, spec 3.6).
alter table public.task_logs
  add column if not exists previous_status task_log_status,
  add column if not exists corrected_by uuid references public.profiles (id),
  add column if not exists corrected_at timestamptz;
