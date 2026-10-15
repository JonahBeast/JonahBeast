-- EQUIPOS: retos para SUBIR de peso (ganar músculo), pedido por Jonah el
-- 15 de octubre, junto con el nuevo "crear un reto paso a paso".
--
-- Columna nueva equipos.sentido: 'bajar' (como hasta hoy, por defecto) o
-- 'subir'. Los retos que ya existen quedan en 'bajar', sin cambios.
-- En 'subir' se cuentan los kilos ganados (equipo_pesos devuelve en
-- "perdido" el avance hacia la meta, sea bajando o subiendo). Tope sano
-- para subir: como mucho ½ kg por semana (subir más rápido es grasa, no
-- músculo), tanto en la meta como en el conteo semanal. Para subir solo
-- hay metas en kilos (cada uno, entre todos o carrera), no en %.
-- equipo_crear y equipo_nuevo_reto tienen una versión nueva con p_sentido;
-- las anteriores siguen sirviendo a la app vieja (crean retos de bajar).

alter table public.equipos
  add column sentido text not null default 'bajar' check (sentido in ('bajar', 'subir'));

-- Control de la meta con el sentido: lo de siempre y, para subir, sin %
-- y como mucho ½ kg por persona por semana.
create or replace function private.equipo_meta_error(p_objetivo text, p_meta_tipo text, p_meta_valor numeric, p_dias int, p_oficial boolean, p_sentido text)
returns text language plpgsql immutable set search_path = public as $$
declare
  v_err text := private.equipo_meta_error(p_objetivo, p_meta_tipo, p_meta_valor, p_dias, p_oficial);
begin
  if p_sentido is null or p_sentido not in ('bajar', 'subir') then return 'datos'; end if;
  if p_sentido = 'bajar' or p_objetivo = 'comer' then return v_err; end if;
  if p_oficial then return 'oficial_comer'; end if;
  if p_meta_tipo in ('pct_total', 'carrera_pct') then return 'meta'; end if;
  if v_err is not null and v_err <> 'meta_rapida' then return v_err; end if;
  if p_meta_tipo in ('kg_cada', 'carrera_kg') and p_meta_valor > p_dias / 7.0 * 0.5 then return 'meta_rapida_subir'; end if;
  return null;
end;
$$;
revoke execute on function private.equipo_meta_error(text, text, numeric, int, boolean, text) from public, anon, authenticated;

-- Avance de peso: en 'subir' cuenta lo ganado (tope ½ kg por semana); en
-- 'bajar', lo de siempre (tope 1% de su peso por semana).
create or replace function private.equipo_pesos(p_id uuid)
returns table (username text, comparte text, menor boolean, base numeric, perdido numeric, pct numeric, semana_llego int)
language plpgsql stable security definer set search_path = public as $$
declare
  e equipos;
  v_hoy date := (now() at time zone 'America/Lima')::date;
  v_fin date;
  v_sem int;
  m record;
  k int;
  w numeric;
  v_cont numeric;
begin
  select * into e from equipos where id = p_id;
  if not found then return; end if;
  v_fin := coalesce(e.fin, e.inicio + e.dias - 1);
  v_sem := greatest(0, ceil((least(v_hoy, v_fin) - e.inicio + 1) / 7.0)::int);
  for m in select em.username, em.comparte from equipo_miembros em where em.equipo_id = p_id and em.activo loop
    username := m.username;
    comparte := m.comparte;
    menor := private.equipo_es_menor(m.username);
    base := (select h.peso from historial h where h.username = m.username and h.peso > 0
               and h.fecha between e.inicio - 14 and e.inicio order by h.fecha desc limit 1);
    if base is null then
      base := (select h.peso from historial h where h.username = m.username and h.peso > 0
                 and h.fecha between e.inicio and e.inicio + 6 and h.fecha <= v_hoy order by h.fecha limit 1);
    end if;
    perdido := null; pct := null; semana_llego := null;
    if base is not null then
      v_cont := 0;
      for k in 1..v_sem loop
        w := (select h.peso from historial h where h.username = m.username and h.peso > 0
                and h.fecha between e.inicio and least(e.inicio + 7 * k - 1, v_hoy, v_fin) order by h.fecha desc limit 1);
        if w is not null then
          v_cont := case when e.sentido = 'subir' then least(w - base, v_cont + 0.5)
                         else least(base - w, v_cont + base * 0.01) end;
        end if;
        if semana_llego is null and (
             (e.meta_tipo in ('kg_cada', 'carrera_kg') and v_cont >= e.meta_valor)
          or (e.meta_tipo = 'carrera_pct' and v_cont / base * 100 >= e.meta_valor)) then
          semana_llego := k;
        end if;
      end loop;
      perdido := round(greatest(v_cont, 0), 1);
      pct := round(greatest(v_cont, 0) / base * 100, 1);
    end if;
    return next;
  end loop;
end;
$$;


-- Crear y programar retos con el sentido (bajar o subir).
create or replace function public.equipo_crear(p_nombre text, p_dias int, p_inicio date, p_whatsapp text,
  p_objetivo text, p_meta_tipo text, p_meta_valor numeric, p_premio text, p_sentido text)
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
  v_err := private.equipo_meta_error(p_objetivo, p_meta_tipo, p_meta_valor, p_dias, false, p_sentido);
  if v_err is not null then return json_build_object('error', v_err); end if;
  if v_wa is not null and v_wa !~ '^https://chat\.whatsapp\.com/[A-Za-z0-9]+$' then return json_build_object('error', 'whatsapp'); end if;
  if (select count(*) from equipo_miembros m join equipos e on e.id = m.equipo_id where m.username = v_yo and m.activo and not e.cerrado) >= 3 then
    return json_build_object('error', 'muchos');
  end if;
  v_codigo := private.equipo_codigo_nuevo();
  insert into equipos (nombre, apodo, codigo, capitan, inicio, dias, fin, whatsapp, objetivo, meta_tipo, meta_valor, premio, sentido)
    values (private.equipo_titulo(v_yo), v_apodo, v_codigo, v_yo, p_inicio,
            case when p_dias in (14, 28, 56) then p_dias else 28 end,
            case when p_dias in (14, 28, 56) then null else p_inicio + p_dias - 1 end,
            v_wa, p_objetivo, p_meta_tipo, p_meta_valor, v_premio,
            case when p_objetivo = 'comer' then 'bajar' else p_sentido end)
    returning id into v_id;
  insert into equipo_miembros (equipo_id, username) values (v_id, v_yo);
  return json_build_object('id', v_id, 'codigo', v_codigo);
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
    sentido = case when p_objetivo = 'comer' then 'bajar' else p_sentido end
  where id = p_id;
  return json_build_object('ok', true);
end;
$$;

revoke execute on function public.equipo_crear(text, int, date, text, text, text, numeric, text, text) from public, anon;
revoke execute on function public.equipo_nuevo_reto(uuid, int, date, text, text, numeric, text, text) from public, anon;
grant execute on function public.equipo_crear(text, int, date, text, text, text, numeric, text, text) to authenticated;
grant execute on function public.equipo_nuevo_reto(uuid, int, date, text, text, numeric, text, text) to authenticated;

-- equipo_ver y equipo_mis: con el sentido, para que la app muestre
-- "+2 kg" en los retos de subir.
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

create or replace function public.equipo_mis()
returns json language plpgsql stable security definer set search_path = public as $$
declare
  v_yo text := private.current_username();
begin
  if v_yo is null then return json_build_object('error', 'sin_sesion'); end if;
  return json_build_object(
    'equipos', coalesce((
      select json_agg(json_build_object(
        'id', e.id, 'nombre', e.nombre, 'apodo', e.apodo, 'oficial', e.oficial, 'objetivo', e.objetivo, 'sentido', e.sentido,
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
    'medallas', coalesce((select json_agg(json_build_object('id', md.id, 'medalla', md.medalla, 'equipo', e.nombre, 'apodo', e.apodo,
                   'oficial', e.oficial, 'objetivo', e.objetivo, 'premio', e.premio, 'equipo_id', e.id,
                   'reto_inicio', md.reto_inicio, 'entregada', md.created_at) order by md.created_at desc)
                 from equipo_medallas md join equipos e on e.id = md.equipo_id where md.username = v_yo), '[]'::json)
  );
end;
$$;
