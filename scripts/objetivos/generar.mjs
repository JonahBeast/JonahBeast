// scripts/objetivos/generar.mjs
//
// Arma las páginas por objetivo (17 oct, aprobadas por Jonah):
//   jonahbeast.com/bajar-de-peso, /subir-de-peso y /mantener-peso
// como páginas simples ya escritas (igual que /contador-de-calorias), para
// que Google las lea bien y carguen al toque. No son parte de la app: corre
// al final de npm run build, después de scripts/calorias/generar.mjs, deja
// cada página en dist/ y suma sus direcciones al sitemap.xml.
//
// Los textos (preguntas frecuentes, gratis vs. Premium, lo de cada objetivo)
// salen de src/portadaInfo.js, los mismos de la portada. Los precios, de
// PLANES en src/App.jsx (los mismos de la pantalla de planes).
//
// El botón "Empezar gratis" lleva a /?empezar=<objetivo>&fuente=objetivo_<…>:
// abre el recorrido con ese objetivo ya elegido y el embudo cuenta de dónde
// vino (fuente objetivo_bajar, objetivo_subir u objetivo_mantener).
//
// Uso: node scripts/objetivos/generar.mjs   (corre solo en npm run build)

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import {
  PREGUNTAS_FRECUENTES, GRATIS_PREMIUM, PAGINAS_OBJETIVO, NOTA_OBJETIVO, HISTORIA_JONAH, faqJsonLd,
} from '../../src/portadaInfo.js';

const SITIO = 'https://jonahbeast.com';
const raiz = new URL('../../', import.meta.url);
const dist = new URL('dist/', raiz);
if (!existsSync(new URL('sitemap.xml', dist))) throw new Error('Objetivos: no existe dist/sitemap.xml (corre primero vite build y scripts/calorias/generar.mjs).');

// PLANES de src/App.jsx, sin ejecutar la app.
const app = readFileSync(new URL('src/App.jsx', raiz), 'utf8');
function literal(nombre) {
  const inicio = app.indexOf(`const ${nombre} = `);
  if (inicio < 0) throw new Error(`Objetivos: no encontré ${nombre} en src/App.jsx`);
  const i = inicio + `const ${nombre} = `.length;
  const abre = app[i], cierra = abre === '[' ? ']' : '}';
  let nivel = 0, j = i;
  for (; j < app.length; j++) {
    if (app[j] === abre) nivel++;
    else if (app[j] === cierra && --nivel === 0) break;
  }
  return Function(`"use strict"; return (${app.slice(i, j + 1)});`)();
}
const PLANES = literal('PLANES');
const precio = m => PLANES.find(p => p.meses === m)?.precioDefault;
if (!precio(1) || !precio(3) || !precio(12)) throw new Error('Objetivos: falta un precio en PLANES.');
const soles = v => 'S/' + v.toFixed(2);

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Solo en la web: las páginas se leen fuera de las apps de tienda.
const preguntas = PREGUNTAS_FRECUENTES;
// Revisión de exactitud: nada de palabras que no podemos probar.
const PROHIBIDAS = /oficial|avalad|la más precisa|verificad[ao] por nutricionista|garantiz|bajarás \d|baja \d+ ?kg/i;
for (const t of [...preguntas.flatMap(p => [p.pregunta, p.respuesta]), ...PAGINAS_OBJETIVO.flatMap(o => [o.titulo, o.descripcion, o.bajada, ...o.puntos.flat()])]) {
  if (PROHIBIDAS.test(t)) throw new Error(`Objetivos: frase que no podemos probar: "${t.slice(0, 80)}…"`);
}

const FUENTES = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Anton&family=Work+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">';

// Píxel de Meta (solo la visita), con las mismas reglas que la app: nada en
// versiones de prueba, con ?preview=1 ni en celulares marcados jb-no-contar.
const PIXEL = `<script>(function(){try{if(location.hostname!=='jonahbeast.com')return;if(new URLSearchParams(location.search).get('preview')==='1'){localStorage.setItem('jb-no-contar','1');return;}if(localStorage.getItem('jb-no-contar')==='1')return;}catch(e){}!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','1084905720987308');fbq('track','PageView');})();</script>`;

const CSS = `
:root{--carbon:#16110D;--carbon2:#1B140E;--borde:#2A2016;--crema:#F7F2E7;--crema2:#E3D6BC;--gris:#A99E8C;--gris2:#8A7F6E;--aji:#E8590C;--aji2:#FF7020}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--carbon);color:var(--crema);font-family:'Work Sans',system-ui,sans-serif;line-height:1.55}
a{color:var(--aji2)}
.envoltura{max-width:720px;margin:0 auto;padding:0 16px 48px}
.display{font-family:'Anton',Impact,sans-serif;font-weight:400;letter-spacing:.01em;line-height:1.05;text-transform:uppercase}
header.barra{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 0;border-bottom:1px solid var(--borde);margin-bottom:18px}
header.barra a.marca{display:flex;align-items:center;gap:8px;text-decoration:none;color:var(--crema)}
header.barra img{width:32px;height:32px;object-fit:contain}
header.barra .marca span{font-family:'Anton',Impact,sans-serif;font-size:18px}
header.barra .marca b{color:var(--aji2);font-weight:400}
.btn{display:inline-block;background:var(--aji);color:var(--carbon);font-weight:700;text-decoration:none;border-radius:999px;padding:14px 22px;text-align:center;font-family:'Anton',Impact,sans-serif;font-size:20px;letter-spacing:.02em}
.btn:hover{background:var(--aji2)}
.btn-ancho{display:block;width:100%;max-width:420px;margin:0 auto}
.btn-chico{padding:8px 14px;font-size:15px}
nav.migas{font-size:13px;color:var(--gris);margin-bottom:10px}
nav.migas a{color:var(--gris);text-decoration:none}
h1{font-size:clamp(34px,10vw,52px);margin:0 0 10px}
h1 em{color:var(--aji2);font-style:normal;display:block}
h2{font-size:24px;margin:0 0 12px}
.bajada{color:var(--crema2);margin:0 0 18px;font-size:17px}
.nota{font-size:12px;color:var(--gris2);margin:8px 0 16px;text-align:center}
.tarjeta{background:var(--carbon2);border:1px solid var(--borde);border-radius:18px;padding:18px;margin-bottom:16px}
.puntos{display:grid;gap:10px;margin:22px 0}
.punto{display:flex;gap:12px;align-items:flex-start;background:var(--carbon2);border:1px solid var(--borde);border-radius:16px;padding:14px}
.punto .ico{font-size:24px;line-height:1}
.punto b{display:block;font-family:'Anton',Impact,sans-serif;font-weight:400;font-size:18px;text-transform:uppercase;letter-spacing:.01em}
.punto p{margin:2px 0 0;color:var(--crema2);font-size:15px}
.honesto{border-color:rgba(232,89,12,.5);background:rgba(232,89,12,.08);font-size:14px;color:var(--crema2)}
.celular{display:flex;flex-direction:column;align-items:center;margin:8px 0 22px}
.celular .marco{width:232px;border-radius:42px;background:#1B140E;padding:9px;border:1px solid #3a2e22;box-shadow:0 30px 70px -25px rgba(232,89,12,.55)}
.celular img{display:block;width:100%;height:auto;border-radius:32px}
.celular small{font-size:11px;color:var(--gris2);margin-top:10px}
table.gp{width:100%;border-collapse:collapse;font-size:14px}
table.gp th,table.gp td{padding:9px 4px;border-bottom:1px solid var(--borde);text-align:center;vertical-align:middle}
table.gp th:first-child,table.gp td:first-child{text-align:left}
table.gp th{font-family:'Anton',Impact,sans-serif;font-weight:400;font-size:16px;color:var(--crema)}
table.gp th.pre,table.gp td.pre{color:var(--aji2)}
table.gp td.pre{background:rgba(232,89,12,.05)}
table.gp td small{font-size:11px;line-height:1.2;display:block}
table.gp tr:last-child td{border-bottom:0}
details{background:var(--carbon2);border:1px solid var(--borde);border-radius:16px;margin-bottom:8px}
details[open]{border-color:rgba(232,89,12,.5)}
summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 16px;font-weight:600;min-height:52px}
summary::-webkit-details-marker{display:none}
summary::after{content:'+';color:var(--aji2);font-size:22px;line-height:1;transition:transform .2s}
details[open] summary::after{transform:rotate(45deg)}
details p{margin:0;padding:0 16px 16px;color:var(--crema2);font-size:15px}
.otros{font-size:14px;color:var(--gris);text-align:center}
footer{border-top:1px solid var(--borde);margin-top:28px;padding-top:16px;font-size:13px;color:var(--gris)}
footer a{color:var(--gris)}
`;

const linkApp = (o, donde) => `/?empezar=${o.clave}&fuente=objetivo_${o.clave}&utm_campaign=paginas_objetivo&utm_content=${encodeURIComponent(donde)}`;

const celda = (v, pre) => v === true ? '✓' : v === false ? `<span style="color:var(--gris2)">—</span>` : `<small${pre ? '' : ' style="color:var(--crema2)"'}>${esc(v)}</small>`;

function pagina(o) {
  const titulo = o.titulo;
  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'WebPage', name: titulo, url: `${SITIO}${o.ruta}`, inLanguage: 'es-PE', description: o.descripcion,
      isPartOf: { '@type': 'WebSite', name: 'Jonah Beast Fuel', url: `${SITIO}/` } },
    faqJsonLd(preguntas),
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITIO}/` },
      { '@type': 'ListItem', position: 2, name: `${o.h1[0]} ${o.h1[1]}`, item: `${SITIO}${o.ruta}` },
    ] },
  ];
  const otros = PAGINAS_OBJETIVO.filter(x => x !== o);
  return `<!doctype html>
<html lang="es-PE">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(o.descripcion)}">
<link rel="canonical" href="${SITIO}${o.ruta}">
<meta name="theme-color" content="#16110D">
<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:locale" content="es_PE">
<meta property="og:site_name" content="Jonah Beast Fuel">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(o.descripcion)}">
<meta property="og:url" content="${SITIO}${o.ruta}">
<meta property="og:image" content="${SITIO}/lomo-saltado.jpg">
${FUENTES}
<style>${CSS}</style>
<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>
${PIXEL}
</head>
<body>
<div class="envoltura">
<header class="barra">
  <a class="marca" href="/"><img src="/logo-marca.webp" alt="" width="32" height="32"><span>JONAH BEAST <b>FUEL</b></span></a>
  <a class="btn btn-chico" href="${linkApp(o, 'cabecera')}">Probar gratis</a>
</header>
<nav class="migas"><a href="/">Inicio</a> › ${esc(o.h1[0])}</nav>
<h1 class="display">${esc(o.h1[0])} <em>${esc(o.h1[1])}</em></h1>
<p class="bajada">${esc(o.bajada)}</p>
<a class="btn btn-ancho" href="${linkApp(o, 'arriba')}">EMPEZAR GRATIS</a>
<p class="nota">Gratis para siempre · 7 días de Premium incluidos · Sin tarjeta</p>

<div class="puntos">
${o.puntos.map(([ico, t, d]) => `  <div class="punto"><span class="ico" aria-hidden="true">${ico}</span><div><b>${esc(t)}</b><p>${esc(d)}</p></div></div>`).join('\n')}
</div>

<div class="tarjeta honesto">${esc(NOTA_OBJETIVO)}</div>

<h2 class="display">Así se ve la app</h2>
<figure class="celular">
  <div class="marco"><img src="/app-inicio.webp" width="390" height="844" loading="lazy" alt="Pantalla de Inicio de la app Jonah Beast Fuel: anillo con las calorías que quedan del día, proteína, carbos y grasa, y las comidas del día"></div>
  <small>Captura real de la app, con datos de ejemplo.</small>
</figure>

<div class="tarjeta" id="gratis-premium">
  <h2 class="display">Gratis para siempre vs. Premium</h2>
  <table class="gp">
    <thead><tr><th>Función</th><th>Gratis</th><th class="pre">👑 Premium</th></tr></thead>
    <tbody>
${GRATIS_PREMIUM.map(f => `      <tr><td>${esc(f.funcion)}</td><td>${celda(f.gratis)}</td><td class="pre">${celda(f.premium, true)}</td></tr>`).join('\n')}
    </tbody>
  </table>
  <p class="nota">👑 Premium en la web: ${soles(precio(1))} al mes, ${soles(precio(3))} cada 3 meses o ${soles(precio(12))} al año (${soles(precio(12) / 12)} al mes). Al crear tu cuenta tienes 7 días de Premium incluidos; cuando terminan, sigues gratis y nadie te cobra solo.</p>
</div>

<h2 class="display">Preguntas frecuentes</h2>
${preguntas.map(p => `<details><summary>${esc(p.pregunta)}</summary><p>${esc(p.respuesta)}${p.enlace ? ` <a href="${esc(p.enlace.href)}">${esc(p.enlace.texto)}</a>` : ''}</p></details>`).join('\n')}

<div style="margin:26px 0 8px">
  <a class="btn btn-ancho" href="${linkApp(o, 'abajo')}">EMPEZAR GRATIS</a>
  <p class="nota">Gratis para siempre · 7 días de Premium incluidos · Sin tarjeta</p>
</div>
<p class="otros">¿Otra meta? ${otros.map(x => `<a href="${x.ruta}">${esc(x.h1[0])}</a>`).join(' · ')} · <a href="/contador-de-calorias">Cómo contamos las calorías</a></p>

<footer>
  <p>Soy Jonah. ${esc(HISTORIA_JONAH)} El cambio llega poco a poco, comida a comida.</p>
  <p><a href="/">Jonah Beast Fuel</a> · <a href="/contador-de-calorias">Contador de calorías de comida peruana</a> · <a href="/calorias">Calorías de la comida peruana</a> · <a href="/privacidad.html">Privacidad</a></p>
</footer>
</div>
</body>
</html>
`;
}

for (const o of PAGINAS_OBJETIVO) {
  const carpeta = new URL(o.ruta.replace(/^\//, '') + '/', dist);
  mkdirSync(carpeta, { recursive: true });
  writeFileSync(new URL('index.html', carpeta), pagina(o));
}

// Suma las páginas al sitemap que armó scripts/calorias/generar.mjs.
const rutaSitemap = new URL('sitemap.xml', dist);
let sitemap = readFileSync(rutaSitemap, 'utf8');
const hoy = new Date().toISOString().slice(0, 10);
const nuevas = PAGINAS_OBJETIVO.filter(o => !sitemap.includes(`<loc>${SITIO}${o.ruta}</loc>`))
  .map(o => `  <url><loc>${SITIO}${o.ruta}</loc><lastmod>${hoy}</lastmod></url>`);
if (!sitemap.includes('</urlset>')) throw new Error('Objetivos: el sitemap.xml no termina en </urlset>.');
sitemap = sitemap.replace('</urlset>', (nuevas.length ? nuevas.join('\n') + '\n' : '') + '</urlset>');
writeFileSync(rutaSitemap, sitemap);

console.log(`✅ Páginas por objetivo: ${PAGINAS_OBJETIVO.map(o => o.ruta).join(', ')} (en el sitemap).`);
