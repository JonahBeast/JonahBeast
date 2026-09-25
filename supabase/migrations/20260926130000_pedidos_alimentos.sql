-- Pedidos de alimentos: los platos que piden los clientes (por WhatsApp o
-- porque la foto vio algo que no está en la app) llegan a una lista en el
-- panel de admin con los macros ya calculados. Jonah revisa, toca "Aprobar"
-- y el alimento aparece al momento en la app, sin cambiar código.
--
--  * alimentos_extra: alimentos que Jonah agrega desde el panel. La app los
--    suma a su lista normal. Todos pueden leerlos (son datos de nutrición,
--    como la lista que ya está dentro de la app); solo el admin los cambia.
--  * pedidos_alimentos: un pedido por plato pendiente. Si varias personas
--    piden lo mismo, se juntan en el mismo pedido ("solicitantes"), para
--    avisarles a todas cuando esté listo.
--
-- Los platos que ve la foto se siguen guardando en platos_no_encontrados;
-- un disparador los pasa también a pedidos_alimentos.

create table if not exists public.alimentos_extra (
  id bigint generated always as identity primary key,
  grupo text not null,
  nombre text not null check (char_length(nombre) between 1 and 80),
  estado text not null default '-' check (char_length(estado) between 1 and 30),
  kcal numeric not null check (kcal >= 0 and kcal <= 900),
  proteina numeric not null default 0 check (proteina >= 0 and proteina <= 100),
  carbos numeric not null default 0 check (carbos >= 0 and carbos <= 100),
  grasa numeric not null default 0 check (grasa >= 0 and grasa <= 100),
  fibra numeric not null default 0 check (fibra >= 0 and fibra <= 100),
  unidad text check (unidad is null or char_length(unidad) between 1 and 30),
  gramos_unidad numeric check (gramos_unidad is null or (gramos_unidad > 0 and gramos_unidad <= 2000)),
  creado_en timestamptz not null default now(),
  unique (nombre, estado)
);
alter table public.alimentos_extra enable row level security;

drop policy if exists "todos leen alimentos extra" on public.alimentos_extra;
create policy "todos leen alimentos extra" on public.alimentos_extra
  for select using (true);
drop policy if exists "admin cambia alimentos extra" on public.alimentos_extra;
create policy "admin cambia alimentos extra" on public.alimentos_extra
  for all using (private.is_admin()) with check (private.is_admin());

create table if not exists public.pedidos_alimentos (
  id bigint generated always as identity primary key,
  nombre text not null check (char_length(nombre) between 1 and 80),
  -- nombre en minúsculas y sin espacios de más: junta "Plátano bellaco" y "plátano  bellaco"
  clave text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'agregado', 'descartado')),
  -- macros que calculó la IA (por 100 g), para que Jonah solo revise
  propuesta jsonb,
  -- [{origen: 'whatsapp'|'foto', telefono?, username?, nombre?, fecha}]
  solicitantes jsonb not null default '[]'::jsonb,
  alimento_id bigint references public.alimentos_extra(id) on delete set null,
  -- a quién se avisó al aprobar, y a quién hay que avisarle a mano
  avisos jsonb,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  resuelto_en timestamptz
);
create unique index if not exists pedidos_alimentos_pendiente_unico
  on public.pedidos_alimentos (clave) where estado = 'pendiente';
create index if not exists pedidos_alimentos_estado_idx
  on public.pedidos_alimentos (estado, actualizado_en desc);
alter table public.pedidos_alimentos enable row level security;

drop policy if exists "admin lee pedidos de alimentos" on public.pedidos_alimentos;
create policy "admin lee pedidos de alimentos" on public.pedidos_alimentos
  for select using (private.is_admin());
drop policy if exists "admin cambia pedidos de alimentos" on public.pedidos_alimentos;
create policy "admin cambia pedidos de alimentos" on public.pedidos_alimentos
  for update using (private.is_admin()) with check (private.is_admin());

-- Suma un pedido: si ya hay uno pendiente con el mismo nombre, agrega a la
-- persona a la lista; si no, crea el pedido. Devuelve el id y si es nuevo.
-- La usan el disparador de la foto y el asistente de WhatsApp (llave de servicio).
create or replace function public.sumar_pedido_alimento(p_nombre text, p_solicitante jsonb)
returns table (id bigint, nuevo boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text := left(btrim(regexp_replace(coalesce(p_nombre, ''), '\s+', ' ', 'g')), 80);
  v_clave text := lower(v_nombre);
  v_id bigint;
begin
  if v_nombre = '' then return; end if;
  select p.id into v_id from pedidos_alimentos p where p.clave = v_clave and p.estado = 'pendiente';
  if v_id is not null then
    update pedidos_alimentos p
      set solicitantes = p.solicitantes || jsonb_build_array(p_solicitante), actualizado_en = now()
      where p.id = v_id;
    return query select v_id, false;
    return;
  end if;
  begin
    insert into pedidos_alimentos (nombre, clave, solicitantes)
      values (v_nombre, v_clave, jsonb_build_array(p_solicitante))
      returning pedidos_alimentos.id into v_id;
    return query select v_id, true;
  exception when unique_violation then
    -- otra persona pidió lo mismo en el mismo instante: se suma a ese pedido
    update pedidos_alimentos p
      set solicitantes = p.solicitantes || jsonb_build_array(p_solicitante), actualizado_en = now()
      where p.clave = v_clave and p.estado = 'pendiente'
      returning p.id into v_id;
    return query select v_id, false;
  end;
end;
$$;
revoke all on function public.sumar_pedido_alimento(text, jsonb) from public, anon, authenticated;

create or replace function public.pedido_desde_foto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sumar_pedido_alimento(new.nombre,
    jsonb_build_object('origen', 'foto', 'username', new.username, 'fecha', new.creado_en));
  return new;
end;
$$;
revoke all on function public.pedido_desde_foto() from public, anon, authenticated;

drop trigger if exists pedido_desde_foto on public.platos_no_encontrados;
create trigger pedido_desde_foto after insert on public.platos_no_encontrados
  for each row execute function public.pedido_desde_foto();

-- Los platos que ya estaban en la lista vieja pasan a ser pedidos.
select public.sumar_pedido_alimento(nombre,
  jsonb_build_object('origen', 'foto', 'username', username, 'fecha', creado_en))
from public.platos_no_encontrados
order by creado_en;
