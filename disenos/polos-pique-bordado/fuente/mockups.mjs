// Genera los mockups (frente + detalle) de cada diseño en 2 colores de polo.
// Uso: CHROME=/ruta/chromium node mockups.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright-core/index.mjs';
const dir = new URL('.', import.meta.url).pathname;
const combos = [[1,'carbon'],[1,'crema'],[2,'carbon'],[2,'crema'],[3,'carbon'],[3,'crema']];
const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--allow-file-access-from-files'] });
for (const [d, polo] of combos) {
  const p = await b.newPage({ viewport: { width: 2000, height: 1300 }, deviceScaleFactor: 1 });
  await p.goto(`file://${dir}mockup.html?d=${d}&polo=${polo}`);
  await p.waitForSelector('body[data-listo]'); await p.waitForTimeout(400);
  await p.screenshot({ path: `${dir}../mockups/propuesta-${d}-polo-${polo}.png` });
  await p.close(); console.log('ok', d, polo);
}
await b.close();
