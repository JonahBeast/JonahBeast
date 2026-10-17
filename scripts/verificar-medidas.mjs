// scripts/verificar-medidas.mjs
//
// Cuida que lo ya anotado nunca cambie sin querer por quitar una medida
// casera (17 oct 2026, pedido de Jonah: al quitarle la "taza" al arroz, lo
// anotado como "1 taza" pasó a contar 1 g). Corre en cada "npm run build" y
// falla si:
//   - una medida que está en docs/medidas-caseras.json (la foto de todas las
//     medidas de la app) ya no existe y no se pasó a src/medidasRetiradas.js
//     con sus mismos gramos;
//   - una medida cambió de gramos (lo ya anotado con ella cambiaría);
//   - una medida retirada choca con una de hoy con el mismo nombre y otros
//     gramos (la retirada no se usaría nunca);
//   - una receta de src/recetasPlatos.js, un menú de src/menuDia.js o los
//     platos de la portada usan una medida que el alimento no tiene.
// Las medidas nuevas solo avisan: súmalas a la foto con
//   node scripts/verificar-medidas.mjs --actualizar
// (si una medida cambió de gramos a propósito, con el OK de Jonah, también
// se actualiza así; la de antes va a src/medidasRetiradas.js si cambia el
// nombre).

import { readFileSync, writeFileSync } from 'node:fs';
import { MEDIDAS_RETIRADAS } from '../src/medidasRetiradas.js';
import { RECETAS_PLATOS } from '../src/recetasPlatos.js';

const raiz = new URL('../', import.meta.url);
const app = readFileSync(new URL('src/App.jsx', raiz), 'utf8');
const rutaFoto = new URL('docs/medidas-caseras.json', raiz);

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
const UNITS_BY_NAME = literal('UNITS_BY_NAME');
const UNITS_BY_GROUP = literal('UNITS_BY_GROUP');
const FOODS = literal('RAW_FOODS').map(([group, name, state]) => ({ group, name, state, key: `${name} (${state})` }));
const porClave = new Map(FOODS.map(f => [f.key, f]));
// Igual que unitsFor de src/App.jsx.
function medidas(food) {
  const lista = UNITS_BY_NAME[food.key] || UNITS_BY_NAME[food.name] || UNITS_BY_GROUP[food.group] || [];
  return Object.fromEntries(lista);
}
const hoy = Object.fromEntries(FOODS.map(f => [f.key, medidas(f)]).filter(([, m]) => Object.keys(m).length));

if (process.argv.includes('--actualizar')) {
  writeFileSync(rutaFoto, JSON.stringify({
    descripcion: 'Foto de las medidas caseras de la app (gramos de cada una). La revisa scripts/verificar-medidas.mjs en cada build: si una medida desaparece sin pasar a src/medidasRetiradas.js, o cambia de gramos, el build falla. Se actualiza con: node scripts/verificar-medidas.mjs --actualizar',
    medidas: hoy,
  }, null, 1) + '\n');
  console.log(`Listo: docs/medidas-caseras.json con ${Object.keys(hoy).length} alimentos.`);
  process.exit(0);
}

const foto = JSON.parse(readFileSync(rutaFoto, 'utf8')).medidas;
const retirada = (food, unit) => (MEDIDAS_RETIRADAS[food.key] || MEDIDAS_RETIRADAS[food.name] || {})[unit];
const errores = [], avisos = [];

for (const [clave, antes] of Object.entries(foto)) {
  const food = porClave.get(clave);
  // Un alimento que ya no está en la lista: lo cuida ALIMENTOS_RETIRADOS
  // (se queda en la lista para lo ya anotado). Aquí solo se avisa.
  if (!food) { avisos.push(`${clave}: ya no está en la lista de alimentos`); continue; }
  const ahora = hoy[clave] || {};
  for (const [unit, g] of Object.entries(antes)) {
    if (ahora[unit] === g) continue;
    if (ahora[unit] !== undefined) {
      errores.push(`${clave}: "${unit}" pasó de ${g} g a ${ahora[unit]} g (lo ya anotado cambiaría). Si es a propósito y Jonah lo aprobó, actualiza la foto con --actualizar.`);
    } else if (retirada(food, unit) !== g) {
      errores.push(`${clave}: se quitó la medida "${unit}" (${g} g). Pásala a src/medidasRetiradas.js con sus ${g} g para que lo ya anotado no cuente 1 g.`);
    }
  }
  for (const unit of Object.keys(ahora)) if (!(unit in antes)) avisos.push(`${clave}: medida nueva "${unit}" (corre --actualizar para sumarla a la foto)`);
}
for (const clave of Object.keys(hoy)) if (!foto[clave]) avisos.push(`${clave}: alimento con medidas nuevo (corre --actualizar)`);

// Retiradas que chocan con una medida de hoy.
for (const [clave, us] of Object.entries(MEDIDAS_RETIRADAS)) {
  for (const f of FOODS.filter(x => x.key === clave || x.name === clave)) {
    for (const [unit, g] of Object.entries(us)) {
      const ahora = medidas(f)[unit];
      if (ahora !== undefined && ahora !== g) errores.push(`${f.key}: "${unit}" está retirada con ${g} g pero hoy existe con ${ahora} g (lo anotado antes cambiaría).`);
    }
  }
}

// Medidas que usan las recetas, el menú del día y la portada.
const usa = (clave, unit, donde) => {
  if (unit === 'gramos') return;
  const f = porClave.get(clave);
  if (!f) { errores.push(`${donde}: "${clave}" no existe`); return; }
  if (medidas(f)[unit] === undefined) errores.push(`${donde}: "${clave}" no tiene la medida "${unit}"`);
};
for (const [plato, partes] of Object.entries(RECETAS_PLATOS)) for (const [clave, , unit] of partes) usa(clave, unit, `receta de ${plato}`);
const menu = readFileSync(new URL('src/menuDia.js', raiz), 'utf8');
for (const [, clave, unit] of menu.matchAll(/key: '([^']+)', unidad: '([^']+)'/g)) usa(clave, unit, 'menú del día');

if (avisos.length && process.argv.includes('--todo')) console.warn(`⚠️  Medidas (${avisos.length}):\n  ${avisos.join('\n  ')}`);
if (errores.length) {
  console.error(`\n❌ Medidas caseras: ${errores.length} problema(s):\n  ${errores.join('\n  ')}\n`);
  process.exit(1);
}
console.log(`✅ Medidas caseras: ${Object.keys(foto).length} alimentos revisados, ${Object.values(MEDIDAS_RETIRADAS).reduce((n, m) => n + Object.keys(m).length, 0)} medidas retiradas guardadas para lo ya anotado${avisos.length ? ` (${avisos.length} aviso(s): --todo para verlos)` : ''}.`);
