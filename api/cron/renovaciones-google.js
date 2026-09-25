// api/cron/renovaciones-google.js
//
// Corre una vez al día. Google Play cobra solo las renovaciones de las
// suscripciones; aquí se le pregunta a Google por cada compra reciente
// y, si hubo un cobro nuevo, se extiende el plan del alumno (aunque no
// haya abierto la app).
//
// Cron en vercel.json: "0 12 * * *" (12:00 UTC = 07:00 Perú)

import { getSupabase, verificarCronSecret } from '../_lib/push.js';
import { procesarCompra } from '../_lib/google-play.js';

export default async function handler(req, res) {
  if (!verificarCronSecret(req)) return res.status(401).json({ error: 'No autorizado' });
  if (!process.env.GOOGLE_PLAY_CUENTA_SERVICIO) {
    return res.status(200).json({ ok: true, revisadas: 0, motivo: 'Google Play aún no configurado' });
  }

  const supabase = getSupabase();
  // Compras que vencen pronto o vencieron hace poco (periodo de gracia o
  // retención de Google, cuando la tarjeta falla y luego se cobra).
  const desde = new Date(Date.now() - 45 * 86400 * 1000).toISOString();
  const hasta = new Date(Date.now() + 2 * 86400 * 1000).toISOString();

  const { data: compras, error } = await supabase.from('compras_google')
    .select('purchase_token').gte('vence_en', desde).lte('vence_en', hasta);
  if (error) return res.status(500).json({ error: error.message });

  let activadas = 0;
  const errores = [];
  for (const c of compras || []) {
    try {
      const r = await procesarCompra(supabase, { purchaseToken: c.purchase_token, username: null });
      if (r.activado) activadas++;
    } catch (e) {
      errores.push(String(e?.message || e));
    }
  }
  return res.status(200).json({ ok: true, revisadas: (compras || []).length, activadas, errores });
}
