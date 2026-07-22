-- 0007 — Búsqueda de catálogo insensible a acentos.
-- Permite que "acetaminofen" encuentre "Acetaminofén", etc.

create extension if not exists unaccent;

create or replace function public.search_medication_catalog(q text)
returns setof public.medication_catalog
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select *
  from public.medication_catalog
  where q = '' or unaccent(name) ilike unaccent('%' || q || '%')
  order by name
  limit 30;
$$;

grant execute on function public.search_medication_catalog(text)
  to anon, authenticated, service_role;
