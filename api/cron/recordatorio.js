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
// Los firma Beast (docs/idea-beast.md, "Notificaciones"): al tocarlos se
// abre su chat con el mensaje y los botones "Anotar en Registrar" y "Foto".
// La hora es la que eligió el alumno, o la que la app aprendió de cuándo
// suele anotar esa comida (horaAviso). Con "Beast, háblame menos" solo le
// llega el del almuerzo. El día 2, si anotó el día 1, el de la mañana es
// "Como quedamos: ¿qué desayunaste?" (cierre del día 1 en racha-en-riesgo).
// Los lunes, el de la mañana invita a elegir la meta de la semana.
//
// Premium (plan o prueba vigentes) recibe los 3. La VERSIÓN GRATIS (prueba
// o plan vencidos) recibe solo el del almuerzo, y solo si registró alguna
// comida en los últimos 14 días: le dice cuántas fotos gratis le quedan
// esta semana (ver alumnosGratis en api/_lib/push.js).

import { getSupabase, setupWebPush, verificarCronSecret, horaYFechaPeru, diaSemanaPeru, diasDesde, conPresupuesto, anotarAvisos, alumnosGratis, lunesDeSemana, addDaysISO, preferenciasAvisos, sinApagados, horaAviso, VENTANAS_AVISOS, hablaMenos, TITULO_BEAST, urlBeast, nombresCompanero, tituloDe } from '../_lib/push.js';

const FOTOS_GRATIS_SEMANA = 3;

// Almuerzo de la versión gratis: con las fotos que le quedan esta semana.
function mensajeAlmuerzoGratis(quedan) {
  if (quedan > 0) {
    const fotos = quedan === 1 ? 'te queda 1 foto gratis' : `te quedan ${quedan} fotos gratis`;
    const variantes = [
      `¿Ya almorzaste? 🍽️ Tómale foto a tu plato y te digo sus calorías: ${fotos} esta semana 📸`,
      `Hora del almuerzo, causa 🦍 Esta semana ${fotos}. Úsala en tu almuerzo y seguimos sumando 💪`,
    ];
    return { title: TITULO_BEAST, body: variantes[Math.floor(Math.random() * variantes.length)] };
  }
  const variantes = [
    '¿Ya almorzaste? 🍽️ Anótalo en Registrar, toma menos de un minuto. Comida a comida se llega 💪',
    'Oe, falta tu almuerzo 🦍 Anótalo y sigues viendo cómo vas con tu meta.',
  ];
  return { title: TITULO_BEAST, body: variantes[Math.floor(Math.random() * variantes.length)] };
}

// Momentos del día y su hora por defecto (Perú). Cada alumno puede elegir
// otra hora en ⚙️ Mi perfil (7–9am, 1–3pm, 8–10pm) o apagar estos avisos
// ("comidas"): ver preferenciasAvisos en _lib/push.js.
const RUTINAS = [
  { momento: 'manana', comida: 'Desayuno', tipo: 'buenos_dias', defecto: 8 },
  { momento: 'mediodia', comida: 'Almuerzo', tipo: 'almuerzo', defecto: 14 },
  { momento: 'noche', comida: 'Cena', tipo: 'cena', defecto: 21 },
];

const NOMBRE_COMIDA = {
  Desayuno: 'tu desayuno', 'Media mañana': 'tu media mañana', Almuerzo: 'tu almuerzo',
  'Media tarde': 'tu media tarde', Cena: 'tu cena',
};

const VERBO_COMIDA = { Desayuno: 'desayunaste', Almuerzo: 'almorzaste', Cena: 'cenaste' };

// En la voz de Beast (pata, cercano). Sin datos privados: se ve en la
// pantalla bloqueada.
function mensajeBeast(comida, objetivo, horaPeru) {
  const nombre = NOMBRE_COMIDA[comida] || comida;
  const verbo = VERBO_COMIDA[comida] || 'comiste';
  const horaAmPm = horaPeru > 12 ? `${horaPeru - 12} pm` : `${horaPeru} ${horaPeru === 12 ? 'pm' : 'am'}`;
  const variantes = [
    `¿Ya ${verbo}? 🦍 Cuéntame qué fue y lo anotamos al toque.`,
    `Oe, aún no veo ${nombre}. ¿Qué tal estuvo? Cuéntame 🍽️`,
    `Son las ${horaAmPm}, ¿qué ${verbo}? Dímelo y lo anotamos 💪`,
    `¿Cómo va el día, causa? Falta anotar ${nombre}, ¿me cuentas? 🦍`,
    `Un minutito para ${nombre} y seguimos sumando 🔥 ¿Qué ${verbo}?`,
  ];
  if (objetivo) variantes.push(`Tu meta: ${String(objetivo).toLowerCase()}. Anotemos ${nombre} y seguimos sumando 🦍`);
  return { title: TITULO_BEAST, body: variantes[Math.floor(Math.random() * variantes.length)] };
}

function mensajeBuenosDias(objetivo, esLunes, diasDeUso) {
  if (diasDeUso && diasDeUso > 0 && diasDeUso % 30 === 0) {
    return { title: TITULO_BEAST, body: `¡Hoy cumples ${diasDeUso} días con Jonah Beast Fuel! 🎉 Eso es constancia de verdad, causa. Vamos por más 🦍🔥` };
  }
  if (esLunes) {
    const variantesLunes = [
      'Buenos días, arrancamos la semana 🦍 Lo del fin de semana ya fue: ¿qué meta nos ponemos esta semana? Toca y elige.',
      'Nueva semana, causa 🔥 Elige tu mini meta de la semana (agua, anotar o proteína) y vamos con todo.',
      'Lunes de reinicio 🦍 ¿Nos ponemos una mini meta para esta semana? Toca y la elegimos juntos.',
    ];
    return { title: TITULO_BEAST, body: variantesLunes[Math.floor(Math.random() * variantesLunes.length)], lunes: true };
  }
  const variantes = [
    '¡Buenos días! 🦍 Hoy es otro día para seguir sumando.',
    'Buenos días 🌅 Arrancamos con todo, comida a comida.',
    '¡Arriba, causa! 🦍 Un nuevo día para acercarte a tu meta.',
    'Buenos días 🔥 Que sea un buen día, aquí estoy contigo.',
  ];
  if (objetivo) variantes.push(`Buenos días 🦍 Hoy seguimos con tu meta: ${String(objetivo).toLowerCase()}.`);
  return { title: TITULO_BEAST, body: variantes[Math.floor(Math.random() * variantes.length)] };
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
  const nombres = await nombresCompanero(supabase, usernames);
  const tareas = [];
  for (const { username, mensaje } of targets) {
    // url: al tocar el aviso se abre el chat de Beast con ese mensaje
    // (urlBeast); el título lleva el nombre que el alumno le puso.
    const payload = JSON.stringify({ titulo: tituloDe(nombres, username, mensaje.title), cuerpo: mensaje.body, url: mensaje.url || '/' });
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

async function targetsGratis(supabase, hoyISO, comida, url, prefs, rutina, horaPeru) {
  const gratis = sinApagados(prefs, (await alumnosGratis(supabase, hoyISO))
    .filter(g => g.ultimaComida && g.ultimaComida >= addDaysISO(hoyISO, -14))
    .map(g => g.username), 'comidas')
    .filter(u => horaAviso(prefs, u, rutina.momento, rutina.defecto) === horaPeru);
  if (!gratis.length) return [];
  const { data: datos } = await supabase.from('datos_alumnos').select('username, meal_plan, meal_plan_fecha').in('username', gratis);
  const yaRegistro = new Set((datos || [])
    .filter(d => d.meal_plan_fecha === hoyISO && (d.meal_plan?.meals?.[comida] || []).length)
    .map(d => d.username));
  const pendientes = await conPresupuesto(supabase, gratis.filter(u => !yaRegistro.has(u)), { momento: 'mediodia', hoyISO });
  if (!pendientes.length) return [];
  const { data: uso } = await supabase.from('fotos_reconocimiento_uso').select('username, usadas')
    .in('username', pendientes).eq('periodo', lunesDeSemana(hoyISO));
  const usadas = {}; (uso || []).forEach(f => { usadas[f.username] = Number(f.usadas) || 0; });
  return pendientes.map(u => {
    const quedan = Math.max(0, FOTOS_GRATIS_SEMANA - (usadas[u] || 0));
    // Si le quedan fotos, al tocar el aviso se abre la cámara directo.
    const m = mensajeAlmuerzoGratis(quedan);
    return { username: u, mensaje: { ...m, url: urlBeast(m.body, { comida, foto: quedan > 0 }) } };
  });
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
    const todos = (alumnos || []).map(a => a.username);

    const rutina = RUTINAS.find(r => VENTANAS_AVISOS[r.momento].includes(horaPeru));
    if (!rutina) return res.status(200).json({ ok: true, enviados: 0, motivo: 'fuera de horario de avisos' });
    const { momento, comida, tipo } = rutina;
    // A esta hora: los que tienen este aviso a esta hora (la suya o la de siempre) y no lo apagaron.
    const prefs = await preferenciasAvisos(supabase);
    const usernames = sinApagados(prefs, todos, 'comidas').filter(u => horaAviso(prefs, u, momento, rutina.defecto) === horaPeru
      && !(momento !== 'mediodia' && hablaMenos(prefs, u)));

    const { data: datos } = usernames.length
      ? await supabase.from('datos_alumnos').select('username, meal_plan, meal_plan_fecha, form').in('username', usernames)
      : { data: [] };
    const objetivoDe = {};
    const yaRegistro = new Set();
    (datos || []).forEach(d => {
      objetivoDe[d.username] = d.form?.objetivo || null;
      const items = d.meal_plan_fecha === hoyISO ? (d.meal_plan?.meals?.[comida] || []) : [];
      if (items.length) yaRegistro.add(d.username);
    });
    const pendientes = await conPresupuesto(supabase, usernames.filter(u => !yaRegistro.has(u)), { momento, hoyISO });

    const url = `/?registrar=${encodeURIComponent(comida)}`;
    let targets;
    if (!pendientes.length) {
      targets = [];
    } else if (tipo === 'buenos_dias') {
      const [{ data: fechas }, { data: cierres }] = await Promise.all([
        supabase.from('alumnos').select('username, fecha_inicio').in('username', pendientes),
        // Anoche Beast le dijo "mañana te pregunto qué desayunaste" (racha-en-riesgo.js).
        supabase.from('avisos_enviados').select('username').eq('tipo', 'cierre_dia1').eq('fecha', addDaysISO(hoyISO, -1)).in('username', pendientes),
      ]);
      const inicioDe = {}; (fechas || []).forEach(a => { inicioDe[a.username] = a.fecha_inicio; });
      const prometido = new Set((cierres || []).map(c => c.username));
      const esLunes = diaSemanaPeru(hoyISO) === 1;
      targets = pendientes.map(u => {
        if (prometido.has(u)) {
          const body = '¡Buenos días! 🦍 Como quedamos: ¿qué desayunaste? Cuéntame y lo anotamos.';
          return { username: u, mensaje: { title: TITULO_BEAST, body, url: urlBeast(body, { comida }) } };
        }
        const m = mensajeBuenosDias(objetivoDe[u], esLunes, inicioDe[u] ? diasDesde(inicioDe[u], hoyISO) : 0);
        const body = m.lunes ? m.body : `${m.body} ¿Qué desayunas hoy? Cuéntame 🍳`;
        return { username: u, mensaje: { title: m.title, body, url: urlBeast(body, { comida, extra: m.lunes ? '&meta=1' : '' }) } };
      });
    } else {
      targets = pendientes.map(u => {
        const m = mensajeBeast(comida, objetivoDe[u], horaPeru);
        return { username: u, mensaje: { ...m, url: urlBeast(m.body, { comida }) } };
      });
    }
    // Versión gratis: solo el almuerzo, a quien registró en los últimos 14 días.
    if (tipo === 'almuerzo') targets.push(...await targetsGratis(supabase, hoyISO, comida, url, prefs, rutina, horaPeru));
    if (!targets.length) return res.status(200).json({ ok: true, enviados: 0, comida, motivo: 'nadie pendiente o sin presupuesto' });
    const r = await enviarLote(supabase, targets);
    await anotarAvisos(supabase, r.usuariosOk || [], { tipo, momento, hoyISO });
    return res.status(200).json({ ok: true, enviados: r.enviados, fallidos: r.fallidos, comida, alumnos: (r.usuariosOk || []).length });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
