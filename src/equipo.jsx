// EQUIPOS: retos en grupo (pestaña "Equipo" de la app del alumno).
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
  premio: 'Ese premio no se puede usar. Escríbelo de otra forma (de 2 a 80 letras, sin groserías).',
  meta: 'Revisa la meta: falta el número o no corresponde al tipo de reto.',
  meta_rapida: 'Esa meta es muy rápida para hacerla bien. Dales más tiempo o pon una meta menor (como mucho 1 kg o 1% por semana).',
  oficial_comer: 'El Team Beast es un reto de comer mejor.',
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
              <li>Tres tipos de reto: 🍽️ <b>comer mejor</b>, 🤝 <b>meta juntos</b> (bajar de peso en equipo) y 🏁 <b>carrera</b> (gana el primero en llegar a la meta).</li>
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
    metaTipo: eq?.meta_tipo || (objetivo === 'juntos' ? 'kg_cada' : objetivo === 'carrera' ? 'carrera_kg' : 'comidas'),
    metaValor: eq?.meta_valor != null ? String(eq.meta_valor) : '',
    inicio: eq?.inicio && eq.inicio > hoyISO() ? eq.inicio : proximoLunes(),
    dias: [14, 28, 56].includes(dias) ? dias : 28,
    hasta: eq && ![14, 28, 56].includes(dias) && eq.inicio > hoyISO() ? eq.fin : null,
    premio: eq?.premio || '',
  };
}

// Mismo control que hace la base (private.equipo_meta_error): como mucho
// 1 kg o 1% por persona por semana.
function errorConfig(c, oficial) {
  const dias = diasDelReto(c);
  if (!(dias >= 14 && dias <= 120)) return 'El reto debe durar entre 14 y 120 días.';
  const v = Number(String(c.metaValor).replace(',', '.'));
  if (c.objetivo === 'comer') {
    if (oficial || !String(c.metaValor).trim()) return '';
    return v >= 10 ? '' : 'La meta de comidas debe ser de 10 o más (o déjala vacía).';
  }
  if (!(v > 0)) return 'Escribe el número de la meta.';
  const semanas = dias / 7;
  if (['kg_cada', 'carrera_kg', 'pct_total', 'carrera_pct'].includes(c.metaTipo) && v > semanas) {
    const u = c.metaTipo.endsWith('pct') || c.metaTipo === 'pct_total' ? '%' : ' kg';
    return `Muy rápido para hacerlo bien: en ${Math.round(semanas)} semanas, como mucho ${fmtNum(Math.floor(semanas * 10) / 10)}${u}. Dales más tiempo o baja la meta.`;
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
        <div className="flex items-center gap-2 mb-1">
          <span className="jb-body text-sm text-zinc-300">Hasta el</span>
          <input type="date" value={c.hasta} min={masDias(c.inicio, 13)} max={masDias(c.inicio, 119)}
            onChange={e => e.target.value && cambiar({ hasta: e.target.value })} className={inputCls + ' rounded-xl'} />
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

function CrearEquipo({ nombre, onCancelar, onCreado }) {
  const primero = String(nombre || '').trim().split(/\s+/)[0];
  const [apodo, setApodo] = useState('');
  const titulo = `Team Beast de ${primero.length >= 2 ? primero.charAt(0).toUpperCase() + primero.slice(1).toLowerCase() : 'tu nombre'}`;
  const [c, setC] = useState(() => configInicial(null));
  const [whatsapp, setWhatsapp] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');

  async function crear() {
    setError('');
    const err = errorConfig(c, false);
    if (err) { setError(err); return; }
    setOcupado(true);
    const { r, ok, error: e } = await llamar('equipo_crear', {
      p_nombre: apodo.trim() || null, p_whatsapp: whatsapp.trim() || null, ...paramsConfig(c),
    });
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
      <p className="jb-body text-sm text-zinc-400 mb-5">Con tu familia, tus amigos o tus compañeros del trabajo. Hasta 30 personas.</p>
      <Tarjeta>
        <p className="jb-body text-xs text-zinc-500 uppercase tracking-wider mb-1">Tu equipo se llamará</p>
        <p className="jb-display text-2xl text-zinc-50 leading-tight">{titulo.toUpperCase()} 🦍</p>
        <p className="jb-display text-lg text-orange-400 mb-4 min-h-[1.75rem]">{apodo.trim() ? apodo.trim().toUpperCase() : ''}</p>
        <p className="jb-body text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Apodo del equipo (opcional)</p>
        <input value={apodo} onChange={e => setApodo(e.target.value.slice(0, 24))} placeholder="Ej. Los Imparables"
          className={inputCls + ' w-full rounded-xl mb-1'} />
        <p className="jb-body text-[11px] text-zinc-500 mb-4">Hasta 24 letras. Se verá así: "{titulo} · {apodo.trim() || 'Los Imparables'}". Lo puedes cambiar después.</p>
        <ConfigReto c={c} setC={setC} oficial={false} />
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

  const subtitulo = eq.oficial ? `Reto de ${eq.dias} días con Jonah` : `Reto de ${eq.dias} días`;
  const objetivo = OBJETIVOS.find(o => o.id === eq.objetivo) || OBJETIVOS[0];
  const conPeso = eq.objetivo !== 'comer';
  // Podio (al terminar): los 3 con más puntos (Jonah no compite en su Team Beast).
  const podio = eq.miembros.filter(m => m.medalla_posible && m.puntos > 0).slice(0, 3);
  const ganadorCarrera = eq.miembros.find(m => m.ganador);

  async function compartir(nivel) {
    const { r, ok, error: e } = await llamar('equipo_compartir', { p_id: id, p_nivel: nivel });
    if (!ok) { showToast(mensajeError(r, e), 'error'); return; }
    vibrar(20);
    showToast(nivel === 'nada' ? 'Listo: participas solo con tu constancia.' : nivel === 'total' ? 'Listo: tu avance suma al total del equipo, sin verse por separado.' : 'Listo: el equipo verá tus kilos bajados (nunca tu peso).');
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
        {objetivo.emoji} {objetivo.titulo}{eq.premio ? <> · 🎁 <span className="text-zinc-200">Premio: {eq.premio}</span></> : null}
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

      {eq.progreso && <MetaEquipo eq={eq} />}

      {conPeso && eq.yo && !eq.terminado && <MiAvance eq={eq} onCompartir={compartir} />}

      {eq.soy_capitan && (eq.terminado ? (
        <NuevoReto eq={eq} titulo="ARRANCA OTRO RETO" boton="Empezar nuevo reto" onListo={() => { setSemana(null); cargar(null); }} />
      ) : (eq.oficial || !empezo) && (programar ? (
        <NuevoReto eq={eq} titulo="PROGRAMA EL RETO" boton="Guardar reto"
          ayuda={empezo ? 'El reto ya está en marcha: si cambias la fecha, empieza de nuevo desde ese día.' : 'Mientras tanto, la gente se puede unir e invitar a otros.'}
          onCancelar={() => setProgramar(false)} onListo={() => { setProgramar(false); setSemana(null); cargar(null); }} />
      ) : (
        <button onClick={() => setProgramar(true)} className={btnGhost + ' w-full py-2.5 mb-3 rounded-xl text-sm'}>
          {eq.oficial ? '📅 Cambiar fechas, meta y premio del reto' : '⚙️ Cambiar el reto: tipo, meta, fechas y premio'}
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
                    −{fmtNum(m.peso.kg)} kg · {fmtNum(m.peso.pct)}%{m.peso.llego ? ' 🎯' : ''}{m.ganador ? ' 🏁' : ''}
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
    titulo = `🤝 META: BAJAR ${fmtNum(meta)} KG ENTRE TODOS`;
    linea = `Juntos ya bajaron ${fmtNum(p.valor)} de ${fmtNum(meta)} kg`;
    extra = p.participantes ? `${p.participantes} ${p.participantes === 1 ? 'persona suma' : 'personas suman'} su avance` : '';
    avance = p.valor / meta;
  } else if (p.tipo === 'kg_cada') {
    titulo = `🎯 META: CADA UNO BAJA ${fmtNum(meta)} KG`;
    linea = p.participantes ? `${p.valor} de ${p.participantes} ya llegaron a su meta` : '';
    extra = p.participantes >= 2 ? `Juntos: ${fmtNum(p.kg_juntos)} kg menos 💪` : '';
    avance = p.participantes ? p.valor / p.participantes : 0;
  } else {
    titulo = `🏁 CARRERA: EL PRIMERO EN BAJAR ${fmtNum(meta)}${unidad.toUpperCase()}`;
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
       { id: 'avance', texto: 'Competir con mi avance', ayuda: 'El equipo ve tus kilos bajados (nunca tu peso).' }]
    : [{ id: 'nada', texto: 'Solo constancia', ayuda: 'Tu peso no cuenta para la meta.' },
       { id: 'total', texto: 'Sumar en privado', ayuda: 'Tu avance suma al total del equipo, sin verse por separado.' },
       { id: 'avance', texto: 'Mostrar mi avance', ayuda: 'El equipo ve tus kilos bajados (nunca tu peso).' }];
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
          Tú: −{fmtNum(yo.kg)} kg · {fmtNum(yo.pct)}%{yo.llego ? ' 🎯 ¡llegaste a la meta!' : ''}
          <span className="block jb-body text-[11px] text-zinc-500">Se cuenta con tu pesaje de cada semana, como mucho 1% por semana para que sea sano. Poco a poco, comida a comida 💪</span>
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
