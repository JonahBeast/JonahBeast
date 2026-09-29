-- Saldo de la IA (Anthropic): Anthropic no deja leer el saldo desde afuera,
-- así que Jonah anota aquí sus recargas y, cuando lo ve en la página de
-- Anthropic, el saldo real. El panel calcula el saldo estimado:
--   último "saldo_real" + recargas posteriores − gasto de ia_uso desde entonces.
-- Solo el admin la lee y la cambia.
create table if not exists public.ia_saldo (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('recarga', 'saldo_real')),
  monto_usd numeric not null check (monto_usd >= 0 and monto_usd <= 100000),
  fecha timestamptz not null default now(),
  nota text check (nota is null or char_length(nota) <= 200),
  creado_en timestamptz not null default now()
);
alter table public.ia_saldo enable row level security;
drop policy if exists "admin maneja saldo ia" on public.ia_saldo;
create policy "admin maneja saldo ia" on public.ia_saldo
  for all using (private.is_admin()) with check (private.is_admin());
