/* Recordatorio diario de Jonah Beast Fuel

   Vercel ejecuta esta función una vez al día (ver vercel.json).
   Revisa quién no registró comidas hoy y le manda una notificación.

   Variables de entorno necesarias en Vercel:
     VAPID_PUBLIC_KEY
     VAPID_PRIVATE_KEY
     SUPABASE_URL
     SUPABASE_SERVICE_KEY
     CRON_SECRET            (opcional, para proteger la ruta)
*/

import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const MENSAJES = [
  '¿Ya registraste tus comidas de hoy? Toma menos de un minuto.',
  'Un minuto ahora vale más que empezar de cero mañana.',
  'Registra lo que comiste hoy y mantén tu racha viva.',
  'Tu progreso se construye con los días que sí registras.',
  '¿Qué comiste hoy? Anótalo antes de que se te pase.',
];

function hoyISO() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Lima' }));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default async function handler(req, res) {
  // Proteger la ruta si se definió un secreto
  const secreto = process.env.CRON_SECRET;
  if (secreto) {
    const auth = req.headers.authorization || '';
    if (auth !== `Bearer ${secreto}`) {
      return res.status(401).json({ error: 'no autorizado' });
    }
  }

  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'faltan variables de entorno' });
  }

  webpush.setVapidDetails('mailto:jhc10_05@hotmail.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const hoy = hoyISO();

  // Alumnos activos con membresía vigente
  const { data: alumnos } = await db
    .from('alumnos')
    .select('username, nombre, enabled, fecha_vencimiento')
    .eq('enabled', true);

  const vigentes = (alumnos || []).filter(a =>
    !a.fecha_vencimiento || a.fecha_vencimiento >= hoy
  );
  if (vigentes.length === 0) {
    return res.status(200).json({ enviados: 0, motivo: 'sin alumnos vigentes' });
  }

  const usuarios = vigentes.map(a => a.username);

  // Quiénes YA registraron algo hoy
  const { data: registrosHoy } = await db
    .from('historial')
    .select('username, kcal_consumidas')
    .eq('fecha', hoy)
    .in('username', usuarios);

  const yaRegistraron = new Set(
    (registrosHoy || [])
      .filter(r => Number(r.kcal_consumidas) > 0)
      .map(r => r.username)
  );

  const pendientes = usuarios.filter(u => !yaRegistraron.has(u));
  if (pendientes.length === 0) {
    return res.status(200).json({ enviados: 0, motivo: 'todos registraron hoy' });
  }

  // Suscripciones activas de esos alumnos
  const { data: subs } = await db
    .from('push_subs')
    .select('*')
    .eq('activa', true)
    .in('username', pendientes);

  let enviados = 0, fallidos = 0;
  const porBorrar = [];

  for (const s of (subs || [])) {
    const alumno = vigentes.find(a => a.username === s.username);
    const nombre = (alumno?.nombre || '').split(' ')[0];
    const cuerpo = MENSAJES[Math.floor(Math.random() * MENSAJES.length)];

    const carga = JSON.stringify({
      titulo: nombre ? `${nombre}, no olvides tu registro` : 'Jonah Beast Fuel',
      cuerpo,
      url: '/',
    });

    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        carga
      );
      enviados++;
    } catch (err) {
      fallidos++;
      // 404 o 410 = la suscripción ya no existe
      if (err.statusCode === 404 || err.statusCode === 410) porBorrar.push(s.endpoint);
    }
  }

  if (porBorrar.length) {
    await db.from('push_subs').update({ activa: false }).in('endpoint', porBorrar);
  }

  return res.status(200).json({
    fecha: hoy,
    alumnosVigentes: vigentes.length,
    pendientesDeRegistrar: pendientes.length,
    enviados,
    fallidos,
  });
}
