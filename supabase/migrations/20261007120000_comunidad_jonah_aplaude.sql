-- COMUNIDAD: Jonah aplaude desde su panel y la app invita a aparecer en
-- el muro en el momento del logro.
--
-- - El muro y las reacciones pasan a funciones internas que reciben "quién
--   mira / quién reacciona". El alumno las usa con su sesión (igual que
--   antes); el admin, como la cuenta de alumno de Jonah (el capitán del Team
--   Beast oficial), así al alumno le llega "Jonah 🦍 reaccionó 🔥 a tu logro".
-- - comunidad_novedades además dice si el alumno aparece en el muro y si
--   está en el Team Beast (para las tarjetas de Inicio).
-- No cambia tablas.

create or replace function private.comunidad_muro_de(p_yo text)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  v_yo text := p_yo;
  v_hoy date := (now() at time zone 'America/Lima')::date;
  v_jonah text := (select capitan from equipos where oficial and not cerrado order by created_at limit 1);
  v_eventos json;
  v_anuncios json;
begin
  if v_yo is null then return json_build_object('error', 'sin_sesion'); end if;

  with v as (
    select p.username,
           case when p.username = v_jonah then 'Jonah 🦍' else private.equipo_nombre(p.username) end nombre,
           private.comunidad_ref(p.username) ref
    from comunidad_perfil p
    where p.visible and not private.equipo_es_menor(p.username)
  ), h as (
    select hi.username, hi.fecha,
           least(hi.updated_at, ((hi.fecha + 1)::timestamp at time zone 'America/Lima') - interval '1 minute') cuando
    from historial hi join v on v.username = hi.username
    where hi.fecha between v_hoy - 120 and v_hoy and coalesce(hi.comidas_count, 0) > 0
  ), g as (
    select h.*, h.fecha - (row_number() over (partition by h.username order by h.fecha))::int grupo from h
  ), r as (
    select g.*, row_number() over (partition by g.username, g.grupo order by g.fecha) racha from g
  ), ev as (
    select 'm:' || md.id evento, 'medalla' tipo, md.created_at cuando, md.username quien,
           null::text[] nombres, null::int total, md.medalla detalle, md.username = v_yo yo,
           e.oficial, e.apodo, null::text ruta, null::text plato, null::bigint foto_id
    from equipo_medallas md join equipos e on e.id = md.equipo_id
    where md.medalla <> 'meta' and md.created_at >= now() - interval '14 days'
      and md.username in (select username from v)
    union all
    select 'g:' || md.equipo_id || ':' || md.reto_inicio, 'meta_equipo', min(md.created_at), null,
           (array_agg(v.nombre order by v.nombre) filter (where v.username is not null))[1:3],
           count(*)::int, null, bool_or(md.username = v_yo), e.oficial, e.apodo, null, null, null
    from equipo_medallas md join equipos e on e.id = md.equipo_id
    left join v on v.username = md.username
    where md.medalla = 'meta' and md.created_at >= now() - interval '14 days'
    group by md.equipo_id, md.reto_inicio, e.oficial, e.apodo
    having count(v.username) > 0
    union all
    select 'r:' || v.ref || ':' || r.fecha, 'racha', r.cuando + interval '1 second', r.username,
           null, null, r.racha::text, r.username = v_yo, null, null, null, null, null
    from r join v on v.username = r.username
    where r.fecha >= v_hoy - 13 and r.racha in (7, 14, 21, 30, 60, 90)
    union all
    select 'u:' || v.ref || ':' || e.id, 'team_beast', m.unido_en, m.username,
           null, null, null, m.username = v_yo, true, null, null, null, null
    from equipo_miembros m
    join equipos e on e.id = m.equipo_id and e.oficial and not e.cerrado
    join v on v.username = m.username
    where m.activo and m.unido_en >= now() - interval '14 days' and m.username <> e.capitan
    union all
    select 'f:' || f.id, 'foto', coalesce(f.revisada_at, f.created_at), f.username,
           null, null, f.frase, f.username = v_yo, null, null, f.ruta, f.plato, f.id
    from comunidad_fotos f join v on v.username = f.username
    where f.estado = 'aprobada' and coalesce(f.revisada_at, f.created_at) >= now() - interval '14 days'
  )
  select coalesce(json_agg(json_build_object(
      'id', x.evento,
      'tipo', x.tipo,
      'cuando', x.cuando,
      'quien', vq.nombre,
      'nombres', x.nombres,
      'total', x.total,
      'detalle', x.detalle,
      'yo', x.yo,
      'oficial', x.oficial,
      'apodo', x.apodo,
      'ruta', x.ruta,
      'plato', x.plato,
      'foto_id', x.foto_id,
      'reacciones', rx.cuentas,
      'mias', rx.mias
    ) order by x.cuando desc), '[]'::json)
  into v_eventos
  from (select * from ev order by cuando desc limit 60) x
  left join v vq on vq.username = x.quien
  left join lateral (
    select json_build_object(
             'fuego', count(*) filter (where cr.tipo = 'fuego'),
             'fuerza', count(*) filter (where cr.tipo = 'fuerza'),
             'aplauso', count(*) filter (where cr.tipo = 'aplauso')) cuentas,
           coalesce(array_agg(cr.tipo) filter (where cr.username = v_yo), '{}') mias
    from comunidad_reacciones cr where cr.evento = x.evento and cr.activo
  ) rx on true;

  select coalesce(json_agg(json_build_object(
      'id', 'a:' || a.id,
      'texto', a.texto,
      'fijado', a.fijado,
      'cuando', a.created_at,
      'equipo', case when e.id is null then null else json_build_object(
                  'codigo', e.codigo, 'nombre', e.nombre, 'apodo', e.apodo, 'oficial', e.oficial,
                  'soy_miembro', exists (select 1 from equipo_miembros em where em.equipo_id = e.id and em.username = v_yo and em.activo)) end,
      'reacciones', rx.cuentas,
      'mias', rx.mias
    ) order by a.fijado desc, a.created_at desc), '[]'::json)
  into v_anuncios
  from (select * from comunidad_anuncios
        where activo and (fijado or created_at >= now() - interval '30 days')
        order by fijado desc, created_at desc limit 10) a
  left join equipos e on e.codigo = a.codigo and not e.cerrado
  left join lateral (
    select json_build_object(
             'fuego', count(*) filter (where cr.tipo = 'fuego'),
             'fuerza', count(*) filter (where cr.tipo = 'fuerza'),
             'aplauso', count(*) filter (where cr.tipo = 'aplauso')) cuentas,
           coalesce(array_agg(cr.tipo) filter (where cr.username = v_yo), '{}') mias
    from comunidad_reacciones cr where cr.evento = 'a:' || a.id and cr.activo
  ) rx on true;

  return json_build_object(
    'yo', json_build_object(
      'visible', coalesce((select visible from comunidad_perfil where username = v_yo), false),
      'decidio', exists (select 1 from comunidad_perfil where username = v_yo),
      'menor', private.equipo_es_menor(v_yo),
      'nombre', case when v_yo = v_jonah then 'Jonah 🦍' else private.equipo_nombre(v_yo) end,
      'fotos_en_revision', (select count(*) from comunidad_fotos where username = v_yo and estado = 'pendiente')),
    'visibles', (select count(*) from comunidad_perfil p where p.visible and not private.equipo_es_menor(p.username)),
    'anuncios', v_anuncios,
    'eventos', v_eventos
  );
end;
$$;

create or replace function private.comunidad_reaccionar_como(p_yo text, p_evento text, p_tipo text)
returns json language plpgsql volatile security definer set search_path = public as $$
declare
  v_yo text := p_yo;
  v_jonah text := (select capitan from equipos where oficial and not cerrado order by created_at limit 1);
  v_p text[] := string_to_array(coalesce(p_evento, ''), ':');
  v_para text;
  v_ok boolean := false;
  v_activo boolean;
  v_nuevo boolean;
  v_secreto text;
  v_de text;
  v_emoji text;
begin
  if v_yo is null then return json_build_object('error', 'sin_sesion'); end if;
  if p_tipo is null or p_tipo not in ('fuego', 'fuerza', 'aplauso') or char_length(coalesce(p_evento, '')) > 80 then
    return json_build_object('error', 'datos');
  end if;

  if v_p[1] = 'm' and array_length(v_p, 1) = 2 and v_p[2] ~ '^[0-9]{1,18}$' then
    select md.username into v_para from equipo_medallas md where md.id = v_p[2]::bigint and md.medalla <> 'meta';
    v_ok := v_para is not null and private.comunidad_visible(v_para);
  elsif v_p[1] = 'f' and array_length(v_p, 1) = 2 and v_p[2] ~ '^[0-9]{1,18}$' then
    select f.username into v_para from comunidad_fotos f where f.id = v_p[2]::bigint and f.estado = 'aprobada';
    v_ok := v_para is not null and private.comunidad_visible(v_para);
  elsif v_p[1] = 'g' and array_length(v_p, 1) = 3
        and v_p[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and v_p[3] ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    v_ok := exists (select 1 from equipo_medallas where equipo_id = v_p[2]::uuid and reto_inicio = v_p[3]::date and medalla = 'meta');
  elsif v_p[1] in ('r', 'u') and array_length(v_p, 1) = 3 and v_p[2] ~ '^[0-9a-f]{12}$' then
    select p.username into v_para from comunidad_perfil p where p.visible and private.comunidad_ref(p.username) = v_p[2];
    v_ok := v_para is not null and private.comunidad_visible(v_para);
  elsif v_p[1] = 'a' and array_length(v_p, 1) = 2 and v_p[2] ~ '^[0-9]{1,18}$' then
    v_ok := exists (select 1 from comunidad_anuncios where id = v_p[2]::bigint and activo);
  end if;
  if not v_ok then return json_build_object('error', 'datos'); end if;
  if v_para = v_yo then return json_build_object('error', 'propio'); end if;

  insert into comunidad_reacciones (evento, username, tipo, para) values (p_evento, v_yo, p_tipo, v_para)
    on conflict (evento, username, tipo) do update
      set activo = not comunidad_reacciones.activo, updated_at = now()
    returning activo, (xmax = 0) into v_activo, v_nuevo;

  if v_nuevo and v_para is not null and (
       select count(*) from comunidad_reacciones
       where para = v_para and created_at >= ((now() at time zone 'America/Lima')::date::timestamp at time zone 'America/Lima')) <= 3 then
    begin
      select decrypted_secret into v_secreto from vault.decrypted_secrets where name = 'webhook_secret';
      v_de := case when v_yo = v_jonah then 'Jonah 🦍' else private.equipo_nombre(v_yo) end;
      v_emoji := case p_tipo when 'fuego' then '🔥' when 'fuerza' then '💪' else '👏' end;
      if v_secreto is not null then
        perform net.http_post(
          url := 'https://jonahbeast.com/api/aviso-push',
          headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secreto),
          body := jsonb_build_object('usernames', jsonb_build_array(v_para),
            'title', 'Comunidad Beast 🦍',
            'body', v_de || ' reaccionó ' || v_emoji || case when v_p[1] = 'f' then ' a la foto de tu plato.' else ' a tu logro.' end || ' ¡Sigue así!',
            'url', '/?ir=comunidad')
        );
      end if;
    exception when others then null;
    end;
  end if;
  return json_build_object('ok', true, 'activo', v_activo);
end;
$$;

create or replace function public.comunidad_muro()
returns json language plpgsql stable security definer set search_path = public as $$
declare
  v_yo text := private.current_username();
begin
  if v_yo is null or not exists (select 1 from alumnos where username = v_yo) then
    return json_build_object('error', 'sin_sesion');
  end if;
  return private.comunidad_muro_de(v_yo);
end;
$$;

create or replace function public.comunidad_reaccionar(p_evento text, p_tipo text)
returns json language plpgsql volatile security definer set search_path = public as $$
declare
  v_yo text := private.current_username();
begin
  if v_yo is null or not exists (select 1 from alumnos where username = v_yo) then
    return json_build_object('error', 'sin_sesion');
  end if;
  return private.comunidad_reaccionar_como(v_yo, p_evento, p_tipo);
end;
$$;

-- Panel de Jonah: el muro y las reacciones como su cuenta de alumno.
create or replace function public.comunidad_admin_muro()
returns json language plpgsql stable security definer set search_path = public as $$
declare
  v_jonah text := (select capitan from equipos where oficial and not cerrado order by created_at limit 1);
begin
  if not private.is_admin() then return json_build_object('error', 'no_admin'); end if;
  if v_jonah is null then return json_build_object('error', 'sin_cuenta'); end if;
  return private.comunidad_muro_de(v_jonah);
end;
$$;

create or replace function public.comunidad_admin_reaccionar(p_evento text, p_tipo text)
returns json language plpgsql volatile security definer set search_path = public as $$
declare
  v_jonah text := (select capitan from equipos where oficial and not cerrado order by created_at limit 1);
begin
  if not private.is_admin() then return json_build_object('error', 'no_admin'); end if;
  if v_jonah is null then return json_build_object('error', 'sin_cuenta'); end if;
  return private.comunidad_reaccionar_como(v_jonah, p_evento, p_tipo);
end;
$$;

-- Último anuncio de Jonah y, del alumno, si aparece en el muro y si está en
-- el Team Beast (tarjetas de Inicio).
create or replace function public.comunidad_novedades()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'ultimo_anuncio', (select max(created_at) from comunidad_anuncios where activo),
    'visible', coalesce((select visible from comunidad_perfil where username = private.current_username()), false),
    'menor', coalesce(private.equipo_es_menor(private.current_username()), false),
    'oficial', (select json_build_object('codigo', e.codigo, 'miembros',
                  (select count(*) from equipo_miembros x where x.equipo_id = e.id and x.activo),
                  'soy_miembro', exists (select 1 from equipo_miembros x where x.equipo_id = e.id and x.activo
                                           and x.username = private.current_username()))
                from equipos e where e.oficial and not e.cerrado order by e.created_at limit 1))
$$;

revoke execute on function private.comunidad_muro_de(text) from public, anon, authenticated;
revoke execute on function private.comunidad_reaccionar_como(text, text, text) from public, anon, authenticated;
revoke execute on function public.comunidad_admin_muro() from public, anon;
revoke execute on function public.comunidad_admin_reaccionar(text, text) from public, anon;
grant execute on function public.comunidad_admin_muro() to authenticated;
grant execute on function public.comunidad_admin_reaccionar(text, text) to authenticated;
