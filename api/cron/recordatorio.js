// api/cron/recordatorio.js
//
// Corre cada hora. Revisa cada una de las 5 comidas del alumno
// (Desayuno, Media mañana, Almuerzo, Media tarde, Cena) en su horario
// típico, y si no la registró, le manda un push con la voz de Jonah.
// Además: hidratación (2x al día), un chequeo de ánimo agrupado (2pm
// y 8pm), un saludo de buenos días (7am, con variante de lunes y de
// aniversario de uso) y un mensaje de buenas noches (10pm).
//
// IMPORTANTE — rendimiento: todos los envíos de una misma ejecución se
// mandan EN PARALELO (Promise.allSettled) con una sola consulta de
// suscripciones, no uno por uno en fila. Antes, con varios tipos de
// aviso y varios dispositivos por alumno, la función tardaba tanto que
// Vercel la cortaba a los 300s sin terminar de enviar — así nadie
// recibía nada. Este cambio soluciona eso de raíz.
//
// Solo se envía a alumnos con acceso vigente (enabled=true y su plan
// o prueba gratis no vencidos).

import { getSupabase, setupWebPush, verificarCronSecret, horaYFechaPeru, diaSemanaPeru, diasDesde } from '../_lib/push.js';

const VENTANAS = { 9: 'Desayuno', 11: 'Media mañana', 13: 'Almuerzo', 17: 'Media tarde', 21: 'Cena' };
const HORAS_HIDRATACION = [12, 16];
const HORAS_ANIMO = [14, 20];
const HORA_BUENOS_DIAS = 7;
const HORA_BUENAS_NOCHES = 22;

const NOMBRE_COMIDA = {
  Desayuno: 'tu desayuno', 'Media mañana': 'tu media mañana', Almuerzo: 'tu almuerzo',
  'Media tarde': 'tu media tarde', Cena: 'tu cena',
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
    variantes.push({ title: 'Jonah 🦍', body: `Recuerda tu objetivo: ${objetivo}. Registra ${nombre} y sigamos sumando juntos 🦍🔥` });
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

function mensajeBuenosDias(objetivo, esLunes, diasDeUso) {
  if (diasDeUso && diasDeUso > 0 && diasDeUso % 30 === 0) {
    return { title: 'Jonah 🦍', body: `¡Hoy cumples ${diasDeUso} días con Jonah Beast Fuel! 🎉 Gracias por tu constancia — vamos por más 🦍🔥` };
  }
  if (esLunes) {
    const variantesLunes = [
      { title: 'Jonah 🦍', body: 'Buenos días, arrancamos la semana 🦍 Lo que pasó el fin de semana ya quedó atrás — hoy empezamos de nuevo, juntos.' },
      { title: 'Jonah 🦍', body: 'Nueva semana, nueva oportunidad 🔥 No importa cómo cerró la anterior. Vamos con todo, aquí estoy contigo.' },
      { title: 'Jonah 🦍', body: 'Lunes de reinicio 🦍 Cada semana es una página en blanco. Empecemos bien, yo te acompaño.' },
    ];
    return variantesLunes[Math.floor(Math.random() * variantesLunes.length)];
  }
  const variantes = [
    { title: 'Jonah 🦍', body: '¡Buenos días! Hoy es un gran día para seguir construyendo tu mejor versión. Aquí estoy, contigo 🦍' },
    { title: 'Jonah 🦍', body: 'Buenos días 🌅 Que este día te traiga fuerza y buenas decisiones. Jonah está contigo.' },
    { title: 'Jonah 🦍', body: '¡Arriba! 🦍 Un nuevo día para acercarte a tu objetivo. Vamos con todo.' },
    { title: 'Jonah 🦍', body: 'Buenos días. Hoy también voy a estar pendiente de ti — que sea un gran día 🔥' },
  ];
  if (objetivo) {
    variantes.push({ title: 'Jonah 🦍', body: `Buenos días. Hoy sigamos trabajando en tu objetivo: ${objetivo} 🦍🔥` });
  }
  return variantes[Math.floor(Math.random() * variantes.length)];
}

function mensajeBuenasNoches() {
  const variantes = [
    { title: 'Jonah 🦍', body: 'Buenas noches 🌙 Descansa bien — yo cuido tus sueños. Mañana seguimos juntos 🦍' },
    { title: 'Jonah 🦍', body: 'Que descanses. El esfuerzo de hoy ya es parte de tu progreso. Buenas noches 🌙' },
    { title: 'Jonah 🦍', body: 'Duerme bien, te lo mereces. Jonah está pendiente de ti hasta mañana 🦍💤' },
    { title: 'Jonah 🦍', body: 'Otro día más caminando juntos. Descansa — mañana seguimos 🌙🦍' },
  ];
  return variantes[Math.floor(Math.random() * variantes.length)];
}

// Envía TODOS los mensajes de una tanda en paralelo, con una sola
// consulta de suscripciones — esto es lo que evita el timeout.
// targets: [{ username, mensaje: {title, body} }]
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
            // Antes esto se guardaba en silencio. Ahora queda registrado
            // con el detalle real (código y mensaje) para poder
            // diagnosticar sin adivinar.
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
    // Solo se desactiva la suscripción si el dispositivo ya no existe
    // (410/404) — un 401/403 es un problema de configuración nuestra
    // (llaves VAPID), no de la suscripción, así que no se borra.
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
  const { horaPeru, hoyISO } = horaYFechaPeru();

  try {
    const { data: alumnos, error } = await supabase
      .from('alumnos').select('username')
      .eq('enabled', true).gte('fecha_vencimiento', hoyISO);
    if (error) throw error;
    if (!alumnos || alumnos.length === 0) {
      return res.status(200).json({ ok: true, enviados: 0, motivo: 'sin alumnos con acceso vigente' });
    }
    const usernames = alumnos.map(a => a.username);

    // Buenos días
    if (horaPeru === HORA_BUENOS_DIAS) {
      const [{ data: datos }, { data: fechas }] = await Promise.all([
        supabase.from('datos_alumnos').select('username, form').in('username', usernames),
        supabase.from('alumnos').select('username, fecha_inicio').in('username', usernames),
      ]);
      const objetivoDe = {}; (datos || []).forEach(d => { objetivoDe[d.username] = d.form?.objetivo || null; });
      const inicioDe = {}; (fechas || []).forEach(a => { inicioDe[a.username] = a.fecha_inicio; });
      const esLunes = diaSemanaPeru(hoyISO) === 1;

      const targets = usernames.map(u => ({
        username: u,
        mensaje: mensajeBuenosDias(objetivoDe[u], esLunes, inicioDe[u] ? diasDesde(inicioDe[u], hoyISO) : 0),
      }));
      const r = await enviarLote(supabase, targets);
      return res.status(200).json({ ok: true, ...r, tipo: 'buenos_dias', esLunes });
    }

    // Buenas noches
    if (horaPeru === HORA_BUENAS_NOCHES) {
      const targets = usernames.map(u => ({ username: u, mensaje: mensajeBuenasNoches() }));
      const r = await enviarLote(supabase, targets);
      return res.status(200).json({ ok: true, ...r, tipo: 'buenas_noches' });
    }

    // Hidratación
    if (HORAS_HIDRATACION.includes(horaPeru)) {
      const targets = usernames.map(u => ({ username: u, mensaje: mensajeHidratacion() }));
      const r = await enviarLote(supabase, targets);
      return res.status(200).json({ ok: true, ...r, tipo: 'hidratacion', horaPeru });
    }

    // Chequeo de ánimo agrupado
    if (HORAS_ANIMO.includes(horaPeru)) {
      const { data: datos } = await supabase
        .from('datos_alumnos').select('username, meal_plan, meal_plan_fecha').in('username', usernames);
      const horasYaPasadas = Object.keys(VENTANAS).map(Number).filter(h => h < horaPeru);

      const targets = [];
      for (const u of usernames) {
        const fila = (datos || []).find(d => d.username === u);
        const esHoy = fila && fila.meal_plan_fecha === hoyISO;
        const pendientes = [];
        for (const h of horasYaPasadas) {
          const comida = VENTANAS[h];
          const items = esHoy ? (fila.meal_plan?.meals?.[comida] || []) : [];
          if (!items.length) pendientes.push(NOMBRE_COMIDA[comida]);
        }
        if (pendientes.length) targets.push({ username: u, mensaje: mensajeAnimo(pendientes) });
      }
      const r = await enviarLote(supabase, targets);
      return res.status(200).json({ ok: true, ...r, tipo: 'animo', horaPeru, alumnosConAnimo: targets.length });
    }

    // Recordatorio de comida a tiempo
    const comida = VENTANAS[horaPeru];
    if (!comida) {
      return res.status(200).json({ ok: true, enviados: 0, motivo: 'fuera de horario de comidas' });
    }

    const { data: datos } = await supabase
      .from('datos_alumnos').select('username, meal_plan, meal_plan_fecha, form').in('username', usernames);

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

    const targets = pendientes.map(u => ({ username: u, mensaje: mensajeJonah(comida, objetivoDe[u], horaPeru) }));
    const r = await enviarLote(supabase, targets);
    return res.status(200).json({ ok: true, ...r, comida, pendientes: pendientes.length });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
