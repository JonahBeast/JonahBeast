// api/_lib/mensaje-masivo.js
//
// 📣 Mensaje a todos (tabla mensajes_masivos). Lo usan /api/mensaje-masivo
// (el panel: contar, enviar ahora, programar, cancelar) y el cron
// /api/cron/mensajes-programados (los que tienen fecha).
//
// Al salir, un mensaje:
//   - guarda a quiénes les tocó (destinatarios): ellos ven la tarjeta en
//     Inicio la próxima vez que abren la app (función mi_mensaje_masivo);
//   - manda la notificación a los que tienen los avisos activados;
//   - si Jonah lo pidió, lo publica también en el Muro (comunidad_anuncios).
// Nunca suena de noche: entre las 10 p.m. y las 8 a.m. (hora de Perú) espera
// a las 8 a.m.

import { enviarPushA, anotarAvisos, horaYFechaPeru, addDaysISO } from './push.js';

export const PUBLICOS = {
  todos: 'Todos los alumnos',
  pagan: 'Solo los que pagan',
  prueba: 'Solo los que están en prueba',
  gratis: 'Solo los de la versión gratis',
  inactivos: 'Los que no registran comida hace 3 días o más',
};

export const HORA_DESDE = 8;  // 8 a.m.
export const HORA_HASTA = 22; // 10 p.m.

export function esHoraDeSonar() {
  const { horaPeru } = horaYFechaPeru();
  return horaPeru >= HORA_DESDE && horaPeru < HORA_HASTA;
}

// Próximas 8 a.m. de Perú (UTC-5), como fecha ISO.
export function proximas8am() {
  const { horaPeru, hoyISO } = horaYFechaPeru();
  const dia = horaPeru < HORA_DESDE ? hoyISO : addDaysISO(hoyISO, 1);
  return new Date(`${dia}T${String(HORA_DESDE).padStart(2, '0')}:00:00-05:00`).toISOString();
}

// Fecha de Perú (AAAA-MM-DD) de un instante.
export function fechaPeru(iso) {
  return new Date(new Date(iso).getTime() - 5 * 3600 * 1000).toISOString().slice(0, 10);
}

// Usernames del público elegido (alumnos habilitados).
export async function destinatariosDe(supabase, publico) {
  const { hoyISO } = horaYFechaPeru();
  const { data: alumnos, error } = await supabase.from('alumnos')
    .select('username, plan, fecha_vencimiento').eq('enabled', true).range(0, 9999);
  if (error) throw error;
  const vigente = a => a.fecha_vencimiento && a.fecha_vencimiento >= hoyISO;
  let lista = alumnos || [];
  if (publico === 'pagan') lista = lista.filter(a => a.plan === 'pago' && vigente(a));
  else if (publico === 'prueba') lista = lista.filter(a => a.plan !== 'pago' && vigente(a));
  else if (publico === 'gratis') lista = lista.filter(a => !vigente(a));
  let usernames = lista.map(a => a.username).filter(Boolean);
  if (publico === 'inactivos' && usernames.length) {
    const activos = new Set();
    for (let i = 0; i < usernames.length; i += 200) {
      const { data } = await supabase.from('historial').select('username')
        .in('username', usernames.slice(i, i + 200)).gt('comidas_count', 0)
        .gte('fecha', addDaysISO(hoyISO, -2)).range(0, 4999);
      (data || []).forEach(r => activos.add(r.username));
    }
    usernames = usernames.filter(u => !activos.has(u));
  }
  return [...new Set(usernames)];
}

// Cuántos son y cuántos tienen los avisos activados.
export async function contarPublico(supabase, publico) {
  const usernames = await destinatariosDe(supabase, publico);
  const conAvisos = new Set();
  for (let i = 0; i < usernames.length; i += 200) {
    const { data } = await supabase.from('push_subs').select('username')
      .eq('activa', true).in('username', usernames.slice(i, i + 200));
    (data || []).forEach(r => conAvisos.add(r.username));
  }
  return { total: usernames.length, conAvisos: conAvisos.size };
}

// Saca un mensaje ya guardado (estado 'programado'). Devuelve la fila final.
export async function enviarMensajeMasivo(supabase, mensaje) {
  // Se marca primero, así dos envíos a la vez no lo mandan dos veces.
  const { data: tomado, error: e1 } = await supabase.from('mensajes_masivos')
    .update({ estado: 'enviado', enviado_en: new Date().toISOString() })
    .eq('id', mensaje.id).eq('estado', 'programado').select().maybeSingle();
  if (e1) throw e1;
  if (!tomado) return null; // ya salió o lo cancelaron

  const destinatarios = await destinatariosDe(supabase, tomado.publico);
  let pushEnviados = 0;
  for (let i = 0; i < destinatarios.length; i += 200) {
    const parte = destinatarios.slice(i, i + 200);
    const r = await enviarPushA(supabase, parte, { title: tomado.titulo, body: tomado.texto, url: '/' });
    pushEnviados += r.enviados;
  }
  // Cuenta en el tope diario de avisos de quienes tienen avisos activados,
  // así ese día no les llegan más avisos automáticos de los que tocan.
  const conAvisos = new Set();
  for (let i = 0; i < destinatarios.length; i += 200) {
    const { data } = await supabase.from('push_subs').select('username')
      .eq('activa', true).in('username', destinatarios.slice(i, i + 200));
    (data || []).forEach(r => conAvisos.add(r.username));
  }
  const { hoyISO } = horaYFechaPeru();
  await anotarAvisos(supabase, [...conAvisos], { tipo: 'mensaje_masivo', momento: null, hoyISO });

  if (tomado.en_muro) {
    const { error } = await supabase.from('comunidad_anuncios')
      .insert({ texto: `${tomado.titulo}\n${tomado.texto}`.slice(0, 500), fijado: false });
    if (error) console.error('mensaje-masivo: no se pudo publicar en el muro:', error.message);
  }

  const { data: final, error: e2 } = await supabase.from('mensajes_masivos')
    .update({ destinatarios, push_enviados: pushEnviados })
    .eq('id', tomado.id).select().maybeSingle();
  if (e2) throw e2;
  return final;
}
