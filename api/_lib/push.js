// api/_lib/push.js
//
// Funciones compartidas entre los 4 cron jobs de notificaciones, para no
// repetir la configuración de Supabase/VAPID en cada archivo.

import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

export function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function setupWebPush() {
  webpush.setVapidDetails(
    'mailto:soporte@jonahbeast.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export function verificarCronSecret(req) {
  if (!process.env.CRON_SECRET) return true;
  const auth = req.headers['authorization'];
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

/* Hora y fecha actual en Perú (UTC-5, sin horario de verano) */
export function horaYFechaPeru() {
  const ahoraUTC = new Date();
  const horaPeru = (ahoraUTC.getUTCHours() - 5 + 24) % 24;
  const hoyISO = new Date(ahoraUTC.getTime() - 5 * 3600 * 1000).toISOString().slice(0, 10);
  return { horaPeru, hoyISO };
}

export function addDaysISO(iso, dias) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + dias));
  return dt.toISOString().slice(0, 10);
}

/* Día de la semana en Perú (0=domingo, 1=lunes, ... 6=sábado) */
export function diaSemanaPeru(hoyISO) {
  const [y, m, d] = hoyISO.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/* Días transcurridos desde una fecha (para aniversarios de uso) */
export function diasDesde(fechaISO, hoyISO) {
  const [y1, m1, d1] = fechaISO.split('-').map(Number);
  const [y2, m2, d2] = hoyISO.split('-').map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86400000);
}

/* Mismo cálculo de "número de semana del año" que usa el frontend
   (App.jsx → numeroDeSemana), para que ambos coincidan en qué semana es. */
export function numeroDeSemana(hoyISO) {
  const [y, m, d] = hoyISO.split('-').map(Number);
  const hoy = new Date(Date.UTC(y, m - 1, d));
  const inicio = new Date(Date.UTC(y, 0, 1));
  return Math.floor((hoy - inicio) / (7 * 86400000));
}

/* Envía un push a la lista de usernames indicada, con el texto dado.
   Desactiva automáticamente las suscripciones que ya no son válidas. */
export async function enviarPushA(supabase, usernames, { title, body }) {
  if (!usernames.length) return { enviados: 0, fallidos: [] };

  const { data: subs } = await supabase
    .from('push_subs')
    .select('*')
    .eq('activa', true)
    .in('username', usernames);

  let enviados = 0;
  const fallidos = [];
  // El Service Worker (public/sw.js) espera las claves en español
  // (titulo, cuerpo, url) — deben coincidir exactamente o el mensaje
  // no se muestra y cae al texto genérico por defecto.
  const payload = JSON.stringify({ titulo: title, cuerpo: body, url: '/' });

  for (const sub of subs || []) {
    try {
      const webpush = (await import('web-push')).default;
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      enviados++;
    } catch (err) {
      // Antes esto se guardaba en silencio. Ahora queda registrado con
      // el detalle real (código y cuerpo del error de Apple/Google).
      console.error(`Push fallido para ${sub.username} (endpoint ...${sub.endpoint.slice(-20)}): statusCode=${err.statusCode} body=${err.body || err.message}`);
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase.from('push_subs').update({ activa: false }).eq('endpoint', sub.endpoint);
      }
      fallidos.push({ username: sub.username, statusCode: err.statusCode, error: err.body || err.message });
    }
  }
  return { enviados, fallidos };
}

/* Calcula la racha de días consecutivos con comidas registradas para un
   conjunto de alumnos, igual que la lógica del frontend (RachaCard). */
export async function calcularRachas(supabase, usernames, hoyISO) {
  if (!usernames.length) return {};
  const desde = addDaysISO(hoyISO, -60);
  const { data } = await supabase
    .from('historial')
    .select('username, fecha, comidas_count')
    .in('username', usernames)
    .gte('fecha', desde);

  const porUsuario = {};
  (data || []).forEach(r => {
    porUsuario[r.username] = porUsuario[r.username] || {};
    porUsuario[r.username][r.fecha] = Number(r.comidas_count) || 0;
  });

  const rachas = {};
  for (const u of usernames) {
    const dias = porUsuario[u] || {};
    const registro = iso => (dias[iso] || 0) > 0;
    const hoyRegistro = registro(hoyISO);
    let racha = 0;
    let cursor = hoyRegistro ? hoyISO : addDaysISO(hoyISO, -1);
    while (registro(cursor)) { racha++; cursor = addDaysISO(cursor, -1); }
    rachas[u] = { racha, registroHoy: hoyRegistro };
  }
  return rachas;
}
