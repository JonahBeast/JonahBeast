-- Eventos nuevos del embudo (16 oct 2026):
--   'buscador_portada' → el buscador "¿Cuántas calorías tiene tu plato?" de la
--                        portada (busco, vio_resultado, sin_resultado, ficha,
--                        toco_registro, abrio_link, registro; ver
--                        src/buscadorPortada.jsx).
--   'compartir_plato'  → "📤 Compartir este plato" (portada, buscador de la
--                        app y lo anotado; src/compartirPlato.jsx).
-- Además se suman los que la app ya mandaba y la base rechazaba en silencio
-- (nunca se guardó ninguno):
--   'campana'              → qué campaña/anuncio trajo a cada registro
--                            (registrarRegistroEmbudo en src/App.jsx; el panel
--                            lo lee en "Por campaña").
--   'registro_autollenado' → el autocompletar llenó campos del registro.
--   'alimento_revisado', 'mensaje_visto', 'mensaje_cerrado' → también los
--                            manda la app (src/alumno.jsx) y la base los rechazaba.
-- Los demás quedan igual.
--
-- OJO: reemplazar la regla lleva "drop constraint": aplicarla desde la
-- computadora o el editor SQL de Supabase (en el celular la confirmación
-- extra no llega). Sin aplicarla, la app funciona igual; solo no se guardan
-- estos eventos.
alter table public.embudo_landing_eventos drop constraint if exists embudo_landing_eventos_evento_check;
alter table public.embudo_landing_eventos add constraint embudo_landing_eventos_evento_check
  check (evento = any (array[
    'vista', 'clic_cta', 'registro', 'error_registro', 'vio_planes', 'eligio_plan',
    'eligio_metodo', 'pago_enviado', 'demo_abrir', 'demo_foto', 'demo_resultado',
    'demo_limite', 'recorrido', 'recorrido_plan', 'recorrido_cuenta', 'recorrido_whatsapp',
    'calculadora_resultados', 'calculadora_whatsapp', 'calculadora_codigo', 'codigo_live_canje',
    'primera_comida', 'foto_comida', 'abrir_navegador', 'fin_prueba',
    'buscador_portada', 'compartir_plato', 'campana', 'registro_autollenado',
    'alimento_revisado', 'mensaje_visto', 'mensaje_cerrado'
  ]));
