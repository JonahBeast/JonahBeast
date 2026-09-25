// api/google-play/verificar.js
//
// La app de Android lo llama justo después de que el alumno paga con
// Google Play (y también al abrir Planes, por si quedó alguna compra sin
// activar). Recibe el "purchaseToken" de Google, lo confirma directo con
// Google y activa el plan.
//
// El alumno sale de su sesión iniciada (el token de Supabase que manda la
// app), nunca de un nombre que mande el celular.

import { getSupabase } from '../_lib/push.js';
import { procesarCompra } from '../_lib/google-play.js';

async function usuarioDeLaSesion(supabase, req) {
  const token = String(req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  const { data: perfil } = await supabase.from('profiles').select('username').eq('id', data.user.id).maybeSingle();
  return perfil?.username || null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const supabase = getSupabase();
  const username = await usuarioDeLaSesion(supabase, req);
  if (!username) return res.status(401).json({ error: 'Inicia sesión para activar tu plan.' });

  const { purchaseToken } = req.body || {};
  try {
    const r = await procesarCompra(supabase, { purchaseToken, username });
    return res.status(r.ok ? 200 : 400).json(r);
  } catch (e) {
    console.error('google-play/verificar:', String(e));
    return res.status(500).json({ ok: false, error: 'No pudimos confirmar tu compra con Google. Intenta de nuevo en un momento.' });
  }
}
