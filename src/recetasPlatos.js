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
   guisos (ají de gallina, lomo saltado…) se quedan como plato; su versión
   "con arroz" se separa en el guiso y el arroz (abajo). */
import { GUISOS_CON_ARROZ } from './buscador.js';

export const RECETAS_PLATOS = {
  'Pan con pollo (Pan blanco)': [
    ['Pan francés (-)', 1, 'unidad'], ['Pollo pechuga (Cocida)', 90, 'gramos'],
    ['Mayonesa (-)', 1, 'cucharada'], ['Lechuga (Cruda)', 10, 'gramos'],
  ],
  'Pan con pollo (Pan integral)': [
    ['Pan integral (-)', 35, 'gramos'], ['Pollo pechuga (Cocida)', 90, 'gramos'],
    ['Mayonesa (-)', 1, 'cucharada'], ['Lechuga (Cruda)', 10, 'gramos'],
  ],
  'Pan con jamonada (Pan blanco)': [
    ['Pan francés (-)', 1, 'unidad'], ['Jamonada (-)', 2, 'rebanada'],
  ],
  'Pan con jamonada (Pan integral)': [
    ['Pan integral (-)', 35, 'gramos'], ['Jamonada (-)', 2, 'rebanada'],
  ],
  'Pan con chicharrón (Pan blanco)': [
    ['Pan francés (-)', 1, 'unidad'], ['Chicharrón de chancho (-)', 100, 'gramos'],
    ['Camote (Cocido)', 60, 'gramos'], ['Cebolla (Cruda)', 25, 'gramos'],
  ],
  'Pan con chicharrón (Pan integral)': [
    ['Pan integral (-)', 35, 'gramos'], ['Chicharrón de chancho (-)', 100, 'gramos'],
    ['Camote (Cocido)', 60, 'gramos'], ['Cebolla (Cruda)', 25, 'gramos'],
  ],
  'Hot dog (Pan blanco)': [
    ['Pan francés (-)', 1, 'unidad'], ['Salchicha (hot dog) (-)', 1, 'unidad'],
    ['Mayonesa (-)', 1, 'cucharadita'],
  ],
  'Hot dog (Pan integral)': [
    ['Pan integral (-)', 35, 'gramos'], ['Salchicha (hot dog) (-)', 1, 'unidad'],
    ['Mayonesa (-)', 1, 'cucharadita'],
  ],
  'Hamburguesa de carretilla (Pan blanco)': [
    ['Pan francés (-)', 1, 'unidad'], ['Carne molida de res (Cocida)', 80, 'gramos'],
    ['Papas fritas (comida rápida) (-)', 40, 'gramos'], ['Mayonesa (-)', 2, 'cucharadita'],
    ['Lechuga (Cruda)', 10, 'gramos'], ['Tomate (Crudo)', 15, 'gramos'],
  ],
  'Hamburguesa de carretilla (Pan integral)': [
    ['Pan integral (-)', 35, 'gramos'], ['Carne molida de res (Cocida)', 80, 'gramos'],
    ['Papas fritas (comida rápida) (-)', 40, 'gramos'], ['Mayonesa (-)', 2, 'cucharadita'],
    ['Lechuga (Cruda)', 10, 'gramos'], ['Tomate (Crudo)', 15, 'gramos'],
  ],
  'Sándwich de pollo (Pan blanco)': [
    ['Pan de molde blanco (-)', 2, 'rebanada'], ['Pollo pechuga (Cocida)', 70, 'gramos'],
    ['Mayonesa (-)', 2, 'cucharadita'], ['Lechuga (Cruda)', 10, 'gramos'], ['Tomate (Crudo)', 20, 'gramos'],
  ],
  'Sándwich de pollo (Pan integral)': [
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
    ['Arroz chaufa (solo el arroz) (Cocido)', 330, 'gramos'], ['Pollo pechuga (Cocida)', 70, 'gramos'],
  ],
  'Arroz chaufa de carne (-)': [
    ['Arroz chaufa (solo el arroz) (Cocido)', 330, 'gramos'], ['Carne de res (bistec) (Cocida)', 70, 'gramos'],
  ],
  'Arroz chaufa de chancho (-)': [
    ['Arroz chaufa (solo el arroz) (Cocido)', 330, 'gramos'], ['Cerdo (lomo) (Cocido)', 70, 'gramos'],
  ],
  'Arroz chaufa especial (-)': [
    ['Arroz chaufa (solo el arroz) (Cocido)', 280, 'gramos'], ['Pollo pechuga (Cocida)', 40, 'gramos'],
    ['Carne de res (bistec) (Cocida)', 40, 'gramos'], ['Cerdo (lomo) (Cocido)', 40, 'gramos'],
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
  // Lomo y saltado de pollo con papas fritas (17 oct): el saltado sin papas
  // + la porción de papas fritas, los mismos gramos con que se calcularon.
  'Lomo saltado (Con papas fritas)': [
    ['Lomo saltado (Sin papas fritas)', 295, 'gramos'], ['Papas fritas (comida rápida) (-)', 150, 'gramos'],
  ],
  'Saltado de pollo (Con papas fritas)': [
    ['Saltado de pollo (Sin papas fritas)', 280, 'gramos'], ['Papas fritas (comida rápida) (-)', 150, 'gramos'],
  ],
};

// Pollo a la brasa con papas y ensalada por corte (17 oct): la presa de ese
// corte + las papas y la ensalada con que se calculó cada uno.
for (const [corte, presa] of [['pierna', 'Pollo a la brasa pierna (solo la presa)'], ['pecho', 'Pollo a la brasa pecho (solo la presa)']]) {
  for (const piel of ['con piel', 'sin piel']) {
    const clavePresa = `${presa} (${piel === 'con piel' ? 'Con piel' : 'Sin piel'})`;
    const cuarto = [['Papas fritas (comida rápida) (-)', 150, 'gramos'], ['Lechuga (Cruda)', 40, 'gramos'], ['Tomate (Crudo)', 30, 'gramos']];
    const octavo = [['Papas fritas (comida rápida) (-)', 120, 'gramos'], ['Lechuga (Cruda)', 30, 'gramos'], ['Tomate (Crudo)', 25, 'gramos']];
    RECETAS_PLATOS[`Pollo a la brasa con papas y ensalada (1/4 ${corte} ${piel})`] = [[clavePresa, 1, 'cuarto de pollo'], ...cuarto];
    if (corte === 'pecho') {
      RECETAS_PLATOS[`Pollo a la brasa con papas y ensalada (1/8 pecho ${piel})`] = [[clavePresa, 1, 'octavo de pollo'], ...octavo];
    } else {
      RECETAS_PLATOS[`Pollo a la brasa con papas y ensalada (1/8 pierna ${piel})`] = [[clavePresa, 1, 'octavo (pierna)'], ...octavo];
      RECETAS_PLATOS[`Pollo a la brasa con papas y ensalada (1/8 entrepierna ${piel})`] = [[clavePresa, 1, 'octavo (entrepierna)'], ...octavo];
    }
  }
}

// Lo que ya se anotó antes de separar los sándwiches por pan (15 oct)
// era en pan blanco: se separa con la misma receta.
for (const n of ['Pan con pollo', 'Pan con jamonada', 'Pan con chicharrón', 'Hot dog', 'Hamburguesa de carretilla', 'Sándwich de pollo']) {
  RECETAS_PLATOS[`${n} (-)`] = RECETAS_PLATOS[`${n} (Pan blanco)`];
}

// Guisos con arroz (16 oct): 1 plato = 300 g del guiso + 180 g de arroz
// blanco cocido (los mismos números con que se calcularon). "🧩 Ajustar
// ingredientes" los separa para bajarle (o subirle) el arroz.
for (const [conArroz, guiso] of GUISOS_CON_ARROZ) {
  RECETAS_PLATOS[`${conArroz} (-)`] = [[`${guiso} (-)`, 300, 'gramos'], ['Arroz blanco (Cocido)', 180, 'gramos']];
}
// Lomo saltado con arroz con o sin papas fritas (17 oct): 1 plato del lomo
// (445 o 295 g) + 180 g de arroz, como se calcularon.
RECETAS_PLATOS['Lomo saltado con arroz (Con papas fritas)'] = [['Lomo saltado (Con papas fritas)', 445, 'gramos'], ['Arroz blanco (Cocido)', 180, 'gramos']];
RECETAS_PLATOS['Lomo saltado con arroz (Sin papas fritas)'] = [['Lomo saltado (Sin papas fritas)', 295, 'gramos'], ['Arroz blanco (Cocido)', 180, 'gramos']];
