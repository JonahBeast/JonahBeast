// api/cron/informe-admin.js
//
// Corre todos los días a las 8am hora Perú. Le manda a Jonah Beast (admin)
// un aviso corto con lo del día: lo que entró ayer, los pagos por revisar,
// las pruebas gratis que vencen hoy o mañana, los alumnos que pagan y
// dejaron de registrar y los alimentos por revisar (variantes y menú del día
// que propuso la IA) y el saldo de la IA si quedó bajo (tabla ia_saldo).
// Si no hay nada que valga la pena, no manda nada.
//
// Cron en vercel.json: "0 13 * * *" (13:00 UTC = 8:00 Perú)

import { getSupabase, setupWebPush, verificarCronSecret, horaYFechaPeru, addDaysISO, enviarPushA } from '../_lib/push.js';
import { puntoDePartidaSaldo, saldoEstimado, SALDO_IA_MINIMO_USD, leerRecargaAuto, RECARGA_AUTO_POR_DEFECTO } from '../../src/saldoIA.js';

const NUMEROS = ['cero', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];
const enLetras = n => NUMEROS[n] || String(n);

export default async function handler(req, res) {
  if (!verificarCronSecret(req)) return res.status(401).json({ error: 'No autorizado' });

  const supabase = getSupabase();
  setupWebPush();
  const { hoyISO } = horaYFechaPeru();
  const ayer = addDaysISO(hoyISO, -1);
  const manana = addDaysISO(hoyISO, 1);

  try {
    const { data: admin } = await supabase.from('profiles').select('username').eq('role', 'admin').limit(1).maybeSingle();
    if (!admin?.username) return res.status(200).json({ ok: true, enviado: false, motivo: 'sin admin' });

    const [{ data: cobrados }, { data: pendientes }, { data: alumnos }] = await Promise.all([
      supabase.from('pagos').select('username, monto').eq('estado', 'aprobado').gt('monto', 0)
        .gte('creado_en', `${ayer}T00:00:00-05:00`).lt('creado_en', `${hoyISO}T00:00:00-05:00`).range(0, 999),
      supabase.from('pagos').select('id').eq('estado', 'pendiente').range(0, 999),
      supabase.from('alumnos').select('username, plan, enabled, fecha_vencimiento').eq('enabled', true).gte('fecha_vencimiento', hoyISO).range(0, 4999),
    ]);

    const esPrueba = a => a.plan === 'trial' || a.plan === 'prueba';
    // Las cuentas del dueño (sus pruebas y pagos propios) no cuentan.
    const CUENTAS_PROPIAS = ['martin'];
    const cobradosReales = (cobrados || []).filter(p => !CUENTAS_PROPIAS.includes(p.username));
    const cobrado = Math.round(cobradosReales.reduce((s, p) => s + (Number(p.monto) || 0), 0) * 100) / 100;
    const nPendientes = (pendientes || []).length;
    const vencenHoy = (alumnos || []).filter(a => esPrueba(a) && a.fecha_vencimiento === hoyISO).length;
    const vencenManana = (alumnos || []).filter(a => esPrueba(a) && a.fecha_vencimiento === manana).length;

    // Alumnos que pagan y llevan 3 a 7 días sin registrar comidas.
    let quietos = 0;
    const pagando = (alumnos || []).filter(a => !esPrueba(a) && !CUENTAS_PROPIAS.includes(a.username)).map(a => a.username);
    if (pagando.length) {
      const { data: hist } = await supabase.from('historial').select('username, fecha')
        .in('username', pagando).gte('fecha', addDaysISO(hoyISO, -10)).gt('comidas_count', 0).range(0, 9999);
      const ultima = {};
      (hist || []).forEach(r => { if (!ultima[r.username] || r.fecha > ultima[r.username]) ultima[r.username] = r.fecha; });
      quietos = Object.values(ultima).filter(f => f <= addDaysISO(hoyISO, -3) && f >= addDaysISO(hoyISO, -7)).length;
    }

    // Alimentos por revisar (panel → HOY → "Alimentos por revisar"): variantes
    // que propuso la IA y sugerencias de menú de los platos que agregó sola.
    const { data: agregados } = await supabase.from('pedidos_alimentos')
      .select('propuesta, alimentos_extra(menu_uso)').eq('estado', 'agregado')
      .gte('resuelto_en', new Date(Date.now() - 60 * 864e5).toISOString()).range(0, 499);
    const porRevisar = (agregados || []).reduce((n, p) => {
      const pr = p.propuesta || {};
      const variantes = (pr.variantes_resultado || []).filter(v => v.estado === 'sugerida').length;
      const menu = pr.ia_estado === 'agregado' && pr.menu_uso && !pr.menu_revision && p.alimentos_extra && !p.alimentos_extra.menu_uso ? 1 : 0;
      return n + variantes + menu;
    }, 0);

    // Saldo de la IA (Anthropic), estimado con lo que Jonah anotó en el panel.
    let saldoIA = null;
    let recargaAyer = 0;
    const reglaAuto = { ...RECARGA_AUTO_POR_DEFECTO };
    try {
      const [{ data: movs }, { data: cfg }] = await Promise.all([
        supabase.from('ia_saldo').select('tipo, monto_usd, fecha').range(0, 499),
        supabase.from('config').select('value').eq('key', 'ia_recarga_auto').maybeSingle(),
      ]);
      Object.assign(reglaAuto, (cfg?.value && leerRecargaAuto(cfg.value)) || {});
      const p = puntoDePartidaSaldo(movs || []);
      if (p) {
        const { data: usos } = await supabase.from('ia_uso')
          .select('modelo, tokens_entrada, tokens_salida, tokens_cache_lectura, tokens_cache_escritura, creado_en')
          .gte('creado_en', p.desde).range(0, 19999);
        const est = saldoEstimado(movs || [], usos || [], reglaAuto);
        saldoIA = est?.saldo ?? null;
        // Recargas automáticas de las últimas 24 h (se cobran a la tarjeta).
        const hace24 = Date.now() - 864e5;
        recargaAyer = (est?.recargasAuto || []).filter(r => new Date(r.fecha).getTime() >= hace24).reduce((s, r) => s + r.monto, 0);
      }
    } catch {}

    const partes = [];
    if (cobrado > 0) partes.push(`Ayer entraron S/${cobrado.toFixed(2)} (${cobradosReales.length} ${cobradosReales.length === 1 ? 'pago' : 'pagos'}).`);
    const hoy = [];
    if (nPendientes) hoy.push(`${enLetras(nPendientes)} ${nPendientes === 1 ? 'pago' : 'pagos'} por revisar`);
    if (vencenHoy) hoy.push(`${vencenHoy === 1 ? 'una prueba vence' : `${enLetras(vencenHoy)} pruebas vencen`} hoy`);
    if (vencenManana) hoy.push(`${vencenManana === 1 ? 'una vence' : `${enLetras(vencenManana)} vencen`} mañana`);
    if (quietos) hoy.push(`${quietos === 1 ? 'un alumno lleva' : `${enLetras(quietos)} alumnos llevan`} días sin registrar`);
    if (porRevisar) hoy.push(`${porRevisar === 1 ? 'un alimento' : `${enLetras(porRevisar)} alimentos`} por revisar (variantes y menú del día)`);
    if (hoy.length) partes.push(`Hoy: ${hoy.join(' · ')}.`);
    if (recargaAyer > 0) {
      partes.push(`🔄 Anthropic habría recargado unos US$ ${recargaAyer.toFixed(2)} a tu tarjeta (saldo de la IA ≈ US$ ${saldoIA.toFixed(2)}).`);
    }
    if (!reglaAuto.activa && saldoIA !== null && saldoIA < SALDO_IA_MINIMO_USD) {
      partes.push(`⚠️ El saldo de la IA está bajo: quedan unos US$ ${Math.max(saldoIA, 0).toFixed(2)}. Recárgalo en Anthropic para que las fotos y Jarvis sigan funcionando.`);
    }

    // Nada que valga la pena: Jarvis no molesta.
    if (!partes.length) return res.status(200).json({ ok: true, enviado: false, motivo: 'nada importante' });

    const r = await enviarPushA(supabase, [admin.username], {
      title: 'Jarvis ☀️',
      body: `Buenos días, señor Jonah. ${partes.join(' ')}`,
    });
    return res.status(200).json({ ok: true, enviados: r.enviados });
  } catch (e) {
    console.error('Error en el informe de la mañana:', e);
    return res.status(500).json({ ok: false, error: 'No se pudo armar el informe' });
  }
}
