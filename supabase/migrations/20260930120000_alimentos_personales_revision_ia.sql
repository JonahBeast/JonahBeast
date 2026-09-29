-- Revisión automática de los alimentos que crean los alumnos.
--   revision_ia: lo que opinó la IA al revisarlo (veredicto, seguridad, sus
--   números, una nota para Jonah y los números que había puesto el alumno,
--   por si hay que volver a ellos). auto = true si la IA lo decidió sola.
--   revision ahora también puede ser 'revisando' (la IA lo está viendo) o
--   'dudoso' (la IA no estuvo segura: lo revisa Jonah).
alter table public.alimentos_personales
  add column if not exists revision_ia jsonb;
