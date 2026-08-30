// api/cron/recordatorio.js
//
// Corre cada hora. Revisa cada una de las 5 comidas del alumno
// (Desayuno, Media mañana, Almuerzo, Media tarde, Cena) en su horario
// típico, y si no la registró, le manda un push con la voz de Jonah —
// a veces un recordatorio simple, a veces preguntando cómo va, a veces
// recordándole su objetivo. Al mediodía y a media tarde manda además
// un aviso aparte de hidratación (2 al día). Y dos veces al día (2pm
// y 8pm) revisa TODO lo que ya pasó de hora y sigue sin registrar, y
// manda un solo mensaje de aliento agrupando lo pendiente — "no te
// rindas, aún puedes registrarlo" — en vez de uno por cada comida
// atrasada, para que se sienta como acompañamiento y no como spam.
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

// Ventana horaria (hora Perú) en la que se revisa cada comida a tiempo.
const VENTANAS = {
  9: 'Desayuno',
  11: 'Media mañana',
  13: 'Almuerzo',
  17: 'Media tarde',
  21: 'Cena',
};

// Horas de hidratación — separadas de las de comida, 2 veces al día.
const HORAS_HIDRATACION = [12, 16];

// Horas de "chequeo de ánimo": revisa todo lo que ya pasó de hora y
// sigue pendiente, y manda un solo mensaje agrupado con tono de "no
// te rindas, sigo contigo" — no un recordatorio más, sino un aliento.
const HORAS_ANIMO = [14, 20];

const NOMBRE_COMIDA = {
  Desayuno: 'tu desayuno',
  'Media mañana': 'tu media mañana',
  Almuerzo: 'tu almuerzo',
  'Media tarde': 'tu media tarde',
  Cena: 'tu cena',
};

// Variantes de mensaje por comida — tono de acompañante, no de regaño.
function mensajeJonah(comida, objetivo, horaPeru) {
  const nombre = NOMBRE_COMIDA[comida] || comida;
  const horaAmPm = horaPeru > 12 ? `${horaPeru - 12} pm` : `${horaPeru} ${horaPeru === 12 ? 'pm' : 'am'}`;
  const variantes = [
    { title: 'Jonah 🦍', body: `¿Todo bien? Aún no veo ${nombre} registrado(a). Cuéntame cómo vas.` },
    { title: 'Jonah 🦍', body: `No olvides registrar ${nombre} — toma menos de un minuto 💪` },
    { title: 'Jonah 🦍', body: `Son las ${horaAmPm}, ¿ya comiste? No olvides registrar ${nombre}.` },
    { title: 'Jonah 🦍', body: `Estoy contigo, acompañándote en tu proceso. Registra ${nombre} y seguimos 🦍` },
    { title: 'Jonah 🦍', body: `¿Cómo va tu día? Aún no veo ${nombre} — cuéntame qué tal vas.` },
    { title: 'Jonah 🦍', body: `Jonah siempre está pendiente de ti 🦍 — registra ${nombre} cuando puedas.` },
  ];
  if (objetivo) {
    variantes.push({
      title: 'Jonah 🦍',
      body: `Recuerda tu objetivo: ${objetivo}. Registra ${nombre} y sigamos sumando juntos 🦍🔥`,
    });
  }
  return variantes[Math.floor(Math.random() * variantes.length)];
}

// Mensajes de hidratación — dos avisos al día, meta real 2-3 litros.
function mensajeHidratacion() {
  const variantes = [
    { title: 'Jonah 🦍', body: 'No olvides la importancia de hidratarte: toma mínimo 2 a 3 litros de agua al día 💧' },
    { title: 'Jonah 🦍', body: '¿Cómo vas con el agua hoy? Recuerda llegar a tus 2-3 litros diarios.' },
    { title: 'Jonah 🦍', body: 'Un buen momento para tomar agua. Jonah siempre estará al pendiente de ti 🦍' },
    { title: 'Jonah 🦍', body: 'Hidratarte bien también es parte de tu objetivo. Vamos, un vaso más 💧' },
  ];
  return variantes[Math.floor(Math.random() * variantes.length)];
}

// Mensaje de ánimo agrupado — cuando ya pasó la hora de una o más
// comidas y siguen sin registrarse. Nunca regaña, siempre acompaña.
function mensajeAnimo(nombresPendientes) {
  const lista = nombresPendientes.join(', ');
  const variantes = [
    { title: 'Jonah 🦍', body: `No te rindas, yo siempre estoy contigo. Aún puedes registrar: ${lista}. Nunca es tarde 💪` },
    { title: 'Jonah 🦍', body: `Sé que el día se puede complicar. Cuando puedas, registra: ${lista} — aquí sigo, contigo 🦍` },
    { title: 'Jonah 🦍', body: `Un momento libre y seguimos: aún puedes registrar ${lista}. Tú puedes con esto 🔥` },
    { title: 'Jonah 🦍', body: `No pasa nada si se te fue la hora. Registra ${lista} cuando puedas — Jonah no se rinde contigo 🦍` },
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
    // Solo alumnos con acceso vigente hoy.
    const { data: alumnos, error } = await supabase
      .from('alumnos').select('username')
      .eq('enabled', true)
      .gte('fecha_vencimiento', hoyISO);
    if (error) throw error;
    if (!alumnos || alumnos.length === 0) {
      return res.status(200).json({ ok: true, enviados: 0, motivo: 'sin alumnos con acceso vigente' });
    }
    const usernames = alumnos.map(a => a.username);

    // Hidratación: dos veces al día.
    if (HORAS_HIDRATACION.includes(horaPeru)) {
      let totalEnviados = 0;
      const fallidosTotal = [];
      for (const u of usernames) {
        const r = await enviarPushIndividual(supabase, u, mensajeHidratacion());
        totalEnviados += r.enviados;
        fallidosTotal.push(...r.fallidos);
      }
      return res.status(200).json({ ok: true, enviados: totalEnviados, fallidos: fallidosTotal, tipo: 'hidratacion', horaPeru });
    }

    // Chequeo de ánimo: agrupa TODAS las comidas cuya hora ya pasó y
    // siguen sin registrar, y manda un solo mensaje por alumno.
    if (HORAS_ANIMO.includes(horaPeru)) {
      const { data: datos } = await supabase
        .from('datos_alumnos')
        .select('username, meal_plan, meal_plan_fecha')
        .in('username', usernames);

      const horasYaPasadas = Object.keys(VENTANAS).map(Number).filter(h => h < horaPeru);
      let totalEnviados = 0;
      const fallidosTotal = [];
      let alumnosConAnimo = 0;

      for (const u of usernames) {
        const fila = (datos || []).find(d => d.username === u);
        const esHoy = fila && fila.meal_plan_fecha === hoyISO;
        const pendientes = [];
        for (const h of horasYaPasadas) {
          const comida = VENTANAS[h];
          const items = esHoy ? (fila.meal_plan?.meals?.[comida] || []) : [];
          if (!items.length) pendientes.push(NOMBRE_COMIDA[comida]);
        }
        if (pendientes.length === 0) continue;
        alumnosConAnimo++;
        const r = await enviarPushIndividual(supabase, u, mensajeAnimo(pendientes));
        totalEnviados += r.enviados;
        fallidosTotal.push(...r.fallidos);
      }

      return res.status(200).json({ ok: true, enviados: totalEnviados, fallidos: fallidosTotal, tipo: 'animo', horaPeru, alumnosConAnimo });
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
