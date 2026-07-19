-- 0006 — Visibilidad de perfiles entre cuidadores del mismo paciente.
-- El feed y el historial muestran "Juan registró…"; para que un caregiver vea el
-- nombre de otro caregiver del mismo paciente, ampliamos el SELECT de profiles.
-- Sigue sin ser recursivo (helper security definer que bypassa RLS).

create or replace function public.shares_patient(target uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.caregiver_patients me
    join public.caregiver_patients them on them.patient_id = me.patient_id
    where me.profile_id = auth.uid() and them.profile_id = target
  );
$$;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (
    id = auth.uid() or public.is_admin() or public.shares_patient(id)
  );
