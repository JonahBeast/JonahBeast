// api/cron/lista-carino-aviso.js
//
// A la 1pm y a las 7:30pm (hora Perú) le avisa al celular de Jonah a quién
// escribirle hoy por WhatsApp (su lista de cariño, src/listaCarino.js), para
// que lo haga en sus ratos libres sin tener que revisar el panel. Al tocar
// el aviso se abre el panel en HOY, donde cada persona tiene su mensaje listo.
// A la de las 7:30pm solo llegan los que aún no recibieron su mensaje (al
// tocar "Escribirle" quedan anotados). Si no hay nadie, no avisa.
// Mismas reglas y orden que el panel (HOY → "📲 Mensajes del día").
//
// Cron en vercel.json: "0 18 * * *" (1pm) y "30 0 * * *" (7:30pm).

import { getSupabase, setupWebPush, verificarCronSecret, horaYFechaPeru, enviarPushA } from '../_lib/push.js';
import { cargarDatosCarino, armarListaCarino } from '../../src/listaCarino.js';

export default async function handler(req, res) {
  if (!verificarCronSecret(req)) return res.status(401).json({ error: 'No autorizado' });
  const { hoyISO } = horaYFechaPeru();
  const supabase = getSupabase();
  setupWebPush();
  try {
    const { data: admin } = await supabase.from('profiles').select('username').eq('role', 'admin').limit(1).maybeSingle();
    if (!admin?.username) return res.status(200).json({ ok: true, enviado: false, motivo: 'sin admin' });

    const lista = armarListaCarino({ ...(await cargarDatosCarino(supabase, hoyISO)), hoyISO });
    if (!lista.length) return res.status(200).json({ ok: true, enviado: false, motivo: 'nadie' });

    const nombres = lista.map(x => String(x.nombre).trim().split(/\s+/)[0]);
    const quien = nombres.length === 1 ? nombres[0]
      : nombres.length > 5 ? `${nombres.slice(0, 5).join(', ')} y ${nombres.length - 5} más`
      : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
    const r = await enviarPushA(supabase, [admin.username], {
      title: lista.length === 1 ? '📲 1 mensaje para mandar hoy' : `📲 ${lista.length} mensajes para mandar hoy`,
      body: `${quien}. Toca aquí: están en orden en "Mensajes del día", cada uno con su mensaje listo. Solo tocas "Escribirle" y envías.`,
      url: '/',
    });
    return res.status(200).json({ ok: true, enviados: r.enviados || 0, personas: lista.length });
  } catch (e) {
    console.error('Error en el aviso de la lista de cariño:', e);
    return res.status(500).json({ ok: false, error: 'No se pudo armar la lista' });
  }
}
