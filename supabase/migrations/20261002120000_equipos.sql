-- EQUIPOS (Etapa 1): retos en grupo, como FITIA Teams pero a lo Jonah.
--
-- - equipos: cada equipo, con su código de invitación, su capitán, su
--   reto (inicio + 14/28/56 días) y el enlace a su grupo de WhatsApp.
--   El Equipo Beast oficial (oficial = true) tiene un reto por mes
--   calendario que se arma solo ("Reto de octubre con Jonah").
-- - equipo_miembros: quién está en qué equipo. por_enlace = llegó como
--   alumno nuevo con la invitación del equipo (lo ve Jonah en el panel).
--   Quien sale del equipo queda con activo = false (no se borra).
-- - equipo_animos: los ánimos de un toque (💪 🔥 👏) entre compañeros.
--
-- Privacidad: los alumnos NO leen estas tablas directamente. Todo pasa por
-- funciones que solo muestran de cada compañero su nombre corto, sus
-- casillas ✓/–/✗ y sus puntos (nunca su peso, lo que comió ni su usuario).
-- El admin sí las lee completas para su tarjeta "Equipos".

create table public.equipos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 3 and 40),
  codigo text not null unique,
  capitan text not null,
  oficial boolean not null default false,
  inicio date not null,
  dias int not null default 28 check (dias in (14, 28, 56)),
  max_miembros int not null default 30 check (max_miembros between 2 and 1000),
  whatsapp text check (whatsapp is null or whatsapp ~ '^https://chat\.whatsapp\.com/[A-Za-z0-9]+$'),
  cerrado boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.equipo_miembros (
  equipo_id uuid not null references public.equipos(id) on delete cascade,
  username text not null,
  unido_en timestamptz not null default now(),
  por_enlace boolean not null default false,
  activo boolean not null default true,
  primary key (equipo_id, username)
);
create index equipo_miembros_username on public.equipo_miembros (username);

create table public.equipo_animos (
  id bigint generated always as identity primary key,
  equipo_id uuid not null references public.equipos(id) on delete cascade,
  de text not null,
  para text not null,
  tipo text not null check (tipo in ('vamos', 'sigue', 'bien')),
  fecha date not null default ((now() at time zone 'America/Lima')::date),
  visto boolean not null default false,
  created_at timestamptz not null default now(),
  unique (equipo_id, de, para, fecha)
);
create index equipo_animos_para on public.equipo_animos (para, visto);

alter table public.equipos enable row level security;
alter table public.equipo_miembros enable row level security;
alter table public.equipo_animos enable row level security;

create policy "admin lee equipos" on public.equipos for select using (private.is_admin());
create policy "admin actualiza equipos" on public.equipos for update using (private.is_admin());
create policy "admin lee miembros" on public.equipo_miembros for select using (private.is_admin());
create policy "admin lee animos" on public.equipo_animos for select using (private.is_admin());

-- Nombre corto que ven los compañeros: "Rosa M." (o lo que se pueda sacar
-- del usuario si no puso nombre). Nunca el usuario completo.
create or replace function private.equipo_nombre(p_username text)
returns text language sql stable security definer set search_path = public as $$
  select case
    when length(n1) >= 2 then initcap(n1) || coalesce(' ' || upper(left(nullif(n2, ''), 1)) || '.', '')
    when length(coalesce(u, '')) >= 3 then initcap(u)
    else 'Beast'
  end
  from (
    select split_part(trim(coalesce(a.nombre, '')), ' ', 1) n1,
           split_part(trim(coalesce(a.nombre, '')), ' ', 2) n2,
           substring(p_username from '^[A-Za-záéíóúñÁÉÍÓÚÑ]+') u
    from (select p_username) x left join alumnos a on a.username = p_username
  ) t
$$;

-- Nombres de equipo: sin groserías ni promesas de peso (reglas de Meta y
-- TikTok).
create or replace function private.equipo_nombre_valido(p_nombre text)
returns boolean language sql immutable set search_path = public as $$
  select char_length(trim(coalesce(p_nombre, ''))) between 3 and 40
    and lower(p_nombre) !~ '(\mput[ao]\M|mierda|idiota|est[uú]pid|cabr[oó]n|verga|pinga|conch|maric|cojud|gil\M|imb[eé]cil|pendej|sexo|xxx|pastilla|quemador|detox|laxante|\d+\s*kg|kilos? en|adelgaz\w* r[aá]pido)'
$$;

create or replace function private.equipo_codigo_nuevo()
returns text language plpgsql volatile set search_path = public as $$
declare
  v_letras text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_codigo text;
begin
  loop
    v_codigo := '';
    for i in 1..5 loop
      v_codigo := v_codigo || substr(v_letras, 1 + floor(random() * length(v_letras))::int, 1);
    end loop;
    exit when not exists (select 1 from public.equipos where codigo = v_codigo);
  end loop;
  return v_codigo;
end;
$$;

-- Mis equipos (y si ya estoy en el Equipo Beast oficial).
create or replace function public.equipo_mis()
returns json language plpgsql stable security definer set search_path = public as $$
declare
  v_yo text := private.current_username();
begin
  if v_yo is null then return json_build_object('error', 'sin_sesion'); end if;
  return json_build_object(
    'equipos', coalesce((
      select json_agg(json_build_object(
        'id', e.id, 'nombre', e.nombre, 'oficial', e.oficial,
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

-- Para la pantalla de registro de quien llega con una invitación (sin
-- sesión todavía): solo el nombre del equipo y cuántos son.
create or replace function public.equipo_por_codigo(p_codigo text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('nombre', e.nombre, 'oficial', e.oficial,
    'miembros', (select count(*) from equipo_miembros x where x.equipo_id = e.id and x.activo))
  from equipos e where e.codigo = upper(trim(p_codigo)) and not e.cerrado
$$;

create or replace function public.equipo_crear(p_nombre text, p_dias int, p_inicio date, p_whatsapp text default null)
returns json language plpgsql volatile security definer set search_path = public as $$
declare
  v_yo text := private.current_username();
  v_hoy date := (now() at time zone 'America/Lima')::date;
  v_id uuid;
  v_codigo text;
  v_wa text := nullif(trim(coalesce(p_whatsapp, '')), '');
begin
  if v_yo is null or not exists (select 1 from alumnos where username = v_yo) then return json_build_object('error', 'sin_sesion'); end if;
  if not private.equipo_nombre_valido(p_nombre) then return json_build_object('error', 'nombre'); end if;
  if p_dias not in (14, 28, 56) or p_inicio is null or p_inicio < v_hoy or p_inicio > v_hoy + 7 then return json_build_object('error', 'datos'); end if;
  if v_wa is not null and v_wa !~ '^https://chat\.whatsapp\.com/[A-Za-z0-9]+$' then return json_build_object('error', 'whatsapp'); end if;
  if (select count(*) from equipo_miembros m join equipos e on e.id = m.equipo_id where m.username = v_yo and m.activo and not e.cerrado) >= 3 then
    return json_build_object('error', 'muchos');
  end if;
  v_codigo := private.equipo_codigo_nuevo();
  insert into equipos (nombre, codigo, capitan, inicio, dias, whatsapp)
    values (trim(p_nombre), v_codigo, v_yo, p_inicio, p_dias, v_wa) returning id into v_id;
  insert into equipo_miembros (equipo_id, username) values (v_id, v_yo);
  return json_build_object('id', v_id, 'codigo', v_codigo);
end;
$$;

create or replace function public.equipo_unirse(p_codigo text, p_por_enlace boolean default false)
returns json language plpgsql volatile security definer set search_path = public as $$
declare
  v_yo text := private.current_username();
  e equipos;
  v_nuevo boolean;
begin
  if v_yo is null or not exists (select 1 from alumnos where username = v_yo) then return json_build_object('error', 'sin_sesion'); end if;
  select * into e from equipos where codigo = upper(trim(p_codigo)) and not cerrado;
  if not found then return json_build_object('error', 'no_existe'); end if;
  if exists (select 1 from equipo_miembros where equipo_id = e.id and username = v_yo and activo) then
    return json_build_object('id', e.id, 'nombre', e.nombre, 'ya', true);
  end if;
  if (select count(*) from equipo_miembros where equipo_id = e.id and activo) >= e.max_miembros then return json_build_object('error', 'lleno'); end if;
  if (select count(*) from equipo_miembros m join equipos x on x.id = m.equipo_id where m.username = v_yo and m.activo and not x.cerrado) >= 3 then
    return json_build_object('error', 'muchos');
  end if;
  -- "Llegó por la invitación": creó su cuenta hace menos de 2 días.
  select coalesce(p_por_enlace, false) and a.created_at > now() - interval '2 days' into v_nuevo
    from alumnos a where a.username = v_yo;
  insert into equipo_miembros (equipo_id, username, por_enlace) values (e.id, v_yo, coalesce(v_nuevo, false))
    on conflict (equipo_id, username) do update set activo = true, unido_en = now();
  return json_build_object('id', e.id, 'nombre', e.nombre);
end;
$$;

-- Salir de un equipo. Si sale el capitán, el más antiguo pasa a ser
-- capitán; si no queda nadie, el equipo se cierra.
create or replace function public.equipo_salir(p_id uuid)
returns json language plpgsql volatile security definer set search_path = public as $$
declare
  v_yo text := private.current_username();
  e equipos;
  v_siguiente text;
begin
  select * into e from equipos where id = p_id;
  if v_yo is null or not found then return json_build_object('error', 'no_existe'); end if;
  update equipo_miembros set activo = false where equipo_id = p_id and username = v_yo;
  if e.capitan = v_yo and not e.oficial then
    select username into v_siguiente from equipo_miembros where equipo_id = p_id and activo order by unido_en limit 1;
    if v_siguiente is null then update equipos set cerrado = true where id = p_id;
    else update equipos set capitan = v_siguiente where id = p_id; end if;
  end if;
  return json_build_object('ok', true);
end;
$$;

-- El capitán cambia el nombre o el enlace de WhatsApp.
create or replace function public.equipo_editar(p_id uuid, p_nombre text, p_whatsapp text)
returns json language plpgsql volatile security definer set search_path = public as $$
declare
  v_yo text := private.current_username();
  v_wa text := nullif(trim(coalesce(p_whatsapp, '')), '');
begin
  if not exists (select 1 from equipos where id = p_id and capitan = v_yo and not cerrado) then return json_build_object('error', 'no_capitan'); end if;
  if not private.equipo_nombre_valido(p_nombre) then return json_build_object('error', 'nombre'); end if;
  if v_wa is not null and v_wa !~ '^https://chat\.whatsapp\.com/[A-Za-z0-9]+$' then return json_build_object('error', 'whatsapp'); end if;
  update equipos set nombre = trim(p_nombre), whatsapp = v_wa where id = p_id;
  return json_build_object('ok', true);
end;
$$;

-- El capitán arranca un reto nuevo cuando terminó el anterior.
create or replace function public.equipo_nuevo_reto(p_id uuid, p_dias int, p_inicio date)
returns json language plpgsql volatile security definer set search_path = public as $$
declare
  v_yo text := private.current_username();
  v_hoy date := (now() at time zone 'America/Lima')::date;
  e equipos;
begin
  select * into e from equipos where id = p_id and capitan = v_yo and not cerrado and not oficial;
  if not found then return json_build_object('error', 'no_capitan'); end if;
  if e.inicio + e.dias - 1 >= v_hoy then return json_build_object('error', 'en_curso'); end if;
  if p_dias not in (14, 28, 56) or p_inicio is null or p_inicio < v_hoy or p_inicio > v_hoy + 7 then return json_build_object('error', 'datos'); end if;
  update equipos set inicio = p_inicio, dias = p_dias where id = p_id;
  return json_build_object('ok', true);
end;
$$;

-- Todo lo que se ve dentro de un equipo: el reto, la semana con las
-- casillas de cada uno, el ranking por puntos y los ánimos recibidos.
-- Casillas: 'ok' = 3 o más comidas registradas (10 puntos), 'medio' = 1 o 2
-- (5 puntos), 'no' = ninguna, 'hoy' = hoy todavía sin registrar,
-- 'futuro' = aún no llega, 'fuera' = fuera del reto.
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

create or replace function public.equipo_animos_vistos(p_id uuid)
returns void language sql volatile security definer set search_path = public as $$
  update equipo_animos set visto = true
  where equipo_id = p_id and para = private.current_username() and not visto
$$;

-- Ánimo de un toque a un compañero (uno por compañero por día). Le llega
-- como aviso al celular, como mucho 3 ánimos con aviso al día.
create or replace function public.equipo_animar(p_id uuid, p_ref text, p_tipo text)
returns json language plpgsql volatile security definer set search_path = public as $$
declare
  v_yo text := private.current_username();
  v_hoy date := (now() at time zone 'America/Lima')::date;
  e equipos;
  v_para text;
  v_secreto text;
  v_de text;
  v_texto text;
begin
  select * into e from equipos where id = p_id and not cerrado;
  if v_yo is null or not found or not exists (select 1 from equipo_miembros where equipo_id = p_id and username = v_yo and activo) then
    return json_build_object('error', 'no_miembro');
  end if;
  if p_tipo not in ('vamos', 'sigue', 'bien') then return json_build_object('error', 'datos'); end if;
  select username into v_para from equipo_miembros
    where equipo_id = p_id and activo and left(md5(p_id::text || username), 12) = p_ref;
  if v_para is null or v_para = v_yo then return json_build_object('error', 'datos'); end if;
  insert into equipo_animos (equipo_id, de, para, tipo) values (p_id, v_yo, v_para, p_tipo)
    on conflict (equipo_id, de, para, fecha) do nothing;
  if not found then return json_build_object('ya', true); end if;

  if (select count(*) from equipo_animos where para = v_para and fecha = v_hoy) <= 3 then
    begin
      select decrypted_secret into v_secreto from vault.decrypted_secrets where name = 'webhook_secret';
      v_de := case when e.oficial and v_yo = e.capitan then 'Jonah 🦍' else private.equipo_nombre(v_yo) end;
      v_texto := case p_tipo when 'vamos' then '💪 ¡Vamos!' when 'sigue' then '🔥 ¡Sigue así!' else '👏 ¡Bien ahí!' end;
      if v_secreto is not null then
        perform net.http_post(
          url := 'https://jonahbeast.com/api/aviso-push',
          headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secreto),
          body := jsonb_build_object('usernames', jsonb_build_array(v_para),
            'title', left(e.nombre, 40),
            'body', v_de || ' te mandó ánimo: ' || v_texto,
            'url', '/?ir=equipo')
        );
      end if;
    exception when others then null;
    end;
  end if;
  return json_build_object('ok', true);
end;
$$;

revoke execute on function private.equipo_nombre(text) from public, anon, authenticated;
revoke execute on function private.equipo_nombre_valido(text) from public, anon, authenticated;
revoke execute on function private.equipo_codigo_nuevo() from public, anon, authenticated;
revoke execute on function public.equipo_mis() from public, anon;
revoke execute on function public.equipo_crear(text, int, date, text) from public, anon;
revoke execute on function public.equipo_unirse(text, boolean) from public, anon;
revoke execute on function public.equipo_salir(uuid) from public, anon;
revoke execute on function public.equipo_editar(uuid, text, text) from public, anon;
revoke execute on function public.equipo_nuevo_reto(uuid, int, date) from public, anon;
revoke execute on function public.equipo_ver(uuid, date) from public, anon;
revoke execute on function public.equipo_animos_vistos(uuid) from public, anon;
revoke execute on function public.equipo_animar(uuid, text, text) from public, anon;
grant execute on function public.equipo_mis() to authenticated;
grant execute on function public.equipo_crear(text, int, date, text) to authenticated;
grant execute on function public.equipo_unirse(text, boolean) to authenticated;
grant execute on function public.equipo_salir(uuid) to authenticated;
grant execute on function public.equipo_editar(uuid, text, text) to authenticated;
grant execute on function public.equipo_nuevo_reto(uuid, int, date) to authenticated;
grant execute on function public.equipo_ver(uuid, date) to authenticated;
grant execute on function public.equipo_animos_vistos(uuid) to authenticated;
grant execute on function public.equipo_animar(uuid, text, text) to authenticated;
grant execute on function public.equipo_por_codigo(text) to anon, authenticated;

-- El Equipo Beast oficial, con Jonah de capitán (su cuenta de alumno).
insert into public.equipos (nombre, codigo, capitan, oficial, inicio, dias, max_miembros)
values ('Equipo Beast', 'BEAST', 'martin', true, date '2026-10-01', 28, 1000);
insert into public.equipo_miembros (equipo_id, username)
select id, 'martin' from public.equipos where codigo = 'BEAST';
