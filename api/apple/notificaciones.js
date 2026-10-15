// api/apple/notificaciones.js
//
// Apple avisa aquí cada novedad de una suscripción de iPhone (App Store
// Server Notifications, versión 2): la compra, cada renovación, cuando el
// alumno apaga la renovación, cuando vence o cuando Apple devuelve el
// dinero. Con esto el plan se extiende solo en cada renovación, aunque el
// alumno no abra la app.
//
// Se configura una vez en App Store Connect → la app → Información de la
// app → "Notificaciones del servidor de App Store": esta dirección
// (https://jonahbeast.com/api/apple/notificaciones), versión 2, en
// producción y en sandbox.
//
// Todo lo que llega viene firmado por Apple y se comprueba la firma antes
// de tocar nada. Responde 200 a Apple salvo cuando falla algo nuestro
// (entonces Apple reintenta); los problemas quedan en los registros de
// Vercel.

import { getSupabase } from '../_lib/push.js';
import { leerFirmadoApple, procesarTransaccion } from '../_lib/apple.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  let aviso;
  try {
    aviso = leerFirmadoApple(req.body?.signedPayload);
  } catch (e) {
    console.error('apple/notificaciones: aviso sin firma válida:', String(e?.message || e));
    return res.status(200).json({ ok: false });
  }

  const tipo = aviso.notificationType;
  const datos = aviso.data || {};
  if (!datos.signedTransactionInfo) {
    // Avisos sin compra (por ejemplo, la prueba de Apple "TEST").
    return res.status(200).json({ ok: true, tipo });
  }

  try {
    const supabase = getSupabase();
    const tx = leerFirmadoApple(datos.signedTransactionInfo);
    let renueva;
    if (datos.signedRenewalInfo) {
      try {
        const info = leerFirmadoApple(datos.signedRenewalInfo);
        renueva = info.autoRenewStatus === 1;
      } catch { /* sin datos de renovación */ }
    }
    const r = await procesarTransaccion(supabase, tx, { renueva });
    if (!r.ok) console.error('apple/notificaciones:', tipo, r.error);
    return res.status(200).json({ ok: r.ok, tipo, activado: !!r.activado });
  } catch (e) {
    // Falla nuestra (por ejemplo, la base no respondió): 500 para que Apple
    // vuelva a mandar el aviso más tarde.
    console.error('apple/notificaciones:', tipo, String(e?.message || e));
    return res.status(500).json({ ok: false, tipo });
  }
}
