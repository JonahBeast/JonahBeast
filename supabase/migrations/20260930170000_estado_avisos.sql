-- Estado de los avisos (notificaciones) de cada alumno, para que Jonah
-- sepa quién no los tiene y por qué, y pueda ayudarlo según su celular.
-- La app lo anota cada vez que el alumno la abre. Una fila por alumno.
-- Cada alumno solo escribe su propia fila; solo el admin ve todas.
create table if not exists public.estado_avisos (
  username text primary key,
  dispositivo text not null check (dispositivo in ('iphone', 'android', 'computadora', 'otro')),
  estado text not null check (estado in ('activo', 'bloqueado', 'ios_sin_instalar', 'sin_activar', 'no_soportado')),
  instalada boolean not null default false,
  actualizado_en timestamptz not null default now()
);
alter table public.estado_avisos enable row level security;
drop policy if exists "estado avisos propio insert" on public.estado_avisos;
create policy "estado avisos propio insert" on public.estado_avisos
  for insert with check (username = private.current_username());
drop policy if exists "estado avisos propio update" on public.estado_avisos;
create policy "estado avisos propio update" on public.estado_avisos
  for update using (username = private.current_username()) with check (username = private.current_username());
drop policy if exists "estado avisos lectura" on public.estado_avisos;
create policy "estado avisos lectura" on public.estado_avisos
  for select using (username = private.current_username() or private.is_admin());

-- Si abre la app desde el navegador de Instagram, TikTok o Facebook, ahí no
-- llegan avisos: hay que decirle que la abra en Chrome o Safari.
alter table public.estado_avisos add column if not exists navegador_interno boolean not null default false;

-- Lo que la app ya había anotado en alumnos.estado_avisos pasa a esta tabla
-- (el tipo de celular se completa la próxima vez que el alumno abra la app).
insert into public.estado_avisos (username, dispositivo, estado, instalada, actualizado_en)
select username,
  case when estado_avisos = 'iphone_sin_instalar' then 'iphone' else 'otro' end,
  case estado_avisos when 'activo' then 'activo' when 'iphone_sin_instalar' then 'ios_sin_instalar'
    when 'bloqueado' then 'bloqueado' when 'no_activados' then 'sin_activar' else 'no_soportado' end,
  false, coalesce(estado_avisos_en, now())
from public.alumnos where estado_avisos is not null
on conflict (username) do nothing;
