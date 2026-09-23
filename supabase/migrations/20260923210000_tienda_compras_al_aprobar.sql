-- Tienda: las compras del cliente y los usos del código de descuento se
-- cuentan cuando el pedido se APRUEBA (pagado), no cuando se crea.
--
-- Antes, crear-pedido-tienda sumaba un uso al código de descuento y una
-- compra al cliente apenas se armaba el pedido, aunque nunca se pagara.
-- Ahora lo hace este trigger, que ya corre una sola vez cuando el pedido
-- pasa a "aprobado" (el mismo que descuenta stock y registra en Finanzas):
--   * cliente (por celular, solo dígitos): +1 compra, última compra = hoy,
--     y si era su primera compra pagada, primera compra = hoy.
--   * código de descuento (guardado en nota_motivo como "Código: XXX" por
--     crear-pedido-tienda): +1 uso, en un solo paso.
-- Lo demás del trigger queda igual.

create or replace function public.procesar_pedido_aprobado()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  item record;
  v_telefono text;
  v_codigo text;
begin
  if new.estado = 'aprobado' and (tg_op = 'INSERT' or old.estado is distinct from 'aprobado') then

    for item in select variante_id, cantidad from tienda_pedido_items where pedido_id = new.id loop
      update tienda_variantes
      set stock = greatest(stock - item.cantidad, 0)
      where id = item.variante_id;
    end loop;

    insert into movimientos_financieros (fecha, negocio, tipo, concepto, monto, tiene_comprobante, notas)
    select current_date, 'store', 'ingreso',
      'Venta tienda' || case when new.motivo_especial is not null then ' (' || new.motivo_especial || ')' else '' end
        || ' - ' || coalesce(new.nombre_cliente, new.username, 'cliente'),
      new.monto_total, true,
      'Automático · Origen: ' || new.origen || coalesce(' · ' || new.nota_motivo, '') || ' · pedido:' || new.id::text
    where not exists (
      select 1 from movimientos_financieros where notas like '%pedido:' || new.id::text
    );

    v_telefono := nullif(regexp_replace(coalesce(new.telefono_cliente, ''), '\D', '', 'g'), '');
    if v_telefono is not null then
      update tienda_clientes
      set total_compras = coalesce(total_compras, 0) + 1,
          ultima_compra = current_date,
          primera_compra = case when coalesce(total_compras, 0) = 0 then current_date else primera_compra end
      where telefono = v_telefono;
    end if;

    v_codigo := substring(coalesce(new.nota_motivo, '') from '^Código: ([^ ·]+)');
    if v_codigo is not null then
      update tienda_codigos_descuento
      set usos_actuales = coalesce(usos_actuales, 0) + 1
      where codigo = v_codigo;
    end if;
  end if;
  return new;
end;
$function$;
