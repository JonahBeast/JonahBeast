-- Lo que la IA ve en una foto y no está en la app ya NO se convierte solo
-- en un pedido a nombre del alumno (la IA puede confundirse de plato y el
-- alumno recibía avisos de algo que no pidió). Queda anotado en
-- platos_no_encontrados para el panel, y la app le pregunta al alumno si lo
-- comió: solo si toca "Sí, pedirlo" se crea el pedido (origen app).
-- (El trigger pedido_desde_foto queda, pero ya no hace nada.)
create or replace function public.pedido_desde_foto()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  return new;
end;
$function$;
