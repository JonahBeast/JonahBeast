// api/cron/plan-por-vencer.js
//
// Corre una vez al día, a las 9am hora Perú. Avisa sobre el fin de la
// prueba gratis o del plan pagado, y al tocar el aviso la app abre
// directo la pestaña Planes (?ir=planes):
//   - 2 días antes del vencimiento (prueba y plan pagado).
//   - El último día (vence hoy), con el nombre del alumno y el precio
//     más bajo por día.
//   - El día después de vencer, solo para pruebas que no pagaron: un
//     único aviso amable, sin insistir más.
//
// Cron en vercel.json: "0 14 * * *" (14:00 UTC = 09:00 Perú)

import { getSupabase, setupWebPush, verificarCronSecret, horaYFechaPeru, addDaysISO, enviarPushA } from '../_lib/push.js';

const URL_PLANES = '/?ir=planes';

// Mismos planes y precios por defecto que la app (src/App.jsx, PLANES).
const PLANES = [
  { meses: 1, configKey: 'precio_1', precioDefault: 24.90 },
  { meses: 3, configKey: 'precio_3', precioDefault: 64.90 },
  { meses: 6, configKey: 'precio_6', precioDefault: 114.90 },
  { meses: 12, configKey: 'precio_12', precioDefault: 209.90 },
];

async function precioMinimoPorDia(supabase) {
  const precios = {};
  try {
    const { data } = await supabase.from('config').select('key, value').in('key', PLANES.map(p => p.configKey));
    (data || []).forEach(r => { precios[r.key] = Number(r.value); });
  } catch {}
  const minimo = Math.min(...PLANES.map(p => (precios[p.configKey] > 0 ? precios[p.configKey] : p.precioDefault) / (p.meses * 30)));
  return `S/${minimo.toFixed(2)}`;
}

const primerNombre = (n) => (n || '').trim().split(/\s+/)[0] || '';
const esPrueba = (a) => a.plan === 'trial' || a.plan === 'prueba';

export default async function handler(req, res) {
  if (!verificarCronSecret(req)) return res.status(401).json({ error: 'No autorizado' });

  const supabase = getSupabase();
  setupWebPush();
  const { hoyISO } = horaYFechaPeru();
  const en2Dias = addDaysISO(hoyISO, 2);
  const ayer = addDaysISO(hoyISO, -1);

  try {
    const { data: alumnos, error } = await supabase
      .from('alumnos')
      .select('username, plan, nombre, fecha_vencimiento')
      .eq('enabled', true)
      .in('fecha_vencimiento', [en2Dias, hoyISO, ayer]);
    if (error) throw error;
    if (!alumnos || alumnos.length === 0) {
      return res.status(200).json({ ok: true, enviados: 0, motivo: 'nadie vence en 2 días, hoy ni ayer' });
    }

    const precioDia = await precioMinimoPorDia(supabase);
    const envios = [];

    for (const a of alumnos) {
      const nombre = primerNombre(a.nombre);
      let body = null;
      if (a.fecha_vencimiento === en2Dias) {
        body = esPrueba(a)
          ? 'Te quedan 2 días de prueba gratis. Suscríbete antes de que termine y te regalamos 7 días extra 🎁'
          : 'Tu plan vence en 2 días. Renueva ahora y sigue sin interrupciones: tu historial y fotos se mantienen intactos.';
      } else if (a.fecha_vencimiento === hoyISO) {
        body = esPrueba(a)
          ? `Hoy termina tu prueba${nombre ? ', ' + nombre : ''}. Suscríbete hoy y te regalamos 7 días extra 🎁 Desde ${precioDia} al día.`
          : `Hoy vence tu plan${nombre ? ', ' + nombre : ''}. Renueva desde ${precioDia} al día y sigue sin interrupciones 🦍`;
      } else if (a.fecha_vencimiento === ayer && esPrueba(a)) {
        body = `Última oportunidad${nombre ? ', ' + nombre : ''}: si te suscribes hoy, igual te regalamos 7 días extra 🎁 Tu historial te espera 🦍`;
      }
      if (body) envios.push({ username: a.username, body });
    }

    // En paralelo, no uno por uno, para no quedarse sin tiempo.
    const resultados = await Promise.all(envios.map(e =>
      enviarPushA(supabase, [e.username], { title: 'Jonah 🦍', body: e.body, url: URL_PLANES })));
    let enviados = 0; const fallidos = [];
    resultados.forEach(r => { enviados += r.enviados; fallidos.push(...r.fallidos); });

    return res.status(200).json({ ok: true, enviados, fallidos, avisos: envios.length });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
