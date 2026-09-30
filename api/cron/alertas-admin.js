// api/cron/alertas-admin.js
//
// Corre cada hora. Le avisa al celular de Jonah Beast (admin) lo que no
// puede esperar al informe de las 8am:
//   - un pago nuevo por revisar (Yape/Plin/transferencia) que entró en la
//     última hora: el alumno espera su acceso;
//   - un pago que cumplió 12 horas esperando revisión en la última hora;
//   - la conexión del WhatsApp del asistente (dura 60 días) vence en 7 días
//     o menos, o ya venció: una vez al día, a las 9am.
// De noche (10pm a 7am, hora Perú) no avisa: lo pendiente sale en el
// informe de la mañana.
//
// Cron en vercel.json: "5 * * * *" (a los 5 minutos de cada hora)

import { getSupabase, setupWebPush, verificarCronSecret, horaYFechaPeru, enviarPushA } from '../_lib/push.js';

const HORA_MS = 60 * 60 * 1000;

export default async function handler(req, res) {
  if (!verificarCronSecret(req)) return res.status(401).json({ error: 'No autorizado' });

  const { horaPeru: hora } = horaYFechaPeru();
  if (hora >= 22 || hora < 7) return res.status(200).json({ ok: true, enviado: false, motivo: 'de noche' });

  const supabase = getSupabase();
  setupWebPush();
  try {
    const { data: admin } = await supabase.from('profiles').select('username').eq('role', 'admin').limit(1).maybeSingle();
    if (!admin?.username) return res.status(200).json({ ok: true, enviado: false, motivo: 'sin admin' });

    const ahora = Date.now();
    const { data: pendientes } = await supabase.from('pagos')
      .select('id, username, nombre, monto, creado_en').eq('estado', 'pendiente').range(0, 999);
    const edad = p => ahora - new Date(p.creado_en).getTime();
    const nuevos = (pendientes || []).filter(p => edad(p) < HORA_MS);
    // Cumplieron 12 h en la última hora (o entre 12 h y 13 h si la hora de
    // la noche se saltó: entonces se avisa a las 7am).
    const hueco = hora === 7 ? 10 * HORA_MS : HORA_MS;
    const atrasados = (pendientes || []).filter(p => edad(p) >= 12 * HORA_MS && edad(p) < 12 * HORA_MS + hueco);

    const nombre = p => String(p.nombre || p.username).trim().split(/\s+/)[0];
    const soles = p => `S/${Number(p.monto || 0).toFixed(2)}`;
    const avisos = [];
    if (nuevos.length === 1) {
      avisos.push({ title: '💳 Pago por revisar', body: `${nombre(nuevos[0])} envió un pago de ${soles(nuevos[0])}. Apruébalo en Pagos o pídeselo a Jarvis.` });
    } else if (nuevos.length > 1) {
      avisos.push({ title: '💳 Pagos por revisar', body: `Entraron ${nuevos.length} pagos: ${nuevos.map(nombre).join(', ')}. Revísalos en Pagos o pídeselo a Jarvis.` });
    }
    if (atrasados.length) {
      avisos.push({
        title: '⏰ Pago esperando más de 12 h',
        body: atrasados.length === 1
          ? `${nombre(atrasados[0])} sigue esperando que revises su pago de ${soles(atrasados[0])}. Aún no tiene acceso.`
          : `${atrasados.length} pagos llevan más de 12 horas esperando: ${atrasados.map(nombre).join(', ')}.`,
      });
    }
    if (hora === 9) {
      const { data: wa } = await supabase.from('whatsapp_cuenta').select('conectado_en, token').eq('id', 1).maybeSingle();
      if (wa?.token && wa.conectado_en) {
        const dias = Math.ceil((new Date(wa.conectado_en).getTime() + 60 * 24 * HORA_MS - ahora) / (24 * HORA_MS));
        if (dias <= 0) {
          avisos.push({ title: '⚠️ WhatsApp desconectado', body: 'La conexión de tu WhatsApp venció: el asistente ya no responde. Entra al panel → WHATSAPP → Conectar mi WhatsApp.' });
        } else if (dias <= 7) {
          avisos.push({ title: '📱 Renueva tu WhatsApp', body: `La conexión del asistente de WhatsApp vence en ${dias} ${dias === 1 ? 'día' : 'días'}. Renuévala en el panel → WHATSAPP → Conectar mi WhatsApp.` });
        }
      }
    }
    if (!avisos.length) return res.status(200).json({ ok: true, enviado: false, motivo: 'nada nuevo' });

    let enviados = 0;
    for (const a of avisos) {
      const r = await enviarPushA(supabase, [admin.username], { ...a, url: '/' });
      enviados += r.enviados || 0;
    }
    return res.status(200).json({ ok: true, enviados, nuevos: nuevos.length, atrasados: atrasados.length });
  } catch (e) {
    console.error('Error en las alertas del admin:', e);
    return res.status(500).json({ ok: false, error: 'No se pudieron revisar las alertas' });
  }
}
