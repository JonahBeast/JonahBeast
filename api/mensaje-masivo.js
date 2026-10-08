// api/mensaje-masivo.js
//
// 📣 Mensaje a todos, desde el panel de admin (tarjeta en HOY). Solo el
// admin, con su sesión. Acciones:
//   - contar:   { publico } → cuántos alumnos son y cuántos tienen avisos.
//   - enviar:   { titulo, texto, publico, en_muro, programado_para? } →
//               guarda el mensaje. Sin fecha (o con una fecha que ya pasó) sale
//               ahora; de noche (10 p.m. a 8 a.m.) queda para las 8 a.m.
//               Como mucho un mensaje por día (hora de Perú).
//   - probar:   { titulo, texto } → la notificación le llega solo a Jonah.
//   - cancelar: { id } → un programado que todavía no salió.
// Lo que sale después lo manda /api/cron/mensajes-programados.

import { getSupabase, setupWebPush, enviarPushA } from './_lib/push.js';
import { PUBLICOS, contarPublico, enviarMensajeMasivo, esHoraDeSonar, proximas8am, fechaPeru, HORA_DESDE, HORA_HASTA } from './_lib/mensaje-masivo.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const supabase = getSupabase();
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  const { data: sesion, error: errSesion } = await supabase.auth.getUser(token);
  if (errSesion || !sesion?.user) return res.status(401).json({ error: 'No autorizado' });
  const { data: perfil } = await supabase.from('profiles').select('role').eq('id', sesion.user.id).maybeSingle();
  if (perfil?.role !== 'admin') return res.status(403).json({ error: 'No autorizado' });

  const { accion } = req.body || {};
  try {
    if (accion === 'contar') {
      const publico = PUBLICOS[req.body.publico] ? req.body.publico : 'todos';
      return res.status(200).json(await contarPublico(supabase, publico));
    }

    // Prueba: le llega solo a Jonah (a los admin), para ver cómo se ve.
    // No se guarda ni cuenta como el mensaje del día.
    if (accion === 'probar') {
      const titulo = String(req.body.titulo || '').trim().slice(0, 60);
      const texto = String(req.body.texto || '').trim().slice(0, 300);
      if (!titulo || !texto) return res.status(400).json({ error: 'Falta el título o el mensaje.' });
      const { data: admins } = await supabase.from('profiles').select('username').eq('role', 'admin');
      setupWebPush();
      const r = await enviarPushA(supabase, (admins || []).map(a => a.username).filter(Boolean), { title: titulo, body: texto, url: '/' });
      return res.status(200).json({ ok: true, enviados: r.enviados });
    }

    if (accion === 'cancelar') {
      const id = Number(req.body.id);
      const { data, error } = await supabase.from('mensajes_masivos')
        .update({ estado: 'cancelado' }).eq('id', id).eq('estado', 'programado').select().maybeSingle();
      if (error) throw error;
      if (!data) return res.status(409).json({ error: 'Ese mensaje ya salió o ya estaba cancelado.' });
      return res.status(200).json({ ok: true, mensaje: data });
    }

    if (accion === 'enviar') {
      const titulo = String(req.body.titulo || '').trim().slice(0, 60);
      const texto = String(req.body.texto || '').trim().slice(0, 300);
      const publico = PUBLICOS[req.body.publico] ? req.body.publico : 'todos';
      if (!titulo || !texto) return res.status(400).json({ error: 'Falta el título o el mensaje.' });

      // Cuándo sale: ahora o la fecha elegida; nunca de noche.
      let cuando = new Date();
      if (req.body.programado_para) {
        const f = new Date(req.body.programado_para);
        if (isNaN(f)) return res.status(400).json({ error: 'La fecha no es válida.' });
        if (f > cuando) cuando = f;
      }
      const horaCuando = (cuando.getUTCHours() - 5 + 24) % 24;
      let movidoA8 = false;
      if (horaCuando < HORA_DESDE || horaCuando >= HORA_HASTA) {
        const dia = fechaPeru(cuando.toISOString());
        const base = horaCuando < HORA_DESDE ? dia : fechaPeru(new Date(cuando.getTime() + 86400000).toISOString());
        cuando = new Date(`${base}T0${HORA_DESDE}:00:00-05:00`);
        movidoA8 = true;
      }

      // Uno por día: si ya hay otro que sale (o salió) ese mismo día, no.
      const dia = fechaPeru(cuando.toISOString());
      const desde = new Date(`${dia}T00:00:00-05:00`).toISOString();
      const hasta = new Date(new Date(desde).getTime() + 86400000).toISOString();
      const { data: mismoDia } = await supabase.from('mensajes_masivos').select('id, titulo, estado')
        .neq('estado', 'cancelado').gte('programado_para', desde).lt('programado_para', hasta).limit(1);
      if (mismoDia?.length) {
        return res.status(409).json({ error: `Ese día ya hay un mensaje ("${mismoDia[0].titulo}"). Para no cansar a los alumnos, como mucho uno por día: elige otro día o cancela el otro.` });
      }

      const { data: guardado, error } = await supabase.from('mensajes_masivos').insert({
        titulo, texto, publico, en_muro: !!req.body.en_muro, programado_para: cuando.toISOString(),
      }).select().single();
      if (error) throw error;

      if (cuando <= new Date() && esHoraDeSonar()) {
        setupWebPush();
        const final = await enviarMensajeMasivo(supabase, guardado);
        return res.status(200).json({ ok: true, enviadoAhora: true, mensaje: final });
      }
      return res.status(200).json({ ok: true, enviadoAhora: false, movidoA8, mensaje: guardado });
    }

    return res.status(400).json({ error: 'Acción no válida.' });
  } catch (e) {
    console.error('mensaje-masivo:', e);
    return res.status(500).json({ error: 'No se pudo completar. Intenta de nuevo.' });
  }
}
