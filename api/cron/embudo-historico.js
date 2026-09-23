// api/cron/embudo-historico.js
//
// Corre una vez al día, al final del día (23:59 hora Perú), y guarda
// una foto del estado del embudo de ventas: cuántos leads, cuántos en
// prueba gratis, cuántos pagando y cuántos vencidos hay en ese
// momento. Con esto acumulado día a día, más adelante se puede
// graficar cómo evoluciona el embudo en el tiempo — hoy el panel de
// admin solo muestra el estado actual, sin historial.
//
// También guarda el paso de la landing de ese día (hora Perú):
// visitantes únicos, cuántos de ellos tocaron el botón de prueba gratis
// y cuántos se registraron. Así se puede ver la evolución día a día.
//
// Se guarda como upsert por fecha: si el cron corre dos veces el
// mismo día (o se reintenta), no duplica la fila, solo la actualiza.

import { getSupabase, verificarCronSecret, horaYFechaPeru } from '../_lib/push.js';

// Eventos de la landing del día en Perú (UTC-5): de 00:00 a 24:00 hora
// Perú = de 05:00 UTC de ese día a 05:00 UTC del día siguiente.
async function pasoLandingDelDia(supabase, hoyISO) {
  const desde = `${hoyISO}T05:00:00.000Z`;
  const hasta = new Date(Date.parse(desde) + 24 * 3600 * 1000).toISOString();
  const filas = [];
  for (let desdeFila = 0; ; desdeFila += 1000) {
    const { data, error } = await supabase.from('embudo_landing_eventos')
      .select('id, evento, visitante_id')
      .gte('creado_en', desde).lt('creado_en', hasta)
      .order('creado_en', { ascending: true })
      .range(desdeFila, desdeFila + 999);
    if (error) throw error;
    filas.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  // Personas, no eventos: mismo criterio que el panel de la landing.
  const visitantes = new Set(), clics = new Set(), registros = new Set();
  filas.forEach(r => {
    const quien = r.visitante_id || ('evento-' + r.id);
    if (r.evento === 'vista') visitantes.add(quien);
    else if (r.evento === 'clic_cta') clics.add(quien);
    else if (r.evento === 'registro') registros.add(quien);
  });
  return { visitantes: visitantes.size, clics: clics.size, registros: registros.size };
}

export default async function handler(req, res) {
  if (!verificarCronSecret(req)) return res.status(401).json({ error: 'No autorizado' });

  const supabase = getSupabase();
  const { hoyISO } = horaYFechaPeru();

  try {
    const [{ count: leadsCount }, { data: alumnos }, landing] = await Promise.all([
      supabase.from('leads').select('id', { count: 'exact', head: true }),
      supabase.from('alumnos').select('plan, enabled, fecha_vencimiento'),
      pasoLandingDelDia(supabase, hoyISO),
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
      ...landing,
    }, { onConflict: 'fecha' });
    if (error) throw error;

    return res.status(200).json({ ok: true, fecha: hoyISO, leads: leadsCount || 0, en_prueba: enPrueba, pagando, vencidos, ...landing });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
