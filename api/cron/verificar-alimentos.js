// api/cron/verificar-alimentos.js
//
// Corre los lunes a las 9:05am hora Perú. Revisa con las mismas reglas de
// src/verificarAlimentos.js los alimentos que entran a la app sin pasar por
// el código: los agregados por pedidos (alimentos_extra) y los productos
// escaneados con código de barras (productos). Si alguno no cuadra (por
// ejemplo, números de una porción cargados como si fueran de 100 g), le
// avisa a Jonah al celular para que lo corrija. Si todo está bien, no avisa.
// También busca repetidos (src/parecidos.js): los alimentos agregados en la
// última semana que se parecen mucho a uno que ya estaba con otro nombre, o
// que tienen calorías muy distintas de uno casi igual. Solo los de la
// semana, para no repetir cada lunes los que Jonah ya vio.
// (Los alimentos de la lista de la app se revisan al armarla: ver
// scripts/verificar-alimentos.mjs.)
//
// Cron en vercel.json: "5 14 * * 1" (14:05 UTC lunes = 9:05 Perú)

import { getSupabase, setupWebPush, verificarCronSecret, enviarPushA } from '../_lib/push.js';
import { revisarAlimento } from '../../src/verificarAlimentos.js';
import { buscarRepetidos } from '../../src/parecidos.js';
import { ALIMENTOS_APP } from '../_lib/alimentos-app.js';

export default async function handler(req, res) {
  if (!verificarCronSecret(req)) return res.status(401).json({ error: 'No autorizado' });

  const supabase = getSupabase();
  setupWebPush();
  try {
    const [{ data: extras, error: e1 }, { data: productos, error: e2 }] = await Promise.all([
      supabase.from('alimentos_extra').select('id, nombre, estado, grupo, kcal, proteina, carbos, grasa, fibra, unidad, gramos_unidad, creado_en').range(0, 4999),
      supabase.from('productos').select('codigo, nombre, marca, kcal, proteina, carbos, grasa, fibra, porcion_g').range(0, 4999),
    ]);
    if (e1) throw e1;
    if (e2) throw e2;

    const malos = [];
    (extras || []).forEach(a => {
      const problemas = revisarAlimento(a);
      if (problemas.length) malos.push({ nombre: a.estado && a.estado !== '-' ? `${a.nombre} (${a.estado})` : a.nombre, problemas });
    });
    (productos || []).forEach(p => {
      const problemas = revisarAlimento({ ...p, unidad: p.porcion_g ? 'porción' : null, gramos_unidad: p.porcion_g });
      if (problemas.length) malos.push({ nombre: `${p.nombre}${p.marca ? ` (${p.marca})` : ''} · producto`, problemas });
    });

    // Repetidos: los de la última semana contra todos (la app y los agregados).
    const semana = Date.now() - 8 * 24 * 3600 * 1000;
    const repetidos = buscarRepetidos(extras || [], ALIMENTOS_APP)
      .filter(r => (extras || []).some(a => new Date(a.creado_en).getTime() > semana
        && r.nombre === (a.estado && a.estado !== '-' ? `${a.nombre} (${String(a.estado).toLowerCase()})` : a.nombre)));
    repetidos.forEach(r => malos.push(r));

    const revisados = (extras || []).length + (productos || []).length;
    if (!malos.length) return res.status(200).json({ ok: true, revisados, problemas: 0 });

    const { data: admins } = await supabase.from('profiles').select('username').eq('role', 'admin');
    const lista = malos.slice(0, 3).map(m => m.nombre).join(', ');
    const body = `🔎 Revisión de alimentos: ${malos.length} ${malos.length === 1 ? 'alimento para revisar' : 'alimentos para revisar'} (${lista}${malos.length > 3 ? '…' : ''})${repetidos.length ? `, ${repetidos.length} ${repetidos.length === 1 ? 'puede estar repetido' : 'pueden estar repetidos'}` : ''}. Revísalos en "Alimentos por revisar" o pregúntale a Jarvis.`;
    const r = await enviarPushA(supabase, (admins || []).map(a => a.username).filter(Boolean), { title: 'Jarvis 🦍', body, url: '/' });
    return res.status(200).json({ ok: true, revisados, problemas: malos.length, detalle: malos, avisado: r.enviados });
  } catch (e) {
    console.error('Error en verificar-alimentos:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
