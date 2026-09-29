-- Revisión de los alimentos que crean los alumnos ("+ Crear mi alimento").
--   revision: null = por revisar · 'ok' = está bien · 'corregido' = Jonah
--   corrigió sus datos · 'aprobado' = Jonah lo agregó a la app para todos.
--   revisado_en: cuándo lo revisó Jonah (la app avisa al alumno de una
--   corrección una sola vez).
alter table public.alimentos_personales
  add column if not exists revision text,
  add column if not exists revisado_en timestamptz;

-- El alumno puede corregir sus propios alimentos; el admin, cualquiera.
drop policy if exists "alimentos propios update" on public.alimentos_personales;
create policy "alimentos propios update" on public.alimentos_personales
  for update using (username = private.current_username()) with check (username = private.current_username());
drop policy if exists "admin revisa alimentos propios" on public.alimentos_personales;
create policy "admin revisa alimentos propios" on public.alimentos_personales
  for update using (private.is_admin()) with check (private.is_admin());
