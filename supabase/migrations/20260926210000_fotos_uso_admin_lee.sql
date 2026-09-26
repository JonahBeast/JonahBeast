-- Uso de fotos con IA: el admin puede leerlo para calcular el costo real de
-- las fotos en el panel de Rentabilidad. La tabla tenía RLS sin ninguna
-- regla, así que desde la app nadie podía leerla (la edge function usa la
-- llave de servicio, que no pasa por estas reglas). Los alumnos siguen sin
-- acceso.
drop policy if exists solo_admin_lee on public.fotos_reconocimiento_uso;
create policy solo_admin_lee on public.fotos_reconocimiento_uso
  for select to authenticated
  using (private.is_admin());
