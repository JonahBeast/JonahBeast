-- Avisos de pedidos de alimentos que no dependen de las notificaciones.
--
--  * pedidos_alimentos.respuesta: mensaje que Jonah le deja al alumno cuando
--    descarta un pedido (ej. "Ya estaba en la app como …").
--  * mis_pedidos_resueltos(p_desde): el alumno ve, al abrir la app, cuáles
--    de SUS pedidos se aprobaron o descartaron desde p_desde (máximo 14 días
--    atrás). Solo devuelve pedidos donde él figura como solicitante (los
--    descartados, solo si tienen mensaje); la tabla
--    sigue siendo solo del admin.

alter table public.pedidos_alimentos
  add column if not exists respuesta text check (respuesta is null or char_length(respuesta) <= 300);

create or replace function public.mis_pedidos_resueltos(p_desde timestamptz)
returns table (id bigint, nombre text, estado text, respuesta text, alimento text, resuelto_en timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_username text;
begin
  select pr.username into v_username from profiles pr where pr.id = auth.uid();
  if v_username is null then return; end if;
  return query
    select p.id, p.nombre, p.estado, p.respuesta,
           case when a.id is null then null
                when a.estado = '-' then a.nombre
                else a.nombre || ' (' || a.estado || ')' end,
           p.resuelto_en
    from pedidos_alimentos p
    left join alimentos_extra a on a.id = p.alimento_id
    -- los descartados solo si Jonah dejó un mensaje (antes se descartaba sin avisar)
    where (p.estado = 'agregado' or (p.estado = 'descartado' and p.respuesta is not null))
      and p.resuelto_en > greatest(coalesce(p_desde, now() - interval '14 days'), now() - interval '14 days')
      and p.solicitantes @> jsonb_build_array(jsonb_build_object('username', v_username))
    order by p.resuelto_en desc
    limit 20;
end;
$$;
revoke all on function public.mis_pedidos_resueltos(timestamptz) from public, anon;
grant execute on function public.mis_pedidos_resueltos(timestamptz) to authenticated;
