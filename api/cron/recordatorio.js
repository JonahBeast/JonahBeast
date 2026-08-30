// api/cron/recordatorio.js
//
// Corre cada hora. Revisa cada una de las 5 comidas del alumno
// (Desayuno, Media mañana, Almuerzo, Media tarde, Cena) en su horario
// típico, y si no la registró, le manda un push con la voz de Jonah.
// Además: hidratación (2x al día), un chequeo de ánimo agrupado (2pm
// y 8pm) para lo que ya pasó de hora y sigue pendiente, un saludo de
// buenos días (7am) y un mensaje de buenas noches (10pm) — estos dos
// últimos no dependen de nada, solo de que Jonah está pendiente de ti
// todos los días, empiece o termine como termine el día.
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

// Chequeo de ánimo agrupado: revisa todo lo que ya pasó de hora y
// sigue pendiente, con tono de "no te rindas, sigo contigo".
const HORAS_ANIMO = [14, 20];

// Saludo de buenos días y mensaje de buenas noches — una vez al día
// cada uno, a todos los alumnos vigentes, sin depender de comidas.
const HORA_BUENOS_DIAS = 7;
const HORA_BUENAS_NOCHES = 22;

const NOMBRE_COMIDA = {
  Desayuno: 'tu desayuno',
  'Media mañana': 'tu media mañana',
  Almuerzo: 'tu almuerzo',
  'Media tarde': 'tu media tarde',
  Cena: 'tu cena',
};

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

function mensajeHidratacion() {
  const variantes = [
    { title: 'Jonah 🦍', body: 'No olvides la importancia de hidratarte: toma mínimo 2 a 3 litros de agua al día 💧' },
    { title: 'Jonah 🦍', body: '¿Cómo vas con el agua hoy? Recuerda llegar a tus 2-3 litros diarios.' },
    { title: 'Jonah 🦍', body: 'Un buen momento para tomar agua. Jonah siempre estará al pendiente de ti 🦍' },
    { title: 'Jonah 🦍', body: 'Hidratarte bien también es parte de tu objetivo. Vamos, un vaso más 💧' },
  ];
  return variantes[Math.floor(Math.random() * variantes.length)];
}

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

// Saludo de la mañana — a veces genérico, a veces ligado a su objetivo
// real si lo tiene configurado.
function mensajeBuenosDias(objetivo) {
  const variantes = [
    { title: 'Jonah 🦍', body: '¡Buenos días! Hoy es un gran día para seguir construyendo tu mejor versión. Aquí estoy, contigo 🦍' },
    { title: 'Jonah 🦍', body: 'Buenos días 🌅 Que este día te traiga fuerza y buenas decisiones. Jonah está contigo.' },
    { title: 'Jonah 🦍', body: '¡Arriba! 🦍 Un nuevo día para acercarte a tu objetivo. Vamos con todo.' },
    { title: 'Jonah 🦍', body: 'Buenos días. Hoy también voy a estar pendiente de ti — que sea un gran día 🔥' },
  ];
  if (objetivo) {
    variantes.push({
      title: 'Jonah 🦍',
      body: `Buenos días. Hoy sigamos trabajando en tu objetivo: ${objetivo} 🦍🔥`,
    });
  }
  return variantes[Math.floor(Math.random() * variantes.length)];
}

// Mensaje de buenas noches — cálido, casi como despedida de un
// acompañante real, no un aviso más.
function mensajeBuenasNoches() {
  const variantes = [
    { title: 'Jonah 🦍', body: 'Buenas noches 🌙 Descansa bien — yo cuido tus sueños. Mañana seguimos juntos 🦍' },
    { title: 'Jonah 🦍', body: 'Que descanses. El esfuerzo de hoy ya es parte de tu progreso. Buenas noches 🌙' },
    { title: 'Jonah 🦍', body: 'Duerme bien, te lo mereces. Jonah está pendiente de ti hasta mañana 🦍💤' },
    { title: 'Jonah 🦍', body: 'Otro día más caminando juntos. Descansa — mañana seguimos 🌙🦍' },
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
    const { data: alumnos, error } = await supabase
      .from('alumnos').select('username')
      .eq('enabled', true)
      .gte('fecha_vencimiento', hoyISO);
    if (error) throw error;
    if (!alumnos || alumnos.length === 0) {
      return res.status(200).json({ ok: true, enviados: 0, motivo: 'sin alumnos con acceso vigente' });
    }
    const usernames = alumnos.map(a => a.username);

    // Buenos días — una vez al día, a todos los alumnos vigentes.
    if (horaPeru === HORA_BUENOS_DIAS) {
      const { data: datos } = await supabase
        .from('datos_alumnos').select('username, form').in('username', usernames);
      const objetivoDe = {};
      (datos || []).forEach(d => { objetivoDe[d.username] = d.form?.objetivo || null; });

      let totalEnviados = 0;
      const fallidosTotal = [];
      for (const u of usernames) {
        const r = await enviarPushIndividual(supabase, u, mensajeBuenosDias(objetivoDe[u]));
        totalEnviados += r.enviados;
        fallidosTotal.push(...r.fallidos);
      }
      return res.status(200).json({ ok: true, enviados: totalEnviados, fallidos: fallidosTotal, tipo: 'buenos_dias' });
    }

    // Buenas noches — una vez al día, a todos los alumnos vigentes.
    if (horaPeru === HORA_BUENAS_NOCHES) {
      let totalEnviados = 0;
      const fallidosTotal = [];
      for (const u of usernames) {
        const r = await enviarPushIndividual(supabase, u, mensajeBuenasNoches());
        totalEnviados += r.enviados;
        fallidosTotal.push(...r.fallidos);
      }
      return res.status(200).json({ ok: true, enviados: totalEnviados, fallidos: fallidosTotal, tipo: 'buenas_noches' });
    }

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
