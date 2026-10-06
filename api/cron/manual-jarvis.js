// api/cron/manual-jarvis.js
//
// Corre cada hora (de 7am a 9:59pm, hora Perú). Compara el manual de la app
// que quedó en main (docs/manual-app.md, el que viene con esta versión
// publicada) con el que leen Jarvis y el asistente de WhatsApp (tabla
// manual_app). Si no son iguales, le avisa al celular de Jonah que toque
// "🔄 Actualizar manual de Jarvis y Viernes" en el panel.
//   - Solo en la versión real (production), que es la de main.
//   - Un aviso apenas sale la versión nueva y, si sigue sin actualizarse,
//     uno por día (config → manual_jarvis_avisado).
//
// Cron en vercel.json: "40 * * * *" (a los 40 minutos de cada hora)

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { getSupabase, setupWebPush, verificarCronSecret, horaYFechaPeru, enviarPushA } from '../_lib/push.js';

const CLAVE = 'manual_jarvis_avisado';
const huella = t => createHash('sha256').update(String(t || ''), 'utf8').digest('hex');

export default async function handler(req, res) {
  if (!verificarCronSecret(req)) return res.status(401).json({ error: 'No autorizado' });
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    return res.status(200).json({ ok: true, enviado: false, motivo: 'no es la versión real' });
  }
  const { horaPeru: hora, hoyISO } = horaYFechaPeru();
  if (hora >= 22 || hora < 7) return res.status(200).json({ ok: true, enviado: false, motivo: 'de noche' });

  const supabase = getSupabase();
  try {
    const manualMain = readFileSync(join(process.cwd(), 'docs', 'manual-app.md'), 'utf8');
    const { data: fila, error } = await supabase.from('manual_app').select('texto, commit_main').eq('id', 1).maybeSingle();
    if (error) throw error;
    if (huella(fila?.texto) === huella(manualMain)) return res.status(200).json({ ok: true, enviado: false, alDia: true });

    const commit = (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || 'main';
    const marca = `${commit}|${hoyISO}`;
    const { data: cfg } = await supabase.from('config').select('value').eq('key', CLAVE).maybeSingle();
    if (cfg?.value === marca) return res.status(200).json({ ok: true, enviado: false, alDia: false, yaAvisado: true });

    const { data: admin } = await supabase.from('profiles').select('username').eq('role', 'admin').limit(1).maybeSingle();
    if (!admin?.username) return res.status(200).json({ ok: true, enviado: false, motivo: 'sin admin' });
    setupWebPush();
    const r = await enviarPushA(supabase, [admin.username], {
      title: '📘 Jarvis y Viernes tienen el manual desactualizado',
      body: 'Salió una versión nueva de la app y Jarvis y Viernes aún leen el manual anterior. Entra al panel → pestaña 📸 IA y toca "🔄 Actualizar manual de Jarvis y Viernes" (es un toque).',
      url: '/',
    });
    await supabase.from('config').upsert({ key: CLAVE, value: marca });
    return res.status(200).json({ ok: true, enviado: true, enviados: r.enviados || 0, commit });
  } catch (e) {
    console.error('Error al revisar el manual de Jarvis y Viernes:', e);
    return res.status(500).json({ ok: false, error: 'No se pudo revisar el manual' });
  }
}
