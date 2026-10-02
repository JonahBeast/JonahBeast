// api/eliminar-cuenta.js
//
// Elimina por completo la cuenta de un alumno: sus datos de la app Y su
// acceso (correo y contraseña en Supabase). Antes, borrar desde el panel o
// desde "Eliminar cuenta" dejaba el acceso vivo y se iban juntando cuentas
// sueltas en Supabase.
//
// Lo pueden pedir:
//  - el admin, desde el botón "Eliminar" del panel (cualquier alumno), y
//  - el propio alumno, desde "Eliminar cuenta" en su app (solo la suya;
//    lo pide Google Play).
// Siempre con la sesión de quien lo pide: el alumno a borrar se busca en la
// base, nunca se confía en lo que mande el navegador. Una cuenta de admin
// nunca se borra por aquí.
//
// Lo que NO se borra, porque es registro del negocio: pagos, compras de
// Google Play, pedidos de la tienda, uso de la IA, motivos de salida y el
// embudo de la landing.

import { getSupabase } from './_lib/push.js';

// Tablas con datos personales del alumno (por username).
const TABLAS_DEL_ALUMNO = [
  'historial', 'datos_alumnos', 'fotos_progreso', 'alimentos_personales',
  'comidas_guardadas', 'push_subs', 'ajustes_membresia', 'estado_avisos',
  'avisos_enviados', 'retos_semanales',
];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const supabase = getSupabase();
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  const { data: sesion, error: errSesion } = await supabase.auth.getUser(token);
  if (errSesion || !sesion?.user) return res.status(401).json({ error: 'No autorizado' });

  const username = String(req.body?.username || '').trim();
  if (!username) return res.status(400).json({ error: 'Falta el alumno' });

  try {
    const { data: perfil } = await supabase.from('profiles').select('role').eq('id', sesion.user.id).maybeSingle();
    const esAdmin = perfil?.role === 'admin';

    const { data: alumno } = await supabase.from('alumnos').select('username, user_id').eq('username', username).maybeSingle();
    if (!alumno) return res.status(404).json({ error: 'No encontré a ese alumno' });
    if (!esAdmin && alumno.user_id !== sesion.user.id) return res.status(403).json({ error: 'No autorizado' });

    if (alumno.user_id) {
      const { data: perfilAlumno } = await supabase.from('profiles').select('role').eq('id', alumno.user_id).maybeSingle();
      if (perfilAlumno?.role === 'admin') return res.status(403).json({ error: 'Una cuenta de admin no se elimina desde aquí' });
    }

    for (const tabla of TABLAS_DEL_ALUMNO) {
      const { error } = await supabase.from(tabla).delete().eq('username', username);
      if (error) console.error(`eliminar-cuenta: ${tabla}:`, error.message);
    }
    // Su código de "Invita a un amigo" (los de embajadores no se tocan).
    await supabase.from('referidores').delete().eq('username', username).eq('tipo', 'alumno');

    const { error: errAlumno } = await supabase.from('alumnos').delete().eq('username', username);
    if (errAlumno) throw errAlumno;

    if (alumno.user_id) {
      await supabase.from('profiles').delete().eq('id', alumno.user_id);
      const { error: errAcceso } = await supabase.auth.admin.deleteUser(alumno.user_id);
      if (errAcceso) console.error('eliminar-cuenta: no se pudo borrar el acceso:', errAcceso.message);
    }
    await supabase.from('profiles').delete().eq('username', username).neq('role', 'admin');

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Error en eliminar-cuenta:', e);
    return res.status(500).json({ error: 'No se pudo eliminar la cuenta' });
  }
}
