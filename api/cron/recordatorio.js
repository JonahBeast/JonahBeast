// api/cron/recordatorio.js
//
// Corre cada hora. En vez de un solo aviso genérico al día, revisa cada
// una de las 5 comidas del alumno (Desayuno, Media mañana, Almuerzo,
// Media tarde, Cena) en su horario típico, y si no la registró, le
// manda un push con la voz de Jonah — a veces un recordatorio simple,
// a veces preguntando cómo va, a veces recordándole su objetivo.
//
// No es texto generado por IA: son plantillas reales con variedad,
// combinadas con datos reales del alumno (su objetivo, si ya registró
// o no esa comida específica).

import { getSupabase, setupWebPush, verificarCronSecret, horaYFechaPeru } from '../_lib/push.js';

// Ventana horaria (hora Perú) en la que se revisa cada comida.
// Si el alumno aún no la registró para esa hora, se le avisa.
const VENTANAS = {
  9: 'Desayuno',
  11: 'Media mañana',
  15: 'Almuerzo',
  17: 'Media tarde',
  21: 'Cena',
};

const NOMBRE_COMIDA = {
  Desayuno: 'tu desayuno',
  'Media mañana': 'tu media mañana',
  Almuerzo: 'tu almuerzo',
  'Media tarde': 'tu media tarde',
  Cena: 'tu cena',
};

// Variedad de tono: recordatorio simple, pregunta cercana, o motivación
// ligada al objetivo real del alumno — nunca el mismo mensaje siempre.
function mensajeJonah(comida, objetivo) {
  const nombre = NOMBRE_COMIDA[comida] || comida;
  const variantes = [
    { title: 'Jonah 🦍', body: `¿Todo bien? Aún no veo ${nombre} registrado(a). Cuéntame cómo vas.` },
    { title: 'Jonah 🦍', body: `No olvides registrar ${nombre} — toma menos de un minuto 💪` },
    { title: 'Jonah 🦍', body: `Un momento para ${nombre}. Recuerda: tú puedes con esto 🔥` },
  ];
  if (objetivo) {
    variantes.push({
      title: 'Jonah 🦍',
      body: `Recuerda tu objetivo: ${objetivo}. Registra ${nombre} y sigamos sumando juntos 🦍🔥`,
    });
  }
  return variantes[Math.floor(Math.random() * variantes.length)];
}

async function enviarPushIndividual(supabase, username, mensaje) {
  const webpush = (await import('web-push')).default;
  const { data: subs } = await supabase
    .from('push_subs').select('*').eq('activa', true).eq('username', username);
  let enviados = 0;
  const fallidos = [];
  // El Service Worker (public/sw.js) espera las claves en español
  // (titulo, cuerpo, url) — deben coincidir exactamente o el mensaje
  // no se muestra y cae al texto genérico por defecto.
  const payload = JSON.stringify({ titulo: mensaje.title, cuerpo: mensaje.body, url: '/' });
  for (const sub of subs || []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      enviados++;
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase.from('push_subs').update({ activa: false }).eq('endpoint', sub.endpoint);
      }
      fallidos.push({ username, error: err.message });
    }
  }
  return { enviados, fallidos };
}

export default async function handler(req, res) {
  if (!verificarCronSecret(req)) return res.status(401).json({ error: 'No autorizado' });

  const supabase = getSupabase();
  setupWebPush();
  const { horaPeru, hoyISO } = horaYFechaPeru();

  const comida = VENTANAS[horaPeru];
  if (!comida) {
    return res.status(200).json({ ok: true, enviados: 0, motivo: 'fuera de horario de comidas' });
  }

  try {
    const { data: alumnos, error } = await supabase
      .from('alumnos').select('username').eq('enabled', true);
    if (error) throw error;
    if (!alumnos || alumnos.length === 0) {
      return res.status(200).json({ ok: true, enviados: 0, motivo: 'sin alumnos activos' });
    }
    const usernames = alumnos.map(a => a.username);

    // El plan de comidas de HOY vive en datos_alumnos (no en historial,
    // que guarda días ya cerrados).
    const { data: datos } = await supabase
      .from('datos_alumnos')
      .select('username, meal_plan, meal_plan_fecha, form')
      .in('username', usernames);

    const objetivoDe = {};
    const conFila = new Set();
    const pendientes = [];

    (datos || []).forEach(d => {
      conFila.add(d.username);
      objetivoDe[d.username] = d.form?.objetivo || null;
      const esHoy = d.meal_plan_fecha === hoyISO;
      const items = esHoy ? (d.meal_plan?.meals?.[comida] || []) : [];
      if (!items.length) pendientes.push(d.username);
    });
    usernames.forEach(u => { if (!conFila.has(u)) pendientes.push(u); });

    if (pendientes.length === 0) {
      return res.status(200).json({ ok: true, enviados: 0, comida, motivo: 'todos ya registraron esa comida' });
    }

    let totalEnviados = 0;
    const fallidosTotal = [];
    for (const u of pendientes) {
      const mensaje = mensajeJonah(comida, objetivoDe[u]);
      const r = await enviarPushIndividual(supabase, u, mensaje);
      totalEnviados += r.enviados;
      fallidosTotal.push(...r.fallidos);
    }

    return res.status(200).json({ ok: true, enviados: totalEnviados, fallidos: fallidosTotal, comida, pendientes: pendientes.length });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
