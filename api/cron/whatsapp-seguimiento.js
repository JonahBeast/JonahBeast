// api/cron/whatsapp-seguimiento.js
//
// Corre cada hora. Le pide al asistente de WhatsApp (función whatsapp-webhook
// de Supabase) que haga el seguimiento: recordar crear la cuenta a quien
// preguntó y no se registró, y dar la bienvenida a quien ya lo hizo. El
// horario (8am a 9pm de Perú) y todas las reglas están en la función.
//
// Cron en vercel.json: "20 * * * *" (a los 20 minutos de cada hora)

import { verificarCronSecret } from '../_lib/push.js';

const FUNCION = 'https://jnhvpjrxilubkyhculoh.supabase.co/functions/v1/whatsapp-webhook';

export default async function handler(req, res) {
  if (!verificarCronSecret(req)) return res.status(401).json({ error: 'No autorizado' });
  const secreto = process.env.NUEVO_ALUMNO_SECRET;
  if (!secreto) return res.status(200).json({ ok: false, motivo: 'falta NUEVO_ALUMNO_SECRET' });
  try {
    const r = await fetch(FUNCION, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-webhook-secret': secreto },
      body: JSON.stringify({ accion: 'seguimiento' }),
    });
    const data = await r.json().catch(() => ({}));
    return res.status(200).json({ ok: r.ok, ...data });
  } catch (e) {
    console.error('Error en el seguimiento de WhatsApp:', e);
    return res.status(500).json({ ok: false, error: 'No se pudo hacer el seguimiento' });
  }
}
