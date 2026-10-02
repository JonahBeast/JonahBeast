// EQUIPOS: retos en grupo (pestaña "Equipo" de la app del alumno).
//
// - El Team Beast oficial: el reto del mes con Jonah de capitán.
// - Equipos propios: "Team Beast de [capitán]" (el nombre lo pone la base,
//   no se elige). Los arma un alumno, invita por WhatsApp con un
//   código o un enlace (jonahbeast.com/?equipo=CODIGO), máximo 30.
// - Cada día cuenta: ✓ = 3 o más comidas registradas (10 puntos),
//   – = 1 o 2 comidas (5 puntos), ✗ = ninguna. El ranking premia la
//   constancia, nunca los kilos. De los compañeros solo se ve su nombre
//   corto, sus casillas y sus puntos (lo arma la base en equipo_ver).
// - Ánimos de un toque (💪 🔥 👏) que le llegan al compañero como aviso.
// - La conversación del equipo va en su grupo de WhatsApp (botón).
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Loader2, MessageCircle, Plus, Copy, KeyRound, LogOut, Pencil, Users } from 'lucide-react';
import { supabase } from './supabaseClient';
import { btnPrimary, btnGhost, inputCls, showToast, vibrar } from './App.jsx';

export const CLAVE_INVITACION_EQUIPO = 'jb-equipo-invitacion';

// El código de equipo con el que llegó (enlace ?equipo=), guardado al
// abrir la app para usarlo después de crear la cuenta o de entrar.
export function leerInvitacionEquipo() {
  try {
    const desdeUrl = new URLSearchParams(window.location.search).get('equipo');
    if (desdeUrl && /^[A-Za-z0-9]{4,8}$/.test(desdeUrl)) {
      localStorage.setItem(CLAVE_INVITACION_EQUIPO, desdeUrl.toUpperCase());
      return desdeUrl.toUpperCase();
    }
    return localStorage.getItem(CLAVE_INVITACION_EQUIPO) || '';
  } catch { return ''; }
}
function olvidarInvitacionEquipo() {
  try { localStorage.removeItem(CLAVE_INVITACION_EQUIPO); } catch {}
}

const ANIMOS = [
  { tipo: 'vamos', emoji: '💪', texto: '¡Vamos!' },
  { tipo: 'sigue', emoji: '🔥', texto: '¡Sigue así!' },
  { tipo: 'bien', emoji: '👏', texto: '¡Bien ahí!' },
];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_CORTOS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const aFecha = iso => { const [y, m, d] = String(iso).split('-').map(Number); return new Date(y, m - 1, d); };
const aISO = f => `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
const masDias = (iso, n) => { const f = aFecha(iso); f.setDate(f.getDate() + n); return aISO(f); };
const fechaCorta = iso => { const f = aFecha(iso); return `${f.getDate()} ${MESES[f.getMonth()].slice(0, 3)}`; };
const fechaLarga = iso => { const f = aFecha(iso); return `${DIAS_LARGOS[f.getDay()]} ${f.getDate()} de ${MESES[f.getMonth()]}`; };
const hoyISO = () => aISO(new Date());
const proximoLunes = () => { const f = new Date(); const d = f.getDay(); f.setDate(f.getDate() + (d === 1 ? 7 : (8 - d) % 7)); return aISO(f); };

// "Team Beast de Pedro · Los Imparables" (el apodo es opcional).
const nombreCompleto = e => (e?.apodo ? `${e.nombre} · ${e.apodo}` : e?.nombre || '');

const linkEquipo = (codigo, ref) =>
  `https://jonahbeast.com/?equipo=${encodeURIComponent(codigo)}${ref ? `&ref=${encodeURIComponent(ref)}` : ''}&fuente=equipo`;

function textoInvitacionEquipo(eq, ref) {
  const link = linkEquipo(eq.codigo, ref);
  if (eq.oficial) {
    return `Únete conmigo al Team Beast 🦍, el reto del mes con Jonah en Jonah Beast Fuel. Registramos lo que comemos y nos damos ánimo: el cambio llega poco a poco, comida a comida. Entra aquí: ${link}`;
  }
  return `¡Únete a mi equipo, el ${nombreCompleto(eq)}, en Jonah Beast Fuel! 🦍 Es un reto en grupo: registramos lo que comemos y nos damos ánimo, comida a comida. Entra con este enlace: ${link} (o pon el código ${eq.codigo} en la pestaña Equipo)`;
}

const ERRORES = {
  apodo: 'Ese apodo no se puede usar. Prueba con otro (de 2 a 24 letras, sin groserías ni promesas de kilos).',
  nombre: 'Ese nombre no se puede usar. Prueba con otro (de 3 a 40 letras, sin groserías ni promesas de kilos).',
  whatsapp: 'Ese enlace no es de un grupo de WhatsApp. Debe empezar con https://chat.whatsapp.com/',
  muchos: 'Ya estás en 3 equipos, que es el máximo. Sal de uno para entrar a otro.',
  lleno: 'Ese equipo ya está completo.',
  no_existe: 'No encontramos un equipo con ese código. Revísalo y prueba otra vez.',
  datos: 'Revisa los datos e intenta de nuevo.',
  ya_capitan: 'Ya eres capitán de un equipo. En otros equipos puedes estar como integrante.',
  en_curso: 'El reto todavía no termina.',
};
const mensajeError = (r, error) => (error ? 'No se pudo conectar. Revisa tu internet e intenta de nuevo.' : ERRORES[r?.error] || 'Algo falló. Intenta de nuevo.');

async function llamar(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  return { r: data, ok: !error && data && !data.error, error };
}

function Tarjeta({ children, className = '' }) {
  return <div className={`bg-zinc-900 border border-zinc-800 rounded-2xl p-4 ${className}`}>{children}</div>;
}

export function EquipoTab({ username, nombre, onAnimosVistos }) {
  const [mis, setMis] = useState(null);
  const [abierto, setAbierto] = useState(null); // id del equipo abierto
  const [vista, setVista] = useState('lista'); // lista | crear | codigo
  const [invitacion, setInvitacion] = useState(null); // { codigo, nombre, miembros, oficial }
  const [ocupado, setOcupado] = useState(false);

  async function cargar() {
    const { r, ok } = await llamar('equipo_mis');
    setMis(ok ? r : { equipos: [], oficial: null, animos: 0, error: true });
    return ok ? r : null;
  }
  useEffect(() => {
    cargar().then(r => {
      const codigo = leerInvitacionEquipo();
      if (codigo) {
        supabase.rpc('equipo_por_codigo', { p_codigo: codigo }).then(({ data }) => {
          if (data) setInvitacion({ codigo, ...data });
          else olvidarInvitacionEquipo();
        });
      } else if (r && r.equipos.length === 1) {
        setAbierto(r.equipos[0].id);
      }
    });
  }, [username]);

  async function unirse(codigo, porEnlace = false) {
    setOcupado(true);
    const { r, ok, error } = await llamar('equipo_unirse', { p_codigo: codigo, p_por_enlace: porEnlace });
    setOcupado(false);
    if (!ok) { showToast(mensajeError(r, error), 'error'); return false; }
    olvidarInvitacionEquipo();
    setInvitacion(null);
    vibrar(30);
    showToast(r.ya ? `Ya estabas en ${r.nombre} 🦍` : `🦍 ¡Bienvenido a ${r.nombre}! Vamos juntos.`);
    await cargar();
    setVista('lista');
    setAbierto(r.id);
    return true;
  }

  if (abierto) {
    return <EquipoDetalle id={abierto} username={username}
      onVolver={() => { setAbierto(null); cargar(); }}
      onSalio={() => { setAbierto(null); cargar(); }}
      onAnimosVistos={onAnimosVistos} />;
  }
  if (vista === 'crear') {
    return <CrearEquipo nombre={nombre} onCancelar={() => setVista('lista')}
      onCreado={async id => { await cargar(); setVista('lista'); setAbierto(id); }} />;
  }

  const enOficial = !!mis?.equipos?.some(e => e.oficial);
  const puedeMas = (mis?.equipos?.length || 0) < 3;
  const yaCapitan = !!mis?.equipos?.some(e => e.capitan && !e.oficial);

  return (
    <div className="pt-2">
      <h1 className="jb-display text-3xl text-zinc-50 mb-1">EQUIPO</h1>
      <p className="jb-body text-sm text-zinc-400 mb-5">
        El cambio llega poco a poco, comida a comida. Y con tu gente al lado, se hace más fácil. 🦍
      </p>

      {invitacion && (
        <Tarjeta className="border-orange-500/60 mb-4">
          <p className="jb-body text-[11px] text-orange-300 uppercase tracking-wider mb-1">Te invitaron</p>
          <p className="jb-display text-xl text-zinc-50">{invitacion.nombre}</p>
          {invitacion.apodo && <p className="jb-display text-base text-orange-400 -mt-0.5">{invitacion.apodo}</p>}
          <p className="jb-body text-xs text-zinc-400 mb-3">{invitacion.miembros} {invitacion.miembros === 1 ? 'integrante' : 'integrantes'}</p>
          <button onClick={() => unirse(invitacion.codigo, true)} disabled={ocupado} className={btnPrimary + ' w-full py-3'}>
            {ocupado ? <Loader2 className="animate-spin" size={16} /> : 'Unirme al equipo'}
          </button>
          <button onClick={() => { olvidarInvitacionEquipo(); setInvitacion(null); }}
            className="block mx-auto jb-body text-xs text-zinc-500 hover:text-zinc-300 mt-2">Ahora no</button>
        </Tarjeta>
      )}

      {!mis ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-orange-500" size={24} /></div>
      ) : (
        <>
          {!enOficial && mis.oficial && (
            <div className="relative overflow-hidden rounded-2xl border border-orange-500/50 p-5 mb-4 bg-zinc-900"
              style={{ boxShadow: '0 0 40px -16px rgba(232,89,12,.6)' }}>
              <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(232,89,12,.22), transparent 70%)' }} />
              <p className="relative jb-body text-[11px] text-orange-300 uppercase tracking-wider">El equipo oficial</p>
              <p className="relative jb-display text-2xl text-zinc-50 mb-1">TEAM BEAST 🦍</p>
              <p className="relative jb-body text-sm text-zinc-300 mb-1">
                El reto de {MESES[new Date().getMonth()]} con Jonah de capitán. Registra tus comidas, suma puntos y recibe ánimo del equipo.
              </p>
              <p className="relative jb-body text-xs text-zinc-500 mb-4">{mis.oficial.miembros} {mis.oficial.miembros === 1 ? 'integrante' : 'integrantes'}</p>
              <button onClick={() => unirse(mis.oficial.codigo)} disabled={ocupado || !puedeMas} className={btnPrimary + ' relative w-full py-3'}>
                {ocupado ? <Loader2 className="animate-spin" size={16} /> : 'Unirme al Team Beast'}
              </button>
            </div>
          )}

          {mis.equipos.length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="jb-body text-xs text-zinc-500 uppercase tracking-wider">Mis equipos</p>
              {mis.equipos.map(e => (
                <button key={e.id} onClick={() => setAbierto(e.id)}
                  className="w-full text-left bg-zinc-900 border border-zinc-800 hover:border-orange-500 rounded-2xl p-4 flex items-center gap-3 transition-colors">
                  <span className="w-10 h-10 rounded-full bg-orange-500/15 border border-orange-500/40 flex items-center justify-center text-lg shrink-0">
                    {e.oficial ? '🦍' : <Users size={18} className="text-orange-400" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block jb-display text-lg text-zinc-50 truncate">{e.nombre}</span>
                    {e.apodo && <span className="block jb-display text-sm text-orange-400 truncate -mt-0.5">{e.apodo}</span>}
                    <span className="block jb-body text-xs text-zinc-500">
                      {e.miembros} {e.miembros === 1 ? 'integrante' : 'integrantes'}{e.capitan ? ' · eres el capitán' : ''}
                    </span>
                  </span>
                  <ChevronRight size={18} className="text-zinc-600 shrink-0" />
                </button>
              ))}
            </div>
          )}

          {puedeMas ? (
            <div className={`grid gap-2 ${yaCapitan ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {!yaCapitan && <button onClick={() => setVista('crear')} className={btnGhost + ' py-3'}><Plus size={16} /> Crear mi equipo</button>}
              <button onClick={() => setVista(vista === 'codigo' ? 'lista' : 'codigo')} className={btnGhost + ' py-3'}><KeyRound size={16} /> Tengo un código</button>
            </div>
          ) : (
            <p className="jb-body text-xs text-zinc-500 text-center">Estás en 3 equipos, el máximo.</p>
          )}
          {vista === 'codigo' && <IngresarCodigo ocupado={ocupado} onUnirse={c => unirse(c)} />}

          <Tarjeta className="mt-6">
            <p className="jb-display text-base text-zinc-100 mb-2">¿CÓMO FUNCIONA?</p>
            <ul className="jb-body text-sm text-zinc-400 space-y-1.5">
              <li><span className="text-orange-400 font-semibold">✓ 10 puntos:</span> registraste 3 comidas o más ese día.</li>
              <li><span className="text-orange-300 font-semibold">– 5 puntos:</span> registraste 1 o 2 comidas.</li>
              <li><span className="text-zinc-500 font-semibold">✗ 0 puntos:</span> ese día no registraste.</li>
              <li>Gana el más constante, no el que más baja. Tu peso y lo que comes no los ve nadie del equipo.</li>
              <li>Mándale ánimo a tus compañeros con un toque: les llega al celular.</li>
            </ul>
          </Tarjeta>
        </>
      )}
    </div>
  );
}

function IngresarCodigo({ ocupado, onUnirse }) {
  const [codigo, setCodigo] = useState('');
  return (
    <Tarjeta className="mt-3">
      <p className="jb-body text-sm text-zinc-300 mb-2">Escribe el código que te pasaron:</p>
      <div className="flex gap-2">
        <input value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
          placeholder="Ej. K7M2Q" autoCapitalize="characters" className={inputCls + ' flex-1 rounded-xl tracking-widest text-center text-lg'} />
        <button onClick={() => onUnirse(codigo)} disabled={ocupado || codigo.length < 4} className={btnPrimary + ' rounded-xl'}>
          {ocupado ? <Loader2 className="animate-spin" size={16} /> : 'Entrar'}
        </button>
      </div>
    </Tarjeta>
  );
}

function ElegirReto({ dias, setDias, inicio, setInicio }) {
  const lunes = proximoLunes();
  const chip = activo => `jb-body text-sm py-2.5 rounded-xl border transition-colors ${activo ? 'bg-orange-500 border-orange-500 text-zinc-950 font-semibold' : 'bg-zinc-950 border-zinc-800 text-zinc-300'}`;
  return (
    <>
      <p className="jb-body text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Duración del reto</p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[14, 28, 56].map(d => <button key={d} type="button" onClick={() => setDias(d)} className={chip(dias === d)}>{d} días</button>)}
      </div>
      <p className="jb-body text-xs text-zinc-500 uppercase tracking-wider mb-1.5">¿Cuándo empiezan?</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button type="button" onClick={() => setInicio(hoyISO())} className={chip(inicio === hoyISO())}>Hoy</button>
        <button type="button" onClick={() => setInicio(lunes)} className={chip(inicio === lunes)}>Lunes {fechaCorta(lunes)}</button>
      </div>
    </>
  );
}

function AyudaWhatsApp() {
  return (
    <p className="jb-body text-[11px] text-zinc-500 mt-1">
      Para sacarlo: en tu grupo de WhatsApp toca el nombre del grupo → <b>Invitar al grupo mediante enlace</b> → <b>Copiar enlace</b>.
    </p>
  );
}

function CrearEquipo({ nombre, onCancelar, onCreado }) {
  const primero = String(nombre || '').trim().split(/\s+/)[0];
  const [apodo, setApodo] = useState('');
  const titulo = `Team Beast de ${primero.length >= 2 ? primero.charAt(0).toUpperCase() + primero.slice(1).toLowerCase() : 'tu nombre'}`;
  const [dias, setDias] = useState(28);
  const [inicio, setInicio] = useState(proximoLunes());
  const [whatsapp, setWhatsapp] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');

  async function crear() {
    setError('');
    setOcupado(true);
    const { r, ok, error: e } = await llamar('equipo_crear', { p_nombre: apodo.trim() || null, p_dias: dias, p_inicio: inicio, p_whatsapp: whatsapp.trim() || null });
    setOcupado(false);
    if (!ok) { setError(mensajeError(r, e)); return; }
    vibrar(30);
    showToast('🦍 ¡Tu equipo está listo! Ahora invita a tu gente.');
    onCreado(r.id);
  }

  return (
    <div className="pt-2">
      <button onClick={onCancelar} className="jb-body text-sm text-zinc-400 hover:text-zinc-200 flex items-center gap-1 mb-3"><ChevronLeft size={16} /> Volver</button>
      <h1 className="jb-display text-3xl text-zinc-50 mb-1">CREA TU EQUIPO</h1>
      <p className="jb-body text-sm text-zinc-400 mb-5">Invita a tu pareja, tu familia o tus compañeros del trabajo. Hasta 30 personas.</p>
      <Tarjeta>
        <p className="jb-body text-xs text-zinc-500 uppercase tracking-wider mb-1">Tu equipo se llamará</p>
        <p className="jb-display text-2xl text-zinc-50 leading-tight">{titulo.toUpperCase()} 🦍</p>
        <p className="jb-display text-lg text-orange-400 mb-4 min-h-[1.75rem]">{apodo.trim() ? apodo.trim().toUpperCase() : ''}</p>
        <p className="jb-body text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Apodo del equipo (opcional)</p>
        <input value={apodo} onChange={e => setApodo(e.target.value.slice(0, 24))} placeholder="Ej. Los Imparables"
          className={inputCls + ' w-full rounded-xl mb-1'} />
        <p className="jb-body text-[11px] text-zinc-500 mb-4">Hasta 24 letras. Se verá así: "{titulo} · {apodo.trim() || 'Los Imparables'}". Lo puedes cambiar después.</p>
        <ElegirReto dias={dias} setDias={setDias} inicio={inicio} setInicio={setInicio} />
        <p className="jb-body text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Enlace de su grupo de WhatsApp (opcional)</p>
        <input value={whatsapp} onChange={e => setWhatsapp(e.target.value.trim())} placeholder="https://chat.whatsapp.com/..."
          inputMode="url" className={inputCls + ' w-full rounded-xl'} />
        <AyudaWhatsApp />
        {error && <p className="jb-body text-sm text-red-400 mt-3">{error}</p>}
        <button onClick={crear} disabled={ocupado} className={btnPrimary + ' w-full py-3 mt-5'}>
          {ocupado ? <Loader2 className="animate-spin" size={16} /> : 'Crear equipo'}
        </button>
      </Tarjeta>
    </div>
  );
}

function Casilla({ estado }) {
  const base = 'w-full max-w-[2.25rem] aspect-square rounded-lg flex items-center justify-center text-xs font-bold jb-body';
  if (estado === 'ok') return <span className={`${base} bg-orange-500 text-zinc-950`} title="3 comidas o más">✓</span>;
  if (estado === 'medio') return <span className={`${base} bg-orange-500/20 text-orange-300 border border-orange-500/40`} title="1 o 2 comidas">–</span>;
  if (estado === 'no') return <span className={`${base} bg-zinc-800 text-zinc-600`} title="Sin registro">✗</span>;
  if (estado === 'hoy') return <span className={`${base} border border-dashed border-orange-500/70 text-orange-500/70`} title="Hoy, todavía sin registrar">·</span>;
  if (estado === 'futuro') return <span className={`${base} bg-zinc-900 border border-zinc-800`} />;
  return <span className={`${base} opacity-0`} />;
}

function EquipoDetalle({ id, username, onVolver, onSalio, onAnimosVistos }) {
  const [eq, setEq] = useState(null);
  const [semana, setSemana] = useState(null); // lunes de la semana que se ve (null = la actual)
  const [abiertoRef, setAbiertoRef] = useState(null);
  const [animosNuevos, setAnimosNuevos] = useState([]);
  const [ref, setRef] = useState(null); // código de invitación personal (10% para el amigo)
  const [editar, setEditar] = useState(false);
  const [error, setError] = useState('');

  async function cargar(lunes = semana) {
    const { r, ok, error: e } = await llamar('equipo_ver', { p_id: id, p_fecha: lunes });
    if (!ok) { setError(mensajeError(r, e)); return; }
    setError('');
    setEq(r);
    if (r.animos?.length) {
      setAnimosNuevos(r.animos);
      supabase.rpc('equipo_animos_vistos', { p_id: id }).then(() => onAnimosVistos?.());
    }
  }
  useEffect(() => { cargar(semana); }, [id, semana]);
  const [actividad, setActividad] = useState(null);
  function cargarActividad() {
    llamar('equipo_actividad', { p_id: id }).then(({ r, ok }) => setActividad(ok ? r.eventos || [] : []));
  }
  useEffect(() => { cargarActividad(); }, [id]);
  useEffect(() => {
    supabase.rpc('mi_codigo_invitacion').then(({ data, error: e }) => { if (!e && data?.codigo) setRef(data.codigo); });
  }, [username]);

  async function animar(m, tipo) {
    setAbiertoRef(null);
    setEq(v => ({ ...v, miembros: v.miembros.map(x => (x.ref === m.ref ? { ...x, animado_hoy: true } : x)) }));
    const { r, ok, error: e } = await llamar('equipo_animar', { p_id: id, p_ref: m.ref, p_tipo: tipo.tipo });
    if (ok || r?.ya) { vibrar(20); showToast(`${tipo.emoji} Ánimo enviado a ${m.nombre}`); cargarActividad(); }
    else { showToast(mensajeError(r, e), 'error'); cargar(); }
  }

  async function salir() {
    if (!window.confirm(eq.oficial ? '¿Seguro que quieres salir del Team Beast?' : `¿Seguro que quieres salir de ${nombreCompleto(eq)}?`)) return;
    const { ok, r, error: e } = await llamar('equipo_salir', { p_id: id });
    if (!ok) { showToast(mensajeError(r, e), 'error'); return; }
    showToast('Saliste del equipo. Cuando quieras, vuelves 🦍');
    onSalio();
  }

  async function copiarEnlace() {
    try { await navigator.clipboard.writeText(linkEquipo(eq.codigo, ref)); showToast('📋 Enlace copiado'); }
    catch { showToast(`Tu código es ${eq.codigo}`); }
  }

  if (error && !eq) {
    return (
      <div className="pt-2">
        <button onClick={onVolver} className="jb-body text-sm text-zinc-400 hover:text-zinc-200 flex items-center gap-1 mb-3"><ChevronLeft size={16} /> Mis equipos</button>
        <p className="jb-body text-sm text-red-400">{error}</p>
      </div>
    );
  }
  if (!eq) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-orange-500" size={24} /></div>;

  const mesReto = MESES[aFecha(eq.inicio).getMonth()];
  const subtitulo = eq.oficial ? `Reto de ${mesReto} con Jonah` : `Reto de ${eq.dias} días`;
  const empezo = eq.dia_actual > 0;
  const avance = Math.min(1, eq.dia_actual / eq.dias);
  const hoy = hoyISO();
  const indiceHoy = Math.round((aFecha(hoy) - aFecha(eq.lunes)) / 86400000);

  return (
    <div className="pt-2">
      <button onClick={onVolver} className="jb-body text-sm text-zinc-400 hover:text-zinc-200 flex items-center gap-1 mb-3"><ChevronLeft size={16} /> Mis equipos</button>

      <div className="flex items-start justify-between gap-3 mb-1">
        <h1 className="jb-display text-3xl text-zinc-50 leading-tight break-words min-w-0">{eq.nombre.toUpperCase()}{eq.oficial ? ' 🦍' : ''}</h1>
        {eq.soy_capitan && !eq.oficial && (
          <button onClick={() => setEditar(v => !v)} className="p-2 text-zinc-500 hover:text-orange-400 shrink-0" aria-label="Editar apodo y grupo de WhatsApp"><Pencil size={16} /></button>
        )}
      </div>
      {eq.apodo && <p className="jb-display text-xl text-orange-400 -mt-1 mb-1">{eq.apodo.toUpperCase()}</p>}
      <p className="jb-body text-sm text-orange-300 mb-3">{subtitulo} · {eq.miembros.length} {eq.miembros.length === 1 ? 'integrante' : 'integrantes'}</p>

      {editar && <EditarEquipo eq={eq} onListo={() => { setEditar(false); cargar(); }} />}

      {animosNuevos.length > 0 && (
        <Tarjeta className="border-orange-500/50 mb-3">
          {animosNuevos.slice(0, 5).map((a, i) => {
            const t = ANIMOS.find(x => x.tipo === a.tipo) || ANIMOS[0];
            return <p key={i} className="jb-body text-sm text-zinc-200">{t.emoji} <b>{a.de}</b> te mandó ánimo: {t.texto}</p>;
          })}
          {animosNuevos.length > 5 && <p className="jb-body text-xs text-zinc-500 mt-1">y {animosNuevos.length - 5} más 🔥</p>}
        </Tarjeta>
      )}

      <Tarjeta className="mb-3">
        {eq.terminado ? (
          <p className="jb-display text-xl text-zinc-50">¡RETO TERMINADO! 🏆</p>
        ) : empezo ? (
          <>
            <div className="flex items-baseline justify-between mb-2">
              <p className="jb-display text-xl text-zinc-50">DÍA {eq.dia_actual} DE {eq.dias}</p>
              <p className="jb-body text-xs text-zinc-500">termina el {fechaCorta(eq.fin)}</p>
            </div>
            <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full" style={{ width: `${avance * 100}%` }} />
            </div>
          </>
        ) : (
          <p className="jb-display text-xl text-zinc-50">EMPIEZA EL {fechaLarga(eq.inicio).toUpperCase()}</p>
        )}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="bg-zinc-950/60 rounded-xl p-3">
            <p className="jb-display text-2xl text-orange-400 tabular-nums">{eq.comidas_semana}</p>
            <p className="jb-body text-[11px] text-zinc-500">comidas registradas por el equipo esta semana</p>
          </div>
          <div className="bg-zinc-950/60 rounded-xl p-3">
            <p className="jb-display text-2xl text-zinc-100 tabular-nums">{eq.comidas_reto}</p>
            <p className="jb-body text-[11px] text-zinc-500">en todo el reto</p>
          </div>
        </div>
      </Tarjeta>

      {eq.terminado && eq.soy_capitan && !eq.oficial && <NuevoReto id={id} onListo={() => { setSemana(null); cargar(null); }} />}

      <Tarjeta className="mb-3 px-3">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setSemana(masDias(eq.lunes, -7))} disabled={!eq.puede_atras}
            className="p-1.5 text-zinc-400 disabled:opacity-20" aria-label="Semana anterior"><ChevronLeft size={18} /></button>
          <p className="jb-body text-sm text-zinc-300">Semana del {fechaCorta(eq.lunes)} al {fechaCorta(masDias(eq.lunes, 6))}</p>
          <button onClick={() => setSemana(masDias(eq.lunes, 7))} disabled={!eq.puede_adelante}
            className="p-1.5 text-zinc-400 disabled:opacity-20" aria-label="Semana siguiente"><ChevronRight size={18} /></button>
        </div>
        <div className="space-y-3">
          {eq.miembros.map((m, i) => (
            <div key={m.ref} className={m.yo ? 'bg-orange-500/10 rounded-xl -mx-1.5 px-1.5 py-1.5' : ''}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-5 text-center jb-display text-sm text-zinc-500 tabular-nums shrink-0">{i + 1}</span>
                <button onClick={() => !m.yo && setAbiertoRef(abiertoRef === m.ref ? null : m.ref)} disabled={m.yo}
                  className="flex-1 min-w-0 text-left flex items-baseline gap-2">
                  <span className="jb-body text-sm text-zinc-100 truncate">
                    {m.nombre}{m.capitan ? ' 🦍' : ''}{m.yo ? <span className="text-orange-400"> (tú)</span> : ''}
                  </span>
                  {!m.yo && <span className="jb-body text-[10px] text-zinc-500 shrink-0">{m.animado_hoy ? '✓ ánimo enviado' : '💪 dar ánimo'}</span>}
                </button>
                <span className="jb-display text-base text-zinc-100 tabular-nums shrink-0">{m.puntos} <span className="jb-body text-[10px] text-zinc-500">pts</span></span>
              </div>
              <div className="grid grid-cols-7 gap-1 pl-7">
                {m.dias.map((d, j) => (
                  <span key={j} className="flex flex-col items-center gap-0.5">
                    {i === 0 && <span className={`jb-body text-[10px] ${j === indiceHoy ? 'text-orange-400 font-semibold' : 'text-zinc-500'}`}>{DIAS_CORTOS[j]}</span>}
                    <Casilla estado={d} />
                  </span>
                ))}
              </div>
              {abiertoRef === m.ref && (
                <div className="flex gap-2 mt-2 pl-7">
                  {m.animado_hoy ? (
                    <p className="jb-body text-xs text-zinc-500 py-2">Hoy ya le diste ánimo. Mañana puedes otra vez 🦍</p>
                  ) : ANIMOS.map(t => (
                    <button key={t.tipo} onClick={() => animar(m, t)}
                      className="flex-1 jb-body text-xs py-2 rounded-xl bg-zinc-950 border border-zinc-700 hover:border-orange-500 text-zinc-100">
                      {t.emoji} {t.texto}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="jb-body text-[11px] text-zinc-500 mt-4 leading-relaxed">
          <span className="text-orange-400">✓</span> 3+ comidas = 10 pts · <span className="text-orange-300">–</span> 1 o 2 comidas = 5 pts · ✗ sin registro. Los puntos son de todo el reto. Toca a un compañero para darle ánimo.
        </p>
      </Tarjeta>

      <ActividadEquipo eventos={actividad} miembros={eq.miembros}
        onAnimar={(ev, tipo) => {
          const m = eq.miembros.find(x => x.ref === ev.quien_ref);
          if (m) animar(m, tipo);
        }} />

      {eq.whatsapp ? (
        <a href={eq.whatsapp} target="_blank" rel="noopener noreferrer" className={btnPrimary + ' w-full py-3 mb-3 rounded-xl'}>
          <MessageCircle size={16} /> Ir al chat del equipo
        </a>
      ) : eq.soy_capitan && !editar ? (
        <button onClick={() => setEditar(true)} className={btnGhost + ' w-full py-3 mb-3 rounded-xl'}>
          <MessageCircle size={16} /> Agregar el grupo de WhatsApp del equipo
        </button>
      ) : null}

      {eq.miembros.length < eq.max_miembros && (
        <Tarjeta className="mb-3">
          <p className="jb-display text-base text-zinc-100 mb-1">INVITA A TU GENTE</p>
          <p className="jb-body text-xs text-zinc-400 mb-3">
            Mándales el enlace por WhatsApp. {ref ? 'Con tu enlace tienen además 10% de descuento en su primer plan.' : ''}
          </p>
          {!eq.oficial && (
            <p className="jb-body text-xs text-zinc-500 mb-3">Código del equipo: <span className="jb-display text-lg text-orange-400 tracking-widest ml-1">{eq.codigo}</span></p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <a href={`https://wa.me/?text=${encodeURIComponent(textoInvitacionEquipo(eq, ref))}`} target="_blank" rel="noopener noreferrer"
              className={btnPrimary + ' py-2.5 rounded-xl text-sm'}>
              <MessageCircle size={15} /> WhatsApp
            </a>
            <button onClick={copiarEnlace} className={btnGhost + ' py-2.5 rounded-xl text-sm'}><Copy size={15} /> Copiar enlace</button>
          </div>
        </Tarjeta>
      )}

      <button onClick={salir} className="mx-auto mt-4 jb-body text-xs text-zinc-600 hover:text-red-400 flex items-center gap-1">
        <LogOut size={12} /> Salir del equipo
      </button>
    </div>
  );
}

function EditarEquipo({ eq, onListo }) {
  const [apodo, setApodo] = useState(eq.apodo || '');
  const [whatsapp, setWhatsapp] = useState(eq.whatsapp || '');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  async function guardar() {
    setError('');
    setOcupado(true);
    const { r, ok, error: e } = await llamar('equipo_editar', { p_id: eq.id, p_nombre: eq.oficial ? null : apodo.trim() || null, p_whatsapp: whatsapp.trim() || null });
    setOcupado(false);
    if (!ok) { setError(mensajeError(r, e)); return; }
    showToast('✅ Equipo actualizado');
    onListo();
  }
  return (
    <Tarjeta className="mb-3">
      {!eq.oficial && (
        <>
          <p className="jb-body text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Apodo del equipo (opcional)</p>
          <input value={apodo} onChange={e => setApodo(e.target.value.slice(0, 24))} placeholder="Ej. Los Imparables"
            className={inputCls + ' w-full rounded-xl mb-3'} />
        </>
      )}
      <p className="jb-body text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Enlace del grupo de WhatsApp</p>
      <input value={whatsapp} onChange={e => setWhatsapp(e.target.value.trim())} placeholder="https://chat.whatsapp.com/..."
        inputMode="url" className={inputCls + ' w-full rounded-xl'} />
      <AyudaWhatsApp />
      {error && <p className="jb-body text-sm text-red-400 mt-2">{error}</p>}
      <button onClick={guardar} disabled={ocupado} className={btnPrimary + ' w-full py-2.5 mt-3 rounded-xl'}>
        {ocupado ? <Loader2 className="animate-spin" size={16} /> : 'Guardar'}
      </button>
    </Tarjeta>
  );
}

function NuevoReto({ id, onListo }) {
  const [dias, setDias] = useState(28);
  const [inicio, setInicio] = useState(proximoLunes());
  const [ocupado, setOcupado] = useState(false);
  async function empezar() {
    setOcupado(true);
    const { r, ok, error } = await llamar('equipo_nuevo_reto', { p_id: id, p_dias: dias, p_inicio: inicio });
    setOcupado(false);
    if (!ok) { showToast(mensajeError(r, error), 'error'); return; }
    showToast('🔥 ¡Nuevo reto en marcha! Vamos otra vez.');
    onListo();
  }
  return (
    <Tarjeta className="mb-3 border-orange-500/40">
      <p className="jb-display text-base text-zinc-100 mb-3">ARRANCA OTRO RETO</p>
      <ElegirReto dias={dias} setDias={setDias} inicio={inicio} setInicio={setInicio} />
      <button onClick={empezar} disabled={ocupado} className={btnPrimary + ' w-full py-3 rounded-xl'}>
        {ocupado ? <Loader2 className="animate-spin" size={16} /> : 'Empezar nuevo reto'}
      </button>
    </Tarjeta>
  );
}

// "hace 5 min", "hace 2 h", "ayer", "hace 3 días".
function haceCuanto(iso) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  const dias = Math.round((aFecha(hoyISO()) - aFecha(aISO(new Date(iso)))) / 86400000);
  if (dias <= 0) return `hace ${h} h`;
  if (dias === 1) return 'ayer';
  return `hace ${dias} días`;
}

function textoEvento(ev) {
  const quien = ev.quien_yo ? 'Tú' : ev.quien;
  if (ev.tipo === 'animo') {
    const t = ANIMOS.find(x => x.tipo === ev.detalle) || ANIMOS[0];
    const para = ev.para_yo ? 'ti' : ev.para;
    return { emoji: t.emoji, texto: <><b>{quien}</b> {ev.quien_yo ? 'le mandaste' : 'le mandó'} ánimo a <b>{para}</b>: {t.texto}</> };
  }
  if (ev.tipo === 'dia') return { emoji: '✅', texto: <><b>{quien}</b> {ev.quien_yo ? 'cumpliste tu' : 'cumplió su'} día: {ev.detalle} comidas registradas</>, animo: ANIMOS[2] };
  if (ev.tipo === 'racha') return { emoji: '🏆', texto: <><b>{quien}</b> {ev.quien_yo ? 'llevas' : 'lleva'} {ev.detalle} días seguidos registrando</>, animo: ANIMOS[1] };
  return { emoji: '👋', texto: <><b>{quien}</b> {ev.quien_yo ? 'te uniste' : 'se unió'} al equipo</>, animo: ANIMOS[0] };
}

// ACTIVIDAD DEL EQUIPO: lo que pasa en el equipo, sin escribir. En cada
// logro de un compañero hay un botón para mandarle ánimo ahí mismo.
function ActividadEquipo({ eventos, miembros, onAnimar }) {
  const [verTodo, setVerTodo] = useState(false);
  if (!eventos) return null;
  const animado = ref => miembros.find(m => m.ref === ref)?.animado_hoy;
  const lista = verTodo ? eventos : eventos.slice(0, 8);
  return (
    <Tarjeta className="mb-3">
      <p className="jb-display text-base text-zinc-100 mb-1">ACTIVIDAD DEL EQUIPO</p>
      <p className="jb-body text-[11px] text-zinc-500 mb-3">Lo que pasa en el equipo esta semana. Toca 🔥 para darle ánimo a quien lo está logrando.</p>
      {eventos.length === 0 ? (
        <p className="jb-body text-sm text-zinc-400">Todavía no hay movimiento. Registra tus comidas y dale ánimo a un compañero: aquí lo verá todo el equipo 🦍</p>
      ) : (
        <ul className="space-y-2.5">
          {lista.map((ev, i) => {
            const { emoji, texto, animo } = textoEvento(ev);
            const puede = animo && !ev.quien_yo;
            const ya = puede && animado(ev.quien_ref);
            return (
              <li key={i} className="flex items-start gap-2.5">
                <span className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-sm shrink-0">{emoji}</span>
                <span className="flex-1 min-w-0">
                  <span className="block jb-body text-sm text-zinc-200 leading-snug">{texto}</span>
                  <span className="block jb-body text-[10px] text-zinc-500">{haceCuanto(ev.cuando)}</span>
                </span>
                {puede && (
                  <button onClick={() => !ya && onAnimar(ev, animo)} disabled={ya}
                    className={`shrink-0 jb-body text-xs px-2.5 py-1.5 rounded-full border ${ya ? 'border-zinc-800 text-zinc-600' : 'border-orange-500/50 text-orange-300 hover:bg-orange-500/10'}`}>
                    {ya ? '✓' : `${animo.emoji} ${animo.texto}`}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {eventos.length > 8 && (
        <button onClick={() => setVerTodo(v => !v)} className="mt-3 jb-body text-xs text-orange-400">
          {verTodo ? 'Ver menos' : `Ver todo (${eventos.length})`}
        </button>
      )}
    </Tarjeta>
  );
}
