// scripts/probar-frases.mjs
//
// Prueba cómo la app entiende lo que el alumno dice o le escribe a Beast
// (src/interpretarComida.js) con frases reales, y cuántas kcal anota.
// Cada frase lleva las kcal que debe dar; si alguna da otra cosa, falla.
// Nació de la revisión de cálculos del 17 de octubre: "1 cuarto de pollo a
// la brasa, papas fritas, ensalada de lechuga" sumaba el plato completo (que
// ya trae papas y ensalada) MÁS papas y lechuga: 1573 kcal en vez de 1090.
//
// Corre solo en npm run build. Uso a mano:
//   node scripts/probar-frases.mjs --todo   (cada frase con lo que anota)
//   node scripts/probar-frases.mjs --json   (para comparar antes/después)
//   EXTRAS=archivo.json node scripts/probar-frases.mjs --todo
//     (suma los alimentos del panel, sacados de alimentos_extra)

import { readFileSync } from 'node:fs';
import { unidadPorDefecto as unidadPorDefectoCon } from '../src/buscador.js';
import { interpretarVarios, porcionDelItem } from '../src/interpretarComida.js';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
function literal(nombre) {
  const inicio = app.indexOf(`const ${nombre} = `);
  if (inicio < 0) throw new Error(`No encontré ${nombre} en src/App.jsx`);
  const i = inicio + `const ${nombre} = `.length;
  const abre = app[i], cierra = abre === '[' ? ']' : '}';
  let nivel = 0, j = i;
  for (; j < app.length; j++) {
    if (app[j] === abre) nivel++;
    else if (app[j] === cierra && --nivel === 0) break;
  }
  return Function(`"use strict"; return (${app.slice(i, j + 1)});`)();
}

const aFood = ([group, name, state, kcal, protein, carbs, fat, fiber]) => ({
  group, name, state, kcal, protein, carbs, fat, fiber, key: `${name} (${state})`,
});
const UNITS_BY_NAME = literal('UNITS_BY_NAME');
const UNITS_BY_GROUP = literal('UNITS_BY_GROUP');
export const FOODS = literal('RAW_FOODS').map(aFood);
// Opcional: los alimentos del panel (alimentos_extra), sacados de la base
// como [[grupo, nombre, estado, kcal, prot, carbos, grasa, fibra], ...].
if (process.env.EXTRAS) {
  for (const fila of JSON.parse(readFileSync(process.env.EXTRAS, 'utf8'))) {
    const f = aFood(fila.map((v, i) => (i >= 3 && i <= 7 ? Number(v) : v)));
    if (!FOODS.some(o => o.key === f.key)) FOODS.push({ ...f, esExtra: true });
    // [.., sin_arroz, unidad, gramos]: su medida casera, como en la app.
    if (fila[9] && Number(fila[10]) > 0 && !UNITS_BY_NAME[f.name]) {
      UNITS_BY_NAME[f.name] = [[fila[9], Number(fila[10])], ...(UNITS_BY_GROUP[f.group] || []).filter(u => u[0] !== fila[9])];
    }
  }
}
// Igual que unitsFor de src/App.jsx.
function unitsFor(food) {
  const list = [['gramos', 1]];
  const byName = UNITS_BY_NAME[food.key] || UNITS_BY_NAME[food.name];
  const byGroup = UNITS_BY_GROUP[food.group];
  if (byName) list.push(...byName);
  else if (byGroup) list.push(...byGroup);
  return list;
}
const unidadPorDefecto = f => unidadPorDefectoCon(f, unitsFor);
const gramos = (food, unit, qty) => unit === 'gramos' ? qty : qty * ((unitsFor(food).find(u => u[0] === unit) || [0, 1])[1]);

// Lo mismo que anota la app (agregarVarios / entradasDeItems): lo que tiene
// dudas va con la primera opción.
export function anotar(frase) {
  const items = interpretarVarios(frase, FOODS, unitsFor);
  const anotados = [];
  for (const it of items) {
    if (it.sinCoincidencia) { anotados.push({ texto: it.textoOriginal, nada: true }); continue; }
    const food = it.necesitaAclarar && it.opciones?.length ? it.opciones[0] : it.food;
    const p = porcionDelItem({ ...it, food }, unidadPorDefecto, unitsFor);
    const kcal = food.kcal * gramos(food, p.unit, p.qty) / 100;
    anotados.push({ texto: it.textoOriginal, key: food.key, unit: p.unit, qty: p.qty, kcal: Math.round(kcal), duda: !!it.necesitaAclarar });
  }
  return { total: anotados.reduce((s, a) => s + (a.kcal || 0), 0), anotados };
}

// [frase, kcal que debe dar, por qué]
export const FRASES = [
  // El caso del prompt de Beast y sus variantes (doble conteo).
  ['1 cuarto de pollo a la brasa, papas fritas, ensalada de lechuga', 1090, 'plato 1/4 con papas (470 g × 232); papas y ensalada ya van'],
  ['1 cuarto de pollo a la brasa con papas y ensalada', 1090, 'plato 1/4 con papas'],
  ['un cuarto de pollo a la brasa con papas y ensalada', 1090, 'plato 1/4 con papas'],
  ['1/4 de pollo con papas', 1090, 'plato 1/4 con papas'],
  ['un cuarto de pollo con papas fritas', 1090, 'plato 1/4 con papas'],
  ['pollo a la brasa con papas y ensalada', 1090, 'plato 1/4 con papas (la porción de siempre)'],
  ['octavo de pollo a la brasa con papas', 696, 'plato 1/8 con papas (300 g × 232)'],
  ['1/8 de pollo a la brasa con papas y ensalada', 696, 'plato 1/8 con papas'],
  ['medio pollo a la brasa con papas', 2181, '2 × plato 1/4 con papas (2 × 470 g × 232)'],
  ['octavo de pollo a la brasa', 696, 'pregunta si fue con papas (primero) o solo la presa; en 1/8'],
  ['un cuarto de pollo a la brasa', 1090, 'pregunta si fue con papas (primero) o solo la presa; en 1/4'],
  ['pollo a la brasa pierna con papas', 997, 'presa pierna con piel (230 g × 230 = 529) + papas fritas (468): la app no tiene el plato por corte'],
  ['pollo a la brasa pecho sin piel', 404, 'cuarto pecho sin piel, 245 g × 165'],
  ['pollada pierna con papas', 1014, 'pollada pierna (presa sola) + papas aparte: la pollada de la app es solo el pollo'],
  ['salchipapa', 876, 'salchipapa, porción 300 g × 292'],
  ['salchipapa con papas fritas', 876, 'la salchipapa ya trae sus papas'],
  ['una hamburguesa de carretilla con papas fritas', 968, 'hamburguesa + papas aparte (la hamburguesa no trae papas)'],
  ['lomo saltado y arroz', 895, 'lomo saltado + arroz aparte: el lomo de la app no trae arroz'],
  ['lomo saltado con arroz', 758, 'plato "Lomo saltado con arroz" (480 g × 158)'],
  ['lomo saltado con arroz y arroz blanco', 758, 'el arroz ya va en el plato'],
  ['ají de gallina con arroz', 730, 'plato con arroz (480 g × 152)'],
  ['ají de gallina y arroz', 855, 'guiso + arroz aparte'],
  ['pollo a la olla con arroz', 742, 'plato con arroz (580 g × 128)'],
  ['frejolada con arroz', 560, 'la frejolada ya trae su arroz (400 g × 140)'],
  ['menestra de lentejas con arroz', 520, 'plato con arroz (400 g × 130)'],
  ['arroz chaufa', 660, 'chaufa 400 g × 165'],
  ['arroz con pollo y papa a la huancaína', 1200, 'dos platos distintos: los dos se anotan'],
  ['2 huevos y 1 pan', 251, 'desayuno: no debe cambiar'],
  ['1 pan con pollo', 460, 'sándwich: no debe cambiar'],
  ['café con leche y 2 panes con mantequilla', 516, 'desayuno: no debe cambiar'],
  ['avena con leche', 81, 'no debe cambiar'],
  ['jugo de papaya sin azúcar', 80, 'no debe cambiar'],
  ['ceviche de pescado', 255, 'no debe cambiar'],
  ['1 taza de arroz blanco y 1 bistec', 396, 'no debe cambiar'],
  ['papa a la huancaína', 600, 'no debe cambiar'],
  ['causa limeña', 580, 'no debe cambiar'],
  ['rocoto relleno con pastel de papa', 720, 'no debe cambiar'],
  ['seco de res con frejoles y arroz', 715, 'plato con frejoles y arroz (480 g × 149)'],
  ['tacu tacu con arroz', 800, 'el tacu tacu ya es arroz con frejoles'],
  ['pollo broaster con papas', 903, 'broaster + papas aparte (el broaster es solo el pollo)'],
  ['150 g de pollo a la brasa con papas', 348, 'gramos dichos: 150 g del plato × 232'],
  ['pollo a la brasa con papas, ensalada y 1 vaso de chicha morada', 1126, 'el plato + la chicha'],
  ['2 octavos de pollo a la brasa con papas', 1392, '2 × plato 1/8 con papas'],
  ['un octavo de pollo a la brasa entrepierna', 311, 'presa sola, octavo (entrepierna) con piel: 135 g × 230'],
  ['pollada con papas y ensalada', 1029, 'la pollada de la app es solo el pollo: papas y ensalada van aparte (pregunta cuáles)'],
  ['pescado frito con arroz', 555, 'pescado (plato 180 g × 200 = 360) + arroz 150 g (195): antes el arroz se perdía'],
  ['empanada mixta de carne y pollo', 319, 'una empanada (antes se contaba dos veces)'],
  ['olluquito con charqui y arroz', 566, 'el plato con arroz (antes olluquito + arroz aparte)'],
  ['un pan con palta y un café', 350, 'desayuno: no debe cambiar'],
  ['2 panes con huevo y un jugo de naranja', 526, 'desayuno: no debe cambiar'],
  ['una manzana y un plátano', 384, 'no debe cambiar'],
  ['tamal y café con leche', 539, 'no debe cambiar'],
  ['un vaso de chicha morada', 36, 'bebida: no debe cambiar'],
  ['una porción de torta de chocolate', 370, 'postre: no debe cambiar'],
];

if (import.meta.url === `file://${process.argv[1]}`) main();
function main() {
const json = process.argv.includes('--json');
const todo = process.argv.includes('--todo');
const resultados = FRASES.map(([frase, espera, porque]) => ({ frase, espera, porque, ...anotar(frase) }));
if (json) {
  console.log(JSON.stringify(resultados.map(r => ({ frase: r.frase, total: r.total, anotados: r.anotados.map(a => `${a.key || '¿' + a.texto + '?'} ${a.qty ?? ''} ${a.unit ?? ''} = ${a.kcal ?? 0}`) })), null, 1));
} else {
  let malas = 0;
  for (const r of resultados) {
    const ok = r.espera === null || r.espera === r.total;
    if (!ok) malas++;
    if (ok && !todo) continue;
    console.log(`${ok ? '✅' : '❌'} "${r.frase}" → ${r.total} kcal${r.espera !== null ? ` (debe dar ${r.espera})` : ''}`);
    for (const a of r.anotados) console.log(`     · ${a.nada ? `"${a.texto}" no está en la app` : `${a.key} · ${a.qty} ${a.unit} = ${a.kcal} kcal${a.duda ? ' (pregunta cuál)' : ''}`}`);
  }
  console.log(`\n${malas ? `❌ ${malas} frase(s) dan otro número.` : `✅ Frases de voz y Beast: las ${resultados.length} dan lo que deben.`}`);
  if (malas) process.exit(1);
}
}
