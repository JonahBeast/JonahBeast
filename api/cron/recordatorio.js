// api/cron/recordatorio.js
//
// Corre cada hora. Revisa cada una de las 5 comidas del alumno
// (Desayuno, Media mañana, Almuerzo, Media tarde, Cena) en su horario
// típico, y si no la registró, le manda un push con la voz de Jonah —
// a veces un recordatorio simple, a veces preguntando cómo va, a veces
// recordándole su objetivo. A mediodía manda además un aviso aparte
// de hidratación, sin depender de si registró o no una comida.
//
// Solo se envía a alumnos con acceso vigente (enabled=true y su plan
// o prueba gratis no vencidos). Así, cuando alguien se va sin renovar,
// Jonah deja de escribirle — es justo ese silencio el que hace que se
// note su ausencia, en vez de sentirse como spam después de irse.
//
// No es texto generado por IA: son plantillas reales con variedad,
// combinadas con datos reales del alumno (su objetivo, si ya registró
// o no esa comida específica).

import { getSupabase, setupWebPush, verificarCronSecret, horaYFechaPeru } from '../_lib/push.js';

// Ventana horaria (hora Perú) en la que se revisa cada comida.
const VENTANAS = {
  9: 'Desayuno',
  11: 'Media mañana',
  13: 'Almuerzo',
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

// Variantes de mensaje por comida — tono de acompañante, no de regaño.
// Incluye alguna pregunta directa por hora ("Son las 3, ¿almorzaste?")
// tal como lo pediría un coach real que está pendiente de ti.
function mensajeJonah(comida, objetivo, horaPeru) {
  const nombre = NOMBRE_COMIDA[comida] || comida;
  const horaAmPm = horaPeru > 12 ? `${horaPeru - 12} pm` : `${horaPeru} ${horaPeru === 12 ? 'pm' : 'am'}`;
  const variantes = [
    { title: 'Jonah 🦍', body: `¿Todo bien? Aún no veo ${nombre} registrado(a). Cuéntame cómo vas.` },
    { title: 'Jonah 🦍', body: `No olvides registrar ${nombre} — toma menos de un minuto 💪` },
    { title: 'Jonah 🦍', body: `Son las ${horaAmPm}, ¿ya comiste? No olvides registrar ${nombre}.` },
    { title: 'Jonah 🦍', body: `Estoy contigo, acompañándote en tu proceso. Registra ${nombre} y seguimos 🦍` },
    { title: 'Jonah 🦍', body: `¿Cómo va tu día? Aún no veo ${nombre} — cuéntame qué tal vas.` },
  ];
  if (objetivo) {
    variantes.push({
      title: 'Jonah 🦍',
      body: `Recuerda tu objetivo: ${objetivo}. Registra ${nombre} y sigamos sumando juntos 🦍🔥`,
    });
  }
  return variantes[Math.floor(Math.random() * variantes.length)];
}

// Mensaje de hidratación — un chequeo que no depende de las comidas,
// solo de que Jonah está pendiente de ti durante el día.
function mensajeHidratacion() {
  const variantes = [
    { title: 'Jonah 🦍', body: 'No olvides hidratarte — un vaso de agua ahora mismo te cae bien 💧' },
    { title: 'Jonah 🦍', body: '¿Ya tomaste agua hoy? Pequeños hábitos como este también suman.' },
    { title: 'Jonah 🦍', body: 'Jonah siempre está pendiente de ti 🦍 — recuerda tomar agua durante el día.' },
  ];
  return variantes[Math.floor(Math.random() * variantes.length)];
}

async function enviarPushIndividual(supabase, username, mensaje) {
  const webpush = (await import('web-push')).default;
  const { data: subs } = await supabase
    .from('push_subs').select('*').eq('activa', true).eq('username', username);
  let enviados = 0;
  const fallidos = [];
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

  try {
    // Solo alumnos con acceso vigente hoy — trial o plan pago aún no
    // vencido. En cuanto vencen sin renovar, dejan de recibir push.
    const { data: alumnos, error } = await supabase
      .from('alumnos').select('username')
      .eq('enabled', true)
      .gte('fecha_vencimiento', hoyISO);
    if (error) throw error;
    if (!alumnos || alumnos.length === 0) {
      return res.status(200).json({ ok: true, enviados: 0, motivo: 'sin alumnos con acceso vigente' });
    }
    const usernames = alumnos.map(a => a.username);

    // Mediodía: aviso de hidratación aparte, a todos los alumnos vigentes.
    if (horaPeru === 12) {
      let totalEnviados = 0;
      const fallidosTotal = [];
      for (const u of usernames) {
        const r = await enviarPushIndividual(supabase, u, mensajeHidratacion());
        totalEnviados += r.enviados;
        fallidosTotal.push(...r.fallidos);
      }
      return res.status(200).json({ ok: true, enviados: totalEnviados, fallidos: fallidosTotal, tipo: 'hidratacion' });
    }

    const comida = VENTANAS[horaPeru];
    if (!comida) {
      return res.status(200).json({ ok: true, enviados: 0, motivo: 'fuera de horario de comidas' });
    }

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
      const mensaje = mensajeJonah(comida, objetivoDe[u], horaPeru);
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
