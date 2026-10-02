-- EQUIPOS, ETAPA 2 (funciones): pesos, puntos, progreso de la meta, crear y
-- programar retos con objetivo y meta, compartir el avance, ver el equipo y
-- cerrar los retos que terminaron (medallas).

-- ¿Es menor de 18? (por su fecha de nacimiento o la edad que puso en la app).
create or replace function private.equipo_es_menor(p_username text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select date_part('year', age((now() at time zone 'America/Lima')::date, a.fecha_nacimiento)) < 18
       from alumnos a where a.username = p_username and a.fecha_nacimiento is not null),
    (select (d.form->>'edad')::numeric < 18 from datos_alumnos d
       where d.username = p_username and coalesce(d.form->>'edad', '') ~ '^[0-9]+(\.[0-9]+)?$'),
    false)
$$;

-- Si la meta es posible y sana para la duración del reto. Devuelve el
-- código de error o null si está bien. Como mucho 1 kg o 1% por semana
-- por persona; el Team Beast oficial solo es de "comer mejor".
create or replace function private.equipo_meta_error(p_objetivo text, p_meta_tipo text, p_meta_valor numeric, p_dias int, p_oficial boolean)
returns text language plpgsql immutable set search_path = public as $$
declare
  v_sem numeric := p_dias / 7.0;
begin
  if p_objetivo is null or p_objetivo not in ('comer', 'juntos', 'carrera') then return 'datos'; end if;
  if p_oficial and p_objetivo <> 'comer' then return 'oficial_comer'; end if;
  if p_objetivo = 'comer' then
    if p_meta_tipo is null and p_meta_valor is null then return null; end if;
    if p_meta_tipo is distinct from 'comidas' or p_meta_valor is null or p_meta_valor < 10 or p_meta_valor > 100000 then return 'meta'; end if;
    return null;
  end if;
  if p_meta_valor is null or p_meta_valor <= 0 then return 'meta'; end if;
  if p_objetivo = 'juntos' and p_meta_tipo is distinct from 'pct_total' and p_meta_tipo is distinct from 'kg_total' and p_meta_tipo is distinct from 'kg_cada' then return 'meta'; end if;
  if p_objetivo = 'carrera' and p_meta_tipo is distinct from 'carrera_kg' and p_meta_tipo is distinct from 'carrera_pct' then return 'meta'; end if;
  if p_meta_tipo in ('kg_cada', 'carrera_kg', 'pct_total', 'carrera_pct') and p_meta_valor > v_sem then return 'meta_rapida'; end if;
  if p_meta_tipo = 'kg_total' and p_meta_valor > 1000 then return 'meta'; end if;
  return null;
end;
$$;

-- Puntos de cada integrante en el reto actual (hasta hoy): ✓ = 10, – = 5.
create or replace function private.equipo_puntos(p_id uuid)
returns table (username text, puntos bigint, dias_ok bigint, comidas bigint)
language sql stable security definer set search_path = public as $$
  with e as (select inicio, coalesce(fin, inicio + dias - 1) fin from equipos where id = p_id),
       hoy as (select (now() at time zone 'America/Lima')::date d)
  select em.username,
    coalesce(sum(case when h.comidas_count >= 3 then 10 when h.comidas_count >= 1 then 5 else 0 end), 0),
    count(h.fecha) filter (where h.comidas_count >= 3),
    coalesce(sum(h.comidas_count), 0)
  from equipo_miembros em cross join e cross join hoy
  left join historial h on h.username = em.username and h.fecha between e.inicio and least(e.fin, hoy.d)
  where em.equipo_id = p_id and em.activo
  group by em.username
$$;

-- Avance de peso de cada integrante en el reto actual. base = su peso al
-- empezar (el último pesaje hasta 14 días antes del inicio o, si no hay, el
-- primero de la primera semana). perdido = kilos bajados que cuentan, con
-- el tope de 1% de su peso por semana (lo de más no suma; si sube, baja).
-- semana_llego = semana del reto en que llegó a la meta personal o de la
-- carrera. El peso solo se usa aquí adentro: hacia afuera solo salen
-- kilos bajados y porcentajes, y solo de quien eligió compartirlos.
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
        if w is not null then v_cont := least(base - w, v_cont + base * 0.01); end if;
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

-- Quienes cuentan para la meta de peso: mayores de 18 con pesaje inicial
-- que eligieron compartir ('total' o 'avance' en 'juntos'; solo 'avance'
-- en la carrera), con sus días cumplidos (para desempatar).
create or replace function private.equipo_participantes(p_id uuid)
returns table (username text, base numeric, perdido numeric, pct numeric, semana_llego int, dias_ok bigint)
language sql stable security definer set search_path = public as $$
  select p.username, p.base, p.perdido, p.pct, p.semana_llego, coalesce(q.dias_ok, 0)
  from private.equipo_pesos(p_id) p
  left join private.equipo_puntos(p_id) q on q.username = p.username
  cross join (select objetivo from equipos where id = p_id) e
  where not p.menor and p.base is not null
    and (p.comparte = 'avance' or (p.comparte = 'total' and e.objetivo = 'juntos'))
$$;

-- Cómo va la meta del equipo. ganador = username del que ganó la carrera
-- (solo para uso interno: equipo_ver lo convierte en "es él").
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
    'kg_juntos', v_kg, 'ganador', v_gan);
end;
$$;

revoke execute on function private.equipo_es_menor(text) from public, anon, authenticated;
revoke execute on function private.equipo_meta_error(text, text, numeric, int, boolean) from public, anon, authenticated;
revoke execute on function private.equipo_puntos(uuid) from public, anon, authenticated;
revoke execute on function private.equipo_pesos(uuid) from public, anon, authenticated;
revoke execute on function private.equipo_participantes(uuid) from public, anon, authenticated;
revoke execute on function private.equipo_progreso(uuid) from public, anon, authenticated;
