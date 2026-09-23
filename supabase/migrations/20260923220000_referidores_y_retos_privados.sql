-- Revisión de seguridad final.
--
-- 1) referidores: cualquiera (incluso sin sesión) podía leer la tabla
--    completa, con el celular, las notas y el token del panel de cada
--    embajador. Ahora solo el admin la lee. El registro valida el código
--    con validar_codigo() y el embajador ve su panel con panel_referidor();
--    las dos son SECURITY DEFINER y no dependen de esta regla.
drop policy if exists "validar codigo referido" on public.referidores;
create policy "admin lee referidores" on public.referidores
  for select
  using (private.is_admin());

-- 2) retos_semanales: la regla dejaba a cualquiera leer, cambiar o borrar
--    los retos de todos. La app no usa esta tabla; solo la tarea
--    automática reto-semanal, que entra con la llave de servicio. Sin
--    reglas, solo el servidor puede usarla.
drop policy if exists "usuarios ven y editan su propio reto" on public.retos_semanales;

-- 3) Funciones de trigger que se podían llamar desde afuera por
--    /rest/v1/rpc (no hacían nada llamadas así, pero no tienen por qué
--    estar expuestas). Los triggers siguen funcionando igual.
revoke execute on function public.notificar_admin_nuevo_alumno() from public, anon, authenticated;
revoke execute on function public.procesar_pedido_aprobado() from public, anon, authenticated;
revoke execute on function public.registrar_ingreso_por_pago_aprobado() from public, anon, authenticated;

-- 4) search_path fijo para la función que avisa de alumnos nuevos.
alter function public.notificar_admin_nuevo_alumno() set search_path = public;
