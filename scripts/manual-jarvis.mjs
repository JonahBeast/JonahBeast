// Copia a las funciones de Supabase lo que necesitan del repo (Supabase no
// puede leer archivos del repo cuando corre):
//  * docs/manual-app.md → manual.ts, en jarvis-chat (para que Jarvis conozca
//    la app entera) y en whatsapp-webhook (para que el asistente de WhatsApp
//    responda las dudas de los clientes).
//  * la lista de alimentos de src/App.jsx → alimentos.ts, en whatsapp-webhook
//    (para que el asistente sepa qué platos ya existen) y en alimentos-pedidos
//    (para no agregar dos veces el mismo alimento).
//
//   npm run manual-jarvis             → regenera las copias
//   node scripts/manual-jarvis.mjs --revisar  → falla si alguna copia está desactualizada
//                                       (se corre antes de cada build)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const aqui = (ruta) => new URL(`../${ruta}`, import.meta.url);

const manual = readFileSync(aqui('docs/manual-app.md'), 'utf8');
const contenidoManual = `// Generado desde docs/manual-app.md con "npm run manual-jarvis". No editar a mano.
export const MANUAL_APP = ${JSON.stringify(manual)};
`;

// Filas de RAW_FOODS: ["Grupo","Nombre","Estado",kcal,...]
const app = readFileSync(aqui('src/App.jsx'), 'utf8');
const bloque = app.slice(app.indexOf('const RAW_FOODS = ['), app.indexOf('];', app.indexOf('const RAW_FOODS = [')));
const alimentos = [...bloque.matchAll(/^\s*\["([^"]+)","([^"]+)","([^"]*)"/gm)]
  .map(([, grupo, nombre, estado]) => estado && estado !== '-' ? `${nombre} (${estado.toLowerCase()})` : nombre);
if (alimentos.length < 100) {
  console.error('✗ No se pudo leer la lista de alimentos de src/App.jsx (RAW_FOODS).');
  process.exit(1);
}
const grupos = [...new Set([...bloque.matchAll(/^\s*\["([^"]+)"/gm)].map(m => m[1]))];
const contenidoAlimentos = `// Generado desde RAW_FOODS de src/App.jsx con "npm run manual-jarvis". No editar a mano.
export const GRUPOS_APP: string[] = ${JSON.stringify(grupos)};
export const ALIMENTOS_APP: string[] = ${JSON.stringify(alimentos, null, 0).replace(/","/g, '",\n  "').replace(/^\[/, '[\n  ').replace(/\]$/, ',\n]')};
`;

const destinos = [
  ...['jarvis-chat', 'whatsapp-webhook'].map(f => ({ ruta: `supabase/functions/${f}/manual.ts`, contenido: contenidoManual })),
  ...['whatsapp-webhook', 'alimentos-pedidos'].map(f => ({ ruta: `supabase/functions/${f}/alimentos.ts`, contenido: contenidoAlimentos })),
];

if (process.argv.includes('--revisar')) {
  const viejos = destinos.filter(d => (existsSync(aqui(d.ruta)) ? readFileSync(aqui(d.ruta), 'utf8') : '') !== d.contenido);
  if (viejos.length) {
    console.error('\n✗ Cambió el manual de la app o la lista de alimentos, y hay copias viejas:');
    viejos.forEach(d => console.error('  - ' + d.ruta));
    console.error('  Corre "npm run manual-jarvis" y sube esos archivos.\n');
    process.exit(1);
  }
} else {
  destinos.forEach(d => writeFileSync(aqui(d.ruta), d.contenido));
  console.log('Listo: ' + destinos.map(d => d.ruta).join(', ') + ' actualizados.');
}
