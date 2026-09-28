-- Menú del día: qué alimentos agregados por Jonah pueden salir en el menú.
--
-- Columna nueva menu_uso en alimentos_extra. Vacía (null) = el alimento
-- sirve para registrar (buscar, foto) pero no sale en el menú del día.
-- Valores:
--   'proteina:<gusto>'       proteína del almuerzo o la cena (ej. proteina:pollo)
--   'acompanamiento:<gusto>' acompañamiento (ej. acompanamiento:papa)
--   'almuerzo:<gusto>'       plato peruano del almuerzo según su proteína
--                            (ej. almuerzo:pescado, almuerzo:menestras)
--   'desayuno'               desayuno completo
--   'snack'                  para la media mañana o la media tarde
-- El <gusto> es el mismo de los botones de "Tus gustos" (src/menuDia.js).
-- Solo cambia la estructura: no toca filas existentes.

alter table public.alimentos_extra
  add column if not exists menu_uso text
  check (menu_uso is null or menu_uso ~ '^(proteina|acompanamiento|almuerzo):[a-z]+$' or menu_uso in ('desayuno', 'snack'));
