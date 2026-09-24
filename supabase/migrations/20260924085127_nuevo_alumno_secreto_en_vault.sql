-- El aviso de "alumno nuevo" ya no lleva la clave escrita en la función:
-- la lee de la caja fuerte (Vault, 'webhook_secret'), igual que el aviso
-- de premio por invitación. Si algo falla, el registro del alumno sigue
-- igual; solo no llega el aviso.
create or replace function public.notificar_admin_nuevo_alumno()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secreto text;
begin
  begin
    select decrypted_secret into v_secreto from vault.decrypted_secrets where name = 'webhook_secret';
    if v_secreto is not null then
      perform net.http_post(
        url := 'https://jonahbeast.com/api/nuevo-alumno',
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secreto),
        body := jsonb_build_object('username', new.username)
      );
    end if;
  exception when others then null;
  end;
  return new;
end;
$$;
