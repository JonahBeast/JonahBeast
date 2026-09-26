-- Uso de IA: cada llamada a la IA (fotos de comida, etiquetas, códigos,
-- WhatsApp, Jarvis y pedidos de alimentos) deja un renglón con los tokens
-- que se usaron. El panel de Rentabilidad multiplica esos tokens por el
-- precio de cada modelo para saber el costo real de la IA por alumno.
-- Solo las edge functions escriben (con la llave de servicio, que no pasa
-- por estas reglas) y solo el admin puede leer.
create table if not exists public.ia_uso (
  id bigint generated always as identity primary key,
  creado_en timestamptz not null default now(),
  funcion text not null,
  tipo text not null,
  username text,
  modelo text not null,
  tokens_entrada integer not null default 0,
  tokens_salida integer not null default 0,
  tokens_cache_lectura integer not null default 0,
  tokens_cache_escritura integer not null default 0
);
create index if not exists ia_uso_creado_en_idx on public.ia_uso (creado_en);

alter table public.ia_uso enable row level security;
drop policy if exists solo_admin_lee on public.ia_uso;
create policy solo_admin_lee on public.ia_uso
  for select to authenticated
  using (private.is_admin());
