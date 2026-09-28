-- El código del live deja de poderse leer sin ser admin (ahora da días de
-- Premium): la web lo comprueba con validar_codigo_live. Se aplica después
-- del merge, porque la calculadora anterior lo leía directo.
drop policy if exists "config publica" on public.config;
create policy "config publica" on public.config for select using (
  key = any (array['precio_1','precio_3','precio_6','precio_12','yape_numero','yape_titular',
                   'plin_numero','plin_titular','banco_nombre','banco_cuenta','banco_cci','banco_titular'])
  or private.is_admin()
);

