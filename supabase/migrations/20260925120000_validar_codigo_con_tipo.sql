-- validar_codigo también devuelve el tipo del código (alumno, embajador,
-- influencer). La app lo usa para saber si el descuento es solo para el
-- primer plan ("Invita a un amigo", tipo alumno) o para todos los planes
-- (embajadores e influencers), igual que las funciones de pago.
create or replace function public.validar_codigo(p_codigo text)
returns json
language sql
stable security definer
set search_path to 'public'
as $function$
  select case when count(*) = 0 then json_build_object('ok', false)
    else json_build_object(
      'ok', true,
      'codigo', max(codigo),
      'nombre', max(nombre),
      'tipo', max(tipo),
      'descuento_pct', coalesce(max(descuento_pct), 0))
  end
  from referidores
  where upper(codigo) = upper(trim(p_codigo)) and activo;
$function$;
