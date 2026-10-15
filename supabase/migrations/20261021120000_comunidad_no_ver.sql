-- 🙈 "No ver a esta persona" en el muro de la Comunidad (Apple lo exige
-- en apps con contenido de los usuarios, 15 de octubre). Cada alumno puede
-- dejar de ver los logros y fotos de alguien, y volver a verlos cuando
-- quiera. Además, la foto que alguien reporta ya no le vuelve a salir, y a
-- Jonah le llega un aviso con cada reporte (antes solo al segundo, cuando
-- la foto se oculta para todos) y cada vez que alguien deja de ver a otro.
--
-- Tabla nueva: comunidad_bloqueos (quién dejó de ver a quién). Nadie la
-- lee directo: solo por las funciones de abajo; el panel puede leerla.

create table public.comunidad_bloqueos (
  username text not null,
  bloqueado text not null,
  created_at timestamptz not null default now(),
  primary key (username, bloqueado),
  check (username <> bloqueado)
);
alter table public.comunidad_bloqueos enable row level security;
create policy "admin lee bloqueos" on public.comunidad_bloqueos for select using (private.is_admin());

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
      -- 🙈 Las personas que este alumno eligió no ver.
      and p.username not in (select b.bloqueado from comunidad_bloqueos b where b.username = v_yo)
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
    -- 💪 3 o más días con entreno en la semana (lunes a domingo); sale una
    -- vez por semana y se actualiza con cada entreno nuevo.
    select 'e:' || v.ref || ':' || en.lunes, 'entreno', max(en.updated_at), en.username,
           null, null, count(*)::text, en.username = v_yo, null, null, null, null, null
    from (select x.username, x.updated_at, date_trunc('week', x.fecha)::date lunes
          from entrenos x where x.fecha >= date_trunc('week', v_hoy)::date - 7) en
    join v on v.username = en.username
    group by en.username, en.lunes, v.ref
    having count(*) >= 3
    union all
    select 'f:' || f.id, 'foto', coalesce(f.revisada_at, f.created_at), f.username,
           null, null, f.frase, f.username = v_yo, null, null, f.ruta, f.plato, f.id
    from comunidad_fotos f join v on v.username = f.username
    where f.estado = 'aprobada' and coalesce(f.revisada_at, f.created_at) >= now() - interval '14 days'
      -- La foto que reportó ya no le vuelve a salir (aunque no llegue a 2 reportes).
      and not exists (select 1 from comunidad_reportes cr where cr.foto_id = f.id and cr.username = v_yo)
  )
  select coalesce(json_agg(json_build_object(
      'id', x.evento,
      'tipo', x.tipo,
      'cuando', x.cuando,
      'quien', vq.nombre,
      'autor', vq.ref,
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
    select coalesce((select json_object_agg(c.tipo, c.n) from (
               select cr2.tipo, count(*) n from comunidad_reacciones cr2
               where cr2.evento = x.evento and cr2.activo group by cr2.tipo) c), '{}'::json) cuentas,
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
    select coalesce((select json_object_agg(c.tipo, c.n) from (
               select cr2.tipo, count(*) n from comunidad_reacciones cr2
               where cr2.evento = 'a:' || a.id and cr2.activo group by cr2.tipo) c), '{}'::json) cuentas,
           coalesce(array_agg(cr.tipo) filter (where cr.username = v_yo), '{}') mias
    from comunidad_reacciones cr where cr.evento = 'a:' || a.id and cr.activo
  ) rx on true;

  return json_build_object(
    'yo', json_build_object(
      'visible', coalesce((select visible from comunidad_perfil where username = v_yo), false),
      'decidio', exists (select 1 from comunidad_perfil where username = v_yo),
      'menor', private.equipo_es_menor(v_yo),
      'nombre', case when v_yo = v_jonah then 'Jonah 🦍' else private.equipo_nombre(v_yo) end,
      'fotos_en_revision', (select count(*) from comunidad_fotos where username = v_yo and estado = 'pendiente'),
      'no_ves', coalesce((select json_agg(json_build_object(
                    'ref', private.comunidad_ref(b.bloqueado),
                    'nombre', private.equipo_nombre(b.bloqueado)) order by b.created_at desc)
                  from comunidad_bloqueos b where b.username = v_yo), '[]'::json)),
    'visibles', (select count(*) from comunidad_perfil p where p.visible and not private.equipo_es_menor(p.username)),
    'anuncios', v_anuncios,
    'eventos', v_eventos
  );
end;
$$;

-- Dejar de ver (o volver a ver) a alguien del muro, por su clave corta.
create or replace function public.comunidad_no_ver(p_ref text, p_no_ver boolean default true)
returns json language plpgsql volatile security definer set search_path = public as $$
declare
  v_yo text := private.current_username();
  v_el text;
  v_secreto text;
begin
  if v_yo is null or not exists (select 1 from alumnos where username = v_yo) then
    return json_build_object('error', 'sin_sesion');
  end if;
  select p.username into v_el from comunidad_perfil p
   where private.comunidad_ref(p.username) = p_ref limit 1;
  if v_el is null then return json_build_object('error', 'datos'); end if;
  if v_el = v_yo then return json_build_object('error', 'propio'); end if;
  if not p_no_ver then
    delete from comunidad_bloqueos where username = v_yo and bloqueado = v_el;
    return json_build_object('ok', true);
  end if;
  insert into comunidad_bloqueos (username, bloqueado) values (v_yo, v_el) on conflict do nothing;
  if found then
    begin
      select decrypted_secret into v_secreto from vault.decrypted_secrets where name = 'webhook_secret';
      if v_secreto is not null then
        perform net.http_post(
          url := 'https://jonahbeast.com/api/aviso-push',
          headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secreto),
          body := jsonb_build_object('admin', true,
            'title', 'Comunidad Beast 🙈',
            'body', private.equipo_nombre(v_yo) || ' dejó de ver a ' || private.equipo_nombre(v_el) || ' en el muro. Revisa si hubo algo raro.',
            'url', '/')
        );
      end if;
    exception when others then null;
    end;
  end if;
  return json_build_object('ok', true);
end;
$$;
revoke execute on function public.comunidad_no_ver(text, boolean) from public, anon;
grant execute on function public.comunidad_no_ver(text, boolean) to authenticated;

-- Reportar una foto: igual que antes (se oculta para todos con 2 reportes),
-- pero Jonah recibe aviso desde el primer reporte.
create or replace function public.comunidad_foto_reportar(p_id bigint)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_yo text := private.current_username();
  f comunidad_fotos;
  v_n int;
  v_secreto text;
begin
  if v_yo is null or not exists (select 1 from alumnos where username = v_yo) then
    return json_build_object('error', 'sin_sesion');
  end if;
  select * into f from comunidad_fotos where id = p_id and estado = 'aprobada';
  if not found then return json_build_object('error', 'datos'); end if;
  if f.username = v_yo then return json_build_object('error', 'propio'); end if;
  insert into comunidad_reportes (foto_id, username) values (p_id, v_yo) on conflict do nothing;
  if not found then return json_build_object('ok', true, 'ya', true); end if;
  select count(*) into v_n from comunidad_reportes where foto_id = p_id;
  update comunidad_fotos set reportes = v_n,
         estado = case when v_n >= 2 then 'oculta' else estado end
   where id = p_id;
  if v_n <= 2 then
    begin
      select decrypted_secret into v_secreto from vault.decrypted_secrets where name = 'webhook_secret';
      if v_secreto is not null then
        perform net.http_post(
          url := 'https://jonahbeast.com/api/aviso-push',
          headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secreto),
          body := jsonb_build_object('admin', true,
            'title', 'Comunidad Beast ⚠️',
            'body', case when v_n = 1
              then 'Reportaron una foto del muro. Revísala en tu panel.'
              else 'Una foto del muro recibió 2 reportes y se ocultó. Revísala en tu panel.' end,
            'url', '/')
        );
      end if;
    exception when others then null;
    end;
  end if;
  return json_build_object('ok', true);
end;
$$;
revoke execute on function public.comunidad_foto_reportar(bigint) from public, anon;
grant execute on function public.comunidad_foto_reportar(bigint) to authenticated;
