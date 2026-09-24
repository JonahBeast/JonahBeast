// api/premio-invitacion.js
//
// Avisa al alumno que invitó a un amigo que ganó 15 días gratis. Lo
// dispara la base de datos (private.premiar_invitacion) cuando se aprueba
// el primer pago de plan del amigo; el premio ya quedó aplicado ahí, este
// endpoint solo manda el push.
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

  const { username, amigo } = req.body || {};
  if (!username) return res.status(400).json({ error: 'Falta username' });

  const supabase = getSupabase();
  setupWebPush();

  try {
    const { data: perfilAmigo } = await supabase.from('alumnos').select('nombre').eq('username', amigo || '').maybeSingle();
    const nombreAmigo = (perfilAmigo?.nombre || '').trim().split(/\s+/)[0] || 'Tu amigo';
    const r = await enviarPushA(supabase, [username], {
      title: 'Jonah 🦍',
      body: `🎁 ${nombreAmigo} se unió a Jonah Beast Fuel gracias a ti. ¡Te regalo 15 días más!`,
    });
    return res.status(200).json({ ok: true, enviados: r.enviados });
  } catch (e) {
    console.error('Error enviando push de premio por invitación:', e);
    return res.status(500).json({ ok: false, error: 'No se pudo enviar el aviso' });
  }
}
