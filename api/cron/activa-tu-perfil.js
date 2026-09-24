// api/cron/activa-tu-perfil.js
//
// Corre una vez al día a las 12:30pm hora Perú (hora de almuerzo, el
// mejor momento para tomarle foto al plato). Avisos de arranque para
// alumnos nuevos, alineados con la app: lo primero es registrar una
// comida, no las medidas.
//   - Quien todavía NO registró ninguna comida recibe un aviso en sus
//     días 1, 2, 3 y 5 desde que se inscribió (un mensaje distinto cada
//     día). Al tocarlo se abre directo el registro de la comida de ahora.
//   - Quien ya registra comidas pero no tiene sus datos u objetivo
//     recibe UN solo aviso amable (día 3) para ajustar su meta; al
//     tocarlo se abre su pantalla de datos u objetivo.
//
// Cron en vercel.json: "30 17 * * *" (17:30 UTC = 12:30 Perú)

import { getSupabase, setupWebPush, verificarCronSecret, horaYFechaPeru, diasDesde, enviarPushA } from '../_lib/push.js';

const PRIMERA_COMIDA = {
  1: '¿Qué vas a almorzar hoy? Tómale una foto y te digo cuántas calorías y proteína tiene 📸',
  2: 'Tu primer registro toma 10 segundos: foto al plato y listo. Hoy empezamos 🦍',
  3: 'Aquí sigo. Registra solo tu almuerzo de hoy y mira lo que la app hace con él 🔥',
  5: 'Tu prueba gratis sigue activa. Una foto a tu plato y arrancamos juntos cuando quieras 💪',
};
// Misma regla que la app (src/App.jsx → tieneDatosBasicos): los valores
// de ejemplo (70 kg, 170 cm, cintura 85) no cuentan como datos reales.
function tieneDatosBasicos(f) {
  const edad = Number(f?.edad), estatura = Number(f?.estatura), peso = Number(f?.peso);
  if (!(edad > 0 && estatura >= 90 && peso >= 20)) return false;
  return !(peso === 70 && estatura === 170 && Number(f?.cintura) === 85);
}

const AJUSTA_META = { dia: 3, body: 'Vas bien registrando 💪 Ahora ajusta tu meta a tu cuerpo: edad, estatura y peso, 30 segundos.' };

export default async function handler(req, res) {
  if (!verificarCronSecret(req)) return res.status(401).json({ error: 'No autorizado' });

  const supabase = getSupabase();
  setupWebPush();
  const { hoyISO } = horaYFechaPeru();

  try {
    const { data: alumnos, error } = await supabase
      .from('alumnos').select('username, fecha_inicio')
      .eq('enabled', true).gte('fecha_vencimiento', hoyISO);
    if (error) throw error;

    const candidatos = (alumnos || []).filter(a => a.fecha_inicio && diasDesde(a.fecha_inicio, hoyISO) >= 1 && diasDesde(a.fecha_inicio, hoyISO) <= 5);
    if (!candidatos.length) return res.status(200).json({ ok: true, enviados: 0, motivo: 'nadie en sus primeros 5 días' });

    const usernames = candidatos.map(a => a.username);
    const [{ data: comidas }, { data: datos }] = await Promise.all([
      supabase.from('historial').select('username').in('username', usernames).gt('comidas_count', 0),
      supabase.from('datos_alumnos').select('username, form').in('username', usernames),
    ]);
    const registro = new Set((comidas || []).map(r => r.username));
    const metaLista = {};
    (datos || []).forEach(d => {
      const f = d.form || {};
      metaLista[d.username] = !!f.objetivo && tieneDatosBasicos(f);
    });

    const envios = [];
    for (const a of candidatos) {
      const dia = diasDesde(a.fecha_inicio, hoyISO);
      if (!registro.has(a.username)) {
        if (PRIMERA_COMIDA[dia]) envios.push({ username: a.username, body: PRIMERA_COMIDA[dia], url: '/?registrar=ahora', tipo: 'primera_comida' });
      } else if (!metaLista[a.username] && dia === AJUSTA_META.dia) {
        envios.push({ username: a.username, body: AJUSTA_META.body, url: '/?ir=meta', tipo: 'ajusta_meta' });
      }
    }

    // En paralelo, no uno por uno, para no quedarse sin tiempo.
    const resultados = await Promise.all(envios.map(e =>
      enviarPushA(supabase, [e.username], { title: 'Jonah 🦍', body: e.body, url: e.url })));
    let enviados = 0; const fallidos = [];
    resultados.forEach(r => { enviados += r.enviados; fallidos.push(...r.fallidos); });

    return res.status(200).json({
      ok: true, enviados, fallidos,
      primera_comida: envios.filter(e => e.tipo === 'primera_comida').length,
      ajusta_meta: envios.filter(e => e.tipo === 'ajusta_meta').length,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
