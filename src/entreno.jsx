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
import { btnPrimary, btnGhost, showToast, confirmar, vibrar, todayISO, addDaysISO } from './App.jsx';
import { ReglaDeslizable } from './regla.jsx';

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
  const [dia, setDia] = useState(null); // fecha que se está anotando (hoy o ayer)
  const [hoyNo, setHoyNo] = useState(() => { try { return localStorage.getItem(CLAVE_HOY_NO) === todayISO(); } catch { return false; } });

  async function cargar() {
    const { data } = await supabase.from('entrenos').select('fecha, tipos, minutos')
      .eq('username', username).gte('fecha', addDaysISO(todayISO(), -27)).order('fecha', { ascending: false });
    setLista(data || []);
  }
  useEffect(() => { cargar().catch(() => setLista([])); }, [username]);

  if (!lista) return null;
  const hoy = todayISO();
  const ayer = addDaysISO(hoy, -1);
  const deHoy = lista.find(e => e.fecha === hoy);
  const deAyer = lista.find(e => e.fecha === ayer);
  const semana = Array.from({ length: 7 }, (_, i) => addDaysISO(addDaysISO(hoy, (new Date().getDay() || 7) * -1 + 1), i));
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

  // Hoja para anotar (hoy o ayer): qué hiciste y cuánto tiempo.
  function abrir(fecha) {
    const e = lista.find(x => x.fecha === fecha);
    setDia(fecha);
    setTipos(e?.tipos || []);
    setMinutos(e?.minutos || 45);
    setAbierto(true);
  }
  async function guardar() {
    if (!tipos.length) { showToast('Elige qué hiciste (puedes marcar varios).', 'error'); return; }
    setGuardando(true);
    const { error } = await supabase.from('entrenos').upsert(
      { username, fecha: dia || hoy, tipos, minutos, updated_at: new Date().toISOString() },
      { onConflict: 'username,fecha' });
    setGuardando(false);
    if (error) { showToast('No se pudo guardar. Revisa tu internet e intenta de nuevo.', 'error'); return; }
    vibrar(30);
    showToast('💪 ¡Entreno anotado! Comida a comida y entreno a entreno.');
    setAbierto(false);
    cargar();
  }
  async function borrar() {
    const f = dia || hoy;
    if (!(await confirmar({ titulo: f === hoy ? '¿BORRAR EL ENTRENO DE HOY?' : '¿BORRAR EL ENTRENO DE AYER?', si: 'Borrar', peligro: true }))) return;
    const { error } = await supabase.from('entrenos').delete().eq('username', username).eq('fecha', f);
    if (error) { showToast('No se pudo borrar. Intenta de nuevo.', 'error'); return; }
    setAbierto(false);
    cargar();
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

      {abierto && (
        // Hoja que sube desde abajo (no empuja el Inicio).
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => !guardando && setAbierto(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative bg-zinc-900 border-t border-orange-500/50 rounded-t-3xl w-full max-w-lg mx-auto px-5 pt-3 max-h-[90vh] overflow-y-auto"
            style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))', boxShadow: '0 -12px 40px rgba(232,89,12,.18)' }}
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-zinc-700 mx-auto mb-4" />
            <p className="jb-display text-xl text-zinc-50 mb-3">💪 {dia === ayer ? '¿QUÉ ENTRENASTE AYER?' : '¿QUÉ ENTRENASTE HOY?'}</p>
            <div className="grid grid-cols-2 gap-1 p-1 mb-4 bg-zinc-950 border border-zinc-800 rounded-xl" role="group" aria-label="Día">
              {[[hoy, 'Hoy'], [ayer, 'Ayer']].map(([f, l]) => (
                <button key={f} type="button" onClick={() => abrir(f)}
                  className={`jb-body text-sm font-semibold py-2 rounded-lg ${dia === f ? 'bg-orange-500 text-zinc-950' : 'text-zinc-400'}`}>
                  {l}{lista.some(e => e.fecha === f) ? ' ✓' : ''}
                </button>
              ))}
            </div>
            <p className="jb-body text-xs text-zinc-500 mb-2">Marca uno o varios (si hiciste un mix, márcalos todos).</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {TIPOS_ENTRENO.map(t => {
                const activo = tipos.includes(t.id);
                return (
                  <button key={t.id} type="button" onClick={() => { vibrar(8); setTipos(v => (activo ? v.filter(x => x !== t.id) : [...v, t.id])); }}
                    className={`jb-body text-sm px-3 py-2 min-h-[40px] rounded-full border transition-colors ${activo ? 'bg-orange-500 border-orange-500 text-zinc-950 font-semibold' : 'bg-zinc-950 border-zinc-800 text-zinc-300'}`}>
                    {t.emoji} {t.label}
                  </button>
                );
              })}
            </div>
            <p className="jb-display text-xs text-zinc-300 mb-1">¿CUÁNTO TIEMPO EN TOTAL?</p>
            <p className="jb-display text-4xl text-orange-400 text-center tabular-nums">{minutos >= 120 ? `${Math.floor(minutos / 60)} h${minutos % 60 ? ` ${minutos % 60}` : ''}` : minutos} <span className="jb-body text-sm text-zinc-400">{minutos >= 120 ? '' : 'min'}</span></p>
            <ReglaDeslizable valor={minutos} onCambio={setMinutos} paso={5} min={5} max={240} inicial={45} etiqueta="los minutos" />
            <p className="jb-body text-[11px] text-zinc-500 mt-3 mb-3">No suma calorías a tu día: tu nivel de actividad ya incluye tus entrenos. Cuenta para tu constancia.</p>
            <button onClick={guardar} disabled={guardando} className={btnPrimary + ' w-full py-3.5 text-base'}>
              {guardando ? <Loader2 className="animate-spin" size={16} /> : 'Guardar'}
            </button>
            {lista.some(e => e.fecha === dia) && (
              <button onClick={borrar} disabled={guardando} className="w-full jb-body text-sm text-red-400 border border-red-500/40 rounded-xl py-3 mt-2">Borrar este entreno</button>
            )}
            <button onClick={() => setAbierto(false)} disabled={guardando} className="block mx-auto jb-body text-sm text-zinc-500 mt-3 px-3 py-2">Cancelar</button>
          </div>
        </div>
      )}

      {(deHoy || !hoyNo) && (
        // flex-wrap: con letra grande en el celular, los botones bajan a
        // otra línea en vez de tapar el texto.
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 mb-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="text-2xl shrink-0">💪</span>
            <span className="flex-1 min-w-[9rem] break-words">
              <span className="block jb-body text-sm text-zinc-100">
                {deHoy ? <>Hoy: {textoTipos(deHoy.tipos)} · {deHoy.minutos >= 120 ? `${Math.floor(deHoy.minutos / 60)} h${deHoy.minutos % 60 ? ` ${deHoy.minutos % 60} min` : ''}` : `${deHoy.minutos} min`}</> : '¿Entrenaste hoy?'}
              </span>
              <span className="block jb-body text-[11px] text-zinc-500">Esta semana: {estaSemana} {estaSemana === 1 ? 'entreno' : 'entrenos'}</span>
            </span>
            <span className="ml-auto flex items-center gap-2 shrink-0">
              {deHoy ? (
                <button onClick={() => abrir(hoy)} className="jb-body text-xs text-orange-400 px-2 py-2.5 -my-1">Editar</button>
              ) : (
                <>
                  <button onClick={() => abrir(hoy)} className={btnPrimary + ' px-3 py-2 text-sm'}>Anotar</button>
                  <button onClick={() => { try { localStorage.setItem(CLAVE_HOY_NO, hoy); } catch {} setHoyNo(true); }}
                    className="jb-body text-xs text-zinc-500 px-2 py-2.5 -my-1">Hoy no</button>
                </>
              )}
            </span>
          </div>
          {/* La semana: un puntito por día (verde = entrenó). */}
          <div className="flex items-center justify-between mt-3 gap-1">
            {semana.map((f, i) => {
              const hizo = lista.some(e => e.fecha === f);
              const futuro = f > hoy;
              return (
                <div key={f} className="flex flex-col items-center gap-1 flex-1">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${hizo ? 'bg-emerald-500 text-zinc-950' : futuro ? 'bg-zinc-900 border border-zinc-800' : 'bg-zinc-800 text-zinc-600'} ${f === hoy ? 'ring-2 ring-orange-500 ring-offset-1 ring-offset-zinc-900' : ''}`}>{hizo ? '✓' : ''}</span>
                  <span className={`jb-body text-[10px] ${f === hoy ? 'text-orange-400 font-semibold' : 'text-zinc-500'}`}>{['L', 'M', 'M', 'J', 'V', 'S', 'D'][i]}</span>
                </div>
              );
            })}
          </div>
          {!deAyer && (
            <button onClick={() => abrir(ayer)} className="jb-body text-xs text-zinc-400 hover:text-orange-400 underline mt-2 py-1">¿Entrenaste ayer y no lo anotaste? Anótalo aquí</button>
          )}
        </div>
      )}
    </>
  );
}
