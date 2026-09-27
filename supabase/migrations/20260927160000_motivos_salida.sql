-- "¿Qué te faltó para quedarte?": cuando a alguien se le termina la prueba
-- gratis y abre la app, puede decir en un toque por qué no pagó. Jonah lo
-- ve resumido en el panel ("Volver a invitar").
--
--  * motivos_salida: una fila por respuesta (motivo + texto opcional).
--  * registrar_motivo_salida(p_motivo, p_detalle): la usa la app; toma el
--    usuario de la sesión, así nadie puede responder a nombre de otro.
--    Solo el admin puede leer la tabla.

create table if not exists public.motivos_salida (
  id bigint generated always as identity primary key,
  username text not null,
  motivo text not null check (motivo in ('precio', 'tiempo', 'no_entendi', 'foto', 'comidas', 'otro')),
  detalle text check (detalle is null or char_length(detalle) <= 300),
  creado_en timestamptz not null default now()
);
create index if not exists motivos_salida_username_idx on public.motivos_salida (username, creado_en desc);
alter table public.motivos_salida enable row level security;

drop policy if exists "admin lee motivos de salida" on public.motivos_salida;
create policy "admin lee motivos de salida" on public.motivos_salida
  for select using (private.is_admin());

create or replace function public.registrar_motivo_salida(p_motivo text, p_detalle text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
begin
  select pr.username into v_username from profiles pr where pr.id = auth.uid();
  if v_username is null then return false; end if;
  -- Una respuesta por persona cada 7 días (por si toca varias veces).
  if exists (select 1 from motivos_salida m where m.username = v_username and m.creado_en > now() - interval '7 days') then
    return true;
  end if;
  insert into motivos_salida (username, motivo, detalle)
    values (v_username, p_motivo, nullif(left(btrim(coalesce(p_detalle, '')), 300), ''));
  return true;
end;
$$;
revoke all on function public.registrar_motivo_salida(text, text) from public, anon;
grant execute on function public.registrar_motivo_salida(text, text) to authenticated;
