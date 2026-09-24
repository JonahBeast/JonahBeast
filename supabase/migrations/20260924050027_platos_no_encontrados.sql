-- Platos que la IA vio en una foto pero que no existen en la base de
-- alimentos. Los escribe solo la función reconocer-comida (con la llave de
-- servicio); el admin los lee y los borra desde su panel.
create table if not exists public.platos_no_encontrados (
  id bigint generated always as identity primary key,
  username text not null,
  nombre text not null check (char_length(nombre) between 1 and 80),
  creado_en timestamptz not null default now()
);

create index if not exists platos_no_encontrados_creado_idx on public.platos_no_encontrados (creado_en desc);

alter table public.platos_no_encontrados enable row level security;

create policy "solo admin lee platos no encontrados"
  on public.platos_no_encontrados for select using (private.is_admin());

create policy "solo admin borra platos no encontrados"
  on public.platos_no_encontrados for delete using (private.is_admin());

revoke insert, update on public.platos_no_encontrados from anon, authenticated;
