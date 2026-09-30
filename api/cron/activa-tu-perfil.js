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
//   - Quien ya registra comidas pero NUNCA probó la foto (captura
//     inteligente) recibe una invitación en sus días 2 y 4. Al tocarla
//     se abre la cámara directo (&foto=1).
// Los avisos que invitan a tomar foto abren la cámara directo.
//
// Cron en vercel.json: "30 17 * * *" (17:30 UTC = 12:30 Perú)

import { getSupabase, setupWebPush, verificarCronSecret, horaYFechaPeru, diasDesde, avisoConPresupuesto } from '../_lib/push.js';

const PRIMERA_COMIDA = {
  1: '¿Qué vas a almorzar hoy? Tómale una foto y te digo cuántas calorías y proteína tiene 📸',
  2: 'Tu primer registro toma 10 segundos: foto al plato y listo. Hoy empezamos 🦍',
  3: 'Aquí sigo. Registra solo tu almuerzo de hoy y mira lo que la app hace con él 🔥',
  5: 'Tu Premium de prueba sigue activo. Una foto a tu plato y arrancamos juntos cuando quieras 💪',
};
// Misma regla que la app (src/App.jsx → tieneDatosBasicos): los valores
// de ejemplo (70 kg, 170 cm, cintura 85) no cuentan como datos reales.
function tieneDatosBasicos(f) {
  const edad = Number(f?.edad), estatura = Number(f?.estatura), peso = Number(f?.peso);
  if (!(edad > 0 && estatura >= 90 && peso >= 20)) return false;
  return !(peso === 70 && estatura === 170 && Number(f?.cintura) === 85);
}

// Invitación a probar la foto, para quien registra comidas sin usarla.
// En Premium (prueba o plan) tiene foto en todas sus comidas.
const PRUEBA_LA_FOTO = {
  2: (a) => a.plan === 'trial' || a.plan === 'prueba'
    ? 'Con tu Premium de prueba tienes foto en todas tus comidas 📸 Tómale foto a la próxima y te digo calorías y proteína en segundos.'
    : 'Tienes foto en todas tus comidas 📸 Tómale foto a la próxima y te digo calorías y proteína en segundos.',
  4: () => '¿Ya probaste la captura inteligente? Foto a tu plato y la IA lo registra por ti 🍽️📸',
};

const AJUSTA_META = { dia: 3, body: 'Vas bien registrando 💪 Ahora ajusta tu meta a tu cuerpo: edad, estatura y peso, 30 segundos.' };

export default async function handler(req, res) {
  if (!verificarCronSecret(req)) return res.status(401).json({ error: 'No autorizado' });

  const supabase = getSupabase();
  setupWebPush();
  const { hoyISO } = horaYFechaPeru();

  try {
    const { data: alumnos, error } = await supabase
      .from('alumnos').select('username, fecha_inicio, plan')
      .eq('enabled', true).gte('fecha_vencimiento', hoyISO);
    if (error) throw error;

    const candidatos = (alumnos || []).filter(a => a.fecha_inicio && diasDesde(a.fecha_inicio, hoyISO) >= 1 && diasDesde(a.fecha_inicio, hoyISO) <= 5);
    if (!candidatos.length) return res.status(200).json({ ok: true, enviados: 0, motivo: 'nadie en sus primeros 5 días' });

    const usernames = candidatos.map(a => a.username);
    const [{ data: comidas }, { data: datos }, { data: fotos }] = await Promise.all([
      supabase.from('historial').select('username').in('username', usernames).gt('comidas_count', 0),
      supabase.from('datos_alumnos').select('username, form').in('username', usernames),
      // Fotos de comida (no cuenta leer etiquetas de productos).
      supabase.from('fotos_reconocimiento_uso').select('username, periodo').in('username', usernames).gt('usadas', 0),
    ]);
    const registro = new Set((comidas || []).map(r => r.username));
    const usoFoto = new Set((fotos || []).filter(r => !String(r.periodo || '').startsWith('etiqueta-')).map(r => r.username));
    const metaLista = {};
    (datos || []).forEach(d => {
      const f = d.form || {};
      metaLista[d.username] = !!f.objetivo && tieneDatosBasicos(f);
    });

    const envios = [];
    for (const a of candidatos) {
      const dia = diasDesde(a.fecha_inicio, hoyISO);
      if (!registro.has(a.username)) {
        if (PRIMERA_COMIDA[dia]) envios.push({ username: a.username, body: PRIMERA_COMIDA[dia], url: '/?registrar=ahora&foto=1', tipo: 'primera_comida' });
      } else if (!metaLista[a.username] && dia === AJUSTA_META.dia) {
        envios.push({ username: a.username, body: AJUSTA_META.body, url: '/?ir=meta', tipo: 'ajusta_meta' });
      } else if (!usoFoto.has(a.username) && PRUEBA_LA_FOTO[dia]) {
        envios.push({ username: a.username, body: PRUEBA_LA_FOTO[dia](a), url: '/?registrar=ahora&foto=1', tipo: 'prueba_la_foto' });
      }
    }

    // En paralelo, no uno por uno, para no quedarse sin tiempo.
    const resultados = await Promise.all(envios.map(e =>
      avisoConPresupuesto(supabase, e.username, { title: 'Jonah 🦍', body: e.body, url: e.url }, { tipo: 'arranque', momento: 'mediodia', especial: true, hoyISO })));
    let enviados = 0; const fallidos = [];
    resultados.forEach(r => { enviados += r.enviados; fallidos.push(...r.fallidos); });

    return res.status(200).json({
      ok: true, enviados, fallidos,
      primera_comida: envios.filter(e => e.tipo === 'primera_comida').length,
      ajusta_meta: envios.filter(e => e.tipo === 'ajusta_meta').length,
      prueba_la_foto: envios.filter(e => e.tipo === 'prueba_la_foto').length,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
