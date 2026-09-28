-- Prueba de Premium de 7 días (antes 15).
--
-- Cada cuenta nueva tiene 7 días de Premium: el día del registro es el día
-- 1 y el día 7 es el último (fecha_vencimiento = hoy + 6, igual que
-- TRIAL_DAYS = 7 en src/App.jsx). Al vencer ya no se bloquea: pasa a la
-- versión gratis. Solo cambia el "+ 15" por "+ 6"; el resto de la función
-- queda igual. No toca a quienes ya se registraron.

create or replace function public.handle_new_user()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_username text;
  v_base text;
  v_intento int := 0;
  v_nombre text;
  v_telefono text;
  v_ref text;
  v_fecha_nacimiento date;
begin
  v_username := nullif(trim(new.raw_user_meta_data->>'username'), '');
  if v_username is null then
    v_base := left(regexp_replace(lower(split_part(coalesce(new.email, ''), '@', 1)), '[^a-z0-9._-]', '', 'g'), 24);
    if v_base = '' then v_base := 'alumno'; end if;
    v_username := v_base;
    while exists (select 1 from profiles where lower(username) = lower(v_username))
       or exists (select 1 from alumnos where lower(username) = lower(v_username)) loop
      v_intento := v_intento + 1;
      v_username := v_base || (floor(random() * 9000) + 100)::int::text;
      if v_intento > 30 then
        v_username := v_base || right(extract(epoch from clock_timestamp())::bigint::text, 6);
        exit;
      end if;
    end loop;
  end if;
  v_nombre := coalesce(nullif(new.raw_user_meta_data->>'nombre', ''), new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '');
  v_telefono := nullif(new.raw_user_meta_data->>'telefono', '');
  v_ref := nullif(upper(trim(new.raw_user_meta_data->>'codigo_referido')), '');
  begin
    v_fecha_nacimiento := nullif(new.raw_user_meta_data->>'fecha_nacimiento', '')::date;
  exception when others then
    v_fecha_nacimiento := null;
  end;

  if v_ref is not null then
    if not exists (select 1 from referidores where upper(codigo) = v_ref and activo) then
      v_ref := null;
    end if;
  end if;

  insert into profiles (id, username, nombre, role)
  values (new.id, v_username, v_nombre, 'alumno')
  on conflict (id) do nothing;

  insert into alumnos (username, user_id, nombre, telefono, enabled, plan,
                       fecha_inicio, fecha_vencimiento, codigo_referido, fecha_nacimiento)
  values (v_username, new.id, v_nombre, v_telefono, true, 'trial',
          current_date, current_date + 6, v_ref, v_fecha_nacimiento)
  on conflict (username) do nothing;

  return new;
end;
$function$;
