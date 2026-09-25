// api/_lib/google-play.js
//
// Todo lo que habla con Google Play para los pagos dentro de la app de
// Android: pedirle a Google si una compra es real, "confirmarla" (Google
// devuelve el dinero si no se confirma en 3 días) y activar el plan del
// alumno en la base.
//
// La llave para hablar con Google es un "usuario robot" (cuenta de
// servicio) con permiso en Play Console. Su archivo JSON completo va en
// la variable de Vercel GOOGLE_PLAY_CUENTA_SERVICIO.

import crypto from 'node:crypto';

export const PAQUETE_ANDROID = 'com.jonahbeast.twa';

// Los 4 planes tal como se crean en Play Console (Monetiza con Play →
// Suscripciones). Cada uno es una suscripción con renovación automática.
export const PRODUCTOS_GOOGLE = {
  jb_plan_mensual: { meses: 1, configKey: 'precio_1', precioDefault: 24.90 },
  jb_plan_trimestral: { meses: 3, configKey: 'precio_3', precioDefault: 64.90 },
  jb_plan_semestral: { meses: 6, configKey: 'precio_6', precioDefault: 114.90 },
  jb_plan_anual: { meses: 12, configKey: 'precio_12', precioDefault: 209.90 },
};

const API = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PAQUETE_ANDROID}`;

// Estados de Google en los que el alumno pagó y le corresponde acceso.
const ESTADOS_CON_ACCESO = new Set([
  'SUBSCRIPTION_STATE_ACTIVE',
  'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
  'SUBSCRIPTION_STATE_CANCELED', // canceló la renovación, pero ya pagó el periodo actual
]);

let tokenCache = { valor: null, vence: 0 };

const b64url = (buf) => Buffer.from(buf).toString('base64')
  .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

// Pide a Google un permiso de acceso firmado con la llave del usuario robot.
async function tokenDeGoogle() {
  if (tokenCache.valor && Date.now() < tokenCache.vence) return tokenCache.valor;
  const crudo = process.env.GOOGLE_PLAY_CUENTA_SERVICIO;
  if (!crudo) throw new Error('Falta configurar GOOGLE_PLAY_CUENTA_SERVICIO en Vercel.');
  const cuenta = JSON.parse(crudo);

  const ahora = Math.floor(Date.now() / 1000);
  const cabecera = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const cuerpo = b64url(JSON.stringify({
    iss: cuenta.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: ahora,
    exp: ahora + 3600,
  }));
  const firma = crypto.createSign('RSA-SHA256').update(`${cabecera}.${cuerpo}`).sign(cuenta.private_key);
  const jwt = `${cabecera}.${cuerpo}.${b64url(firma)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) throw new Error('Google no dio acceso: ' + (data.error_description || data.error || res.status));
  tokenCache = { valor: data.access_token, vence: Date.now() + (Number(data.expires_in) - 60) * 1000 };
  return data.access_token;
}

// Consulta a Google el estado real de una suscripción. Nunca se confía en
// lo que diga el celular: solo en esta respuesta.
export async function consultarSuscripcion(purchaseToken) {
  const token = await tokenDeGoogle();
  const res = await fetch(`${API}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404 || res.status === 410) return null;
  const data = await res.json();
  if (!res.ok) throw new Error('Google no respondió la compra: ' + (data.error?.message || res.status));
  return data;
}

async function confirmarSuscripcion(productId, purchaseToken) {
  const token = await tokenDeGoogle();
  const res = await fetch(
    `${API}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}' },
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error('No se pudo confirmar la compra en Google: ' + (data.error?.message || res.status));
  }
}

function hoyPeruISO() {
  return new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
}

function sumarDiasISO(iso, dias) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
}

// Bono por suscribirse a tiempo (mismo criterio que la app y Mercado Pago):
// el PRIMER plan pagado de alguien en prueba gratis, comprado antes de que
// termine su prueba o hasta 48 horas después, recibe 7 días extra.
const BONO_DIAS = 7;
function ganaBono(alumno, primerPlan, enviadoEn) {
  if (!primerPlan || !alumno || !(alumno.plan === 'trial' || alumno.plan === 'prueba') || !alumno.fecha_vencimiento) return false;
  const limite = new Date(`${alumno.fecha_vencimiento}T23:59:59-05:00`).getTime() + 48 * 3600 * 1000;
  const enviado = enviadoEn ? new Date(enviadoEn).getTime() : Date.now();
  return Number.isFinite(enviado) && enviado <= limite;
}

function sumarMesesISO(iso, meses) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + meses, d));
  return dt.toISOString().slice(0, 10);
}

async function precioDeLista(supabase, producto) {
  try {
    const { data } = await supabase.from('config').select('value').eq('key', producto.configKey).maybeSingle();
    const v = parseFloat(data?.value);
    if (v > 0) return v;
  } catch {}
  return producto.precioDefault;
}

// Revisa una compra con Google y, si hay un cobro nuevo (la compra o una
// renovación), extiende el plan del alumno. Se puede llamar las veces que
// sea: cada cobro de Google tiene su número de pedido y la base no deja
// registrarlo dos veces.
//
// username: el alumno que la reclama. Si es null (revisión automática
// diaria), se usa el dueño ya guardado de esa compra.
export async function procesarCompra(supabase, { purchaseToken, username }) {
  if (!purchaseToken || typeof purchaseToken !== 'string') return { ok: false, error: 'Compra inválida.' };

  const { data: guardada } = await supabase.from('compras_google')
    .select('username').eq('purchase_token', purchaseToken).maybeSingle();

  // Una compra de Google pertenece a un solo alumno: si ya la usó otra
  // cuenta, no se le activa a esta.
  if (guardada && username && guardada.username !== username) {
    return { ok: false, error: 'Esta compra ya está vinculada a otra cuenta de Jonah Beast Fuel.' };
  }
  const dueno = guardada?.username || username;
  if (!dueno) return { ok: false, error: 'No se sabe de quién es la compra.' };

  const sub = await consultarSuscripcion(purchaseToken);
  if (!sub) return { ok: false, error: 'Google no reconoce esta compra.' };

  const item = (sub.lineItems || [])[0] || {};
  const productId = item.productId;
  const producto = PRODUCTOS_GOOGLE[productId];
  if (!producto) return { ok: false, error: 'Plan desconocido en Google Play.' };

  const estado = sub.subscriptionState;
  const venceEn = item.expiryTime || null;
  const pedido = item.latestSuccessfulOrderId || sub.latestOrderId || null;

  await supabase.from('compras_google').upsert({
    purchase_token: purchaseToken,
    username: dueno,
    producto: productId,
    meses: producto.meses,
    estado,
    vence_en: venceEn,
    ultimo_pedido: pedido,
    actualizado_en: new Date().toISOString(),
  }, { onConflict: 'purchase_token' });

  const conAcceso = ESTADOS_CON_ACCESO.has(estado) && venceEn && new Date(venceEn) > new Date();
  if (!conAcceso) return { ok: true, activado: false, estado };

  // Confirmar a Google que entregamos el plan (si no, lo reembolsa).
  if (sub.acknowledgementState !== 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED') {
    await confirmarSuscripcion(productId, purchaseToken);
  }

  if (!pedido) return { ok: true, activado: false, estado };

  const esPrueba = !!sub.testPurchase;
  const monto = esPrueba ? 0 : await precioDeLista(supabase, producto);
  const { data: alumno } = await supabase.from('alumnos')
    .select('nombre, fecha_vencimiento, plan').eq('username', dueno).maybeSingle();
  if (!alumno) return { ok: false, error: 'El alumno no existe.' };
  // ¿Es su primer plan? (antes de registrar este cobro; para el bono)
  const { data: planesPrevios } = await supabase.from('pagos').select('id')
    .eq('username', dueno).eq('estado', 'aprobado')
    .or('metodo.is.null,metodo.not.ilike.*add-on*').limit(1);
  const bono = !esPrueba && ganaBono(alumno, (planesPrevios || []).length === 0, sub.startTime || null);

  // Registrar el cobro. Si este número de pedido ya estaba, es un cobro
  // que ya se procesó: no se vuelve a extender.
  // Las compras de prueba (cuentas de prueba de licencias) quedan solo
  // como historial, con estado 'prueba': no suman tiempo al plan, no
  // entran a Finanzas ni cuentan para el premio de invitación. Google
  // "renueva" las pruebas cada pocos minutos y si no, cada renovación
  // regalaría un mes.
  const { error: errPago } = await supabase.from('pagos').insert({
    username: dueno,
    nombre: alumno.nombre || '',
    plan_meses: producto.meses,
    monto,
    metodo: 'Google Play',
    operacion: pedido,
    estado: esPrueba ? 'prueba' : 'aprobado',
    nota_admin: esPrueba
      ? 'Compra de prueba de Google Play: no se cobró dinero real y no suma tiempo al plan.'
      : 'Precio de lista. Google descuenta su comisión (15%) e impuestos antes de depositar.'
        + (bono ? ` Incluye +${BONO_DIAS} días de regalo por suscribirse a tiempo.` : ''),
    revisado_en: new Date().toISOString(),
  });
  if (errPago) return { ok: true, activado: false, yaProcesado: true, estado };
  if (esPrueba) return { ok: true, activado: false, prueba: true, estado };

  const hoy = hoyPeruISO();
  const base = alumno.fecha_vencimiento && alumno.fecha_vencimiento > hoy ? alumno.fecha_vencimiento : hoy;
  const nuevaFecha = sumarDiasISO(sumarMesesISO(base, producto.meses), bono ? BONO_DIAS : 0);
  await supabase.from('alumnos')
    .update({ fecha_vencimiento: nuevaFecha, enabled: true, plan: 'pago' })
    .eq('username', dueno);

  return { ok: true, activado: true, estado, fechaVencimiento: nuevaFecha, bono };
}
