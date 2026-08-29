// api/cron/racha-en-riesgo.js
//
// Corre una vez al día, a las 8pm hora Perú. Revisa qué alumnos tienen
// una racha activa de 3+ días y todavía no registraron nada hoy — es el
// momento de mayor riesgo de que la rompan sin querer.
//
// Cron sugerido en vercel.json: "0 1 * * *" (01:00 UTC = 20:00 Perú)

import { getSupabase, setupWebPush, verificarCronSecret, horaYFechaPeru, enviarPushA, calcularRachas } from '../_lib/push.js';

const RACHA_MINIMA = 3;

export default async function handler(req, res) {
  if (!verificarCronSecret(req)) return res.status(401).json({ error: 'No autorizado' });

  const supabase = getSupabase();
  setupWebPush();
  const { hoyISO } = horaYFechaPeru();

  try {
    const { data: alumnos, error } = await supabase
      .from('alumnos').select('username').eq('enabled', true);
    if (error) throw error;
    if (!alumnos || alumnos.length === 0) {
      return res.status(200).json({ ok: true, enviados: 0, motivo: 'sin alumnos activos' });
    }

    const usernames = alumnos.map(a => a.username);
    const rachas = await calcularRachas(supabase, usernames, hoyISO);

    // Racha de 3+ días, pero hoy todavía no registró nada
    const enRiesgo = usernames.filter(u => rachas[u] && rachas[u].racha >= RACHA_MINIMA && !rachas[u].registroHoy);

    if (enRiesgo.length === 0) {
      return res.status(200).json({ ok: true, enviados: 0, motivo: 'nadie en riesgo hoy' });
    }

    // El texto varía según la racha exacta de cada alumno, así que se
    // agrupan por número de días para mandar el mensaje correcto a cada uno.
    let totalEnviados = 0;
    const fallidosTotal = [];
    const porRacha = {};
    enRiesgo.forEach(u => {
      const r = rachas[u].racha;
      porRacha[r] = porRacha[r] || [];
      porRacha[r].push(u);
    });

    for (const [dias, users] of Object.entries(porRacha)) {
      const resultado = await enviarPushA(supabase, users, {
        title: 'Jonah 🦍',
        body: `Llevas ${dias} día(s) seguidos registrando tus comidas. No la rompas hoy — solo toma un minuto.`,
      });
      totalEnviados += resultado.enviados;
      fallidosTotal.push(...resultado.fallidos);
    }

    return res.status(200).json({ ok: true, enviados: totalEnviados, fallidos: fallidosTotal, enRiesgo: enRiesgo.length });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
