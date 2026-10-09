// api/cron/racha-en-riesgo.js
//
// Corre una vez al día, a las 8pm hora Perú. Hace 3 cosas:
// 1. Racha en riesgo: quien tiene 3+ días seguidos y hoy aún no
//    registró nada — el momento de mayor riesgo de romperla sin querer.
// 2. Silencio de 24h+: quien no tiene racha activa (0-2 días) y hoy
//    tampoco registró nada — un mensaje de "te extrañé", más cercano
//    que un simple recordatorio, para quien lleva un tiempo sin volver.
// 3. Celebración de hito: quien SÍ registró hoy y su racha cruzó un
//    hito nuevo (3, 7, 14, 30, 60, 90 días) recibe un push especial de
//    felicitación — no solo el confeti que ve dentro de la app.
// 4. Versión gratis (prueba o plan vencidos): solo el "te extrañé", y
//    solo a los 3, 7, 14 y 30 días sin registrar (no todos los días).
//    La racha y los hitos son de Premium.
// 0. Cierre del día 1 (va primero): quien empezó hoy y ya anotó algo recibe
//    "Hoy anotaste N comidas, ¡buen arranque! Mañana te pregunto qué
//    desayunaste, ¿ya?" (tipo cierre_dia1). Al día siguiente, el aviso de
//    la mañana (recordatorio.js) le pregunta "Como quedamos: ¿qué desayunaste?".
// Los firma Beast y abren su chat (urlBeast). Con "Beast, háblame menos"
// (form.avisos.pocos) no se manda nada de esto.
//
// Cron sugerido en vercel.json: "0 1 * * *" (01:00 UTC = 20:00 Perú)

import { getSupabase, setupWebPush, verificarCronSecret, horaYFechaPeru, enviarPushA, calcularRachas, conPresupuesto, anotarAvisos, alumnosGratis, diasDesde, preferenciasAvisos, sinApagados, hablaMenos, TITULO_BEAST, urlBeast } from '../_lib/push.js';

const DIAS_TE_EXTRANE_GRATIS = [3, 7, 14, 30];

const RACHA_MINIMA = 3;
const HITOS = [3, 7, 14, 30, 60, 90];

export default async function handler(req, res) {
  if (!verificarCronSecret(req)) return res.status(401).json({ error: 'No autorizado' });

  const supabase = getSupabase();
  setupWebPush();
  const { hoyISO } = horaYFechaPeru();

  try {
    const { data: alumnos, error } = await supabase
      .from('alumnos').select('username, ultimo_hito_racha, fecha_inicio')
      .eq('enabled', true).gte('fecha_vencimiento', hoyISO);
    if (error) throw error;

    const usernames = (alumnos || []).map(a => a.username);
    const hitoDe = {};
    (alumnos || []).forEach(a => { hitoDe[a.username] = Number(a.ultimo_hito_racha || 0); });
    const rachas = await calcularRachas(supabase, usernames, hoyISO);

    let totalEnviados = 0;
    const fallidosTotal = [];
    // Presupuesto de avisos: este es el aviso de la noche. Si la noche ya la
    // usó otro aviso (avance de la prueba, reto del sábado) o ya recibió 3
    // hoy, no se le manda nada más (ver conPresupuesto en _lib/push.js).
    // Versión gratis: "te extrañé" solo a los 3, 7, 14 y 30 días sin registrar.
    const gratis = (await alumnosGratis(supabase, hoyISO))
      .filter(g => g.ultimaComida && DIAS_TE_EXTRANE_GRATIS.includes(diasDesde(g.ultimaComida, hoyISO)))
      .map(g => g.username);
    // Quien apagó "Racha en riesgo" en su perfil no recibe estos avisos.
    const prefs = await preferenciasAvisos(supabase);
    const libres = new Set(await conPresupuesto(supabase, sinApagados(prefs, [...usernames, ...gratis], 'racha')
      .filter(u => !hablaMenos(prefs, u)), { momento: 'noche', hoyISO }));
    const enviar = async (u, mensaje, tipo) => {
      const r = await enviarPushA(supabase, [u], mensaje);
      totalEnviados += r.enviados; fallidosTotal.push(...r.fallidos);
      if (r.enviados > 0) await anotarAvisos(supabase, [u], { tipo, momento: 'noche', hoyISO });
      return r.enviados > 0;
    };

    // 0. Cierre del día 1: empezó hoy y ya anotó algo.
    const nuevosHoy = (alumnos || []).filter(a => a.fecha_inicio === hoyISO && libres.has(a.username) && rachas[a.username]?.registroHoy).map(a => a.username);
    if (nuevosHoy.length) {
      const { data: hoyHist } = await supabase.from('historial').select('username, comidas_count').eq('fecha', hoyISO).in('username', nuevosHoy);
      const comidasDe = {}; (hoyHist || []).forEach(h => { comidasDe[h.username] = Number(h.comidas_count) || 0; });
      await Promise.all(nuevosHoy.map(u => {
        const n = comidasDe[u] || 1;
        const body = `Hoy anotaste ${n} ${n === 1 ? 'comida' : 'comidas'}, ¡buen arranque! 🦍 Mañana te pregunto qué desayunaste, ¿ya?`;
        libres.delete(u);
        return enviar(u, { title: TITULO_BEAST, body, url: urlBeast(body) }, 'cierre_dia1');
      }));
    }

    // 1. Racha en riesgo (3+ días, sin registrar hoy)
    const enRiesgo = usernames.filter(u => libres.has(u) && rachas[u] && rachas[u].racha >= RACHA_MINIMA && !rachas[u].registroHoy);
    await Promise.all(enRiesgo.map(u => {
      const body = `¡Llevas ${rachas[u].racha} días seguidos anotando! 🔥 No la rompas hoy: cuéntame qué comiste y listo.`;
      return enviar(u, { title: TITULO_BEAST, body, url: urlBeast(body) }, 'racha_en_riesgo');
    }));

    // 2. Silencio 24h+: sin racha activa y sin registrar hoy — un
    // mensaje más cercano que un recordatorio, para el que lleva rato sin volver.
    const sinRegistro = [
      ...usernames.filter(u => libres.has(u) && rachas[u] && rachas[u].racha < RACHA_MINIMA && !rachas[u].registroHoy),
      ...gratis.filter(u => libres.has(u)),
    ];
    if (sinRegistro.length) {
      const variantes = [
        '¿Todo bien? Hoy no te vi por aquí. Cuando quieras volver, aquí sigo, sin juicios 🦍',
        'Hace un rato que no anotamos nada. Ya fue, retomar también cuenta: ¿qué comiste hoy? 💪',
        'Un día sin anotar no borra tu avance 🦍 Cuando puedas, cuéntame qué comiste y seguimos.',
      ];
      // En paralelo, no uno por uno — evita que la función se quede
      // corta de tiempo con muchos alumnos.
      await Promise.all(sinRegistro.map(u => {
        const body = variantes[Math.floor(Math.random() * variantes.length)];
        return enviar(u, { title: TITULO_BEAST, body, url: urlBeast(body) }, 'te_extrane');
      }));
    }

    // 3. Celebración de hito: registró hoy y su racha cruzó un nuevo hito.
    const conHitoNuevo = [];
    for (const u of usernames) {
      const r = rachas[u];
      if (!libres.has(u) || !r || !r.registroHoy) continue;
      const hitoAlcanzado = [...HITOS].reverse().find(h => r.racha >= h);
      if (hitoAlcanzado && hitoAlcanzado > hitoDe[u]) {
        conHitoNuevo.push({ username: u, hito: hitoAlcanzado });
      }
    }
    await Promise.all(conHitoNuevo.map(async ({ username, hito }) => {
      const body = `🔥 ¡${hito} días de racha! Eso es constancia de verdad. Toca y celebramos 🦍`;
      const enviado = await enviar(username, { title: TITULO_BEAST, body, url: urlBeast(body) }, 'hito_racha');
      // Si hoy no se pudo (sin presupuesto o sin avisos), se celebra otro día.
      if (enviado) await supabase.from('alumnos').update({ ultimo_hito_racha: hito }).eq('username', username);
    }));

    return res.status(200).json({
      ok: true, enviados: totalEnviados, fallidos: fallidosTotal,
      enRiesgo: enRiesgo.length, sinRegistro: sinRegistro.length, hitosNuevos: conHitoNuevo.length,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
