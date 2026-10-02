-- EQUIPOS, ETAPA 2: objetivos, metas, carrera, podio y medallas.
--
-- Tres tipos de equipo (equipos.objetivo):
--   'comer'   🍽️ Comer mejor: gana el más constante. Meta opcional de
--             comidas entre todos (meta_tipo 'comidas').
--   'juntos'  🤝 Meta juntos (bajar de peso): meta común del grupo.
--             meta_tipo 'pct_total' (entre todos bajamos X %),
--             'kg_total' (entre todos X kg) o 'kg_cada' (cada uno X kg).
--   'carrera' 🏁 Carrera: gana el primero en llegar a la meta.
--             meta_tipo 'carrera_kg' o 'carrera_pct'.
-- Siempre: podio 🥇🥈🥉 por constancia (puntos), nunca por kilos.
--
-- Peso: no se guarda nada nuevo. Se usa el peso que la app ya guarda en
-- historial. Cuenta solo quien lo decide (equipo_miembros.comparte):
--   'nada'   participa solo con su constancia (por defecto);
--   'total'  su avance suma al total del equipo, sin verse por separado;
--   'avance' el equipo ve su barra y sus kilos bajados (nunca su peso).
-- Menores de 18 no suman peso. Tope de seguridad: como mucho 1% de su
-- peso por semana cuenta para la meta (lo que baje de más no suma).
--
-- Otros datos nuevos de equipos:
--   premio   texto del capitán ("El que pierda invita el ceviche 🐟").
--   fin      fecha final elegida a mano ("hasta el 20 de diciembre"); si
--            está vacía, el reto dura `dias` (14, 28 o 56).
--   reto_cerrado  inicio del último reto ya cerrado (medallas repartidas).
-- Tabla nueva equipo_medallas: las medallas que quedan para siempre.

alter table public.equipos
  add column objetivo text not null default 'comer' check (objetivo in ('comer', 'juntos', 'carrera')),
  add column meta_tipo text check (meta_tipo is null or meta_tipo in ('comidas', 'pct_total', 'kg_total', 'kg_cada', 'carrera_kg', 'carrera_pct')),
  add column meta_valor numeric check (meta_valor is null or meta_valor > 0),
  add column premio text check (premio is null or char_length(premio) between 2 and 80),
  add column fin date,
  add column reto_cerrado date;

alter table public.equipo_miembros
  add column comparte text not null default 'nada' check (comparte in ('nada', 'total', 'avance'));

create table public.equipo_medallas (
  id bigint generated always as identity primary key,
  equipo_id uuid not null references public.equipos(id) on delete cascade,
  username text not null,
  reto_inicio date not null,
  medalla text not null check (medalla in ('oro', 'plata', 'bronce', 'meta', 'meta_personal', 'carrera')),
  created_at timestamptz not null default now(),
  unique (equipo_id, reto_inicio, username, medalla)
);
create index equipo_medallas_username on public.equipo_medallas (username);
alter table public.equipo_medallas enable row level security;
create policy "admin lee medallas" on public.equipo_medallas for select using (private.is_admin());
