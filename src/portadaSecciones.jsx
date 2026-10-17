/* Secciones nuevas de la portada, debajo de "¿Por qué Jonah Beast Fuel?"
   (17 oct, aprobado por Jonah: ideas de fitia.app con nuestra marca).
   Se descargan aparte (React.lazy en src/App.jsx) para que la primera
   pantalla cargue igual de rápido que antes. Los textos viven en
   src/portadaInfo.js (los mismos de las páginas por objetivo).

   Orden: Así se ve la app → Gratis para siempre vs. Premium → Testimonios
   (oculta mientras no haya frases reales) → Preguntas frecuentes →
   "Disponible en Google Play / App Store" (apagado) → Empezar. */
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { esAppTienda, PLANES } from './App.jsx';
import {
  PREGUNTAS_FRECUENTES, GRATIS_PREMIUM, TESTIMONIOS_ALUMNOS, TIENDAS_PUBLICAS,
  LINK_PLAY, LINK_APP_STORE, PAGINAS_OBJETIVO, faqJsonLd,
} from './portadaInfo.js';

const fmtSoles = n => 'S/' + Number(n).toFixed(2);

function Titulo({ ante, children, sub }) {
  return (
    <>
      <p className="jb-body text-[11px] font-semibold tracking-[0.25em] uppercase text-orange-400 text-center">{ante}</p>
      <h2 className="jb-display text-4xl lg:text-5xl text-zinc-50 text-center leading-none mt-2">{children}</h2>
      {sub && <p className="jb-body text-sm text-zinc-300 text-center mt-3 max-w-md mx-auto">{sub}</p>}
    </>
  );
}

function irA(id) {
  return e => {
    e.preventDefault();
    try { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {}
  };
}

/* "Así se ve la app": captura real del Inicio (public/app-inicio.webp),
   tomada con datos de ejemplo de un alumno ficticio, en un marco de celular. */
function AsiSeVeLaApp() {
  return (
    <section id="asi-se-ve" className="relative px-4 py-12 lg:py-16 border-t border-zinc-800/80">
      <div className="max-w-md lg:max-w-4xl mx-auto lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
        <div>
          <Titulo ante="Por dentro" sub="Tu meta del día en el anillo, tus comidas y cuánto te queda. Sin tablas raras: lo ves de un vistazo.">
            ASÍ SE VE <span className="text-orange-400">LA APP</span>
          </Titulo>
          <ul className="jb-body text-sm text-zinc-300 mt-5 space-y-2 max-w-sm mx-auto hidden lg:block">
            <li>🔥 Calorías que te quedan hoy, en grande.</li>
            <li>🍗 Proteína, carbos y grasa del día.</li>
            <li>🍽️ Cada comida con lo que anotaste.</li>
          </ul>
        </div>
        <figure className="mt-7 lg:mt-0 flex flex-col items-center">
          <div className="relative w-[232px] sm:w-[260px] rounded-[2.6rem] bg-zinc-900 p-[9px] border border-zinc-700"
            style={{ boxShadow: '0 30px 70px -25px rgba(232,89,12,.55), inset 0 0 0 2px #0b0806' }}>
            <div className="absolute top-[14px] left-1/2 -translate-x-1/2 w-16 h-[18px] bg-zinc-950 rounded-full z-10" aria-hidden="true" />
            <img src="/app-inicio.webp" width="390" height="844" loading="lazy" decoding="async"
              alt="Pantalla de Inicio de la app Jonah Beast Fuel: anillo con las calorías que quedan del día, proteína, carbos y grasa, y las comidas del día"
              className="block w-full h-auto rounded-[2rem]" />
          </div>
          <figcaption className="jb-body text-[11px] text-zinc-500 text-center mt-3">Captura real de la app, con datos de ejemplo.</figcaption>
        </figure>
      </div>
    </section>
  );
}

function Celda({ v, premium }) {
  if (v === true) return <span className={`text-base font-bold ${premium ? 'text-orange-400' : 'text-zinc-200'}`} aria-label="Sí">✓</span>;
  if (v === false) return <span className="text-zinc-600" aria-label="No">—</span>;
  return <span className={`block jb-body text-[11px] leading-tight ${premium ? 'text-orange-300' : 'text-zinc-300'}`}>{v}</span>;
}

/* "Gratis para siempre vs. Premium". Los precios salen de config (los
   mismos de la pantalla de planes); en las apps de tienda no se muestran
   (ahí cobra Google o Apple, con otros precios). */
function GratisPremium({ onEmpezar }) {
  const tienda = esAppTienda();
  const [precios, setPrecios] = useState(null);
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

  return (
    <section id="gratis-premium" className="relative px-4 py-12 lg:py-16 border-t border-zinc-800/80 scroll-mt-4">
      <div className="max-w-md lg:max-w-2xl mx-auto">
        <Titulo ante="Sin letra chica" sub="La versión gratis es para siempre y no pide tarjeta. Premium suma lo que más te acompaña.">
          GRATIS PARA SIEMPRE <span className="text-orange-400">VS. PREMIUM</span>
        </Titulo>

        <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden" role="table" aria-label="Qué incluye la versión gratis y qué incluye Premium">
          <div role="row" className="grid grid-cols-[1fr_76px_92px] sm:grid-cols-[1fr_110px_130px] items-end gap-2 px-3 sm:px-4 py-3 border-b border-zinc-800 bg-zinc-950/60">
            <span role="columnheader" className="jb-body text-[10px] font-semibold tracking-[0.18em] uppercase text-zinc-500">Función</span>
            <span role="columnheader" className="jb-display text-base text-zinc-100 text-center">GRATIS</span>
            <span role="columnheader" className="jb-display text-base text-orange-400 text-center">👑 PREMIUM</span>
          </div>
          {GRATIS_PREMIUM.map(f => (
            <div key={f.funcion} role="row" className="grid grid-cols-[1fr_76px_92px] sm:grid-cols-[1fr_110px_130px] items-center gap-2 px-3 sm:px-4 py-2.5 border-b border-zinc-800/70 last:border-b-0">
              <span role="cell" className="jb-body text-[13px] text-zinc-100 leading-snug min-w-0">{f.funcion}</span>
              <span role="cell" className="text-center"><Celda v={f.gratis} /></span>
              <span role="cell" className="text-center bg-orange-500/5 rounded-lg py-1"><Celda v={f.premium} premium /></span>
            </div>
          ))}
        </div>

        {!tienda && (
          <p className="jb-body text-sm text-zinc-300 text-center mt-4 min-h-[2.5rem]">
            {precios ? (
              <>👑 Premium: <b className="text-zinc-50">{fmtSoles(de(1))}</b> al mes, {fmtSoles(de(3))} cada 3 meses o <b className="text-zinc-50">{fmtSoles(de(12))}</b> al año ({fmtSoles(de(12) / 12)} al mes). Pagas en soles.</>
            ) : <span className="text-zinc-600">Cargando precios…</span>}
          </p>
        )}
        <p className="jb-body text-xs text-zinc-500 text-center mt-2 max-w-sm mx-auto">
          Al crear tu cuenta tienes 7 días de Premium incluidos. Cuando terminan, sigues gratis y nadie te cobra solo.
        </p>

        <div className="max-w-md mx-auto mt-6">
          <button onClick={() => onEmpezar('gratis_premium')} className="w-full bg-orange-500 hover:bg-orange-400 rounded-full py-4 jb-display text-xl text-zinc-950 tracking-wide"
            style={{ boxShadow: '0 14px 44px -10px rgba(232,89,12,.8)' }}>
            EMPEZAR GRATIS
          </button>
        </div>
      </div>
    </section>
  );
}

/* Testimonios reales (src/portadaInfo.js, TESTIMONIOS_ALUMNOS). Vacío =
   no se muestra nada. Sin kilos ni antes y después. */
function TestimoniosAlumnos() {
  if (!TESTIMONIOS_ALUMNOS.length) return null;
  return (
    <section id="testimonios" className="relative px-4 py-12 lg:py-16 border-t border-zinc-800/80">
      <div className="max-w-md lg:max-w-4xl mx-auto">
        <Titulo ante="En sus palabras">LO QUE DICEN <span className="text-orange-400">LOS ALUMNOS</span></Titulo>
        <div className="grid gap-3 lg:grid-cols-2 mt-6">
          {TESTIMONIOS_ALUMNOS.map(t => (
            <figure key={t.nombre} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex gap-3 items-start">
              {t.foto
                ? <img src={t.foto} alt="" width="48" height="48" loading="lazy" className="w-12 h-12 rounded-full object-cover border-2 border-orange-500 shrink-0" />
                : <span className="w-12 h-12 rounded-full bg-orange-500/15 border-2 border-orange-500/60 shrink-0 flex items-center justify-center jb-display text-xl text-orange-400" aria-hidden="true">{t.nombre.charAt(0)}</span>}
              <div className="min-w-0">
                <blockquote className="jb-body text-sm text-zinc-100 leading-snug">“{t.frase}”</blockquote>
                <figcaption className="jb-body text-xs text-orange-400 font-semibold mt-1.5">{t.nombre}</figcaption>
              </div>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* Preguntas frecuentes en acordeón (details/summary: se abre con un toque,
   funciona con lector de pantalla y el texto queda en la página para
   Google). Los datos para Google (FAQPage) llevan el mismo texto. */
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
    <section id="preguntas" className="relative px-4 py-12 lg:py-16 border-t border-zinc-800/80">
      <div className="max-w-md lg:max-w-2xl mx-auto">
        <Titulo ante="Lo que más me preguntan">PREGUNTAS <span className="text-orange-400">FRECUENTES</span></Titulo>
        <div className="mt-6 flex flex-col gap-2">
          {preguntas.map(p => (
            <details key={p.id} className="group bg-zinc-900 border border-zinc-800 open:border-orange-500/50 rounded-2xl">
              <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer flex items-center justify-between gap-3 px-4 py-3.5 min-h-[52px]">
                <span className="jb-body text-[15px] font-semibold text-zinc-50 leading-snug">{p.pregunta}</span>
                <span className="text-orange-400 text-xl leading-none shrink-0 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <div className="px-4 pb-4 -mt-1">
                <p className="jb-body text-sm text-zinc-300 leading-relaxed">{p.respuesta}</p>
                {p.enlace && (
                  <a href={p.enlace.href} onClick={p.enlace.href.startsWith('#') ? irA(p.enlace.href.slice(1)) : undefined}
                    className="inline-block jb-body text-sm font-semibold text-orange-400 hover:text-orange-300 mt-2 py-1">
                    {p.enlace.texto}
                  </a>
                )}
              </div>
            </details>
          ))}
        </div>

        {/* Páginas por objetivo (jonahbeast.com/bajar-de-peso…): también
            ayudan a que Google las encuentre. */}
        <p className="jb-body text-xs text-zinc-500 text-center mt-5">
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

export default function SeccionesPortada({ onEmpezar }) {
  return (
    <>
      <AsiSeVeLaApp />
      <GratisPremium onEmpezar={onEmpezar} />
      <TestimoniosAlumnos />
      <PreguntasFrecuentes />
      <section className="relative px-4 pt-2 pb-14 lg:pb-20">
        <div className="max-w-md mx-auto">
          <button onClick={() => onEmpezar('preguntas')} className="w-full bg-orange-500 hover:bg-orange-400 rounded-full py-4 jb-display text-xl text-zinc-950 tracking-wide"
            style={{ boxShadow: '0 14px 44px -10px rgba(232,89,12,.8)' }}>
            EMPEZAR AHORA
          </button>
          <p className="jb-body text-zinc-400 text-xs text-center mt-2">
            <span className="text-orange-400 font-semibold">Gratis para siempre</span> · 7 días de Premium incluidos · Sin tarjeta
          </p>
          <BotonesTiendas />
        </div>
      </section>
    </>
  );
}
