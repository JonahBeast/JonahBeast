-- "No responder" del panel: el admin puede agregar un número que todavía no
-- tiene chat (familia o amigos que el asistente nunca debe responder).
drop policy if exists "admin agrega chats de whatsapp" on public.whatsapp_chats;
create policy "admin agrega chats de whatsapp" on public.whatsapp_chats
  for insert with check (private.is_admin());
