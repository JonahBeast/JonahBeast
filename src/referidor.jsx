// Parte de la app que se descarga solo cuando hace falta (referidor).
// Se generó separando src/App.jsx: el código es el mismo de antes.
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Plus, Trash2, LogOut, Eye, ShieldCheck, X, ChevronRight, Flame, Salad, UserPlus, AlertTriangle, Loader2, MessageCircle, Target, LayoutDashboard, TrendingUp, Camera, CreditCard, Mic, ShoppingCart, Phone } from 'lucide-react';
import { supabase, supabaseUrl, supabaseKey } from './supabaseClient';
import {
  Logo,
  StatCard,
  btnGhost,
  btnPrimary,
} from './App.jsx';

function PanelReferidor({ token, onSalir }) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.rpc('panel_referidor', { p_token: token });
        setDatos(data && data.ok ? data : { ok: false });
      } catch { setDatos({ ok: false }); }
      setCargando(false);
    })();
  }, [token]);

  if (cargando) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  if (!datos || !datos.ok) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center">
          <div className="mb-6"><Logo size="lg" /></div>
          <p className="jb-body text-zinc-400 mb-4">
            Este enlace no es válido o fue desactivado. Escríbenos si crees que es un error.
          </p>
          <button onClick={onSalir} className={btnGhost + ' w-full'}>Ir al inicio</button>
        </div>
      </div>
    );
  }

  const refs = datos.referidos || [];
  const pagaron = refs.filter(r => r.pago);
  const enPrueba = refs.filter(r => !r.pago);
  const esPct = Number(datos.comision_pct) > 0;

  function fmtFecha(f) {
    if (!f) return '';
    const [y, m, d] = String(f).slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
  }

  return (
    <div className="min-h-screen bg-zinc-950 jb-body">
      <header className="border-b border-zinc-800 px-6 py-4">
        <Logo />
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center jb-display text-lg text-orange-500 shrink-0">
            {(datos.nombre || '??').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="jb-body text-xs text-zinc-500 uppercase tracking-wider mb-1">Panel de referidos</p>
            <h1 className="jb-display text-3xl text-zinc-50">{datos.nombre}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="jb-display text-sm text-orange-500 bg-orange-950/40 border border-orange-500/40 rounded-lg px-3 py-1">
                {datos.codigo}
              </span>
              <span className="jb-body text-xs text-zinc-500">
                {esPct
                  ? `${datos.comision_pct}% de comisión` +
                    (Number(datos.descuento_pct) > 0 ? ` · ${datos.descuento_pct}% de descuento para tus referidos` : '')
                  : `1m S/${Number(datos.tarifas.m1 || 0).toFixed(0)} · 3m S/${Number(datos.tarifas.m3 || 0).toFixed(0)} · 6m S/${Number(datos.tarifas.m6 || 0).toFixed(0)} · 12m S/${Number(datos.tarifas.m12 || 0).toFixed(0)}`}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Se registraron" value={refs.length} />
          <StatCard label="Ya pagaron" value={pagaron.length} accent="text-emerald-400" />
          <StatCard label="Por cobrar" value={'S/' + Number(datos.total_pendiente).toFixed(2)} accent="text-emerald-400" />
          <StatCard label="Ya cobrado" value={'S/' + Number(datos.total_pagado).toFixed(2)} />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h2 className="jb-display text-base text-zinc-200 mb-1">TUS REFERIDOS</h2>
          <p className="jb-body text-xs text-zinc-500 mb-4">
            Actualizado en tiempo real. Por privacidad de cada persona, solo mostramos su nombre y la inicial de su apellido.
          </p>

          {refs.length === 0 ? (
            <p className="jb-body text-sm text-zinc-500">
              Todavía nadie se ha registrado con tu código. Compártelo y aparecerán aquí al instante.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {refs.map((r, i) => (
                <div key={i} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex items-center gap-3 flex-wrap">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${r.pago ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-zinc-100 text-sm">{r.nombre}</div>
                    <div className="text-xs">
                      <span className={r.pago ? 'text-emerald-400' : 'text-zinc-500'}>
                        {r.pago ? `✓ Pagó plan de ${r.meses || '—'} mes(es)` : 'En prueba gratis'}
                      </span>
                      <span className="text-zinc-600"> · {fmtFecha(r.fecha)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    {r.pago ? (
                      <>
                        <div className="jb-display text-sm text-zinc-100">S/{Number(r.monto).toFixed(2)}</div>
                        <div className={`text-[11px] ${r.pagada ? 'text-zinc-500' : 'text-emerald-400'}`}>
                          {r.pagada ? 'ya te lo pagamos' : 'por cobrar'}
                        </div>
                      </>
                    ) : (
                      <span className="jb-body text-[11px] text-zinc-600">aún no genera comisión</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {enPrueba.length > 0 && (
            <p className="jb-body text-[11px] text-zinc-600 mt-4">
              {enPrueba.length} persona(s) están probando la app. La comisión se genera cuando adquieren un plan.
            </p>
          )}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="jb-display text-sm text-zinc-300 mb-2">CÓMO COMPARTIR TU CÓDIGO</h3>
          <p className="jb-body text-sm text-zinc-400 mb-3">
            Diles que entren a <span className="text-orange-500">jonahbeast.com</span>, toquen
            "Prueba gratis 15 días", luego "¿Tienes un código?" y escriban{' '}
            <span className="text-orange-500">{datos.codigo}</span>.
          </p>
          <a href={`https://wa.me/?text=${encodeURIComponent(
            `Entra a jonahbeast.com y prueba 15 días gratis. Usa mi código ${datos.codigo} al registrarte` +
            (Number(datos.descuento_pct) > 0 ? ` y obtén ${datos.descuento_pct}% de descuento.` : '.'))}`}
            target="_blank" rel="noopener noreferrer" className={btnPrimary + ' w-full py-2.5'}>
            <MessageCircle size={16} /> Compartir por WhatsApp
          </a>
        </div>

        <p className="jb-body text-[11px] text-zinc-600 text-center">
          Guarda este enlace, es tu acceso personal. No lo compartas: quien lo tenga puede ver esta información.
        </p>
      </main>
    </div>
  );
}

export {
  PanelReferidor,
};
