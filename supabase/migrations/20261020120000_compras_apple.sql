-- Pagos con Apple dentro de la app de iPhone (pedido por Jonah el 14 de
-- octubre, parte 2 de la App Store).
--
-- compras_apple: una fila por suscripción comprada en el iPhone (Apple la
-- identifica con su "transacción original", que no cambia en las
-- renovaciones). Guarda de qué alumno es (una compra no se puede usar en
-- dos cuentas), qué plan es, su estado, hasta cuándo está pagada y si se
-- va a renovar sola. Solo la lee y escribe el servidor (sin políticas:
-- los alumnos no la ven ni la tocan), igual que compras_google.
-- No toca ningún dato que ya existe.
create table if not exists public.compras_apple (
  transaccion_original text primary key,
  username text not null,
  producto text not null,
  meses integer not null,
  estado text,
  vence_en timestamptz,
  renueva boolean,
  ultima_transaccion text,
  entorno text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists compras_apple_username on public.compras_apple (username);
create index if not exists compras_apple_vence_en on public.compras_apple (vence_en);
alter table public.compras_apple enable row level security;

-- Cada cobro de Apple (la compra y cada renovación) tiene su número de
-- transacción: solo se puede registrar una vez en pagos, así nunca se
-- extiende dos veces el plan por el mismo cobro.
create unique index if not exists pagos_operacion_apple_unica
  on public.pagos (operacion)
  where metodo = 'App Store';
