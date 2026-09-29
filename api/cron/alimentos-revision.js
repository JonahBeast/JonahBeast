// api/cron/alimentos-revision.js
//
// Corre cada 15 minutos. Le pide a la función alimentos-pedidos de Supabase
// que la IA:
//  * revise los alimentos que crearon los alumnos y quedaron sin revisar (la
//    app ya los manda a revisar apenas se crean; esto es por si alguno falló);
//  * atienda los pedidos de alimentos pendientes (los de WhatsApp y los que
//    vio la foto llegan solo por aquí; los de la app, al instante).
// Las reglas (cuándo lo decide sola y cuándo se lo deja a Jonah) están en
// la función.
//
// Cron en vercel.json: "*/15 * * * *"

import { verificarCronSecret } from '../_lib/push.js';

const FUNCION = 'https://jnhvpjrxilubkyhculoh.supabase.co/functions/v1/alimentos-pedidos';

export default async function handler(req, res) {
  if (!verificarCronSecret(req)) return res.status(401).json({ error: 'No autorizado' });
  const secreto = process.env.NUEVO_ALUMNO_SECRET;
  if (!secreto) return res.status(200).json({ ok: false, motivo: 'falta NUEVO_ALUMNO_SECRET' });
  try {
    const r = await fetch(FUNCION, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-webhook-secret': secreto },
      body: JSON.stringify({ accion: 'automatico' }),
    });
    const data = await r.json().catch(() => ({}));
    return res.status(200).json({ ok: r.ok, ...data });
  } catch (e) {
    console.error('Error en la atención automática de alimentos:', e);
    return res.status(500).json({ ok: false, error: 'No se pudo atender los alimentos' });
  }
}
