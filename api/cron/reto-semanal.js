// api/cron/reto-semanal.js
//
// Corre una vez a la semana, el sábado a las 6pm hora Perú. Si el
// alumno todavía no marcó su reto semanal como completado (tabla
// retos_semanales, sincronizada desde la app), le manda un recordatorio
// suave con el texto exacto del reto de esa semana.
//
// Cron sugerido en vercel.json: "0 23 * * 6" (23:00 UTC sábado = 18:00 Perú sábado)

import { getSupabase, setupWebPush, verificarCronSecret, horaYFechaPeru, numeroDeSemana, enviarPushA, conPresupuesto, anotarAvisos, preferenciasAvisos, sinApagados } from '../_lib/push.js';

// Debe coincidir exactamente con RETOS_SEMANALES en App.jsx —si agregas
// o cambias retos ahí, actualiza también esta lista.
const RETOS_SEMANALES = [
  'Registra 5 desayunos distintos esta semana',
  'Prueba un alimento nuevo del buscador esta semana',
  'Llega a tu objetivo de proteína 4 días seguidos',
  'Registra tus 3 comidas principales todos los días',
  'Toma tus fotos de progreso esta semana',
  'Prueba un combo nuevo de "¿Qué puedo comer?"',
];

export default async function handler(req, res) {
  if (!verificarCronSecret(req)) return res.status(401).json({ error: 'No autorizado' });

  const supabase = getSupabase();
  setupWebPush();
  const { hoyISO } = horaYFechaPeru();
  const semana = numeroDeSemana(hoyISO);
  const textoReto = RETOS_SEMANALES[semana % RETOS_SEMANALES.length];

  try {
    const { data: alumnos, error } = await supabase
      .from('alumnos').select('username').eq('enabled', true).gte('fecha_vencimiento', hoyISO);
    if (error) throw error;
    if (!alumnos || alumnos.length === 0) {
      return res.status(200).json({ ok: true, enviados: 0, motivo: 'sin alumnos activos' });
    }

    const usernames = alumnos.map(a => a.username);

    const { data: completados } = await supabase
      .from('retos_semanales')
      .select('username')
      .eq('semana', semana)
      .eq('completado', true)
      .in('username', usernames);

    const yaCompletaron = new Set((completados || []).map(r => r.username));
    const pendientes = usernames.filter(u => !yaCompletaron.has(u));

    if (pendientes.length === 0) {
      return res.status(200).json({ ok: true, enviados: 0, motivo: 'todos completaron su reto' });
    }

    // Presupuesto de avisos: es el aviso especial de la noche del sábado.
    const conCupo = await conPresupuesto(supabase, sinApagados(await preferenciasAvisos(supabase), pendientes, 'retos'), { momento: 'noche', especial: true, hoyISO });
    let enviados = 0; const fallidos = [];
    await Promise.all(conCupo.map(async u => {
      const r = await enviarPushA(supabase, [u], {
        title: 'Beast 🦍',
        body: `Reto de esta semana: ${textoReto}. Este fin de semana es tu última oportunidad.`,
      });
      enviados += r.enviados; fallidos.push(...r.fallidos);
      if (r.enviados > 0) await anotarAvisos(supabase, [u], { tipo: 'reto_semanal', momento: 'noche', hoyISO });
    }));

    return res.status(200).json({ ok: true, enviados, fallidos, semana, pendientes: pendientes.length });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
