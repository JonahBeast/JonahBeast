// scripts/calorias/generar.mjs
//
// Arma las páginas "Calorías de la comida peruana" (jonahbeast.com/calorias
// y jonahbeast.com/calorias/<plato>) como páginas simples, ya escritas, para
// que Google las lea y carguen al toque. No son parte de la app: corre al
// final de npm run build y las deja en dist/ junto con sitemap.xml y
// robots.txt.
//
// Las calorías y porciones salen de la lista de alimentos de la app
// (RAW_FOODS y sus medidas en src/App.jsx); el nombre, el grupo y el consejo
// de Jonah salen de scripts/calorias/platos.mjs.
//
// Uso: node scripts/calorias/generar.mjs   (también corre solo en npm run build)

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { PLATOS, GRUPOS } from './platos.mjs';

const SITIO = 'https://jonahbeast.com';
const raiz = new URL('../../', import.meta.url);
const dist = new URL('dist/', raiz);
if (!existsSync(dist)) throw new Error('No existe dist/: corre primero vite build.');

const app = readFileSync(new URL('src/App.jsx', raiz), 'utf8');
const verificados = JSON.parse(readFileSync(new URL('docs/alimentos-verificados.json', raiz), 'utf8')).alimentos;

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
const UNITS_BY_NAME = literal('UNITS_BY_NAME');
const UNITS_BY_GROUP = literal('UNITS_BY_GROUP');

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const num = v => (v >= 10 || Number.isInteger(v) ? String(Math.round(v)) : v.toFixed(1).replace('.', ','));
const kcalDe = (f, g) => Math.round(f.kcal * g / 100);
const grDe = (v, g) => Math.round(v * g / 100);

// Medida con nombre amable: "plato" → "Un plato".
const ARTICULO = { plato: 'Un plato', unidad: 'Una unidad', porción: 'Una porción', palito: 'Un palito', tajada: 'Una tajada', taza: 'Una taza', vaso: 'Un vaso', copa: 'Una copa' };
const nombreMedida = m => ARTICULO[m] || (m.charAt(0).toUpperCase() + m.slice(1));

// Junta los datos de cada plato y avisa (frena el build) si algo no cuadra.
const platos = PLATOS.map(p => {
  const filas = RAW_FOODS.filter(r => r[1] === p.alimento && (!p.estado || r[2] === p.estado));
  if (filas.length !== 1) throw new Error(`Calorías: "${p.alimento}" aparece ${filas.length} veces en RAW_FOODS (debe ser 1).`);
  const [grupoApp, name, estado, kcal, protein, carbs, fat, fiber] = filas[0];
  const f = { name, estado, kcal, protein, carbs, fat, fiber };
  // Sin medidas repetidas: algunos alimentos guardan "plato" con el mismo
  // peso que "porción" solo para que lo ya registrado siga sumando bien.
  const medidas = (UNITS_BY_NAME[name] || UNITS_BY_GROUP[grupoApp] || [])
    .filter(([, g], i, todas) => todas.findIndex(([, o]) => o === g) === i);
  if (!medidas.length) throw new Error(`Calorías: "${name}" no tiene medidas (UNITS_BY_NAME / UNITS_BY_GROUP).`);
  const principal = (p.porcion && medidas.find(([m]) => m === p.porcion)) || medidas[0];
  if (!GRUPOS.some(g => g.id === p.grupo)) throw new Error(`Calorías: grupo "${p.grupo}" no existe.`);
  const fuente = verificados[`${name} (${estado})`]?.fuente || '';
  return { ...p, f, medidas, principal, etiqueta: p.etiqueta || nombreMedida(principal[0]), fuente };
});
const slugs = new Set();
for (const p of platos) {
  if (slugs.has(p.slug)) throw new Error(`Calorías: slug repetido "${p.slug}".`);
  slugs.add(p.slug);
}

const FUENTES = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Anton&family=Work+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">';

// Píxel de Meta: solo la visita, para poder mostrarle anuncios después a
// quien leyó estas páginas.
const PIXEL = `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','1084905720987308');fbq('track','PageView');</script>`;

const CSS = `
:root{--carbon:#16110D;--carbon2:#1B140E;--borde:#2A2016;--crema:#F7F2E7;--crema2:#E3D6BC;--gris:#A99E8C;--gris2:#8A7F6E;--aji:#E8590C;--aji2:#FF7020;--prot:#F5A468;--carb:#E3D6BC;--gras:#C24A0A}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--carbon);color:var(--crema);font-family:'Work Sans',system-ui,sans-serif;line-height:1.55}
a{color:var(--aji2)}
.envoltura{max-width:720px;margin:0 auto;padding:0 16px 48px}
.display{font-family:'Anton',Impact,sans-serif;font-weight:400;letter-spacing:.01em;line-height:1.05;text-transform:uppercase}
header.barra{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 0;border-bottom:1px solid var(--borde);margin-bottom:18px}
header.barra a.marca{display:flex;align-items:center;gap:8px;text-decoration:none;color:var(--crema)}
header.barra img{width:32px;height:32px;border-radius:8px;object-fit:cover}
header.barra .marca span{font-family:'Anton',Impact,sans-serif;font-size:18px}
header.barra .marca b{color:var(--aji2);font-weight:400}
.btn{display:inline-block;background:var(--aji);color:var(--carbon);font-weight:700;text-decoration:none;border-radius:12px;padding:12px 18px;text-align:center}
.btn:hover{background:var(--aji2)}
.btn-chico{padding:8px 12px;font-size:14px;border-radius:10px}
nav.migas{font-size:13px;color:var(--gris);margin-bottom:10px}
nav.migas a{color:var(--gris);text-decoration:none}
nav.migas a:hover{color:var(--crema)}
h1{font-size:clamp(30px,8vw,46px);margin:0 0 8px}
h1 em{color:var(--aji2);font-style:normal}
h2{font-size:22px;margin:0 0 12px}
.bajada{color:var(--crema2);margin:0 0 18px}
.tarjeta{background:var(--carbon2);border:1px solid var(--borde);border-radius:18px;padding:18px;margin-bottom:16px}
.grande{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap}
.grande .medida{color:var(--gris);font-size:14px}
.grande .kcal{font-family:'Anton',Impact,sans-serif;font-size:64px;line-height:1;color:var(--aji2)}
.grande .kcal small{font-size:22px;color:var(--crema2);margin-left:6px}
.macros{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:16px}
.macro{background:var(--carbon);border:1px solid var(--borde);border-radius:12px;padding:10px}
.macro b{display:block;font-family:'Anton',Impact,sans-serif;font-weight:400;font-size:24px}
.macro span{font-size:12px;color:var(--gris)}
.reparto{display:flex;height:10px;border-radius:999px;overflow:hidden;gap:2px;margin-top:14px;background:var(--carbon)}
.reparto i{display:block;height:100%}
.leyenda{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--gris);margin-top:8px}
.leyenda i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}
table{width:100%;border-collapse:collapse;font-size:15px}
td,th{padding:10px 4px;border-bottom:1px solid var(--borde);text-align:left}
th{color:var(--gris);font-weight:500;font-size:13px}
td.n,th.n{text-align:right;white-space:nowrap}
tr:last-child td{border-bottom:0}
.consejo{display:flex;gap:14px;align-items:flex-start;border-color:var(--aji)}
.consejo img{width:52px;height:52px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid var(--aji)}
.consejo p{margin:4px 0 0;color:var(--crema)}
.consejo .quien{font-size:13px;color:var(--gris)}
.cta{text-align:center;background:linear-gradient(180deg,rgba(232,89,12,.16),rgba(232,89,12,.04));border-color:rgba(232,89,12,.5)}
.cta p{color:var(--crema2);margin:6px 0 14px}
.nota{font-size:12px;color:var(--gris2);margin:4px 0 16px}
.lista{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}
.lista a{display:flex;justify-content:space-between;align-items:center;gap:8px;background:var(--carbon2);border:1px solid var(--borde);border-radius:12px;padding:12px;text-decoration:none;color:var(--crema)}
.lista a:hover{border-color:var(--aji)}
.lista a span{font-size:13px;color:var(--aji2);white-space:nowrap}
.buscar{width:100%;background:var(--carbon2);border:1px solid var(--borde);border-radius:12px;padding:12px 14px;color:var(--crema);font:inherit;margin-bottom:18px}
.buscar:focus{outline:2px solid var(--aji);outline-offset:1px}
section.grupo{margin-bottom:22px}
.historia{font-size:14px;color:var(--crema2)}
footer{border-top:1px solid var(--borde);margin-top:28px;padding-top:16px;font-size:13px;color:var(--gris)}
footer a{color:var(--gris)}
@media (max-width:420px){.grande .kcal{font-size:52px}.macro b{font-size:20px}}
`;

function cabecera({ titulo, descripcion, ruta, jsonld }) {
  return `<!doctype html>
<html lang="es-PE">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descripcion)}">
<link rel="canonical" href="${SITIO}${ruta}">
<meta name="theme-color" content="#16110D">
<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:locale" content="es_PE">
<meta property="og:site_name" content="Jonah Beast Fuel">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descripcion)}">
<meta property="og:url" content="${SITIO}${ruta}">
<meta property="og:image" content="${SITIO}/lomo-saltado.jpg">
${FUENTES}
<style>${CSS}</style>
<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>
${PIXEL}
</head>
<body>
<div class="envoltura">
<header class="barra">
  <a class="marca" href="/"><img src="/jonah-avatar.png" alt="" width="32" height="32"><span>JONAH BEAST <b>FUEL</b></span></a>
  <a class="btn btn-chico" href="${linkApp('cabecera')}">Probar gratis</a>
</header>`;
}

const HISTORIA = 'Soy Jonah. Hace unos años bajé 37 kg, y ahora bajé de 104 a 90 kg en 2 meses y medio con mi propia app, sumándole entrenamiento algunos días y disciplina. No dejé la comida peruana: aprendí a medirla. El cambio llega poco a poco, comida a comida.';

function pie() {
  return `<footer>
  <p class="historia">${esc(HISTORIA)}</p>
  <p><a href="/contador-de-calorias">Contador de calorías de comida peruana</a> · <a href="/calorias">Calorías de la comida peruana</a> · <a href="/">Jonah Beast Fuel</a> · <a href="/privacidad.html">Privacidad</a></p>
</footer>
</div>
</body>
</html>
`;
}

// Al tocar el botón: la app sabe que vino de estas páginas (fuente) y de
// cuál plato (campaña · anuncio en el embudo).
const linkApp = donde => `/?fuente=calorias&utm_campaign=paginas_calorias&utm_content=${encodeURIComponent(donde)}`;

function paginaPlato(p) {
  const { f, principal, medidas } = p;
  const [, gramos] = principal;
  const kcal = kcalDe(f, gramos);
  const prot = grDe(f.protein, gramos), carb = grDe(f.carbs, gramos), gras = grDe(f.fat, gramos);
  // Reparto de las calorías: proteína y carbos 4 kcal/g, grasa 9 kcal/g.
  const kp = f.protein * 4, kc = f.carbs * 4, kg = f.fat * 9, tot = kp + kc + kg || 1;
  const pct = v => Math.round(v / tot * 100);
  const nombreMin = p.nombre.charAt(0).toLowerCase() + p.nombre.slice(1);
  // Artículo del plato: "el lomo saltado", "la causa", "los anticuchos".
  const el = p.el || 'el';
  const del = el === 'el' ? 'del' : `de ${el}`;
  const tiene = el === 'los' || el === 'las' ? 'tienen' : 'tiene';
  const frase = p.frase || `${p.etiqueta} de ${nombreMin}`;
  const titulo = `Calorías ${del} ${nombreMin} (${kcal} kcal) | Jonah Beast Fuel`;
  const descripcion = `${frase} (${gramos} g) tiene unas ${kcal} kcal: ${prot} g de proteína, ${carb} g de carbohidratos y ${gras} g de grasa. Mira cuánto tiene tu porción y el consejo de Jonah.`;
  const ruta = `/calorias/${p.slug}`;
  const otros = platos.filter(o => o.grupo === p.grupo && o.slug !== p.slug).slice(0, 4);
  const masOtros = otros.length < 4 ? platos.filter(o => o.grupo !== p.grupo).slice(0, 4 - otros.length) : [];
  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITIO}/` },
      { '@type': 'ListItem', position: 2, name: 'Calorías de la comida peruana', item: `${SITIO}/calorias` },
      { '@type': 'ListItem', position: 3, name: p.nombre, item: `${SITIO}${ruta}` },
    ] },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
      { '@type': 'Question', name: `¿Cuántas calorías ${tiene} ${el} ${nombreMin}?`,
        acceptedAnswer: { '@type': 'Answer', text: `${frase} (${gramos} g) tiene unas ${kcal} kcal. En 100 g hay unas ${Math.round(f.kcal)} kcal.` } },
      { '@type': 'Question', name: `¿Cuánta proteína ${tiene} ${el} ${nombreMin}?`,
        acceptedAnswer: { '@type': 'Answer', text: `${frase} (${gramos} g) tiene unos ${prot} g de proteína, ${carb} g de carbohidratos y ${gras} g de grasa.` } },
    ] },
  ];

  return `${cabecera({ titulo, descripcion, ruta, jsonld })}
<nav class="migas"><a href="/">Inicio</a> › <a href="/calorias">Calorías</a> › ${esc(p.nombre)}</nav>
<h1 class="display">Calorías ${del} <em>${esc(nombreMin)}</em></h1>
<p class="bajada">${esc(frase)} tiene unas <b>${kcal} kcal</b>. Aquí ves cuánto tiene según tu porción y cómo disfrutarlo sin dejarlo.</p>

<div class="tarjeta">
  <div class="grande">
    <div><div class="medida">${esc(p.etiqueta)} (${gramos} g)</div>
    <div class="kcal">${kcal}<small>kcal</small></div>${p.aclara ? `<div class="medida">${esc(p.aclara)}</div>` : ''}</div>
  </div>
  <div class="macros">
    <div class="macro"><b>${prot} g</b><span>Proteína</span></div>
    <div class="macro"><b>${carb} g</b><span>Carbohidratos</span></div>
    <div class="macro"><b>${gras} g</b><span>Grasa</span></div>
  </div>
  <div class="reparto" role="img" aria-label="De dónde vienen sus calorías: ${pct(kp)}% proteína, ${pct(kc)}% carbohidratos, ${pct(kg)}% grasa">
    <i style="width:${pct(kp)}%;background:var(--prot)"></i><i style="width:${pct(kc)}%;background:var(--carb)"></i><i style="width:${pct(kg)}%;background:var(--gras)"></i>
  </div>
  <div class="leyenda"><span><i style="background:var(--prot)"></i>Proteína ${pct(kp)}%</span><span><i style="background:var(--carb)"></i>Carbohidratos ${pct(kc)}%</span><span><i style="background:var(--gras)"></i>Grasa ${pct(kg)}%</span></div>
</div>

<div class="tarjeta consejo">
  <img src="/jonah-avatar.png" alt="Jonah" width="52" height="52">
  <div><div class="quien">💬 El consejo de Jonah</div><p>${esc(p.consejo)}</p></div>
</div>

<div class="tarjeta">
  <h2 class="display">Según cuánto te sirvas</h2>
  <table>
    <thead><tr><th>Porción</th><th class="n">Peso</th><th class="n">Calorías</th><th class="n">Proteína</th></tr></thead>
    <tbody>
${medidas.map(([m, g]) => `      <tr><td>${esc(nombreMedida(m))}</td><td class="n">${g} g</td><td class="n"><b>${kcalDe(f, g)} kcal</b></td><td class="n">${grDe(f.protein, g)} g</td></tr>`).join('\n')}
      <tr><td>100 g</td><td class="n">100 g</td><td class="n"><b>${Math.round(f.kcal)} kcal</b></td><td class="n">${num(f.protein)} g</td></tr>
    </tbody>
  </table>
</div>
<p class="nota">Valores aproximados: cambian según la receta y el tamaño de tu porción. En 100 g: ${num(f.protein)} g de proteína, ${num(f.carbs)} g de carbohidratos, ${num(f.fat)} g de grasa y ${num(f.fiber)} g de fibra.${p.fuente && !p.fuente.startsWith('"') ? ` Fuente: ${esc(p.fuente.replace(/^Corregido: /, ''))}.` : ''}</p>

<div class="tarjeta cta">
  <h2 class="display">¿Tu plato es más grande o más chico?</h2>
  <p>Tómale foto y Jonah Beast Fuel te dice cuánto tiene el tuyo: calorías, proteína, carbohidratos y grasa. Con tu comida peruana de siempre. Gratis para siempre, sin tarjeta.</p>
  <a class="btn" href="${linkApp(p.slug)}">Calcula el tuyo gratis</a>
</div>

<h2 class="display">Otros platos</h2>
<div class="lista">
${[...otros, ...masOtros].map(o => `  <a href="/calorias/${o.slug}">${esc(o.nombre)}<span>${kcalDe(o.f, o.principal[1])} kcal</span></a>`).join('\n')}
</div>
<p style="margin-top:14px"><a href="/calorias">Ver todos los platos →</a></p>
${pie()}`;
}

function paginaIndice() {
  const titulo = 'Calorías de la comida peruana: lomo saltado, ceviche, ají de gallina y más | Jonah Beast Fuel';
  const descripcion = `Cuántas calorías, proteína, carbohidratos y grasa tienen ${platos.length} platos peruanos: lomo saltado, ceviche, ají de gallina, pollo a la brasa, chaufa y más. Con el consejo de Jonah para comerlos sin dejarlos.`;
  const jsonld = { '@context': 'https://schema.org', '@type': 'ItemList', name: 'Calorías de la comida peruana',
    itemListElement: platos.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITIO}/calorias/${p.slug}`, name: p.nombre })) };
  return `${cabecera({ titulo, descripcion, ruta: '/calorias', jsonld })}
<nav class="migas"><a href="/">Inicio</a> › Calorías</nav>
<h1 class="display">Calorías de la <em>comida peruana</em></h1>
<p class="bajada">No tienes que dejar tu lomo saltado ni tu ceviche para bajar de peso: tienes que saber cuánto comes. Aquí están ${platos.length} platos de siempre como se sirven en casa, con sus calorías (la Tabla Peruana del CENAN es nuestra primera fuente), su proteína y un consejo mío para cada uno.</p>
<input class="buscar" type="search" placeholder="Busca un plato (ej. chaufa)" aria-label="Buscar un plato" oninput="filtrar(this.value)">
${GRUPOS.map(g => {
  const lista = platos.filter(p => p.grupo === g.id);
  if (!lista.length) return '';
  return `<section class="grupo">
  <h2 class="display">${esc(g.titulo)}</h2>
  <div class="lista">
${lista.map(p => `    <a href="/calorias/${p.slug}" data-buscar="${esc((p.nombre + ' ' + p.alimento).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))}">${esc(p.nombre)}<span>${kcalDe(p.f, p.principal[1])} kcal</span></a>`).join('\n')}
  </div>
</section>`;
}).join('\n')}
<p class="nota">Calorías de ${'"'}una porción${'"'} como se sirve normalmente (cada página dice de cuántos gramos). Valores aproximados: cambian según la receta. La primera fuente es la Tabla Peruana de Composición de Alimentos del CENAN (Instituto Nacional de Salud). <a href="/contador-de-calorias">Cómo contamos las calorías →</a></p>
<div class="tarjeta cta">
  <h2 class="display">¿Tu plato no está aquí?</h2>
  <p>Tómale foto y Jonah Beast Fuel te dice cuánto tiene: calorías, proteína, carbohidratos y grasa. Gratis para siempre, sin tarjeta.</p>
  <a class="btn" href="${linkApp('indice')}">Calcula el tuyo gratis</a>
</div>
<script>
function filtrar(t){t=t.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').trim();
document.querySelectorAll('section.grupo').forEach(function(s){var n=0;s.querySelectorAll('a[data-buscar]').forEach(function(a){var ok=!t||a.getAttribute('data-buscar').indexOf(t)>=0;a.style.display=ok?'':'none';if(ok)n++;});s.style.display=n?'':'none';});}
</script>
${pie()}`;
}

// De dónde salen los números: cuántos alimentos de la app vienen de la Tabla
// Peruana del CENAN (se cuenta solo, para que la página nunca diga de más).
const totalAlimentos = RAW_FOODS.length;
const conCenan = Object.values(verificados).filter(v => /CENAN/i.test(v.fuente || '')).length;
if (conCenan < totalAlimentos / 2) throw new Error(`Contador: solo ${conCenan} de ${totalAlimentos} alimentos citan el CENAN; revisa el texto de /contador-de-calorias.`);

// Precios de la web (los mismos que la app muestra por defecto).
const PLANES = literal('PLANES');
const precio = m => PLANES.find(p => p.meses === m)?.precioDefault;
if (!precio(1) || !precio(12)) throw new Error('Contador: no encontré el precio mensual o anual en PLANES.');
const soles = v => `S/${v.toFixed(2).replace('.', ',')}`;

// Página "Contador de calorías de comida peruana": la explica de corrido,
// para que Google (y su resumen con IA) sepa qué es la app y la recomiende.
function paginaContador() {
  const lomo = platos.find(p => p.slug === 'lomo-saltado');
  const arroz = RAW_FOODS.find(r => r[1] === 'Arroz blanco' && r[2] === 'Cocido');
  if (!lomo || !arroz) throw new Error('Contador: falta el lomo saltado o el arroz blanco cocido.');
  const kLomo = kcalDe(lomo.f, lomo.principal[1]);
  const gArroz = 150;
  const kArroz = Math.round(arroz[3] * gArroz / 100);
  const pct = Math.round(conCenan / totalAlimentos * 100);
  const mensual = soles(precio(1)), anual = soles(precio(12)), anualMes = soles(precio(12) / 12);

  const titulo = 'Contador de calorías de comida peruana | Jonah Beast Fuel';
  const descripcion = `App para contar calorías de tu comida peruana con una foto, tu voz o escribiendo. Números de la Tabla Peruana de Alimentos (CENAN) y platos como se sirven en casa, con o sin arroz. Gratis, sin tarjeta.`;
  const ruta = '/contador-de-calorias';
  const preguntas = [
    ['¿Sirve para contar las calorías de la comida peruana?',
      `Sí. Jonah Beast Fuel tiene ${totalAlimentos} alimentos y platos de lo que se come en Perú (lomo saltado, ají de gallina, pollo a la brasa, chaufa, panes, frutas, bebidas) y puedes crear el tuyo si no está. Lo anotas con una foto, con tu voz o escribiendo, y ves cuánto llevas frente a tu meta del día.`],
    ['¿De dónde salen las calorías?',
      `La primera fuente es la Tabla Peruana de Composición de Alimentos del CENAN (Instituto Nacional de Salud): ${conCenan} de los ${totalAlimentos} alimentos de la app se calculan con ella. Si un alimento no está en esa tabla, se usa la etiqueta del producto, la base del USDA o una receta promedio. Cada alimento de la lista se revisa antes de entrar a la app.`],
    ['¿Tengo que pesar mi comida?',
      'No. Puedes anotar en medida casera (un plato, una unidad, un cucharón, una lata) o, si usas balanza, en gramos con "⚖️ Lo pesé".'],
    ['¿Las calorías del guiso incluyen el arroz?',
      `Depende del plato, y la app te lo dice. En los guisos que se comen con arroz y no lo incluyen (como el lomo saltado o el ají de gallina) verás "🍚 Sin arroz: agrégalo aparte". Por ejemplo, un plato de lomo saltado tiene unas ${kLomo} kcal y una porción de arroz blanco (${gArroz} g) suma unas ${kArroz} kcal más.`],
    ['¿Es gratis?',
      `Sí: la versión gratis es para siempre y no pide tarjeta. Al crear tu cuenta tienes 7 días de Premium incluidos; cuando terminan, sigues gratis y nadie te cobra solo. Premium cuesta ${mensual} al mes o ${anual} al año (${anualMes} al mes), en jonahbeast.com.`],
    ['¿En qué celular funciona?',
      'En cualquier celular con internet, Android o iPhone: entras a jonahbeast.com desde el navegador y puedes agregarla a tu pantalla de inicio como una app.'],
  ];
  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Jonah Beast Fuel', url: `${SITIO}/`,
      applicationCategory: 'HealthApplication', operatingSystem: 'Android, iOS, navegador web', inLanguage: 'es-PE',
      description: descripcion,
      offers: [
        { '@type': 'Offer', name: 'Gratis', price: '0', priceCurrency: 'PEN' },
        { '@type': 'Offer', name: 'Premium mensual', price: precio(1).toFixed(2), priceCurrency: 'PEN' },
        { '@type': 'Offer', name: 'Premium anual', price: precio(12).toFixed(2), priceCurrency: 'PEN' },
      ],
      author: { '@type': 'Person', name: 'Jonah' } },
    { '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: preguntas.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITIO}/` },
      { '@type': 'ListItem', position: 2, name: 'Contador de calorías de comida peruana', item: `${SITIO}${ruta}` },
    ] },
  ];
  const formas = [
    ['📸', 'Foto', 'Le tomas foto a tu plato y la app reconoce lo que hay, con su porción. Tú la ajustas si tu plato es más grande o más chico.'],
    ['🎙️', 'Voz', 'Dices "un cuarto de pollo a la brasa con papas y ensalada" y queda anotado.'],
    ['⌨️', 'Escribir', `Buscas entre ${totalAlimentos} alimentos y platos y eliges cuánto comiste.`],
    ['🔲', 'Código de barras', 'Escaneas el paquete de lo que compraste y queda anotado.'],
    ['⭐', 'Favoritos', 'Lo que comes seguido queda a un toque.'],
    ['🦍', 'Beast', 'Tu compañero en la app: le hablas, te anota la comida y te responde "¿qué como?" con lo que te queda del día.'],
  ];

  return `${cabecera({ titulo, descripcion, ruta, jsonld })}
<nav class="migas"><a href="/">Inicio</a> › Contador de calorías</nav>
<h1 class="display">Contador de calorías de <em>comida peruana</em></h1>
<p class="bajada">Jonah Beast Fuel es una app para contar calorías sin dejar tu comida de siempre: tu lomo saltado, tu ají de gallina, tu pollo a la brasa, tu chaufa. Lo anotas con una foto, con tu voz o escribiendo, y ves cuánto llevas frente a tu meta.</p>
<p><a class="btn" href="${linkApp('contador_arriba')}">Empezar gratis</a></p>
<p class="nota">Gratis para siempre · 7 días de Premium incluidos · Sin tarjeta</p>

<div class="tarjeta">
  <h2 class="display">De dónde salen los números</h2>
  <p>La primera fuente es la <b>Tabla Peruana de Composición de Alimentos del CENAN</b> (Centro Nacional de Alimentación y Nutrición, del Instituto Nacional de Salud): <b>${conCenan} de los ${totalAlimentos} alimentos</b> de la app (${pct}%) se calculan con ella.</p>
  <p>Si un ingrediente o alimento no está en esa tabla, usamos la etiqueta del producto, la base del USDA o una receta promedio. Cada alimento de la lista se revisa antes de entrar: que los números cuadren, que no esté repetido y que tenga su medida casera.</p>
</div>

<div class="tarjeta">
  <h2 class="display">Tu plato, como se sirve en casa</h2>
  <p><b>Sin balanza:</b> anotas en medida casera: un plato, una unidad, un cucharón, una lata. <b>Con balanza:</b> anotas los gramos exactos con "⚖️ Lo pesé".</p>
  <p><b>Con arroz o sin arroz.</b> Cada plato dice si sus calorías incluyen el arroz. En los guisos que se comen con arroz y no lo incluyen, verás "🍚 Sin arroz: agrégalo aparte", para que no se te pase.</p>
  <table>
    <thead><tr><th>Ejemplo</th><th class="n">Calorías</th></tr></thead>
    <tbody>
      <tr><td><a href="/calorias/${lomo.slug}">Lomo saltado</a> (${esc(lomo.etiqueta.toLowerCase())}, ${lomo.principal[1]} g)</td><td class="n">${kLomo} kcal</td></tr>
      <tr><td>+ Arroz blanco (una porción, ${gArroz} g)</td><td class="n">${kArroz} kcal</td></tr>
      <tr><td><b>Tu plato completo</b></td><td class="n"><b>${kLomo + kArroz} kcal</b></td></tr>
    </tbody>
  </table>
</div>

<div class="tarjeta">
  <h2 class="display">Anótalo como te quede más fácil</h2>
  <table>
    <tbody>
${formas.map(([ico, t, d]) => `      <tr><td style="width:36px;font-size:22px">${ico}</td><td><b>${esc(t)}.</b> ${esc(d)}</td></tr>`).join('\n')}
    </tbody>
  </table>
</div>

<div class="tarjeta">
  <h2 class="display">Gratis y Premium</h2>
  <table>
    <thead><tr><th>Gratis, para siempre</th><th>👑 Premium</th></tr></thead>
    <tbody>
      <tr><td>Anotar tus comidas escribiendo y con código de barras</td><td>Foto en todas tus comidas y registro por voz</td></tr>
      <tr><td>Tu meta de calorías</td><td>Beast contigo todos los días, sin monedas ni cobros extra</td></tr>
      <tr><td>3 fotos por semana</td><td>Tu menú del día y de la semana, y tu lista de compras</td></tr>
      <tr><td>Tu peso y tu racha</td><td>"¿Qué puedo comer?" con comida peruana</td></tr>
      <tr><td>Tendencias de 7 días</td><td>Tu % de grasa y músculo, fotos de progreso y Jonah por WhatsApp</td></tr>
    </tbody>
  </table>
  <p class="nota" style="margin-top:12px">Premium: ${mensual} al mes o ${anual} al año (${anualMes} al mes), en jonahbeast.com. Al crear tu cuenta tienes 7 días de Premium incluidos, sin tarjeta; cuando terminan sigues gratis y nadie te cobra solo.</p>
</div>

<div class="tarjeta consejo">
  <img src="/jonah-avatar.png" alt="Jonah" width="52" height="52">
  <div><div class="quien">💬 Quién está detrás</div><p>${esc(HISTORIA)} Por eso armé esta app: para que cuentes tu comida peruana sin adivinar.</p></div>
</div>

<div class="tarjeta">
  <h2 class="display">Preguntas frecuentes</h2>
${preguntas.map(([q, a]) => `  <h3 style="font-size:16px;margin:14px 0 4px">${esc(q)}</h3>\n  <p style="margin:0;color:var(--crema2)">${esc(a)}</p>`).join('\n')}
</div>

<div class="tarjeta cta">
  <h2 class="display">Cuenta tu primera comida hoy</h2>
  <p>Tómale foto a tu plato y mira cuánto tiene. Gratis para siempre, sin tarjeta.</p>
  <a class="btn" href="${linkApp('contador_abajo')}">Empezar gratis</a>
</div>
<p><a href="/calorias">Mira las calorías de ${platos.length} platos peruanos →</a></p>
${pie()}`;
}

function escribir(ruta, html) {
  const carpeta = new URL(ruta.replace(/^\//, '') + '/', dist);
  mkdirSync(carpeta, { recursive: true });
  writeFileSync(new URL('index.html', carpeta), html);
}

escribir('/calorias', paginaIndice());
escribir('/contador-de-calorias', paginaContador());
for (const p of platos) escribir(`/calorias/${p.slug}`, paginaPlato(p));

const hoy = new Date().toISOString().slice(0, 10);
const urls = ['/', '/contador-de-calorias', '/calorias', ...platos.map(p => `/calorias/${p.slug}`)];
writeFileSync(new URL('sitemap.xml', dist), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${SITIO}${u}</loc><lastmod>${hoy}</lastmod></url>`).join('\n')}
</urlset>
`);
writeFileSync(new URL('robots.txt', dist), `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${SITIO}/sitemap.xml
`);

console.log(`✅ Páginas de calorías: ${platos.length} platos + índice, contador (${conCenan}/${totalAlimentos} con CENAN), sitemap.xml y robots.txt.`);
