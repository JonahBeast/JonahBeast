-- Memoria de Jarvis: las notas que Jonah Beast le pide recordar ("recuerda
-- que..."). Jarvis las lee en cada conversación. Solo Jarvis (edge function
-- jarvis-chat, con la llave de servicio) escribe; el admin puede verlas y
-- borrarlas desde el panel. Los alumnos no tienen acceso.
create table if not exists public.jarvis_memoria (
  id bigint generated always as identity primary key,
  creado_en timestamptz not null default now(),
  texto text not null check (char_length(texto) between 1 and 300)
);

alter table public.jarvis_memoria enable row level security;
drop policy if exists solo_admin_lee on public.jarvis_memoria;
create policy solo_admin_lee on public.jarvis_memoria
  for select to authenticated
  using (private.is_admin());
drop policy if exists solo_admin_borra on public.jarvis_memoria;
create policy solo_admin_borra on public.jarvis_memoria
  for delete to authenticated
  using (private.is_admin());
