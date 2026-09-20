// api/cron/control-quincenal.js
//
// Corre una vez al día. Por cada alumno con acceso vigente, calcula
// cuántos días pasaron desde su último control real — el más reciente
// entre: la última vez que registró su peso en el historial, y la
// última foto de progreso que subió (o su fecha de inicio, si nunca
// se ha controlado). Si hoy se cumplen exactamente 15, 30, 45... días
// desde esa fecha, le manda un push recordándole que le toca pesarse,
// medirse y subir sus fotos de progreso.
//
// El conteo se reinicia solo: en cuanto el alumno registra un nuevo
// peso o una nueva foto, "días desde su último control" vuelve a 0,
// así que no se le vuelve a avisar hasta que pasen otros 15 días
// reales desde ESE control — no desde una fecha fija de calendario.
//
// Mismo patrón de envío en paralelo que api/cron/recordatorio.js, para
// no repetir el problema de timeout de Vercel con muchos alumnos.

import { getSupabase, setupWebPush, verificarCronSecret, horaYFechaPeru, diasDesde } from '../_lib/push.js';

const INTERVALO_DIAS = 15;

function mensajeControl() {
  const variantes = [
    { title: 'Jonah 🦍', body: 'Hoy te toca tu control quincenal: pésate, mídete y sube tus fotos de progreso 📸' },
    { title: 'Jonah 🦍', body: 'Cada 15 días es momento de revisar cómo vas de verdad — pésate y actualiza tus fotos 💪' },
    { title: 'Jonah 🦍', body: 'Toca control: registra tu peso y sube tus fotos de progreso. Así vemos juntos cómo avanzas 🦍' },
    { title: 'Jonah 🦍', body: 'Han pasado 15 días desde tu último control — buen momento para medirte y fotografiarte otra vez 📸' },
  ];
  return variantes[Math.floor(Math.random() * variantes.length)];
}

// Envía todos los push de la tanda en paralelo, con una sola consulta
// de suscripciones — igual que recordatorio.js, para evitar el
// timeout de 300s si hay muchos alumnos en control el mismo día.
async function enviarLote(supabase, targets) {
  if (!targets.length) return { enviados: 0, fallidos: 0, detalleFallos: [] };
  const usernames = [...new Set(targets.map(t => t.username))];
  const { data: subs } = await supabase.from('push_subs').select('*').eq('activa', true).in('username', usernames);

  const subsPorUser = {};
  (subs || []).forEach(s => { (subsPorUser[s.username] = subsPorUser[s.username] || []).push(s); });

  const webpush = (await import('web-push')).default;
  const tareas = [];
  for (const { username, mensaje } of targets) {
    const payload = JSON.stringify({ titulo: mensaje.title, cuerpo: mensaje.body, url: '/' });
    for (const sub of subsPorUser[username] || []) {
      tareas.push(
        webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
          .then(() => ({ ok: true, username }))
          .catch(err => {
            console.error(`Push fallido para ${username} (endpoint ...${sub.endpoint.slice(-20)}): statusCode=${err.statusCode} body=${err.body || err.message}`);
            return { ok: false, endpoint: sub.endpoint, username, statusCode: err.statusCode, mensaje: err.body || err.message };
          })
      );
    }
  }

  const resultados = await Promise.allSettled(tareas);
  let enviados = 0;
  const endpointsInvalidos = [];
  const detalleFallos = [];
  resultados.forEach(r => {
    if (r.status === 'fulfilled' && r.value.ok) { enviados++; return; }
    const val = r.status === 'fulfilled' ? r.value : { ok: false, mensaje: String(r.reason) };
    detalleFallos.push({ username: val.username, statusCode: val.statusCode, mensaje: val.mensaje });
    // Igual que en recordatorio.js: solo se desactiva la suscripción
    // si el dispositivo ya no existe (410/404), no ante cualquier error.
    if (val.statusCode === 410 || val.statusCode === 404) endpointsInvalidos.push(val.endpoint);
  });
  if (endpointsInvalidos.length) {
    await supabase.from('push_subs').update({ activa: false }).in('endpoint', endpointsInvalidos);
  }
  return { enviados, fallidos: detalleFallos.length, detalleFallos };
}

export default async function handler(req, res) {
  if (!verificarCronSecret(req)) return res.status(401).json({ error: 'No autorizado' });

  const supabase = getSupabase();
  setupWebPush();
  const { hoyISO } = horaYFechaPeru();

  try {
    const { data: alumnos, error } = await supabase
      .from('alumnos').select('username, fecha_inicio')
      .eq('enabled', true).gte('fecha_vencimiento', hoyISO);
    if (error) throw error;
    if (!alumnos || alumnos.length === 0) {
      return res.status(200).json({ ok: true, enviados: 0, motivo: 'sin alumnos con acceso vigente' });
    }
    const usernames = alumnos.map(a => a.username);
    const inicioDe = {};
    alumnos.forEach(a => { inicioDe[a.username] = a.fecha_inicio; });

    // Último peso registrado por alumno (fecha más reciente con peso no nulo).
    const { data: pesos } = await supabase
      .from('historial').select('username, fecha, peso')
      .in('username', usernames).not('peso', 'is', null)
      .order('fecha', { ascending: false });
    const ultimoPesoDe = {};
    (pesos || []).forEach(r => { if (!ultimoPesoDe[r.username]) ultimoPesoDe[r.username] = r.fecha; });

    // Última foto de progreso por alumno.
    const { data: fotos } = await supabase
      .from('fotos_progreso').select('username, fecha')
      .in('username', usernames)
      .order('fecha', { ascending: false });
    const ultimaFotoDe = {};
    (fotos || []).forEach(r => { if (!ultimaFotoDe[r.username]) ultimaFotoDe[r.username] = r.fecha; });

    const targets = [];
    for (const u of usernames) {
      // La fecha de referencia es la más reciente entre peso, foto o
      // inicio de membresía (para alumnos que nunca se han controlado).
      // Las fechas ISO ordenan bien como texto, así que un sort simple
      // basta para encontrar la más reciente.
      const candidatas = [ultimoPesoDe[u], ultimaFotoDe[u], inicioDe[u]].filter(Boolean).sort();
      if (!candidatas.length) continue;
      const ultimoControl = candidatas[candidatas.length - 1];
      const dias = diasDesde(ultimoControl, hoyISO);
      if (dias > 0 && dias % INTERVALO_DIAS === 0) {
        targets.push({ username: u, mensaje: mensajeControl() });
      }
    }

    const r = await enviarLote(supabase, targets);
    return res.status(200).json({ ok: true, ...r, tipo: 'control_quincenal', candidatos: targets.length });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
