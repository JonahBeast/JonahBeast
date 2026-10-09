-- Beast · tu compañero (docs/idea-beast.md).
--
-- beast_mensajes: la conversación de cada alumno con Beast. Se borra sola a
-- los 90 días (la función beast-chat borra lo viejo de cada alumno cada vez
-- que abre el chat, y el cron diario borra lo de todos). De aquí salen el
-- contador de mensajes del día (columna "cuenta") y los números del panel.
-- rol 'evento' = algo que hizo el alumno con Beast (anotó una comida, agua,
-- peso, tocó Deshacer…), sin texto, solo para medir.
--
-- beast_libreta: una fila por alumno con lo que Beast sabe de él (resumen
-- corto), cuándo aceptó usar a Beast y si aceptó que se avise a Jonah si
-- lo ve muy mal. El alumno la ve y la borra desde el chat.
--
-- Nadie lee estas tablas desde el navegador: todo pasa por la edge
-- function beast-chat (llave de servicio). El admin no lee las
-- conversaciones: el panel usa beast_resumen(), que devuelve solo números,
-- nombres con cuentas (sin texto) y los mensajes que el alumno marcó con 👎.

create table if not exists public.beast_mensajes (
  id bigint generated always as identity primary key,
  username text not null,
  creado_en timestamptz not null default now(),
  rol text not null check (rol in ('alumno', 'beast', 'evento')),
  texto text not null default '',
  tipo text not null default 'texto',
  datos jsonb,
  tema text,
  cuenta boolean not null default false,
  modelo text,
  valoracion smallint check (valoracion in (-1, 1)),
  alerta boolean not null default false
);
create index if not exists beast_mensajes_usuario_idx on public.beast_mensajes (username, creado_en desc);
create index if not exists beast_mensajes_creado_idx on public.beast_mensajes (creado_en);
alter table public.beast_mensajes enable row level security;

create table if not exists public.beast_libreta (
  username text primary key,
  notas text not null default '',
  consentimiento_en timestamptz,
  alerta_jonah boolean not null default false,
  actualizado_en timestamptz not null default now()
);
alter table public.beast_libreta enable row level security;

-- Números de Beast para el panel (solo admin). Sin el texto de las
-- conversaciones, salvo los mensajes que el alumno mismo marcó con 👎.
create or replace function public.beast_resumen(p_dias integer default 7)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_desde timestamptz := now() - make_interval(days => greatest(1, least(p_dias, 90)));
  v jsonb;
begin
  if not private.is_admin() then
    raise exception 'solo admin';
  end if;
  select jsonb_build_object(
    'usaron', (select count(distinct username) from beast_mensajes where rol = 'alumno' and creado_en >= v_desde),
    'volvieron', (select count(*) from (
        select username from beast_mensajes where rol = 'alumno' and creado_en >= v_desde
        group by username having count(distinct (creado_en at time zone 'America/Lima')::date) >= 2) t),
    'tres_dias', (select count(*) from (
        select username from beast_mensajes where rol = 'alumno' and creado_en >= v_desde
        group by username having count(distinct (creado_en at time zone 'America/Lima')::date) >= 3) t),
    'mensajes', (select count(*) from beast_mensajes where rol = 'alumno' and creado_en >= v_desde),
    'aceptaron', (select count(*) from beast_libreta where consentimiento_en is not null),
    'comidas', (select count(*) from beast_mensajes where rol = 'evento' and tipo = 'comida_anotada' and creado_en >= v_desde),
    'agua', (select count(*) from beast_mensajes where rol = 'evento' and tipo = 'agua' and creado_en >= v_desde),
    'peso', (select count(*) from beast_mensajes where rol = 'evento' and tipo = 'peso' and creado_en >= v_desde),
    'que_como', (select count(*) from beast_mensajes where rol = 'evento' and tipo = 'que_como' and creado_en >= v_desde),
    'deshacer', (select count(*) from beast_mensajes where rol = 'evento' and tipo = 'deshacer' and creado_en >= v_desde),
    'buenas', (select count(*) from beast_mensajes where valoracion = 1 and creado_en >= v_desde),
    'malas', (select count(*) from beast_mensajes where valoracion = -1 and creado_en >= v_desde),
    'temas', (select coalesce(jsonb_object_agg(tema, n), '{}'::jsonb) from (
        select tema, count(*) n from beast_mensajes where rol = 'beast' and tema is not null and creado_en >= v_desde group by tema) t),
    'ranking', (select coalesce(jsonb_agg(r order by r->>'dias' desc, r->>'mensajes' desc), '[]'::jsonb) from (
        select jsonb_build_object('username', m.username, 'nombre', max(a.nombre),
          'dias', count(distinct (m.creado_en at time zone 'America/Lima')::date) filter (where m.rol = 'alumno'),
          'mensajes', count(*) filter (where m.rol = 'alumno'),
          'comidas', count(*) filter (where m.rol = 'evento' and m.tipo = 'comida_anotada')) r
        from beast_mensajes m left join alumnos a on a.username = m.username
        where m.creado_en >= v_desde group by m.username
        having count(*) filter (where m.rol = 'alumno') > 0
        order by count(distinct (m.creado_en at time zone 'America/Lima')::date) filter (where m.rol = 'alumno') desc
        limit 15) t),
    'reportados', (select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'username', b.username, 'fecha', b.creado_en,
          'beast', b.texto,
          'alumno', (select p.texto from beast_mensajes p where p.username = b.username and p.rol = 'alumno' and p.id < b.id order by p.id desc limit 1))
          order by b.creado_en desc), '[]'::jsonb)
        from beast_mensajes b where b.valoracion = -1 and b.rol = 'beast' and b.creado_en >= v_desde),
    'apoyo', (select coalesce(jsonb_agg(distinct jsonb_build_object('username', m.username, 'nombre', a.nombre)), '[]'::jsonb)
        from beast_mensajes m left join alumnos a on a.username = m.username
        where m.alerta and m.creado_en >= now() - interval '3 days')
  ) into v;
  return v;
end;
$$;
revoke all on function public.beast_resumen(integer) from public, anon;
grant execute on function public.beast_resumen(integer) to authenticated;
