-- Bitácora de Jarvis: cada pregunta del admin y la respuesta de Jarvis, para
-- que recuerde lo conversado en los días anteriores. Solo la usa la función
-- jarvis-chat (con la llave de servicio): RLS activo y sin políticas, así
-- nadie más puede leerla. Jarvis borra lo que tenga más de 30 días.
create table if not exists public.jarvis_bitacora (
  id bigserial primary key,
  creado_en timestamptz not null default now(),
  pregunta text not null,
  respuesta text not null
);
create index if not exists jarvis_bitacora_creado_en_idx on public.jarvis_bitacora (creado_en desc);
alter table public.jarvis_bitacora enable row level security;
