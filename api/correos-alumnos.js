// api/correos-alumnos.js
//
// Devuelve el correo con el que entra cada alumno (y si se registró con
// Google), para el mensaje listo de "Mensajes del día": a quien se
// registró dentro de Instagram/Facebook/TikTok se le recuerda con qué
// correo entrar a la app instalada. Los correos solo están en el acceso
// de Supabase (no en las tablas del panel), por eso se piden aquí.
//
// Solo lo puede pedir el admin, con su sesión. Como mucho 50 alumnos por
// pedido. No cambia nada: solo lee.

import { getSupabase } from './_lib/push.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const supabase = getSupabase();
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  const { data: sesion, error: errSesion } = await supabase.auth.getUser(token);
  if (errSesion || !sesion?.user) return res.status(401).json({ error: 'No autorizado' });

  const usernames = Array.isArray(req.body?.usernames)
    ? [...new Set(req.body.usernames.map(u => String(u || '').trim()).filter(Boolean))].slice(0, 50)
    : [];
  if (!usernames.length) return res.status(200).json({ correos: {} });

  try {
    const { data: perfil } = await supabase.from('profiles').select('role').eq('id', sesion.user.id).maybeSingle();
    if (perfil?.role !== 'admin') return res.status(403).json({ error: 'No autorizado' });

    const { data: alumnos, error } = await supabase.from('alumnos').select('username, user_id').in('username', usernames);
    if (error) throw error;
    const correos = {};
    await Promise.all((alumnos || []).filter(a => a.user_id).map(async a => {
      const { data } = await supabase.auth.admin.getUserById(a.user_id);
      const u = data?.user;
      if (!u?.email) return;
      const proveedores = u.app_metadata?.providers || [u.app_metadata?.provider];
      correos[a.username] = { correo: u.email, google: proveedores.includes('google') };
    }));
    return res.status(200).json({ correos });
  } catch (e) {
    console.error('Error en correos-alumnos:', e);
    return res.status(500).json({ error: 'No se pudieron traer los correos' });
  }
}
