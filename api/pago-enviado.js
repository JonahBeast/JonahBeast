// api/pago-enviado.js
//
// Avisa a Jonah al celular apenas un alumno manda su pago por Yape, Plin
// o transferencia ("Ya pagué" en la pantalla de planes), para aprobarlo al
// toque y que el alumno no se enfríe esperando. Antes el aviso llegaba con
// la revisión de cada hora (api/cron/alertas-admin.js), que sigue como
// respaldo si este aviso no sale (por ejemplo, si el alumno cierra la app).
//
// De noche (10pm a 7am, hora Perú) no avisa: igual que las demás alertas,
// esos pagos los recuerda la revisión de cada hora.
//
// Seguridad: solo con la sesión del alumno (su token de Supabase), y solo
// avisa de SU último pago pendiente de los últimos 15 minutos. Anota el pago
// en config → pagos_avisados para que la revisión de cada hora no lo repita.

import { getSupabase, setupWebPush, enviarPushA, horaYFechaPeru } from './_lib/push.js';

export const CLAVE_PAGOS_AVISADOS = 'pagos_avisados';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const supabase = getSupabase();
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  const { data: sesion, error: errSesion } = await supabase.auth.getUser(token);
  if (errSesion || !sesion?.user) return res.status(401).json({ error: 'No autorizado' });

  const { horaPeru } = horaYFechaPeru();
  if (horaPeru >= 22 || horaPeru < 7) return res.status(200).json({ ok: true, enviado: false, motivo: 'de noche' });

  try {
    const { data: alumno } = await supabase.from('alumnos').select('username').eq('user_id', sesion.user.id).maybeSingle();
    if (!alumno?.username) return res.status(404).json({ error: 'Sin alumno' });

    const desde = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: pago } = await supabase.from('pagos')
      .select('id, username, nombre, monto, metodo, creado_en').eq('username', alumno.username).eq('estado', 'pendiente')
      .gte('creado_en', desde).order('creado_en', { ascending: false }).limit(1).maybeSingle();
    if (!pago) return res.status(200).json({ ok: true, enviado: false, motivo: 'sin pago reciente' });

    const { data: cfg } = await supabase.from('config').select('value').eq('key', CLAVE_PAGOS_AVISADOS).maybeSingle();
    let avisados = [];
    try { avisados = JSON.parse(cfg?.value || '[]'); } catch {}
    if (!Array.isArray(avisados)) avisados = [];
    if (avisados.includes(pago.id)) return res.status(200).json({ ok: true, enviado: false, motivo: 'ya avisado' });

    const { data: admins } = await supabase.from('profiles').select('username').eq('role', 'admin');
    const destino = (admins || []).map(a => a.username).filter(Boolean);
    if (!destino.length) return res.status(200).json({ ok: true, enviado: false, motivo: 'sin admin' });

    setupWebPush();
    const nombre = String(pago.nombre || pago.username).trim().split(/\s+/)[0];
    const r = await enviarPushA(supabase, destino, {
      title: '💳 Pago por revisar',
      body: `${nombre} acaba de pagar S/${Number(pago.monto || 0).toFixed(2)} por ${pago.metodo || 'Yape/Plin'}. Apruébalo en HOY → Pagos: está esperando para seguir.`,
      url: '/',
    });

    await supabase.from('config').upsert({ key: CLAVE_PAGOS_AVISADOS, value: JSON.stringify([pago.id, ...avisados].slice(0, 50)) });
    return res.status(200).json({ ok: true, enviado: r.enviados > 0 });
  } catch (e) {
    console.error('pago-enviado:', e);
    return res.status(500).json({ ok: false, error: 'No se pudo avisar' });
  }
}
