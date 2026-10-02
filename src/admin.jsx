// Parte de la app que se descarga solo cuando hace falta (admin).
// Se generó separando src/App.jsx: el código es el mismo de antes.
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Plus, Trash2, LogOut, Eye, ShieldCheck, X, ChevronRight, Flame, Salad, UserPlus, AlertTriangle, Loader2, MessageCircle, Target, LayoutDashboard, TrendingUp, Camera, CreditCard, Mic, ShoppingCart, Phone } from 'lucide-react';
import { supabase, supabaseUrl, supabaseKey } from './supabaseClient';
import { opcionesUsoMenu } from './menuDia.js';
import { cargarDatosCarino, armarListaCarino, enlaceWhatsApp, CLAVE_ESCRITOS, ETAPAS, NIVELES, anotarEscrito, leerEscritos } from './listaCarino.js';
import { costoUsdIA, saldoEstimado, puntoDePartidaSaldo, SALDO_IA_MINIMO_USD, leerRecargaAuto, RECARGA_AUTO_POR_DEFECTO } from './saldoIA.js';
import {
  ANGULOS,
  CATEGORIAS_TIENDA,
  FOODS,
  Field,
  HOSTS_PRODUCCION,
  MEAL_NAMES,
  PLANES,
  Skeleton,
  StatCard,
  TRIAL_DAYS,
  VAPID_PUBLIC,
  addDaysISO,
  addMonthsISO,
  BONO_DIAS,
  ganaBonoSuscripcion,
  base64ToUint8,
  btnGhost,
  btnPrimary,
  buscarFood,
  calcAll,
  cargarAlimentosExtra,
  daysLeft,
  entryMacros,
  fechaLocalISO,
  fmtS,
  inputCls,
  membershipActive,
  showToast,
  tieneDatosBasicos,
  todayISO,
} from './App.jsx';
import { traerTodas } from './traerTodas.js';
import { analizarProgreso, resumenProgreso, historialDePeso, historialComposicion } from './progreso.js';

const btnDanger = "bg-transparent border border-red-900 hover:bg-red-950 text-red-400 jb-body rounded-lg px-3 py-2 transition-colors flex items-center justify-center gap-2 text-sm";

function membershipLabel(u) {
  if (!u.enabled) return { text: 'Deshabilitado por ti', color: 'text-red-400', dot: 'bg-red-500' };
  const dl = daysLeft(u.fechaVencimiento);
  if (dl === null) return { text: 'Activo · sin vencimiento', color: 'text-emerald-400', dot: 'bg-emerald-500' };
  if (dl < 0) return { text: `${(u.plan === 'trial' || u.plan === 'prueba') ? 'Prueba terminada' : 'Plan vencido'} hace ${Math.abs(dl)} día(s)`, color: 'text-red-400', dot: 'bg-red-500' };
  if (dl === 0) return { text: 'Vence hoy', color: 'text-amber-400', dot: 'bg-amber-500' };
  if (dl <= 7) return { text: `Vence en ${dl} día(s)`, color: 'text-amber-400', dot: 'bg-amber-500' };
  return { text: `Activo · ${dl} días restantes`, color: 'text-emerald-400', dot: 'bg-emerald-500' };
}

function formatActivity(lastActivity) {
  if (!lastActivity) return { text: 'Sin actividad', color: 'text-zinc-500', dot: 'bg-zinc-600' };
  // Días de calendario en hora de Perú (UTC-5): si guardó anoche a las
  // 11 p. m., hoy dice "Ayer" aunque no hayan pasado 24 horas.
  const diaPeru = (ms) => Math.floor((ms - 5 * 3600 * 1000) / (1000 * 60 * 60 * 24));
  const days = diaPeru(Date.now()) - diaPeru(new Date(lastActivity).getTime());
  if (days < 1) return { text: 'Hoy', color: 'text-emerald-400', dot: 'bg-emerald-500' };
  if (days === 1) return { text: 'Ayer', color: 'text-emerald-400', dot: 'bg-emerald-500' };
  if (days < 7) return { text: `Hace ${days} días`, color: 'text-amber-400', dot: 'bg-amber-500' };
  if (days < 30) return { text: `Hace ${days} días`, color: 'text-red-400', dot: 'bg-red-500' };
  return { text: `Hace ${Math.floor(days / 30)} mes(es)`, color: 'text-red-400', dot: 'bg-red-500' };
}

function ReferidosPanel({ users, onCambio }) {
  const [refs, setRefs] = useState([]);
  const [refsCargados, setRefsCargados] = useState(false); // true solo cuando la lista llegó bien
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [nuevo, setNuevo] = useState({ codigo: '', nombre: '', telefono: '', pct: 10, desc: 10 });
  const [err, setErr] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [expandido, setExpandido] = useState(null);
  const [editando, setEditando] = useState(null); // código del embajador que se está editando
  const [editVal, setEditVal] = useState({ pct: 0, desc: 0 });
  const [guardandoEdit, setGuardandoEdit] = useState(false);
  const [precioMensual, setPrecioMensual] = useState(PLANES[0].precioDefault);

  useEffect(() => {
    cargar(); cargarPrecio();
    // Si la sesión de admin aún no estaba lista al abrir el panel, la lista llega
    // vacía; cuando la sesión se confirma o se renueva, se vuelve a cargar.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') cargar();
    });
    return () => sub?.subscription?.unsubscribe();
  }, []);

  async function cargarPrecio() {
    try {
      const { data } = await supabase.from('config').select('value').eq('key', 'precio_1').maybeSingle();
      const v = Number(data?.value);
      if (v > 0) setPrecioMensual(v);
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
  }

  async function cargar() {
    setLoading(true);
    try {
      // Esperar la sesión: sin ella la base responde una lista vacía (solo el admin puede leer los códigos).
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const { data, error } = await supabase.from('referidores').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setRefs(data || []);
      setRefsCargados(true);
    } catch { /* se conserva la última lista buena */ }
    setLoading(false);
  }

  async function crear(e) {
    e.preventDefault();
    setErr('');
    const cod = nuevo.codigo.trim().toUpperCase().replace(/\s/g, '');
    if (!cod) return setErr('Escribe el código.');
    if (!/^[A-Z0-9._-]+$/.test(cod)) return setErr('El código solo puede tener letras, números, punto, guion o guion bajo.');
    if (!nuevo.nombre.trim()) return setErr('Escribe el nombre de la persona.');
    if (refs.some(r => r.codigo.toUpperCase() === cod)) return setErr('Ese código ya existe. Si es el mismo embajador, edita su código actual en vez de crear uno nuevo.');
    setGuardando(true);
    try {
      const token = cod.toLowerCase() + '-' +
        Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 6);
      const { error } = await supabase.from('referidores').insert({
        codigo: cod, nombre: nuevo.nombre.trim(),
        telefono: nuevo.telefono.trim().replace(/\s/g, '') || null,
        tipo: 'influencer', token,
        comision_1: 0, comision_3: 0, comision_6: 0, comision_12: 0,
        comision_pct: Number(nuevo.pct) || 0,
        descuento_pct: Number(nuevo.desc) || 0,
        activo: true,
      });
      if (error) throw error;
      setNuevo({ codigo: '', nombre: '', telefono: '', pct: 10, desc: 10 });
      await cargar();
    } catch (e2) { setErr('No se pudo crear: ' + (e2.message || '')); }
    setGuardando(false);
  }

  function abrirEdicion(r) {
    setEditando(r.codigo);
    setEditVal({ pct: Number(r.comision_pct || 0), desc: Number(r.descuento_pct || 0) });
  }

  async function guardarEdicion(r) {
    setGuardandoEdit(true);
    try {
      // Al editar, el código queda siempre en formato "embajador" (%),
      // así un código antiguo de comisión fija también se actualiza al nuevo formato.
      await supabase.from('referidores').update({
        tipo: 'influencer',
        comision_pct: Number(editVal.pct) || 0,
        descuento_pct: Number(editVal.desc) || 0,
      }).eq('codigo', r.codigo);
      setEditando(null);
      await cargar();
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
    setGuardandoEdit(false);
  }

  async function alternar(r) {
    try {
      await supabase.from('referidores').update({ activo: !r.activo }).eq('codigo', r.codigo);
      await cargar();
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
  }

  async function eliminar(r) {
    const lista = porCodigo[r.codigo.toUpperCase()] || [];
    const aviso = lista.length > 0
      ? `${r.nombre} (${r.codigo}) tiene ${lista.length} referido(s) registrado(s). Se eliminará su código, pero esos alumnos y su historial de pagos se conservan — solo dejan de estar vinculados a este embajador. ¿Eliminar de todas formas?`
      : `¿Eliminar el código de ${r.nombre} (${r.codigo})? Esta acción no se puede deshacer.`;
    if (!window.confirm(aviso)) return;
    try {
      await supabase.from('referidores').delete().eq('codigo', r.codigo);
      // Desvincula de verdad a los alumnos que tenían este código, para que no
      // queden "huérfanos" (contando en el total pero sin aparecer en ninguna tarjeta).
      if (lista.length > 0) {
        await supabase.from('alumnos').update({ codigo_referido: null }).ilike('codigo_referido', r.codigo);
      }
      await cargar();
      if (onCambio) await onCambio();
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
  }

  async function desvincular(username) {
    try {
      await supabase.from('alumnos').update({ codigo_referido: null }).eq('username', username);
      if (onCambio) await onCambio();
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
  }

  async function marcarPagada(username) {
    try {
      await supabase.from('alumnos')
        .update({ comision_pagada: true, comision_pagada_en: new Date().toISOString() })
        .eq('username', username);
      if (onCambio) await onCambio();
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
  }

  async function revertirPago(username) {
    try {
      await supabase.from('alumnos')
        .update({ comision_pagada: false, comision_pagada_en: null })
        .eq('username', username);
      if (onCambio) await onCambio();
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
  }

  // Agrupar alumnos por código de referido
  const porCodigo = useMemo(() => {
    const m = {};
    (users || []).forEach(u => {
      if (!u.codigoReferido) return;
      const c = u.codigoReferido.toUpperCase();
      (m[c] = m[c] || []).push(u);
    });
    return m;
  }, [users]);

  const totalPendiente = refs.reduce((acc, r) => {
    const lista = porCodigo[r.codigo.toUpperCase()] || [];
    return acc + lista
      .filter(u => u.plan === 'pago' && !u.comisionPagada && u.comisionMonto)
      .reduce((a, u) => a + Number(u.comisionMonto), 0);
  }, 0);

  const totalReferidos = Object.values(porCodigo).reduce((a, l) => a + l.length, 0);

  // Alumnos con un código de referido que ya no existe entre los códigos activos
  // (típicamente porque ese código fue borrado o renombrado). Cuentan en el total
  // de arriba pero no aparecen en ninguna tarjeta de abajo si no se detectan aquí.
  const codigosActivos = new Set(refs.map(r => r.codigo.toUpperCase()));
  // Solo se revisa con una lista de códigos que llegó bien: una lista vacía por
  // sesión no lista haría ver a todos los referidos como "código borrado".
  const huerfanos = (!refsCargados || refs.length === 0) ? [] : (users || []).filter(u => u.codigoReferido && !codigosActivos.has(u.codigoReferido.toUpperCase()));
  // Los códigos de "Invita a un amigo" (tipo 'alumno') se muestran aparte:
  // no son embajadores y no generan comisión en dinero.
  const embajadores = refs.filter(r => r.tipo !== 'alumno');
  const invitaciones = refs.filter(r => r.tipo === 'alumno')
    .map(r => {
      const lista = porCodigo[r.codigo.toUpperCase()] || [];
      return { ...r, registrados: lista.length, pagaron: lista.filter(u => u.plan === 'pago').length };
    })
    .sort((a, b) => b.pagaron - a.pagaron || b.registrados - a.registrados);
  const embajadoresActivos = embajadores.filter(r => r.activo).length;

  function waRef(r, monto, cantidad) {
    const num = (r.telefono || '').replace(/\D/g, '');
    const full = num ? (num.length <= 9 ? '51' + num : num) : '';
    const texto = `Hola ${r.nombre}, te escribo de Jonah Beast Fuel. Tienes ${cantidad} referido(s) que ya pagaron su plan. Tu comisión es de S/${monto.toFixed(2)}.`;
    return full ? `https://wa.me/${full}?text=${encodeURIComponent(texto)}`
                : `https://wa.me/?text=${encodeURIComponent(texto)}`;
  }

  return (
    <div className={`rounded-2xl overflow-hidden border ${totalPendiente > 0 ? 'bg-zinc-900 border-emerald-700/50' : 'bg-zinc-900 border-zinc-800'}`}>
      <button onClick={() => setOpen(v => !v)} className="w-full px-5 py-4 flex items-center justify-between text-left">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-sm shrink-0">🤝</div>
          <h2 className="jb-display text-base text-zinc-200">
            EMBAJADORES ({embajadoresActivos} activos) · {totalReferidos} alumnos referidos
            {totalPendiente > 0 && (
              <span className="ml-2 bg-emerald-500 text-zinc-950 text-xs px-2 py-0.5 rounded-full">
                S/{totalPendiente.toFixed(0)} por pagar
              </span>
            )}
          </h2>
        </div>
        <ChevronRight size={18} className={`text-zinc-500 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-zinc-800 pt-4 flex flex-col gap-5">
          <div>
            <h3 className="jb-display text-sm text-zinc-300 mb-2">CREAR CÓDIGO DE EMBAJADOR</h3>
            <p className="jb-body text-xs text-zinc-500 mb-3">
              Entrégale el código a la persona. Si ya tienes un acuerdo con este mismo embajador,
              no crees otro código — edita el porcentaje del que ya existe más abajo.
            </p>
            <form onSubmit={crear} className="flex flex-col gap-3">
              <div className="grid sm:grid-cols-3 gap-2">
                <Field label="Código">
                  <input value={nuevo.codigo} onChange={e => setNuevo(v => ({ ...v, codigo: e.target.value }))}
                    className={inputCls + ' uppercase'} placeholder="EMBAJADORJUAN" />
                </Field>
                <Field label="Nombre">
                  <input value={nuevo.nombre} onChange={e => setNuevo(v => ({ ...v, nombre: e.target.value }))}
                    className={inputCls} placeholder="Juan Pérez" />
                </Field>
                <Field label="Celular">
                  <input type="tel" inputMode="tel" value={nuevo.telefono}
                    onChange={e => setNuevo(v => ({ ...v, telefono: e.target.value }))}
                    className={inputCls} placeholder="999888777" />
                </Field>
              </div>
              <div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="jb-body text-[11px] text-zinc-500 block mb-1">Comisión para él (%)</span>
                    <input type="number" step="1" value={nuevo.pct}
                      onChange={e => setNuevo(v => ({ ...v, pct: e.target.value }))}
                      className={inputCls + ' py-2'} />
                  </div>
                  <div>
                    <span className="jb-body text-[11px] text-zinc-500 block mb-1">Descuento al cliente (%)</span>
                    <input type="number" step="1" value={nuevo.desc}
                      onChange={e => setNuevo(v => ({ ...v, desc: e.target.value }))}
                      className={inputCls + ' py-2'} />
                  </div>
                </div>
                <p className="jb-body text-[11px] text-zinc-600 mt-2">
                  En base a tu precio mensual actual (S/{precioMensual.toFixed(2)}): con {nuevo.pct || 0}% de comisión y {nuevo.desc || 0}% de
                  descuento, el cliente paga S/{(precioMensual * (1 - (Number(nuevo.desc) || 0) / 100)).toFixed(2)},
                  él gana S/{(precioMensual * ((Number(nuevo.pct) || 0) / 100)).toFixed(2)} y
                  te quedan S/{(precioMensual * (1 - (Number(nuevo.desc) || 0) / 100) - precioMensual * ((Number(nuevo.pct) || 0) / 100)).toFixed(2)}.
                </p>
              </div>
              <button type="submit" disabled={guardando} className={btnPrimary + ' self-start'}>
                {guardando ? <Loader2 className="animate-spin" size={16} /> : <><Plus size={16} /> Crear código</>}
              </button>
            </form>
            {err && <p className="text-red-400 text-sm jb-body mt-2 flex items-center gap-1.5"><AlertTriangle size={14} />{err}</p>}
          </div>

          {huerfanos.length > 0 && (
            <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-3 flex flex-col gap-2">
              <p className="text-amber-300 text-xs jb-body flex items-center gap-1.5">
                <AlertTriangle size={14} className="shrink-0" />
                {huerfanos.length} alumno(s) tienen un código de referido que ya no existe entre tus códigos activos
                (seguramente fue borrado o cambiado). Por eso el total de arriba no cuadra con las tarjetas de abajo.
              </p>
              <div className="flex flex-col gap-1">
                {huerfanos.map(u => (
                  <div key={u.username} className="flex items-center justify-between gap-2 text-xs jb-body text-zinc-400 bg-zinc-950/60 rounded-lg px-2.5 py-1.5">
                    <span>{u.username} <span className="text-zinc-600">· código guardado: {u.codigoReferido}</span></span>
                    <button onClick={() => desvincular(u.username)} className="text-orange-500 hover:text-orange-400 shrink-0">Desvincular</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="jb-display text-sm text-zinc-300">CÓDIGOS ACTIVOS</h3>
              <button onClick={cargar} className={btnGhost + ' py-1 px-3 text-xs'}>Actualizar</button>
            </div>

            {loading ? (
              <Loader2 className="animate-spin text-orange-500" size={20} />
            ) : embajadores.length === 0 ? (
              <p className="text-zinc-500 text-sm">Aún no has creado códigos.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {embajadores.map(r => {
                  const lista = porCodigo[r.codigo.toUpperCase()] || [];
                  const pagaron = lista.filter(u => u.plan === 'pago');
                  const porPagar = pagaron.filter(u => !u.comisionPagada && u.comisionMonto);
                  const yaPagados = pagaron.filter(u => u.comisionPagada);
                  const montoPend = porPagar.reduce((a, u) => a + Number(u.comisionMonto), 0);
                  const abierto = expandido === r.codigo;
                  const editandoEste = editando === r.codigo;

                  return (
                    <div key={r.codigo} className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
                      <div className="p-3 flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="jb-display text-sm text-orange-500">{r.codigo}</span>
                            <span className="text-zinc-100 text-sm jb-body">{r.nombre}</span>
                            {!r.activo && <span className="text-red-400 text-xs jb-body">(desactivado)</span>}
                          </div>
                          <div className="text-zinc-500 text-xs jb-body mt-0.5">
                            {lista.length} inscrito(s) · {pagaron.length} pagaron
                          </div>

                          {!editandoEste ? (
                            <div className="text-zinc-600 text-[11px] jb-body mt-0.5">
                              Embajador · {Number(r.comision_pct || 0)}% comisión · {Number(r.descuento_pct || 0)}% dcto al cliente
                            </div>
                          ) : (
                            <div className="mt-2 bg-zinc-900 border border-orange-500/30 rounded-lg p-2.5 flex flex-col gap-2 max-w-xs">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="jb-body text-[10px] text-zinc-500 block mb-1">Comisión (%)</span>
                                  <input type="number" step="1" value={editVal.pct}
                                    onChange={e => setEditVal(v => ({ ...v, pct: e.target.value }))}
                                    className={inputCls + ' py-1.5 text-sm'} />
                                </div>
                                <div>
                                  <span className="jb-body text-[10px] text-zinc-500 block mb-1">Descuento cliente (%)</span>
                                  <input type="number" step="1" value={editVal.desc}
                                    onChange={e => setEditVal(v => ({ ...v, desc: e.target.value }))}
                                    className={inputCls + ' py-1.5 text-sm'} />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => guardarEdicion(r)} disabled={guardandoEdit}
                                  className={btnPrimary + ' py-1.5 px-3 text-xs'}>
                                  {guardandoEdit ? <Loader2 className="animate-spin" size={14} /> : 'Guardar'}
                                </button>
                                <button onClick={() => setEditando(null)} className={btnGhost + ' py-1.5 px-3 text-xs'}>
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          )}

                          {r.token && (
                            <button
                              onClick={() => {
                                const url = window.location.origin + '/r/' + r.token;
                                try { navigator.clipboard.writeText(url); } catch {}
                                window.alert('Enlace copiado:\n' + url + '\n\nEnvíaselo para que vea sus referidos en tiempo real.');
                              }}
                              className="jb-body text-[11px] text-orange-500 hover:text-orange-400 mt-1">
                              📋 Copiar su enlace de panel
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {montoPend > 0 && (
                            <>
                              <span className="jb-display text-sm text-emerald-400">S/{montoPend.toFixed(2)}</span>
                              <a href={waRef(r, montoPend, porPagar.length)} target="_blank" rel="noopener noreferrer"
                                className={btnGhost + ' py-1.5 px-3 text-xs'}>
                                <MessageCircle size={13} />
                              </a>
                            </>
                          )}
                          {!editandoEste && (
                            <button onClick={() => abrirEdicion(r)} className={btnGhost + ' py-1.5 px-3 text-xs'}>
                              Editar %
                            </button>
                          )}
                          {lista.length > 0 && (
                            <button onClick={() => setExpandido(abierto ? null : r.codigo)}
                              className={btnGhost + ' py-1.5 px-3 text-xs'}>
                              {abierto ? 'Ocultar' : 'Ver referidos'}
                            </button>
                          )}
                          <button onClick={() => alternar(r)}
                            className={(r.activo ? btnDanger : btnGhost) + ' py-1.5 px-3 text-xs'}>
                            {r.activo ? 'Desactivar' : 'Activar'}
                          </button>
                          <button onClick={() => eliminar(r)}
                            className="text-red-500 hover:text-red-400 p-1.5" title="Eliminar embajador">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {abierto && (
                        <div className="border-t border-zinc-800 p-3 flex flex-col gap-2">
                          {lista.map(u => {
                            const pago = u.plan === 'pago';
                            return (
                              <div key={u.username} className="flex items-center justify-between gap-3 flex-wrap bg-zinc-900 rounded-lg p-2.5">
                                <div>
                                  <div className="text-zinc-100 text-sm jb-body">{u.nombre || u.username}</div>
                                  <div className="text-xs jb-body">
                                    <span className={pago ? 'text-emerald-400' : 'text-zinc-500'}>
                                      {pago ? '✓ Pagó su plan' : 'En prueba gratis'}
                                    </span>
                                    {u.planMesesReferido && (
                                      <span className="text-zinc-500"> · plan de {u.planMesesReferido} mes(es)</span>
                                    )}
                                    {u.comisionPagada && (
                                      <span className="text-zinc-500"> · comisión pagada</span>
                                    )}
                                  </div>
                                </div>
                                {pago && (
                                  u.comisionPagada ? (
                                    <div className="flex items-center gap-2">
                                      {u.comisionMonto && (
                                        <span className="jb-body text-xs text-zinc-500">S/{Number(u.comisionMonto).toFixed(2)}</span>
                                      )}
                                      <button onClick={() => revertirPago(u.username)}
                                        className="jb-body text-xs text-zinc-600 hover:text-zinc-400">
                                        Revertir
                                      </button>
                                    </div>
                                  ) : u.comisionMonto ? (
                                    <button onClick={() => marcarPagada(u.username)}
                                      className={btnPrimary + ' py-1.5 px-3 text-xs'}>
                                      Pagué S/{Number(u.comisionMonto).toFixed(2)}
                                    </button>
                                  ) : (
                                    <span className="jb-body text-xs text-zinc-600">Pagó antes del programa</span>
                                  )
                                )}
                              </div>
                            );
                          })}
                          {yaPagados.length > 0 && (
                            <p className="jb-body text-[11px] text-zinc-600 mt-1">
                              {yaPagados.length} comisión(es) ya liquidada(s) con este código.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
            <h3 className="jb-display text-sm text-zinc-300 mb-1">🎁 INVITACIONES DE ALUMNOS</h3>
            <p className="jb-body text-[11px] text-zinc-500 mb-3">
              Cada alumno puede invitar con su link. El amigo tiene 10% de descuento y, cuando paga su primer plan, quien invitó gana 15 días de Premium (se aplican solos).
            </p>
            {invitaciones.length === 0 ? (
              <p className="text-zinc-500 text-xs jb-body">Ningún alumno ha abierto su link de invitación todavía.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {invitaciones.map(r => (
                  <div key={r.codigo} className="flex items-center justify-between gap-2 text-xs jb-body">
                    <span className="text-zinc-200 truncate">{r.nombre} <span className="text-zinc-500">· {r.codigo}</span></span>
                    <span className="text-zinc-400 shrink-0">{r.registrados} registrado(s) · <span className={r.pagaron ? 'text-emerald-400 font-semibold' : ''}>{r.pagaron} pagaron</span></span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="jb-body text-[11px] text-zinc-600">
            La comisión se marca como pagada solo cuando el alumno ya pagó su plan. Los que están en prueba gratis aún no generan comisión.
          </p>
        </div>
      )}
    </div>
  );
}

// Pedidos de alimentos: platos que piden los clientes por WhatsApp o que la
// IA vio en sus fotos y no están en la app. La IA propone los macros, Jonah
// revisa y aprueba: el alimento aparece al momento en la app y se avisa a
// quienes lo pidieron (función alimentos-pedidos).
async function llamarPedidosAlimentos(cuerpo) {
  const { data: { session } } = await supabase.auth.getSession();
  const r = await fetch(`${supabaseUrl}/functions/v1/alimentos-pedidos`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: supabaseKey,
      authorization: `Bearer ${session?.access_token || supabaseKey}`,
    },
    body: JSON.stringify(cuerpo),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error || 'No se pudo conectar con el servidor.');
  return data;
}

const GRUPOS_ALIMENTOS = [...new Set(FOODS.filter(f => !f.esExtra).map(f => f.group))];
const ALIMENTO_VACIO = { nombre: '', grupo: 'Platos preparados', estado: '-', kcal: '', proteina: '', carbos: '', grasa: '', fibra: '', unidad: '', gramos_unidad: '', menu_uso: '' };
const USOS_MENU = opcionesUsoMenu();

/* Menú del día: si Jonah le marca un uso al alimento, puede salir en el
   menú de todos (ver src/menuDia.js). Vacío = solo para registrar. */
async function guardarUsoMenu(alimentoId, menuUso) {
  if (!alimentoId) return;
  const { error } = await supabase.from('alimentos_extra').update({ menu_uso: menuUso || null }).eq('id', alimentoId);
  if (error) throw new Error('El alimento se agregó, pero no se pudo guardar su uso en el menú: ' + error.message);
}

function SelectUsoMenu({ valor, onCambiar, className = '' }) {
  return (
    <select value={valor || ''} onChange={e => onCambiar(e.target.value)} className={inputCls + ' w-full text-sm ' + className}>
      <option value="">No usar en el menú (solo para registrar)</option>
      {USOS_MENU.map(o => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
    </select>
  );
}

function formDesdePropuesta(p, nombre) {
  if (!p) return { ...ALIMENTO_VACIO, nombre };
  return {
    nombre: p.nombre || nombre, grupo: GRUPOS_ALIMENTOS.includes(p.grupo) ? p.grupo : 'Platos preparados', estado: p.estado || '-',
    kcal: p.kcal ?? '', proteina: p.proteina ?? '', carbos: p.carbos ?? '', grasa: p.grasa ?? '', fibra: p.fibra ?? '',
    unidad: p.unidad || '', gramos_unidad: p.unidad ? (p.gramos_unidad || '') : '',
    // La IA sugiere para qué serviría en el menú del día; Jonah lo ve ya elegido y lo puede cambiar.
    menu_uso: USOS_MENU.some(o => o.valor === p.menu_uso) ? p.menu_uso : '',
  };
}

function quienesPidieron(solicitantes) {
  const vistos = new Set();
  const lista = [];
  (solicitantes || []).forEach(s => {
    const clave = s.origen === 'whatsapp' ? 'w' + s.telefono : 'a' + s.username;
    if (vistos.has(clave)) return;
    vistos.add(clave);
    lista.push(s.origen === 'whatsapp' ? `💬 ${s.nombre || '+' + s.telefono}` : s.origen === 'app' ? `🙋 ${s.username}` : `📷 ${s.username}`);
  });
  return lista;
}

function FormAlimento({ form, setForm }) {
  const campo = (k) => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const num = (k) => Number(form[k]) || 0;
  const kcalCalculadas = Math.round(4 * num('proteina') + 4 * num('carbos') + 9 * num('grasa'));
  const desvio = num('kcal') > 0 && Math.abs(kcalCalculadas - num('kcal')) > Math.max(25, num('kcal') * 0.15);
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="col-span-2 jb-body text-[11px] text-zinc-500">Nombre
          <input value={form.nombre} onChange={campo('nombre')} className={inputCls + ' w-full text-sm mt-0.5'} maxLength={80} />
        </label>
        <label className="jb-body text-[11px] text-zinc-500">Grupo
          <select value={form.grupo} onChange={campo('grupo')} className={inputCls + ' w-full text-sm mt-0.5'}>
            {GRUPOS_ALIMENTOS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>
        <label className="jb-body text-[11px] text-zinc-500">Cómo se come
          <input value={form.estado} onChange={campo('estado')} className={inputCls + ' w-full text-sm mt-0.5'} placeholder='"-", Cocido, Frito…' maxLength={30} />
        </label>
      </div>
      <p className="jb-body text-[11px] text-zinc-500 mt-1">Por cada 100 g:</p>
      {/* En el celular van de 3 en 3: de 5 en 5 las casillas quedaban tan
          angostas que "96" se veía "9". */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
        {[['kcal', 'Kcal'], ['proteina', 'Prot.'], ['carbos', 'Carbos'], ['grasa', 'Grasa'], ['fibra', 'Fibra']].map(([k, t]) => (
          <label key={k} className="jb-body text-[11px] text-zinc-500 min-w-0">{t}
            <input type="number" inputMode="decimal" min="0" step="0.1" value={form[k]} onChange={campo(k)} className={inputCls.replace('px-3', 'px-1.5') + ' w-full min-w-0 text-sm mt-0.5 text-center tabular-nums'} />
          </label>
        ))}
      </div>
      {desvio && (
        <p className="jb-body text-[11px] text-amber-400">Ojo: con esos macros saldrían ~{kcalCalculadas} kcal, no {num('kcal')}. Revisa los números.</p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <label className="jb-body text-[11px] text-zinc-500">Medida casera (opcional)
          <input value={form.unidad} onChange={campo('unidad')} className={inputCls + ' w-full text-sm mt-0.5'} placeholder="unidad, plato, taza…" maxLength={30} />
        </label>
        <label className="jb-body text-[11px] text-zinc-500">Gramos de esa medida
          <input type="number" inputMode="decimal" min="0" value={form.gramos_unidad} onChange={campo('gramos_unidad')} disabled={!form.unidad.trim()} className={inputCls + ' w-full text-sm mt-0.5 tabular-nums disabled:opacity-40'} />
        </label>
      </div>
      <label className="jb-body text-[11px] text-zinc-500">🍽️ Usar en el menú del día como…
        <SelectUsoMenu valor={form.menu_uso} onCambiar={v => setForm(f => ({ ...f, menu_uso: v }))} className="mt-0.5" />
        <span className="block text-[10px] text-zinc-600 mt-0.5">Si lo marcas, puede salir en el menú de todos los alumnos a los que les calce. Déjalo vacío para comida rápida, postres, etc.</span>
      </label>
    </div>
  );
}

function ResultadoAvisos({ nombre, avisos, mensaje }) {
  if (!avisos) return null;
  const partes = [];
  if (avisos.whatsapp?.length) partes.push(`${avisos.whatsapp.length} por WhatsApp`);
  if (avisos.app?.length) partes.push(`${avisos.app.length} con notificación en la app`);
  const texto = mensaje || `✅ ¡Listo! *${nombre}* ya está en la app 🙌 Cierra y vuelve a abrir la app, y búscalo en "REGISTRAR" → "Escribir". ¿Me avisas si todo está conforme?`;
  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {partes.length > 0 && <p className="jb-body text-xs text-emerald-400">Avisamos: {partes.join(' y ')}.</p>}
      {/* Sin avisos activos no le llega la notificación: lo verá al abrir
          la app, pero si quieres que se entere ya, escríbele tú. */}
      {avisos.sin_avisos?.length > 0 && (
        <p className="jb-body text-xs text-amber-300 bg-amber-950/40 border border-amber-900 rounded-lg p-2.5">
          ⚠️ No le llegó la notificación a <b>{avisos.sin_avisos.join(', ')}</b>: tiene los avisos apagados. Lo verá la próxima vez que abra la app; si quieres que se entere ya, escríbele.
        </p>
      )}
      {avisos.a_mano?.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-900 rounded-lg p-2.5">
          <p className="jb-body text-xs text-amber-300 mb-1.5">Avísale tú (pasaron más de 24 h desde su último mensaje y WhatsApp no deja escribirle solo):</p>
          <div className="flex flex-wrap gap-1.5">
            {avisos.a_mano.map(p => (
              <a key={p.telefono} href={`https://wa.me/${p.telefono}?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer"
                className={btnGhost + ' py-1 px-2.5 text-xs'}>💬 {p.nombre || '+' + p.telefono}</a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PedidoAlimento({ pedido, onResuelto }) {
  const [form, setForm] = useState(() => formDesdePropuesta(pedido.propuesta, pedido.nombre));
  const [propuesta, setPropuesta] = useState(pedido.propuesta);
  const [calculando, setCalculando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const quienes = quienesPidieron(pedido.solicitantes);

  async function calcular() {
    setCalculando(true); setError('');
    try {
      const r = await llamarPedidosAlimentos({ accion: 'calcular', id: pedido.id, nombre: pedido.nombre });
      setPropuesta(r.propuesta);
      setForm(formDesdePropuesta(r.propuesta, pedido.nombre));
    } catch (e) { setError(e.message); }
    setCalculando(false);
  }

  async function aprobar() {
    setGuardando(true); setError('');
    try {
      const r = await llamarPedidosAlimentos({ accion: 'aprobar', id: pedido.id, alimento: form });
      if (form.menu_uso) await guardarUsoMenu(r.alimento_id, form.menu_uso);
      await cargarAlimentosExtraDeNuevo();
      onResuelto(pedido.id, { nombre: form.nombre.trim(), avisos: r.avisos });
    } catch (e) { setError(e.message); }
    setGuardando(false);
  }

  // Al descartar se le deja un mensaje a quien lo pidió (le llega como
  // notificación o WhatsApp, y lo ve al abrir la app). Se propone uno según
  // el caso; se puede cambiar o dejar vacío para no avisar.
  const [descartando, setDescartando] = useState(false);
  const [respuesta, setRespuesta] = useState('');
  function abrirDescarte() {
    setRespuesta(propuesta?.ya_existe
      ? `Ya estaba en la app como "${propuesta.ya_existe}". Búscalo con ese nombre en "REGISTRAR" → "Escribir" 🙌`
      : propuesta?.por_partes?.length
      ? `Lo puedes registrar por partes, cada uno con tu cantidad 💪: ${propuesta.por_partes.join(' + ')}. Así es más exacto y luego te sale en ⭐ Favoritos o con "Repetir ayer" 🦍`
      : `No pudimos identificar "${pedido.nombre}". Si nos das más detalles (cómo se prepara o de qué marca es), lo agregamos 🙌`);
    setDescartando(true);
  }
  async function descartar() {
    setGuardando(true); setError('');
    try {
      const r = await llamarPedidosAlimentos({ accion: 'descartar', id: pedido.id, respuesta });
      onResuelto(pedido.id, { nombre: pedido.nombre, avisos: r.avisos, descartado: true, respuesta: respuesta.trim() });
    } catch (e) { setError(e.message); }
    setGuardando(false);
  }

  const listo = form.nombre.trim() && form.kcal !== '' && form.proteina !== '' && form.carbos !== '' && form.grasa !== '';
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 flex flex-col gap-2.5">
      <div>
        <p className="jb-body text-sm text-zinc-100 font-semibold">{pedido.nombre}</p>
        <p className="jb-body text-xs text-zinc-500">
          <span className="text-orange-400 font-semibold">{quienes.length} {quienes.length === 1 ? 'persona' : 'personas'}</span>
          {' · '}{quienes.slice(0, 4).join(', ')}{quienes.length > 4 ? '…' : ''}
          {' · '}{new Date(pedido.actualizado_en).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
        </p>
      </div>

      {propuesta?.ia_estado === 'dudoso' && (
        <p className="jb-body text-xs text-amber-400 font-semibold">🤔 La IA no estuvo segura, así que no lo agregó sola. Decide tú:</p>
      )}
      {propuesta?.ia_estado === 'revisando' && (
        <p className="jb-body text-xs text-zinc-400">🤖 La IA lo está atendiendo… Toca "Actualizar" en un momento.</p>
      )}
      {!(propuesta && propuesta.kcal != null) ? (
        <button onClick={calcular} disabled={calculando} className={btnPrimary + ' text-sm py-2'}>
          {calculando ? <><Loader2 size={15} className="animate-spin" /> Calculando macros…</> : '🤖 Calcular macros'}
        </button>
      ) : (
        <>
          {propuesta.ya_existe && (
            <p className="jb-body text-xs text-amber-300 bg-amber-950/40 border border-amber-900 rounded-lg p-2">
              Parece que ya está en la app como <b>{propuesta.ya_existe}</b>. Si es lo mismo, descártalo y dile a quien lo pidió que lo busque con ese nombre.
            </p>
          )}
          {propuesta.por_partes?.length > 0 && !propuesta.ya_existe && (
            <p className="jb-body text-xs text-amber-300 bg-amber-950/40 border border-amber-900 rounded-lg p-2">
              🧩 Se puede registrar por partes: <b>{propuesta.por_partes.join(' + ')}</b>. Si es una mezcla que cada uno arma a su gusto, descártalo: el mensaje ya le explica cómo.
            </p>
          )}
          {propuesta.nota && <p className="jb-body text-[11px] text-zinc-500">🤖 {propuesta.nota}</p>}
          {propuesta.variantes?.length > 0 && (
            <p className="jb-body text-[11px] text-zinc-400">
              🧩 Al aprobar, te quedan para revisar estas variantes: {propuesta.variantes.map(v => v.nombre).join(' · ')}
            </p>
          )}
          <FormAlimento form={form} setForm={setForm} />
          <div className="flex gap-2">
            <button onClick={aprobar} disabled={!listo || guardando} className={btnPrimary + ' flex-1 text-sm py-2'}>
              {guardando ? <Loader2 size={15} className="animate-spin" /> : '✅ Aprobar y avisar'}
            </button>
            <button onClick={calcular} disabled={calculando} className={btnGhost + ' text-xs py-2 px-3'} title="Volver a calcular">
              {calculando ? <Loader2 size={14} className="animate-spin" /> : '🔄'}
            </button>
          </div>
        </>
      )}
      {error && <p className="jb-body text-xs text-red-400">{error}</p>}
      {descartando ? (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 flex flex-col gap-2">
          <label className="jb-body text-[11px] text-zinc-400">Mensaje para quien lo pidió (déjalo vacío para no avisar)
            <textarea value={respuesta} onChange={e => setRespuesta(e.target.value)} maxLength={300} rows={3}
              className={inputCls + ' w-full text-sm mt-1'} />
          </label>
          <div className="flex gap-2">
            <button onClick={descartar} disabled={guardando} className={btnGhost + ' flex-1 text-xs py-2'}>
              {guardando ? <Loader2 size={14} className="animate-spin" /> : respuesta.trim() ? 'Descartar y avisar' : 'Descartar sin avisar'}
            </button>
            <button onClick={() => setDescartando(false)} className="jb-body text-xs text-zinc-500 hover:text-zinc-300 px-2">Cancelar</button>
          </div>
        </div>
      ) : (
        <button onClick={abrirDescarte} className="jb-body text-[11px] text-zinc-500 hover:text-zinc-300 self-start underline">Descartar pedido</button>
      )}
    </div>
  );
}

/* Lo que hizo la IA (últimos 7 días): pedidos que agregó sola o que
   respondió porque ya existían, y las variantes de cada plato agregado
   (las que agregó sola y las que dejó como sugerencia). Si se equivocó en
   los números, Jonah los corrige aquí (se corrigen para todos al abrir la app). */
function PedidosAtendidosIA() {
  const [abierto, setAbierto] = useState(false);
  const [lista, setLista] = useState(null);
  async function cargar() {
    const desde = new Date(Date.now() - 7 * 864e5).toISOString();
    const { data } = await supabase.from('pedidos_alimentos')
      .select('id, nombre, estado, propuesta, respuesta, solicitantes, resuelto_en, alimento_id, alimentos_extra(id, nombre, estado, kcal, proteina, carbos, grasa)')
      .in('estado', ['agregado', 'descartado'])
      .gte('resuelto_en', desde).order('resuelto_en', { ascending: false }).limit(80);
    const porIA = p => ['agregado', 'descartado'].includes(p.propuesta?.ia_estado) || p.propuesta?.variantes_resultado?.length;
    setLista((data || []).filter(porIA));
  }
  useEffect(() => { cargar(); }, []);
  if (!lista?.length) return null;
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl">
      <button onClick={() => setAbierto(v => !v)} className="w-full px-3.5 py-3 flex items-center justify-between text-left">
        <span className="jb-body text-xs text-zinc-300">
          🤖 Lo que hizo la IA (7 días) · {lista.length}
          {lista.some(p => p.propuesta?.variantes_resultado?.some(v => v.estado === 'sugerida')) && <span className="text-amber-400"> · variantes por revisar</span>}
        </span>
        <ChevronRight size={16} className={`text-zinc-500 transition-transform ${abierto ? 'rotate-90' : ''}`} />
      </button>
      {abierto && (
        <div className="px-3.5 pb-3.5 flex flex-col gap-2">
          {lista.map(p => <PedidoIA key={p.id} p={p} onListo={cargar} />)}
        </div>
      )}
    </div>
  );
}

function PedidoIA({ p, onListo }) {
  const a = p.alimentos_extra;
  const [f, setF] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const n = v => Math.round((Number(v) || 0) * 10) / 10;
  const quienes = quienesPidieron(p.solicitantes);
  async function guardar() {
    setOcupado(true); setError('');
    try {
      const datos = { kcal: Number(f.kcal), proteina: Number(f.proteina) || 0, carbos: Number(f.carbos) || 0, grasa: Number(f.grasa) || 0 };
      if (!(datos.kcal > 0) || datos.kcal > 900) throw new Error('Revisa las calorías (entre 1 y 900 por 100 g).');
      const { error: e } = await supabase.from('alimentos_extra').update(datos).eq('id', a.id);
      if (e) throw e;
      await cargarAlimentosExtraDeNuevo();
      setF(null);
      await onListo();
    } catch (e) { setError(e.message || 'No se pudo guardar.'); }
    setOcupado(false);
  }
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
      <p className="jb-body text-sm text-zinc-100">
        {p.estado === 'agregado' ? '✅ ' : '🔎 '}<b>{p.nombre}</b>
        <span className="text-[11px] text-zinc-500"> · {quienes.slice(0, 3).join(', ')} · {fechaHoraCorta(p.resuelto_en)}</span>
      </p>
      {p.estado === 'agregado' && a ? (
        <p className="jb-body text-xs text-zinc-300 tabular-nums mt-0.5">
          Agregado para todos como "{a.estado && a.estado !== '-' ? `${a.nombre} (${a.estado.toLowerCase()})` : a.nombre}": {n(a.kcal)} kcal · P {n(a.proteina)} g · C {n(a.carbos)} g · G {n(a.grasa)} g (por 100 g)
        </p>
      ) : (
        <p className="jb-body text-xs text-zinc-400 mt-0.5">{p.respuesta || 'Respondido: ya estaba en la app.'}</p>
      )}
      {p.propuesta?.nota && <p className="jb-body text-[11px] text-zinc-500 mt-0.5">🤖 {p.propuesta.nota}</p>}
      {p.propuesta?.ia_estado !== 'agregado' && p.propuesta?.ia_estado !== 'descartado' && <p className="jb-body text-[11px] text-zinc-500">(Lo aprobaste tú; la IA propuso sus variantes.)</p>}
      {(p.propuesta?.variantes_resultado || []).map((v, i) => <VarianteIA key={i} pedidoId={p.id} v={v} indice={i} onListo={onListo} />)}
      {p.estado === 'agregado' && a && (f ? (
        <div className="flex flex-col gap-2 mt-2">
          <div className="grid grid-cols-4 gap-2">
            {[['kcal', 'kcal'], ['proteina', 'Prot. g'], ['carbos', 'Carbos g'], ['grasa', 'Grasa g']].map(([k, l]) => (
              <label key={k} className="jb-body text-[10px] text-zinc-500">{l}
                <input type="number" inputMode="decimal" value={f[k]} onChange={e => setF(v => ({ ...v, [k]: e.target.value }))} className={inputCls + ' text-sm mt-0.5'} />
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button disabled={ocupado} onClick={guardar} className={btnPrimary + ' text-xs py-1.5 px-3'}>{ocupado ? <Loader2 size={13} className="animate-spin" /> : 'Guardar corrección'}</button>
            <button onClick={() => setF(null)} className={btnGhost + ' text-xs py-1.5 px-3'}>Cancelar</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setF({ kcal: a.kcal, proteina: a.proteina, carbos: a.carbos, grasa: a.grasa })}
          className="jb-body text-[11px] text-orange-400 underline mt-1">✏️ Corregir los números</button>
      ))}
      {error && <p className="jb-body text-xs text-red-400">{error}</p>}
    </div>
  );
}

function VarianteIA({ pedidoId, v, indice, onListo }) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [menuUso, setMenuUso] = useState(USOS_MENU.some(o => o.valor === v.menu_uso) ? v.menu_uso : '');
  const n = x => Math.round((Number(x) || 0) * 10) / 10;
  const nombre = v.etiqueta || v.nombre;
  async function decidir(accion) {
    setOcupado(true); setError('');
    try {
      const r = await llamarPedidosAlimentos({ accion, id: pedidoId, indice });
      if (accion === 'agregar_variante') {
        if (menuUso) await guardarUsoMenu(r.alimento_id, menuUso);
        await cargarAlimentosExtraDeNuevo();
      }
      await onListo();
    } catch (e) { setError(e.message); }
    setOcupado(false);
  }
  return (
    <div className="mt-1.5 pl-3 border-l-2 border-zinc-700">
      <p className="jb-body text-xs text-zinc-300">
        {{ agregada: '➕ ', sugerida: '🧩 ', descartada: '✕ ' }[v.estado] || '🔎 '}
        <span className="text-zinc-100">{nombre}</span>
        <span className="text-zinc-500"> · variante{{ agregada: v.por === 'jonah' ? ' (la agregaste tú)' : ' agregada', sugerida: ' por revisar', descartada: ' descartada' }[v.estado] || ': ya estaba en la app'}</span>
      </p>
      {v.estado !== 'ya_existia' && v.kcal != null && (
        <p className="jb-body text-[11px] text-zinc-500 tabular-nums">
          {n(v.kcal)} kcal · P {n(v.proteina)} g · C {n(v.carbos)} g · G {n(v.grasa)} g (por 100 g){v.unidad ? ` · 1 ${v.unidad} = ${n(v.gramos_unidad)} g` : ''}
          {v.estado === 'sugerida' && v.cuadra === false && <span className="text-amber-400"> · ⚠️ las calorías no cuadran con los macros</span>}
        </p>
      )}
      {v.estado === 'sugerida' && (
        <label className="jb-body text-[10px] text-zinc-500 block mt-1">Menú del día{v.menu_uso ? ' (la IA sugiere lo elegido)' : ''}:
          <SelectUsoMenu valor={menuUso} onCambiar={setMenuUso} className="mt-0.5 text-xs" />
        </label>
      )}
      {v.estado === 'sugerida' && (
        <div className="flex gap-3 mt-0.5">
          <button disabled={ocupado} onClick={() => decidir('agregar_variante')} className="jb-body text-[11px] text-orange-400 underline">
            {ocupado ? 'Un momento…' : '➕ Agregar para todos'}
          </button>
          <button disabled={ocupado} onClick={() => decidir('descartar_variante')} className="jb-body text-[11px] text-zinc-400 underline">✕ Descartar</button>
        </div>
      )}
      {error && <p className="jb-body text-[11px] text-red-400">{error}</p>}
    </div>
  );
}

/* Saldo de la IA (Anthropic). Anthropic no deja leer el saldo desde
   afuera: Jonah anota sus recargas y, cuando lo ve en su página, el saldo
   real; el panel resta lo que gastó la IA desde entonces (tabla ia_uso). */
function SaldoIAPanel() {
  const [movs, setMovs] = useState(null);
  const [calc, setCalc] = useState(null);
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState(null); // { tipo, monto }
  const [auto, setAuto] = useState(RECARGA_AUTO_POR_DEFECTO); // regla de recarga automática de Anthropic
  const [editAuto, setEditAuto] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const tc = SUPUESTOS_RENTABILIDAD.tipoCambio;

  async function cargar() {
    try {
      const [{ data: m, error: e }, { data: cfg }] = await Promise.all([
        supabase.from('ia_saldo').select('id, tipo, monto_usd, fecha, nota').order('fecha', { ascending: false }).limit(50),
        supabase.from('config').select('value').eq('key', 'ia_recarga_auto').maybeSingle(),
      ]);
      if (e) throw e;
      const regla = (cfg?.value && leerRecargaAuto(cfg.value)) || RECARGA_AUTO_POR_DEFECTO;
      setAuto(regla);
      setMovs(m || []);
      const p = puntoDePartidaSaldo(m || []);
      const desdeSemana = new Date(Date.now() - 7 * 864e5).toISOString();
      const desde = p && new Date(p.desde) < new Date(desdeSemana) ? p.desde : desdeSemana;
      const { data: usos } = await traerTodas(() => supabase.from('ia_uso')
        .select('modelo, tokens_entrada, tokens_salida, tokens_cache_lectura, tokens_cache_escritura, creado_en')
        .gte('creado_en', desde));
      const est = saldoEstimado(m || [], usos || [], regla);
      const semana = (usos || []).filter(u => new Date(u.creado_en) >= new Date(desdeSemana)).reduce((s, u) => s + costoUsdIA(u), 0);
      setCalc({ est, porDia: semana / 7 });
    } catch (e) { setError('No se pudo cargar: ' + (e?.message || '')); setMovs([]); }
  }
  useEffect(() => { cargar(); }, []);

  async function guardar() {
    const monto = Number(String(form.monto).replace(',', '.'));
    if (!(monto >= 0) || monto > 100000) return setError('Escribe el monto en dólares (ej. 20).');
    setOcupado(true); setError('');
    try {
      const { error: e } = await supabase.from('ia_saldo').insert({ tipo: form.tipo, monto_usd: monto });
      if (e) throw e;
      setForm(null);
      await cargar();
    } catch (e) { setError('No se pudo guardar: ' + (e?.message || '')); }
    setOcupado(false);
  }

  async function guardarAuto() {
    const umbral = Number(editAuto.umbral), restablecer = Number(editAuto.restablecer);
    if (editAuto.activa && !(umbral >= 0 && restablecer > umbral)) return setError('El monto al que se restablece debe ser mayor que el umbral.');
    setOcupado(true); setError('');
    try {
      const { error: e } = await supabase.from('config').upsert({ key: 'ia_recarga_auto', value: JSON.stringify({ activa: editAuto.activa, umbral, restablecer }) });
      if (e) throw e;
      setEditAuto(null);
      await cargar();
    } catch (e) { setError('No se pudo guardar: ' + (e?.message || '')); }
    setOcupado(false);
  }

  const est = calc?.est;
  // Con recarga automática el saldo no baja del umbral: los días se cuentan hasta la próxima recarga.
  const dias = est && calc.porDia > 0 ? Math.floor((est.saldo - (auto.activa ? auto.umbral : 0)) / calc.porDia) : null;
  const bajo = est && !auto.activa && est.saldo < SALDO_IA_MINIMO_USD;
  const recargado = (est?.recargasAuto || []).reduce((s, r) => s + r.monto, 0);
  const usd = v => `US$ ${v.toFixed(2)}`;
  return (
    <div className={`bg-zinc-900 border rounded-2xl overflow-hidden ${bajo ? 'border-amber-600/60' : 'border-zinc-800'}`}>
      <button onClick={() => setAbierto(v => !v)} className="w-full px-5 py-4 flex items-center justify-between text-left gap-3">
        <div className="min-w-0">
          <h2 className="jb-display text-base text-zinc-200">🤖 SALDO DE LA IA{bajo && <span className="text-amber-400"> ⚠️</span>}</h2>
          <p className="jb-body text-xs text-zinc-400 mt-0.5 tabular-nums">
            {movs === null ? 'Cargando…'
              : !est ? 'Anota tu saldo de Anthropic para empezar el control.'
              : <>Estimado: <span className={bajo ? 'text-amber-400 font-semibold' : 'text-zinc-100 font-semibold'}>{usd(est.saldo)}</span> (≈ S/ {(est.saldo * tc).toFixed(2)}){dias !== null ? (auto.activa ? ` · próxima recarga automática en unos ${Math.max(dias, 0)} días` : ` · alcanza para unos ${Math.max(dias, 0)} días`) : ''}</>}
          </p>
        </div>
        <ChevronRight size={18} className={`text-zinc-500 transition-transform shrink-0 ${abierto ? 'rotate-90' : ''}`} />
      </button>
      {abierto && (
        <div className="px-5 pb-5 border-t border-zinc-800 pt-4 flex flex-col gap-3">
          <p className="jb-body text-xs text-zinc-500">
            Es la IA de las fotos, Jarvis, los pedidos de alimentos y el asistente de WhatsApp. Anthropic no deja ver el saldo desde aquí: el panel parte del saldo real que anotes y resta lo que gasta la IA.{auto.activa
              ? ` Con tu recarga automática (cuando baja a ${usd(auto.umbral)} sube a ${usd(auto.restablecer)}), el panel la aplica solo: no hace falta anotarla. Jarvis te cuenta en el informe de la mañana cuando hubo una recarga.`
              : ` Anota cada recarga. Si baja de ${usd(SALDO_IA_MINIMO_USD)}, Jarvis te avisa en el informe de la mañana; si llega a cero, las fotos, Jarvis y los pedidos automáticos dejan de funcionar.`} De vez en cuando, anota el saldo real que ves en Anthropic para que el estimado siga casi exacto.
          </p>
          {est && (
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                <p className="jb-body text-[11px] text-zinc-500">Gastado desde {fechaHoraCorta(est.desde)}</p>
                <p className="jb-display text-lg text-zinc-100 tabular-nums">{usd(est.gastado)}</p>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                <p className="jb-body text-[11px] text-zinc-500">Gasto promedio (últimos 7 días)</p>
                <p className="jb-display text-lg text-zinc-100 tabular-nums">{usd(calc.porDia)} / día</p>
              </div>
            </div>
          )}
          {est && auto.activa && (
            <p className="jb-body text-xs text-zinc-400">
              🔄 Recargas automáticas estimadas desde {fechaHoraCorta(est.desde)}: <span className="text-zinc-100">{est.recargasAuto.length}</span>
              {est.recargasAuto.length > 0 && <> · {usd(recargado)} cobrados a tu tarjeta (≈ S/ {(recargado * tc).toFixed(2)}) · última: {fechaHoraCorta(est.recargasAuto[est.recargasAuto.length - 1].fecha)}</>}
            </p>
          )}
          {editAuto ? (
            <div className="flex flex-col gap-2 bg-zinc-950 border border-zinc-800 rounded-xl p-3">
              <label className="jb-body text-xs text-zinc-300 flex items-center gap-2">
                <input type="checkbox" checked={editAuto.activa} onChange={e => setEditAuto(v => ({ ...v, activa: e.target.checked }))} />
                Tengo la recarga automática activada en Anthropic
              </label>
              {editAuto.activa && (
                <div className="grid grid-cols-2 gap-2">
                  <label className="jb-body text-[11px] text-zinc-500">Cuando el saldo baja a (US$)
                    <input type="number" inputMode="decimal" value={editAuto.umbral} onChange={e => setEditAuto(v => ({ ...v, umbral: e.target.value }))} className={inputCls + ' text-sm mt-0.5'} />
                  </label>
                  <label className="jb-body text-[11px] text-zinc-500">Lo sube a (US$)
                    <input type="number" inputMode="decimal" value={editAuto.restablecer} onChange={e => setEditAuto(v => ({ ...v, restablecer: e.target.value }))} className={inputCls + ' text-sm mt-0.5'} />
                  </label>
                </div>
              )}
              <div className="flex gap-2">
                <button disabled={ocupado} onClick={guardarAuto} className={btnPrimary + ' text-sm py-2 flex-1'}>{ocupado ? <Loader2 size={15} className="animate-spin" /> : 'Guardar'}</button>
                <button onClick={() => setEditAuto(null)} className={btnGhost + ' text-sm py-2'}>Cancelar</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setEditAuto({ ...auto })} className="jb-body text-[11px] text-zinc-400 underline self-start">
              ⚙️ Recarga automática: {auto.activa ? `activada (baja a ${usd(auto.umbral)} → sube a ${usd(auto.restablecer)})` : 'desactivada'} · cambiar
            </button>
          )}
          {form ? (
            <div className="flex flex-col gap-2 bg-zinc-950 border border-zinc-800 rounded-xl p-3">
              <p className="jb-body text-xs text-zinc-300">{form.tipo === 'recarga' ? '¿Cuántos dólares recargaste?' : '¿Qué saldo te muestra Anthropic ahora?'}</p>
              <input type="number" inputMode="decimal" autoFocus value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                className={inputCls + ' text-sm'} placeholder="Ej. 20" />
              <div className="flex gap-2">
                <button disabled={ocupado || form.monto === ''} onClick={guardar} className={btnPrimary + ' text-sm py-2 flex-1'}>{ocupado ? <Loader2 size={15} className="animate-spin" /> : 'Guardar'}</button>
                <button onClick={() => setForm(null)} className={btnGhost + ' text-sm py-2'}>Cancelar</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setForm({ tipo: 'saldo_real', monto: '' })} className={btnPrimary + ' text-xs py-2 px-3'}>📌 Anotar saldo real</button>
              <button onClick={() => setForm({ tipo: 'recarga', monto: '' })} className={btnGhost + ' text-xs py-2 px-3'}>➕ Anotar recarga manual</button>
            </div>
          )}
          {movs?.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="jb-body text-[11px] text-zinc-500">Últimos movimientos</p>
              {movs.slice(0, 6).map(m => (
                <p key={m.id} className="jb-body text-xs text-zinc-400 tabular-nums">
                  {m.tipo === 'recarga' ? '➕ Recarga' : '📌 Saldo real'}: {usd(Number(m.monto_usd))} · {fechaHoraCorta(m.fecha)}
                </p>
              ))}
            </div>
          )}
          {error && <p className="jb-body text-xs text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}

/* Revisión diaria: lo que la IA propone para adelantarse y nadie está
   esperando. Jarvis lo menciona en el informe de la mañana.
   - Menú del día: para qué serviría en el menú cada plato que la IA agregó
     sola. Nunca se aplica solo (el menú es lo que la app recomienda comer).
   - Variantes: otros platos de la misma carta (ej. con Jalea de pescado,
     Jalea mixta). No se agregan solas. */
function RevisionDiaria() {
  const [pedidos, setPedidos] = useState([]);
  const [abierto, setAbierto] = useState(false);
  async function cargar() {
    const desde = new Date(Date.now() - 60 * 864e5).toISOString();
    const { data } = await supabase.from('pedidos_alimentos')
      .select('id, nombre, propuesta, resuelto_en, alimento_id, alimentos_extra(id, nombre, estado, menu_uso)')
      .eq('estado', 'agregado').gte('resuelto_en', desde).order('resuelto_en', { ascending: false }).limit(200);
    setPedidos(data || []);
  }
  useEffect(() => { cargar(); }, []);
  const menuPendiente = p => p.propuesta?.ia_estado === 'agregado' && p.propuesta?.menu_uso && !p.propuesta?.menu_revision && p.alimentos_extra && !p.alimentos_extra.menu_uso;
  const conMenu = pedidos.filter(menuPendiente);
  const conVariantes = pedidos.filter(p => (p.propuesta?.variantes_resultado || []).some(v => v.estado === 'sugerida'));
  const total = conMenu.length + conVariantes.reduce((s, p) => s + p.propuesta.variantes_resultado.filter(v => v.estado === 'sugerida').length, 0);
  if (!total) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <button onClick={() => setAbierto(v => !v)} className="w-full px-5 py-4 flex items-center justify-between text-left">
        <h2 className="jb-display text-base text-zinc-200">🧩 ALIMENTOS POR REVISAR · {total}</h2>
        <ChevronRight size={18} className={`text-zinc-500 transition-transform ${abierto ? 'rotate-90' : ''}`} />
      </button>
      {abierto && (
        <div className="px-5 pb-5 border-t border-zinc-800 pt-4 flex flex-col gap-3">
          <p className="jb-body text-xs text-zinc-500">Lo que la IA propone para adelantarse; ningún alumno lo está esperando. Nada de esto se aplica sin tu OK.</p>
          {conMenu.length > 0 && <p className="jb-display text-xs text-zinc-300">🍽️ MENÚ DEL DÍA</p>}
          {conMenu.map(p => <MenuSugerido key={p.id} p={p} onListo={cargar} />)}
          {conVariantes.length > 0 && <p className="jb-display text-xs text-zinc-300 mt-1">🧩 VARIANTES</p>}
          {conVariantes.map(p => (
            <div key={p.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
              <p className="jb-body text-xs text-zinc-400">Por <span className="text-zinc-100 font-semibold">{p.nombre}</span> · {fechaHoraCorta(p.resuelto_en)}</p>
              {p.propuesta.variantes_resultado.map((v, i) => v.estado === 'sugerida' && <VarianteIA key={i} pedidoId={p.id} v={v} indice={i} onListo={cargar} />)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Sugerencia de menú para un plato que la IA agregó sola.
function MenuSugerido({ p, onListo }) {
  const a = p.alimentos_extra;
  const [valor, setValor] = useState(p.propuesta.menu_uso);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  async function decidir(usar) {
    setOcupado(true); setError('');
    try {
      if (usar && valor) { await guardarUsoMenu(a.id, valor); await cargarAlimentosExtraDeNuevo(); }
      const { error: e } = await supabase.from('pedidos_alimentos')
        .update({ propuesta: { ...p.propuesta, menu_revision: usar && valor ? 'aplicado' : 'no' } }).eq('id', p.id);
      if (e) throw e;
      await onListo();
    } catch (e) { setError(e.message || 'No se pudo guardar.'); }
    setOcupado(false);
  }
  const sugerido = USOS_MENU.find(o => o.valor === p.propuesta.menu_uso)?.texto || p.propuesta.menu_uso;
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex flex-col gap-1.5">
      <p className="jb-body text-sm text-zinc-100">{a.estado && a.estado !== '-' ? `${a.nombre} (${a.estado.toLowerCase()})` : a.nombre}</p>
      <p className="jb-body text-[11px] text-zinc-500">🤖 La IA sugiere: <span className="text-zinc-300">{sugerido}</span></p>
      <SelectUsoMenu valor={valor} onCambiar={setValor} className="text-xs" />
      <div className="flex gap-3">
        <button disabled={ocupado || !valor} onClick={() => decidir(true)} className="jb-body text-[11px] text-orange-400 underline">✅ Usar en el menú</button>
        <button disabled={ocupado} onClick={() => decidir(false)} className="jb-body text-[11px] text-zinc-400 underline">No va en el menú</button>
      </div>
      {error && <p className="jb-body text-[11px] text-red-400">{error}</p>}
    </div>
  );
}

// El panel también sirve para agregar un alimento sin que nadie lo pida.
function AgregarAlimentoSuelto({ onListo }) {
  const [nombre, setNombre] = useState('');
  const [form, setForm] = useState(null);
  const [nota, setNota] = useState('');
  const [calculando, setCalculando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  async function calcular() {
    if (!nombre.trim()) return;
    setCalculando(true); setError('');
    try {
      const r = await llamarPedidosAlimentos({ accion: 'calcular', nombre: nombre.trim() });
      setForm(formDesdePropuesta(r.propuesta, nombre.trim()));
      setNota(r.propuesta?.ya_existe ? `Parece que ya está en la app como "${r.propuesta.ya_existe}".` : (r.propuesta?.nota || ''));
    } catch (e) { setError(e.message); }
    setCalculando(false);
  }

  async function agregar() {
    setGuardando(true); setError('');
    try {
      const r = await llamarPedidosAlimentos({ accion: 'aprobar', alimento: form });
      if (form.menu_uso) await guardarUsoMenu(r.alimento_id, form.menu_uso);
      await cargarAlimentosExtraDeNuevo();
      onListo(form.nombre.trim());
      setNombre(''); setForm(null); setNota('');
    } catch (e) { setError(e.message); }
    setGuardando(false);
  }

  return (
    <div className="bg-zinc-950 border border-dashed border-zinc-700 rounded-xl p-3.5 flex flex-col gap-2">
      <p className="jb-body text-xs text-zinc-400">¿Quieres agregar otro alimento? Escribe el nombre y la IA calcula los macros.</p>
      <div className="flex gap-2">
        <input value={nombre} onChange={e => setNombre(e.target.value)} onKeyDown={e => e.key === 'Enter' && calcular()}
          className={inputCls + ' flex-1 text-sm'} placeholder="Ej. Causa de pollo" maxLength={80} />
        <button onClick={calcular} disabled={!nombre.trim() || calculando} className={btnGhost + ' text-sm py-2 px-3 shrink-0'}>
          {calculando ? <Loader2 size={15} className="animate-spin" /> : '🤖 Calcular'}
        </button>
      </div>
      {form && (
        <>
          {nota && <p className="jb-body text-[11px] text-zinc-500">🤖 {nota}</p>}
          <FormAlimento form={form} setForm={setForm} />
          <button onClick={agregar} disabled={guardando || !form.nombre.trim() || form.kcal === ''} className={btnPrimary + ' text-sm py-2'}>
            {guardando ? <Loader2 size={15} className="animate-spin" /> : '✅ Agregar a la app'}
          </button>
        </>
      )}
      {error && <p className="jb-body text-xs text-red-400">{error}</p>}
    </div>
  );
}

async function cargarAlimentosExtraDeNuevo() {
  try { await cargarAlimentosExtra(true); } catch {}
}

/* Respuestas de pedidos para mandar por WhatsApp: la respuesta de un
   pedido (agregado o descartado) le llega al alumno como notificación o al
   abrir la app, pero un mensaje de Jonah por WhatsApp lo motiva más. Aquí
   quedan los pedidos resueltos de los últimos 3 días que pidió un alumno
   desde la app o con una foto, con el mensaje listo en la voz de Jonah.
   Al tocar "Escribirle" se abre WhatsApp y queda anotado en el pedido
   (avisos.escrito_wa) para que no vuelva a salir. */
const DIAS_RESPUESTAS_WA = 3;
function mensajePedidoWhatsApp(p, nombre) {
  const n = String(nombre || '').trim().split(/\s+/)[0] || '';
  if (p.estado === 'agregado') {
    const a = p.alimentos_extra;
    const plato = a ? (a.estado && a.estado !== '-' ? `${a.nombre} (${a.estado.toLowerCase()})` : a.nombre) : p.nombre;
    return `¡Hola${n ? ' ' + n : ''}! 🙌 Soy Jonah. Ya agregué "${plato}" a la app, como me pediste. Búscalo en "REGISTRAR" → "Escribir" (si no te sale, cierra y vuelve a abrir la app). ¡Seguimos juntos, comida a comida! 💪🦍`;
  }
  const r = String(p.respuesta || '').trim();
  if (!r) return `Hola${n ? ' ' + n : ''} 👋 Soy Jonah. Revisé tu pedido "${p.nombre}". Cuéntame cómo lo preparas y vemos juntos cómo registrarlo 💪🦍`;
  // Si la respuesta ya lo saluda por su nombre, va tal cual.
  if (n && r.toLowerCase().includes(n.toLowerCase())) return r;
  return `Hola${n ? ' ' + n : ''} 👋 Soy Jonah. Sobre tu pedido "${p.nombre}": ${r}`;
}

function RespuestasParaWhatsApp({ onCantidad }) {
  const [lista, setLista] = useState(null);
  async function cargar() {
    const desde = new Date(Date.now() - DIAS_RESPUESTAS_WA * 864e5).toISOString();
    const { data } = await supabase.from('pedidos_alimentos')
      .select('id, nombre, estado, respuesta, solicitantes, avisos, resuelto_en, alimentos_extra(nombre, estado)')
      .in('estado', ['agregado', 'descartado'])
      .gte('resuelto_en', desde).order('resuelto_en', { ascending: false }).limit(60);
    const items = [];
    (data || []).forEach(p => {
      const escritos = p.avisos?.escrito_wa || [];
      const sinAviso = p.avisos?.sin_avisos || [];
      const usuarios = [...new Set((p.solicitantes || []).filter(s => s?.origen !== 'whatsapp' && s.username).map(s => String(s.username)))];
      usuarios.filter(u => u !== 'martin' && !escritos.includes(u))
        .forEach(u => items.push({ p, username: u, sinAviso: sinAviso.includes(u) }));
    });
    const usernames = [...new Set(items.map(i => i.username))];
    const { data: alumnos } = usernames.length
      ? await supabase.from('alumnos').select('username, nombre, telefono').in('username', usernames)
      : { data: [] };
    const porUsuario = Object.fromEntries((alumnos || []).map(a => [a.username, a]));
    const conTelefono = items
      .map(i => ({ ...i, alumno: porUsuario[i.username] }))
      .filter(i => i.alumno?.telefono)
      .sort((a, b) => Number(b.sinAviso) - Number(a.sinAviso));
    setLista(conTelefono);
    onCantidad?.(conTelefono.length);
  }
  useEffect(() => { cargar(); }, []);

  async function escribir(item, abrir = true) {
    if (abrir) window.open(enlaceWhatsApp(item.alumno.telefono, mensajePedidoWhatsApp(item.p, item.alumno.nombre)), '_blank', 'noopener');
    const avisos = { ...(item.p.avisos || {}), escrito_wa: [...new Set([...(item.p.avisos?.escrito_wa || []), item.username])] };
    await supabase.from('pedidos_alimentos').update({ avisos }).eq('id', item.p.id);
    await cargar();
  }

  if (!lista?.length) return null;
  return (
    <div className="bg-orange-950/20 border border-orange-900/60 rounded-xl p-3.5 flex flex-col gap-2">
      <p className="jb-display text-sm text-orange-400">💬 RESPUESTAS PARA MANDAR POR WHATSAPP · {lista.length}</p>
      <p className="jb-body text-[11px] text-zinc-400">Pedidos resueltos de los últimos {DIAS_RESPUESTAS_WA} días. Un mensaje tuyo los motiva más que la notificación. Toca "Escribirle": se abre WhatsApp con el mensaje listo y aquí deja de salir. Si no hace falta escribirle, toca "No hace falta".</p>
      {lista.map(item => (
        <div key={item.p.id + item.username} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex flex-col gap-1.5">
          <p className="jb-body text-sm text-zinc-100">
            <b>{item.alumno.nombre || item.username}</b>
            <span className="text-[11px] text-zinc-500"> · {item.p.estado === 'agregado' ? '✅ agregado' : '🗑️ descartado'} "{item.p.nombre}" · {fechaHoraCorta(item.p.resuelto_en)}</span>
          </p>
          {item.sinAviso && <p className="jb-body text-[11px] text-amber-300">⚠️ No le llegó la notificación: escríbele para que se entere.</p>}
          <p className="jb-body text-xs text-zinc-400 whitespace-pre-line">{mensajePedidoWhatsApp(item.p, item.alumno.nombre)}</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => escribir(item)} className={btnPrimary + ' text-xs py-1.5 px-3'}>
              <MessageCircle size={14} /> Escribirle
            </button>
            <button onClick={() => escribir(item, false)} className={btnGhost + ' text-xs py-1.5 px-3'}>No hace falta</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function PedidosAlimentosPanel() {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [abierto, setAbierto] = useState(false);
  const [resueltos, setResueltos] = useState([]); // aprobados en esta sesión, con sus avisos
  const [porEscribir, setPorEscribir] = useState(0); // respuestas para mandar por WhatsApp

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    try {
      const { data, error } = await supabase.from('pedidos_alimentos')
        .select('id, nombre, propuesta, solicitantes, actualizado_en')
        .eq('estado', 'pendiente').order('actualizado_en', { ascending: false }).limit(100);
      if (error) throw error;
      // Primero los que tienen a alguien esperando (WhatsApp o el botón de la app), luego los que pidió más gente.
      const esperando = p => (p.solicitantes || []).some(s => s.origen === 'whatsapp' || s.origen === 'app');
      const orden = p => quienesPidieron(p.solicitantes).length + (esperando(p) ? 100 : 0);
      setPedidos((data || []).sort((a, b) => orden(b) - orden(a)));
      if ((data || []).some(esperando)) setAbierto(true);
    } catch { setPedidos([]); }
    setCargando(false);
  }

  function resuelto(id, resultado) {
    setPedidos(ps => ps.filter(p => p.id !== id));
    if (resultado) setResueltos(rs => [resultado, ...rs]);
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <button onClick={() => setAbierto(v => !v)} className="w-full px-5 py-4 flex items-center justify-between text-left">
        <h2 className="jb-display text-base text-zinc-200">🍽️ PEDIDOS DE ALIMENTOS · {pedidos.length}{porEscribir > 0 && <span className="text-orange-400"> · 💬 {porEscribir}</span>}</h2>
        <ChevronRight size={18} className={`text-zinc-500 transition-transform ${abierto ? 'rotate-90' : ''}`} />
      </button>
      <div className={abierto ? 'px-5 pt-1 pb-3' : 'hidden'}>
        <RespuestasParaWhatsApp key={resueltos.length} onCantidad={n => { setPorEscribir(n); if (n > 0) setAbierto(true); }} />
      </div>
      {abierto && (
        <div className="px-5 pb-5 border-t border-zinc-800 pt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <p className="jb-body text-xs text-zinc-500">Los piden tus clientes por WhatsApp (💬), con el botón de la app (🙋) o los ve la IA en las fotos (📷). La IA los atiende sola: si está segura, lo agrega a la app (o responde con qué nombre ya existe). Aquí te quedan solo los que no pudo decidir (🤔). Al aprobar o descartar, avisamos a quien lo pidió (y lo ve también al abrir la app).</p>
            <button onClick={cargar} className={btnGhost + ' py-1 px-3 text-xs shrink-0'}>Actualizar</button>
          </div>

          {resueltos.map((r, i) => (
            <div key={i} className={`rounded-xl p-3 border ${r.descartado ? 'bg-zinc-950 border-zinc-800' : 'bg-emerald-950/30 border-emerald-900'}`}>
              <p className={`jb-body text-sm font-semibold ${r.descartado ? 'text-zinc-300' : 'text-emerald-300'}`}>
                {r.descartado ? `🗑️ Descartaste "${r.nombre}"${r.respuesta ? '' : ' (sin avisar)'}` : `✅ ${r.nombre} ya está en la app`}
              </p>
              <ResultadoAvisos nombre={r.nombre} avisos={r.avisos}
                mensaje={r.descartado && r.respuesta ? `Sobre tu pedido *${r.nombre}*: ${r.respuesta}` : undefined} />
            </div>
          ))}

          {cargando ? (
            <Loader2 className="animate-spin text-orange-500" size={20} />
          ) : pedidos.length === 0 ? (
            <p className="jb-body text-zinc-500 text-sm">No hay pedidos pendientes. Aparecerán aquí cuando alguien pida un plato que no está en la app.</p>
          ) : (
            pedidos.map(p => <PedidoAlimento key={p.id} pedido={p} onResuelto={resuelto} />)
          )}

          <PedidosAtendidosIA />
          <AgregarAlimentoSuelto onListo={nombre => setResueltos(rs => [{ nombre, avisos: null }, ...rs])} />
          <AlimentosEnMenu />
        </div>
      )}
    </div>
  );
}

/* Alimentos que crearon los alumnos ("+ Crear mi alimento"). Solo los ve
   quien los creó, pero pueden estar mal (calorías del paquete, macros que
   no cuadran). Jonah los revisa: los deja como están, los corrige (las
   comidas del alumno se recalculan solas, porque se buscan por nombre) o
   los agrega a la app para todos. */
function alertasAlimentoPropio(a) {
  const k = Number(a.kcal) || 0, p = Number(a.proteina) || 0, c = Number(a.carbos) || 0, g = Number(a.grasas) || 0;
  const alertas = [];
  if (p + c + g === 0) alertas.push('Sin proteína, carbos ni grasa: solo cuentan las calorías.');
  else {
    const calc = 4 * p + 4 * c + 9 * g;
    if (Math.abs(calc - k) > 40 && Math.abs(calc - k) / Math.max(k, 1) > 0.25) alertas.push(`Las calorías no cuadran con sus macros (darían unas ${Math.round(calc)} kcal).`);
  }
  if (p + c + g > 100) alertas.push('Sus macros suman más de 100 g por cada 100 g.');
  if (p > 90) alertas.push('Proteína imposible (más de 90 g por 100 g).');
  if (k > 0 && k < 5) alertas.push('Calorías muy bajas.');
  return alertas;
}

function AlimentosPropiosPanel() {
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [abierto, setAbierto] = useState(false);
  const [verTodos, setVerTodos] = useState(false);

  useEffect(() => { cargar(); }, [verTodos]);

  async function cargar() {
    setCargando(true);
    try {
      let q = supabase.from('alimentos_personales')
        .select('id, username, nombre, kcal, proteina, carbos, grasas, created_at, revision, revisado_en, revision_ia')
        .order('created_at', { ascending: false }).limit(200);
      // Pendientes: los dudosos (la IA no estuvo segura) y los que la IA aún no revisa.
      if (!verTodos) q = q.or('revision.is.null,revision.eq.revisando,revision.eq.dudoso');
      const { data, error } = await q;
      if (error) throw error;
      // Primero los dudosos, luego los que tienen alertas.
      const filas = (data || []).map(a => ({ ...a, alertas: alertasAlimentoPropio(a) }));
      const peso = a => (a.revision === 'dudoso' ? 100 : 0) + a.alertas.length;
      setLista(filas.sort((a, b) => peso(b) - peso(a)));
    } catch { setLista([]); }
    setCargando(false);
  }

  const porRevisar = a => !a.revision || a.revision === 'revisando' || a.revision === 'dudoso';
  const pendientes = lista.filter(porRevisar).length;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <button onClick={() => setAbierto(v => !v)} className="w-full px-5 py-4 flex items-center justify-between text-left">
        <h2 className="jb-display text-base text-zinc-200">
          🍴 ALIMENTOS CREADOS POR ALUMNOS · {pendientes}
          {lista.some(a => a.revision === 'dudoso') && <span className="text-amber-400"> ⚠️</span>}
        </h2>
        <ChevronRight size={18} className={`text-zinc-500 transition-transform ${abierto ? 'rotate-90' : ''}`} />
      </button>
      {abierto && (
        <div className="px-5 pb-5 border-t border-zinc-800 pt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <p className="jb-body text-xs text-zinc-500">
              Los crean con "+ Crear mi alimento" y solo los ve quien los creó. La IA los revisa sola apenas se crean: si está segura, lo da por bueno, lo corrige o lo cambia por el de la app. Aquí te quedan solo los que no pudo decidir (🤔). Si corriges uno, sus comidas se recalculan solas y le avisamos al abrir la app.
            </p>
            <button onClick={() => setVerTodos(v => !v)} className={btnGhost + ' py-1 px-3 text-xs shrink-0'}>{verTodos ? 'Solo pendientes' : 'Ver todos'}</button>
          </div>
          {cargando ? (
            <Loader2 className="animate-spin text-orange-500" size={20} />
          ) : lista.length === 0 ? (
            <p className="jb-body text-zinc-500 text-sm">No hay alimentos por revisar.</p>
          ) : (
            lista.map(a => <AlimentoPropio key={a.id} a={a} onListo={cargar} />)
          )}
        </div>
      )}
    </div>
  );
}

function AlimentoPropio({ a, onListo }) {
  const [editando, setEditando] = useState(false);
  const [f, setF] = useState({ kcal: a.kcal, proteina: a.proteina, carbos: a.carbos, grasas: a.grasas });
  const [ia, setIa] = useState(null);
  const [paraTodos, setParaTodos] = useState(null);
  const [fuente, setFuente] = useState('alumno'); // de dónde salen las cifras del formulario "para todos"
  const [existe, setExiste] = useState(null); // texto del buscador "Ya existe en la app" (null = cerrado)
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');

  async function marcar(revision, datos = {}) {
    setOcupado(true); setError('');
    try {
      const { error: e } = await supabase.from('alimentos_personales')
        // Lo decidió Jonah: deja de contar como decisión de la IA.
        .update({ ...datos, revision, revisado_en: new Date().toISOString(), ...(a.revision_ia ? { revision_ia: { ...a.revision_ia, auto: false } } : {}) }).eq('id', a.id);
      if (e) throw e;
      await onListo();
    } catch (e) { setError('No se pudo guardar: ' + (e?.message || 'intenta de nuevo.')); }
    setOcupado(false);
  }

  async function compararIA() {
    setOcupado(true); setError('');
    try {
      const r = await llamarPedidosAlimentos({ accion: 'calcular', nombre: a.nombre });
      setIa(r.propuesta || null);
      if (!r.propuesta) setError('La IA no pudo calcularlo.');
      setOcupado(false);
      return r.propuesta || null;
    } catch (e) { setError(e.message); }
    setOcupado(false);
    return null;
  }

  async function agregarParaTodos() {
    setOcupado(true); setError('');
    try {
      const r = await llamarPedidosAlimentos({ accion: 'aprobar', alimento: paraTodos });
      if (paraTodos.menu_uso) await guardarUsoMenu(r.alimento_id, paraTodos.menu_uso);
      await cargarAlimentosExtraDeNuevo();
      await marcar('aprobado');
    } catch (e) { setError(e.message); setOcupado(false); }
  }

  const n = v => Math.round((Number(v) || 0) * 10) / 10;
  const ri = a.revision_ia || null;
  const porIA = ri?.auto && ['ok', 'corregido', 'existe'].includes(a.revision); // lo decidió la IA sola (Jonah no lo tocó después)
  const estado = porIA
    ? { ok: '🤖 La IA lo dio por bueno', corregido: '🤖 La IA lo corrigió', existe: '🤖 La IA lo cambió por uno de la app' }[a.revision]
    : { ok: '✓ Revisado', corregido: '✏️ Corregido', aprobado: '➕ Agregado para todos', existe: '🔗 Cambiado por uno de la app', dudoso: '🤔 La IA no está segura', revisando: '🤖 La IA lo está revisando…' }[a.revision]
      || (!a.revision ? '🤖 La IA lo revisará pronto' : '');

  // "Ya existe en la app": el alumno creó algo que la app ya tiene. Su
  // alimento deja de salir en su buscador y, en sus comidas (también las de
  // días pasados), se usan los datos del alimento de la app.
  const sinTildes = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const opcionesExiste = existe === null ? [] : (() => {
    const palabras = sinTildes(existe).split(/\s+/).filter(Boolean);
    if (!palabras.length) return [];
    return FOODS.filter(f => { const t = sinTildes(f.key + ' ' + f.group); return palabras.every(p => t.includes(p)); }).slice(0, 8);
  })();
  async function marcarExiste(f) {
    if (!confirm(`¿Cambiar "${a.nombre}" de @${a.username} por "${f.key}" de la app (${Math.round(f.kcal)} kcal / 100 g)?\n\nSu alimento deja de salir en su buscador y sus comidas pasan a usar los datos de la app.`)) return;
    await marcar('existe', { reemplazo: f.key });
  }

  // Cifras del formulario "Agregar para todos": las del alumno o las de la IA
  // (con su grupo, estado y medida de casa). El nombre que ya escribió Jonah
  // se respeta.
  const cifrasAlumno = { kcal: a.kcal, proteina: a.proteina, carbos: a.carbos, grasa: a.grasas, fibra: '' };
  function usarCifras(de, propuestaIA = ia) {
    setFuente(de);
    setParaTodos(f => {
      const base = f || { ...ALIMENTO_VACIO, nombre: a.nombre };
      if (de === 'ia' && propuestaIA) {
        const p = formDesdePropuesta(propuestaIA, base.nombre);
        return { ...p, nombre: base.nombre, menu_uso: base.menu_uso };
      }
      return { ...base, ...cifrasAlumno };
    });
  }

  return (
    <div className={`bg-zinc-950 border rounded-xl p-3.5 flex flex-col gap-2 ${a.revision === 'dudoso' || (a.alertas.length && !a.revision) ? 'border-amber-600/50' : 'border-zinc-800'}`}>
      <div>
        <p className="jb-body text-sm text-zinc-100 font-semibold">{a.nombre}</p>
        <p className="jb-body text-[11px] text-zinc-500">@{a.username} · {fechaHoraCorta(a.created_at)}{estado ? ` · ${estado}` : ''}</p>
        <p className="jb-body text-xs text-zinc-300 mt-1 tabular-nums">Por 100 g: {n(a.kcal)} kcal · P {n(a.proteina)} g · C {n(a.carbos)} g · G {n(a.grasas)} g</p>
        {a.alertas.map((t, i) => <p key={i} className="jb-body text-xs text-amber-400 mt-0.5">⚠️ {t}</p>)}
      </div>

      {ri?.ia && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
          {a.revision === 'dudoso' && <p className="jb-body text-xs text-amber-400 font-semibold">🤔 La IA no está segura. Decide tú:</p>}
          {ri.nota && <p className="jb-body text-[11px] text-zinc-400 mt-0.5">🤖 {ri.nota}</p>}
          <p className="jb-body text-xs text-zinc-300 tabular-nums mt-0.5">🤖 La IA estima: {n(ri.ia.kcal)} kcal · P {n(ri.ia.proteina)} g · C {n(ri.ia.carbos)} g · G {n(ri.ia.grasa)} g</p>
          {porIA && a.revision === 'corregido' && ri.antes && (
            <p className="jb-body text-[11px] text-zinc-500 mt-0.5 tabular-nums">El alumno había puesto: {n(ri.antes.kcal)} kcal · P {n(ri.antes.proteina)} g · C {n(ri.antes.carbos)} g · G {n(ri.antes.grasas)} g</p>
          )}
          {porIA && a.revision === 'existe' && ri.ya_existe && <p className="jb-body text-[11px] text-zinc-500 mt-0.5">Cambiado por: {ri.ya_existe}</p>}
          <div className="flex flex-wrap gap-x-3">
            {a.revision !== 'existe' && (
              <button onClick={() => { setF({ kcal: ri.ia.kcal ?? '', proteina: ri.ia.proteina ?? '', carbos: ri.ia.carbos ?? '', grasas: ri.ia.grasa ?? '' }); setEditando(true); }}
                className="jb-body text-[11px] text-orange-400 underline mt-1">Usar los números de la IA</button>
            )}
            {porIA && a.revision === 'corregido' && ri.antes && (
              <button onClick={() => { setF({ kcal: ri.antes.kcal, proteina: ri.antes.proteina, carbos: ri.antes.carbos, grasas: ri.antes.grasas }); setEditando(true); }}
                className="jb-body text-[11px] text-zinc-400 underline mt-1">Volver a los del alumno</button>
            )}
          </div>
        </div>
      )}

      {ia && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
          <p className="jb-body text-xs text-zinc-300 tabular-nums">🤖 La IA estima: {n(ia.kcal)} kcal · P {n(ia.proteina)} g · C {n(ia.carbos)} g · G {n(ia.grasa)} g</p>
          {ia.nota && <p className="jb-body text-[11px] text-zinc-500 mt-0.5">{ia.nota}</p>}
          <button onClick={() => { setF({ kcal: ia.kcal ?? '', proteina: ia.proteina ?? '', carbos: ia.carbos ?? '', grasas: ia.grasa ?? '' }); setEditando(true); }}
            className="jb-body text-[11px] text-orange-400 underline mt-1">Usar estos números para corregirlo</button>
        </div>
      )}

      {editando && (
        <div className="grid grid-cols-4 gap-2">
          {[['kcal', 'kcal'], ['proteina', 'Prot. g'], ['carbos', 'Carbos g'], ['grasas', 'Grasa g']].map(([k, l]) => (
            <label key={k} className="jb-body text-[10px] text-zinc-500">{l}
              <input type="number" inputMode="decimal" value={f[k]} onChange={e => setF(v => ({ ...v, [k]: e.target.value }))} className={inputCls + ' text-sm mt-0.5'} />
            </label>
          ))}
        </div>
      )}

      {paraTodos && (
        <div className="flex flex-col gap-2 border-t border-zinc-800 pt-2">
          <p className="jb-body text-xs text-zinc-400">Revisa el grupo y los datos: así aparecerá en la app para todos.</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="jb-body text-[11px] text-zinc-500">Usar las cifras de:</span>
            {[['alumno', `👤 El alumno (${n(a.kcal)} kcal)`], ['ia', ia ? `🤖 La IA (${n(ia.kcal)} kcal)` : '🤖 La IA']].map(([id, texto]) => (
              <button key={id} type="button" disabled={ocupado}
                onClick={async () => {
                  if (id === 'ia' && !ia) { const p = await compararIA(); if (p) usarCifras('ia', p); return; }
                  usarCifras(id);
                }}
                className={`jb-body text-xs px-3 py-1 rounded-full border ${fuente === id ? 'bg-orange-500 border-orange-500 text-zinc-950 font-semibold' : 'border-zinc-700 text-zinc-300'}`}>
                {id === 'ia' && !ia && ocupado ? 'Calculando…' : texto}
              </button>
            ))}
          </div>
          <FormAlimento form={paraTodos} setForm={setParaTodos} />
          <div className="flex gap-2">
            <button onClick={agregarParaTodos} disabled={ocupado || !paraTodos.nombre.trim() || paraTodos.kcal === ''} className={btnPrimary + ' text-sm py-2 flex-1'}>
              {ocupado ? <Loader2 size={15} className="animate-spin" /> : '✅ Agregar a la app'}
            </button>
            <button onClick={() => setParaTodos(null)} className={btnGhost + ' text-sm py-2'}>Cancelar</button>
          </div>
        </div>
      )}

      {existe !== null && !paraTodos && (
        <div className="flex flex-col gap-1.5 border-t border-zinc-800 pt-2">
          <p className="jb-body text-xs text-zinc-400">¿Cuál de la app es? Toca el correcto:</p>
          <input value={existe} onChange={e => setExiste(e.target.value)} className={inputCls + ' text-sm'} placeholder="Buscar en la app…" autoFocus />
          {opcionesExiste.map(f => (
            <button key={f.key} disabled={ocupado} onClick={() => marcarExiste(f)}
              className="text-left bg-zinc-900 border border-zinc-800 hover:border-orange-500 rounded-lg px-3 py-2">
              <span className="jb-body text-sm text-zinc-100 block">{f.key}</span>
              <span className="jb-body text-[11px] text-zinc-500">{f.group} · {Math.round(f.kcal)} kcal · P {n(f.protein)} g · C {n(f.carbs)} g · G {n(f.fat)} g (por 100 g)</span>
            </button>
          ))}
          {existe.trim() && !opcionesExiste.length && <p className="jb-body text-xs text-zinc-500">No encontré nada con ese nombre en la app. Prueba con otra palabra o usa "➕ Agregar para todos".</p>}
          <button onClick={() => setExiste(null)} className="jb-body text-xs text-zinc-500 underline self-start">Cancelar</button>
        </div>
      )}

      {!paraTodos && existe === null && (
        <div className="flex flex-wrap gap-2">
          {editando ? (
            <>
              <button disabled={ocupado || !(Number(f.kcal) > 0) || Number(f.kcal) > 900}
                onClick={() => marcar('corregido', { kcal: Number(f.kcal), proteina: Number(f.proteina) || 0, carbos: Number(f.carbos) || 0, grasas: Number(f.grasas) || 0 })}
                className={btnPrimary + ' text-xs py-1.5 px-3'}>Guardar corrección</button>
              <button onClick={() => setEditando(false)} className={btnGhost + ' text-xs py-1.5 px-3'}>Cancelar</button>
            </>
          ) : (
            <>
              {a.revision !== 'ok' && <button disabled={ocupado} onClick={() => marcar('ok')} className={btnGhost + ' text-xs py-1.5 px-3'}>✓ Está bien</button>}
              <button disabled={ocupado} onClick={() => setEditando(true)} className={btnGhost + ' text-xs py-1.5 px-3'}>✏️ Corregir</button>
              {!ia && <button disabled={ocupado} onClick={compararIA} className={btnGhost + ' text-xs py-1.5 px-3'}>{ocupado ? <Loader2 size={13} className="animate-spin" /> : '🤖 Comparar con la IA'}</button>}
              {a.revision !== 'existe' && (
                <button disabled={ocupado} onClick={() => setExiste(String(ia?.ya_existe || a.nombre).replace(/[()'"]/g, ' ').trim())}
                  className={btnGhost + ' text-xs py-1.5 px-3'}>🔗 Ya existe en la app</button>
              )}
              {a.revision !== 'aprobado' && (
                <button disabled={ocupado} onClick={() => { setFuente('alumno'); setParaTodos({ ...ALIMENTO_VACIO, nombre: a.nombre, ...cifrasAlumno }); }}
                  className={btnGhost + ' text-xs py-1.5 px-3'}>➕ Agregar para todos</button>
              )}
            </>
          )}
        </div>
      )}
      {error && <p className="jb-body text-xs text-red-400">{error}</p>}
    </div>
  );
}

// Los alimentos que ya agregó Jonah, para marcar cuáles salen en el menú del día.
function AlimentosEnMenu() {
  const [abierto, setAbierto] = useState(false);
  const [lista, setLista] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [guardando, setGuardando] = useState(null);
  const [error, setError] = useState('');

  async function cargar() {
    const { data, error: e } = await supabase.from('alimentos_extra').select('id, nombre, estado, grupo, menu_uso').order('nombre');
    if (e) { setError('No se pudo cargar la lista: ' + e.message); setLista([]); return; }
    setLista(data || []);
  }
  useEffect(() => { if (abierto && lista === null) cargar(); }, [abierto]);

  async function cambiar(a, valor) {
    setGuardando(a.id); setError('');
    try {
      await guardarUsoMenu(a.id, valor);
      setLista(l => l.map(x => x.id === a.id ? { ...x, menu_uso: valor || null } : x));
      await cargarAlimentosExtraDeNuevo();
    } catch (e) { setError(e.message); }
    setGuardando(null);
  }

  const visibles = (lista || []).filter(a => !filtro.trim() || a.nombre.toLowerCase().includes(filtro.trim().toLowerCase()));
  const enMenu = (lista || []).filter(a => a.menu_uso).length;
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl">
      <button onClick={() => setAbierto(v => !v)} className="w-full px-3.5 py-3 flex items-center justify-between text-left">
        <span className="jb-body text-xs text-zinc-300">🍽️ Alimentos agregados en el menú del día{lista ? ` · ${enMenu} de ${lista.length}` : ''}</span>
        <ChevronRight size={16} className={`text-zinc-500 transition-transform ${abierto ? 'rotate-90' : ''}`} />
      </button>
      {abierto && (
        <div className="px-3.5 pb-3.5 flex flex-col gap-2">
          <p className="jb-body text-[11px] text-zinc-500">Elige para qué comida sirve cada alimento que agregaste. Los que dejes en "No usar" solo sirven para registrar.</p>
          <input value={filtro} onChange={e => setFiltro(e.target.value)} className={inputCls + ' text-sm'} placeholder="Buscar…" />
          {lista === null ? <Loader2 className="animate-spin text-orange-500" size={18} /> : visibles.length === 0 ? (
            <p className="jb-body text-xs text-zinc-500">No hay alimentos agregados{filtro ? ' con ese nombre' : ''}.</p>
          ) : visibles.map(a => (
            <div key={a.id} className="flex flex-col gap-1 border-t border-zinc-800 pt-2">
              <p className="jb-body text-sm text-zinc-200">{a.nombre}{a.estado && a.estado !== '-' ? ` (${a.estado.toLowerCase()})` : ''} <span className="text-[11px] text-zinc-500">· {a.grupo}</span>
                {guardando === a.id && <Loader2 size={12} className="inline animate-spin text-orange-500 ml-1" />}</p>
              <SelectUsoMenu valor={a.menu_uso} onCambiar={v => cambiar(a, v)} />
            </div>
          ))}
          {error && <p className="jb-body text-xs text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}

function LeadsPanel() {
  const [leads, setLeads] = useState([]);
  // Código del live: el código, su premio (días de Premium extra al crear
  // la cuenta) y hasta qué día vale. Se guardan en config.
  const [code, setCode] = useState({ codigo: '', dias: '0', hasta: '' });
  const [savedCode, setSavedCode] = useState({ codigo: '', dias: '0', hasta: '' });
  const [canjes, setCanjes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(100);
      setLeads(data || []);
    } catch { setLeads([]); }
    try {
      const { data } = await supabase.from('config').select('key, value').in('key', ['access_code', 'access_code_dias', 'access_code_hasta']);
      const v = k => (data || []).find(r => r.key === k)?.value || '';
      const c = { codigo: v('access_code'), dias: v('access_code_dias') || '0', hasta: v('access_code_hasta') };
      setCode(c); setSavedCode(c);
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
    try {
      const { data } = await supabase.from('embudo_landing_eventos').select('id, username, detalle, creado_en')
        .eq('evento', 'codigo_live_canje').order('creado_en', { ascending: false }).limit(200);
      setCanjes(data || []);
    } catch { setCanjes([]); }
    setLoading(false);
  }

  const codigoCambio = code.codigo.trim().toUpperCase() !== savedCode.codigo || code.dias !== savedCode.dias || code.hasta !== savedCode.hasta;
  async function saveCode() {
    const c = { ...code, codigo: code.codigo.trim().toUpperCase() };
    if (!c.codigo) return;
    const { error } = await supabase.from('config').upsert([
      { key: 'access_code', value: c.codigo },
      { key: 'access_code_dias', value: c.dias },
      { key: 'access_code_hasta', value: c.hasta },
    ]);
    if (error) return alert('No se pudo completar la acción: ' + (error.message || 'Intenta de nuevo.'));
    setCode(c); setSavedCode(c);
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full px-5 py-4 flex items-center justify-between text-left">
        <h2 className="jb-display text-base text-zinc-200">📏 CALCULADORA GRATIS · {leads.length} personas medidas</h2>
        <ChevronRight size={18} className={`text-zinc-500 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 flex flex-col gap-5 border-t border-zinc-800 pt-4">
          <div>
            <h3 className="jb-display text-sm text-zinc-300 mb-2">CÓDIGO DEL LIVE</h3>
            <p className="jb-body text-xs text-zinc-500 mb-3">
              Compártelo en tus lives o stories. Se escribe en la calculadora (es opcional) y, si le pones premio, quien cree su cuenta nueva con él recibe esos días de Premium además de su prueba gratis. Una vez por cuenta. El % de grasa se ve igual pidiéndolo por WhatsApp.
            </p>
            <div className="flex gap-3 items-end flex-wrap">
              <label className="flex flex-col gap-1">
                <span className="jb-body text-[11px] text-zinc-500">Código</span>
                <input value={code.codigo} onChange={e => setCode(v => ({ ...v, codigo: e.target.value }))}
                  className={inputCls + ' uppercase w-36'} placeholder="Ej. BEAST" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="jb-body text-[11px] text-zinc-500">Premio</span>
                <select value={code.dias} onChange={e => setCode(v => ({ ...v, dias: e.target.value }))} className={inputCls + ' w-40'}>
                  <option value="0">Sin premio</option>
                  <option value="7">+7 días de Premium</option>
                  <option value="15">+15 días de Premium</option>
                  <option value="30">+1 mes de Premium</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="jb-body text-[11px] text-zinc-500">Vale hasta (incluido)</span>
                <input type="date" value={code.hasta} onChange={e => setCode(v => ({ ...v, hasta: e.target.value }))}
                  className={inputCls + ' w-40'} />
              </label>
              <button onClick={saveCode} disabled={!codigoCambio || !code.codigo.trim()} className={btnPrimary + ' text-sm'}>
                {codigoCambio ? 'Guardar' : 'Guardado'}
              </button>
            </div>
            <p className="jb-body text-[11px] text-zinc-500 mt-2">
              {!savedCode.codigo ? 'Aún no hay código.'
                : savedCode.hasta && savedCode.hasta < todayISO() ? `⏰ ${savedCode.codigo} ya venció (valía hasta el ${savedCode.hasta}).`
                : `Activo: ${savedCode.codigo} · ${savedCode.dias === '0' ? 'sin premio' : `+${savedCode.dias} días de Premium`} · ${savedCode.hasta ? `hasta el ${savedCode.hasta}` : 'sin fecha límite'}.`}
            </p>
          </div>

          <div>
            <h3 className="jb-display text-sm text-zinc-300 mb-2">CUENTAS QUE USARON UN CÓDIGO · {canjes.length}</h3>
            {canjes.length === 0 ? (
              <p className="text-zinc-500 text-sm">Aún nadie creó su cuenta con un código con premio.</p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto">
                {canjes.map(c => {
                  const [cod, dias] = String(c.detalle || '').split(':');
                  return (
                    <div key={c.id} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 flex items-center justify-between gap-2 jb-body text-xs">
                      <span className="text-zinc-100 font-medium truncate">{c.username}</span>
                      <span className="text-zinc-400 shrink-0">{cod} · +{dias} días · {new Date(c.creado_en).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="jb-display text-sm text-zinc-300">PERSONAS QUE SE MIDIERON</h3>
              <button onClick={load} className={btnGhost + ' py-1 px-3 text-xs'}>Actualizar</button>
            </div>
            {loading ? (
              <Loader2 className="animate-spin text-orange-500" size={20} />
            ) : leads.length === 0 ? (
              <p className="text-zinc-500 text-sm">Aún nadie se ha medido con el código.</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                {leads.map(l => (
                  <div key={l.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-zinc-100 text-sm font-medium">{l.nombre || 'Sin nombre'}</div>
                      <div className="text-zinc-500 text-xs">
                        {l.telefono || 'sin celular'} · {l.red} · {new Date(l.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                      </div>
                    </div>
                    <div className="text-xs text-zinc-400 jb-body">
                      {l.grasa_pct}% grasa · IMC {l.imc} · {l.tdee} kcal
                    </div>
                    <a href={l.telefono
                      ? `https://wa.me/${l.telefono.replace(/\D/g,'').length <= 9 ? '51' + l.telefono.replace(/\D/g,'') : l.telefono.replace(/\D/g,'')}?text=${encodeURIComponent(`Hola ${l.nombre || ''}, vi que te mediste en Jonah Beast Fuel. ¿Quieres que revisemos tus resultados juntos?`)}`
                      : `https://wa.me/?text=${encodeURIComponent('Hola, vi que te mediste en Jonah Beast Fuel.')}`}
                      target="_blank" rel="noopener noreferrer" className={btnGhost + ' py-1 px-3 text-xs'}>
                      <MessageCircle size={13} /> Contactar
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Para usar GraficoHud con una sola serie: cada dato {clave, etiqueta, valor}
// pasa a {partes: {valor}} y se pinta en naranja ají.
const SERIE_LED_UNICA = [{ key: 'valor', label: 'Valor', color: '#FF7020' }];
const ledsDeUnValor = datos => datos.map(d => ({ ...d, partes: { valor: d.valor } }));

// Barra horizontal lisa con brillo naranja (sin cuadritos repetidos), con
// el mismo brillo de la línea de la "Proyección mensual". Se llena de
// izquierda a derecha al aparecer.
function BarraBrillo({ pct, fila = 0, alto = 'h-2' }) {
  const ancho = Math.min(100, Math.max(0, pct));
  return (
    <span className={`flex-1 w-full ${alto} rounded-full overflow-hidden`} style={{ background: '#27272a' }} aria-hidden="true">
      <span className="block h-full rounded-full jbg-anim"
        style={{ width: `${ancho}%`, background: 'linear-gradient(90deg, #C24A0A, #FF7020)', boxShadow: '0 0 8px rgba(255,112,32,0.7)', transformOrigin: 'left', animation: `jbg-crece .8s ease-out ${fila * 0.1}s both` }} />
    </span>
  );
}

// Tablero del negocio: los números clave en un solo lugar (antes estaban
// repetidos en varias tarjetas) y dos gráficos: ingresos por mes y cuántos
// alumnos registran comidas cada día.
// Fecha en que se publicaron las mejoras de la app (rediseño de comidas,
// inicio, fotos, primera comida, planes y avisos). La tarjeta compara
// antes y después de esta fecha.
const FECHA_MEJORAS = '2026-09-24';

const AVISOS_ANTES = 13;

// alumnos vigentes con avisos activos el 24 set 2026

function FuncionandoPanel({ users }) {
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const desde = addDaysISO(FECHA_MEJORAS, -45);
      const [{ data: hist }, { data: pagos }, { data: subs }] = await Promise.all([
        traerTodas(() => supabase.from('historial').select('username, fecha').gt('comidas_count', 0).gte('fecha', desde)),
        traerTodas(() => supabase.from('pagos').select('username, creado_en').eq('estado', 'aprobado')),
        traerTodas(() => supabase.from('push_subs').select('username').eq('activa', true)),
      ]);
      if (!cancelado) setDatos({ hist: hist || [], pagos: pagos || [], subs: subs || [] });
    })().catch(() => { if (!cancelado) setDatos({ hist: [], pagos: [], subs: [] }); });
    return () => { cancelado = true; };
  }, []);

  if (!datos) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center gap-2 text-zinc-500 text-xs jb-body">
        <Loader2 size={14} className="animate-spin" /> Midiendo resultados…
      </div>
    );
  }

  const hoy = todayISO();
  const pct = (a, n) => (n ? Math.round((a / n) * 100) : null);
  const todos = users || [];
  // Primer pago aprobado de cada alumno (fecha en que pasó a pagar).
  const primerPago = {};
  datos.pagos.forEach(p => { const f = String(p.creado_en).slice(0, 10); if (!primerPago[p.username] || f < primerPago[p.username]) primerPago[p.username] = f; });
  const comidasPorAlumno = {};
  const alumnosPorDia = {};
  datos.hist.forEach(r => {
    (comidasPorAlumno[r.username] = comidasPorAlumno[r.username] || new Set()).add(r.fecha);
    (alumnosPorDia[r.fecha] = alumnosPorDia[r.fecha] || new Set()).add(r.username);
  });

  // 1) Pasan a pago: de cada periodo, los que pagaron por primera vez y
  //    los que terminaron su prueba (fecha real de vencimiento) sin pagar.
  const esPruebaU = u => u.plan === 'trial' || u.plan === 'prueba';
  const periodo = (desde, hasta) => {
    const pagaronP = Object.entries(primerPago).filter(([, f]) => f >= desde && f < hasta).length;
    const sinPagarP = todos.filter(u => esPruebaU(u) && !primerPago[u.username] && u.fechaVencimiento && u.fechaVencimiento >= desde && u.fechaVencimiento < hasta).length;
    return { pagaron: pagaronP, total: pagaronP + sinPagarP };
  };
  const convAntes = periodo('2000-01-01', FECHA_MEJORAS);
  const convDespues = periodo(FECHA_MEJORAS, hoy);

  // 2) Primera comida en sus 2 primeros días (solo quienes ya tuvieron esos 2 días).
  const comioAlInicio = u => [...(comidasPorAlumno[u.username] || [])].some(f => f >= u.fechaInicio && f <= addDaysISO(u.fechaInicio, 1));
  const nuevos = todos.filter(u => u.fechaInicio && addDaysISO(u.fechaInicio, 1) < hoy && u.fechaInicio >= addDaysISO(FECHA_MEJORAS, -30));
  const nuevosAntes = nuevos.filter(u => u.fechaInicio < FECHA_MEJORAS);
  const nuevosDespues = nuevos.filter(u => u.fechaInicio >= FECHA_MEJORAS);

  // 3) Alumnos que registran comida al día (promedio de días completos).
  const promedioDia = (desde, hasta) => {
    const dias = [];
    for (let f = desde; f <= hasta; f = addDaysISO(f, 1)) dias.push(alumnosPorDia[f] ? alumnosPorDia[f].size : 0);
    return dias.length ? Math.round((dias.reduce((a, b) => a + b, 0) / dias.length) * 10) / 10 : null;
  };
  const ayer = addDaysISO(hoy, -1);
  const diaAntes = promedioDia(addDaysISO(FECHA_MEJORAS, -7), addDaysISO(FECHA_MEJORAS, -1));
  const diaDespues = ayer >= FECHA_MEJORAS ? promedioDia(FECHA_MEJORAS, ayer) : null;
  const diasMedidos = ayer >= FECHA_MEJORAS ? Math.round((new Date(ayer) - new Date(FECHA_MEJORAS)) / 86400000) + 1 : 0;

  // 4) Avisos activos hoy entre alumnos vigentes.
  const vigentes = new Set(todos.filter(u => u.enabled && membershipActive(u)).map(u => u.username));
  const avisosHoy = new Set(datos.subs.map(x => x.username).filter(n => vigentes.has(n))).size;

  const filas = [
    { titulo: 'Pasan de la prueba a pagar', unidad: '%',
      antes: pct(convAntes.pagaron, convAntes.total), nAntes: `${convAntes.pagaron} de ${convAntes.total}`,
      despues: pct(convDespues.pagaron, convDespues.total), nDespues: `${convDespues.pagaron} de ${convDespues.total}` },
    { titulo: 'Nuevos que registran comida en sus 2 primeros días', unidad: '%',
      antes: pct(nuevosAntes.filter(comioAlInicio).length, nuevosAntes.length), nAntes: `${nuevosAntes.filter(comioAlInicio).length} de ${nuevosAntes.length}`,
      despues: pct(nuevosDespues.filter(comioAlInicio).length, nuevosDespues.length), nDespues: `${nuevosDespues.filter(comioAlInicio).length} de ${nuevosDespues.length}` },
    { titulo: 'Alumnos que registran comida por día (promedio)', unidad: '',
      antes: diaAntes, nAntes: '7 días previos',
      despues: diaDespues, nDespues: diasMedidos ? `${diasMedidos} día(s)` : '' },
    { titulo: 'Alumnos vigentes que reciben avisos', unidad: '',
      antes: AVISOS_ANTES, nAntes: '24 set',
      despues: avisosHoy, nDespues: 'hoy' },
  ];

  return (
    <div className="bg-zinc-900 border border-orange-500/30 rounded-2xl p-5">
      <h2 className="jb-display text-base text-zinc-200 mb-1">📈 ¿ESTÁ FUNCIONANDO?</h2>
      <p className="jb-body text-xs text-zinc-500 mb-4">
        Antes y después de las mejoras del {new Date(FECHA_MEJORAS + 'T12:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}. Con pocos alumnos los porcentajes cambian mucho: mira también cuántos son.
      </p>
      <div className="flex flex-col gap-2.5">
        {filas.map(f => {
          const hayDespues = f.despues !== null && f.despues !== undefined;
          const dif = hayDespues && f.antes !== null ? f.despues - f.antes : null;
          return (
            <div key={f.titulo} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
              <p className="jb-body text-xs text-zinc-300 mb-2">{f.titulo}</p>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div>
                  <p className="jb-body text-[10px] text-zinc-500 uppercase tracking-wider">Antes</p>
                  <p className="jb-display text-2xl text-zinc-400 tabular-nums leading-none">{f.antes !== null ? `${f.antes}${f.unidad}` : '—'}</p>
                  <p className="jb-body text-[10px] text-zinc-600">{f.nAntes}</p>
                </div>
                <span className={`jb-display text-sm tabular-nums ${dif === null ? 'text-zinc-600' : dif > 0 ? 'text-emerald-400' : dif < 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                  {dif === null ? '→' : `${dif > 0 ? '▲ +' : dif < 0 ? '▼ ' : '= '}${Math.round(dif * 10) / 10}${f.unidad}`}
                </span>
                <div className="text-right">
                  <p className="jb-body text-[10px] text-zinc-500 uppercase tracking-wider">Después</p>
                  <p className="jb-display text-2xl text-orange-500 tabular-nums leading-none">{hayDespues ? `${f.despues}${f.unidad}` : '—'}</p>
                  <p className="jb-body text-[10px] text-zinc-600">{hayDespues ? f.nDespues : 'aún midiendo'}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Embudo de activación: de los que se registraron, cuántos pasan cada paso
   (datos del cuerpo → primera comida → 3 días registrando → pagaron). Así
   se ve en qué paso se pierde la gente y si las mejoras lo cambian. */
// Día en que se empezó a medir el camino al pago (antes no hay datos).
const INICIO_CAMINO_PAGO = '2026-09-25';
const PASOS_PAGO = ['vio_planes', 'eligio_plan', 'eligio_metodo', 'pago_enviado'];
// Qué hacen los nuevos en "¡TU PLAN ESTÁ LISTO!", con la foto y con el
// aviso de abrir en Chrome/Safari. Se mide desde este día.
const INICIO_PRIMERA_COMIDA = '2026-10-02';
const EVENTOS_PRIMERA = ['primera_comida', 'foto_comida', 'abrir_navegador'];
const FILAS_PRIMERA = [
  { titulo: 'Primera comida', filas: [
    ['primera_comida', 'vio', 'Vieron "¡Tu plan está listo!"'],
    ['primera_comida', 'foto', 'Tocaron "Tómale foto"'],
    ['primera_comida', 'plato', 'Eligieron un plato con 1 toque'],
    ['primera_comida', 'buscar', 'Tocaron "Buscar otro plato"'],
    ['primera_comida', 'ahora_no', 'Tocaron "Ahora no"'],
    ['primera_comida', 'demo', 'Llegaron con el plato de la prueba'],
  ] },
  { titulo: 'Foto de la comida', filas: [
    ['foto_comida', 'resultado', 'La foto reconoció su comida'],
    ['foto_comida', 'vacio', 'No reconoció comida en la foto'],
    ['foto_comida', 'error', 'La foto falló'],
    ['foto_comida', 'limite', 'Se quedaron sin fotos'],
    ['foto_comida', 'agrego', 'Agregaron lo de la foto a su día'],
  ] },
  { titulo: 'Aviso "Abrir en Chrome/Safari"', filas: [
    ['abrir_navegador', 'vio', 'Vieron el aviso'],
    ['abrir_navegador', 'toco', 'Tocaron "Abrir en…"'],
    ['abrir_navegador', 'seguir', 'Tocaron "Seguir aquí por ahora"'],
  ] },
];

function ActivacionPanel({ users }) {
  const [rango, setRango] = useState(30); // días; 0 = desde siempre
  const [datos, setDatos] = useState(null);
  const todos = users || [];
  const nombres = todos.map(u => u.username).sort().join(',');

  useEffect(() => {
    if (!nombres) { setDatos({ cuerpo: {}, dias: {}, pagaron: new Set(), pasos: [], primera: [], interno: {} }); return; }
    let cancelado = false;
    (async () => {
      const lista = nombres.split(',');
      const [{ data: dat }, { data: hist }, { data: pagos }, { data: pasos }, { data: primera }, { data: avisos }] = await Promise.all([
        supabase.from('datos_alumnos').select('username, form').in('username', lista),
        traerTodas(() => supabase.from('historial').select('username, fecha').in('username', lista).gt('comidas_count', 0)),
        traerTodas(() => supabase.from('pagos').select('username, monto, creado_en').eq('estado', 'aprobado').gt('monto', 0)),
        traerTodas(() => supabase.from('embudo_landing_eventos').select('evento, username, detalle, creado_en').in('evento', PASOS_PAGO).gte('creado_en', INICIO_CAMINO_PAGO)),
        traerTodas(() => supabase.from('embudo_landing_eventos').select('evento, username, detalle, creado_en').in('evento', EVENTOS_PRIMERA).gte('creado_en', INICIO_PRIMERA_COMIDA)),
        traerTodas(() => supabase.from('estado_avisos').select('username, navegador_interno').in('username', lista), 'username'),
      ]);
      if (cancelado) return;
      const cuerpo = {};
      (dat || []).forEach(d => { cuerpo[d.username] = tieneDatosBasicos(d.form || {}); });
      const dias = {};
      (hist || []).forEach(r => { (dias[r.username] = dias[r.username] || new Set()).add(r.fecha); });
      const interno = {};
      (avisos || []).forEach(a => { interno[a.username] = !!a.navegador_interno; });
      setDatos({ cuerpo, dias, pagaron: new Set((pagos || []).map(p => p.username)), pagosAprobados: pagos || [], pasos: pasos || [], primera: primera || [], interno });
    })().catch(() => { if (!cancelado) setDatos({ cuerpo: {}, dias: {}, pagaron: new Set(), pagosAprobados: [], pasos: [], primera: [], interno: {} }); });
    return () => { cancelado = true; };
  }, [nombres]);

  if (!datos) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center gap-2 text-zinc-500 text-xs jb-body">
        <Loader2 size={14} className="animate-spin" /> Calculando la activación…
      </div>
    );
  }

  const desde = rango ? addDaysISO(todayISO(), -rango) : '0000-00-00';
  const cohorte = todos.filter(u => (String(u.createdAt || u.fechaInicio || '').slice(0, 10)) >= desde);
  const nDias = u => (datos.dias[u.username] ? datos.dias[u.username].size : 0);
  const pasos = [
    { titulo: 'Se registraron', n: cohorte.length },
    { titulo: 'Pusieron sus datos del cuerpo', n: cohorte.filter(u => datos.cuerpo[u.username] || nDias(u) > 0).length },
    { titulo: 'Registraron su primera comida', n: cohorte.filter(u => nDias(u) >= 1).length },
    { titulo: 'Registraron 3 días o más', n: cohorte.filter(u => nDias(u) >= 3).length },
    { titulo: 'Pagaron un plan', n: cohorte.filter(u => datos.pagaron.has(u.username)).length },
  ];
  const total = pasos[0].n;
  // El paso donde se pierde más gente (en cantidad de personas).
  let peor = -1, peorPerdida = 0;
  for (let i = 1; i < pasos.length; i++) {
    const perdida = pasos[i - 1].n - pasos[i].n;
    if (perdida > peorPerdida) { peorPerdida = perdida; peor = i; }
  }

  // Camino al pago: alumnos que llegaron a cada paso en el periodo. Quien
  // llegó a un paso posterior cuenta también en los anteriores (por ejemplo,
  // si pagó con Yape sin tocar el botón porque ya venía marcado).
  const desdePago = desde > INICIO_CAMINO_PAGO ? desde : INICIO_CAMINO_PAGO;
  const pasosPeriodo = (datos.pasos || []).filter(e => String(e.creado_en).slice(0, 10) >= desdePago);
  const llego = PASOS_PAGO.map(() => new Set());
  pasosPeriodo.forEach(e => {
    const i = PASOS_PAGO.indexOf(e.evento);
    for (let j = 0; j <= i; j++) llego[j].add(e.username);
  });
  const aprobados = new Set((datos.pagosAprobados || []).filter(p => String(p.creado_en).slice(0, 10) >= desdePago).map(p => p.username).filter(n => llego[0].has(n)));
  const caminoPago = [
    { titulo: 'Vieron los planes', n: llego[0].size },
    { titulo: 'Eligieron un plan', n: llego[1].size },
    { titulo: 'Eligieron cómo pagar', n: llego[2].size },
    { titulo: 'Enviaron el pago', n: llego[3].size },
    { titulo: 'Pago aprobado', n: aprobados.size },
  ];
  const conteoDetalle = evento => {
    const m = {};
    pasosPeriodo.filter(e => e.evento === evento && e.detalle).forEach(e => { (m[e.detalle] = m[e.detalle] || new Set()).add(e.username); });
    return Object.entries(m).map(([k, v]) => [k, v.size]).sort((a, b) => b[1] - a[1]);
  };
  // Primera comida según dónde abrieron la app: dentro de Instagram/Facebook/
  // TikTok o en Chrome/Safari (lo anota la app en estado_avisos).
  const porNavegador = interno => {
    const grupo = cohorte.filter(u => datos.interno[u.username] === interno);
    return { total: grupo.length, comieron: grupo.filter(u => nDias(u) >= 1).length };
  };
  const enApp = porNavegador(true), enNavegador = porNavegador(false);
  const desdePrimera = desde > INICIO_PRIMERA_COMIDA ? desde : INICIO_PRIMERA_COMIDA;
  const enCohorte = new Set(cohorte.map(u => u.username));
  // Solo los nuevos del periodo (la foto la usan también los alumnos antiguos).
  const primeraPeriodo = (datos.primera || []).filter(e => String(e.creado_en).slice(0, 10) >= desdePrimera && enCohorte.has(e.username));
  const personas = (evento, detalle, interno) => new Set(primeraPeriodo
    .filter(e => e.evento === evento && e.detalle === detalle && (interno === undefined || datos.interno[e.username] === interno))
    .map(e => e.username)).size;
  const medios = conteoDetalle('eligio_metodo');
  const planesElegidos = conteoDetalle('eligio_plan');
  const hoyISO = todayISO();
  const terminaronPrueba = todos.filter(u => (u.plan === 'trial' || u.plan === 'prueba') && u.fechaVencimiento
    && u.fechaVencimiento >= desdePago && u.fechaVencimiento <= hoyISO).length;

  // ¿Siguen usando la app? Por semana de registro (lunes a domingo): de los
  // que se registraron esa semana, cuántos registraron comida en su segunda
  // semana (días 7 a 13, justo cuando se acaba el Premium de prueba) y en su
  // tercera (días 14 a 20). El día del registro es el día 1.
  const lunesDe = iso => { const d = new Date(iso + 'T12:00:00'); return addDaysISO(iso, -((d.getDay() + 6) % 7)); };
  const semanas = [];
  for (let i = 7; i >= 0; i--) semanas.push(addDaysISO(lunesDe(hoyISO), -7 * i));
  const usoEntre = (u, inicio, a, b) => {
    const fechas = datos.dias[u.username];
    if (!fechas) return false;
    const desdeU = addDaysISO(inicio, a), hastaU = addDaysISO(inicio, b);
    for (const f of fechas) if (f >= desdeU && f <= hastaU) return true;
    return false;
  };
  const retencion = semanas.map(lunes => {
    const domingo = addDaysISO(lunes, 6);
    const grupo = todos.map(u => ({ u, inicio: String(u.createdAt || u.fechaInicio || '').slice(0, 10) }))
      .filter(x => x.inicio >= lunes && x.inicio <= domingo);
    // Una semana se puede medir cuando a todos ya les pasó ese tramo.
    const listo7 = addDaysISO(domingo, 12) < hoyISO, listo14 = addDaysISO(domingo, 19) < hoyISO;
    return {
      lunes, n: grupo.length,
      d7: listo7 ? grupo.filter(x => usoEntre(x.u, x.inicio, 6, 12)).length : null,
      d14: listo14 ? grupo.filter(x => usoEntre(x.u, x.inicio, 13, 19)).length : null,
    };
  }).filter(s => s.n > 0);

  return (
    <div className="bg-zinc-900 border border-orange-500/30 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-1 flex-wrap">
        <h2 className="jb-display text-base text-zinc-200">🚦 ACTIVACIÓN DE NUEVOS</h2>
        <div className="flex gap-1.5">
          {[[30, '30 días'], [90, '90 días'], [0, 'Todo']].map(([v, t]) => (
            <button key={v} type="button" onClick={() => setRango(v)}
              className={`jb-body text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${rango === v ? 'bg-orange-500 border-orange-500 text-zinc-950 font-semibold' : 'border-zinc-700 text-zinc-400 hover:border-orange-500'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <p className="jb-body text-xs text-zinc-500 mb-4">
        De los que se registraron {rango ? `en los últimos ${rango} días` : 'desde el inicio'}, cuántos llegan a cada paso. Con pocos alumnos, mira también cuántos son.
      </p>
      {!total ? (
        <p className="jb-body text-sm text-zinc-500">Nadie se registró en este periodo.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {pasos.map((p, i) => {
            const pct = Math.round((p.n / total) * 100);
            const perdida = i > 0 ? pasos[i - 1].n - p.n : 0;
            return (
              <div key={p.titulo}>
                {i > 0 && perdida > 0 && (
                  <p className={`jb-body text-[11px] pl-2 my-0.5 ${i === peor ? 'text-orange-400 font-semibold' : 'text-zinc-500'}`}>
                    ↓ {perdida} se {perdida === 1 ? 'quedó' : 'quedaron'} aquí{i === peor ? ' · el paso donde más se pierde' : ''}
                  </p>
                )}
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2 mb-1.5">
                    <span className="jb-body text-xs text-zinc-300">{p.titulo}</span>
                    <span className="jb-body text-xs text-zinc-400 tabular-nums whitespace-nowrap">
                      <span className="jb-display text-base text-zinc-50">{p.n}</span> · {pct}%
                    </span>
                  </div>
                  <div className="flex"><BarraBrillo pct={p.n ? Math.max(pct, 1) : 0} fila={i} /></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="border-t border-zinc-800 mt-5 pt-4">
        <h3 className="jb-display text-sm text-zinc-200 mb-1">🔁 ¿SIGUEN USANDO LA APP?</h3>
        <p className="jb-body text-xs text-zinc-500 mb-3">
          Por semana de registro: cuántos registraron comida en su <span className="text-zinc-300">2.ª semana</span> (días 7 a 13, cuando se acaba el Premium de prueba) y en su <span className="text-zinc-300">3.ª semana</span> (días 14 a 20). Meta: 3 de cada 10 o más.
        </p>
        {!retencion.length ? (
          <p className="jb-body text-sm text-zinc-500">Nadie se registró en las últimas 8 semanas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full jb-body text-xs tabular-nums">
              <thead>
                <tr className="text-zinc-500 text-left">
                  <th className="font-normal py-1 pr-2">Semana del</th>
                  <th className="font-normal py-1 px-2 text-right">Registros</th>
                  <th className="font-normal py-1 px-2 text-right">2.ª semana</th>
                  <th className="font-normal py-1 pl-2 text-right">3.ª semana</th>
                </tr>
              </thead>
              <tbody>
                {retencion.map(s => {
                  const celda = v => {
                    if (v === null) return <span className="text-zinc-600">aún midiendo</span>;
                    const pct = Math.round((v / s.n) * 100);
                    return <span className={pct >= 30 ? 'text-emerald-400' : pct >= 15 ? 'text-amber-300' : 'text-zinc-400'}><span className="text-zinc-50 font-semibold">{v}</span> · {pct}%</span>;
                  };
                  return (
                    <tr key={s.lunes} className="border-t border-zinc-800">
                      <td className="py-1.5 pr-2 text-zinc-300">{new Date(s.lunes + 'T12:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}</td>
                      <td className="py-1.5 px-2 text-right text-zinc-50 font-semibold">{s.n}</td>
                      <td className="py-1.5 px-2 text-right">{celda(s.d7)}</td>
                      <td className="py-1.5 pl-2 text-right">{celda(s.d14)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="jb-body text-[11px] text-zinc-600 mt-2">Cuenta solo a quien registró al menos una comida ese tramo; abrir la app sin registrar no cuenta.</p>
      </div>

      <div className="border-t border-zinc-800 mt-5 pt-4">
        <h3 className="jb-display text-sm text-zinc-200 mb-1">🍽️ ¿QUÉ PASA CON SU PRIMERA COMIDA?</h3>
        <p className="jb-body text-xs text-zinc-500 mb-3">
          Dónde se quedan los nuevos antes de registrar su primera comida. "Dentro de Instagram/Facebook" es quien abrió la app desde el navegador de esas apps (sin avisos ni instalación).
        </p>
        {(enApp.total > 0 || enNavegador.total > 0) && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[['Dentro de Instagram/Facebook', enApp], ['En Chrome/Safari', enNavegador]].map(([t, g]) => (
              <div key={t} className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5">
                <div className="jb-display text-lg text-orange-400 tabular-nums">{g.comieron} de {g.total}</div>
                <div className="jb-body text-[11px] text-zinc-300 leading-tight">registraron su primera comida</div>
                <div className="jb-body text-[10px] text-zinc-500 leading-tight mt-0.5">{t}</div>
              </div>
            ))}
          </div>
        )}
        {!primeraPeriodo.length ? (
          <p className="jb-body text-xs text-zinc-500">El detalle de cada paso se empezó a medir el {new Date(INICIO_PRIMERA_COMIDA + 'T12:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })}. Aparecerá aquí cuando entren los próximos alumnos nuevos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full jb-body text-xs">
              <thead>
                <tr className="text-zinc-500 text-[11px]">
                  <th className="text-left font-normal py-1 pr-2">Personas que…</th>
                  <th className="text-right font-normal py-1 px-2">Total</th>
                  <th className="text-right font-normal py-1 px-2">Insta/Face</th>
                  <th className="text-right font-normal py-1 pl-2">Chrome/Safari</th>
                </tr>
              </thead>
              {FILAS_PRIMERA.map(g => (
                <tbody key={g.titulo}>
                  <tr><td colSpan={4} className="jb-display text-[11px] text-orange-300 pt-2 pb-0.5">{g.titulo.toUpperCase()}</td></tr>
                  {g.filas.map(([ev, det, t]) => (
                    <tr key={ev + det} className="border-t border-zinc-800 text-zinc-200">
                      <td className="py-1 pr-2">{t}</td>
                      <td className="text-right py-1 px-2 tabular-nums">{personas(ev, det)}</td>
                      <td className="text-right py-1 px-2 tabular-nums">{personas(ev, det, true)}</td>
                      <td className="text-right py-1 pl-2 tabular-nums">{personas(ev, det, false)}</td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        )}
      </div>

      <div className="border-t border-zinc-800 mt-5 pt-4">
        <h3 className="jb-display text-sm text-zinc-200 mb-1">💳 CAMINO AL PAGO</h3>
        <p className="jb-body text-xs text-zinc-500 mb-3">
          Alumnos que llegaron a cada paso {rango ? `en los últimos ${rango} días` : 'desde el inicio'}. Se mide desde el {new Date(INICIO_CAMINO_PAGO + 'T12:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })}.
          {' '}{terminaronPrueba} {terminaronPrueba === 1 ? 'prueba terminó' : 'pruebas terminaron'} en ese tiempo.
        </p>
        {!caminoPago[0].n ? (
          <p className="jb-body text-sm text-zinc-500">Todavía nadie abrió los planes desde que se empezó a medir.</p>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              {caminoPago.map((p, i) => {
                const pct = Math.round((p.n / caminoPago[0].n) * 100);
                const perdida = i > 0 ? caminoPago[i - 1].n - p.n : 0;
                return (
                  <div key={p.titulo}>
                    {i > 0 && perdida > 0 && (
                      <p className="jb-body text-[11px] pl-2 mb-0.5 text-zinc-500">↓ {perdida} se {perdida === 1 ? 'detuvo' : 'detuvieron'} aquí</p>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="jb-body text-xs text-zinc-300 w-36 shrink-0">{p.titulo}</span>
                      <BarraBrillo pct={p.n ? Math.max(pct, 1) : 0} fila={i} />
                      <span className="jb-body text-xs text-zinc-400 tabular-nums w-14 text-right"><span className="jb-display text-sm text-zinc-50">{p.n}</span> · {pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {(medios.length > 0 || planesElegidos.length > 0) && (
              <div className="jb-body text-[11px] text-zinc-400 mt-3 flex flex-col gap-0.5">
                {planesElegidos.length > 0 && <p><span className="text-zinc-300">Planes elegidos:</span> {planesElegidos.map(([k, n]) => `${k} ${Number(k) === 1 ? 'mes' : 'meses'} (${n})`).join(' · ')}</p>}
                {medios.length > 0 && <p><span className="text-zinc-300">Cómo quisieron pagar:</span> {medios.map(([k, n]) => `${k} (${n})`).join(' · ')}</p>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Cuentas del dueño (sus pruebas y pagos propios): no cuentan en las
// métricas del negocio (alumnos pagando, ingresos, alumnos nuevos,
// conversión, cobros de Jarvis).
const CUENTAS_PROPIAS = ['martin'];
const esCuentaPropia = username => CUENTAS_PROPIAS.includes(username);

function TableroPanel({ users: todosLosUsuarios }) {
  const users = (todosLosUsuarios || []).filter(u => !esCuentaPropia(u.username));
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const hace30 = fechaLocalISO(new Date(Date.now() - 29 * 86400000));
      const inicioMeses = new Date(); inicioMeses.setDate(1); inicioMeses.setMonth(inicioMeses.getMonth() - 5);
      const [{ data: pagos }, { data: hist }, { data: subs }] = await Promise.all([
        traerTodas(() => supabase.from('pagos').select('username, monto, creado_en').eq('estado', 'aprobado')
          .gte('creado_en', fechaLocalISO(inicioMeses))),
        traerTodas(() => supabase.from('historial').select('username, fecha').gt('comidas_count', 0).gte('fecha', hace30)),
        traerTodas(() => supabase.from('push_subs').select('username').eq('activa', true)),
      ]);
      if (cancelado) return;
      setDatos({ pagos: (pagos || []).filter(p => !esCuentaPropia(p.username)), hist: hist || [], subs: subs || [] });
    })().catch(() => { if (!cancelado) setDatos({ pagos: [], hist: [], subs: [] }); });
    return () => { cancelado = true; };
  }, []);

  const hoy = todayISO();
  const vigentes = (users || []).filter(u => u.enabled && membershipActive(u));
  const esPrueba = u => u.plan === 'trial' || u.plan === 'prueba';
  const pagando = vigentes.filter(u => !esPrueba(u)).length;
  const enPrueba = vigentes.filter(esPrueba).length;
  // Conversión aproximada: de los que ya terminaron su prueba o pagaron,
  // cuántos pagaron (incluye a los que registraste tú directo como pago).
  const pagaron = (users || []).filter(u => u.plan === 'pago').length;
  const pruebasSinPagar = (users || []).filter(u => esPrueba(u) && u.fechaVencimiento && u.fechaVencimiento < hoy).length;
  const conversion = pagaron + pruebasSinPagar > 0 ? Math.round((pagaron / (pagaron + pruebasSinPagar)) * 100) : null;

  let usanApp = null, conNotif = null, ingresoMes = null, graficoIngresos = [], graficoUso = [];
  if (datos) {
    const ultimaPorAlumno = {};
    datos.hist.forEach(r => { if (!ultimaPorAlumno[r.username] || r.fecha > ultimaPorAlumno[r.username]) ultimaPorAlumno[r.username] = r.fecha; });
    usanApp = vigentes.filter(u => ultimaPorAlumno[u.username] && -daysLeft(ultimaPorAlumno[u.username]) <= 1).length;
    const vigentesSet = new Set(vigentes.map(u => u.username));
    conNotif = new Set(datos.subs.map(x => x.username).filter(n => vigentesSet.has(n))).size;

    const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
    const porMes = {};
    datos.pagos.forEach(p => { const k = String(p.creado_en).slice(0, 7); porMes[k] = (porMes[k] || 0) + (Number(p.monto) || 0); });
    const base = new Date(); base.setDate(1);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      graficoIngresos.push({ clave: k, etiqueta: MESES[d.getMonth()], etiquetaLarga: `${MESES[d.getMonth()]} ${d.getFullYear()}`, valor: Math.round((porMes[k] || 0) * 100) / 100 });
    }
    ingresoMes = graficoIngresos[graficoIngresos.length - 1].valor;

    const porDia = {};
    datos.hist.forEach(r => { (porDia[r.fecha] = porDia[r.fecha] || new Set()).add(r.username); });
    for (let i = 29; i >= 0; i--) {
      const f = new Date(Date.now() - i * 86400000);
      const k = fechaLocalISO(f);
      graficoUso.push({ clave: k, etiqueta: String(f.getDate()), etiquetaLarga: f.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' }), valor: porDia[k] ? porDia[k].size : 0 });
    }
  }

  const fmtSoles = v => {
    const n = Number(v || 0);
    return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: n % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
  };
  const tarjetas = [
    { v: vigentes.length, l: 'Alumnos activos', sub: `${pagando} pagando · ${enPrueba} en prueba` },
    { v: conversion === null ? '—' : `${conversion}%`, l: 'Pruebas que pagan', sub: `${pagaron} de ${pagaron + pruebasSinPagar} (aprox.)` },
    { v: usanApp === null ? '…' : usanApp, l: 'Usan la app', sub: `registraron ayer u hoy, de ${vigentes.length}` },
    { v: conNotif === null ? '…' : conNotif, l: 'Con notificaciones', sub: `de ${vigentes.length} activos` },
    { v: ingresoMes === null ? '…' : fmtSoles(ingresoMes), l: 'Ingresos del mes', sub: 'pagos de planes aprobados' },
  ];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-5">
      <h2 className="jb-display text-base text-zinc-200">📊 CÓMO VA TU NEGOCIO</h2>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {tarjetas.map(t => (
          <div key={t.l} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
            <div className="jb-display text-2xl text-orange-400">{t.v}</div>
            <div className="jb-body text-[11px] text-zinc-300 leading-tight mt-0.5">{t.l}</div>
            <div className="jb-body text-[10px] text-zinc-500 leading-tight mt-0.5">{t.sub}</div>
          </div>
        ))}
      </div>
      {!datos ? (
        <div className="flex items-center gap-2 text-zinc-500 text-xs jb-body"><Loader2 size={14} className="animate-spin" /> Cargando gráficos…</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-5">
          <GraficoHud titulo="INGRESOS POR MES" datos={ledsDeUnValor(graficoIngresos)} series={SERIE_LED_UNICA} formato={fmtSoles} />
          <GraficoHud titulo="ALUMNOS QUE REGISTRARON COMIDAS · 30 DÍAS" datos={ledsDeUnValor(graficoUso)} series={SERIE_LED_UNICA}
            formato={v => `${v} alumno${v === 1 ? '' : 's'}`} etiquetaCada={5} />
        </div>
      )}
    </div>
  );
}

// Rentabilidad: cuánto cuesta mantener la app, cuánto deja cada alumno y
// cuál es el precio mínimo para no perder plata. Mezcla datos reales
// (alumnos, pagos y fotos del mes) con supuestos que el admin puede editar
// (se guardan en config → rentabilidad_supuestos).
const SUPUESTOS_RENTABILIDAD = {
  supabase: 94, vercel: 75, jarvis: 45, dominio: 8, otrosFijos: 0,
  costoFoto: 0.07, fotosAlumnoMes: 60, fotosPrueba: 10, whatsappAlumno: 0.3,
  comisionMP: 8.9, comisionGoogle: 15, conversion: 10, sueldoMeta: 1500, mesesPromedio: 3,
  tipoCambio: 3.75,
};

const TIPOS_IA_ALUMNO = ['plato', 'etiqueta', 'codigo', 'whatsapp'];

// Partes de la app que usan IA, para comparar su costo con el mes anterior.
const PARTES_IA = [
  { funcion: 'reconocer-comida', label: 'Fotos de comida', uso: 'foto' },
  { funcion: 'alimentos-pedidos', label: 'Pedidos de alimentos', uso: 'pedido' },
  { funcion: 'jarvis-chat', label: 'Jarvis', uso: 'consulta' },
  { funcion: 'whatsapp-webhook', label: 'Asistente de WhatsApp', uso: 'respuesta' },
];

// El mismo momento del mes pasado (si hoy es 15 a las 10 am, el 15 del mes
// pasado a las 10 am), para comparar "lo que va del mes" con lo mismo del
// mes anterior. Si el mes pasado era más corto, se queda en su último día.
function mismoMomentoMesPasado(d) {
  const r = new Date(d);
  const dia = r.getDate();
  r.setDate(1);
  r.setMonth(r.getMonth() - 1);
  r.setDate(Math.min(dia, new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate()));
  return r;
}

function cuotaNuevoRus(ingresos) {
  if (ingresos <= 5000) return 20;
  if (ingresos <= 8000) return 50;
  return null;
}

// Costo variable de UN alumno que paga: sus fotos, las fotos de los que
// probaron gratis y no pagaron (por cada uno que paga), y avisos.
function costoPorAlumno(s, conversionPct) {
  const conv = Math.min(Math.max(conversionPct, 1), 100) / 100;
  const pruebasPerdidas = 1 / conv - 1;
  return s.fotosAlumnoMes * s.costoFoto + pruebasPerdidas * s.fotosPrueba * s.costoFoto + s.whatsappAlumno;
}

// Ganancia al mes según cuántos alumnos pagan, con estilo HUD: área con
// degradado (rojo donde pierdes, verde donde ganas), línea con brillo que
// se dibuja al aparecer (sin cuadrícula de puntos), esquinas de pantalla y el
// punto de "Hoy" latiendo. Marcas: hoy, equilibrio y sueldo.
const ESTILOS_GRAFICO_HUD = `
@keyframes jbg-dibuja { from { stroke-dashoffset: 1200; } to { stroke-dashoffset: 0; } }
@keyframes jbg-aparece { from { opacity: 0; } to { opacity: 1; } }
@keyframes jbg-crece { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes jbg-barre { 0% { transform: translateX(-5%); opacity: 0; } 10% { opacity: .5; } 90% { opacity: .5; } 100% { transform: translateX(105%); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .jbg-anim { animation: none !important; } }
`;
function GraficoGanancia({ fijos, queda, hoy, equilibrio, paraSueldo, sueldo }) {
  const [hoverCrudo, setHover] = useState(null);
  const maxN = Math.min(400, Math.max(40, Math.ceil(((paraSueldo || equilibrio || hoy || 20) * 1.25) / 10) * 10));
  // Si el eje cambió (otro sueldo u otros costos), el punto tocado no puede quedar fuera del gráfico.
  const hover = hoverCrudo === null ? null : Math.min(hoverCrudo, maxN);
  const ganancia = n => n * queda - fijos;
  const W = 600, H = 220, pl = 10, pr = 10, pt = 26, pb = 24;
  const yMin = Math.min(-fijos, ganancia(maxN)) * 1.25, yMax = Math.max(sueldo * 1.15, ganancia(maxN), 10);
  const x = n => pl + (n / maxN) * (W - pl - pr);
  const y = v => pt + (1 - (v - yMin) / (yMax - yMin)) * (H - pt - pb);
  const cruce = queda > 0 ? fijos / queda : null;
  const fin = Math.min(maxN, cruce ?? maxN);
  const y0 = y(0);
  const marcas = [
    { n: hoy, texto: 'HOY', color: '#FF7020' },
    equilibrio && equilibrio <= maxN ? { n: equilibrio, texto: 'NO PIERDES', color: '#a1a1aa' } : null,
    paraSueldo && paraSueldo <= maxN ? { n: paraSueldo, texto: 'TU SUELDO', color: '#a1a1aa' } : null,
  ].filter(Boolean);
  const mover = (clientX, el) => {
    const r = el.getBoundingClientRect();
    const n = Math.round(((clientX - r.left) / r.width * W - pl) / (W - pl - pr) * maxN);
    setHover(Math.max(0, Math.min(maxN, n)));
  };
  const fmt = v => `${v >= 0 ? '+' : '−'}S/${Math.abs(Math.round(v)).toLocaleString('es-PE')}`;
  const esquina = (cx, cy, dx, dy) => `M${cx + dx * 14},${cy} L${cx},${cy} L${cx},${cy + dy * 14}`;
  return (
    <div className="relative rounded-lg p-3 overflow-hidden" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(232,89,12,0.10), rgba(9,9,11,0.95) 70%)', border: '1px solid rgba(232,89,12,0.25)' }}>
      <style>{ESTILOS_GRAFICO_HUD}</style>
      <div className="flex items-center justify-between mb-1 h-5">
        <span className="font-mono text-[10px] tracking-[0.2em] text-orange-400/80">◉ PROYECCIÓN MENSUAL</span>
        <span className="font-mono text-xs text-zinc-400">
          {hover !== null
            ? <>{hover} alumnos → <span className={ganancia(hover) >= 0 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>{fmt(ganancia(hover))}</span></>
            : <span className="text-zinc-600">toca el gráfico</span>}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full touch-none select-none" role="img"
        aria-label={`Ganancia al mes según alumnos: pierdes ${fmt(-fijos)} con 0 alumnos${cruce ? `, empiezas a ganar con ${Math.ceil(cruce)}` : ''}.`}
        onMouseMove={e => mover(e.clientX, e.currentTarget)}
        onTouchMove={e => e.touches[0] && mover(e.touches[0].clientX, e.currentTarget)}
        onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="jbg-gana" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="jbg-pierde" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#f87171" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#f87171" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="jbg-barrido" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FF7020" stopOpacity="0" />
            <stop offset="50%" stopColor="#FF7020" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#FF7020" stopOpacity="0" />
          </linearGradient>
          <filter id="jbg-brillo" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect className="jbg-anim" x={pl} y={pt} width="60" height={H - pt - pb} fill="url(#jbg-barrido)"
          style={{ animation: 'jbg-barre 4.5s ease-in-out infinite', transformBox: 'fill-box' }} />
        {[[pl, pt, 1, 1], [W - pr, pt, -1, 1], [pl, H - pb, 1, -1], [W - pr, H - pb, -1, -1]].map(([cx, cy, dx, dy], k) => (
          <path key={k} d={esquina(cx, cy, dx, dy)} fill="none" stroke="#E8590C" strokeWidth="1.5" opacity="0.7" />
        ))}

        <line x1={pl} x2={W - pr} y1={y0} y2={y0} stroke="#52525b" strokeWidth="1" />
        <text x={W - pr - 4} y={y0 - 5} textAnchor="end" fontSize="10" fontFamily="monospace" fill="#71717a">S/0</text>
        {sueldo > 0 && y(sueldo) > pt && <>
          <line x1={pl} x2={W - pr} y1={y(sueldo)} y2={y(sueldo)} stroke="#71717a" strokeWidth="1" strokeDasharray="3 5" opacity="0.7" />
          <text x={W - pr - 4} y={y(sueldo) - 5} textAnchor="end" fontSize="10" fontFamily="monospace" fill="#a1a1aa">SUELDO S/{sueldo.toLocaleString('es-PE')}</text>
        </>}

        {/* Áreas: roja donde pierdes (entre la línea y S/0), verde donde ganas. */}
        <polygon className="jbg-anim" style={{ animation: 'jbg-aparece 1.2s ease-out both' }}
          points={`${x(0)},${y0} ${x(0)},${y(ganancia(0))} ${x(fin)},${y(ganancia(fin))} ${x(fin)},${y0}`} fill="url(#jbg-pierde)" />
        {cruce !== null && cruce < maxN && (
          <polygon className="jbg-anim" style={{ animation: 'jbg-aparece 1.2s ease-out .3s both' }}
            points={`${x(cruce)},${y0} ${x(maxN)},${y(ganancia(maxN))} ${x(maxN)},${y0}`} fill="url(#jbg-gana)" />
        )}

        <g filter="url(#jbg-brillo)">
          <line className="jbg-anim" x1={x(0)} y1={y(ganancia(0))} x2={x(fin)} y2={y(ganancia(fin))} stroke="#f87171" strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray="1200" style={{ animation: 'jbg-dibuja 1.2s ease-out both' }} />
          {cruce !== null && cruce < maxN && (
            <line className="jbg-anim" x1={x(cruce)} y1={y0} x2={x(maxN)} y2={y(ganancia(maxN))} stroke="#34d399" strokeWidth="2.5" strokeLinecap="round"
              strokeDasharray="1200" style={{ animation: 'jbg-dibuja 1.6s ease-out .2s both' }} />
          )}
        </g>

        {marcas.map((m, i) => {
          const cx = x(m.n), cy = y(ganancia(m.n));
          const esHoy = i === 0;
          return (
            <g key={m.texto}>
              <line x1={cx} x2={cx} y1={pt} y2={H - pb} stroke={m.color} strokeWidth="1" strokeDasharray={esHoy ? '0' : '2 4'} opacity={esHoy ? 0.55 : 0.5} />
              {esHoy && (
                <circle cx={cx} cy={cy} r="6" fill="none" stroke="#FF7020" strokeWidth="1.5">
                  <animate attributeName="r" values="5;14;5" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.9;0;0.9" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={cx} cy={cy} r="4.5" fill={m.color} stroke="#09090b" strokeWidth="2" filter={esHoy ? 'url(#jbg-brillo)' : undefined} />
              <text x={cx} y={i === 1 ? H - 8 : 16} fontSize="10" fontFamily="monospace" letterSpacing="1"
                textAnchor={cx < 50 ? 'start' : cx > W - 70 ? 'end' : 'middle'} fill={esHoy ? '#FF7020' : '#a1a1aa'}>
                {m.texto} · {m.n}
              </text>
            </g>
          );
        })}

        {hover !== null && (() => {
          const cx = x(hover), cy = y(ganancia(hover)), c = ganancia(hover) >= 0 ? '#34d399' : '#f87171';
          return (
            <g>
              <line x1={cx} x2={cx} y1={pt} y2={H - pb} stroke="#e4e4e7" strokeWidth="1" opacity="0.35" />
              <line x1={pl} x2={W - pr} y1={cy} y2={cy} stroke="#e4e4e7" strokeWidth="1" opacity="0.15" />
              <circle cx={cx} cy={cy} r="5" fill={c} stroke="#09090b" strokeWidth="2" filter="url(#jbg-brillo)" />
            </g>
          );
        })()}
      </svg>
      <div className="flex justify-between font-mono text-[10px] text-zinc-600 -mt-1">
        <span>0 ALUMNOS</span><span>{maxN} ALUMNOS</span>
      </div>
    </div>
  );
}

// ── Analítica del costo de la IA ─────────────────────────────────────────
// Colores de cada parte en los gráficos (validados para que se distingan
// entre sí, también para daltónicos, sobre el fondo carbón). Fotos va en el
// naranja ají de la marca.
const COLORES_PARTES_IA = {
  'reconocer-comida': '#E8590C',
  'alimentos-pedidos': '#3987e5',
  'jarvis-chat': '#199e70',
  'whatsapp-webhook': '#c98500',
};

const PERIODOS_IA = [
  { key: 'dia', label: '30 días', ultimos: 'los últimos 30 días', dias: 30 },
  { key: 'semana', label: '12 semanas', ultimos: 'las últimas 12 semanas', dias: 84 },
  { key: 'mes', label: '6 meses', ultimos: 'los últimos 6 meses', dias: 182 },
];

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
const diaLima = d => new Date(d).toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

// Lunes de la semana de una fecha "AAAA-MM-DD".
function lunesDe(iso) {
  const d = new Date(`${iso}T12:00:00`);
  return addDaysISO(iso, -((d.getDay() + 6) % 7));
}

// Las barras del período elegido (de la más antigua a la más reciente).
function barrasDelPeriodo(periodo, hoy) {
  const fmtDia = iso => { const [, m, d] = iso.split('-').map(Number); return `${d} ${MESES_CORTOS[m - 1]}`; };
  if (periodo === 'dia') {
    return Array.from({ length: 30 }, (_, i) => {
      const iso = addDaysISO(hoy, i - 29);
      return { clave: iso, etiqueta: String(Number(iso.slice(8))), etiquetaLarga: fmtDia(iso) };
    });
  }
  if (periodo === 'semana') {
    const lunes = lunesDe(hoy);
    return Array.from({ length: 12 }, (_, i) => {
      const iso = addDaysISO(lunes, (i - 11) * 7);
      return { clave: iso, etiqueta: fmtDia(iso), etiquetaLarga: `Semana del ${fmtDia(iso)}` };
    });
  }
  const [y, m] = hoy.split('-').map(Number);
  return Array.from({ length: 6 }, (_, i) => {
    const n = y * 12 + (m - 1) + (i - 5);
    const yy = Math.floor(n / 12), mm = n % 12;
    return { clave: `${yy}-${String(mm + 1).padStart(2, '0')}`, etiqueta: MESES_CORTOS[mm], etiquetaLarga: `${MESES_CORTOS[mm]} ${yy}` };
  });
}

function claveDeBarra(periodo, dia) {
  if (periodo === 'dia') return dia;
  if (periodo === 'semana') return lunesDe(dia);
  return dia.slice(0, 7);
}

// Gráfico de línea con el mismo estilo de la "Proyección mensual": fondo
// con brillo naranja, esquinas de pantalla, línea que brilla y se dibuja al
// aparecer, área con degradado debajo y el último punto latiendo. Sin
// cuadrículas ni figuras repetidas: solo la línea del 0 y una guía punteada
// con el valor más alto. Con varias partes, una línea por parte (con
// leyenda). Al tocar o pasar el mouse se ve el dato de ese punto.
function GraficoHud({ titulo, datos, series, formato = v => v, etiquetaCada = 1, detalle = true, desdeCero = true, sumar = true }) {
  const [hover, setHover] = useState(null);
  const uid = useMemo(() => 'h' + Math.random().toString(36).slice(2, 8), []);
  const W = 600, H = 190, pl = 10, pr = 10, pt = 22, pb = 14;
  const n = datos.length;
  const valor = (d, s) => d.partes[s.key] || 0;
  const total = d => series.reduce((a, s) => a + valor(d, s), 0);
  const maxReal = Math.max(0, ...datos.flatMap(d => series.map(s => valor(d, s))));
  // Con desdeCero = false (ej. el peso) el eje empieza cerca del valor más
  // bajo, para que se note la bajada de unos kilos.
  const minReal = Math.min(...datos.flatMap(d => series.map(s => valor(d, s))));
  const yMin = desdeCero || !(minReal > 0) ? 0 : Math.max(0, minReal - Math.max(1, (maxReal - minReal) * 0.6));
  const yMax = maxReal > 0 ? (desdeCero ? maxReal * 1.18 : maxReal + Math.max(0.5, (maxReal - yMin) * 0.18)) : 1;
  const x = i => pl + (n <= 1 ? 0.5 : i / (n - 1)) * (W - pl - pr);
  const y = v => pt + (1 - (v - yMin) / (yMax - yMin)) * (H - pt - pb);
  const y0 = y(yMin);
  const unica = series.length === 1;
  const mostrado = hover !== null ? hover : n - 1;
  const d0 = datos[mostrado];
  const mover = (clientX, el) => {
    const r = el.getBoundingClientRect();
    const i = Math.round(((clientX - r.left) / r.width * W - pl) / (W - pl - pr) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };
  const esquina = (cx, cy, dx, dy) => `M${cx + dx * 14},${cy} L${cx},${cy} L${cx},${cy + dy * 14}`;
  const puntos = s => datos.map((d, i) => `${x(i)},${y(valor(d, s))}`).join(' ');
  const etiquetas = datos.map((d, i) => ({ d, i })).filter(({ i }) =>
    (i % etiquetaCada === 0 && n - 1 - i >= Math.ceil(etiquetaCada / 2)) || i === n - 1);
  return (
    <div className="relative rounded-lg p-3 overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(232,89,12,0.10), rgba(9,9,11,0.95) 70%)', border: '1px solid rgba(232,89,12,0.25)' }}>
      <style>{ESTILOS_GRAFICO_HUD}</style>
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="font-mono text-[10px] tracking-[0.2em] text-orange-400/80 pt-0.5">◉ {titulo}</span>
        {d0 && (
          <span className="font-mono text-xs text-zinc-400 text-right">
            {d0.etiquetaLarga}{sumar && <> → <span className="text-orange-400 font-semibold">{formato(total(d0))}</span></>}
          </span>
        )}
      </div>
      {!unica && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-1">
          {series.map(s => (
            <span key={s.key} className="font-mono text-[10px] text-zinc-400 inline-flex items-center gap-1.5">
              <span className="inline-block w-3 h-[3px] rounded-full" style={{ background: s.color, boxShadow: `0 0 5px ${s.color}` }} />{s.label}
            </span>
          ))}
        </div>
      )}
      {detalle && !unica && d0 && (
        <div className="font-mono text-[10px] text-zinc-500 mb-1 min-h-[1.25rem]">
          {(sumar ? series.filter(s => valor(d0, s)) : series).map(s => `${s.label} ${formato(valor(d0, s))}`).join(' · ') || 'sin uso'}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full touch-none select-none" role="img"
        aria-label={`${titulo}: ${datos.map(d => `${d.etiquetaLarga} ${formato(total(d))}`).join(', ')}`}
        onMouseMove={e => mover(e.clientX, e.currentTarget)}
        onTouchStart={e => e.touches[0] && mover(e.touches[0].clientX, e.currentTarget)}
        onTouchMove={e => e.touches[0] && mover(e.touches[0].clientX, e.currentTarget)}
        onMouseLeave={() => setHover(null)}>
        <defs>
          {series.map(s => (
            <linearGradient key={s.key} id={`${uid}-a-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={unica ? 0.45 : 0.12} />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
          <linearGradient id={`${uid}-barrido`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FF7020" stopOpacity="0" />
            <stop offset="50%" stopColor="#FF7020" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#FF7020" stopOpacity="0" />
          </linearGradient>
          <filter id={`${uid}-brillo`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect className="jbg-anim" x={pl} y={pt} width="60" height={H - pt - pb} fill={`url(#${uid}-barrido)`}
          style={{ animation: 'jbg-barre 4.5s ease-in-out infinite', transformBox: 'fill-box' }} />
        {[[pl, pt, 1, 1], [W - pr, pt, -1, 1], [pl, H - pb, 1, -1], [W - pr, H - pb, -1, -1]].map(([cx, cy, dx, dy], k) => (
          <path key={k} d={esquina(cx, cy, dx, dy)} fill="none" stroke="#E8590C" strokeWidth="1.5" opacity="0.7" />
        ))}

        <line x1={pl} x2={W - pr} y1={y0} y2={y0} stroke="#52525b" strokeWidth="1" />
        {maxReal > 0 && <>
          <line x1={pl} x2={W - pr} y1={y(maxReal)} y2={y(maxReal)} stroke="#71717a" strokeWidth="1" strokeDasharray="3 5" opacity="0.7" />
          <text x={W - pr - 4} y={y(maxReal) - 5} textAnchor="end" fontSize="11" fontFamily="monospace" fill="#a1a1aa">MÁX {formato(maxReal)}</text>
        </>}

        {series.map((s, k) => (
          <polygon key={s.key} className="jbg-anim" style={{ animation: `jbg-aparece 1.2s ease-out ${k * 0.15}s both` }}
            points={`${x(0)},${y0} ${puntos(s)} ${x(n - 1)},${y0}`} fill={`url(#${uid}-a-${s.key})`} />
        ))}
        <g filter={`url(#${uid}-brillo)`}>
          {series.map((s, k) => (
            <polyline key={s.key} className="jbg-anim" points={puntos(s)} fill="none" stroke={s.color} strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" pathLength="1200" strokeDasharray="1200"
              style={{ animation: `jbg-dibuja 1.4s ease-out ${k * 0.15}s both` }} />
          ))}
        </g>

        {hover === null && n > 0 && series.map(s => {
          const cx = x(n - 1), cy = y(valor(datos[n - 1], s));
          return (
            <g key={s.key}>
              {unica && (
                <circle cx={cx} cy={cy} r="6" fill="none" stroke={s.color} strokeWidth="1.5">
                  <animate attributeName="r" values="5;14;5" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.9;0;0.9" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={cx} cy={cy} r="4.5" fill={s.color} stroke="#09090b" strokeWidth="2" filter={`url(#${uid}-brillo)`} />
            </g>
          );
        })}

        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pt} y2={H - pb} stroke="#e4e4e7" strokeWidth="1" opacity="0.35" />
            {series.map(s => (
              <circle key={s.key} cx={x(hover)} cy={y(valor(datos[hover], s))} r="5" fill={s.color} stroke="#09090b" strokeWidth="2" filter={`url(#${uid}-brillo)`} />
            ))}
          </g>
        )}
      </svg>
      <div className="relative h-4 font-mono text-[10px] text-zinc-500">
        {etiquetas.map(({ d, i }) => (
          <span key={d.clave} className="absolute whitespace-nowrap"
            style={i === n - 1 ? { right: 0 } : i === 0 ? { left: 0 } : { left: `${(x(i) / W) * 100}%`, transform: 'translateX(-50%)' }}>
            {d.etiqueta}
          </span>
        ))}
      </div>
    </div>
  );
}

// Gráficos del costo de la IA: cuánto se gasta, cuántas veces se usa y
// cuánto sale cada uso, por día, semana o mes, por parte de la app. Con
// comparación contra el período anterior y botón para descargar en Excel.
function AnaliticaIAPanel({ tipoCambio }) {
  const [filas, setFilas] = useState(null);
  const [periodo, setPeriodo] = useState('dia');
  const [parte, setParte] = useState('todas');
  const [verTabla, setVerTabla] = useState(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      // Un año de datos (para comparar 6 meses con los 6 anteriores), de a
      // 1000 filas, que es lo máximo que entrega la base por pedido.
      const desde = new Date(Date.now() - 366 * 864e5).toISOString();
      const todas = [];
      for (let i = 0; ; i += 1000) {
        const { data, error } = await supabase.from('ia_uso')
          .select('funcion, modelo, tokens_entrada, tokens_salida, tokens_cache_lectura, tokens_cache_escritura, creado_en')
          .gte('creado_en', desde).order('creado_en').range(i, i + 999);
        if (error) throw error;
        todas.push(...(data || []));
        if (!data || data.length < 1000) break;
      }
      if (!cancelado) setFilas(todas.filter(f => COLORES_PARTES_IA[f.funcion]).map(f => ({ ...f, usd: costoUsdIA(f), dia: diaLima(f.creado_en) })));
    })().catch(() => { if (!cancelado) setFilas([]); });
    return () => { cancelado = true; };
  }, []);

  const tarjeta = 'bg-zinc-950 border border-zinc-800 rounded-lg p-3';
  const soles = usd => usd * tipoCambio;
  const fmtSoles = v => `S/${v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(2) : v.toFixed(3)}`;
  const series = PARTES_IA.map(p => ({ key: p.funcion, label: p.label, color: COLORES_PARTES_IA[p.funcion] }));
  const parteSel = PARTES_IA.find(p => p.funcion === parte);
  const filasParte = (filas || []).filter(f => parte === 'todas' || f.funcion === parte);

  const hoy = todayISO();
  const conf = PERIODOS_IA.find(p => p.key === periodo);
  const barras = barrasDelPeriodo(periodo, hoy).map(b => ({ ...b, partes: {}, usos: 0, usd: 0 }));
  const porClave = Object.fromEntries(barras.map(b => [b.clave, b]));
  filasParte.forEach(f => {
    const b = porClave[claveDeBarra(periodo, f.dia)];
    if (!b) return;
    b.partes[f.funcion] = (b.partes[f.funcion] || 0) + soles(f.usd);
    b.usos++; b.usd += f.usd;
  });
  const etiquetaCada = periodo === 'dia' ? 5 : periodo === 'semana' ? 3 : 1;
  // Los gráficos empiezan donde hay datos: antes la IA no se medía, y una
  // línea en 0 haría pensar que no costó nada. El costo por uso solo se
  // dibuja donde hubo usos.
  const primera = barras.findIndex(b => b.usos > 0);
  const barrasG = primera < 0 ? barras : barras.slice(Math.min(primera, barras.length - 2));
  const barrasConUso = barrasG.filter(b => b.usos > 0);

  // Ventanas móviles del mismo largo: los últimos N días contra los N anteriores.
  const corte = Date.now() - conf.dias * 864e5, corteAntes = corte - conf.dias * 864e5;
  const ahora = filasParte.filter(f => new Date(f.creado_en).getTime() >= corte);
  const antes = filasParte.filter(f => { const t = new Date(f.creado_en).getTime(); return t >= corteAntes && t < corte; });
  const sumaS = l => soles(l.reduce((a, f) => a + f.usd, 0));
  const gasto = sumaS(ahora), gastoAntes = sumaS(antes);
  const porUso = ahora.length ? gasto / ahora.length : null;
  const porUsoAntes = antes.length ? gastoAntes / antes.length : null;
  const cambio = (a, b) => (a !== null && b ? Math.round((a / b - 1) * 100) : null);
  const flecha = c => c === null ? <span className="text-zinc-500">sin datos para comparar</span>
    : c <= -5 ? <span className="text-emerald-400">▼ {Math.abs(c)}% vs período anterior</span>
    : c >= 5 ? <span className="text-orange-400">▲ {c}% vs período anterior</span>
    : <span className="text-zinc-400">igual que el período anterior</span>;
  const nombreUso = parteSel ? parteSel.uso : 'uso';
  const desdeMedicion = filas && filas.length ? filas[0].dia : null;

  function exportar() {
    // Una fila por día y parte, con todo lo medido.
    const grupos = {};
    (filas || []).forEach(f => {
      const k = `${f.dia}|${f.funcion}`;
      const g = grupos[k] || (grupos[k] = { fecha: f.dia, parte: PARTES_IA.find(p => p.funcion === f.funcion).label, usos: 0, usd: 0, tokens_entrada: 0, tokens_salida: 0 });
      g.usos++; g.usd += f.usd;
      g.tokens_entrada += Number(f.tokens_entrada) || 0; g.tokens_salida += Number(f.tokens_salida) || 0;
    });
    const encabezado = ['fecha', 'parte', 'usos', 'gasto_soles', 'gasto_dolares', 'costo_por_uso_soles', 'tokens_entrada', 'tokens_salida'];
    const lineas = Object.values(grupos).sort((a, b) => a.fecha.localeCompare(b.fecha) || a.parte.localeCompare(b.parte)).map(g => [
      g.fecha, g.parte, g.usos, soles(g.usd).toFixed(4), g.usd.toFixed(4), (soles(g.usd) / g.usos).toFixed(4), g.tokens_entrada, g.tokens_salida,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const blob = new Blob(['﻿' + [encabezado.join(','), ...lineas].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `costo_ia_jonahbeast_${hoy}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const chip = (activa, onClick, texto, key) => (
    <button key={key} type="button" onClick={onClick}
      className={`jb-body text-[11px] px-2.5 py-1 rounded-full border transition-colors ${activa ? 'bg-orange-500 border-orange-500 text-zinc-950 font-semibold' : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'}`}>
      {texto}
    </button>
  );

  return (
    <div className={`${tarjeta} flex flex-col gap-3`}>
      <div className="flex justify-between items-start gap-2">
        <div>
          <h3 className="jb-display text-sm text-zinc-300">📊 ANALÍTICA DE LA IA</h3>
          <p className="jb-body text-[11px] text-zinc-500 mt-0.5">
            Gasto, usos y costo por uso de cada parte de la app.{desdeMedicion ? ` Se mide desde el ${desdeMedicion.split('-').reverse().join('/')}.` : ''}
          </p>
        </div>
        <button type="button" onClick={exportar} disabled={!filas || !filas.length}
          className="jb-body text-[11px] px-2.5 py-1 rounded-lg border border-zinc-700 text-zinc-200 hover:border-orange-500 disabled:opacity-40 shrink-0">
          ⬇ Exportar a Excel
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap gap-1.5">{PERIODOS_IA.map(p => chip(periodo === p.key, () => setPeriodo(p.key), p.label, p.key))}</div>
        <div className="flex flex-wrap gap-1.5">
          {chip(parte === 'todas', () => setParte('todas'), 'Todas', 'todas')}
          {PARTES_IA.map(p => chip(parte === p.funcion, () => setParte(p.funcion), p.label, p.funcion))}
        </div>
      </div>

      {!filas ? <Loader2 size={14} className="animate-spin text-orange-500" /> : !filas.length ? (
        <p className="jb-body text-xs text-zinc-500">Todavía no hay usos de la IA anotados.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: fmtSoles(gasto), l: `Gasto en ${conf.ultimos}`, c: flecha(cambio(gasto, gastoAntes)) },
              { v: String(ahora.length), l: `Usos (${parteSel ? `cada ${nombreUso}` : 'fotos, pedidos, consultas y respuestas'})`, c: flecha(cambio(ahora.length, antes.length)) },
              { v: porUso === null ? '—' : `S/${porUso.toFixed(3)}`, l: `Costo de cada ${nombreUso}`, c: flecha(cambio(porUso, porUsoAntes)) },
            ].map(t => (
              <div key={t.l} className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 min-w-0">
                <div className="jb-display text-lg text-orange-400">{t.v}</div>
                <div className="jb-body text-[11px] text-zinc-300 leading-tight mt-0.5">{t.l}</div>
                <div className="jb-body text-[10px] leading-tight mt-0.5">{t.c}</div>
              </div>
            ))}
          </div>
          <p className="jb-body text-[10px] text-zinc-500 -mt-1">
            En "Costo de cada uso", ▼ verde es bueno: la IA te sale más barata. En gasto y usos, subir puede ser bueno si es porque hay más alumnos usando la app.
          </p>

          <GraficoHud titulo="GASTO EN SOLES" datos={barrasG}
            series={parte === 'todas' ? series : series.filter(x => x.key === parte).map(x => ({ ...x, color: '#FF7020' }))}
            formato={fmtSoles} etiquetaCada={etiquetaCada} />

          <GraficoHud titulo="USOS DE LA IA" detalle={false}
            datos={barrasG.map(b => ({ ...b, partes: { usos: b.usos } }))} series={[{ key: 'usos', label: 'Usos', color: '#FF7020' }]}
            formato={v => `${v} ${v === 1 ? 'uso' : 'usos'}`} etiquetaCada={etiquetaCada} />

          <GraficoHud titulo={`COSTO POR ${nombreUso.toUpperCase()}${parteSel ? '' : ' · PROMEDIO'}`} detalle={false}
            datos={(barrasConUso.length >= 2 ? barrasConUso : barrasG).map(b => ({ ...b, partes: { porUso: b.usos ? soles(b.usd) / b.usos : 0 } }))} series={[{ key: 'porUso', label: 'Por uso', color: '#FF7020' }]}
            formato={v => `S/${v.toFixed(3)}`} etiquetaCada={etiquetaCada} />

          <button type="button" onClick={() => setVerTabla(v => !v)} className="jb-body text-[11px] text-zinc-400 underline self-start">
            {verTabla ? 'Ocultar tabla' : 'Ver los números en tabla'}
          </button>
          {verTabla && (
            <div className="overflow-x-auto">
              <table className="w-full jb-body text-xs">
                <thead>
                  <tr className="text-zinc-500 text-[11px]">
                    <th className="text-left font-normal py-1 pr-2">{periodo === 'dia' ? 'Día' : periodo === 'semana' ? 'Semana' : 'Mes'}</th>
                    <th className="text-right font-normal py-1 px-2">Gasto</th>
                    <th className="text-right font-normal py-1 px-2">Usos</th>
                    <th className="text-right font-normal py-1 pl-2">Por uso</th>
                  </tr>
                </thead>
                <tbody>
                  {[...barras].reverse().filter(b => b.usos).map(b => (
                    <tr key={b.clave} className="border-t border-zinc-800 text-zinc-200">
                      <td className="py-1 pr-2">{b.etiquetaLarga}</td>
                      <td className="text-right py-1 px-2 tabular-nums">{fmtSoles(soles(b.usd))}</td>
                      <td className="text-right py-1 px-2 tabular-nums">{b.usos}</td>
                      <td className="text-right py-1 pl-2 tabular-nums">S/{(soles(b.usd) / b.usos).toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* 📣 ¿CUÁNTO TE CUESTA CADA ALUMNO? Junta lo que Jonah anota en Finanzas
   como publicidad y marketing (de la app) con lo que trajo ese mes:
   registros, cuántos empezaron (anotaron al menos una comida) y cuántos
   pagaron por primera vez. Así sale el costo por registro, por alumno que
   empezó y por alumno que pagó, comparado con el mes anterior, y de qué
   canal llegó cada registro (el ?utm_source= del link). */
const NOMBRE_FUENTE = {
  meta_propio: 'Tus anuncios de Meta', meta: 'Meta', agencia: 'Agencia',
  fb: 'Facebook', facebook: 'Facebook', ig: 'Instagram', instagram: 'Instagram', instagram_app: 'Instagram', ig_bio: 'Bio de Instagram',
  tiktok: 'TikTok', tiktok_bio: 'Bio de TikTok', directo: 'Directo / sin marca', sin_dato: 'Sin dato (antes de medirlo)',
};
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];

function CostoPorAlumnoPanel({ valorAlumno = null, explicacionValor = '' }) {
  const [datos, setDatos] = useState(null);
  const hoy = todayISO();
  const mesesLista = useMemo(() => {
    const [y, m] = hoy.split('-').map(Number);
    return [0, 1, 2].map(k => { const n = y * 12 + (m - 1) - k; return `${Math.floor(n / 12)}-${String(n % 12 + 1).padStart(2, '0')}`; });
  }, [hoy]);
  const [mesSel, setMesSel] = useState(mesesLista[0]);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const desde = `${mesesLista[2].slice(0, 7)}-01`;
      const desdeAnterior = (() => { const [y, m] = desde.split('-').map(Number); const n = y * 12 + (m - 1) - 1; return `${Math.floor(n / 12)}-${String(n % 12 + 1).padStart(2, '0')}-01`; })();
      const [{ data: gastos }, { data: alumnos }, { data: pagos }, { data: regs }] = await Promise.all([
        traerTodas(() => supabase.from('movimientos_financieros').select('fecha, monto, categoria').eq('tipo', 'gasto').eq('negocio', 'app')
          .in('categoria', ['publicidad', 'marketing']).gte('fecha', desdeAnterior)),
        traerTodas(() => supabase.from('alumnos').select('username, created_at').gte('created_at', desdeAnterior), 'username'),
        traerTodas(() => supabase.from('pagos').select('username, monto, metodo, creado_en').eq('estado', 'aprobado').gt('monto', 0)),
        traerTodas(() => supabase.from('embudo_landing_eventos').select('username, fuente, evento, detalle').in('evento', ['registro', 'campana']).gte('creado_en', desdeAnterior)),
      ]);
      const nuevos = (alumnos || []).filter(a => !esCuentaPropia(a.username)).map(a => a.username);
      const { data: hist } = nuevos.length
        ? await traerTodas(() => supabase.from('historial').select('username').in('username', nuevos).gt('comidas_count', 0))
        : { data: [] };
      if (cancelado) return;
      setDatos({ gastos: gastos || [], alumnos: (alumnos || []).filter(a => !esCuentaPropia(a.username)), pagos: (pagos || []).filter(p => !esCuentaPropia(p.username) && !/add-on/i.test(p.metodo || '')), regs: regs || [], empezaron: new Set((hist || []).map(h => h.username)) });
    })().catch(() => { if (!cancelado) setDatos({ gastos: [], alumnos: [], pagos: [], regs: [], empezaron: new Set() }); });
    return () => { cancelado = true; };
  }, []);

  if (!datos) return null;
  const mesDe = iso => String(iso || '').slice(0, 7);
  // Primer pago con dinero real de cada alumno (así "pagaron" = alumnos nuevos que pagaron ese mes).
  const primerPago = {};
  datos.pagos.forEach(p => { const f = mesDe(p.creado_en); if (!primerPago[p.username] || f < primerPago[p.username]) primerPago[p.username] = f; });
  const fuenteDe = Object.fromEntries(datos.regs.filter(r => r.username && r.evento === 'registro').map(r => [r.username, r.fuente || 'directo']));
  // Campaña de Meta de cada registro (solo los que llegaron con el link marcado).
  const campanaDe = Object.fromEntries(datos.regs.filter(r => r.username && r.evento === 'campana' && r.detalle).map(r => [r.username, r.detalle.split(' · ')[0]]));
  const resumen = ym => {
    const inversion = datos.gastos.filter(g => mesDe(g.fecha) === ym).reduce((a, g) => a + (Number(g.monto) || 0), 0);
    const registrados = datos.alumnos.filter(a => mesDe(a.created_at) === ym);
    const empezaron = registrados.filter(a => datos.empezaron.has(a.username)).length;
    const pagaron = Object.values(primerPago).filter(f => f === ym).length;
    const porFuente = {}, porCampana = {};
    registrados.forEach(a => {
      const c = campanaDe[a.username];
      if (c) {
        const gc = porCampana[c] || (porCampana[c] = { registros: 0, empezaron: 0, pagaron: 0 });
        gc.registros++;
        if (datos.empezaron.has(a.username)) gc.empezaron++;
        if (primerPago[a.username]) gc.pagaron++;
      }
      const f = fuenteDe[a.username] || 'sin_dato';
      const g = porFuente[f] || (porFuente[f] = { registros: 0, empezaron: 0, pagaron: 0 });
      g.registros++;
      if (datos.empezaron.has(a.username)) g.empezaron++;
      if (primerPago[a.username]) g.pagaron++;
    });
    const costo = n => (inversion > 0 && n > 0 ? inversion / n : null);
    return { inversion, registros: registrados.length, empezaron, pagaron, porRegistro: costo(registrados.length), porEmpezo: costo(empezaron), porPago: costo(pagaron), porFuente, porCampana };
  };
  const anteriorDe = ym => { const [y, m] = ym.split('-').map(Number); const n = y * 12 + (m - 1) - 1; return `${Math.floor(n / 12)}-${String(n % 12 + 1).padStart(2, '0')}`; };
  const r = resumen(mesSel);
  const ra = resumen(anteriorDe(mesSel));
  const nombreMes = ym => MESES_LARGOS[Number(ym.slice(5, 7)) - 1];
  const esMesActual = mesSel === mesesLista[0];
  const comparar = (a, b) => {
    if (a === null || b === null || !b) return null;
    const c = Math.round((a / b - 1) * 100);
    return c <= -5 ? <span className="text-emerald-400">▼ {Math.abs(c)}% vs {nombreMes(anteriorDe(mesSel))}</span>
      : c >= 5 ? <span className="text-orange-400">▲ {c}% vs {nombreMes(anteriorDe(mesSel))}</span>
      : <span className="text-zinc-400">igual que {nombreMes(anteriorDe(mesSel))}</span>;
  };
  const tarjetas = [
    { v: r.porRegistro, l: 'Cada registro', sub: `${r.registros} ${r.registros === 1 ? 'cuenta nueva' : 'cuentas nuevas'}`, c: comparar(r.porRegistro, ra.porRegistro) },
    { v: r.porEmpezo, l: 'Cada alumno que empezó', sub: `${r.empezaron} anotaron su primera comida`, c: comparar(r.porEmpezo, ra.porEmpezo) },
    { v: r.porPago, l: 'Cada alumno que pagó', sub: `${r.pagaron} ${r.pagaron === 1 ? 'pagó' : 'pagaron'} por primera vez`, c: comparar(r.porPago, ra.porPago) },
  ];
  const fuentes = Object.entries(r.porFuente).sort((a, b) => b[1].registros - a[1].registros);
  const campanas = Object.entries(r.porCampana).sort((a, b) => b[1].registros - a[1].registros);
  const chip = (activa, onClick, texto) => (
    <button type="button" onClick={onClick}
      className={`jb-body text-[11px] px-2.5 py-1 rounded-full border transition-colors ${activa ? 'bg-orange-500 border-orange-500 text-zinc-950 font-semibold' : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'}`}>
      {texto}
    </button>
  );
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex flex-col gap-3">
      <div>
        <h3 className="jb-display text-sm text-zinc-300">📣 ¿CUÁNTO TE CUESTA CADA ALUMNO?</h3>
        <p className="jb-body text-[11px] text-zinc-500 mt-0.5">Lo que anotaste en Finanzas como publicidad y marketing, dividido entre lo que trajo ese mes. Mientras más bajo, mejor.</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {mesesLista.map((ym, k) => chip(mesSel === ym, () => setMesSel(ym), k === 0 ? `${nombreMes(ym)} (en curso)` : nombreMes(ym)))}
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex items-baseline justify-between gap-2">
        <span className="jb-body text-xs text-zinc-400">Invertiste en {nombreMes(mesSel)}</span>
        <span className="jb-display text-xl text-orange-400">{fmtS(r.inversion)}</span>
      </div>
      {r.inversion === 0 ? (
        <p className="jb-body text-xs text-zinc-400">
          {esMesActual ? 'Este mes todavía no anotaste gastos de publicidad.' : `En ${nombreMes(mesSel)} no anotaste gastos de publicidad.`} Anótalos en <b>Finanzas</b> con la categoría <b>📣 Publicidad</b> (lo que pagas en Meta, TikTok o a la agencia) y aquí verás cuánto te cuesta cada alumno.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {tarjetas.map(t => (
            <div key={t.l} className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 min-w-0">
              <div className="jb-display text-lg text-orange-400">{t.v === null ? '—' : fmtS(t.v)}</div>
              <div className="jb-body text-[11px] text-zinc-300 leading-tight mt-0.5">{t.l}</div>
              <div className="jb-body text-[10px] text-zinc-500 leading-tight mt-0.5">{t.sub}</div>
              {t.c && <div className="jb-body text-[10px] leading-tight mt-0.5">{t.c}</div>}
            </div>
          ))}
        </div>
      )}
      {r.porPago !== null && valorAlumno > 0 && (() => {
        const rinde = r.porPago <= valorAlumno;
        return (
          <div className={`rounded-lg p-3 border ${rinde ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-red-500/10 border-red-500/40'}`}>
            <p className="jb-body text-xs text-zinc-300">
              Cada alumno que paga te deja unos <span className="text-zinc-50 font-semibold">{fmtS(valorAlumno)}</span> en el tiempo que se queda ({explicacionValor}).{' '}
              <span className={`font-semibold ${rinde ? 'text-emerald-400' : 'text-red-400'}`}>
                {rinde ? 'La publicidad te devuelve más de lo que cuesta. ✓' : 'Hoy la publicidad te cuesta más de lo que te devuelve.'}
              </span>
            </p>
          </div>
        );
      })()}
      {esMesActual && r.inversion > 0 && (
        <p className="jb-body text-[10px] text-zinc-500 -mt-1">El mes está en curso: los registros de estos días todavía pueden pagar más adelante.</p>
      )}
      {fuentes.length > 0 && (
        <div>
          <div className="jb-body text-xs text-zinc-400 mb-1">De dónde llegaron los registros de {nombreMes(mesSel)}</div>
          <div className="overflow-x-auto">
            <table className="w-full jb-body text-xs">
              <thead>
                <tr className="text-zinc-500 text-[11px]">
                  <th className="text-left font-normal py-1 pr-2">Canal</th>
                  <th className="text-right font-normal py-1 px-2">Registros</th>
                  <th className="text-right font-normal py-1 px-2">Empezaron</th>
                  <th className="text-right font-normal py-1 pl-2">Pagaron</th>
                </tr>
              </thead>
              <tbody>
                {fuentes.map(([f, g]) => (
                  <tr key={f} className="border-t border-zinc-800 text-zinc-200">
                    <td className="py-1 pr-2">{NOMBRE_FUENTE[f] || f}</td>
                    <td className="text-right py-1 px-2 tabular-nums">{g.registros}</td>
                    <td className="text-right py-1 px-2 tabular-nums">{g.empezaron}</td>
                    <td className="text-right py-1 pl-2 tabular-nums">{g.pagaron}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="jb-body text-[10px] text-zinc-500 mt-1">El canal sale de la marca del link (?utm_source=). Los que entraron sin marca quedan como "Directo".</p>
        </div>
      )}
      {campanas.length > 0 && (
        <div>
          <div className="jb-body text-xs text-zinc-400 mb-1">Qué campaña de Meta los trajo</div>
          <div className="overflow-x-auto">
            <table className="w-full jb-body text-xs">
              <thead>
                <tr className="text-zinc-500 text-[11px]">
                  <th className="text-left font-normal py-1 pr-2">Campaña</th>
                  <th className="text-right font-normal py-1 px-2">Registros</th>
                  <th className="text-right font-normal py-1 px-2">Empezaron</th>
                  <th className="text-right font-normal py-1 pl-2">Pagaron</th>
                </tr>
              </thead>
              <tbody>
                {campanas.map(([c, g]) => (
                  <tr key={c} className="border-t border-zinc-800 text-zinc-200">
                    <td className="py-1 pr-2">{c}</td>
                    <td className="text-right py-1 px-2 tabular-nums">{g.registros}</td>
                    <td className="text-right py-1 px-2 tabular-nums">{g.empezaron}</td>
                    <td className="text-right py-1 pl-2 tabular-nums">{g.pagaron}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="jb-body text-[10px] text-zinc-500 mt-1">Sale del nombre de la campaña que Meta pone en el link del anuncio. Cuánto gastó cada campaña lo ves en Meta o preguntándole a Jarvis.</p>
        </div>
      )}
    </div>
  );
}

/* 📈 CONVERSIÓN POR SEMANA: de los que se registraron cada semana, qué
   porcentaje empezó a usar la app (anotó al menos una comida) y qué
   porcentaje terminó pagando. Sirve para ver si las mejoras de la app y
   los anuncios suben la conversión con el tiempo. */
const SERIES_CONVERSION = [
  { key: 'empezaron', label: '% que empezó', color: '#3987e5' },
  { key: 'pagaron', label: '% que pagó', color: '#E8590C' },
];

function ConversionSemanalPanel() {
  const [datos, setDatos] = useState(null);
  const hoy = todayISO();
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const lunesHoy = lunesDe(hoy);
      const desde = addDaysISO(lunesHoy, -7 * 11);
      const [{ data: alumnos }, { data: pagos }] = await Promise.all([
        traerTodas(() => supabase.from('alumnos').select('username, created_at').gte('created_at', desde), 'username'),
        traerTodas(() => supabase.from('pagos').select('username, monto, metodo').eq('estado', 'aprobado').gt('monto', 0)),
      ]);
      const nuevos = (alumnos || []).filter(a => !esCuentaPropia(a.username));
      const { data: hist } = nuevos.length
        ? await traerTodas(() => supabase.from('historial').select('username').in('username', nuevos.map(a => a.username)).gt('comidas_count', 0))
        : { data: [] };
      if (cancelado) return;
      const empezo = new Set((hist || []).map(h => h.username));
      const pago = new Set((pagos || []).filter(p => !/add-on/i.test(p.metodo || '')).map(p => p.username));
      const semanas = Array.from({ length: 12 }, (_, i) => {
        const lunes = addDaysISO(lunesHoy, -7 * (11 - i));
        const [, m, d] = lunes.split('-').map(Number);
        return { clave: lunes, etiqueta: `${d} ${MESES_CORTOS[m - 1]}`, etiquetaLarga: `Semana del ${d} ${MESES_CORTOS[m - 1]}`, registros: 0, empezaron: 0, pagaron: 0 };
      });
      const porLunes = Object.fromEntries(semanas.map(s => [s.clave, s]));
      nuevos.forEach(a => {
        const s = porLunes[lunesDe(diaLima(a.created_at))];
        if (!s) return;
        s.registros++;
        if (empezo.has(a.username)) s.empezaron++;
        if (pago.has(a.username)) s.pagaron++;
      });
      setDatos(semanas);
    })().catch(() => { if (!cancelado) setDatos([]); });
    return () => { cancelado = true; };
  }, []);

  if (!datos) return null;
  const primera = datos.findIndex(s => s.registros > 0);
  if (primera < 0) return null;
  const visibles = datos.slice(Math.min(primera, datos.length - 2));
  const pct = (n, t) => (t ? Math.round((n / t) * 100) : 0);
  const puntos = visibles.map(s => ({ ...s, partes: { empezaron: pct(s.empezaron, s.registros), pagaron: pct(s.pagaron, s.registros) } }));
  const tot = visibles.reduce((a, s) => ({ r: a.r + s.registros, e: a.e + s.empezaron, p: a.p + s.pagaron }), { r: 0, e: 0, p: 0 });
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex flex-col gap-3">
      <div>
        <h3 className="jb-display text-sm text-zinc-300">📈 CONVERSIÓN POR SEMANA</h3>
        <p className="jb-body text-[11px] text-zinc-500 mt-0.5">De los que se registraron cada semana: qué porcentaje empezó a usar la app (anotó al menos una comida) y qué porcentaje terminó pagando.</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { v: String(tot.r), l: 'se registraron' },
          { v: `${pct(tot.e, tot.r)}%`, l: `empezaron (${tot.e})` },
          { v: `${pct(tot.p, tot.r)}%`, l: `pagaron (${tot.p})` },
        ].map(t => (
          <div key={t.l} className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 min-w-0">
            <div className="jb-display text-lg text-orange-400">{t.v}</div>
            <div className="jb-body text-[10px] text-zinc-500 leading-tight mt-0.5">{t.l}</div>
          </div>
        ))}
      </div>
      <GraficoHud titulo="CONVERSIÓN POR SEMANA DE REGISTRO" datos={puntos} series={SERIES_CONVERSION}
        formato={v => `${Math.round(v)}%`} sumar={false} etiquetaCada={Math.max(1, Math.ceil(puntos.length / 4))} />
      <div className="overflow-x-auto">
        <table className="w-full jb-body text-xs">
          <thead>
            <tr className="text-zinc-500 text-[11px]">
              <th className="text-left font-normal py-1 pr-2">Semana</th>
              <th className="text-right font-normal py-1 px-2">Registros</th>
              <th className="text-right font-normal py-1 px-2">Empezaron</th>
              <th className="text-right font-normal py-1 pl-2">Pagaron</th>
            </tr>
          </thead>
          <tbody>
            {[...visibles].reverse().map(s => (
              <tr key={s.clave} className="border-t border-zinc-800 text-zinc-200">
                <td className="py-1 pr-2">{s.etiquetaLarga}</td>
                <td className="text-right py-1 px-2 tabular-nums">{s.registros}</td>
                <td className="text-right py-1 px-2 tabular-nums">{s.empezaron} <span className="text-zinc-500">({pct(s.empezaron, s.registros)}%)</span></td>
                <td className="text-right py-1 pl-2 tabular-nums">{s.pagaron} <span className="text-zinc-500">({pct(s.pagaron, s.registros)}%)</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="jb-body text-[10px] text-zinc-500 -mt-1">Las semanas más recientes todavía pueden subir: su prueba de Premium no ha terminado.</p>
    </div>
  );
}

/* 🙋 QUÉ SE LES HACE DIFÍCIL: respuestas de la pregunta que la app les hace
   una vez a los alumnos de 40 años o más (form.encuestaFacilidad), y
   cuántos usan el Modo fácil (letra grande e Inicio sencillo). */
const TEXTO_DIFICIL = {
  registrar: 'Registrar sus comidas', foto: 'La foto de la comida', numeros: 'Entender los números',
  botones: 'Encontrar los botones', letra: 'La letra es pequeña', nada: 'Nada, todo bien',
};

function EncuestaFacilidadPanel({ users }) {
  const [filas, setFilas] = useState(null);
  useEffect(() => {
    let cancelado = false;
    traerTodas(() => supabase.from('datos_alumnos').select('username, form'), 'username')
      .then(({ data }) => { if (!cancelado) setFilas((data || []).filter(d => !esCuentaPropia(d.username))); })
      .catch(() => { if (!cancelado) setFilas([]); });
    return () => { cancelado = true; };
  }, []);
  if (!filas) return null;
  const edad = f => Number(String(f?.edad ?? '').replace(/[^0-9]/g, '')) || 0;
  const mayores = filas.filter(d => edad(d.form) >= 40);
  const conModo = filas.filter(d => d.form?.modoFacil === true).length;
  const rechazaron = mayores.filter(d => d.form?.modoFacil === false).length;
  const respuestas = filas.filter(d => d.form?.encuestaFacilidad)
    .map(d => ({ ...d.form.encuestaFacilidad, username: d.username, edad: edad(d.form) }))
    .sort((a, b) => String(b.en).localeCompare(String(a.en)));
  const conteo = {};
  respuestas.forEach(r => (r.respuestas || []).forEach(id => { conteo[id] = (conteo[id] || 0) + 1; }));
  const ranking = Object.entries(conteo).sort((a, b) => b[1] - a[1]);
  const nombreDe = un => (users || []).find(u => u.username === un)?.nombre || un;
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3">
      <div>
        <h2 className="jb-display text-base text-zinc-200">🙋 QUÉ SE LES HACE DIFÍCIL (40 AÑOS O MÁS)</h2>
        <p className="jb-body text-[11px] text-zinc-500 mt-0.5">La app les pregunta una vez qué se les hace difícil, y les ofrece el Modo fácil (letra grande e Inicio con 3 botones).</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { v: mayores.length, l: 'alumnos de 40 o más' },
          { v: conModo, l: `usan el Modo fácil${rechazaron ? ` · ${rechazaron} no quisieron` : ''}` },
          { v: respuestas.length, l: respuestas.length === 1 ? 'respondió la pregunta' : 'respondieron la pregunta' },
        ].map(t => (
          <div key={t.l} className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 min-w-0">
            <div className="jb-display text-lg text-orange-400">{t.v}</div>
            <div className="jb-body text-[10px] text-zinc-500 leading-tight mt-0.5">{t.l}</div>
          </div>
        ))}
      </div>
      {!respuestas.length ? (
        <p className="jb-body text-xs text-zinc-500">Todavía nadie respondió. La pregunta les aparece en Inicio desde su segundo día con la app.</p>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            {ranking.map(([id, n]) => (
              <div key={id} className="flex items-center gap-2">
                <span className="jb-body text-[11px] text-zinc-300 w-40 shrink-0 truncate">{TEXTO_DIFICIL[id] || id}</span>
                <BarraBrillo pct={(n / respuestas.length) * 100} />
                <span className="font-mono text-[11px] text-zinc-200 w-8 text-right shrink-0">{n}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1.5 border-t border-zinc-800 pt-2">
            {respuestas.slice(0, 20).map(r => (
              <div key={r.username} className="jb-body text-xs">
                <span className="text-zinc-100">{nombreDe(r.username)}</span>
                <span className="text-zinc-500"> · {r.edad} años · {r.en}{r.modoFacil ? ' · usa Modo fácil' : ''}</span>
                <p className="text-zinc-300">
                  {(r.respuestas || []).map(id => TEXTO_DIFICIL[id] || id).join(' · ') || '—'}
                  {r.otro ? <span className="text-orange-300"> · "{r.otro}"</span> : null}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function RentabilidadPanel({ users: todosLosUsuarios }) {
  const users = (todosLosUsuarios || []).filter(u => !esCuentaPropia(u.username));
  const [sup, setSup] = useState(SUPUESTOS_RENTABILIDAD);
  const [precios, setPrecios] = useState(() => Object.fromEntries(PLANES.map(p => [p.meses, p.precioDefault])));
  const [mes, setMes] = useState(null);
  const [editar, setEditar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [sim, setSim] = useState(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const inicio = new Date(); inicio.setDate(1);
      const inicioISO = fechaLocalISO(inicio);
      const inicioAnterior = new Date(inicio); inicioAnterior.setMonth(inicioAnterior.getMonth() - 1);
      const [{ data: cfg }, { data: pagos }, { data: fotos }, { data: ia }, { data: gastos }, { data: historialPagos }] = await Promise.all([
        supabase.from('config').select('key, value')
          .in('key', ['rentabilidad_supuestos', ...PLANES.map(p => p.configKey)]),
        traerTodas(() => supabase.from('pagos').select('username, monto, metodo').eq('estado', 'aprobado').gte('creado_en', inicioISO)),
        traerTodas(() => supabase.from('fotos_reconocimiento_uso').select('usadas').gte('updated_at', inicioISO).not('username', 'like', 'demo:%').not('periodo', 'like', 'sugerencia-%'), ['username', 'periodo']),
        // Desde el mes pasado, para comparar el costo de la IA con el mes anterior.
        traerTodas(() => supabase.from('ia_uso').select('funcion, tipo, username, modelo, tokens_entrada, tokens_salida, tokens_cache_lectura, tokens_cache_escritura, creado_en')
          .gte('creado_en', fechaLocalISO(inicioAnterior))),
        traerTodas(() => supabase.from('movimientos_financieros').select('fecha, monto, negocio, categoria, meses_a_repartir')
          .eq('tipo', 'gasto')),
        // Todos los pagos con dinero real: sirve para saber quién pagó por
        // primera vez este mes (alumnos nuevos conseguidos).
        traerTodas(() => supabase.from('pagos').select('username, creado_en').eq('estado', 'aprobado').gt('monto', 0)),
      ]);
      if (cancelado) return;
      const p = {};
      (cfg || []).forEach(c => {
        if (c.key === 'rentabilidad_supuestos') {
          try { setSup(s => ({ ...s, ...JSON.parse(c.value) })); } catch {}
        }
        const plan = PLANES.find(x => x.configKey === c.key);
        if (plan && Number(c.value) > 0) p[plan.meses] = Number(c.value);
      });
      setPrecios(prev => ({ ...prev, ...p }));
      const esteMes = f => String(f.creado_en) >= inicioISO;
      setMes({ pagos: (pagos || []).filter(p => !esCuentaPropia(p.username)), fotos: (fotos || []).reduce((a, f) => a + (Number(f.usadas) || 0), 0), ia: (ia || []).filter(esteMes), iaAnterior: (ia || []).filter(f => !esteMes(f)), gastos: gastos || [], historialPagos: (historialPagos || []).filter(p => !esCuentaPropia(p.username)) });
    })().catch(() => { if (!cancelado) setMes({ pagos: [], fotos: 0, ia: [], iaAnterior: [], gastos: [], historialPagos: [] }); });
    return () => { cancelado = true; };
  }, []);

  async function guardarSupuestos() {
    setGuardando(true);
    try {
      const { error } = await supabase.from('config').upsert({ key: 'rentabilidad_supuestos', value: JSON.stringify(sup) });
      if (error) throw error;
      showToast('Supuestos guardados');
      setEditar(false);
    } catch (e) { alert('No se pudo guardar: ' + (e?.message || 'Intenta de nuevo.')); }
    setGuardando(false);
  }

  const esPrueba = u => u.plan === 'trial' || u.plan === 'prueba';
  const vigentes = (users || []).filter(u => u.enabled && membershipActive(u));
  const pagando = vigentes.filter(u => !esPrueba(u)).length;
  const hoy = todayISO();
  const pagaron = (users || []).filter(u => u.plan === 'pago').length;
  const pruebasSinPagar = (users || []).filter(u => esPrueba(u) && u.fechaVencimiento && u.fechaVencimiento < hoy).length;
  const conversionReal = pagaron + pruebasSinPagar >= 5 ? Math.round((pagaron / (pagaron + pruebasSinPagar)) * 100) : null;

  const ingresosMes = mes ? mes.pagos.reduce((a, p) => a + (Number(p.monto) || 0), 0) : 0;
  const comisionesMes = mes ? mes.pagos.reduce((a, p) => {
    const m = String(p.metodo || '').toLowerCase();
    const pct = m.includes('mercado') ? sup.comisionMP : m.includes('google') ? sup.comisionGoogle : 0;
    return a + (Number(p.monto) || 0) * pct / 100;
  }, 0) : 0;
  // Costo real de la IA (tabla ia_uso), en soles.
  const iaFilas = (mes?.ia || []).map(f => ({ ...f, soles: costoUsdIA(f) * sup.tipoCambio }));
  const suma = filas => filas.reduce((a, f) => a + f.soles, 0);
  const iaAlumnos = iaFilas.filter(f => TIPOS_IA_ALUMNO.includes(f.tipo) && !esCuentaPropia(f.username));
  const iaAdmin = iaFilas.filter(f => !TIPOS_IA_ALUMNO.includes(f.tipo) || esCuentaPropia(f.username));
  const fotosMedidas = iaFilas.filter(f => f.tipo === 'plato' || f.tipo === 'etiqueta');
  const costoFotoReal = fotosMedidas.length >= 5 ? suma(fotosMedidas) / fotosMedidas.length : null;
  const costoFoto = costoFotoReal ?? sup.costoFoto;
  const porAlumnoIA = {};
  iaAlumnos.forEach(f => {
    if (!f.username) return;
    const a = porAlumnoIA[f.username] || (porAlumnoIA[f.username] = { username: f.username, soles: 0, fotos: 0, mensajes: 0 });
    a.soles += f.soles;
    if (f.tipo === 'whatsapp') a.mensajes++; else if (f.tipo !== 'codigo') a.fotos++;
  });
  // Comparación con el mes anterior: el total contra lo que se llevaba
  // gastado a esta misma altura del mes pasado (para no comparar medio mes
  // con un mes entero) y el costo de cada uso contra el del mes pasado completo.
  const iaAnteriorFilas = (mes?.iaAnterior || []).map(f => ({ ...f, soles: costoUsdIA(f) * sup.tipoCambio }));
  const corteMesPasado = mismoMomentoMesPasado(new Date());
  const iaAnteriorMismoTramo = iaAnteriorFilas.filter(f => new Date(f.creado_en) <= corteMesPasado);
  const comparacionIA = PARTES_IA.map(pt => {
    const ahora = iaFilas.filter(f => f.funcion === pt.funcion);
    const antes = iaAnteriorFilas.filter(f => f.funcion === pt.funcion);
    const antesTramo = iaAnteriorMismoTramo.filter(f => f.funcion === pt.funcion);
    return {
      ...pt, total: suma(ahora), totalAntes: suma(antesTramo),
      porUso: ahora.length ? suma(ahora) / ahora.length : null,
      porUsoAntes: antes.length ? suma(antes) / antes.length : null,
      usos: ahora.length, usosAntes: antes.length,
    };
  }).filter(c => c.usos || c.usosAntes);
  const totalIAAntesTramo = suma(iaAnteriorMismoTramo);
  const rankingIA = Object.values(porAlumnoIA).sort((a, b) => b.soles - a.soles);
  const promedioIA = rankingIA.length ? suma(iaAlumnos.filter(f => f.username)) / rankingIA.length : null;
  const nombreDe = un => (users || []).find(u => u.username === un)?.nombre || un;
  const supR = { ...sup, costoFoto };

  // Gastos anotados en Finanzas (solo de la app). Los equipos se reparten
  // en sus meses (una laptop de 24 meses cuenta 1/24 cada mes); el resto
  // cuenta completo en el mes en que se pagó.
  const mesActual = todayISO().slice(0, 7);
  const numMes = ym => { const [y, m] = ym.split('-').map(Number); return y * 12 + m; };
  const gastosCat = { publicidad: 0, marketing: 0, equipo: 0, herramientas: 0, otro: 0 };
  let comprasMes = 0;
  (mes?.gastos || []).forEach(g => {
    const monto = Number(g.monto) || 0;
    const ym = String(g.fecha || '').slice(0, 7);
    if (ym === mesActual) comprasMes += monto; // el Nuevo RUS mira las compras completas del mes
    if (g.negocio !== 'app') return;
    const cat = gastosCat[g.categoria] !== undefined ? g.categoria : 'otro';
    const meses = Number(g.meses_a_repartir) || 0;
    if (cat === 'equipo' && meses > 1) {
      const dif = numMes(mesActual) - numMes(ym);
      if (dif >= 0 && dif < meses) gastosCat.equipo += monto / meses;
    } else if (ym === mesActual) gastosCat[cat] += monto;
  });
  const gastosMes = Object.values(gastosCat).reduce((a, v) => a + v, 0);
  // Para las proyecciones (equilibrio, sueldo, precio mínimo, gráfico y
  // simulador): el promedio mensual de estos gastos en los últimos 3 meses
  // que tienen gastos anotados. Así la publicidad y el marketing de todos
  // los meses cuentan, sin que un solo mes raro lo distorsione.
  const gastoAppDelMes = ym => (mes?.gastos || []).reduce((acc, g) => {
    if (g.negocio !== 'app') return acc;
    const monto = Number(g.monto) || 0;
    const gm = String(g.fecha || '').slice(0, 7);
    const meses = Number(g.meses_a_repartir) || 0;
    if (g.categoria === 'equipo' && meses > 1) {
      const dif = numMes(ym) - numMes(gm);
      return dif >= 0 && dif < meses ? acc + monto / meses : acc;
    }
    return gm === ym ? acc + monto : acc;
  }, 0);
  const ultimosMeses = [0, 1, 2].map(k => {
    const n = numMes(mesActual) - k - 1; // numMes usa meses 1-12
    return `${Math.floor(n / 12)}-${String((n % 12) + 1).padStart(2, '0')}`;
  });
  const conGastos = ultimosMeses.map(gastoAppDelMes).filter(v => v > 0);
  const gastosPromedio = conGastos.length ? conGastos.reduce((a, v) => a + v, 0) / conGastos.length : 0;

  const cuotaRus = cuotaNuevoRus(Math.max(ingresosMes, comprasMes));
  const fijosTec = sup.supabase + sup.vercel + sup.jarvis + sup.dominio + sup.otrosFijos;
  const fijosBase = fijosTec + (cuotaRus ?? 50);
  // Gastos fijos para proyectar: tecnología + RUS + promedio de gastos anotados.
  const fijos = fijosBase + gastosPromedio;
  const costoIAMes = mes ? mes.fotos * costoFoto : 0;
  const resultadoMes = ingresosMes - comisionesMes - fijosBase - costoIAMes - gastosMes;

  const precioMensual = precios[1] || 24.9;
  const cv = costoPorAlumno(supR, sup.conversion);
  const netoMP = precioMensual * (1 - sup.comisionMP / 100);
  const quedaPorAlumno = netoMP - cv;
  const equilibrio = quedaPorAlumno > 0 ? Math.ceil(fijos / quedaPorAlumno) : null;
  const paraSueldo = quedaPorAlumno > 0 ? Math.ceil((fijos + sup.sueldoMeta) / quedaPorAlumno) : null;
  const precioMinimo = n => n > 0 ? (fijos / n + cv) / (1 - sup.comisionMP / 100) : null;
  const piso = cv / (1 - sup.comisionMP / 100);
  const nRef = Math.max(pagando, 25);
  const minimoRef = precioMinimo(nRef);
  // Cuánto cuesta conseguir un alumno vs. cuánto deja en el tiempo que se queda.
  const valorAlumno = quedaPorAlumno * sup.mesesPromedio;

  const canales = [
    { id: 'yape', label: 'Yape / Plin', pct: 0 },
    { id: 'mp', label: 'Mercado Pago', pct: sup.comisionMP },
    { id: 'gp', label: 'Google Play', pct: sup.comisionGoogle },
  ];

  const alertas = [];
  PLANES.forEach(p => {
    const porMes = (precios[p.meses] || p.precioDefault) / p.meses;
    if (minimoRef && porMes < minimoRef) alertas.push(`El plan ${p.nombre.toLowerCase()} equivale a ${fmtS(porMes)} al mes, por debajo del mínimo de ${fmtS(minimoRef)} con ${nRef} alumnos.`);
  });
  // Peor caso: un alumno que usa las 5 fotos de comida todos los días.
  const costoMaxFotos = 150 * costoFoto;
  if (netoMP - (cv - sup.fotosAlumnoMes * costoFoto) - costoMaxFotos < 0) alertas.push(`Un alumno que use las 5 fotos diarias te cuesta ${fmtS(costoMaxFotos)} al mes en fotos: con el plan mensual pierdes plata con él.`);
  const costoPruebas = (1 / (Math.max(sup.conversion, 1) / 100) - 1) * sup.fotosPrueba * costoFoto;
  if (costoPruebas > cv / 2) alertas.push(`Tu mayor costo es la prueba gratis: ${fmtS(costoPruebas)} de cada ${fmtS(cv)} por alumno. Subir la conversión es la mejor palanca.`);
  if (cuotaRus === null) alertas.push(`Este mes pasaste los S/8,000 en ${comprasMes > ingresosMes ? 'compras' : 'ingresos'}: ya no calificas para el Nuevo RUS.`);
  else if (comprasMes > 5000) alertas.push(`Este mes tus compras suman ${fmtS(comprasMes)}: en el Nuevo RUS las compras también cuentan, y tu cuota sube a S/50.`);
  else if (ingresosMes > 4000) alertas.push(`Vas por ${fmtS(ingresosMes)} este mes; al pasar S/5,000 la cuota del Nuevo RUS sube a S/50.`);
  else if (comprasMes > 4000) alertas.push(`Tus compras del mes van en ${fmtS(comprasMes)}: si pasan de S/5,000, la cuota del Nuevo RUS sube a S/50.`);

  // El simulador arranca con los números de hoy.
  const fotosDiaHoy = Math.round((sup.fotosAlumnoMes / 30) * 2) / 2;
  const s = sim || { alumnos: pagando, conversion: sup.conversion, precio: precioMensual, fotosDia: fotosDiaHoy };
  const supSim = { ...supR, fotosAlumnoMes: s.fotosDia * 30 };
  const simCosto = costoPorAlumno(supSim, s.conversion);
  const simQueda = s.precio * (1 - sup.comisionMP / 100) - simCosto;
  const simResultado = s.alumnos * simQueda - fijos;
  const simEquilibrio = simQueda > 0 ? Math.ceil(fijos / simQueda) : null;
  const simSueldo = simQueda > 0 ? Math.ceil((fijos + sup.sueldoMeta) / simQueda) : null;
  // De qué está hecho el costo de un alumno (con los números del simulador).
  const desglose = [
    { l: 'sus fotos con IA', v: supSim.fotosAlumnoMes * costoFoto },
    { l: 'pruebas gratis que no pagan', v: (1 / (Math.max(s.conversion, 1) / 100) - 1) * sup.fotosPrueba * costoFoto },
    { l: 'avisos por WhatsApp', v: sup.whatsappAlumno },
    { l: `comisión de Mercado Pago (${sup.comisionMP}%)`, v: s.precio * sup.comisionMP / 100 },
  ];

  const avance = equilibrio ? Math.min(pagando / equilibrio, 1) * 100 : 0;
  const tarjeta = 'bg-zinc-950 border border-zinc-800 rounded-lg p-3';
  const campos = [
    ['supabase', 'Supabase (S/ al mes)'], ['vercel', 'Vercel (S/ al mes)'], ['jarvis', 'Jarvis y voz (S/ al mes)'],
    ['dominio', 'Dominio y Google Play (S/ al mes)'], ['otrosFijos', 'Otros gastos fijos (S/ al mes)'],
    ['costoFoto', 'Costo de una foto con IA (S/)'], ['fotosAlumnoMes', 'Fotos de un alumno al mes (máx. 150)'],
    ['fotosPrueba', 'Fotos de una prueba gratis'], ['whatsappAlumno', 'WhatsApp por alumno (S/ al mes)'],
    ['comisionMP', 'Comisión Mercado Pago (%)'], ['comisionGoogle', 'Comisión Google Play (%)'], ['tipoCambio', 'Tipo de cambio (S/ por dólar)'],
    ['conversion', 'De cada 100 que prueban, pagan'], ['sueldoMeta', 'Tu sueldo meta (S/ al mes)'], ['mesesPromedio', 'Meses que se queda un alumno (promedio)'],
  ];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-5">
      <div>
        <h2 className="jb-display text-base text-zinc-200">📈 RENTABILIDAD Y PRECIOS</h2>
        <p className="jb-body text-[11px] text-zinc-500 mt-0.5">Cuánto te cuesta la app, cuánto te deja cada alumno y el precio mínimo para no perder.</p>
      </div>

      <div className={tarjeta}>
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <span className="jb-body text-xs text-zinc-400">Resultado estimado de este mes</span>
          {!mes ? <Loader2 size={14} className="animate-spin text-orange-500" /> : (
            <span className={`jb-display text-2xl ${resultadoMes >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {resultadoMes >= 0 ? '+' : '−'}{fmtS(Math.abs(resultadoMes))}
            </span>
          )}
        </div>
        {mes && (
          <p className="jb-body text-[11px] text-zinc-500 mt-1">
            Cobraste {fmtS(ingresosMes)} − comisiones {fmtS(comisionesMes)} − gastos fijos {fmtS(fijosBase)} − fotos con IA {fmtS(costoIAMes)} ({mes.fotos} fotos a {fmtS(costoFoto)}{costoFotoReal !== null ? ', costo medido' : ', costo estimado'})
            {CATEGORIAS_GASTO.filter(c => gastosCat[c.id] > 0).map(c => (
              <span key={c.id}> − <span className="text-zinc-300">{c.emoji} {c.id === 'equipo' ? 'equipos (repartido)' : c.label.toLowerCase()} {fmtS(gastosCat[c.id])}</span></span>
            ))}
          </p>
        )}
        <div className="mt-3">
          <div className="flex justify-between jb-body text-[11px] text-zinc-400 mb-1">
            <span>Alumnos pagando: <span className="text-zinc-50 font-semibold">{pagando}</span></span>
            <span>Para no perder: <span className="text-zinc-50 font-semibold">{equilibrio ?? '—'}</span> · Para tu sueldo: <span className="text-zinc-50 font-semibold">{paraSueldo ?? '—'}</span></span>
          </div>
          <div className="flex"><BarraBrillo pct={avance} /></div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { v: fmtS(fijos), l: 'Gastos fijos al mes', sub: `tecnología ${fmtS(fijosTec)} + RUS ${fmtS(cuotaRus ?? 50)}${gastosPromedio > 0 ? ` + publicidad y otros ${fmtS(gastosPromedio)} (promedio de ${conGastos.length} ${conGastos.length === 1 ? 'mes' : 'meses'})` : ''}` },
          { v: fmtS(cv), l: 'Costo por alumno', sub: 'fotos, pruebas gratis y avisos' },
          { v: fmtS(quedaPorAlumno), l: 'Te deja cada alumno', sub: `plan mensual por Mercado Pago` },
          { v: `${sup.conversion}%`, l: 'Pruebas que pagan', sub: conversionReal === null ? 'supuesto (aún pocos datos)' : `medido en la app: ${conversionReal}%` },
        ].map(t => (
          <div key={t.l} className={tarjeta}>
            <div className="jb-display text-xl text-orange-400">{t.v}</div>
            <div className="jb-body text-[11px] text-zinc-300 leading-tight mt-0.5">{t.l}</div>
            <div className="jb-body text-[10px] text-zinc-500 leading-tight mt-0.5">{t.sub}</div>
          </div>
        ))}
      </div>

      <CostoPorAlumnoPanel valorAlumno={valorAlumno} explicacionValor={`${sup.mesesPromedio} ${sup.mesesPromedio === 1 ? 'mes' : 'meses'} en promedio × ${fmtS(quedaPorAlumno)}`} />

      <div className={`${tarjeta} flex flex-col gap-3`}>
        <div>
          <h3 className="jb-display text-sm text-zinc-300">🤖 COSTO REAL DE LA IA · ESTE MES</h3>
          <p className="jb-body text-[11px] text-zinc-500 mt-0.5">Cada uso de la IA queda anotado con lo que costó de verdad (tipo de cambio {fmtS(sup.tipoCambio)} por dólar).</p>
        </div>
        {!mes ? <Loader2 size={14} className="animate-spin text-orange-500" /> : iaFilas.length === 0 ? (
          <p className="jb-body text-xs text-zinc-500">Todavía no hay usos anotados. Se empiezan a medir apenas se publiquen las funciones de IA actualizadas.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { v: fmtS(suma(iaFilas)), l: 'IA total del mes', sub: `${iaFilas.length} usos · a esta altura del mes pasado ${fmtS(totalIAAntesTramo)}` },
                { v: fmtS(suma(iaAlumnos)), l: 'La usan tus alumnos', sub: 'fotos, etiquetas, códigos y WhatsApp' },
                { v: fmtS(suma(iaAdmin)), l: 'La usas tú', sub: 'Jarvis, pedidos de alimentos y tus pruebas' },
                { v: costoFotoReal === null ? '—' : fmtS(costoFotoReal), l: 'Costo real por foto', sub: costoFotoReal === null ? `faltan fotos para medir (${fotosMedidas.length} de 5)` : `promedio de ${fotosMedidas.length} fotos` },
              ].map(t => (
                <div key={t.l} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                  <div className="jb-display text-lg text-orange-400">{t.v}</div>
                  <div className="jb-body text-[11px] text-zinc-300 leading-tight mt-0.5">{t.l}</div>
                  <div className="jb-body text-[10px] text-zinc-500 leading-tight mt-0.5">{t.sub}</div>
                </div>
              ))}
            </div>
            {comparacionIA.length > 0 && (
              <div>
                <div className="jb-body text-xs text-zinc-400 mb-0.5">Comparado con el mes pasado</div>
                <p className="jb-body text-[10px] text-zinc-500 mb-1.5">
                  El gasto se compara con lo que llevabas al {corteMesPasado.getDate()} del mes pasado. El costo de cada uso, con el promedio de todo el mes pasado.
                </p>
                <div className="flex flex-col gap-1">
                  {comparacionIA.map(c => {
                    const cambio = c.porUso !== null && c.porUsoAntes ? Math.round((c.porUso / c.porUsoAntes - 1) * 100) : null;
                    return (
                      <div key={c.funcion} className="bg-zinc-900 rounded-lg px-3 py-2">
                        <div className="flex justify-between items-baseline gap-2">
                          <span className="jb-body text-xs text-zinc-200">{c.label}</span>
                          <span className="jb-body text-[11px] text-zinc-500 shrink-0">
                            <span className="jb-display text-sm text-zinc-50">{fmtS(c.total)}</span> · mes pasado {fmtS(c.totalAntes)}
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline gap-2 mt-0.5">
                          <span className="jb-body text-[11px] text-zinc-500">
                            Cada {c.uso}: <span className="text-zinc-200">{c.porUso === null ? '—' : `S/${c.porUso.toFixed(3)}`}</span>
                            {' '}· antes {c.porUsoAntes === null ? '—' : `S/${c.porUsoAntes.toFixed(3)}`}
                          </span>
                          {cambio === null ? (
                            <span className="jb-body text-[11px] text-zinc-500 shrink-0">{c.usos ? 'nuevo este mes' : 'sin usos este mes'}</span>
                          ) : (
                            <span className={`jb-body text-[11px] shrink-0 ${cambio <= -5 ? 'text-emerald-400' : cambio >= 5 ? 'text-orange-400' : 'text-zinc-400'}`}>
                              {cambio <= -5 ? `▼ ${Math.abs(cambio)}% más barato` : cambio >= 5 ? `▲ ${cambio}% más caro` : 'igual'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {rankingIA.length > 0 && (
              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="jb-body text-xs text-zinc-400">Alumnos que más gastan en IA</span>
                  <span className="jb-body text-[11px] text-zinc-500">Promedio: <span className="text-zinc-200">{fmtS(promedioIA)}</span> por alumno</span>
                </div>
                <div className="flex flex-col gap-1">
                  {rankingIA.slice(0, 5).map(a => (
                    <div key={a.username} className="flex justify-between items-center bg-zinc-900 rounded-lg px-3 py-1.5">
                      <span className="jb-body text-xs text-zinc-200 truncate">{nombreDe(a.username)}
                        <span className="text-zinc-500"> · {a.fotos} foto{a.fotos === 1 ? '' : 's'}{a.mensajes ? ` · ${a.mensajes} mensaje${a.mensajes === 1 ? '' : 's'}` : ''}</span>
                      </span>
                      <span className="jb-display text-sm text-zinc-50 shrink-0">{fmtS(a.soles)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <AnaliticaIAPanel tipoCambio={sup.tipoCambio} />

      <div>
        <h3 className="jb-display text-sm text-zinc-300 mb-1">CUÁNTO TE DEJA CADA PLAN AL MES</h3>
        <p className="jb-body text-[11px] text-zinc-500 mb-2">
          Ya descontado el costo por alumno. Mínimo para no perder con {nRef} alumnos: <span className="text-zinc-200">{fmtS(minimoRef)}</span> al mes.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full jb-body text-xs">
            <thead>
              <tr className="text-zinc-500 text-[11px]">
                <th className="text-left font-normal py-1.5 pr-2">Plan</th>
                <th className="text-right font-normal py-1.5 px-2">Al mes</th>
                {canales.map(c => <th key={c.id} className="text-right font-normal py-1.5 px-2 whitespace-nowrap">{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {PLANES.map(p => {
                const porMes = (precios[p.meses] || p.precioDefault) / p.meses;
                return (
                  <tr key={p.meses} className="border-t border-zinc-800">
                    <td className="py-2 pr-2 text-zinc-200">{p.nombre}</td>
                    <td className="py-2 px-2 text-right text-zinc-400">{fmtS(porMes)}</td>
                    {canales.map(c => {
                      const deja = porMes * (1 - c.pct / 100) - cv;
                      const minimoNeto = minimoRef * (1 - sup.comisionMP / 100) - cv;
                      const color = deja < 0 ? 'text-red-400' : deja < minimoNeto ? 'text-amber-400' : 'text-emerald-400';
                      return <td key={c.id} className={`py-2 px-2 text-right font-semibold ${color}`}>{fmtS(deja)}</td>;
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="jb-body text-[10px] text-zinc-500 mt-1.5">
          <span className="text-emerald-400">Verde</span>: cubre su parte de los gastos fijos. <span className="text-amber-400">Amarillo</span>: deja algo, pero no alcanza. <span className="text-red-400">Rojo</span>: pierdes plata.
        </p>
      </div>

      <div>
        <h3 className="jb-display text-sm text-zinc-300 mb-1">PRECIO MÍNIMO SEGÚN TUS ALUMNOS</h3>
        <p className="jb-body text-xs text-zinc-400 mb-2">
          {equilibrio
            ? <>Con tu precio actual (<span className="text-zinc-50 font-semibold">{fmtS(precioMensual)}</span>) empiezas a ganar desde <span className="text-emerald-400 font-semibold">{equilibrio} alumnos</span>{pagando < equilibrio ? <>. Hoy tienes {pagando}: te faltan {equilibrio - pagando}.</> : '. Ya estás ganando.'}</>
            : <>Con tu precio actual ({fmtS(precioMensual)}) cada alumno te cuesta más de lo que paga: sube el precio o baja costos.</>}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[...new Set([pagando, 10, 25, 50, 100])].filter(n => n > 0).sort((a, b) => a - b).map(n => {
            const alcanza = precioMensual >= precioMinimo(n);
            return (
              <div key={n} className={`bg-zinc-950 border rounded-lg p-3 ${alcanza ? 'border-emerald-500/40' : 'border-red-500/40'} ${n === pagando ? 'ring-1 ring-orange-500/60' : ''}`}>
                <div className="jb-display text-lg text-zinc-50">{fmtS(precioMinimo(n))}</div>
                <div className="jb-body text-[10px] text-zinc-500">con {n} alumno{n === 1 ? '' : 's'}{n === pagando ? ' (hoy)' : ''}</div>
                <div className={`jb-body text-[10px] mt-0.5 ${alcanza ? 'text-emerald-400' : 'text-red-400'}`}>{alcanza ? '✓ tu precio alcanza' : '✗ tu precio no alcanza'}</div>
              </div>
            );
          })}
        </div>
        <p className="jb-body text-[10px] text-zinc-500 mt-1.5">Piso absoluto: {fmtS(piso)}. Por debajo, cada alumno nuevo te hace perder más.</p>
      </div>

      <div>
        <h3 className="jb-display text-sm text-zinc-300 mb-1">GANANCIA SEGÚN TUS ALUMNOS</h3>
        <p className="jb-body text-[11px] text-zinc-500 mb-1">Con tu precio actual y tus costos de hoy{gastosPromedio > 0 ? `, incluida tu publicidad y otros gastos (promedio ${fmtS(gastosPromedio)} al mes)` : ''}. En rojo pierdes, en verde ganas.</p>
        <GraficoGanancia fijos={fijos} queda={quedaPorAlumno} hoy={pagando} equilibrio={equilibrio} paraSueldo={paraSueldo} sueldo={sup.sueldoMeta} />
      </div>

      <div className={`${tarjeta} flex flex-col gap-3`}>
        <div className="flex items-center justify-between">
          <h3 className="jb-display text-sm text-zinc-300">¿QUÉ PASA SI...?</h3>
          {sim && <button onClick={() => setSim(null)} className="jb-body text-[11px] text-zinc-500 hover:text-zinc-300">Volver a hoy</button>}
        </div>
        {[
          { k: 'alumnos', l: 'Alumnos pagando', min: 0, max: 200, step: 1, f: v => v },
          { k: 'conversion', l: 'De cada 100 que prueban, pagan', min: 5, max: 50, step: 1, f: v => `${v}` },
          { k: 'precio', l: 'Precio del plan mensual', min: 10, max: 50, step: 0.5, f: v => fmtS(v), hoy: precioMensual, fHoy: v => `tu precio: ${fmtS(v)}` },
          { k: 'fotosDia', l: 'Fotos con IA por día (promedio por alumno)', min: 0, max: 5, step: 0.5, f: v => `${v}`, hoy: fotosDiaHoy, fHoy: v => `supuesto de hoy: ${v}` },
        ].map(c => (
          <label key={c.k} className="flex flex-col gap-1">
            <span className="flex justify-between jb-body text-xs text-zinc-400">{c.l}<span className="text-zinc-50 font-semibold">{c.f(s[c.k])}</span></span>
            <input type="range" min={c.min} max={c.max} step={c.step} value={s[c.k]}
              onChange={e => setSim({ ...s, [c.k]: Number(e.target.value) })} className="accent-orange-500" />
            {c.hoy !== undefined && (
              <span className="relative h-3 -mt-1" aria-hidden="true">
                <span className="absolute top-0 -translate-x-1/2 jb-body text-[10px] text-orange-400 whitespace-nowrap"
                  style={{ left: `${Math.min(92, Math.max(8, ((c.hoy - c.min) / (c.max - c.min)) * 100))}%` }}>▲ {c.fHoy(c.hoy)}</span>
              </span>
            )}
          </label>
        ))}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          <div>
            <div className={`jb-display text-lg ${simResultado >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{simResultado >= 0 ? '+' : '−'}{fmtS(Math.abs(simResultado))}</div>
            <div className="jb-body text-[10px] text-zinc-500">ganarías al mes</div>
          </div>
          <div>
            <div className="jb-display text-lg text-zinc-50">{fmtS(simQueda)}</div>
            <div className="jb-body text-[10px] text-zinc-500">te deja cada alumno</div>
          </div>
          <div>
            <div className="jb-display text-lg text-zinc-50">{simEquilibrio ?? '—'}</div>
            <div className="jb-body text-[10px] text-zinc-500">alumnos para no perder</div>
          </div>
          <div>
            <div className="jb-display text-lg text-zinc-50">{simSueldo ?? '—'}</div>
            <div className="jb-body text-[10px] text-zinc-500">alumnos para tu sueldo ({fmtS(sup.sueldoMeta)})</div>
          </div>
        </div>
        <div className="border-t border-zinc-800 pt-2.5">
          <p className="jb-body text-xs text-zinc-400 mb-1.5">
            Cada alumno te cuesta <span className="text-zinc-50 font-semibold">{fmtS(desglose.reduce((a, d) => a + d.v, 0))}</span> al mes:
          </p>
          <div className="flex flex-col gap-1.5">
            {desglose.map((d, fila) => {
              const total = desglose.reduce((a, x) => a + x.v, 0) || 1;
              return (
                <div key={d.l} className="flex items-center gap-2">
                  <span className="jb-body text-[11px] text-zinc-400 w-44 sm:w-56 shrink-0 truncate">{d.l}</span>
                  <BarraBrillo pct={d.v > 0 ? Math.max(3, (d.v / total) * 100) : 0} fila={fila} />
                  <span className="font-mono text-[11px] text-zinc-200 w-14 text-right shrink-0">{fmtS(d.v)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {alertas.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h3 className="jb-display text-sm text-zinc-300">PARA TOMAR DECISIONES</h3>
          {alertas.map(a => (
            <div key={a} className="flex gap-2 items-start bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-2">
              <AlertTriangle size={13} className="text-orange-400 shrink-0 mt-0.5" />
              <span className="jb-body text-xs text-zinc-300">{a}</span>
            </div>
          ))}
        </div>
      )}

      <div>
        <button onClick={() => setEditar(v => !v)} className="jb-body text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1">
          <ChevronRight size={14} className={`transition-transform ${editar ? 'rotate-90' : ''}`} /> Ajustar supuestos (costos y comisiones)
        </button>
        {editar && (
          <div className="mt-3 flex flex-col gap-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {campos.map(([k, l]) => (
                <label key={k} className="flex flex-col gap-1">
                  <span className="jb-body text-[11px] text-zinc-500 leading-tight">{l}</span>
                  <input type="number" step="any" min="0" value={sup[k]}
                    onChange={e => setSup(v => ({ ...v, [k]: Number(e.target.value) || 0 }))}
                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200" />
                </label>
              ))}
            </div>
            <p className="jb-body text-[10px] text-zinc-500">La cuota del Nuevo RUS se calcula sola con lo que cobras en el mes. El costo por foto que escribas aquí solo se usa hasta que haya al menos 5 fotos medidas; después manda el costo real.</p>
            <button onClick={guardarSupuestos} disabled={guardando}
              className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg py-2 disabled:opacity-50">
              {guardando ? 'Guardando...' : 'Guardar supuestos'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricasPanel() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [leadsPorRed, setLeadsPorRed] = useState([]);
  const [proyeccion, setProyeccion] = useState({ count: 0, monto: 0 });
  const [leadsConvertidos, setLeadsConvertidos] = useState({ total: 0, convertidos: 0 });
  const [ajustesDias, setAjustesDias] = useState([]);

  useEffect(() => { if (open) load(); }, [open]);

  async function load() {
    setLoading(true);
    let alumnosData = [];
    try {
      const { data: alumnos } = await supabase.from('alumnos')
        .select('username, plan, enabled, fecha_vencimiento, codigo_referido, comision_pagada, comision_monto, telefono');
      alumnosData = alumnos || [];

      // Proyección: alumnos "por vencer" (0-7 días, habilitados) × precio estimado de su plan
      const porVencer = alumnosData.filter(a => {
        if (!a.enabled) return false;
        const dl = daysLeft(a.fecha_vencimiento);
        return dl !== null && dl <= 7;
      });
      let precioPorUsuario = {};
      if (porVencer.length) {
        try {
          const usernames = porVencer.map(a => a.username);
          const { data: pagosHist } = await supabase.from('pagos')
            .select('username, plan_meses, creado_en')
            .in('username', usernames)
            .order('creado_en', { ascending: false });
          (pagosHist || []).forEach(p => {
            if (!precioPorUsuario[p.username]) {
              const plan = PLANES.find(pl => pl.meses === p.plan_meses);
              precioPorUsuario[p.username] = plan ? plan.precioDefault : PLANES[0].precioDefault;
            }
          });
        } catch {}
      }
      const montoProyectado = porVencer.reduce((acc, a) =>
        acc + (precioPorUsuario[a.username] ?? PLANES[0].precioDefault), 0);
      setProyeccion({ count: porVencer.length, monto: montoProyectado });
    } catch {}
    try {
      const { data: leadsData } = await supabase.from('leads').select('red, telefono');
      const counts = {};
      (leadsData || []).forEach(l => {
        const red = l.red || 'sin canal';
        counts[red] = (counts[red] || 0) + 1;
      });
      setLeadsPorRed(Object.entries(counts));

      // Cuántos leads (con teléfono) hoy son alumnos, cruzando por número de celular
      const telefonosAlumnos = new Set(
        alumnosData.map(a => (a.telefono || '').replace(/\D/g, '')).filter(Boolean)
      );
      const leadsConTelefono = (leadsData || []).filter(l => (l.telefono || '').replace(/\D/g, ''));
      const convertidos = leadsConTelefono.filter(l =>
        telefonosAlumnos.has((l.telefono || '').replace(/\D/g, ''))
      ).length;
      setLeadsConvertidos({ total: (leadsData || []).length, convertidos });
    } catch {}
    try {
      const { data: ajustes } = await supabase.from('ajustes_membresia')
        .select('username, dias, motivo, created_at').order('created_at', { ascending: false }).limit(30);
      setAjustesDias(ajustes || []);
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
    setLoading(false);
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full px-5 py-4 flex items-center justify-between text-left">
        <h2 className="jb-display text-base text-zinc-200">📊 MÉTRICAS</h2>
        <ChevronRight size={18} className={`text-zinc-500 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 flex flex-col gap-5 border-t border-zinc-800 pt-4">
          {loading ? (
            <Loader2 className="animate-spin text-orange-500" size={20} />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                  <div className="text-[11px] text-zinc-500 mb-0.5">Proyección por vencer (7 días)</div>
                  <div className="text-emerald-400 jb-display text-lg">S/ {proyeccion.monto.toFixed(2)}</div>
                  <div className="text-[11px] text-zinc-500">{proyeccion.count} alumnos · estimado</div>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                  <div className="text-[11px] text-zinc-500 mb-0.5">Leads convertidos a alumno</div>
                  <div className="text-emerald-400 jb-display text-lg">{leadsConvertidos.convertidos} de {leadsConvertidos.total}</div>
                  <div className="text-[11px] text-zinc-500">cruce por teléfono</div>
                </div>
              </div>

              <div>
                <h3 className="jb-display text-sm text-zinc-300 mb-2">LEADS POR CANAL</h3>
                <div className="flex flex-col gap-1.5">
                  {leadsPorRed.map(([red, count]) => (
                    <div key={red} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 flex justify-between items-center text-sm">
                      <span className="text-zinc-400">{red}</span>
                      <span className="jb-display text-zinc-100">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="jb-display text-sm text-zinc-300 mb-2">HISTORIAL DE AJUSTES DE DÍAS</h3>
                <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
                  {ajustesDias.length === 0 && <p className="text-zinc-500 text-xs">Sin ajustes registrados todavía.</p>}
                  {ajustesDias.map((a, i) => (
                    <div key={i} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 flex justify-between items-center gap-2">
                      <div className="min-w-0">
                        <div className="text-zinc-200 text-sm truncate">{a.username}</div>
                        <div className="text-zinc-600 text-[11px]">
                          {new Date(a.created_at).toLocaleDateString('es-PE')} {a.motivo ? `· ${a.motivo}` : ''}
                        </div>
                      </div>
                      <span className={`jb-display text-sm shrink-0 ${a.dias > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {a.dias > 0 ? '+' : ''}{a.dias} día(s)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const CATEGORIAS_GASTO = [
  { id: 'publicidad', emoji: '📣', label: 'Publicidad' },
  { id: 'marketing', emoji: '🤝', label: 'Marketing' },
  { id: 'equipo', emoji: '💻', label: 'Equipo' },
  { id: 'herramientas', emoji: '🛠️', label: 'Herramientas' },
  { id: 'otro', emoji: '📦', label: 'Otro' },
];

function FinanzasPanel() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [movs, setMovs] = useState([]);
  const [negocioFiltro, setNegocioFiltro] = useState('todos');
  const [mesFiltro, setMesFiltro] = useState(() => new Date().toISOString().slice(0, 7));
  const [form, setForm] = useState({
    fecha: todayISO(), negocio: 'app', tipo: 'ingreso', concepto: '', categoria: 'publicidad', anios: 2,
    monto: '', tieneComprobante: false, igv: '', notas: '',
  });
  const [guardando, setGuardando] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [ultimoDigito, setUltimoDigito] = useState('');
  const [fechaLimite, setFechaLimite] = useState('');
  const [guardandoVenc, setGuardandoVenc] = useState(false);
  const [socio1Nombre, setSocio1Nombre] = useState('Socio 1');
  const [regimen, setRegimen] = useState('nuevo_rus');
  const [guardandoRegimen, setGuardandoRegimen] = useState(false);
  const [socio2Nombre, setSocio2Nombre] = useState('Socio 2');
  const [socio1Pct, setSocio1Pct] = useState('50');
  const [guardandoSocios, setGuardandoSocios] = useState(false);

  useEffect(() => { if (open) load(); }, [open]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await supabase.from('movimientos_financieros')
        .select('*').order('fecha', { ascending: false }).limit(300);
      setMovs(data || []);
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
    try {
      const { data: cfg } = await supabase.from('config').select('key, value')
        .in('key', ['ruc_ultimo_digito', 'finanzas_fecha_limite', 'socio1_nombre', 'socio2_nombre', 'socio1_pct', 'regimen_tributario']);
      (cfg || []).forEach(c => {
        if (c.key === 'ruc_ultimo_digito') setUltimoDigito(c.value || '');
        if (c.key === 'finanzas_fecha_limite') setFechaLimite(c.value || '');
        if (c.key === 'socio1_nombre') setSocio1Nombre(c.value || 'Socio 1');
        if (c.key === 'socio2_nombre') setSocio2Nombre(c.value || 'Socio 2');
        if (c.key === 'socio1_pct') setSocio1Pct(c.value || '50');
        if (c.key === 'regimen_tributario') setRegimen(c.value || 'nuevo_rus');
      });
    } catch {}
    setLoading(false);
  }

  async function guardarRegimen(nuevo) {
    setRegimen(nuevo);
    setGuardandoRegimen(true);
    try {
      await supabase.from('config').upsert({ key: 'regimen_tributario', value: nuevo });
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
    setGuardandoRegimen(false);
  }

  async function guardarVencimiento() {
    setGuardandoVenc(true);
    try {
      await supabase.from('config').upsert({ key: 'ruc_ultimo_digito', value: ultimoDigito });
      await supabase.from('config').upsert({ key: 'finanzas_fecha_limite', value: fechaLimite });
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
    setGuardandoVenc(false);
  }

  async function guardarSocios() {
    setGuardandoSocios(true);
    try {
      await supabase.from('config').upsert({ key: 'socio1_nombre', value: socio1Nombre });
      await supabase.from('config').upsert({ key: 'socio2_nombre', value: socio2Nombre });
      await supabase.from('config').upsert({ key: 'socio1_pct', value: socio1Pct });
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
    setGuardandoSocios(false);
  }

  async function agregar(e) {
    e.preventDefault();
    setFormErr('');
    const monto = parseFloat(form.monto);
    if (!monto || monto <= 0) return setFormErr('Ingresa un monto válido.');
    if (!form.concepto.trim()) return setFormErr('Escribe un concepto breve.');
    setGuardando(true);
    try {
      const { error } = await supabase.from('movimientos_financieros').insert({
        fecha: form.fecha, negocio: form.negocio, tipo: form.tipo,
        concepto: form.concepto.trim(), monto,
        tiene_comprobante: form.tieneComprobante,
        igv: form.igv ? parseFloat(form.igv) : null,
        categoria: form.tipo === 'gasto' ? form.categoria : 'otro',
        meses_a_repartir: form.tipo === 'gasto' && form.categoria === 'equipo' ? form.anios * 12 : null,
        notas: form.notas.trim() || null,
      });
      if (error) throw error;
      setForm(f => ({ ...f, concepto: '', monto: '', igv: '', notas: '' }));
      load();
    } catch (err) {
      setFormErr('No se pudo guardar: ' + err.message);
    }
    setGuardando(false);
  }

  async function cambiarCategoria(m, categoria) {
    try {
      const { error } = await supabase.from('movimientos_financieros')
        .update({ categoria, meses_a_repartir: categoria === 'equipo' ? (m.meses_a_repartir || 24) : null }).eq('id', m.id);
      if (error) throw error;
      load();
    } catch (e) { alert('No se pudo cambiar: ' + (e?.message || 'Intenta de nuevo.')); }
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este movimiento?')) return;
    try {
      await supabase.from('movimientos_financieros').delete().eq('id', id);
      load();
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
  }

  const movsFiltrados = movs.filter(m => {
    if (negocioFiltro !== 'todos' && m.negocio !== negocioFiltro) return false;
    if (mesFiltro && !(m.fecha || '').startsWith(mesFiltro)) return false;
    return true;
  });

  function igvDe(m) {
    if (!m.tiene_comprobante) return 0;
    if (m.igv !== null && m.igv !== undefined) return parseFloat(m.igv) || 0;
    return (parseFloat(m.monto) || 0) * 18 / 118; // estimado si no se especificó el IGV exacto
  }

  const ventas = movsFiltrados.filter(m => m.tipo === 'ingreso').reduce((a, m) => a + (parseFloat(m.monto) || 0), 0);
  const compras = movsFiltrados.filter(m => m.tipo === 'gasto').reduce((a, m) => a + (parseFloat(m.monto) || 0), 0);

  // Arrastre de saldo a favor de IGV: se calcula mes a mes en orden, desde el primer movimiento hasta el mes filtrado
  const movsNegocio = movs.filter(m => negocioFiltro === 'todos' || m.negocio === negocioFiltro);
  const porMes = {};
  movsNegocio.forEach(m => {
    const mes = (m.fecha || '').slice(0, 7);
    if (!mes) return;
    if (!porMes[mes]) porMes[mes] = { ventaIgv: 0, compraIgv: 0 };
    if (m.tipo === 'ingreso') porMes[mes].ventaIgv += igvDe(m);
    else porMes[mes].compraIgv += igvDe(m);
  });
  const mesesOrdenados = Object.keys(porMes).sort();
  let saldoAFavor = 0, igvAPagar = 0, saldoAFavorSiguiente = 0;
  for (const mes of mesesOrdenados) {
    if (mes > mesFiltro) break;
    const { ventaIgv, compraIgv } = porMes[mes];
    const creditoDisponible = compraIgv + saldoAFavor;
    if (ventaIgv >= creditoDisponible) {
      igvAPagar = ventaIgv - creditoDisponible;
      saldoAFavor = 0;
    } else {
      igvAPagar = 0;
      saldoAFavor = creditoDisponible - ventaIgv;
    }
    if (mes === mesFiltro) saldoAFavorSiguiente = saldoAFavor;
  }

  const rentaEstimada = ventas * 0.01;

  // Acumulado anual (para el tope de 300 UIT del Régimen MYPE Tributario)
  const anio = mesFiltro.slice(0, 4);
  const UIT_2026 = 5500;
  const TOPE_300_UIT = UIT_2026 * 300;
  const ventasAnio = movsNegocio
    .filter(m => m.tipo === 'ingreso' && (m.fecha || '').startsWith(anio) && (m.fecha || '').slice(0, 7) <= mesFiltro)
    .reduce((a, m) => a + (parseFloat(m.monto) || 0), 0);
  const pctTope = Math.min((ventasAnio / TOPE_300_UIT) * 100, 100);

  // Reparto entre socios (sobre utilidad neta estimada del mes filtrado)
  const utilidadNeta = ventas - compras - igvAPagar - rentaEstimada;
  const pct1 = Math.min(Math.max(parseFloat(socio1Pct) || 0, 0), 100);
  const pct2 = 100 - pct1;
  const montoSocio1 = utilidadNeta > 0 ? utilidadNeta * (pct1 / 100) : 0;
  const montoSocio2 = utilidadNeta > 0 ? utilidadNeta * (pct2 / 100) : 0;

  // Cálculo del Nuevo RUS: categoría y cuota fija según ventas/compras del mes (lo que sea mayor)
  const maxVentasComprasRUS = Math.max(ventas, compras);
  let categoriaRUS = null, cuotaRUS = null, excedeRUS = false;
  if (maxVentasComprasRUS <= 5000) { categoriaRUS = 1; cuotaRUS = 20; }
  else if (maxVentasComprasRUS <= 8000) { categoriaRUS = 2; cuotaRUS = 50; }
  else { excedeRUS = true; }

  function exportarCSV() {
    const headers = ['fecha', 'negocio', 'tipo', 'concepto', 'monto', 'tiene_comprobante', 'igv', 'notas'];
    const filas = movs.map(m => headers.map(h => {
      const v = m[h];
      const s = v === null || v === undefined ? '' : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    }).join(','));
    const csv = [headers.join(','), ...filas].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finanzas_jonahbeast_${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportarLibroDiario() {
    const headers = ['Fecha', 'Glosa', 'Cuenta', 'Debe', 'Haber'];
    const filas = [];
    movs.slice().sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '')).forEach(m => {
      const glosa = `${m.tipo === 'ingreso' ? 'Venta' : 'Compra'} - ${m.negocio} - ${m.concepto || ''}`.replace(/"/g, '""');
      const cuenta = m.tipo === 'ingreso' ? '70 - Ventas' : '60 - Compras';
      const debe = m.tipo === 'gasto' ? (parseFloat(m.monto) || 0).toFixed(2) : '0.00';
      const haber = m.tipo === 'ingreso' ? (parseFloat(m.monto) || 0).toFixed(2) : '0.00';
      filas.push([`"${m.fecha}"`, `"${glosa}"`, `"${cuenta}"`, debe, haber].join(','));
    });
    const csv = [headers.join(','), ...filas].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `libro_diario_simplificado_jonahbeast_${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function diasParaVencer() {
    if (!fechaLimite) return null;
    const hoy = new Date(todayISO());
    const lim = new Date(fechaLimite);
    return Math.ceil((lim - hoy) / 86400000);
  }
  const diasVenc = diasParaVencer();

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full px-5 py-4 flex items-center justify-between text-left">
        <h2 className="jb-display text-base text-zinc-200">💰 FINANZAS</h2>
        <ChevronRight size={18} className={`text-zinc-500 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 flex flex-col gap-5 border-t border-zinc-800 pt-4">
          {loading ? (
            <Loader2 className="animate-spin text-orange-500" size={20} />
          ) : (
            <>
              <p className="text-[11px] text-zinc-500 -mt-1">
                Estimado de referencia, no reemplaza tu declaración real en SUNAT ni a un contador.
              </p>

              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-zinc-500">Régimen tributario actual:</span>
                <select value={regimen} onChange={e => guardarRegimen(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200">
                  <option value="nuevo_rus">Nuevo RUS</option>
                  <option value="rmt">Régimen MYPE Tributario (RMT)</option>
                </select>
                {guardandoRegimen && <span className="text-[11px] text-zinc-600">guardando...</span>}
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex flex-col gap-2">
                <h3 className="jb-display text-sm text-zinc-300">Fecha límite para declarar</h3>
                {diasVenc !== null && (
                  <p className={`text-xs ${diasVenc <= 3 ? 'text-red-400' : diasVenc <= 7 ? 'text-orange-400' : 'text-zinc-400'}`}>
                    {diasVenc >= 0 ? `Faltan ${diasVenc} día(s)` : `Venció hace ${Math.abs(diasVenc)} día(s)`}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="Último dígito RUC" value={ultimoDigito}
                    onChange={e => setUltimoDigito(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200" />
                  <input type="date" value={fechaLimite} onChange={e => setFechaLimite(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200" />
                </div>
                <p className="text-[11px] text-zinc-600">
                  Revisa la fecha exacta según tu dígito en el{' '}
                  <a href="https://emprender.sunat.gob.pe/ruc/regimenes-tributarios-mype" target="_blank" rel="noopener noreferrer" className="text-orange-400 underline">cronograma oficial de SUNAT</a>{' '}
                  y actualízala aquí cada mes.
                </p>
                <button onClick={guardarVencimiento} disabled={guardandoVenc}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg py-1.5 disabled:opacity-50">
                  {guardandoVenc ? 'Guardando...' : 'Guardar fecha'}
                </button>
              </div>

              <div className="flex gap-2 flex-wrap">
                <select value={negocioFiltro} onChange={e => setNegocioFiltro(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300">
                  <option value="todos">Todos los negocios</option>
                  <option value="app">Jonah Beast Fuel (app)</option>
                  <option value="store">Jonah Beast Store</option>
                </select>
                <input type="month" value={mesFiltro} onChange={e => setMesFiltro(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300" />
                <button onClick={exportarCSV}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg px-3 py-1.5">
                  Exportar todo a Excel (CSV)
                </button>
                <button onClick={exportarLibroDiario}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg px-3 py-1.5">
                  Exportar Libro Diario Simplificado
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                  <div className="text-[11px] text-zinc-500 mb-0.5">Ventas del mes</div>
                  <div className="text-emerald-400 jb-display text-lg">S/ {ventas.toFixed(2)}</div>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                  <div className="text-[11px] text-zinc-500 mb-0.5">Compras del mes</div>
                  <div className="text-zinc-100 jb-display text-lg">S/ {compras.toFixed(2)}</div>
                </div>
                {regimen === 'rmt' && (
                  <>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                      <div className="text-[11px] text-zinc-500 mb-0.5">IGV estimado a pagar</div>
                      <div className="text-orange-400 jb-display text-lg">S/ {igvAPagar.toFixed(2)}</div>
                      {saldoAFavorSiguiente > 0 && (
                        <div className="text-[11px] text-emerald-400">S/ {saldoAFavorSiguiente.toFixed(2)} a favor para el próximo mes</div>
                      )}
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                      <div className="text-[11px] text-zinc-500 mb-0.5">Renta estimada (1%)</div>
                      <div className="text-orange-400 jb-display text-lg">S/ {rentaEstimada.toFixed(2)}</div>
                    </div>
                  </>
                )}
              </div>

              {regimen === 'nuevo_rus' && (
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                  <div className="text-[11px] text-zinc-500 mb-1">Categoría Nuevo RUS del mes</div>
                  {excedeRUS ? (
                    <p className="text-red-400 text-sm">
                      Superaste el límite de S/8,000 en ventas o compras este mes — ya no calificas para Nuevo RUS.
                      Deberías evaluar cambiar de régimen con SUNAT lo antes posible.
                    </p>
                  ) : (
                    <>
                      <div className="text-orange-400 jb-display text-lg">Categoría {categoriaRUS} · Cuota S/ {cuotaRUS}.00</div>
                      <div className="text-[11px] text-zinc-500 mt-1">
                        Según lo mayor entre ventas (S/ {ventas.toFixed(2)}) y compras (S/ {compras.toFixed(2)}) del mes.
                        Categoría 1: hasta S/5,000 → S/20. Categoría 2: hasta S/8,000 → S/50.
                      </div>
                    </>
                  )}
                  <p className="text-[11px] text-zinc-600 mt-2">
                    En Nuevo RUS no se paga IGV por separado ni Impuesto a la Renta mensual — solo esta cuota fija.
                    Tampoco aplica el Registro de Ventas/Compras del SIRE ni el Libro Diario Simplificado.
                  </p>
                </div>
              )}

              {regimen === 'rmt' && (
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                  <div className="text-[11px] text-zinc-500 mb-1">Acumulado {anio} · tope de 300 UIT (S/ {TOPE_300_UIT.toLocaleString('es-PE')})</div>
                  <div className="flex"><BarraBrillo pct={pctTope} /></div>
                  <div className="text-[11px] text-zinc-500 mt-1">S/ {ventasAnio.toFixed(2)} vendidos · {pctTope.toFixed(2)}% del tope</div>
                </div>
              )}

              {regimen === 'rmt' && (
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex flex-col gap-2">
                  <h3 className="jb-display text-sm text-zinc-300">Reparto entre socios (utilidad neta del mes)</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={socio1Nombre} onChange={e => setSocio1Nombre(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200" placeholder="Nombre socio 1" />
                    <input value={socio2Nombre} onChange={e => setSocio2Nombre(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200" placeholder="Nombre socio 2" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">% {socio1Nombre}:</span>
                    <input type="number" min="0" max="100" value={socio1Pct}
                      onChange={e => setSocio1Pct(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 w-20" />
                    <span className="text-xs text-zinc-500">% {socio2Nombre}: {pct2.toFixed(0)}%</span>
                  </div>
                  <p className="text-[11px] text-zinc-600">
                    Utilidad neta estimada del mes (ventas − compras − IGV − renta): S/ {utilidadNeta.toFixed(2)}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-zinc-900 rounded-lg p-2">
                      <div className="text-[11px] text-zinc-500">{socio1Nombre}</div>
                      <div className="text-emerald-400 jb-display text-sm">S/ {montoSocio1.toFixed(2)}</div>
                    </div>
                    <div className="bg-zinc-900 rounded-lg p-2">
                      <div className="text-[11px] text-zinc-500">{socio2Nombre}</div>
                      <div className="text-emerald-400 jb-display text-sm">S/ {montoSocio2.toFixed(2)}</div>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-600">
                  Referencial — el reparto real de dividendos en una SACS sigue las reglas del pacto social y puede tener retenciones tributarias adicionales (Impuesto a la Renta de 2da categoría por dividendos).
                </p>
                <button onClick={guardarSocios} disabled={guardandoSocios}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg py-1.5 disabled:opacity-50">
                  {guardandoSocios ? 'Guardando...' : 'Guardar reparto'}
                </button>
              </div>
              )}

              <form onSubmit={agregar} className="flex flex-col gap-2 bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                <h3 className="jb-display text-sm text-zinc-300">Agregar movimiento</h3>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200" />
                  <select value={form.negocio} onChange={e => setForm(f => ({ ...f, negocio: e.target.value }))}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200">
                    <option value="app">App</option>
                    <option value="store">Store</option>
                  </select>
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200">
                    <option value="ingreso">Ingreso</option>
                    <option value="gasto">Gasto</option>
                  </select>
                  <input type="number" step="0.01" placeholder="Monto S/" value={form.monto}
                    onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200" />
                </div>
                {form.tipo === 'gasto' && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] text-zinc-500">¿Qué fue?</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {CATEGORIAS_GASTO.map(c => (
                        <button key={c.id} type="button" onClick={() => setForm(f => ({ ...f, categoria: c.id }))}
                          className={`text-xs rounded-lg px-2.5 py-1.5 border ${form.categoria === c.id ? 'bg-orange-500 border-orange-500 text-zinc-950 font-semibold' : 'bg-zinc-900 border-zinc-800 text-zinc-300'}`}>
                          {c.emoji} {c.label}
                        </button>
                      ))}
                    </div>
                    {form.categoria === 'equipo' && (
                      <div className="flex flex-col gap-1.5 mt-1">
                        <span className="text-[11px] text-zinc-500">¿Cuántos años crees que te va a servir?</span>
                        <div className="flex gap-1.5">
                          {[1, 2, 3].map(a => (
                            <button key={a} type="button" onClick={() => setForm(f => ({ ...f, anios: a }))}
                              className={`text-xs rounded-lg px-3 py-1.5 border ${form.anios === a ? 'bg-orange-500 border-orange-500 text-zinc-950 font-semibold' : 'bg-zinc-900 border-zinc-800 text-zinc-300'}`}>
                              {a} {a === 1 ? 'año' : 'años'}
                            </button>
                          ))}
                        </div>
                        {parseFloat(form.monto) > 0 && (
                          <span className="text-[11px] text-zinc-400">Se contará como S/ {(parseFloat(form.monto) / (form.anios * 12)).toFixed(2)} al mes durante {form.anios} {form.anios === 1 ? 'año' : 'años'}.</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <input placeholder="Concepto (ej. Suscripciones de agosto)" value={form.concepto}
                  onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200" />
                <label className="flex items-center gap-2 text-xs text-zinc-400">
                  <input type="checkbox" checked={form.tieneComprobante}
                    onChange={e => setForm(f => ({ ...f, tieneComprobante: e.target.checked }))} />
                  Tiene comprobante (boleta/factura) con IGV
                </label>
                {form.tieneComprobante && (
                  <input type="number" step="0.01" placeholder="IGV exacto (opcional, si no lo estimo en 18%)"
                    value={form.igv} onChange={e => setForm(f => ({ ...f, igv: e.target.value }))}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200" />
                )}
                <input placeholder="Notas / otros conceptos que te pida SUNAT (opcional)" value={form.notas}
                  onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200" />
                {formErr && <p className="text-red-400 text-xs">{formErr}</p>}
                <button type="submit" disabled={guardando}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg py-2 disabled:opacity-50">
                  {guardando ? 'Guardando...' : 'Agregar movimiento'}
                </button>
              </form>

              <div>
                <h3 className="jb-display text-sm text-zinc-300 mb-2">Movimientos ({mesFiltro})</h3>
                <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
                  {movsFiltrados.length === 0 && <p className="text-zinc-500 text-xs">Sin movimientos este mes.</p>}
                  {movsFiltrados.map(m => (
                    <div key={m.id} className={`relative bg-zinc-950 border rounded-lg pl-4 pr-3 py-2 overflow-hidden flex justify-between items-center gap-2 ${m.tipo === 'ingreso' ? 'border-emerald-900/50' : 'border-red-900/50'}`}>
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${m.tipo === 'ingreso' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <div className="min-w-0">
                        <div className="text-zinc-200 text-xs truncate">{m.tipo === 'gasto' && (CATEGORIAS_GASTO.find(c => c.id === m.categoria)?.emoji || '📦')} {m.concepto} <span className="text-zinc-600">· {m.negocio}</span></div>
                        {m.tipo === 'gasto' && (
                          <select value={m.categoria || 'otro'} onChange={e => cambiarCategoria(m, e.target.value)}
                            className="mt-0.5 bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-[10px] text-zinc-400">
                            {CATEGORIAS_GASTO.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                          </select>
                        )}
                        {m.tipo === 'gasto' && m.meses_a_repartir && (
                          <span className="text-[10px] text-zinc-500 ml-1.5">repartido en {m.meses_a_repartir} meses</span>
                        )}
                        <div className="text-zinc-600 text-[11px]">{m.fecha} {m.tiene_comprobante ? '· con comprobante' : ''}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`jb-display text-sm ${m.tipo === 'ingreso' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {m.tipo === 'ingreso' ? '+' : '-'}S/ {parseFloat(m.monto).toFixed(2)}
                        </span>
                        <button onClick={() => eliminar(m.id)} className="text-zinc-600 hover:text-red-400">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function AdminNotifButton() {
  const [estado, setEstado] = useState('cargando'); // cargando | disponible | activo | bloqueado | nosoportado
  const [trabajando, setTrabajando] = useState(false);

  useEffect(() => {
    (async () => {
      if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        setEstado('nosoportado'); return;
      }
      if (Notification.permission === 'denied') { setEstado('bloqueado'); return; }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!sub) { setEstado('disponible'); return; }
        // Que el navegador tenga una suscripción activa no basta: puede
        // ser la de otra cuenta (ej. una sesión de alumno en el mismo
        // celular). Confirmamos en la base de datos que ESE endpoint
        // específico está registrado a nombre del admin.
        const { data } = await supabase.from('push_subs').select('username')
          .eq('endpoint', sub.endpoint).eq('username', 'jonabeast').eq('activa', true).maybeSingle();
        setEstado(data ? 'activo' : 'disponible');
      } catch { setEstado('disponible'); }
    })();
  }, []);

  async function activar() {
    setTrabajando(true);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== 'granted') {
        setEstado(permiso === 'denied' ? 'bloqueado' : 'disponible');
        setTrabajando(false);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64ToUint8(VAPID_PUBLIC),
        });
      }
      // Sin importar si el celular ya tenía una suscripción de otra
      // cuenta, siempre registramos (o actualizamos) esta MISMA
      // suscripción a nombre del admin — así queda garantizado que
      // exista la fila 'jonabeast', no solo "algo" activo.
      const j = sub.toJSON();
      const { error } = await supabase.from('push_subs').upsert({
        username: 'jonabeast',
        endpoint: j.endpoint,
        p256dh: j.keys.p256dh,
        auth: j.keys.auth,
        activa: true,
      }, { onConflict: 'endpoint' });
      if (error) throw error;
      setEstado('activo');
    } catch (e) { setEstado('disponible'); }
    setTrabajando(false);
  }

  if (estado === 'nosoportado' || estado === 'cargando') return null;
  if (estado === 'activo') {
    return <span className="jb-body text-xs text-emerald-400 flex items-center gap-1.5 whitespace-nowrap">🔔 <span className="hidden sm:inline">Notificaciones </span>Activas</span>;
  }
  if (estado === 'bloqueado') {
    return <span className="jb-body text-xs text-zinc-600">🔕 Notificaciones bloqueadas (revisa permisos del navegador)</span>;
  }
  return (
    <button onClick={activar} disabled={trabajando} className={btnGhost + ' text-xs py-1.5 px-3'}>
      {trabajando ? <Loader2 className="animate-spin" size={14} /> : '🔔 Activar avisos de alumnos nuevos'}
    </button>
  );
}

// Productos escaneados por código de barras (tabla productos). Salen de
// Open Food Facts o de la etiqueta que leyó la IA; aquí Jonah revisa los
// más recientes y corrige los números si alguno se leyó mal. El nombre no
// se cambia: los alumnos que ya lo registraron lo tienen guardado así.
const FUENTES_PRODUCTO = { open_food_facts: 'Open Food Facts', etiqueta: 'Etiqueta (IA)', admin: 'Admin' };

function ProductosPanel() {
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState(null); // { codigo, kcal, proteina, carbos, grasa, fibra, porcion_g }
  const [error, setError] = useState('');

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    const { data } = await supabase.from('productos').select('*').order('creado_en', { ascending: false }).limit(200);
    setFilas(data || []);
    setCargando(false);
  }

  async function guardar() {
    setError('');
    const n = k => Number(editando[k]);
    if (![n('kcal'), n('proteina'), n('carbos'), n('grasa')].every(v => Number.isFinite(v) && v >= 0) || n('kcal') > 900) {
      setError('Revisa los números (por 100 g).'); return;
    }
    const cambios = {
      kcal: n('kcal'), proteina: n('proteina'), carbos: n('carbos'), grasa: n('grasa'), fibra: Number(editando.fibra) || 0,
      porcion_g: Number(editando.porcion_g) > 0 ? Number(editando.porcion_g) : null, actualizado_en: new Date().toISOString(),
    };
    const { error: err } = await supabase.from('productos').update(cambios).eq('codigo', editando.codigo);
    if (err) { setError('No se pudo guardar: ' + err.message); return; }
    setFilas(fs => fs.map(f => f.codigo === editando.codigo ? { ...f, ...cambios } : f));
    setEditando(null);
  }

  const deEtiqueta = filas.filter(f => f.fuente === 'etiqueta').length;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <button onClick={() => setAbierto(v => !v)} className="w-full px-5 py-4 flex items-center justify-between text-left">
        <h2 className="jb-display text-base text-zinc-200">📦 PRODUCTOS ESCANEADOS · {filas.length}</h2>
        <ChevronRight size={18} className={`text-zinc-500 transition-transform ${abierto ? 'rotate-90' : ''}`} />
      </button>
      {abierto && (
        <div className="px-5 pb-5 border-t border-zinc-800 pt-4 flex flex-col gap-3">
          <p className="jb-body text-xs text-zinc-500">
            Productos que los alumnos registraron con el código de barras. Los de "Etiqueta (IA)" ({deEtiqueta}) los leyó la IA de la foto de la tabla nutricional: revisa que los números tengan sentido. Valores por 100 g.
          </p>
          {cargando ? <Loader2 className="animate-spin text-orange-500" size={20} /> : filas.length === 0 ? (
            <p className="jb-body text-sm text-zinc-500">Aún nadie escaneó productos.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-[28rem] overflow-y-auto">
              {filas.map(f => {
                const kcalMacros = Math.round(4 * Number(f.proteina) + 4 * Number(f.carbos) + 9 * Number(f.grasa));
                const raro = Number(f.kcal) > 0 && Math.abs(kcalMacros - Number(f.kcal)) > Math.max(30, Number(f.kcal) * 0.2);
                const enEdicion = editando?.codigo === f.codigo;
                return (
                  <div key={f.codigo} className={`bg-zinc-950 border rounded-lg p-3 ${raro ? 'border-amber-700/60' : 'border-zinc-800'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="jb-body text-sm text-zinc-100 font-medium">{f.nombre}{f.marca ? <span className="text-zinc-500"> · {f.marca}</span> : null}</p>
                        <p className="jb-body text-[11px] text-zinc-500 tabular-nums">
                          {Math.round(f.kcal)} kcal · P {f.proteina} · C {f.carbos} · G {f.grasa}{Number(f.porcion_g) > 0 ? ` · porción ${Math.round(f.porcion_g)} g` : ''}
                        </p>
                        <p className="jb-body text-[11px] text-zinc-600">
                          {FUENTES_PRODUCTO[f.fuente] || f.fuente}{f.creado_por ? ` · ${f.creado_por}` : ''} · usado {f.veces_usado || 0} {f.veces_usado === 1 ? 'vez' : 'veces'} · {f.codigo}
                        </p>
                        {raro && <p className="jb-body text-[11px] text-amber-400 mt-0.5">Ojo: con esos macros saldrían ~{kcalMacros} kcal. Revisa los números.</p>}
                      </div>
                      {!enEdicion && (
                        <button onClick={() => { setError(''); setEditando({ codigo: f.codigo, kcal: f.kcal, proteina: f.proteina, carbos: f.carbos, grasa: f.grasa, fibra: f.fibra, porcion_g: f.porcion_g || '' }); }}
                          className={btnGhost + ' py-1 px-3 text-xs shrink-0'}>Corregir</button>
                      )}
                    </div>
                    {enEdicion && (
                      <div className="mt-3 flex flex-col gap-2">
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                          {[['kcal', 'Kcal'], ['proteina', 'Prot.'], ['carbos', 'Carbos'], ['grasa', 'Grasa'], ['fibra', 'Fibra'], ['porcion_g', 'Porción g']].map(([k, t]) => (
                            <label key={k} className="jb-body text-[11px] text-zinc-500">{t}
                              <input type="number" inputMode="decimal" min="0" value={editando[k] ?? ''} onChange={e => setEditando(v => ({ ...v, [k]: e.target.value }))}
                                className={inputCls + ' w-full text-sm mt-0.5 px-2 tabular-nums'} />
                            </label>
                          ))}
                        </div>
                        {error && <p className="jb-body text-xs text-red-400">{error}</p>}
                        <div className="flex gap-2">
                          <button onClick={guardar} className={btnPrimary + ' text-sm py-1.5 flex-1'}>Guardar</button>
                          <button onClick={() => setEditando(null)} className={btnGhost + ' text-sm py-1.5'}>Cancelar</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Memoria de Jarvis: las notas que Jonah le pidió recordar ("recuerda
// que..."). Jarvis solo guarda cuando se lo piden; aquí se ven y se borran.
function MemoriaJarvisPanel() {
  const [notas, setNotas] = useState(null);
  async function cargar() {
    const { data } = await supabase.from('jarvis_memoria').select('id, texto, creado_en').order('creado_en', { ascending: true });
    setNotas(data || []);
  }
  useEffect(() => { cargar().catch(() => setNotas([])); }, []);
  async function borrar(n) {
    if (!confirm(`¿Borrar esta nota de la memoria de Jarvis?\n\n"${n.texto}"`)) return;
    const { error } = await supabase.from('jarvis_memoria').delete().eq('id', n.id);
    if (error) { alert('No se pudo borrar: ' + error.message); return; }
    cargar();
  }
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3">
      <div>
        <h2 className="jb-display text-base text-zinc-200">🧠 LO QUE JARVIS RECUERDA</h2>
        <p className="jb-body text-[11px] text-zinc-500 mt-0.5">Dile a Jarvis "recuerda que…" para enseñarle algo, u "olvida que…" para borrarlo. Solo guarda lo que tú le pides.</p>
      </div>
      {notas === null ? <Loader2 className="animate-spin text-orange-500" size={18} />
        : notas.length === 0 ? <p className="jb-body text-xs text-zinc-500">Todavía no recuerda nada.</p>
        : (
          <div className="flex flex-col gap-1.5">
            {notas.map(n => (
              <div key={n.id} className="flex items-start justify-between gap-3 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <div className="jb-body text-sm text-zinc-200">{n.texto}</div>
                  <div className="jb-body text-[10px] text-zinc-600">Nota {n.id} · {String(n.creado_en).slice(0, 10)}</div>
                </div>
                <button onClick={() => borrar(n)} className="text-zinc-600 hover:text-red-400 shrink-0 mt-0.5" aria-label="Borrar nota"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

// Precisión de la IA de fotos: compara lo que calculó la IA con lo que
// el alumno terminó registrando (tabla reconocimiento_foto_feedback).
// Si el alumno no corrige nada, cuenta como acierto aunque no haya pesado:
// por eso sirve para ver tendencias, no casos sueltos.
function PrecisionIAPanel() {
  const [filas, setFilas] = useState(null);

  useEffect(() => {
    let cancelado = false;
    supabase.from('reconocimiento_foto_feedback')
      .select('sugeridos, descartados, created_at')
      .order('created_at', { ascending: false }).limit(1000)
      // Las correcciones hechas después en la lista no son fotos nuevas:
      // no cuentan para la precisión.
      .then(({ data }) => { if (!cancelado) setFilas((data || []).filter(f => !(f.sugeridos || []).every(s => s?.despues))); }, () => { if (!cancelado) setFilas([]); });
    return () => { cancelado = true; };
  }, []);

  if (filas === null) {
    return <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5"><Loader2 className="animate-spin text-orange-500" size={20} /></div>;
  }

  let sugeridos = 0, descartados = 0;
  const gramos = [];
  const porAlimento = {};
  filas.forEach(f => {
    const fuera = new Set(f.descartados || []);
    (f.sugeridos || []).forEach(it => {
      if (!it?.key) return;
      sugeridos++;
      if (fuera.has(it.key)) { descartados++; return; }
      const ia = Number(it.gramos_ia), fin = Number(it.gramos_final);
      if (!(ia > 0 && fin > 0)) return;
      const desvio = (ia - fin) / fin;
      gramos.push(desvio);
      const a = porAlimento[it.key] || (porAlimento[it.key] = []);
      a.push(desvio);
    });
  });
  const promedio = arr => arr.reduce((x, y) => x + y, 0) / arr.length;
  const pct = v => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`;
  const aciertoPlato = sugeridos ? Math.round(((sugeridos - descartados) / sugeridos) * 100) : null;
  const sesgo = gramos.length ? promedio(gramos) : null;
  const dentro = gramos.length ? Math.round((gramos.filter(d => Math.abs(d) <= 0.15).length / gramos.length) * 100) : null;
  const corregidos = gramos.length ? Math.round((gramos.filter(d => Math.abs(d) > 0.01).length / gramos.length) * 100) : null;
  const ranking = Object.entries(porAlimento)
    .filter(([, arr]) => arr.length >= 2)
    .map(([key, arr]) => ({ key, n: arr.length, sesgo: promedio(arr) }))
    .filter(r => Math.abs(r.sesgo) >= 0.05)
    .sort((a, b) => Math.abs(b.sesgo) - Math.abs(a.sesgo))
    .slice(0, 6);
  const colorSesgo = v => Math.abs(v) <= 0.15 ? 'text-emerald-400' : Math.abs(v) <= 0.3 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4">
      <div>
        <h2 className="jb-display text-base text-zinc-200">🎯 PRECISIÓN DE LA IA</h2>
        <p className="jb-body text-[11px] text-zinc-500 mt-0.5">
          Lo que calculó la IA vs. lo que el alumno terminó registrando, en {filas.length} fotos. Si el alumno no corrige, cuenta como acierto: mira las tendencias, no casos sueltos.
        </p>
      </div>
      {sugeridos === 0 ? (
        <p className="jb-body text-xs text-zinc-500">Aún no hay fotos registradas.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { v: aciertoPlato === null ? '—' : `${aciertoPlato}%`, l: 'Acierta el alimento', sub: `${sugeridos - descartados} de ${sugeridos} sugerencias se quedaron`, c: aciertoPlato >= 80 ? 'text-emerald-400' : 'text-amber-400' },
              { v: sesgo === null ? '—' : pct(sesgo), l: 'Error promedio en gramos', sub: sesgo === null ? 'sin datos de gramos' : sesgo > 0 ? 'calcula de más' : 'calcula de menos', c: sesgo === null ? 'text-zinc-400' : colorSesgo(sesgo) },
              { v: dentro === null ? '—' : `${dentro}%`, l: 'Gramos casi exactos', sub: 'a menos de 15% de lo registrado', c: dentro >= 70 ? 'text-emerald-400' : 'text-amber-400' },
              { v: corregidos === null ? '—' : `${corregidos}%`, l: 'Alumnos que corrigen', sub: 'cambiaron la cantidad de la IA', c: 'text-zinc-50' },
            ].map(t => (
              <div key={t.l} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                <div className={`jb-display text-xl ${t.c}`}>{t.v}</div>
                <div className="jb-body text-[11px] text-zinc-300 leading-tight mt-0.5">{t.l}</div>
                <div className="jb-body text-[10px] text-zinc-500 leading-tight mt-0.5">{t.sub}</div>
              </div>
            ))}
          </div>
          <div>
            <h3 className="jb-display text-sm text-zinc-300 mb-1.5">DONDE MÁS SE EQUIVOCA CON LOS GRAMOS</h3>
            {ranking.length === 0 ? (
              <p className="jb-body text-xs text-zinc-500">Todavía no hay alimentos con 2 o más correcciones para comparar.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {ranking.map(r => (
                  <div key={r.key} className="flex justify-between items-center bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5">
                    <span className="jb-body text-xs text-zinc-200 truncate">{buscarFood(r.key)?.name || r.key} <span className="text-zinc-500">· {r.n} fotos</span></span>
                    <span className={`jb-display text-sm shrink-0 ${colorSesgo(r.sesgo)}`}>{pct(r.sesgo)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Una corrección ("la IA dijo X → era Y") se aplica a las fotos de TODOS
// cuando la hicieron 3 alumnos distintos (igual que en reconocer-comida).
// Jonah puede apagar una: queda en config "correcciones_ia_off" ("X→Y").
const MIN_ALUMNOS_CORRECCION = 3;

function ReconocimientoFotoPanel() {
  const [filas, setFilas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [apagadas, setApagadas] = useState([]);
  const [guardandoRegla, setGuardandoRegla] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await supabase.from('reconocimiento_foto_feedback')
        .select('username, sugeridos, descartados, created_at')
        .order('created_at', { ascending: false })
        .limit(3000);
      setFilas(data || []);
    } catch { setFilas([]); }
    try {
      const { data } = await supabase.from('config').select('value').eq('key', 'correcciones_ia_off').maybeSingle();
      const lista = JSON.parse(data?.value || '[]');
      setApagadas(Array.isArray(lista) ? lista : []);
    } catch { setApagadas([]); }
    setLoading(false);
  }

  async function alternarRegla(id) {
    const nueva = apagadas.includes(id) ? apagadas.filter(x => x !== id) : [...apagadas, id];
    setGuardandoRegla(id);
    const { error } = await supabase.from('config').upsert({ key: 'correcciones_ia_off', value: JSON.stringify(nueva) });
    setGuardandoRegla('');
    if (error) return alert('No se pudo guardar: ' + (error.message || 'Intenta de nuevo.'));
    setApagadas(nueva);
  }

  // Agrupa por alimento: cuántas veces lo sugirió la IA vs. cuántas
  // veces el alumno lo desmarcó (la IA se equivocó, según el alumno).
  const conteo = {};
  filas.forEach(f => {
    const descartadosSet = new Set(f.descartados || []);
    (f.sugeridos || []).forEach(it => {
      if (!it?.key) return;
      if (!conteo[it.key]) conteo[it.key] = { sugerido: 0, descartado: 0 };
      conteo[it.key].sugerido++;
      if (descartadosSet.has(it.key)) conteo[it.key].descartado++;
    });
  });
  const filasOrdenadas = Object.entries(conteo)
    .map(([key, c]) => ({ key, ...c, tasa: c.descartado / c.sugerido }))
    .sort((a, b) => b.descartado - a.descartado || b.tasa - a.tasa);

  const totalSugerencias = filasOrdenadas.reduce((s, f) => s + f.sugerido, 0);
  const totalDescartes = filasOrdenadas.reduce((s, f) => s + f.descartado, 0);
  const tasaGeneral = totalSugerencias ? Math.round((totalDescartes / totalSugerencias) * 100) : 0;

  // Porciones (desde que la IA calcula gramos): cuántas veces el alumno
  // dejó la porción "Normal" que calculó la IA y cuántas la cambió.
  const porciones = { total: 0, normal: 0, poco: 0, mucho: 0, piezas: 0, aceite: 0, conAceite: 0 };
  filas.forEach(f => (f.sugeridos || []).forEach(it => {
    if (!it?.gramos_final) return;
    if (it.aceite) { porciones.conAceite++; if (it.aceite !== 'normal') porciones.aceite++; }
    if (it.piezas_corregidas) { porciones.piezas++; return; }
    if (!it.gramos_ia) return;
    porciones.total++;
    porciones[it.tamano === 'poco' ? 'poco' : it.tamano === 'mucho' ? 'mucho' : 'normal']++;
  }));
  const pctPorcion = n => porciones.total ? Math.round((n / porciones.total) * 100) : 0;

  // "No es esto": lo que la IA dijo (X) y lo que el alumno eligió (Y), con
  // cuántos alumnos distintos lo corrigieron. Con 3 o más, la IA lo usa en
  // las fotos de todos (salvo que Jonah lo apague aquí). Últimos 180 días.
  const desde180 = new Date(Date.now() - 180 * 86400000).toISOString();
  const confusiones = {};
  filas.filter(f => String(f.created_at) >= desde180).forEach(f => {
    (f.sugeridos || []).forEach(it => {
      if (!it?.key || !it?.corregido_a || it.key === it.corregido_a) return;
      const id = `${it.key}→${it.corregido_a}`;
      const c = confusiones[id] || (confusiones[id] = { id, de: it.key, a: it.corregido_a, alumnos: new Set(), veces: 0 });
      c.veces++;
      if (f.username) c.alumnos.add(f.username);
    });
  });
  const listaConfusiones = Object.values(confusiones)
    .sort((x, y) => y.alumnos.size - x.alumnos.size || y.veces - x.veces).slice(0, 20);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full px-5 py-4 flex items-center justify-between text-left">
        <h2 className="jb-display text-base text-zinc-200">📸 RECONOCER POR FOTO · {filas.length} confirmaciones registradas</h2>
        <ChevronRight size={18} className={`text-zinc-500 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 flex flex-col gap-4 border-t border-zinc-800 pt-4">
          <div className="flex items-center justify-between">
            <p className="jb-body text-xs text-zinc-500">
              Qué sugirió la IA vs. qué terminaron desmarcando los alumnos. Útil para detectar qué confunde seguido, no fotos sueltas.
            </p>
            <button onClick={load} className={btnGhost + ' py-1 px-3 text-xs shrink-0 ml-2'}>Actualizar</button>
          </div>

          {loading ? (
            <Loader2 className="animate-spin text-orange-500" size={20} />
          ) : filas.length === 0 ? (
            <p className="text-zinc-500 text-sm">Aún no hay confirmaciones registradas.</p>
          ) : (
            <>
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300">
                {totalSugerencias} sugerencias en total · {totalDescartes} desmarcadas · tasa general de descarte: <span className={tasaGeneral > 20 ? 'text-red-400' : 'text-emerald-400'}>{tasaGeneral}%</span>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 jb-body text-sm text-zinc-300">
                <p className="text-zinc-200 font-semibold mb-1">⚖️ ¿Acierta con la porción?</p>
                {porciones.total === 0 ? (
                  <p className="text-xs text-zinc-500">Aún no hay datos. Se empieza a medir con las fotos nuevas, desde que la IA calcula los gramos.</p>
                ) : (
                  <>
                    <p className="text-xs text-zinc-400">
                      En {porciones.total} alimentos, el alumno dejó la porción que calculó la IA en{' '}
                      <span className={pctPorcion(porciones.normal) >= 70 ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>{pctPorcion(porciones.normal)}%</span> de los casos.
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      La bajó a "Poco": {pctPorcion(porciones.poco)}% · la subió a "Mucho": {pctPorcion(porciones.mucho)}%
                      {porciones.piezas > 0 && ` · corrigió las piezas ${porciones.piezas} ${porciones.piezas === 1 ? 'vez' : 'veces'}`}
                      {porciones.conAceite > 0 && ` · marcó más aceite en ${porciones.aceite} de ${porciones.conAceite} fritos/saltados`}
                    </p>
                  </>
                )}
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 jb-body text-sm text-zinc-300">
                <p className="text-zinc-200 font-semibold mb-1">✏️ Correcciones frecuentes (la IA aprende de los alumnos)</p>
                <p className="text-[11px] text-zinc-500 mb-2">
                  Cuando {MIN_ALUMNOS_CORRECCION} alumnos distintos o más hacen la misma corrección, la IA la tiene en cuenta en las fotos de todos. Si una no te parece correcta, apágala.
                </p>
                {listaConfusiones.length === 0 ? (
                  <p className="text-xs text-zinc-500">Aún no hay correcciones. Aparecen cuando un alumno toca "✏️ No es esto" en una foto.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {listaConfusiones.map(c => {
                      const apagada = apagadas.includes(c.id);
                      const n = c.alumnos.size;
                      const paraTodos = !apagada && n >= MIN_ALUMNOS_CORRECCION;
                      return (
                        <div key={c.id} className="flex items-center gap-2 border border-zinc-800 rounded-lg px-2.5 py-1.5">
                          <p className="flex-1 min-w-0 text-xs text-zinc-400">
                            La IA dijo <span className="text-zinc-200">{buscarFood(c.de)?.name || c.de}</span> → era{' '}
                            <span className="text-orange-400 font-semibold">{buscarFood(c.a)?.name || c.a}</span>{' '}
                            <span className="text-zinc-500">· {n} {n === 1 ? 'alumno' : 'alumnos'}</span>
                            <span className={`block text-[10px] mt-0.5 ${apagada ? 'text-zinc-500' : paraTodos ? 'text-emerald-400' : 'text-zinc-500'}`}>
                              {apagada ? '⏸ Apagada por ti' : paraTodos ? '✅ La IA la usa para todos' : `Solo para quien la corrigió (${n} de ${MIN_ALUMNOS_CORRECCION} para todos)`}
                            </span>
                          </p>
                          <button type="button" disabled={guardandoRegla === c.id} onClick={() => alternarRegla(c.id)}
                            className="shrink-0 text-[11px] px-2.5 py-1 rounded-lg border border-zinc-700 text-zinc-300 hover:border-orange-500 disabled:opacity-50">
                            {apagada ? 'Activar' : 'Apagar'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5 max-h-96 overflow-y-auto">
                {filasOrdenadas.map(f => {
                  const food = buscarFood(f.key);
                  const pct = Math.round(f.tasa * 100);
                  return (
                    <div key={f.key} className="flex items-center justify-between gap-3 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2">
                      <span className="text-zinc-200 text-sm flex-1 truncate">{food?.name || f.key}</span>
                      <span className="text-zinc-500 text-xs shrink-0">{f.sugerido} sugerido{f.sugerido !== 1 ? 's' : ''}</span>
                      <span className={`text-xs shrink-0 font-medium ${pct > 30 ? 'text-red-400' : pct > 0 ? 'text-amber-400' : 'text-emerald-500'}`}>
                        {f.descartado} descartado{f.descartado !== 1 ? 's' : ''} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* Embudo de la landing: cuántas PERSONAS ven la página, cuántas tocan
   el botón de prueba gratis y cuántas terminan de registrarse -- así se
   puede saber si un problema es de diseño (poca gente convierte) o de
   tráfico (nadie ve la página en primer lugar, o llegan bots). */

// Día en que empezó a guardarse el embudo (antes no hay datos).
const INICIO_EMBUDO = '2026-09-23T00:00:00.000Z';

// Supabase entrega como máximo 1000 filas por consulta; pedimos en
// bloques hasta traer todo el periodo.
async function traerEventosEmbudo(desde) {
  const filas = [];
  for (let desdeFila = 0; ; desdeFila += 1000) {
    const { data, error } = await supabase.from('embudo_landing_eventos')
      .select('id, evento, fuente, visitante_id, username, detalle')
      .gte('creado_en', desde)
      .order('creado_en', { ascending: true })
      .range(desdeFila, desdeFila + 999);
    if (error) throw error;
    filas.push(...(data || []));
    if (!data || data.length < 1000) return filas;
  }
}

const MOTIVOS_TROPIEZO = {
  correo_vacio: 'No escribió su correo',
  correo_invalido: 'Correo mal escrito',
  contrasena_corta: 'Contraseña de menos de 6 caracteres',
  contrasena_rechazada: 'Contraseña rechazada por ser muy común',
  correo_existente: 'Ese correo ya tenía cuenta',
  referido_invalido: 'Código de referido que no existe',
  error_usuario: 'Error al preparar la cuenta',
  error_sistema: 'Error del sistema',
  google: 'Falló o canceló el ingreso con Google',
};

function resumirEmbudo(filas) {
  const pasos = () => ({ vistas: 0, visitantes: new Set(), clics: new Set(), registros: new Set(), usuarios: new Set(), demos: new Set(), demosResultado: new Set(), recorrido: {}, recorridoPlan: new Set(), recorridoCuenta: new Set(), recorridoWhatsapp: new Set(), calc: new Set(), calcWhatsapp: new Set() });
  const total = pasos();
  const porFuente = {};
  // Tropiezos del registro (evento 'error_registro'): motivo -> personas.
  const tropiezos = {};
  let conGoogle = 0;
  filas.forEach(r => {
    if (r.evento === 'error_registro') {
      const motivo = String(r.detalle || 'otro').replace(/:.*$/, '');
      (tropiezos[motivo] = tropiezos[motivo] || new Set()).add(r.visitante_id || ('evento-' + r.id));
      return;
    }
    if (r.evento === 'registro' && r.detalle === 'google') conGoogle++;
    // Los eventos anteriores a esta versión no tienen visitante: cada uno
    // cuenta como una persona distinta.
    const quien = r.visitante_id || ('evento-' + r.id);
    const f = (porFuente[r.fuente] = porFuente[r.fuente] || pasos());
    [total, f].forEach(g => {
      if (r.evento === 'vista') { g.vistas++; g.visitantes.add(quien); }
      else if (r.evento === 'clic_cta') g.clics.add(quien);
      else if (r.evento === 'demo_abrir') g.demos.add(quien);
      else if (r.evento === 'demo_resultado') g.demosResultado.add(quien);
      // Recorrido antes del registro: cuántos llegan a cada paso.
      else if (r.evento === 'recorrido') (g.recorrido[r.detalle] = g.recorrido[r.detalle] || new Set()).add(quien);
      else if (r.evento === 'recorrido_plan') g.recorridoPlan.add(quien);
      else if (r.evento === 'recorrido_cuenta') g.recorridoCuenta.add(quien);
      else if (r.evento === 'recorrido_whatsapp') g.recorridoWhatsapp.add(quien);
      else if (r.evento === 'calculadora_resultados') g.calc.add(quien);
      else if (r.evento === 'calculadora_whatsapp') g.calcWhatsapp.add(quien);
      else if (r.evento === 'registro') { g.registros.add(quien); if (r.username) g.usuarios.add(r.username); }
    });
  });
  const numeros = g => ({
    vistas: g.vistas, visitantes: g.visitantes.size, clics: g.clics.size, registros: g.registros.size, usuarios: [...g.usuarios], demos: g.demos.size, demosResultado: g.demosResultado.size,
    recorrido: Object.fromEntries(Object.entries(g.recorrido).map(([k, v]) => [k, v.size])), recorridoPlan: g.recorridoPlan.size, recorridoCuenta: g.recorridoCuenta.size, recorridoWhatsapp: g.recorridoWhatsapp.size, calc: g.calc.size, calcWhatsapp: g.calcWhatsapp.size,
  });
  return {
    ...numeros(total),
    conGoogle,
    tropiezos: Object.entries(tropiezos).map(([m, set]) => [m, set.size]).sort((a, b) => b[1] - a[1]),
    fuentes: Object.entries(porFuente).map(([k, g]) => [k, numeros(g)]).sort((a, b) => b[1].visitantes - a[1].visitantes),
  };
}

/* De los usuarios que se registraron desde la landing, en qué están hoy:
   si ya tienen cuenta de alumno (confirmaron su correo), si siguen en
   prueba, si ya pagaron o si la prueba se les terminó sin pagar. */
function cohorteRegistros(usuarios, alumnoPorUsuario, hoy) {
  const r = { conCuenta: 0, enPrueba: 0, pagaron: 0, sinPagar: 0 };
  usuarios.forEach(u => {
    const a = alumnoPorUsuario[u.toLowerCase()];
    if (!a) return;
    r.conCuenta++;
    const activo = a.enabled && !(a.fecha_vencimiento && a.fecha_vencimiento < hoy);
    if (a.plan === 'pago') r.pagaron++;
    else if (activo) r.enPrueba++;
    else r.sinPagar++;
  });
  return r;
}

/* Tarjeta única del embudo (pestaña HOY): visita → clic → registro →
   empezó la prueba → pagó, siguiendo a las MISMAS personas. Abajo, la
   foto de hoy (en prueba / pagando / vencidos), el desglose por fuente y
   la evolución que guarda cada noche el cron embudo-historico. */
function EmbudoResumenPanel() {
  const [dias, setDias] = useState(7);
  const [datos, setDatos] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verFuentes, setVerFuentes] = useState(false);
  const [verHistorial, setVerHistorial] = useState(false);

  useEffect(() => { load(); }, [dias]);

  async function load() {
    setLoading(true);
    const desdeSolicitado = new Date(Date.now() - dias * 86400000).toISOString();
    const desde = desdeSolicitado > INICIO_EMBUDO ? desdeSolicitado : INICIO_EMBUDO;
    try {
      const [eventos, { data: alumnos }, { count: leads }, { data: hist }] = await Promise.all([
        traerEventosEmbudo(desde),
        supabase.from('alumnos').select('username, plan, enabled, fecha_vencimiento'),
        supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', desde),
        supabase.from('embudo_historico')
          .select('fecha, visitantes, clics, registros, en_prueba, pagando')
          .order('fecha', { ascending: false }).limit(14),
      ]);
      const hoy = todayISO();
      const alumnoPorUsuario = {};
      // Foto de hoy, mismo criterio que el cron embudo-historico.
      let enPruebaHoy = 0, pagandoHoy = 0, vencidosHoy = 0;
      (alumnos || []).forEach(a => {
        alumnoPorUsuario[(a.username || '').toLowerCase()] = a;
        if (!a.enabled || (a.fecha_vencimiento && a.fecha_vencimiento < hoy)) { vencidosHoy++; return; }
        if (a.plan === 'trial' || a.plan === 'prueba') enPruebaHoy++;
        else if (a.plan === 'pago') pagandoHoy++;
      });
      const resumen = resumirEmbudo(eventos);
      setDatos({
        ...resumen,
        cohorte: cohorteRegistros(resumen.usuarios, alumnoPorUsuario, hoy),
        fuentes: resumen.fuentes.map(([f, v]) => [f, { ...v, cohorte: cohorteRegistros(v.usuarios, alumnoPorUsuario, hoy) }]),
        enPruebaHoy, pagandoHoy, vencidosHoy, leads: leads || 0,
      });
      setHistorial(hist || []);
    } catch { setDatos(null); }
    setLoading(false);
  }

  const pct = (num, den) => den ? Math.round((num / den) * 100) + '%' : '—';
  const celda = v => (v === null || v === undefined) ? '—' : v;

  const PASOS = datos ? [
    { valor: datos.visitantes, label: 'Visitaron la landing', color: 'text-zinc-100' },
    { valor: datos.clics, label: 'Tocaron el botón', color: 'text-orange-400', paso: pct(datos.clics, datos.visitantes) },
    { valor: datos.registros, label: 'Se registraron', color: 'text-orange-300', paso: pct(datos.registros, datos.clics) },
    { valor: datos.cohorte.conCuenta, label: 'Empezaron la prueba', color: 'text-sky-400', paso: pct(datos.cohorte.conCuenta, datos.registros) },
    { valor: datos.cohorte.pagaron, label: 'Pagaron', color: 'text-emerald-400', paso: pct(datos.cohorte.pagaron, datos.cohorte.conCuenta) },
  ] : [];
  const registrosSinSeguimiento = datos ? datos.registros - datos.usuarios.length : 0;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h2 className="jb-display text-base text-zinc-200">🎯 EMBUDO</h2>
        <div className="flex gap-1.5">
          {[1, 7, 30].map(d => (
            <button key={d} onClick={() => setDias(d)}
              className={`jb-body text-xs whitespace-nowrap px-2.5 py-1 rounded-lg transition-colors ${dias === d ? 'bg-orange-500 text-zinc-950 font-semibold' : 'bg-zinc-950 text-zinc-400 border border-zinc-800'}`}>
              {d === 1 ? '24 h' : `${d} días`}
            </button>
          ))}
        </div>
      </div>
      <p className="jb-body text-[10px] text-zinc-600 mb-3">
        Las mismas personas paso a paso: quienes llegaron a la landing en este periodo, hasta si pagaron. Sin tus visitas ni la versión de prueba.
      </p>

      {loading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : !datos ? (
        <p className="jb-body text-xs text-zinc-500">No se pudo cargar el embudo. Toca otro periodo para reintentar.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Prueba sin cuenta desde la portada ("Pruébala ya con tu plato"). */}
          <p className="jb-body text-xs text-zinc-400">
            📸 Probaron la foto sin cuenta: <span className="text-zinc-100 font-semibold tabular-nums">{datos.demos}</span>
            {' · '}vieron el resultado de su plato: <span className="text-zinc-100 font-semibold tabular-nums">{datos.demosResultado}</span>
          </p>
          {datos.calc > 0 && (
            <p className="jb-body text-xs text-zinc-400">
              📏 Calculadora sin registro: vieron sus resultados <span className="text-zinc-100 font-semibold tabular-nums">{datos.calc}</span>
              {' · '}pidieron su % de grasa por WhatsApp <span className="text-zinc-100 font-semibold tabular-nums">{datos.calcWhatsapp}</span>
            </p>
          )}
          {/* "Tu cambio empieza aquí": objetivo, datos y su plan antes de crear la cuenta. */}
          {Object.keys(datos.recorrido || {}).length > 0 && (
            <p className="jb-body text-xs text-zinc-400">
              🧭 Recorrido antes del registro:{' '}
              {[['1', 'objetivo'], ['2', 'sexo y edad'], ['3', 'estatura y peso'], ['4', 'actividad'], ['5', 'peso meta']]
                .filter(([k]) => datos.recorrido[k]).map(([k, t]) => `${t} ${datos.recorrido[k]}`).join(' → ')}
              {' → '}vieron su plan <span className="text-zinc-100 font-semibold tabular-nums">{datos.recorridoPlan}</span>
              {' → '}tocaron crear cuenta <span className="text-zinc-100 font-semibold tabular-nums">{datos.recorridoCuenta}</span>
              {' · '}📲 pidieron su plan por WhatsApp <span className="text-zinc-100 font-semibold tabular-nums">{datos.recorridoWhatsapp}</span>
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            {PASOS.map(p => (
              <div key={p.label} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                <span className="jb-body text-sm text-zinc-400">{p.label}</span>
                <span className="flex items-baseline gap-2">
                  {p.paso && <span className="jb-body text-[11px] text-zinc-500">{p.paso}</span>}
                  <span className={`jb-display text-lg ${p.color}`}>{p.valor}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="jb-body text-[11px] text-zinc-500 flex flex-col gap-0.5">
            {datos.cohorte.conCuenta > 0 && (
              <span>De los que empezaron: {datos.cohorte.enPrueba} siguen en prueba · {datos.cohorte.sinPagar} terminaron sin pagar.</span>
            )}
            {datos.registros > datos.cohorte.conCuenta + registrosSinSeguimiento && (
              <span>{datos.registros - datos.cohorte.conCuenta - registrosSinSeguimiento} se registraron pero aún no confirman su correo.</span>
            )}
            {registrosSinSeguimiento > 0 && (
              <span className="text-zinc-600">{registrosSinSeguimiento} registro(s) de antes de esta versión no se pueden seguir hasta el pago.</span>
            )}
            <span className="text-zinc-600">El % de cada paso es sobre el paso anterior. El % de "Pagaron" sube con el tiempo: la prueba dura {TRIAL_DAYS} días.</span>
          </div>

          {(datos.tropiezos.length > 0 || datos.conGoogle > 0) && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 jb-body text-xs text-zinc-400">
              {datos.conGoogle > 0 && (
                <p className="mb-1"><span className="text-zinc-200 font-semibold">{datos.conGoogle}</span> {datos.conGoogle === 1 ? 'registro fue' : 'registros fueron'} con Google.</p>
              )}
              {datos.tropiezos.length > 0 && (
                <>
                  <p className="text-zinc-200 font-semibold mb-0.5">⚠️ En qué se trabaron al registrarse (personas):</p>
                  {datos.tropiezos.map(([m, n]) => (
                    <p key={m}>{MOTIVOS_TROPIEZO[m] || m}: <span className="text-amber-400 font-semibold">{n}</span></p>
                  ))}
                </>
              )}
            </div>
          )}


          <button onClick={() => setVerFuentes(v => !v)} className="flex items-center justify-between jb-body text-xs text-zinc-400 pt-2 border-t border-zinc-800">
            <span>Por fuente (?utm_source= o ?fuente=)</span>
            <ChevronRight size={14} className={`transition-transform ${verFuentes ? 'rotate-90' : ''}`} />
          </button>
          {verFuentes && (datos.fuentes.length === 0 ? (
            <p className="jb-body text-xs text-zinc-500">Sin visitas en este periodo.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {datos.fuentes.map(([fuente, v]) => (
                <div key={fuente} className="flex items-center justify-between jb-body text-xs gap-2">
                  <span className="text-zinc-300 capitalize">{fuente}</span>
                  <span className="text-zinc-500 text-right">{v.visitantes} visit. · {v.clics} clics · {v.registros} reg. · {v.cohorte.pagaron} pagaron</span>
                </div>
              ))}
            </div>
          ))}

          <button onClick={() => setVerHistorial(v => !v)} className="flex items-center justify-between jb-body text-xs text-zinc-400 pt-2 border-t border-zinc-800">
            <span>Evolución día a día (se guarda cada noche)</span>
            <ChevronRight size={14} className={`transition-transform ${verHistorial ? 'rotate-90' : ''}`} />
          </button>
          {verHistorial && (historial.length === 0 ? (
            <p className="jb-body text-xs text-zinc-500">Todavía no hay días guardados.</p>
          ) : (
            <div>
              <div className="overflow-x-auto -mx-1 px-1">
                <table className="w-full jb-body text-xs">
                  <thead>
                    <tr className="text-zinc-500 text-[10px] uppercase tracking-wide">
                      <th className="text-left font-medium py-1 pr-2">Día</th>
                      <th className="text-right font-medium py-1 px-1">Visit.</th>
                      <th className="text-right font-medium py-1 px-1">Clics</th>
                      <th className="text-right font-medium py-1 px-1">Reg.</th>
                      <th className="text-right font-medium py-1 px-1">Prueba</th>
                      <th className="text-right font-medium py-1 pl-1">Pagando</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map(h => (
                      <tr key={h.fecha} className="border-t border-zinc-800">
                        <td className="text-zinc-400 py-1.5 pr-2 whitespace-nowrap">
                          {new Date(h.fecha + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                        </td>
                        <td className="text-right text-zinc-200 px-1">{celda(h.visitantes)}</td>
                        <td className="text-right text-orange-400 px-1">{celda(h.clics)}</td>
                        <td className="text-right text-orange-300 px-1">{celda(h.registros)}</td>
                        <td className="text-right text-sky-400 px-1">{celda(h.en_prueba)}</td>
                        <td className="text-right text-emerald-400 pl-1">{celda(h.pagando)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="jb-body text-[10px] text-zinc-600 mt-1">Visitantes, clics y registros de ese día; prueba y pagando = cuántos había esa noche. "—" = ese día aún no se guardaba.</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmbudoPanel() {
  const [leads, setLeads] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [notaAbierta, setNotaAbierta] = useState(null);
  const [textoNota, setTextoNota] = useState('');
  const [fechaAccion, setFechaAccion] = useState('');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [{ data: l }, { data: a }, { data: n }] = await Promise.all([
        supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('alumnos').select('username, nombre, telefono, plan, enabled, fecha_inicio, fecha_vencimiento').order('created_at', { ascending: false }),
        supabase.from('seguimiento_crm').select('*').order('created_at', { ascending: false }),
      ]);
      setLeads(l || []);
      setAlumnos(a || []);
      setNotas(n || []);
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
    setLoading(false);
  }

  const hoy = new Date().toISOString().slice(0, 10);
  // Prueba gratis / pagando / vencido, a partir de los mismos campos que
  // ya usa el resto del panel de admin — ningún dato nuevo, solo
  // agrupado distinto.
  let enPrueba = alumnos.filter(a => (a.plan === 'trial' || a.plan === 'prueba') && a.enabled && (!a.fecha_vencimiento || a.fecha_vencimiento >= hoy));
  let pagando = alumnos.filter(a => a.plan === 'pago' && a.enabled && (!a.fecha_vencimiento || a.fecha_vencimiento >= hoy));
  let vencidos = alumnos.filter(a => (a.fecha_vencimiento && a.fecha_vencimiento < hoy) || !a.enabled);
  let leadsFiltrados = leads;

  // Buscador: filtra las 4 etapas a la vez por nombre, usuario o celular.
  if (busqueda.trim()) {
    const q = busqueda.trim().toLowerCase();
    const matchAlumno = a => (a.nombre || '').toLowerCase().includes(q) || a.username.toLowerCase().includes(q) || (a.telefono || '').includes(q);
    const matchLead = l => (l.nombre || '').toLowerCase().includes(q) || (l.telefono || '').includes(q);
    enPrueba = enPrueba.filter(matchAlumno);
    pagando = pagando.filter(matchAlumno);
    vencidos = vencidos.filter(matchAlumno);
    leadsFiltrados = leadsFiltrados.filter(matchLead);
  }


  // "Hoy toca seguimiento": la nota más reciente de cada persona (lead
  // o alumno) tiene una próxima acción vencida o para hoy. Se calcula
  // sobre TODA la gente (sin filtrar por búsqueda), es un aviso aparte.
  const notaMasRecientePorPersona = {};
  notas.forEach(n => {
    const clave = `${n.tipo}:${n.referencia}`;
    if (!notaMasRecientePorPersona[clave] || n.created_at > notaMasRecientePorPersona[clave].created_at) {
      notaMasRecientePorPersona[clave] = n;
    }
  });
  const pendientesHoy = Object.entries(notaMasRecientePorPersona)
    .filter(([, n]) => n.proxima_accion && n.proxima_accion <= hoy)
    .map(([clave, n]) => {
      const [tipo, referencia] = clave.split(':');
      const persona = tipo === 'lead'
        ? leads.find(l => String(l.id) === referencia)
        : alumnos.find(a => a.username === referencia);
      if (!persona) return null;
      return { tipo, referencia, nombre: persona.nombre || persona.username, telefono: persona.telefono, nota: n };
    })
    .filter(Boolean)
    .sort((a, b) => a.nota.proxima_accion.localeCompare(b.nota.proxima_accion));

  function notasDe(tipo, referencia) {
    return notas.filter(n => n.tipo === tipo && n.referencia === String(referencia));
  }

  async function guardarNota(tipo, referencia) {
    if (!textoNota.trim()) return;
    try {
      await supabase.from('seguimiento_crm').insert({ tipo, referencia: String(referencia), nota: textoNota.trim(), proxima_accion: fechaAccion || null });
      setTextoNota(''); setFechaAccion(''); setNotaAbierta(null);
      load();
    } catch (e) { alert('No se pudo guardar la nota: ' + (e?.message || 'Intenta de nuevo.')); }
  }

  function waLink(telefono, nombre, mensaje) {
    const num = telefono ? telefono.replace(/\D/g, '') : '';
    const full = num ? (num.length <= 9 ? '51' + num : num) : '';
    const texto = mensaje ? mensaje.replace('[NOMBRE]', nombre || '') : `Hola ${nombre || ''}, `;
    return full
      ? `https://wa.me/${full}?text=${encodeURIComponent(texto)}`
      : `https://wa.me/?text=${encodeURIComponent(texto)}`;
  }

  function fmt(fecha) {
    return fecha ? new Date(fecha + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) : '—';
  }

  function Persona({ tipo, referencia, nombre, telefono, sub, alerta, mensajeWa }) {
    const misNotas = notasDe(tipo, referencia);
    const clave = `${tipo}:${referencia}`;
    const abierta = notaAbierta === clave;
    return (
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-zinc-100 text-sm font-medium">{nombre || 'Sin nombre'}</div>
            <div className="text-zinc-500 text-xs">{sub}</div>
            {!telefono && <div className="text-zinc-600 text-xs jb-body mt-0.5">📵 sin celular registrado</div>}
            {alerta && <div className="text-amber-400 text-xs jb-body mt-0.5">⚠️ {alerta}</div>}
          </div>
          <div className="flex gap-2 shrink-0">
            <a href={waLink(telefono, nombre, mensajeWa)} target="_blank" rel="noopener noreferrer" className={btnGhost + ' py-1 px-2 text-xs'}>
              <MessageCircle size={13} />
            </a>
            <button onClick={() => { setNotaAbierta(abierta ? null : clave); setTextoNota(''); setFechaAccion(''); }}
              className={btnGhost + ' py-1 px-2 text-xs'}>
              {abierta ? 'Cerrar' : `+ Nota${misNotas.length ? ` (${misNotas.length})` : ''}`}
            </button>
          </div>
        </div>
        {misNotas.length > 0 && !abierta && (
          <p className="jb-body text-xs text-zinc-500 truncate">
            Última: {misNotas[0].nota}{misNotas[0].proxima_accion ? ` · próxima acción ${fmt(misNotas[0].proxima_accion)}` : ''}
          </p>
        )}
        {abierta && (
          <div className="flex flex-col gap-2 pt-1 border-t border-zinc-800">
            {misNotas.map(n => (
              <p key={n.id} className="jb-body text-xs text-zinc-400">
                <span className="text-zinc-600">{fmt(n.created_at.slice(0, 10))}:</span> {n.nota}
                {n.proxima_accion ? <span className="text-orange-500"> · próxima: {fmt(n.proxima_accion)}</span> : ''}
              </p>
            ))}
            <textarea value={textoNota} onChange={e => setTextoNota(e.target.value)}
              placeholder="Ej: le escribí, dijo que lo piensa hasta el viernes"
              className={inputCls + ' text-xs'} rows={2} />
            <div className="flex gap-2 items-center flex-wrap">
              <input type="date" value={fechaAccion} onChange={e => setFechaAccion(e.target.value)} className={inputCls + ' text-xs w-40'} />
              <button onClick={() => guardarNota(tipo, referencia)} disabled={!textoNota.trim()} className={btnPrimary + ' py-1 px-3 text-xs'}>Guardar nota</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function Etapa({ titulo, emoji, items, render }) {
    return (
      <div>
        <h3 className="jb-display text-sm text-zinc-300 mb-2">{emoji} {titulo} · {items.length}</h3>
        {items.length === 0 ? (
          <p className="text-zinc-600 text-xs">Nadie en esta etapa todavía.</p>
        ) : (
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">{items.map(render)}</div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full px-5 py-4 flex items-center justify-between text-left">
        <h2 className="jb-display text-base text-zinc-200">
          🔔 SEGUIMIENTO
          <span className="ml-2 text-xs text-zinc-500 font-normal">· notas y recordatorios</span>
        </h2>
        <ChevronRight size={18} className={`text-zinc-500 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 flex flex-col gap-5 border-t border-zinc-800 pt-4">
          <div className="flex gap-2 items-center flex-wrap">
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, usuario o celular..."
              className={inputCls + ' flex-1 min-w-[180px] text-sm'} />
            <button onClick={load} className={btnGhost + ' py-1.5 px-3 text-xs shrink-0'}>Actualizar</button>
          </div>

          {loading ? (
            <Loader2 className="animate-spin text-orange-500" size={20} />
          ) : (
            <>
              {pendientesHoy.length > 0 && (
                <div className="bg-orange-950/20 border border-orange-800/40 rounded-xl p-3">
                  <h3 className="jb-display text-sm text-orange-400 mb-2">🔔 HOY TE TOCA SEGUIMIENTO · {pendientesHoy.length}</h3>
                  <div className="flex flex-col gap-2">
                    {pendientesHoy.map(p => (
                      <div key={`${p.tipo}:${p.referencia}`} className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 flex items-center justify-between gap-2 flex-wrap">
                        <div className="min-w-0">
                          <div className="text-zinc-100 text-sm truncate">{p.nombre}</div>
                          <div className="text-zinc-500 text-xs truncate">
                            {p.nota.nota} {p.nota.proxima_accion < hoy && <span className="text-red-400">· atrasado</span>}
                          </div>
                        </div>
                        <a href={waLink(p.telefono, p.nombre)} target="_blank" rel="noopener noreferrer" className={btnPrimary + ' py-1 px-3 text-xs shrink-0'}>
                          <MessageCircle size={13} /> Escribir
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Etapa titulo="LEADS (calculadora gratis)" emoji="📏" items={leadsFiltrados} render={l => (
                <Persona key={l.id} tipo="lead" referencia={l.id} nombre={l.nombre} telefono={l.telefono}
                  sub={fmt(l.created_at.slice(0, 10))} />
              )} />

              {/* Las listas de "no registran comidas" y "por vencer" ahora
                  están en 🔥 Rescate y ⏰ Por vencer. Aquí quedan las notas:
                  se busca al alumno para anotar algo o ver sus notas. */}
              {busqueda.trim() ? (
                <Etapa titulo="ALUMNOS" emoji="👤" items={[...enPrueba, ...pagando, ...vencidos]} render={a => (
                  <Persona key={a.username} tipo="alumno" referencia={a.username} nombre={a.nombre || a.username} telefono={a.telefono}
                    sub={`${a.plan === 'pago' ? 'plan pagado' : 'prueba gratis'} · ${a.fecha_vencimiento && a.fecha_vencimiento < hoy ? 'venció' : 'vence'} ${fmt(a.fecha_vencimiento)}`} />
                )} />
              ) : (
                <p className="jb-body text-xs text-zinc-500">
                  Para anotar algo sobre un alumno (o ver sus notas), búscalo arriba por nombre, usuario o celular. A quién escribirle hoy está en 🔥 Rescate y ⏰ Por vencer.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function AlumnoRow({ u, progreso, onRenew, onViewStudent, onAdjustDays, onActivarAddOnFoto, onDesactivarAddOnFoto, onToggleUser, onDeleteUser }) {
  const [expanded, setExpanded] = useState(false);
  const [dias, setDias] = useState('');
  const [motivo, setMotivo] = useState('');

  const ms = membershipLabel(u);
  const act = formatActivity(u.lastActivity);

  // Misma lógica que membershipLabel, solo que devuelve la clase de
  // borde en vez de la de fondo — así la barra de color a la izquierda
  // deja escanear el estado de toda la lista de un vistazo.
  let accentBorder = 'border-emerald-500';
  if (!u.enabled) accentBorder = 'border-red-500';
  else {
    const dl = daysLeft(u.fechaVencimiento);
    if (dl !== null) {
      if (dl < 0) accentBorder = 'border-red-500';
      else if (dl <= 7) accentBorder = 'border-amber-500';
    }
  }

  return (
    <div className={`bg-zinc-950 border-l-4 ${accentBorder} rounded-r-xl overflow-hidden`}>
      <button onClick={() => setExpanded(v => !v)} className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center jb-display text-xs text-zinc-300 shrink-0">
            {(u.nombre || u.username).slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-zinc-100 font-medium truncate">
              {u.nombre ? `${u.nombre} · ${u.username}` : u.username}
            </div>
            <div className="text-zinc-500 text-xs flex items-center gap-2 flex-wrap">
              <span className={ms.color}>{ms.text}</span>
              <span className="text-zinc-700">·</span>
              <span className={act.color}>{act.text}</span>
              {u.codigoReferido && (<><span className="text-zinc-700">·</span><span className="text-orange-500">ref: {u.codigoReferido}</span></>)}
            </div>
            {progreso && (
              <div className={`text-xs mt-0.5 ${progreso.grupo === 'bien' ? 'text-emerald-400' : progreso.grupo === 'atencion' ? 'text-amber-400' : 'text-zinc-500'}`}>
                {progreso.emoji} {progreso.texto}
              </div>
            )}
          </div>
        </div>
        <ChevronRight size={18} className={`text-zinc-600 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
        {u.telefono && (
          <a href={`https://wa.me/${u.telefono.replace(/\D/g, '').length <= 9 ? '51' + u.telefono.replace(/\D/g, '') : u.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${u.nombre || u.username}, te escribo de Jonah Beast.`)}`}
            target="_blank" rel="noopener noreferrer" className={btnGhost + ' py-1.5 px-3 text-xs'}>
            <MessageCircle size={13} /> WhatsApp
          </a>
        )}
        <button onClick={() => onViewStudent(u.username)} className={btnGhost + ' py-1.5 px-3 text-xs'}><Eye size={13} /> Ver datos</button>
        <button onClick={() => onRenew(u.username, 1)} className={btnGhost + ' py-1.5 px-3 text-xs'}>+1 mes</button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-3 border-t border-zinc-900 flex flex-col gap-3 bg-zinc-900/40">
          <div>
            <p className="jb-body text-[11px] text-zinc-500 mb-1.5">Ajustar días de membresía</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <input type="number" min="1" placeholder="días" value={dias} onChange={e => setDias(e.target.value)}
                className="w-16 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-200" />
              <input type="text" placeholder="motivo (opcional)" value={motivo} onChange={e => setMotivo(e.target.value)}
                className="flex-1 min-w-[100px] bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-200" />
              <button onClick={() => onAdjustDays(u.username, parseInt(dias || '1', 10), motivo)} className={btnGhost + ' py-1.5 px-2 text-xs'}>+ días</button>
              <button onClick={() => onAdjustDays(u.username, -parseInt(dias || '1', 10), motivo)} className={btnGhost + ' py-1.5 px-2 text-xs'}>− días</button>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-zinc-900">
            <button onClick={() => onToggleUser(u.username)} className={(u.enabled ? btnDanger : btnGhost) + ' py-1.5 px-3 text-xs'}>
              {u.enabled ? 'Deshabilitar' : 'Habilitar'}
            </button>
            <button onClick={() => { if (window.confirm(`¿Eliminar a "${u.nombre || u.username}" (@${u.username}) para siempre?\n\nSe borran su plan, medidas, comidas registradas, fotos, ajustes y también su acceso (correo y contraseña) — no se puede deshacer. Si quiere volver, tendrá que registrarse de nuevo. Sus pagos anteriores se conservan.\n\nSi solo quieres pausar su acceso (y que pueda recuperarlo después), usa "Deshabilitar" en vez de esto.`)) onDeleteUser(u.username); }}
              className="text-zinc-600 hover:text-red-400 transition-colors text-xs flex items-center gap-1 py-1.5 px-2">
              <Trash2 size={13} /> Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const CLAVE_VOZ_JARVIS = 'jb-jarvis-voz';

/* Voz por defecto de Jarvis si no hay una elegida: la primera voz en
   español con nombre femenino típico (iOS, Android, Windows, macOS); si no
   hay, una que no parezca masculina; y si no, la primera en español. */
function vozFemeninaPorDefecto(vocesEs) {
  const esNombreFemenino = /female|mujer|m[oó]nica|paulina|marisol|soledad|laura|helena|sabina|elvira|lucia|luc[íi]a|conchita|esperanza|isabela|camila|valentina|juliette|maría|maria/i;
  const esNombreMasculino = /\bmale\b|hombre|pablo|jorge|diego|carlos|miguel|juan|enrique/i;
  return vocesEs.find(v => esNombreFemenino.test(v.name))
    || vocesEs.find(v => !esNombreMasculino.test(v.name))
    || vocesEs[0] || null;
}

/* Muestra las respuestas de Jarvis con formato: **negrita** y *cursiva*
   se ven como tal (en vez de con asteriscos) y se respetan los saltos de
   línea. La voz ya quita estos símbolos antes de leer (ver hablar()). */
function TextoJarvis({ texto }) {
  const partes = String(texto || '').split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g);
  return (
    <div className="whitespace-pre-wrap">
      {partes.map((p, i) => {
        if (/^\*\*[^*\n]+\*\*$/.test(p)) return <strong key={i} className="font-semibold" style={{ color: '#ffffff' }}>{p.slice(2, -2)}</strong>;
        if (/^\*[^*\n]+\*$/.test(p)) return <em key={i}>{p.slice(1, -1)}</em>;
        return <React.Fragment key={i}>{p}</React.Fragment>;
      })}
    </div>
  );
}

/* La versión de prueba de Vercel (y la compu local) habla con una copia de
   prueba de Jarvis, para poder probar cambios de Jarvis antes del merge sin
   tocar el que usa el sitio real. */
function funcionJarvis() {
  return HOSTS_PRODUCCION.includes(window.location.hostname) ? 'jarvis-chat' : 'jarvis-chat-prueba';
}

/* Llama a la función de Jarvis. Con `alEvento`, pide la respuesta por
   partes (streaming): llega una línea JSON por evento ({tipo:"texto"},
   {tipo:"reiniciar"} y al final {tipo:"fin"} o {tipo:"error"}) y cada una
   se pasa a `alEvento` apenas llega. Si la función responde en el formato
   de siempre (un JSON completo), también funciona. */
async function llamarJarvis(cuerpo, alEvento) {
  const { data: { session } } = await supabase.auth.getSession();
  const r = await fetch(`${supabaseUrl}/functions/v1/${funcionJarvis()}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: supabaseKey,
      authorization: `Bearer ${session?.access_token || supabaseKey}`,
    },
    body: JSON.stringify(cuerpo),
  });
  const tipo = r.headers.get('content-type') || '';
  if (alEvento && r.ok && tipo.includes('ndjson') && r.body && r.body.getReader) {
    const lector = r.body.getReader();
    const decodificar = new TextDecoder();
    let pendiente = '';
    let fin = null;
    for (;;) {
      const { value, done } = await lector.read();
      if (done) break;
      pendiente += decodificar.decode(value, { stream: true });
      let corte;
      while ((corte = pendiente.indexOf('\n')) >= 0) {
        const linea = pendiente.slice(0, corte).trim();
        pendiente = pendiente.slice(corte + 1);
        if (!linea) continue;
        const ev = JSON.parse(linea);
        if (ev.tipo === 'fin') fin = ev;
        else if (ev.tipo === 'error') throw new Error(ev.error || 'error');
        else alEvento(ev);
      }
    }
    if (!fin) throw new Error('respuesta incompleta');
    return fin;
  }
  const data = await r.json().catch(() => null);
  if (!r.ok || !data || data.error) throw new Error(data?.error || 'error');
  return data;
}

// Mensajes que muestra Jarvis cuando el micrófono no puede funcionar.
const AVISOS_MIC = {
  'not-allowed': 'No tengo permiso para usar el micrófono en esta página. Toca el ícono a la izquierda de la dirección web, permite el micrófono y vuelve a tocar 🎤. Mientras tanto puedes escribirme.',
  'service-not-allowed': 'Este navegador no me deja usar el reconocimiento de voz. Prueba en Google Chrome o Safari, o escríbeme.',
  'audio-capture': 'No encuentro ningún micrófono en este equipo. Revisa que esté conectado y vuelve a tocar 🎤, o escríbeme.',
  'network': 'El reconocimiento de voz del navegador no responde (necesita internet; en computadoras funciona en Google Chrome). Vuelve a tocar 🎤 en un momento, o escríbeme.',
  'sin-soporte': 'Este navegador no reconoce voz. Prueba en Google Chrome o Safari, o escríbeme.',
};

// Estilo "J.A.R.V.I.S." de Iron Man: un reactor de anillos en cian
// holográfico que nunca se queda quieto, como en la película: los anillos
// giran y oscilan, el núcleo respira y el anillo exterior es una onda de
// voz que late todo el tiempo "esperando órdenes". Cambia según lo que
// Jarvis está haciendo: reposo (onda suave), escuchando (rojo, onda
// rápida), pensando (ámbar, arcos que corren) y hablando (la onda salta
// con cada palabra que dice).
// No se apaga con "reducir movimiento": el panel es solo del admin y
// Jarvis debe verse siempre vivo.
const ESTILOS_JARVIS = `
@keyframes jv-giro { to { transform: rotate(360deg); } }
@keyframes jv-giro-inv { to { transform: rotate(-360deg); } }
@keyframes jv-oscila { 0% { transform: rotate(-35deg); } 100% { transform: rotate(35deg); } }
@keyframes jv-late { 0%,100% { transform: scale(1); opacity: .85; } 50% { transform: scale(1.12); opacity: 1; } }
@keyframes jv-respira { 0%,100% { transform: scale(1); } 50% { transform: scale(1.035); } }
@keyframes jv-aura { 0%,100% { opacity: .35; transform: scale(.97); } 50% { opacity: .8; transform: scale(1.03); } }
@keyframes jv-onda { 0%,100% { transform: scaleY(.25); } 50% { transform: scaleY(1); } }
@keyframes jv-golpe { 0% { transform: scale(1.22); } 100% { transform: scale(1); } }
@keyframes jv-barrido { from { transform: translateY(-100%); } to { transform: translateY(100%); } }
@keyframes jv-aparece { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
@keyframes jv-crece { from { transform: scaleY(0); } to { transform: scaleY(1); } }
.jv-rot { transform-box: fill-box; transform-origin: center; }
.jv-barra { transform-box: view-box; transform-origin: 100px 6px; }
`;

// Cómo se mueve la onda de voz en cada estado: duración de un latido y
// cuánto se desfasa cada barra (la onda "viaja" alrededor del anillo).
const ONDA_JARVIS = {
  reposo: { dur: 2.2, paso: 0.09, alto: 1 },
  escuchando: { dur: 0.7, paso: 0.035, alto: 1.35 },
  pensando: { dur: 1.1, paso: 0.02, alto: 1.1 },
  hablando: { dur: 0.42, paso: 0.05, alto: 1.6 },
};

/* Sonidos de interfaz de Jarvis: tonos cortos generados por el mismo
   celular (sin archivos), como los de un holograma. El navegador solo deja
   sonar audio después de un toque, así que el contexto se prepara al tocar
   el botón de Jarvis (prepararAudioJarvis). */
let audioJarvis = null;
let sonidosJarvisActivos = true; // se apagan junto con la voz (botón 🔊)
function contextoAudioJarvis() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioJarvis) audioJarvis = new AC();
    if (audioJarvis.state === 'suspended') audioJarvis.resume();
    return audioJarvis;
  } catch { return null; }
}
const SONIDOS_JARVIS = {
  // [frecuencia inicial, final, duración en s, retraso] por cada tono
  abrir: [[320, 880, 0.22, 0], [1320, 1320, 0.09, 0.2]],
  escuchar: [[880, 880, 0.06, 0], [1320, 1320, 0.07, 0.09]],
  despierto: [[660, 990, 0.12, 0], [1320, 1320, 0.08, 0.13]],
  respuesta: [[1046, 1046, 0.12, 0]],
  cerrar: [[880, 330, 0.2, 0]],
};
function sonidoJarvis(tipo) {
  if (!sonidosJarvisActivos) return;
  const ctx = contextoAudioJarvis();
  const tonos = SONIDOS_JARVIS[tipo];
  if (!ctx || !tonos) return;
  try {
    const t0 = ctx.currentTime + 0.01;
    tonos.forEach(([f1, f2, dur, retraso]) => {
      const osc = ctx.createOscillator();
      const vol = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f1, t0 + retraso);
      osc.frequency.exponentialRampToValueAtTime(f2, t0 + retraso + dur);
      vol.gain.setValueAtTime(0.0001, t0 + retraso);
      vol.gain.exponentialRampToValueAtTime(0.07, t0 + retraso + 0.015);
      vol.gain.exponentialRampToValueAtTime(0.0001, t0 + retraso + dur);
      osc.connect(vol).connect(ctx.destination);
      osc.start(t0 + retraso);
      osc.stop(t0 + retraso + dur + 0.02);
    });
  } catch {}
}
/* Se llama dentro del toque que abre a Jarvis: deja listos el audio y la
   voz para que el informe pueda sonar apenas llegan los datos (iOS bloquea
   la voz si no se "desbloquea" durante un toque). */
function prepararAudioJarvis() {
  contextoAudioJarvis();
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance('.');
    u.volume = 0.01; u.rate = 10;
    window.speechSynthesis.speak(u);
  } catch {}
}

/* Palabra de activación: en modo micrófono continuo Jarvis solo responde
   cuando le hablan empezando con "Jarvis" (o "oye Jarvis"). El
   reconocimiento de voz a veces escribe el nombre distinto, por eso se
   aceptan variantes. Devuelve lo que se dijo después del nombre, o null si
   no se lo llamó. */
const PALABRA_JARVIS = /^\s*(?:(?:oye|hey|ok|okay|hola)[\s,]+)?(?:jarvis|yarvis|jarbis|yarbis|harvis|charvis|jervis|garvis|jarvi|jarbi)\b[\s,.:;!¡¿?-]*/i;
function quitarPalabraJarvis(texto) {
  const m = String(texto || '').match(PALABRA_JARVIS);
  return m ? texto.slice(m[0].length).trim() : null;
}
// Frases con las que se cierra la conversación por voz ("no, gracias, no es
// necesario", "eso es todo"): Jarvis responde y apaga el micrófono.
const DESPEDIDA_JARVIS = /\b(eso (es|seria|sería) todo|es todo|nada mas|nada más|no es necesario|no hace falta|no necesito nada|no gracias|no, gracias|ok gracias|listo gracias|hasta luego|adios|adiós|chau|chao)\b/i;
const esDespedidaJarvis = t => DESPEDIDA_JARVIS.test(String(t || ''));
// Después de llamarlo (o de que responda), durante estos segundos se le
// puede seguir hablando sin repetir "Jarvis", como en una conversación.
const SEGUNDOS_CONVERSACION_JARVIS = 10;

/* Informe al abrir: resumen del día armado con los datos que el panel ya
   tiene (y dos consultas cortas), sin usar la inteligencia artificial. */
function saludoJarvis(d = new Date()) {
  const h = d.getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}
async function datosNegocioJarvis(users) {
  const hoy = todayISO();
  const ayer = addDaysISO(hoy, -1);
  let pagosPendientes = null, pagosAtrasados = null, registraronAyer = null, registraronHoy = null;
  let cobradoDesdeAyer = null, pagosDesdeAyer = null;
  try {
    // Lo que entró desde ayer (00:00, hora de Lima), sin pruebas de 0 soles.
    const { data: filas } = await supabase.from('pagos').select('username, monto').eq('estado', 'aprobado')
      .gte('creado_en', `${ayer}T00:00:00-05:00`).gt('monto', 0).range(0, 999);
    const data = (filas || []).filter(p => !esCuentaPropia(p.username));
    pagosDesdeAyer = data.length;
    cobradoDesdeAyer = Math.round(data.reduce((a, p) => a + (Number(p.monto) || 0), 0) * 100) / 100;
  } catch {}
  try {
    const { data } = await supabase.from('pagos').select('creado_en').eq('estado', 'pendiente').range(0, 999);
    pagosPendientes = (data || []).length;
    pagosAtrasados = (data || []).filter(p => Date.now() - new Date(p.creado_en).getTime() >= 12 * 3600000).length;
  } catch {}
  try {
    const { data } = await supabase.from('historial').select('username, fecha').in('fecha', [ayer, hoy]).gt('comidas_count', 0);
    registraronAyer = new Set((data || []).filter(r => r.fecha === ayer).map(r => r.username)).size;
    registraronHoy = new Set((data || []).filter(r => r.fecha === hoy).map(r => r.username)).size;
  } catch {}
  const lista = (users || []).filter(u => !esCuentaPropia(u.username));
  const esPrueba = u => u.plan === 'trial' || u.plan === 'prueba';
  const activosL = lista.filter(u => u.enabled && membershipActive(u));
  // "A medias": pusieron sus datos del cuerpo hace 3 horas o más (y no más
  // de 3 días) pero nunca registraron una comida (mismo criterio que Rescate).
  let aMedias = null;
  try {
    const nombresActivos = activosL.map(u => u.username);
    if (nombresActivos.length) {
      const { data: conComida } = await traerTodas(() => supabase.from('historial').select('username').in('username', nombresActivos).gt('comidas_count', 0));
      const comieron = new Set((conComida || []).map(r => r.username));
      const sinComida = nombresActivos.filter(n => !comieron.has(n));
      const { data: dat } = sinComida.length
        ? await supabase.from('datos_alumnos').select('username, form, updated_at').in('username', sinComida)
        : { data: [] };
      aMedias = (dat || []).filter(d => {
        const h = (Date.now() - new Date(d.updated_at).getTime()) / 3600000;
        return tieneDatosBasicos(d.form || {}) && h >= 3 && h <= 72;
      }).length;
    } else aMedias = 0;
  } catch {}
  return {
    pagosPendientes, pagosAtrasados, registraronAyer, registraronHoy, aMedias, cobradoDesdeAyer, pagosDesdeAyer,
    activos: activosL.length,
    enPrueba: activosL.filter(esPrueba).length,
    pagando: activosL.filter(u => !esPrueba(u)).length,
    vencen: lista.filter(u => u.enabled && esPrueba(u) && (() => { const d = daysLeft(u.fechaVencimiento); return d !== null && d >= 0 && d <= 3; })()).length,
    nuevos: lista.filter(u => u.fechaInicio === hoy || u.fechaInicio === ayer).length,
  };
}
async function armarInformeJarvis(users) {
  const d = await datosNegocioJarvis(users);
  const partes = [];
  partes.push(d.pagosPendientes
    ? `Tienes ${d.pagosPendientes} ${d.pagosPendientes === 1 ? 'pago' : 'pagos'} por revisar${d.pagosAtrasados ? `, ${d.pagosAtrasados === 1 ? 'uno espera más de 12 horas: ese alumno sigue sin acceso' : `${d.pagosAtrasados} esperan más de 12 horas: esos alumnos siguen sin acceso`}` : ''}.`
    : 'No hay pagos pendientes.');
  if (d.pagosDesdeAyer) partes.push(`Desde ayer entraron ${d.pagosDesdeAyer} ${d.pagosDesdeAyer === 1 ? 'pago' : 'pagos'} por S/${d.cobradoDesdeAyer.toFixed(2)}.`);
  if (d.vencen) partes.push(`${d.vencen} ${d.vencen === 1 ? 'prueba gratis vence' : 'pruebas gratis vencen'} en los próximos 3 días.`);
  if (d.registraronAyer !== null) partes.push(`Ayer registraron comida ${d.registraronAyer} de tus ${d.activos} alumnos activos.`);
  if (d.aMedias) partes.push(`${d.aMedias === 1 ? '1 alumno se quedó' : `${d.aMedias} alumnos se quedaron`} a medias: ${d.aMedias === 1 ? 'puso sus datos' : 'pusieron sus datos'} pero no ${d.aMedias === 1 ? 'registró' : 'registraron'} su primera comida. Están en Rescate para escribirles hoy.`);
  if (d.nuevos) partes.push(`Desde ayer se ${d.nuevos === 1 ? 'unió 1 alumno nuevo' : `unieron ${d.nuevos} alumnos nuevos`}.`);
  return `${saludoJarvis()}, señor Jonah. ${partes.join(' ')} ¿Qué necesita?`;
}
// Clima actual de Lima (Open-Meteo: gratis y sin clave). Si no responde
// en 3 segundos, Jarvis saluda sin el clima.
const CLIMA_POR_CODIGO = [
  [[0], 'cielo despejado'], [[1], 'cielo mayormente despejado'], [[2], 'cielo parcialmente nublado'],
  [[3], 'cielo cubierto'], [[45, 48], 'neblina'], [[51, 53, 55, 56, 57], 'garúa'],
  [[61, 63, 65, 66, 67, 80, 81, 82], 'lluvia'], [[95, 96, 99], 'tormenta'],
];
async function climaLimaJarvis() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-12.05&longitude=-77.04&current=temperature_2m,weather_code&timezone=America%2FLima', { signal: ctrl.signal });
    clearTimeout(t);
    const c = (await r.json())?.current;
    if (!c || typeof c.temperature_2m !== 'number') return null;
    const desc = (CLIMA_POR_CODIGO.find(([codigos]) => codigos.includes(c.weather_code)) || [null, 'cielo nublado'])[1];
    return `${Math.round(c.temperature_2m)} grados y ${desc} en Lima`;
  } catch { return null; }
}
const NUMEROS_JARVIS = ['cero', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];
const enLetras = n => NUMEROS_JARVIS[n] || String(n);
function juntarFrases(partes) {
  return partes.length <= 1 ? (partes[0] || '') : `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}

// Sugerencias de Jarvis al abrir: reglas sobre los datos (no usan la IA,
// no cuestan nada). Máximo 2, de la más urgente a la menos. Cada una puede
// traer un botón para actuar en 1 toque (WhatsApp con el mensaje listo).
// Jarvis solo sugiere: nunca hace nada solo.
function waDeAlumno(u, texto) {
  const tel = String(u.telefono || '').replace(/\D/g, '');
  if (!tel) return null;
  return `https://wa.me/${tel.length <= 9 ? '51' + tel : tel}?text=${encodeURIComponent(texto)}`;
}
async function sugerenciasJarvis(users, d) {
  const lista = (users || []).filter(u => !esCuentaPropia(u.username));
  const primerNombre = u => String(u.nombre || u.username).trim().split(/\s+/)[0];
  // Nombre completo y username: va solo a la memoria de Jarvis (no se ve),
  // para que después sepa de quién le hablan.
  const quien = u => `${String(u.nombre || u.username).trim()} (username ${u.username})`;
  const esPrueba = u => u.plan === 'trial' || u.plan === 'prueba';
  const sug = [];

  if (d.pagosAtrasados) sug.push({
    texto: `${d.pagosAtrasados === 1 ? 'Un pago lleva' : `${d.pagosAtrasados} pagos llevan`} más de 12 horas esperando, y ese alumno sigue sin acceso. Yo empezaría por ahí: está en Pagos, pestaña HOY.`,
    voz: `Hay ${d.pagosAtrasados === 1 ? 'un pago' : `${enLetras(d.pagosAtrasados)} pagos`} esperando más de 12 horas. Yo empezaría por ahí.`,
  });

  const porVencer = lista
    .filter(u => u.enabled && esPrueba(u) && u.telefono)
    .map(u => ({ u, dl: daysLeft(u.fechaVencimiento) }))
    .filter(x => x.dl === 0 || x.dl === 1)
    .sort((a, b) => a.dl - b.dl);
  if (porVencer.length) {
    const { u, dl } = porVencer[0];
    const cuando = dl === 0 ? 'hoy' : 'mañana';
    const otros = porVencer.length - 1;
    sug.push({
      texto: `${primerNombre(u)} termina su prueba ${cuando} y aún no paga${otros ? ` (y ${otros} más vencen pronto)` : ''}. Un mensaje suyo ahora vale más que diez anuncios.`,
      voz: `Sugiero escribirle a ${primerNombre(u)}: su prueba termina ${cuando}.`,
      contexto: `Pruebas que vencen hoy o mañana: ${porVencer.map(x => `${quien(x.u)}, ${x.dl === 0 ? 'hoy' : 'mañana'}`).join('; ')}.`,
      boton: 'Escribirle por WhatsApp',
      url: waDeAlumno(u, `Hola ${primerNombre(u)}, soy Jonah de Jonah Beast Fuel 🦍. Tu prueba gratis termina ${cuando}. ¿Cómo te fue? Si quieres seguir, te ayudo a elegir tu plan 💪`),
    });
  }

  // Bienvenida personal: quien empezó su prueba ayer o hoy. Un saludo del
  // coach el primer día es lo que más empuja a que pague al final.
  const recienLlegados = lista.filter(u => u.enabled && esPrueba(u) && u.telefono
    && (u.fechaInicio === todayISO() || u.fechaInicio === addDaysISO(todayISO(), -1)));
  if (recienLlegados.length && sug.length < 2) {
    const u = recienLlegados[0];
    sug.push({
      texto: `${primerNombre(u)} empezó su prueba gratis${recienLlegados.length > 1 ? ` (y ${recienLlegados.length - 1} más)` : ''}. Un saludo suyo el primer día vale oro: es lo que más empuja a que pague al final.`,
      voz: `${primerNombre(u)} empezó su prueba. Un saludo suyo hoy vale oro.`,
      contexto: `Empezaron su prueba ayer u hoy: ${recienLlegados.map(quien).join('; ')}.`,
      boton: 'Darle la bienvenida',
      url: waDeAlumno(u, `Hola ${primerNombre(u)}, soy Jonah de Jonah Beast Fuel 🦍 ¡Bienvenido/a! Estos 7 días de Premium estoy contigo: registra tu primera comida con una foto y cualquier duda me escribes por aquí 💪`),
    });
  }

  // Alumnos que pagan y dejaron de registrar hace 3 a 7 días.
  try {
    const hoy = todayISO();
    const pagando = lista.filter(u => u.enabled && !esPrueba(u) && membershipActive(u) && u.telefono);
    if (pagando.length && sug.length < 2) {
      const { data } = await traerTodas(() => supabase.from('historial').select('username, fecha')
        .in('username', pagando.map(u => u.username)).gte('fecha', addDaysISO(hoy, -10)).gt('comidas_count', 0));
      const ultima = {};
      (data || []).forEach(r => { if (!ultima[r.username] || r.fecha > ultima[r.username]) ultima[r.username] = r.fecha; });
      const quietos = pagando
        .map(u => ({ u, dias: ultima[u.username] ? -daysLeft(ultima[u.username]) : null }))
        .filter(x => x.dias !== null && x.dias >= 3 && x.dias <= 7)
        .sort((a, b) => a.dias - b.dias);
      if (quietos.length) {
        const { u, dias } = quietos[0];
        sug.push({
          texto: `${primerNombre(u)} lleva ${dias} días sin registrar sus comidas${quietos.length > 1 ? ` (${quietos.length - 1} más, igual)` : ''}. Suele ser el primer paso antes de irse; un "¿cómo vas?" a tiempo ayuda.`,
          voz: `${primerNombre(u)} lleva ${enLetras(dias)} días sin registrar. Un mensaje suyo ayudaría.`,
          contexto: `Pagan y dejaron de registrar hace 3 a 7 días: ${quietos.map(x => `${quien(x.u)}, ${x.dias} días`).join('; ')}.`,
          boton: 'Escribirle por WhatsApp',
          url: waDeAlumno(u, `Hola ${primerNombre(u)}, soy Jonah 🦍. Vi que llevas unos días sin registrar tus comidas. ¿Todo bien? Si te trabas con algo, dime y lo vemos juntos 💪`),
        });
      }
    }
  } catch {}

  if (d.aMedias) sug.push({
    texto: `${d.aMedias === 1 ? 'Un alumno se quedó' : `${d.aMedias} alumnos se quedaron`} a medias, sin su primera comida. Están en Rescate, pestaña HOY: es el mejor momento para escribirles.`,
    voz: `${d.aMedias === 1 ? 'Un alumno está' : `${enLetras(d.aMedias)} alumnos están`} a medias. Están en Rescate.`,
  });
  if (d.nuevos >= 3) sug.push({
    texto: `${d.nuevos} alumnos nuevos desde ayer. Si esto sigue así, voy a pedir aumento.`,
    voz: `${enLetras(d.nuevos)} alumnos nuevos desde ayer. Si esto sigue así, voy a pedir aumento.`,
  });
  return sug.slice(0, 2);
}

// Al abrir (la primera vez del día): una sola frase dicha en voz alta
// (saludo, clima y solo lo urgente) y debajo las tarjetas. Las tarjetas
// que piden acción hoy salen en naranja.
async function tarjetasInformeJarvis(users) {
  const [d, clima] = await Promise.all([datosNegocioJarvis(users), climaLimaJarvis()]);
  const urgentes = [];
  // Soles dichos para la voz: "49 soles con 80".
  const solesEnVoz = n => { const e = Math.floor(n); const c = Math.round((n - e) * 100); return `${e} ${e === 1 ? 'sol' : 'soles'}${c ? ` con ${c}` : ''}`; };
  const cobrado = d.pagosDesdeAyer
    ? `Entraron ${d.pagosDesdeAyer === 1 ? 'un pago' : `${enLetras(d.pagosDesdeAyer)} pagos`} por ${solesEnVoz(d.cobradoDesdeAyer)}.`
    : '';
  if (d.pagosPendientes) urgentes.push(`${enLetras(d.pagosPendientes)} ${d.pagosPendientes === 1 ? 'pago' : 'pagos'} por revisar`);
  if (d.vencen) urgentes.push(`${d.vencen === 1 ? 'una prueba' : `${enLetras(d.vencen)} pruebas`} por vencer`);
  if (d.aMedias) urgentes.push(`${d.aMedias === 1 ? 'un alumno' : `${enLetras(d.aMedias)} alumnos`} a medias`);
  const pendientes = juntarFrases(urgentes);
  const frase = `${saludoJarvis()}, señor Jonah.${clima ? ` ${clima}.` : ''}${cobrado ? ` ${cobrado}` : ''} ${pendientes ? pendientes.charAt(0).toUpperCase() + pendientes.slice(1) + '.' : 'Todo en orden por hoy.'}`;
  const tarjetas = [];
  if (d.cobradoDesdeAyer !== null) tarjetas.push({
    titulo: '💰 Cobrado desde ayer', valor: `S/${d.cobradoDesdeAyer.toFixed(2)}`,
    detalle: d.pagosDesdeAyer ? `${d.pagosDesdeAyer} ${d.pagosDesdeAyer === 1 ? 'pago' : 'pagos'}` : 'sin pagos nuevos',
  });
  if (d.pagosPendientes !== null) tarjetas.push({
    titulo: '💳 Pagos por revisar', valor: String(d.pagosPendientes),
    detalle: d.pagosAtrasados ? `${d.pagosAtrasados} esperan más de 12 h` : d.pagosPendientes ? 'revísalos hoy' : 'al día',
    alerta: d.pagosPendientes > 0,
  });
  tarjetas.push({ titulo: '⏳ Pruebas por vencer', valor: String(d.vencen || 0), detalle: 'en los próximos 3 días', alerta: d.vencen > 0 });
  if (d.registraronAyer !== null) tarjetas.push({ titulo: '🍽️ Registraron ayer', valor: `${d.registraronAyer}/${d.activos}`, detalle: 'alumnos activos' });
  if (d.aMedias) tarjetas.push({ titulo: '🆘 A medias', valor: String(d.aMedias), detalle: 'sin primera comida · en Rescate', alerta: true });
  else if (d.nuevos) tarjetas.push({ titulo: '🆕 Nuevos', valor: String(d.nuevos), detalle: 'desde ayer' });
  const sugerencias = await sugerenciasJarvis(users, d).catch(() => []);
  return { frase, visual: { tarjetas }, sugerencias };
}
const CLAVE_INFORME_JARVIS = 'jb-jarvis-informe';
// Texto completo del informe de al abrir, para la memoria de Jarvis: la
// frase, las tarjetas y las sugerencias con los nombres de los alumnos.
function memoriaInformeJarvis(frase, visual, sugerencias) {
  const tarjetas = (visual?.tarjetas || []).map(t => `${t.titulo}: ${t.valor} (${t.detalle})`).join('; ');
  const sug = (sugerencias || []).map(s => `${s.texto}${s.contexto ? ` [${s.contexto}]` : ''}`).join(' ');
  return [frase, tarjetas && `Tarjetas: ${tarjetas}.`, sug && `Sugerencias que le di: ${sug}`].filter(Boolean).join('\n');
}

/* Voz realista (función jarvis-voz, OpenAI). En el selector se guardan como
   "premium:<voz>"; "" (automática) también usa la voz realista. Si la
   función falla o no tiene clave, Jarvis habla con la voz del celular. */
const VOCES_PREMIUM_JARVIS = [
  { id: 'premium:jarvis', nombre: 'Estilo Jarvis · masculina, mayordomo' },
  { id: 'premium:friday', nombre: 'Estilo FRIDAY · femenina, directa' },
  { id: 'premium:cedar', nombre: 'Cedar · masculina, muy natural' },
  { id: 'premium:marin', nombre: 'Marin · femenina, muy natural' },
  { id: 'premium:coral', nombre: 'Coral · femenina' },
  { id: 'premium:nova', nombre: 'Nova · femenina' },
  { id: 'premium:shimmer', nombre: 'Shimmer · femenina' },
  { id: 'premium:sage', nombre: 'Sage · femenina' },
  { id: 'premium:onyx', nombre: 'Onyx · masculina' },
  { id: 'premium:ash', nombre: 'Ash · masculina' },
  { id: 'premium:echo', nombre: 'Echo · masculina' },
];
const esVozPremium = v => !v || String(v).startsWith('premium:');
// Audios ya generados en esta sesión (frases repetidas como "¿Sí, Jonah?"
// no se vuelven a pagar).
const cacheVozJarvis = new Map();
// Si la voz realista falla (sin clave, sin la función, sin internet), se
// recuerda hasta recargar la página para no esperar en cada respuesta.
let vozPremiumCaida = false;
async function audioPremiumJarvis(texto, voz) {
  const clave = `${voz}|${texto}`;
  if (cacheVozJarvis.has(clave)) return cacheVozJarvis.get(clave);
  const { data: { session } } = await supabase.auth.getSession();
  const r = await fetch(`${supabaseUrl}/functions/v1/jarvis-voz`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: supabaseKey, authorization: `Bearer ${session?.access_token || supabaseKey}` },
    body: JSON.stringify({ texto, voz }),
  });
  if (!r.ok || !(r.headers.get('content-type') || '').includes('audio')) { vozPremiumCaida = true; throw new Error('sin voz premium'); }
  const bytes = await r.arrayBuffer();
  if (cacheVozJarvis.size > 30) cacheVozJarvis.delete(cacheVozJarvis.keys().next().value);
  cacheVozJarvis.set(clave, bytes);
  return bytes;
}

/* Divide lo que Jarvis va a decir en frases para la voz realista: la
   primera va sola y corta (se genera en ~1 s y empieza a hablar enseguida);
   las demás se juntan hasta ~350 letras y se preparan mientras suena la
   anterior. */
function trozosParaVoz(texto) {
  const frases = String(texto || '').replace(/\s+/g, ' ').trim()
    .split(/(?<=[.!?…:;])\s+(?=\S)/).filter(Boolean);
  const trozos = [];
  for (const f of frases) {
    const ultimo = trozos[trozos.length - 1];
    const limite = trozos.length <= 1 ? 160 : 350;
    if (ultimo !== undefined && trozos.length > 1 && (ultimo + ' ' + f).length <= limite) trozos[trozos.length - 1] = ultimo + ' ' + f;
    else if (ultimo !== undefined && trozos.length === 1 && ultimo.length < 40 && (ultimo + ' ' + f).length <= limite) trozos[0] = ultimo + ' ' + f;
    else trozos.push(f);
  }
  return trozos.length ? trozos : [String(texto || '')];
}

/* Efecto de la voz estilo Jarvis: un poco más de presencia y cuerpo y un
   compresor suave. Se quitó la sala metálica: en parlantes de celular y
   tablet sonaba como si la voz se trabara. Se arma una vez por contexto de
   audio. */
let cadenaVozJarvis = null;
function cadenaEfectoJarvis(ctx) {
  if (cadenaVozJarvis && cadenaVozJarvis.ctx === ctx) return cadenaVozJarvis;
  const entrada = ctx.createGain();
  const graves = ctx.createBiquadFilter(); graves.type = 'lowshelf'; graves.frequency.value = 180; graves.gain.value = 3;
  const corte = ctx.createBiquadFilter(); corte.type = 'highpass'; corte.frequency.value = 70;
  const presencia = ctx.createBiquadFilter(); presencia.type = 'peaking'; presencia.frequency.value = 3200; presencia.Q.value = 0.9; presencia.gain.value = 3;
  const brillo = ctx.createBiquadFilter(); brillo.type = 'highshelf'; brillo.frequency.value = 7500; brillo.gain.value = 1.5;
  const compresor = ctx.createDynamicsCompressor();
  compresor.threshold.value = -20; compresor.ratio.value = 3; compresor.attack.value = 0.005; compresor.release.value = 0.2;
  entrada.connect(corte).connect(graves).connect(presencia).connect(brillo).connect(compresor);
  cadenaVozJarvis = { ctx, entrada, salida: compresor };
  return cadenaVozJarvis;
}

/* Mientras Jarvis escribe, el bloque de tarjetas (que llega al final del
   texto) no se muestra: se corta desde donde empieza. */
function sinBloqueTarjetas(texto) {
  const i = String(texto || '').indexOf('<tarjetas');
  return i >= 0 ? texto.slice(0, i).trimEnd() : texto;
}

/* Modo pantalla completa tipo HUD: el reactor grande al centro, un anillo
   de texto que orbita, los datos del negocio en vivo alrededor, la hora y
   el chat abajo. Se recuerda en este equipo si Jonah lo dejó activado. */
const CLAVE_HUD_JARVIS = 'jb-jarvis-hud';

function DatoHud({ titulo, valor, detalle, avance = null, alerta = false, i = 0 }) {
  const c = alerta ? '#ffb020' : '#4dd9ff';
  return (
    <div className="relative rounded-md px-3 py-2.5 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, rgba(77,217,255,0.08), rgba(5,12,18,0.75))', border: `1px solid ${alerta ? '#8a5a12' : '#1c6b85'}`,
        boxShadow: `inset 0 0 22px ${alerta ? 'rgba(255,176,32,0.08)' : 'rgba(77,217,255,0.07)'}`, animation: `jv-aparece .5s ease-out ${0.15 + i * 0.1}s both` }}>
      <span className="absolute top-0 left-0 w-2.5 h-2.5" style={{ borderTop: `2px solid ${c}`, borderLeft: `2px solid ${c}` }} />
      <span className="absolute bottom-0 right-0 w-2.5 h-2.5" style={{ borderBottom: `2px solid ${c}`, borderRight: `2px solid ${c}` }} />
      <div className="text-[9px] tracking-[0.22em] uppercase" style={{ fontFamily: 'monospace', color: '#6f92a8' }}>{titulo}</div>
      <div className="text-2xl md:text-3xl font-semibold tabular-nums leading-tight" style={{ fontFamily: 'monospace', color: '#ffffff', textShadow: `0 0 14px ${c}` }}>
        {valor === null || valor === undefined ? '—' : valor}
      </div>
      {detalle && <div className="text-[10px] leading-snug" style={{ color: '#8fb8cc' }}>{detalle}</div>}
      {avance !== null && (
        <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: '#0d1c28' }}>
          <div className="h-full rounded-full" style={{ width: `${Math.round(Math.min(1, Math.max(0, avance)) * 100)}%`, background: c, boxShadow: `0 0 8px ${c}`, transition: 'width .8s ease-out' }} />
        </div>
      )}
    </div>
  );
}

// Texto que orbita alrededor del reactor (se adapta al tamaño del contenedor).
function OrbitaHud({ color }) {
  const texto = 'JONAH BEAST FUEL · SISTEMA EN LÍNEA · DATOS EN VIVO · ESPERANDO ÓRDENES · ';
  return (
    <svg width="100%" height="100%" viewBox="0 0 200 200" className="absolute inset-0 pointer-events-none jv-rot" aria-hidden="true"
      style={{ animation: 'jv-giro 60s linear infinite', overflow: 'visible' }}>
      <defs><path id="jv-orbita" d="M 100 100 m -94 0 a 94 94 0 1 1 188 0 a 94 94 0 1 1 -188 0" /></defs>
      <circle cx="100" cy="100" r="99" fill="none" stroke={color} strokeWidth=".4" strokeDasharray="1.5 4" opacity=".45" />
      {/* textLength = largo del círculo: el texto da la vuelta exacta, sin cortarse ni encimarse */}
      <text fontFamily="monospace" fontSize="5.2" fill={color} opacity=".75">
        <textPath href="#jv-orbita" textLength="585" lengthAdjust="spacing">{texto}</textPath>
      </text>
    </svg>
  );
}

// Tarjetas holográficas con las cifras de una respuesta de Jarvis.
function TarjetasJarvis({ visual }) {
  const tarjetas = visual?.tarjetas || [];
  const barras = visual?.barras;
  const max = barras ? Math.max(1, ...barras.datos.map(d => d.valor)) : 1;
  return (
    <div className="mt-2 flex flex-col gap-2" style={{ animation: 'jv-aparece .45s ease-out' }}>
      {tarjetas.length > 0 && (
        <div className={`grid gap-2 ${tarjetas.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {tarjetas.map((t, i) => (
            <div key={i} className="relative rounded px-3 py-2 overflow-hidden"
              style={{ background: t.alerta ? 'linear-gradient(135deg, rgba(232,89,12,0.18), rgba(10,22,32,0.6))' : 'linear-gradient(135deg, rgba(77,217,255,0.10), rgba(10,22,32,0.6))', border: `1px solid ${t.alerta ? '#E8590C' : '#1c6b85'}`, boxShadow: 'inset 0 0 18px rgba(77,217,255,0.08)', animation: `jv-aparece .4s ease-out ${i * 0.08}s both` }}>
              <span className="absolute top-0 left-0 w-2 h-2" style={{ borderTop: '2px solid #4dd9ff', borderLeft: '2px solid #4dd9ff' }} />
              <div className="text-[9px] tracking-[0.2em] uppercase" style={{ fontFamily: 'monospace', color: '#6f92a8' }}>{t.titulo}</div>
              <div className="text-xl font-semibold tabular-nums leading-tight" style={{ color: '#ffffff', textShadow: '0 0 12px rgba(77,217,255,0.7)', fontFamily: 'monospace' }}>{t.valor}</div>
              {t.detalle && <div className="text-[10px] leading-snug" style={{ color: '#8fb8cc' }}>{t.detalle}</div>}
            </div>
          ))}
        </div>
      )}
      {barras && (
        <div className="rounded px-3 py-2" style={{ background: 'rgba(10,22,32,0.6)', border: '1px solid #163244' }}>
          {barras.titulo && <div className="text-[9px] tracking-[0.2em] uppercase mb-2" style={{ fontFamily: 'monospace', color: '#6f92a8' }}>{barras.titulo}</div>}
          <div className="flex items-end gap-1.5 h-20">
            {barras.datos.map((d, i) => (
              <div key={i} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full">
                <span className="text-[9px] tabular-nums mb-0.5" style={{ color: '#dff2ff', fontFamily: 'monospace' }}>{Math.round(d.valor * 10) / 10}</span>
                <div className="w-full rounded-t" style={{
                  height: `${Math.max(4, (d.valor / max) * 100)}%`, background: 'linear-gradient(180deg, #7ff0ff, #1c6b85)',
                  boxShadow: '0 0 8px rgba(77,217,255,0.6)', transformOrigin: 'bottom', animation: `jv-crece .6s ease-out ${i * 0.05}s both`,
                }} />
              </div>
            ))}
          </div>
          <div className="flex gap-1.5 mt-1">
            {barras.datos.map((d, i) => (
              <span key={i} className="flex-1 min-w-0 text-center text-[8px] truncate" style={{ color: '#6f92a8', fontFamily: 'monospace' }}>{d.etiqueta}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const COLOR_ESTADO_JARVIS = { reposo: '#4dd9ff', escuchando: '#ff5c5c', pensando: '#ffb020', hablando: '#7ff0ff' };

const TEXTO_ESTADO_JARVIS = { reposo: 'EN LÍNEA', escuchando: 'ESCUCHANDO', pensando: 'PROCESANDO', hablando: 'RESPONDIENDO' };

function ReactorJarvis({ estado = 'reposo', tam = 120, pulso = 0 }) {
  const c = COLOR_ESTADO_JARVIS[estado] || COLOR_ESTADO_JARVIS.reposo;
  const rapido = estado === 'pensando' ? 0.35 : estado === 'escuchando' ? 0.6 : 1;
  const onda = ONDA_JARVIS[estado] || ONDA_JARVIS.reposo;
  const barras = Array.from({ length: 60 });
  const segmentos = Array.from({ length: 10 });
  return (
    <svg width={tam} height={tam} viewBox="0 0 200 200" aria-hidden="true" style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id={`jv-nucleo-${estado}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor={c} />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </radialGradient>
        <filter id="jv-brillo" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* todo el reactor respira suavemente */}
      <g className="jv-rot" style={{ animation: 'jv-respira 3.2s ease-in-out infinite' }}>
        {/* aura */}
        <circle cx="100" cy="100" r="98" fill={c} fillOpacity=".16" className="jv-rot" style={{ animation: 'jv-aura 2.6s ease-in-out infinite' }} />
        {/* onda de voz: 60 barras que laten todo el tiempo, desfasadas para
            que la onda recorra el anillo (fuera del filtro de brillo para
            que el celular no se esfuerce) */}
        <g className="jv-rot" style={{ animation: `jv-giro ${24 * rapido}s linear infinite` }}>
          <circle cx="100" cy="100" r="93" stroke={c} strokeWidth="1" fill="none" opacity=".45" />
          {barras.map((_, i) => (
            <g key={i} transform={`rotate(${i * 6} 100 100)`}>
              <line x1="100" y1="6" x2="100" y2={6 + (i % 5 === 0 ? 14 : 10) * onda.alto} stroke={c}
                strokeWidth={i % 5 === 0 ? 2.4 : 1.4} strokeLinecap="round" opacity={i % 5 === 0 ? .95 : .6}
                className="jv-barra"
                style={{ animation: `jv-onda ${onda.dur}s ease-in-out ${-(i * onda.paso)}s infinite` }} />
            </g>
          ))}
        </g>
        <g filter="url(#jv-brillo)" stroke={c} fill="none">
          {/* anillo punteado que oscila de un lado a otro */}
          <g className="jv-rot" style={{ animation: `jv-oscila ${5 * rapido}s ease-in-out infinite alternate` }}>
            <circle cx="100" cy="100" r="76" strokeWidth="3" strokeDasharray="4 10" opacity=".8" />
          </g>
          {/* arcos que corren (más rápidos al pensar) */}
          <g className="jv-rot" style={{ animation: `jv-giro ${(estado === 'pensando' ? 1.6 : 6)}s linear infinite` }}>
            <circle cx="100" cy="100" r="64" strokeWidth="4" strokeDasharray="60 342" strokeLinecap="round" opacity=".95" />
            <circle cx="100" cy="100" r="64" strokeWidth="4" strokeDasharray="30 372" strokeDashoffset="-200" strokeLinecap="round" opacity=".6" />
          </g>
          {/* segmentos del reactor */}
          <g className="jv-rot" style={{ animation: `jv-giro-inv ${16 * rapido}s linear infinite` }}>
            {segmentos.map((_, i) => (
              <path key={i} d="M100 50 L106 50 L104 62 L96 62 L94 50 Z" fill={c} fillOpacity=".25" strokeWidth="1.2"
                transform={`rotate(${i * 36} 100 100)`} />
            ))}
          </g>
          {/* anillo interior que oscila al revés */}
          <g className="jv-rot" style={{ animation: `jv-oscila ${3.4 * rapido}s ease-in-out infinite alternate-reverse` }}>
            <circle cx="100" cy="100" r="40" strokeWidth="1.2" strokeDasharray="18 8" opacity=".7" />
          </g>
          <circle cx="100" cy="100" r="34" strokeWidth="2" opacity=".9" />
        </g>
        {/* núcleo: late siempre y da un golpe con cada palabra que dice */}
        <g className="jv-rot" style={{ animation: `jv-late ${estado === 'hablando' ? 0.5 : estado === 'escuchando' ? 1 : 2.4}s ease-in-out infinite` }}>
          <g key={pulso} className="jv-rot" style={pulso ? { animation: 'jv-golpe .28s ease-out' } : undefined}>
            <circle cx="100" cy="100" r="30" fill={`url(#jv-nucleo-${estado})`} />
            <circle cx="100" cy="100" r="12" fill="#ffffff" opacity=".9" />
          </g>
        </g>
      </g>
    </svg>
  );
}

// Botón flotante para abrir a Jarvis desde cualquier pestaña del panel.
function BotonJarvis({ onClick }) {
  return (
    <button onClick={onClick} aria-label="Abrir a Jarvis"
      className="fixed z-40 flex flex-col items-center gap-1 group"
      style={{ right: 'max(1rem, env(safe-area-inset-right))', bottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
      <style>{ESTILOS_JARVIS}</style>
      <span className="rounded-full transition-transform duration-300 group-hover:scale-110 group-active:scale-95"
        style={{ background: 'radial-gradient(circle, rgba(10,22,32,0.95) 55%, rgba(10,22,32,0) 72%)', filter: 'drop-shadow(0 0 14px rgba(77,217,255,0.55))' }}>
        <ReactorJarvis estado="reposo" tam={72} />
      </span>
      <span className="text-[10px] tracking-[0.3em] px-2 py-0.5 rounded"
        style={{ fontFamily: 'monospace', color: '#4dd9ff', background: 'rgba(10,22,32,0.85)', border: '1px solid #1c6b85', textShadow: '0 0 6px #4dd9ff' }}>
        JARVIS
      </span>
    </button>
  );
}

function JarvisPanel({ onClose, users }) {
  const [turnos, setTurnos] = useState([
    { role: 'assistant', content: '', escribiendo: true },
  ]);
  const [avisoMic, setAvisoMic] = useState('');
  const [hud, setHud] = useState(() => { try { return localStorage.getItem(CLAVE_HUD_JARVIS) === '1'; } catch { return false; } });
  const [datosHud, setDatosHud] = useState(null);
  const [ahoraHud, setAhoraHud] = useState(() => new Date());
  // En modo HUD: datos del negocio al abrir y cada minuto, y reloj en vivo.
  useEffect(() => {
    if (!hud) return undefined;
    let vivo = true;
    const cargar = () => datosNegocioJarvis(users).then(d => { if (vivo) setDatosHud(d); });
    cargar();
    const datos = setInterval(cargar, 60000);
    const reloj = setInterval(() => setAhoraHud(new Date()), 1000);
    return () => { vivo = false; clearInterval(datos); clearInterval(reloj); };
  }, [hud, users]);
  function cambiarHud() {
    const nuevo = !hud;
    setHud(nuevo);
    sonidoJarvis(nuevo ? 'despierto' : 'cerrar');
    try { localStorage.setItem(CLAVE_HUD_JARVIS, nuevo ? '1' : '0'); } catch {}
    // Pantalla completa de verdad donde el navegador lo permite (en iPhone no).
    try {
      if (nuevo && document.documentElement.requestFullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
      if (!nuevo && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    } catch {}
  }
  const despiertoHastaRef = useRef(0);
  const [input, setInput] = useState('');
  const [pensando, setPensando] = useState(false);
  const [vozOn, setVozOn] = useState(true);
  const [modoContinuo, setModoContinuo] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const [hablando, setHablando] = useState(false);
  const [pulsoVoz, setPulsoVoz] = useState(0); // sube con cada palabra que dice Jarvis
  const logRef = useRef(null);
  const recogRef = useRef(null);
  const modoContinuoRef = useRef(false);
  const pausadoParaHablarRef = useRef(false);
  const micActivoRef = useRef(false);
  const cerrarMicTrasHablarRef = useRef(false);
  const vozOnRef = useRef(true);

  useEffect(() => { modoContinuoRef.current = modoContinuo; }, [modoContinuo]);
  useEffect(() => { vozOnRef.current = vozOn; sonidosJarvisActivos = vozOn; }, [vozOn]);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [turnos, pensando]);
  useEffect(() => () => { try { recogRef.current && recogRef.current.stop(); window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {} }, []);

  // Voz de Jarvis: la que Jonah Beast elija en el selector se guarda en
  // este equipo (localStorage) y se usa siempre. Si no eligió ninguna, o
  // la guardada ya no existe en este navegador, se prefiere una femenina.
  const vozElegidaRef = useRef(null);
  const [vocesEs, setVocesEs] = useState([]);
  const [vozGuardada, setVozGuardada] = useState(() => {
    try { return localStorage.getItem(CLAVE_VOZ_JARVIS) || ''; } catch { return ''; }
  });
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    function cargarVoces() {
      const voces = window.speechSynthesis.getVoices();
      if (!voces.length) return;
      const candidatas = voces
        .filter(v => (v.lang || '').toLowerCase().startsWith('es'))
        .sort((a, b) => a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name));
      setVocesEs(candidatas);
    }
    cargarVoces();
    window.speechSynthesis.onvoiceschanged = cargarVoces;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);
  useEffect(() => {
    vozElegidaRef.current = vocesEs.find(v => v.voiceURI === vozGuardada) || vozFemeninaPorDefecto(vocesEs);
  }, [vocesEs, vozGuardada]);
  const vozGuardadaRef = useRef(vozGuardada);
  vozGuardadaRef.current = vozGuardada;

  // Voz realista: el audio se reproduce con el mismo contexto de audio de
  // los sonidos (ya habilitado al tocar el botón de Jarvis) y pasa por un
  // analizador, así el núcleo del reactor late al ritmo real de la voz.
  const fuenteVozRef = useRef(null);
  const turnoVozRef = useRef(0);
  function callarVozPremium() {
    turnoVozRef.current++;
    try { fuenteVozRef.current && fuenteVozRef.current.stop(); } catch {}
    fuenteVozRef.current = null;
  }
  useEffect(() => () => callarVozPremium(), []);
  // Habla por frases: pide el audio de todas a la vez, pero empieza apenas
  // llega la primera (antes esperaba el audio de toda la respuesta). Si la
  // primera falla, se usa la voz del celular; si falla una posterior, se
  // corta ahí sin repetir lo ya dicho.
  async function hablarPremium(texto, voz, alTerminar) {
    const mio = ++turnoVozRef.current;
    const ctx = contextoAudioJarvis();
    if (!ctx) throw new Error('sin audio');
    const trozos = trozosParaVoz(texto);
    const audios = trozos.map((t, i) => {
      const p = audioPremiumJarvis(t, voz);
      if (i > 0) p.catch(() => {}); // se maneja al llegar su turno
      return p;
    });
    const primero = await ctx.decodeAudioData((await audios[0]).slice(0));
    if (mio !== turnoVozRef.current) return; // llegó otra respuesta mientras tanto
    const analizador = ctx.createAnalyser();
    analizador.fftSize = 512;
    const destino = (voz === 'jarvis' || voz === 'friday') ? cadenaEfectoJarvis(ctx) : null;
    if (destino) { destino.salida.disconnect(); destino.salida.connect(analizador); }
    analizador.connect(ctx.destination);
    const muestras = new Uint8Array(analizador.fftSize);
    let ultimoGolpe = 0, anterior = 0, activo = true;
    const medir = () => {
      if (!activo) return;
      analizador.getByteTimeDomainData(muestras);
      let suma = 0;
      for (let i = 0; i < muestras.length; i++) { const x = (muestras[i] - 128) / 128; suma += x * x; }
      const nivel = Math.sqrt(suma / muestras.length);
      const ahora = performance.now();
      if (nivel > 0.06 && nivel > anterior * 1.25 && ahora - ultimoGolpe > 140) { ultimoGolpe = ahora; setPulsoVoz(n => n + 1); }
      anterior = nivel;
      requestAnimationFrame(medir);
    };
    let fuenteActual = null;
    const terminar = () => {
      activo = false;
      if (fuenteVozRef.current === fuenteActual) fuenteVozRef.current = null;
      try { analizador.disconnect(); } catch {}
      // Si otra respuesta la interrumpió, esa otra reanuda el micro al
      // terminar. Antes esta también lo reanudaba y el micro se prendía
      // mientras Jarvis seguía hablando: se escuchaba a sí mismo y se trababa.
      if (mio === turnoVozRef.current) alTerminar();
    };
    const sonar = (buffer) => new Promise(resolve => {
      const fuente = ctx.createBufferSource();
      fuente.buffer = buffer;
      fuente.connect(destino ? destino.entrada : analizador);
      fuenteVozRef.current = fuente;
      fuenteActual = fuente;
      fuente.onended = resolve;
      fuente.start();
    });
    setHablando(true);
    requestAnimationFrame(medir);
    (async () => {
      // Si se calla o llega otra respuesta, se corta igual que antes (al
      // detener el audio también se avisaba que terminó).
      let buffer = primero;
      for (let i = 0; i < trozos.length; i++) {
        if (mio !== turnoVozRef.current) break;
        if (i > 0) {
          try { buffer = await ctx.decodeAudioData((await audios[i]).slice(0)); } catch { break; }
          if (mio !== turnoVozRef.current) break;
        }
        await sonar(buffer);
      }
      terminar();
    })();
  }

  function cambiarVoz(voiceURI) {
    setVozGuardada(voiceURI);
    try {
      if (voiceURI) localStorage.setItem(CLAVE_VOZ_JARVIS, voiceURI);
      else localStorage.removeItem(CLAVE_VOZ_JARVIS);
    } catch {}
  }

  // Frase de prueba con la voz elegida en el selector. Se dispara dentro del
  // mismo toque del botón, así el navegador no bloquea el audio.
  function probarVoz() {
    const frase = 'Hola Jonah Beast, así sonaré cuando te responda.';
    if (esVozPremium(vozGuardada)) {
      contextoAudioJarvis();
      pausarMic();
      try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch {}
      const fin = () => { setHablando(false); reanudarMicSiCorresponde(); };
      hablarPremium(frase, (vozGuardada || VOCES_PREMIUM_JARVIS[0].id).slice(8), fin).catch(() => {
        setTurnos(ts => [...ts, { role: 'assistant', content: 'La voz realista aún no está disponible: te hablaré con la voz del celular.' }]);
        fin();
      });
      return;
    }
    if (!('speechSynthesis' in window)) return;
    const voz = vocesEs.find(v => v.voiceURI === vozGuardada) || vozFemeninaPorDefecto(vocesEs);
    try {
      pausarMic();
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance('Hola Jonah Beast, así sonaré cuando te responda.');
      if (voz) { u.voice = voz; u.lang = voz.lang; } else u.lang = 'es-PE';
      u.pitch = 0.55; u.rate = 0.94;
      u.onstart = () => setHablando(true);
      u.onboundary = () => setPulsoVoz(n => n + 1);
      u.onend = () => { setHablando(false); reanudarMicSiCorresponde(); };
      u.onerror = () => { setHablando(false); reanudarMicSiCorresponde(); };
      window.speechSynthesis.speak(u);
    } catch (e) { reanudarMicSiCorresponde(); }
  }

  // en modo continuo, el micro se pausa mientras Jarvis habla (si no,
  // el parlante se retroalimentaría con el mismo micrófono) y se
  // reanuda solo apenas termina de hablar
  function hablar(texto) {
    texto = (texto || '').replace(/J\.?\s*A\.?\s*R\.?\s*V\.?\s*I\.?\s*S\.?/gi, 'Jarvis');
    // Quita símbolos de markdown que la voz leería literalmente
    // ("asterisco asterisco") -- deja solo el texto limpio para hablar,
    // el chat de texto sigue mostrando el markdown normal.
    texto = texto
      .replace(/\*\*(.+?)\*\*/g, '$1')       // **negrita**
      .replace(/\*(.+?)\*/g, '$1')           // *cursiva*
      .replace(/`{1,3}(.+?)`{1,3}/g, '$1')   // `código`
      .replace(/^#{1,6}\s+/gm, '')           // # Encabezados
      .replace(/^[-*+]\s+/gm, '')            // - viñetas
      .replace(/^\d+\.\s+/gm, '')            // 1. listas numeradas
      .replace(/\[(.+?)\]\(.+?\)/g, '$1');   // [texto](enlace)
    // números de 6+ dígitos seguidos (celulares, IDs) se leen dígito por
    // dígito -- si no, el sintetizador los lee como si fueran millones
    texto = texto.replace(/\d{6,}/g, (n) => n.split('').join(' '));
    if (!vozOnRef.current) {
      if (modoContinuoRef.current) reanudarMicSiCorresponde();
      return;
    }
    callarVozPremium();
    if (esVozPremium(vozGuardadaRef.current) && !vozPremiumCaida) {
      pausarMic();
      try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch {}
      const voz = (vozGuardadaRef.current || VOCES_PREMIUM_JARVIS[0].id).slice(8);
      hablarPremium(texto, voz, () => { setHablando(false); reanudarMicSiCorresponde(); })
        .catch(() => hablarConCelular(texto));
      return;
    }
    hablarConCelular(texto);
  }

  // Voz del celular (la de siempre): se usa si se eligió una voz del
  // celular o si la voz realista no está disponible.
  function hablarConCelular(texto) {
    if (!vozOnRef.current || !('speechSynthesis' in window)) {
      if (modoContinuoRef.current) reanudarMicSiCorresponde();
      return;
    }
    try {
      pausarMic();
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(texto);
      if (vozElegidaRef.current) { u.voice = vozElegidaRef.current; u.lang = vozElegidaRef.current.lang; }
      else u.lang = 'es-PE';
      u.pitch = 0.55; u.rate = 0.94;
      u.onstart = () => setHablando(true);
      u.onboundary = () => setPulsoVoz(n => n + 1);
      u.onend = () => { setHablando(false); reanudarMicSiCorresponde(); };
      u.onerror = () => { setHablando(false); reanudarMicSiCorresponde(); };
      // iOS a veces "pierde" la voz si speak() llega inmediatamente
      // después de cancel() -- un respiro corto lo hace confiable ahí
      // sin que se note la demora en otros navegadores.
      setTimeout(() => { try { window.speechSynthesis.speak(u); } catch (e) { reanudarMicSiCorresponde(); } }, 80);
    } catch (e) { reanudarMicSiCorresponde(); }
  }

  const enviarRef = useRef(null);
  enviarRef.current = enviar;
  const hablarRef = useRef(null);
  hablarRef.current = hablar;

  // Al abrir: la primera vez del día dice una sola frase (saludo, clima y
  // lo urgente) y muestra las tarjetas; las demás veces, un saludo corto.
  // El informe completo hablado sigue en el botón "Informe del día".
  async function darInforme() {
    setTurnos(ts => [...ts.filter(m => !(m.escribiendo && !m.content)), { role: 'assistant', content: '', escribiendo: true }]);
    setPensando(true);
    const texto = await armarInformeJarvis(users);
    setPensando(false);
    setTurnos(ts => [...ts.filter(m => !(m.escribiendo && !m.content)), { role: 'assistant', content: texto }]);
    sonidoJarvis('respuesta');
    hablarRef.current(texto);
  }
  const abiertoRef = useRef(false);
  useEffect(() => {
    if (abiertoRef.current) return;
    abiertoRef.current = true;
    sonidoJarvis('abrir');
    let yaHoy = false;
    try { yaHoy = localStorage.getItem(CLAVE_INFORME_JARVIS) === todayISO(); localStorage.setItem(CLAVE_INFORME_JARVIS, todayISO()); } catch {}
    setTurnos([{ role: 'assistant', content: `${saludoJarvis()}, señor Jonah. A la orden. ¿Qué necesita?` }]);
    if (!yaHoy) {
      tarjetasInformeJarvis(users).then(({ frase, visual, sugerencias }) => {
        setTurnos(ts => ts.map((m, i) => (i === 0 ? { ...m, content: frase, visual, sugerencias, contexto: memoriaInformeJarvis(frase, visual, sugerencias) } : m)));
        sonidoJarvis('respuesta');
        hablarRef.current(sugerencias?.[0] ? `${frase} ${sugerencias[0].voz}` : frase);
      }).catch(() => {});
    }
  }, []);
  function cerrar() {
    sonidoJarvis('cerrar');
    try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {}); } catch {}
    onClose();
  }

  async function enviar(texto) {
    const t = (texto || '').trim();
    if (!t || pensando) return;
    setInput('');
    const nuevosTurnos = [...turnos, { role: 'user', content: t }];
    setTurnos(nuevosTurnos);
    setPensando(true);
    if (modoContinuoRef.current) pausarMic();
    // Al historial solo van los textos (no los botones de confirmar). El
    // informe de al abrir va con todo lo que mostró y sugirió (nombres
    // incluidos), para que Jarvis recuerde de quién habló.
    const historial = nuevosTurnos.slice(-8).map(m => ({ role: m.role, content: m.contexto || m.content }));
    let enCurso = '';
    try {
      // La respuesta aparece mientras se escribe; la voz espera al final
      // para leerla completa. "reiniciar" = Jarvis va a consultar datos:
      // se borra lo escrito y se muestra solo la respuesta final.
      const data = await llamarJarvis({ pregunta: t, historial, stream: true }, (ev) => {
        if (ev.tipo === 'reiniciar') enCurso = '';
        else if (ev.tipo === 'texto') enCurso += ev.texto;
        setTurnos([...nuevosTurnos, { role: 'assistant', content: enCurso, escribiendo: true }]);
      });
      const acciones = (data.acciones || []).map(a => ({ ...a, estado: 'pendiente' }));
      setTurnos([...nuevosTurnos, { role: 'assistant', content: data.respuesta, ...(acciones.length ? { acciones } : {}), ...(data.visual ? { visual: data.visual } : {}) }]);
      sonidoJarvis('respuesta');
      hablar(data.respuesta);
    } catch (e) {
      const msgErr = 'No pude procesar eso ahora mismo. Intenta de nuevo.';
      setTurnos([...nuevosTurnos, { role: 'assistant', content: msgErr }]);
      hablar(msgErr);
    } finally {
      setPensando(false);
    }
  }

  // Botones del chat para confirmar (o cancelar) una acción que Jarvis dejó
  // preparada, como activar el add-on de fotos. Solo al confirmar se hace
  // el cambio en la base de datos.
  async function responderAccion(iTurno, iAccion, confirmar) {
    const accion = turnos[iTurno]?.acciones?.[iAccion];
    if (!accion || accion.estado !== 'pendiente') return;
    const marcar = (estado) => setTurnos(ts => ts.map((m, i) => i !== iTurno ? m
      : { ...m, acciones: m.acciones.map((a, j) => j === iAccion ? { ...a, estado } : a) }));
    const decir = (msg) => { setTurnos(ts => [...ts, { role: 'assistant', content: msg }]); hablar(msg); };
    if (!confirmar) { marcar('cancelada'); decir('Entendido, señor: no hice ningún cambio.'); return; }
    marcar('enviando');
    try {
      const data = await llamarJarvis({ confirmar: { tipo: accion.tipo, username: accion.username, dias: accion.dias, pago_id: accion.pago_id, motivo: accion.motivo } });
      marcar(data.ok ? 'hecha' : 'pendiente');
      decir(data.respuesta);
    } catch (e) {
      marcar('pendiente');
      decir('No pude hacerlo ahora mismo. Intenta de nuevo.');
    }
  }
  // Mensaje de WhatsApp listo: se abre con el texto escrito y queda marcado.
  function abrirWhatsAppAccion(iTurno, iAccion) {
    setTurnos(ts => ts.map((m, i) => i !== iTurno ? m
      : { ...m, acciones: m.acciones.map((a, j) => j === iAccion ? { ...a, estado: 'hecha' } : a) }));
  }

  // Los navegadores solo permiten que suene una voz sintetizada si se
  // dispara DENTRO del toque directo del usuario -- como enviar() espera
  // la respuesta de Jarvis (una llamada de red) antes de hablar, para
  // cuando llega la respuesta el navegador ya no lo reconoce como parte
  // del mismo toque y bloquea el audio en silencio. Se "desbloquea" el
  // motor de voz aquí mismo, de forma síncrona, en el instante del toque.
  function desbloquearVoz() {
    if (!('speechSynthesis' in window)) return;
    try {
      // iOS Safari a veces ignora por completo una frase vacía o con
      // volumen en 0 -- no la reconoce como una utterance real y no
      // desbloquea el audio. Se usa un carácter real y volumen bajo
      // pero distinto de cero, que sí registra en iOS.
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance('.');
      u.volume = 0.01;
      u.rate = 10;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  function pausarMic() {
    pausadoParaHablarRef.current = true;
    try { recogRef.current && recogRef.current.stop(); } catch (e) {}
  }

  function reanudarMicSiCorresponde() {
    pausadoParaHablarRef.current = false;
    // Se despidió por voz: tras la respuesta se apaga el micrófono.
    if (cerrarMicTrasHablarRef.current) {
      cerrarMicTrasHablarRef.current = false;
      if (modoContinuoRef.current) {
        modoContinuoRef.current = false;
        setModoContinuo(false);
        setEscuchando(false);
        try { recogRef.current && recogRef.current.stop(); } catch (e) {}
        sonidoJarvis('cerrar');
        setAvisoMic('Micrófono apagado. Tócalo cuando me necesite.');
      }
      return;
    }
    // Tras responder, se le puede seguir hablando sin decir "Jarvis".
    if (modoContinuoRef.current) despiertoHastaRef.current = Date.now() + SEGUNDOS_CONVERSACION_JARVIS * 1000;
    // Un respiro para que el parlante termine antes de volver a escuchar.
    if (modoContinuoRef.current) setTimeout(() => arrancarReconocimiento(), 700);
  }

  function arrancarReconocimiento() {
    // Nunca dos micrófonos a la vez (antes el micro podía reiniciarse por
    // dos lados, chocaban y entraba en un ciclo de errores y reintentos).
    if (!modoContinuoRef.current || pausadoParaHablarRef.current || micActivoRef.current) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const recog = new SR();
    recog.lang = 'es-PE'; recog.continuous = true; recog.interimResults = false; recog.maxAlternatives = 1;
    recog.onresult = (e) => {
      const ultimo = e.results[e.results.length - 1];
      // Se usa siempre la versión más reciente de enviar() (con la
      // conversación al día), no la del momento en que se prendió el micro.
      if (!ultimo.isFinal) return;
      // Lo que llega después de pausar el micro (mientras Jarvis habla) se
      // ignora: puede ser su propia voz.
      if (pausadoParaHablarRef.current) return;
      const dicho = ultimo[0].transcript.trim();
      const pedido = quitarPalabraJarvis(dicho);
      const enConversacion = Date.now() < despiertoHastaRef.current;
      if (pedido === null && !enConversacion) {
        // No lo llamaron: no responde (puedes hablar con otras personas).
        setAvisoMic(`Escuché "${dicho.slice(0, 40)}${dicho.length > 40 ? '…' : ''}". Di «Jarvis» primero para hablarme.`);
        return;
      }
      setAvisoMic('');
      const texto = pedido === null ? dicho : pedido;
      if (!texto) {
        // Solo dijo "Jarvis": responde y espera la orden.
        despiertoHastaRef.current = Date.now() + SEGUNDOS_CONVERSACION_JARVIS * 1000;
        sonidoJarvis('despierto');
        setTurnos(ts => [...ts, { role: 'assistant', content: '¿Sí, señor?' }]);
        hablarRef.current('¿Sí, señor?');
        return;
      }
      despiertoHastaRef.current = 0;
      sonidoJarvis('despierto');
      cerrarMicTrasHablarRef.current = esDespedidaJarvis(texto);
      enviarRef.current(texto);
    };
    recog.onerror = (e) => {
      micActivoRef.current = false;
      setEscuchando(false);
      // Errores que no se arreglan reintentando (sin permiso, sin micrófono
      // o sin servicio de voz): se apaga el micro y se avisa en el chat, en
      // vez de seguir intentando en silencio.
      const aviso = AVISOS_MIC[e && e.error];
      if (aviso) { apagarMicConAviso(aviso); return; }
      if (modoContinuoRef.current && !pausadoParaHablarRef.current) setTimeout(() => arrancarReconocimiento(), 800);
    };
    recog.onend = () => { micActivoRef.current = false; setEscuchando(false); if (modoContinuoRef.current && !pausadoParaHablarRef.current) setTimeout(() => arrancarReconocimiento(), 300); };
    try { recog.start(); micActivoRef.current = true; recogRef.current = recog; setEscuchando(true); } catch (e) {}
  }

  function apagarMicConAviso(aviso) {
    modoContinuoRef.current = false;
    setModoContinuo(false);
    setEscuchando(false);
    try { recogRef.current && recogRef.current.stop(); } catch (e) {}
    setTurnos(ts => [...ts, { role: 'assistant', content: aviso }]);
  }

  function toggleModoContinuo() {
    const nuevo = !modoContinuo;
    if (nuevo && !(window.SpeechRecognition || window.webkitSpeechRecognition)) {
      apagarMicConAviso(AVISOS_MIC['sin-soporte']);
      return;
    }
    setModoContinuo(nuevo);
    modoContinuoRef.current = nuevo;
    // Este toque también habilita la voz de Jarvis para las respuestas
    // que lleguen por micrófono (el navegador exige un toque primero).
    if (nuevo) { pausadoParaHablarRef.current = false; cerrarMicTrasHablarRef.current = false; desbloquearVoz(); sonidoJarvis('escuchar'); setAvisoMic(''); arrancarReconocimiento(); }
    else { pausarMic(); setEscuchando(false); }
  }

  const estadoJarvis = pensando ? 'pensando' : hablando ? 'hablando' : escuchando ? 'escuchando' : 'reposo';
  const colorEstado = COLOR_ESTADO_JARVIS[estadoJarvis];
  const esquina = (pos) => (
    <span className="absolute w-5 h-5 pointer-events-none" style={{
      ...pos, borderColor: '#4dd9ff', borderStyle: 'solid', opacity: 0.8,
      borderWidth: `${pos.top !== undefined ? 2 : 0}px ${pos.right !== undefined ? 2 : 0}px ${pos.bottom !== undefined ? 2 : 0}px ${pos.left !== undefined ? 2 : 0}px`,
    }} />
  );

  const bloqueVoz = (
<div className="relative flex items-center gap-2 px-4 py-2" style={{ borderBottom: '1px solid #163244', borderTop: '1px solid #163244' }}>
            <label htmlFor="jarvis-voz" className="text-[10px] shrink-0" style={{ color: '#6f92a8', fontFamily: 'monospace' }}>VOZ</label>
            <select id="jarvis-voz"
              value={esVozPremium(vozGuardada) ? (vozGuardada || VOCES_PREMIUM_JARVIS[0].id) : (vocesEs.some(v => v.voiceURI === vozGuardada) ? vozGuardada : VOCES_PREMIUM_JARVIS[0].id)}
              onChange={e => cambiarVoz(e.target.value)}
              className="flex-1 min-w-0 rounded px-2 py-1 text-xs outline-none"
              style={{ background: '#050a0f', border: '1px solid #163244', color: '#dff2ff' }}>
              <optgroup label="✨ Voz realista">
                {VOCES_PREMIUM_JARVIS.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
              </optgroup>
              {vocesEs.length > 0 && (
                <optgroup label="Voces del celular">
                  {vocesEs.map(v => (
                    <option key={v.voiceURI} value={v.voiceURI}>{v.name} · {v.lang}</option>
                  ))}
                </optgroup>
              )}
            </select>
            <button onClick={probarVoz}
              className="text-xs px-2 py-1 rounded-full shrink-0 disabled:opacity-40"
              style={{ border: '1px solid #4dd9ff', color: '#4dd9ff', fontFamily: 'monospace' }}>
              ▶ Probar
            </button>
          </div>
  );
  const bloqueRegistro = (
<div ref={logRef} className="relative flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3" style={{ minHeight: hud ? 0 : 180 }}>
          {turnos.map((m, i) => (m.escribiendo && !m.content) ? null : (
            <div key={i} className="text-sm leading-relaxed" style={{ color: '#dff2ff', maxWidth: '92%', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div className="text-[10px] mb-1" style={{ fontFamily: 'monospace', color: m.role === 'user' ? '#6f92a8' : '#4dd9ff', textAlign: m.role === 'user' ? 'right' : 'left' }}>
                {m.role === 'user' ? 'TÚ' : 'JARVIS'}
              </div>
              {m.role === 'user'
                ? <div className="px-3 py-2 rounded" style={{ background: 'rgba(13,28,40,0.9)', border: '1px solid #163244' }}>{m.content}</div>
                : <div className="pl-3 py-1" style={{ borderLeft: '2px solid #4dd9ff', boxShadow: '-6px 0 12px -8px #4dd9ff' }}><TextoJarvis texto={(m.escribiendo ? sinBloqueTarjetas(m.content) : m.content) + (m.escribiendo ? ' ▍' : '')} /></div>}
              {m.role !== 'user' && m.visual && <TarjetasJarvis visual={m.visual} />}
              {m.role !== 'user' && (m.sugerencias || []).map((sg, j) => (
                <div key={`sg${j}`} className="mt-2 rounded px-3 py-2" style={{ background: 'rgba(232,89,12,0.10)', border: '1px solid rgba(232,89,12,0.45)', animation: `jv-aparece .4s ease-out ${0.3 + j * 0.1}s both` }}>
                  <div className="text-[9px] tracking-[0.2em] uppercase mb-0.5" style={{ fontFamily: 'monospace', color: '#FF7020' }}>SUGERENCIA</div>
                  <div className="text-[13px] leading-snug" style={{ color: '#dff2ff' }}>{sg.texto}</div>
                  {sg.url && (
                    <a href={sg.url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold rounded px-3 py-1.5"
                      style={{ background: '#E8590C', color: '#0a0d10' }}>
                      <MessageCircle size={13} /> {sg.boton}
                    </a>
                  )}
                </div>
              ))}
              {(m.acciones || []).map((a, j) => (
                <div key={j} className="mt-2 rounded p-2.5 flex flex-col gap-2" style={{ background: '#0d1c28', border: '1px solid #1c6b85' }}>
                  <div className="text-xs">
                    {a.tipo === 'aprobar_pago' ? (
                      <>Aprobar el pago de <strong style={{ color: '#ffffff' }}>{a.nombre}</strong>: S/{Number(a.monto || 0).toFixed(2)}{a.plan_meses ? ` · plan de ${a.plan_meses} ${Number(a.plan_meses) === 1 ? 'mes' : 'meses'}` : ''}{a.metodo ? ` · ${a.metodo}` : ''}. Queda activo hasta el {a.hasta}{a.bono ? ' (incluye +7 días de regalo)' : ''}.</>
                    ) : a.tipo === 'regalar_dias' ? (
                      <>Regalar {a.dias} días de Premium a <strong style={{ color: '#ffffff' }}>{a.nombre}</strong>{a.desde_hoy ? ' desde hoy' : ''} (hasta el {a.hasta}).</>
                    ) : a.tipo === 'whatsapp' ? (
                      <>Mensaje para <strong style={{ color: '#ffffff' }}>{a.nombre}</strong>:<span className="block mt-1 whitespace-pre-line" style={{ color: '#b9d4e3' }}>{a.texto}</span></>
                    ) : a.tipo === 'activar_foto' ? (
                      <>Activar el reconocimiento por foto a <strong style={{ color: '#ffffff' }}>{a.nombre}</strong> por {a.dias} días (hasta el {a.hasta}).</>
                    ) : (
                      // Acción que esta versión del panel no conoce (Jarvis se
                      // actualizó y la página no se recargó): nunca mostrarla
                      // como otra cosa.
                      <>Jarvis preparó una acción nueva para <strong style={{ color: '#ffffff' }}>{a.nombre}</strong>. Recarga la página para verla.</>
                    )}
                  </div>
                  {a.tipo === 'whatsapp' ? (
                    <a href={a.url} target="_blank" rel="noopener noreferrer" onClick={() => abrirWhatsAppAccion(i, j)}
                      className="self-start text-xs px-3 py-1.5 rounded font-semibold"
                      style={{ background: a.estado === 'hecha' ? 'transparent' : '#25D366', color: a.estado === 'hecha' ? '#4affb0' : '#050a0f', border: a.estado === 'hecha' ? '1px solid #1c6b85' : 'none' }}>
                      {a.estado === 'hecha' ? '✓ Abierto · abrir de nuevo' : '📲 Abrir WhatsApp'}
                    </a>
                  ) : !['activar_foto', 'aprobar_pago', 'regalar_dias'].includes(a.tipo) ? null
                  : a.estado === 'pendiente' || a.estado === 'enviando' ? (
                    <div className="flex gap-2">
                      <button onClick={() => { desbloquearVoz(); responderAccion(i, j, true); }} disabled={a.estado === 'enviando'}
                        className="text-xs px-3 py-1.5 rounded font-semibold disabled:opacity-50"
                        style={{ background: '#4affb0', color: '#050a0f' }}>
                        {a.estado === 'enviando' ? 'Aplicando…' : '✅ Confirmar'}
                      </button>
                      <button onClick={() => { desbloquearVoz(); responderAccion(i, j, false); }} disabled={a.estado === 'enviando'}
                        className="text-xs px-3 py-1.5 rounded disabled:opacity-50"
                        style={{ border: '1px solid #163244', color: '#6f92a8' }}>
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="text-[11px]" style={{ color: a.estado === 'hecha' ? '#4affb0' : '#6f92a8', fontFamily: 'monospace' }}>
                      {a.estado === 'hecha' ? (a.tipo === 'aprobar_pago' ? '✓ Aprobado' : a.tipo === 'regalar_dias' ? '✓ Regalado' : '✓ Activado') : 'Cancelado'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
          {pensando && !(turnos[turnos.length - 1]?.escribiendo && turnos[turnos.length - 1]?.content) && (
            <div className="text-xs" style={{ color: '#ffb020', fontFamily: 'monospace' }}>Procesando…</div>
          )}
        </div>
  );
  const bloqueEntrada = (
    <>
<div className="relative px-3 text-[11px]" style={{ color: '#6f92a8', fontFamily: 'monospace' }}>
          {avisoMic || (modoContinuo
            ? (escuchando ? 'Escuchando… di «Jarvis» y tu pregunta' : 'Modo continuo activo')
            : 'Toca el micrófono y háblame diciendo «Jarvis, …»')}
        </div>
        <div className="relative flex gap-2 px-3 py-3" style={{ borderTop: '1px solid #163244' }}>
          <button onClick={toggleModoContinuo} className="w-10 shrink-0 rounded flex items-center justify-center relative"
            style={{ border: '1px solid ' + (modoContinuo ? '#ff5c5c' : '#163244'), color: modoContinuo ? '#ff5c5c' : '#6f92a8' }}>
            🎤
            {escuchando && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ background: '#ff5c5c', boxShadow: '0 0 6px #ff5c5c' }} />}
          </button>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (desbloquearVoz(), enviar(input))}
            placeholder="Pregúntale algo a Jarvis…" className="flex-1 rounded px-3 text-sm outline-none"
            style={{ background: '#050a0f', border: '1px solid #163244', color: '#dff2ff' }} />
          <button onClick={() => { desbloquearVoz(); enviar(input); }} className="w-10 shrink-0 rounded flex items-center justify-center" style={{ border: '1px solid #1c6b85', color: '#4dd9ff' }}>➤</button>
        </div>
    </>
  );
  const botonesCabecera = (
    <>
      <button onClick={() => { if (vozOn) { callarVozPremium(); try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch {} setHablando(false); reanudarMicSiCorresponde(); } setVozOn(v => !v); }} className="text-xs px-2 py-1 rounded-full" style={{ border: '1px solid ' + (vozOn ? '#4dd9ff' : '#163244'), color: vozOn ? '#4dd9ff' : '#6f92a8', fontFamily: 'monospace' }}>
        🔊 {vozOn ? 'ON' : 'OFF'}
      </button>
      <button onClick={cambiarHud} aria-label={hud ? 'Salir de pantalla completa' : 'Pantalla completa'} className="text-xs px-2 py-1 rounded-full"
        style={{ border: '1px solid ' + (hud ? '#4dd9ff' : '#163244'), color: hud ? '#4dd9ff' : '#6f92a8', fontFamily: 'monospace' }}>
        {hud ? '⤡ VENTANA' : '⛶ HUD'}
      </button>
      <button onClick={cerrar} style={{ color: '#6f92a8' }} aria-label="Cerrar Jarvis"><X size={18} /></button>
    </>
  );

  if (hud) {
    const d = datosHud;
    const tamReactor = 'min(58vw, 34vh, 300px)';
    const datos = [
      { titulo: 'Alumnos activos', valor: d?.activos, detalle: d ? `${d.enPrueba} en prueba · ${d.pagando} pagando` : null },
      { titulo: 'Registraron hoy', valor: d?.registraronHoy, detalle: d && d.registraronAyer !== null ? `ayer: ${d.registraronAyer}` : null, avance: d && d.activos ? (d.registraronHoy || 0) / d.activos : null },
      { titulo: 'Pagos por revisar', valor: d?.pagosPendientes, detalle: d ? (d.pagosAtrasados ? `${d.pagosAtrasados} esperan +12 h` : d.pagosPendientes ? 'revísalos en HOY' : 'todo al día') : null, alerta: !!d?.pagosPendientes },
      { titulo: 'Pruebas por vencer', valor: d?.vencen, detalle: d ? `en 3 días · nuevos desde ayer: ${d.nuevos}` : null, alerta: !!d?.vencen },
    ];
    const hora = ahoraHud.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const fecha = ahoraHud.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
    const esquinaHud = (pos) => (
      <span className="absolute w-8 h-8 pointer-events-none" style={{
        ...pos, borderColor: '#4dd9ff', borderStyle: 'solid', opacity: 0.7,
        borderWidth: `${pos.top !== undefined ? 2 : 0}px ${pos.right !== undefined ? 2 : 0}px ${pos.bottom !== undefined ? 2 : 0}px ${pos.left !== undefined ? 2 : 0}px`,
      }} />
    );
    return (
      <div className="fixed inset-0 z-50 flex flex-col overflow-hidden" style={{ background: 'radial-gradient(circle at 50% 32%, #0c2536 0%, #061119 45%, #020508 100%)', animation: 'jv-aparece .35s ease-out',
        paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <style>{ESTILOS_JARVIS}</style>
        <div className="absolute inset-0 pointer-events-none opacity-40" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(77,217,255,0.05) 0 1px, transparent 1px 32px), repeating-linear-gradient(90deg, rgba(77,217,255,0.05) 0 1px, transparent 1px 32px)'
        }} />
        <div className="absolute inset-x-0 h-32 pointer-events-none" style={{ top: 0, background: 'linear-gradient(180deg, transparent, rgba(77,217,255,0.06), transparent)', animation: 'jv-barrido 7s linear infinite' }} />
        {esquinaHud({ top: 10, left: 10 })}{esquinaHud({ top: 10, right: 10 })}{esquinaHud({ bottom: 10, left: 10 })}{esquinaHud({ bottom: 10, right: 10 })}

        {/* barra superior: estado, hora y botones */}
        <div className="relative flex items-center justify-between gap-2 px-5 pt-4 pb-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: colorEstado, boxShadow: `0 0 8px ${colorEstado}` }} />
              <span className="text-xs tracking-[0.35em] truncate" style={{ color: '#dff2ff', fontFamily: 'monospace', textShadow: '0 0 8px rgba(77,217,255,0.7)' }}>J.A.R.V.I.S.</span>
            </div>
            <div className="text-[9px] tracking-[0.25em] mt-0.5 hidden sm:block" style={{ fontFamily: 'monospace', color: '#3f6f85' }}>PANEL DE OPERACIONES · JONAH BEAST FUEL</div>
          </div>
          <div className="text-center hidden sm:block">
            <div className="text-xl tabular-nums tracking-widest" style={{ fontFamily: 'monospace', color: '#dff2ff', textShadow: '0 0 10px rgba(77,217,255,0.6)' }}>{hora}</div>
            <div className="text-[9px] tracking-[0.2em] uppercase" style={{ fontFamily: 'monospace', color: '#6f92a8' }}>{fecha}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">{botonesCabecera}</div>
        </div>
        <div className="relative text-center sm:hidden -mt-1">
          <span className="text-sm tabular-nums tracking-widest" style={{ fontFamily: 'monospace', color: '#dff2ff', textShadow: '0 0 10px rgba(77,217,255,0.6)' }}>{hora}</span>
          <span className="text-[9px] tracking-[0.2em] uppercase ml-2" style={{ fontFamily: 'monospace', color: '#6f92a8' }}>{fecha}</span>
        </div>

        {/* núcleo: datos a los lados (pantallas grandes) y reactor al centro */}
        <div className="relative shrink-0 w-full max-w-5xl mx-auto px-4 pt-2 md:grid md:grid-cols-[1fr_auto_1fr] md:gap-6 md:items-center">
          <div className="hidden md:flex flex-col gap-3">{datos.slice(0, 2).map((x, i) => <DatoHud key={x.titulo} {...x} i={i} />)}</div>
          <div className="flex flex-col items-center">
            <div className="relative flex items-center justify-center" style={{ width: `calc(${tamReactor} + 70px)`, height: `calc(${tamReactor} + 70px)` }}>
              <div className="absolute inset-0"><OrbitaHud color={colorEstado} /></div>
              <div style={{ width: tamReactor, height: tamReactor }}>
                <ReactorJarvis estado={estadoJarvis} tam="100%" pulso={pulsoVoz} />
              </div>
            </div>
            <div className="text-[11px] tracking-[0.3em] mt-1" style={{ fontFamily: 'monospace', color: colorEstado, textShadow: `0 0 8px ${colorEstado}` }}>
              {TEXTO_ESTADO_JARVIS[estadoJarvis]}
            </div>
            <button onClick={() => { desbloquearVoz(); darInforme(); }} disabled={pensando}
              className="mt-2 text-[10px] tracking-[0.2em] px-3 py-1 rounded-full disabled:opacity-40"
              style={{ fontFamily: 'monospace', color: '#4dd9ff', border: '1px solid #1c6b85', background: 'rgba(77,217,255,0.06)' }}>
              📋 INFORME DEL DÍA
            </button>
          </div>
          <div className="hidden md:flex flex-col gap-3">{datos.slice(2).map((x, i) => <DatoHud key={x.titulo} {...x} i={i + 2} />)}</div>
          {/* en celular, los datos van en una grilla debajo del reactor */}
          <div className="grid grid-cols-2 gap-2 mt-3 md:hidden">{datos.map((x, i) => <DatoHud key={x.titulo} {...x} i={i} />)}</div>
        </div>

        {/* conversación */}
        <div className="relative flex-1 min-h-0 w-full max-w-3xl mx-auto flex flex-col mt-2" style={{ borderTop: '1px solid #163244' }}>
          {bloqueRegistro}
          {bloqueEntrada}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3" style={{ background: 'radial-gradient(circle at 50% 30%, rgba(10,40,60,0.92), rgba(0,0,0,0.94))' }}>
      <style>{ESTILOS_JARVIS}</style>
      <div className="relative w-full max-w-lg rounded-lg overflow-hidden flex flex-col"
        style={{ background: 'linear-gradient(180deg, rgba(10,22,32,0.97), rgba(5,12,18,0.97))', border: '1px solid #1c6b85', boxShadow: '0 0 40px rgba(77,217,255,0.18), inset 0 0 60px rgba(77,217,255,0.05)', maxHeight: '92vh', animation: 'jv-aparece .35s ease-out' }}>
        {/* cuadrícula y barrido de escáner */}
        <div className="absolute inset-0 pointer-events-none opacity-40" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(77,217,255,0.06) 0 1px, transparent 1px 24px), repeating-linear-gradient(90deg, rgba(77,217,255,0.06) 0 1px, transparent 1px 24px)'
        }} />
        <div className="absolute inset-x-0 h-24 pointer-events-none jv-anim" style={{ top: 0, background: 'linear-gradient(180deg, transparent, rgba(77,217,255,0.07), transparent)', animation: 'jv-barrido 5s linear infinite' }} />
        {esquina({ top: 6, left: 6 })}{esquina({ top: 6, right: 6 })}{esquina({ bottom: 6, left: 6 })}{esquina({ bottom: 6, right: 6 })}

        <div className="relative flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #163244' }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: colorEstado, boxShadow: `0 0 8px ${colorEstado}` }} />
            <span className="jb-body text-xs tracking-[0.35em]" style={{ color: '#dff2ff', fontFamily: 'monospace', textShadow: '0 0 8px rgba(77,217,255,0.7)' }}>J.A.R.V.I.S.</span>
          </div>
          <div className="flex items-center gap-2">
            {botonesCabecera}
          </div>
        </div>

        <div className="relative flex flex-col items-center pt-4 pb-2">
          <ReactorJarvis estado={estadoJarvis} tam={128} pulso={pulsoVoz} />
          <div className="mt-2 text-[11px] tracking-[0.3em]" style={{ fontFamily: 'monospace', color: colorEstado, textShadow: `0 0 8px ${colorEstado}` }}>
            {TEXTO_ESTADO_JARVIS[estadoJarvis]}
          </div>
          <div className="text-[9px] tracking-[0.25em] mt-0.5" style={{ fontFamily: 'monospace', color: '#3f6f85' }}>
            JONAH BEAST FUEL · DATOS EN VIVO
          </div>
          <button onClick={() => { desbloquearVoz(); darInforme(); }} disabled={pensando}
            className="mt-2 text-[10px] tracking-[0.2em] px-3 py-1 rounded-full disabled:opacity-40"
            style={{ fontFamily: 'monospace', color: '#4dd9ff', border: '1px solid #1c6b85', background: 'rgba(77,217,255,0.06)' }}>
            📋 INFORME DEL DÍA
          </button>
        </div>

        {bloqueVoz}

        {bloqueRegistro}

        {bloqueEntrada}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* WHATSAPP: conectar el número (coexistencia) y el asistente          */
/* ------------------------------------------------------------------ */
// App "Jonah Beast Asistente" en Meta for Developers. El ID de configuración
// lo da Meta al crear la configuración de "Inicio de sesión con Facebook
// para empresas" (registro insertado de WhatsApp); sin él, el botón avisa.
const WA_APP_ID = '1123671916889585';
const WA_CONFIG_ID = '1069612025663283'; // "Registro insertado de WhatsApp" (la llave dura 60 días)
const WA_GRAPH_VERSION = 'v23.0';

async function llamarWhatsApp(cuerpo) {
  const { data: { session } } = await supabase.auth.getSession();
  const r = await fetch(`${supabaseUrl}/functions/v1/whatsapp-conectar`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: supabaseKey,
      authorization: `Bearer ${session?.access_token || supabaseKey}`,
    },
    body: JSON.stringify(cuerpo),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error || 'No se pudo conectar con el servidor.');
  return data;
}

// La ventana oficial de Meta (registro insertado) necesita su SDK.
function cargarSdkFacebook() {
  return new Promise((resolve, reject) => {
    if (window.FB) return resolve(window.FB);
    window.fbAsyncInit = () => {
      window.FB.init({ appId: WA_APP_ID, autoLogAppEvents: true, xfbml: false, version: WA_GRAPH_VERSION });
      resolve(window.FB);
    };
    const s = document.createElement('script');
    s.src = 'https://connect.facebook.net/es_LA/sdk.js';
    s.async = true; s.defer = true; s.crossOrigin = 'anonymous';
    s.onerror = () => reject(new Error('No se pudo abrir la ventana de Meta. Revisa tu conexión.'));
    document.body.appendChild(s);
  });
}

function fechaHoraCorta(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }); } catch { return ''; }
}

const MOTIVOS_WHATSAPP = {
  pago: 'Pago', descuento: 'Descuento', medico: 'Tema médico', reclamo: 'Reclamo',
  no_se: 'No sabía la respuesta', pide_persona: 'Pidió hablar contigo', otro: 'Otro',
};

function WhatsAppPanel() {
  const [estado, setEstado] = useState(null);
  const [conectando, setConectando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [modo, setModo] = useState('apagado');
  const [numeros, setNumeros] = useState('');
  const [guardado, setGuardado] = useState({ modo: 'apagado', numeros: '' });
  const [chats, setChats] = useState([]);
  const [abierto, setAbierto] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [nuevoPersonal, setNuevoPersonal] = useState('');
  const [verPersonales, setVerPersonales] = useState(false);
  // Simulador: escribir como cliente y ver lo que respondería el asistente.
  const [simMensajes, setSimMensajes] = useState([]);
  const [simTexto, setSimTexto] = useState('');
  const [simComo, setSimComo] = useState('');
  const [simEnviando, setSimEnviando] = useState(false);
  const [costo, setCosto] = useState(null);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    try { setEstado(await llamarWhatsApp({ accion: 'estado' })); }
    catch (e) { setEstado({ error: e.message }); }
    try {
      const { data } = await supabase.from('config').select('key, value')
        .in('key', ['whatsapp_asistente', 'whatsapp_numeros_prueba']);
      const m = {};
      (data || []).forEach(c => { m[c.key] = c.value; });
      const g = { modo: m.whatsapp_asistente || 'apagado', numeros: m.whatsapp_numeros_prueba || '' };
      setModo(g.modo); setNumeros(g.numeros); setGuardado(g);
    } catch {}
    await cargarChats();
    await cargarCosto();
  }

  async function cargarChats() {
    try {
      const { data } = await supabase.from('whatsapp_chats').select('*')
        .order('ultimo_mensaje_en', { ascending: false }).limit(1000);
      setChats(data || []);
    } catch { setChats([]); }
  }

  async function guardarAjustes() {
    try {
      await supabase.from('config').upsert([
        { key: 'whatsapp_asistente', value: modo },
        { key: 'whatsapp_numeros_prueba', value: numeros.trim() },
      ]);
      setGuardado({ modo, numeros: numeros.trim() });
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
  }

  async function conectar() {
    setAviso('');
    if (!WA_CONFIG_ID) {
      setAviso('Falta un dato de Meta (el ID de configuración del registro). Pídeselo a Claude para activar este botón.');
      return;
    }
    setConectando(true);
    let datos = null, code = null, terminado = false;
    const terminar = (texto) => {
      if (terminado) return;
      terminado = true;
      window.removeEventListener('message', alMensaje);
      if (texto) setAviso(texto);
      setConectando(false);
    };
    async function intentar() {
      if (terminado || !code || !datos) return;
      terminado = true;
      window.removeEventListener('message', alMensaje);
      try {
        const r = await llamarWhatsApp({ accion: 'conectar', code, waba_id: datos.waba_id, phone_number_id: datos.phone_number_id });
        setAviso(`✅ ¡Listo! Tu WhatsApp ${r.telefono || ''} quedó conectado.`);
        await cargar();
      } catch (e) {
        setAviso('No se pudo conectar: ' + e.message);
      }
      setConectando(false);
    }
    function alMensaje(ev) {
      if (!String(ev.origin || '').endsWith('facebook.com')) return;
      try {
        const d = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
        if (d?.type !== 'WA_EMBEDDED_SIGNUP') return;
        if (String(d.event || '').startsWith('FINISH')) { datos = d.data || {}; intentar(); }
        else if (d.event === 'CANCEL') terminar('Se cerró la ventana de Meta antes de terminar. Puedes intentarlo de nuevo.');
        else if (d.event === 'ERROR') terminar('Meta mostró un error: ' + (d.data?.error_message || 'intenta de nuevo.'));
      } catch {}
    }
    window.addEventListener('message', alMensaje);
    try {
      const FB = await cargarSdkFacebook();
      FB.login((resp) => {
        code = resp?.authResponse?.code || null;
        if (!code) { terminar('No se completó la conexión.'); return; }
        intentar();
        setTimeout(() => terminar('Meta no envió los datos del número. Intenta de nuevo.'), 20000);
      }, {
        config_id: WA_CONFIG_ID,
        response_type: 'code',
        override_default_response_type: true,
        extras: { setup: {}, featureType: 'whatsapp_business_app_onboarding', sessionInfoVersion: '3' },
      });
    } catch (e) {
      terminar(e.message);
    }
  }

  async function verMensajes(telefono) {
    if (abierto === telefono) { setAbierto(null); return; }
    setAbierto(telefono); setMensajes([]);
    try {
      const { data } = await supabase.from('whatsapp_mensajes').select('*')
        .eq('telefono', telefono).order('creado_en', { ascending: false }).limit(50);
      setMensajes((data || []).reverse());
    } catch { setMensajes([]); }
  }

  // "No responder": chats personales (familia, amigos). El asistente no les
  // responde ni guarda sus mensajes. Los contactos guardados en el celular
  // entran solos; aquí se agregan o quitan a mano.
  const telWhatsApp = t => { const d = String(t || '').replace(/\D/g, ''); return d.length === 9 ? '51' + d : d; };
  async function marcarPersonal(telefono, nombre) {
    const tel = telWhatsApp(telefono);
    if (tel.length < 11) { alert('Escribe el celular con 9 dígitos (o con el código de país).'); return; }
    try {
      const { error } = await supabase.from('whatsapp_chats').upsert({
        telefono: tel, ...(nombre ? { nombre } : {}), modo: 'personal', motivo: 'manual', resumen: null, pausado_hasta: null,
      }, { onConflict: 'telefono' });
      if (error) throw error;
      setNuevoPersonal('');
      await cargarChats();
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
  }

  // Costo real del asistente (tabla ia_uso), en soles: este mes, hoy y el
  // mes pasado (para comparar cuánto sale cada respuesta).
  async function cargarCosto() {
    try {
      const hoy = todayISO();
      const [y, m] = hoy.split('-').map(Number);
      const mesPasado = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
      const { data } = await traerTodas(() => supabase.from('ia_uso')
        .select('tipo, modelo, tokens_entrada, tokens_salida, tokens_cache_lectura, tokens_cache_escritura, creado_en')
        .eq('funcion', 'whatsapp-webhook').gte('creado_en', `${mesPasado}-01T00:00:00-05:00`));
      const filas = (data || []).map(f => {
        const dia = new Date(f.creado_en).toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
        return { ...f, soles: costoUsdIA(f) * SUPUESTOS_RENTABILIDAD.tipoCambio, hoy: dia === hoy, esteMes: dia.slice(0, 7) === hoy.slice(0, 7) };
      });
      const delMes = filas.filter(f => f.esteMes);
      const reales = delMes.filter(f => f.tipo === 'whatsapp');
      const realesAntes = filas.filter(f => !f.esteMes && f.tipo === 'whatsapp');
      const suma = l => l.reduce((a, f) => a + f.soles, 0);
      setCosto({
        mes: suma(reales), respuestas: reales.length, hoy: suma(reales.filter(f => f.hoy)),
        prueba: suma(delMes.filter(f => f.tipo === 'whatsapp_prueba')),
        porRespuestaAntes: realesAntes.length ? suma(realesAntes) / realesAntes.length : null,
      });
    } catch { setCosto(null); }
  }

  async function simular() {
    const t = simTexto.trim();
    if (!t || simEnviando) return;
    const lista = [...simMensajes, { role: 'user', content: t }];
    setSimMensajes(lista); setSimTexto(''); setSimEnviando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch(`${supabaseUrl}/functions/v1/whatsapp-webhook`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', apikey: supabaseKey, authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ simular: { mensajes: lista.filter(m => m.role === 'user' || m.role === 'assistant').map(({ role, content }) => ({ role, content })), username: simComo.trim() } }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.error) throw new Error(d.error || `Error ${r.status}`);
      if (d.personal) setSimMensajes([...lista, { role: 'nota', content: `🚫 No respondería: le pareció un mensaje personal (${d.personal}).` }]);
      else {
        const nuevos = [...lista, { role: 'assistant', content: d.texto || '(sin respuesta)' }];
        if (d.pasar) nuevos.push({ role: 'nota', content: `🙋 Aquí te pasaría el chat y te llegaría un aviso: ${d.pasar.resumen}` });
        if (d.pedido) nuevos.push({ role: 'nota', content: `🍽️ Anotaría el pedido "${d.pedido}" en Pedidos de alimentos.` });
        setSimMensajes(nuevos);
      }
    } catch (e) {
      setSimMensajes([...lista, { role: 'nota', content: 'No se pudo probar: ' + (e?.message || 'intenta de nuevo.') }]);
    }
    setSimEnviando(false);
  }

  async function devolverAlAsistente(telefono) {
    try {
      await supabase.from('whatsapp_chats')
        .update({ modo: 'asistente', motivo: null, resumen: null, pausado_hasta: null })
        .eq('telefono', telefono);
      await cargarChats();
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
  }

  const cambios = modo !== guardado.modo || numeros.trim() !== guardado.numeros;
  const personales = chats.filter(c => c.modo === 'personal');
  const chatsNegocio = chats.filter(c => c.modo !== 'personal').slice(0, 50);
  const pendientes = chatsNegocio.filter(c => c.modo === 'jonah').length;

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center shrink-0">
            <MessageCircle size={16} className="text-orange-500" />
          </div>
          <h2 className="jb-display text-base text-zinc-200">TU WHATSAPP</h2>
        </div>
        {!estado ? (
          <p className="jb-body text-sm text-zinc-500 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Revisando conexión…</p>
        ) : estado.conectado ? (
          <>
          <p className="jb-body text-sm text-zinc-300">
            ✅ Conectado: <span className="text-orange-400 font-semibold">{estado.telefono || 'tu número'}</span>
            {estado.nombre ? ` (${estado.nombre})` : ''} · desde {fechaHoraCorta(estado.conectado_en)}
          </p>
          {estado.conectado_en && (() => {
            // La llave que da el registro de Meta dura 60 días: hay que
            // volver a conectar (o cambiarla por una permanente) antes.
            const vence = new Date(new Date(estado.conectado_en).getTime() + 60 * 86400000);
            const dias = Math.ceil((vence - Date.now()) / 86400000);
            return (
              <p className={`jb-body text-xs mt-2 ${dias <= 10 ? 'text-amber-400' : 'text-zinc-500'}`}>
                {dias > 0
                  ? `La conexión vence el ${vence.toLocaleDateString('es-PE')} (en ${dias} días). Antes de esa fecha hay que renovarla.`
                  : 'La conexión venció: el asistente ya no puede responder. Vuelve a conectar tu WhatsApp.'}
              </p>
            );
          })()}
          <button onClick={conectar} disabled={conectando} className={btnGhost + ' text-xs mt-3'}>
            {conectando ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />} Volver a conectar
          </button>
          </>
        ) : (
          <>
            <p className="jb-body text-sm text-zinc-400 mb-4">
              Conecta tu WhatsApp Business para que el asistente pueda responder. Sigues usando WhatsApp en tu celular como siempre.
              Se abrirá una ventana de Meta y tendrás que escanear un código QR con tu WhatsApp Business.
            </p>
            <button onClick={conectar} disabled={conectando} className={btnPrimary + ' w-full sm:w-auto'}>
              {conectando ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />} Conectar mi WhatsApp
            </button>
          </>
        )}
        {estado?.error && <p className="jb-body text-xs text-red-400 mt-3">{estado.error}</p>}
        {estado?.falta_secreto && <p className="jb-body text-xs text-amber-400 mt-3">Falta guardar el secreto WHATSAPP_APP_SECRET en Supabase.</p>}
        {aviso && <p className="jb-body text-sm text-zinc-200 mt-3">{aviso}</p>}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h2 className="jb-display text-base text-zinc-200 mb-1">🤖 ASISTENTE</h2>
        <p className="jb-body text-xs text-zinc-500 mb-4">Decide cuándo responde el asistente. Empieza en "Solo prueba" con tu número personal.</p>
        {/* Si WhatsApp Business o Meta también responden solos, el cliente
            recibe dos respuestas. */}
        <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-3 mb-4">
          <p className="jb-body text-xs text-amber-300 font-semibold mb-1">⚠️ Antes de ponerlo en "Activo", apaga en tu app WhatsApp Business:</p>
          <ul className="jb-body text-xs text-zinc-300 list-disc pl-4 space-y-0.5">
            <li>El <b>"Agente de IA"</b> de Meta (Herramientas para la empresa → IA de Meta / Agente de IA).</li>
            <li>El <b>mensaje de bienvenida</b> y el <b>mensaje de ausencia</b> (Herramientas para la empresa).</li>
          </ul>
          <p className="jb-body text-[11px] text-zinc-500 mt-1">Si alguno queda prendido, el cliente recibe dos respuestas: la de Meta y la del asistente.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-2 mb-4">
          {[
            ['apagado', 'Apagado', 'No responde a nadie. Solo guarda los mensajes.'],
            ['prueba', 'Solo prueba', 'Responde solo a los números de abajo.'],
            ['activo', 'Activo', 'Responde a todos tus clientes.'],
          ].map(([id, titulo, desc]) => (
            <button key={id} onClick={() => setModo(id)}
              className={`text-left rounded-xl p-3 border transition-colors ${modo === id ? 'bg-orange-500 border-orange-500 text-zinc-950' : 'bg-zinc-950 border-zinc-800 text-zinc-200 hover:border-orange-500'}`}>
              <div className="jb-display text-sm">{titulo.toUpperCase()}</div>
              <div className={`jb-body text-[11px] mt-0.5 ${modo === id ? 'text-zinc-800' : 'text-zinc-500'}`}>{desc}</div>
            </button>
          ))}
        </div>
        {modo === 'prueba' && (
          <Field label="Números de prueba (separados por comas)">
            <input value={numeros} onChange={e => setNumeros(e.target.value)} className={inputCls} placeholder="Ej. 987654321, 912345678" />
          </Field>
        )}
        <button onClick={guardarAjustes} disabled={!cambios} className={btnPrimary + ' text-sm mt-4'}>
          {cambios ? 'Guardar' : 'Guardado'}
        </button>
        {costo && (
          <p className="jb-body text-xs text-zinc-400 mt-4 border-t border-zinc-800 pt-3">
            💰 <span className="text-zinc-200">Costo este mes: S/{costo.mes.toFixed(2)}</span> en {costo.respuestas} {costo.respuestas === 1 ? 'respuesta' : 'respuestas'}
            {costo.respuestas > 0 ? ` (S/${(costo.mes / costo.respuestas).toFixed(3)} cada una)` : ''} · hoy S/{costo.hoy.toFixed(2)}
            {costo.prueba > 0 ? ` · pruebas del simulador: S/${costo.prueba.toFixed(2)}` : ''}.
            {costo.porRespuestaAntes !== null && (
              <span className="block mt-0.5">
                Mes pasado: S/{costo.porRespuestaAntes.toFixed(3)} cada respuesta
                {costo.respuestas > 0 && (() => {
                  const cambio = Math.round(((costo.mes / costo.respuestas) / costo.porRespuestaAntes - 1) * 100);
                  return cambio <= -5 ? <span className="text-emerald-400"> · ▼ {Math.abs(cambio)}% más barato</span>
                    : cambio >= 5 ? <span className="text-orange-400"> · ▲ {cambio}% más caro</span> : ' · igual';
                })()}
              </span>
            )}
            <span className="block text-zinc-500 mt-0.5">Tope de seguridad: si alguien manda más de 40 mensajes en un día, el asistente deja de responderle y te pasa el chat.</span>
          </p>
        )}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="jb-display text-base text-zinc-200">💬 CHATS {pendientes > 0 && <span className="text-orange-400">· {pendientes} te esperan 🙋</span>}</h2>
          <button onClick={cargarChats} className={btnGhost + ' text-xs'}>Actualizar</button>
        </div>
        {chatsNegocio.length === 0 ? (
          <p className="jb-body text-sm text-zinc-500">Todavía no hay chats. Aparecerán aquí cuando te escriban.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {chatsNegocio.map(c => (
              <div key={c.telefono} className={`bg-zinc-950 border rounded-xl p-3 ${c.modo === 'jonah' ? 'border-orange-500/50' : 'border-zinc-800'}`}>
                <div className="flex items-start justify-between gap-3">
                  <button onClick={() => verMensajes(c.telefono)} className="text-left min-w-0 flex-1">
                    <div className="jb-body text-sm text-zinc-100 truncate">
                      {c.modo === 'jonah' ? '🙋' : '🤖'} {c.nombre || `+${c.telefono}`}
                      {c.username && <span className="text-zinc-500"> · @{c.username}</span>}
                    </div>
                    {c.modo === 'jonah' && c.resumen && (
                      <div className="jb-body text-xs text-orange-300 mt-0.5">{MOTIVOS_WHATSAPP[c.motivo] || 'Te lo pasó'}: {c.resumen}</div>
                    )}
                    <div className="jb-body text-[11px] text-zinc-500 mt-0.5">+{c.telefono} · {fechaHoraCorta(c.ultimo_mensaje_en)}</div>
                  </button>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {c.modo === 'jonah' && (
                      <button onClick={() => devolverAlAsistente(c.telefono)} className={btnGhost + ' text-xs'}>Devolver al asistente</button>
                    )}
                    <button onClick={() => { if (confirm(`¿${c.nombre || '+' + c.telefono} es un contacto personal? El asistente dejará de responderle.`)) marcarPersonal(c.telefono); }}
                      className="jb-body text-[11px] text-zinc-500 hover:text-orange-400">🚫 Es personal</button>
                  </div>
                </div>
                {abierto === c.telefono && (
                  <div className="mt-3 border-t border-zinc-800 pt-3 flex flex-col gap-1.5 max-h-80 overflow-y-auto">
                    {mensajes.length === 0 && <p className="jb-body text-xs text-zinc-500">Cargando…</p>}
                    {mensajes.map(m => (
                      <div key={m.id} className={`jb-body text-xs rounded-lg px-2.5 py-1.5 max-w-[85%] ${m.direccion === 'entrante' ? 'bg-zinc-800 text-zinc-100 self-start' : m.direccion === 'jonah' ? 'bg-orange-500/20 text-orange-100 self-end' : 'bg-zinc-700/50 text-zinc-200 self-end'}`}>
                        <div className="text-[10px] text-zinc-500 mb-0.5">
                          {m.direccion === 'entrante' ? 'Cliente' : m.direccion === 'jonah' ? 'Tú' : 'Asistente'} · {fechaHoraCorta(m.creado_en)}
                        </div>
                        <div className="whitespace-pre-wrap break-words">{m.texto}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h2 className="jb-display text-base text-zinc-200">🧪 PROBAR EL ASISTENTE</h2>
          {simMensajes.length > 0 && <button onClick={() => setSimMensajes([])} className={btnGhost + ' text-xs'}>Empezar de nuevo</button>}
        </div>
        <p className="jb-body text-xs text-zinc-500 mb-3">
          Escríbele como si fueras un cliente y mira qué respondería. No se envía nada a nadie. Funciona aunque tu WhatsApp aún no esté conectado.
        </p>
        <Field label="Probar como (opcional): username de un alumno">
          <input value={simComo} onChange={e => setSimComo(e.target.value)} className={inputCls} placeholder="Vacío = cliente nuevo sin cuenta" />
        </Field>
        <div className="flex flex-col gap-1.5 my-3 max-h-96 overflow-y-auto">
          {simMensajes.map((m, i) => (
            <div key={i} className={`jb-body text-xs rounded-lg px-2.5 py-1.5 max-w-[85%] whitespace-pre-wrap break-words ${
              m.role === 'user' ? 'bg-orange-500/20 text-orange-100 self-end' : m.role === 'nota' ? 'bg-zinc-950 border border-zinc-700 text-zinc-300 self-center max-w-full' : 'bg-zinc-800 text-zinc-100 self-start'}`}>
              {m.role !== 'nota' && <div className="text-[10px] text-zinc-500 mb-0.5">{m.role === 'user' ? 'Cliente (tú)' : 'Asistente'}</div>}
              {m.content}
            </div>
          ))}
          {simEnviando && <p className="jb-body text-xs text-zinc-500 flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> El asistente está escribiendo…</p>}
        </div>
        <div className="flex gap-2">
          <input value={simTexto} onChange={e => setSimTexto(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') simular(); }}
            className={inputCls} placeholder="Ej. Hola, ¿cuánto cuesta el plan?" />
          <button onClick={simular} disabled={!simTexto.trim() || simEnviando} className={btnPrimary + ' text-sm shrink-0'}>Enviar</button>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h2 className="jb-display text-base text-zinc-200 mb-1">🚫 NO RESPONDER</h2>
        <p className="jb-body text-xs text-zinc-500 mb-4">
          Familia y amigos: el asistente nunca les responde ni guarda sus mensajes. Los contactos guardados en tu celular entran solos
          (menos los que son alumnos). Si alguien personal te escribe desde un número nuevo, agrégalo aquí.
        </p>
        <div className="flex gap-2 mb-4">
          <input value={nuevoPersonal} onChange={e => setNuevoPersonal(e.target.value)} className={inputCls} placeholder="Celular, ej. 987654321" inputMode="tel" />
          <button onClick={() => marcarPersonal(nuevoPersonal)} disabled={!nuevoPersonal.trim()} className={btnPrimary + ' text-sm shrink-0'}>Agregar</button>
        </div>
        <button onClick={() => setVerPersonales(v => !v)} className="jb-body text-xs text-orange-400">
          {verPersonales ? 'Ocultar' : 'Ver'} la lista ({personales.length})
        </button>
        {verPersonales && (
          <div className="flex flex-col gap-1.5 mt-3 max-h-80 overflow-y-auto">
            {personales.length === 0 && <p className="jb-body text-xs text-zinc-500">Todavía no hay números en la lista.</p>}
            {personales.map(c => (
              <div key={c.telefono} className="flex items-center justify-between gap-3 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <div className="jb-body text-sm text-zinc-200 truncate">{c.nombre || `+${c.telefono}`}</div>
                  <div className="jb-body text-[11px] text-zinc-500">+{c.telefono} · {c.motivo === 'contacto' ? 'contacto de tu celular' : 'agregado por ti'}</div>
                </div>
                <button onClick={() => devolverAlAsistente(c.telefono)} className={btnGhost + ' text-xs shrink-0'}>Quitar</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminDashboard({ users, onAddUser, onToggleUser, onDeleteUser, onLogout, onViewStudent, onRenew, onAdjustDays, onActivarAddOnFoto, onDesactivarAddOnFoto, onRecargar }) {
  const [newUser, setNewUser] = useState({ username: '', password: '', nombre: '', telefono: '', fechaInicio: todayISO(), meses: 1 });
  const [formErr, setFormErr] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroAlumnos, setFiltroAlumnos] = useState('todos');
  const [tabActiva, setTabActiva] = useState('hoy');
  // NEGOCIO se divide en 3 partes para no bajar tanto en el celular. Se
  // recuerda la última que abrió (solo en este navegador).
  const [subNegocio, setSubNegocioCrudo] = useState(() => {
    try { return localStorage.getItem('admin_sub_negocio') || 'resumen'; } catch { return 'resumen'; }
  });
  const setSubNegocio = v => { setSubNegocioCrudo(v); try { localStorage.setItem('admin_sub_negocio', v); } catch {} };
  const [mostrarJarvis, setMostrarJarvis] = useState(false);
  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [ordenAlumnos, setOrdenAlumnos] = useState('actividad');
  // Lo que la app le dice a cada alumno sobre su avance (mismo análisis de
  // su pestaña Progreso, con sus últimos 30 días), para ver de un vistazo
  // quién va bien y a quién hay que recomendarle otro camino.
  const [progreso, setProgreso] = useState({});
  const [filtroProgreso, setFiltroProgreso] = useState('todos');
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const desde = addDaysISO(todayISO(), -30);
      const [{ data: hist }, { data: datos }] = await Promise.all([
        traerTodas(() => supabase.from('historial').select('username, fecha, peso, kcal_consumidas, kcal_objetivo').gte('fecha', desde).order('fecha'), 'id'),
        traerTodas(() => supabase.from('datos_alumnos').select('username, objetivo:form->>objetivo, peso:form->>peso, pesoFecha:form->>pesoFecha, pesoInicial:form->>pesoInicial, pesajes:form->pesajes'), 'username'),
      ]);
      if (cancelado) return;
      const porAlumno = {};
      (hist || []).forEach(r => { (porAlumno[r.username] = porAlumno[r.username] || []).push(r); });
      const perfil = {};
      (datos || []).forEach(x => { perfil[x.username] = x; });
      const inicioDe = {};
      users.forEach(x => { inicioDe[x.username] = x.fechaInicio; });
      const res = {};
      Object.entries(porAlumno).forEach(([u, filas]) => {
        let a = null;
        const ordenadas = filas.sort((x, y) => String(x.fecha).localeCompare(String(y.fecha)));
        try { a = analizarProgreso(ordenadas, perfil[u] || {}, { todas: ordenadas, inicio: inicioDe[u] }); } catch { a = null; }
        res[u] = resumenProgreso(a);
      });
      setProgreso(res);
    })().catch(() => {});
    return () => { cancelado = true; };
  }, [users]);
  const progresoDe = u => progreso[u.username] || resumenProgreso(null);

  function submitNew(e) {
    e.preventDefault();
    setFormErr('');
    const uname = newUser.username.trim();
    if (!uname || !newUser.password) return setFormErr('Completa usuario y contraseña.');
    if (!newUser.telefono.trim()) return setFormErr('Ingresa el celular del alumno.');
    if (users.some(u => u.username.toLowerCase() === uname.toLowerCase())) return setFormErr('Ese usuario ya existe.');
    const inicio = newUser.fechaInicio || todayISO();
    const meses = Number(newUser.meses) || 1;
    onAddUser({
      username: uname, password: newUser.password, enabled: true, createdAt: new Date().toISOString(),
      nombre: newUser.nombre.trim(), telefono: newUser.telefono.trim().replace(/\s/g, ''),
      fechaInicio: inicio, fechaVencimiento: addMonthsISO(inicio, meses),
    });
    setNewUser({ username: '', password: '', nombre: '', telefono: '', fechaInicio: todayISO(), meses: 1 });
  }

  const usersFiltrados = users.filter(u => {
    if (filtroProgreso !== 'todos' && progresoDe(u).grupo !== filtroProgreso) return false;
    if (!busqueda.trim()) return true;
    const q = busqueda.trim().toLowerCase();
    return (u.nombre || '').toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen jb-body relative overflow-x-hidden" style={{ background: '#0a0d10' }}>
      <div className="fixed inset-0 pointer-events-none opacity-[0.35]" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(77,217,255,0.05) 0px, rgba(77,217,255,0.05) 1px, transparent 1px, transparent 32px), repeating-linear-gradient(90deg, rgba(77,217,255,0.05) 0px, rgba(77,217,255,0.05) 1px, transparent 1px, transparent 32px)'
      }} />
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(77,217,255,0.08), transparent 55%)' }} />

      <header className="relative border-b border-[#163244] px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))', background: 'rgba(10,22,32,0.6)' }}>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: '#4dd9ff', boxShadow: '0 0 8px #4dd9ff' }} />
          <div className="min-w-0">
            <div className="jb-display text-xs sm:text-sm tracking-wide text-zinc-50 truncate">JONAH BEAST FUEL</div>
            <div className="hidden sm:block font-mono text-[10px] tracking-widest" style={{ color: '#6f92a8' }}>PANEL DE OPERACIONES</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <AdminNotifButton />
          <button onClick={onLogout} className={btnGhost + ' !px-2 sm:!px-4 text-xs sm:text-sm'}><LogOut size={16} /> <span className="hidden sm:inline">Salir</span></button>
        </div>
      </header>
      {!mostrarJarvis && <BotonJarvis onClick={() => { prepararAudioJarvis(); setMostrarJarvis(true); }} />}
      {mostrarJarvis && <JarvisPanel users={users} onClose={() => setMostrarJarvis(false)} />}
      <main className="relative max-w-4xl mx-auto px-6 pt-8 pb-32 flex flex-col gap-8">
        <div>
          <h1 className="jb-display text-2xl text-zinc-50 mb-1">PANEL DE ADMINISTRACIÓN</h1>
          <p className="text-zinc-500 text-sm">Gestiona usuarios, pagos y suscripciones.</p>
        </div>


        {(() => {
          const TABS = [
            { id: 'hoy', label: 'HOY', emoji: '📋' },
            { id: 'alumnos', label: `ALUMNOS · ${users.length}`, emoji: '👥' },
            { id: 'negocio', label: 'NEGOCIO', emoji: '💰' },
            { id: 'ia', label: 'IA', emoji: '📸' },
            { id: 'tienda', label: 'TIENDA', emoji: '🛍️' },
            { id: 'whatsapp', label: 'WHATSAPP', emoji: '💬' },
          ];
          return (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {TABS.map(t => {
                const activa = tabActiva === t.id;
                return (
                  <button key={t.id} onClick={() => setTabActiva(t.id)}
                    className={`shrink-0 jb-display text-xs tracking-wide px-4 py-2.5 rounded-xl border transition-all duration-200 flex items-center gap-1.5 ${
                      activa
                        ? 'bg-gradient-to-r from-orange-600 to-amber-500 border-orange-400 text-zinc-950 shadow-[0_0_20px_rgba(249,115,22,0.45)]'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}>
                    <span>{t.emoji}</span> {t.label}
                  </button>
                );
              })}
            </div>
          );
        })()}

        {tabActiva === 'hoy' && (
          <>
            {/* Primero, todos los mensajes del día en un solo lugar y en orden;
                después, lo que es trámite (pagos, alimentos, vencimientos…). */}
            <MensajesDelDiaPanel />
            <ListosParaPagarPanel />
            <AvisoMejoras40Panel />
            <PagosPanel />
            <PedidosAlimentosPanel />
            <RevisionDiaria />
            <AlimentosPropiosPanel />
            <VencimientosPanel users={users} onRenew={onRenew} onAdjustDays={onAdjustDays} />
            <VolverInvitarPanel users={users} onAdjustDays={onAdjustDays} />
            {/* Listas de a quién escribirle (antes estaban en NEGOCIO). */}
            <RescatePanel users={users} />
            <SinAvisosPanel users={users} />
            <CumpleanosPanel users={users} />
            <SaldoIAPanel />
            <EmbudoPanel />

          </>
        )}

        {tabActiva === 'alumnos' && (
          <>
            <div className="relative rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(180deg, rgba(13,28,40,0.9), rgba(10,22,32,0.9))', border: '1px solid #163244' }}>
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, #4dd9ff, transparent)' }} />
              <div className="px-5 py-4 flex flex-col gap-3" style={{ borderBottom: '1px solid #163244' }}>
                <h2 className="jb-display text-base text-zinc-50 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#4dd9ff', boxShadow: '0 0 6px #4dd9ff' }} />
                  ALUMNOS ({usersFiltrados.length}{busqueda ? ` de ${users.length}` : ''})
                </h2>
                <input
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre o usuario..."
                  className="rounded-lg px-3 py-2 text-sm text-zinc-200 w-full font-mono"
                  style={{ background: '#050a0f', border: '1px solid #163244' }}
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[11px] tracking-wide" style={{ color: '#6f92a8' }}>ORDENAR:</span>
                  {[['actividad', 'Usó la app hace poco'], ['vence', 'Vence primero'], ['nombre', 'Nombre A-Z']].map(([k, t]) => (
                    <button key={k} onClick={() => setOrdenAlumnos(k)}
                      className="font-mono text-[11px] px-2.5 py-1 rounded-full border"
                      style={ordenAlumnos === k
                        ? { background: '#4dd9ff', borderColor: '#4dd9ff', color: '#050a0f' }
                        : { background: 'transparent', borderColor: '#163244', color: '#6f92a8' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              {usersFiltrados.length === 0 ? (
                <p className="text-zinc-500 text-sm px-5 py-8 text-center">
                  {busqueda ? 'No se encontraron alumnos con ese nombre o usuario.' : 'Aún no has agregado alumnos.'}
                </p>
              ) : (() => {
                // Se agrupa por estado, con los vencidos arriba. Los que están
                // por vencer se ven en el panel ⏰ Por vencer (y aquí dicen
                // "Vence en N días").
                const grupos = {
                  deshabilitados: [], pruebaTerminada: [], planVencido: [], enPrueba: [], activos: [], reto: [],
                };
                usersFiltrados.forEach(u => {
                  const dl = daysLeft(u.fechaVencimiento);
                  const esPrueba = u.plan === 'trial' || u.plan === 'prueba';
                  if (String(u.codigoReferido || '').toUpperCase() === 'RETO') grupos.reto.push(u);
                  if (!u.enabled) grupos.deshabilitados.push(u);
                  else if (dl !== null && dl < 0) (esPrueba ? grupos.pruebaTerminada : grupos.planVencido).push(u);
                  else if (esPrueba) grupos.enPrueba.push(u);
                  else grupos.activos.push(u);
                });
                // Orden elegible: los que usaron la app más recientemente
                // primero (para saber a quién escribir), los que vencen o
                // vencieron antes primero, o por nombre.
                const porNombre = (a, b) => (a.nombre || a.username).localeCompare(b.nombre || b.username);
                const tiempo = (u) => (u.lastActivity ? new Date(u.lastActivity).getTime() : 0);
                const porActividad = (a, b) => tiempo(b) - tiempo(a) || porNombre(a, b);
                const vence = (u) => { const d = daysLeft(u.fechaVencimiento); return d === null ? 99999 : d; };
                const porVencimiento = (a, b) => vence(a) - vence(b) || porNombre(a, b);
                const orden = ordenAlumnos === 'nombre' ? porNombre : ordenAlumnos === 'vence' ? porVencimiento : porActividad;
                Object.values(grupos).forEach(g => g.sort(orden));

                const SECCIONES = [
                  { key: 'pruebaTerminada', label: 'PRUEBA TERMINADA', color: '#ff9f43', emoji: '🟠' },
                  { key: 'planVencido', label: 'PLAN VENCIDO', color: '#ff5c5c', emoji: '🔴' },
                  { key: 'enPrueba', label: 'EN PRUEBA GRATIS', color: '#4dd9ff', emoji: '🔵' },
                  { key: 'activos', label: 'ACTIVOS (PAGAN)', color: '#4affb0', emoji: '🟢' },
                  { key: 'reto', label: 'RETO BEAST', color: '#E8590C', emoji: '🏁' },
                  { key: 'deshabilitados', label: 'DESHABILITADOS', color: '#6f92a8', emoji: '⚪' },
                ];
                const seccionesConDatos = SECCIONES.filter(s => grupos[s.key].length > 0);
                const seccionesAMostrar = filtroAlumnos === 'todos'
                  ? seccionesConDatos.filter(s => s.key !== 'reto')
                  : seccionesConDatos.filter(s => s.key === filtroAlumnos);

                const cuentaProgreso = g => users.filter(u => progresoDe(u).grupo === g).length;
                const FILTROS_PROGRESO = [
                  { key: 'bien', label: '✅ VAN BIEN', color: '#4affb0' },
                  { key: 'atencion', label: '⚠️ OTRO CAMINO', color: '#ff9f43' },
                  { key: 'datos', label: '🌱 SIN DATOS AÚN', color: '#6f92a8' },
                ];
                return (
                  <div className="flex flex-col gap-4">
                    <div className="px-3 pt-3 -mb-2">
                      <div className="font-mono text-[10px] tracking-widest mb-1.5" style={{ color: '#6f92a8' }}>SU AVANCE (LO QUE LES DICE LA APP)</div>
                      <div className="flex gap-1.5 overflow-x-auto pb-1">
                        {FILTROS_PROGRESO.map(f => (
                          <button key={f.key} onClick={() => setFiltroProgreso(v => v === f.key ? 'todos' : f.key)}
                            className="shrink-0 font-mono text-[11px] tracking-wide px-3 py-1.5 rounded-full border transition-all whitespace-nowrap"
                            style={filtroProgreso === f.key
                              ? { background: f.color, borderColor: f.color, color: '#050a0f' }
                              : { background: 'transparent', borderColor: '#163244', color: f.color }}>
                            {f.label} · {cuentaProgreso(f.key)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto px-3 pt-3 pb-1 -mb-1">
                      <button onClick={() => setFiltroAlumnos('todos')}
                        className="shrink-0 font-mono text-[11px] tracking-wide px-3 py-1.5 rounded-full border transition-all"
                        style={filtroAlumnos === 'todos'
                          ? { background: '#4dd9ff', borderColor: '#4dd9ff', color: '#050a0f' }
                          : { background: 'transparent', borderColor: '#163244', color: '#6f92a8' }}>
                        TODOS · {usersFiltrados.length}
                      </button>
                      {seccionesConDatos.map(s => (
                        <button key={s.key} onClick={() => setFiltroAlumnos(v => v === s.key ? 'todos' : s.key)}
                          className="shrink-0 font-mono text-[11px] tracking-wide px-3 py-1.5 rounded-full border transition-all whitespace-nowrap"
                          style={filtroAlumnos === s.key
                            ? { background: s.color, borderColor: s.color, color: '#050a0f' }
                            : { background: 'transparent', borderColor: '#163244', color: s.color }}>
                          {s.emoji} {s.label} · {grupos[s.key].length}
                        </button>
                      ))}
                    </div>
                    <div className="p-3 pt-0 flex flex-col gap-5">
                      {seccionesAMostrar.map(s => (
                        <div key={s.key}>
                          <div className="flex items-center gap-2 px-2 mb-2">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
                            <span className="font-mono text-[11px] tracking-widest" style={{ color: s.color }}>
                              {s.label} · {grupos[s.key].length}
                            </span>
                            <span className="flex-1 h-px" style={{ background: '#163244' }} />
                          </div>
                          <div className="flex flex-col gap-2.5">
                            {grupos[s.key].map(u => (
                              <AlumnoRow key={u.username} u={u} progreso={progresoDe(u)}
                                onRenew={onRenew} onViewStudent={onViewStudent} onAdjustDays={onAdjustDays}
                                onActivarAddOnFoto={onActivarAddOnFoto} onDesactivarAddOnFoto={onDesactivarAddOnFoto}
                                onToggleUser={onToggleUser} onDeleteUser={onDeleteUser} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <button type="button" onClick={() => setMostrarNuevo(v => !v)} className="w-full flex items-center gap-2.5 text-left">
                <div className="w-9 h-9 rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center shrink-0">
                  <UserPlus size={16} className="text-orange-500" />
                </div>
                <h2 className="jb-display text-base text-zinc-200 flex-1">NUEVO ALUMNO</h2>
                <ChevronRight size={18} className={`text-zinc-500 transition-transform ${mostrarNuevo ? 'rotate-90' : ''}`} />
              </button>
              {mostrarNuevo && <form onSubmit={submitNew} className="grid sm:grid-cols-3 gap-3 items-end">
                <Field label="Nombre completo">
                  <input value={newUser.nombre} onChange={e => setNewUser(v => ({ ...v, nombre: e.target.value }))} className={inputCls} placeholder="Ej. María Pérez" />
                </Field>
                <Field label="Celular (WhatsApp)">
                  <input type="tel" inputMode="tel" value={newUser.telefono} onChange={e => setNewUser(v => ({ ...v, telefono: e.target.value }))} className={inputCls} placeholder="999888777" />
                </Field>
                <Field label="Usuario">
                  <input value={newUser.username} onChange={e => setNewUser(v => ({ ...v, username: e.target.value }))} className={inputCls} placeholder="ej. maria23" />
                </Field>
                <Field label="Contraseña">
                  <input value={newUser.password} onChange={e => setNewUser(v => ({ ...v, password: e.target.value }))} className={inputCls} placeholder="Contraseña temporal" />
                </Field>
                <Field label="Inicio de membresía">
                  <input type="date" value={newUser.fechaInicio} onChange={e => setNewUser(v => ({ ...v, fechaInicio: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Duración">
                  <select value={newUser.meses} onChange={e => setNewUser(v => ({ ...v, meses: Number(e.target.value) }))} className={inputCls}>
                    <option value={1}>1 mes</option>
                    <option value={2}>2 meses</option>
                    <option value={3}>3 meses</option>
                    <option value={6}>6 meses</option>
                    <option value={12}>12 meses</option>
                  </select>
                </Field>
                <button type="submit" className={btnPrimary}><Plus size={16} /> Agregar alumno</button>
              </form>}
              {mostrarNuevo && formErr && <p className="text-red-400 text-sm mt-2 flex items-center gap-1.5"><AlertTriangle size={14} />{formErr}</p>}
            </div>

          </>
        )}

        {tabActiva === 'negocio' && (
          <>
            <div className="flex gap-1.5 overflow-x-auto -mb-1">
              {[
                { id: 'resumen', label: '📊 Resumen' },
                { id: 'dinero', label: '💰 Dinero' },
                { id: 'crecimiento', label: '📣 Anuncios y embudo' },
              ].map(t => (
                <button key={t.id} type="button" onClick={() => setSubNegocio(t.id)}
                  className={`jb-body text-xs px-3 py-1.5 rounded-full border whitespace-nowrap transition-colors ${subNegocio === t.id ? 'bg-orange-500 border-orange-500 text-zinc-950 font-semibold' : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            {subNegocio === 'resumen' && (
              <>
                <TableroPanel users={users} />
                <FuncionandoPanel users={users} />
                <EncuestaFacilidadPanel users={users} />
              </>
            )}
            {subNegocio === 'dinero' && (
              <>
                <RentabilidadPanel users={users} />
                <FinanzasPanel />
              </>
            )}
            {subNegocio === 'crecimiento' && (
              <>
                <EmbudoResumenPanel />
                <ConversionSemanalPanel />
                <ActivacionPanel users={users} />
                <MetricasPanel />
                <LeadsPanel />
                <ReferidosPanel users={users} onCambio={onRecargar} />
              </>
            )}
          </>
        )}

        {tabActiva === 'ia' && (
          <>
            <PrecisionIAPanel />
            <MemoriaJarvisPanel />
            <ReconocimientoFotoPanel />
            <ProductosPanel />
          </>
        )}

        {tabActiva === 'tienda' && (
          <TiendaAdminPanel />
        )}

        {tabActiva === 'whatsapp' && (
          <WhatsAppPanel />
        )}
      </main>
    </div>
  );
}

/* 📇 HISTORIA DEL ALUMNO (arriba de su ficha): todo lo que pasó con él en
   un solo lugar, para saber cómo le va antes de escribirle. Cuándo y por
   qué canal llegó, su plan, su constancia (comidas por día de los últimos
   30 días), sus pesos, y la línea de tiempo: pagos, días regalados,
   pedidos de alimentos y el último mensaje que le mandó Jonah desde el panel. */
function HistoriaAlumno({ username }) {
  const [d, setD] = useState(null);
  const hoy = todayISO();

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const [{ data: al }, { data: hist }, { data: pagos }, { data: ajustes }, { data: reg }, { data: cfg }, { data: subs }, { data: pedidos }, { data: datos }] = await Promise.all([
        supabase.from('alumnos').select('nombre, telefono, plan, enabled, fecha_inicio, fecha_vencimiento, created_at').eq('username', username).maybeSingle(),
        traerTodas(() => supabase.from('historial').select('fecha, comidas_count, peso, kcal_consumidas, kcal_objetivo, grasa_pct, masa_muscular').eq('username', username).order('fecha')),
        supabase.from('pagos').select('creado_en, monto, plan_meses, metodo, estado').eq('username', username).order('creado_en').range(0, 999),
        supabase.from('ajustes_membresia').select('created_at, dias, motivo').eq('username', username).order('created_at').range(0, 999),
        supabase.from('embudo_landing_eventos').select('fuente, evento, detalle').in('evento', ['registro', 'campana']).eq('username', username).limit(5),
        supabase.from('config').select('value').eq('key', CLAVE_ESCRITOS).maybeSingle(),
        supabase.from('push_subs').select('username').eq('username', username).eq('activa', true).limit(1),
        supabase.from('pedidos_alimentos').select('creado_en, nombre, estado, solicitantes').order('creado_en', { ascending: false }).range(0, 499),
        supabase.from('datos_alumnos').select('form').eq('username', username).maybeSingle(),
      ]);
      if (cancelado) return;
      const escrito = leerEscritos(cfg?.value)[username];
      setD({
        al, hist: hist || [], pagos: pagos || [], ajustes: ajustes || [], form: datos?.form || {},
        fuente: (reg || []).find(r => r.evento === 'registro')?.fuente || null,
        campana: (reg || []).find(r => r.evento === 'campana')?.detalle || null, escrito: typeof escrito === 'string' ? { f: escrito } : escrito || null,
        conAvisos: (subs || []).length > 0,
        pedidos: (pedidos || []).filter(p => (p.solicitantes || []).some(x => x?.username === username)),
      });
    })().catch(() => { if (!cancelado) setD({ al: null, hist: [], pagos: [], ajustes: [], pedidos: [], form: {} }); });
    return () => { cancelado = true; };
  }, [username]);

  if (!d) return <div className="flex items-center gap-2 text-zinc-500 text-xs mb-4"><Loader2 size={14} className="animate-spin" /> Cargando su historia…</div>;
  const fechaCorta = iso => { const [y, m, dd] = String(iso).slice(0, 10).split('-').map(Number); return `${dd} ${MESES_CORTOS[m - 1]}${y !== Number(hoy.slice(0, 4)) ? ' ' + y : ''}`; };
  const conComida = new Set(d.hist.filter(h => Number(h.comidas_count) > 0).map(h => h.fecha));
  const dias30 = [...conComida].filter(f => f >= addDaysISO(hoy, -29)).length;
  let racha = 0;
  for (let f = conComida.has(hoy) ? hoy : addDaysISO(hoy, -1); conComida.has(f); f = addDaysISO(f, -1)) racha++;
  const ultima = [...conComida].sort().pop() || null;
  const pesos = historialDePeso(d.form, d.hist, d.al);
  // % de grasa y % de masa muscular (estimados con sus medidas con cinta).
  const f = d.form || {};
  const rAct = (() => { try { return calcAll({ ...f, edad: Number(f.edad) || 0, estatura: Number(f.estatura) || 1, peso: Number(f.peso) || 0, cuello: Number(f.cuello) || 1, cintura: Number(f.cintura) || 1, cadera: Number(f.cadera) || 1 }); } catch { return null; } })();
  const actualComp = rAct?.cinta && Number(f.peso) > 0 ? { grasa: Math.round(rAct.bf * 10) / 10, musculo: Math.round(rAct.muscleKg / Number(f.peso) * 1000) / 10 } : null;
  const comp = historialComposicion(d.hist, d.al, f, actualComp);
  const aDatos = (lista, nota) => lista.map(p => ({ clave: p.f, etiqueta: fechaCorta(p.f), etiquetaLarga: `${fechaCorta(p.f)}${nota}`, partes: { valor: p.v } }));
  const resumenComp = (lista, menosEsBueno) => {
    if (!lista.length) return null;
    const ini = lista[0].v, fin = lista[lista.length - 1].v, dif = Math.round((fin - ini) * 10) / 10;
    const bueno = menosEsBueno ? dif < 0 : dif > 0;
    return { ini, fin, dif, n: lista.length, color: dif === 0 ? 'text-zinc-400' : bueno ? 'text-emerald-400' : 'text-amber-400' };
  };
  const rGrasa = resumenComp(comp.grasa, true), rMusculo = resumenComp(comp.musculo, false);
  // Lo mismo que le dice la app en su pestaña Progreso (últimos 30 días).
  let coach = null;
  try { coach = analizarProgreso(d.hist.filter(h => h.fecha >= addDaysISO(hoy, -30)), d.form || {}, { todas: d.hist, inicio: d.al?.fecha_inicio }); } catch { coach = null; }
  const coachResumen = resumenProgreso(coach);
  const kg = pesos.length >= 2 ? pesos[0].kg - pesos[pesos.length - 1].kg : null;
  const esPrueba = d.al?.plan === 'trial' || d.al?.plan === 'prueba';
  const vence = d.al?.fecha_vencimiento;
  const estadoPlan = !d.al ? '—' : d.al.plan === 'pago'
    ? (vence && vence < hoy ? 'Su plan venció' : 'Pagando')
    : esPrueba && vence && vence >= hoy ? 'En prueba Premium' : 'Versión gratis';
  const comidasDia = Array.from({ length: 30 }, (_, i) => {
    const f = addDaysISO(hoy, i - 29);
    const h = d.hist.find(x => x.fecha === f);
    return { clave: f, etiqueta: String(Number(f.slice(8))), etiquetaLarga: fechaCorta(f), partes: { valor: Number(h?.comidas_count) || 0 } };
  });
  const datosPeso = pesos.map(p => ({ clave: p.f, etiqueta: fechaCorta(p.f), etiquetaLarga: `${fechaCorta(p.f)}${p.inicial ? ' · peso inicial' : ''}`, partes: { valor: p.kg } }));
  const eventos = [
    d.al?.created_at && { f: d.al.created_at, t: `🎉 Se registró${d.fuente ? ` (llegó por ${NOMBRE_FUENTE[d.fuente] || d.fuente})` : ''}${d.campana ? ` · anuncio: ${d.campana}` : ''}` },
    conComida.size > 0 && { f: [...conComida].sort()[0], t: '🌱 Registró su primera comida' },
    ...d.pagos.map(p => ({ f: p.creado_en, t: `💳 Pago de ${fmtS(Number(p.monto) || 0)}${p.plan_meses ? ` · plan de ${p.plan_meses} ${Number(p.plan_meses) === 1 ? 'mes' : 'meses'}` : ''}${p.metodo ? ` · ${p.metodo}` : ''}`, extra: p.estado === 'aprobado' ? null : p.estado })),
    ...d.ajustes.map(a => ({ f: a.created_at, t: `${Number(a.dias) >= 0 ? '🎁' : '➖'} ${Number(a.dias) >= 0 ? '+' : ''}${a.dias} días de Premium${a.motivo ? ` · ${a.motivo}` : ''}` })),
    ...d.pedidos.map(p => ({ f: p.creado_en, t: `🍽️ Pidió "${p.nombre}"`, extra: p.estado === 'agregado' ? 'agregado' : p.estado === 'descartado' ? 'descartado' : 'pendiente' })),
    d.escrito?.f && { f: d.escrito.f, t: `📲 Le escribiste desde el panel${d.escrito.e ? ` (${(ETAPAS.find(e => e.id === d.escrito.e)?.titulo) || (d.escrito.e === 'convertir' ? '🔥 Listos para pagar' : d.escrito.e)})` : ''}` },
  ].filter(Boolean).sort((a, b) => String(b.f).localeCompare(String(a.f)));
  const tarjetas = [
    { v: estadoPlan, l: vence ? `${d.al?.plan === 'pago' || esPrueba ? 'Vence' : 'Venció'} el ${fechaCorta(vence)}` : 'Plan' },
    { v: `${dias30} de 30`, l: 'días registrando' },
    { v: racha ? `${racha} ${racha === 1 ? 'día' : 'días'}` : '—', l: ultima ? `racha · último registro ${ultima === hoy ? 'hoy' : fechaCorta(ultima)}` : 'nunca registró' },
    { v: kg === null ? '—' : `${kg > 0 ? '−' : kg < 0 ? '+' : ''}${Math.abs(kg).toFixed(1)} kg`, l: pesos.length >= 2 ? `desde ${pesos[0].kg.toFixed(1)} kg · ${pesos.length - 1} ${pesos.length === 2 ? 'cambio' : 'cambios'} de peso` : pesos.length ? `${pesos[0].kg.toFixed(1)} kg · aún sin volver a pesarse` : 'sin peso' },
  ];
  return (
    <div className="flex flex-col gap-3 mb-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 jb-body text-xs text-zinc-400">
        {d.al?.nombre && <span className="text-zinc-200">{d.al.nombre}</span>}
        {d.al?.telefono && (
          <a href={enlaceWhatsApp(d.al.telefono, '')} target="_blank" rel="noreferrer" className="text-orange-400 inline-flex items-center gap-1">
            <MessageCircle size={12} /> {d.al.telefono}
          </a>
        )}
        <span>{d.conAvisos ? '🔔 Recibe tus avisos' : '🔕 Sin avisos'}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {tarjetas.map(t => (
          <div key={t.l} className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 min-w-0">
            <div className="jb-display text-base text-orange-400 leading-tight">{t.v}</div>
            <div className="jb-body text-[10px] text-zinc-500 leading-tight mt-0.5">{t.l}</div>
          </div>
        ))}
      </div>
      {coach?.titulo && (
        <div className={`bg-zinc-950 border rounded-lg p-3 ${coachResumen.grupo === 'bien' ? 'border-emerald-500/40' : coachResumen.grupo === 'atencion' ? 'border-amber-500/40' : 'border-zinc-800'}`}>
          <div className="font-mono text-[10px] tracking-widest text-zinc-500 mb-1">LO QUE LE DICE LA APP{d.form?.objetivo ? ` · OBJETIVO: ${String(d.form.objetivo).toUpperCase()}` : ''}</div>
          <h3 className={`jb-display text-sm mb-1 ${coachResumen.grupo === 'bien' ? 'text-emerald-400' : coachResumen.grupo === 'atencion' ? 'text-amber-400' : 'text-zinc-300'}`}>{coachResumen.emoji} {coach.titulo}</h3>
          <p className="jb-body text-xs text-zinc-300 mb-1.5">{coach.mensaje}</p>
          <p className="jb-body text-xs text-zinc-400"><span className="text-zinc-500">Lo que le recomienda:</span> {coach.accion}</p>
          {(coach.adherencia !== null && coach.adherencia !== undefined || coach.constancia > 0) && (
            <p className="jb-body text-[11px] text-zinc-500 mt-1.5">
              {coach.adherencia !== null && coach.adherencia !== undefined ? `Cumple sus calorías ${coach.adherencia}% de los días` : ''}
              {coach.adherencia !== null && coach.adherencia !== undefined && coach.constancia > 0 ? ' · ' : ''}
              {coach.constancia > 0 ? `registra ${coach.constancia}% de los días` : ''}
            </p>
          )}
        </div>
      )}
      <GraficoHud titulo="COMIDAS POR DÍA · 30 DÍAS" datos={comidasDia} series={SERIE_LED_UNICA}
        formato={v => `${v} ${v === 1 ? 'comida' : 'comidas'}`} etiquetaCada={5} />
      {datosPeso.length >= 2 && (
        <GraficoHud titulo="PESO" datos={datosPeso} series={SERIE_LED_UNICA} desdeCero={false}
          formato={v => `${Number(v).toFixed(1)} kg`} etiquetaCada={Math.max(1, Math.ceil(datosPeso.length / 5))} />
      )}
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
        <h3 className="jb-display text-sm text-zinc-300 mb-1">🧬 COMPOSICIÓN CORPORAL</h3>
        {rGrasa || rMusculo ? (
          <div className="grid grid-cols-2 gap-2 jb-body text-xs">
            {[['% de grasa', rGrasa], ['% de masa muscular', rMusculo]].map(([t, r]) => (
              <div key={t} className="bg-zinc-900 rounded-lg p-2">
                <div className="text-zinc-500 text-[10px]">{t}</div>
                {r ? (
                  <>
                    <div className={`jb-display text-base leading-tight ${r.dif === 0 ? 'text-orange-400' : r.color}`}>
                      {r.dif === 0 ? `${r.fin}%` : `${r.dif > 0 ? '+' : '−'}${Math.abs(r.dif)} pts`}
                    </div>
                    <div className="text-zinc-500 text-[10px]">
                      {r.n >= 2 ? `desde ${r.ini}% · ahora ${r.fin}% · ${r.n - 1} ${r.n === 2 ? 'cambio' : 'cambios'}` : `${r.fin}% · aún sin volver a medirse`}
                    </div>
                  </>
                ) : <div className="text-zinc-500">sin medida</div>}
              </div>
            ))}
          </div>
        ) : (
          <p className="jb-body text-xs text-zinc-500">Aún no tiene medidas con cinta (cuello, cintura, cadera) válidas.</p>
        )}
        <p className="jb-body text-[10px] text-zinc-600 mt-1.5">Estimado con sus medidas con cinta. Solo cuenta las medidas reales (sin valores de ejemplo ni errores de tipeo).</p>
      </div>
      {comp.grasa.length >= 2 && (
        <GraficoHud titulo="% DE GRASA" datos={aDatos(comp.grasa, ' · % de grasa')} series={SERIE_LED_UNICA} desdeCero={false}
          formato={v => `${Number(v).toFixed(1)}%`} etiquetaCada={Math.max(1, Math.ceil(comp.grasa.length / 5))} />
      )}
      {comp.musculo.length >= 2 && (
        <GraficoHud titulo="% DE MASA MUSCULAR" datos={aDatos(comp.musculo, ' · % de masa muscular')} series={SERIE_LED_UNICA} desdeCero={false}
          formato={v => `${Number(v).toFixed(1)}%`} etiquetaCada={Math.max(1, Math.ceil(comp.musculo.length / 5))} />
      )}
      {eventos.length > 0 && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
          <h3 className="jb-display text-sm text-zinc-300 mb-2">📇 SU HISTORIA</h3>
          <div className="flex flex-col gap-1.5">
            {eventos.slice(0, 25).map((e, i) => (
              <div key={i} className="flex gap-3 jb-body text-xs">
                <span className="text-zinc-500 w-14 shrink-0 tabular-nums">{fechaCorta(e.f)}</span>
                <span className="text-zinc-200 flex-1 min-w-0">{e.t}{e.extra && <span className="text-zinc-500"> · {e.extra}</span>}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StudentDataModal({ username, data, onClose }) {
  const results = useMemo(() => (data?.form ? calcAll(data.form) : null), [data]);
  const [fotos, setFotos] = useState([]);
  const [fotoUrls, setFotoUrls] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const { data: filas } = await supabase.from('fotos_progreso').select('*')
          .eq('username', username).order('fecha', { ascending: false }).limit(60);
        const lista = filas || [];
        setFotos(lista);
        if (lista.length) {
          const rutas = lista.map(f => f.ruta);
          const { data: signed } = await supabase.storage.from('fotos-progreso').createSignedUrls(rutas, 3600);
          const u = {};
          (signed || []).forEach(s => { if (s.signedUrl) u[s.path] = s.signedUrl; });
          setFotoUrls(u);
        }
      } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
    })();
  }, [username]);

  const sesionesFotos = useMemo(() => {
    const porFecha = {};
    fotos.forEach(f => {
      if (!porFecha[f.fecha]) porFecha[f.fecha] = { fecha: f.fecha, peso: f.peso, fotos: {} };
      porFecha[f.fecha].fotos[f.angulo] = f;
    });
    return Object.values(porFecha).sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [fotos]);
  const totals = useMemo(() => {
    if (!data?.mealPlan) return null;
    const t = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    Object.values(data.mealPlan.meals).forEach(entries => entries.forEach(en => {
      const m = entryMacros(en);
      t.kcal += m.kcal; t.protein += m.protein; t.carbs += m.carbs; t.fat += m.fat;
    }));
    return t;
  }, [data]);

  const objetivoAlumno = data?.form?.objetivo || '';
  const diffKcal = totals && data?.mealPlan ? totals.kcal - data.mealPlan.targetKcal : 0;
  const sinRegistrar = !data?.mealPlan?.meals
    || MEAL_NAMES.every(m => !(data.mealPlan.meals[m] || []).length);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[88vh] overflow-y-auto p-6 jb-body" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="jb-display text-xl text-zinc-50">{username}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200"><X size={20} /></button>
        </div>
        <HistoriaAlumno username={username} />
        {!results ? (
          <p className="text-zinc-500 text-sm">Este alumno todavía no ha registrado sus datos.</p>
        ) : (
          <>
            {results.basicos ? (
              <div className="grid grid-cols-2 gap-3 mb-5">
                <StatCard label="IMC" value={results.bmi.toFixed(1)} sub={results.bmiCat} />
                <StatCard label="% Grasa" value={results.cinta ? results.bf.toFixed(1) + '%' : '—'} sub={results.cinta ? results.bfCat : 'Sin medidas con cinta'} />
                <StatCard label="🔥 Metabolismo basal" value={Math.round(results.tmb)} sub="kcal/día" />
                <StatCard label="⚡ Gasto de mantenimiento" value={Math.round(results.tdee)} sub="kcal/día" />
              </div>
            ) : (
              <p className="text-zinc-500 text-sm mb-5">Aún no completa sus datos básicos (edad, estatura y peso).</p>
            )}
            {totals && (
              <div className="border-t border-zinc-800 pt-4">
                <h3 className="jb-display text-sm text-zinc-300 mb-2">PLAN DE ALIMENTACIÓN — TOTAL DEL DÍA</h3>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div><div className="text-orange-500 jb-display text-lg">{Math.round(totals.kcal)}</div><div className="text-zinc-500 text-xs">kcal</div></div>
                  <div><div className="text-orange-500 jb-display text-lg">{Math.round(totals.protein)}</div><div className="text-zinc-500 text-xs">prot g</div></div>
                  <div><div className="text-orange-500 jb-display text-lg">{Math.round(totals.carbs)}</div><div className="text-zinc-500 text-xs">carb g</div></div>
                  <div><div className="text-orange-500 jb-display text-lg">{Math.round(totals.fat)}</div><div className="text-zinc-500 text-xs">grasa g</div></div>
                </div>
                <p className="text-zinc-500 text-xs mt-2">
                  Objetivo: {data.mealPlan.targetKcal} kcal/día
                  {objetivoAlumno && ` · Meta: ${objetivoAlumno}`}
                  {' · '}
                  <span className={diffKcal > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                    {diffKcal > 0 ? '+' : ''}{Math.round(diffKcal)} kcal vs. objetivo
                  </span>
                </p>
              </div>
            )}

            <div className="border-t border-zinc-800 pt-4 mt-4">
              <h3 className="jb-display text-sm text-zinc-300 mb-3">QUÉ ESTÁ COMIENDO</h3>
              {MEAL_NAMES.map(meal => {
                const entries = (data.mealPlan?.meals?.[meal]) || [];
                const mt = entries.reduce((acc, en) => {
                  const m = entryMacros(en);
                  return { kcal: acc.kcal + m.kcal, protein: acc.protein + m.protein };
                }, { kcal: 0, protein: 0 });
                return (
                  <div key={meal} className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="jb-display text-xs text-orange-500">{meal.toUpperCase()}</span>
                      {entries.length > 0 && (
                        <span className="text-zinc-500 text-xs">{Math.round(mt.kcal)} kcal · P {Math.round(mt.protein)}g</span>
                      )}
                    </div>
                    {entries.length === 0 ? (
                      <p className="text-zinc-600 text-xs italic">Sin registrar</p>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {entries.map(en => {
                          const m = entryMacros(en);
                          const food = FOODS.find(f => f.key === en.foodKey);
                          const cant = en.unit ? `${en.qty} ${en.unit}` : `${en.grams} g`;
                          return (
                            <div key={en.id} className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 flex items-center justify-between gap-2 text-xs">
                              <span className="text-zinc-200">{food ? food.name : en.foodKey} <span className="text-zinc-500">({cant})</span></span>
                              <span className="text-zinc-400 shrink-0">
                                {Math.round(m.kcal)} kcal · P {m.protein.toFixed(0)} · C {m.carbs.toFixed(0)} · G {m.fat.toFixed(0)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {sinRegistrar && (
                <p className="text-zinc-600 text-xs italic mt-2">Este alumno todavía no ha registrado ninguna comida.</p>
              )}
            </div>

            {sesionesFotos.length > 0 && (
              <div className="border-t border-zinc-800 pt-4 mt-4">
                <h3 className="jb-display text-sm text-zinc-300 mb-3">📸 FOTOS DE PROGRESO</h3>
                <div className="flex flex-col gap-3">
                  {sesionesFotos.slice(0, 4).map(s2 => (
                    <div key={s2.fecha}>
                      <p className="jb-body text-xs text-zinc-400 mb-1.5">
                        {new Date(s2.fecha + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
                        {s2.peso && <span className="text-zinc-600"> · {s2.peso} kg</span>}
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {ANGULOS.map(a => {
                          const f = s2.fotos[a.id];
                          return f && fotoUrls[f.ruta] ? (
                            <a key={a.id} href={fotoUrls[f.ruta]} target="_blank" rel="noopener noreferrer" title={a.label}>
                              <img src={fotoUrls[f.ruta]} alt={a.label}
                                className="w-full aspect-[3/4] object-cover rounded-lg hover:opacity-80 transition-opacity" />
                            </a>
                          ) : (
                            <div key={a.id} className="w-full aspect-[3/4] bg-zinc-950 rounded-lg border border-zinc-800" />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {data.form?.pesoObjetivo && (
              <div className="border-t border-zinc-800 pt-4 mt-4">
                <h3 className="jb-display text-sm text-zinc-300 mb-2">META DE PESO</h3>
                <p className="text-zinc-400 text-sm">
                  {data.form.pesoInicial ? `${data.form.pesoInicial} kg → ` : ''}
                  <span className="text-zinc-100">{data.form.peso} kg</span> → {data.form.pesoObjetivo} kg objetivo
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Rescate de alumnos: todos los que tienen plan o prueba vigente,
// agrupados por cuántos días llevan sin registrar comidas. La constancia es
// lo que más se relaciona con que paguen, y por WhatsApp se llega a todos
// (las notificaciones solo las tiene una parte).
const GRUPOS_RESCATE = [
  { key: 'medias', emoji: '🟠', label: 'SE QUEDARON A MEDIAS', detalle: 'Pusieron sus datos pero nunca registraron comida', necesita: 'Ya armaron su plan: un mensaje tuyo hoy los trae de vuelta.', color: 'text-orange-400', borde: 'border-orange-600/60' },
  { key: 'enfriando', emoji: '🟡', label: 'SE ESTÁN ENFRIANDO', detalle: '2 a 7 días sin registrar', necesita: 'Los más fáciles de recuperar: escríbeles primero.', color: 'text-amber-400', borde: 'border-amber-700/50' },
  { key: 'frio', emoji: '🔴', label: 'FRÍOS', detalle: 'Más de 7 días sin registrar', necesita: 'Pregúntales qué se les complicó.', color: 'text-red-400', borde: 'border-red-700/50' },
  { key: 'nunca', emoji: '⚫', label: 'NUNCA REGISTRARON', detalle: 'Ninguna comida registrada', necesita: 'Ayúdalos a dar el primer paso.', color: 'text-zinc-300', borde: 'border-zinc-600' },
  { key: 'aldia', emoji: '🟢', label: 'AL DÍA', detalle: 'Registraron ayer u hoy', necesita: 'Felicítalos: un mensaje tuyo los mantiene constantes.', color: 'text-emerald-400', borde: 'border-emerald-700/50' },
];

/* Tarjetas de colores que funcionan como botones: al tocar una se ven solo
   los alumnos de ese color; al tocarla de nuevo, la lista se guarda. */
function TarjetasColor({ grupos, contar, activo, onElegir }) {
  return (
    <>
      <div className={`grid gap-2 mb-2 ${grupos.length === 5 ? 'grid-cols-2 sm:grid-cols-5' : grupos.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
        {grupos.map(g => {
          const n = contar(g.key);
          const elegida = activo === g.key;
          return (
            <button key={g.key} type="button" onClick={() => onElegir(elegida ? null : g.key)} disabled={!n}
              aria-pressed={elegida}
              className={`text-left bg-zinc-950 border rounded-lg p-2.5 transition-all ${g.borde} ${elegida ? 'ring-2 ring-orange-500 bg-zinc-900' : n ? 'hover:bg-zinc-900' : 'opacity-50 cursor-default'}`}>
              <div className={`jb-display text-2xl ${g.color}`}>{g.emoji} {n}</div>
              <div className="jb-body text-[11px] text-zinc-300 leading-tight mt-0.5">{g.label}</div>
              {n > 0 && (
                <div className={`jb-body text-[10px] mt-1 ${elegida ? 'text-orange-400' : 'text-zinc-500'}`}>
                  {elegida ? '▲ Ocultar' : '▼ Ver'}
                </div>
              )}
            </button>
          );
        })}
      </div>
      {!activo && <p className="jb-body text-[11px] text-zinc-500 mb-2">Toca un color para ver a esos alumnos.</p>}
    </>
  );
}

const ESTADOS_AVISOS_PANEL = [
  { key: 'activo', plural: 'activos', uno: '🔔 Recibe avisos' },
  { key: 'iphone_sin_instalar', plural: 'iPhone sin instalar', uno: '📵 iPhone sin instalar la app: no recibe avisos' },
  { key: 'bloqueado', plural: 'bloqueados', uno: '🔕 Bloqueó los avisos' },
  { key: 'no_activados', plural: 'no los activaron', uno: '🔕 No activó los avisos' },
  { key: 'no_compatible', plural: 'celular no compatible', uno: '📵 Su celular no permite avisos' },
  { key: 'sin_dato', plural: 'sin dato aún', uno: '' },
];

// "hace 40 min", "hace 5 h", "hace 3 días".
function textoHoras(h) {
  if (h === null || h === undefined) return 'un tiempo';
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `${Math.round(h)} h`;
  return `${Math.round(h / 24)} días`;
}

// A medias: primero los que ya toca escribir (3 h o más, el más reciente
// arriba) y al final los que se fueron hace menos de 3 horas.
function ordenMedias(h) {
  if (h === null || h === undefined) return 1e9;
  return h < 3 ? 1e6 + h : h;
}

/* 📲 MENSAJES DEL DÍA: a quién escribirle hoy por WhatsApp, en un solo
   lugar y ordenado de lo urgente a lo motivador (🔴 bienvenida, prueba por
   terminar, primera comida · 🟠 retomar, avisos · 🟢 celebrar), con el mensaje listo
   en la voz de Jonah (reglas en src/listaCarino.js). Al tocar "Escribirle"
   queda ✅ y ese paso no se repite en 7 días. */
/* Correo con el que entra cada alumno ({ username: { correo, google } }),
   desde api/correos-alumnos (solo admin). Si falla, el mensaje dice "con
   el correo con que te registraste". */
async function traerCorreosAlumnos(usernames) {
  if (!usernames.length) return {};
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const r = await fetch('/api/correos-alumnos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
      body: JSON.stringify({ usernames: usernames.slice(0, 50) }),
    });
    const j = await r.json().catch(() => ({}));
    return r.ok && j.correos ? j.correos : {};
  } catch { return {}; }
}

function MensajesDelDiaPanel() {
  const [lista, setLista] = useState(null);
  const [escritos, setEscritos] = useState({});
  const [verMensaje, setVerMensaje] = useState(null); // username con el mensaje abierto
  const hoy = todayISO();

  // Se arma al abrir el panel y se vuelve a armar sola cada vez que Jonah
  // vuelve a la app (ej. al tocar el aviso "Nuevo alumno") y cada 5
  // minutos: así un alumno que se acaba de inscribir aparece sin cerrar
  // y abrir la app.
  useEffect(() => {
    let cancelado = false;
    const cargar = () => cargarDatosCarino(supabase, todayISO())
      .then(async d => {
        // A quien se registró dentro de Instagram/Facebook/TikTok el mensaje
        // le dice con qué correo entrar a la app: se piden esos correos.
        const internos = d.estados.filter(e => e.navegador_interno).map(e => e.username)
          .filter(u => d.alumnos.some(a => a.username === u));
        const correos = await traerCorreosAlumnos(internos);
        if (!cancelado) { setEscritos(d.escritos); setLista(armarListaCarino({ ...d, correos, hoyISO: todayISO(), incluirHechos: true })); }
      })
      .catch(() => { if (!cancelado) setLista(l => l || []); });
    cargar();
    const alVolver = () => { if (document.visibilityState === 'visible') cargar(); };
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('focus', alVolver);
    const cada5 = setInterval(cargar, 5 * 60 * 1000);
    return () => {
      cancelado = true;
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('focus', alVolver);
      clearInterval(cada5);
    };
  }, []);

  async function anotar(x) {
    const nuevos = anotarEscrito(escritos, x.username, x.etapa, hoy);
    setEscritos(nuevos);
    setLista(l => l.map(y => y.username === x.username ? { ...y, hecho: true } : y));
    try { await supabase.from('config').upsert({ key: CLAVE_ESCRITOS, value: JSON.stringify(nuevos) }); } catch {}
  }

  if (!lista) return null;
  const hechos = lista.filter(x => x.hecho).length;
  const faltan = lista.length - hechos;
  return (
    <div className="bg-zinc-900 border border-orange-500/50 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="jb-display text-lg text-zinc-50">📲 MENSAJES DEL DÍA</h2>
          <p className="jb-body text-xs text-zinc-400 mt-0.5">
            {lista.length
              ? 'De lo más urgente a lo motivador. Toca "Escribirle", revisa y envía. Un mensaje tuyo vale más que cualquier aviso automático.'
              : 'Hoy no hay a quién escribirle en especial. ¡Buen día! 🙌'}
          </p>
        </div>
        {lista.length > 0 && (
          <div className="text-right shrink-0">
            <p className="jb-display text-2xl text-orange-400 tabular-nums">{hechos}/{lista.length}</p>
            <p className="jb-body text-[10px] text-zinc-500">{faltan ? `faltan ${faltan}` : '¡todos listos! ✅'}</p>
          </div>
        )}
      </div>
      {lista.length > 0 && (
        <div className="flex mt-3"><BarraBrillo pct={(hechos / lista.length) * 100} alto="h-1.5" /></div>
      )}
      <div className="flex flex-col gap-5 mt-4">
        {NIVELES.map(nivel => {
          const etapas = ETAPAS.filter(e => e.nivel === nivel.id && lista.some(x => x.etapa === e.id));
          if (!etapas.length) return null;
          const pendientes = lista.filter(x => !x.hecho && etapas.some(e => e.id === x.etapa)).length;
          return (
            <div key={nivel.id} className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-2 border-b border-zinc-800 pb-1">
                <p className="jb-display text-sm text-zinc-50 tracking-wide">{nivel.titulo}</p>
                <p className="jb-body text-[11px] text-zinc-500">{pendientes ? `${pendientes} por enviar · ${nivel.ayuda}` : '✅ al día'}</p>
              </div>
              {etapas.map(etapa => {
                const grupo = lista.filter(x => x.etapa === etapa.id);
                return (
                  <div key={etapa.id}>
                    <p className="jb-display text-sm text-zinc-200">{etapa.titulo} <span className="text-zinc-500">({grupo.length})</span></p>
                    <p className="jb-body text-[11px] text-zinc-500 mb-2">{etapa.ayuda}</p>
                    <div className="flex flex-col gap-2">
                      {grupo.map(x => (
                        <div key={x.username} className={`rounded-xl p-3 border ${x.hecho ? 'bg-zinc-950/50 border-zinc-800/60 opacity-70' : 'bg-zinc-950 border-zinc-800'}`}>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="jb-body text-sm text-zinc-100 truncate">{x.nombre}{String(x.nombre || '').trim().length < 3 && <span className="text-zinc-500"> · @{x.username}</span>}</p>
                              <p className="jb-body text-[11px] text-orange-300">{x.motivo}{!x.telefono ? ' · sin WhatsApp' : ''}</p>
                            </div>
                            {x.hecho ? (
                              <span className="jb-body text-xs text-emerald-400 shrink-0">✅ Escrito</span>
                            ) : (
                              <a href={enlaceWhatsApp(x.telefono, x.mensaje)} target="_blank" rel="noreferrer" onClick={() => anotar(x)}
                                className={btnPrimary + ' text-xs py-1.5 px-3 shrink-0'}>
                                <MessageCircle size={14} /> Escribirle
                              </a>
                            )}
                          </div>
                          <button type="button" onClick={() => setVerMensaje(v => v === x.username ? null : x.username)}
                            className="jb-body text-[11px] text-zinc-500 underline underline-offset-2 mt-1.5">
                            {verMensaje === x.username ? 'Ocultar mensaje' : 'Ver mensaje'}
                          </button>
                          {verMensaje === x.username && (
                            <p className="jb-body text-[12px] text-zinc-300 mt-1.5 leading-snug bg-zinc-900 rounded-lg p-2.5">“{x.mensaje}”</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* 🔥 LISTOS PARA PAGAR: alumnos que todavía no pagan pero usan la app de
   verdad (registran casi todos los días, se pesan), ordenados por qué tan
   probable es que paguen. Arriba los que más la usan y a los que menos días
   de Premium de prueba les quedan; también los que siguen registrando en la
   versión gratis. Cada uno con un mensaje listo en la voz de Jonah. Usa el
   mismo registro de "ya le escribí" que Mensajes del día (paso "convertir"),
   así no se le escribe dos veces el mismo día ni se repite en 7 días. */
const MIN_DIAS_LISTOS = 3; // días con comidas en las últimas 2 semanas para entrar
const MAX_LISTOS = 10;

function puntajeListo({ dias14, diasSinRegistrar, pesos, diasRestantes }) {
  let p = dias14 * 10;
  if (diasSinRegistrar <= 1) p += 15;
  else if (diasSinRegistrar <= 3) p += 5;
  p += Math.min(pesos, 4) * 2;
  if (diasRestantes >= 0 && diasRestantes <= 3) p += 20;
  else if (diasRestantes < 0) p += 10;
  return p;
}

function mensajeListo(x, precioMensual) {
  const n = String(x.nombre || '').trim().split(/\s+/)[0];
  const hola = `Hola${n ? ' ' + n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : ''} 👋 Soy Jonah.`;
  const precio = `desde S/${precioMensual.toFixed(2)} al mes`;
  const que = 'la foto inteligente en todas tus comidas, tu menú completo y tu coach';
  const dias = `${x.dias14} de los últimos 14 días`;
  if (x.diasRestantes < 0) {
    return `${hola} Me encanta ver que sigues registrando tus comidas aunque ya terminó tu prueba 🙌 Eso dice mucho de ti. Si quieres volver a tener ${que}, en la app tocas "VER PREMIUM" y eliges tu plan (${precio}). ¿Te cuento cuál te conviene? Vamos juntos, comida a comida 💪🦍`;
  }
  if (x.diasRestantes <= 3) {
    const cuando = x.diasRestantes === 0 ? 'hoy' : x.diasRestantes === 1 ? 'mañana' : `en ${x.diasRestantes} días`;
    return `${hola} Registraste tus comidas ${dias}, ¡eso es compromiso de verdad! 💪 Tu Premium de prueba termina ${cuando}. Si quieres seguir con ${que}, tengo planes ${precio}: en la app tocas "VER PREMIUM". ¿Te cuento cuál te conviene? Vamos juntos, comida a comida 🦍`;
  }
  return `${hola} Registraste tus comidas ${dias}, ¡vas increíble! 💪 Esa constancia es la que trae los cambios, poco a poco. Cuando termine tu prueba vas a poder seguir con ${que} con un plan ${precio} ("VER PREMIUM" en la app). Si tienes cualquier duda, aquí estoy 🦍`;
}

function ListosParaPagarPanel() {
  const [lista, setLista] = useState(null);
  const [escritos, setEscritos] = useState({});
  const [precioMensual, setPrecioMensual] = useState(PLANES[0].precioDefault);
  const [verMensaje, setVerMensaje] = useState(null);
  const hoy = todayISO();

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const desde14 = addDaysISO(hoy, -13);
      const [{ data: alumnos }, { data: hist }, { data: cfg }] = await Promise.all([
        traerTodas(() => supabase.from('alumnos').select('username, nombre, telefono, plan, fecha_vencimiento')
          .eq('enabled', true).neq('plan', 'pago').gte('fecha_vencimiento', addDaysISO(hoy, -30)), 'username'),
        traerTodas(() => supabase.from('historial').select('username, fecha, comidas_count, peso').gte('fecha', addDaysISO(hoy, -30))),
        supabase.from('config').select('key, value').in('key', [CLAVE_ESCRITOS, PLANES[0].configKey]),
      ]);
      if (cancelado) return;
      const valor = k => (cfg || []).find(c => c.key === k)?.value;
      const esc = leerEscritos(valor(CLAVE_ESCRITOS));
      const p1 = Number(valor(PLANES[0].configKey));
      if (p1 > 0) setPrecioMensual(p1);
      const porUsuario = {};
      (hist || []).forEach(h => { (porUsuario[h.username] = porUsuario[h.username] || []).push(h); });
      const filas = (alumnos || []).filter(a => !esCuentaPropia(a.username)).map(a => {
        const h = porUsuario[a.username] || [];
        const conComida = h.filter(f => Number(f.comidas_count) > 0).map(f => f.fecha);
        const dias14 = new Set(conComida.filter(f => f >= desde14)).size;
        const ultima = conComida.sort().pop() || null;
        const diasSinRegistrar = ultima ? Math.round((Date.parse(hoy) - Date.parse(ultima)) / 864e5) : 99;
        const pesos = h.filter(f => Number(f.peso) > 0).length;
        const diasRestantes = a.fecha_vencimiento ? Math.round((Date.parse(a.fecha_vencimiento) - Date.parse(hoy)) / 864e5) : -1;
        return { ...a, dias14, diasSinRegistrar, pesos, diasRestantes };
      }).filter(x => x.dias14 >= MIN_DIAS_LISTOS && (x.diasRestantes >= 0 || x.diasSinRegistrar <= 7))
        .map(x => {
          const e = esc[x.username];
          const f = typeof e === 'string' ? e : e?.f;
          const etapa = typeof e === 'string' ? null : e?.e;
          const hecho = f === hoy;
          const reciente = !hecho && f && etapa === 'convertir' && (Date.parse(hoy) - Date.parse(f)) / 864e5 < 7;
          return { ...x, puntaje: puntajeListo(x), hecho, reciente };
        })
        .filter(x => !x.reciente)
        .sort((a, b) => b.puntaje - a.puntaje)
        .slice(0, MAX_LISTOS);
      setEscritos(esc);
      setLista(filas);
    })().catch(() => { if (!cancelado) setLista([]); });
    return () => { cancelado = true; };
  }, []);

  async function anotar(x) {
    const nuevos = anotarEscrito(escritos, x.username, 'convertir', hoy);
    setEscritos(nuevos);
    setLista(l => l.map(y => y.username === x.username ? { ...y, hecho: true } : y));
    try { await supabase.from('config').upsert({ key: CLAVE_ESCRITOS, value: JSON.stringify(nuevos) }); } catch {}
  }

  if (!lista || !lista.length) return null;
  const hechos = lista.filter(x => x.hecho).length;
  const chip = (texto, fuerte) => (
    <span className={`jb-body text-[10px] px-1.5 py-0.5 rounded-md ${fuerte ? 'bg-orange-500/15 text-orange-300' : 'bg-zinc-800 text-zinc-400'}`}>{texto}</span>
  );
  return (
    <div className="bg-zinc-900 border border-orange-500/50 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="jb-display text-lg text-zinc-50">🔥 LISTOS PARA PAGAR</h2>
          <p className="jb-body text-xs text-zinc-400 mt-0.5">
            Todavía no pagan, pero usan la app de verdad. Arriba, los más probables: los que más registran y a los que menos días de prueba les quedan. Un mensaje tuyo a tiempo puede hacer la diferencia.
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="jb-display text-2xl text-orange-400 tabular-nums">{hechos}/{lista.length}</p>
          <p className="jb-body text-[10px] text-zinc-500">escritos hoy</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 mt-4">
        {lista.map(x => {
          const mensaje = mensajeListo(x, precioMensual);
          const prueba = x.diasRestantes < 0 ? 'Ya en la versión gratis'
            : x.diasRestantes === 0 ? 'Su prueba termina hoy'
            : x.diasRestantes === 1 ? 'Su prueba termina mañana'
            : `Le quedan ${x.diasRestantes} días de prueba`;
          const ultima = x.diasSinRegistrar === 0 ? 'registró hoy' : x.diasSinRegistrar === 1 ? 'registró ayer' : `último registro hace ${x.diasSinRegistrar} días`;
          return (
            <div key={x.username} className={`rounded-xl p-3 border ${x.hecho ? 'bg-zinc-950/50 border-zinc-800/60 opacity-70' : 'bg-zinc-950 border-zinc-800'}`}>
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="jb-body text-sm text-zinc-100 truncate">{x.nombre || x.username}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {chip(`${x.dias14} de 14 días registrando`, x.dias14 >= 10)}
                    {chip(ultima, x.diasSinRegistrar <= 1)}
                    {x.pesos > 0 && chip(`${x.pesos} ${x.pesos === 1 ? 'peso' : 'pesos'}`)}
                    {chip(prueba, x.diasRestantes >= 0 && x.diasRestantes <= 3)}
                    {!x.telefono && chip('sin WhatsApp')}
                  </div>
                </div>
                {x.hecho ? (
                  <span className="jb-body text-xs text-emerald-400 shrink-0">✅ Escrito</span>
                ) : (
                  <a href={enlaceWhatsApp(x.telefono, mensaje)} target="_blank" rel="noreferrer" onClick={() => anotar(x)}
                    className={btnPrimary + ' text-xs py-1.5 px-3 shrink-0'}>
                    <MessageCircle size={14} /> Escribirle
                  </a>
                )}
              </div>
              <button type="button" onClick={() => setVerMensaje(v => v === x.username ? null : x.username)}
                className="jb-body text-[11px] text-zinc-500 underline underline-offset-2 mt-1.5">
                {verMensaje === x.username ? 'Ocultar mensaje' : 'Ver mensaje'}
              </button>
              {verMensaje === x.username && (
                <p className="jb-body text-[12px] text-zinc-300 mt-1.5 leading-snug bg-zinc-900 rounded-lg p-2.5">“{mensaje}”</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* 📣 AVISO DE MEJORAS A LOS DE 40 O MÁS: los alumnos de 40 años o más
   dijeron que la app se les hacía complicada. Cuando salieron el Modo fácil
   y el registro escrito más simple, Jonah les escribe por WhatsApp para
   contarles que lo hizo pensando en ellos. Lista de una sola vez: cada uno
   sale hasta que Jonah toca "Escribirle" o "No hace falta" (se anota en
   config → aviso_mejoras_40). Cuando ya no queda nadie, la tarjeta no sale. */
const CLAVE_AVISO_MEJORAS_40 = 'aviso_mejoras_40';

function mensajeMejoras40(nombre) {
  const n = String(nombre || '').trim().split(/\s+/)[0];
  const hola = n ? `Hola ${n.charAt(0).toUpperCase() + n.slice(1).toLowerCase()}` : 'Hola';
  return `${hola} 👋 Soy Jonah. Algunos me contaron que la app se les hacía un poco complicada, y los escuché: hice cambios pensando en ti 💪

1️⃣ Ahora puedes ver la app con letra más grande y un Inicio con solo 3 botones: abajo en Inicio toca "🔠 Letra grande".
2️⃣ Registrar tu comida es más fácil: tocas REGISTRAR → "¿Qué comiste?", escribes por ejemplo "arroz" y eliges cuánto con botones grandes (½ plato, 1 plato…). Lo que comes siempre ya te aparece listo, con un toque.

Cierra y vuelve a abrir la app para ver los cambios. Si algo se te complica, escríbeme aquí y lo vemos juntos. Vamos poco a poco, comida a comida 🦍`;
}

function AvisoMejoras40Panel() {
  const [lista, setLista] = useState(null);
  const [hechos, setHechos] = useState({});
  const [verMensaje, setVerMensaje] = useState(null);
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const [{ data: datos }, { data: alumnos }, { data: cfg }] = await Promise.all([
        traerTodas(() => supabase.from('datos_alumnos').select('username, form'), 'username'),
        traerTodas(() => supabase.from('alumnos').select('username, nombre, telefono, enabled').eq('enabled', true), 'username'),
        supabase.from('config').select('value').eq('key', CLAVE_AVISO_MEJORAS_40).maybeSingle(),
      ]);
      if (cancelado) return;
      let marcados = {};
      try { marcados = JSON.parse(cfg?.value || '{}') || {}; } catch {}
      const edadDe = f => Number(String(f?.edad ?? '').replace(/[^0-9]/g, '')) || 0;
      const edades = Object.fromEntries((datos || []).map(d => [d.username, edadDe(d.form)]));
      setHechos(marcados);
      setLista((alumnos || [])
        .filter(a => !esCuentaPropia(a.username) && edades[a.username] >= 40)
        .map(a => ({ ...a, edad: edades[a.username] }))
        .sort((a, b) => b.edad - a.edad));
    })().catch(() => { if (!cancelado) setLista([]); });
    return () => { cancelado = true; };
  }, []);

  async function marcar(username, como) {
    const nuevos = { ...hechos, [username]: { f: todayISO(), c: como } };
    setHechos(nuevos);
    try { await supabase.from('config').upsert({ key: CLAVE_AVISO_MEJORAS_40, value: JSON.stringify(nuevos) }); } catch {}
  }

  if (!lista) return null;
  const pendientes = lista.filter(a => !hechos[a.username]);
  if (!pendientes.length) return null;
  return (
    <div className="bg-zinc-900 border border-orange-500/50 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="jb-display text-lg text-zinc-50">📣 CUÉNTALES LAS MEJORAS (40 AÑOS O MÁS)</h2>
          <p className="jb-body text-xs text-zinc-400 mt-0.5">
            Les cuentas que hiciste la app más fácil pensando en ellos: letra grande y registrar escribiendo más simple. Mándalo cuando las mejoras ya estén publicadas.
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="jb-display text-2xl text-orange-400 tabular-nums">{lista.length - pendientes.length}/{lista.length}</p>
          <p className="jb-body text-[10px] text-zinc-500">avisados</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 mt-4">
        {pendientes.map(a => {
          const mensaje = mensajeMejoras40(a.nombre);
          return (
            <div key={a.username} className="rounded-xl p-3 border bg-zinc-950 border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="jb-body text-sm text-zinc-100 truncate">{a.nombre || a.username}</p>
                  <p className="jb-body text-[11px] text-zinc-500">{a.edad} años{!a.telefono ? ' · sin WhatsApp' : ''}</p>
                </div>
                {a.telefono && (
                  <a href={enlaceWhatsApp(a.telefono, mensaje)} target="_blank" rel="noreferrer" onClick={() => marcar(a.username, 'escrito')}
                    className={btnPrimary + ' text-xs py-1.5 px-3 shrink-0'}>
                    <MessageCircle size={14} /> Escribirle
                  </a>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <button type="button" onClick={() => setVerMensaje(v => v === a.username ? null : a.username)}
                  className="jb-body text-[11px] text-zinc-500 underline underline-offset-2">
                  {verMensaje === a.username ? 'Ocultar mensaje' : 'Ver mensaje'}
                </button>
                <button type="button" onClick={() => marcar(a.username, 'no')} className="jb-body text-[11px] text-zinc-500 underline underline-offset-2">No hace falta</button>
              </div>
              {verMensaje === a.username && (
                <p className="jb-body text-[12px] text-zinc-300 mt-1.5 leading-snug bg-zinc-900 rounded-lg p-2.5 whitespace-pre-line">“{mensaje}”</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* SIN AVISOS: alumnos vigentes que no reciben notificaciones, con el
   motivo (lo anota la app en estado_avisos al abrirse) y un botón de
   WhatsApp con los pasos justos para su celular. Sin avisos se pierden casi
   todo el acompañamiento: un mensaje de Jonah los ayuda a activarlos. */
const MOTIVO_SIN_AVISOS = {
  ios_sin_instalar: '📱 iPhone sin instalar la app',
  bloqueado: '🚫 Los bloqueó',
  sin_activar: '🔕 Nunca los activó',
  navegador: '🌐 Abre la app desde Instagram, TikTok o Facebook',
  no_soportado: '⚠️ Su navegador no permite avisos',
  sin_dato: '❔ No abrió la app desde que medimos esto',
};

function motivoSinAvisos(e) {
  if (!e) return 'sin_dato';
  if (e.navegador_interno) return 'navegador';
  return e.estado;
}

function mensajeActivarAvisos(nombre, motivo, dispositivo) {
  const hola = `Hola${nombre ? ' ' + nombre.split(' ')[0] : ''} 👋 Soy Jonah.`;
  const cierre = 'Así te aviso si se te pasa una comida y te acompaño en tu proceso 🦍';
  if (motivo === 'ios_sin_instalar') {
    return `${hola} Para que te lleguen mis avisos en tu iPhone, instala la app (1 minuto): 1) Abre jonahbeast.com en Safari 2) Toca el botón Compartir (el cuadrado con la flecha ↑) 3) "Agregar a pantalla de inicio" → "Agregar". Luego entra desde el ícono nuevo y toca "Activar avisos". ${cierre}`;
  }
  if (motivo === 'bloqueado') {
    const pasos = dispositivo === 'iphone'
      ? 'Ajustes del iPhone → Notificaciones → Jonah Beast Fuel → Permitir notificaciones'
      : dispositivo === 'computadora'
        ? 'toca el candado junto a la dirección de la página → Notificaciones → Permitir'
        : 'Ajustes del celular → Aplicaciones → Jonah Beast Fuel (o Chrome) → Notificaciones → Permitir';
    return `${hola} Vi que los avisos de la app quedaron bloqueados en tu celular. Para activarlos: ${pasos}. Luego cierra la app y vuelve a abrirla. ${cierre}`;
  }
  if (motivo === 'navegador') {
    return `${hola} Estás abriendo la app desde Instagram, TikTok o Facebook, y ahí no llegan mis avisos. Ábrela en ${dispositivo === 'iphone' ? 'Safari' : 'Chrome'}: jonahbeast.com (o toca los tres puntos → "Abrir en ${dispositivo === 'iphone' ? 'Safari' : 'Chrome'}") y toca "Activar avisos". ${cierre}`;
  }
  if (motivo === 'no_soportado') {
    return `${hola} Tu navegador no deja recibir mis avisos. Abre jonahbeast.com en ${dispositivo === 'iphone' ? 'Safari e instálala en tu pantalla de inicio (Compartir → "Agregar a pantalla de inicio")' : 'Chrome'} y toca "Activar avisos". ${cierre}`;
  }
  if (motivo === 'sin_dato') {
    return `${hola} ¿Cómo vas? Entra a la app cuando puedas y toca "Activar avisos" (sale arriba en Inicio). ${cierre}`;
  }
  return `${hola} Todavía no activaste mis avisos. Abre la app y en Inicio toca "Activar avisos" (sale arriba). ${cierre}`;
}

function SinAvisosPanel({ users }) {
  const [open, setOpen] = useState(false);
  const [estados, setEstados] = useState(null);
  const vigentes = useMemo(() => (users || []).filter(u => u.enabled && membershipActive(u) && !esCuentaPropia(u.username)), [users]);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const [{ data: est }, { data: subs }] = await Promise.all([
        traerTodas(() => supabase.from('estado_avisos').select('*'), 'username'),
        traerTodas(() => supabase.from('push_subs').select('username').eq('activa', true)),
      ]);
      if (cancelado) return;
      const m = {}; (est || []).forEach(e => { m[e.username] = e; });
      setEstados({ porUsuario: m, conPush: new Set((subs || []).map(s => s.username)) });
    })().catch(() => { if (!cancelado) setEstados({ porUsuario: {}, conPush: new Set() }); });
    return () => { cancelado = true; };
  }, []);

  if (!estados) return null;
  // Tiene avisos si hay una suscripción activa (es lo que de verdad recibe).
  const sinAvisos = vigentes.filter(u => !estados.conPush.has(u.username))
    .map(u => { const e = estados.porUsuario[u.username]; return { u, e, motivo: motivoSinAvisos(e && e.estado === 'activo' ? { ...e, estado: 'sin_activar' } : e) }; });
  const conteo = {};
  sinAvisos.forEach(x => { conteo[x.motivo] = (conteo[x.motivo] || 0) + 1; });

  return (
    <div className={`bg-zinc-900 border rounded-2xl ${sinAvisos.length ? 'border-orange-500/40' : 'border-zinc-800'}`}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between gap-3 p-5 text-left">
        <div className="min-w-0">
          <h2 className="jb-display text-base text-zinc-200">🔕 SIN AVISOS ({sinAvisos.length} de {vigentes.length})</h2>
          <p className="jb-body text-xs text-zinc-500 mt-0.5">
            {sinAvisos.length
              ? 'No les llegan tus recordatorios. Escríbeles con los pasos para su celular.'
              : 'Todos tus alumnos activos reciben tus avisos 🙌'}
          </p>
        </div>
        <ChevronRight size={18} className={`text-zinc-500 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && sinAvisos.length > 0 && (
        <div className="px-5 pb-5 flex flex-col gap-2">
          <div className="flex flex-wrap gap-1.5 mb-1">
            {Object.entries(conteo).map(([m, n]) => (
              <span key={m} className="jb-body text-[11px] text-zinc-300 bg-zinc-950 border border-zinc-800 rounded-full px-2.5 py-1">{MOTIVO_SIN_AVISOS[m] || m}: {n}</span>
            ))}
          </div>
          {sinAvisos.map(({ u, e, motivo }) => {
            const num = String(u.telefono || '').replace(/\D/g, '');
            const full = num ? (num.length <= 9 ? '51' + num : num) : '';
            const texto = mensajeActivarAvisos(u.nombre, motivo, e?.dispositivo);
            return (
              <div key={u.username} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="jb-body text-sm text-zinc-100 truncate">{u.nombre || u.username}</p>
                  <p className="jb-body text-[11px] text-zinc-500">
                    {MOTIVO_SIN_AVISOS[motivo] || motivo}
                    {e?.dispositivo && e.dispositivo !== 'otro' ? ` · ${e.dispositivo === 'iphone' ? 'iPhone' : e.dispositivo === 'android' ? 'Android' : 'computadora'}` : ''}
                  </p>
                </div>
                <a href={full ? `https://wa.me/${full}?text=${encodeURIComponent(texto)}` : `https://wa.me/?text=${encodeURIComponent(texto)}`}
                  target="_blank" rel="noreferrer" className={btnPrimary + ' text-xs py-1.5 px-3 shrink-0'}>
                  <MessageCircle size={14} /> Escribirle
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RescatePanel({ users }) {
  const [open, setOpen] = useState(false);
  const [grupoVisible, setGrupoVisible] = useState(null); // color que se está mostrando
  // username -> última fecha con comidas registradas
  const [ultimas, setUltimas] = useState(null);
  // username -> { datos: puso sus datos del cuerpo, en: última vez que guardó }
  const [cuerpos, setCuerpos] = useState({});

  const vigentes = useMemo(() => (users || []).filter(u => u.enabled && membershipActive(u)), [users]);
  const nombres = vigentes.map(u => u.username).sort().join(',');

  useEffect(() => {
    if (!nombres) { setUltimas({}); return; }
    let cancelado = false;
    (async () => {
      const { data, error } = await traerTodas(() => supabase.from('historial')
        .select('username, fecha')
        .in('username', nombres.split(','))
        .gt('comidas_count', 0)
        );
      if (cancelado) return;
      if (error) { setUltimas({}); return; }
      const m = {};
      (data || []).forEach(r => { if (!m[r.username] || r.fecha > m[r.username]) m[r.username] = r.fecha; });
      // Los que nunca registraron: ¿pusieron sus datos? (= "a medias")
      const sinComida = nombres.split(',').filter(n => !m[n]);
      const c = {};
      if (sinComida.length) {
        const { data: dat } = await supabase.from('datos_alumnos').select('username, form, updated_at').in('username', sinComida);
        (dat || []).forEach(d => { c[d.username] = { datos: tieneDatosBasicos(d.form || {}), en: d.updated_at }; });
      }
      if (cancelado) return;
      setCuerpos(c);
      setUltimas(m);
    })();
    return () => { cancelado = true; };
  }, [nombres]);

  if (!vigentes.length) return null;

  const alumnos = vigentes.map(u => {
    const ultima = ultimas ? ultimas[u.username] || null : null;
    const sinRegistrar = ultima ? -daysLeft(ultima) : null;
    const cuerpo = cuerpos[u.username];
    const grupo = !ultima ? (cuerpo?.datos ? 'medias' : 'nunca') : sinRegistrar <= 1 ? 'aldia' : sinRegistrar <= 7 ? 'enfriando' : 'frio';
    const horasSinVolver = grupo === 'medias' && cuerpo?.en ? (Date.now() - new Date(cuerpo.en).getTime()) / 3600000 : null;
    return { ...u, ultima, sinRegistrar, grupo, horasSinVolver };
  }).sort((a, b) => (a.sinRegistrar ?? 999) - (b.sinRegistrar ?? 999) || ordenMedias(a.horasSinVolver) - ordenMedias(b.horasSinVolver));
  // A medias "para escribir hoy": se fueron hace 3 horas o más, y no hace
  // más de 3 días (después ya se enfrían y el mensaje pesa menos).
  const mediasHoy = alumnos.filter(u => u.grupo === 'medias' && u.horasSinVolver !== null && u.horasSinVolver >= 3 && u.horasSinVolver <= 72);

  function linkWhatsApp(u) {
    const nombre = (u.nombre || u.username).trim().split(/\s+/)[0];
    const texto = u.grupo === 'medias'
      ? `Hola ${nombre}, soy Jonah 🦍 Vi que ya armaste tu plan 💪 ¿Te ayudo a registrar tu primera comida? Es un toque: abre la app y elige lo que comiste hoy.`
      : u.grupo === 'aldia'
      ? `Hola ${nombre}, soy Jonah 🦍 Vi que vienes registrando tus comidas, ¡así se hace! Esa constancia es la que trae resultados. Sigue así y cualquier duda me escribes 💪`
      : u.grupo === 'enfriando'
      ? `Hola ${nombre}, soy Jonah 🦍 Te extraño por la app: llevas ${u.sinRegistrar} días sin registrar tus comidas. ¿Todo bien? Registra hoy aunque sea tu desayuno y retomamos juntos 💪`
      : u.grupo === 'frio'
        ? `Hola ${nombre}, soy Jonah 🦍 Hace ${u.sinRegistrar} días que no te veo por la app. ¿Qué se te complicó? Cuéntame y lo resolvemos juntos, tu objetivo sigue ahí 🔥`
        : `Hola ${nombre}, soy Jonah 🦍 Vi que aún no registras tu primera comida. ¿Te ayudo a empezar? Toma menos de un minuto y ahí empezamos a trabajar tu objetivo 💪`;
    const extra = u.estadoAvisos === 'iphone_sin_instalar'
      ? '\n\nPD: para que te lleguen mis recordatorios en tu iPhone, abre la app en Safari → botón Compartir → "Agregar a pantalla de inicio" 📲'
      : u.estadoAvisos === 'bloqueado'
        ? '\n\nPD: tienes bloqueadas mis notificaciones; si quieres que te recuerde tus comidas, actívalas en los ajustes del navegador para la app 🔔'
        : u.estadoAvisos === 'no_activados'
          ? '\n\nPD: activa las notificaciones en la app (en Inicio) y te aviso cuando se te pase alguna comida 🔔'
          : '';
    const textoFinal = texto + extra;
    const num = (u.telefono || '').replace(/\D/g, '');
    const full = num ? (num.length <= 9 ? '51' + num : num) : '';
    return full ? `https://wa.me/${full}?text=${encodeURIComponent(textoFinal)}`
                : `https://wa.me/?text=${encodeURIComponent(textoFinal)}`;
  }

  const porRescatar = alumnos.filter(u => u.grupo !== 'aldia').length;
  const conteoAvisos = {};
  alumnos.forEach(u => { const k = u.estadoAvisos || 'sin_dato'; conteoAvisos[k] = (conteoAvisos[k] || 0) + 1; });

  return (
    <div className="bg-zinc-900 border border-orange-500/40 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full px-5 py-4 flex items-center justify-between text-left">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-sm shrink-0">🔥</div>
          <h2 className="jb-display text-base text-zinc-200">
            RESCATE DE ALUMNOS
            {ultimas && porRescatar > 0 && <span className="ml-2 bg-orange-500 text-zinc-950 text-xs px-2 py-0.5 rounded-full">{porRescatar}</span>}
          </h2>
        </div>
        <ChevronRight size={18} className={`text-zinc-500 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-zinc-800 pt-4">
          {ultimas === null ? (
            <div className="flex items-center gap-2 text-zinc-500 text-xs jb-body"><Loader2 size={14} className="animate-spin" /> Revisando su actividad…</div>
          ) : (
            <>
              <p className="jb-body text-xs text-zinc-500 mb-3">
                Alumnos con plan o prueba vigente según cuándo registraron comidas por última vez.
              </p>
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 mb-3 jb-body text-[11px] text-zinc-400 leading-relaxed">
                <span className="text-zinc-200 font-semibold">🔔 Avisos:</span>{' '}
                {ESTADOS_AVISOS_PANEL.filter(e => conteoAvisos[e.key]).map(e => `${conteoAvisos[e.key]} ${e.plural}`).join(' · ') || 'sin datos aún'}
                <span className="block text-zinc-600">Se actualiza cuando cada alumno abre la app.</span>
              </div>
              {mediasHoy.length > 0 && (
                <button type="button" onClick={() => setGrupoVisible('medias')}
                  className="w-full text-left bg-orange-500/10 border border-orange-500/50 rounded-lg px-3 py-2.5 mb-3 flex items-center gap-2.5 hover:bg-orange-500/15 transition-colors">
                  <span className="text-lg">🟠</span>
                  <span className="flex-1 min-w-0 jb-body text-xs text-zinc-200">
                    <span className="font-semibold text-orange-300">{mediasHoy.length} {mediasHoy.length === 1 ? 'se quedó' : 'se quedaron'} a medias:</span>{' '}
                    {mediasHoy.length === 1 ? 'puso sus datos' : 'pusieron sus datos'} hace más de 3 horas y no {mediasHoy.length === 1 ? 'registró' : 'registraron'} comida. Escríbeles hoy.
                  </span>
                  <ChevronRight size={16} className="text-orange-400 shrink-0" />
                </button>
              )}
              <TarjetasColor grupos={GRUPOS_RESCATE} contar={k => alumnos.filter(u => u.grupo === k).length}
                activo={grupoVisible} onElegir={setGrupoVisible} />
              <div className="flex flex-col gap-4 mt-2">
                {GRUPOS_RESCATE.filter(g => g.key === grupoVisible).map(g => {
                  const lista = alumnos.filter(u => u.grupo === g.key);
                  if (!lista.length) return null;
                  return (
                    <div key={g.key}>
                      <div className={`jb-display text-xs ${g.color}`}>{g.emoji} {g.label} · {lista.length}</div>
                      <div className="jb-body text-[11px] text-zinc-500 mb-2">{g.detalle}. {g.necesita}</div>
                      <div className="flex flex-col gap-2">
                        {lista.map(u => (
                          <div key={u.username} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap">
                            <div className="min-w-0">
                              <div className="text-zinc-100 text-sm font-medium jb-body">{u.nombre ? `${u.nombre} · ${u.username}` : u.username}</div>
                              <div className="text-[11px] jb-body text-zinc-400 mt-0.5">
                                {u.ultima ? (u.sinRegistrar <= 0 ? 'Registró hoy' : u.sinRegistrar === 1 ? 'Registró ayer' : `Última comida hace ${u.sinRegistrar} días`)
                                  : u.grupo === 'medias' ? `Puso sus datos · no vuelve hace ${textoHoras(u.horasSinVolver)}${u.horasSinVolver !== null && u.horasSinVolver < 3 ? ' (dale unas horas)' : ''}`
                                  : 'Aún no registra ninguna comida'}
                                {u.plan === 'trial' || u.plan === 'prueba' ? ' · prueba gratis' : ' · plan pagado'}
                                {!u.telefono && ' · sin celular'}
                              </div>
                              {u.estadoAvisos && (
                                <div className={`text-[11px] jb-body mt-0.5 ${u.estadoAvisos === 'activo' ? 'text-zinc-500' : 'text-amber-400'}`}>
                                  {(ESTADOS_AVISOS_PANEL.find(e => e.key === u.estadoAvisos) || {}).uno}
                                </div>
                              )}
                            </div>
                            <a href={linkWhatsApp(u)} target="_blank" rel="noopener noreferrer" className={btnPrimary + ' py-1.5 px-3 text-xs'}>
                              <MessageCircle size={13} /> Escribir
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Semáforo de las pruebas gratis por vencer: según cuántos días registró
// comidas, cada alumno necesita un mensaje distinto (invitarlo a pagar,
// ayudarlo a retomar o rescatarlo). Los planes pagados siguen con el
// mensaje de renovación de siempre.
const SEMAFORO_PRUEBA = [
  { key: 'activo', emoji: '🟢', label: 'MUY ACTIVOS', detalle: '5 o más días registrando', necesita: 'Invítalos a pagar: ya ven el valor.', color: 'text-emerald-400', borde: 'border-emerald-700/50' },
  { key: 'poco', emoji: '🟡', label: 'POCO ACTIVOS', detalle: '1 a 4 días registrando', necesita: 'Ayúdalos a retomar.', color: 'text-amber-400', borde: 'border-amber-700/50' },
  { key: 'nunca', emoji: '🔴', label: 'NUNCA REGISTRARON', detalle: 'Ninguna comida registrada', necesita: 'Rescátalos: algo los frenó al inicio.', color: 'text-red-400', borde: 'border-red-700/50' },
];

function grupoSemaforo(diasActivos) {
  if (diasActivos >= 5) return 'activo';
  if (diasActivos >= 1) return 'poco';
  return 'nunca';
}

function cuandoTerminaPrueba(dl) {
  if (dl < 0) return `terminó hace ${Math.abs(dl)} día(s)`;
  if (dl === 0) return 'termina hoy';
  if (dl === 1) return 'termina mañana';
  return `termina en ${dl} días`;
}

function textoUltimaComida(fecha) {
  const dias = -daysLeft(fecha);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  return `hace ${dias} días`;
}

function VencimientosPanel({ users, onRenew, onAdjustDays }) {
  const { motivoDe } = useMotivosSalida();
  const [open, setOpen] = useState(true);
  const [grupoVisible, setGrupoVisible] = useState(null); // color que se está mostrando
  const [verVencidos, setVerVencidos] = useState(false);
  // username -> { dias, ultima } con los días en que registró comidas.
  const [actividad, setActividad] = useState(null);

  // Por vencer = membresía todavía vigente que vence de hoy a 7 días.
  // Las que ya vencieron (hasta hace 7 días) van aparte en "Ya vencieron";
  // las más antiguas ya no se muestran aquí.
  const conVencimiento = useMemo(() => (users || [])
    .filter(u => u.fechaVencimiento && u.enabled)
    .map(u => ({ ...u, dl: daysLeft(u.fechaVencimiento), esPrueba: u.plan === 'trial' || u.plan === 'prueba' }))
    .filter(u => u.dl !== null), [users]);
  const porVencer = useMemo(() => conVencimiento.filter(u => u.dl >= 0 && u.dl <= 7).sort((a, b) => a.dl - b.dl), [conVencimiento]);
  const vencidos = useMemo(() => conVencimiento.filter(u => u.dl < 0 && u.dl >= -7).sort((a, b) => b.dl - a.dl), [conVencimiento]);

  const nombresPrueba = [...porVencer, ...vencidos].filter(u => u.esPrueba).map(u => u.username).sort().join(',');

  useEffect(() => {
    if (!nombresPrueba) { setActividad({}); return; }
    let cancelado = false;
    (async () => {
      const { data, error } = await traerTodas(() => supabase.from('historial')
        .select('username, fecha')
        .in('username', nombresPrueba.split(','))
        .gt('comidas_count', 0)
        );
      if (cancelado) return;
      if (error) { setActividad({}); return; }
      const porAlumno = {};
      (data || []).forEach(r => {
        const a = (porAlumno[r.username] = porAlumno[r.username] || { dias: 0, ultima: null });
        a.dias += 1;
        if (!a.ultima || r.fecha > a.ultima) a.ultima = r.fecha;
      });
      setActividad(porAlumno);
    })();
    return () => { cancelado = true; };
  }, [nombresPrueba]);

  if (porVencer.length === 0 && vencidos.length === 0) return null;

  const conActividad = u => {
    const act = (actividad && actividad[u.username]) || { dias: 0, ultima: null };
    return { ...u, diasActivos: act.dias, ultima: act.ultima, grupo: grupoSemaforo(act.dias) };
  };
  const pruebas = porVencer.filter(u => u.esPrueba).map(conActividad);
  const planesPagados = porVencer.filter(u => !u.esPrueba);

  function linkWhatsApp(u, texto) {
    const num = (u.telefono || '').replace(/\D/g, '');
    const full = num ? (num.length <= 9 ? '51' + num : num) : '';
    return full ? `https://wa.me/${full}?text=${encodeURIComponent(texto)}`
                : `https://wa.me/?text=${encodeURIComponent(texto)}`;
  }

  function mensajePrueba(u) {
    const nombre = (u.nombre || u.username).trim().split(/\s+/)[0];
    const cuando = cuandoTerminaPrueba(u.dl);
    // Prueba ya terminada (esta semana): se le ofrece volver con 7 días más.
    if (u.dl < 0) {
      const hace = Math.abs(u.dl);
      return u.diasActivos > 0
        ? `Hola ${nombre}, soy Jonah 🦍 Vi que tu prueba terminó hace ${hace} ${hace === 1 ? 'día' : 'días'} y alcanzaste a registrar ${u.diasActivos} ${u.diasActivos === 1 ? 'día' : 'días'} 💪 ¿Te activo 7 días más sin costo para que termines de probarla?`
        : `Hola ${nombre}, soy Jonah 🦍 Vi que tu prueba terminó hace ${hace} ${hace === 1 ? 'día' : 'días'} y no llegamos a empezar. Ahora tomarle foto a tu plato y ver sus calorías es un toque 📸 ¿Te activo 7 días más sin costo?`;
    }
    if (u.grupo === 'activo') {
      return `Hola ${nombre}, soy Jonah 🦍 Vi que llevas ${u.diasActivos} días registrando tus comidas, ¡vas muy bien! Tu prueba gratis ${cuando}. ¿Te ayudo a elegir tu plan para no perder tu avance?`;
    }
    if (u.grupo === 'poco') {
      return `Hola ${nombre}, soy Jonah 🦍 Vi que empezaste a registrar tus comidas y quiero ayudarte a seguir. Tu prueba gratis ${cuando}. ¿Qué se te está complicando? En 2 minutos lo resolvemos juntos.`;
    }
    return `Hola ${nombre}, soy Jonah 🦍 Vi que creaste tu cuenta pero aún no registras tu primera comida. ¿Te ayudo a empezar? Toma menos de un minuto. Tu prueba gratis ${cuando}.`;
  }

  function mensajeRenovacion(u) {
    const nombre = u.nombre || u.username;
    if (u.dl < 0) return `Hola ${nombre}, tu plan de Jonah Beast Fuel venció hace ${Math.abs(u.dl)} día(s). ¿Te ayudo a renovarlo para que no pierdas tu progreso?`;
    if (u.dl === 0) return `Hola ${nombre}, tu plan de Jonah Beast Fuel vence hoy. ¿Lo renovamos para que sigas sin interrupciones?`;
    return `Hola ${nombre}, te escribo porque tu plan de Jonah Beast Fuel vence en ${u.dl} día(s). ¿Quieres renovarlo?`;
  }

  function detalleActividad(u) {
    return (
      <div className="text-[11px] jb-body text-zinc-400 mt-0.5">
        {u.diasActivos > 0
          ? `${u.diasActivos} día(s) registrando · última comida ${textoUltimaComida(u.ultima)}`
          : 'Aún no registra ninguna comida'}
        {!u.telefono && ' · sin celular'}
      </div>
    );
  }

  function textoVence(u) {
    return u.dl < 0 ? `Venció hace ${Math.abs(u.dl)} día(s)` : u.dl === 0 ? 'Vence hoy' : `Vence en ${u.dl} día(s)`;
  }

  function filaAlumno(u, texto, detalle) {
    return (
      <div key={u.username} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-zinc-100 text-sm font-medium jb-body">
            {u.nombre ? `${u.nombre} · ${u.username}` : u.username}
          </div>
          <div className={`text-xs jb-body ${u.dl < 0 ? 'text-red-400' : u.dl <= 2 ? 'text-orange-400' : 'text-amber-400'}`}>
            {textoVence(u)}{u.esPrueba ? ' · prueba gratis' : ''}
          </div>
          {detalle}
          <LineaMotivo m={motivoDe[u.username]} />
        </div>
        <div className="flex items-center gap-2">
          <a href={linkWhatsApp(u, texto)} target="_blank" rel="noopener noreferrer"
            className={btnPrimary + ' py-1.5 px-3 text-xs'}>
            <MessageCircle size={13} /> Escribir
          </a>
          {u.esPrueba && u.dl < 0 && onAdjustDays && (
            <button onClick={() => {
              if (!window.confirm(`¿Activar 7 días de prueba a ${u.nombre || u.username}, contados desde hoy?`)) return;
              onAdjustDays(u.username, 7, 'Recuperar prueba vencida: 7 días más', true);
            }} className={btnGhost + ' py-1.5 px-3 text-xs'}>
              +7 días
            </button>
          )}
          <button onClick={() => onRenew(u.username, 1)} className={btnGhost + ' py-1.5 px-3 text-xs'}>
            +1 mes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-amber-700/50 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full px-5 py-4 flex items-center justify-between text-left">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-sm shrink-0">⏰</div>
          <h2 className="jb-display text-base text-zinc-200">
            POR VENCER
            <span className="ml-2 bg-amber-500 text-zinc-950 text-xs px-2 py-0.5 rounded-full">{porVencer.length}</span>
          </h2>
        </div>
        <ChevronRight size={18} className={`text-zinc-500 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-zinc-800 pt-4 flex flex-col gap-5">
          {pruebas.length > 0 && (
            <div>
              <h3 className="jb-display text-sm text-zinc-200 mb-1">PRUEBAS GRATIS POR TERMINAR</h3>
              <p className="jb-body text-xs text-zinc-500 mb-3">
                Según cuántos días registraron comidas. Empieza por los verdes: son los más fáciles de convertir.
              </p>
              {actividad === null ? (
                <div className="flex items-center gap-2 text-zinc-500 text-xs jb-body"><Loader2 size={14} className="animate-spin" /> Revisando su actividad…</div>
              ) : (
                <>
                  <TarjetasColor grupos={SEMAFORO_PRUEBA} contar={k => pruebas.filter(u => u.grupo === k).length}
                    activo={grupoVisible} onElegir={setGrupoVisible} />
                  <div className="flex flex-col gap-4 mt-2">
                    {SEMAFORO_PRUEBA.filter(s => s.key === grupoVisible).map(s => {
                      const lista = pruebas.filter(u => u.grupo === s.key);
                      if (!lista.length) return null;
                      return (
                        <div key={s.key}>
                          <div className={`jb-display text-xs ${s.color}`}>{s.emoji} {s.label} · {lista.length}</div>
                          <div className="jb-body text-[11px] text-zinc-500 mb-2">{s.detalle}. {s.necesita}</div>
                          <div className="flex flex-col gap-2">
                            {lista.map(u => filaAlumno(u, mensajePrueba(u), detalleActividad(u)))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {planesPagados.length > 0 && (
            <div>
              <h3 className="jb-display text-sm text-zinc-200 mb-1">PLANES POR RENOVAR</h3>
              <p className="jb-body text-xs text-zinc-500 mb-3">
                Escríbeles antes de que venzan. Un mensaje a tiempo evita que se caigan.
              </p>
              <div className="flex flex-col gap-2">
                {planesPagados.map(u => filaAlumno(u, mensajeRenovacion(u)))}
              </div>
            </div>
          )}

          {porVencer.length === 0 && (
            <p className="jb-body text-xs text-zinc-500">Nadie vence en los próximos 7 días.</p>
          )}

          {vencidos.length > 0 && (
            <div>
              <button type="button" onClick={() => setVerVencidos(v => !v)} aria-expanded={verVencidos}
                className={`w-full text-left bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 flex items-center justify-between gap-3 transition-all ${verVencidos ? 'ring-2 ring-orange-500' : 'hover:bg-zinc-900'}`}>
                <div>
                  <div className="jb-display text-sm text-zinc-200">⌛ YA VENCIERON · {vencidos.length}</div>
                  <div className="jb-body text-[11px] text-zinc-500">En los últimos 7 días. Aún puedes escribirles para que continúen.</div>
                </div>
                <span className={`jb-body text-[11px] shrink-0 ${verVencidos ? 'text-orange-400' : 'text-zinc-500'}`}>{verVencidos ? '▲ Ocultar' : '▼ Ver'}</span>
              </button>
              {verVencidos && (
                <div className="flex flex-col gap-2 mt-2">
                  {vencidos.map(u => u.esPrueba
                    ? filaAlumno(conActividad(u), mensajePrueba(conActividad(u)), detalleActividad(conActividad(u)))
                    : filaAlumno(u, mensajeRenovacion(u)))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Volver a invitar: quienes ya salieron de "Por vencer" (su prueba o plan
// terminó hace más de 7 días) y no volvieron. Cada uno con un WhatsApp ya
// escrito según si llegó a pagar y cuánto usó la app. Al tocar "Escribir"
// queda marcado como invitado (en este aparato) y pasa a "Ya invitados"
// por 30 días, para no escribirle dos veces seguidas.
const CLAVE_INVITADOS = 'jb-volver-invitar';
const DIAS_ENTRE_INVITACIONES = 30;

function leerInvitados() {
  try { return JSON.parse(localStorage.getItem(CLAVE_INVITADOS) || '{}') || {}; } catch { return {}; }
}

const GRUPOS_VOLVER = [
  { key: 'usaron', emoji: '🟢', label: 'PROBARON Y USARON', detalle: 'Registraron comidas en su prueba pero no pagaron', necesita: 'Ya conocen el valor: invítalos con 7 días más.', color: 'text-emerald-400', borde: 'border-emerald-700/50' },
  { key: 'pagaron', emoji: '🔵', label: 'PAGARON ANTES', detalle: 'Tuvieron plan pagado y no renovaron', necesita: 'Pregúntales cómo van y ayúdalos a retomar.', color: 'text-sky-400', borde: 'border-sky-700/50' },
  { key: 'nunca', emoji: '⚫', label: 'NUNCA EMPEZARON', detalle: 'Se registraron pero no registraron comidas', necesita: 'Cuéntales que ahora empezar es un toque.', color: 'text-zinc-300', borde: 'border-zinc-600' },
];

const TEXTO_MOTIVO = {
  precio: '💸 El precio', tiempo: '⏰ No tuvo tiempo', no_entendi: '🤔 No la entendió bien',
  foto: '📸 La foto no le funcionó bien', comidas: '🍽️ No encontró sus comidas', otro: '✍️ Otro',
};

// "¿Qué te faltó para quedarte?" (encuesta al terminar la prueba): todas
// las respuestas y la última de cada alumno.
function useMotivosSalida() {
  const [motivos, setMotivos] = useState([]);
  useEffect(() => {
    supabase.from('motivos_salida').select('username, motivo, detalle, creado_en')
      .order('creado_en', { ascending: false }).limit(500)
      .then(({ data }) => setMotivos(data || []), () => {});
  }, []);
  const motivoDe = {};
  motivos.forEach(m => { if (!motivoDe[m.username]) motivoDe[m.username] = m; });
  return { motivos, motivoDe };
}

function LineaMotivo({ m }) {
  if (!m) return null;
  return (
    <div className="text-[11px] jb-body text-amber-300 mt-0.5">
      Le faltó: {TEXTO_MOTIVO[m.motivo] || m.motivo}{m.detalle ? ` — "${m.detalle}"` : ''}
    </div>
  );
}

// "¿Por qué no pagaron?": resumen de la encuesta al terminar la prueba.
function ResumenMotivos({ motivos }) {
  const ultimo = {};
  motivos.forEach(m => { if (!ultimo[m.username]) ultimo[m.username] = m; });
  const lista = Object.values(ultimo);
  if (!lista.length) {
    return <p className="jb-body text-[11px] text-zinc-500 mb-3">📝 "¿Qué te faltó para quedarte?": todavía nadie respondió. Se pregunta al terminar la prueba.</p>;
  }
  const conteo = {};
  lista.forEach(m => { conteo[m.motivo] = (conteo[m.motivo] || 0) + 1; });
  const orden = Object.entries(conteo).sort((a, b) => b[1] - a[1]);
  const otros = lista.filter(m => m.detalle).slice(0, 5);
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 mb-3 jb-body">
      <p className="text-sm text-zinc-200 font-semibold mb-1">📝 ¿Qué les faltó para quedarse? · {lista.length} {lista.length === 1 ? 'respuesta' : 'respuestas'}</p>
      <div className="flex flex-col gap-0.5">
        {orden.map(([k, n]) => (
          <p key={k} className="text-xs text-zinc-400">{TEXTO_MOTIVO[k] || k}: <span className="text-orange-400 font-semibold">{n}</span> ({Math.round((n / lista.length) * 100)}%)</p>
        ))}
      </div>
      {otros.length > 0 && (
        <div className="mt-1.5 flex flex-col gap-0.5">
          {otros.map((m, i) => <p key={i} className="text-[11px] text-zinc-500">"{m.detalle}" — {m.username}</p>)}
        </div>
      )}
    </div>
  );
}

function VolverInvitarPanel({ users, onAdjustDays }) {
  const [open, setOpen] = useState(false);
  const [grupoVisible, setGrupoVisible] = useState(null);
  const [verInvitados, setVerInvitados] = useState(false);
  const [invitados, setInvitados] = useState(leerInvitados);
  // username -> días en que registró comidas
  const [actividad, setActividad] = useState(null);
  const { motivos, motivoDe } = useMotivosSalida();

  const salieron = useMemo(() => (users || [])
    .filter(u => u.fechaVencimiento)
    .map(u => ({ ...u, dl: daysLeft(u.fechaVencimiento), esPrueba: u.plan === 'trial' || u.plan === 'prueba' }))
    .filter(u => u.dl !== null && u.dl < -7), [users]);
  const nombres = salieron.map(u => u.username).sort().join(',');

  useEffect(() => {
    if (!nombres) { setActividad({}); return; }
    let cancelado = false;
    (async () => {
      const { data, error } = await traerTodas(() => supabase.from('historial')
        .select('username, fecha')
        .in('username', nombres.split(','))
        .gt('comidas_count', 0)
        );
      if (cancelado) return;
      if (error) { setActividad({}); return; }
      const m = {};
      (data || []).forEach(r => { m[r.username] = (m[r.username] || 0) + 1; });
      setActividad(m);
    })();
    return () => { cancelado = true; };
  }, [nombres]);

  if (!salieron.length) return null;

  const hoyMs = Date.now();
  const alumnos = salieron.map(u => {
    const diasActivos = actividad ? actividad[u.username] || 0 : 0;
    const grupo = !u.esPrueba ? 'pagaron' : diasActivos > 0 ? 'usaron' : 'nunca';
    const invitadoEl = invitados[u.username] || null;
    const invitadoHace = invitadoEl ? Math.floor((hoyMs - new Date(invitadoEl).getTime()) / 86400000) : null;
    const yaInvitado = invitadoHace !== null && invitadoHace < DIAS_ENTRE_INVITACIONES;
    return { ...u, diasActivos, grupo, invitadoHace, yaInvitado };
  }).sort((a, b) => b.diasActivos - a.diasActivos || b.dl - a.dl);
  const pendientes = alumnos.filter(u => !u.yaInvitado);
  const yaInvitados = alumnos.filter(u => u.yaInvitado);

  function marcarInvitado(username) {
    const nuevo = { ...leerInvitados(), [username]: new Date().toISOString() };
    try { localStorage.setItem(CLAVE_INVITADOS, JSON.stringify(nuevo)); } catch { /* sin memoria del navegador: solo se ve en esta sesión */ }
    setInvitados(nuevo);
  }

  function desmarcarInvitado(username) {
    const nuevo = { ...leerInvitados() };
    delete nuevo[username];
    try { localStorage.setItem(CLAVE_INVITADOS, JSON.stringify(nuevo)); } catch { /* igual que arriba */ }
    setInvitados(nuevo);
  }

  function mensaje(u) {
    const nombre = (u.nombre || u.username).trim().split(/\s+/)[0];
    if (u.grupo === 'pagaron') {
      return `Hola ${nombre}, soy Jonah 🦍 Hace un tiempo que no te veo por la app y quería saber cómo vas con tu objetivo. Si quieres retomar, te ayudo a renovar tu plan y seguimos donde lo dejaste 🔥`;
    }
    if (u.grupo === 'usaron') {
      return `Hola ${nombre}, soy Jonah 🦍 Hace unas semanas probaste Jonah Beast Fuel y llegaste a registrar ${u.diasActivos} ${u.diasActivos === 1 ? 'día' : 'días'}. Desde entonces mejoramos bastante la app 💪 ¿Te animas a retomarla? Te activo 7 días más sin costo para que la pruebes de nuevo.`;
    }
    return `Hola ${nombre}, soy Jonah 🦍 Hace un tiempo creaste tu cuenta en Jonah Beast Fuel pero no llegamos a empezar. Ahora registrar tu primera comida es un toque 👆 ¿Te activo 7 días más sin costo para que la pruebes con calma?`;
  }

  function linkWhatsApp(u) {
    const num = (u.telefono || '').replace(/\D/g, '');
    const full = num ? (num.length <= 9 ? '51' + num : num) : '';
    const texto = mensaje(u);
    return full ? `https://wa.me/${full}?text=${encodeURIComponent(texto)}`
                : `https://wa.me/?text=${encodeURIComponent(texto)}`;
  }

  function darSieteDias(u) {
    if (!window.confirm(`¿Activar 7 días de prueba a ${u.nombre || u.username}, contados desde hoy?`)) return;
    onAdjustDays(u.username, 7, 'Volver a invitar: 7 días más de prueba', true);
  }

  function fila(u) {
    const semanas = Math.floor(Math.abs(u.dl) / 7);
    return (
      <div key={u.username} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-zinc-100 text-sm font-medium jb-body">{u.nombre ? `${u.nombre} · ${u.username}` : u.username}</div>
          <div className="text-[11px] jb-body text-zinc-400 mt-0.5">
            {u.esPrueba ? 'Su prueba terminó' : 'Su plan venció'} hace {semanas >= 2 ? `${semanas} semanas` : `${Math.abs(u.dl)} ${Math.abs(u.dl) === 1 ? 'día' : 'días'}`}
            {u.diasActivos > 0 ? ` · registró ${u.diasActivos} ${u.diasActivos === 1 ? 'día' : 'días'}` : ''}
            {!u.enabled && ' · cuenta apagada'}
            {!u.telefono && ' · sin celular'}
          </div>
          <LineaMotivo m={motivoDe[u.username]} />
          {u.yaInvitado && (
            <div className="text-[11px] jb-body text-emerald-400 mt-0.5">
              ✓ Invitado {u.invitadoHace === 0 ? 'hoy' : u.invitadoHace === 1 ? 'ayer' : `hace ${u.invitadoHace} días`}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a href={linkWhatsApp(u)} target="_blank" rel="noopener noreferrer" onClick={() => marcarInvitado(u.username)}
            className={btnPrimary + ' py-1.5 px-3 text-xs'}>
            <MessageCircle size={13} /> {u.yaInvitado ? 'Escribir otra vez' : 'Escribir'}
          </a>
          {u.esPrueba && (
            <button type="button" onClick={() => darSieteDias(u)} className={btnGhost + ' py-1.5 px-3 text-xs'}>+7 días</button>
          )}
          {u.yaInvitado && (
            <button type="button" onClick={() => desmarcarInvitado(u.username)} className={btnGhost + ' py-1.5 px-3 text-xs'}>Desmarcar</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full px-5 py-4 flex items-center justify-between text-left">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-sm shrink-0">💌</div>
          <h2 className="jb-display text-base text-zinc-200">
            VOLVER A INVITAR
            {pendientes.length > 0 && <span className="ml-2 bg-orange-500 text-zinc-950 text-xs px-2 py-0.5 rounded-full">{pendientes.length}</span>}
          </h2>
        </div>
        <ChevronRight size={18} className={`text-zinc-500 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-zinc-800 pt-4">
          {actividad === null ? (
            <div className="flex items-center gap-2 text-zinc-500 text-xs jb-body"><Loader2 size={14} className="animate-spin" /> Revisando su actividad…</div>
          ) : (
            <>
              <ResumenMotivos motivos={motivos} />
              <p className="jb-body text-xs text-zinc-500 mb-3">
                Personas cuya prueba o plan terminó hace más de 7 días y no volvieron (los de esta semana están en "Por vencer" → "Ya vencieron"). Empieza por los verdes: ya usaron la app y son los más fáciles de recuperar.
                {' '}<span className="text-zinc-400">"+7 días" les vuelve a abrir la app una semana desde hoy.</span>
              </p>
              {pendientes.length === 0 ? (
                <p className="jb-body text-xs text-zinc-400 mb-2">✓ Ya invitaste a todos. En {DIAS_ENTRE_INVITACIONES} días vuelven a aparecer aquí si no regresaron.</p>
              ) : (
                <>
                  <TarjetasColor grupos={GRUPOS_VOLVER} contar={k => pendientes.filter(u => u.grupo === k).length}
                    activo={grupoVisible} onElegir={setGrupoVisible} />
                  <div className="flex flex-col gap-4 mt-2">
                    {GRUPOS_VOLVER.filter(g => g.key === grupoVisible).map(g => {
                      const lista = pendientes.filter(u => u.grupo === g.key);
                      if (!lista.length) return null;
                      return (
                        <div key={g.key}>
                          <div className={`jb-display text-xs ${g.color}`}>{g.emoji} {g.label} · {lista.length}</div>
                          <div className="jb-body text-[11px] text-zinc-500 mb-2">{g.detalle}. {g.necesita}</div>
                          <div className="flex flex-col gap-2">{lista.map(fila)}</div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              {yaInvitados.length > 0 && (
                <div className="mt-4">
                  <button type="button" onClick={() => setVerInvitados(v => !v)} aria-expanded={verInvitados}
                    className={`w-full text-left bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 flex items-center justify-between gap-3 transition-all ${verInvitados ? 'ring-2 ring-orange-500' : 'hover:bg-zinc-900'}`}>
                    <div>
                      <div className="jb-display text-sm text-zinc-200">✓ YA INVITADOS · {yaInvitados.length}</div>
                      <div className="jb-body text-[11px] text-zinc-500">Les escribiste en los últimos {DIAS_ENTRE_INVITACIONES} días.</div>
                    </div>
                    <span className={`jb-body text-[11px] shrink-0 ${verInvitados ? 'text-orange-400' : 'text-zinc-500'}`}>{verInvitados ? '▲ Ocultar' : '▼ Ver'}</span>
                  </button>
                  {verInvitados && <div className="flex flex-col gap-2 mt-2">{yaInvitados.map(fila)}</div>}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function CumpleanosPanel({ users }) {
  const [open, setOpen] = useState(false);
  const [clientesTienda, setClientesTienda] = useState([]);

  useEffect(() => {
    if (!open) return;
    supabase.from('tienda_clientes').select('telefono, nombre, fecha_nacimiento')
      .not('fecha_nacimiento', 'is', null)
      .then(({ data }) => setClientesTienda(data || []))
      .catch(() => {});
  }, [open]);

  const cumpleaneros = useMemo(() => {
    const hoy = new Date();
    const mes = hoy.getMonth() + 1, dia = hoy.getDate();
    const deAlumnos = (users || [])
      .filter(u => {
        if (!u.fechaNacimiento) return false;
        const [, m, d] = u.fechaNacimiento.split('-').map(Number);
        return m === mes && d === dia;
      })
      .map(u => ({ nombre: u.nombre, username: u.username, telefono: u.telefono, origen: 'Alumno' }));

    const deTienda = (clientesTienda || [])
      .filter(c => {
        const [, m, d] = c.fecha_nacimiento.split('-').map(Number);
        return m === mes && d === dia;
      })
      .map(c => ({ nombre: c.nombre, username: c.telefono, telefono: c.telefono, origen: 'Cliente tienda' }));

    return [...deAlumnos, ...deTienda];
  }, [users, clientesTienda]);

  const conFechaGuardada = useMemo(
    () => (users || []).filter(u => !!u.fechaNacimiento).length + clientesTienda.length,
    [users, clientesTienda]
  );
  const totalPersonas = (users || []).length + clientesTienda.length;

  function waLinkCumple(u) {
    const num = (u.telefono || '').replace(/\D/g, '');
    const full = num ? (num.length <= 9 ? '51' + num : num) : '';
    const texto = `¡Feliz cumpleaños, ${u.nombre || u.username}! 🎉 Todo el equipo de Jonah Beast te desea un año lleno de fuerza y buenos resultados. 💪`;
    return full ? `https://wa.me/${full}?text=${encodeURIComponent(texto)}`
                : `https://wa.me/?text=${encodeURIComponent(texto)}`;
  }

  return (
    <div className="bg-zinc-900 border border-pink-700/50 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full px-5 py-4 flex items-center justify-between text-left">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-sm shrink-0">🎂</div>
          <h2 className="jb-display text-base text-zinc-200">
            CUMPLEAÑOS DE HOY
            {cumpleaneros.length > 0 && (
              <span className="ml-2 bg-pink-500 text-zinc-950 text-xs px-2 py-0.5 rounded-full">{cumpleaneros.length}</span>
            )}
          </h2>
        </div>
        <ChevronRight size={18} className={`text-zinc-500 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-zinc-800 pt-4">
          {cumpleaneros.length === 0 ? (
            <p className="jb-body text-sm text-zinc-500">
              Nadie cumple años hoy. {conFechaGuardada} de {totalPersonas} personas (alumnos + clientes de la tienda) tienen su fecha de nacimiento guardada.
            </p>
          ) : (
          <div className="flex flex-col gap-2">
            {cumpleaneros.map(u => (
              <div key={u.username} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-zinc-100 text-sm font-medium jb-body">
                    {u.nombre ? `${u.nombre} · ${u.username}` : u.username}
                  </div>
                  <div className="text-zinc-500 text-[11px]">{u.origen}</div>
                </div>
                <a href={waLinkCumple(u)} target="_blank" rel="noopener noreferrer"
                  className={btnPrimary + ' py-1.5 px-3 text-xs'}>
                  <MessageCircle size={13} /> Felicitar
                </a>
              </div>
            ))}
          </div>
          )}
        </div>
      )}
    </div>
  );
}

function PagosPanel({ onAprobado }) {
  const [pagos, setPagos] = useState([]);
  const [urls, setUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);
  const [procesando, setProcesando] = useState(null);
  const [verGrande, setVerGrande] = useState(null);
  const [filtro, setFiltro] = useState('pendiente');

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    try {
      const { data } = await supabase.from('pagos').select('*')
        .order('creado_en', { ascending: false }).limit(100);
      const lista = data || [];
      setPagos(lista);
      const rutas = lista.filter(p => p.comprobante_ruta).map(p => p.comprobante_ruta);
      if (rutas.length) {
        const { data: signed } = await supabase.storage.from('comprobantes').createSignedUrls(rutas, 3600);
        const m = {};
        (signed || []).forEach(s => { if (s.signedUrl) m[s.path] = s.signedUrl; });
        setUrls(m);
      }
    } catch { setPagos([]); }
    setLoading(false);
  }

  async function aprobar(pago) {
    setProcesando(pago.id);
    try {
      const { data: al } = await supabase.from('alumnos').select('fecha_vencimiento, plan')
        .eq('username', pago.username).maybeSingle();
      const base = al?.fecha_vencimiento && daysLeft(al.fecha_vencimiento) > 0
        ? al.fecha_vencimiento : todayISO();
      // Bono por suscribirse a tiempo: si es su primer plan y lo envió antes
      // de que terminara su prueba (o hasta 48 h después), +7 días. Cuenta
      // cuándo lo ENVIÓ el alumno, no cuándo se aprueba.
      let bono = false;
      if (!/add-on/i.test(pago.metodo || '')) {
        const { data: previos } = await supabase.from('pagos').select('id')
          .eq('username', pago.username).eq('estado', 'aprobado').neq('id', pago.id)
          .or('metodo.is.null,metodo.not.ilike.*add-on*').limit(1);
        bono = ganaBonoSuscripcion({ plan: al?.plan, fechaVencimiento: al?.fecha_vencimiento }, (previos || []).length === 0, pago.creado_en);
      }
      const nuevo = addDaysISO(addMonthsISO(base, pago.plan_meses), bono ? BONO_DIAS : 0);
      const cambios = { fecha_vencimiento: nuevo, enabled: true, plan: 'pago' };

      // Si vino por referido y aún no tiene comisión asignada, calcularla
      // según el plan que compró (solo la primera vez)
      try {
        const { data: al } = await supabase.from('alumnos')
          .select('codigo_referido, comision_monto').eq('username', pago.username).maybeSingle();
        if (al && al.codigo_referido && (al.comision_monto === null || al.comision_monto === undefined)) {
          const { data: ref } = await supabase.from('referidores')
            .select('tipo, comision_pct, descuento_pct, comision_1, comision_3, comision_6, comision_12')
            .ilike('codigo', al.codigo_referido).maybeSingle();
          if (ref) {
            let monto = null;
            if (Number(ref.comision_pct) > 0) {
              // Porcentaje sobre el precio de lista, no sobre el ya descontado
              const dctoRef = Number(ref.descuento_pct) || 0;
              const listaAprox = dctoRef > 0
                ? Number(pago.monto) / (1 - dctoRef / 100)
                : Number(pago.monto);
              monto = listaAprox * (Number(ref.comision_pct) / 100);
            } else {
              const tabla = { 1: ref.comision_1, 3: ref.comision_3, 6: ref.comision_6, 12: ref.comision_12 };
              monto = tabla[pago.plan_meses];
            }
            if (monto !== undefined && monto !== null) {
              cambios.comision_monto = Math.round(Number(monto) * 100) / 100;
              cambios.plan_meses_referido = pago.plan_meses;
            }
          }
        }
      } catch {}

      await supabase.from('alumnos').update(cambios).eq('username', pago.username);
      await supabase.from('pagos')
        .update({ estado: 'aprobado', revisado_en: new Date().toISOString(),
          ...(bono ? { nota_admin: [pago.nota_admin, `Incluye +${BONO_DIAS} días de regalo por suscribirse a tiempo.`].filter(Boolean).join(' · ') } : {}) })
        .eq('id', pago.id);
      if (bono) showToast(`Aprobado con +${BONO_DIAS} días de regalo (se suscribió a tiempo).`);
      // Aviso al celular del alumno: "tu pago fue aprobado". Si falla, la
      // aprobación igual queda hecha.
      try {
        const { data: { session } } = await supabase.auth.getSession();
        fetch('/api/pago-aprobado', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
          body: JSON.stringify({ pagoId: pago.id }),
        }).catch(() => {});
      } catch {}
      await cargar();
      if (onAprobado) onAprobado();
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
    setProcesando(null);
  }

  async function rechazar(pago) {
    const nota = window.prompt('Motivo del rechazo (lo verá el alumno):', 'No pudimos verificar el pago');
    if (nota === null) return;
    setProcesando(pago.id);
    try {
      await supabase.from('pagos')
        .update({ estado: 'rechazado', nota_admin: nota, revisado_en: new Date().toISOString() })
        .eq('id', pago.id);
      await cargar();
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
    setProcesando(null);
  }

  // Para pagos que llegan por WhatsApp (típico de alumnos de Play
  // Store, donde no se les muestra el formulario de pago dentro de la
  // app). Se guarda igual que un pago normal — entra a la misma lista
  // de "por revisar" y usa el mismo botón de aprobar de siempre, así
  // que la comisión del embajador (si aplica) se calcula exactamente
  // igual, sin importar por qué canal llegó el pago.
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ username: '', meses: 1, monto: '', metodo: 'Yape', operacion: '' });
  const [manualGuardando, setManualGuardando] = useState(false);
  const [manualErr, setManualErr] = useState('');

  async function registrarManual(e) {
    e.preventDefault();
    setManualErr('');
    const u = manualForm.username.trim().toLowerCase();
    if (!u) return setManualErr('Escribe el usuario del alumno.');
    if (!manualForm.monto || Number(manualForm.monto) <= 0) return setManualErr('Escribe el monto.');
    if (!manualForm.operacion.trim()) return setManualErr('Escribe el número de operación.');
    setManualGuardando(true);
    try {
      const { data: existe } = await supabase.from('alumnos').select('username').eq('username', u).maybeSingle();
      if (!existe) { setManualErr('No existe ningún alumno con ese usuario.'); setManualGuardando(false); return; }
      const { error } = await supabase.from('pagos').insert({
        username: u, nombre: '', plan_meses: Number(manualForm.meses),
        monto: Number(manualForm.monto), metodo: manualForm.metodo,
        operacion: manualForm.operacion.trim(), comprobante_ruta: null,
        estado: 'pendiente', nota_admin: 'Registrado manualmente (pago coordinado por WhatsApp)',
      });
      if (error) throw error;
      setManualForm({ username: '', meses: 1, monto: '', metodo: 'Yape', operacion: '' });
      setManualOpen(false);
      await cargar();
    } catch (e2) { setManualErr('No se pudo guardar: ' + (e2.message || '')); }
    setManualGuardando(false);
  }

  const pendientes = pagos.filter(p => p.estado === 'pendiente');
  // Pagos que esperan más de 12 horas: el alumno está sin acceso esperando.
  const horasEsperando = p => (Date.now() - new Date(p.creado_en).getTime()) / 3600000;
  const atrasados = pendientes.filter(p => horasEsperando(p) >= 12);
  const visibles = filtro === 'todos' ? pagos : pagos.filter(p => p.estado === filtro);

  return (
    <div className={`rounded-2xl overflow-hidden border ${pendientes.length ? 'bg-zinc-900 border-orange-500/50' : 'bg-zinc-900 border-zinc-800'}`}>
      <button onClick={() => setOpen(v => !v)} className="w-full px-5 py-4 flex items-center justify-between text-left">
        <h2 className="jb-display text-base text-zinc-200">
          💰 PAGOS {pendientes.length > 0 && (
            <span className="ml-2 bg-orange-500 text-zinc-950 text-xs px-2 py-0.5 rounded-full">{pendientes.length} por revisar</span>
          )}
          {atrasados.length > 0 && (
            <span className="ml-1.5 bg-red-500 text-zinc-50 text-xs px-2 py-0.5 rounded-full">⏰ {atrasados.length} +12 h</span>
          )}
        </h2>
        <ChevronRight size={18} className={`text-zinc-500 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-zinc-800 pt-4">
          {atrasados.length > 0 && (
            <div className="bg-red-950/40 border border-red-700/60 rounded-lg px-3 py-2.5 mb-3 jb-body text-xs text-zinc-200">
              <span className="font-semibold text-red-300">⏰ {atrasados.length === 1 ? '1 pago espera' : `${atrasados.length} pagos esperan`} más de 12 horas.</span>{' '}
              {atrasados.length === 1 ? 'Ese alumno está' : 'Esos alumnos están'} sin acceso hasta que apruebes. Los +7 días del bono se respetan igual: cuenta cuándo se envió el comprobante.
            </div>
          )}

          <div className="flex gap-2 mb-3 flex-wrap">
            {[['pendiente', 'Por revisar'], ['aprobado', 'Aprobados'], ['rechazado', 'Rechazados'], ['todos', 'Todos']].map(([v, l]) => (
              <button key={v} onClick={() => setFiltro(v)}
                className={`jb-body text-xs px-3 py-1.5 rounded-lg ${filtro === v ? 'bg-orange-500 text-zinc-950 font-semibold' : 'bg-zinc-950 text-zinc-400 border border-zinc-800'}`}>
                {l}
              </button>
            ))}
            <button onClick={cargar} className={btnGhost + ' py-1 px-3 text-xs'}>Actualizar</button>
            <button onClick={() => setManualOpen(v => !v)} className={btnGhost + ' py-1 px-3 text-xs ml-auto'}>
              {manualOpen ? 'Cancelar' : '+ Registrar pago manual (WhatsApp)'}
            </button>
          </div>

          {manualOpen && (
            <form onSubmit={registrarManual} className="bg-zinc-950 border border-orange-500/30 rounded-xl p-4 mb-4 flex flex-col gap-2.5">
              <p className="jb-body text-xs text-zinc-500 mb-1">
                Para pagos coordinados por WhatsApp (ej. alumnos de Play Store) — queda igual de registrado que un pago normal, con la misma comisión de embajador si aplica.
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Usuario del alumno">
                  <input value={manualForm.username} onChange={e => setManualForm(v => ({ ...v, username: e.target.value }))}
                    className={inputCls} placeholder="usuario123" />
                </Field>
                <Field label="Plan (meses)">
                  <select value={manualForm.meses} onChange={e => setManualForm(v => ({ ...v, meses: e.target.value }))} className={inputCls}>
                    {[1, 3, 6, 12].map(m => <option key={m} value={m}>{m} mes(es)</option>)}
                  </select>
                </Field>
                <Field label="Monto pagado (S/)">
                  <input type="number" step="0.10" value={manualForm.monto}
                    onChange={e => setManualForm(v => ({ ...v, monto: e.target.value }))} className={inputCls} placeholder="24.90" />
                </Field>
                <Field label="Método">
                  <select value={manualForm.metodo} onChange={e => setManualForm(v => ({ ...v, metodo: e.target.value }))} className={inputCls}>
                    <option>Yape</option><option>Plin</option><option>Transferencia</option>
                  </select>
                </Field>
                <Field label="N° de operación">
                  <input value={manualForm.operacion} onChange={e => setManualForm(v => ({ ...v, operacion: e.target.value }))}
                    className={inputCls} placeholder="00123456" />
                </Field>
              </div>
              {manualErr && <p className="text-red-400 text-sm jb-body flex items-center gap-1.5"><AlertTriangle size={14} />{manualErr}</p>}
              <button type="submit" disabled={manualGuardando} className={btnPrimary + ' self-start py-2 px-4 text-sm mt-1'}>
                {manualGuardando ? <Loader2 className="animate-spin" size={16} /> : 'Guardar y mandar a revisión'}
              </button>
            </form>
          )}

          {loading ? (
            <Loader2 className="animate-spin text-orange-500" size={20} />
          ) : visibles.length === 0 ? (
            <p className="text-zinc-500 text-sm py-4 text-center">
              {filtro === 'pendiente' ? 'No hay pagos por revisar.' : 'Sin registros.'}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {visibles.map(p => (
                <div key={p.id} className={`relative bg-zinc-950 border rounded-xl p-4 pl-5 overflow-hidden ${p.estado === 'pendiente' ? 'border-amber-700/50' : p.estado === 'aprobado' ? 'border-emerald-800/50' : 'border-zinc-800'}`}>
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${p.estado === 'pendiente' ? 'bg-amber-500' : p.estado === 'aprobado' ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                    <div>
                      <div className="text-zinc-100 font-medium jb-body">
                        {p.nombre ? `${p.nombre} · ${p.username}` : p.username}
                      </div>
                      <div className="text-zinc-500 text-xs jb-body mt-0.5">
                        {p.metodo} · Op. {p.operacion} · {new Date(p.creado_en).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      {p.estado === 'pendiente' && (
                        <div className={`text-xs jb-body mt-0.5 ${horasEsperando(p) >= 12 ? 'text-red-400 font-semibold' : 'text-amber-400'}`}>
                          ⏰ Esperando hace {textoHoras(horasEsperando(p))}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="jb-display text-xl text-orange-500">{fmtS(p.monto)}</div>
                      <div className="text-zinc-500 text-xs jb-body">{p.plan_meses} mes(es)</div>
                    </div>
                  </div>

                  {p.comprobante_ruta && urls[p.comprobante_ruta] && (
                    p.comprobante_ruta.endsWith('.pdf') ? (
                      <a href={urls[p.comprobante_ruta]} target="_blank" rel="noopener noreferrer"
                        className={btnGhost + ' w-full py-2 text-sm mb-3'}>Ver comprobante (PDF)</a>
                    ) : (
                      <img src={urls[p.comprobante_ruta]} alt="Comprobante"
                        onClick={() => setVerGrande(urls[p.comprobante_ruta])}
                        className="w-full max-h-56 object-contain rounded-lg bg-zinc-900 cursor-pointer mb-3" />
                    )
                  )}

                  {p.estado === 'pendiente' && p.nota_admin && (
                    <div className="jb-body text-xs text-amber-400 bg-amber-950/40 border border-amber-800/50 rounded-lg px-3 py-2 mb-3">
                      {p.nota_admin}
                    </div>
                  )}

                  {p.estado === 'pendiente' ? (
                    <div className="flex gap-2">
                      <button onClick={() => aprobar(p)} disabled={procesando === p.id}
                        className={btnPrimary + ' flex-1 py-2 text-sm'}>
                        {procesando === p.id ? <Loader2 className="animate-spin" size={16} /> : '✓ Aprobar y activar'}
                      </button>
                      <button onClick={() => rechazar(p)} disabled={procesando === p.id}
                        className={btnDanger + ' py-2 px-4'}>Rechazar</button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className={`jb-body text-xs px-2.5 py-1 rounded-full ${p.estado === 'aprobado'
                        ? 'bg-emerald-950/60 text-emerald-400' : p.estado === 'prueba' ? 'bg-zinc-800 text-zinc-300' : 'bg-red-950/60 text-red-400'}`}>
                        {p.estado === 'aprobado' ? '✓ Aprobado' : p.estado === 'prueba' ? '🧪 Prueba' : '✕ Rechazado'}
                        {p.revisado_en && ` · ${new Date(p.revisado_en).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}`}
                      </span>
                      {p.nota_admin && <span className="jb-body text-xs text-zinc-500">{p.nota_admin}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {verGrande && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50" onClick={() => setVerGrande(null)}>
          <img src={verGrande} alt="" className="max-w-full max-h-full object-contain rounded-xl" />
          <button className="absolute top-4 right-4 bg-zinc-900/80 hover:bg-zinc-800 text-white rounded-full p-2.5 transition-colors">
            <X size={22} />
          </button>
        </div>
      )}
    </div>
  );
}

function TiendaAdminPanel() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('inventario');
  const [productos, setProductos] = useState([]);
  const [variantesPorProducto, setVariantesPorProducto] = useState({});
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [nuevoProd, setNuevoProd] = useState({ nombre: '', categoria: 'hombre', marca: '', precio: '', precioOferta: '', imagenUrl: '' });
  const [nuevaVariante, setNuevaVariante] = useState({});
  const [fotoEditando, setFotoEditando] = useState({});
  const [subiendoFoto, setSubiendoFoto] = useState({});

  // campo: 'imagen_url' (foto del producto solo) o 'imagen_modelo_url'
  // (foto de una persona usando la prenda)
  async function subirFoto(productoId, archivo, campo = 'imagen_url') {
    if (!archivo) return;
    const clave = productoId + ':' + campo;
    setSubiendoFoto(prev => ({ ...prev, [clave]: true }));
    try {
      const extension = archivo.name.split('.').pop();
      const nombreArchivo = `${productoId}-${campo === 'imagen_modelo_url' ? 'modelo-' : ''}${Date.now()}.${extension}`;
      const { error: errSubida } = await supabase.storage.from('productos').upload(nombreArchivo, archivo, { upsert: true });
      if (errSubida) throw errSubida;
      const { data } = supabase.storage.from('productos').getPublicUrl(nombreArchivo);
      await actualizarImagen(productoId, data.publicUrl, campo);
      if (campo === 'imagen_url') setFotoEditando(prev => ({ ...prev, [productoId]: data.publicUrl }));
    } catch (e) {
      alert('No se pudo subir la foto: ' + (e.message || 'error desconocido'));
    }
    setSubiendoFoto(prev => ({ ...prev, [clave]: false }));
  }
  const [varianteEditando, setVarianteEditando] = useState({});
  const [guardando, setGuardando] = useState(false);

  const [ventaFisica, setVentaFisica] = useState({ varianteId: '', monto: '', cliente: '', motivo: '', nota: '' });
  const [registrandoVenta, setRegistrandoVenta] = useState(false);
  const [items, setItems] = useState([]);
  const [clientesTienda, setClientesTienda] = useState([]);

  useEffect(() => { if (open) cargar(); }, [open]);

  async function cargar() {
    setLoading(true);
    try {
      const { data: prods } = await supabase.from('tienda_productos').select('*').order('creado_en', { ascending: false });
      const { data: vars } = await supabase.from('tienda_variantes').select('*');
      const { data: peds } = await supabase.from('tienda_pedidos').select('*').order('creado_en', { ascending: false }).limit(200);
      const { data: its } = await supabase.from('tienda_pedido_items').select('*');
      const { data: clientes } = await supabase.from('tienda_clientes').select('telefono, total_compras');
      setProductos(prods || []);
      const porProd = {};
      (vars || []).forEach(v => { porProd[v.producto_id] = porProd[v.producto_id] || []; porProd[v.producto_id].push(v); });
      setVariantesPorProducto(porProd);
      setPedidos(peds || []);
      setItems(its || []);
      setClientesTienda(clientes || []);
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
    setLoading(false);
  }

  async function agregarProducto() {
    if (!nuevoProd.nombre.trim() || !nuevoProd.precio) return;
    setGuardando(true);
    try {
      await supabase.from('tienda_productos').insert({
        nombre: nuevoProd.nombre.trim(), categoria: nuevoProd.categoria,
        marca: nuevoProd.categoria === 'suplementos' ? (nuevoProd.marca || null) : null,
        precio: parseFloat(nuevoProd.precio), precio_oferta: nuevoProd.precioOferta ? parseFloat(nuevoProd.precioOferta) : null,
        imagen_url: nuevoProd.imagenUrl.trim() || null,
      });
      setNuevoProd({ nombre: '', categoria: 'hombre', marca: '', precio: '', precioOferta: '', imagenUrl: '' });
      cargar();
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
    setGuardando(false);
  }

  async function actualizarImagen(productoId, url, campo = 'imagen_url') {
    try {
      await supabase.from('tienda_productos').update({ [campo]: (url || '').trim() || null }).eq('id', productoId);
      cargar();
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
  }

  const [errorVariante, setErrorVariante] = useState({});
  const [busquedaInventario, setBusquedaInventario] = useState('');
  const [productoEditando, setProductoEditando] = useState(null);
  const [edicionProd, setEdicionProd] = useState({});
  const [eliminandoProd, setEliminandoProd] = useState(null);

  async function agregarVariante(productoId) {
    const v = nuevaVariante[productoId];
    setErrorVariante(prev => ({ ...prev, [productoId]: '' }));
    if (!v?.nombre?.trim()) {
      setErrorVariante(prev => ({ ...prev, [productoId]: 'Escribe un nombre para la variante (ej. "Único" o "300g").' }));
      return;
    }
    try {
      const { error } = await supabase.from('tienda_variantes').insert({ producto_id: productoId, nombre: v.nombre.trim(), stock: parseInt(v.stock || '0', 10) });
      if (error) throw error;
      setNuevaVariante(prev => ({ ...prev, [productoId]: { nombre: '', stock: '' } }));
      cargar();
    } catch (e) {
      setErrorVariante(prev => ({ ...prev, [productoId]: 'No se pudo guardar: ' + (e.message || 'error desconocido') }));
    }
  }

  async function actualizarStock(varianteId, nuevoStock) {
    try {
      await supabase.from('tienda_variantes').update({ stock: Math.max(0, parseInt(nuevoStock, 10) || 0) }).eq('id', varianteId);
      cargar();
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
  }

  async function actualizarCosto(varianteId, nuevoCosto) {
    try {
      const costo = nuevoCosto === '' ? null : parseFloat(nuevoCosto);
      await supabase.from('tienda_variantes').update({ precio_costo: costo }).eq('id', varianteId);
      cargar();
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
  }

  async function toggleActivo(producto) {
    try { await supabase.from('tienda_productos').update({ activo: !producto.activo }).eq('id', producto.id); cargar(); } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
  }

  function abrirEdicion(p) {
    setProductoEditando(p.id);
    setEdicionProd({
      nombre: p.nombre, categoria: p.categoria, marca: p.marca || '',
      precio: String(p.precio), precioOferta: p.precio_oferta != null ? String(p.precio_oferta) : '',
    });
  }

  async function guardarEdicionProducto(productoId) {
    try {
      await supabase.from('tienda_productos').update({
        nombre: edicionProd.nombre.trim(), categoria: edicionProd.categoria,
        marca: edicionProd.categoria === 'suplementos' ? (edicionProd.marca || null) : null,
        precio: parseFloat(edicionProd.precio) || 0,
        precio_oferta: edicionProd.precioOferta ? parseFloat(edicionProd.precioOferta) : null,
      }).eq('id', productoId);
      setProductoEditando(null);
      cargar();
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
  }

  async function eliminarProducto(producto) {
    if (!window.confirm(`¿Eliminar "${producto.nombre}" por completo? Se borran también sus tallas/presentaciones y no se puede recuperar.`)) return;
    setEliminandoProd(producto.id);
    try {
      await supabase.from('tienda_variantes').delete().eq('producto_id', producto.id);
      await supabase.from('tienda_productos').delete().eq('id', producto.id);
      cargar();
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
    setEliminandoProd(null);
  }

  async function registrarVentaFisica() {
    if (!ventaFisica.varianteId || !ventaFisica.monto) return;
    setRegistrandoVenta(true);
    try {
      // Se crea "pendiente" y se aprueba después de agregar el producto: el
      // paso de la base que descuenta stock y registra en Finanzas corre al
      // pasar a "aprobado". Si se creara ya aprobado, correría sin productos
      // y el stock nunca se descontaba.
      const { data: pedidoCreado } = await supabase.from('tienda_pedidos').insert({
        origen: 'fisica', nombre_cliente: ventaFisica.cliente || 'Cliente en persona',
        monto_total: parseFloat(ventaFisica.monto), metodo_pago: 'Efectivo', estado: 'pendiente',
        motivo_especial: ventaFisica.motivo || null, nota_motivo: ventaFisica.nota || null,
      }).select('id').single();
      if (pedidoCreado) {
        await supabase.from('tienda_pedido_items').insert({
          pedido_id: pedidoCreado.id, variante_id: ventaFisica.varianteId, cantidad: 1, precio_unitario: parseFloat(ventaFisica.monto),
        });
        // Disparamos el mismo procesamiento (descuento de stock + Finanzas) actualizando el estado
        await supabase.from('tienda_pedidos').update({ estado: 'aprobado' }).eq('id', pedidoCreado.id);
      }
      setVentaFisica({ varianteId: '', monto: '', cliente: '', motivo: '', nota: '' });
      cargar();
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
    setRegistrandoVenta(false);
  }

  const todasLasVariantes = productos.flatMap(p => (variantesPorProducto[p.id] || []).map(v => ({ ...v, productoNombre: p.nombre })));

  const carritosAbandonados = useMemo(() => {
    const dosHorasAtras = Date.now() - 2 * 60 * 60 * 1000;
    return pedidos.filter(p => p.estado === 'pendiente' && new Date(p.creado_en).getTime() < dosHorasAtras);
  }, [pedidos]);

  function waLinkCarritoAbandonado(p) {
    const num = (p.telefono_cliente || '').replace(/\D/g, '');
    const full = num ? (num.length <= 9 ? '51' + num : num) : '';
    const texto = `Hola ${p.nombre_cliente || ''}, vimos que dejaste algo en tu carrito de Jonah Beast Store (S/${Number(p.monto_total).toFixed(2)}). ¿Te ayudamos a completar tu compra? 😊`;
    return full ? `https://wa.me/${full}?text=${encodeURIComponent(texto)}` : `https://wa.me/?text=${encodeURIComponent(texto)}`;
  }

  const metricas = useMemo(() => {
    const aprobados = pedidos.filter(p => p.estado === 'aprobado');
    const hoy = new Date();
    const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    const aprobadosMes = aprobados.filter(p => (p.creado_en || '').startsWith(mesActual));

    const ventasMes = aprobadosMes.reduce((a, p) => a + Number(p.monto_total || 0), 0);
    const ticketPromedio = aprobadosMes.length ? ventasMes / aprobadosMes.length : 0;
    const ventasWeb = aprobadosMes.filter(p => p.origen === 'web').reduce((a, p) => a + Number(p.monto_total || 0), 0);
    const ventasFisica = aprobadosMes.filter(p => p.origen === 'fisica').reduce((a, p) => a + Number(p.monto_total || 0), 0);

    // Mapa rápido: variante -> producto (categoría, marca, nombre)
    const varianteAProducto = {};
    productos.forEach(p => {
      (variantesPorProducto[p.id] || []).forEach(v => {
        varianteAProducto[v.id] = p;
      });
    });

    const idsAprobadosMes = new Set(aprobadosMes.map(p => p.id));
    const itemsDelMes = items.filter(it => idsAprobadosMes.has(it.pedido_id));

    const porProducto = {};
    const porCategoria = {};
    const porMarca = {};
    itemsDelMes.forEach(it => {
      const prod = varianteAProducto[it.variante_id];
      if (!prod) return;
      const ingreso = Number(it.precio_unitario) * it.cantidad;
      porProducto[prod.nombre] = (porProducto[prod.nombre] || 0) + it.cantidad;
      porCategoria[prod.categoria] = (porCategoria[prod.categoria] || 0) + ingreso;
      if (prod.marca) porMarca[prod.marca] = (porMarca[prod.marca] || 0) + ingreso;
    });
    const topProductos = Object.entries(porProducto).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const totalIntentos = pedidos.length;
    const conversion = totalIntentos ? (aprobados.length / totalIntentos) * 100 : 0;

    const clientesRecurrentes = clientesTienda.filter(c => (c.total_compras || 1) > 1).length;

    return {
      ventasMes, ticketPromedio, ventasWeb, ventasFisica, aprobadosMesCount: aprobadosMes.length,
      porCategoria, porMarca, topProductos, conversion,
      totalClientes: clientesTienda.length, clientesRecurrentes,
    };
  }, [pedidos, items, productos, variantesPorProducto, clientesTienda]);

  return (
    <div className="bg-zinc-900 border border-teal-700/50 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full px-5 py-4 flex items-center justify-between text-left">
        <h2 className="jb-display text-base text-zinc-200">🛒 JONAH BEAST STORE</h2>
        <ChevronRight size={18} className={`text-zinc-500 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-zinc-800 pt-4">
          <a href="/tienda" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-teal-600 text-zinc-950 text-xs font-semibold py-2 rounded-lg mb-4">
            👀 Ver la tienda (se abre en pestaña nueva)
          </a>
          {loading ? <Loader2 className="animate-spin text-orange-500" size={20} /> : (
            <>
              <div className="flex gap-2 mb-4">
                {[['inventario', 'Inventario'], ['ventaFisica', 'Venta física'], ['pedidos', 'Pedidos'], ['abandonados', `Abandonados${carritosAbandonados.length ? ` (${carritosAbandonados.length})` : ''}`], ['metricas', 'Métricas']].map(([id, label]) => (
                  <button key={id} onClick={() => setTab(id)}
                    className={`text-xs px-3 py-1.5 rounded-lg ${tab === id ? 'bg-teal-600 text-zinc-950 font-semibold' : 'bg-zinc-950 text-zinc-400 border border-zinc-800'}`}>
                    {label}
                  </button>
                ))}
              </div>

              {tab === 'inventario' && (
                <div className="flex flex-col gap-4">
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex flex-col gap-2">
                    <h3 className="jb-display text-sm text-zinc-300">Agregar producto</h3>
                    <input placeholder="Nombre del producto" value={nuevoProd.nombre}
                      onChange={e => setNuevoProd(v => ({ ...v, nombre: e.target.value }))}
                      className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200" />
                    <div className="grid grid-cols-2 gap-2">
                      <select value={nuevoProd.categoria} onChange={e => setNuevoProd(v => ({ ...v, categoria: e.target.value }))}
                        className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200">
                        {CATEGORIAS_TIENDA.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                      {nuevoProd.categoria === 'suplementos' ? (
                        <select value={nuevoProd.marca} onChange={e => setNuevoProd(v => ({ ...v, marca: e.target.value }))}
                          className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200">
                          <option value="">Marca...</option>
                          <option value="Evogen">Evogen</option>
                          <option value="Insane Labs">Insane Labs</option>
                          <option value="Bluhealth Nutrition">Bluhealth Nutrition</option>
                        </select>
                      ) : <div />}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" step="0.01" placeholder="Precio S/" value={nuevoProd.precio}
                        onChange={e => setNuevoProd(v => ({ ...v, precio: e.target.value }))}
                        className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200" />
                      <input type="number" step="0.01" placeholder="Precio oferta (opcional)" value={nuevoProd.precioOferta}
                        onChange={e => setNuevoProd(v => ({ ...v, precioOferta: e.target.value }))}
                        className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200" />
                    </div>
                    <p className="text-zinc-600 text-[10px]">
                      No hace falta poner la foto aquí — créalo sin foto y luego usa el botón "📷 Subir foto" que aparece debajo del producto ya creado.
                    </p>
                    <button onClick={agregarProducto} disabled={guardando}
                      className="bg-teal-600 text-zinc-950 text-xs font-semibold rounded-lg py-2">
                      {guardando ? 'Guardando...' : 'Agregar producto'}
                    </button>
                  </div>

                  <input placeholder="🔍 Buscar producto por nombre..." value={busquedaInventario}
                    onChange={e => setBusquedaInventario(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200" />

                  <div className="flex flex-col gap-3">
                    {productos
                      .filter(p => p.nombre.toLowerCase().includes(busquedaInventario.toLowerCase()))
                      .map(p => (
                      <div key={p.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                        {productoEditando === p.id ? (
                          <div className="flex flex-col gap-2 mb-3 bg-zinc-900/60 rounded-lg p-2.5">
                            <input value={edicionProd.nombre} onChange={e => setEdicionProd(v => ({ ...v, nombre: e.target.value }))}
                              className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-200" placeholder="Nombre" />
                            <div className="grid grid-cols-2 gap-2">
                              <select value={edicionProd.categoria} onChange={e => setEdicionProd(v => ({ ...v, categoria: e.target.value }))}
                                className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-200">
                                {CATEGORIAS_TIENDA.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                              </select>
                              {edicionProd.categoria === 'suplementos' ? (
                                <select value={edicionProd.marca} onChange={e => setEdicionProd(v => ({ ...v, marca: e.target.value }))}
                                  className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-200">
                                  <option value="">Marca...</option>
                                  <option value="Evogen">Evogen</option>
                                  <option value="Insane Labz">Insane Labz</option>
                                  <option value="Bluhealth Nutrition">Bluhealth Nutrition</option>
                                  <option value="Dragon Pharma">Dragon Pharma</option>
                                </select>
                              ) : <div />}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <input type="number" step="0.01" value={edicionProd.precio}
                                onChange={e => setEdicionProd(v => ({ ...v, precio: e.target.value }))}
                                className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-200" placeholder="Precio" />
                              <input type="number" step="0.01" value={edicionProd.precioOferta}
                                onChange={e => setEdicionProd(v => ({ ...v, precioOferta: e.target.value }))}
                                className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-200" placeholder="Precio oferta" />
                            </div>
                            <div className="flex gap-1.5">
                              <button onClick={() => guardarEdicionProducto(p.id)} className="flex-1 bg-teal-600 text-zinc-950 text-xs font-semibold py-1.5 rounded">Guardar cambios</button>
                              <button onClick={() => setProductoEditando(null)} className="bg-zinc-800 text-zinc-300 text-xs px-3 rounded">Cancelar</button>
                            </div>
                          </div>
                        ) : (
                          <>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="text-zinc-100 text-sm font-medium">{p.nombre}</div>
                              <div className="text-zinc-500 text-[11px]">{p.categoria}{p.marca ? ` · ${p.marca}` : ''} · S/{(p.precio_oferta || p.precio).toFixed(2)}</div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button onClick={() => abrirEdicion(p)} className="text-[10px] px-2 py-1 rounded-full bg-zinc-800 text-zinc-400">Editar</button>
                              <button onClick={() => eliminarProducto(p)} disabled={eliminandoProd === p.id}
                                className="text-[10px] px-2 py-1 rounded-full bg-red-500/15 text-red-400">
                                {eliminandoProd === p.id ? '...' : <Trash2 size={12} />}
                              </button>
                            </div>
                          </div>
                          <button onClick={() => toggleActivo(p)}
                            className={`text-[10px] px-2 py-1 rounded-full mb-2.5 ${p.activo ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                            {p.activo ? '✓ Visible en la tienda (clic para ocultar)' : '✕ Oculto de la tienda (clic para mostrar)'}
                          </button>
                          </>
                        )}
                        <div className="flex flex-col gap-2">
                          {(variantesPorProducto[p.id] || []).map(v => {
                            const precioVenta = productoEditando === p.id
                              ? (parseFloat(edicionProd.precioOferta) || parseFloat(edicionProd.precio) || 0)
                              : (p.precio_oferta || p.precio);
                            const costo = v.precio_costo;
                            const margen = costo != null ? precioVenta - costo : null;
                            const margenPct = costo != null && costo > 0 ? (margen / precioVenta) * 100 : null;
                            const colorMargen = margen == null ? 'text-zinc-600'
                              : margen < 0 ? 'text-red-400'
                              : margenPct < 15 ? 'text-orange-400'
                              : 'text-emerald-400';
                            return (
                              <div key={v.id} className="bg-zinc-900/60 rounded-lg p-2">
                                <div className="flex items-center justify-between gap-2 text-xs text-zinc-300 mb-1.5">
                                  <span>{v.nombre}</span>
                                  <input type="number"
                                    value={varianteEditando[v.id]?.stock !== undefined ? varianteEditando[v.id].stock : v.stock}
                                    onChange={e => setVarianteEditando(prev => ({ ...prev, [v.id]: { ...prev[v.id], stock: e.target.value } }))}
                                    className="w-16 bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1 text-zinc-200 text-right" />
                                </div>
                                <div className="flex items-center gap-2 text-[11px]">
                                  <span className="text-zinc-500">Costo S/</span>
                                  <input type="number" step="0.01" placeholder="0.00"
                                    value={varianteEditando[v.id]?.costo !== undefined ? varianteEditando[v.id].costo : (v.precio_costo ?? '')}
                                    onChange={e => setVarianteEditando(prev => ({ ...prev, [v.id]: { ...prev[v.id], costo: e.target.value } }))}
                                    className="w-16 bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1 text-zinc-200 text-right" />
                                  <span className={`font-medium ${colorMargen}`}>
                                    {margen == null ? 'Sin costo' : `S/${margen.toFixed(2)} (${margenPct.toFixed(0)}%)`}
                                  </span>
                                  <button
                                    onClick={() => {
                                      const edit = varianteEditando[v.id] || {};
                                      if (edit.stock !== undefined) actualizarStock(v.id, edit.stock);
                                      if (edit.costo !== undefined) actualizarCosto(v.id, edit.costo);
                                    }}
                                    className="ml-auto bg-teal-700 text-white text-[10px] font-medium px-2 py-1 rounded shrink-0">
                                    Guardar
                                  </button>
                                </div>
                                {margen != null && margen < 0 && (
                                  <p className="text-red-400 text-[10px] mt-1 flex items-center gap-1">
                                    <AlertTriangle size={11} /> Estás vendiendo por debajo del costo — sube el precio de venta.
                                  </p>
                                )}
                                {margen != null && margen >= 0 && margenPct < 15 && (
                                  <p className="text-orange-400 text-[10px] mt-1 flex items-center gap-1">
                                    <AlertTriangle size={11} /> Margen muy ajustado, revisa el precio.
                                  </p>
                                )}
                              </div>
                            );
                          })}
                          <div className="bg-zinc-900/40 border border-dashed border-zinc-700 rounded-lg p-2 mt-1">
                            <p className="text-zinc-500 text-[10px] mb-1.5">
                              {(variantesPorProducto[p.id] || []).length === 0
                                ? '⚠️ Este producto no tiene ninguna presentación/talla todavía — sin esto, siempre sale "Agotado".'
                                : 'Agregar otra presentación/talla:'}
                            </p>
                            <div className="flex gap-1.5">
                              <input placeholder="Nombre (ej. Único, M, Chocolate 1kg)"
                                value={nuevaVariante[p.id]?.nombre || ''}
                                onChange={e => setNuevaVariante(prev => ({ ...prev, [p.id]: { ...prev[p.id], nombre: e.target.value } }))}
                                className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200" />
                              <input type="number" placeholder="Stock" value={nuevaVariante[p.id]?.stock || ''}
                                onChange={e => setNuevaVariante(prev => ({ ...prev, [p.id]: { ...prev[p.id], stock: e.target.value } }))}
                                className="w-16 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200" />
                            </div>
                            <button onClick={() => agregarVariante(p.id)}
                              className="w-full mt-1.5 bg-teal-600 text-zinc-950 text-xs font-semibold py-1.5 rounded">
                              + Agregar esta presentación
                            </button>
                            {errorVariante[p.id] && (
                              <p className="text-red-400 text-[10px] mt-1.5 flex items-center gap-1">
                                <AlertTriangle size={11} /> {errorVariante[p.id]}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="grid grid-cols-2 gap-1.5">
                            <label className="block bg-orange-600 text-zinc-950 text-[11px] font-semibold text-center py-2 rounded cursor-pointer">
                              {subiendoFoto[p.id + ':imagen_url'] ? 'Subiendo...' : (p.imagen_url ? '✓ Foto producto' : '📷 Foto producto')}
                              <input type="file" accept="image/*" className="hidden" disabled={subiendoFoto[p.id + ':imagen_url']}
                                onChange={e => subirFoto(p.id, e.target.files[0], 'imagen_url')} />
                            </label>
                            <label className="block bg-teal-600 text-zinc-950 text-[11px] font-semibold text-center py-2 rounded cursor-pointer">
                              {subiendoFoto[p.id + ':imagen_modelo_url'] ? 'Subiendo...' : (p.imagen_modelo_url ? '✓ Foto con modelo' : '🧍 Foto con modelo')}
                              <input type="file" accept="image/*" className="hidden" disabled={subiendoFoto[p.id + ':imagen_modelo_url']}
                                onChange={e => subirFoto(p.id, e.target.files[0], 'imagen_modelo_url')} />
                            </label>
                          </div>
                          {p.imagen_modelo_url && (
                            <button onClick={() => actualizarImagen(p.id, '', 'imagen_modelo_url')}
                              className="text-zinc-600 text-[10px] mt-1 underline">Quitar foto con modelo</button>
                          )}
                          <details className="mt-1.5">
                            <summary className="text-zinc-600 text-[10px] cursor-pointer">O pegar un link de foto (avanzado)</summary>
                            <div className="flex gap-1.5 mt-1.5">
                              <input placeholder="Link de la foto"
                                value={fotoEditando[p.id] !== undefined ? fotoEditando[p.id] : (p.imagen_url || '')}
                                onChange={e => setFotoEditando(prev => ({ ...prev, [p.id]: e.target.value }))}
                                className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-300" />
                              <button
                                onClick={() => actualizarImagen(p.id, fotoEditando[p.id] !== undefined ? fotoEditando[p.id] : (p.imagen_url || ''))}
                                className="bg-teal-700 text-white text-[11px] font-medium px-3 rounded">
                                Guardar
                              </button>
                            </div>
                          </details>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'ventaFisica' && (
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex flex-col gap-2">
                  <h3 className="jb-display text-sm text-zinc-300">Registrar venta física</h3>
                  <select value={ventaFisica.varianteId} onChange={e => setVentaFisica(v => ({ ...v, varianteId: e.target.value }))}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200">
                    <option value="">Elige el producto/variante...</option>
                    {todasLasVariantes.map(v => (
                      <option key={v.id} value={v.id}>{v.productoNombre} — {v.nombre} (stock: {v.stock})</option>
                    ))}
                  </select>
                  <input type="number" step="0.01" placeholder="Monto cobrado (S/)" value={ventaFisica.monto}
                    onChange={e => setVentaFisica(v => ({ ...v, monto: e.target.value }))}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200" />
                  <input placeholder="Nombre del cliente (opcional)" value={ventaFisica.cliente}
                    onChange={e => setVentaFisica(v => ({ ...v, cliente: e.target.value }))}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200" />
                  <select value={ventaFisica.motivo} onChange={e => setVentaFisica(v => ({ ...v, motivo: e.target.value }))}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200">
                    <option value="">Motivo especial (opcional)</option>
                    <option value="embajador">Embajador / aliado</option>
                    <option value="entrenador">Entrenador</option>
                    <option value="cumpleanos">Cumpleaños 🎂</option>
                    <option value="cliente_frecuente">Cliente frecuente</option>
                    <option value="otro">Otro</option>
                  </select>
                  {ventaFisica.motivo && (
                    <input placeholder="Nota (ej. nombre del entrenador)" value={ventaFisica.nota}
                      onChange={e => setVentaFisica(v => ({ ...v, nota: e.target.value }))}
                      className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200" />
                  )}
                  <button onClick={registrarVentaFisica} disabled={registrandoVenta}
                    className="bg-teal-600 text-zinc-950 text-xs font-semibold rounded-lg py-2">
                    {registrandoVenta ? 'Registrando...' : 'Registrar venta'}
                  </button>
                  <p className="text-[11px] text-zinc-600">Descuenta el stock y se registra en Finanzas automáticamente.</p>
                </div>
              )}

              {tab === 'pedidos' && (
                <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
                  {pedidos.length === 0 ? <p className="text-zinc-500 text-xs">Sin pedidos todavía.</p> : pedidos.map(p => (
                    <div key={p.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-zinc-200">{p.nombre_cliente || p.username || 'Cliente'}</span>
                        <span className="text-orange-500 font-semibold">S/{Number(p.monto_total).toFixed(2)}</span>
                      </div>
                      <div className="text-zinc-600 mt-1">
                        {p.origen === 'web' ? 'Web' : 'Física'} · {p.metodo_pago} · {p.estado}
                        {p.motivo_especial && ` · ${p.motivo_especial}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'abandonados' && (
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] text-zinc-600 -mt-1">
                    Pedidos que empezaron el pago hace más de 2 horas y nunca lo completaron.
                  </p>
                  {carritosAbandonados.length === 0 ? (
                    <p className="text-zinc-500 text-xs">Sin carritos abandonados por ahora 🎉</p>
                  ) : carritosAbandonados.map(p => (
                    <div key={p.id} className="bg-zinc-950 border border-orange-700/40 rounded-lg p-3 flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <div className="text-zinc-200 text-xs font-medium">{p.nombre_cliente || 'Cliente'}</div>
                        <div className="text-zinc-500 text-[11px]">
                          S/{Number(p.monto_total).toFixed(2)} · hace {Math.floor((Date.now() - new Date(p.creado_en).getTime()) / 3600000)}h
                        </div>
                      </div>
                      <a href={waLinkCarritoAbandonado(p)} target="_blank" rel="noopener noreferrer"
                        className="bg-emerald-600 text-white text-xs font-semibold rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                        <MessageCircle size={13} /> Recordar
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'metricas' && (
                <div className="flex flex-col gap-4">
                  <p className="text-[11px] text-zinc-600 -mt-1">Solo ventas aprobadas del mes en curso.</p>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                      <div className="text-zinc-500 text-[10px]">VENTAS DEL MES</div>
                      <div className="text-emerald-400 text-lg font-bold">S/{metricas.ventasMes.toFixed(2)}</div>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                      <div className="text-zinc-500 text-[10px]">TICKET PROMEDIO</div>
                      <div className="text-orange-500 text-lg font-bold">S/{metricas.ticketPromedio.toFixed(2)}</div>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                      <div className="text-zinc-500 text-[10px]">PEDIDOS APROBADOS</div>
                      <div className="text-zinc-200 text-lg font-bold">{metricas.aprobadosMesCount}</div>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                      <div className="text-zinc-500 text-[10px]">TASA DE CONVERSIÓN</div>
                      <div className="text-teal-400 text-lg font-bold">{metricas.conversion.toFixed(0)}%</div>
                    </div>
                  </div>

                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                    <div className="text-zinc-400 text-[11px] mb-2">Web vs. física (este mes)</div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-300">🌐 Web: S/{metricas.ventasWeb.toFixed(2)}</span>
                      <span className="text-zinc-300">🏬 Física: S/{metricas.ventasFisica.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                    <div className="text-zinc-400 text-[11px] mb-2">Top 5 productos más vendidos (unidades)</div>
                    {metricas.topProductos.length === 0 ? (
                      <p className="text-zinc-600 text-xs">Sin ventas todavía este mes.</p>
                    ) : metricas.topProductos.map(([nombre, cant]) => (
                      <div key={nombre} className="flex justify-between text-xs text-zinc-300 py-0.5">
                        <span>{nombre}</span><span className="text-orange-500 font-medium">{cant}</span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                    <div className="text-zinc-400 text-[11px] mb-2">Ventas por categoría</div>
                    {Object.keys(metricas.porCategoria).length === 0 ? (
                      <p className="text-zinc-600 text-xs">Sin ventas todavía este mes.</p>
                    ) : Object.entries(metricas.porCategoria).map(([cat, monto]) => (
                      <div key={cat} className="flex justify-between text-xs text-zinc-300 py-0.5 capitalize">
                        <span>{cat}</span><span className="text-orange-500 font-medium">S/{monto.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {Object.keys(metricas.porMarca).length > 0 && (
                    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                      <div className="text-zinc-400 text-[11px] mb-2">Suplementos por marca</div>
                      {Object.entries(metricas.porMarca).map(([marca, monto]) => (
                        <div key={marca} className="flex justify-between text-xs text-zinc-300 py-0.5">
                          <span>{marca}</span><span className="text-teal-400 font-medium">S/{monto.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                    <div className="text-zinc-400 text-[11px] mb-2">Clientes</div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-300">Total: {metricas.totalClientes}</span>
                      <span className="text-zinc-300">Recurrentes: {metricas.clientesRecurrentes}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      )}
    </div>
  );
}

export {
  AdminDashboard,
  StudentDataModal,
};
