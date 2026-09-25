-- Pagos con Google Play dentro de la app de Android.
--
-- compras_google: una fila por suscripción comprada en Google Play. Guarda
-- de qué alumno es (una compra no se puede usar en dos cuentas), qué plan
-- es, su estado en Google y hasta cuándo está pagada. Solo la lee y escribe
-- el servidor (sin políticas: los alumnos no la ven ni la tocan).
create table if not exists public.compras_google (
  purchase_token text primary key,
  username text not null,
  producto text not null,
  meses integer not null,
  estado text,
  vence_en timestamptz,
  ultimo_pedido text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists compras_google_username on public.compras_google (username);
create index if not exists compras_google_vence_en on public.compras_google (vence_en);
alter table public.compras_google enable row level security;

-- Cada cobro de Google (la compra y cada renovación) tiene su número de
-- pedido: solo se puede registrar una vez en pagos, así nunca se extiende
-- dos veces el plan por el mismo cobro.
create unique index if not exists pagos_operacion_google_unica
  on public.pagos (operacion)
  where metodo = 'Google Play';
