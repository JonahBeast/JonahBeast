// COMUNIDAD BEAST (pestaña "Comunidad" de la app del alumno): dos vistas.
//
// - "Muro" (Etapa A): los logros de los retos de toda la comunidad
//   (medallas, metas de equipo, rachas, quién se unió al Team Beast) y los
//   anuncios de Jonah, con reacciones de un toque (🔥 💪 👏). Nadie escribe
//   texto libre, así que no hay nada que moderar. Solo aparece quien lo
//   activa (y nunca menores de 18); de cada uno solo va su nombre corto,
//   nunca su peso ni sus kilos. Todo lo arma la base en comunidad_muro.
// - "Mis equipos": los retos en grupo (src/equipo.jsx).
import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { btnPrimary, btnGhost, showToast, vibrar } from './App.jsx';
import { EquipoTab, MEDALLAS, CLAVE_INVITACION_EQUIPO, llamar, Tarjeta, haceCuanto } from './equipo.jsx';

const CLAVE_VISTA = 'jb-comunidad-vista';
const CLAVE_VISTO = 'jb-comunidad-visto';

export function leerVistaComunidad() {
  try { return localStorage.getItem(CLAVE_VISTA) === 'equipos' ? 'equipos' : 'muro'; } catch { return 'muro'; }
}
function guardarVistaComunidad(v) {
  try { localStorage.setItem(CLAVE_VISTA, v); } catch {}
}

// ¿Hay un anuncio de Jonah que todavía no vio? (para el punto en la pestaña)
export async function hayAnuncioNuevo() {
  const { data } = await llamar('comunidad_novedades');
  const ultimo = data?.ultimo_anuncio;
  if (!ultimo) return false;
  try {
    const visto = localStorage.getItem(CLAVE_VISTO);
    return !visto || new Date(ultimo) > new Date(visto);
  } catch { return false; }
}
function marcarMuroVisto() {
  try { localStorage.setItem(CLAVE_VISTO, new Date().toISOString()); } catch {}
}

const REACCIONES = [
  { tipo: 'fuego', emoji: '🔥' },
  { tipo: 'fuerza', emoji: '💪' },
  { tipo: 'aplauso', emoji: '👏' },
];

export function ComunidadTab({ username, nombre, vista, onVista, avisoEquipos, onAnimosVistos, onMuroVisto }) {
  function cambiar(v) { guardarVistaComunidad(v); onVista(v); window.scrollTo({ top: 0 }); }
  return (
    <div className="pt-2">
      <h1 className="jb-display text-3xl text-zinc-50 mb-1">COMUNIDAD</h1>
      <p className="jb-body text-sm text-zinc-400 mb-4">
        El cambio llega poco a poco, comida a comida. Y con tu gente al lado, se hace más fácil. 🦍
      </p>
      <div className="grid grid-cols-2 gap-1 p-1 mb-5 bg-zinc-900 border border-zinc-800 rounded-xl">
        {[{ id: 'muro', texto: 'Muro' }, { id: 'equipos', texto: 'Mis equipos', aviso: avisoEquipos }].map(o => (
          <button key={o.id} onClick={() => cambiar(o.id)}
            className={`relative jb-body text-sm font-semibold py-2 rounded-lg transition-colors ${vista === o.id ? 'bg-orange-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'}`}>
            {o.texto}
            {o.aviso && vista !== o.id && <span className="absolute top-1.5 right-3 w-2 h-2 rounded-full bg-orange-500" />}
          </button>
        ))}
      </div>
      {vista === 'muro'
        ? <Muro onIrEquipos={() => cambiar('equipos')} onVisto={onMuroVisto} />
        : <EquipoTab username={username} nombre={nombre} onAnimosVistos={onAnimosVistos} sinTitulo />}
    </div>
  );
}

function Muro({ onIrEquipos, onVisto }) {
  const [muro, setMuro] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  async function cargar() {
    const { r, ok } = await llamar('comunidad_muro');
    setMuro(ok ? r : { error: true });
  }
  useEffect(() => {
    cargar().then(() => { marcarMuroVisto(); onVisto?.(); });
  }, []);

  async function aparecer(visible) {
    setOcupado(true);
    const { r, ok, error } = await llamar('comunidad_aparecer', { p_visible: visible });
    setOcupado(false);
    if (!ok) {
      showToast(error ? 'No se pudo conectar. Revisa tu internet e intenta de nuevo.'
        : r?.error === 'menor' ? 'Para aparecer en el muro hay que ser mayor de 18.' : 'Algo falló. Intenta de nuevo.', 'error');
      return;
    }
    if (visible) { vibrar(30); showToast('🦍 ¡Listo! Tus logros ya salen en el muro.'); }
    cargar();
  }

  // Pone o quita la reacción al instante y luego la guarda.
  async function reaccionar(id, tipo) {
    const cambiar = item => {
      if (item.id !== id) return item;
      const ya = (item.mias || []).includes(tipo);
      return {
        ...item,
        mias: ya ? item.mias.filter(t => t !== tipo) : [...(item.mias || []), tipo],
        reacciones: { ...item.reacciones, [tipo]: Math.max(0, (item.reacciones?.[tipo] || 0) + (ya ? -1 : 1)) },
      };
    };
    const antes = muro;
    setMuro(m => ({ ...m, eventos: m.eventos.map(cambiar), anuncios: m.anuncios.map(cambiar) }));
    vibrar(15);
    const { ok } = await llamar('comunidad_reaccionar', { p_evento: id, p_tipo: tipo });
    if (!ok) { setMuro(antes); showToast('No se pudo guardar tu reacción. Intenta de nuevo.', 'error'); }
  }

  function unirse(codigo) {
    try { localStorage.setItem(CLAVE_INVITACION_EQUIPO, codigo); } catch {}
    onIrEquipos();
  }

  if (!muro) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-orange-500" size={24} /></div>;
  if (muro.error) {
    return (
      <Tarjeta className="text-center">
        <p className="jb-body text-sm text-zinc-300 mb-3">No pudimos cargar el muro. Revisa tu internet.</p>
        <button onClick={() => { setMuro(null); cargar(); }} className={btnGhost + ' mx-auto px-5 py-2'}>Reintentar</button>
      </Tarjeta>
    );
  }

  const { yo, anuncios, eventos } = muro;
  return (
    <div>
      {!yo.visible && !yo.menor && !yo.decidio && (
        <Tarjeta className="border-orange-500/60 mb-4">
          <p className="jb-display text-lg text-zinc-50 mb-1">¿QUIERES APARECER EN EL MURO?</p>
          <p className="jb-body text-sm text-zinc-300 mb-1">
            Cuando logres algo (una racha, una medalla en un reto) saldrá aquí con tu nombre corto, <b>{yo.nombre}</b>, para que la comunidad te aplauda. 🔥
          </p>
          <p className="jb-body text-xs text-zinc-500 mb-3">Nunca se muestra tu peso, tus kilos ni lo que comes. Puedes quitarlo cuando quieras.</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => aparecer(true)} disabled={ocupado} className={btnPrimary + ' py-3'}>
              {ocupado ? <Loader2 className="animate-spin" size={16} /> : 'Sí, quiero'}
            </button>
            <button onClick={() => aparecer(false)} disabled={ocupado} className={btnGhost + ' py-3'}>Ahora no</button>
          </div>
        </Tarjeta>
      )}

      {anuncios.map(a => (
        <Tarjeta key={a.id} className={`mb-3 ${a.fijado ? 'border-orange-500/50' : ''}`}>
          <div className="flex items-center gap-2.5 mb-2">
            <img src="/logo-marca.webp" alt="Jonah" className="w-10 h-10 object-contain shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block jb-display text-base text-zinc-50 leading-none">JONAH 🦍</span>
              <span className="block jb-body text-[10px] text-zinc-500">{a.fijado ? '📌 Fijado' : haceCuanto(a.cuando)}</span>
            </span>
          </div>
          <p className="jb-body text-sm text-zinc-200 whitespace-pre-line leading-relaxed">{a.texto}</p>
          {a.equipo && (
            a.equipo.soy_miembro ? (
              <button onClick={onIrEquipos} className={btnGhost + ' w-full py-2.5 mt-3'}>Ver el reto · {a.equipo.nombre}</button>
            ) : (
              <button onClick={() => unirse(a.equipo.codigo)} className={btnPrimary + ' w-full py-3 mt-3'}>
                Únete al reto · {a.equipo.oficial ? 'Team Beast 🦍' : a.equipo.nombre}
              </button>
            )
          )}
          <Reacciones item={a} onReaccionar={reaccionar} />
        </Tarjeta>
      ))}

      <p className="jb-body text-xs text-zinc-500 uppercase tracking-wider mb-2 mt-1">Logros de la comunidad</p>
      {eventos.length === 0 ? (
        <Tarjeta>
          <p className="jb-body text-sm text-zinc-400">
            Todavía no hay logros en el muro. Registra tus comidas día a día, únete a un reto y aquí lo celebramos juntos. 🦍
          </p>
        </Tarjeta>
      ) : (
        <div className="space-y-2">
          {eventos.map(ev => {
            const { emoji, texto } = textoLogro(ev);
            return (
              <Tarjeta key={ev.id} className={ev.yo ? 'border-orange-500/40' : ''}>
                <div className="flex items-start gap-3">
                  <span className="w-10 h-10 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-lg shrink-0">{emoji}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block jb-body text-sm text-zinc-200 leading-snug">{texto}</span>
                    <span className="block jb-body text-[10px] text-zinc-500 mt-0.5">{haceCuanto(ev.cuando)}</span>
                  </span>
                </div>
                <Reacciones item={ev} propio={ev.yo && ev.tipo !== 'meta_equipo'} onReaccionar={reaccionar} />
              </Tarjeta>
            );
          })}
        </div>
      )}

      <p className="jb-body text-[11px] text-zinc-500 text-center mt-5">
        {yo.menor
          ? 'Puedes ver el muro y reaccionar. Para aparecer en él hay que ser mayor de 18.'
          : yo.visible
            ? <>Apareces en el muro como <b className="text-zinc-400">{yo.nombre}</b>. <button onClick={() => aparecer(false)} disabled={ocupado} className="text-orange-400 underline">Dejar de aparecer</button></>
            : yo.decidio
              ? <>No apareces en el muro. <button onClick={() => aparecer(true)} disabled={ocupado} className="text-orange-400 underline">Quiero aparecer</button></>
              : null}
      </p>
    </div>
  );
}

// Fila de reacciones. En un logro propio solo se ven las cuentas.
function Reacciones({ item, propio = false, onReaccionar }) {
  const mias = item.mias || [];
  return (
    <div className="flex gap-1.5 mt-3">
      {REACCIONES.map(r => {
        const n = item.reacciones?.[r.tipo] || 0;
        const mia = mias.includes(r.tipo);
        if (propio && !n) return null;
        return (
          <button key={r.tipo} onClick={() => !propio && onReaccionar(item.id, r.tipo)} disabled={propio}
            className={`jb-body text-sm px-3 py-1 rounded-full border transition-colors ${mia ? 'border-orange-500 bg-orange-500/15 text-zinc-50' : 'border-zinc-800 text-zinc-300'} ${propio ? '' : 'hover:border-orange-500/60'}`}>
            {r.emoji}{n > 0 && <span className="ml-1 text-xs">{n}</span>}
          </button>
        );
      })}
    </div>
  );
}

// Dónde fue el logro: "en el Team Beast", "en Los Imparables" o "en su equipo".
function dondeFue(ev) {
  if (ev.oficial) return 'en el Team Beast';
  if (ev.apodo) return <>en <b>{ev.apodo}</b></>;
  return ev.yo ? 'en tu equipo' : 'en su equipo';
}

function textoLogro(ev) {
  const quien = ev.yo ? 'Tú' : <b>{ev.quien}</b>;
  if (ev.tipo === 'medalla') {
    const m = MEDALLAS[ev.detalle] || MEDALLAS.oro;
    if (ev.detalle === 'oro' || ev.detalle === 'plata' || ev.detalle === 'bronce') {
      return { emoji: m.emoji, texto: <>{quien} {ev.yo ? 'ganaste' : 'ganó'} la medalla de {m.texto.toLowerCase()} {dondeFue(ev)} por {ev.yo ? 'tu' : 'su'} constancia</> };
    }
    if (ev.detalle === 'carrera') return { emoji: m.emoji, texto: <>{quien} {ev.yo ? 'ganaste' : 'ganó'} la carrera {dondeFue(ev)}</> };
    return { emoji: m.emoji, texto: <>{quien} {ev.yo ? 'llegaste a tu' : 'llegó a su'} meta {dondeFue(ev)}</> };
  }
  if (ev.tipo === 'meta_equipo') {
    const nombres = ev.nombres || [];
    const otros = Math.max(0, (ev.total || 0) - nombres.length);
    const equipo = ev.oficial ? <b>El Team Beast</b> : ev.apodo ? <b>{ev.apodo}</b> : 'Un equipo';
    return {
      emoji: '🏆',
      texto: <>{equipo} cumplió su meta del equipo{ev.yo ? ' (¡y tú estás ahí!)' : ''}: {nombres.join(', ')}{otros > 0 ? ` y ${otros} más` : ''}</>,
    };
  }
  if (ev.tipo === 'racha') {
    return { emoji: '🔥', texto: <>{quien} {ev.yo ? 'llevas' : 'lleva'} <b>{ev.detalle} días seguidos</b> registrando {ev.yo ? 'tus' : 'sus'} comidas</> };
  }
  return { emoji: '🦍', texto: <>{quien} {ev.yo ? 'te uniste' : 'se unió'} al <b>Team Beast</b></> };
}
