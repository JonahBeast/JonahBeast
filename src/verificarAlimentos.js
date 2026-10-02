/* REVISIÓN DE ALIMENTOS: reglas para que la base de alimentos esté siempre
   limpia. Valores por 100 g. La usan:
     - scripts/verificar-alimentos.mjs (al armar la app, npm run build): los
       alimentos de la lista de la app (RAW_FOODS en src/App.jsx);
     - api/cron/verificar-alimentos.js (cada lunes): los que se agregan por
       pedidos (alimentos_extra) y los productos escaneados (productos).

   Lo que revisa:
     1. Que las calorías cuadren con los macros (4 kcal por g de proteína y
        de carbohidrato, 9 por g de grasa), con un margen del 12% (mínimo
        15 kcal). Las bebidas con alcohol solo se revisan para que no tengan
        menos calorías que sus macros.
     2. Que proteína + carbohidrato + grasa no pasen de 100 g en 100 g (si
        pasa, casi siempre son los números de una porción, no de 100 g).
     3. Que la fibra no sea mayor que los carbohidratos.
     4. Que no haya valores negativos o vacíos, ni 0 kcal en algo que sí
        tiene energía.
     5. Que una medida casera tenga sus gramos.
   Devuelve una lista de problemas en palabras simples (vacía = bien). */

const ALCOHOL = /cerveza|vino|pisco|chilcano|sangr[ií]a|\bron\b|whisky|vodka|licor|cuba libre|sour/i;
const SIN_ENERGIA = /agua|\bté\b|infusi|café|cafe|\bsal\b|stevia|edulcor|zero|light|diet/i;

export function revisarAlimento(a) {
  const n = Number;
  const kcal = n(a.kcal), p = n(a.proteina), c = n(a.carbos), g = n(a.grasa), f = n(a.fibra ?? 0);
  const problemas = [];
  if ([kcal, p, c, g, f].some(x => !Number.isFinite(x) || x < 0)) {
    return ['tiene un valor vacío o negativo'];
  }
  const segunMacros = 4 * p + 4 * c + 9 * g;
  const segunMacrosFibra = 4 * p + 4 * Math.max(0, c - f) + 9 * g + 2 * f;
  const margen = Math.max(15, 0.12 * kcal);
  const diferencia = Math.min(Math.abs(kcal - segunMacros), Math.abs(kcal - segunMacrosFibra));
  if (ALCOHOL.test(a.nombre || '')) {
    if (kcal < segunMacros - margen) problemas.push(`tiene ${kcal} kcal, menos que lo que suman sus macros (${Math.round(segunMacros)})`);
  } else if (diferencia > margen) {
    problemas.push(`tiene ${kcal} kcal pero sus macros suman ${Math.round(segunMacros)} kcal`);
  }
  if (p + c + g > 100.5) problemas.push(`proteína, carbohidrato y grasa suman ${(p + c + g).toFixed(1)} g en 100 g (seguro son los números de una porción)`);
  if (f > c + 0.5) problemas.push(`tiene más fibra (${f} g) que carbohidratos (${c} g)`);
  if (kcal === 0 && !SIN_ENERGIA.test(a.nombre || '')) problemas.push('tiene 0 kcal');
  if (a.unidad && !(n(a.gramos_unidad) > 0)) problemas.push(`la medida "${a.unidad}" no dice cuántos gramos pesa`);
  return problemas;
}
