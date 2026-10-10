// api/_lib/meta-compra.js
//
// API de conversiones de Meta: cuando un alumno paga, el servidor le avisa
// a Meta "Compra" (Purchase) con el monto, para que los anuncios aprendan
// a buscar gente que paga y no solo gente que toca un botón.
//
// Lo usan /api/pago-aprobado (pagos aprobados desde el panel o por Mercado
// Pago) y la verificación de Google Play.
//
// Privacidad: el correo, el celular y el id del alumno nunca salen en
// texto, van cifrados (SHA-256), como pide Meta. El event_id es el id del
// pago, así un mismo pago nunca se cuenta dos veces.
//
// Variables en Vercel: META_CAPI_TOKEN (token de la API de conversiones,
// lo genera Jonah en el Administrador de eventos → conjunto de datos
// "Jonah Beast Fuel" → Configuración) y, solo para probar,
// META_TEST_EVENT_CODE (el código TEST… de "Probar eventos").
// Sin META_CAPI_TOKEN no hace nada.

import { createHash } from 'node:crypto';

const DATASET = '1084905720987308';
const API = `https://graph.facebook.com/v21.0/${DATASET}/events`;
const sha256 = (t) => createHash('sha256').update(String(t).trim().toLowerCase()).digest('hex');

// Celular peruano a formato internacional sin "+": 987654321 → 51987654321.
function celularPeru(tel) {
  const digitos = String(tel || '').replace(/\D/g, '');
  if (digitos.length === 9) return `51${digitos}`;
  if (digitos.length === 11 && digitos.startsWith('51')) return digitos;
  return null;
}

// Nunca lanza error: si Meta falla, el pago sigue su curso normal.
export async function avisarCompraMeta(supabase, { username, monto, eventoId, cuando }) {
  const token = process.env.META_CAPI_TOKEN;
  if (!token || !(Number(monto) > 0) || username === 'martin') return { ok: false, motivo: 'no aplica' };
  try {
    const { data: alumno } = await supabase.from('alumnos')
      .select('user_id, correo, telefono, nombre').eq('username', username).maybeSingle();
    if (!alumno) return { ok: false, motivo: 'sin alumno' };

    let correo = alumno.correo;
    if (!correo && alumno.user_id) {
      const { data } = await supabase.auth.admin.getUserById(alumno.user_id);
      correo = data?.user?.email;
    }
    const celular = celularPeru(alumno.telefono);
    const nombre = (alumno.nombre || '').trim().split(/\s+/)[0];

    const cuerpo = {
      data: [{
        event_name: 'Purchase',
        event_time: Math.floor(new Date(cuando || Date.now()).getTime() / 1000),
        event_id: `pago_${eventoId}`,
        action_source: 'website',
        event_source_url: 'https://www.jonahbeast.com/',
        user_data: {
          em: correo ? [sha256(correo)] : undefined,
          ph: celular ? [sha256(celular)] : undefined,
          fn: nombre ? [sha256(nombre)] : undefined,
          country: [sha256('pe')],
          external_id: [sha256(alumno.user_id || username)],
        },
        custom_data: { currency: 'PEN', value: Number(Number(monto).toFixed(2)) },
      }],
    };
    if (process.env.META_TEST_EVENT_CODE) cuerpo.test_event_code = process.env.META_TEST_EVENT_CODE;

    const r = await fetch(`${API}?access_token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });
    const respuesta = await r.json().catch(() => ({}));
    if (!r.ok) console.error('Meta API de conversiones:', r.status, JSON.stringify(respuesta).slice(0, 300));
    return { ok: r.ok, recibidos: respuesta?.events_received };
  } catch (e) {
    console.error('Error avisando la compra a Meta:', e);
    return { ok: false, motivo: 'error' };
  }
}
