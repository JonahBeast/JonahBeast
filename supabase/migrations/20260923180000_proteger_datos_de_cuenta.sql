-- Protege los datos de cuenta que un alumno no debe poder cambiarse solo.
--
-- Antes, las reglas dejaban que cada alumno editara TODA su fila en
-- "alumnos" (vencimiento, plan, add-on de fotos, descuento, comisiones...)
-- y TODO su perfil en "profiles" (incluido el rol, o sea hacerse admin, y
-- el username, o sea hacerse pasar por otro alumno).
--
-- Ahora, desde la app (roles authenticated/anon) y sin ser admin:
--   * alumnos: solo se pueden cambiar nombre, telefono, correo,
--     fecha_nacimiento y hora_recordatorio. Crear fichas no se permite
--     (las crea handle_new_user al confirmarse la cuenta).
--   * profiles: solo se puede cambiar el nombre. Crear perfiles no se
--     permite (también los crea handle_new_user).
--   * pagos: el alumno solo puede registrar pagos "pendiente" y que no
--     digan "Mercado Pago" (esos los registra el webhook). El admin
--     también puede registrar pagos (registro manual del panel).
--
-- El admin, las edge functions y los crons (llave de servicio) y la
-- función handle_new_user no pasan por estas restricciones.

-- Las funciones son SECURITY INVOKER a propósito: así current_user es el
-- rol de quien hace el cambio (authenticated, anon, service_role,
-- postgres...), no el dueño de la función.

create or replace function private.proteger_alumnos()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  libres text[] := array['nombre', 'telefono', 'correo', 'fecha_nacimiento', 'hora_recordatorio'];
begin
  if current_user not in ('authenticated', 'anon') or private.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    raise exception 'Solo el sistema puede crear fichas de alumno.' using errcode = '42501';
  end if;
  if (to_jsonb(new) - libres) is distinct from (to_jsonb(old) - libres) then
    raise exception 'No puedes cambiar ese dato de tu cuenta.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_alumnos on public.alumnos;
create trigger proteger_alumnos
  before insert or update on public.alumnos
  for each row execute function private.proteger_alumnos();

create or replace function private.proteger_profiles()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  libres text[] := array['nombre'];
begin
  if current_user not in ('authenticated', 'anon') or private.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    raise exception 'Solo el sistema puede crear perfiles.' using errcode = '42501';
  end if;
  if (to_jsonb(new) - libres) is distinct from (to_jsonb(old) - libres) then
    raise exception 'No puedes cambiar ese dato de tu perfil.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_profiles on public.profiles;
create trigger proteger_profiles
  before insert or update on public.profiles
  for each row execute function private.proteger_profiles();

drop policy if exists "alumno crea su pago" on public.pagos;
create policy "alumno crea su pago" on public.pagos
  for insert
  with check (
    (
      username = private.current_username()
      and estado = 'pendiente'
      and coalesce(metodo, '') not ilike 'mercado pago%'
    )
    or private.is_admin()
  );
