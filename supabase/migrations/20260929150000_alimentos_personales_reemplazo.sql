-- "Ya existe en la app": Jonah indica que un alimento que creó el alumno ya
-- está en la app. reemplazo = clave del alimento de la app; en la app del
-- alumno deja de salir en su buscador y sus comidas usan esos datos.
-- editado_en: cuándo lo corrigió el propio alumno (para volver a sumar los
-- totales de los días donde lo usó).
alter table public.alimentos_personales
  add column if not exists reemplazo text,
  add column if not exists editado_en timestamptz;
