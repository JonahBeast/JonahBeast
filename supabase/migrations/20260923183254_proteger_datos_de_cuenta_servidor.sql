-- Arreglo de 20260923180000_proteger_datos_de_cuenta.sql.
--
-- Los triggers revisaban "current_user not in ('authenticated','anon') or
-- private.is_admin()" en una sola condición. Postgres no garantiza el orden
-- en que evalúa un OR, y la llave de servicio (edge functions, crons) no
-- tiene acceso al esquema private: al llegar a private.is_admin() fallaba
-- con "permission denied for schema private". Resultado: el servidor no
-- podía cambiar fichas de alumnos (por ejemplo, el webhook no extendía el
-- add-on de fotos después de un pago aprobado).
--
-- Ahora el rol se revisa primero, en su propio IF, y private.is_admin()
-- solo se consulta para los roles de la app. Las reglas para alumnos no
-- cambian.

create or replace function private.proteger_alumnos()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  libres text[] := array['nombre', 'telefono', 'correo', 'fecha_nacimiento', 'hora_recordatorio'];
begin
  -- Primero el rol, en su propio IF: la llave de servicio no tiene acceso
  -- al esquema private, así que private.is_admin() solo se consulta para
  -- los roles de la app.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if private.is_admin() then
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

create or replace function private.proteger_profiles()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  libres text[] := array['nombre'];
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if private.is_admin() then
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
