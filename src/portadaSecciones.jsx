/* Secciones de la portada, debajo de la primera pantalla
   (contenido del 17 oct, aprobado por Jonah: ideas de fitia.app con nuestra
   marca; diseño SÚPER "Fuego" del mismo día, interactivo: carruseles que
   se deslizan, pestañas y preguntas que se abren, para tocar y descubrir
   en vez de solo bajar).
   Se descargan aparte (React.lazy en src/App.jsx) para que la primera
   pantalla cargue rápido. Los textos viven en src/portadaInfo.js y en
   POR_QUE_FILAS (src/App.jsx). Los efectos (aparecer al bajar, neón,
   números que cuentan, brasas, carrusel) están en src/portadaFx.jsx.
   Todo el texto (tarjetas del carrusel, la pestaña que no se ve, las
   respuestas plegadas) está en el HTML, para Google y los lectores de
   pantalla.

   Orden: ¿Por qué? (carrusel) → Así se ve la app (pantallas que se
   deslizan) → Gratis o Premium (pestañas) → Testimonios (oculta mientras
   no haya frases reales) → Preguntas frecuentes → Cierre (el gorila,
   "Sigue comiendo peruano…", Empezar, tiendas apagadas y los datos del
   negocio). */
import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { esAppTienda, PLANES, POR_QUE_FILAS, POR_QUE_INTRO } from './App.jsx';
import {
  PREGUNTAS_FRECUENTES, GRATIS_PREMIUM, TESTIMONIOS_ALUMNOS, TIENDAS_PUBLICAS,
  LINK_PLAY, LINK_APP_STORE, PAGINAS_OBJETIVO, faqJsonLd,
} from './portadaInfo.js';
import { rv, Palabras, Cuenta, Brasas, Carrusel, quieto, useMarcaFija } from './portadaFx.jsx';

const fmtSoles = n => 'S/' + Number(n).toFixed(2);

function Titulo({ ante, partes, sub }) {
  return (
    <>
      <p className="ps-eyebrow text-center">{ante}</p>
      <Palabras className="ps-d ps-titulo" partes={partes} />
      {sub && <p ref={rv} className="ps-intro ps-rv">{sub}</p>}
    </>
  );
}

function irA(id) {
  return e => {
    e.preventDefault();
    try { document.getElementById(id)?.scrollIntoView({ behavior: quieto() ? 'auto' : 'smooth', block: 'start' }); } catch {}
  };
}

/* "¿Por qué Jonah Beast Fuel?" (16 oct): carrusel de tarjetas que se
   deslizan de lado. Las filas y de dónde sale cada una están en
   src/App.jsx (POR_QUE_FILAS); la de pagos no sale en las apps de tienda. */
function PorQueJonahBeast({ onEmpezar }) {
  const filas = POR_QUE_FILAS.filter(f => !f.soloWeb || !esAppTienda());
  const tarjetas = filas.map((f, i) => (
    <article key={f.titulo} ref={rv} className="ps-pq ps-incl ps-neon" style={{ '--nd': '.2s' }}>
      <span className="ps-pq-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
      <h3><span className="ps-pq-e" aria-hidden="true">{f.ico}</span>{f.titulo}</h3>
      <div className="ps-pq-aqui">
        <p className="ps-pq-lbl">✓ Jonah Beast Fuel</p>
        <p>{f.aqui}</p>
      </div>
      <div className="ps-pq-afuera">
        <p className="ps-pq-lbl">Apps de afuera</p>
        <p>{f.afuera}</p>
      </div>
    </article>
  ));
  return (
    <section id="por-que" className="ps-sec scroll-mt-2">
      <div className="ps-wrap">
        <p className="ps-eyebrow text-center">Te lo cuento claro</p>
        <Palabras className="ps-d ps-titulo" partes={[['¿POR QUÉ '], ['JONAH BEAST FUEL', 'ps-o'], ['?']]} />
        <p ref={rv} className="ps-intro ps-rv">{POR_QUE_INTRO}</p>
        <p className="ps-desliza" aria-hidden="true">Desliza <span>→</span></p>
        <Carrusel etiqueta="¿Por qué Jonah Beast Fuel?" items={tarjetas} className="ps-porque"
          nombre={i => `${i + 1} de ${filas.length}: ${filas[i].titulo}`} />

        <p ref={rv} className="ps-rv ps-nota-sec">
          Cada cuerpo va a su ritmo: el cambio llega poco a poco, comida a comida. <a href="/contador-de-calorias" className="text-orange-400 hover:text-orange-300 whitespace-nowrap">Cómo contamos las calorías →</a>
        </p>

        <div ref={rv} className="ps-rv max-w-[440px] mx-auto mt-6">
          <button onClick={() => onEmpezar('tabla_comparacion')} className="ps-cta">EMPEZAR AHORA</button>
          <p className="ps-nota"><b>Gratis para siempre</b> · 7 días de Premium incluidos · Sin tarjeta</p>
        </div>
      </div>
    </section>
  );
}

/* "Así se ve la app": pantallas reales que se deslizan dentro del marco
   del celular: el Inicio (public/app-inicio.webp) y Registrar con foto,
   código o voz (public/app-registrar.webp, de las capturas de
   public/anuncios/pantallas). Con datos de ejemplo de alumnos ficticios.
   La de Progreso no va: muestra kilos. */
const PANTALLAS = [
  { src: '/app-inicio.webp', titulo: 'Tu día', texto: 'Tus calorías del día, lo que te queda y tus comidas, en una sola pantalla.',
    alt: 'Pantalla de Inicio de la app Jonah Beast Fuel: anillo con las calorías que quedan del día, proteína, carbos y grasa, y las comidas del día' },
  { src: '/app-registrar.webp', titulo: 'Anota como te quede fácil', texto: 'Foto, código de barras, voz o escribiendo. Y tus atajos: repetir ayer y tus comidas de siempre.',
    alt: 'Pantalla Registrar de la app Jonah Beast Fuel: escribir lo que comiste, foto, código de barras, voz y atajos para el almuerzo' },
];
function AsiSeVeLaApp() {
  const [i, setI] = useState(0);
  const pista = useRef(null);
  // Desliza el celular con el dedo (scroll-snap) o con las pestañas.
  useEffect(() => {
    const el = pista.current;
    if (!el) return;
    let tick = false;
    const alMover = () => {
      if (tick) return;
      tick = true;
      requestAnimationFrame(() => { tick = false; setI(Math.round(el.scrollLeft / Math.max(1, el.clientWidth))); });
    };
    el.addEventListener('scroll', alMover, { passive: true });
    return () => el.removeEventListener('scroll', alMover);
  }, []);
  const ir = k => pista.current?.scrollTo({ left: k * pista.current.clientWidth, behavior: quieto() ? 'auto' : 'smooth' });

  return (
    <section id="asi-se-ve" className="ps-sec scroll-mt-2" style={{ background: 'radial-gradient(80% 50% at 50% 55%,rgba(74,28,3,.55),rgba(22,17,13,0) 70%)' }}>
      <div className="ps-wrap ps-asi">
        <div>
          <Titulo ante="Por dentro" partes={[['ASÍ SE VE '], ['LA APP', 'ps-o']]} />
          <div className="ps-pills" role="tablist" aria-label="Pantallas de la app">
            {PANTALLAS.map((p, k) => (
              <button key={p.src} type="button" role="tab" aria-selected={k === i} aria-controls="asi-pantallas" onClick={() => ir(k)}>{p.titulo}</button>
            ))}
          </div>
          <p className="ps-intro ps-asi-texto" aria-live="polite">{PANTALLAS[i]?.texto}</p>
        </div>
        <figure className="m-0">
          <div className="ps-escena">
            <div className="ps-resplandor" />
            <div className="ps-cel ps-incl">
              <div className="ps-isla" aria-hidden="true" />
              <div ref={pista} id="asi-pantallas" className="ps-cel-pista" tabIndex={0} aria-label="Pantallas de la app: desliza para ver la siguiente">
                {PANTALLAS.map(p => (
                  <img key={p.src} src={p.src} width="390" height="844" loading="lazy" decoding="async" alt={p.alt} />
                ))}
              </div>
            </div>
          </div>
          <div className="ps-carr-ctrl" aria-hidden="true">
            <div className="ps-carr-puntos">
              {PANTALLAS.map((p, k) => <button key={p.src} type="button" tabIndex={-1} onClick={() => ir(k)}><span data-on={k === i ? '' : undefined} /></button>)}
            </div>
          </div>
          <figcaption className="ps-leyenda">Capturas reales de la app, con datos de ejemplo.</figcaption>
        </figure>
      </div>
    </section>
  );
}

/* "Gratis o Premium" con dos pestañas (antes, una tabla larga). Sale de las
   mismas filas de GRATIS_PREMIUM: en Gratis lo que tiene la versión gratis;
   en Premium, lo que suma (en naranja) y "Y todo lo de Gratis".
   Los precios salen de config (los mismos de la pantalla de planes); en
   las apps de tienda no se muestran (ahí cobra Google o Apple). */
function Fila({ f, valor, premium }) {
  return (
    <li className={'ps-gpf' + (premium ? ' ps-gpf-p' : '')}>
      <span>{f.funcion}</span>
      <b>{valor === true ? '✓' : valor}</b>
    </li>
  );
}
function GratisPremium({ onEmpezar }) {
  const tienda = esAppTienda();
  const [precios, setPrecios] = useState(null);
  const [tab, setTab] = useState('gratis');
  const tabs = useRef({});
  useEffect(() => {
    if (tienda) return;
    let vivo = true;
    supabase.from('config').select('key, value').in('key', PLANES.map(p => p.configKey))
      .then(({ data }) => {
        const m = {};
        (data || []).forEach(c => { m[c.key] = Number(c.value); });
        if (vivo) setPrecios(PLANES.map(p => ({ ...p, precio: m[p.configKey] > 0 ? m[p.configKey] : p.precioDefault })));
      }, () => { if (vivo) setPrecios(PLANES.map(p => ({ ...p, precio: p.precioDefault }))); });
    return () => { vivo = false; };
  }, [tienda]);
  const de = meses => precios?.find(p => p.meses === meses)?.precio;

  const ambos = GRATIS_PREMIUM.filter(f => f.gratis === true && f.premium === true);
  const cambia = GRATIS_PREMIUM.filter(f => typeof f.gratis === 'string');
  const solo = GRATIS_PREMIUM.filter(f => f.gratis === false);
  const elegir = t => { setTab(t); tabs.current[t]?.focus(); };
  const teclas = e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); elegir(tab === 'gratis' ? 'premium' : 'gratis'); }
  };

  return (
    <section id="gratis-premium" className="ps-sec scroll-mt-2">
      <div className="ps-wrap">
        <Titulo ante="Sin letra chica" partes={[['GRATIS PARA SIEMPRE '], ['VS. PREMIUM', 'ps-o']]}
          sub="La versión gratis es para siempre y no pide tarjeta. Premium suma lo que más te acompaña." />

        <div className="ps-gp">
          <div ref={rv} className="ps-caja ps-rv">
            <div className="ps-tabs" role="tablist" aria-label="Qué incluye cada versión" onKeyDown={teclas}>
              <span className="ps-tabs-pastilla" data-p={tab === 'premium' ? '' : undefined} aria-hidden="true" />
              {[['gratis', 'Gratis'], ['premium', '👑 Premium']].map(([t, l]) => (
                <button key={t} ref={el => { tabs.current[t] = el; }} type="button" role="tab" id={'tab-' + t} aria-selected={tab === t}
                  aria-controls={'panel-' + t} tabIndex={tab === t ? 0 : -1} onClick={() => setTab(t)}>{l}</button>
              ))}
            </div>

            <div role="tabpanel" id="panel-gratis" aria-labelledby="tab-gratis" hidden={tab !== 'gratis'} className="ps-panel">
              <p className="ps-panel-lbl">Para siempre, sin tarjeta</p>
              <ul className="ps-gpl">
                {ambos.map(f => <Fila key={f.funcion} f={f} valor />)}
                {cambia.map(f => <Fila key={f.funcion} f={f} valor={f.gratis} />)}
              </ul>
              <button type="button" className="ps-panel-mas" onClick={() => elegir('premium')}>
                Ver lo que suma 👑 Premium →
              </button>
            </div>

            <div role="tabpanel" id="panel-premium" aria-labelledby="tab-premium" hidden={tab !== 'premium'} className="ps-panel">
              <p className="ps-panel-lbl">Lo que suma Premium</p>
              <ul className="ps-gpl">
                {cambia.map(f => <Fila key={f.funcion} f={f} valor={f.premium} premium />)}
                {solo.map(f => <Fila key={f.funcion} f={f} valor premium />)}
              </ul>
              <p className="ps-panel-lbl mt-3">Y todo lo de Gratis</p>
              <div className="ps-chips">
                {ambos.map(f => <span key={f.funcion}>{f.funcion}</span>)}
              </div>
            </div>
          </div>

          <div ref={rv} className="ps-caja ps-premium ps-neon ps-rv" style={{ '--nd': '.3s' }}>
            <div className="text-center">
              {!tienda && (
                <>
                  <p className="ps-eyebrow">👑 Premium, en soles</p>
                  {precios ? (
                    <>
                      <div className="ps-precio-big">S/<Cuenta valor={de(12)} dec={2} /><small>al año</small></div>
                      <p className="ps-precio-p"><b className="text-orange-300">{fmtSoles(de(12) / 12)} al mes</b> · o {fmtSoles(de(1))} al mes · o {fmtSoles(de(3))} cada 3 meses</p>
                    </>
                  ) : <p className="ps-precio-p min-h-[5.5rem] flex items-center justify-center text-zinc-600">Cargando precios…</p>}
                </>
              )}
              <p className="ps-precio-p text-xs text-zinc-400 mt-2.5">Al crear tu cuenta tienes 7 días de Premium incluidos. Cuando terminan, sigues gratis y nadie te cobra solo.</p>
            </div>
            <div className="mt-3.5"><button onClick={() => onEmpezar('gratis_premium')} className="ps-cta">EMPEZAR GRATIS</button></div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* Testimonios reales (src/portadaInfo.js, TESTIMONIOS_ALUMNOS). Vacío =
   no se muestra nada. Sin kilos ni antes y después. */
function TestimoniosAlumnos() {
  if (!TESTIMONIOS_ALUMNOS.length) return null;
  const items = TESTIMONIOS_ALUMNOS.map(t => (
    <figure key={t.nombre} className="ps-tt ps-incl">
      <div className="ps-tt-q" aria-hidden="true">“</div>
      <blockquote>{t.frase}</blockquote>
      <figcaption className="ps-tt-quien">
        {t.foto
          ? <img src={t.foto} alt="" width="40" height="40" loading="lazy" className="w-10 h-10 rounded-full object-cover border-2 border-orange-500 shrink-0" />
          : <span className="w-10 h-10 rounded-full bg-orange-500/15 border-2 border-orange-500/60 shrink-0 flex items-center justify-center jb-display text-lg text-orange-400" aria-hidden="true">{t.nombre.charAt(0)}</span>}
        <b>{t.nombre}</b>
      </figcaption>
    </figure>
  ));
  return (
    <section id="testimonios" className="ps-sec">
      <div className="ps-wrap">
        <Titulo ante="Alumnos reales" partes={[['LO QUE '], ['DICEN', 'ps-o']]}
          sub="Frases reales de los alumnos, con su permiso por escrito. Sin antes y después ni kilos." />
        <Carrusel etiqueta="Lo que dicen los alumnos" items={items} className="mt-7" nombre={i => TESTIMONIOS_ALUMNOS[i].nombre} />
      </div>
    </section>
  );
}

/* Preguntas frecuentes en acordeón (details/summary: se abre con un toque,
   funciona con teclado y lector de pantalla, y el texto queda en la página
   para Google). Los datos para Google (FAQPage) llevan el mismo texto. */
function PreguntasFrecuentes() {
  const preguntas = PREGUNTAS_FRECUENTES.filter(p => !p.soloWeb || !esAppTienda());
  useEffect(() => {
    let s;
    try {
      s = document.createElement('script');
      s.type = 'application/ld+json';
      s.id = 'jb-faq-portada';
      s.textContent = JSON.stringify(faqJsonLd(preguntas));
      document.head.appendChild(s);
    } catch {}
    return () => { try { s?.remove(); } catch {} };
  }, []);

  return (
    <section id="preguntas" className="ps-sec scroll-mt-2">
      <div className="ps-wrap">
        <Titulo ante="Lo que más me preguntan" partes={[['PREGUNTAS '], ['FRECUENTES', 'ps-o']]} />
        <div className="ps-faq">
          {preguntas.map(p => (
            <details key={p.id} ref={rv} className="ps-rv">
              <summary>
                <span className="min-w-0">{p.pregunta}</span>
                <span className="ps-mas" aria-hidden="true">+</span>
              </summary>
              <div className="ps-r">
                <p>{p.respuesta}</p>
                {p.enlace && (
                  <a href={p.enlace.href} onClick={p.enlace.href.startsWith('#') ? irA(p.enlace.href.slice(1)) : undefined}>
                    {p.enlace.texto}
                  </a>
                )}
              </div>
            </details>
          ))}
        </div>

        {/* Páginas por objetivo (jonahbeast.com/bajar-de-peso…): también
            ayudan a que Google las encuentre. */}
        <p className="ps-nota-sec">
          Según tu meta:{' '}
          {PAGINAS_OBJETIVO.map((o, i) => (
            <span key={o.ruta}>
              {i > 0 && ' · '}
              <a href={o.ruta} className="text-orange-400 hover:text-orange-300 whitespace-nowrap">{o.h1[0]}</a>
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}

/* "Disponible en Google Play / App Store": apagado (TIENDAS_PUBLICAS en
   src/portadaInfo.js). Badges oficiales sin modificar, en public/tiendas/. */
function BotonesTiendas() {
  const play = TIENDAS_PUBLICAS.play && LINK_PLAY;
  const ios = TIENDAS_PUBLICAS.ios && LINK_APP_STORE;
  if (esAppTienda() || (!play && !ios)) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
      {play && (
        <a href={LINK_PLAY} target="_blank" rel="noopener noreferrer">
          <img src="/tiendas/google-play-es.png" alt="Disponible en Google Play" height="56" className="h-14 w-auto" loading="lazy" />
        </a>
      )}
      {ios && (
        <a href={LINK_APP_STORE} target="_blank" rel="noopener noreferrer">
          <img src="/tiendas/app-store-es.svg" alt="Descárgalo en el App Store" height="40" className="h-10 w-auto m-2" loading="lazy" />
        </a>
      )}
    </div>
  );
}

/* Cierre: el gorila con su fuego y, separada de él (regla de la marca: lo
   peruano nunca pegado al logo), la frase "Sigue comiendo peruano. Esta
   vez, con resultados." Abajo, la marca y los datos del negocio (los
   mismos de la verificación de Meta). */
function Cierre({ onEmpezar }) {
  const ref = useRef(null);
  useMarcaFija(ref, 'cierre');
  return (
    <section ref={ref} className="ps-sec ps-cierre">
      <Brasas />
      <div className="ps-wrap relative z-[2]">
        <div ref={rv} className="ps-logo ps-rv ps-cierre-logo">
          <div className="ps-resplandor" />
          <img src="/logo-marca.webp" alt="Jonah Beast Fuel" width="170" height="204" loading="lazy" decoding="async" />
        </div>
        <Palabras className="ps-d ps-lema-final" partes={[['SIGUE COMIENDO PERUANO.', '', true], ['ESTA VEZ, CON RESULTADOS.', 'ps-fuego', true]]} />
        <div ref={rv} className="ps-rv ps-cierre-zona">
          <button onClick={() => onEmpezar('preguntas')} className="ps-cta">EMPEZAR AHORA</button>
          <p className="ps-nota"><b>Gratis para siempre</b> · 7 días de Premium incluidos · Sin tarjeta</p>
          <BotonesTiendas />
        </div>
        <footer className="ps-pie">
          <div className="ps-pie-nom">JONAH BEAST <span className="ps-o">FUEL</span></div>
          <div className="ps-pie-lema">COMIDA A COMIDA</div>
          <p className="ps-pie-datos">
            MARTIN JONATHAN HUAMANI CABANA · RUC 10454924024<br />
            Ate, Lima, Perú · WhatsApp +51 963 760 819<br />
            jonahbeast.com · <a href="/privacidad.html" className="underline hover:text-zinc-300">Privacidad</a>
          </p>
        </footer>
      </div>
    </section>
  );
}

const ESTILOS_SECCIONES = `
/* Secciones */
.ps .ps-sec{position:relative;padding:60px 0 52px;overflow:hidden}
.ps .ps-titulo{font-size:clamp(40px,12vw,64px);text-align:center;margin-top:8px}
.ps .ps-intro{font-size:15px;color:var(--cr200);text-align:center;margin:14px auto 0;max-width:380px}
.ps .ps-nota-sec{font-size:12.5px;color:var(--cr400);text-align:center;margin-top:18px}
.ps .ps-desliza{font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--cr400);text-align:right;margin:22px 0 2px}
.ps .ps-desliza span{display:inline-block;color:var(--brillo);animation:ps-desliza 1.6s ease-in-out infinite}
@keyframes ps-desliza{50%{transform:translateX(5px)}}

/* ¿Por qué? (carrusel) */
.ps .ps-pq{position:relative;border-radius:20px;padding:18px 16px 16px;background:linear-gradient(170deg,var(--c800),var(--c900) 55%);border:1px solid var(--c700)}
.ps .ps-pq-num{position:absolute;right:12px;top:6px;font-family:'Anton',sans-serif;font-size:64px;line-height:1;color:transparent;-webkit-text-stroke:1.5px rgba(255,112,32,.38);pointer-events:none}
.ps .ps-pq h3{font-family:'Anton',sans-serif;font-weight:400;font-size:23px;line-height:1.02;text-transform:uppercase;display:flex;gap:10px;align-items:center;padding-right:66px;min-height:48px}
.ps .ps-pq-e{font-size:26px;line-height:1;flex:none}
.ps .ps-pq-aqui{margin-top:12px;border-radius:14px;padding:11px 12px;background:rgba(232,89,12,.12);border:1px solid rgba(232,89,12,.5)}
.ps .ps-pq-lbl{font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--brillo)}
.ps .ps-pq-aqui p+p{font-size:14.5px;color:var(--crema);margin-top:3px;line-height:1.38}
.ps .ps-pq-afuera{padding:9px 12px 0}
.ps .ps-pq-afuera .ps-pq-lbl{color:var(--cr400)}
.ps .ps-pq-afuera p+p{font-size:13px;color:var(--cr400);margin-top:2px;line-height:1.35}

/* Así se ve */
.ps .ps-pills{display:flex;justify-content:center;flex-wrap:wrap;gap:8px;margin-top:18px}
.ps .ps-pills button{min-height:44px;padding:0 16px;border-radius:999px;font-size:13.5px;font-weight:700;color:var(--cr300);background:var(--c900);border:1px solid var(--c700);transition:background .25s,color .25s,border-color .25s}
.ps .ps-pills button[aria-selected=true]{background:var(--aji);border-color:var(--aji);color:var(--carbon)}
.ps .ps-asi-texto{min-height:3em;margin-top:12px}
.ps .ps-escena{position:relative;margin:22px auto 0;width:250px}
.ps .ps-escena .ps-resplandor{inset:-30% -45%}
.ps .ps-cel{position:relative;z-index:1;width:250px;border-radius:40px;padding:9px;background:linear-gradient(145deg,#4A4136,#1B140E 40%,#2A2016);box-shadow:0 30px 60px -20px rgba(0,0,0,.8),0 0 0 1px rgba(255,112,32,.35)}
.ps .ps-cel-pista{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;border-radius:32px;scrollbar-width:none;aspect-ratio:390/844;overscroll-behavior-x:contain}
.ps .ps-cel-pista::-webkit-scrollbar{display:none}
.ps .ps-cel-pista:focus-visible{outline:2px solid var(--brillo);outline-offset:3px}
.ps .ps-cel-pista img{flex:none;width:100%;height:100%;object-fit:cover;scroll-snap-align:center}
.ps .ps-isla{position:absolute;top:18px;left:50%;width:72px;height:20px;margin-left:-36px;border-radius:12px;background:#0b0806;z-index:2}
.ps .ps-leyenda{font-size:11.5px;color:var(--cr400);text-align:center;margin-top:6px}

/* Gratis o Premium (pestañas) */
.ps .ps-gp{margin-top:26px;display:grid;gap:14px}
.ps .ps-caja{border-radius:20px;padding:16px;background:var(--c900);border:1px solid var(--c700)}
.ps .ps-premium{background:linear-gradient(165deg,rgba(74,28,3,.6),var(--c900) 50%)}
.ps .ps-tabs{position:relative;display:grid;grid-template-columns:1fr 1fr;padding:4px;border-radius:999px;background:var(--c800);border:1px solid var(--c700)}
.ps .ps-tabs button{position:relative;z-index:1;min-height:46px;border-radius:999px;font-family:'Anton',sans-serif;font-size:19px;letter-spacing:.03em;text-transform:uppercase;color:var(--cr300);transition:color .25s}
.ps .ps-tabs button[aria-selected=true]{color:var(--carbon)}
.ps .ps-tabs-pastilla{position:absolute;top:4px;bottom:4px;left:4px;width:calc(50% - 4px);border-radius:999px;background:linear-gradient(180deg,var(--brillo),var(--aji));box-shadow:0 6px 20px -6px rgba(232,89,12,.8);transition:transform .35s cubic-bezier(.2,.9,.3,1.1)}
.ps .ps-tabs-pastilla[data-p]{transform:translateX(100%)}
.ps .ps-panel{padding-top:14px;animation:ps-abre .35s ease}
.ps .ps-panel-lbl{font-size:10.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--brillo)}
.ps .ps-gpl{list-style:none;margin:6px 0 0;padding:0}
.ps .ps-gpf{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-top:1px solid var(--c800);font-size:13.5px;line-height:1.3;color:var(--cr200)}
.ps .ps-gpf:first-child{border-top:0}
.ps .ps-gpf b{flex:none;max-width:46%;text-align:right;font-size:12.5px;font-weight:700;color:var(--crema)}
.ps .ps-gpf-p b{color:var(--aji300)}
.ps .ps-panel-mas{width:100%;margin-top:10px;min-height:46px;padding:8px 12px;border-radius:14px;font-size:13.5px;font-weight:700;color:var(--aji300);background:rgba(232,89,12,.12);border:1px dashed rgba(232,89,12,.6);text-align:center}
.ps .ps-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.ps .ps-chips>span{font-size:12px;padding:5px 10px;border-radius:999px;background:var(--c800);border:1px solid var(--c700);color:var(--cr200);line-height:1.3}
.ps .ps-chips>span::before{content:"✓ ";color:var(--brillo);font-weight:700}
.ps .ps-precio-big{font-family:'Anton',sans-serif;font-size:54px;line-height:1;margin-top:8px}
.ps .ps-precio-big small{font-family:'Work Sans',sans-serif;font-weight:700;font-size:15px;color:var(--cr300);margin-left:4px}
.ps .ps-precio-p{font-size:13px;color:var(--cr300);margin-top:4px}

/* Testimonios */
.ps .ps-tt{border-radius:20px;padding:20px 18px 16px;background:var(--c900);border:1px solid var(--c700);margin:0}
.ps .ps-tt-q{font-family:'Anton',sans-serif;font-size:56px;line-height:.6;color:var(--aji);height:26px}
.ps .ps-tt blockquote{font-size:15px;color:var(--crema);margin-top:4px}
.ps .ps-tt-quien{display:flex;align-items:center;gap:10px;margin-top:16px;font-size:13.5px;color:var(--brillo)}

/* Preguntas */
.ps .ps-faq{display:grid;gap:10px;margin-top:26px}
.ps .ps-faq details{border-radius:16px;background:var(--c900);border:1px solid var(--c700);transition:border-color .3s,opacity .6s ease,transform .7s cubic-bezier(.2,.9,.25,1.15)}
.ps .ps-faq details[open]{border-color:var(--aji700)}
.ps .ps-faq summary{list-style:none;display:flex;align-items:center;gap:12px;padding:14px 16px;min-height:54px;font-weight:700;font-size:15px;line-height:1.3;cursor:pointer;color:var(--crema)}
.ps .ps-faq summary::-webkit-details-marker{display:none}
.ps .ps-faq summary:focus-visible{outline:2px solid var(--brillo);outline-offset:-2px;border-radius:16px}
.ps .ps-mas{margin-left:auto;flex:none;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:rgba(232,89,12,.14);color:var(--brillo);font-size:20px;line-height:1;transition:transform .35s cubic-bezier(.2,1.5,.4,1)}
.ps .ps-faq details[open] .ps-mas{transform:rotate(135deg)}
.ps .ps-r{padding:0 16px 16px;font-size:14px;color:var(--cr300);line-height:1.5;animation:ps-abre .35s ease}
.ps .ps-r a{display:inline-block;margin-top:8px;padding:4px 0;font-weight:700;color:var(--brillo)}
@keyframes ps-abre{from{opacity:0;transform:translateY(-6px)}}

/* Cierre */
.ps .ps-cierre{padding:64px 0 36px;isolation:isolate;background:radial-gradient(90% 60% at 50% 40%,rgba(143,55,8,.5),rgba(22,17,13,0) 70%)}
.ps .ps-cierre-logo{width:150px;margin:0 auto}
.ps .ps-lema-final{font-size:clamp(42px,12.5vw,66px);text-align:center;margin-top:52px;line-height:1.02}
.ps .ps-cierre-zona{margin-top:26px}
.ps .ps-pie{margin-top:44px;padding-top:20px;border-top:1px solid var(--c800);text-align:center}
.ps .ps-pie-nom{font-family:'Anton',sans-serif;font-size:18px;letter-spacing:.04em}
.ps .ps-pie-lema{font-size:10px;font-weight:700;letter-spacing:.3em;color:var(--brillo);margin-top:4px}
.ps .ps-pie-datos{font-size:11px;line-height:1.5;color:var(--cr400);margin-top:12px}

@media (min-width:900px){
  .ps .ps-titulo{font-size:80px}
  .ps .ps-intro{max-width:620px;font-size:17px}
  .ps .ps-desliza{display:none}
  .ps .ps-asi{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
  .ps .ps-escena,.ps .ps-cel{width:290px}
  .ps .ps-gp{grid-template-columns:1.25fr 1fr;align-items:start;max-width:960px;margin-left:auto;margin-right:auto}
  .ps .ps-faq{max-width:760px;margin-left:auto;margin-right:auto}
  .ps .ps-cierre-zona{max-width:440px;margin-left:auto;margin-right:auto}
}
@media (prefers-reduced-motion:reduce){.ps .ps-desliza span{animation:none}}
`;

export default function SeccionesPortada({ onEmpezar }) {
  return (
    <>
      <style>{ESTILOS_SECCIONES}</style>
      <PorQueJonahBeast onEmpezar={onEmpezar} />
      <AsiSeVeLaApp />
      <GratisPremium onEmpezar={onEmpezar} />
      <TestimoniosAlumnos />
      <PreguntasFrecuentes />
      <Cierre onEmpezar={onEmpezar} />
    </>
  );
}
