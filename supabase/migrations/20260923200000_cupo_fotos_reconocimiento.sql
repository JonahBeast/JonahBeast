-- Cupo de fotos de reconocer-comida, reservado de forma atómica.
--
-- Antes la función leía cuántas fotos llevaba el alumno, llamaba a la IA y
-- recién al final sumaba 1. Si alguien mandaba muchas fotos al mismo
-- tiempo, todas pasaban el control antes de que se contaran.
--
-- reservar_foto_reconocimiento suma 1 solo si todavía no se llegó al
-- límite, en un único paso, y devuelve cuántas lleva ahora (o null si ya
-- no le quedan). devolver_foto_reconocimiento resta 1 si la IA falló, para
-- que el alumno no pierda esa foto.
--
-- Solo las puede usar la llave de servicio (la edge function), nunca el
-- navegador.

create or replace function public.reservar_foto_reconocimiento(p_username text, p_periodo text, p_limite integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usadas integer;
begin
  insert into fotos_reconocimiento_uso (username, periodo, usadas, updated_at)
  values (p_username, p_periodo, 1, now())
  on conflict (username, periodo) do update
    set usadas = fotos_reconocimiento_uso.usadas + 1, updated_at = now()
    where fotos_reconocimiento_uso.usadas < p_limite
  returning usadas into v_usadas;
  return v_usadas;
end;
$$;

create or replace function public.devolver_foto_reconocimiento(p_username text, p_periodo text)
returns void
language sql
security definer
set search_path = public
as $$
  update fotos_reconocimiento_uso
    set usadas = greatest(usadas - 1, 0), updated_at = now()
    where username = p_username and periodo = p_periodo;
$$;

revoke all on function public.reservar_foto_reconocimiento(text, text, integer) from public, anon, authenticated;
revoke all on function public.devolver_foto_reconocimiento(text, text) from public, anon, authenticated;
grant execute on function public.reservar_foto_reconocimiento(text, text, integer) to service_role;
grant execute on function public.devolver_foto_reconocimiento(text, text) to service_role;
