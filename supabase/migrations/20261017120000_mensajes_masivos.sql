-- 📣 Mensaje a todos: Jonah escribe un mensaje (ej. saludo de Navidad) en el
-- panel, elige a quién va y cuándo sale. Al salir llega como notificación a
-- quien tiene los avisos activados y como tarjeta en Inicio a todos los del
-- público elegido (api/mensaje-masivo.js y api/cron/mensajes-programados.js).
create table if not exists public.mensajes_masivos (
  id bigserial primary key,
  titulo text not null check (char_length(titulo) between 1 and 60),
  texto text not null check (char_length(texto) between 1 and 300),
  -- todos · pagan · prueba · gratis · inactivos (sin registrar comida 3+ días)
  publico text not null default 'todos' check (publico in ('todos', 'pagan', 'prueba', 'gratis', 'inactivos')),
  en_muro boolean not null default false,
  estado text not null default 'programado' check (estado in ('programado', 'enviado', 'cancelado')),
  programado_para timestamptz not null default now(),
  enviado_en timestamptz,
  -- A quiénes les tocó al salir (para la tarjeta de Inicio) y a cuántos
  -- celulares llegó la notificación.
  destinatarios text[] not null default '{}',
  push_enviados int not null default 0,
  creado_en timestamptz not null default now()
);

alter table public.mensajes_masivos enable row level security;

-- Solo el admin lee y escribe la tabla. Los alumnos no la leen directo
-- (la lista de destinatarios tiene los usuarios de todos): ven su mensaje
-- con la función mi_mensaje_masivo().
create policy "admin lee mensajes masivos" on public.mensajes_masivos for select using (private.is_admin());
create policy "admin crea mensajes masivos" on public.mensajes_masivos for insert with check (private.is_admin());
create policy "admin edita mensajes masivos" on public.mensajes_masivos for update using (private.is_admin());

-- El mensaje más reciente (últimos 14 días) que le tocó al alumno que pregunta.
create or replace function public.mi_mensaje_masivo()
returns table (id bigint, titulo text, texto text, enviado_en timestamptz)
language sql stable security definer set search_path = public
as $$
  select m.id, m.titulo, m.texto, m.enviado_en
    from public.mensajes_masivos m
   where m.estado = 'enviado'
     and m.enviado_en > now() - interval '14 days'
     and private.current_username() = any (m.destinatarios)
   order by m.enviado_en desc
   limit 1
$$;
revoke all on function public.mi_mensaje_masivo() from public, anon;
grant execute on function public.mi_mensaje_masivo() to authenticated;
