// EQUIPOS: retos en grupo (pestaña "Comunidad" → "Mis equipos" de la app
// del alumno; el muro está en src/comunidad.jsx).
//
// - El Team Beast oficial: el reto con Jonah de capitán (Jonah elige
//   cuándo empieza y cuánto dura).
// - Equipos propios: "Team Beast de [capitán]" (el nombre lo pone la base,
//   no se elige). Los arma un alumno, invita por WhatsApp con un
//   código o un enlace (jonahbeast.com/?equipo=CODIGO), máximo 30.
// - Cada día cuenta: ✓ = 3 o más comidas registradas (10 puntos),
//   – = 1 o 2 comidas (5 puntos), ✗ = ninguna. El ranking premia la
//   constancia, nunca los kilos. De los compañeros solo se ve su nombre
//   corto, sus casillas y sus puntos (lo arma la base en equipo_ver).
// - Ánimos de un toque (💪 🔥 👏) que le llegan al compañero como aviso.
// - La conversación del equipo va en su grupo de WhatsApp (botón).
// - Tres tipos de reto (equipos.objetivo): 🍽️ comer mejor, 🤝 meta juntos
//   (bajar de peso en equipo) y 🏁 carrera (gana el primero en llegar).
//   Meta y premio del capitán; podio 🥇🥈🥉 siempre por constancia. El peso
//   cuenta solo si cada uno elige compartir su avance (nunca se ve el peso,
//   solo kilos bajados), con tope de 1% por semana. Al terminar, la tarea
//   diaria api/cron/equipos-cierre.js reparte las medallas.
// - Los retos de peso pueden ser para BAJAR o para SUBIR (equipos.sentido;
//   subir: como mucho ½ kg por semana, solo metas en kilos).
// - Crear (o cambiar) un reto se hace PASO A PASO (PasosReto): qué quieren
//   lograr → cómo quieren jugar → la meta → cuándo → el premio → resumen,
//   una pregunta por pantalla (pedido por Jonah el 15 de octubre).
import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Loader2, MessageCircle, Plus, Copy, KeyRound, LogOut, Pencil, Users } from 'lucide-react';
import { supabase } from './supabaseClient';
import { btnPrimary, btnGhost, inputCls, showToast, confirmar, vibrar, Skeleton } from './App.jsx';
import { RuedaFecha } from './regla.jsx';

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
const OBJETIVOS = [
  { id: 'comer', emoji: '🍽️', titulo: 'Comer mejor', ayuda: 'Gana el más constante registrando sus comidas.' },
  { id: 'juntos', emoji: '🤝', titulo: 'Meta juntos', ayuda: 'Bajar de peso en equipo: se ayudan para llegar a una meta común. Ideal para la familia.' },
  { id: 'carrera', emoji: '🏁', titulo: 'Carrera', ayuda: 'Compiten entre ustedes: gana el primero que llegue a la meta.' },
];
const TIPOS_META = {
  juntos: [
    { id: 'kg_cada', texto: 'Cada uno baja', unidad: 'kg' },
    { id: 'kg_total', texto: 'Entre todos', unidad: 'kg' },
    { id: 'pct_total', texto: 'Entre todos', unidad: '%' },
  ],
  carrera: [
    { id: 'carrera_kg', texto: 'El primero en bajar', unidad: 'kg' },
    { id: 'carrera_pct', texto: 'El primero en bajar', unidad: '%' },
  ],
};
const EJEMPLO_PREMIO = {
  comer: 'Ej. El 🥇 elige la próxima salida',
  juntos: 'Ej. Si llegamos, parrillada familiar 🍖',
  carrera: 'Ej. Los demás le invitan el ceviche 🐟',
};
export const MEDALLAS = {
  oro: { emoji: '🥇', texto: 'Oro' },
  plata: { emoji: '🥈', texto: 'Plata' },
  bronce: { emoji: '🥉', texto: 'Bronce' },
  meta: { emoji: '🏆', texto: 'Meta del equipo' },
  meta_personal: { emoji: '🎯', texto: 'Meta cumplida' },
  carrera: { emoji: '🏁', texto: 'Ganó la carrera' },
};
const fmtNum = n => (Math.round(Number(n || 0) * 10) / 10).toLocaleString('es-PE');
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
    return `Únete conmigo al Team Beast 🦍, el reto en grupo con Jonah en Jonah Beast Fuel. Registramos lo que comemos y nos damos ánimo: el cambio llega poco a poco, comida a comida. Entra aquí: ${link}`;
  }
  // Con las reglas del reto, para que se entienda antes de entrar.
  if (eq.objetivo && eq.objetivo !== 'comer' && eq.meta_tipo) {
    const subir = eq.sentido === 'subir';
    return `¡Únete a mi equipo, el ${nombreCompleto(eq)}, en Jonah Beast Fuel! 🦍\n\n`
      + `${fraseReto(eq.objetivo, eq.sentido, eq.meta_tipo, eq.meta_valor)}\n`
      + `📅 Del ${fechaLarga(eq.inicio)} al ${fechaLarga(eq.fin)}\n`
      + (eq.premio ? `🎁 Premio: ${eq.premio}\n` : '')
      + `\nEntra con este enlace: ${link} (o pon el código ${eq.codigo} en Comunidad → Mis equipos). `
      + `Al entrar, anota tu peso en "Mi cuerpo" y en "TU AVANCE" toca "${eq.objetivo === 'carrera' ? 'Competir con mi avance' : 'Mostrar mi avance'}". `
      + `Nadie ve tu peso, solo los kilos que ${subir ? 'subes' : 'bajas'} 🔒 Vamos juntos, comida a comida 💪`;
  }
  return `¡Únete a mi equipo, el ${nombreCompleto(eq)}, en Jonah Beast Fuel! 🦍 Es un reto en grupo: registramos lo que comemos y nos damos ánimo, comida a comida.${eq.premio ? ` 🎁 Premio: ${eq.premio}.` : ''} Entra con este enlace: ${link} (o pon el código ${eq.codigo} en Comunidad → Mis equipos)`;
}

// Recordatorio del capitán para los que todavía no están listos.
function textoRecordatorio(eq, ref) {
  const boton = eq.objetivo === 'carrera' ? 'Competir con mi avance' : 'Mostrar mi avance';
  return `¡Equipo! 🦍 Para que sus kilos cuenten en el reto ${nombreCompleto(eq)} (${fraseReto(eq.objetivo, eq.sentido, eq.meta_tipo, eq.meta_valor).replace(/^\S+\s/, '')}), hagan estos 2 pasos en la app:\n`
    + `1) Entren al equipo (Comunidad → Mis equipos) y toquen "${boton}".\n`
    + `2) Toquen "⚖️ Anotar mi peso" ahí mismo.\n`
    + `Nadie ve su peso, solo los kilos que ${eq.sentido === 'subir' ? 'suben' : 'bajan'} 🔒 Entren aquí: ${linkEquipo(eq.codigo, ref)}`;
}

// "🏁 Carrera: gana el primero en bajar 3 kg", "🤝 Juntos: cada uno sube 2 kg"…
function fraseReto(objetivo, sentido, metaTipo, metaValor) {
  const v = fmtNum(metaValor);
  const subir = sentido === 'subir';
  if (objetivo === 'comer') {
    return `🍽️ Comer mejor: gana el más constante${Number(metaValor) > 0 ? ` · meta de ${v} comidas entre todos` : ''}`;
  }
  if (metaTipo === 'kg_cada') return `🤝 Juntos: cada uno ${subir ? 'sube' : 'baja'} ${v} kg`;
  if (metaTipo === 'kg_total') return `🤝 Juntos: entre todos ${subir ? 'suben' : 'bajan'} ${v} kg`;
  if (metaTipo === 'pct_total') return `🤝 Juntos: entre todos bajan el ${v}% de su peso`;
  if (metaTipo === 'carrera_pct') return `🏁 Carrera: gana el primero en bajar el ${v}% de su peso`;
  return `🏁 Carrera: gana el primero en ${subir ? 'subir' : 'bajar'} ${v} kg`;
}

// "🏁 Carrera para bajar", "🤝 Subir juntos"… (arriba en el equipo).
function etiquetaReto(eq) {
  const subir = eq.sentido === 'subir';
  if (eq.objetivo === 'juntos') return `🤝 ${subir ? 'Subir' : 'Bajar'} juntos`;
  if (eq.objetivo === 'carrera') return `🏁 Carrera para ${subir ? 'subir' : 'bajar'}`;
  return '🍽️ Comer mejor';
}
const kilosDe = eq => (eq.sentido === 'subir' ? 'kilos ganados' : 'kilos bajados');
const signoPeso = eq => (eq.sentido === 'subir' ? '+' : '−');

const ERRORES = {
  apodo: 'Ese apodo no se puede usar. Prueba con otro (de 2 a 24 letras, sin groserías ni promesas de kilos).',
  nombre: 'Ese nombre no se puede usar. Prueba con otro (de 3 a 40 letras, sin groserías ni promesas de kilos).',
  whatsapp: 'Ese enlace no es de un grupo de WhatsApp. Debe empezar con https://chat.whatsapp.com/',
  muchos: 'Ya estás en 3 equipos, que es el máximo. Sal de uno para entrar a otro.',
  lleno: 'Ese equipo ya está completo.',
  no_existe: 'No encontramos un equipo con ese código. Revísalo y prueba otra vez.',
  datos: 'Revisa los datos e intenta de nuevo.',
  ya_capitan: 'Ya eres capitán de un equipo. En otros equipos puedes estar como integrante.',
  premio: 'Ese premio no se puede usar. Escríbelo de otra forma (de 2 a 80 letras, sin groserías).',
  meta: 'Revisa la meta: falta el número o no corresponde al tipo de reto.',
  meta_rapida: 'Esa meta es muy rápida para hacerla bien. Dales más tiempo o pon una meta menor (como mucho 1 kg o 1% por semana).',
  meta_rapida_subir: 'Esa meta es muy rápida para subir bien. Dales más tiempo o pon una meta menor (como mucho ½ kg por semana: más rápido es grasa, no músculo).',
  oficial_comer: 'El Team Beast es un reto de comer mejor.',
  en_curso: 'El reto todavía no termina.',
};
const mensajeError = (r, error) => (error ? 'No se pudo conectar. Revisa tu internet e intenta de nuevo.' : ERRORES[r?.error] || 'Algo falló. Intenta de nuevo.');

export async function llamar(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  return { r: data, ok: !error && data && !data.error, error };
}

export function Tarjeta({ children, className = '' }) {
  return <div className={`bg-zinc-900 border border-zinc-800 rounded-2xl p-4 ${className}`}>{children}</div>;
}

export function EquipoTab({ username, nombre, onAnimosVistos, onAnotarPeso, pesoFecha, sinTitulo = false }) {
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

  // nivel: 'avance' (entra compitiendo) o 'total' (suma su avance en
  // privado), elegido con el botón de la invitación; sin nivel, solo
  // constancia.
  async function unirse(codigo, porEnlace = false, nivel = null) {
    setOcupado(true);
    const { r, ok, error } = await llamar('equipo_unirse', { p_codigo: codigo, p_por_enlace: porEnlace });
    if (ok && nivel && r?.id) await llamar('equipo_compartir', { p_id: r.id, p_nivel: nivel });
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
    return <EquipoDetalle id={abierto} username={username} onAnotarPeso={onAnotarPeso} pesoFecha={pesoFecha}
      onVolver={() => { setAbierto(null); cargar(); }}
      onSalio={() => { setAbierto(null); cargar(); }}
      onAnimosVistos={onAnimosVistos} />;
  }
  if (vista === 'crear') {
    return <PasosReto nombre={nombre} onCancelar={() => setVista('lista')}
      onCreado={async id => { await cargar(); setVista('lista'); setAbierto(id); }} />;
  }

  const enOficial = !!mis?.equipos?.some(e => e.oficial);
  const puedeMas = (mis?.equipos?.length || 0) < 3;
  const yaCapitan = !!mis?.equipos?.some(e => e.capitan && !e.oficial);

  return (
    <div className="pt-2">
      {!sinTitulo && (
        <>
          <h1 className="jb-display text-3xl text-zinc-50 mb-1">EQUIPO</h1>
          <p className="jb-body text-sm text-zinc-400 mb-5">
            El cambio llega poco a poco, comida a comida. Y con tu gente al lado, se hace más fácil. 🦍
          </p>
        </>
      )}

      {invitacion && (
        <Tarjeta className="border-orange-500/60 mb-4">
          <p className="jb-body text-[11px] text-orange-300 uppercase tracking-wider mb-1">Te invitaron</p>
          <p className="jb-display text-xl text-zinc-50">{invitacion.nombre}</p>
          {invitacion.apodo && <p className="jb-display text-base text-orange-400 -mt-0.5">{invitacion.apodo}</p>}
          <p className="jb-body text-xs text-zinc-400 mb-3">{invitacion.miembros} {invitacion.miembros === 1 ? 'integrante' : 'integrantes'}</p>
          {(() => {
            // "Así se juega este reto": cómo se gana, fechas, premio y, en los
            // de peso, que nadie ve su peso. En los de peso se entra ya
            // compitiendo (carrera) o sumando en privado (juntos) con un toque.
            const inv = invitacion;
            const conPesoInv = !inv.oficial && inv.objetivo && inv.objetivo !== 'comer' && inv.meta_tipo;
            const nivel = inv.objetivo === 'carrera' ? 'avance' : 'total';
            const lineas = inv.oficial || !inv.objetivo ? [] : [
              fraseReto(inv.objetivo, inv.sentido, inv.meta_tipo, inv.meta_valor),
              inv.inicio && inv.fin ? `📅 Del ${fechaLarga(inv.inicio)} al ${fechaLarga(inv.fin)}` : null,
              inv.premio ? (/^\p{Extended_Pictographic}/u.test(inv.premio) ? inv.premio : `🎁 ${inv.premio}`) : null,
              conPesoInv ? `🔒 Nadie ve tu peso, solo los kilos que ${inv.sentido === 'subir' ? 'subes' : 'bajas'}` : null,
            ].filter(Boolean);
            return (
              <>
                {lineas.length > 0 && (
                  <>
                    <p className="jb-body text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Así se juega este reto</p>
                    <ul className="mb-4">
                      {lineas.map((l, i) => (
                        <li key={i} className={`jb-body text-sm py-1.5 ${i ? 'border-t border-zinc-800 text-zinc-200' : 'font-semibold text-zinc-50'}`}>{l}</li>
                      ))}
                    </ul>
                  </>
                )}
                <button onClick={() => unirse(inv.codigo, true, conPesoInv ? nivel : null)} disabled={ocupado} className={btnPrimary + ' w-full py-3'}>
                  {ocupado ? <Loader2 className="animate-spin" size={16} /> : conPesoInv ? (nivel === 'avance' ? 'Unirme y competir' : 'Unirme y sumar mi avance') : 'Unirme al equipo'}
                </button>
                {conPesoInv && (
                  <button onClick={() => unirse(inv.codigo, true)} disabled={ocupado}
                    className="block mx-auto jb-body text-xs text-zinc-400 hover:text-zinc-200 mt-2.5">Unirme solo con mi constancia</button>
                )}
              </>
            );
          })()}
          <button onClick={() => { olvidarInvitacionEquipo(); setInvitacion(null); }}
            className="block mx-auto jb-body text-xs text-zinc-500 hover:text-zinc-300 mt-2">Ahora no</button>
        </Tarjeta>
      )}

      {!mis ? (
        <div className="flex flex-col gap-3"><div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3"><div className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-full" /><Skeleton className="h-3.5 w-40" /></div><Skeleton className="h-12 w-full rounded-xl" /></div><div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3"><div className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-full" /><Skeleton className="h-3.5 w-40" /></div><Skeleton className="h-12 w-full rounded-xl" /></div></div>
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
                El reto en grupo con Jonah de capitán. Registra tus comidas, suma puntos y recibe ánimo del equipo.
              </p>
              <p className="relative jb-body text-xs text-zinc-500 mb-4">{mis.oficial.miembros} {mis.oficial.miembros === 1 ? 'integrante' : 'integrantes'}</p>
              <button onClick={() => unirse(mis.oficial.codigo)} disabled={ocupado || !puedeMas} className={btnPrimary + ' relative w-full py-3'}>
                {ocupado ? <Loader2 className="animate-spin" size={16} /> : 'Unirme al Team Beast'}
              </button>
            </div>
          )}

          {mis.medallas?.length > 0 && <MisMedallas medallas={mis.medallas} />}

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
                      {!e.oficial && <>{etiquetaReto(e)} · </>}{e.miembros} {e.miembros === 1 ? 'integrante' : 'integrantes'}{e.capitan ? ' · eres el capitán' : ''}
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
              <li>Retos para 🍽️ <b>comer mejor</b>, ⬇️ <b>bajar</b> o 💪 <b>subir de peso</b>: 🤝 <b>juntos</b> (si llegan, ganan todos) o en 🏁 <b>carrera</b> (gana el primero en llegar a la meta).</li>
              <li>El podio 🥇🥈🥉 es siempre para los más constantes, no para el que más baja. Tu peso no lo ve nadie: si quieres, compartes solo tus kilos bajados.</li>
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

// Configuración del reto (al crear el equipo o al programar un reto): tipo
// de reto, meta, cuándo empieza, cuánto dura y premio. c = { objetivo,
// metaTipo, metaValor, inicio, dias, hasta, premio }; hasta = fecha final
// elegida a mano (si no, dura `dias`).
const diasDelReto = c => (c.hasta ? Math.round((aFecha(c.hasta) - aFecha(c.inicio)) / 86400000) + 1 : c.dias);

function configInicial(eq) {
  const objetivo = eq?.objetivo || 'comer';
  const dias = eq ? eq.dias : 28;
  return {
    objetivo,
    sentido: eq?.sentido || 'bajar',
    metaTipo: eq?.meta_tipo || (objetivo === 'juntos' ? 'kg_cada' : objetivo === 'carrera' ? 'carrera_kg' : 'comidas'),
    metaValor: eq?.meta_valor != null ? String(eq.meta_valor) : '',
    inicio: eq?.inicio && eq.inicio > hoyISO() ? eq.inicio : proximoLunes(),
    dias: [14, 28, 56].includes(dias) ? dias : 28,
    hasta: eq && ![14, 28, 56].includes(dias) && eq.inicio > hoyISO() ? eq.fin : null,
    premio: eq?.premio || '',
  };
}

const esPct = t => t === 'pct_total' || t === 'carrera_pct';
// "7½ semanas"
const semanasTxt = dias => {
  const s = Math.round((dias / 7) * 2) / 2;
  return `${Math.floor(s)}${s % 1 ? '½' : ''} semanas`;
};

// ¿La meta es sana para el tiempo del reto? Como mucho 1 kg o 1% por
// semana para bajar y ½ kg por semana para subir (igual que la base,
// private.equipo_meta_error). Devuelve { sano: texto } si está bien, o
// { rapido, sugerirDias, maximo } si es muy rápida.
function chequeoMeta(c) {
  if (c.objetivo === 'comer' || c.metaTipo === 'kg_total') return {};
  const v = Number(String(c.metaValor).replace(',', '.'));
  if (!(v > 0)) return {};
  const dias = diasDelReto(c);
  const tope = c.sentido === 'subir' ? 0.5 : 1;
  const semanas = dias / 7;
  if (v <= semanas * tope + 1e-9) {
    const porSemana = v / semanas;
    const gramos = Math.max(50, Math.round((porSemana * 1000) / 50) * 50);
    const ritmo = esPct(c.metaTipo) ? `unos ${fmtNum(porSemana)}% por semana`
      : `${gramos >= 1000 ? `${fmtNum(gramos / 1000)} kg` : `unos ${gramos} g`} por semana`;
    return { sano: `${fmtNum(v)}${esPct(c.metaTipo) ? '%' : ' kg'} en ${semanasTxt(dias)} = ${ritmo}. ¡Meta sana!` };
  }
  const necesita = Math.ceil(v / tope) * 7;
  return { rapido: true, sugerirDias: necesita <= 120 ? necesita : null, maximo: Math.floor(semanas * tope * 10) / 10 };
}

function errorConfig(c, oficial) {
  const dias = diasDelReto(c);
  if (!(dias >= 14 && dias <= 120)) return 'El reto debe durar entre 14 y 120 días.';
  const v = Number(String(c.metaValor).replace(',', '.'));
  if (c.objetivo === 'comer') {
    if (oficial || !String(c.metaValor).trim()) return '';
    return v >= 10 ? '' : 'La meta de comidas debe ser de 10 o más (o déjala vacía).';
  }
  if (!(v > 0)) return 'Elige la meta.';
  if (c.sentido === 'subir' && esPct(c.metaTipo)) return 'Para subir de peso, la meta va en kilos.';
  const ch = chequeoMeta(c);
  if (ch.rapido) {
    const u = esPct(c.metaTipo) ? '%' : ' kg';
    return c.sentido === 'subir'
      ? `Muy rápido para subir bien: en ${semanasTxt(dias)}, como mucho ${fmtNum(ch.maximo)} kg (½ kg por semana; más rápido es grasa, no músculo). Dales más tiempo o baja la meta.`
      : `Muy rápido para hacerlo bien: en ${semanasTxt(dias)}, como mucho ${fmtNum(ch.maximo)}${u}. Dales más tiempo o baja la meta.`;
  }
  return '';
}

function paramsConfig(c) {
  const v = Number(String(c.metaValor).replace(',', '.'));
  const conMeta = c.objetivo !== 'comer' || String(c.metaValor).trim() !== '';
  return {
    p_dias: diasDelReto(c),
    p_inicio: c.inicio,
    p_objetivo: c.objetivo,
    p_meta_tipo: conMeta ? c.metaTipo : null,
    p_meta_valor: conMeta ? v : null,
    p_premio: c.premio.trim() || null,
    p_sentido: c.objetivo === 'comer' ? 'bajar' : c.sentido || 'bajar',
  };
}

function ConfigReto({ c, setC, oficial }) {
  const lunes = proximoLunes();
  const lunes2 = masDias(lunes, 7);
  const chip = activo => `jb-body text-sm py-2.5 px-2 rounded-xl border transition-colors ${activo ? 'bg-orange-500 border-orange-500 text-zinc-950 font-semibold' : 'bg-zinc-950 border-zinc-800 text-zinc-300'}`;
  const cambiar = cambios => setC(v => ({ ...v, ...cambios }));
  const elegirObjetivo = id => cambiar({
    objetivo: id, metaValor: '',
    metaTipo: id === 'juntos' ? 'kg_cada' : id === 'carrera' ? 'carrera_kg' : 'comidas',
  });
  const tipos = TIPOS_META[c.objetivo] || [];
  const tipo = tipos.find(t => t.id === c.metaTipo);
  const obj = OBJETIVOS.find(o => o.id === c.objetivo);
  const err = errorConfig(c, oficial);
  const titulo = t => <p className="jb-body text-xs text-zinc-500 uppercase tracking-wider mb-1.5">{t}</p>;
  return (
    <>
      {!oficial && (
        <>
          {titulo('Tipo de reto')}
          <div className="grid grid-cols-3 gap-2 mb-1.5">
            {OBJETIVOS.map(o => (
              <button key={o.id} type="button" onClick={() => elegirObjetivo(o.id)} className={chip(c.objetivo === o.id)}>
                <span className="block text-base">{o.emoji}</span>{o.titulo}
              </button>
            ))}
          </div>
          <p className="jb-body text-[11px] text-zinc-500 mb-4">{obj?.ayuda}</p>
        </>
      )}

      {c.objetivo === 'comer' ? (
        <>
          {titulo('Meta de comidas entre todos (opcional)')}
          <input value={c.metaValor} onChange={e => cambiar({ metaValor: e.target.value.replace(/[^0-9]/g, '').slice(0, 6) })}
            inputMode="numeric" placeholder="Ej. 500" className={inputCls + ' w-full rounded-xl mb-1'} />
          <p className="jb-body text-[11px] text-zinc-500 mb-4">Si la cumplen, todos ganan la medalla 🏆. Ej.: 6 personas × 3 comidas × 28 días ≈ 500.</p>
        </>
      ) : (
        <>
          {titulo(c.objetivo === 'carrera' ? 'Meta de la carrera' : 'Meta del equipo')}
          <div className={`grid gap-2 mb-2 ${tipos.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {tipos.map(t => (
              <button key={t.id} type="button" onClick={() => cambiar({ metaTipo: t.id })} className={chip(c.metaTipo === t.id) + ' text-xs'}>
                {t.texto} ({t.unidad})
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="jb-body text-sm text-zinc-300 shrink-0">{tipo?.texto}</span>
            <input value={c.metaValor} onChange={e => cambiar({ metaValor: e.target.value.replace(/[^0-9.,]/g, '').slice(0, 5) })}
              inputMode="decimal" placeholder={tipo?.unidad === '%' ? '3' : '5'} className={inputCls + ' w-20 rounded-xl text-center'} />
            <span className="jb-body text-sm text-zinc-300">{tipo?.unidad}</span>
          </div>
          <p className="jb-body text-[11px] text-zinc-500 mb-4">
            {c.objetivo === 'carrera'
              ? 'Gana el primero que llegue (se cuenta con el pesaje de cada semana). Si dos llegan la misma semana, gana el más constante. El podio 🥇🥈🥉 sigue siendo por constancia.'
              : 'Cada uno decide si suma su avance; nadie ve el peso de nadie. Con % es más justo para todos los pesos.'}
            {' '}Por salud, cada semana cuenta como mucho 1% del peso de cada uno, y los menores de 18 participan solo con su constancia.
          </p>
        </>
      )}

      {titulo('¿Cuándo empiezan?')}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <button type="button" onClick={() => cambiar({ inicio: hoyISO(), hasta: null })} className={chip(c.inicio === hoyISO())}>Hoy</button>
        <button type="button" onClick={() => cambiar({ inicio: lunes, hasta: null })} className={chip(c.inicio === lunes)}>Lunes {fechaCorta(lunes)}</button>
        <button type="button" onClick={() => cambiar({ inicio: lunes2, hasta: null })} className={chip(c.inicio === lunes2)}>Lunes {fechaCorta(lunes2)}</button>
      </div>

      {titulo('Duración del reto')}
      <div className="grid grid-cols-4 gap-2 mb-2">
        {[14, 28, 56].map(d => (
          <button key={d} type="button" onClick={() => cambiar({ dias: d, hasta: null })} className={chip(!c.hasta && c.dias === d)}>{d} días</button>
        ))}
        <button type="button" onClick={() => cambiar({ hasta: c.hasta || masDias(c.inicio, 69) })} className={chip(!!c.hasta) + ' text-xs'}>Hasta una fecha</button>
      </div>
      {c.hasta && (
        <div className="mb-1">
          <span className="jb-body text-sm text-zinc-300 block mb-1">Hasta el</span>
          <RuedaFecha valor={c.hasta} min={masDias(c.inicio, 13)} max={masDias(c.inicio, 119)} onCambio={f => f && cambiar({ hasta: f })} />
        </div>
      )}
      <p className="jb-body text-[11px] text-zinc-500 mb-4">
        Del {fechaCorta(c.inicio)} al {fechaCorta(masDias(c.inicio, diasDelReto(c) - 1))} · {diasDelReto(c)} días
      </p>

      {titulo('Premio (opcional)')}
      <input value={c.premio} onChange={e => cambiar({ premio: e.target.value.slice(0, 80) })}
        placeholder={oficial ? 'Ej. 🥇 1 mes de Premium gratis' : EJEMPLO_PREMIO[c.objetivo]} className={inputCls + ' w-full rounded-xl mb-1'} />
      <p className="jb-body text-[11px] text-zinc-500 mb-3">Se ve arriba en el equipo. Lo puedes cambiar después.</p>

      {err && <p className="jb-body text-sm text-amber-400 mb-3">⚠️ {err}</p>}
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

// ——— CREAR (O CAMBIAR) UN RETO PASO A PASO ———
// Una sola pregunta por pantalla, con botones grandes (pedido por Jonah el
// 15 de octubre: "que sea fácil de entender si es carrera u otras
// opciones"). Pasos: qué quieren lograr → cómo quieren jugar (solo bajar o
// subir) → la meta → cuándo → el premio → resumen. Con `eq` cambia el reto
// de un equipo que ya existe (antes de empezar o al terminar); sin `eq`
// crea el equipo y termina con "¡TU RETO ESTÁ LISTO!" para invitar por
// WhatsApp.
const LOGROS = [
  { id: 'comer', emoji: '🍽️', titulo: 'Comer mejor', texto: 'Sin kilos de por medio: gana el que más días anota sus comidas.', ideal: 'Ideal para empezar' },
  { id: 'bajar', emoji: '⬇️', titulo: 'Bajar de peso', texto: 'Bajar kilos acompañados, comida a comida.', ideal: 'Ideal si quieren bajar' },
  { id: 'subir', emoji: '💪', titulo: 'Subir de peso', texto: 'Ganar músculo comiendo bien, sin llenarse de grasa.', ideal: 'Ideal para los flacos que quieren subir' },
];
const MODOS = [
  { id: 'juntos', emoji: '🤝', titulo: 'Juntos', texto: 'Todos van por la meta y se ayudan.', gana: 'Si llegan, ganan todos.', ideal: 'Ideal para la familia o la pareja' },
  { id: 'carrera', emoji: '🏁', titulo: 'Carrera', texto: 'Compiten entre ustedes:', gana: 'gana el primero en llegar a la meta.', ideal: 'Ideal para amigos o compañeros del trabajo' },
];
const BOTONES_META = {
  bajar: { kg_cada: [2, 3, 4, 5], carrera_kg: [2, 3, 4, 5], pct_total: [2, 3, 4, 5], carrera_pct: [2, 3, 4, 5], kg_total: [10, 20, 30, 50] },
  subir: { kg_cada: [1, 2, 3, 4], carrera_kg: [1, 2, 3, 4], kg_total: [5, 10, 15, 20] },
};
const META_COMIDAS = [300, 500, 1000];
const PREMIOS = {
  comer: ['🍕 El 🥇 elige la próxima salida', '🐟 Los demás le invitan el ceviche al 🥇'],
  juntos: ['🍖 Si llegamos, parrillada todos juntos', '🎬 Si llegamos, salida al cine'],
  carrera: ['💰 Cada uno le da S/20 al ganador', '🐟 Los demás le invitan el ceviche'],
};

function PasosReto({ eq, nombre, onCancelar, onListo, onCreado }) {
  const editando = !!eq;
  const primero = String(nombre || '').trim().split(/\s+/)[0];
  const tituloNuevo = `Team Beast de ${primero.length >= 2 ? primero.charAt(0).toUpperCase() + primero.slice(1).toLowerCase() : 'tu nombre'}`;
  const [c, setC] = useState(() => {
    const base = configInicial(eq);
    if (!eq) return { ...base, dias: 56 };
    return base;
  });
  const [logro, setLogro] = useState(() => (!eq ? null : eq.objetivo === 'comer' ? 'comer' : eq.sentido === 'subir' ? 'subir' : 'bajar'));
  const [paso, setPaso] = useState(0);
  const [otroValor, setOtroValor] = useState(false);
  const [masOpciones, setMasOpciones] = useState(() => eq?.meta_tipo === 'kg_total' && eq?.sentido !== 'subir');
  const [premioModo, setPremioModo] = useState(() => {
    if (!eq?.premio) return 'medalla';
    return Object.values(PREMIOS).flat().includes(eq.premio) ? 'lista' : 'otro';
  });
  const [apodo, setApodo] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [creado, setCreado] = useState(null); // { id, codigo } al terminar
  const [ref, setRef] = useState('');
  useEffect(() => {
    supabase.rpc('mi_codigo_invitacion').then(({ data, error: e }) => { if (!e && data?.codigo) setRef(data.codigo); });
  }, []);

  const cambiar = cambios => setC(v => ({ ...v, ...cambios }));
  const pasos = logro === 'comer' ? ['logro', 'meta', 'cuando', 'premio', 'resumen'] : ['logro', 'modo', 'meta', 'cuando', 'premio', 'resumen'];
  const actual = pasos[paso];
  const total = pasos.length - 1;
  const subir = c.sentido === 'subir';
  const valor = Number(String(c.metaValor).replace(',', '.'));
  const lunes = proximoLunes();
  const lunes2 = masDias(lunes, 7);
  const fin = masDias(c.inicio, diasDelReto(c) - 1);
  const err = errorConfig(c, false);
  const chequeo = chequeoMeta(c);

  function elegirLogro(id) {
    setLogro(id);
    setOtroValor(false);
    if (id === 'comer') {
      cambiar({ objetivo: 'comer', sentido: 'bajar', metaTipo: 'comidas', metaValor: '', dias: c.hasta ? c.dias : 28 });
    } else {
      const objetivo = c.objetivo === 'comer' ? 'carrera' : c.objetivo;
      const metaTipo = objetivo === 'juntos' ? 'kg_cada' : 'carrera_kg';
      cambiar({ objetivo, sentido: id, metaTipo, metaValor: id === 'subir' ? '2' : '3', dias: c.hasta ? c.dias : 56 });
    }
  }
  function elegirModo(id) {
    setOtroValor(false);
    cambiar({ objetivo: id, metaTipo: id === 'juntos' ? 'kg_cada' : 'carrera_kg', metaValor: subir ? '2' : '3' });
  }
  function elegirTipoMeta(t) {
    setOtroValor(false);
    const botones = BOTONES_META[c.sentido]?.[t] || [];
    cambiar({ metaTipo: t, metaValor: String(botones[1] || botones[0] || '') });
  }
  const siguienteListo = actual === 'logro' ? !!logro
    : actual === 'modo' ? c.objetivo === 'juntos' || c.objetivo === 'carrera'
    : actual === 'meta' ? c.objetivo === 'comer' || (valor > 0 && !(subir && esPct(c.metaTipo)))
    : actual === 'cuando' ? !err
    : actual === 'premio' ? premioModo !== 'otro' || c.premio.trim().length >= 2
    : true;

  async function guardar() {
    setError('');
    if (err) { setError(err); return; }
    setOcupado(true);
    const params = paramsConfig(c);
    const { r, ok, error: e } = editando
      ? await llamar('equipo_nuevo_reto', { p_id: eq.id, ...params })
      : await llamar('equipo_crear', { p_nombre: apodo.trim() || null, p_whatsapp: null, ...params });
    setOcupado(false);
    if (!ok) { setError(mensajeError(r, e)); return; }
    vibrar(30);
    if (editando) {
      showToast(c.inicio === hoyISO() ? '🔥 ¡Reto en marcha desde hoy! Vamos juntos.' : `📅 Listo: el reto empieza el ${fechaLarga(c.inicio)}.`);
      onListo();
    } else {
      setCreado({ id: r.id, codigo: r.codigo });
    }
  }

  const tarjeta = (activo, onClick, contenido, key) => (
    <button key={key} type="button" onClick={onClick}
      className={`w-full text-left rounded-2xl border p-4 mb-2.5 flex items-start gap-3 transition-colors ${activo ? 'border-orange-500 bg-orange-500/10' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600'}`}>
      {contenido}
      <span className={`ml-auto shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${activo ? 'bg-orange-500 border-orange-500 text-zinc-950' : 'border-zinc-700'}`}>{activo ? '✓' : ''}</span>
    </button>
  );
  const chip = activo => `jb-body text-sm py-3 px-2 rounded-xl border transition-colors ${activo ? 'bg-orange-500 border-orange-500 text-zinc-950 font-semibold' : 'bg-zinc-900 border-zinc-800 text-zinc-200'}`;
  const subtituloPaso = t => <p className="jb-body text-[11px] text-zinc-500 uppercase tracking-wider mb-1.5">{t}</p>;
  const resumenLineas = [
    fraseReto(c.objetivo, c.sentido, c.metaTipo, c.objetivo === 'comer' ? (String(c.metaValor).trim() ? valor : null) : valor),
    `📅 Del ${fechaLarga(c.inicio)} al ${fechaLarga(fin)} (${semanasTxt(diasDelReto(c))})`,
    c.premio.trim() ? (/^\p{Extended_Pictographic}/u.test(c.premio.trim()) ? c.premio.trim() : `🎁 ${c.premio.trim()}`) : '🏅 Premio: la medalla',
    ...(c.objetivo === 'comer' ? ['✓ 3 comidas o más en el día = 10 puntos · 1 o 2 = 5 puntos'] : [
      '⚖️ Se cuenta con el pesaje de cada semana (el del domingo en Inicio)',
      `🔒 Nadie ve el peso de nadie, solo los ${kilosDe(c)}`,
      ...(subir ? ['🌱 Como mucho ½ kg por semana: músculo, no grasa'] : []),
    ]),
    '🥇 El podio es para los más constantes anotando sus comidas',
  ];

  // ¡LISTO! Invitar por WhatsApp (un enlace: el celular no deja abrir
  // WhatsApp solo, sin que la persona toque).
  if (creado) {
    const eqNuevo = {
      codigo: creado.codigo, nombre: tituloNuevo, apodo: apodo.trim() || null, objetivo: c.objetivo, sentido: c.sentido,
      meta_tipo: c.objetivo === 'comer' ? null : c.metaTipo, meta_valor: valor, inicio: c.inicio, fin, premio: c.premio.trim() || null,
    };
    const copiar = async () => {
      try { await navigator.clipboard.writeText(linkEquipo(creado.codigo, ref)); showToast('📋 Enlace copiado'); }
      catch { showToast(`Tu código es ${creado.codigo}`); }
    };
    return (
      <div className="pt-2">
        <h1 className="jb-display text-3xl text-zinc-50 mb-1">¡TU RETO ESTÁ LISTO! 🦍</h1>
        <p className="jb-body text-sm text-zinc-400 mb-5">Ahora invita a tu gente: el mensaje ya lleva las reglas del reto y el enlace para entrar.</p>
        <a href={`https://wa.me/?text=${encodeURIComponent(textoInvitacionEquipo(eqNuevo, ref))}`} target="_blank" rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 mb-2.5 jb-body font-semibold text-[#0b2a17] bg-[#25D366]">
          <MessageCircle size={17} /> Invitar por WhatsApp
        </a>
        <button onClick={copiar} className={btnGhost + ' w-full py-3 rounded-xl mb-4'}><Copy size={15} /> Copiar enlace</button>
        <Tarjeta className="mb-4">
          <p className="jb-body text-xs text-zinc-500 mb-1">Código del equipo</p>
          <p className="jb-display text-2xl text-orange-400 tracking-widest">{creado.codigo}</p>
          {c.objetivo !== 'comer' && (
            <p className="jb-body text-xs text-zinc-400 mt-2">
              ⚖️ Recuérdales anotar su peso antes del {fechaLarga(c.inicio)} (en "Mi cuerpo") y, dentro del equipo, tocar <b>"{c.objetivo === 'carrera' ? 'Competir con mi avance' : 'Mostrar mi avance'}"</b>. Tú también 😉
            </p>
          )}
        </Tarjeta>
        <button onClick={() => onCreado(creado.id)} className={btnPrimary + ' w-full py-3 rounded-xl'}>Ir a mi equipo</button>
      </div>
    );
  }

  return (
    <div className="pt-2 pb-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => (paso > 0 ? setPaso(paso - 1) : onCancelar())} className="jb-body text-sm text-zinc-400 hover:text-zinc-200 flex items-center gap-1">
          <ChevronLeft size={16} /> Volver
        </button>
        <button onClick={onCancelar} className="jb-body text-sm text-zinc-500 hover:text-zinc-300 px-2" aria-label="Cerrar">✕</button>
      </div>
      {actual !== 'resumen' && (
        <>
          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden mb-1.5">
            <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${((paso + 1) / total) * 100}%` }} />
          </div>
          <p className="jb-body text-[11px] text-zinc-500 uppercase tracking-wider mb-4">
            Paso {paso + 1} de {total}
            {paso > 0 && logro && logro !== 'comer' ? ` · ${logro === 'subir' ? 'Subir de peso' : 'Bajar de peso'}` : ''}
            {paso > 1 && logro !== 'comer' ? ` · ${c.objetivo === 'carrera' ? 'Carrera' : 'Juntos'}` : ''}
          </p>
        </>
      )}

      {actual === 'logro' && (
        <>
          <h1 className="jb-display text-3xl text-zinc-50 leading-tight mb-1">¿QUÉ QUIEREN LOGRAR?</h1>
          <p className="jb-body text-sm text-zinc-400 mb-4">Con tu familia, tus amigos o tus compañeros del trabajo. Hasta 30 personas.</p>
          {LOGROS.map(o => tarjeta(logro === o.id, () => elegirLogro(o.id), (
            <>
              <span className="text-3xl leading-none">{o.emoji}</span>
              <span className="min-w-0">
                <span className="block jb-body text-base font-semibold text-zinc-50">{o.titulo}</span>
                <span className="block jb-body text-sm text-zinc-300 leading-snug">{o.texto}</span>
                <span className="block jb-body text-xs text-orange-300 mt-1">{o.ideal}</span>
              </span>
            </>
          ), o.id))}
        </>
      )}

      {actual === 'modo' && (
        <>
          <h1 className="jb-display text-3xl text-zinc-50 leading-tight mb-1">¿CÓMO QUIEREN JUGAR?</h1>
          <p className="jb-body text-sm text-zinc-400 mb-4">Elige cómo se gana.</p>
          {MODOS.map(o => tarjeta(c.objetivo === o.id, () => elegirModo(o.id), (
            <>
              <span className="text-3xl leading-none">{o.emoji}</span>
              <span className="min-w-0">
                <span className="block jb-body text-base font-semibold text-zinc-50">{o.titulo}</span>
                <span className="block jb-body text-sm text-zinc-300 leading-snug">{o.texto} <b className="text-orange-300">{o.gana}</b></span>
                <span className="block jb-body text-xs text-orange-300 mt-1">{o.ideal}</span>
              </span>
            </>
          ), o.id))}
          <p className="jb-body text-xs text-zinc-500 mt-2">🥇🥈🥉 En los dos, el podio es para los más constantes anotando sus comidas.</p>
        </>
      )}

      {actual === 'meta' && c.objetivo === 'comer' && (
        <>
          <h1 className="jb-display text-3xl text-zinc-50 leading-tight mb-1">¿CÓMO SE GANA?</h1>
          <div className="bg-zinc-900 border border-dashed border-zinc-700 rounded-2xl p-4 mt-3 mb-4">
            <p className="jb-body text-base text-zinc-50 mb-1">🥇 Gana el que más días anota sus comidas</p>
            <p className="jb-body text-xs text-zinc-400">✓ 3 comidas o más en el día = 10 puntos · 1 o 2 comidas = 5 puntos. Nadie compite por kilos.</p>
          </div>
          {subtituloPaso('Meta de comidas entre todos (opcional)')}
          <div className="grid grid-cols-4 gap-2 mb-2">
            <button type="button" onClick={() => { setOtroValor(false); cambiar({ metaValor: '' }); }} className={chip(!String(c.metaValor).trim() && !otroValor) + ' text-xs'}>Sin meta</button>
            {META_COMIDAS.map(n => (
              <button key={n} type="button" onClick={() => { setOtroValor(false); cambiar({ metaValor: String(n) }); }} className={chip(!otroValor && valor === n)}>{n}</button>
            ))}
          </div>
          <p className="jb-body text-xs text-zinc-500">Si la cumplen, todos ganan la medalla 🏆. Ej.: 6 personas × 3 comidas × 28 días ≈ 500.</p>
        </>
      )}

      {actual === 'meta' && c.objetivo !== 'comer' && (() => {
        const tiposJuntos = subir ? ['kg_cada', 'kg_total'] : masOpciones ? ['kg_cada', 'pct_total', 'kg_total'] : ['kg_cada', 'pct_total'];
        const nombreTipo = { kg_cada: `Cada uno ${subir ? 'sube' : 'baja'}`, pct_total: 'Entre todos (%)', kg_total: 'Entre todos (kg)' };
        const botones = BOTONES_META[c.sentido]?.[c.metaTipo] || [];
        const u = esPct(c.metaTipo) ? '%' : 'kg';
        return (
          <>
            <h1 className="jb-display text-3xl text-zinc-50 leading-tight mb-3">
              {c.objetivo === 'carrera' ? (esPct(c.metaTipo) ? '¿CUÁNTO % PARA GANAR?' : '¿CUÁNTOS KILOS PARA GANAR?') : '¿CUÁL ES LA META?'}
            </h1>
            {c.objetivo === 'juntos' && (
              <div className={`grid gap-2 mb-3 ${tiposJuntos.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {tiposJuntos.map(t => (
                  <button key={t} type="button" onClick={() => elegirTipoMeta(t)} className={chip(c.metaTipo === t) + ' text-xs'}>{nombreTipo[t]}</button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-5 gap-2 mb-3">
              {botones.map(n => (
                <button key={n} type="button" onClick={() => { setOtroValor(false); cambiar({ metaValor: String(n) }); }} className={chip(!otroValor && valor === n) + ' flex flex-col items-center leading-tight'}>
                  <span className="jb-display text-xl">{n}</span><span className="text-[11px]">{u}</span>
                </button>
              ))}
              <button type="button" onClick={() => { setOtroValor(true); cambiar({ metaValor: '' }); }} className={chip(otroValor) + ' text-xs'}>Otro</button>
            </div>
            {otroValor && (
              <div className="flex items-center gap-2 mb-3">
                <input autoFocus value={c.metaValor} onChange={e => cambiar({ metaValor: e.target.value.replace(/[^0-9.,]/g, '').slice(0, 5) })}
                  inputMode="decimal" placeholder={u === '%' ? '3' : subir ? '2' : '3'} className={inputCls + ' w-24 rounded-xl text-center'} />
                <span className="jb-body text-sm text-zinc-300">{u}</span>
              </div>
            )}
            {valor > 0 && (
              <div className="bg-zinc-900 border border-dashed border-zinc-700 rounded-2xl p-4 mb-3">
                <p className="jb-body text-base text-zinc-50 mb-1">{fraseReto(c.objetivo, c.sentido, c.metaTipo, valor)}</p>
                <p className="jb-body text-xs text-zinc-400">
                  {c.objetivo === 'carrera'
                    ? 'Se cuenta con el pesaje de cada semana. Si dos llegan la misma semana, gana el más constante. Si nadie llega, gana el que quedó más cerca.'
                    : c.metaTipo === 'kg_cada'
                      ? 'Quien llega a sus kilos gana su medalla 🎯. Si llegan todos, todos ganan la medalla del equipo 🏆.'
                      : 'Si llegan entre todos, todos ganan la medalla del equipo 🏆.'}
                </p>
              </div>
            )}
            <p className="jb-body text-xs text-zinc-500 mb-2">🔒 Nadie ve el peso de nadie: solo los {kilosDe(c)} de cada uno.</p>
            {c.objetivo === 'carrera' && !subir && (
              <button type="button" onClick={() => elegirTipoMeta(esPct(c.metaTipo) ? 'carrera_kg' : 'carrera_pct')} className="block jb-body text-sm text-orange-400 underline mb-1">
                {esPct(c.metaTipo) ? 'Volver a kilos' : '¿Pesan muy distinto? Usar % (más justo)'}
              </button>
            )}
            {c.objetivo === 'juntos' && !subir && !masOpciones && (
              <button type="button" onClick={() => setMasOpciones(true)} className="block jb-body text-sm text-orange-400 underline">Más opciones</button>
            )}
          </>
        );
      })()}

      {actual === 'cuando' && (
        <>
          <h1 className="jb-display text-3xl text-zinc-50 leading-tight mb-3">¿CUÁNDO?</h1>
          {subtituloPaso('Empiezan')}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <button type="button" onClick={() => cambiar({ inicio: hoyISO(), hasta: c.hasta ? masDias(hoyISO(), diasDelReto(c) - 1) : null })} className={chip(c.inicio === hoyISO())}>Hoy</button>
            {[lunes, lunes2].map(l => (
              <button key={l} type="button" onClick={() => cambiar({ inicio: l, hasta: c.hasta ? masDias(l, diasDelReto(c) - 1) : null })} className={chip(c.inicio === l)}>Lun {fechaCorta(l)}</button>
            ))}
          </div>
          {subtituloPaso('Duran')}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[[14, '2 semanas'], [28, '4 semanas'], [56, '8 semanas']].map(([d, t]) => (
              <button key={d} type="button" onClick={() => cambiar({ dias: d, hasta: null })} className={chip(!c.hasta && c.dias === d) + ' text-xs'}>{t}</button>
            ))}
            <button type="button" onClick={() => cambiar({ hasta: c.hasta || masDias(c.inicio, 69) })} className={chip(!!c.hasta) + ' text-xs'}>Hasta una fecha</button>
          </div>
          {c.hasta && (
            <div className="mb-2">
              <RuedaFecha valor={c.hasta} min={masDias(c.inicio, 13)} max={masDias(c.inicio, 119)} onCambio={f => f && cambiar({ hasta: f })} />
            </div>
          )}
          <div className="bg-zinc-900 border border-dashed border-zinc-700 rounded-2xl p-3 text-center mb-3">
            <p className="jb-body text-base text-zinc-50">📅 Hasta el <b>{fechaLarga(fin)}</b></p>
            <p className="jb-body text-xs text-zinc-400">Del {fechaCorta(c.inicio)} al {fechaCorta(fin)} · {semanasTxt(diasDelReto(c))}</p>
          </div>
          {chequeo.sano && (
            <p className="jb-body text-sm rounded-xl px-3 py-2.5 bg-emerald-950/60 border border-emerald-800/70 text-emerald-200">✅ {chequeo.sano}</p>
          )}
          {chequeo.rapido && (
            <div className="rounded-xl px-3 py-2.5 bg-amber-950/50 border border-amber-800/70">
              <p className="jb-body text-sm text-amber-200 mb-2">
                ⚠️ Es muy rápido para hacerlo bien{subir ? ' (subir más de ½ kg por semana es grasa, no músculo)' : ''}. En {semanasTxt(diasDelReto(c))}, como mucho {fmtNum(chequeo.maximo)}{esPct(c.metaTipo) ? '%' : ' kg'}.
              </p>
              {chequeo.sugerirDias && (
                <button type="button" onClick={() => cambiar([14, 28, 56].includes(chequeo.sugerirDias) ? { dias: chequeo.sugerirDias, hasta: null } : { hasta: masDias(c.inicio, chequeo.sugerirDias - 1) })}
                  className={btnPrimary + ' w-full py-2.5 rounded-xl text-sm'}>
                  Darles {semanasTxt(chequeo.sugerirDias)}
                </button>
              )}
              <button type="button" onClick={() => setPaso(pasos.indexOf('meta'))} className="block mx-auto jb-body text-xs text-amber-300 underline mt-2">O bajar la meta</button>
            </div>
          )}
          {!chequeo.rapido && err && <p className="jb-body text-sm text-amber-400">⚠️ {err}</p>}
        </>
      )}

      {actual === 'premio' && (
        <>
          <h1 className="jb-display text-3xl text-zinc-50 leading-tight mb-3">{c.objetivo === 'juntos' ? '¿QUÉ GANAN SI LLEGAN?' : '¿QUÉ GANA EL GANADOR?'}</h1>
          <div className="space-y-2 mb-3">
            {PREMIOS[c.objetivo].map(t => (
              <button key={t} type="button" onClick={() => { setPremioModo('lista'); cambiar({ premio: t }); }} className={chip(premioModo === 'lista' && c.premio === t) + ' w-full text-left px-4'}>{t}</button>
            ))}
            <button type="button" onClick={() => { setPremioModo('medalla'); cambiar({ premio: '' }); }} className={chip(premioModo === 'medalla') + ' w-full text-left px-4'}>🏅 Solo la medalla</button>
            <button type="button" onClick={() => { setPremioModo('otro'); if (premioModo !== 'otro') cambiar({ premio: '' }); }} className={chip(premioModo === 'otro') + ' w-full text-left px-4'}>✏️ Escribir otro</button>
          </div>
          {premioModo === 'otro' && (
            <input autoFocus value={c.premio} onChange={e => cambiar({ premio: e.target.value.slice(0, 80) })}
              placeholder={EJEMPLO_PREMIO[c.objetivo]} className={inputCls + ' w-full rounded-xl mb-3'} />
          )}
          {!editando && (
            <>
              {subtituloPaso('Apodo del equipo (opcional)')}
              <input value={apodo} onChange={e => setApodo(e.target.value.slice(0, 24))} placeholder="Ej. Los del trabajo"
                className={inputCls + ' w-full rounded-xl mb-1'} />
              <p className="jb-body text-xs text-zinc-500">Se verá así: {tituloNuevo} · {apodo.trim() || 'Los del trabajo'}</p>
            </>
          )}
        </>
      )}

      {actual === 'resumen' && (
        <>
          <h1 className="jb-display text-3xl text-zinc-50 leading-tight mb-1">ASÍ QUEDA TU RETO</h1>
          <p className="jb-body text-sm text-zinc-400 mb-4">Revisa que todo esté bien.</p>
          <div className="rounded-2xl border border-orange-500/70 bg-zinc-900 p-4 mb-3">
            <p className="jb-display text-xl text-zinc-50 leading-tight">{(editando ? eq.nombre : tituloNuevo).toUpperCase()} 🦍</p>
            {(editando ? eq.apodo : apodo.trim()) && <p className="jb-display text-base text-orange-400 mb-1">{(editando ? eq.apodo : apodo.trim()).toUpperCase()}</p>}
            <ul className="mt-2">
              {resumenLineas.map((l, i) => (
                <li key={i} className={`jb-body text-sm text-zinc-200 py-2 ${i ? 'border-t border-zinc-800' : ''} ${i === 0 ? 'font-semibold text-zinc-50' : ''}`}>{l}</li>
              ))}
            </ul>
          </div>
          <button type="button" onClick={() => setPaso(0)} className="block mx-auto jb-body text-xs text-zinc-400 mb-4">¿Algo no está bien? <span className="text-orange-400 underline">Cambiar</span></button>
          {error && <p className="jb-body text-sm text-red-400 mb-3">{error}</p>}
          <button onClick={guardar} disabled={ocupado} className={btnPrimary + ' w-full py-3.5 rounded-xl'}>
            {ocupado ? <Loader2 className="animate-spin" size={16} /> : editando ? 'Guardar reto' : 'Crear mi reto'}
          </button>
        </>
      )}

      {actual !== 'resumen' && (
        <button onClick={() => siguienteListo && setPaso(paso + 1)} disabled={!siguienteListo} className={btnPrimary + ' w-full py-3.5 rounded-xl mt-5 disabled:opacity-40'}>
          {actual === 'premio' ? 'Ver cómo queda' : 'Siguiente'}
        </button>
      )}
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

function EquipoDetalle({ id, username, onVolver, onSalio, onAnimosVistos, onAnotarPeso, pesoFecha }) {
  const [eq, setEq] = useState(null);
  const [semana, setSemana] = useState(null); // lunes de la semana que se ve (null = la actual)
  const [abiertoRef, setAbiertoRef] = useState(null);
  const [animosNuevos, setAnimosNuevos] = useState([]);
  const [ref, setRef] = useState(null); // código de invitación personal (10% para el amigo)
  const [editar, setEditar] = useState(false);
  const [programar, setProgramar] = useState(false);
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
  // Si anota su peso (con "⚖️ Anotar mi peso"), se marca al toque y se
  // vuelve a cargar el equipo cuando el peso ya llegó a la base.
  const [pesoRecien, setPesoRecien] = useState(false);
  const pesoFechaInicial = useRef(pesoFecha);
  useEffect(() => {
    if (!pesoFecha || pesoFecha === pesoFechaInicial.current) return;
    pesoFechaInicial.current = pesoFecha;
    setPesoRecien(true);
    const t1 = setTimeout(() => cargar(), 3000);
    const t2 = setTimeout(() => cargar(), 9000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [pesoFecha]);
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
    if (!(await confirmar({ titulo: eq.oficial ? '¿SALIR DEL TEAM BEAST?' : `¿SALIR DE ${nombreCompleto(eq).toUpperCase()}?`, texto: 'Cuando quieras, puedes volver.', si: 'Salir del equipo', peligro: true }))) return;
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
  if (!eq) return <div className="flex flex-col gap-3"><div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3"><div className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-full" /><Skeleton className="h-3.5 w-40" /></div><Skeleton className="h-16 w-full rounded-xl" /></div><div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3"><div className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-full" /><Skeleton className="h-3.5 w-40" /></div><Skeleton className="h-16 w-full rounded-xl" /></div><div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3"><div className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-full" /><Skeleton className="h-3.5 w-40" /></div><Skeleton className="h-16 w-full rounded-xl" /></div></div>;

  if (programar && !eq.oficial) {
    return <PasosReto eq={eq} onCancelar={() => setProgramar(false)}
      onListo={() => { setProgramar(false); setSemana(null); cargar(null); }} />;
  }

  const subtitulo = eq.oficial ? `Reto de ${eq.dias} días con Jonah` : `Reto de ${eq.dias} días`;
  const conPeso = eq.objetivo !== 'comer';
  // Podio (al terminar): los 3 con más puntos (Jonah no compite en su Team Beast).
  const podio = eq.miembros.filter(m => m.medalla_posible && m.puntos > 0).slice(0, 3);
  const ganadorCarrera = eq.miembros.find(m => m.ganador);

  async function compartir(nivel) {
    const { r, ok, error: e } = await llamar('equipo_compartir', { p_id: id, p_nivel: nivel });
    if (!ok) { showToast(mensajeError(r, e), 'error'); return; }
    vibrar(20);
    showToast(nivel === 'nada' ? 'Listo: participas solo con tu constancia.' : nivel === 'total' ? 'Listo: tu avance suma al total del equipo, sin verse por separado.' : `Listo: el equipo verá tus ${kilosDe(eq)} (nunca tu peso).`);
    cargar();
  }
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
          <button onClick={() => setEditar(v => !v)} className="p-2 text-zinc-500 hover:text-orange-400 shrink-0" aria-label="Editar apodo, grupo de WhatsApp y premio"><Pencil size={16} /></button>
        )}
      </div>
      {eq.apodo && <p className="jb-display text-xl text-orange-400 -mt-1 mb-1">{eq.apodo.toUpperCase()}</p>}
      <p className="jb-body text-sm text-orange-300 mb-1">{subtitulo} · {eq.miembros.length} {eq.miembros.length === 1 ? 'integrante' : 'integrantes'}</p>
      <p className="jb-body text-xs text-zinc-400 mb-3">
        {etiquetaReto(eq)}{eq.premio ? <> · 🎁 <span className="text-zinc-200">Premio: {eq.premio}</span></> : null}
      </p>

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

      {eq.terminado && (podio.length > 0 || ganadorCarrera || eq.progreso?.cumplida) && (
        <Podio eq={eq} podio={podio} ganadorCarrera={ganadorCarrera} />
      )}

      {conPeso && eq.yo && !eq.terminado && (
        <ListoParaCompetir eq={eq} pesoRecien={pesoRecien} onCompartir={compartir} onAnotarPeso={onAnotarPeso} />
      )}
      {conPeso && eq.soy_capitan && eq.faltan > 0 && !eq.terminado && eq.dia_actual <= 7 && (
        <Tarjeta className="mb-3">
          <p className="jb-display text-base text-zinc-100 mb-1">⏳ {eq.faltan} DE {eq.adultos} TODAVÍA NO {eq.faltan === 1 ? 'ESTÁ LISTO' : 'ESTÁN LISTOS'}</p>
          <p className="jb-body text-xs text-zinc-400 mb-3">Les falta anotar su peso de inicio o tocar "{eq.objetivo === 'carrera' ? 'Competir con mi avance' : 'Mostrar mi avance'}". Sin eso, sus kilos no cuentan. (No sabemos quiénes: el peso de cada uno es privado.)</p>
          <a href={`https://wa.me/?text=${encodeURIComponent(textoRecordatorio(eq, ref))}`} target="_blank" rel="noopener noreferrer"
            className={btnGhost + ' w-full py-2.5 rounded-xl text-sm'}>
            <MessageCircle size={15} /> Recordarles por WhatsApp
          </a>
        </Tarjeta>
      )}

      {eq.progreso && <MetaEquipo eq={eq} />}

      {conPeso && eq.yo && !eq.terminado && <MiAvance eq={eq} onCompartir={compartir} />}

      {eq.soy_capitan && !eq.oficial && (eq.terminado || !empezo) && (
        <button onClick={() => setProgramar(true)} className={(eq.terminado ? btnPrimary : btnGhost) + ' w-full py-2.5 mb-3 rounded-xl text-sm'}>
          {eq.terminado ? '🔁 Arrancar otro reto' : '⚙️ Cambiar el reto: tipo, meta, fechas y premio'}
        </button>
      )}
      {eq.soy_capitan && eq.oficial && (eq.terminado ? (
        <NuevoReto eq={eq} titulo="ARRANCA OTRO RETO" boton="Empezar nuevo reto" onListo={() => { setSemana(null); cargar(null); }} />
      ) : (programar ? (
        <NuevoReto eq={eq} titulo="PROGRAMA EL RETO" boton="Guardar reto"
          ayuda={empezo ? 'El reto ya está en marcha: si cambias la fecha, empieza de nuevo desde ese día.' : 'Mientras tanto, la gente se puede unir e invitar a otros.'}
          onCancelar={() => setProgramar(false)} onListo={() => { setProgramar(false); setSemana(null); cargar(null); }} />
      ) : (
        <button onClick={() => setProgramar(true)} className={btnGhost + ' w-full py-2.5 mb-3 rounded-xl text-sm'}>
          📅 Cambiar fechas, meta y premio del reto
        </button>
      )))}

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
              {conPeso && m.peso && (
                <div className="pl-7 mb-1.5 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div className="h-full bg-orange-400 rounded-full" style={{ width: `${Math.min(100, barraPeso(eq, m.peso) * 100)}%` }} />
                  </div>
                  <span className="jb-body text-[11px] text-zinc-300 tabular-nums shrink-0">
                    {signoPeso(eq)}{fmtNum(m.peso.kg)} kg · {fmtNum(m.peso.pct)}%{m.peso.llego ? ' 🎯' : ''}{m.ganador ? ' 🏁' : ''}
                  </span>
                </div>
              )}
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
            <b className="text-zinc-300">Invitar por WhatsApp</b> abre tu WhatsApp con el mensaje y el enlace ya escritos: solo elige a quién mandárselo. <b className="text-zinc-300">Copiar enlace</b> es para pegarlo en Instagram, Facebook u otra red. {ref ? 'Con tu enlace tienen además 10% de descuento en su primer plan.' : ''}
          </p>
          {!eq.oficial && (
            <p className="jb-body text-xs text-zinc-500 mb-3">Código del equipo: <span className="jb-display text-lg text-orange-400 tracking-widest ml-1">{eq.codigo}</span></p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <a href={`https://wa.me/?text=${encodeURIComponent(textoInvitacionEquipo(eq, ref))}`} target="_blank" rel="noopener noreferrer"
              className={btnPrimary + ' py-2.5 rounded-xl text-sm'}>
              <MessageCircle size={15} /> Invitar por WhatsApp
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
  const [premio, setPremio] = useState(eq.premio || '');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  async function guardar() {
    setError('');
    setOcupado(true);
    const { r, ok, error: e } = await llamar('equipo_editar', { p_id: eq.id, p_nombre: eq.oficial ? null : apodo.trim() || null, p_whatsapp: whatsapp.trim() || null, p_premio: premio.trim() || null });
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
      <p className="jb-body text-xs text-zinc-500 uppercase tracking-wider mb-1.5 mt-3">Premio (opcional)</p>
      <input value={premio} onChange={e => setPremio(e.target.value.slice(0, 80))}
        placeholder={eq.oficial ? 'Ej. 🥇 1 mes de Premium gratis' : EJEMPLO_PREMIO[eq.objetivo] || EJEMPLO_PREMIO.comer} className={inputCls + ' w-full rounded-xl'} />
      {error && <p className="jb-body text-sm text-red-400 mt-2">{error}</p>}
      <button onClick={guardar} disabled={ocupado} className={btnPrimary + ' w-full py-2.5 mt-3 rounded-xl'}>
        {ocupado ? <Loader2 className="animate-spin" size={16} /> : 'Guardar'}
      </button>
    </Tarjeta>
  );
}

function NuevoReto({ eq, titulo, boton, ayuda, onListo, onCancelar }) {
  const [c, setC] = useState(() => configInicial(eq));
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  async function empezar() {
    setError('');
    const err = errorConfig(c, eq.oficial);
    if (err) { setError(err); return; }
    setOcupado(true);
    const { r, ok, error: e } = await llamar('equipo_nuevo_reto', { p_id: eq.id, ...paramsConfig(eq.oficial ? { ...c, objetivo: 'comer' } : c) });
    setOcupado(false);
    if (!ok) { setError(mensajeError(r, e)); return; }
    showToast(c.inicio === hoyISO() ? '🔥 ¡Reto en marcha desde hoy! Vamos juntos.' : `📅 Listo: el reto empieza el ${fechaLarga(c.inicio)}.`);
    onListo();
  }
  return (
    <Tarjeta className="mb-3 border-orange-500/40">
      <p className="jb-display text-base text-zinc-100 mb-1">{titulo}</p>
      {ayuda ? <p className="jb-body text-[11px] text-zinc-500 mb-3">{ayuda}</p> : <div className="mb-2" />}
      <ConfigReto c={c} setC={setC} oficial={eq.oficial} />
      {error && <p className="jb-body text-sm text-red-400 mb-3">{error}</p>}
      <button onClick={empezar} disabled={ocupado} className={btnPrimary + ' w-full py-3 rounded-xl'}>
        {ocupado ? <Loader2 className="animate-spin" size={16} /> : boton}
      </button>
      {onCancelar && <button onClick={onCancelar} className="block mx-auto jb-body text-xs text-zinc-500 hover:text-zinc-300 mt-2">Cancelar</button>}
    </Tarjeta>
  );
}

// "hace 5 min", "hace 2 h", "ayer", "hace 3 días".
export function haceCuanto(iso) {
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

// Qué tan cerca está alguien de la meta (0 a 1), para su barrita.
function barraPeso(eq, peso) {
  const meta = Number(eq.meta_valor) || 0;
  if (!meta) return 0;
  if (eq.meta_tipo === 'carrera_pct' || eq.meta_tipo === 'pct_total') return peso.pct / meta;
  if (eq.meta_tipo === 'kg_total') return peso.kg / Math.max(1, meta / Math.max(1, eq.progreso?.participantes || 1));
  return peso.kg / meta;
}

// META DEL EQUIPO: cómo va la meta (comidas, % o kilos entre todos, cada
// uno, o la carrera).
function MetaEquipo({ eq }) {
  const p = eq.progreso;
  const meta = Number(p.meta) || 0;
  const unidad = eq.meta_tipo === 'carrera_pct' || eq.meta_tipo === 'pct_total' ? '%' : ' kg';
  const subir = eq.sentido === 'subir';
  let titulo = '', linea = '', extra = '', avance = 0;
  if (p.tipo === 'comidas') {
    titulo = `🍽️ META: ${fmtNum(meta)} COMIDAS ENTRE TODOS`;
    linea = `Van ${fmtNum(p.valor)} de ${fmtNum(meta)} comidas registradas`;
    avance = p.valor / meta;
  } else if (p.tipo === 'pct_total') {
    titulo = `🤝 META: BAJAR ${fmtNum(meta)}% ENTRE TODOS`;
    linea = `Juntos ya bajaron ${fmtNum(p.valor)}% de ${fmtNum(meta)}%`;
    extra = p.participantes >= 2 ? `Eso es ${fmtNum(p.kg_juntos)} kg menos entre ${p.participantes} personas 💪` : '';
    avance = p.valor / meta;
  } else if (p.tipo === 'kg_total') {
    titulo = `🤝 META: ${subir ? 'SUBIR' : 'BAJAR'} ${fmtNum(meta)} KG ENTRE TODOS`;
    linea = `Juntos ya ${subir ? 'subieron' : 'bajaron'} ${fmtNum(p.valor)} de ${fmtNum(meta)} kg`;
    extra = p.participantes ? `${p.participantes} ${p.participantes === 1 ? 'persona suma' : 'personas suman'} su avance` : '';
    avance = p.valor / meta;
  } else if (p.tipo === 'kg_cada') {
    titulo = `🎯 META: CADA UNO ${subir ? 'SUBE' : 'BAJA'} ${fmtNum(meta)} KG`;
    linea = p.participantes ? `${p.valor} de ${p.participantes} ya llegaron a su meta` : '';
    extra = p.participantes >= 2 ? `Juntos: ${fmtNum(p.kg_juntos)} kg ${subir ? 'más de músculo' : 'menos'} 💪` : '';
    avance = p.participantes ? p.valor / p.participantes : 0;
  } else {
    titulo = `🏁 CARRERA: EL PRIMERO EN ${subir ? 'SUBIR' : 'BAJAR'} ${fmtNum(meta)}${unidad.toUpperCase()}`;
    const lider = eq.miembros.filter(m => m.peso).sort((a, b) => barraPeso(eq, b.peso) - barraPeso(eq, a.peso))[0];
    const gan = eq.miembros.find(m => m.ganador);
    linea = gan ? `🏁 ¡${gan.yo ? 'Llegaste' : `${gan.nombre} llegó`} primero!`
      : lider ? `Va adelante: ${lider.yo ? 'tú' : lider.nombre} (${unidad === '%' ? `${fmtNum(lider.peso.pct)}%` : `${fmtNum(lider.peso.kg)} kg`})` : '';
    extra = p.participantes ? `${p.participantes} ${p.participantes === 1 ? 'persona compite' : 'personas compiten'}` : '';
    avance = lider ? barraPeso(eq, lider.peso) : 0;
  }
  return (
    <Tarjeta className={`mb-3 ${p.cumplida ? 'border-orange-500/60' : ''}`}>
      <p className="jb-display text-base text-zinc-100 mb-2">{titulo}</p>
      {p.tipo !== 'comidas' && !p.participantes ? (
        <p className="jb-body text-sm text-zinc-400">
          Todavía nadie suma su avance. {eq.objetivo === 'carrera' ? 'Para competir, elige abajo "Competir con mi avance".' : 'Abajo eliges si quieres sumar el tuyo.'}
        </p>
      ) : (
        <>
          <div className="h-2.5 rounded-full bg-zinc-800 overflow-hidden mb-2">
            <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(100, Math.max(0, avance) * 100)}%` }} />
          </div>
          {linea && <p className="jb-body text-sm text-zinc-200">{linea}</p>}
          {extra && <p className="jb-body text-xs text-zinc-500 mt-0.5">{extra}</p>}
        </>
      )}
      {p.cumplida && p.tipo !== 'carrera_kg' && p.tipo !== 'carrera_pct' && (
        <p className="jb-body text-sm text-orange-300 mt-2">🏆 ¡Meta cumplida! Al terminar el reto, todos reciben la medalla.</p>
      )}
    </Tarjeta>
  );
}

// LISTO PARA COMPETIR: en los retos de peso, arriba en el equipo, los 2
// pasos para que sus kilos cuenten: elegir competir (o sumar su avance) y
// anotar su peso de inicio ahí mismo. Al completarlos sale "¡Listo para
// competir!" ese día; después se oculta. Pasada la primera semana del reto
// ya no se puede fijar el peso de inicio, así que no sale.
function ListoParaCompetir({ eq, pesoRecien, onCompartir, onAnotarPeso }) {
  const yo = eq.yo;
  const hoy = hoyISO();
  const clave = `jb-listo-${eq.id}`;
  const desde = masDias(eq.inicio, -14);
  const carrera = eq.objetivo === 'carrera';
  const compartido = yo.comparte !== 'nada';
  const conPeso = !yo.sin_pesaje || (pesoRecien && hoy >= desde);
  const listo = compartido && conPeso;
  const [vistoListo] = useState(() => { try { return localStorage.getItem(clave); } catch { return null; } });
  useEffect(() => {
    if (listo && !vistoListo) { try { localStorage.setItem(clave, hoy); } catch { /* sin almacenamiento */ } }
  }, [listo]);
  if (yo.menor || hoy > masDias(eq.inicio, 6)) return null;

  if (listo) {
    if (vistoListo && vistoListo < hoy) return null;
    return (
      <div className="rounded-2xl border border-emerald-800/70 bg-emerald-950/50 p-4 mb-3">
        <p className="jb-display text-lg text-emerald-200">✅ ¡LISTO PARA {carrera ? 'COMPETIR' : 'SUMAR'}!</p>
        <p className="jb-body text-sm text-emerald-200/90 mt-1">
          Tu peso de inicio quedó guardado (solo lo ves tú). Cada domingo anota tu pesaje en Inicio y registra tus comidas: comida a comida 💪
        </p>
      </div>
    );
  }

  const faltan = (compartido ? 0 : 1) + (conPeso ? 0 : 1);
  const paso = (hecho, titulo, ayuda, boton) => (
    <li className="flex items-start gap-3 py-2.5 border-t border-zinc-800 first:border-t-0">
      <span className={`w-6 h-6 shrink-0 rounded-md border-2 flex items-center justify-center text-xs font-bold ${hecho ? 'bg-emerald-500 border-emerald-500 text-zinc-950' : 'border-zinc-600'}`}>{hecho ? '✓' : ''}</span>
      <span className="flex-1 min-w-0">
        <span className={`block jb-body text-sm ${hecho ? 'text-zinc-400' : 'text-zinc-50 font-semibold'}`}>{titulo}</span>
        {!hecho && ayuda && <span className="block jb-body text-xs text-zinc-400 mt-0.5">{ayuda}</span>}
        {!hecho && boton}
      </span>
    </li>
  );
  return (
    <div className="rounded-2xl border border-orange-500/70 bg-zinc-900 p-4 mb-3">
      <p className="jb-display text-lg text-zinc-50 leading-tight">PARA {carrera ? 'COMPETIR' : 'SUMAR TU AVANCE'} TE {faltan === 1 ? 'FALTA 1 PASO' : 'FALTAN 2 PASOS'}</p>
      <p className="jb-body text-xs text-zinc-400 mb-1">{eq.dia_actual > 0 ? 'El reto ya empezó: hazlo hoy para que tus kilos cuenten.' : `Empieza el ${fechaLarga(eq.inicio)}.`}</p>
      <ul>
        {paso(compartido, carrera ? 'Competir con mi avance' : 'Sumar mi avance',
          carrera ? 'El equipo ve tus kilos, nunca tu peso.' : 'Tu avance suma al total del equipo, sin verse por separado.',
          <button onClick={() => onCompartir(carrera ? 'avance' : 'total')} className={btnPrimary + ' w-full py-2.5 rounded-xl text-sm mt-2'}>
            {carrera ? '🏁 Competir con mi avance' : '🤝 Sumar mi avance'}
          </button>)}
        {paso(conPeso, 'Anotar mi peso de inicio',
          hoy < desde ? `Anótalo a partir del ${fechaLarga(desde)} (vale el de hasta 2 semanas antes de empezar).` : 'Sin peso de inicio, tus kilos no cuentan. Solo lo ves tú.',
          hoy >= desde && (onAnotarPeso
            ? <button onClick={onAnotarPeso} className={btnPrimary + ' w-full py-2.5 rounded-xl text-sm mt-2'}>⚖️ Anotar mi peso</button>
            : <span className="block jb-body text-xs text-orange-300 mt-1">Anótalo en la pestaña "Mi cuerpo".</span>))}
      </ul>
    </div>
  );
}

// TU AVANCE: qué comparte cada uno de su peso. Nadie ve el peso: como
// mucho, sus kilos bajados.
function MiAvance({ eq, onCompartir }) {
  const yo = eq.yo;
  if (yo.menor) {
    return (
      <Tarjeta className="mb-3">
        <p className="jb-display text-base text-zinc-100 mb-1">TU AVANCE</p>
        <p className="jb-body text-sm text-zinc-400">Por ser menor de 18, participas con tu constancia: cada comida que registras suma puntos para el podio 💪</p>
      </Tarjeta>
    );
  }
  const opciones = eq.objetivo === 'carrera'
    ? [{ id: 'nada', texto: 'Solo constancia', ayuda: 'No compites por peso; sigues sumando puntos.' },
       { id: 'avance', texto: 'Competir con mi avance', ayuda: `El equipo ve tus ${kilosDe(eq)} (nunca tu peso).` }]
    : [{ id: 'nada', texto: 'Solo constancia', ayuda: 'Tu peso no cuenta para la meta.' },
       { id: 'total', texto: 'Sumar en privado', ayuda: 'Tu avance suma al total del equipo, sin verse por separado.' },
       { id: 'avance', texto: 'Mostrar mi avance', ayuda: `El equipo ve tus ${kilosDe(eq)} (nunca tu peso).` }];
  const actual = opciones.find(o => o.id === yo.comparte) || opciones[0];
  const chip = activo => `jb-body text-xs py-2.5 px-2 rounded-xl border transition-colors ${activo ? 'bg-orange-500 border-orange-500 text-zinc-950 font-semibold' : 'bg-zinc-950 border-zinc-800 text-zinc-300'}`;
  return (
    <Tarjeta className="mb-3">
      <p className="jb-display text-base text-zinc-100 mb-1">TU AVANCE</p>
      <p className="jb-body text-xs text-zinc-400 mb-3">Tú decides qué compartes. Nadie del equipo ve tu peso.</p>
      <div className={`grid gap-2 mb-2 ${opciones.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {opciones.map(o => (
          <button key={o.id} type="button" onClick={() => o.id !== yo.comparte && onCompartir(o.id)} className={chip(o.id === yo.comparte)}>{o.texto}</button>
        ))}
      </div>
      <p className="jb-body text-[11px] text-zinc-500">{actual.ayuda}</p>
      {yo.comparte !== 'nada' && (yo.sin_pesaje ? (
        <p className="jb-body text-xs text-amber-400 mt-2">
          ⚖️ Para sumar, anota tu peso en la pestaña "Mi cuerpo" (o en el pesaje del domingo en Inicio). Cuenta tu peso de hasta 14 días antes del inicio o el de la primera semana del reto.
        </p>
      ) : (
        <p className="jb-body text-sm text-zinc-200 mt-2">
          Tú: {signoPeso(eq)}{fmtNum(yo.kg)} kg · {fmtNum(yo.pct)}%{yo.llego ? ' 🎯 ¡llegaste a la meta!' : ''}
          <span className="block jb-body text-[11px] text-zinc-500">
            {eq.sentido === 'subir'
              ? 'Se cuenta con tu pesaje de cada semana, como mucho ½ kg por semana para que sea músculo y no grasa. Poco a poco, comida a comida 💪'
              : 'Se cuenta con tu pesaje de cada semana, como mucho 1% por semana para que sea sano. Poco a poco, comida a comida 💪'}
          </span>
        </p>
      ))}
    </Tarjeta>
  );
}

// PODIO: al terminar el reto. Medallas por constancia, la carrera y la meta.
function Podio({ eq, podio, ganadorCarrera }) {
  const lugares = ['🥇', '🥈', '🥉'];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-orange-500/60 bg-zinc-900 p-5 mb-3"
      style={{ boxShadow: '0 0 40px -16px rgba(232,89,12,.6)' }}>
      <p className="jb-display text-xl text-zinc-50 mb-3">🏆 ¡ASÍ TERMINÓ EL RETO!</p>
      {ganadorCarrera && (
        <p className="jb-body text-base text-orange-300 mb-3">🏁 {ganadorCarrera.yo ? '¡Ganaste la carrera!' : `¡${ganadorCarrera.nombre} ganó la carrera!`}</p>
      )}
      {podio.length > 0 && (
        <div className="space-y-1.5 mb-3">
          <p className="jb-body text-[11px] text-zinc-500 uppercase tracking-wider">Los más constantes</p>
          {podio.map((m, i) => (
            <p key={m.ref} className="jb-body text-sm text-zinc-100 flex justify-between gap-2">
              <span>{lugares[i]} {m.nombre}{m.yo ? <span className="text-orange-400"> (tú)</span> : ''}</span>
              <span className="text-zinc-400 tabular-nums">{m.puntos} pts</span>
            </p>
          ))}
        </div>
      )}
      {eq.progreso?.cumplida && eq.objetivo !== 'carrera' && <p className="jb-body text-sm text-orange-300 mb-2">🏆 ¡Cumplieron la meta del equipo! Todos se llevan la medalla.</p>}
      {eq.premio && <p className="jb-body text-sm text-zinc-200">🎁 Premio: {eq.premio}</p>}
      <p className="jb-body text-[11px] text-zinc-500 mt-2">Las medallas llegan al día siguiente de terminar y quedan en "Mis medallas".</p>
    </div>
  );
}

// MIS MEDALLAS: lo que ganó en todos sus retos.
function MisMedallas({ medallas }) {
  const [ver, setVer] = useState(false);
  const cuenta = {};
  medallas.forEach(m => { cuenta[m.medalla] = (cuenta[m.medalla] || 0) + 1; });
  return (
    <Tarjeta className="mb-4">
      <button type="button" onClick={() => setVer(v => !v)} className="w-full text-left">
        <p className="jb-display text-base text-zinc-100 mb-1">MIS MEDALLAS</p>
        <p className="jb-body text-xl">
          {Object.keys(MEDALLAS).filter(k => cuenta[k]).map(k => (
            <span key={k} className="mr-3">{MEDALLAS[k].emoji}<span className="jb-body text-sm text-zinc-400"> ×{cuenta[k]}</span></span>
          ))}
        </p>
      </button>
      {ver && (
        <ul className="mt-2 space-y-1">
          {medallas.slice(0, 20).map((m, i) => (
            <li key={i} className="jb-body text-xs text-zinc-400">
              {MEDALLAS[m.medalla]?.emoji} {MEDALLAS[m.medalla]?.texto} · {m.equipo}{m.apodo ? ` · ${m.apodo}` : ''} · reto del {fechaCorta(m.reto_inicio)}
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  );
}

/* ------------------------------------------------------------------ */
/* MEDALLA NUEVA: Jonah el gorila le entrega su medalla al ganador.     */
/* ------------------------------------------------------------------ */
// Sale una sola vez por medalla (se recuerda en el celular), en los 14
// días siguientes a la entrega. Si ganó varias, muestra la más importante
// y menciona las demás. Con "Compartir mi medalla" se arma una imagen con
// el estilo de la tarjeta "MI CAMBIO" (sin kilos: solo el logro).
const CLAVE_MEDALLAS_VISTAS = 'jb-medallas-vistas';
const ORDEN_MEDALLAS = ['carrera', 'oro', 'meta_personal', 'meta', 'plata', 'bronce'];
const LOGRO = {
  oro: { titulo: '¡CAMPEÓN!', linea: 'Primer lugar en constancia', globo: '¡ASÍ SE HACE!' },
  plata: { titulo: '¡SEGUNDO LUGAR!', linea: 'Segundo lugar en constancia', globo: '¡ORGULLOSO DE TI!' },
  bronce: { titulo: '¡TERCER LUGAR!', linea: 'Tercer lugar en constancia', globo: '¡ORGULLOSO DE TI!' },
  carrera: { titulo: '¡GANASTE LA CARRERA!', linea: 'Llegaste primero a la meta', globo: '¡ASÍ SE HACE!' },
  meta: { titulo: '¡META CUMPLIDA!', linea: 'Todo el equipo llegó a la meta', globo: '¡EN EQUIPO!' },
  meta_personal: { titulo: '¡LLEGASTE A TU META!', linea: 'Cumpliste tu meta del reto', globo: '¡ASÍ SE HACE!' },
};

function leerVistas() {
  try { return JSON.parse(localStorage.getItem(CLAVE_MEDALLAS_VISTAS) || '[]'); } catch { return []; }
}
function marcarVistas(ids) {
  try { localStorage.setItem(CLAVE_MEDALLAS_VISTAS, JSON.stringify([...new Set([...leerVistas(), ...ids])].slice(-200))); } catch {}
}

function cargarImagenEquipo(url) {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// La medalla dibujada: círculo con el color del metal y su emoji.
function dibujarMedalla(ctx, cx, cy, r, tipo) {
  const metal = { oro: ['#FFE08A', '#E8A317'], plata: ['#F1F1F1', '#9CA3AF'], bronce: ['#F4B183', '#B4652A'] }[tipo] || ['#FF9A4D', '#E8590C'];
  // Cintas
  ctx.fillStyle = '#E8590C';
  ctx.beginPath(); ctx.moveTo(cx - r * 0.75, cy - r * 2.1); ctx.lineTo(cx - r * 0.15, cy - r * 2.1); ctx.lineTo(cx + r * 0.25, cy - r * 0.8); ctx.lineTo(cx - r * 0.35, cy - r * 0.8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#FF7020';
  ctx.beginPath(); ctx.moveTo(cx + r * 0.75, cy - r * 2.1); ctx.lineTo(cx + r * 0.15, cy - r * 2.1); ctx.lineTo(cx - r * 0.25, cy - r * 0.8); ctx.lineTo(cx + r * 0.35, cy - r * 0.8); ctx.closePath(); ctx.fill();
  ctx.save();
  ctx.shadowColor = 'rgba(255,112,32,0.7)'; ctx.shadowBlur = 50;
  const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
  g.addColorStop(0, metal[0]); g.addColorStop(1, metal[1]);
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
  ctx.restore();
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2); ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(22,17,13,0.25)'; ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // Podio: el número del puesto; las demás, su emoji.
  const puesto = { oro: '1', plata: '2', bronce: '3' }[tipo];
  if (puesto) {
    ctx.font = `${Math.round(r * 1.1)}px Anton, Impact, Arial Black, sans-serif`;
    ctx.fillStyle = 'rgba(22,17,13,0.8)';
    ctx.fillText(puesto, cx, cy + r * 0.08);
  } else {
    ctx.font = `${Math.round(r * 0.95)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.fillText(MEDALLAS[tipo]?.emoji || '🏆', cx, cy + r * 0.05);
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

async function generarTarjetaMedalla({ nombre, m, codigo }) {
  try { await Promise.all([document.fonts?.load('120px Anton'), document.fonts?.load('600 40px "Work Sans"')]); } catch {}
  const CARBON = '#16110D', CREMA = '#FAF6F0', NARANJA = '#E8590C', NARANJA2 = '#FF7020', GRIS = '#A8A29E';
  const titulo = t => `${t}px Anton, Impact, Arial Black, sans-serif`;
  const cuerpo = (t, w = 500) => `${w} ${t}px "Work Sans", Arial, sans-serif`;
  const W = 1080, H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const caja = (x, y, w, h, r) => { ctx.beginPath(); if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); };
  const logro = LOGRO[m.medalla] || LOGRO.oro;
  const gorila = await cargarImagenEquipo('/logo-marca.webp');

  ctx.fillStyle = CARBON; ctx.fillRect(0, 0, W, H);
  const b1 = ctx.createRadialGradient(W / 2, 430, 20, W / 2, 430, 620);
  b1.addColorStop(0, 'rgba(232,89,12,0.35)'); b1.addColorStop(1, 'rgba(232,89,12,0)');
  ctx.fillStyle = b1; ctx.fillRect(0, 0, W, H);
  const b2 = ctx.createRadialGradient(W - 160, H - 300, 20, W - 160, H - 300, 560);
  b2.addColorStop(0, 'rgba(255,112,32,0.25)'); b2.addColorStop(1, 'rgba(255,112,32,0)');
  ctx.fillStyle = b2; ctx.fillRect(0, 0, W, H);

  ctx.font = titulo(46);
  ctx.fillStyle = CREMA; ctx.fillText('JONAH BEAST ', 70, 110);
  ctx.fillStyle = NARANJA; ctx.fillText('FUEL', 70 + ctx.measureText('JONAH BEAST ').width, 110);

  dibujarMedalla(ctx, W / 2, 450, 150, m.medalla);

  // El título va a la izquierda del gorila: si no entra, en dos líneas.
  const ANCHO = 540;
  const enLineas = tam => {
    ctx.font = titulo(tam);
    const lineas = [];
    logro.titulo.split(' ').forEach(p => {
      const prueba = lineas.length ? `${lineas[lineas.length - 1]} ${p}` : p;
      if (lineas.length && ctx.measureText(prueba).width <= ANCHO) lineas[lineas.length - 1] = prueba;
      else lineas.push(p);
    });
    return lineas;
  };
  let tam = 120, lineas = enLineas(tam);
  while (tam > 64 && (lineas.length > 2 || lineas.some(l => ctx.measureText(l).width > ANCHO))) { tam -= 6; lineas = enLineas(tam); }
  let y = 700;
  ctx.fillStyle = CREMA;
  lineas.forEach((l, i) => { ctx.fillText(l, 70, y + i * tam * 1.02, ANCHO); });
  y += (lineas.length - 1) * tam * 1.02;
  ctx.font = cuerpo(40, 600); ctx.fillStyle = NARANJA2; ctx.fillText(logro.linea, 74, y + 60, ANCHO);
  const equipo = m.apodo ? `${m.equipo} · ${m.apodo}` : m.equipo;
  ctx.font = cuerpo(36); ctx.fillStyle = CREMA; ctx.fillText(equipo, 74, y + 130, ANCHO);
  ctx.font = cuerpo(30); ctx.fillStyle = GRIS;
  ctx.fillText(`${nombre ? nombre + ' · ' : ''}reto del ${fechaCorta(m.reto_inicio)}`, 74, y + 180, ANCHO);

  if (gorila) {
    const gh = 560, gw = gh * (gorila.width / gorila.height);
    const gx = W - gw - 20, gy = 640;
    ctx.save(); ctx.shadowColor = 'rgba(255,112,32,0.55)'; ctx.shadowBlur = 50;
    ctx.drawImage(gorila, gx, gy, gw, gh); ctx.restore();
    ctx.font = titulo(46);
    const bw = ctx.measureText(logro.globo).width + 60, bh = 86;
    const bx = Math.min(W - bw - 30, gx + gw / 2 - bw / 2), by = gy - bh - 26;
    caja(bx, by, bw, bh, 40); ctx.fillStyle = CREMA; ctx.fill();
    ctx.beginPath(); ctx.moveTo(bx + bw / 2 - 18, by + bh - 2); ctx.lineTo(bx + bw / 2 + 18, by + bh - 2); ctx.lineTo(bx + bw / 2 + 4, by + bh + 30); ctx.closePath(); ctx.fill();
    ctx.fillStyle = CARBON; ctx.fillText(logro.globo, bx + 30, by + 62);
  }

  ctx.font = cuerpo(34, 600); ctx.fillStyle = CREMA;
  ctx.fillText('El cambio llega poco a poco, comida a comida 🦍', 70, H - 130, W - 140);
  const pie = codigo ? `JONAHBEAST.COM · MI CÓDIGO: ${codigo} (10% DCTO)` : 'JONAHBEAST.COM';
  let tamPie = 44; ctx.font = titulo(tamPie);
  while (tamPie > 26 && ctx.measureText(pie).width > W - 140) { tamPie -= 2; ctx.font = titulo(tamPie); }
  ctx.fillStyle = NARANJA2; ctx.fillText(pie, 70, H - 66);

  return new Promise((resolve, reject) => {
    try { canvas.toBlob(b => (b ? resolve(b) : reject(new Error('sin imagen'))), 'image/png'); } catch (e) { reject(e); }
  });
}

export function MedallaNueva({ username, nombre, onVerEquipo }) {
  const [nuevas, setNuevas] = useState([]);
  const [compartiendo, setCompartiendo] = useState(false);
  useEffect(() => {
    let vivo = true;
    llamar('equipo_mis').then(({ r, ok }) => {
      if (!vivo || !ok) return;
      const vistas = new Set(leerVistas());
      const limite = Date.now() - 14 * 86400000;
      const lista = (r.medallas || []).filter(m => !vistas.has(m.id) && Date.parse(m.entregada) >= limite);
      lista.sort((a, b) => ORDEN_MEDALLAS.indexOf(a.medalla) - ORDEN_MEDALLAS.indexOf(b.medalla));
      setNuevas(lista);
    });
    return () => { vivo = false; };
  }, [username]);

  if (!nuevas.length) return null;
  const m = nuevas[0];
  const logro = LOGRO[m.medalla] || LOGRO.oro;
  const n = String(nombre || '').trim().split(/\s+/)[0];
  const otras = nuevas.slice(1);
  const cerrar = () => { marcarVistas(nuevas.map(x => x.id)); setNuevas([]); };

  async function compartir() {
    setCompartiendo(true);
    try {
      const { data } = await supabase.rpc('mi_codigo_invitacion');
      const codigo = data?.codigo || null;
      const blob = await generarTarjetaMedalla({ nombre: n, m, codigo });
      const archivo = new File([blob], 'mi-medalla-jonah-beast.png', { type: 'image/png' });
      const texto = `¡Gané ${MEDALLAS[m.medalla]?.emoji} en el reto de mi equipo en Jonah Beast Fuel! 🦍 Comida a comida.${codigo ? ` Únete con mi link y tienes 10% de descuento: https://jonahbeast.com/?ref=${encodeURIComponent(codigo)}&fuente=medalla` : ' https://jonahbeast.com'}`;
      if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
        await navigator.share({ files: [archivo], title: 'Mi medalla en Jonah Beast Fuel', text: texto });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'mi-medalla-jonah-beast.png'; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 3000);
      }
    } catch (e) {
      if (e?.name !== 'AbortError') showToast('No se pudo armar la imagen. Intenta de nuevo.', 'error');
    }
    setCompartiendo(false);
  }

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50" onClick={cerrar}>
      <style>{`
        @keyframes jb-medalla-entra { 0% { transform: scale(.3) rotate(-25deg); opacity: 0 } 60% { transform: scale(1.12) rotate(6deg); opacity: 1 } 100% { transform: scale(1) rotate(0) } }
        @keyframes jb-gorila-entra { from { transform: translateY(40px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
      <div className="relative bg-zinc-900 border border-orange-500/60 rounded-3xl max-w-sm w-full p-6 text-center overflow-hidden"
        style={{ boxShadow: '0 0 60px -12px rgba(232,89,12,.65)' }} onClick={e => e.stopPropagation()}>
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(232,89,12,.3), transparent 70%)' }} />
        <div className="relative flex items-end justify-center gap-2 mb-3">
          <img src="/logo-marca.webp" alt="Jonah" className="w-28 h-auto" style={{ animation: 'jb-gorila-entra .6s ease both' }} />
          <div className="relative mb-6">
            <div className="absolute -top-12 -left-6 whitespace-nowrap bg-zinc-50 text-zinc-950 jb-display text-sm px-3 py-1.5 rounded-2xl">{logro.globo}</div>
            <div className="w-24 h-24 rounded-full flex items-center justify-center text-6xl"
              style={{ animation: 'jb-medalla-entra .9s .35s cubic-bezier(.2,.9,.3,1.3) both', background: 'radial-gradient(circle at 35% 30%, rgba(255,224,138,.35), rgba(232,89,12,.15))', boxShadow: '0 0 40px rgba(255,112,32,.6)' }}>
              {MEDALLAS[m.medalla]?.emoji || '🏆'}
            </div>
          </div>
        </div>
        <p className="relative jb-body text-[11px] text-orange-300 uppercase tracking-wider">{m.apodo ? `${m.equipo} · ${m.apodo}` : m.equipo}</p>
        <h2 className="relative jb-display text-3xl text-zinc-50 leading-tight mb-1">{logro.titulo}</h2>
        <p className="relative jb-body text-sm text-orange-200 mb-3">{logro.linea}</p>
        <p className="relative jb-body text-sm text-zinc-300 mb-3">
          ¡Lo lograste{n ? `, ${n}` : ''}! Esta medalla te la ganaste comida a comida, con constancia. Estoy orgulloso de ti. ¡Vamos por el siguiente reto! — Jonah 🦍
        </p>
        {m.premio && ['oro', 'carrera', 'meta', 'meta_personal'].includes(m.medalla) && (
          <p className="relative jb-body text-sm text-zinc-100 bg-zinc-950/70 border border-zinc-800 rounded-xl p-2.5 mb-3">🎁 Premio del reto: {m.premio}</p>
        )}
        {otras.length > 0 && (
          <p className="relative jb-body text-xs text-zinc-400 mb-3">Además ganaste: {otras.map(o => `${MEDALLAS[o.medalla]?.emoji} ${MEDALLAS[o.medalla]?.texto}`).join(' · ')}</p>
        )}
        <button onClick={compartir} disabled={compartiendo} className={btnPrimary + ' relative w-full py-3 mb-2'}>
          {compartiendo ? <Loader2 className="animate-spin" size={16} /> : '📲 Compartir mi medalla'}
        </button>
        <button onClick={() => { cerrar(); onVerEquipo?.(); }} className={btnGhost + ' relative w-full py-2.5 mb-1 text-sm'}>Ver el podio</button>
        <button onClick={cerrar} className="relative jb-body text-sm text-zinc-500 hover:text-zinc-300 w-full py-2">Cerrar</button>
      </div>
    </div>
  );
}
