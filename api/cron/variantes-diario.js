// api/cron/variantes-diario.js
//
// Corre una vez al día (11am hora Perú). Si hay variantes de platos por
// revisar (las que propone la IA al agregar un pedido, ej. con "Jalea de
// pescado" también "Jalea mixta"), le manda a Jonah Beast (admin) un solo
// aviso para que las revise en el panel. Nadie las está esperando, por eso
// no se avisa cada vez que aparece una. Si no hay ninguna, no manda nada.
//
// Cron en vercel.json: "10 16 * * *" (16:10 UTC = 11:10 Perú)

import { getSupabase, setupWebPush, verificarCronSecret, enviarPushA } from '../_lib/push.js';

export default async function handler(req, res) {
  if (!verificarCronSecret(req)) return res.status(401).json({ error: 'No autorizado' });

  const supabase = getSupabase();
  setupWebPush();
  try {
    const { data: admin } = await supabase.from('profiles').select('username').eq('role', 'admin').limit(1).maybeSingle();
    if (!admin?.username) return res.status(200).json({ ok: true, enviado: false, motivo: 'sin admin' });

    const desde = new Date(Date.now() - 60 * 864e5).toISOString();
    const { data: pedidos } = await supabase.from('pedidos_alimentos')
      .select('nombre, propuesta').eq('estado', 'agregado').not('propuesta->variantes_resultado', 'is', null)
      .gte('resuelto_en', desde).range(0, 499);
    const variantes = (pedidos || []).flatMap(p => (p.propuesta?.variantes_resultado || []).filter(v => v.estado === 'sugerida'));
    if (!variantes.length) return res.status(200).json({ ok: true, enviado: false, motivo: 'nada por revisar' });

    const ejemplos = variantes.slice(0, 2).map(v => v.etiqueta || v.nombre).join(', ');
    const r = await enviarPushA(supabase, [admin.username], {
      title: '🧩 Variantes por revisar',
      body: variantes.length === 1
        ? `La IA propone agregar "${ejemplos}". Revísala en HOY → Variantes por revisar.`
        : `La IA propone ${variantes.length} variantes de platos (${ejemplos}…). Revísalas en HOY → Variantes por revisar.`,
      url: '/',
    });
    return res.status(200).json({ ok: true, enviados: r.enviados, variantes: variantes.length });
  } catch (e) {
    console.error('Error en el aviso de variantes:', e);
    return res.status(500).json({ ok: false, error: 'No se pudo armar el aviso' });
  }
}
