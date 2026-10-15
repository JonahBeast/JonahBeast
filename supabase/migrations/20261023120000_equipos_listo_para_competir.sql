-- EQUIPOS: "Listo para competir" (Parte 2 de retos más fáciles, pedida por
-- Jonah el 15 de octubre).
--
-- equipo_por_codigo: la invitación trae las reglas del reto (cómo se gana,
-- fechas y premio) para mostrar "Así se juega este reto" antes de entrar.
-- No trae nada de las personas, solo del reto.
-- equipo_ver: al capitán de un reto de peso le dice cuántos integrantes
-- todavía no están listos para competir ('faltan', de 'adultos'): sin peso
-- de inicio o en "Solo constancia". Nunca quiénes ni su peso.

create or replace function public.equipo_por_codigo(p_codigo text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('nombre', e.nombre, 'apodo', e.apodo, 'oficial', e.oficial,
    'miembros', (select count(*) from equipo_miembros x where x.equipo_id = e.id and x.activo),
    'objetivo', e.objetivo, 'sentido', e.sentido, 'meta_tipo', e.meta_tipo, 'meta_valor', e.meta_valor,
    'inicio', e.inicio, 'fin', coalesce(e.fin, e.inicio + e.dias - 1), 'premio', e.premio)
  from equipos e where e.codigo = upper(trim(p_codigo)) and not e.cerrado
$$;

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
  v_prog json;
  v_gan text;
  v_res json;
begin
  if v_yo is null then return json_build_object('error', 'sin_sesion'); end if;
  select * into e from equipos where id = p_id;
  if not found or e.cerrado then return json_build_object('error', 'no_existe'); end if;
  if not exists (select 1 from equipo_miembros where equipo_id = p_id and username = v_yo and activo) then
    return json_build_object('error', 'no_miembro');
  end if;
  v_inicio := e.inicio;
  v_fin := coalesce(e.fin, e.inicio + e.dias - 1);
  v_hasta := least(v_fin, v_hoy);
  v_lunes := coalesce(p_fecha, greatest(least(v_hoy, v_fin), v_inicio));
  v_lunes := v_lunes - (extract(isodow from v_lunes)::int - 1);
  v_prog := private.equipo_progreso(p_id);
  v_gan := v_prog->>'ganador';

  with m as (
    select em.username, em.unido_en, private.equipo_nombre(em.username) nombre,
           left(md5(p_id::text || em.username), 12) ref
    from equipo_miembros em where em.equipo_id = p_id and em.activo
  ), h as (
    select hi.username, hi.fecha, coalesce(hi.comidas_count, 0) c
    from historial hi join m on m.username = hi.username
    where hi.fecha between least(v_inicio, v_lunes) and greatest(v_fin, v_lunes + 6)
  ), pe as (
    select * from private.equipo_pesos(p_id)
  ), p as (
    select m.*,
      coalesce(sum(case when h.c >= 3 then 10 when h.c >= 1 then 5 else 0 end)
        filter (where h.fecha between v_inicio and v_hasta), 0) puntos,
      count(h.fecha) filter (where h.c >= 3 and h.fecha between v_inicio and v_hasta) dias_ok,
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
    'objetivo', e.objetivo,
    'sentido', e.sentido,
    'meta_tipo', e.meta_tipo,
    'meta_valor', e.meta_valor,
    'premio', e.premio,
    'progreso', case when v_prog is null then null else (v_prog::jsonb - 'ganador')::json end,
    'inicio', v_inicio,
    'fin', v_fin,
    'dias', v_fin - v_inicio + 1,
    'dia_actual', case when v_hoy < v_inicio then 0 else least(v_hoy, v_fin) - v_inicio + 1 end,
    'terminado', v_hoy > v_fin,
    'lunes', v_lunes,
    'puede_atras', v_lunes > v_inicio,
    'puede_adelante', v_lunes + 7 <= v_hasta,
    'max_miembros', e.max_miembros,
    -- Solo al capitán, en retos de peso: cuántos todavía no están listos
    -- para competir (sin peso de inicio o en "Solo constancia"). Nunca quiénes
    -- ni su peso.
    'faltan', case when e.capitan = v_yo and e.objetivo <> 'comer' then
      (select count(*) from pe where not pe.menor and (pe.comparte = 'nada' or pe.base is null)) end,
    'adultos', case when e.capitan = v_yo and e.objetivo <> 'comer' then
      (select count(*) from pe where not pe.menor) end,
    'comidas_semana', (select coalesce(sum(comidas_semana), 0) from p),
    'comidas_reto', (select coalesce(sum(comidas_reto), 0) from p),
    'yo', (select json_build_object('comparte', pe.comparte, 'menor', pe.menor, 'sin_pesaje', pe.base is null,
              'kg', pe.perdido, 'pct', pe.pct, 'llego', pe.semana_llego is not null)
           from pe where pe.username = v_yo),
    'miembros', (select json_agg(json_build_object(
        'ref', p.ref,
        'nombre', case when e.oficial and p.username = e.capitan then 'Jonah' else p.nombre end,
        'yo', p.username = v_yo,
        'capitan', p.username = e.capitan,
        'puntos', p.puntos,
        'dias_ok', p.dias_ok,
        'comidas_semana', p.comidas_semana,
        'ganador', v_gan is not null and p.username = v_gan,
        'medalla_posible', not (e.oficial and p.username = e.capitan),
        'peso', (select case when e.objetivo <> 'comer' and pe.comparte = 'avance' and not pe.menor and pe.base is not null
                   then json_build_object('kg', pe.perdido, 'pct', pe.pct, 'llego', pe.semana_llego is not null) end
                 from pe where pe.username = p.username),
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
      ) order by p.puntos desc, p.dias_ok desc, p.comidas_reto desc, p.unido_en) from p),
    'animos', coalesce((select json_agg(json_build_object(
        'de', case when e.oficial and a.de = e.capitan then 'Jonah' else private.equipo_nombre(a.de) end,
        'tipo', a.tipo) order by a.created_at desc)
      from equipo_animos a where a.equipo_id = p_id and a.para = v_yo and not a.visto), '[]'::json)
  ) into v_res;
  return v_res;
end;
$$;

