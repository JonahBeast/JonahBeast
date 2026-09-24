-- "Invita a un amigo": cada alumno puede tener su propio código.
--
-- Se reutiliza la tabla de embajadores (referidores) con tipo 'alumno':
--  * el amigo que se registra con el código recibe el mismo descuento que
--    ya aplican las funciones de pago (descuento_pct = 10), y
--  * no hay comisión en dinero (comision_pct 0 y sin tabla por plan).
-- Cuando el amigo paga su primer plan, el alumno que lo invitó recibe
-- +15 días (una sola vez por amigo) y un aviso en su celular.
--
-- El secreto del aviso (x-webhook-secret) se lee de Vault
-- ('webhook_secret'), no se guarda en este archivo.

alter table public.referidores add column if not exists username text;
create unique index if not exists referidores_username_unico
  on public.referidores (username) where username is not null;

-- Devuelve (y crea la primera vez) el código del alumno con sesión,
-- junto con cuántos amigos se registraron y cuántos ya le dieron premio.
create or replace function public.mi_codigo_invitacion()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user text := private.current_username();
  v_nombre text;
  v_telefono text;
  v_codigo text;
  v_base text;
  v_intentos int := 0;
begin
  if v_user is null then
    raise exception 'Inicia sesión para invitar.' using errcode = '42501';
  end if;

  select codigo into v_codigo from referidores where username = v_user;

  if v_codigo is null then
    select nombre, telefono into v_nombre, v_telefono from alumnos where username = v_user;
    if not found then
      raise exception 'Solo los alumnos pueden invitar.' using errcode = '42501';
    end if;
    -- Código legible: el primer nombre (o el usuario) en mayúsculas, sin
    -- tildes ni símbolos. Si ya existe, se le agregan dos números.
    v_base := upper(regexp_replace(
      translate(coalesce(nullif(split_part(trim(coalesce(v_nombre, '')), ' ', 1), ''), v_user),
        'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN'),
      '[^A-Za-z0-9]', '', 'g'));
    v_base := left(v_base, 12);
    if length(v_base) < 3 then v_base := 'AMIGO'; end if;
    v_codigo := v_base;
    while exists (select 1 from referidores where upper(codigo) = v_codigo) loop
      v_intentos := v_intentos + 1;
      v_codigo := v_base || (10 + floor(random() * 90))::int;
      if v_intentos > 20 then v_codigo := v_base || floor(random() * 1000000)::int; end if;
    end loop;

    insert into referidores (codigo, nombre, telefono, tipo, activo, descuento_pct,
                             comision, comision_pct, comision_1, comision_3, comision_6, comision_12,
                             token, username, nota)
    values (v_codigo, coalesce(nullif(v_nombre, ''), v_user), v_telefono, 'alumno', true, 10,
            0, 0, null, null, null, null,
            lower(v_codigo) || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 10),
            v_user, 'Invita a un amigo (creado por el alumno)');
  end if;

  return json_build_object(
    'codigo', v_codigo,
    'registrados', (select count(*) from alumnos where upper(codigo_referido) = upper(v_codigo)),
    'premiados', (select count(*) from ajustes_membresia where username = v_user and motivo like 'Invitación: %')
  );
end;
$$;

revoke execute on function public.mi_codigo_invitacion() from public, anon;
grant execute on function public.mi_codigo_invitacion() to authenticated;

-- Premio al que invitó: cuando se aprueba el PRIMER pago de plan (no del
-- add-on de fotos) de un alumno que llegó con código de otro alumno.
create or replace function private.premiar_invitacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_codigo text;
  v_invito text;
  v_nueva date;
  v_secreto text;
begin
  if not (new.estado = 'aprobado' and (tg_op = 'INSERT' or old.estado is distinct from 'aprobado')) then
    return new;
  end if;
  if coalesce(new.metodo, '') ilike '%add-on%' then return new; end if;
  if exists (select 1 from pagos p
             where p.username = new.username and p.estado = 'aprobado' and p.id <> new.id
               and coalesce(p.metodo, '') not ilike '%add-on%') then
    return new;
  end if;

  select codigo_referido into v_codigo from alumnos where username = new.username;
  if v_codigo is null then return new; end if;

  select username into v_invito from referidores
  where upper(codigo) = upper(v_codigo) and tipo = 'alumno'
    and username is not null and username <> new.username;
  if v_invito is null then return new; end if;

  -- Una sola vez por amigo.
  if exists (select 1 from ajustes_membresia
             where username = v_invito and motivo = 'Invitación: ' || new.username) then
    return new;
  end if;

  update alumnos
     set fecha_vencimiento = greatest(coalesce(fecha_vencimiento, current_date), current_date) + 15
   where username = v_invito
   returning fecha_vencimiento into v_nueva;
  if v_nueva is null then return new; end if;

  insert into ajustes_membresia (username, dias, motivo, fecha_resultante)
  values (v_invito, 15, 'Invitación: ' || new.username, v_nueva);

  -- Aviso al celular del que invitó (si falla, el premio igual queda).
  begin
    select decrypted_secret into v_secreto from vault.decrypted_secrets where name = 'webhook_secret';
    if v_secreto is not null then
      perform net.http_post(
        url := 'https://jonahbeast.com/api/premio-invitacion',
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secreto),
        body := jsonb_build_object('username', v_invito, 'amigo', new.username)
      );
    end if;
  exception when others then null;
  end;

  return new;
end;
$$;

drop trigger if exists premiar_invitacion on public.pagos;
create trigger premiar_invitacion
  after insert or update of estado on public.pagos
  for each row execute function private.premiar_invitacion();
