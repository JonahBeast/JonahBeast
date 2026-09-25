-- Asistente de WhatsApp: tres tablas nuevas.
--
--  * whatsapp_cuenta: la conexión con Meta (una sola fila). Guarda la llave
--    de acceso, así que nadie la puede leer desde la app: sin reglas de
--    lectura, solo las funciones del servidor (llave de servicio).
--  * whatsapp_chats: un registro por cliente que escribe. Dice si lo atiende
--    el asistente o Jonah, y el motivo y resumen cuando se lo pasó a Jonah.
--  * whatsapp_mensajes: cada mensaje del chat (del cliente, del asistente o
--    de Jonah desde su celular), para el historial y el panel.
--
-- El admin puede ver chats y mensajes y devolver un chat al asistente.
-- Los ajustes (apagado / prueba / activo y los números de prueba) van en la
-- tabla config que ya existe, como el código de la calculadora.

create table if not exists public.whatsapp_cuenta (
  id int primary key default 1 check (id = 1),
  waba_id text,
  phone_number_id text,
  telefono text,
  nombre_visible text,
  token text,
  conectado_en timestamptz default now()
);
alter table public.whatsapp_cuenta enable row level security;

create table if not exists public.whatsapp_chats (
  telefono text primary key,
  nombre text,
  username text,
  modo text not null default 'asistente' check (modo in ('asistente', 'jonah')),
  motivo text,
  resumen text,
  pausado_hasta timestamptz,
  ultimo_mensaje_en timestamptz default now()
);
alter table public.whatsapp_chats enable row level security;

create table if not exists public.whatsapp_mensajes (
  id bigint generated always as identity primary key,
  telefono text not null,
  wa_id text unique,
  direccion text not null check (direccion in ('entrante', 'asistente', 'jonah')),
  tipo text not null default 'texto',
  texto text,
  creado_en timestamptz not null default now()
);
create index if not exists whatsapp_mensajes_por_chat on public.whatsapp_mensajes (telefono, creado_en desc);
alter table public.whatsapp_mensajes enable row level security;

drop policy if exists "admin lee chats de whatsapp" on public.whatsapp_chats;
create policy "admin lee chats de whatsapp" on public.whatsapp_chats
  for select using (private.is_admin());
drop policy if exists "admin cambia chats de whatsapp" on public.whatsapp_chats;
create policy "admin cambia chats de whatsapp" on public.whatsapp_chats
  for update using (private.is_admin()) with check (private.is_admin());
drop policy if exists "admin lee mensajes de whatsapp" on public.whatsapp_mensajes;
create policy "admin lee mensajes de whatsapp" on public.whatsapp_mensajes
  for select using (private.is_admin());
