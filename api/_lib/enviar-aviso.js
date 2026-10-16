// api/_lib/enviar-aviso.js
//
// Manda UN aviso a UNA suscripción de la tabla push_subs, sea del
// navegador (Web Push) o de la app de iPhone (Apple, APNs).
//
// Las suscripciones de la app de iPhone se guardan en la misma tabla con
// endpoint "apns:<token del iPhone>" (y p256dh/auth vacíos): Apple no
// deja usar Web Push dentro de una app, solo su propio servicio.
//
// Se usa igual que webpush.sendNotification(sub, payload): devuelve una
// promesa y, si falla, el error trae statusCode (410 = ya no existe, se
// desactiva) y body con el detalle. El payload es el mismo JSON de
// siempre ({ titulo, cuerpo, url }) que lee public/sw.js.
//
// Variables en Vercel para los avisos de iPhone:
//   APNS_KEY     contenido del archivo .p8 de la llave de avisos de Apple
//   APNS_KEY_ID  el "Key ID" de esa llave
//   APNS_TEAM_ID el equipo de Apple (9729PY2S83)

import http2 from 'node:http2';
import crypto from 'node:crypto';

const PREFIJO_IOS = 'apns:';
const APP_IOS = 'com.jonahbeast.app';
// TestFlight y la App Store usan el servidor de producción de Apple.
const SERVIDOR_APNS = 'https://api.push.apple.com';

export function esSuscripcionIOS(sub) {
  return String(sub?.endpoint || '').startsWith(PREFIJO_IOS);
}

export async function enviarAviso(sub, payload) {
  if (esSuscripcionIOS(sub)) return enviarAvisoIOS(sub.endpoint.slice(PREFIJO_IOS.length), payload);
  const webpush = (await import('web-push')).default;
  return webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
}

// La "firma" que Apple pide en cada aviso (vale hasta 1 hora; se renueva
// cada 40 minutos).
let firmaGuardada = { texto: '', en: 0 };
function firmaApple() {
  if (firmaGuardada.texto && Date.now() - firmaGuardada.en < 40 * 60 * 1000) return firmaGuardada.texto;
  const llave = (process.env.APNS_KEY || '').replace(/\\n/g, '\n').trim();
  const keyId = (process.env.APNS_KEY_ID || '').trim();
  const equipo = (process.env.APNS_TEAM_ID || '').trim();
  if (!llave || !keyId || !equipo) throw Object.assign(new Error('Faltan APNS_KEY, APNS_KEY_ID o APNS_TEAM_ID'), { statusCode: 0 });
  const b64 = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const datos = `${b64({ alg: 'ES256', kid: keyId })}.${b64({ iss: equipo, iat: Math.floor(Date.now() / 1000) })}`;
  const sello = crypto.sign('sha256', Buffer.from(datos), { key: llave, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  firmaGuardada = { texto: `${datos}.${sello}`, en: Date.now() };
  return firmaGuardada.texto;
}

function enviarAvisoIOS(token, payload) {
  let datos = {};
  try { datos = typeof payload === 'string' ? JSON.parse(payload) : (payload || {}); } catch {}
  const cuerpo = JSON.stringify({
    aps: { alert: { title: datos.titulo || 'Jonah Beast Fuel', body: datos.cuerpo || '' }, sound: 'default' },
    url: datos.url || '/',
  });
  return new Promise((resolve, reject) => {
    let firma;
    try { firma = firmaApple(); } catch (e) { reject(e); return; }
    const cliente = http2.connect(SERVIDOR_APNS);
    cliente.on('error', e => reject(Object.assign(e, { statusCode: e.statusCode || 0 })));
    const pedido = cliente.request({
      ':method': 'POST',
      ':path': `/3/device/${token}`,
      authorization: `bearer ${firma}`,
      'apns-topic': APP_IOS,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
    });
    let estado = 0;
    let respuesta = '';
    pedido.setEncoding('utf8');
    pedido.on('response', h => { estado = Number(h[':status']) || 0; });
    pedido.on('data', d => { respuesta += d; });
    pedido.on('end', () => {
      cliente.close();
      if (estado === 200) { resolve({ statusCode: 200 }); return; }
      let motivo = '';
      try { motivo = JSON.parse(respuesta).reason || ''; } catch {}
      // El iPhone ya no recibe avisos de la app (la borró o el número
      // cambió): se trata igual que un 410 de Web Push y se desactiva.
      const yaNoExiste = estado === 410 || motivo === 'BadDeviceToken' || motivo === 'Unregistered';
      reject(Object.assign(new Error(`APNs ${estado} ${motivo}`), { statusCode: yaNoExiste ? 410 : estado, body: motivo || respuesta }));
    });
    pedido.on('error', e => { cliente.close(); reject(Object.assign(e, { statusCode: e.statusCode || 0 })); });
    pedido.end(cuerpo);
  });
}
