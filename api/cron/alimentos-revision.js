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
// Además, el recordatorio del plazo: al alumno le prometemos respuesta en
// 1 hora (de noche, antes de las 8am; misma regla que src/plazos.js). Si a
// lo que la IA le dejó a Jonah le quedan 20 minutos o menos, le llega un
// aviso al celular (una sola vez por alimento: queda anotado en
// propuesta.recordado / revision_ia.recordado).
//
// Cron en vercel.json: "*/15 * * * *"

import { verificarCronSecret, getSupabase, setupWebPush, enviarPushA } from '../_lib/push.js';

const PERU_MS = 5 * 60 * 60 * 1000;
const AVISAR_ANTES_MS = 20 * 60 * 1000;
// Igual que PLAZOS_DESDE de src/plazos.js: lo de antes no tiene plazo.
const PLAZOS_DESDE = Date.parse('2026-10-04T16:30:00Z');

// Igual que horaLimiteAlimento de src/plazos.js.
function horaLimite(desde) {
  const t = new Date(desde).getTime();
  const peru = new Date(t - PERU_MS);
  const hora = peru.getUTCHours();
  if (hora >= 22 || hora < 7) {
    if (hora >= 22) peru.setUTCDate(peru.getUTCDate() + 1);
    peru.setUTCHours(8, 0, 0, 0);
    return peru.getTime() + PERU_MS;
  }
  return t + 60 * 60 * 1000;
}

async function recordarPlazos() {
  const supabase = getSupabase();
  const ahora = Date.now();
  const toca = desde => desde && new Date(desde).getTime() >= PLAZOS_DESDE && ahora >= horaLimite(desde) - AVISAR_ANTES_MS;
  const [{ data: pedidos }, { data: creados }, { data: admin }] = await Promise.all([
    supabase.from('pedidos_alimentos').select('id, nombre, propuesta, solicitantes')
      .eq('estado', 'pendiente').eq('propuesta->>ia_estado', 'dudoso').range(0, 99),
    supabase.from('alimentos_personales').select('id, nombre, username, created_at, editado_en, revision_ia')
      .eq('revision', 'dudoso').is('reemplazo', null).range(0, 99),
    supabase.from('profiles').select('username').eq('role', 'admin').limit(1).maybeSingle(),
  ]);
  const desdePedido = p => (p.solicitantes || []).filter(s => s?.origen === 'app' || s?.origen === 'whatsapp').map(s => s.fecha).filter(Boolean).sort()[0];
  const pedidosTarde = (pedidos || []).filter(p => !p.propuesta?.recordado && toca(desdePedido(p)));
  const creadosTarde = (creados || []).filter(a => !a.revision_ia?.recordado && toca(a.editado_en || a.created_at));
  const nombres = [...pedidosTarde.map(p => `"${p.nombre}"`), ...creadosTarde.map(a => `"${a.nombre}" (@${a.username})`)];
  if (!nombres.length || !admin?.username) return { recordados: 0 };

  setupWebPush();
  await enviarPushA(supabase, [admin.username], {
    title: '⏰ Alimentos esperando tu respuesta',
    body: nombres.length === 1
      ? `${nombres[0]} está por pasar la hora que le prometimos al alumno. Revísalo en HOY → Alimentos por revisar.`
      : `${nombres.length} alimentos están por pasar la hora prometida: ${nombres.slice(0, 4).join(', ')}${nombres.length > 4 ? '…' : ''}. Revísalos en HOY → Alimentos por revisar.`,
    url: '/',
  });
  const marca = new Date(ahora).toISOString();
  await Promise.all([
    ...pedidosTarde.map(p => supabase.from('pedidos_alimentos').update({ propuesta: { ...p.propuesta, recordado: marca } }).eq('id', p.id).eq('estado', 'pendiente')),
    ...creadosTarde.map(a => supabase.from('alimentos_personales').update({ revision_ia: { ...(a.revision_ia || {}), recordado: marca } }).eq('id', a.id).eq('revision', 'dudoso')),
  ]);
  return { recordados: nombres.length };
}

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
    let plazos = null;
    try { plazos = await recordarPlazos(); } catch (e) { console.error('Recordatorio de plazos:', e); }
    return res.status(200).json({ ok: r.ok, ...data, plazos });
  } catch (e) {
    console.error('Error en la atención automática de alimentos:', e);
    return res.status(500).json({ ok: false, error: 'No se pudo atender los alimentos' });
  }
}
