-- De dónde salen los números de cada alimento agregado a la app (pedidos,
-- variantes y "Agregar para todos"): "Tabla Peruana (CENAN)", "Etiqueta del
-- producto", "USDA" o "Receta promedio". La propone la IA al calcular y
-- Jonah la confirma en el panel. Los alimentos agregados antes quedan sin
-- fuente (vacío): no se cambia ningún dato.
alter table public.alimentos_extra add column if not exists fuente text;
