// "💪 HOY ENTRENÉ" (Inicio). El alumno anota su entreno del día: uno o
// varios tipos (un mix, ej. pesas + cardio) y cuánto tiempo. Se guarda en la
// tabla entrenos (uno por día; se puede editar o borrar hoy o ayer).
//
// NO suma calorías: su nivel de actividad ("Mi cuerpo") ya incluye sus
// entrenos, y sumarlas otra vez sería contarlas dos veces. En cambio, cada 2
// semanas compara lo que anota con su nivel de actividad y, si no coincide,
// le sugiere cambiarlo (solo si él acepta).
import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from './supabaseClient';
import { btnPrimary, btnGhost, showToast, vibrar, todayISO, addDaysISO } from './App.jsx';

export const TIPOS_ENTRENO = [
  { id: 'pesas', label: 'Pesas', emoji: '🏋️' },
  { id: 'cardio', label: 'Cardio', emoji: '🏃' },
  { id: 'caminata', label: 'Caminata', emoji: '🚶' },
  { id: 'deporte', label: 'Deporte', emoji: '⚽' },
  { id: 'funcional', label: 'Funcional', emoji: '🔥' },
  { id: 'baile', label: 'Baile', emoji: '💃' },
  { id: 'otro', label: 'Otro', emoji: '✨' },
];
const MINUTOS = [15, 30, 45, 60, 90, 120];
const CLAVE_HOY_NO = 'jb-entreno-hoy-no';

// Días de entreno por semana → nivel de actividad (los de "Mi cuerpo").
function nivelPorDias(porSemana) {
  if (porSemana < 0.5) return 'Sedentario';
  if (porSemana < 2.5) return 'Ligero';
  if (porSemana < 5.5) return 'Moderado';
  return 'Intenso';
}
const ORDEN_NIVEL = ['Sedentario', 'Ligero', 'Moderado', 'Intenso', 'Muy intenso'];
const textoTipos = tipos => tipos.map(t => TIPOS_ENTRENO.find(x => x.id === t)?.label || t).join(' + ');

export function EntrenoHoy({ username, form, setForm }) {
  const [lista, setLista] = useState(null); // entrenos de las últimas 4 semanas
  const [abierto, setAbierto] = useState(false);
  const [tipos, setTipos] = useState([]);
  const [minutos, setMinutos] = useState(45);
  const [guardando, setGuardando] = useState(false);
  const [hoyNo, setHoyNo] = useState(() => { try { return localStorage.getItem(CLAVE_HOY_NO) === todayISO(); } catch { return false; } });

  async function cargar() {
    const { data } = await supabase.from('entrenos').select('fecha, tipos, minutos')
      .eq('username', username).gte('fecha', addDaysISO(todayISO(), -27)).order('fecha', { ascending: false });
    setLista(data || []);
  }
  useEffect(() => { cargar().catch(() => setLista([])); }, [username]);

  if (!lista) return null;
  const hoy = todayISO();
  const deHoy = lista.find(e => e.fecha === hoy);
  const dow = new Date().getDay();
  const lunes = addDaysISO(hoy, dow === 0 ? -6 : 1 - dow);
  const estaSemana = lista.filter(e => e.fecha >= lunes).length;

  // ¿Su nivel de actividad coincide con lo que entrena? Solo si ya lleva 2
  // semanas anotando, anotó algo en ellas y no lo revisó hace poco.
  const ultimos14 = lista.filter(e => e.fecha > addDaysISO(hoy, -14));
  const primero = lista.length ? lista[lista.length - 1].fecha : null;
  const revisado = form.actividadRevisada && form.actividadRevisada > addDaysISO(hoy, -14);
  const sugerido = nivelPorDias(ultimos14.length / 2);
  const actual = form.actividad || 'Moderado';
  const mismoNivel = sugerido === actual || (actual === 'Muy intenso' && sugerido === 'Intenso');
  const verSugerencia = primero && primero <= addDaysISO(hoy, -13) && ultimos14.length >= 1 && !revisado && !mismoNivel;

  async function guardar() {
    if (!tipos.length) { showToast('Elige qué hiciste (puedes marcar varios).', 'error'); return; }
    setGuardando(true);
    const { error } = await supabase.from('entrenos').upsert(
      { username, fecha: hoy, tipos, minutos, updated_at: new Date().toISOString() },
      { onConflict: 'username,fecha' });
    setGuardando(false);
    if (error) { showToast('No se pudo guardar. Revisa tu internet e intenta de nuevo.', 'error'); return; }
    vibrar(30);
    showToast('💪 ¡Entreno anotado! Comida a comida y entreno a entreno.');
    setAbierto(false);
    cargar();
  }
  async function borrar() {
    if (!window.confirm('¿Borrar el entreno de hoy?')) return;
    const { error } = await supabase.from('entrenos').delete().eq('username', username).eq('fecha', hoy);
    if (error) { showToast('No se pudo borrar. Intenta de nuevo.', 'error'); return; }
    cargar();
  }
  function editar() {
    setTipos(deHoy?.tipos || []);
    setMinutos(deHoy?.minutos || 45);
    setAbierto(true);
  }
  function responderSugerencia(si) {
    setForm(v => ({ ...v, ...(si ? { actividad: sugerido } : {}), actividadRevisada: hoy }));
    showToast(si ? `Listo: tu actividad ahora es "${sugerido}" y tus calorías ya se ajustaron.` : 'Listo. Te vuelvo a preguntar en 2 semanas.');
  }

  return (
    <>
      {verSugerencia && (
        <div className="bg-zinc-900 border border-orange-500/50 rounded-2xl p-4 mb-4">
          <p className="jb-display text-lg text-zinc-50 leading-tight mb-1">📊 ¿AJUSTAMOS TU ACTIVIDAD?</p>
          <p className="jb-body text-sm text-zinc-300 mb-1">
            En las últimas 2 semanas anotaste {ultimos14.length} {ultimos14.length === 1 ? 'entreno' : 'entrenos'} (unos {Math.round(ultimos14.length / 2)} por semana), pero tu actividad dice <b>"{actual}"</b>.
            ¿La cambiamos a <b>"{sugerido}"</b> para que tus calorías sean las correctas?
          </p>
          <p className="jb-body text-[11px] text-zinc-500 mb-3">Si entrenas más pero no siempre lo anotas, toca "Ahora no".</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => responderSugerencia(true)} className={btnPrimary + ' py-3'}>Sí, cámbiala</button>
            <button onClick={() => responderSugerencia(false)} className={btnGhost + ' py-3'}>Ahora no</button>
          </div>
        </div>
      )}

      {abierto ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
          <p className="jb-display text-lg text-zinc-50 mb-1">💪 ¿QUÉ ENTRENASTE HOY?</p>
          <p className="jb-body text-[11px] text-zinc-500 mb-3">Marca uno o varios (si hiciste un mix, márcalos todos).</p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {TIPOS_ENTRENO.map(t => {
              const activo = tipos.includes(t.id);
              return (
                <button key={t.id} type="button" onClick={() => setTipos(v => (activo ? v.filter(x => x !== t.id) : [...v, t.id]))}
                  className={`jb-body text-sm px-3 py-2 rounded-full border transition-colors ${activo ? 'bg-orange-500 border-orange-500 text-zinc-950 font-semibold' : 'bg-zinc-950 border-zinc-800 text-zinc-300'}`}>
                  {t.emoji} {t.label}
                </button>
              );
            })}
          </div>
          <p className="jb-display text-xs text-zinc-300 mb-2">¿CUÁNTO TIEMPO EN TOTAL?</p>
          <div className="grid grid-cols-6 gap-1.5 mb-4">
            {MINUTOS.map(m => (
              <button key={m} type="button" onClick={() => setMinutos(m)}
                className={`jb-body text-xs py-2 rounded-lg border ${minutos === m ? 'bg-orange-500 border-orange-500 text-zinc-950 font-semibold' : 'bg-zinc-950 border-zinc-800 text-zinc-300'}`}>
                {m === 120 ? '2 h+' : `${m}'`}
              </button>
            ))}
          </div>
          <p className="jb-body text-[11px] text-zinc-500 mb-3">No suma calorías a tu día: tu nivel de actividad ya incluye tus entrenos. Cuenta para tu constancia.</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={guardar} disabled={guardando} className={btnPrimary + ' py-3'}>
              {guardando ? <Loader2 className="animate-spin" size={16} /> : 'Guardar'}
            </button>
            <button onClick={() => setAbierto(false)} disabled={guardando} className={btnGhost + ' py-3'}>Cancelar</button>
          </div>
        </div>
      ) : deHoy ? (
        // flex-wrap: con letra grande en el celular, los botones bajan a
        // otra línea en vez de tapar el texto.
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-2xl shrink-0">💪</span>
          <span className="flex-1 min-w-[9rem] break-words">
            <span className="block jb-body text-sm text-zinc-100">Hoy: {textoTipos(deHoy.tipos)} · {deHoy.minutos >= 120 ? '2 h o más' : `${deHoy.minutos} min`}</span>
            <span className="block jb-body text-[11px] text-zinc-500">Esta semana: {estaSemana} {estaSemana === 1 ? 'entreno' : 'entrenos'}</span>
          </span>
          <span className="ml-auto flex items-center gap-3 shrink-0">
            <button onClick={editar} className="jb-body text-xs text-orange-400">Editar</button>
            <button onClick={borrar} className="jb-body text-xs text-zinc-500">Borrar</button>
          </span>
        </div>
      ) : !hoyNo ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-2xl shrink-0">💪</span>
          <span className="flex-1 min-w-[9rem] break-words">
            <span className="block jb-body text-sm text-zinc-100">¿Entrenaste hoy?</span>
            {estaSemana > 0 && <span className="block jb-body text-[11px] text-zinc-500">Esta semana: {estaSemana} {estaSemana === 1 ? 'entreno' : 'entrenos'}</span>}
          </span>
          <span className="ml-auto flex items-center gap-3 shrink-0">
            <button onClick={() => { setTipos([]); setMinutos(45); setAbierto(true); }} className={btnPrimary + ' px-3 py-2 text-sm'}>Anotar</button>
            <button onClick={() => { try { localStorage.setItem(CLAVE_HOY_NO, hoy); } catch {} setHoyNo(true); }}
              className="jb-body text-[11px] text-zinc-500">Hoy no</button>
          </span>
        </div>
      ) : null}
    </>
  );
}
