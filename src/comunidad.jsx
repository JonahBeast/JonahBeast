// COMUNIDAD BEAST (pestaña "Comunidad" de la app del alumno): dos vistas.
//
// - "Muro" (Etapa A): los logros de los retos de toda la comunidad
//   (medallas, metas de equipo, rachas, quién se unió al Team Beast) y los
//   anuncios de Jonah, con reacciones de un toque (🔥 💪 👏). Nadie escribe
//   texto libre, así que no hay nada que moderar. Solo aparece quien lo
//   activa (y nunca menores de 18); de cada uno solo va su nombre corto,
//   nunca su peso ni sus kilos. Todo lo arma la base en comunidad_muro.
// - Fotos de platos (Etapa B): después de registrar su comida con la foto
//   inteligente, el alumno puede compartirla con una frase lista
//   (CompartirPlato). Jonah la aprueba en su panel (a quien ya le aprobó 5
//   le salen solas); con 2 reportes se oculta sola.
// - "Mis equipos": los retos en grupo (src/equipo.jsx).
import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from './supabaseClient';
import { btnPrimary, btnGhost, showToast, vibrar, todayISO, addDaysISO } from './App.jsx';
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

// Frases listas para la foto del plato (el alumno no escribe texto).
export const FRASES_PLATO = {
  almuerzo_beast: '¡Almuerzo Beast! 💪',
  desayuno: 'Desayuno con todo ☀️',
  cena: 'Cena ligera y rica 🌙',
  casera: 'Comida casera 🍲',
  rico_sano: 'Sí se puede comer rico y sano 🔥',
  comida_a_comida: 'Comida a comida 🦍',
};
const CLAVE_NO_COMPARTIR = 'jb-compartir-plato-no';
export function preguntarCompartirPlato() {
  try { return localStorage.getItem(CLAVE_NO_COMPARTIR) !== '1'; } catch { return true; }
}
function noPreguntarMas() {
  try { localStorage.setItem(CLAVE_NO_COMPARTIR, '1'); } catch {}
}
function volverAPreguntar() {
  try { localStorage.removeItem(CLAVE_NO_COMPARTIR); } catch {}
}

// "¿Compartes tu plato con la Comunidad?": sale en la foto inteligente
// después de agregar la comida (la foto ya se reconoció como comida).
// La frase que sale marcada depende de la comida en la que lo registró
// (en los snacks, una que sirve para cualquier momento).
const FRASE_POR_COMIDA = { 'Desayuno': 'desayuno', 'Almuerzo': 'almuerzo_beast', 'Cena': 'cena' };
export function CompartirPlato({ username, comida, blob, previewUrl, plato, onListo, onCorregir }) {
  const [frase, setFrase] = useState(FRASE_POR_COMIDA[comida] || 'comida_a_comida');
  const [enviando, setEnviando] = useState(false);

  async function compartir() {
    setEnviando(true);
    const ruta = `${username}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error: upErr } = await supabase.storage.from('comunidad-fotos').upload(ruta, blob, { contentType: 'image/jpeg', upsert: false });
    if (upErr) { setEnviando(false); showToast('No se pudo subir la foto. Revisa tu internet e intenta de nuevo.', 'error'); return; }
    const { r, ok, error } = await llamar('comunidad_foto_subir', { p_ruta: ruta, p_frase: frase, p_plato: plato || null });
    if (!ok) {
      supabase.storage.from('comunidad-fotos').remove([ruta]).catch(() => {});
      setEnviando(false);
      if (r?.error === 'menor') {
        noPreguntarMas();
        showToast('Compartir fotos en la comunidad es para mayores de 18. ¡Sigue registrando, vas muy bien! 💪');
        onListo();
      } else if (r?.error === 'limite') {
        showToast('Hoy ya compartiste 3 fotos. ¡Mañana compartes más! 💪');
        onListo();
      } else {
        showToast(error ? 'No se pudo conectar. Revisa tu internet e intenta de nuevo.' : 'Algo falló. Intenta de nuevo.', 'error');
      }
      return;
    }
    vibrar(30);
    showToast(r.estado === 'aprobada' ? '🔥 ¡Tu plato ya está en la comunidad!' : '¡Listo! Jonah la revisa y pronto aparece en la comunidad 💪');
    onListo();
  }

  return (
    <div>
      {previewUrl && <img src={previewUrl} alt="" className="w-full max-h-48 object-cover rounded-xl mb-3" />}
      <p className="jb-display text-lg text-zinc-50 mb-1">📸 ¿COMPARTES TU PLATO CON LA COMUNIDAD?</p>
      <p className="jb-body text-xs text-zinc-400 mb-3">Inspira a otros: sale en el muro con tu nombre corto, la frase que elijas y lo que comiste. Nunca tu peso ni tus calorías.</p>
      {plato && (
        <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3 mb-3">
          <ul className="jb-body text-xs text-zinc-300 space-y-0.5">
            {plato.split(' · ').map((l, i) => <li key={i}>• {l}</li>)}
          </ul>
          {onCorregir && (
            <button onClick={onCorregir} disabled={enviando} className="jb-body text-xs text-orange-400 underline mt-2">
              ✏️ ¿No es la cantidad? Corrígela
            </button>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {Object.entries(FRASES_PLATO).map(([k, t]) => (
          <button key={k} onClick={() => setFrase(k)}
            className={`jb-body text-xs px-3 py-1.5 rounded-full border transition-colors ${frase === k ? 'border-orange-500 bg-orange-500/15 text-zinc-50' : 'border-zinc-700 text-zinc-300 hover:border-orange-500/60'}`}>
            {t}
          </button>
        ))}
      </div>
      <p className="jb-body text-[11px] text-zinc-500 mb-3">Jonah revisa las primeras fotos antes de publicarlas. Tu comida se registra igual, la compartas o no.</p>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={compartir} disabled={enviando} className={btnPrimary + ' py-3'}>
          {enviando ? <Loader2 className="animate-spin" size={16} /> : 'Compartir'}
        </button>
        <button onClick={onListo} disabled={enviando} className={btnGhost + ' py-3'}>No, gracias</button>
      </div>
      <button onClick={() => { noPreguntarMas(); onListo(); }} disabled={enviando}
        className="block mx-auto jb-body text-[11px] text-zinc-500 hover:text-zinc-300 mt-3">No me preguntes más</button>
    </div>
  );
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
  const [urls, setUrls] = useState({}); // ruta → enlace temporal de la foto
  const [reportadas, setReportadas] = useState([]);
  const [preguntaPlatos, setPreguntaPlatos] = useState(preguntarCompartirPlato);

  async function cargar() {
    const { r, ok } = await llamar('comunidad_muro');
    setMuro(ok ? r : { error: true });
    const rutas = ok ? r.eventos.filter(e => e.tipo === 'foto' && e.ruta).map(e => e.ruta) : [];
    if (rutas.length) {
      const { data } = await supabase.storage.from('comunidad-fotos').createSignedUrls(rutas, 3600);
      setUrls(Object.fromEntries((data || []).filter(d => d.signedUrl).map(d => [d.path, d.signedUrl])));
    }
  }

  async function reportar(ev) {
    if (!window.confirm('¿Reportar esta foto? Si la reportan 2 personas se oculta y Jonah la revisa.')) return;
    const { ok } = await llamar('comunidad_foto_reportar', { p_id: ev.foto_id });
    if (!ok) { showToast('No se pudo enviar el reporte. Intenta de nuevo.', 'error'); return; }
    setReportadas(x => [...x, ev.id]);
    showToast('Gracias por avisar. Jonah la va a revisar. 🙏');
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

      {yo.fotos_en_revision > 0 && (
        <Tarjeta className="mb-3">
          <p className="jb-body text-sm text-zinc-300">
            ⏳ {yo.fotos_en_revision === 1 ? 'Tu foto está' : `Tus ${yo.fotos_en_revision} fotos están`} en revisión. Jonah la{yo.fotos_en_revision === 1 ? '' : 's'} revisa pronto y te avisamos cuando salga{yo.fotos_en_revision === 1 ? '' : 'n'} en el muro.
          </p>
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
          {eventos.filter(ev => !reportadas.includes(ev.id)).map(ev => {
            if (ev.tipo === 'foto') {
              return (
                <Tarjeta key={ev.id} className={ev.yo ? 'border-orange-500/40' : ''}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-10 h-10 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-lg shrink-0">📸</span>
                    <span className="flex-1 min-w-0">
                      <span className="block jb-body text-sm text-zinc-200 leading-snug">{ev.yo ? 'Tú compartiste tu plato' : <><b>{ev.quien}</b> compartió su plato</>}</span>
                      <span className="block jb-body text-[10px] text-zinc-500 mt-0.5">{haceCuanto(ev.cuando)}</span>
                    </span>
                  </div>
                  {urls[ev.ruta]
                    ? <img src={urls[ev.ruta]} alt={ev.plato || 'Plato'} loading="lazy" className="w-full max-h-80 object-cover rounded-xl bg-zinc-950" />
                    : <div className="w-full h-48 rounded-xl bg-zinc-950 flex items-center justify-center"><Loader2 className="animate-spin text-zinc-600" size={20} /></div>}
                  <p className="jb-display text-base text-zinc-50 mt-2">{FRASES_PLATO[ev.detalle] || ''}</p>
                  {ev.plato && (
                    <ul className="jb-body text-xs text-zinc-400 mt-1 space-y-0.5">
                      {ev.plato.split(' · ').map((l, i) => <li key={i}>• {l}</li>)}
                    </ul>
                  )}
                  <div className="flex items-end justify-between gap-2">
                    <Reacciones item={ev} propio={ev.yo} onReaccionar={reaccionar} />
                    {!ev.yo && <button onClick={() => reportar(ev)} className="jb-body text-[10px] text-zinc-600 hover:text-zinc-400 mb-1">Reportar</button>}
                  </div>
                </Tarjeta>
              );
            }
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
      {!preguntaPlatos && !yo.menor && (
        <p className="jb-body text-[11px] text-zinc-500 text-center mt-2">
          <button onClick={() => { volverAPreguntar(); setPreguntaPlatos(true); showToast('📸 Listo: al registrar con foto te preguntaremos si quieres compartir tu plato.'); }}
            className="text-orange-400 underline">Volver a preguntarme si comparto mis platos</button>
        </p>
      )}
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
  if (ev.tipo === 'entreno') {
    return { emoji: '💪', texto: <>{quien} {ev.yo ? 'entrenaste' : 'entrenó'} <b>{ev.detalle} veces</b> esta semana</> };
  }
  if (ev.tipo === 'racha') {
    return { emoji: '🔥', texto: <>{quien} {ev.yo ? 'llevas' : 'lleva'} <b>{ev.detalle} días seguidos</b> registrando {ev.yo ? 'tus' : 'sus'} comidas</> };
  }
  return { emoji: '🦍', texto: <>{quien} {ev.yo ? 'te uniste' : 'se unió'} al <b>Team Beast</b></> };
}

// TARJETAS DE INICIO que llevan gente a la comunidad (una a la vez):
// 1. Al llegar a 3, 7, 14, 21, 30, 60 o 90 días seguidos registrando, a quien
//    todavía no aparece en el muro: "¿Lo celebramos con la comunidad?".
// 2. Si no, a quien no está en el Team Beast: "Únete al reto con Jonah".
// "Ahora no" la esconde (la del logro hasta el siguiente logro; la del Team
// Beast por 7 días).
const HITOS_RACHA = [3, 7, 14, 21, 30, 60, 90];
const CLAVE_TB_AHORA_NO = 'jb-team-beast-ahora-no';
function leerLocal(k) { try { return localStorage.getItem(k); } catch { return null; } }
function guardarLocal(k, v) { try { localStorage.setItem(k, v); } catch {} }

export function InvitacionComunidad({ username, onIrComunidad }) {
  const [datos, setDatos] = useState(null); // { nov, racha }
  const [oculta, setOculta] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [{ r: nov, ok }, { data: hist }] = await Promise.all([
          llamar('comunidad_novedades'),
          supabase.from('historial').select('fecha, comidas_count')
            .eq('username', username).gte('fecha', addDaysISO(todayISO(), -100)),
        ]);
        if (!ok || !vivo) return;
        const con = new Set((hist || []).filter(h => Number(h.comidas_count) > 0).map(h => h.fecha));
        let racha = 0;
        let dia = con.has(todayISO()) ? todayISO() : addDaysISO(todayISO(), -1);
        while (con.has(dia)) { racha++; dia = addDaysISO(dia, -1); }
        setDatos({ nov, racha });
      } catch {}
    })();
    return () => { vivo = false; };
  }, [username]);

  if (!datos || oculta) return null;
  const { nov, racha } = datos;
  const hito = [...HITOS_RACHA].reverse().find(h => racha >= h);
  const claveHito = `jb-celebrar-racha-${hito}`;
  const verLogro = hito && !nov.visible && !nov.menor && !leerLocal(claveHito);
  const ahoraNoTB = leerLocal(CLAVE_TB_AHORA_NO);
  const verTeam = !verLogro && nov.oficial && !nov.oficial.soy_miembro
    && !(ahoraNoTB && ahoraNoTB > addDaysISO(todayISO(), -7));
  if (!verLogro && !verTeam) return null;

  async function aparecer() {
    setOcupado(true);
    const { ok } = await llamar('comunidad_aparecer', { p_visible: true });
    setOcupado(false);
    if (!ok) { showToast('No se pudo guardar. Revisa tu internet e intenta de nuevo.', 'error'); return; }
    vibrar(30);
    showToast('🦍 ¡Listo! Ya apareces en el muro: ahí saldrán tus logros.');
    setOculta(true);
    onIrComunidad('muro');
  }
  async function unirse() {
    setOcupado(true);
    const { r, ok } = await llamar('equipo_unirse', { p_codigo: nov.oficial.codigo, p_por_enlace: false });
    setOcupado(false);
    if (!ok) { showToast(r?.error === 'muchos' ? 'Ya estás en 3 equipos, que es el máximo.' : 'No se pudo. Revisa tu internet e intenta de nuevo.', 'error'); return; }
    vibrar(30);
    showToast('🦍 ¡Bienvenido al Team Beast! Vamos juntos, comida a comida.');
    setOculta(true);
    onIrComunidad('equipos');
  }

  if (verLogro) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-orange-500/50 bg-zinc-900 p-4 mb-4"
        style={{ boxShadow: '0 0 40px -18px rgba(232,89,12,.6)' }}>
        <p className="jb-display text-xl text-zinc-50 leading-tight">🔥 ¡{racha} DÍAS SEGUIDOS REGISTRANDO!</p>
        <p className="jb-body text-sm text-zinc-300 mt-1 mb-1">¿Lo celebramos con la comunidad? Aparece en el muro y deja que te aplaudan.</p>
        <p className="jb-body text-[11px] text-zinc-500 mb-3">Solo sale tu nombre corto y tus logros. Nunca tu peso ni lo que comes.</p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={aparecer} disabled={ocupado} className={btnPrimary + ' py-3'}>
            {ocupado ? <Loader2 className="animate-spin" size={16} /> : 'Sí, que lo vean 🔥'}
          </button>
          <button onClick={() => { guardarLocal(claveHito, '1'); setOculta(true); }} disabled={ocupado} className={btnGhost + ' py-3'}>Ahora no</button>
        </div>
      </div>
    );
  }
  return (
    <div className="relative overflow-hidden rounded-2xl border border-orange-500/40 bg-zinc-900 p-4 mb-4">
      <div className="flex items-center gap-3 mb-2">
        <img src="/logo-marca.webp" alt="Jonah" className="w-12 h-12 object-contain shrink-0" />
        <span>
          <span className="block jb-body text-[11px] text-orange-300 uppercase tracking-wider">El reto en grupo con Jonah</span>
          <span className="block jb-display text-xl text-zinc-50 leading-tight">ÚNETE AL TEAM BEAST 🦍</span>
        </span>
      </div>
      <p className="jb-body text-sm text-zinc-300 mb-3">Registra tus comidas, suma puntos y recibe ánimo del equipo. Con gente al lado se hace más fácil.</p>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={unirse} disabled={ocupado} className={btnPrimary + ' py-3'}>
          {ocupado ? <Loader2 className="animate-spin" size={16} /> : 'Unirme'}
        </button>
        <button onClick={() => { guardarLocal(CLAVE_TB_AHORA_NO, todayISO()); setOculta(true); }} disabled={ocupado} className={btnGhost + ' py-3'}>Ahora no</button>
      </div>
    </div>
  );
}
