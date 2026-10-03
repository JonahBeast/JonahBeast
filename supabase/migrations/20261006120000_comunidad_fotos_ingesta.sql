-- Fotos de platos: el texto del plato ahora es lo que registró el alumno
-- con su cantidad ("Yogur griego: 1 taza (≈ 245 g) · …", hasta 6
-- alimentos). Se amplía de 60 a 300 letras y se revisa solo que no traiga
-- enlaces ni groserías.
alter table public.comunidad_fotos drop constraint comunidad_fotos_plato_check;
alter table public.comunidad_fotos add constraint comunidad_fotos_plato_check
  check (plato is null or char_length(plato) between 2 and 300);

create or replace function private.comunidad_plato_ok(p_texto text)
returns boolean language sql immutable set search_path = public as $$
  select char_length(trim(coalesce(p_texto, ''))) between 2 and 300
    and p_texto !~* '(https?:|www\.|@)'
    and lower(p_texto) !~ '(\mput[ao]\M|mierda|idiota|est[uú]pid|cabr[oó]n|verga|pinga|maric|cojud|imb[eé]cil|pendej|sexo|xxx)'
$$;
revoke execute on function private.comunidad_plato_ok(text) from public, anon, authenticated;

-- Compartir la foto: igual que antes, con el texto del plato más largo.
create or replace function public.comunidad_foto_subir(p_ruta text, p_frase text, p_plato text)
returns json language plpgsql volatile security definer set search_path = public as $$
declare
  v_yo text := private.current_username();
  v_hoy_desde timestamptz := (now() at time zone 'America/Lima')::date::timestamp at time zone 'America/Lima';
  v_plato text := nullif(left(regexp_replace(trim(coalesce(p_plato, '')), '\s+', ' ', 'g'), 300), '');
  v_estado text;
  v_id bigint;
  v_secreto text;
begin
  if v_yo is null or not exists (select 1 from alumnos where username = v_yo) then
    return json_build_object('error', 'sin_sesion');
  end if;
  if private.equipo_es_menor(v_yo) then return json_build_object('error', 'menor'); end if;
  if p_frase is null or p_frase not in ('almuerzo_beast', 'casera', 'rico_sano', 'comida_a_comida', 'desayuno', 'cena')
     or p_ruta is null or array_length(string_to_array(p_ruta, '/'), 1) <> 2
     or split_part(p_ruta, '/', 1) <> v_yo or split_part(p_ruta, '/', 2) !~ '^[A-Za-z0-9_-]{6,80}\.jpg$'
     or (v_plato is not null and not private.comunidad_plato_ok(v_plato)) then
    return json_build_object('error', 'datos');
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'comunidad-fotos' and name = p_ruta) then
    return json_build_object('error', 'sin_archivo');
  end if;
  if (select count(*) from comunidad_fotos where username = v_yo and created_at >= v_hoy_desde) >= 3 then
    return json_build_object('error', 'limite');
  end if;

  v_estado := case when (select count(*) from comunidad_fotos where username = v_yo and estado = 'aprobada') >= 5
                   then 'aprobada' else 'pendiente' end;
  insert into comunidad_fotos (username, ruta, frase, plato, estado, revisada_at)
    values (v_yo, p_ruta, p_frase, v_plato, v_estado, case when v_estado = 'aprobada' then now() end)
    on conflict (ruta) do nothing
    returning id into v_id;
  if v_id is null then return json_build_object('error', 'datos'); end if;
  insert into comunidad_perfil (username, visible) values (v_yo, true)
    on conflict (username) do update set visible = true, updated_at = now();

  if v_estado = 'pendiente' and not exists (
       select 1 from comunidad_fotos where estado = 'pendiente' and id <> v_id and created_at >= now() - interval '30 minutes') then
    begin
      select decrypted_secret into v_secreto from vault.decrypted_secrets where name = 'webhook_secret';
      if v_secreto is not null then
        perform net.http_post(
          url := 'https://jonahbeast.com/api/aviso-push',
          headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secreto),
          body := jsonb_build_object('admin', true,
            'title', 'Comunidad Beast 📸',
            'body', 'Hay fotos de platos nuevas para revisar.',
            'url', '/')
        );
      end if;
    exception when others then null;
    end;
  end if;
  return json_build_object('ok', true, 'id', v_id, 'estado', v_estado);
end;
$$;
