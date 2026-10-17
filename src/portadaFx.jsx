/* Efectos de la portada SÚPER (17 oct, diseño "Fuego" aprobado por Jonah).
   Todo con CSS (transform y opacity) y UN SOLO IntersectionObserver para
   toda la página: aparecer al bajar, encender el neón, contar números,
   pausar las brasas y la franja cuando no se ven, y mostrar u ocultar el
   botón fijo de abajo. Quien pidió "menos movimiento" en su celular ve todo
   quieto y visible (prefers-reduced-motion).
   Sin librerías: lo usa src/App.jsx (arriba) y src/portadaSecciones.jsx. */
import { useEffect, useMemo, useRef, useState } from 'react';

export function quieto() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return true; }
}

/* ---------- El observador único ---------- */
let io = null;
const avisos = new WeakMap();
function observador() {
  if (io || typeof IntersectionObserver === 'undefined') return io;
  io = new IntersectionObserver(es => es.forEach(e => avisos.get(e.target)?.(e)), { threshold: [0, 0.15] });
  return io;
}
// fn(entry) cada vez que el elemento entra o sale. Devuelve con qué dejar de mirar.
export function observar(el, fn) {
  const o = observador();
  if (!el || !o) { fn?.({ isIntersecting: true, intersectionRatio: 1, boundingClientRect: { top: 0 }, target: el }); return () => {}; }
  avisos.set(el, fn);
  o.observe(el);
  return () => { try { o.unobserve(el); } catch {} avisos.delete(el); };
}

/* Aparece al bajar: pone data-on una sola vez (el CSS hace el resto).
   Se usa como ref={rv}. Es una función fija, así React no la vuelve a
   llamar en cada render. */
export function rv(el) {
  if (!el || el.dataset.on !== undefined || el._rv) return;
  el._rv = true;
  let dejar = () => {};
  dejar = observar(el, e => {
    if (!e.isIntersecting) return;
    if (e.intersectionRatio < 0.15 && e.boundingClientRect.top > window.innerHeight * 0.8) return;
    el.dataset.on = '';
    el.querySelectorAll?.('[data-contar]').forEach(contar);
    if (el.matches?.('[data-contar]')) contar(el);
    dejar();
  });
}

/* ---------- Números que cuentan ---------- */
// El número final ya está en aria-label; el texto sube de 0 al final.
function contar(el) {
  if (el._hecho) return;
  el._hecho = true;
  const fin = parseFloat(el.dataset.contar), dec = Number(el.dataset.dec || 0);
  if (!(fin >= 0)) return;
  if (quieto()) { el.textContent = fin.toFixed(dec); return; }
  let t0 = null;
  const dur = 1300;
  const paso = t => {
    if (t0 === null) t0 = t;
    const p = Math.min(1, (t - t0) / dur), f = 1 - Math.pow(2, -10 * p);
    el.textContent = (p === 1 ? fin : fin * f).toFixed(dec);
    if (p < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}
// <Cuenta valor={149.9} dec={2} />: empieza en 0 y cuenta cuando se ve
// (o al montarse, con auto).
export function Cuenta({ valor, dec = 0, auto = false, retraso = 0, className = '' }) {
  const ref = useRef(null);
  const final = Number(valor).toFixed(dec);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el._hecho = false;
    if (quieto()) { el.textContent = final; return; }
    el.textContent = (0).toFixed(dec);
    if (auto) { const t = setTimeout(() => contar(el), retraso); return () => clearTimeout(t); }
    let dejar = () => {};
    dejar = observar(el, e => { if (e.isIntersecting) { contar(el); dejar(); } });
    return () => dejar();
  }, [final]);
  return <span ref={ref} data-contar={valor} data-dec={dec} aria-label={final} className={'tabular-nums ' + className}>{final}</span>;
}

/* ---------- Títulos que entran palabra por palabra ----------
   partes: [['¿POR QUÉ '], ['JONAH BEAST FUEL', 'ps-o'], ['?']] */
export function Palabras({ partes, as: Tag = 'h2', className = '' }) {
  let i = 0;
  return (
    <Tag ref={rv} className={'ps-palabras ' + className}>
      {partes.map(([texto, clase, bloque], k) => {
        const trozos = texto.split(/(\s+)/).filter(Boolean).map((t, j) => (/^\s+$/.test(t)
          ? ' '
          : <span key={j} className="ps-w" style={{ '--i': i++ }}>{t}</span>));
        return <span key={k} className={clase || undefined} style={bloque ? { display: 'block' } : undefined}>{trozos}</span>;
      })}
    </Tag>
  );
}

/* ---------- Brasas (pausadas cuando no se ven) ---------- */
export function Brasas() {
  const ref = useRef(null);
  const brasas = useMemo(() => {
    if (quieto()) return [];
    let pocas = false;
    try { pocas = (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4); } catch {}
    return Array.from({ length: pocas ? 9 : 16 }, () => ({
      left: Math.round(Math.random() * 100) + '%',
      '--s': (5 + Math.random() * 7).toFixed(1) + 'px',
      '--t': (5 + Math.random() * 5).toFixed(1) + 's',
      '--d': (-Math.random() * 9).toFixed(1) + 's',
      '--x': Math.round(Math.random() * 80 - 40) + 'px',
    }));
  }, []);
  usePausaFueraDePantalla(ref);
  if (!brasas.length) return null;
  return <div ref={ref} className="ps-brasas" aria-hidden="true">{brasas.map((s, i) => <i key={i} style={s} />)}</div>;
}

// Pone data-pausa mientras el elemento no se ve (brasas, franja, resplandor).
export function usePausaFueraDePantalla(ref) {
  useEffect(() => observar(ref.current, e => {
    if (!ref.current) return;
    if (e.isIntersecting) delete ref.current.dataset.pausa; else ref.current.dataset.pausa = '';
  }), []);
}

/* ---------- El buscador "escribe" platos solo ---------- */
const PLATOS_TIPEA = ['lomo saltado', 'ceviche', 'pollo a la brasa', 'ají de gallina', 'arroz con pollo', 'chaufa'];
export function TipeaPlatos() {
  const ref = useRef(null);
  useEffect(() => {
    if (quieto()) return;
    let pi = 0, ci = PLATOS_TIPEA[0].length, borrando = true;
    const t = setInterval(() => {
      if (document.hidden || !ref.current) return;
      if (borrando) { ci--; if (ci <= 0) { borrando = false; pi = (pi + 1) % PLATOS_TIPEA.length; } }
      else { ci++; if (ci >= PLATOS_TIPEA[pi].length + 14) { borrando = true; ci = PLATOS_TIPEA[pi].length; } }
      ref.current.textContent = PLATOS_TIPEA[pi].slice(0, Math.max(0, Math.min(ci, PLATOS_TIPEA[pi].length)));
    }, 85);
    return () => clearInterval(t);
  }, []);
  return <><span ref={ref}>{PLATOS_TIPEA[0]}</span><span className="ps-cursor" aria-hidden="true" /></>;
}

/* ---------- Tarjetas que se inclinan (mouse, o el dedo al arrastrar) ----------
   Un solo escucha para toda la página. */
export function useInclinar() {
  useEffect(() => {
    if (quieto()) return;
    const mover = ev => {
      if (ev.pointerType === 'touch' && !ev.isPrimary) return;
      const el = ev.target.closest?.('.ps-incl');
      if (!el) return;
      if (ev.pointerType !== 'mouse' && ev.buttons === 0 && ev.pressure === 0) return;
      const r = el.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width - 0.5, y = (ev.clientY - r.top) / r.height - 0.5;
      if (el._raf) return;
      el._raf = requestAnimationFrame(() => {
        el._raf = 0;
        el.classList.add('ps-mueve');
        el.style.setProperty('--ry', (x * 10).toFixed(2) + 'deg');
        el.style.setProperty('--rx', (-y * 8).toFixed(2) + 'deg');
      });
    };
    const soltar = ev => {
      const el = ev.target.closest?.('.ps-incl');
      if (!el) return;
      el.classList.remove('ps-mueve');
      el.style.setProperty('--ry', '0deg');
      el.style.setProperty('--rx', '0deg');
    };
    document.addEventListener('pointermove', mover, { passive: true });
    ['pointerout', 'pointerup', 'pointercancel'].forEach(n => document.addEventListener(n, soltar, { passive: true }));
    return () => {
      document.removeEventListener('pointermove', mover);
      ['pointerout', 'pointerup', 'pointercancel'].forEach(n => document.removeEventListener(n, soltar));
    };
  }, []);
}

/* ---------- Carrusel que se desliza con el dedo ----------
   scroll-snap nativo (el dedo, la rueda y el teclado funcionan solos),
   flechas y puntitos para saltar a cada tarjeta. auto: cambia solo cada N
   ms mientras se ve, hasta que la persona lo toca (nunca con "menos
   movimiento"). */
export function Carrusel({ etiqueta, items, claseItem = '', className = '', auto = 0, nombre = i => `${i + 1} de ${items.length}`, flechas = true, leyenda = null }) {
  const pista = useRef(null);
  const [activo, setActivo] = useState(0);
  const tocado = useRef(false);
  const activoRef = useRef(0);
  activoRef.current = activo;
  const n = items.length;
  const hijos = () => Array.from(pista.current?.children || []);
  function ir(i, suave = true) {
    const el = pista.current, h = hijos()[(i + n) % n];
    if (!el || !h) return;
    el.scrollTo({ left: h.offsetLeft - el.offsetLeft - (el.clientWidth - h.offsetWidth) / 2, behavior: suave && !quieto() ? 'smooth' : 'auto' });
  }
  useEffect(() => {
    const el = pista.current;
    if (!el) return;
    let tick = false;
    const alMover = () => {
      if (tick) return;
      tick = true;
      requestAnimationFrame(() => {
        tick = false;
        const centro = el.scrollLeft + el.clientWidth / 2;
        let mejor = 0, dist = Infinity;
        hijos().forEach((h, i) => { const d = Math.abs(h.offsetLeft - el.offsetLeft + h.offsetWidth / 2 - centro); if (d < dist) { dist = d; mejor = i; } });
        setActivo(mejor);
      });
    };
    const toque = () => { tocado.current = true; };
    el.addEventListener('scroll', alMover, { passive: true });
    el.addEventListener('pointerdown', toque, { passive: true });
    el.addEventListener('wheel', toque, { passive: true });
    return () => { el.removeEventListener('scroll', alMover); el.removeEventListener('pointerdown', toque); el.removeEventListener('wheel', toque); };
  }, [n]);
  // Pasa solo, mientras se ve y nadie lo tocó.
  const visible = useRef(false);
  useEffect(() => {
    if (!auto || quieto() || n < 2) return;
    const dejar = observar(pista.current, e => { visible.current = e.isIntersecting; });
    const t = setInterval(() => { if (visible.current && !tocado.current && !document.hidden) ir(activoRef.current + 1); }, auto);
    return () => { dejar(); clearInterval(t); };
  }, [auto, n]);
  return (
    <div className={'ps-carr ' + className} role="region" aria-roledescription="carrusel" aria-label={etiqueta}>
      <div ref={pista} className="ps-carr-pista" tabIndex={0}>
        {items.map((it, i) => (
          <div key={i} className={'ps-carr-item ' + claseItem} role="group" aria-roledescription="tarjeta" aria-label={nombre(i)}>{it}</div>
        ))}
      </div>
      {n > 1 && (
        <div className={'ps-carr-ctrl' + (leyenda ? ' ps-carr-ctrl-ley' : '')}>
          {leyenda}
          {flechas && <button type="button" className="ps-carr-flecha" onClick={() => { tocado.current = true; ir(activo - 1); }} aria-label="Anterior">‹</button>}
          <div className="ps-carr-puntos">
            {items.map((_, i) => (
              <button key={i} type="button" onClick={() => { tocado.current = true; ir(i); }} aria-label={'Ver ' + nombre(i)} aria-current={i === activo ? 'true' : undefined}>
                <span data-on={i === activo ? '' : undefined} />
              </button>
            ))}
          </div>
          {flechas && <button type="button" className="ps-carr-flecha" onClick={() => { tocado.current = true; ir(activo + 1); }} aria-label="Siguiente">›</button>}
        </div>
      )}
    </div>
  );
}

/* ---------- Botón fijo abajo ----------
   Sale cuando la primera pantalla ya no se ve y se esconde al llegar al
   cierre (que ya tiene su botón). Solo en el celular (el CSS lo oculta en
   la computadora). */
let fijaEstado = { hero: true, cierre: false };
const fijaOyentes = new Set();
function avisarFija(cambio) {
  fijaEstado = { ...fijaEstado, ...cambio };
  fijaOyentes.forEach(f => f(fijaEstado));
}
export function useMarcaFija(ref, cual) {
  useEffect(() => {
    const dejar = observar(ref.current, e => avisarFija({ [cual]: cual === 'hero' ? e.isIntersecting : (e.isIntersecting && e.intersectionRatio >= 0.15) }));
    return () => { dejar(); if (cual === 'cierre') avisarFija({ cierre: false }); };
  }, []);
}
export function useFijaVisible() {
  const [v, setV] = useState(false);
  useEffect(() => {
    const f = s => setV(!s.hero && !s.cierre);
    fijaOyentes.add(f);
    f(fijaEstado);
    return () => { fijaOyentes.delete(f); fijaEstado = { hero: true, cierre: false }; };
  }, []);
  return v;
}

/* ---------- Estilos compartidos (arriba y secciones) ----------
   Colores de tailwind.config.js: zinc = carbón → crema, orange = ají. */
export const ESTILOS_PORTADA_SUPER = `
.ps{--carbon:#16110D;--c900:#1B140E;--c800:#2A2016;--c700:#4A4136;--crema:#F7F2E7;--cr200:#E3D6BC;--cr300:#C9B99C;--cr400:#A99E8C;--cr500:#8A7F6E;
  --aji:#E8590C;--brillo:#FF7020;--aji300:#F5A468;--aji700:#8F3708;--aji900:#4A1C03;background:var(--carbon);color:var(--crema)}
.ps .ps-d{font-family:'Anton',Impact,'Arial Narrow',sans-serif;font-weight:400;letter-spacing:.01em;text-transform:uppercase;line-height:.92}
.ps .ps-o{color:var(--brillo)}
.ps .ps-eyebrow{font-size:11px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:var(--brillo)}
.ps .ps-fuego{padding-top:.16em;margin-top:-.16em;background:linear-gradient(180deg,var(--aji300) 0%,var(--brillo) 45%,var(--aji) 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.ps .ps-wrap{max-width:440px;margin:0 auto;padding:0 16px}

/* Botón principal con brillo que pasa */
.ps .ps-cta{position:relative;display:flex;align-items:center;justify-content:center;width:100%;height:60px;border-radius:999px;
  background:linear-gradient(180deg,var(--brillo),var(--aji));color:var(--carbon);font-family:'Anton',sans-serif;font-size:24px;letter-spacing:.04em;
  box-shadow:0 14px 40px -10px rgba(232,89,12,.85),inset 0 1px 0 rgba(247,242,231,.35);overflow:hidden;isolation:isolate;transition:transform .15s}
.ps .ps-cta:active{transform:scale(.97)}
.ps .ps-cta::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,rgba(247,242,231,.55) 50%,transparent 70%);transform:translateX(-120%);animation:ps-barrido 3.2s ease-in-out 1.6s infinite;z-index:-1}
@keyframes ps-barrido{0%,55%{transform:translateX(-120%)}85%,100%{transform:translateX(120%)}}
.ps .ps-nota{font-size:12px;color:var(--cr300);text-align:center;margin-top:8px}
.ps .ps-nota b{color:var(--brillo);font-weight:700}

/* Brasas */
.ps .ps-brasas{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0}
.ps .ps-brasas i{position:absolute;bottom:-12px;width:var(--s);height:var(--s);border-radius:50%;
  background:radial-gradient(circle,#FBDCC4 0%,var(--aji300) 22%,var(--brillo) 48%,rgba(232,89,12,0) 72%);
  opacity:0;animation:ps-brasa var(--t) linear var(--d) infinite;will-change:transform,opacity}
@keyframes ps-brasa{0%{transform:translate3d(0,0,0) scale(1);opacity:0}10%{opacity:1}70%{opacity:.8}100%{transform:translate3d(var(--x),-92vh,0) scale(.3);opacity:0}}
.ps [data-pausa] i,.ps [data-pausa] .ps-pista,.ps [data-pausa] .ps-resplandor,.ps [data-pausa].ps-pista{animation-play-state:paused}

/* Fuego detrás del logo: el gorila va siempre ENCIMA y entero */
.ps .ps-logo{position:relative;display:grid;place-items:center}
.ps .ps-resplandor{position:absolute;inset:-38%;border-radius:50%;z-index:0;
  background:radial-gradient(circle,rgba(255,112,32,.62) 0%,rgba(232,89,12,.30) 32%,rgba(194,74,10,.10) 52%,rgba(22,17,13,0) 70%);
  animation:ps-respira 2.6s ease-in-out infinite;will-change:transform,opacity;pointer-events:none}
@keyframes ps-respira{0%,100%{transform:scale(.92);opacity:.7}50%{transform:scale(1.06);opacity:1}}
.ps .ps-logo img{position:relative;z-index:1;width:100%;height:auto}

/* Aparecer al bajar, palabra por palabra, neón */
.ps .ps-rv{opacity:0;transform:translateY(42px) scale(.96);transition:opacity .6s ease,transform .7s cubic-bezier(.2,.9,.25,1.15)}
.ps .ps-rv[data-on]{opacity:1;transform:none}
.ps .ps-palabras .ps-w{display:inline-block;opacity:0;transform:translateY(.55em) rotate(4deg);transition:opacity .35s ease,transform .5s cubic-bezier(.2,1.5,.4,1);transition-delay:calc(var(--i) * 90ms)}
.ps .ps-palabras[data-on] .ps-w{opacity:1;transform:none}
.ps .ps-neon{position:relative}
.ps .ps-neon::after{content:"";position:absolute;inset:-1px;border-radius:inherit;pointer-events:none;border:1.5px solid var(--brillo);
  box-shadow:0 0 14px rgba(255,112,32,.55),0 0 34px -6px rgba(232,89,12,.6),inset 0 0 12px rgba(255,112,32,.22);opacity:0}
.ps .ps-neon[data-on]::after{animation:ps-enciende .9s steps(1,end) forwards;animation-delay:var(--nd,.15s)}
@keyframes ps-enciende{0%{opacity:0}12%{opacity:.9}20%{opacity:.1}32%{opacity:1}40%{opacity:.3}52%,100%{opacity:1}}
.ps .ps-incl{transform:perspective(800px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));transition:transform .35s cubic-bezier(.2,.9,.3,1)}
.ps .ps-incl.ps-mueve{transition:transform .06s linear}
.ps .ps-rv.ps-incl{transition:opacity .6s ease,transform .7s cubic-bezier(.2,.9,.25,1.15)}
.ps .ps-rv.ps-incl:not([data-on]){transform:translateY(42px) scale(.96)}
.ps .ps-rv.ps-incl.ps-mueve{transition:transform .06s linear}

/* Carrusel */
.ps .ps-carr-pista{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-padding:0 16px;margin:0 -16px;padding:6px 16px 10px;scrollbar-width:none;overscroll-behavior-x:contain}
.ps .ps-carr-pista::-webkit-scrollbar{display:none}
.ps .ps-carr-pista:focus-visible{outline:2px solid var(--brillo);outline-offset:2px;border-radius:12px}
.ps .ps-carr-item{flex:none;width:86%;max-width:340px;scroll-snap-align:center;display:flex}
.ps .ps-carr-item>*{width:100%}
.ps .ps-carr-ctrl{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:4px}
.ps .ps-carr-flecha{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-size:26px;line-height:1;color:var(--brillo);background:rgba(232,89,12,.12);border:1px solid rgba(232,89,12,.45)}
.ps .ps-carr-flecha:active{transform:scale(.94)}
.ps .ps-carr-puntos{display:flex}
.ps .ps-carr-puntos button{width:24px;height:44px;display:grid;place-items:center}
.ps .ps-carr-puntos span{width:8px;height:8px;border-radius:999px;background:rgba(247,242,231,.3);transition:width .3s,background .3s}
.ps .ps-carr-puntos span[data-on]{width:22px;background:var(--brillo)}
@media (min-width:900px){.ps .ps-carr-pista{margin:0;padding:6px 0 10px;scroll-padding:0}.ps .ps-carr-item{width:360px}}

/* Carrusel compacto (arriba): la leyenda a la izquierda y los puntitos a la derecha */
.ps .ps-carr-ctrl-ley{justify-content:space-between;margin-top:0;gap:8px}
.ps .ps-carr-ctrl-ley .ps-carr-puntos button{height:32px;width:22px}

/* Botón fijo abajo */
.ps .ps-fija{position:fixed;left:0;right:0;bottom:0;z-index:40;padding:10px 16px max(10px,env(safe-area-inset-bottom));background:linear-gradient(180deg,rgba(22,17,13,0),rgba(22,17,13,.92) 35%);
  transform:translateY(110%);visibility:hidden;transition:transform .45s cubic-bezier(.2,.9,.3,1.1),visibility 0s .45s}
.ps .ps-fija[data-on]{transform:none;visibility:visible;transition:transform .45s cubic-bezier(.2,.9,.3,1.1)}
.ps .ps-fija .ps-cta{height:54px;font-size:21px;max-width:440px;margin:0 auto}
@media (min-width:900px){.ps .ps-fija{display:none}.ps .ps-wrap{max-width:1120px;padding:0 40px}}

@media (prefers-reduced-motion:reduce){
  .ps *,.ps *::before,.ps *::after{animation:none!important;transition:none!important}
  .ps .ps-brasas,.ps .ps-flash{display:none}
  .ps .ps-golpe,.ps .ps-sube,.ps .ps-rv,.ps .ps-palabras .ps-w,.ps .ps-globo{opacity:1!important;transform:none!important}
  .ps .ps-neon::after{opacity:1}
  .ps .ps-incl{transform:none!important}
  .ps .ps-pista{transform:none!important}
}
`;
