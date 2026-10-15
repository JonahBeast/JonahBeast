-- Cupones (pedido por Jonah el 14 de octubre).
--
-- En Planes, "¿Tienes un cupón?": el alumno escribe un código que Jonah
-- creó en el panel (tarjeta 🎟️ CUPONES). Dos tipos:
--   - 'dias': días de Premium gratis. Se canjean al toque (canjear_cupon).
--   - 'descuento': % de descuento en su próximo pago único (Yape, Plin,
--     transferencia o Mercado Pago pago único). El uso se cuenta recién
--     cuando el pago queda aprobado (trigger contar_uso_cupon).
-- Cada alumno usa un mismo cupón una sola vez (cupones_usos). Un cupón
-- puede ser para cualquiera o solo para un alumno, tener tope de usos
-- (1 = un solo uso) y fecha de vencimiento (fecha de Lima, inclusive).
--
-- Tablas nuevas: cupones y cupones_usos (solo el admin las lee; el alumno
-- solo pregunta con validar_cupon y canjea con canjear_cupon).
-- Columna nueva: pagos.cupon (qué cupón usó ese pago).
-- No toca ningún dato que ya existe.

create table if not exists public.cupones (
  codigo text primary key check (codigo = upper(codigo) and codigo ~ '^[A-Z0-9-]{3,30}$'),
  tipo text not null check (tipo in ('dias', 'descuento')),
  valor integer not null check ((tipo = 'dias' and valor between 1 and 365) or (tipo = 'descuento' and valor between 1 and 100)),
  usos_maximos integer check (usos_maximos is null or usos_maximos > 0),
  usos integer not null default 0,
  para_username text,
  vence date,
  activo boolean not null default true,
  nota text,
  creado_en timestamptz not null default now()
);

create table if not exists public.cupones_usos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null references public.cupones(codigo) on update cascade on delete cascade,
  username text not null,
  pago_id uuid,
  usado_en timestamptz not null default now(),
  unique (codigo, username)
);

alter table public.pagos add column if not exists cupon text;

alter table public.cupones enable row level security;
alter table public.cupones_usos enable row level security;
drop policy if exists admin_cupones on public.cupones;
create policy admin_cupones on public.cupones for all to authenticated
  using (private.is_admin()) with check (private.is_admin());
drop policy if exists admin_cupones_usos on public.cupones_usos;
create policy admin_cupones_usos on public.cupones_usos for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- ¿Este cupón le sirve a este alumno? Devuelve el estado y, si vale, el
-- tipo y el valor. Uso interno (validar_cupon, canjear_cupon, triggers y
-- las funciones de Mercado Pago, que llaman con la llave de servicio).
create or replace function public.cupon_para(p_codigo text, p_username text)
 returns json
 language plpgsql
 stable
 security definer
 set search_path to 'public'
as $function$
declare
  c cupones%rowtype;
  v_codigo text := upper(trim(coalesce(p_codigo, '')));
begin
  if v_codigo = '' then return json_build_object('estado', 'invalido'); end if;
  select * into c from cupones where codigo = v_codigo;
  if not found or not c.activo then return json_build_object('estado', 'invalido'); end if;
  if c.vence is not null and (now() at time zone 'America/Lima')::date > c.vence then
    return json_build_object('estado', 'vencido');
  end if;
  if c.para_username is not null and lower(c.para_username) <> lower(coalesce(p_username, '')) then
    return json_build_object('estado', 'no_es_para_ti');
  end if;
  if exists (select 1 from cupones_usos u where u.codigo = c.codigo and lower(u.username) = lower(coalesce(p_username, ''))) then
    return json_build_object('estado', 'ya_usado');
  end if;
  if c.usos_maximos is not null and c.usos >= c.usos_maximos then
    return json_build_object('estado', 'agotado');
  end if;
  return json_build_object('estado', 'ok', 'codigo', c.codigo, 'tipo', c.tipo, 'valor', c.valor, 'vence', c.vence);
end;
$function$;
revoke all on function public.cupon_para(text, text) from public, anon, authenticated;
grant execute on function public.cupon_para(text, text) to service_role;

-- El alumno pregunta si su cupón vale (no lo gasta).
create or replace function public.validar_cupon(p_codigo text)
 returns json
 language plpgsql
 stable
 security definer
 set search_path to 'public'
as $function$
begin
  if auth.uid() is null then return json_build_object('estado', 'sin_sesion'); end if;
  return cupon_para(p_codigo, private.current_username());
end;
$function$;
revoke all on function public.validar_cupon(text) from public, anon;
grant execute on function public.validar_cupon(text) to authenticated;

-- Canjea un cupón de días: suma los días a su Premium al toque.
create or replace function public.canjear_cupon(p_codigo text)
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_alumno alumnos%rowtype;
  v_res json;
  v_codigo text := upper(trim(coalesce(p_codigo, '')));
  v_nueva date;
begin
  if auth.uid() is null then return json_build_object('estado', 'sin_sesion'); end if;
  select * into v_alumno from alumnos where user_id = auth.uid() for update;
  if not found then return json_build_object('estado', 'sin_cuenta'); end if;
  -- Bloquea el cupón para que dos canjes a la vez no pasen el tope.
  perform 1 from cupones where codigo = v_codigo for update;
  v_res := cupon_para(v_codigo, v_alumno.username);
  if v_res->>'estado' <> 'ok' then return v_res; end if;
  if v_res->>'tipo' <> 'dias' then return json_build_object('estado', 'es_descuento'); end if;

  update alumnos set fecha_vencimiento = greatest(coalesce(fecha_vencimiento, current_date), current_date) + (v_res->>'valor')::int
   where username = v_alumno.username
   returning fecha_vencimiento into v_nueva;
  insert into cupones_usos (codigo, username) values (v_codigo, v_alumno.username);
  update cupones set usos = usos + 1 where codigo = v_codigo;
  insert into ajustes_membresia (username, dias, motivo, fecha_resultante)
  values (v_alumno.username, (v_res->>'valor')::int, 'Cupón: ' || v_codigo, v_nueva);
  return json_build_object('estado', 'ok', 'dias', (v_res->>'valor')::int, 'fecha_vencimiento', v_nueva);
end;
$function$;
revoke all on function public.canjear_cupon(text) from public, anon;
grant execute on function public.canjear_cupon(text) to authenticated;

-- Un pago que el alumno envía con cupón (Yape, Plin, transferencia) solo
-- entra si el cupón es de descuento y le sirve a él. El admin y las
-- funciones del servidor no pasan por esta revisión.
create or replace function private.revisar_cupon_pago()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_res json;
begin
  if new.cupon is null or trim(new.cupon) = '' then new.cupon := null; return new; end if;
  new.cupon := upper(trim(new.cupon));
  if auth.uid() is null or private.is_admin() then return new; end if;
  v_res := cupon_para(new.cupon, new.username);
  if v_res->>'estado' <> 'ok' or v_res->>'tipo' <> 'descuento' then
    raise exception 'Cupón no válido: %', coalesce(v_res->>'estado', 'invalido');
  end if;
  return new;
end;
$function$;
drop trigger if exists revisar_cupon_pago on public.pagos;
create trigger revisar_cupon_pago before insert on public.pagos
  for each row execute function private.revisar_cupon_pago();

-- Cuando un pago con cupón queda aprobado (admin, Jarvis o Mercado Pago),
-- se anota el uso y se suma al contador, una sola vez por alumno.
create or replace function private.contar_uso_cupon()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_n int;
begin
  if new.cupon is null or new.estado <> 'aprobado' then return new; end if;
  if tg_op = 'UPDATE' and old.estado = 'aprobado' then return new; end if;
  if not exists (select 1 from cupones where codigo = new.cupon) then return new; end if;
  insert into cupones_usos (codigo, username, pago_id) values (new.cupon, new.username, new.id)
  on conflict (codigo, username) do nothing;
  get diagnostics v_n = row_count;
  if v_n > 0 then update cupones set usos = usos + 1 where codigo = new.cupon; end if;
  return new;
end;
$function$;
drop trigger if exists contar_uso_cupon on public.pagos;
create trigger contar_uso_cupon after insert or update of estado on public.pagos
  for each row execute function private.contar_uso_cupon();
