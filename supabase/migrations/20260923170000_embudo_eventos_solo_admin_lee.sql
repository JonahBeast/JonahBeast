-- Eventos de la landing (visitas, clics y registros): solo el admin puede
-- leerlos, igual que el historial diario del embudo. Antes cualquier alumno
-- con sesión iniciada podía leer la tabla completa, incluidos los usuarios
-- que se registraron desde la landing.
-- Anotar eventos sigue abierto para todos (la landing los manda sin sesión),
-- y el cron diario y Jarvis leen con la llave de servicio, que no pasa por
-- estas reglas.
drop policy if exists leer_autenticado on public.embudo_landing_eventos;
create policy solo_admin_lee on public.embudo_landing_eventos
  for select to authenticated
  using (private.is_admin());
