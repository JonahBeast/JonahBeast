-- Nombres de los equipos (pedido de Jonah): el oficial se llama
-- "Team Beast" y cada equipo de un alumno se llama solo
-- "Team Beast de [nombre del capitán]" (ej. "Team Beast de Pedro").
-- Ya no se elige el nombre al crear el equipo ni se puede cambiar. Si el
-- capitán sale, el equipo toma el nombre del nuevo capitán. Cada alumno
-- puede ser capitán de un solo equipo a la vez.

-- Primer nombre del alumno para el nombre del equipo ("Pedro").
create or replace function private.equipo_primer_nombre(p_username text)
returns text language sql stable security definer set search_path = public as $$
  select split_part(private.equipo_nombre(p_username), ' ', 1)
$$;
revoke execute on function private.equipo_primer_nombre(text) from public, anon, authenticated;

create or replace function private.equipo_titulo(p_capitan text)
returns text language sql stable security definer set search_path = public as $$
  select left('Team Beast de ' || private.equipo_primer_nombre(p_capitan), 40)
$$;
revoke execute on function private.equipo_titulo(text) from public, anon, authenticated;

update public.equipos set nombre = 'Team Beast' where oficial;
update public.equipos set nombre = private.equipo_titulo(capitan) where not oficial;

-- p_nombre se ignora (se deja para no romper versiones viejas de la app).
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
  if exists (select 1 from equipos where capitan = v_yo and not oficial and not cerrado) then return json_build_object('error', 'ya_capitan'); end if;
  if p_dias not in (14, 28, 56) or p_inicio is null or p_inicio < v_hoy or p_inicio > v_hoy + 7 then return json_build_object('error', 'datos'); end if;
  if v_wa is not null and v_wa !~ '^https://chat\.whatsapp\.com/[A-Za-z0-9]+$' then return json_build_object('error', 'whatsapp'); end if;
  if (select count(*) from equipo_miembros m join equipos e on e.id = m.equipo_id where m.username = v_yo and m.activo and not e.cerrado) >= 3 then
    return json_build_object('error', 'muchos');
  end if;
  v_codigo := private.equipo_codigo_nuevo();
  insert into equipos (nombre, codigo, capitan, inicio, dias, whatsapp)
    values (private.equipo_titulo(v_yo), v_codigo, v_yo, p_inicio, p_dias, v_wa) returning id into v_id;
  insert into equipo_miembros (equipo_id, username) values (v_id, v_yo);
  return json_build_object('id', v_id, 'codigo', v_codigo);
end;
$$;

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
    select m.username into v_siguiente from equipo_miembros m
      where m.equipo_id = p_id and m.activo
      order by exists (select 1 from equipos x where x.capitan = m.username and not x.oficial and not x.cerrado), m.unido_en
      limit 1;
    if v_siguiente is null then update equipos set cerrado = true where id = p_id;
    else update equipos set capitan = v_siguiente, nombre = private.equipo_titulo(v_siguiente) where id = p_id; end if;
  end if;
  return json_build_object('ok', true);
end;
$$;

-- El capitán solo cambia el enlace de WhatsApp (p_nombre se ignora).
create or replace function public.equipo_editar(p_id uuid, p_nombre text, p_whatsapp text)
returns json language plpgsql volatile security definer set search_path = public as $$
declare
  v_yo text := private.current_username();
  v_wa text := nullif(trim(coalesce(p_whatsapp, '')), '');
begin
  if not exists (select 1 from equipos where id = p_id and capitan = v_yo and not cerrado) then return json_build_object('error', 'no_capitan'); end if;
  if v_wa is not null and v_wa !~ '^https://chat\.whatsapp\.com/[A-Za-z0-9]+$' then return json_build_object('error', 'whatsapp'); end if;
  update equipos set whatsapp = v_wa where id = p_id;
  return json_build_object('ok', true);
end;
$$;
