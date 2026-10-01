// api/cron/lista-carino-aviso.js
//
// Corre cada hora (de 7am a 9pm, hora Perú) y le avisa al celular de Jonah
// apenas aparece alguien nuevo en "📲 Mensajes del día" (src/listaCarino.js):
// una prueba que termina, un alumno que no arranca, uno que se frenó…, con
// el mensaje ya listo en el panel (HOY). Jonah lo manda en el momento; no
// se espera a una hora fija.
//   - La bienvenida de cada inscrito ya llega al instante por
//     api/nuevo-alumno.js; aquí no se repite.
//   - Cada persona se avisa una sola vez por paso y por día (config →
//     lista_carino_avisados).
//   - A las 7pm, si quedó algo sin mandar, un solo recordatorio con lo que
//     falta.
// De noche (10pm a 7am) no avisa: lo que aparezca sale a las 7am.
//
// Cron en vercel.json: "10 * * * *" (a los 10 minutos de cada hora).

import { getSupabase, setupWebPush, verificarCronSecret, horaYFechaPeru, enviarPushA } from '../_lib/push.js';
import { cargarDatosCarino, armarListaCarino, ETAPAS } from '../../src/listaCarino.js';

const CLAVE_AVISADOS = 'lista_carino_avisados';
const primer = x => String(x.nombre || '').trim().split(/\s+/)[0] || x.username;
const enLista = nombres => nombres.length === 1 ? nombres[0]
  : nombres.length > 5 ? `${nombres.slice(0, 5).join(', ')} y ${nombres.length - 5} más`
  : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;

export default async function handler(req, res) {
  if (!verificarCronSecret(req)) return res.status(401).json({ error: 'No autorizado' });
  const { horaPeru: hora, hoyISO } = horaYFechaPeru();
  if (hora >= 22 || hora < 7) return res.status(200).json({ ok: true, enviado: false, motivo: 'de noche' });

  const supabase = getSupabase();
  setupWebPush();
  try {
    const { data: admin } = await supabase.from('profiles').select('username').eq('role', 'admin').limit(1).maybeSingle();
    if (!admin?.username) return res.status(200).json({ ok: true, enviado: false, motivo: 'sin admin' });

    const lista = armarListaCarino({ ...(await cargarDatosCarino(supabase, hoyISO)), hoyISO });
    const { data: cfg } = await supabase.from('config').select('value').eq('key', CLAVE_AVISADOS).maybeSingle();
    let avisados = {};
    try { avisados = JSON.parse(cfg?.value || '{}') || {}; } catch { avisados = {}; }
    // Solo se guarda lo de hoy.
    Object.keys(avisados).forEach(u => { if (!String(avisados[u]).endsWith('|' + hoyISO)) delete avisados[u]; });

    const marca = x => `${x.etapa}|${hoyISO}`;
    const nuevos = lista.filter(x => x.etapa !== 'bienvenida' && avisados[x.username] !== marca(x));
    const avisos = [];
    if (nuevos.length === 1) {
      const x = nuevos[0];
      const etapa = ETAPAS.find(e => e.id === x.etapa);
      avisos.push({
        title: `📲 Mensaje para mandar: ${primer(x)}`,
        body: `${etapa ? etapa.titulo + ' · ' : ''}${x.motivo}. Toca aquí: su mensaje está listo en Mensajes del día, solo tocas "Escribirle".`,
      });
    } else if (nuevos.length > 1) {
      avisos.push({
        title: `📲 ${nuevos.length} mensajes para mandar`,
        body: `${enLista(nuevos.map(primer))}. Toca aquí: están en orden en Mensajes del día, cada uno con su mensaje listo.`,
      });
    }
    // 7pm: lo que quedó sin mandar (si no hubo un aviso recién).
    if (hora === 19 && !avisos.length && lista.length) {
      avisos.push({
        title: `⏰ Te ${lista.length === 1 ? 'queda 1 mensaje' : `quedan ${lista.length} mensajes`} de hoy`,
        body: `${enLista(lista.map(primer))}. Están listos en Mensajes del día.`,
      });
    }
    if (!avisos.length) return res.status(200).json({ ok: true, enviado: false, pendientes: lista.length });

    let enviados = 0;
    for (const a of avisos) enviados += (await enviarPushA(supabase, [admin.username], { ...a, url: '/' })).enviados || 0;
    nuevos.forEach(x => { avisados[x.username] = marca(x); });
    await supabase.from('config').upsert({ key: CLAVE_AVISADOS, value: JSON.stringify(avisados) });
    return res.status(200).json({ ok: true, enviados, nuevos: nuevos.length, pendientes: lista.length });
  } catch (e) {
    console.error('Error en el aviso de mensajes del día:', e);
    return res.status(500).json({ ok: false, error: 'No se pudo armar la lista' });
  }
}
