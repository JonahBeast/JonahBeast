-- La app ya anota "primera_comida", "foto_comida" y "abrir_navegador"
-- (pasos de la primera comida y de abrir la app en Chrome/Safari), y el
-- panel ya los muestra, pero la lista de eventos permitidos no los
-- incluía: la base los rechazaba sin avisar.
alter table public.embudo_landing_eventos drop constraint if exists embudo_landing_eventos_evento_check;
alter table public.embudo_landing_eventos add constraint embudo_landing_eventos_evento_check
  check (evento = any (array[
    'vista', 'clic_cta', 'registro', 'error_registro', 'vio_planes', 'eligio_plan',
    'eligio_metodo', 'pago_enviado', 'demo_abrir', 'demo_foto', 'demo_resultado',
    'demo_limite', 'recorrido', 'recorrido_plan', 'recorrido_cuenta', 'recorrido_whatsapp',
    'calculadora_resultados', 'calculadora_whatsapp', 'calculadora_codigo', 'codigo_live_canje',
    'primera_comida', 'foto_comida', 'abrir_navegador'
  ]));
