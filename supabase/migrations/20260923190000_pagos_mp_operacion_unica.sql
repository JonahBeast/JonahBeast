-- Una misma operación de Mercado Pago solo se puede registrar una vez,
-- también en los pagos del add-on de fotos ("Mercado Pago (add-on foto)").
-- Antes la protección solo cubría metodo = 'Mercado Pago', así que si
-- Mercado Pago avisaba dos veces del mismo pago del add-on, el webhook
-- extendía las fotos dos veces.
drop index if exists public.pagos_operacion_mp_unica;
create unique index pagos_operacion_mp_unica
  on public.pagos (operacion)
  where metodo ilike 'mercado pago%';
