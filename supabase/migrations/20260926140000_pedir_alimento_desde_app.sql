-- Botón "🙋 Pedirle a Jonah que lo agregue" del buscador de alimentos: el
-- alumno pide un alimento que no encuentra y el pedido llega a "Pedidos de
-- alimentos" del panel. Cuando Jonah lo aprueba, al alumno le llega una
-- notificación (función alimentos-pedidos).
--
-- Máximo 10 pedidos por alumno cada 24 h, para que nadie llene la lista.

create or replace function public.pedir_alimento_app(p_nombre text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_recientes int;
begin
  select pr.username into v_username from profiles pr where pr.id = auth.uid();
  if v_username is null then
    raise exception 'Inicia sesión para pedir un alimento.';
  end if;
  if char_length(btrim(coalesce(p_nombre, ''))) < 2 then
    raise exception 'Escribe el nombre del alimento.';
  end if;

  select count(*) into v_recientes
    from pedidos_alimentos p, jsonb_array_elements(p.solicitantes) s
    where s->>'origen' = 'app' and s->>'username' = v_username
      and (s->>'fecha')::timestamptz > now() - interval '24 hours';
  if v_recientes >= 10 then
    raise exception 'Ya enviaste 10 pedidos hoy. Jonah los está revisando 🙌';
  end if;

  perform sumar_pedido_alimento(p_nombre,
    jsonb_build_object('origen', 'app', 'username', v_username, 'fecha', now()));
  return true;
end;
$$;
revoke all on function public.pedir_alimento_app(text) from public, anon;
grant execute on function public.pedir_alimento_app(text) to authenticated;
