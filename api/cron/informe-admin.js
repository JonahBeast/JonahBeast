// api/cron/informe-admin.js
//
// Corre todos los días a las 8am hora Perú. Le manda a Jonah Beast (admin)
// un aviso corto con lo del día: lo que entró ayer, los pagos por revisar,
// las pruebas gratis que vencen hoy o mañana y los alumnos que pagan y
// dejaron de registrar. Si no hay nada que valga la pena, no manda nada.
//
// Cron en vercel.json: "0 13 * * *" (13:00 UTC = 8:00 Perú)

import { getSupabase, setupWebPush, verificarCronSecret, horaYFechaPeru, addDaysISO, enviarPushA } from '../_lib/push.js';

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
      supabase.from('pagos').select('monto').eq('estado', 'aprobado').gt('monto', 0)
        .gte('creado_en', `${ayer}T00:00:00-05:00`).lt('creado_en', `${hoyISO}T00:00:00-05:00`).range(0, 999),
      supabase.from('pagos').select('id').eq('estado', 'pendiente').range(0, 999),
      supabase.from('alumnos').select('username, plan, enabled, fecha_vencimiento').eq('enabled', true).gte('fecha_vencimiento', hoyISO).range(0, 4999),
    ]);

    const esPrueba = a => a.plan === 'trial' || a.plan === 'prueba';
    const cobrado = Math.round((cobrados || []).reduce((s, p) => s + (Number(p.monto) || 0), 0) * 100) / 100;
    const nPendientes = (pendientes || []).length;
    const vencenHoy = (alumnos || []).filter(a => esPrueba(a) && a.fecha_vencimiento === hoyISO).length;
    const vencenManana = (alumnos || []).filter(a => esPrueba(a) && a.fecha_vencimiento === manana).length;

    // Alumnos que pagan y llevan 3 a 7 días sin registrar comidas.
    let quietos = 0;
    const pagando = (alumnos || []).filter(a => !esPrueba(a)).map(a => a.username);
    if (pagando.length) {
      const { data: hist } = await supabase.from('historial').select('username, fecha')
        .in('username', pagando).gte('fecha', addDaysISO(hoyISO, -10)).gt('comidas_count', 0).range(0, 9999);
      const ultima = {};
      (hist || []).forEach(r => { if (!ultima[r.username] || r.fecha > ultima[r.username]) ultima[r.username] = r.fecha; });
      quietos = Object.values(ultima).filter(f => f <= addDaysISO(hoyISO, -3) && f >= addDaysISO(hoyISO, -7)).length;
    }

    const partes = [];
    if (cobrado > 0) partes.push(`Ayer entraron S/${cobrado.toFixed(2)} (${(cobrados || []).length} ${(cobrados || []).length === 1 ? 'pago' : 'pagos'}).`);
    const hoy = [];
    if (nPendientes) hoy.push(`${enLetras(nPendientes)} ${nPendientes === 1 ? 'pago' : 'pagos'} por revisar`);
    if (vencenHoy) hoy.push(`${vencenHoy === 1 ? 'una prueba vence' : `${enLetras(vencenHoy)} pruebas vencen`} hoy`);
    if (vencenManana) hoy.push(`${vencenManana === 1 ? 'una vence' : `${enLetras(vencenManana)} vencen`} mañana`);
    if (quietos) hoy.push(`${quietos === 1 ? 'un alumno lleva' : `${enLetras(quietos)} alumnos llevan`} días sin registrar`);
    if (hoy.length) partes.push(`Hoy: ${hoy.join(' · ')}.`);

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
