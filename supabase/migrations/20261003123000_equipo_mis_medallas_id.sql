-- equipo_mis: cada medalla trae su id, cuándo se entregó y el premio del
-- equipo, para la tarjeta "Jonah te entrega tu medalla" (src/equipo.jsx,
-- MedallaNueva): sale una sola vez por medalla, en los 14 días siguientes.
create or replace function public.equipo_mis()
returns json language plpgsql stable security definer set search_path = public as $$
declare
  v_yo text := private.current_username();
begin
  if v_yo is null then return json_build_object('error', 'sin_sesion'); end if;
  return json_build_object(
    'equipos', coalesce((
      select json_agg(json_build_object(
        'id', e.id, 'nombre', e.nombre, 'apodo', e.apodo, 'oficial', e.oficial, 'objetivo', e.objetivo,
        'miembros', (select count(*) from equipo_miembros x where x.equipo_id = e.id and x.activo),
        'capitan', e.capitan = v_yo
      ) order by e.oficial desc, m.unido_en)
      from equipo_miembros m join equipos e on e.id = m.equipo_id
      where m.username = v_yo and m.activo and not e.cerrado), '[]'::json),
    'oficial', (select json_build_object('id', id, 'codigo', codigo, 'miembros',
                  (select count(*) from equipo_miembros x where x.equipo_id = e.id and x.activo))
                from equipos e where oficial and not cerrado limit 1),
    'animos', (select count(*) from equipo_animos a join equipos e on e.id = a.equipo_id
               where a.para = v_yo and not a.visto and not e.cerrado),
    'medallas', coalesce((select json_agg(json_build_object('id', md.id, 'medalla', md.medalla, 'equipo', e.nombre, 'apodo', e.apodo,
                   'oficial', e.oficial, 'objetivo', e.objetivo, 'premio', e.premio, 'equipo_id', e.id,
                   'reto_inicio', md.reto_inicio, 'entregada', md.created_at) order by md.created_at desc)
                 from equipo_medallas md join equipos e on e.id = md.equipo_id where md.username = v_yo), '[]'::json)
  );
end;
$$;
