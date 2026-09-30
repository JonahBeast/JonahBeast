/* Receta típica de los platos fáciles de separar, para el botón
   "🧩 Ajustar ingredientes" del registro: el plato se cambia por sus
   partes (con estas cantidades) y el alumno ajusta solo lo que quiera
   (ej. más pollo en su pan con pollo).

   Cada receta es para UNA porción de la medida casera del plato (la
   primera de unitsFor en src/App.jsx: "Pan con pollo" → 1 unidad de
   200 g). Si registró más o menos, las cantidades se escalan.
   Cada ingrediente: [clave del alimento en la app, cantidad, medida].
   Las claves deben existir (lo revisa "npm run build").

   Solo platos que se arman con partes que ya están en la app. Los
   guisos (ají de gallina, lomo saltado…) se quedan como plato. */
export const RECETAS_PLATOS = {
  'Pan con pollo (-)': [
    ['Pan francés (-)', 1, 'unidad'], ['Pollo pechuga (Cocida)', 90, 'gramos'],
    ['Mayonesa (-)', 1, 'cucharada'], ['Lechuga (Cruda)', 10, 'gramos'],
  ],
  'Pan con jamonada (-)': [
    ['Pan francés (-)', 1, 'unidad'], ['Jamonada (-)', 2, 'rebanada'],
  ],
  'Pan con chicharrón (-)': [
    ['Pan francés (-)', 1, 'unidad'], ['Chicharrón de chancho (-)', 100, 'gramos'],
    ['Camote (Cocido)', 60, 'gramos'], ['Cebolla (Cruda)', 25, 'gramos'],
  ],
  'Hot dog (-)': [
    ['Pan francés (-)', 1, 'unidad'], ['Salchicha (hot dog) (-)', 1, 'unidad'],
    ['Mayonesa (-)', 1, 'cucharadita'],
  ],
  'Hamburguesa de carretilla (-)': [
    ['Pan francés (-)', 1, 'unidad'], ['Carne molida de res (Cocida)', 80, 'gramos'],
    ['Papas fritas (comida rápida) (-)', 40, 'gramos'], ['Mayonesa (-)', 2, 'cucharadita'],
    ['Lechuga (Cruda)', 10, 'gramos'], ['Tomate (Crudo)', 15, 'gramos'],
  ],
  'Sándwich de pollo (-)': [
    ['Pan integral (-)', 2, 'rebanada'], ['Pollo pechuga (Cocida)', 70, 'gramos'],
    ['Mayonesa (-)', 2, 'cucharadita'], ['Lechuga (Cruda)', 10, 'gramos'], ['Tomate (Crudo)', 20, 'gramos'],
  ],
  'Ensalada de pollo (-)': [
    ['Pollo pechuga (Cocida)', 120, 'gramos'], ['Lechuga (Cruda)', 100, 'gramos'],
    ['Tomate (Crudo)', 80, 'gramos'], ['Pepino (Crudo)', 60, 'gramos'],
    ['Zanahoria (Cruda)', 30, 'gramos'], ['Aceite de oliva (-)', 1, 'cucharada'],
  ],
  'Frejolada (frejol con arroz) (-)': [
    ['Frejol canario (Cocido)', 180, 'gramos'], ['Arroz blanco (Cocido)', 200, 'gramos'],
    ['Aceite vegetal (-)', 1, 'cucharadita'],
  ],
  'Menestra de lentejas con arroz (-)': [
    ['Lenteja (Cocida)', 180, 'gramos'], ['Arroz blanco (Cocido)', 200, 'gramos'],
    ['Aceite vegetal (-)', 1, 'cucharadita'],
  ],
  'Salchipapa (-)': [
    ['Papas fritas (comida rápida) (-)', 200, 'gramos'], ['Salchicha (hot dog) (-)', 2, 'unidad'],
  ],
  'Salchipollo (-)': [
    ['Papas fritas (comida rápida) (-)', 200, 'gramos'], ['Chicharrón de pollo (-)', 150, 'gramos'],
  ],
  // Platos de arroz: el arroz base + la carne. Si al alumno le sobró
  // solo el arroz, baja la carne a cero y queda el arroz solo.
  'Arroz con pollo (-)': [
    ['Arroz verde (Cocido)', 280, 'gramos'], ['Pollo pierna (con piel) (Cocida)', 120, 'gramos'],
  ],
  'Arroz con pato (-)': [
    ['Arroz verde (Cocido)', 280, 'gramos'], ['Pato (sin piel) (Cocido)', 120, 'gramos'],
  ],
  'Arroz a la jardinera (-)': [
    ['Arroz amarillo (a la jardinera) (Cocido)', 280, 'gramos'], ['Pollo pierna (con piel) (Cocida)', 120, 'gramos'],
  ],
  'Arroz con chancho (-)': [
    ['Arroz aderezado (con ají panca) (Cocido)', 280, 'gramos'], ['Cerdo (costilla) (Cocida)', 120, 'gramos'],
  ],
  'Arroz chaufa (-)': [
    ['Arroz blanco (Cocido)', 280, 'gramos'], ['Pollo pechuga (Cocida)', 70, 'gramos'],
    ['Huevo de gallina (Cocido)', 1, 'unidad'], ['Aceite vegetal (-)', 1, 'cucharada'],
  ],
  // Ensalada rusa: sin mayonesa (con limón y sal) o sin betarraga → se
  // baja ese ingrediente a cero.
  'Ensalada rusa (-)': [
    ['Papa (Cocida)', 80, 'gramos'], ['Betarraga (Cocida)', 50, 'gramos'],
    ['Zanahoria (Cocida)', 35, 'gramos'], ['Vainita (Cocida)', 25, 'gramos'],
    ['Mayonesa (-)', 1, 'cucharada'],
  ],
  'Pollo a la brasa con papas y ensalada (-)': [
    ['Pollo a la brasa (solo la presa) (-)', 1, '1/4 de pollo'], ['Papas fritas (comida rápida) (-)', 150, 'gramos'],
    ['Lechuga (Cruda)', 40, 'gramos'], ['Tomate (Crudo)', 30, 'gramos'],
  ],
};
