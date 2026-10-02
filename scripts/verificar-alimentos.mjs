// scripts/verificar-alimentos.mjs
//
// Revisa la lista de alimentos de la app (RAW_FOODS en src/App.jsx) cada vez
// que se arma la app (npm run build). Falla, y el build no sigue, si:
//   - un alimento no está en docs/alimentos-verificados.json (todo alimento
//     nuevo debe verificarse contra una fuente antes de entrar a la app), o
//   - un alimento verificado no pasa las reglas de src/verificarAlimentos.js.
// Los que están "pendiente" (ej. PECAFIT, que Jonah está calculando) solo
// avisan, no frenan el build.
//
// Uso: npm run verificar-alimentos   (también corre solo en npm run build)

import { readFileSync } from 'node:fs';
import { revisarAlimento } from '../src/verificarAlimentos.js';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

// Saca un arreglo u objeto literal del código (sin ejecutar la app).
function literal(nombre) {
  const inicio = app.indexOf(`const ${nombre} = `);
  if (inicio < 0) throw new Error(`No encontré ${nombre} en src/App.jsx`);
  let i = inicio + `const ${nombre} = `.length;
  const abre = app[i], cierra = abre === '[' ? ']' : '}';
  let nivel = 0, j = i;
  for (; j < app.length; j++) {
    if (app[j] === abre) nivel++;
    else if (app[j] === cierra && --nivel === 0) break;
  }
  return Function(`"use strict"; return (${app.slice(i, j + 1)});`)();
}

const RAW_FOODS = literal('RAW_FOODS');
const verificados = JSON.parse(readFileSync(new URL('../docs/alimentos-verificados.json', import.meta.url), 'utf8')).alimentos;

const errores = [], avisos = [];
const claves = new Set();
for (const [grupo, nombre, estado, kcal, proteina, carbos, grasa, fibra] of RAW_FOODS) {
  const clave = `${nombre} (${estado})`;
  if (claves.has(clave)) errores.push(`${clave}: está repetido`);
  claves.add(clave);
  const v = verificados[clave];
  if (!v) { errores.push(`${clave}: no está verificado (agrégalo a docs/alimentos-verificados.json con su fuente)`); continue; }
  // "por_plato": valores por plato servido (ej. PECAFIT), cargados como
  // plato ÷ un peso de referencia: la regla de "más de 100 g en 100 g" no
  // aplica (se registran siempre por plato); las demás sí.
  const problemas = revisarAlimento({ nombre, grupo, kcal, proteina, carbos, grasa, fibra }, { porPlato: !!v.por_plato });
  if (v.estado === 'pendiente') { avisos.push(`${clave}: pendiente — ${v.nota || 'falta verificar'}`); continue; }
  if (v.estado !== 'verificado') errores.push(`${clave}: estado "${v.estado}" desconocido`);
  problemas.forEach(pr => errores.push(`${clave}: ${pr}`));
}
Object.keys(verificados).filter(k => !claves.has(k)).forEach(k => avisos.push(`${k}: está en la lista de verificados pero ya no en la app`));

const total = RAW_FOODS.length;
const pendientes = Object.values(verificados).filter(v => v.estado === 'pendiente').length;
if (avisos.length) console.warn(`⚠️  Alimentos con aviso (${avisos.length}):\n  ${avisos.join('\n  ')}`);
if (errores.length) {
  console.error(`\n❌ Revisión de alimentos: ${errores.length} problema(s):\n  ${errores.join('\n  ')}\n`);
  process.exit(1);
}
console.log(`✅ Alimentos de la app: ${total - pendientes} de ${total} verificados${pendientes ? ` (${pendientes} pendientes)` : ''}.`);
