// Genera ../pique-resumen.jpg (los 3 diseños juntos). Correr después de mockups.mjs.
// Antes: recortar el frente de cada mockup -> fuente/frentes/ (convert mockup.png -crop 1060x1060+40+170 +repage -resize 560x frentes/frente-<nombre>.png)
import { chromium } from '/opt/node-tools/node_modules/playwright-core/index.mjs';
import { execFileSync } from 'child_process';
const dir = new URL('.', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 2400, height: 1180 } });
await p.goto(`file://${dir}resumen.html`); await p.waitForSelector('body[data-listo]'); await p.waitForTimeout(500);
await p.screenshot({ path: `${dir}../pique-resumen.jpg`, type: 'jpeg', quality: 90 });
await b.close(); console.log('ok');
