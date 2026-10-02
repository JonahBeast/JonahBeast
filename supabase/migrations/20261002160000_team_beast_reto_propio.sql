-- El Team Beast oficial ya no sigue el mes calendario: Jonah (su capitán)
-- elige cuándo empieza y cuánto dura (14, 28 o 56 días), igual que en los
-- equipos de los alumnos. Antes de empezar, el equipo muestra "EMPIEZA EL…"
-- y la gente se puede unir e invitar.
-- equipo_nuevo_reto: el capitán programa el reto cuando todavía no empezó o
-- ya terminó; el capitán del Team Beast oficial, en cualquier momento. La
-- fecha de inicio puede ser de hoy a 14 días.

create or replace function public.equipo_ver(p_id uuid, p_fecha date default null)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  v_yo text := private.current_username();
  v_hoy date := (now() at time zone 'America/Lima')::date;
  e equipos;
  v_inicio date;
  v_fin date;
  v_lunes date;
  v_hasta date;
  v_res json;
begin
  if v_yo is null then return json_build_object('error', 'sin_sesion'); end if;
  select * into e from equipos where id = p_id;
  if not found or e.cerrado then return json_build_object('error', 'no_existe'); end if;
  if not exists (select 1 from equipo_miembros where equipo_id = p_id and username = v_yo and activo) then
    return json_build_object('error', 'no_miembro');
  end if;
  v_inicio := e.inicio;
  v_fin := e.inicio + e.dias - 1;
  v_hasta := least(v_fin, v_hoy);
  v_lunes := coalesce(p_fecha, greatest(least(v_hoy, v_fin), v_inicio));
  v_lunes := v_lunes - (extract(isodow from v_lunes)::int - 1);

  with m as (
    select em.username, em.unido_en, private.equipo_nombre(em.username) nombre,
           left(md5(p_id::text || em.username), 12) ref
    from equipo_miembros em where em.equipo_id = p_id and em.activo
  ), h as (
    select hi.username, hi.fecha, coalesce(hi.comidas_count, 0) c
    from historial hi join m on m.username = hi.username
    where hi.fecha between least(v_inicio, v_lunes) and greatest(v_fin, v_lunes + 6)
  ), p as (
    select m.*,
      coalesce(sum(case when h.c >= 3 then 10 when h.c >= 1 then 5 else 0 end)
        filter (where h.fecha between v_inicio and v_hasta), 0) puntos,
      coalesce(sum(h.c) filter (where h.fecha between v_inicio and v_hasta), 0) comidas_reto,
      coalesce(sum(h.c) filter (where h.fecha between greatest(v_lunes, v_inicio) and least(v_lunes + 6, v_hasta)), 0) comidas_semana
    from m left join h on h.username = m.username
    group by m.username, m.unido_en, m.nombre, m.ref
  )
  select json_build_object(
    'id', e.id,
    'nombre', e.nombre,
    'apodo', e.apodo,
    'oficial', e.oficial,
    'codigo', e.codigo,
    'whatsapp', e.whatsapp,
    'soy_capitan', e.capitan = v_yo,
    'inicio', v_inicio,
    'fin', v_fin,
    'dias', v_fin - v_inicio + 1,
    'dia_actual', case when v_hoy < v_inicio then 0 else least(v_hoy, v_fin) - v_inicio + 1 end,
    'terminado', v_hoy > v_fin,
    'lunes', v_lunes,
    'puede_atras', v_lunes > v_inicio,
    'puede_adelante', v_lunes + 7 <= v_hasta,
    'max_miembros', e.max_miembros,
    'comidas_semana', (select coalesce(sum(comidas_semana), 0) from p),
    'comidas_reto', (select coalesce(sum(comidas_reto), 0) from p),
    'miembros', (select json_agg(json_build_object(
        'ref', p.ref,
        'nombre', case when e.oficial and p.username = e.capitan then 'Jonah' else p.nombre end,
        'yo', p.username = v_yo,
        'capitan', p.username = e.capitan,
        'puntos', p.puntos,
        'comidas_semana', p.comidas_semana,
        'animado_hoy', exists (select 1 from equipo_animos a where a.equipo_id = p_id and a.de = v_yo and a.para = p.username and a.fecha = v_hoy),
        'dias', (select json_agg(case
            when d.f < v_inicio or d.f > v_fin then 'fuera'
            when d.f > v_hoy then 'futuro'
            when coalesce(hh.c, 0) >= 3 then 'ok'
            when coalesce(hh.c, 0) >= 1 then 'medio'
            when d.f = v_hoy then 'hoy'
            else 'no' end order by d.f)
          from (select v_lunes + i f from generate_series(0, 6) i) d
          left join h hh on hh.username = p.username and hh.fecha = d.f)
      ) order by p.puntos desc, p.comidas_semana desc, p.unido_en) from p),
    'animos', coalesce((select json_agg(json_build_object(
        'de', case when e.oficial and a.de = e.capitan then 'Jonah' else private.equipo_nombre(a.de) end,
        'tipo', a.tipo) order by a.created_at desc)
      from equipo_animos a where a.equipo_id = p_id and a.para = v_yo and not a.visto), '[]'::json)
  ) into v_res;
  return v_res;
end;
$$;

create or replace function public.equipo_nuevo_reto(p_id uuid, p_dias int, p_inicio date)
returns json language plpgsql volatile security definer set search_path = public as $$
declare
  v_yo text := private.current_username();
  v_hoy date := (now() at time zone 'America/Lima')::date;
  e equipos;
begin
  select * into e from equipos where id = p_id and capitan = v_yo and not cerrado;
  if not found then return json_build_object('error', 'no_capitan'); end if;
  if not e.oficial and e.inicio <= v_hoy and e.inicio + e.dias - 1 >= v_hoy then return json_build_object('error', 'en_curso'); end if;
  if p_dias not in (14, 28, 56) or p_inicio is null or p_inicio < v_hoy or p_inicio > v_hoy + 14 then return json_build_object('error', 'datos'); end if;
  update equipos set inicio = p_inicio, dias = p_dias where id = p_id;
  return json_build_object('ok', true);
end;
$$;
