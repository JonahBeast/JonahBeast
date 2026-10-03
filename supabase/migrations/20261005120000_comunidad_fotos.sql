-- COMUNIDAD BEAST, ETAPA B: fotos de platos en el muro.
--
-- El alumno comparte la foto de su plato justo después de registrarla con
-- la foto inteligente (la IA ya la reconoció como comida). Elige una frase
-- lista (no escribe texto). Jonah aprueba cada foto; cuando a un alumno ya
-- le aprobó 5, las siguientes salen solas. Con 2 reportes de otros
-- alumnos una foto aprobada se oculta sola y Jonah recibe un aviso.
--
-- - Archivos: bucket privado comunidad-fotos (<usuario>/<archivo>.jpg).
--   Se ven las aprobadas; las demás solo su dueño y el admin.
-- - comunidad_fotos: cada foto (frase, plato y estado: pendiente,
--   aprobada, rechazada u oculta).
-- - comunidad_reportes: quién reportó qué foto (uno por persona).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comunidad-fotos', 'comunidad-fotos', false, 2097152, array['image/jpeg'])
on conflict (id) do nothing;

create table public.comunidad_fotos (
  id bigint generated always as identity primary key,
  username text not null,
  ruta text not null unique,
  frase text not null check (frase in ('almuerzo_beast', 'casera', 'rico_sano', 'comida_a_comida', 'desayuno', 'cena')),
  plato text check (plato is null or char_length(plato) between 2 and 60),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobada', 'rechazada', 'oculta')),
  reportes int not null default 0,
  created_at timestamptz not null default now(),
  revisada_at timestamptz
);
create index comunidad_fotos_estado on public.comunidad_fotos (estado, created_at);
create index comunidad_fotos_username on public.comunidad_fotos (username, created_at);

create table public.comunidad_reportes (
  foto_id bigint not null references public.comunidad_fotos(id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now(),
  primary key (foto_id, username)
);

alter table public.comunidad_fotos enable row level security;
alter table public.comunidad_reportes enable row level security;
create policy "admin lee fotos comunidad" on public.comunidad_fotos for select using (private.is_admin());
create policy "admin lee reportes" on public.comunidad_reportes for select using (private.is_admin());

-- ¿Esa foto ya está aprobada? (para que cualquiera con sesión la vea)
create or replace function private.comunidad_foto_publica(p_ruta text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from comunidad_fotos where ruta = p_ruta and estado = 'aprobada')
$$;
revoke execute on function private.comunidad_foto_publica(text) from public, anon;
grant execute on function private.comunidad_foto_publica(text) to authenticated;

create policy "sube su foto de comunidad" on storage.objects for insert to authenticated
  with check (bucket_id = 'comunidad-fotos' and (storage.foldername(name))[1] = private.current_username());
create policy "ve fotos de comunidad" on storage.objects for select to authenticated
  using (bucket_id = 'comunidad-fotos' and (
    (storage.foldername(name))[1] = private.current_username()
    or private.is_admin()
    or private.comunidad_foto_publica(name)));
create policy "borra fotos de comunidad" on storage.objects for delete to authenticated
  using (bucket_id = 'comunidad-fotos' and ((storage.foldername(name))[1] = private.current_username() or private.is_admin()));
