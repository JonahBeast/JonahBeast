// Copia docs/manual-app.md dentro de la función jarvis-chat (Supabase no
// puede leer archivos del repo cuando corre). Así Jarvis conoce la app
// entera, pantalla por pantalla.
//
//   npm run manual-jarvis             → regenera supabase/functions/jarvis-chat/manual.ts
//   node scripts/manual-jarvis.mjs --revisar  → falla si la copia está desactualizada
//                                       (se corre antes de cada build)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const origen = new URL('../docs/manual-app.md', import.meta.url);
const destino = new URL('../supabase/functions/jarvis-chat/manual.ts', import.meta.url);

const texto = readFileSync(origen, 'utf8');
const contenido = `// Generado desde docs/manual-app.md con "npm run manual-jarvis". No editar a mano.
export const MANUAL_APP = ${JSON.stringify(texto)};
`;

if (process.argv.includes('--revisar')) {
  const actual = existsSync(destino) ? readFileSync(destino, 'utf8') : '';
  if (actual !== contenido) {
    console.error('\n✗ El manual de la app cambió y Jarvis tiene una copia vieja.');
    console.error('  Corre "npm run manual-jarvis" y sube el archivo supabase/functions/jarvis-chat/manual.ts.\n');
    process.exit(1);
  }
} else {
  writeFileSync(destino, contenido);
  console.log('Listo: supabase/functions/jarvis-chat/manual.ts actualizado.');
}
