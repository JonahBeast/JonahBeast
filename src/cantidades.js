/* "¿SEGURO?" PARA CANTIDADES ABSURDAS (17 oct 2026, pedido de Jonah).

   Un alumno anotó "200 platos" de tallarines verdes (quería decir 200 g):
   el día le salió en miles de calorías. Antes de anotar una cantidad que
   casi seguro es un error, la app pregunta "¿Seguro?" y ofrece lo que
   probablemente quiso decir. Vale para todas las formas de anotar donde
   se escribe o se dice una cantidad: escribir, voz, Beast, "Editar" y
   "⚖️ Lo pesé" de la foto.

   Cuándo pregunta (umbrales):
   - Más de 10 platos, porciones o piezas de 100 g o más (un plato, una
     presa, un sándwich, una lata grande): nadie come 11 platos en una
     comida. 10 todavía pasa (una fuente familiar, 10 empanadas para
     compartir… se anota y ya).
   - Más de 3.000 kcal en un solo alimento: es más de lo que la mayoría
     come en un día entero (la meta de casi todos los alumnos está entre
     1.400 y 2.500). Un pollo a la brasa entero con papas (~4.000) también
     pregunta: si de verdad fue, se confirma con un toque.
   No bloquea: con "Sí, está bien" se anota igual.

   "¿Quisiste decir…?": si dijo un número de 20 o más en una medida casera
   ("200 platos"), lo más probable es que fueran gramos: se ofrece "200 g". */
export const UMBRAL_PIEZAS = 10;
export const PIEZA_GRANDE_G = 100;
export const UMBRAL_KCAL = 3000;

// food: el alimento; unit/qty: la medida; gramsPerUnit y kcalDe: de la app
// (kcalDe(unit, qty) → kcal). Devuelve null o { motivo, kcal, gramos,
// alternativa: { unit: 'gramos', qty, kcal } | null }.
export function cantidadDudosa(food, unit, qty, { gramsPerUnit, kcalDe }) {
  const n = Number(qty);
  if (!food || !(n > 0)) return null;
  const enGramos = unit === 'gramos' || unit === 'ml';
  const porUnidad = enGramos ? 1 : gramsPerUnit(food, unit);
  const gramos = n * porUnidad;
  const kcal = kcalDe(unit, n);
  const muchasPiezas = !enGramos && porUnidad >= PIEZA_GRANDE_G && n > UMBRAL_PIEZAS;
  const muchasKcal = kcal > UMBRAL_KCAL;
  if (!muchasPiezas && !muchasKcal) return null;
  let alternativa = null;
  if (!enGramos && n >= 20 && n <= 1500) {
    const k = kcalDe('gramos', n);
    if (k <= UMBRAL_KCAL) alternativa = { unit: 'gramos', qty: Math.round(n), kcal: Math.round(k) };
  }
  return { motivo: muchasPiezas ? 'piezas' : 'kcal', kcal: Math.round(kcal), gramos: Math.round(gramos), alternativa };
}

// "200 platos", "1 plato", "200 g".
export function textoMedida(unit, qty) {
  const n = Number(qty);
  const num = String(Math.round(n * 100) / 100).replace('.', ',');
  if (unit === 'gramos') return `${num} g`;
  if (unit === 'ml') return `${num} ml`;
  if (n === 1 || /[\s/]/.test(unit)) return `${num} ${unit}`;
  return `${num} ${unit === 'porción' ? 'porciones' : /[aeiou]$/.test(unit) ? unit + 's' : unit + 'es'}`;
}

// "¿Seguro? 200 platos de Tallarines verdes son unas 148.000 kcal."
export function textoDuda(nombre, unit, qty, duda) {
  const kcal = duda.kcal.toLocaleString('es-PE');
  return `¿Seguro? ${textoMedida(unit, qty)} de ${nombre} son unas ${kcal} kcal.`;
}
