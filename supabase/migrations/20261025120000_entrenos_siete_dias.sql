-- "💪 ¿Entrenaste hoy?": se puede anotar o corregir el entreno de cualquiera
-- de los últimos 7 días (hoy y los 6 anteriores), no solo hoy o ayer
-- (pedido de Jonah, 16 oct: entrenó toda la semana y se olvidó de anotarlo).
-- alter policy en vez de drop/create: cambia solo la regla de la fecha.
alter policy "anota su entreno" on public.entrenos
  with check (username = private.current_username()
    and fecha between (now() at time zone 'America/Lima')::date - 6 and (now() at time zone 'America/Lima')::date);
alter policy "cambia su entreno" on public.entrenos
  using (username = private.current_username())
  with check (username = private.current_username()
    and fecha between (now() at time zone 'America/Lima')::date - 6 and (now() at time zone 'America/Lima')::date);
