// api/cron/activa-tu-perfil.js
//
// Corre una vez al día. Si un alumno lleva exactamente 1, 2 o 3 días
// desde que se registró y todavía no completó sus medidas y objetivo
// (datos_alumnos.form vacío o sin objetivo), le manda un push
// motivador de Jonah para que arranque. Un mensaje distinto por día,
// cada vez con un poco más de cercanía — no se repite después del
// día 3, para no sentirse insistente.

import { getSupabase, setupWebPush, verificarCronSecret, horaYFechaPeru, diasDesde } from '../_lib/push.js';

const MENSAJES = {
  1: { title: 'Jonah 🦍', body: 'Hola, soy Jonah — vi que aún no completaste tus medidas. Toma solo 2 minutos, y ahí empezamos a trabajar juntos en tu objetivo 💪' },
  2: { title: 'Jonah 🦍', body: 'Sigo aquí, esperándote. Cuando estés listo, solo entra y completa tus medidas — sin apuro, pero quiero ayudarte a arrancar 🔥' },
  3: { title: 'Jonah 🦍', body: 'No dejes que se te pase esta oportunidad. Un par de minutos y arrancamos tu cambio real. Aquí estoy cuando quieras 🦍💪' },
};

// Mismo envío en paralelo que el resto de los crons de notificaciones,
// para no repetir el problema de timeout con muchos alumnos a la vez.
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
      .eq('enabled', true);
    if (error) throw error;
    if (!alumnos || alumnos.length === 0) {
      return res.status(200).json({ ok: true, enviados: 0, motivo: 'sin alumnos activos' });
    }

    // Solo nos importan los que llevan exactamente 1, 2 o 3 días.
    const candidatos = alumnos.filter(a => a.fecha_inicio && [1, 2, 3].includes(diasDesde(a.fecha_inicio, hoyISO)));
    if (candidatos.length === 0) {
      return res.status(200).json({ ok: true, enviados: 0, motivo: 'nadie en su día 1, 2 o 3 hoy' });
    }

    const usernames = candidatos.map(a => a.username);
    const { data: datos } = await supabase
      .from('datos_alumnos').select('username, form').in('username', usernames);
    const completoDe = {};
    (datos || []).forEach(d => { completoDe[d.username] = !!(d.form && d.form.objetivo); });

    const targets = [];
    for (const a of candidatos) {
      if (completoDe[a.username]) continue; // ya completó medidas y objetivo, no le insistimos
      const dia = diasDesde(a.fecha_inicio, hoyISO);
      targets.push({ username: a.username, mensaje: MENSAJES[dia] });
    }

    const r = await enviarLote(supabase, targets);
    return res.status(200).json({ ok: true, ...r, tipo: 'activa_tu_perfil', candidatos: targets.length });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
