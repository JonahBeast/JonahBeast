// Convierte cada SVG (en mm) de ../bordado a PNG a 300 dpi con fondo transparente.
// Uso: CHROME=/ruta/chromium node png.mjs [archivo.svg ...]
import { chromium } from '/opt/node-tools/node_modules/playwright-core/index.mjs';
import fs from 'fs'; import path from 'path';
const dir = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'bordado');
const files = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(dir).filter(f => f.endsWith('.svg'));
const b = await chromium.launch({ executablePath: process.env.CHROME });
for (const f of files) {
  const src = fs.readFileSync(path.join(dir, path.basename(f)), 'utf8');
  const m = src.match(/width="([\d.]+)mm" height="([\d.]+)mm"/);
  const W = Math.round(+m[1] / 25.4 * 300), H = Math.round(+m[2] / 25.4 * 300);
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const svg = src.replace(/width="[\d.]+mm" height="[\d.]+mm"/, `width="${W}" height="${H}"`);
  await p.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
  const out = path.join(dir, path.basename(f).replace('.svg', '-300dpi.png'));
  await p.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: W, height: H } });
  await p.close(); console.log('png', out, W + 'x' + H);
}
await b.close();
