// scripts/preparar-fotos-platos.mjs
//
// Prepara las imágenes chiquitas de los platos (ilustraciones en SVG o PNG, o
// fotos) (ver docs/fotos-platos.md y
// src/miniaturaPlato.jsx). Toma fotos grandes de una carpeta y, por cada una:
//   1. la endereza (según el celular que la tomó),
//   2. la recorta en cuadrado al centro,
//   3. la reduce a 160×160,
//   4. la pasa a WebP con buena calidad (baja la calidad de a poco solo si
//      pesa más de 8 KB),
//   5. la guarda en public/platos/<nombre-del-plato>.webp y la anota en el
//      mapa src/fotosPlatos.json (con ?v=<huella> para que el celular no
//      se quede con una foto vieja si se cambia).
//
// Cómo se nombra cada foto grande: con el nombre del plato tal como está en
// la lista de la app, con su versión. Sirve cualquiera de estas formas:
//   "Lomo saltado con arroz.jpg", "lomo-saltado-con-arroz.jpg",
//   "Huevo de gallina (Frito).jpg", "huevo-de-gallina-frito.png"
// (es el mismo nombre que usa el link ?q= de "Compartir este plato").
// Si el nombre no calza con ningún alimento, avisa y sugiere los parecidos.
// Para un alimento agregado desde el panel (alimentos_extra), que no está en
// src/App.jsx, se pasa su clave exacta con --clave (una sola foto a la vez):
//   node scripts/preparar-fotos-platos.mjs fotos/foto.jpg --clave "Causa de atún (-)"
//
// Uso:
//   node scripts/preparar-fotos-platos.mjs <carpeta-o-foto> [--tam 160] [--max-kb 8]
//                                          [--salida public/platos] [--mapa src/fotosPlatos.json]
//                                          [--clave "Nombre (versión)"] [--probar]
// --probar: hace todo pero no escribe nada en la app (para ver pesos).
//
// Usa `sharp` si está instalado y, si no, ImageMagick (`magick` o `convert`).
// Los .svg se dibujan antes con Chromium (Playwright) si está a mano, para
// que se vean igual que en el celular (sombras y degradados incluidos).

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join, basename, extname, resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { normalizar } from '../src/buscador.js';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXTENSIONES = new Set(['.svg', '.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.avif', '.tif', '.tiff']);

// ---------- Opciones ----------
const args = process.argv.slice(2);
function opcion(nombre, porDefecto) {
  const i = args.indexOf(nombre);
  if (i < 0) return porDefecto;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
}
const TAM = Number(opcion('--tam', 160));
const MAX_KB = Number(opcion('--max-kb', 8));
const SALIDA = resolve(RAIZ, opcion('--salida', 'public/platos'));
const MAPA = resolve(RAIZ, opcion('--mapa', 'src/fotosPlatos.json'));
const CLAVE = opcion('--clave', null);
const PROBAR = args.includes('--probar');
const entrada = args.find(a => a !== '--probar');
if (!entrada) {
  console.error('Uso: node scripts/preparar-fotos-platos.mjs <carpeta-o-foto> [--clave "Nombre (versión)"] [--probar]');
  process.exit(1);
}

// ---------- La lista de alimentos de la app (sin ejecutar la app) ----------
function alimentosDeLaApp() {
  const app = readFileSync(join(RAIZ, 'src/App.jsx'), 'utf8');
  const inicio = app.indexOf('const RAW_FOODS = ');
  if (inicio < 0) throw new Error('No encontré RAW_FOODS en src/App.jsx');
  let i = inicio + 'const RAW_FOODS = '.length, nivel = 0, j = i;
  for (; j < app.length; j++) {
    if (app[j] === '[') nivel++;
    else if (app[j] === ']' && --nivel === 0) break;
  }
  const crudo = Function(`"use strict"; return (${app.slice(i, j + 1)});`)();
  return crudo.map(([, name, state]) => ({ name, state, key: `${name} (${state})` }));
}
// Igual que slugAlimento() de src/buscador.js.
const slug = texto => normalizar(texto).replace(/[^a-z0-9ñ]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);
const slugDe = f => slug(f.state && f.state !== '-' ? `${f.name} ${f.state}` : f.name);

const ALIMENTOS = alimentosDeLaApp();
const PorSlug = new Map(ALIMENTOS.map(f => [slugDe(f), f]));

function parecidos(s) {
  const palabras = s.split('-').filter(w => w.length > 2);
  return [...PorSlug.entries()]
    .map(([k, f]) => ({ f, n: palabras.filter(w => k.includes(w)).length }))
    .filter(x => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 5).map(x => x.f.key);
}

// ---------- Herramienta para las imágenes ----------
let sharp = null;
try { sharp = (await import('sharp')).default; } catch { /* sin sharp: ImageMagick */ }
function comandoMagick() {
  for (const c of ['magick', 'convert']) {
    try { execFileSync(c, ['-version'], { stdio: 'ignore' }); return c; } catch { /* sigue */ }
  }
  return null;
}
const MAGICK = sharp ? null : comandoMagick();
if (!sharp && !MAGICK) {
  console.error('Falta una herramienta para las fotos: instala sharp (npm i -D sharp) o ImageMagick.');
  process.exit(1);
}

async function aWebp(origen, calidad) {
  if (sharp) {
    return sharp(origen).rotate().resize(TAM, TAM, { fit: 'cover', position: 'centre' })
      .webp({ quality: calidad, effort: 6 }).toBuffer();
  }
  const tmp = mkdtempSync(join(tmpdir(), 'jb-platos-'));
  const destino = join(tmp, 'f.webp');
  try {
    execFileSync(MAGICK, [origen, '-auto-orient', '-strip', '-resize', `${TAM}x${TAM}^`, '-gravity', 'center',
      '-extent', `${TAM}x${TAM}`, '-quality', String(calidad), '-define', 'webp:method=6', destino]);
    return readFileSync(destino);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

// Ilustración en SVG → PNG de 512×512 dibujado por Chromium.
let navegador = null;
async function svgAPng(origen) {
  if (!navegador) {
    let pw = null;
    for (const ruta of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
      try { pw = await import(ruta); break; } catch { /* sigue */ }
    }
    if (!pw) return null;
    navegador = await (pw.chromium || pw.default.chromium).launch();
  }
  const pagina = await navegador.newPage({ viewport: { width: 512, height: 512 } });
  const svg = readFileSync(origen, 'utf8').replace(/<svg\b/, '<svg width="512" height="512"');
  await pagina.setContent(`<html><body style="margin:0;background:#16110D">${svg}</body></html>`);
  const tmp = mkdtempSync(join(tmpdir(), 'jb-svg-'));
  const png = join(tmp, 'f.png');
  await pagina.screenshot({ path: png, clip: { x: 0, y: 0, width: 512, height: 512 } });
  await pagina.close();
  return png;
}

// Buena calidad primero; baja de a 6 solo si pasa del peso máximo.
async function prepararUna(origen) {
  let calidad = 82, buf = await aWebp(origen, calidad);
  while (buf.length > MAX_KB * 1024 && calidad > 46) {
    calidad -= 6;
    buf = await aWebp(origen, calidad);
  }
  return { buf, calidad };
}

// ---------- Recorrer las fotos ----------
const rutaEntrada = resolve(process.cwd(), entrada);
const archivos = statSync(rutaEntrada).isDirectory()
  ? readdirSync(rutaEntrada).filter(a => EXTENSIONES.has(extname(a).toLowerCase())).sort().map(a => join(rutaEntrada, a))
  : [rutaEntrada];
if (CLAVE && archivos.length !== 1) {
  console.error('--clave es para una sola foto a la vez.');
  process.exit(1);
}

const mapa = existsSync(MAPA) ? JSON.parse(readFileSync(MAPA, 'utf8')) : {};
if (!PROBAR) mkdirSync(SALIDA, { recursive: true });
let listas = 0, total = 0;
const problemas = [];
for (const origen of archivos) {
  const nombre = basename(origen, extname(origen));
  const clave = CLAVE || PorSlug.get(slug(nombre))?.key;
  if (!clave) {
    const sug = parecidos(slug(nombre));
    problemas.push(`✗ ${basename(origen)}: no calza con ningún alimento de la app.${sug.length ? ' ¿Será: ' + sug.join(' · ') + '?' : ''}`);
    continue;
  }
  const archivo = `${slug(CLAVE || nombre)}.webp`;
  let res;
  try {
    const esSvg = extname(origen).toLowerCase() === '.svg';
    res = await prepararUna((esSvg && await svgAPng(origen)) || origen);
  } catch (e) {
    problemas.push(`✗ ${basename(origen)}: no se pudo leer la foto (${e.message.split('\n')[0]})`);
    continue;
  }
  const kb = res.buf.length / 1024;
  total += res.buf.length;
  const huella = createHash('sha1').update(res.buf).digest('hex').slice(0, 8);
  if (!PROBAR) {
    writeFileSync(join(SALIDA, archivo), res.buf);
    mapa[clave] = `${archivo}?v=${huella}`;
  }
  listas++;
  const aviso = kb > MAX_KB ? `  ⚠️ pesa más de ${MAX_KB} KB aun con calidad ${res.calidad}` : '';
  console.log(`✓ ${clave} → platos/${archivo} · ${kb.toFixed(1)} KB · calidad ${res.calidad}${aviso}`);
}

if (navegador) await navegador.close();
if (!PROBAR && listas) {
  const ordenado = Object.fromEntries(Object.entries(mapa).sort(([a], [b]) => a.localeCompare(b, 'es')));
  writeFileSync(MAPA, JSON.stringify(ordenado, null, 2) + '\n');
}
problemas.forEach(p => console.log(p));
console.log(`\n${listas} foto(s) lista(s), ${(total / 1024).toFixed(1)} KB en total${PROBAR ? ' (prueba: no se escribió nada)' : ` · mapa: ${MAPA.replace(RAIZ + '/', '')}`}.`);
console.log(`Herramienta: ${sharp ? 'sharp' : MAGICK}.`);
if (problemas.length) process.exitCode = 1;
