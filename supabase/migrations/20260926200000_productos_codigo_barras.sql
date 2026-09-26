-- Productos empacados que se registran escaneando su código de barras.
-- Se llenan solos: primero se busca en Open Food Facts y, si el producto
-- no está, la IA lee la tabla nutricional que fotografía el alumno. Una
-- vez guardado, el siguiente alumno que escanee el mismo código lo
-- encuentra al instante. Los valores son por 100 g (o 100 ml).
-- Solo la función reconocer-comida (con la llave de servicio) y el admin
-- escriben; todos leen.
create table if not exists public.productos (
  codigo text primary key check (codigo ~ '^[0-9]{6,14}$'),
  nombre text not null check (length(nombre) between 1 and 80),
  marca text check (marca is null or length(marca) <= 40),
  kcal numeric not null check (kcal >= 0 and kcal <= 900),
  proteina numeric not null default 0 check (proteina >= 0 and proteina <= 100),
  carbos numeric not null default 0 check (carbos >= 0 and carbos <= 100),
  grasa numeric not null default 0 check (grasa >= 0 and grasa <= 100),
  fibra numeric not null default 0 check (fibra >= 0 and fibra <= 100),
  porcion_g numeric check (porcion_g is null or (porcion_g > 0 and porcion_g <= 2000)),
  fuente text not null check (fuente in ('open_food_facts', 'etiqueta', 'admin')),
  creado_por text,
  veces_usado integer not null default 0,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

alter table public.productos enable row level security;

drop policy if exists "todos leen productos" on public.productos;
create policy "todos leen productos" on public.productos for select using (true);

drop policy if exists "admin cambia productos" on public.productos;
create policy "admin cambia productos" on public.productos for all
  using (private.is_admin()) with check (private.is_admin());

revoke insert, update, delete on public.productos from anon;
