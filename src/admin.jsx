// Parte de la app que se descarga solo cuando hace falta (admin).
// Se generó separando src/App.jsx: el código es el mismo de antes.
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Plus, Trash2, LogOut, Eye, ShieldCheck, X, ChevronRight, Flame, Salad, UserPlus, AlertTriangle, Loader2, MessageCircle, Target, LayoutDashboard, TrendingUp, Camera, CreditCard, Mic, ShoppingCart, Phone } from 'lucide-react';
import { supabase, supabaseUrl, supabaseKey } from './supabaseClient';
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

const btnDanger = "bg-transparent border border-red-900 hover:bg-red-950 text-red-400 jb-body rounded-lg px-3 py-2 transition-colors flex items-center justify-center gap-2 text-sm";

function membershipLabel(u) {
  if (!u.enabled) return { text: 'Deshabilitado por ti', color: 'text-red-400', dot: 'bg-red-500' };
  const dl = daysLeft(u.fechaVencimiento);
  if (dl === null) return { text: 'Activo · sin vencimiento', color: 'text-emerald-400', dot: 'bg-emerald-500' };
  if (dl < 0) return { text: `Vencido hace ${Math.abs(dl)} día(s)`, color: 'text-red-400', dot: 'bg-red-500' };
  if (dl === 0) return { text: 'Vence hoy', color: 'text-amber-400', dot: 'bg-amber-500' };
  if (dl <= 7) return { text: `Vence en ${dl} día(s)`, color: 'text-amber-400', dot: 'bg-amber-500' };
  return { text: `Activo · ${dl} días restantes`, color: 'text-emerald-400', dot: 'bg-emerald-500' };
}

function formatActivity(lastActivity) {
  if (!lastActivity) return { text: 'Sin actividad', color: 'text-zinc-500', dot: 'bg-zinc-600' };
  const days = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
  if (days < 1) return { text: 'Hoy', color: 'text-emerald-400', dot: 'bg-emerald-500' };
  if (days === 1) return { text: 'Ayer', color: 'text-emerald-400', dot: 'bg-emerald-500' };
  if (days < 7) return { text: `Hace ${days} días`, color: 'text-amber-400', dot: 'bg-amber-500' };
  if (days < 30) return { text: `Hace ${days} días`, color: 'text-red-400', dot: 'bg-red-500' };
  return { text: `Hace ${Math.floor(days / 30)} mes(es)`, color: 'text-red-400', dot: 'bg-red-500' };
}

function ReferidosPanel({ users, onCambio }) {
  const [refs, setRefs] = useState([]);
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

  useEffect(() => { cargar(); cargarPrecio(); }, []);

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
      const { data } = await supabase.from('referidores').select('*').order('created_at', { ascending: false });
      setRefs(data || []);
    } catch { setRefs([]); }
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
  const huerfanos = (users || []).filter(u => u.codigoReferido && !codigosActivos.has(u.codigoReferido.toUpperCase()));
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
              Cada alumno puede invitar con su link. El amigo tiene 10% de descuento y, cuando paga su primer plan, quien invitó gana 15 días gratis (se aplican solos).
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

// Platos que la IA vio en fotos de los alumnos pero que no existen en la
// base de alimentos — para saber qué agregar primero.
function PlatosNoEncontradosPanel() {
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    try {
      const { data, error } = await supabase.from('platos_no_encontrados')
        .select('id, username, nombre, creado_en').order('creado_en', { ascending: false }).limit(500);
      if (error) throw error;
      setFilas(data || []);
    } catch { setFilas([]); }
    setCargando(false);
  }

  const grupos = useMemo(() => {
    const m = new Map();
    filas.forEach(f => {
      const clave = f.nombre.trim().toLowerCase();
      const g = m.get(clave) || { nombre: f.nombre.trim(), ids: [], alumnos: new Set(), ultima: f.creado_en };
      g.ids.push(f.id); g.alumnos.add(f.username);
      if (f.creado_en > g.ultima) g.ultima = f.creado_en;
      m.set(clave, g);
    });
    return [...m.values()].sort((a, b) => b.ids.length - a.ids.length || (b.ultima > a.ultima ? 1 : -1));
  }, [filas]);

  async function yaLoAgregue(g) {
    if (!confirm(`¿Quitar "${g.nombre}" de la lista? Hazlo cuando ya lo hayas agregado a la app.`)) return;
    const { error } = await supabase.from('platos_no_encontrados').delete().in('id', g.ids);
    if (error) { alert('No se pudo quitar: ' + error.message); return; }
    setFilas(fs => fs.filter(f => !g.ids.includes(f.id)));
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <button onClick={() => setAbierto(v => !v)} className="w-full px-5 py-4 flex items-center justify-between text-left">
        <h2 className="jb-display text-base text-zinc-200">🍲 PLATOS QUE BUSCAN Y NO TENEMOS · {grupos.length}</h2>
        <ChevronRight size={18} className={`text-zinc-500 transition-transform ${abierto ? 'rotate-90' : ''}`} />
      </button>
      {abierto && (
        <div className="px-5 pb-5 border-t border-zinc-800 pt-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <p className="jb-body text-xs text-zinc-500">Los detecta la IA en las fotos de tus alumnos. Los más pedidos van primero.</p>
            <button onClick={cargar} className={btnGhost + ' py-1 px-3 text-xs shrink-0'}>Actualizar</button>
          </div>
          {cargando ? (
            <Loader2 className="animate-spin text-orange-500" size={20} />
          ) : grupos.length === 0 ? (
            <p className="jb-body text-zinc-500 text-sm">Aún no hay platos pendientes. Aparecerán aquí cuando la IA vea algo que no está en la app.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
              {grupos.map(g => (
                <div key={g.nombre.toLowerCase()} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="jb-body text-sm text-zinc-100 font-medium truncate">{g.nombre}</p>
                    <p className="jb-body text-xs text-zinc-500">
                      <span className="text-orange-400 font-semibold">{g.ids.length} {g.ids.length === 1 ? 'vez' : 'veces'}</span>
                      {' · '}{g.alumnos.size} {g.alumnos.size === 1 ? 'alumno' : 'alumnos'}
                      {' · '}{new Date(g.ultima).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                  <button onClick={() => yaLoAgregue(g)} className={btnGhost + ' py-1 px-3 text-xs shrink-0'}>Ya lo agregué</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LeadsPanel() {
  const [leads, setLeads] = useState([]);
  const [code, setCode] = useState('');
  const [savedCode, setSavedCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(100);
      setLeads(data || []);
    } catch { setLeads([]); }
    try {
      const { data } = await supabase.from('config').select('value').eq('key', 'access_code').maybeSingle();
      const c = data ? data.value : '';
      setCode(c); setSavedCode(c);
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
    setLoading(false);
  }

  async function saveCode() {
    const c = code.trim().toUpperCase();
    if (!c) return;
    try { await supabase.from('config').upsert({ key: 'access_code', value: c }); } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
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
            <h3 className="jb-display text-sm text-zinc-300 mb-2">CÓDIGO DE ACCESO</h3>
            <p className="jb-body text-xs text-zinc-500 mb-3">Compártelo solo en tus lives o stories. Cámbialo cuando quieras.</p>
            <div className="flex gap-2 items-end flex-wrap">
              <input value={code} onChange={e => setCode(e.target.value)}
                className={inputCls + ' uppercase w-40'} placeholder="Ej. BEAST" />
              <button onClick={saveCode} disabled={code.trim().toUpperCase() === savedCode} className={btnPrimary + ' text-sm'}>
                {code.trim().toUpperCase() === savedCode ? 'Guardado' : 'Guardar código'}
              </button>
            </div>
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

// Gráfico de barras simple (una sola serie, así que no lleva leyenda: el
// título dice qué es). Barras naranja ají con la punta redondeada, 2px de
// separación y el valor al tocar o pasar el mouse. Se marcan solo el último
// valor y el más alto, para no llenar de números.
function BarrasSimples({ datos, formato = v => v, alto = 120, etiquetaCada = 1 }) {
  const [activo, setActivo] = useState(null);
  const max = Math.max(1, ...datos.map(d => d.valor));
  const iMax = datos.reduce((im, d, i) => (d.valor > datos[im].valor ? i : im), 0);
  const mostrado = activo !== null ? activo : datos.length - 1;
  return (
    <div>
      <div className="jb-body text-xs text-zinc-400 h-5 mb-1">
        {datos[mostrado] && <><span className="text-zinc-500">{datos[mostrado].etiquetaLarga || datos[mostrado].etiqueta}:</span> <span className="text-zinc-50 font-semibold">{formato(datos[mostrado].valor)}</span></>}
      </div>
      <div className="flex items-end gap-[2px] border-b border-zinc-700" style={{ height: alto }}
        onMouseLeave={() => setActivo(null)}>
        {datos.map((d, i) => (
          <button key={d.clave} type="button"
            aria-label={`${d.etiquetaLarga || d.etiqueta}: ${formato(d.valor)}`}
            onMouseEnter={() => setActivo(i)} onFocus={() => setActivo(i)} onClick={() => setActivo(i)}
            className="flex-1 h-full flex flex-col justify-end items-center group min-w-0">
            {(i === iMax || i === datos.length - 1) && d.valor > 0 && (
              <span className="jb-body text-[10px] text-zinc-300 mb-0.5 whitespace-nowrap">{formato(d.valor)}</span>
            )}
            <span className={`w-full rounded-t-[4px] transition-opacity ${activo === null || activo === i ? 'opacity-100' : 'opacity-50'}`}
              style={{ height: `${(d.valor / max) * 100}%`, minHeight: d.valor > 0 ? 2 : 0, background: '#E8590C', maxHeight: `calc(100% - 16px)` }} />
          </button>
        ))}
      </div>
      <div className="flex gap-[2px] mt-1">
        {datos.map((d, i) => (
          <span key={d.clave} className="flex-1 min-w-0 flex justify-center">
            <span className="jb-body text-[10px] text-zinc-500 whitespace-nowrap">
              {(i % etiquetaCada === 0 && datos.length - 1 - i >= Math.ceil(etiquetaCada / 2)) || i === datos.length - 1 ? d.etiqueta : ''}
            </span>
          </span>
        ))}
      </div>
    </div>
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
        supabase.from('historial').select('username, fecha').gt('comidas_count', 0).gte('fecha', desde).range(0, 9999),
        supabase.from('pagos').select('username, creado_en').eq('estado', 'aprobado').range(0, 4999),
        supabase.from('push_subs').select('username').eq('activa', true).range(0, 4999),
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

function ActivacionPanel({ users }) {
  const [rango, setRango] = useState(30); // días; 0 = desde siempre
  const [datos, setDatos] = useState(null);
  const todos = users || [];
  const nombres = todos.map(u => u.username).sort().join(',');

  useEffect(() => {
    if (!nombres) { setDatos({ cuerpo: {}, dias: {}, pagaron: new Set(), pasos: [] }); return; }
    let cancelado = false;
    (async () => {
      const lista = nombres.split(',');
      const [{ data: dat }, { data: hist }, { data: pagos }, { data: pasos }] = await Promise.all([
        supabase.from('datos_alumnos').select('username, form').in('username', lista),
        supabase.from('historial').select('username, fecha').in('username', lista).gt('comidas_count', 0).range(0, 19999),
        supabase.from('pagos').select('username, monto, creado_en').eq('estado', 'aprobado').gt('monto', 0).range(0, 4999),
        supabase.from('embudo_landing_eventos').select('evento, username, detalle, creado_en').in('evento', PASOS_PAGO).gte('creado_en', INICIO_CAMINO_PAGO).range(0, 19999),
      ]);
      if (cancelado) return;
      const cuerpo = {};
      (dat || []).forEach(d => { cuerpo[d.username] = tieneDatosBasicos(d.form || {}); });
      const dias = {};
      (hist || []).forEach(r => { (dias[r.username] = dias[r.username] || new Set()).add(r.fecha); });
      setDatos({ cuerpo, dias, pagaron: new Set((pagos || []).map(p => p.username)), pagosAprobados: pagos || [], pasos: pasos || [] });
    })().catch(() => { if (!cancelado) setDatos({ cuerpo: {}, dias: {}, pagaron: new Set(), pagosAprobados: [], pasos: [] }); });
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
  const medios = conteoDetalle('eligio_metodo');
  const planesElegidos = conteoDetalle('eligio_plan');
  const hoyISO = todayISO();
  const terminaronPrueba = todos.filter(u => (u.plan === 'trial' || u.plan === 'prueba') && u.fechaVencimiento
    && u.fechaVencimiento >= desdePago && u.fechaVencimiento <= hoyISO).length;

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
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full transition-all duration-700" style={{ width: `${Math.max(pct, p.n ? 2 : 0)}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
                      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500 rounded-full transition-all duration-700" style={{ width: `${Math.max(pct, p.n ? 2 : 0)}%` }} />
                      </div>
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

function TableroPanel({ users }) {
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const hace30 = fechaLocalISO(new Date(Date.now() - 29 * 86400000));
      const inicioMeses = new Date(); inicioMeses.setDate(1); inicioMeses.setMonth(inicioMeses.getMonth() - 5);
      const [{ data: pagos }, { data: hist }, { data: subs }] = await Promise.all([
        supabase.from('pagos').select('monto, creado_en').eq('estado', 'aprobado')
          .gte('creado_en', fechaLocalISO(inicioMeses)).range(0, 4999),
        supabase.from('historial').select('username, fecha').gt('comidas_count', 0).gte('fecha', hace30).range(0, 9999),
        supabase.from('push_subs').select('username').eq('activa', true).range(0, 4999),
      ]);
      if (cancelado) return;
      setDatos({ pagos: pagos || [], hist: hist || [], subs: subs || [] });
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
          <div>
            <h3 className="jb-display text-sm text-zinc-300 mb-2">INGRESOS POR MES</h3>
            <BarrasSimples datos={graficoIngresos} formato={fmtSoles} />
          </div>
          <div>
            <h3 className="jb-display text-sm text-zinc-300 mb-2">ALUMNOS QUE REGISTRARON COMIDAS · 30 DÍAS</h3>
            <BarrasSimples datos={graficoUso} formato={v => `${v} alumno${v === 1 ? '' : 's'}`} etiquetaCada={5} />
          </div>
        </div>
      )}
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

function FinanzasPanel() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [movs, setMovs] = useState([]);
  const [negocioFiltro, setNegocioFiltro] = useState('todos');
  const [mesFiltro, setMesFiltro] = useState(() => new Date().toISOString().slice(0, 7));
  const [form, setForm] = useState({
    fecha: todayISO(), negocio: 'app', tipo: 'ingreso', concepto: '',
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
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500" style={{ width: `${pctTope}%` }} />
                  </div>
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
                        <div className="text-zinc-200 text-xs truncate">{m.concepto} <span className="text-zinc-600">· {m.negocio}</span></div>
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

function ReconocimientoFotoPanel() {
  const [filas, setFilas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await supabase.from('reconocimiento_foto_feedback')
        .select('sugeridos, descartados, created_at')
        .order('created_at', { ascending: false })
        .limit(500);
      setFilas(data || []);
    } catch { setFilas([]); }
    setLoading(false);
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
      .select('id, evento, fuente, visitante_id, username')
      .gte('creado_en', desde)
      .order('creado_en', { ascending: true })
      .range(desdeFila, desdeFila + 999);
    if (error) throw error;
    filas.push(...(data || []));
    if (!data || data.length < 1000) return filas;
  }
}

function resumirEmbudo(filas) {
  const pasos = () => ({ vistas: 0, visitantes: new Set(), clics: new Set(), registros: new Set(), usuarios: new Set() });
  const total = pasos();
  const porFuente = {};
  filas.forEach(r => {
    // Los eventos anteriores a esta versión no tienen visitante: cada uno
    // cuenta como una persona distinta.
    const quien = r.visitante_id || ('evento-' + r.id);
    const f = (porFuente[r.fuente] = porFuente[r.fuente] || pasos());
    [total, f].forEach(g => {
      if (r.evento === 'vista') { g.vistas++; g.visitantes.add(quien); }
      else if (r.evento === 'clic_cta') g.clics.add(quien);
      else if (r.evento === 'registro') { g.registros.add(quien); if (r.username) g.usuarios.add(r.username); }
    });
  });
  const numeros = g => ({ vistas: g.vistas, visitantes: g.visitantes.size, clics: g.clics.size, registros: g.registros.size, usuarios: [...g.usuarios] });
  return {
    ...numeros(total),
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

function AlumnoRow({ u, onRenew, onViewStudent, onAdjustDays, onActivarAddOnFoto, onDesactivarAddOnFoto, onToggleUser, onDeleteUser }) {
  const [expanded, setExpanded] = useState(false);
  const [dias, setDias] = useState('');
  const [motivo, setMotivo] = useState('');
  const [mesesFoto, setMesesFoto] = useState('1');

  const ms = membershipLabel(u);
  const act = formatActivity(u.lastActivity);
  const addOnActivo = u.reconocimientoFotoHasta && daysLeft(u.reconocimientoFotoHasta) !== null && daysLeft(u.reconocimientoFotoHasta) >= 0;

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
              {addOnActivo && (<><span className="text-zinc-700">·</span><span className="text-orange-500 flex items-center gap-0.5"><Camera size={10} /> IA</span></>)}
            </div>
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

          <div>
            <p className="jb-body text-[11px] text-zinc-500 mb-1.5">Reconocimiento Inteligente (IA por foto)</p>
            {addOnActivo ? (
              <div className="flex items-center gap-2">
                <span className="text-orange-500 text-xs jb-body flex items-center gap-1">
                  <Camera size={12} /> Activo hasta {u.reconocimientoFotoHasta.slice(8, 10)}/{u.reconocimientoFotoHasta.slice(5, 7)}
                </span>
                <button onClick={() => { if (window.confirm(`¿Desactivar Reconocimiento Inteligente para @${u.username}?`)) onDesactivarAddOnFoto(u.username); }}
                  className={btnGhost + ' py-1 px-2 text-xs text-red-400'}>Desactivar</button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <select value={mesesFoto} onChange={e => setMesesFoto(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-200">
                  <option value="1">1 mes</option>
                  <option value="3">3 meses</option>
                  <option value="6">6 meses</option>
                </select>
                <button onClick={() => onActivarAddOnFoto(u.username, parseInt(mesesFoto, 10))} className={btnGhost + ' py-1.5 px-2 text-xs'}>
                  <Camera size={12} /> Activar
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-zinc-900">
            <button onClick={() => onToggleUser(u.username)} className={(u.enabled ? btnDanger : btnGhost) + ' py-1.5 px-3 text-xs'}>
              {u.enabled ? 'Deshabilitar' : 'Habilitar'}
            </button>
            <button onClick={() => { if (window.confirm(`¿Eliminar a "${u.nombre || u.username}" (@${u.username}) para siempre?\n\nSe borran su plan, medidas, comidas registradas, fotos y ajustes — no se puede deshacer. Si vuelve a entrar, verá un aviso pidiéndole que escriba por WhatsApp, como si fuera nuevo. Sus pagos anteriores se conservan.\n\nSi solo quieres pausar su acceso (y que pueda recuperarlo después), usa "Deshabilitar" en vez de esto.`)) onDeleteUser(u.username); }}
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
  let pagosPendientes = null, registraronAyer = null, registraronHoy = null;
  try {
    const { count } = await supabase.from('pagos').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente');
    pagosPendientes = count || 0;
  } catch {}
  try {
    const { data } = await supabase.from('historial').select('username, fecha').in('fecha', [ayer, hoy]).gt('comidas_count', 0);
    registraronAyer = new Set((data || []).filter(r => r.fecha === ayer).map(r => r.username)).size;
    registraronHoy = new Set((data || []).filter(r => r.fecha === hoy).map(r => r.username)).size;
  } catch {}
  const lista = users || [];
  const esPrueba = u => u.plan === 'trial' || u.plan === 'prueba';
  const activosL = lista.filter(u => u.enabled && membershipActive(u));
  // "A medias": pusieron sus datos del cuerpo hace 3 horas o más (y no más
  // de 3 días) pero nunca registraron una comida (mismo criterio que Rescate).
  let aMedias = null;
  try {
    const nombresActivos = activosL.map(u => u.username);
    if (nombresActivos.length) {
      const { data: conComida } = await supabase.from('historial').select('username').in('username', nombresActivos).gt('comidas_count', 0).range(0, 9999);
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
    pagosPendientes, registraronAyer, registraronHoy, aMedias,
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
  partes.push(d.pagosPendientes ? `Tienes ${d.pagosPendientes} ${d.pagosPendientes === 1 ? 'pago' : 'pagos'} por revisar.` : 'No hay pagos pendientes.');
  if (d.vencen) partes.push(`${d.vencen} ${d.vencen === 1 ? 'prueba gratis vence' : 'pruebas gratis vencen'} en los próximos 3 días.`);
  if (d.registraronAyer !== null) partes.push(`Ayer registraron comida ${d.registraronAyer} de tus ${d.activos} alumnos activos.`);
  if (d.aMedias) partes.push(`${d.aMedias === 1 ? '1 alumno se quedó' : `${d.aMedias} alumnos se quedaron`} a medias: ${d.aMedias === 1 ? 'puso sus datos' : 'pusieron sus datos'} pero no ${d.aMedias === 1 ? 'registró' : 'registraron'} su primera comida. Están en Rescate para escribirles hoy.`);
  if (d.nuevos) partes.push(`Desde ayer se ${d.nuevos === 1 ? 'unió 1 alumno nuevo' : `unieron ${d.nuevos} alumnos nuevos`}.`);
  return `${saludoJarvis()}, Jonah. ${partes.join(' ')} ¿Qué necesitas?`;
}
const CLAVE_INFORME_JARVIS = 'jb-jarvis-informe';

/* Voz realista (función jarvis-voz, OpenAI). En el selector se guardan como
   "premium:<voz>"; "" (automática) también usa la voz realista. Si la
   función falla o no tiene clave, Jarvis habla con la voz del celular. */
const VOCES_PREMIUM_JARVIS = [
  { id: 'premium:jarvis', nombre: 'Estilo Jarvis · masculina, mayordomo' },
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
              style={{ background: 'linear-gradient(135deg, rgba(77,217,255,0.10), rgba(10,22,32,0.6))', border: '1px solid #1c6b85', boxShadow: 'inset 0 0 18px rgba(77,217,255,0.08)', animation: `jv-aparece .4s ease-out ${i * 0.08}s both` }}>
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
  async function hablarPremium(texto, voz, alTerminar) {
    const mio = ++turnoVozRef.current;
    const ctx = contextoAudioJarvis();
    if (!ctx) throw new Error('sin audio');
    const bytes = await audioPremiumJarvis(texto, voz);
    const buffer = await ctx.decodeAudioData(bytes.slice(0));
    if (mio !== turnoVozRef.current) return; // llegó otra respuesta mientras tanto
    const fuente = ctx.createBufferSource();
    fuente.buffer = buffer;
    const analizador = ctx.createAnalyser();
    analizador.fftSize = 512;
    fuente.connect(analizador).connect(ctx.destination);
    fuenteVozRef.current = fuente;
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
    fuente.onended = () => { activo = false; if (fuenteVozRef.current === fuente) fuenteVozRef.current = null; alTerminar(); };
    setHablando(true);
    fuente.start();
    requestAnimationFrame(medir);
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

  // Al abrir: la primera vez del día da el informe completo (y lo dice en
  // voz alta); las demás veces, un saludo corto. El informe se puede pedir
  // de nuevo con el botón "Informe del día".
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
    if (!yaHoy) { darInforme(); return; }
    setTurnos([{ role: 'assistant', content: `${saludoJarvis()}, Jonah. A la orden. ¿Qué necesitas?` }]);
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
    // Al historial solo van los textos (no los botones de confirmar).
    const historial = nuevosTurnos.slice(-6).map(m => ({ role: m.role, content: m.content }));
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
    if (!confirmar) { marcar('cancelada'); decir('Entendido, Jonah Beast: no activé nada.'); return; }
    marcar('enviando');
    try {
      const data = await llamarJarvis({ confirmar: { tipo: accion.tipo, username: accion.username, dias: accion.dias } });
      marcar(data.ok ? 'hecha' : 'pendiente');
      decir(data.respuesta);
    } catch (e) {
      marcar('pendiente');
      decir('No pude activarlo ahora mismo. Intenta de nuevo.');
    }
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
    // Tras responder, se le puede seguir hablando sin decir "Jarvis".
    if (modoContinuoRef.current) despiertoHastaRef.current = Date.now() + SEGUNDOS_CONVERSACION_JARVIS * 1000;
    if (modoContinuoRef.current) setTimeout(() => arrancarReconocimiento(), 300);
  }

  function arrancarReconocimiento() {
    if (!modoContinuoRef.current) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const recog = new SR();
    recog.lang = 'es-PE'; recog.continuous = true; recog.interimResults = false; recog.maxAlternatives = 1;
    recog.onresult = (e) => {
      const ultimo = e.results[e.results.length - 1];
      // Se usa siempre la versión más reciente de enviar() (con la
      // conversación al día), no la del momento en que se prendió el micro.
      if (!ultimo.isFinal) return;
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
        setTurnos(ts => [...ts, { role: 'assistant', content: '¿Sí, Jonah?' }]);
        hablarRef.current('¿Sí, Jonah?');
        return;
      }
      despiertoHastaRef.current = 0;
      sonidoJarvis('despierto');
      enviarRef.current(texto);
    };
    recog.onerror = (e) => {
      setEscuchando(false);
      // Errores que no se arreglan reintentando (sin permiso, sin micrófono
      // o sin servicio de voz): se apaga el micro y se avisa en el chat, en
      // vez de seguir intentando en silencio.
      const aviso = AVISOS_MIC[e && e.error];
      if (aviso) { apagarMicConAviso(aviso); return; }
      if (modoContinuoRef.current && !pausadoParaHablarRef.current) setTimeout(() => arrancarReconocimiento(), 800);
    };
    recog.onend = () => { setEscuchando(false); if (modoContinuoRef.current && !pausadoParaHablarRef.current) setTimeout(() => arrancarReconocimiento(), 300); };
    try { recog.start(); recogRef.current = recog; setEscuchando(true); } catch (e) {}
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
    if (nuevo) { desbloquearVoz(); sonidoJarvis('escuchar'); setAvisoMic(''); arrancarReconocimiento(); }
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
              {(m.acciones || []).map((a, j) => (
                <div key={j} className="mt-2 rounded p-2.5 flex flex-col gap-2" style={{ background: '#0d1c28', border: '1px solid #1c6b85' }}>
                  <div className="text-xs">
                    Activar el reconocimiento por foto a <strong style={{ color: '#ffffff' }}>{a.nombre}</strong> por {a.dias} días (hasta el {a.hasta}).
                  </div>
                  {a.estado === 'pendiente' || a.estado === 'enviando' ? (
                    <div className="flex gap-2">
                      <button onClick={() => { desbloquearVoz(); responderAccion(i, j, true); }} disabled={a.estado === 'enviando'}
                        className="text-xs px-3 py-1.5 rounded font-semibold disabled:opacity-50"
                        style={{ background: '#4affb0', color: '#050a0f' }}>
                        {a.estado === 'enviando' ? 'Activando…' : '✅ Confirmar'}
                      </button>
                      <button onClick={() => { desbloquearVoz(); responderAccion(i, j, false); }} disabled={a.estado === 'enviando'}
                        className="text-xs px-3 py-1.5 rounded disabled:opacity-50"
                        style={{ border: '1px solid #163244', color: '#6f92a8' }}>
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="text-[11px]" style={{ color: a.estado === 'hecha' ? '#4affb0' : '#6f92a8', fontFamily: 'monospace' }}>
                      {a.estado === 'hecha' ? '✓ Activado' : 'Cancelado'}
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
      <button onClick={() => { if (vozOn) { callarVozPremium(); try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch {} setHablando(false); } setVozOn(v => !v); }} className="text-xs px-2 py-1 rounded-full" style={{ border: '1px solid ' + (vozOn ? '#4dd9ff' : '#163244'), color: vozOn ? '#4dd9ff' : '#6f92a8', fontFamily: 'monospace' }}>
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
      { titulo: 'Pagos por revisar', valor: d?.pagosPendientes, detalle: d ? (d.pagosPendientes ? 'revísalos en HOY' : 'todo al día') : null, alerta: !!d?.pagosPendientes },
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
  }

  async function cargarChats() {
    try {
      const { data } = await supabase.from('whatsapp_chats').select('*')
        .order('ultimo_mensaje_en', { ascending: false }).limit(50);
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

  async function devolverAlAsistente(telefono) {
    try {
      await supabase.from('whatsapp_chats')
        .update({ modo: 'asistente', motivo: null, resumen: null, pausado_hasta: null })
        .eq('telefono', telefono);
      await cargarChats();
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
  }

  const cambios = modo !== guardado.modo || numeros.trim() !== guardado.numeros;
  const pendientes = chats.filter(c => c.modo === 'jonah').length;

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
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="jb-display text-base text-zinc-200">💬 CHATS {pendientes > 0 && <span className="text-orange-400">· {pendientes} te esperan 🙋</span>}</h2>
          <button onClick={cargarChats} className={btnGhost + ' text-xs'}>Actualizar</button>
        </div>
        {chats.length === 0 ? (
          <p className="jb-body text-sm text-zinc-500">Todavía no hay chats. Aparecerán aquí cuando te escriban.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {chats.map(c => (
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
                  {c.modo === 'jonah' && (
                    <button onClick={() => devolverAlAsistente(c.telefono)} className={btnGhost + ' text-xs shrink-0'}>Devolver al asistente</button>
                  )}
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
    </div>
  );
}

function AdminDashboard({ users, onAddUser, onToggleUser, onDeleteUser, onLogout, onViewStudent, onRenew, onAdjustDays, onActivarAddOnFoto, onDesactivarAddOnFoto, onRecargar }) {
  const [newUser, setNewUser] = useState({ username: '', password: '', nombre: '', telefono: '', fechaInicio: todayISO(), meses: 1 });
  const [formErr, setFormErr] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroAlumnos, setFiltroAlumnos] = useState('todos');
  const [tabActiva, setTabActiva] = useState('hoy');
  const [mostrarJarvis, setMostrarJarvis] = useState(false);

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
            <PagosPanel />
            <RescatePanel users={users} />
            <VencimientosPanel users={users} onRenew={onRenew} />
            <EmbudoPanel />
            <CumpleanosPanel users={users} />

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center shrink-0">
                  <UserPlus size={16} className="text-orange-500" />
                </div>
                <h2 className="jb-display text-base text-zinc-200">NUEVO ALUMNO</h2>
              </div>
              <form onSubmit={submitNew} className="grid sm:grid-cols-3 gap-3 items-end">
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
              </form>
              {formErr && <p className="text-red-400 text-sm mt-2 flex items-center gap-1.5"><AlertTriangle size={14} />{formErr}</p>}
            </div>

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
                  deshabilitados: [], vencidos: [], enPrueba: [], activos: [],
                };
                usersFiltrados.forEach(u => {
                  const dl = daysLeft(u.fechaVencimiento);
                  if (!u.enabled) grupos.deshabilitados.push(u);
                  else if (dl !== null && dl < 0) grupos.vencidos.push(u);
                  else if (u.plan === 'trial' || u.plan === 'prueba') grupos.enPrueba.push(u);
                  else grupos.activos.push(u);
                });
                grupos.vencidos.sort((a, b) => daysLeft(a.fechaVencimiento) - daysLeft(b.fechaVencimiento));
                const porNombre = (a, b) => (a.nombre || a.username).localeCompare(b.nombre || b.username);
                grupos.enPrueba.sort(porNombre);
                grupos.activos.sort(porNombre);
                grupos.deshabilitados.sort(porNombre);

                const SECCIONES = [
                  { key: 'vencidos', label: 'VENCIDOS', color: '#ff5c5c', emoji: '🔴' },
                  { key: 'enPrueba', label: 'EN PRUEBA GRATIS', color: '#4dd9ff', emoji: '🔵' },
                  { key: 'activos', label: 'ACTIVOS', color: '#4affb0', emoji: '🟢' },
                  { key: 'deshabilitados', label: 'DESHABILITADOS', color: '#6f92a8', emoji: '⚪' },
                ];
                const seccionesConDatos = SECCIONES.filter(s => grupos[s.key].length > 0);
                const seccionesAMostrar = filtroAlumnos === 'todos'
                  ? seccionesConDatos
                  : seccionesConDatos.filter(s => s.key === filtroAlumnos);

                return (
                  <div className="flex flex-col gap-4">
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
                              <AlumnoRow key={u.username} u={u}
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
          </>
        )}

        {tabActiva === 'negocio' && (
          <>
            <TableroPanel users={users} />
            <FuncionandoPanel users={users} />
            <ActivacionPanel users={users} />
            <EmbudoResumenPanel />
            <MetricasPanel />
            <FinanzasPanel />
            <ReferidosPanel users={users} onCambio={onRecargar} />
            <PlatosNoEncontradosPanel />
            <LeadsPanel />
          </>
        )}

        {tabActiva === 'ia' && (
          <ReconocimientoFotoPanel />
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

function RescatePanel({ users }) {
  const [open, setOpen] = useState(true);
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
      const { data, error } = await supabase.from('historial')
        .select('username, fecha')
        .in('username', nombres.split(','))
        .gt('comidas_count', 0)
        .range(0, 9999);
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

function VencimientosPanel({ users, onRenew }) {
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
      const { data, error } = await supabase.from('historial')
        .select('username, fecha')
        .in('username', nombresPrueba.split(','))
        .gt('comidas_count', 0)
        .range(0, 4999);
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
        </div>
        <div className="flex items-center gap-2">
          <a href={linkWhatsApp(u, texto)} target="_blank" rel="noopener noreferrer"
            className={btnPrimary + ' py-1.5 px-3 text-xs'}>
            <MessageCircle size={13} /> Escribir
          </a>
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
  const visibles = filtro === 'todos' ? pagos : pagos.filter(p => p.estado === filtro);

  return (
    <div className={`rounded-2xl overflow-hidden border ${pendientes.length ? 'bg-zinc-900 border-orange-500/50' : 'bg-zinc-900 border-zinc-800'}`}>
      <button onClick={() => setOpen(v => !v)} className="w-full px-5 py-4 flex items-center justify-between text-left">
        <h2 className="jb-display text-base text-zinc-200">
          💰 PAGOS {pendientes.length > 0 && (
            <span className="ml-2 bg-orange-500 text-zinc-950 text-xs px-2 py-0.5 rounded-full">{pendientes.length} por revisar</span>
          )}
        </h2>
        <ChevronRight size={18} className={`text-zinc-500 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-zinc-800 pt-4">

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
