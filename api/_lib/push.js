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

/* VERSIÓN GRATIS (la prueba o el plan venció; la cuenta sigue activa).
   Reciben menos avisos que Premium, para que sigan usando la app sin
   cansarlos: el almuerzo (solo si registraron en los últimos 14 días), el
   resumen del lunes, el pesaje del domingo (si registraron en los últimos
   30 días) y "te extrañé" a los 3, 7, 14 y 30 días sin registrar.
   Devuelve [{ username, ultimaComida }] de los gratis habilitados. */
export async function alumnosGratis(supabase, hoyISO) {
  const { data: alumnos, error } = await supabase
    .from('alumnos').select('username').eq('enabled', true).lt('fecha_vencimiento', hoyISO);
  if (error) throw error;
  const usernames = (alumnos || []).map(a => a.username);
  if (!usernames.length) return [];
  const ultima = {};
  for (let i = 0; i < usernames.length; i += 200) {
    const { data } = await supabase.from('historial').select('username, fecha')
      .in('username', usernames.slice(i, i + 200)).gt('comidas_count', 0)
      .gte('fecha', addDaysISO(hoyISO, -45)).order('fecha', { ascending: false }).range(0, 4999);
    (data || []).forEach(r => { if (!ultima[r.username] || r.fecha > ultima[r.username]) ultima[r.username] = r.fecha; });
  }
  return usernames.map(u => ({ username: u, ultimaComida: ultima[u] || null }));
}

/* Lunes de la semana (fecha de Perú), igual que el periodo de las 3 fotos
   gratis por semana en la función reconocer-comida. */
export function lunesDeSemana(hoyISO) {
  const dia = diaSemanaPeru(hoyISO);
  return addDaysISO(hoyISO, -(dia === 0 ? 6 : dia - 1));
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
export async function enviarPushA(supabase, usernames, { title, body, url = '/' }) {
  if (!usernames.length) return { enviados: 0, fallidos: [] };

  const { data: subs } = await supabase
    .from('push_subs')
    .select('*')
    .eq('activa', true)
    .in('username', usernames);

  let enviados = 0;
  const fallidos = [];
  // Los avisos de Beast llevan el nombre que cada alumno le puso.
  const nombres = title === TITULO_BEAST ? await nombresCompanero(supabase, usernames) : {};

  for (const sub of subs || []) {
    try {
      // El Service Worker (public/sw.js) espera las claves en español
      // (titulo, cuerpo, url) — deben coincidir exactamente o el mensaje
      // no se muestra y cae al texto genérico por defecto.
      const payload = JSON.stringify({ titulo: tituloDe(nombres, sub.username, title), cuerpo: body, url });
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

/* PRESUPUESTO DE AVISOS: como mucho AVISOS_POR_DIA avisos automáticos al
   día por alumno, y uno por momento del día (mañana, mediodía, noche).
   Cada aviso enviado se anota en la tabla avisos_enviados.
   - Avisos "de rutina" (buenos días + desayuno, almuerzo, racha, cena):
     solo si ese momento del día todavía está libre.
   - Avisos "especiales" (plan por vencer, pesaje, resumen, control, avisos
     de la primera semana, reto): toman el momento aunque ya se haya usado,
     pero igual respetan el tope del día. Corren antes que la rutina de ese
     momento, así la reemplazan en vez de sumarse.
   Los avisos que responden a algo que hizo el alumno (pago aprobado, su
   alimento ya está, bienvenida al activar avisos) no pasan por aquí. */
export const AVISOS_POR_DIA = 3;

export async function conPresupuesto(supabase, usernames, { momento = null, especial = false, hoyISO }) {
  const lista = [...new Set(usernames)];
  if (!lista.length) return [];
  const { data, error } = await supabase.from('avisos_enviados')
    .select('username, momento').eq('fecha', hoyISO).in('username', lista);
  if (error) { console.error('No se pudo leer avisos_enviados:', error.message); return lista; }
  const cuenta = {}, momentos = {};
  (data || []).forEach(a => {
    cuenta[a.username] = (cuenta[a.username] || 0) + 1;
    (momentos[a.username] = momentos[a.username] || new Set()).add(a.momento);
  });
  return lista.filter(u => (cuenta[u] || 0) < AVISOS_POR_DIA
    && (especial || !momento || !momentos[u]?.has(momento)));
}

export async function anotarAvisos(supabase, usernames, { tipo, momento = null, hoyISO }) {
  const lista = [...new Set(usernames)];
  if (!lista.length) return;
  const { error } = await supabase.from('avisos_enviados')
    .insert(lista.map(username => ({ username, tipo, momento, fecha: hoyISO })));
  if (error) console.error('No se pudo anotar en avisos_enviados:', error.message);
}

/* Un aviso a un alumno, respetando el presupuesto. Devuelve lo mismo que
   enviarPushA (enviados: 0 si no le quedaba presupuesto). */
export async function avisoConPresupuesto(supabase, username, mensaje, { tipo, momento = null, especial = false, hoyISO }) {
  const ok = await conPresupuesto(supabase, [username], { momento, especial, hoyISO });
  if (!ok.length) return { enviados: 0, fallidos: [], sinPresupuesto: true };
  const r = await enviarPushA(supabase, [username], mensaje);
  if (r.enviados > 0) await anotarAvisos(supabase, [username], { tipo, momento, hoyISO });
  return r;
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

/* Avisos que el alumno apagó o la hora que eligió (app → ⚙️ Mi perfil →
   "Tus avisos"). Se guardan en su ficha: datos_alumnos.form.avisos =
   { apagados: ['comidas' | 'racha' | 'pesaje' | 'resumen' | 'retos'],
     horas: { manana: 7|8|9, mediodia: 13|14|15, noche: 20|21|22 } }.
   Los avisos de su plan, pagos, pedidos y de la comunidad siempre llegan. */
export const HORAS_AVISOS = { manana: [7, 8, 9], mediodia: [13, 14, 15], noche: [20, 21, 22] };
export async function preferenciasAvisos(supabase) {
  const { data } = await supabase.from('datos_alumnos').select('username, avisos:form->avisos').not('form->avisos', 'is', null);
  const prefs = {};
  (data || []).forEach(d => { if (d.avisos && typeof d.avisos === 'object') prefs[d.username] = d.avisos; });
  return prefs;
}
export function sinApagados(prefs, usernames, categoria) {
  return (usernames || []).filter(u => !(Array.isArray(prefs?.[u]?.apagados) && prefs[u].apagados.includes(categoria)));
}
// La hora del aviso: la que eligió el alumno; si no eligió, la que la app
// aprendió de cuándo suele anotar esa comida (form.avisos.aprendidas, ver
// horasAprendidas en src/alumno.jsx: suele almorzar a las 2 → aviso a las
// 3); si no hay, la de siempre.
export const VENTANAS_AVISOS = { manana: [6, 7, 8, 9, 10, 11], mediodia: [12, 13, 14, 15, 16, 17], noche: [18, 19, 20, 21, 22, 23] };
export function horaAviso(prefs, username, momento, defecto) {
  const h = Number(prefs?.[username]?.horas?.[momento]);
  if (HORAS_AVISOS[momento]?.includes(h)) return h;
  const a = Number(prefs?.[username]?.aprendidas?.[momento]);
  return VENTANAS_AVISOS[momento]?.includes(a) ? a : defecto;
}
// "Beast, háblame menos": solo el aviso del almuerzo y los importantes
// (plan, pesaje, control, prueba). Se guarda en form.avisos.pocos.
export function hablaMenos(prefs, username) {
  return prefs?.[username]?.pocos === true;
}

/* Avisos de Beast (docs/idea-beast.md, "Notificaciones"): los del día a día
   los firma Beast y al tocarlos se abre su chat con ese mensaje (?ir=beast).
   comida: la del aviso (la tarjeta trae "Anotar en Registrar" y "Foto").
   Nunca llevan nada privado: se ven en la pantalla bloqueada. */
export const TITULO_BEAST = 'Beast 🦍';
// El alumno le puede poner otro nombre a su compañero (chat → ⋮ → "Ponle
// nombre a tu compañero"; datos_alumnos.form.companero = { nombre, voz }).
// Sus avisos de Beast llegan firmados con ese nombre.
export async function nombresCompanero(supabase, usernames) {
  const lista = [...new Set(usernames || [])];
  if (!lista.length) return {};
  const { data } = await supabase.from('datos_alumnos').select('username, companero:form->companero').in('username', lista);
  const nombres = {};
  (data || []).forEach(d => {
    const n = String(d.companero?.nombre || '').trim().slice(0, 20);
    if (n && n.toLowerCase() !== 'beast') nombres[d.username] = `${n} 🦍`;
  });
  return nombres;
}
export function tituloDe(nombres, username, title) {
  return title === TITULO_BEAST && nombres?.[username] ? nombres[username] : title;
}
export function urlBeast(texto, { comida = null, foto = false, extra = '' } = {}) {
  return `/?ir=beast&aviso=${encodeURIComponent(String(texto || '').slice(0, 300))}`
    + (comida ? `&comida=${encodeURIComponent(comida)}` : '') + (foto ? '&foto=1' : '') + extra;
}

