-- ACTIVIDAD DEL EQUIPO: lo que pasa en el equipo en los últimos 7 días,
-- para que todos lo vean (sin escribir nada):
--   - animo:  "Rosa le mandó ánimo a Pedro"
--   - dia:    "Pedro cumplió su día" (3 comidas o más registradas)
--   - racha:  "Ana lleva 7 días seguidos registrando" (3, 7, 14, 21, 30)
--   - nuevo:  "Luis se unió al equipo"
-- No cambia tablas: sale de equipo_animos, equipo_miembros e historial.
-- Como en equipo_ver, de cada uno solo va su nombre corto (nunca su peso
-- ni lo que comió).
create or replace function public.equipo_actividad(p_id uuid)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  v_yo text := private.current_username();
  v_hoy date := (now() at time zone 'America/Lima')::date;
  e equipos;
  v_res json;
begin
  if v_yo is null then return json_build_object('error', 'sin_sesion'); end if;
  select * into e from equipos where id = p_id and not cerrado;
  if not found then return json_build_object('error', 'no_existe'); end if;
  if not exists (select 1 from equipo_miembros where equipo_id = p_id and username = v_yo and activo) then
    return json_build_object('error', 'no_miembro');
  end if;

  with m as (
    select em.username, em.unido_en,
           case when e.oficial and em.username = e.capitan then 'Jonah' else private.equipo_nombre(em.username) end nombre,
           left(md5(p_id::text || em.username), 12) ref
    from equipo_miembros em where em.equipo_id = p_id and em.activo
  ), h as (
    -- Días con comida de los últimos 45 días (para contar rachas).
    select hi.username, hi.fecha, coalesce(hi.comidas_count, 0) c,
           least(hi.updated_at, ((hi.fecha + 1)::timestamp at time zone 'America/Lima') - interval '1 minute') cuando,
           (m.unido_en at time zone 'America/Lima')::date desde
    from historial hi join m on m.username = hi.username
    where hi.fecha between v_hoy - 45 and v_hoy and coalesce(hi.comidas_count, 0) > 0
  ), g as (
    select h.*, h.fecha - (row_number() over (partition by h.username order by h.fecha))::int grupo from h
  ), r as (
    select g.*, row_number() over (partition by g.username, g.grupo order by g.fecha) racha from g
  ), ev as (
    select 'animo' tipo, a.created_at cuando, a.de quien, a.para para, a.tipo detalle
    from equipo_animos a
    where a.equipo_id = p_id and a.fecha >= v_hoy - 6
      and a.de in (select username from m) and a.para in (select username from m)
    union all
    select 'dia', h.cuando, h.username, null, h.c::text from h where h.c >= 3 and h.fecha >= greatest(v_hoy - 6, h.desde)
    union all
    select 'racha', r.cuando + interval '1 second', r.username, null, r.racha::text from r
    where r.fecha >= greatest(v_hoy - 6, r.desde) and r.racha in (3, 7, 14, 21, 30)
    union all
    select 'nuevo', m.unido_en, m.username, null, null from m
    where m.unido_en >= now() - interval '7 days' and not (e.oficial and m.username = e.capitan)
  )
  select coalesce(json_agg(json_build_object(
      'tipo', ev.tipo,
      'cuando', ev.cuando,
      'quien', mq.nombre,
      'quien_ref', mq.ref,
      'quien_yo', ev.quien = v_yo,
      'para', mp.nombre,
      'para_yo', ev.para = v_yo,
      'detalle', ev.detalle
    ) order by ev.cuando desc), '[]'::json)
  into v_res
  from (select * from ev order by cuando desc limit 40) ev
  join m mq on mq.username = ev.quien
  left join m mp on mp.username = ev.para;
  return json_build_object('eventos', v_res);
end;
$$;

revoke execute on function public.equipo_actividad(uuid) from public, anon;
grant execute on function public.equipo_actividad(uuid) to authenticated;
