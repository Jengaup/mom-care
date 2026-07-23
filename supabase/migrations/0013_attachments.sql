-- 0013 — Adjuntos / fotos (recetas, heridas, documentos).
-- Los archivos viven en Storage (bucket privado "attachments"); aquí guardamos
-- solo los metadatos. Ruta de cada archivo: <patient_id>/<uuid>-<nombre>.

-- Bucket privado (no público: se sirve con URLs firmadas de corta duración).
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- Metadatos del adjunto.
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  note text,
  uploaded_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);
create index if not exists attachments_patient_idx
  on public.attachments (patient_id, created_at desc);

alter table public.attachments enable row level security;

create policy attachments_select on public.attachments
  for select using (public.has_patient_access(patient_id));
create policy attachments_insert on public.attachments
  for insert with check (
    uploaded_by = auth.uid() and public.has_patient_access(patient_id)
  );
-- Borrado: el admin siempre; quien lo subió, dentro de 30 min.
create policy attachments_delete on public.attachments
  for delete using (
    public.has_patient_access(patient_id)
    and (
      public.is_admin()
      or (uploaded_by = auth.uid() and created_at > now() - interval '30 minutes')
    )
  );

-- ── Políticas de Storage sobre el bucket "attachments" ───────────────────────
-- El primer segmento de la ruta es el patient_id; se autoriza por acceso al
-- paciente. (storage.objects ya tiene RLS habilitada por Supabase.)

drop policy if exists attachments_obj_select on storage.objects;
create policy attachments_obj_select on storage.objects
  for select using (
    bucket_id = 'attachments'
    and public.has_patient_access(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists attachments_obj_insert on storage.objects;
create policy attachments_obj_insert on storage.objects
  for insert with check (
    bucket_id = 'attachments'
    and public.has_patient_access(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists attachments_obj_delete on storage.objects;
create policy attachments_obj_delete on storage.objects
  for delete using (
    bucket_id = 'attachments'
    and public.has_patient_access(((storage.foldername(name))[1])::uuid)
  );
