-- "Novedades de tus pedidos": solo los pedidos que el alumno hizo (app o
-- WhatsApp). Los que creó la IA al ver algo en su foto no los pidió él.
create or replace function public.mis_pedidos_resueltos(p_desde timestamp with time zone)
returns table(id bigint, nombre text, estado text, respuesta text, alimento text, resuelto_en timestamp with time zone)
language plpgsql stable security definer set search_path to 'public' as $function$
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
      and exists (select 1 from jsonb_array_elements(p.solicitantes) s
                  where s->>'username' = v_username and coalesce(s->>'origen', '') <> 'foto')
    order by p.resuelto_en desc
    limit 20;
end;
$function$;
