// api/cron/equipos-cierre.js
//
// Corre todos los días a las 8:10am (hora Perú). Cierra los retos de los
// equipos que terminaron ayer (o antes) y reparte las medallas, con la
// función equipo_cerrar_retos de la base:
//   🥇🥈🥉 los 3 más constantes, 🏆 meta del equipo cumplida,
//   🎯 meta personal cumplida y 🏁 ganador de la carrera.
// Luego avisa:
//   - a todos los integrantes: "🏆 ¡Terminó el reto! Mira quién ganó"
//     (abre la pestaña Equipo);
//   - a Jonah, si terminó el reto del Team Beast: quiénes ganaron (su
//     mensaje de felicitación queda en Mensajes del día).
// Estos avisos responden a algo que pasó en el equipo, así que no cuentan
// en el tope de 3 avisos al día.
//
// Cron en vercel.json: "10 13 * * *" (13:10 UTC = 8:10am Perú).

import { getSupabase, setupWebPush, verificarCronSecret, enviarPushA } from '../_lib/push.js';

const EMOJI = { oro: '🥇', plata: '🥈', bronce: '🥉', meta_personal: '🎯', carrera: '🏁' };
const primer = n => String(n || '').trim().split(/\s+/)[0];

export default async function handler(req, res) {
  if (!verificarCronSecret(req)) return res.status(401).json({ error: 'No autorizado' });
  const supabase = getSupabase();
  setupWebPush();
  try {
    const { data: cerrados, error } = await supabase.rpc('equipo_cerrar_retos');
    if (error) throw error;
    let avisos = 0;
    for (const eq of cerrados || []) {
      const nombre = eq.apodo ? `${eq.nombre} · ${eq.apodo}` : eq.nombre;
      const medallas = eq.medallas || [];
      const metaCumplida = medallas.some(m => m.medalla === 'meta');
      const carrera = medallas.find(m => m.medalla === 'carrera');
      const cuerpo = carrera
        ? '🏁 ¡Terminó la carrera! Entra a ver quién ganó y el podio 🏆'
        : metaCumplida
          ? '🏆 ¡Terminó el reto y cumplieron la meta! Entra a ver tu medalla y el podio'
          : '🏆 ¡Terminó el reto! Entra a ver el podio y quién ganó';
      const miembros = (eq.miembros || []).filter(u => !(eq.oficial && u === eq.capitan));
      if (miembros.length) {
        const r = await enviarPushA(supabase, miembros, { title: nombre.slice(0, 60), body: cuerpo, url: '/?ir=equipo' });
        avisos += r.enviados || 0;
      }
      if (eq.oficial) {
        const ganadores = medallas.filter(m => m.username && EMOJI[m.medalla]);
        const usernames = [...new Set(ganadores.map(m => m.username))];
        const { data: alumnos } = usernames.length
          ? await supabase.from('alumnos').select('username, nombre').in('username', usernames)
          : { data: [] };
        const nombreDe = u => primer((alumnos || []).find(a => a.username === u)?.nombre) || u;
        const lista = ganadores.map(m => `${EMOJI[m.medalla]} ${nombreDe(m.username)}`).join(', ');
        const { data: admin } = await supabase.from('profiles').select('username').eq('role', 'admin').limit(1).maybeSingle();
        if (admin?.username) {
          await enviarPushA(supabase, [admin.username], {
            title: '🏆 Terminó el reto del Team Beast',
            body: lista ? `Ganaron: ${lista}. Su mensaje de felicitación está listo en Mensajes del día.` : 'Terminó el reto. Esta vez nadie sumó puntos.',
            url: '/',
          });
        }
      }
    }
    return res.status(200).json({ ok: true, cerrados: (cerrados || []).length, avisos });
  } catch (e) {
    console.error('Error cerrando retos de equipos:', e);
    return res.status(500).json({ ok: false, error: 'No se pudieron cerrar los retos' });
  }
}
