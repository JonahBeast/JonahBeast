-- Gastos con categoría: para que el panel de Rentabilidad separe la
-- publicidad, el marketing y los equipos, y calcule cuánto cuesta
-- conseguir cada alumno.
--   - categoria: publicidad, marketing, equipo, herramientas u otro.
--     Los movimientos que ya existen quedan como 'otro'.
--   - meses_a_repartir: solo para equipos (ej. 24 para una laptop que se
--     usará 2 años). El gasto se cuenta repartido en esos meses. Vacío =
--     cuenta completo en el mes del gasto.
alter table public.movimientos_financieros
  add column if not exists categoria text not null default 'otro'
    check (categoria in ('publicidad', 'marketing', 'equipo', 'herramientas', 'otro')),
  add column if not exists meses_a_repartir integer
    check (meses_a_repartir is null or meses_a_repartir between 1 and 120);
