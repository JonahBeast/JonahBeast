import React, { useEffect, useRef, useState } from 'react';

/* Regla deslizable para elegir un número (edad, estatura, peso, medidas):
   se desliza con el dedo a la izquierda o derecha y el número cambia en
   vivo; la rayita naranja del centro marca el valor. Las rayitas se
   dibujan con fondos (no una por elemento), así el peso de 0.1 en 0.1 kg
   no pesa en el celular.

   valor: número o '' (vacío). Si está vacío, la regla se ubica en
   "inicial" sin cambiar nada hasta que la persona la mueva.
   onCambio(número). */
const PASO_PX = 10;

const redondear = (v, dec) => Number(Number(v).toFixed(dec));

export function ReglaDeslizable({ valor, onCambio, paso = 1, min, max, inicial, etiqueta = 'valor' }) {
  const caja = useRef(null);
  const [ancho, setAncho] = useState(0);
  const ignorar = useRef(null); // posición de un movimiento hecho por la app (no por el dedo)
  const ultimo = useRef(null); // último índice elegido
  const reposo = useRef(null);
  const dec = paso < 1 ? 1 : 0;
  const total = Math.round((max - min) / paso);
  const n = Number(valor);
  const vacio = valor === '' || valor === null || valor === undefined || !Number.isFinite(n) || n === 0;
  const base = vacio ? (Number(inicial) || min) : n;
  const indiceDe = v => Math.min(total, Math.max(0, Math.round((v - min) / paso)));
  const idx = indiceDe(base);

  // Rayitas: grandes con número, medianas y chicas.
  const mayor = paso * 10;
  const medio = paso === 0.5 ? 1 : paso * 5;
  const desfase = cada => Math.round((Math.ceil(min / cada - 1e-9) * cada - min) / paso) * PASO_PX;
  const etiquetas = [];
  for (let v = Math.ceil(min / mayor - 1e-9) * mayor; v <= max + 1e-9; v += mayor) etiquetas.push(redondear(v, dec));

  useEffect(() => {
    if (!caja.current) return;
    const medir = () => setAncho(caja.current?.clientWidth || 0);
    medir();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null;
    ro?.observe(caja.current);
    return () => ro?.disconnect();
  }, []);

  // Si el número cambia por fuera (lo escribió), la regla va a ese lugar.
  useEffect(() => {
    if (!caja.current || !ancho) return;
    if (ultimo.current === idx) return;
    ultimo.current = idx;
    const x = idx * PASO_PX;
    if (Math.abs(caja.current.scrollLeft - x) < 1) return;
    ignorar.current = x;
    caja.current.scrollLeft = x;
  }, [idx, ancho]);

  useEffect(() => () => clearTimeout(reposo.current), []);

  function alMover() {
    const el = caja.current;
    if (!el) return;
    const x = el.scrollLeft;
    if (ignorar.current !== null) {
      if (Math.abs(x - ignorar.current) < 1) { ignorar.current = null; return; }
      ignorar.current = null;
    }
    const i = Math.min(total, Math.max(0, Math.round(x / PASO_PX)));
    if (i !== ultimo.current) {
      ultimo.current = i;
      try { navigator.vibrate?.(4); } catch {}
      onCambio(redondear(min + i * paso, dec));
    }
    // Al soltar, se acomoda justo en la rayita.
    clearTimeout(reposo.current);
    reposo.current = setTimeout(() => {
      const destino = i * PASO_PX;
      if (caja.current && Math.abs(caja.current.scrollLeft - destino) > 0.5) caja.current.scrollTo({ left: destino, behavior: 'smooth' });
    }, 140);
  }

  const mitad = ancho / 2;
  const largo = total * PASO_PX;
  const rayas = (cada, alto, color) => ({
    position: 'absolute', left: mitad, bottom: 0, width: largo + 2, height: alto,
    backgroundImage: `repeating-linear-gradient(to right, ${color} 0 2px, transparent 2px ${Math.round((cada / paso)) * PASO_PX}px)`,
    backgroundPosition: `${desfase(cada) - 1}px 0`,
  });

  return (
    <div className="relative mt-1 select-none">
      <div ref={caja} onScroll={alMover} role="slider" aria-label={`Desliza para elegir ${etiqueta}`}
        aria-valuemin={min} aria-valuemax={max} aria-valuenow={redondear(min + idx * paso, dec)} tabIndex={0}
        onKeyDown={e => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
          e.preventDefault();
          const i = Math.min(total, Math.max(0, idx + (e.key === 'ArrowRight' ? 1 : -1)));
          onCambio(redondear(min + i * paso, dec));
        }}
        className="overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus:outline-none"
        style={{ overscrollBehaviorX: 'contain', WebkitMaskImage: 'linear-gradient(to right, transparent, #000 22%, #000 78%, transparent)', maskImage: 'linear-gradient(to right, transparent, #000 22%, #000 78%, transparent)' }}>
        <div className="relative h-12" style={{ width: largo + ancho }}>
          <div style={rayas(paso, 10, 'rgba(161,161,170,.35)')} />
          <div style={rayas(medio, 16, 'rgba(161,161,170,.55)')} />
          <div style={rayas(mayor, 22, 'rgba(244,244,245,.8)')} />
          {etiquetas.map(v => (
            <span key={v} className="absolute top-0 -translate-x-1/2 jb-body text-[10px] text-zinc-500 tabular-nums"
              style={{ left: mitad + Math.round((v - min) / paso) * PASO_PX }}>{v}</span>
          ))}
        </div>
      </div>
      {/* Marca del valor elegido */}
      <div className="pointer-events-none absolute left-1/2 bottom-0 -translate-x-1/2 w-[3px] h-8 rounded-full bg-orange-500"
        style={{ boxShadow: '0 0 10px rgba(232,89,12,.7)' }} />
    </div>
  );
}
