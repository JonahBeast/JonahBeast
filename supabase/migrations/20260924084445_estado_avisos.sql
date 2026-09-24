-- Estado de los avisos (notificaciones) de cada alumno, para saber por
-- qué no los recibe: activo, iphone_sin_instalar, bloqueado,
-- no_activados o no_compatible. Lo anota la propia app al abrirse,
-- solo para el alumno con la sesión iniciada.
alter table public.alumnos
  add column if not exists estado_avisos text,
  add column if not exists estado_avisos_en timestamptz;

create or replace function public.registrar_estado_avisos(p_estado text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user text := private.current_username();
begin
  if v_user is null then return; end if;
  if p_estado not in ('activo', 'iphone_sin_instalar', 'bloqueado', 'no_activados', 'no_compatible') then
    raise exception 'Estado no válido' using errcode = '22023';
  end if;
  update alumnos set estado_avisos = p_estado, estado_avisos_en = now()
  where username = v_user
    and (estado_avisos is distinct from p_estado or estado_avisos_en is null or estado_avisos_en < now() - interval '1 day');
end;
$$;

revoke all on function public.registrar_estado_avisos(text) from public, anon;
grant execute on function public.registrar_estado_avisos(text) to authenticated;
