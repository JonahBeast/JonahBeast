// api/whatsapp-aviso.js
//
// Avisa a Jonah Beast (admin) en su celular cuando el asistente de WhatsApp
// le pasa un chat: "🙋 Carlos necesita que le respondas: …". Lo llama la
// función whatsapp-webhook de Supabase.
//
// Seguridad: igual que /api/nuevo-alumno, solo acepta el pedido si trae el
// secreto compartido en el header "x-webhook-secret".

import { getSupabase, setupWebPush, enviarPushA } from './_lib/push.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const secreto = req.headers['x-webhook-secret'];
  if (!secreto || secreto !== process.env.NUEVO_ALUMNO_SECRET) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const { telefono, nombre, resumen } = req.body || {};
  if (!telefono) return res.status(400).json({ error: 'Falta telefono' });

  const supabase = getSupabase();
  setupWebPush();

  try {
    const { data: admins } = await supabase.from('profiles').select('username').eq('role', 'admin');
    const usernames = (admins || []).map(a => a.username).filter(Boolean);
    if (!usernames.length) return res.status(200).json({ ok: true, enviado: false, motivo: 'sin admin configurado' });

    const quien = String(nombre || '').trim() || `+${telefono}`;
    const r = await enviarPushA(supabase, usernames, {
      title: 'Jonah 🦍',
      body: `🙋 ${quien} necesita que le respondas por WhatsApp${resumen ? `: ${String(resumen).slice(0, 200)}` : '.'}`,
    });
    return res.status(200).json({ ok: true, enviados: r.enviados });
  } catch (e) {
    console.error('Error enviando aviso de WhatsApp:', e);
    return res.status(500).json({ ok: false, error: 'No se pudo enviar el aviso' });
  }
}
