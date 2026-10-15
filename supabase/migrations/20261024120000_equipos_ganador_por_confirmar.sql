-- EQUIPOS: "Ganador por confirmar" en las carreras (pedido por Jonah el 15
-- de octubre, con su OK a las 2 columnas nuevas): la app no puede saber si
-- alguien miente con su peso, así que el ganador se confirma con un pesaje
-- en persona.
--
-- Columnas nuevas en equipos (se limpian al programar un reto nuevo):
--   ganador_confirmado   quién quedó confirmado como ganador del reto.
--   ganador_descartados  a quiénes no les coincidió el pesaje en persona en
--                        este reto (salen de la carrera; pasa el siguiente).

alter table public.equipos
  add column ganador_confirmado text,
  add column ganador_descartados text[] not null default '{}';

create or replace function private.equipo_participantes(p_id uuid)
returns table (username text, base numeric, perdido numeric, pct numeric, semana_llego int, dias_ok bigint)
language sql stable security definer set search_path = public as $$
  select p.username, p.base, p.perdido, p.pct, p.semana_llego, coalesce(q.dias_ok, 0)
  from private.equipo_pesos(p_id) p
  left join private.equipo_puntos(p_id) q on q.username = p.username
  cross join (select objetivo, ganador_descartados from equipos where id = p_id) e
  where not p.menor and p.base is not null
    and not (p.username = any(e.ganador_descartados))
    and (p.comparte = 'avance' or (p.comparte = 'total' and e.objetivo = 'juntos'))
$$;

create or replace function private.equipo_progreso(p_id uuid)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  e equipos;
  v_hoy date := (now() at time zone 'America/Lima')::date;
  v_term boolean;
  v_valor numeric;
  v_part int;
  v_base numeric;
  v_kg numeric;
  v_gan text;
begin
  select * into e from equipos where id = p_id;
  if not found or e.meta_tipo is null then return null; end if;
  v_term := v_hoy > coalesce(e.fin, e.inicio + e.dias - 1);

  if e.meta_tipo = 'comidas' then
    select coalesce(sum(comidas), 0) into v_valor from private.equipo_puntos(p_id);
    return json_build_object('tipo', 'comidas', 'valor', v_valor, 'meta', e.meta_valor, 'cumplida', v_valor >= e.meta_valor);
  end if;

  select count(*), coalesce(sum(base), 0), round(coalesce(sum(perdido), 0), 1),
         count(*) filter (where perdido >= e.meta_valor)
    into v_part, v_base, v_kg, v_valor
    from private.equipo_participantes(p_id);

  if e.meta_tipo = 'pct_total' then
    v_valor := case when v_base > 0 then round(v_kg / v_base * 100, 1) else 0 end;
    return json_build_object('tipo', e.meta_tipo, 'valor', v_valor, 'meta', e.meta_valor, 'cumplida', v_part > 0 and v_valor >= e.meta_valor,
      'participantes', v_part, 'kg_juntos', v_kg);
  elsif e.meta_tipo = 'kg_total' then
    return json_build_object('tipo', e.meta_tipo, 'valor', v_kg, 'meta', e.meta_valor, 'cumplida', v_part > 0 and v_kg >= e.meta_valor,
      'participantes', v_part, 'kg_juntos', v_kg);
  elsif e.meta_tipo = 'kg_cada' then
    return json_build_object('tipo', e.meta_tipo, 'valor', v_valor, 'meta', e.meta_valor, 'cumplida', v_part > 0 and v_valor >= v_part,
      'participantes', v_part, 'kg_juntos', v_kg);
  end if;

  select username into v_gan from private.equipo_participantes(p_id)
    where semana_llego is not null order by semana_llego, dias_ok desc limit 1;
  if v_gan is null and v_term then
    select username into v_gan from private.equipo_participantes(p_id)
      where (case when e.meta_tipo = 'carrera_kg' then perdido else pct end) > 0
      order by (case when e.meta_tipo = 'carrera_kg' then perdido else pct end) desc, dias_ok desc limit 1;
  end if;
  return json_build_object('tipo', e.meta_tipo, 'meta', e.meta_valor, 'cumplida', v_gan is not null, 'participantes', v_part,
    'kg_juntos', v_kg, 'ganador', v_gan, 'confirmado', v_gan is not null and v_gan = e.ganador_confirmado);
end;
$$;

-- El ganador de la carrera se confirma en persona: el capitán toca
-- "✅ Confirmado en persona" o "❌ No coincidió". Si el que va ganando es el
-- capitán, lo confirma cualquier otro integrante (nadie se confirma a sí
-- mismo). Con "No coincidió" esa persona sale de la carrera de este reto y
-- pasa el siguiente. Si el reto ya se cerró, al confirmar se entrega la 🏁.
create or replace function public.equipo_confirmar_ganador(p_id uuid, p_ok boolean)
returns json language plpgsql volatile security definer set search_path = public as $$
declare
  v_yo text := private.current_username();
  e equipos;
  v_gan text;
begin
  select * into e from equipos where id = p_id and not cerrado;
  if v_yo is null or not found or not exists (select 1 from equipo_miembros where equipo_id = p_id and username = v_yo and activo) then
    return json_build_object('error', 'no_miembro');
  end if;
  if e.objetivo <> 'carrera' then return json_build_object('error', 'datos'); end if;
  v_gan := private.equipo_progreso(p_id)->>'ganador';
  if v_gan is null then return json_build_object('error', 'sin_ganador'); end if;
  if not ((e.capitan = v_yo and v_gan <> v_yo) or (v_gan = e.capitan and v_yo <> e.capitan)) then
    return json_build_object('error', 'no_capitan');
  end if;
  if p_ok then
    update equipos set ganador_confirmado = v_gan where id = p_id;
    if e.reto_cerrado = e.inicio then
      insert into equipo_medallas (equipo_id, username, reto_inicio, medalla) values (p_id, v_gan, e.inicio, 'carrera')
        on conflict do nothing;
    end if;
  else
    update equipos set ganador_confirmado = null,
      ganador_descartados = array_append(ganador_descartados, v_gan) where id = p_id;
  end if;
  return json_build_object('ok', true);
end;
$$;
revoke execute on function public.equipo_confirmar_ganador(uuid, boolean) from public, anon;
grant execute on function public.equipo_confirmar_ganador(uuid, boolean) to authenticated;

create or replace function public.equipo_cerrar_retos()
returns json language plpgsql volatile security definer set search_path = public as $$
declare
  e equipos;
  v_hoy date := (now() at time zone 'America/Lima')::date;
  v_res jsonb := '[]'::jsonb;
  v_meds jsonb;
  v_prog json;
  v_gan text;
  r record;
  i int;
  v_tipo text;
begin
  for e in select * from equipos
           where not cerrado and coalesce(fin, inicio + dias - 1) < v_hoy and reto_cerrado is distinct from inicio
  loop
    v_meds := '[]'::jsonb;
    i := 0;
    for r in select q.username from private.equipo_puntos(e.id) q
             where q.puntos > 0 and not (e.oficial and q.username = e.capitan)
             order by q.puntos desc, q.dias_ok desc, q.comidas desc limit 3
    loop
      i := i + 1;
      v_tipo := (array['oro', 'plata', 'bronce'])[i];
      insert into equipo_medallas (equipo_id, username, reto_inicio, medalla) values (e.id, r.username, e.inicio, v_tipo)
        on conflict do nothing;
      v_meds := v_meds || jsonb_build_object('username', r.username, 'medalla', v_tipo);
    end loop;

    v_prog := private.equipo_progreso(e.id);
    if v_prog is not null then
      if e.objetivo in ('comer', 'juntos') and coalesce((v_prog->>'cumplida')::boolean, false) then
        insert into equipo_medallas (equipo_id, username, reto_inicio, medalla)
          select e.id, x.username, e.inicio, 'meta' from equipo_miembros x
          where x.equipo_id = e.id and x.activo and not (e.oficial and x.username = e.capitan)
          on conflict do nothing;
        v_meds := v_meds || jsonb_build_object('medalla', 'meta');
      end if;
      if e.meta_tipo = 'kg_cada' then
        for r in select q.username from private.equipo_participantes(e.id) q where q.perdido >= e.meta_valor loop
          insert into equipo_medallas (equipo_id, username, reto_inicio, medalla) values (e.id, r.username, e.inicio, 'meta_personal')
            on conflict do nothing;
          v_meds := v_meds || jsonb_build_object('username', r.username, 'medalla', 'meta_personal');
        end loop;
      end if;
      v_gan := v_prog->>'ganador';
      -- 🏁 solo si el capitán (o un compañero) lo confirmó en persona; si
      -- no, la medalla se entrega al confirmarlo (equipo_confirmar_ganador).
      if v_gan is not null and v_gan = e.ganador_confirmado then
        insert into equipo_medallas (equipo_id, username, reto_inicio, medalla) values (e.id, v_gan, e.inicio, 'carrera')
          on conflict do nothing;
        v_meds := v_meds || jsonb_build_object('username', v_gan, 'medalla', 'carrera');
      end if;
    end if;

    update equipos set reto_cerrado = e.inicio where id = e.id;
    v_res := v_res || jsonb_build_object(
      'equipo_id', e.id, 'nombre', e.nombre, 'apodo', e.apodo, 'oficial', e.oficial, 'capitan', e.capitan,
      'premio', e.premio, 'objetivo', e.objetivo,
      'miembros', coalesce((select jsonb_agg(x.username) from equipo_miembros x where x.equipo_id = e.id and x.activo), '[]'::jsonb),
      'medallas', v_meds);
  end loop;
  return v_res::json;
end;
$$;

create or replace function public.equipo_nuevo_reto(p_id uuid, p_dias int, p_inicio date,
  p_objetivo text, p_meta_tipo text, p_meta_valor numeric, p_premio text, p_sentido text)
returns json language plpgsql volatile security definer set search_path = public as $$
declare
  v_yo text := private.current_username();
  v_hoy date := (now() at time zone 'America/Lima')::date;
  v_premio text := nullif(trim(coalesce(p_premio, '')), '');
  e equipos;
  v_err text;
begin
  select * into e from equipos where id = p_id and capitan = v_yo and not cerrado;
  if not found then return json_build_object('error', 'no_capitan'); end if;
  if not e.oficial and e.inicio <= v_hoy and coalesce(e.fin, e.inicio + e.dias - 1) >= v_hoy then return json_build_object('error', 'en_curso'); end if;
  if p_dias is null or p_dias < 14 or p_dias > 120 or p_inicio is null or p_inicio < v_hoy or p_inicio > v_hoy + 14 then return json_build_object('error', 'datos'); end if;
  v_err := private.equipo_meta_error(p_objetivo, p_meta_tipo, p_meta_valor, p_dias, e.oficial, p_sentido);
  if v_err is not null then return json_build_object('error', v_err); end if;
  if v_premio is not null and not private.equipo_texto_ok(v_premio) then return json_build_object('error', 'premio'); end if;
  update equipos set inicio = p_inicio,
    dias = case when p_dias in (14, 28, 56) then p_dias else 28 end,
    fin = case when p_dias in (14, 28, 56) then null else p_inicio + p_dias - 1 end,
    objetivo = p_objetivo, meta_tipo = p_meta_tipo, meta_valor = p_meta_valor, premio = v_premio,
    sentido = case when p_objetivo = 'comer' then 'bajar' else p_sentido end,
    ganador_confirmado = null, ganador_descartados = '{}'
  where id = p_id;
  return json_build_object('ok', true);
end;
$$;

create or replace function public.equipo_nuevo_reto(p_id uuid, p_dias int, p_inicio date,
  p_objetivo text, p_meta_tipo text, p_meta_valor numeric, p_premio text)
returns json language plpgsql volatile security definer set search_path = public as $$
declare
  v_yo text := private.current_username();
  v_hoy date := (now() at time zone 'America/Lima')::date;
  v_premio text := nullif(trim(coalesce(p_premio, '')), '');
  e equipos;
  v_err text;
begin
  select * into e from equipos where id = p_id and capitan = v_yo and not cerrado;
  if not found then return json_build_object('error', 'no_capitan'); end if;
  if not e.oficial and e.inicio <= v_hoy and coalesce(e.fin, e.inicio + e.dias - 1) >= v_hoy then return json_build_object('error', 'en_curso'); end if;
  if p_dias is null or p_dias < 14 or p_dias > 120 or p_inicio is null or p_inicio < v_hoy or p_inicio > v_hoy + 14 then return json_build_object('error', 'datos'); end if;
  v_err := private.equipo_meta_error(p_objetivo, p_meta_tipo, p_meta_valor, p_dias, e.oficial);
  if v_err is not null then return json_build_object('error', v_err); end if;
  if v_premio is not null and not private.equipo_texto_ok(v_premio) then return json_build_object('error', 'premio'); end if;
  update equipos set inicio = p_inicio,
    dias = case when p_dias in (14, 28, 56) then p_dias else 28 end,
    fin = case when p_dias in (14, 28, 56) then null else p_inicio + p_dias - 1 end,
    objetivo = p_objetivo, meta_tipo = p_meta_tipo, meta_valor = p_meta_valor, premio = v_premio,
    ganador_confirmado = null, ganador_descartados = '{}'
  where id = p_id;
  return json_build_object('ok', true);
end;
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
    'descartado', v_yo = any(e.ganador_descartados),
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
                     and not (p.username = any(e.ganador_descartados))
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

