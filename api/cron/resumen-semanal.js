// api/cron/resumen-semanal.js
//
// Corre los lunes a las 9am hora Perú. A cada alumno activo que registró
// comidas la semana pasada (lunes a domingo) le avisa que su resumen
// "Tu semana" está listo en la app (tarjeta de Inicio, con botón para
// compartirlo en historias).
//
// Cron en vercel.json: "0 14 * * 1" (14:00 UTC lunes = 9:00 Perú lunes)

import { getSupabase, setupWebPush, verificarCronSecret, horaYFechaPeru, enviarPushA } from '../_lib/push.js';

function sumarDias(iso, dias) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (!verificarCronSecret(req)) return res.status(401).json({ error: 'No autorizado' });

  const supabase = getSupabase();
  setupWebPush();
  const { hoyISO } = horaYFechaPeru();
  // Lunes de la semana pasada (funciona aunque se corra otro día a mano).
  const [y, m, d] = hoyISO.split('-').map(Number);
  const diaSemana = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // 0 = lunes
  const lunes = sumarDias(hoyISO, -diaSemana - 7);
  const domingo = sumarDias(lunes, 6);

  try {
    const { data: alumnos, error } = await supabase
      .from('alumnos').select('username').eq('enabled', true).gte('fecha_vencimiento', hoyISO);
    if (error) throw error;
    const usernames = (alumnos || []).map(a => a.username);
    if (!usernames.length) return res.status(200).json({ ok: true, enviados: 0, motivo: 'sin alumnos activos' });

    const { data: filas } = await supabase.from('historial').select('username, fecha')
      .in('username', usernames).gte('fecha', lunes).lte('fecha', domingo).gt('comidas_count', 0).range(0, 9999);
    const dias = {};
    (filas || []).forEach(r => { (dias[r.username] = dias[r.username] || new Set()).add(r.fecha); });

    const envios = Object.entries(dias).map(([username, set]) => {
      const n = set.size;
      const body = n >= 5
        ? `Semana de bestia 🔥 ${n}/7 días registrados. Mira tu resumen en la app y compártelo 📲`
        : `Tu semana: ${n}/7 días registrados 📊 Mira tu resumen y vamos por más esta semana 💪`;
      return { username, body };
    });

    const resultados = await Promise.all(envios.map(e =>
      enviarPushA(supabase, [e.username], { title: 'Jonah 🦍', body: e.body, url: '/' })));
    let enviados = 0; const fallidos = [];
    resultados.forEach(r => { enviados += r.enviados; fallidos.push(...r.fallidos); });

    return res.status(200).json({ ok: true, enviados, fallidos, conResumen: envios.length, semana: `${lunes}..${domingo}` });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
