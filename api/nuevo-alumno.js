// api/nuevo-alumno.js
//
// Envía un push a Jonah Beast (admin) cada vez que se crea un alumno
// nuevo en la base de datos. Lo dispara un trigger de Postgres
// (ver alumnos_notificar_admin) apenas se inserta una fila en
// "alumnos" — no depende de que el navegador del alumno siga abierto,
// así que funciona incluso si cierra la app justo después de
// registrarse.
//
// Seguridad: solo acepta el pedido si trae el secreto compartido en
// el header "x-webhook-secret", el mismo que se configura en el
// trigger de Supabase. Sin eso, cualquiera podría llamar este
// endpoint y hacerte llegar avisos falsos.

import { getSupabase, setupWebPush } from './_lib/push.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const secreto = req.headers['x-webhook-secret'];
  if (!secreto || secreto !== process.env.NUEVO_ALUMNO_SECRET) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const { username } = req.body || {};
  if (!username) return res.status(400).json({ error: 'Falta username' });

  const supabase = getSupabase();
  setupWebPush();

  try {
    const [{ data: admin }, { data: alumno }] = await Promise.all([
      supabase.from('profiles').select('username').eq('role', 'admin').limit(1).maybeSingle(),
      supabase.from('profiles').select('nombre').eq('username', username).maybeSingle(),
    ]);
    if (!admin) return res.status(200).json({ ok: true, enviado: false, motivo: 'sin admin configurado' });

    const { data: subs } = await supabase.from('push_subs').select('*')
      .eq('username', admin.username).eq('activa', true);
    if (!subs || subs.length === 0) {
      return res.status(200).json({ ok: true, enviado: false, motivo: 'admin sin notificaciones activas' });
    }

    const nombre = alumno?.nombre || username;
    const payload = JSON.stringify({
      titulo: 'Jonah 🦍',
      cuerpo: `🎉 Nuevo alumno registrado: ${nombre} (@${username})`,
      url: '/',
    });

    const webpush = (await import('web-push')).default;
    const resultados = await Promise.allSettled(
      subs.map(sub => webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      ))
    );
    const enviados = resultados.filter(r => r.status === 'fulfilled').length;

    return res.status(200).json({ ok: true, enviado: enviados > 0, enviados });
  } catch (e) {
    console.error('Error enviando push de nuevo alumno:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
