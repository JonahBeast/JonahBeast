-- EQUIPOS, ETAPA 2 (funciones que usa la app).
--
-- equipo_crear y equipo_nuevo_reto tienen una versión nueva con objetivo,
-- meta y premio (todos los datos obligatorios, así no se confunden con la
-- versión anterior, que sigue sirviendo a la app vieja). p_dias: de 14 a
-- 120; si no es 14, 28 o 56, se guarda como fecha final (fin).
-- equipo_editar: versión nueva con premio. equipo_compartir: qué comparte
-- cada uno de su peso. equipo_ver y equipo_mis: con meta, avance de peso,
-- podio y medallas. equipo_cerrar_retos: la tarea diaria reparte medallas.

-- Textos que escribe el capitán (premio): sin groserías ni productos para
-- bajar de peso.
create or replace function private.equipo_texto_ok(p_texto text)
returns boolean language sql immutable set search_path = public as $$
  select char_length(trim(coalesce(p_texto, ''))) between 2 and 80
    and lower(p_texto) !~ '(\mput[ao]\M|mierda|idiota|est[uú]pid|cabr[oó]n|verga|pinga|conch|maric|cojud|imb[eé]cil|pendej|sexo|xxx|pastilla|quemador|detox|laxante)'
$$;
revoke execute on function private.equipo_texto_ok(text) from public, anon, authenticated;

create or replace function public.equipo_crear(p_nombre text, p_dias int, p_inicio date, p_whatsapp text,
  p_objetivo text, p_meta_tipo text, p_meta_valor numeric, p_premio text)
returns json language plpgsql volatile security definer set search_path = public as $$
declare
  v_yo text := private.current_username();
  v_hoy date := (now() at time zone 'America/Lima')::date;
  v_id uuid;
  v_codigo text;
  v_wa text := nullif(trim(coalesce(p_whatsapp, '')), '');
  v_apodo text := nullif(trim(coalesce(p_nombre, '')), '');
  v_premio text := nullif(trim(coalesce(p_premio, '')), '');
  v_err text;
begin
  if v_yo is null or not exists (select 1 from alumnos where username = v_yo) then return json_build_object('error', 'sin_sesion'); end if;
  if exists (select 1 from equipos where capitan = v_yo and not oficial and not cerrado) then return json_build_object('error', 'ya_capitan'); end if;
  if v_apodo ilike 'team beast%' then v_apodo := null; end if;
  if v_apodo is not null and not private.equipo_apodo_valido(v_apodo) then return json_build_object('error', 'apodo'); end if;
  if v_premio is not null and not private.equipo_texto_ok(v_premio) then return json_build_object('error', 'premio'); end if;
  if p_dias is null or p_dias < 14 or p_dias > 120 or p_inicio is null or p_inicio < v_hoy or p_inicio > v_hoy + 14 then return json_build_object('error', 'datos'); end if;
  v_err := private.equipo_meta_error(p_objetivo, p_meta_tipo, p_meta_valor, p_dias, false);
  if v_err is not null then return json_build_object('error', v_err); end if;
  if v_wa is not null and v_wa !~ '^https://chat\.whatsapp\.com/[A-Za-z0-9]+$' then return json_build_object('error', 'whatsapp'); end if;
  if (select count(*) from equipo_miembros m join equipos e on e.id = m.equipo_id where m.username = v_yo and m.activo and not e.cerrado) >= 3 then
    return json_build_object('error', 'muchos');
  end if;
  v_codigo := private.equipo_codigo_nuevo();
  insert into equipos (nombre, apodo, codigo, capitan, inicio, dias, fin, whatsapp, objetivo, meta_tipo, meta_valor, premio)
    values (private.equipo_titulo(v_yo), v_apodo, v_codigo, v_yo, p_inicio,
            case when p_dias in (14, 28, 56) then p_dias else 28 end,
            case when p_dias in (14, 28, 56) then null else p_inicio + p_dias - 1 end,
            v_wa, p_objetivo, p_meta_tipo, p_meta_valor, v_premio)
    returning id into v_id;
  insert into equipo_miembros (equipo_id, username) values (v_id, v_yo);
  return json_build_object('id', v_id, 'codigo', v_codigo);
end;
$$;

-- Programar el reto (o arrancar otro): el capitán, mientras no empieza o ya
-- terminó; el capitán del Team Beast, en cualquier momento.
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
    objetivo = p_objetivo, meta_tipo = p_meta_tipo, meta_valor = p_meta_valor, premio = v_premio
  where id = p_id;
  return json_build_object('ok', true);
end;
$$;

-- El capitán cambia el apodo, el enlace de WhatsApp y el premio.
create or replace function public.equipo_editar(p_id uuid, p_nombre text, p_whatsapp text, p_premio text)
returns json language plpgsql volatile security definer set search_path = public as $$
declare
  v_yo text := private.current_username();
  v_wa text := nullif(trim(coalesce(p_whatsapp, '')), '');
  v_apodo text := nullif(trim(coalesce(p_nombre, '')), '');
  v_premio text := nullif(trim(coalesce(p_premio, '')), '');
begin
  if not exists (select 1 from equipos where id = p_id and capitan = v_yo and not cerrado) then return json_build_object('error', 'no_capitan'); end if;
  if v_apodo ilike 'team beast%' then v_apodo := null; end if;
  if v_apodo is not null and not private.equipo_apodo_valido(v_apodo) then return json_build_object('error', 'apodo'); end if;
  if v_premio is not null and not private.equipo_texto_ok(v_premio) then return json_build_object('error', 'premio'); end if;
  if v_wa is not null and v_wa !~ '^https://chat\.whatsapp\.com/[A-Za-z0-9]+$' then return json_build_object('error', 'whatsapp'); end if;
  update equipos set whatsapp = v_wa, apodo = case when oficial then apodo else v_apodo end, premio = v_premio where id = p_id;
  return json_build_object('ok', true);
end;
$$;

-- Qué comparte cada uno de su peso en este equipo: 'nada', 'total' o
-- 'avance' (en la carrera solo 'nada' o 'avance').
create or replace function public.equipo_compartir(p_id uuid, p_nivel text)
returns json language plpgsql volatile security definer set search_path = public as $$
declare
  v_yo text := private.current_username();
  e equipos;
begin
  select * into e from equipos where id = p_id and not cerrado;
  if v_yo is null or not found or not exists (select 1 from equipo_miembros where equipo_id = p_id and username = v_yo and activo) then
    return json_build_object('error', 'no_miembro');
  end if;
  if p_nivel not in ('nada', 'total', 'avance') or (e.objetivo = 'carrera' and p_nivel = 'total') then return json_build_object('error', 'datos'); end if;
  update equipo_miembros set comparte = p_nivel where equipo_id = p_id and username = v_yo;
  return json_build_object('ok', true);
end;
$$;

-- Todo lo que se ve dentro de un equipo. Además de lo de antes: objetivo,
-- meta y cómo va, premio, y por integrante su avance de peso (kilos
-- bajados y %, nunca el peso) solo si eligió 'avance', es mayor de edad y
-- tiene pesaje inicial; "ganador" = ganó (o va ganando) la carrera.
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

-- Mis equipos, el Team Beast oficial, ánimos sin ver y mis medallas.
create or replace function public.equipo_mis()
returns json language plpgsql stable security definer set search_path = public as $$
declare
  v_yo text := private.current_username();
begin
  if v_yo is null then return json_build_object('error', 'sin_sesion'); end if;
  return json_build_object(
    'equipos', coalesce((
      select json_agg(json_build_object(
        'id', e.id, 'nombre', e.nombre, 'apodo', e.apodo, 'oficial', e.oficial, 'objetivo', e.objetivo,
        'miembros', (select count(*) from equipo_miembros x where x.equipo_id = e.id and x.activo),
        'capitan', e.capitan = v_yo
      ) order by e.oficial desc, m.unido_en)
      from equipo_miembros m join equipos e on e.id = m.equipo_id
      where m.username = v_yo and m.activo and not e.cerrado), '[]'::json),
    'oficial', (select json_build_object('id', id, 'codigo', codigo, 'miembros',
                  (select count(*) from equipo_miembros x where x.equipo_id = e.id and x.activo))
                from equipos e where oficial and not cerrado limit 1),
    'animos', (select count(*) from equipo_animos a join equipos e on e.id = a.equipo_id
               where a.para = v_yo and not a.visto and not e.cerrado),
    'medallas', coalesce((select json_agg(json_build_object('medalla', md.medalla, 'equipo', e.nombre, 'apodo', e.apodo,
                   'reto_inicio', md.reto_inicio) order by md.created_at desc)
                 from equipo_medallas md join equipos e on e.id = md.equipo_id where md.username = v_yo), '[]'::json)
  );
end;
$$;

-- Tarea diaria (api/cron/equipos-cierre.js, con la llave de servicio):
-- cierra los retos que terminaron y reparte las medallas.
--   🥇🥈🥉 los 3 con más puntos (constancia), con al menos 1 punto;
--   🏆 'meta' a todos si el equipo cumplió su meta (comer mejor o juntos);
--   🎯 'meta_personal' a quien llegó a sus kilos (meta "cada uno");
--   🏁 'carrera' al ganador de la carrera.
-- Jonah (capitán del Team Beast) no recibe medallas en su propio equipo.
-- Devuelve lo que pasó en cada equipo, para mandar los avisos.
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
      if v_gan is not null then
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

revoke execute on function public.equipo_crear(text, int, date, text, text, text, numeric, text) from public, anon;
revoke execute on function public.equipo_nuevo_reto(uuid, int, date, text, text, numeric, text) from public, anon;
revoke execute on function public.equipo_editar(uuid, text, text, text) from public, anon;
revoke execute on function public.equipo_compartir(uuid, text) from public, anon;
revoke execute on function public.equipo_cerrar_retos() from public, anon, authenticated;
grant execute on function public.equipo_crear(text, int, date, text, text, text, numeric, text) to authenticated;
grant execute on function public.equipo_nuevo_reto(uuid, int, date, text, text, numeric, text) to authenticated;
grant execute on function public.equipo_editar(uuid, text, text, text) to authenticated;
grant execute on function public.equipo_compartir(uuid, text) to authenticated;
grant execute on function public.equipo_cerrar_retos() to service_role;
