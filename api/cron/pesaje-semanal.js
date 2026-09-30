// api/cron/pesaje-semanal.js
//
// Corre los domingos a las 7am hora Perú (antes del buenos días de las 8am). A cada alumno activo que ya
// tiene un peso anotado le recuerda pesarse hoy en ayunas y anotarlo
// (en Inicio sale la tarjeta "¿CUÁNTO PESAS HOY?"). Así el lunes su
// resumen "Tu semana" muestra el cambio de peso real.
//
// Cron en vercel.json: "0 12 * * 0" (12:00 UTC domingo = 7:00 Perú domingo)

import { getSupabase, setupWebPush, verificarCronSecret, horaYFechaPeru, enviarPushA, conPresupuesto, anotarAvisos } from '../_lib/push.js';

const MENSAJES = [
  'Buenos días 🦍 Hoy toca pesaje: pésate en ayunas, después del baño, y anótalo en la app. Toma 10 segundos ⚖️',
  'Domingo de pesaje ⚖️ En ayunas y después del baño. Anótalo en la app y mañana ves tu semana completa 📊',
  'Hora de pesarte 🦍 Un dato por semana basta para ver tu avance real. Anótalo en Inicio ⚖️',
];

export default async function handler(req, res) {
  if (!verificarCronSecret(req)) return res.status(401).json({ error: 'No autorizado' });

  const supabase = getSupabase();
  setupWebPush();
  const { hoyISO } = horaYFechaPeru();

  try {
    const { data: alumnos, error } = await supabase
      .from('alumnos').select('username').eq('enabled', true).gte('fecha_vencimiento', hoyISO);
    if (error) throw error;
    const usernames = (alumnos || []).map(a => a.username);
    if (!usernames.length) return res.status(200).json({ ok: true, enviados: 0, motivo: 'sin alumnos activos' });

    const { data: datos } = await supabase.from('datos_alumnos').select('username, form').in('username', usernames);
    const destino = (datos || [])
      .filter(d => Number(d.form?.peso) > 0 && d.form?.pesoFecha !== hoyISO)
      .map(d => d.username);
    if (!destino.length) return res.status(200).json({ ok: true, enviados: 0, motivo: 'nadie con peso anotado' });

    const body = MENSAJES[Math.floor(Math.random() * MENSAJES.length)];
    // Presupuesto de avisos: es el aviso especial de la mañana del domingo.
    const conCupo = await conPresupuesto(supabase, destino, { momento: 'manana', especial: true, hoyISO });
    let enviados = 0; const fallidos = [];
    await Promise.all(conCupo.map(async u => {
      const r = await enviarPushA(supabase, [u], { title: 'Jonah 🦍', body, url: '/' });
      enviados += r.enviados; fallidos.push(...r.fallidos);
      if (r.enviados > 0) await anotarAvisos(supabase, [u], { tipo: 'pesaje', momento: 'manana', hoyISO });
    }));
    return res.status(200).json({ ok: true, enviados, fallidos, candidatos: destino.length });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
