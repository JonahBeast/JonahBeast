// api/cron/embudo-historico.js
//
// Corre una vez al día, al final del día (23:59 hora Perú), y guarda
// una foto del estado del embudo de ventas: cuántos leads, cuántos en
// prueba gratis, cuántos pagando y cuántos vencidos hay en ese
// momento. Con esto acumulado día a día, más adelante se puede
// graficar cómo evoluciona el embudo en el tiempo — hoy el panel de
// admin solo muestra el estado actual, sin historial.
//
// Se guarda como upsert por fecha: si el cron corre dos veces el
// mismo día (o se reintenta), no duplica la fila, solo la actualiza.

import { getSupabase, verificarCronSecret, horaYFechaPeru } from '../_lib/push.js';

export default async function handler(req, res) {
  if (!verificarCronSecret(req)) return res.status(401).json({ error: 'No autorizado' });

  const supabase = getSupabase();
  const { hoyISO } = horaYFechaPeru();

  try {
    const [{ count: leadsCount }, { data: alumnos }] = await Promise.all([
      supabase.from('leads').select('id', { count: 'exact', head: true }),
      supabase.from('alumnos').select('plan, enabled, fecha_vencimiento'),
    ]);

    // Misma clasificación que usa el panel de Embudo en el frontend:
    // deshabilitado o vencido por fecha cuenta como "vencido", sin
    // importar qué plan tenía.
    let enPrueba = 0, pagando = 0, vencidos = 0;
    (alumnos || []).forEach(a => {
      const vencidoPorFecha = a.fecha_vencimiento && a.fecha_vencimiento < hoyISO;
      if (!a.enabled || vencidoPorFecha) { vencidos++; return; }
      if (a.plan === 'trial' || a.plan === 'prueba') enPrueba++;
      else if (a.plan === 'pago') pagando++;
    });

    const { error } = await supabase.from('embudo_historico').upsert({
      fecha: hoyISO,
      leads: leadsCount || 0,
      en_prueba: enPrueba,
      pagando,
      vencidos,
    }, { onConflict: 'fecha' });
    if (error) throw error;

    return res.status(200).json({ ok: true, fecha: hoyISO, leads: leadsCount || 0, en_prueba: enPrueba, pagando, vencidos });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
