// api/cron/plan-por-vencer.js
//
// Corre una vez al día, a las 9am hora Perú. Avisa a los alumnos cuyo
// plan (o prueba gratis) vence exactamente en 2 días, para que puedan
// renovar a tiempo sin perder su progreso.
//
// Cron sugerido en vercel.json: "0 14 * * *" (14:00 UTC = 09:00 Perú)

import { getSupabase, setupWebPush, verificarCronSecret, horaYFechaPeru, addDaysISO, enviarPushA } from '../_lib/push.js';

const DIAS_DE_AVISO = 2;

export default async function handler(req, res) {
  if (!verificarCronSecret(req)) return res.status(401).json({ error: 'No autorizado' });

  const supabase = getSupabase();
  setupWebPush();
  const { hoyISO } = horaYFechaPeru();
  const fechaObjetivo = addDaysISO(hoyISO, DIAS_DE_AVISO);

  try {
    const { data: alumnos, error } = await supabase
      .from('alumnos')
      .select('username, plan')
      .eq('enabled', true)
      .eq('fecha_vencimiento', fechaObjetivo);

    if (error) throw error;
    if (!alumnos || alumnos.length === 0) {
      return res.status(200).json({ ok: true, enviados: 0, motivo: 'nadie vence en 2 días' });
    }

    const enPrueba = alumnos.filter(a => a.plan === 'trial').map(a => a.username);
    const conPlanPago = alumnos.filter(a => a.plan !== 'trial').map(a => a.username);

    let totalEnviados = 0;
    const fallidosTotal = [];

    if (enPrueba.length) {
      const r = await enviarPushA(supabase, enPrueba, {
        title: 'Jonah 🦍',
        body: 'Te quedan 2 días de prueba gratis. Renueva para conservar tu historial y seguir viendo tu progreso.',
      });
      totalEnviados += r.enviados; fallidosTotal.push(...r.fallidos);
    }
    if (conPlanPago.length) {
      const r = await enviarPushA(supabase, conPlanPago, {
        title: 'Jonah 🦍',
        body: 'Renueva ahora y sigue sin interrupciones. Tu historial y fotos se mantienen intactos.',
      });
      totalEnviados += r.enviados; fallidosTotal.push(...r.fallidos);
    }

    return res.status(200).json({ ok: true, enviados: totalEnviados, fallidos: fallidosTotal, alumnos: alumnos.length });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
