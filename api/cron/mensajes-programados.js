// api/cron/mensajes-programados.js
//
// Cada hora: saca los 📣 mensajes a todos que ya llegaron a su hora
// (tabla mensajes_masivos, estado 'programado'). De noche no hace nada: los
// mensajes guardados para esas horas ya quedan para las 8 a.m.

import { getSupabase, setupWebPush, verificarCronSecret } from '../_lib/push.js';
import { enviarMensajeMasivo, esHoraDeSonar } from '../_lib/mensaje-masivo.js';

export default async function handler(req, res) {
  if (!verificarCronSecret(req)) return res.status(401).json({ error: 'No autorizado' });
  if (!esHoraDeSonar()) return res.status(200).json({ ok: true, enviados: 0, motivo: 'de noche' });

  const supabase = getSupabase();
  setupWebPush();
  try {
    const { data: pendientes, error } = await supabase.from('mensajes_masivos')
      .select('*').eq('estado', 'programado').lte('programado_para', new Date().toISOString())
      .order('programado_para').limit(3);
    if (error) throw error;
    const salieron = [];
    for (const m of pendientes || []) {
      const final = await enviarMensajeMasivo(supabase, m);
      if (final) salieron.push({ id: final.id, destinatarios: final.destinatarios.length, push: final.push_enviados });
    }
    return res.status(200).json({ ok: true, salieron });
  } catch (e) {
    console.error('mensajes-programados:', e);
    return res.status(500).json({ error: e.message });
  }
}
