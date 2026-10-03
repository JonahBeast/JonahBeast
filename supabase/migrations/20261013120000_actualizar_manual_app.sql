-- Botón del panel "🔄 Actualizar manual de Jarvis": el admin copia a la
-- tabla manual_app el manual (docs/manual-app.md) que viene dentro de la
-- versión publicada de main, con su commit. Solo el admin. Devuelve el md5
-- del texto guardado para comprobar que quedó idéntico.
create or replace function public.actualizar_manual_app(p_texto text, p_commit text)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not private.is_admin() then return json_build_object('error', 'no_admin'); end if;
  if p_texto is null or length(p_texto) < 1000 then return json_build_object('error', 'texto'); end if;
  update manual_app set texto = p_texto, commit_main = nullif(trim(coalesce(p_commit, '')), ''), actualizado_en = now()
   where id = 1;
  return (select json_build_object('ok', true, 'md5', md5(texto), 'commit', commit_main, 'iguales', texto = p_texto)
            from manual_app where id = 1);
end;
$$;
revoke all on function public.actualizar_manual_app(text, text) from public, anon;
grant execute on function public.actualizar_manual_app(text, text) to authenticated;

-- Estado para el panel: huella (sha256) del manual guardado y su commit,
-- para saber si está al día con el de la versión publicada.
create or replace function public.estado_manual_app()
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not private.is_admin() then return json_build_object('error', 'no_admin'); end if;
  return (select json_build_object('sha256', encode(sha256(convert_to(texto, 'UTF8')), 'hex'), 'commit', commit_main, 'actualizado_en', actualizado_en)
            from manual_app where id = 1);
end;
$$;
revoke all on function public.estado_manual_app() from public, anon;
grant execute on function public.estado_manual_app() to authenticated;
