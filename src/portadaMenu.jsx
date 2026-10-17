/* Menú ☰ de la portada (17 oct, pedido por Jonah tras ver fitia.app):
   Funciones, Por objetivo y Recursos se abren y cierran al tocarlos, y
   abajo "Iniciar sesión" y "Empezar". Se descarga solo cuando alguien lo
   abre (React.lazy en src/App.jsx), así no pesa en la primera pantalla.
   Cada opción lleva a su sección de la portada o a su página. */
import { useEffect, useRef, useState } from 'react';
import { PAGINAS_OBJETIVO } from './portadaInfo.js';

export default function MenuPortada({ onCerrar, onIr, onEntrar, onEmpezar, onBuscar, onFoto, onMedir }) {
  const [abierto, setAbierto] = useState(null);
  const cerrarRef = useRef(null);
  const panel = useRef(null);

  // Esc cierra; el foco entra al menú y no se escapa con Tab.
  useEffect(() => {
    const antes = document.activeElement;
    cerrarRef.current?.focus();
    const tecla = e => {
      if (e.key === 'Escape') { e.preventDefault(); onCerrar(); return; }
      if (e.key !== 'Tab' || !panel.current) return;
      const f = [...panel.current.querySelectorAll('button, a[href]')].filter(x => x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    };
    document.addEventListener('keydown', tecla);
    const html = document.documentElement, prev = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', tecla); html.style.overflow = prev; try { antes?.focus?.(); } catch {} };
  }, []);

  const grupos = [
    { id: 'funciones', titulo: 'Funciones', items: [
      { ico: '💡', texto: '¿Por qué Jonah Beast Fuel?', seccion: 'por-que' },
      { ico: '📱', texto: 'Así se ve la app', seccion: 'asi-se-ve' },
      { ico: '🔎', texto: '¿Cuántas calorías tiene tu plato?', accion: onBuscar },
      { ico: '📸', texto: 'Pruébala con tu plato', accion: onFoto },
      { ico: '📏', texto: 'Mide tu composición corporal', accion: onMedir },
    ] },
    { id: 'objetivo', titulo: 'Por objetivo', items: PAGINAS_OBJETIVO.map(o => ({
      ico: { bajar: '🔥', subir: '💪', mantener: '⚖️' }[o.clave] || '🎯', texto: o.h1[0], href: o.ruta,
    })) },
    { id: 'recursos', titulo: 'Recursos', items: [
      { ico: '🍽️', texto: 'Calorías de platos', href: '/calorias' },
      { ico: '📊', texto: 'Cómo contamos las calorías', href: '/contador-de-calorias' },
      { ico: '❓', texto: 'Preguntas frecuentes', seccion: 'preguntas' },
      { ico: '👑', texto: 'Gratis vs. Premium', seccion: 'gratis-premium' },
    ] },
  ];

  return (
    <div className="ps-menu-fondo" onClick={e => { if (e.target === e.currentTarget) onCerrar(); }}>
      <nav ref={panel} className="ps-menu" role="dialog" aria-modal="true" aria-label="Menú">
        <div className="ps-menu-cab">
          <img src="/logo-marca.webp" alt="" width="34" height="41" />
          <div className="leading-none">
            <div className="ps-menu-nom">JONAH BEAST <span className="ps-o">FUEL</span></div>
            <div className="ps-menu-lema">COMIDA A COMIDA</div>
          </div>
          <button ref={cerrarRef} type="button" onClick={onCerrar} className="ps-menu-x" aria-label="Cerrar el menú">✕</button>
        </div>

        <div className="ps-menu-cuerpo">
          {grupos.map(g => {
            const abiertoG = abierto === g.id;
            return (
              <div key={g.id} className="ps-menu-grupo">
                <button type="button" className="ps-menu-g" aria-expanded={abiertoG} aria-controls={'menu-' + g.id}
                  onClick={() => setAbierto(abiertoG ? null : g.id)}>
                  <span>{g.titulo}</span>
                  <span className="ps-menu-flecha" aria-hidden="true">⌄</span>
                </button>
                <ul id={'menu-' + g.id} className="ps-menu-lista" data-on={abiertoG ? '' : undefined}>
                  {g.items.map(it => (
                    <li key={it.texto}>
                      {it.href
                        ? <a href={it.href} tabIndex={abiertoG ? 0 : -1}><span aria-hidden="true">{it.ico}</span>{it.texto}<span className="ps-menu-ir" aria-hidden="true">→</span></a>
                        : <button type="button" tabIndex={abiertoG ? 0 : -1} onClick={() => (it.seccion ? onIr(it.seccion) : it.accion?.())}>
                            <span aria-hidden="true">{it.ico}</span>{it.texto}<span className="ps-menu-ir" aria-hidden="true">→</span>
                          </button>}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="ps-menu-pie">
          <button type="button" onClick={onEntrar} className="ps-menu-entrar">Iniciar sesión</button>
          <button type="button" onClick={onEmpezar} className="ps-cta ps-menu-cta">EMPEZAR</button>
          <p className="ps-nota"><b>Gratis para siempre</b> · Sin tarjeta</p>
        </div>
      </nav>
      <style>{ESTILOS_MENU}</style>
    </div>
  );
}

const ESTILOS_MENU = `
.ps .ps-menu-fondo{position:fixed;inset:0;z-index:60;background:rgba(10,7,5,.72);animation:ps-menu-fondo .25s ease}
@keyframes ps-menu-fondo{from{opacity:0}}
.ps .ps-menu{position:absolute;top:0;right:0;bottom:0;width:min(100%,400px);display:flex;flex-direction:column;background:var(--c900);border-left:1.5px solid var(--aji);
  padding:max(14px,env(safe-area-inset-top)) 16px max(16px,env(safe-area-inset-bottom));animation:ps-menu-entra .35s cubic-bezier(.2,.9,.3,1.05);overflow-y:auto}
@keyframes ps-menu-entra{from{transform:translateX(100%)}}
.ps .ps-menu-cab{display:flex;align-items:center;gap:10px;padding-bottom:12px;border-bottom:1px solid var(--c800)}
.ps .ps-menu-nom{font-family:'Anton',sans-serif;font-size:19px;letter-spacing:.03em}
.ps .ps-menu-lema{font-size:9.5px;font-weight:700;letter-spacing:.3em;color:var(--brillo);margin-top:3px}
.ps .ps-menu-x{margin-left:auto;width:44px;height:44px;border-radius:50%;background:var(--c800);font-size:18px;color:var(--crema)}
.ps .ps-menu-cuerpo{flex:1;padding-top:6px}
.ps .ps-menu-grupo{border-bottom:1px solid var(--c800)}
.ps .ps-menu-g{width:100%;display:flex;align-items:center;justify-content:space-between;min-height:56px;font-family:'Anton',sans-serif;font-size:22px;letter-spacing:.02em;text-transform:uppercase;color:var(--crema);text-align:left}
.ps .ps-menu-g[aria-expanded=true]{color:var(--brillo)}
.ps .ps-menu-flecha{font-family:'Work Sans',sans-serif;font-size:20px;color:var(--brillo);transition:transform .3s}
.ps .ps-menu-g[aria-expanded=true] .ps-menu-flecha{transform:rotate(180deg)}
.ps .ps-menu-lista{list-style:none;margin:0;padding:0;display:grid;grid-template-rows:0fr;overflow:hidden;transition:grid-template-rows .3s ease,padding .3s}
.ps .ps-menu-lista>li{min-height:0;overflow:hidden}
.ps .ps-menu-lista[data-on]{grid-template-rows:none;padding-bottom:10px}
.ps .ps-menu-lista:not([data-on])>li{display:none}
.ps .ps-menu-lista a,.ps .ps-menu-lista button{width:100%;display:flex;align-items:center;gap:10px;min-height:46px;padding:0 10px;border-radius:12px;font-size:15px;font-weight:600;color:var(--cr200);text-align:left}
.ps .ps-menu-lista a:hover,.ps .ps-menu-lista button:hover{background:var(--c800);color:var(--crema)}
.ps .ps-menu-ir{margin-left:auto;color:var(--brillo)}
.ps .ps-menu-pie{display:grid;gap:10px;padding-top:16px}
.ps .ps-menu-entrar{height:52px;border-radius:999px;border:1.5px solid var(--c700);font-weight:700;font-size:15px;color:var(--crema)}
.ps .ps-menu-cta{height:56px;font-size:22px}
@media (prefers-reduced-motion:reduce){.ps .ps-menu,.ps .ps-menu-fondo{animation:none}}
`;
