// api/cron/alimentos-revision.js
//
// Corre cada hora. Le pide a la función alimentos-pedidos de Supabase que la
// IA revise los alimentos que crearon los alumnos y quedaron sin revisar (la
// app ya los manda a revisar apenas se crean; esto es por si alguno falló).
// Las reglas (cuándo lo decide sola y cuándo se lo deja a Jonah) están en
// la función.
//
// Cron en vercel.json: "35 * * * *" (a los 35 minutos de cada hora)

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
      body: JSON.stringify({ accion: 'revisar_propios' }),
    });
    const data = await r.json().catch(() => ({}));
    return res.status(200).json({ ok: r.ok, ...data });
  } catch (e) {
    console.error('Error en la revisión de alimentos:', e);
    return res.status(500).json({ ok: false, error: 'No se pudo revisar los alimentos' });
  }
}
