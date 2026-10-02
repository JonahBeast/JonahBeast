-- APODO DEL EQUIPO (pedido de Jonah): además del nombre automático
-- "Team Beast de Pedro", el capitán puede ponerle un apodo opcional
-- ("Los Imparables"). Se ve como "Team Beast de Pedro · Los Imparables".
-- Nueva columna equipos.apodo (de 2 a 24 letras, sin groserías ni promesas
-- de kilos). El capitán lo pone al crear el equipo y lo puede cambiar con
-- el lápiz. El Team Beast oficial no lleva apodo.
-- En equipo_crear y equipo_editar, p_nombre pasa a ser el apodo.

alter table public.equipos add column apodo text
  check (apodo is null or char_length(apodo) between 2 and 24);

create or replace function private.equipo_apodo_valido(p_apodo text)
returns boolean language sql immutable set search_path = public as $$
  select char_length(trim(coalesce(p_apodo, ''))) between 2 and 24
    and lower(p_apodo) !~ '(\mput[ao]\M|mierda|idiota|est[uú]pid|cabr[oó]n|verga|pinga|conch|maric|cojud|gil\M|imb[eé]cil|pendej|sexo|xxx|pastilla|quemador|detox|laxante|\d+\s*kg|kilos? en|adelgaz\w* r[aá]pido)'
$$;
revoke execute on function private.equipo_apodo_valido(text) from public, anon, authenticated;

create or replace function public.equipo_crear(p_nombre text, p_dias int, p_inicio date, p_whatsapp text default null)
returns json language plpgsql volatile security definer set search_path = public as $$
declare
  v_yo text := private.current_username();
  v_hoy date := (now() at time zone 'America/Lima')::date;
  v_id uuid;
  v_codigo text;
  v_wa text := nullif(trim(coalesce(p_whatsapp, '')), '');
  v_apodo text := nullif(trim(coalesce(p_nombre, '')), '');
begin
  if v_yo is null or not exists (select 1 from alumnos where username = v_yo) then return json_build_object('error', 'sin_sesion'); end if;
  if exists (select 1 from equipos where capitan = v_yo and not oficial and not cerrado) then return json_build_object('error', 'ya_capitan'); end if;
  if v_apodo ilike 'team beast%' then v_apodo := null; end if;
  if v_apodo is not null and not private.equipo_apodo_valido(v_apodo) then return json_build_object('error', 'apodo'); end if;
  if p_dias not in (14, 28, 56) or p_inicio is null or p_inicio < v_hoy or p_inicio > v_hoy + 7 then return json_build_object('error', 'datos'); end if;
  if v_wa is not null and v_wa !~ '^https://chat\.whatsapp\.com/[A-Za-z0-9]+$' then return json_build_object('error', 'whatsapp'); end if;
  if (select count(*) from equipo_miembros m join equipos e on e.id = m.equipo_id where m.username = v_yo and m.activo and not e.cerrado) >= 3 then
    return json_build_object('error', 'muchos');
  end if;
  v_codigo := private.equipo_codigo_nuevo();
  insert into equipos (nombre, apodo, codigo, capitan, inicio, dias, whatsapp)
    values (private.equipo_titulo(v_yo), v_apodo, v_codigo, v_yo, p_inicio, p_dias, v_wa) returning id into v_id;
  insert into equipo_miembros (equipo_id, username) values (v_id, v_yo);
  return json_build_object('id', v_id, 'codigo', v_codigo);
end;
$$;

create or replace function public.equipo_editar(p_id uuid, p_nombre text, p_whatsapp text)
returns json language plpgsql volatile security definer set search_path = public as $$
declare
  v_yo text := private.current_username();
  v_wa text := nullif(trim(coalesce(p_whatsapp, '')), '');
  v_apodo text := nullif(trim(coalesce(p_nombre, '')), '');
begin
  if not exists (select 1 from equipos where id = p_id and capitan = v_yo and not cerrado) then return json_build_object('error', 'no_capitan'); end if;
  if v_apodo ilike 'team beast%' then v_apodo := null; end if;
  if v_apodo is not null and not private.equipo_apodo_valido(v_apodo) then return json_build_object('error', 'apodo'); end if;
  if v_wa is not null and v_wa !~ '^https://chat\.whatsapp\.com/[A-Za-z0-9]+$' then return json_build_object('error', 'whatsapp'); end if;
  update equipos set whatsapp = v_wa, apodo = case when oficial then apodo else v_apodo end where id = p_id;
  return json_build_object('ok', true);
end;
$$;

create or replace function public.equipo_mis()
returns json language plpgsql stable security definer set search_path = public as $$
declare
  v_yo text := private.current_username();
begin
  if v_yo is null then return json_build_object('error', 'sin_sesion'); end if;
  return json_build_object(
    'equipos', coalesce((
      select json_agg(json_build_object(
        'id', e.id, 'nombre', e.nombre, 'apodo', e.apodo, 'oficial', e.oficial,
        'miembros', (select count(*) from equipo_miembros x where x.equipo_id = e.id and x.activo),
        'capitan', e.capitan = v_yo
      ) order by e.oficial desc, m.unido_en)
      from equipo_miembros m join equipos e on e.id = m.equipo_id
      where m.username = v_yo and m.activo and not e.cerrado), '[]'::json),
    'oficial', (select json_build_object('id', id, 'codigo', codigo, 'miembros',
                  (select count(*) from equipo_miembros x where x.equipo_id = e.id and x.activo))
                from equipos e where oficial and not cerrado limit 1),
    'animos', (select count(*) from equipo_animos a join equipos e on e.id = a.equipo_id
               where a.para = v_yo and not a.visto and not e.cerrado)
  );
end;
$$;

create or replace function public.equipo_por_codigo(p_codigo text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('nombre', e.nombre, 'apodo', e.apodo, 'oficial', e.oficial,
    'miembros', (select count(*) from equipo_miembros x where x.equipo_id = e.id and x.activo))
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
  v_res json;
begin
  if v_yo is null then return json_build_object('error', 'sin_sesion'); end if;
  select * into e from equipos where id = p_id;
  if not found or e.cerrado then return json_build_object('error', 'no_existe'); end if;
  if not exists (select 1 from equipo_miembros where equipo_id = p_id and username = v_yo and activo) then
    return json_build_object('error', 'no_miembro');
  end if;
  if e.oficial then
    v_inicio := date_trunc('month', v_hoy)::date;
    v_fin := (v_inicio + interval '1 month')::date - 1;
  else
    v_inicio := e.inicio;
    v_fin := e.inicio + e.dias - 1;
  end if;
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
