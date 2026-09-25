// api/aviso-push.js
//
// Manda una notificación push a alumnos (por username) o al admin. La usa la
// función alimentos-pedidos de Supabase: avisa a Jonah que llegó un pedido de
// alimento y avisa a los alumnos que el plato que pidieron ya está en la app.
//
// Seguridad: igual que /api/whatsapp-aviso, solo acepta el pedido si trae el
// secreto compartido en el header "x-webhook-secret".

import { getSupabase, setupWebPush, enviarPushA } from './_lib/push.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const secreto = req.headers['x-webhook-secret'];
  if (!secreto || secreto !== process.env.NUEVO_ALUMNO_SECRET) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const { usernames, admin, title, body, url } = req.body || {};
  if (!body || (!admin && !Array.isArray(usernames))) return res.status(400).json({ error: 'Faltan datos' });

  const supabase = getSupabase();
  setupWebPush();

  try {
    let destino = Array.isArray(usernames) ? usernames.filter(u => typeof u === 'string' && u) : [];
    if (admin) {
      const { data: admins } = await supabase.from('profiles').select('username').eq('role', 'admin');
      destino = destino.concat((admins || []).map(a => a.username).filter(Boolean));
    }
    destino = [...new Set(destino)].slice(0, 200);
    if (!destino.length) return res.status(200).json({ ok: true, enviados: 0 });

    const r = await enviarPushA(supabase, destino, {
      title: String(title || 'Jonah 🦍').slice(0, 60),
      body: String(body).slice(0, 300),
      url: typeof url === 'string' && url.startsWith('/') ? url : '/',
    });
    return res.status(200).json({ ok: true, enviados: r.enviados });
  } catch (e) {
    console.error('Error enviando aviso push:', e);
    return res.status(500).json({ ok: false, error: 'No se pudo enviar el aviso' });
  }
}
