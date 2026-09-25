// Copia docs/manual-app.md dentro de las funciones que lo usan (Supabase no
// puede leer archivos del repo cuando corre): jarvis-chat, para que Jarvis
// conozca la app entera, y whatsapp-webhook, para que el asistente de
// WhatsApp responda las dudas de los clientes.
//
//   npm run manual-jarvis             → regenera las copias (manual.ts)
//   node scripts/manual-jarvis.mjs --revisar  → falla si alguna copia está desactualizada
//                                       (se corre antes de cada build)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const origen = new URL('../docs/manual-app.md', import.meta.url);
const destinos = ['jarvis-chat', 'whatsapp-webhook']
  .map(f => ({ ruta: `supabase/functions/${f}/manual.ts`, url: new URL(`../supabase/functions/${f}/manual.ts`, import.meta.url) }));

const texto = readFileSync(origen, 'utf8');
const contenido = `// Generado desde docs/manual-app.md con "npm run manual-jarvis". No editar a mano.
export const MANUAL_APP = ${JSON.stringify(texto)};
`;

if (process.argv.includes('--revisar')) {
  const viejos = destinos.filter(d => (existsSync(d.url) ? readFileSync(d.url, 'utf8') : '') !== contenido);
  if (viejos.length) {
    console.error('\n✗ El manual de la app cambió y hay copias viejas:');
    viejos.forEach(d => console.error('  - ' + d.ruta));
    console.error('  Corre "npm run manual-jarvis" y sube esos archivos.\n');
    process.exit(1);
  }
} else {
  destinos.forEach(d => writeFileSync(d.url, contenido));
  console.log('Listo: ' + destinos.map(d => d.ruta).join(' y ') + ' actualizados.');
}
