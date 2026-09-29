// Copia a las funciones de Supabase lo que necesitan del repo (Supabase no
// puede leer archivos del repo cuando corre):
//  * la lista de alimentos de src/App.jsx → alimentos.ts, en whatsapp-webhook
//    (para que el asistente sepa qué platos ya existen) y en alimentos-pedidos
//    (para no agregar dos veces el mismo alimento; ahí van también los usos
//    del menú del día de src/menuDia.js, para que la IA los sugiera).
//
// El manual (docs/manual-app.md) ya NO se copia a las funciones: Jarvis y
// el asistente de WhatsApp lo leen de la tabla manual_app, que se actualiza
// después de cada merge con el texto de main.
//
//   npm run manual-jarvis             → regenera las copias
//   node scripts/manual-jarvis.mjs --revisar  → falla si alguna copia está desactualizada
//                                       (se corre antes de cada build)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { opcionesUsoMenu } from '../src/menuDia.js';

const aqui = (ruta) => new URL(`../${ruta}`, import.meta.url);

// Filas de RAW_FOODS: ["Grupo","Nombre","Estado",kcal,...]
const app = readFileSync(aqui('src/App.jsx'), 'utf8');
const bloque = app.slice(app.indexOf('const RAW_FOODS = ['), app.indexOf('];', app.indexOf('const RAW_FOODS = [')));
const filas = [...bloque.matchAll(/^\s*\["([^"]+)","([^"]+)","([^"]*)"/gm)];
const alimentos = filas.map(([, grupo, nombre, estado]) => estado && estado !== '-' ? `${nombre} (${estado.toLowerCase()})` : nombre);
// Clave exacta de cada alimento en la app (misma que FOODS: "Nombre (Estado)"),
// en el mismo orden que ALIMENTOS_APP. Solo la usa alimentos-pedidos, para
// cambiar un alimento de un alumno por el de la app ("ya existe").
const claves = filas.map(([, grupo, nombre, estado]) => `${nombre} (${estado})`);
if (alimentos.length < 100) {
  console.error('✗ No se pudo leer la lista de alimentos de src/App.jsx (RAW_FOODS).');
  process.exit(1);
}
const grupos = [...new Set([...bloque.matchAll(/^\s*\["([^"]+)"/gm)].map(m => m[1]))];
const contenidoAlimentos = `// Generado desde RAW_FOODS de src/App.jsx con "npm run manual-jarvis". No editar a mano.
export const GRUPOS_APP: string[] = ${JSON.stringify(grupos)};
export const ALIMENTOS_APP: string[] = ${JSON.stringify(alimentos, null, 0).replace(/","/g, '",\n  "').replace(/^\[/, '[\n  ').replace(/\]$/, ',\n]')};
`;

const lista = (a) => JSON.stringify(a, null, 0).replace(/","/g, '",\n  "').replace(/^\[/, '[\n  ').replace(/\]$/, ',\n]');
const destinos = [
  { ruta: 'supabase/functions/whatsapp-webhook/alimentos.ts', contenido: contenidoAlimentos },
  // USOS_MENU: para qué puede servir un alimento en el menú del día (src/menuDia.js).
  { ruta: 'supabase/functions/alimentos-pedidos/alimentos.ts', contenido: contenidoAlimentos + `export const CLAVES_APP: string[] = ${lista(claves)};\n`
    + `export const USOS_MENU: { valor: string; texto: string }[] = ${JSON.stringify(opcionesUsoMenu().map(o => ({ valor: o.valor, texto: o.texto })), null, 2)};\n` },
];

if (process.argv.includes('--revisar')) {
  const viejos = destinos.filter(d => (existsSync(aqui(d.ruta)) ? readFileSync(aqui(d.ruta), 'utf8') : '') !== d.contenido);
  if (viejos.length) {
    console.error('\n✗ Cambió la lista de alimentos, y hay copias viejas:');
    viejos.forEach(d => console.error('  - ' + d.ruta));
    console.error('  Corre "npm run manual-jarvis" y sube esos archivos.\n');
    process.exit(1);
  }
} else {
  destinos.forEach(d => writeFileSync(aqui(d.ruta), d.contenido));
  console.log('Listo: ' + destinos.map(d => d.ruta).join(', ') + ' actualizados.');
}
