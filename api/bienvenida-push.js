// api/bienvenida-push.js
//
// Manda el mensaje de bienvenida de Jonah al alumno, justo en el
// instante en que activa las notificaciones por primera vez desde el
// onboarding (BienvenidaModal en App.jsx). No se puede mandar al
// crear la cuenta porque en ese momento todavía no existe ninguna
// suscripción push a la que mandarle nada — recién existe una vez
// que el alumno acepta el permiso del navegador, que es exactamente
// cuando se llama este endpoint.
//
// Lo llama el frontend directo (no un trigger de base de datos), así
// que no lleva el secreto de webhook — solo necesita el username, y
// manda el push solo si ese alumno tiene una suscripción activa
// recién guardada.

import { getSupabase, setupWebPush } from './_lib/push.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { username } = req.body || {};
  if (!username) return res.status(400).json({ error: 'Falta username' });

  const supabase = getSupabase();
  setupWebPush();

  try {
    const { data: subs } = await supabase.from('push_subs').select('*')
      .eq('username', username).eq('activa', true);
    if (!subs || subs.length === 0) {
      return res.status(200).json({ ok: true, enviado: false, motivo: 'sin suscripción activa todavía' });
    }

    const payload = JSON.stringify({
      titulo: 'Jonah 🦍',
      cuerpo: '¡Bienvenido a Jonah Beast Fuel! Soy Jonah, y desde hoy estoy contigo en cada paso. Vamos a construir juntos la mejor versión de ti 🔥',
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
    console.error('Error enviando push de bienvenida:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
