-- Código del live con premio de Premium.
--
-- En el panel, junto al código del live (config 'access_code'), Jonah
-- elige el premio ('access_code_dias': 0, 7, 15 o 30 días de Premium extra)
-- y hasta qué día vale ('access_code_hasta', fecha de Lima, inclusive;
-- vacío = sin fecha). Ya no desbloquea el % de grasa (eso va por WhatsApp).
--
-- 1. validar_codigo_live: la web solo pregunta si el código es válido y la
--    base responde sí/no y los días (el código deja de ser legible sin ser
--    admin en la migración siguiente, que se aplica después del merge).
-- 2. canjear_codigo_live: el alumno recién registrado (cuenta de hace 3
--    días o menos, en prueba) suma los días a su prueba una sola vez. Cada
--    canje queda en embudo_landing_eventos (evento 'codigo_live_canje',
--    detalle 'CODIGO:días') para verlo en el panel.
-- No crea tablas ni columnas y no toca a quienes ya están registrados.

-- Eventos del embudo que la app ya envía pero la base rechazaba (la lista
-- permitida no se había actualizado): prueba de la foto (demo_*), recorrido
-- y calculadora. Se suma el canje del código del live, que solo puede
-- escribir canjear_codigo_live (no la web ni la app directamente).
alter table public.embudo_landing_eventos drop constraint if exists embudo_landing_eventos_evento_check;
alter table public.embudo_landing_eventos add constraint embudo_landing_eventos_evento_check
  check (evento in ('vista', 'clic_cta', 'registro', 'error_registro', 'vio_planes', 'eligio_plan', 'eligio_metodo', 'pago_enviado',
                    'demo_abrir', 'demo_foto', 'demo_resultado', 'demo_limite',
                    'recorrido', 'recorrido_plan', 'recorrido_cuenta', 'recorrido_whatsapp',
                    'calculadora_resultados', 'calculadora_whatsapp', 'calculadora_codigo', 'codigo_live_canje'));
drop policy if exists insertar_publico on public.embudo_landing_eventos;
create policy insertar_publico on public.embudo_landing_eventos for insert to anon with check (evento <> 'codigo_live_canje');
drop policy if exists insertar_autenticado on public.embudo_landing_eventos;
create policy insertar_autenticado on public.embudo_landing_eventos for insert to authenticated with check (evento <> 'codigo_live_canje');

create or replace function public.codigo_live_vigente(p_codigo text)
 returns integer
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  -- Días de premio si el código es el vigente; null si no vale.
  select case
    when coalesce(trim(p_codigo), '') = '' then null
    when upper(trim(p_codigo)) <> upper(trim(coalesce((select value from config where key = 'access_code'), ''))) then null
    when nullif((select value from config where key = 'access_code_hasta'), '') is not null
         and (now() at time zone 'America/Lima')::date > (select value from config where key = 'access_code_hasta')::date then null
    else greatest(0, least(60, coalesce(nullif((select value from config where key = 'access_code_dias'), '')::int, 0)))
  end;
$function$;
revoke all on function public.codigo_live_vigente(text) from public, anon, authenticated;

create or replace function public.validar_codigo_live(p_codigo text)
 returns json
 language plpgsql
 stable
 security definer
 set search_path to 'public'
as $function$
declare v_dias int;
begin
  v_dias := codigo_live_vigente(p_codigo);
  return json_build_object('valido', v_dias is not null, 'dias', coalesce(v_dias, 0));
end;
$function$;
grant execute on function public.validar_codigo_live(text) to anon, authenticated;

create or replace function public.canjear_codigo_live(p_codigo text)
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_dias int;
  v_alumno alumnos%rowtype;
  v_codigo text := upper(trim(coalesce(p_codigo, '')));
begin
  if auth.uid() is null then return json_build_object('estado', 'sin_sesion'); end if;
  v_dias := codigo_live_vigente(v_codigo);
  if v_dias is null then return json_build_object('estado', 'invalido'); end if;
  if v_dias = 0 then return json_build_object('estado', 'sin_premio'); end if;

  select * into v_alumno from alumnos where user_id = auth.uid() for update;
  if not found then return json_build_object('estado', 'sin_cuenta'); end if;
  if v_alumno.plan <> 'trial' or v_alumno.created_at < now() - interval '3 days' then
    return json_build_object('estado', 'cuenta_antigua');
  end if;
  if exists (select 1 from embudo_landing_eventos where evento = 'codigo_live_canje' and username = v_alumno.username) then
    return json_build_object('estado', 'ya_usado');
  end if;

  update alumnos set fecha_vencimiento = greatest(coalesce(fecha_vencimiento, current_date), current_date) + v_dias
   where username = v_alumno.username;
  insert into embudo_landing_eventos (evento, fuente, username, detalle)
  values ('codigo_live_canje', 'app', v_alumno.username, v_codigo || ':' || v_dias);
  return json_build_object('estado', 'ok', 'dias', v_dias);
end;
$function$;
revoke all on function public.canjear_codigo_live(text) from public, anon;
grant execute on function public.canjear_codigo_live(text) to authenticated;
