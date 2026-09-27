// api/cron/prueba-guiada.js
//
// Corre una vez al día, a las 6:15pm hora Perú. Acompaña la prueba gratis
// de 15 días de quien SÍ está usando la app (registró al menos una comida)
// con 4 avisos en los días que antes no tenían ninguno, para que sienta su
// avance y conozca lo que gana con un plan:
//   - Día 4:  lo que lleva registrado.
//   - Día 7:  su primera semana.
//   - Día 10: las 5 fotos al día que incluye cualquier plan.
//   - Día 12: la historia de Jonah y la invitación a seguir.
// Quien todavía no registró nada ya recibe los avisos de arranque
// (activa-tu-perfil.js). Los días 13, 15 y 16 los cubre plan-por-vencer.js.
// Se cuentan por los días que le quedan a la prueba (fecha_vencimiento).
//
// Cron en vercel.json: "15 23 * * *" (23:15 UTC = 18:15 Perú)

import { getSupabase, setupWebPush, verificarCronSecret, horaYFechaPeru, diasDesde, enviarPushA } from '../_lib/push.js';

const URL_PLANES = '/?ir=planes';
const primerNombre = (n) => (n || '').trim().split(/\s+/)[0] || '';
const esPrueba = (a) => a.plan === 'trial' || a.plan === 'prueba';

// Días que le quedan a la prueba → aviso.
const AVISOS = {
  11: (a, dias) => ({
    body: `${a.nombre ? `${primerNombre(a.nombre)}, llevas` : 'Llevas'} ${dias} ${dias === 1 ? 'día' : 'días'} registrando 💪 Sin prohibir nada, solo midiendo: así empieza el cambio.`,
    url: '/',
  }),
  8: (a, dias) => ({
    body: `Tu primera semana: registraste ${Math.min(dias, 7)} de 7 días. ${dias >= 5 ? 'Eso es constancia de verdad 🔥' : 'Cada día que registras cuenta 🦍'} Mira tu avance en Progreso.`,
    url: '/',
  }),
  5: () => ({
    body: 'Dato: con cualquier plan tienes 5 fotos de comida al día incluidas (en la prueba son 5 por semana) 📸 Te quedan 5 días de prueba.',
    url: URL_PLANES,
  }),
  3: (a) => ({
    body: `Jonah bajó 37 kg midiendo lo que comía, sin dietas raras. Te quedan 3 días de prueba${a.nombre ? `, ${primerNombre(a.nombre)}` : ''}: ¿seguimos juntos? 🦍`,
    url: URL_PLANES,
  }),
};

export default async function handler(req, res) {
  if (!verificarCronSecret(req)) return res.status(401).json({ error: 'No autorizado' });

  const supabase = getSupabase();
  setupWebPush();
  const { hoyISO } = horaYFechaPeru();

  try {
    const { data: alumnos, error } = await supabase
      .from('alumnos').select('username, nombre, plan, fecha_inicio, fecha_vencimiento')
      .eq('enabled', true).gte('fecha_vencimiento', hoyISO);
    if (error) throw error;

    const candidatos = (alumnos || [])
      .filter(a => esPrueba(a) && a.fecha_vencimiento && a.fecha_inicio)
      .map(a => ({ ...a, quedan: diasDesde(hoyISO, a.fecha_vencimiento) }))
      .filter(a => AVISOS[a.quedan]);
    if (!candidatos.length) return res.status(200).json({ ok: true, enviados: 0, motivo: 'nadie en un día con aviso' });

    // Días con comidas registradas desde que empezó la prueba.
    const { data: hist } = await supabase.from('historial').select('username, fecha')
      .in('username', candidatos.map(a => a.username)).gt('comidas_count', 0).range(0, 9999);
    const dias = {};
    (hist || []).forEach(r => { (dias[r.username] = dias[r.username] || new Set()).add(r.fecha); });

    const envios = candidatos
      .map(a => {
        const n = [...(dias[a.username] || [])].filter(f => f >= a.fecha_inicio).length;
        return n > 0 ? { username: a.username, ...AVISOS[a.quedan](a, n) } : null;
      })
      .filter(Boolean);

    const resultados = await Promise.all(envios.map(e =>
      enviarPushA(supabase, [e.username], { title: 'Jonah 🦍', body: e.body, url: e.url })));
    let enviados = 0; const fallidos = [];
    resultados.forEach(r => { enviados += r.enviados; fallidos.push(...r.fallidos); });
    return res.status(200).json({ ok: true, enviados, fallidos, avisos: envios.length });
  } catch (e) {
    console.error('Error en la prueba guiada:', e);
    return res.status(500).json({ ok: false, error: 'No se pudieron enviar los avisos' });
  }
}
