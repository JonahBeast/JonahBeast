// api/pago-aprobado.js
//
// Avisa al alumno en su celular que su pago fue aprobado y hasta cuándo
// tiene acceso. Recibe solo el id del pago: el alumno, el estado y las
// fechas se leen de la base, nunca de lo que mande quien llama.
//
// Lo llaman:
//  - el panel de admin, al tocar "Aprobar" (con la sesión del admin), y
//  - la función webhook-mercadopago, cuando un pago se activa solo (con
//    el secreto compartido en el header "x-webhook-secret", igual que
//    /api/premio-invitacion).
//
// Solo avisa pagos aprobados en los últimos 30 minutos, así un pedido
// repetido más tarde no vuelve a mandar el mismo aviso.
//
// Cuando el pago se aprobó solo (Mercado Pago, vía el webhook), también
// avisa a Jonah Beast (admin) en su celular: "💰 Pago recibido: ...".
// Si lo aprobó él mismo desde el panel, no hace falta avisarle.
//
// También le avisa a Meta "Compra" con el monto (API de conversiones),
// para que los anuncios aprendan a buscar gente que paga.

import { getSupabase, setupWebPush, enviarPushA } from './_lib/push.js';
import { avisarCompraMeta } from './_lib/meta-compra.js';

const VENTANA_MS = 30 * 60 * 1000;

function fechaCorta(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

const PLAN_POR_MESES = { 1: 'mensual', 3: 'trimestral', 6: 'semestral', 12: 'anual' };

// Devuelve 'webhook' (pago aprobado solo), 'admin' (lo aprobó Jonah desde
// el panel) o false.
async function autorizado(req, supabase) {
  const secreto = req.headers['x-webhook-secret'];
  if (secreto && process.env.NUEVO_ALUMNO_SECRET && secreto === process.env.NUEVO_ALUMNO_SECRET) return 'webhook';

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return false;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return false;
  const { data: perfil } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
  return perfil?.role === 'admin' ? 'admin' : false;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const supabase = getSupabase();
  const quien = await autorizado(req, supabase);
  if (!quien) return res.status(401).json({ error: 'No autorizado' });

  const { pagoId } = req.body || {};
  if (!pagoId) return res.status(400).json({ error: 'Falta pagoId' });

  try {
    const { data: pago } = await supabase.from('pagos')
      .select('username, estado, metodo, monto, plan_meses, creado_en, revisado_en').eq('id', pagoId).maybeSingle();
    if (!pago || pago.estado !== 'aprobado') return res.status(200).json({ ok: true, enviado: false, motivo: 'no aprobado' });

    const cuando = new Date(pago.revisado_en || pago.creado_en || 0).getTime();
    if (!(Date.now() - cuando < VENTANA_MS)) return res.status(200).json({ ok: true, enviado: false, motivo: 'fuera de tiempo' });

    const { data: alumno } = await supabase.from('alumnos')
      .select('nombre, fecha_vencimiento, reconocimiento_foto_hasta').eq('username', pago.username).maybeSingle();
    if (!alumno) return res.status(200).json({ ok: true, enviado: false, motivo: 'sin alumno' });

    const meta = await avisarCompraMeta(supabase, {
      username: pago.username, monto: pago.monto, eventoId: pagoId, cuando: pago.revisado_en || pago.creado_en,
    });

    const nombre = (alumno.nombre || '').trim().split(/\s+/)[0];
    const saludo = nombre ? `¡Listo, ${nombre}! ` : '¡Listo! ';
    const esAddon = /add-on/i.test(pago.metodo || '');
    const body = esAddon
      ? `✅ ${saludo}Tu pago fue aprobado: Reconocimiento Inteligente activo hasta el ${fechaCorta(alumno.reconocimiento_foto_hasta)}. ¡A tomarle foto a tus platos! 📸`
      : `✅ ${saludo}Tu pago fue aprobado y tu plan está activo hasta el ${fechaCorta(alumno.fecha_vencimiento)}. ¡Vamos con todo! 💪`;

    setupWebPush();
    const r = await enviarPushA(supabase, [pago.username], { title: 'Jonah 🦍', body });

    // Aviso a Jonah Beast: solo si el pago se aprobó solo y es dinero real.
    let avisoAdmin = 0;
    // No avisa de los pagos de prueba del propio dueño (cuenta "martin").
    if (quien === 'webhook' && Number(pago.monto) > 0 && pago.username !== 'martin') {
      try {
        const { data: admin } = await supabase.from('profiles').select('username').eq('role', 'admin').limit(1).maybeSingle();
        if (admin?.username) {
          const que = esAddon ? 'complemento de fotos' : `plan ${PLAN_POR_MESES[pago.plan_meses] || `de ${pago.plan_meses} meses`}`;
          const monto = `S/${Number(pago.monto).toFixed(2)}`;
          const rAdmin = await enviarPushA(supabase, [admin.username], {
            title: 'Jonah 🦍',
            body: `💰 Pago recibido: ${(alumno.nombre || pago.username).trim()} · ${que} · ${monto} (${(pago.metodo || 'Mercado Pago').replace(/\s*\(.*\)$/, '')})`,
          });
          avisoAdmin = rAdmin.enviados;
        }
      } catch (e) { console.error('No se pudo avisar al admin del pago:', e); }
    }
    return res.status(200).json({ ok: true, enviados: r.enviados, avisoAdmin, meta: meta.ok });
  } catch (e) {
    console.error('Error enviando aviso de pago aprobado:', e);
    return res.status(500).json({ ok: false, error: 'No se pudo enviar el aviso' });
  }
}
