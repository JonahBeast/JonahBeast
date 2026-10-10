-- Guisos que se comen con arroz pero cuyas calorías NO lo incluyen: la app
-- muestra "🍚 Sin arroz: agrégalo aparte" (ver PLATOS_SIN_ARROZ en
-- src/alumno.jsx para los de la lista fija). Lo marcan Jonah en el panel o
-- la IA al agregar un plato.
alter table public.alimentos_extra add column if not exists sin_arroz boolean not null default false;

-- Los que ya están y se comen con arroz (sus calorías no lo incluyen).
update public.alimentos_extra set sin_arroz = true
 where nombre in ('Saltado de pollo', 'Picante de carne', 'Picante de mariscos', 'Picante de pollo',
                  'Estofado de costillar', 'Sangrecita salteada', 'Pollo a la mostaza');
