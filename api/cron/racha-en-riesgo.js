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
//
// Cron sugerido en vercel.json: "0 1 * * *" (01:00 UTC = 20:00 Perú)

import { getSupabase, setupWebPush, verificarCronSecret, horaYFechaPeru, enviarPushA, calcularRachas } from '../_lib/push.js';

const RACHA_MINIMA = 3;
const HITOS = [3, 7, 14, 30, 60, 90];

export default async function handler(req, res) {
  if (!verificarCronSecret(req)) return res.status(401).json({ error: 'No autorizado' });

  const supabase = getSupabase();
  setupWebPush();
  const { hoyISO } = horaYFechaPeru();

  try {
    const { data: alumnos, error } = await supabase
      .from('alumnos').select('username, ultimo_hito_racha')
      .eq('enabled', true).gte('fecha_vencimiento', hoyISO);
    if (error) throw error;
    if (!alumnos || alumnos.length === 0) {
      return res.status(200).json({ ok: true, enviados: 0, motivo: 'sin alumnos activos' });
    }

    const usernames = alumnos.map(a => a.username);
    const hitoDe = {};
    alumnos.forEach(a => { hitoDe[a.username] = Number(a.ultimo_hito_racha || 0); });
    const rachas = await calcularRachas(supabase, usernames, hoyISO);

    let totalEnviados = 0;
    const fallidosTotal = [];

    // 1. Racha en riesgo (3+ días, sin registrar hoy)
    const enRiesgo = usernames.filter(u => rachas[u] && rachas[u].racha >= RACHA_MINIMA && !rachas[u].registroHoy);
    const porRacha = {};
    enRiesgo.forEach(u => {
      const r = rachas[u].racha;
      porRacha[r] = porRacha[r] || [];
      porRacha[r].push(u);
    });
    for (const [dias, users] of Object.entries(porRacha)) {
      const r = await enviarPushA(supabase, users, {
        title: 'Jonah 🦍',
        body: `Llevas ${dias} día(s) seguidos registrando tus comidas. No la rompas hoy — solo toma un minuto.`,
      });
      totalEnviados += r.enviados; fallidosTotal.push(...r.fallidos);
    }

    // 2. Silencio 24h+: sin racha activa y sin registrar hoy — un
    // mensaje más cercano que un recordatorio, para el que lleva rato sin volver.
    const sinRegistro = usernames.filter(u => rachas[u] && rachas[u].racha < RACHA_MINIMA && !rachas[u].registroHoy);
    if (sinRegistro.length) {
      const variantes = [
        'Te extrañé hoy. Cuando quieras volver, aquí sigo — sin juicios, solo acompañándote 🦍',
        'Hace un tiempo que no te veo por aquí. No pasa nada, retomar también cuenta 💪',
        'Un día sin registrar no borra tu progreso. Cuando puedas, aquí estoy 🦍',
      ];
      // En paralelo, no uno por uno — evita que la función se quede
      // corta de tiempo con muchos alumnos.
      const resultados = await Promise.all(sinRegistro.map(u => {
        const body = variantes[Math.floor(Math.random() * variantes.length)];
        return enviarPushA(supabase, [u], { title: 'Jonah 🦍', body });
      }));
      resultados.forEach(r => { totalEnviados += r.enviados; fallidosTotal.push(...r.fallidos); });
    }

    // 3. Celebración de hito: registró hoy y su racha cruzó un nuevo hito.
    const conHitoNuevo = [];
    for (const u of usernames) {
      const r = rachas[u];
      if (!r || !r.registroHoy) continue;
      const hitoAlcanzado = [...HITOS].reverse().find(h => r.racha >= h);
      if (hitoAlcanzado && hitoAlcanzado > hitoDe[u]) {
        conHitoNuevo.push({ username: u, hito: hitoAlcanzado });
      }
    }
    await Promise.all(conHitoNuevo.map(async ({ username, hito }) => {
      const r = await enviarPushA(supabase, [username], {
        title: 'Jonah 🦍',
        body: `🔥 ¡Llegaste a ${hito} días de racha! Eso es constancia de verdad — sigue así, vamos con todo 🦍`,
      });
      totalEnviados += r.enviados; fallidosTotal.push(...r.fallidos);
      await supabase.from('alumnos').update({ ultimo_hito_racha: hito }).eq('username', username);
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
