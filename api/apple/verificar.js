// api/apple/verificar.js
//
// La app de iPhone lo llama justo después de que el alumno paga con Apple,
// y también con "Restaurar compras" (o al abrir Planes, por si quedó
// alguna compra sin activar). Recibe las compras firmadas por Apple, las
// comprueba con la firma de Apple y activa el plan.
//
// El alumno sale de su sesión iniciada (el token de Supabase que manda la
// app), nunca de un nombre que mande el celular.

import { getSupabase } from '../_lib/push.js';
import { leerFirmadoApple, procesarTransaccion } from '../_lib/apple.js';

async function cuentaDeLaSesion(supabase, req) {
  const token = String(req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  const { data: perfil } = await supabase.from('profiles').select('username').eq('id', data.user.id).maybeSingle();
  return perfil?.username ? { username: perfil.username, cuentaId: data.user.id } : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const supabase = getSupabase();
  const cuenta = await cuentaDeLaSesion(supabase, req);
  if (!cuenta) return res.status(401).json({ ok: false, error: 'Inicia sesión para activar tu plan.' });

  const { compras } = req.body || {};
  const lista = (Array.isArray(compras) ? compras : []).filter((c) => typeof c === 'string').slice(0, 20);
  if (!lista.length) return res.status(400).json({ ok: false, error: 'No llegó ninguna compra.' });

  const resultados = [];
  for (const jws of lista) {
    try {
      const tx = leerFirmadoApple(jws);
      resultados.push(await procesarTransaccion(supabase, tx, cuenta));
    } catch (e) {
      console.error('apple/verificar:', String(e?.message || e));
      resultados.push({ ok: false, error: 'No pudimos confirmar tu compra con Apple.' });
    }
  }

  const activado = resultados.some((r) => r.activado);
  const prueba = resultados.some((r) => r.prueba);
  const yaActivo = resultados.some((r) => r.ok && r.estado === 'activo');
  const error = resultados.find((r) => !r.ok)?.error || null;
  const ok = activado || prueba || yaActivo || (!error && resultados.length > 0);
  return res.status(ok ? 200 : 400).json({ ok, activado, prueba, yaActivo, error, resultados });
}
