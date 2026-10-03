-- COMUNIDAD BEAST, ETAPA A: un muro en la app (pestaña "Comunidad" →
-- "Muro") con los logros de los retos, reacciones de un toque y los
-- anuncios de Jonah.
--
-- - comunidad_perfil: quién eligió aparecer en el muro (visible). Nadie
--   aparece si no lo activa; los menores de 18 nunca aparecen.
-- - comunidad_reacciones: 🔥 💪 👏 sobre un logro o un anuncio. evento es
--   la clave del logro ('m:<medalla>', 'g:<equipo>:<reto>', 'r:<ref>:<fecha>',
--   'u:<ref>:<equipo>' o 'a:<anuncio>'); para = dueño del logro (para
--   avisarle). Quitar la reacción la deja con activo = false (no se borra).
-- - comunidad_anuncios: lo que publica Jonah desde el panel, con un botón
--   opcional "Únete al reto" (codigo = código del equipo).
--
-- Los logros no se guardan: salen de equipo_medallas, equipo_miembros e
-- historial. Del alumno solo se muestra su nombre corto; nunca su peso ni
-- sus kilos.

create table public.comunidad_perfil (
  username text primary key,
  visible boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.comunidad_reacciones (
  evento text not null check (char_length(evento) between 3 and 80),
  username text not null,
  tipo text not null check (tipo in ('fuego', 'fuerza', 'aplauso')),
  para text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (evento, username, tipo)
);
create index comunidad_reacciones_para on public.comunidad_reacciones (para, created_at);

create table public.comunidad_anuncios (
  id bigint generated always as identity primary key,
  texto text not null check (char_length(texto) between 3 and 500),
  codigo text,
  fijado boolean not null default false,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.comunidad_perfil enable row level security;
alter table public.comunidad_reacciones enable row level security;
alter table public.comunidad_anuncios enable row level security;

create policy "admin lee perfiles comunidad" on public.comunidad_perfil for select using (private.is_admin());
create policy "admin lee reacciones" on public.comunidad_reacciones for select using (private.is_admin());
create policy "admin lee anuncios" on public.comunidad_anuncios for select using (private.is_admin());
create policy "admin crea anuncios" on public.comunidad_anuncios for insert with check (private.is_admin());
create policy "admin edita anuncios" on public.comunidad_anuncios for update using (private.is_admin());
