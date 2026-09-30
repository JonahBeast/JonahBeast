-- Chats personales de Jonah (familia, amigos): el asistente de WhatsApp no
-- les responde ni guarda sus mensajes. La restricción original solo
-- aceptaba 'asistente' y 'jonah', así que marcarlos como personales fallaba.
alter table public.whatsapp_chats drop constraint if exists whatsapp_chats_modo_check;
alter table public.whatsapp_chats add constraint whatsapp_chats_modo_check
  check (modo in ('asistente', 'jonah', 'personal'));
