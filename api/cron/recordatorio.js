// api/cron/recordatorio.js
//
// Corre cada hora. Avisos de rutina de cada día, dentro del PRESUPUESTO DE
// AVISOS (máximo 3 al día por alumno, uno por momento: ver conPresupuesto
// en api/_lib/push.js):
//   - 8am (mañana): buenos días + "registra tu desayuno", en un solo aviso
//     (con variante de lunes y de aniversario de uso). Si ya registró su
//     desayuno, no le llega.
//   - 2pm (mediodía): "¿ya almorzaste?", solo si no registró su almuerzo.
//   - 9pm (noche): "¿ya cenaste?", solo si no registró su cena y la noche
//     sigue libre (a las 8pm tiene prioridad racha-en-riesgo.js).
// Si ese momento ya lo usó un aviso especial (plan por vencer, pesaje,
// avisos de la primera semana…), no se manda nada más.
// Antes había además media mañana, media tarde, agua, ánimo y buenas
// noches: hasta 10 avisos al día. Se quitaron para no cansar al alumno.
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

import { getSupabase, setupWebPush, verificarCronSecret, horaYFechaPeru, diaSemanaPeru, diasDesde, conPresupuesto, anotarAvisos } from '../_lib/push.js';

// Hora de Perú → momento del día y comida que se revisa.
const RUTINA = {
  8: { momento: 'manana', comida: 'Desayuno', tipo: 'buenos_dias' },
  14: { momento: 'mediodia', comida: 'Almuerzo', tipo: 'almuerzo' },
  21: { momento: 'noche', comida: 'Cena', tipo: 'cena' },
};

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
    // url: al tocar el aviso, la app se abre directo en el registro de esa
    // comida (ver leerRegistrarDeUrl en src/App.jsx).
    const payload = JSON.stringify({ titulo: mensaje.title, cuerpo: mensaje.body, url: mensaje.url || '/' });
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
  const usuariosOk = new Set();
  const endpointsInvalidos = [];
  const detalleFallos = [];
  resultados.forEach(r => {
    if (r.status === 'fulfilled' && r.value.ok) { enviados++; usuariosOk.add(r.value.username); return; }
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
  return { enviados, fallidos: detalleFallos.length, detalleFallos, usuariosOk: [...usuariosOk] };
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

    const rutina = RUTINA[horaPeru];
    if (!rutina) return res.status(200).json({ ok: true, enviados: 0, motivo: 'fuera de horario de avisos' });
    const { momento, comida, tipo } = rutina;

    const { data: datos } = await supabase
      .from('datos_alumnos').select('username, meal_plan, meal_plan_fecha, form').in('username', usernames);
    const objetivoDe = {};
    const yaRegistro = new Set();
    (datos || []).forEach(d => {
      objetivoDe[d.username] = d.form?.objetivo || null;
      const items = d.meal_plan_fecha === hoyISO ? (d.meal_plan?.meals?.[comida] || []) : [];
      if (items.length) yaRegistro.add(d.username);
    });
    const pendientes = await conPresupuesto(supabase, usernames.filter(u => !yaRegistro.has(u)), { momento, hoyISO });
    if (!pendientes.length) return res.status(200).json({ ok: true, enviados: 0, comida, motivo: 'nadie pendiente o sin presupuesto' });

    const url = `/?registrar=${encodeURIComponent(comida)}`;
    let targets;
    if (tipo === 'buenos_dias') {
      const { data: fechas } = await supabase.from('alumnos').select('username, fecha_inicio').in('username', pendientes);
      const inicioDe = {}; (fechas || []).forEach(a => { inicioDe[a.username] = a.fecha_inicio; });
      const esLunes = diaSemanaPeru(hoyISO) === 1;
      targets = pendientes.map(u => {
        const m = mensajeBuenosDias(objetivoDe[u], esLunes, inicioDe[u] ? diasDesde(inicioDe[u], hoyISO) : 0);
        return { username: u, mensaje: { ...m, body: `${m.body} Empieza registrando tu desayuno 🍳`, url } };
      });
    } else {
      targets = pendientes.map(u => ({ username: u, mensaje: { ...mensajeJonah(comida, objetivoDe[u], horaPeru), url } }));
    }
    const r = await enviarLote(supabase, targets);
    await anotarAvisos(supabase, r.usuariosOk || [], { tipo, momento, hoyISO });
    return res.status(200).json({ ok: true, enviados: r.enviados, fallidos: r.fallidos, comida, alumnos: (r.usuariosOk || []).length });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
