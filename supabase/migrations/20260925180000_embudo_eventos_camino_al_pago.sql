-- Ya aplicada en Supabase (25 set 2026).
-- Eventos del camino al pago (y arreglo de 'registro', que el candado
-- anterior rechazaba en silencio). No toca filas existentes.
alter table public.embudo_landing_eventos
  drop constraint if exists embudo_landing_eventos_evento_check;
alter table public.embudo_landing_eventos
  add constraint embudo_landing_eventos_evento_check
  check (evento = any (array['vista','clic_cta','registro','vio_planes','eligio_plan','eligio_metodo','pago_enviado']::text[]));
-- Detalle opcional: plan elegido (meses) o medio de pago.
alter table public.embudo_landing_eventos
  add column if not exists detalle text;
