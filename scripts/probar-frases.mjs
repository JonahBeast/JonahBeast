// scripts/probar-frases.mjs
//
// Prueba cómo la app entiende lo que el alumno dice o le escribe a Beast
// (src/interpretarComida.js) con frases reales, y cuántas kcal anota.
// Cada frase lleva las kcal que debe dar; si alguna da otra cosa, falla.
// Nació de la revisión de cálculos del 17 de octubre: "1 cuarto de pollo a
// la brasa, papas fritas, ensalada de lechuga" sumaba el plato completo (que
// ya trae papas y ensalada) MÁS papas y lechuga: 1573 kcal en vez de 1090
// (desde el 17 oct el plato va por su receta: 1017).
//
// Corre solo en npm run build. Uso a mano:
//   node scripts/probar-frases.mjs --todo   (cada frase con lo que anota)
//   node scripts/probar-frases.mjs --json   (para comparar antes/después)
//   EXTRAS=archivo.json node scripts/probar-frases.mjs --todo
//     (suma los alimentos del panel, sacados de alimentos_extra)

import { readFileSync } from 'node:fs';
import { unidadPorDefecto as unidadPorDefectoCon } from '../src/buscador.js';
import { interpretarVarios, porcionDelItem } from '../src/interpretarComida.js';
import { gramosMedidaRetirada } from '../src/medidasRetiradas.js';
import { cantidadDudosa } from '../src/cantidades.js';

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
// Como gramsPerUnit de src/App.jsx: la medida de hoy o la retirada (nunca 1 g).
const gramos = (food, unit, qty) => unit === 'gramos' ? qty : qty * ((unitsFor(food).find(u => u[0] === unit) || [0, gramosMedidaRetirada(food, unit) || NaN])[1]);

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
  ['1 cuarto de pollo a la brasa, papas fritas, ensalada de lechuga', 1017, 'plato 1/4 con papas (470 g × 216,4, su receta; antes 1090); papas y ensalada ya van'],
  ['1 cuarto de pollo a la brasa con papas y ensalada', 1017, 'plato 1/4 con papas'],
  ['un cuarto de pollo a la brasa con papas y ensalada', 1017, 'plato 1/4 con papas'],
  ['1/4 de pollo con papas', 1017, 'plato 1/4 con papas'],
  ['un cuarto de pollo con papas fritas', 1017, 'plato 1/4 con papas'],
  ['pollo a la brasa con papas y ensalada', 1017, 'plato 1/4 con papas (la porción de siempre)'],
  ['octavo de pollo a la brasa con papas', 649, 'plato 1/8 con papas (300 g × 216,4; antes 696)'],
  ['1/8 de pollo a la brasa con papas y ensalada', 649, 'plato 1/8 con papas'],
  ['medio pollo a la brasa con papas', 2034, '2 × plato 1/4 con papas (2 × 470 g × 216,4; antes 2181)'],
  ['octavo de pollo a la brasa', 649, 'pregunta si fue con papas (primero) o solo la presa; en 1/8'],
  ['un cuarto de pollo a la brasa', 1017, 'pregunta si fue con papas (primero) o solo la presa; en 1/4'],
  ['pollo a la brasa pierna con papas', 1008, 'plato por corte 1/4 pierna con piel (450 g × 224,1); antes 997 = presa + papas, sin la ensalada (17 oct)'],
  ['pollo a la brasa pecho sin piel', 404, 'cuarto pecho sin piel, 245 g × 165'],
  ['pollada pierna con papas', 1014, 'pollada pierna (presa sola) + papas aparte: la pollada de la app es solo el pollo'],
  ['salchipapa', 876, 'salchipapa, porción 300 g × 292'],
  ['salchipapa con papas fritas', 876, 'la salchipapa ya trae sus papas'],
  ['una hamburguesa de carretilla con papas fritas', 968, 'hamburguesa + papas aparte (la hamburguesa no trae papas)'],
  ['lomo saltado y arroz', 996, 'lomo (pregunta con o sin papas; con papas primero: 445 g × 180) + arroz aparte (150 g); antes 895'],
  ['lomo saltado con arroz', 1038, 'plato con arroz, pregunta con o sin papas (con papas primero: 625 g × 166); antes 758'],
  ['lomo saltado con arroz y arroz blanco', 1038, 'el arroz ya va en el plato; antes 758'],
  ['ají de gallina con arroz', 730, 'plato con arroz (480 g × 152)'],
  ['ají de gallina y arroz', 855, 'guiso + arroz aparte'],
  ['pollo a la olla con arroz', 742, 'plato con arroz (580 g × 128)'],
  ['frejolada con arroz', 560, 'la frejolada ya trae su arroz (400 g × 140)'],
  ['menestra de lentejas con arroz', 520, 'plato con arroz (400 g × 130)'],
  ['arroz chaufa', 660, 'chaufa 400 g × 165'],
  ['arroz con pollo y papa a la huancaína', 1200, 'dos platos distintos: los dos se anotan'],
  ['2 huevos y 1 pan', 251, 'desayuno: no debe cambiar'],
  ['1 pan con pollo', 460, 'sándwich: no debe cambiar'],
  ['café con leche y 2 panes con mantequilla', 380, 'café + 2 panes + 2 cucharaditas de mantequilla (antes 2 "Pan con jamonada": 516)'],
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
  ['150 g de pollo a la brasa con papas', 325, 'gramos dichos: 150 g del plato × 216,4 (antes 348)'],
  ['pollo a la brasa con papas, ensalada y 1 vaso de chicha morada', 1053, 'el plato + la chicha (antes 1126)'],
  ['2 octavos de pollo a la brasa con papas', 1298, '2 × plato 1/8 con papas (antes 1392)'],
  ['un octavo de pollo a la brasa entrepierna', 311, 'presa sola, octavo (entrepierna) con piel: 135 g × 230'],
  ['pollada con papas y ensalada', 1029, 'la pollada de la app es solo el pollo: papas y ensalada van aparte (pregunta cuáles)'],
  ['pescado frito con arroz', 555, 'pescado (plato 180 g × 200 = 360) + arroz 150 g (195): antes el arroz se perdía'],
  ['empanada mixta de carne y pollo', 319, 'una empanada (antes se contaba dos veces)'],
  ['olluquito con charqui y arroz', 566, 'el plato con arroz (antes olluquito + arroz aparte)'],
  ['un pan con palta y un café', 206, 'pan (96) + 1 porción de palta para pan (80) + café (antes una palta entera: 350)'],
  ['2 panes con huevo y un jugo de naranja', 514, '2 panes + 2 huevos fritos + jugo (antes 2 "Pan con jamonada": 526)'],
  ['una manzana y un plátano', 384, 'no debe cambiar'],
  ['tamal y café con leche', 539, 'no debe cambiar'],
  ['un vaso de chicha morada', 36, 'bebida: no debe cambiar'],
  ['una porción de torta de chocolate', 370, 'postre: no debe cambiar'],

  // 17 oct (pedidos de Jonah): lomo saltado con y sin papas fritas.
  ['lomo saltado', 801, 'pregunta "¿con papas fritas o sin?" (con papas primero: 445 g × 180)'],
  ['lomo saltado con papas', 801, 'el que trae las papas, sin preguntar'],
  ['lomo saltado con papas fritas', 801, 'el que trae las papas'],
  ['lomo saltado sin papas', 333, 'sin papas fritas (295 g × 113)'],
  ['lomo saltado y papas fritas aparte', 801, 'sin papas (333) + papas fritas aparte (468): el mismo total'],
  ['lomo saltado, papas fritas', 801, 'sin papas + papas fritas aparte, no las papas dos veces'],
  ['lomo saltado con arroz sin papas', 570, 'plato con arroz sin papas (475 g × 120)'],
  ['lomo saltado sin papas y arroz', 528, 'sin papas (333) + arroz aparte (195)'],
  ['saltado de pollo', 813, 'pregunta con o sin papas (con papas primero: 430 g × 189)'],
  ['saltado de pollo sin papas fritas', 344, 'sin papas (280 g × 123)'],
  // Ají de gallina: la papa sancochada va aparte, por unidad.
  ['ají de gallina con papa', 791, 'ají de gallina (660) + 1 papa cocida (150 g × 87)'],
  ['ají de gallina con papas', 791, 'igual: 1 papa'],
  ['ají de gallina con arroz y papa', 861, 'plato con arroz (730) + 1 papa'],
  // Pollo a la brasa con papas y ensalada por corte.
  ['un cuarto de pollo a la brasa pecho con papas y ensalada', 1019, 'plato 1/4 pecho con piel (490 g × 208)'],
  ['cuarto de pollo pecho con papas y ensalada', 1019, 'igual'],
  ['un cuarto de pollo a la brasa pecho, papas fritas, ensalada', 1019, 'igual: las papas y la ensalada ya van'],
  ['octavo de pollo a la brasa pierna con papas', 602, 'plato 1/8 pierna con piel (270 g × 222,9)'],
  ['un octavo de pollo a la brasa entrepierna con papas', 694, 'plato 1/8 entrepierna con piel (310 g × 223,8)'],
  ['1/8 de pollo a la brasa pecho con papas y ensalada', 653, 'plato 1/8 pecho con piel (310 g × 210,8)'],
  ['pollo a la brasa pecho sin piel con papas', 884, 'plato 1/4 pecho sin piel (465 g × 190)'],
  ['pollo a la brasa pecho solo la presa', 540, 'la presa sola, sin papas'],
  // Pan con palta, con huevo…: no son platos, son el pan y lo de dentro.
  ['pan con palta', 176, 'pan francés (96) + 1 porción de palta para pan (50 g = 80)'],
  ['2 panes con palta', 352, '2 panes + 2 porciones de palta'],
  ['pan integral con palta', 182, 'pan integral (1 rebanada) + palta para pan'],
  ['pan con huevo', 194, 'pan + 1 huevo frito'],
  ['dos panes con huevo', 388, '2 panes + 2 huevos fritos'],
  ['pan con mantequilla', 132, 'pan + 1 cucharadita de mantequilla'],
  ['pan con camote', 150, 'pan + 60 g de camote (como el pan con chicharrón)'],
  ['pan con pollo', 460, 'sándwich de la lista: no cambia'],
  ['pan con chicharrón', 616, 'sándwich de la lista: no cambia'],
  // 17 oct: porciones de los secos y la medida dicha.
  ['avena en hojuelas', 156, '½ taza (40 g × 389); antes 150 g = 584'],
  ['lentejas crudas', 212, '60 g crudos, lo que rinde 1 taza cocida; antes 1 taza cruda = 635'],
  ['una taza de lentejas crudas', 635, 'si dice "taza", 1 taza (180 g)'],
  ['2 vasos de chicha morada', 72, 'la medida dicha (vaso) × 2'],
];

/* Exactitud de lo anotado (17 oct): medidas retiradas, porciones de los
   secos y "¿Seguro?" para cantidades absurdas. [qué, valor, debe dar]. */
const porClave = k => FOODS.find(f => f.key === k);
const kcalEntrada = (k, unit, qty) => { const f = porClave(k); return Math.round(f.kcal * gramos(f, unit, qty) / 100); };
const dudosa = (k, unit, qty) => cantidadDudosa(porClave(k), unit, qty, {
  gramsPerUnit: (f, u) => gramos(f, u, 1),
  kcalDe: (u, q) => porClave(k).kcal * gramos(porClave(k), u, q) / 100,
});
const defecto = k => { const f = porClave(k); const d = unidadPorDefecto(f); return `${d.qty} ${d.unit} = ${kcalEntrada(k, d.unit, d.qty)} kcal`; };
export const CASOS = [
  // Medidas retiradas: lo ya anotado con ellas vale lo de antes, no 1 g.
  ['1 taza de arroz blanco cocido (medida retirada, 160 g)', kcalEntrada('Arroz blanco (Cocido)', 'taza', 1), 208],
  ['1 taza de gaseosa (medida retirada, 240 ml)', kcalEntrada('Gaseosa regular (-)', 'taza', 1), 101],
  ['1 media porción de pollo al horno (retirada, 200 g)', kcalEntrada('Pollo al horno (-)', 'media porción', 1), 380],
  ['2 porciones de papa sancochada (retirada, 120 g)', kcalEntrada('Papa (Cocida)', 'porción', 2), 209],
  ['1 taza de avena en hojuelas (retirada, 160 g)', kcalEntrada('Avena en hojuelas (Cruda)', 'taza', 1), 622],
  // Porción por defecto de los secos.
  ['avena en hojuelas por defecto', defecto('Avena en hojuelas (Cruda)'), '1 media taza = 156 kcal'],
  ['arroz blanco crudo por defecto', defecto('Arroz blanco (Crudo)'), '55 gramos = 201 kcal'],
  ['lenteja cruda por defecto', defecto('Lenteja (Cruda)'), '60 gramos = 212 kcal'],
  ['fideos crudos por defecto', defecto('Fideos / pasta (Crudos)'), '95 gramos = 352 kcal'],
  ['cornflakes por defecto', defecto('Cereal cornflakes sin gluten (-)'), '30 gramos = 113 kcal'],
  ['avena instantánea por defecto', defecto('Avena instantánea en polvo (-)'), '4 cucharada = 136 kcal'],
  // "¿Seguro?"
  ['200 platos de tallarines verdes', JSON.stringify(dudosa('Tallarines verdes (-)', 'plato', 200)?.alternativa ?? null), JSON.stringify({ unit: 'gramos', qty: 200, kcal: 370 })],
  ['1 plato de tallarines verdes', dudosa('Tallarines verdes (-)', 'plato', 1), null],
  ['200 g de tallarines verdes', dudosa('Tallarines verdes (-)', 'gramos', 200), null],
  ['2 cuartos de pollo a la brasa con papas (2034 kcal)', dudosa('Pollo a la brasa con papas y ensalada (-)', '1/4 con papas', 2), null],
  ['4 cuartos de pollo a la brasa con papas (4068 kcal)', dudosa('Pollo a la brasa con papas y ensalada (-)', '1/4 con papas', 4)?.motivo, 'kcal'],
  ['12 fresas', dudosa('Fresa (Cruda)', 'unidad', 12), null],
  ['3 huevos', dudosa('Huevo de gallina (Cocido)', 'unidad', 3), null],
  ['11 panes con pollo', dudosa('Pan con pollo (Pan blanco)', 'unidad', 11)?.motivo, 'piezas'],
  ['3000 g de aceite', dudosa('Aceite vegetal (-)', 'gramos', 3000)?.motivo, 'kcal'],
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
  let malosCasos = 0;
  for (const [que, da, debe] of CASOS) {
    const ok = da === debe;
    if (!ok) malosCasos++;
    if (!ok || todo) console.log(`${ok ? '✅' : '❌'} ${que} → ${da}${ok ? '' : ` (debe dar ${debe})`}`);
  }
  console.log(malosCasos ? `❌ ${malosCasos} caso(s) de exactitud dan otra cosa.` : `✅ Exactitud de lo anotado: los ${CASOS.length} casos dan lo que deben.`);
  if (malas || malosCasos) process.exit(1);
}
}
