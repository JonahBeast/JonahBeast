// api/_lib/apple.js
//
// Todo lo que tiene que ver con los pagos dentro de la app de iPhone
// (App Store): comprobar que una compra es real y activar el plan del
// alumno en la base. Es el mismo trabajo que api/_lib/google-play.js hace
// para Android.
//
// Apple entrega cada compra y cada aviso como un texto firmado (JWS). La
// firma trae la cadena de certificados de Apple; aquí se comprueba que esa
// cadena termina en la raíz oficial de Apple ("Apple Root CA - G3") y que
// el texto no se tocó. Así nunca se confía en lo que diga el celular, y no
// hace falta ninguna llave guardada en Vercel.

import crypto from 'node:crypto';

export const PAQUETE_IOS = 'com.jonahbeast.app';

// Los planes tal como se crearon en App Store Connect (grupo de
// suscripciones de Jonah Beast Fuel). Precio de respaldo: el de iPhone
// (decidido por Jonah el 12 de octubre), solo si Apple no manda el precio
// en la compra.
export const PRODUCTOS_APPLE = {
  jb_plan_mensual: { meses: 1, precio: 29.90 },
  jb_plan_trimestral: { meses: 3, precio: 69.90 },
  jb_plan_anual: { meses: 12, precio: 199.90 },
};

// Huella SHA-256 de la raíz oficial de Apple ("Apple Root CA - G3",
// https://www.apple.com/certificateauthority/).
const RAIZ_APPLE_G3 = '63:34:3A:BF:B8:9A:6A:03:EB:B5:7E:9B:3F:5F:A7:BE:7C:4F:5C:75:6F:30:17:B3:A8:C4:88:C3:65:3E:91:79';
// Marcas que Apple pone en sus certificados: el que firma compras de la
// App Store (1.2.840.113635.100.6.11.1) y el intermedio de Apple
// (1.2.840.113635.100.6.2.1).
const MARCA_FIRMANTE = Buffer.from('2a864886f76364060b01', 'hex');
const MARCA_INTERMEDIO = Buffer.from('2a864886f76364060201', 'hex');

function desdeB64url(texto) {
  return Buffer.from(String(texto).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

// Comprueba la firma de Apple y devuelve el contenido. Lanza un error si
// algo no cuadra.
export function leerFirmadoApple(jws) {
  const partes = String(jws || '').split('.');
  if (partes.length !== 3) throw new Error('Texto de Apple inválido');
  const cabecera = JSON.parse(desdeB64url(partes[0]).toString('utf8'));
  if (cabecera.alg !== 'ES256' || !Array.isArray(cabecera.x5c) || cabecera.x5c.length !== 3) {
    throw new Error('Firma de Apple inválida');
  }
  const certs = cabecera.x5c.map((c) => new crypto.X509Certificate(Buffer.from(c, 'base64')));
  const [firmante, intermedio, raiz] = certs;

  if (raiz.fingerprint256 !== RAIZ_APPLE_G3) throw new Error('La firma no viene de Apple');
  const ahora = Date.now();
  if (!certs.every((c) => new Date(c.validFrom).getTime() < ahora && ahora < new Date(c.validTo).getTime())) {
    throw new Error('Certificado de Apple vencido');
  }
  if (!firmante.checkIssued(intermedio) || !firmante.verify(intermedio.publicKey)
    || !intermedio.checkIssued(raiz) || !intermedio.verify(raiz.publicKey)) {
    throw new Error('Cadena de certificados de Apple inválida');
  }
  if (!firmante.raw.includes(MARCA_FIRMANTE) || !intermedio.raw.includes(MARCA_INTERMEDIO)) {
    throw new Error('Certificado que no es de la App Store');
  }

  const valida = crypto.verify(
    'sha256',
    Buffer.from(`${partes[0]}.${partes[1]}`),
    { key: firmante.publicKey, dsaEncoding: 'ieee-p1363' },
    desdeB64url(partes[2]),
  );
  if (!valida) throw new Error('La firma de Apple no coincide');
  return JSON.parse(desdeB64url(partes[1]).toString('utf8'));
}

function hoyPeruISO() {
  return new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
}
function sumarDiasISO(iso, dias) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
}
function sumarMesesISO(iso, meses) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + meses, d)).toISOString().slice(0, 10);
}

// Bono por suscribirse a tiempo (mismo criterio que la app, Mercado Pago y
// Google Play): el PRIMER plan pagado de alguien en prueba gratis, comprado
// antes de que termine su prueba o hasta 48 horas después, recibe 7 días
// (en la web esas 48 horas son del 20 % en el anual; en iPhone no hay
// cupones, así que siguen los +7 días: decisión de Jonah del 16 de octubre).
const BONO_DIAS = 7;
function ganaBono(alumno, primerPlan, compradoEn) {
  if (!primerPlan || !alumno || !(alumno.plan === 'trial' || alumno.plan === 'prueba') || !alumno.fecha_vencimiento) return false;
  const limite = new Date(`${alumno.fecha_vencimiento}T23:59:59-05:00`).getTime() + 48 * 3600 * 1000;
  const cuando = compradoEn ? Number(compradoEn) : Date.now();
  return Number.isFinite(cuando) && cuando <= limite;
}

// ¿De qué alumno es esta cuenta de Supabase? La app manda el id de la
// cuenta a Apple al comprar (appAccountToken) y Apple lo devuelve en cada
// compra y renovación.
async function alumnoDeCuenta(supabase, cuentaId) {
  if (!cuentaId) return null;
  const { data } = await supabase.from('alumnos').select('username')
    .eq('user_id', String(cuentaId).toLowerCase()).maybeSingle();
  return data?.username || null;
}

// Revisa una compra de Apple ya leída (transacción) y, si hay un cobro
// nuevo (la compra o una renovación), extiende el plan del alumno. Se puede
// llamar las veces que sea: cada cobro de Apple tiene su número de
// transacción y la base no deja registrarlo dos veces.
//
// username: el alumno que la reclama desde la app. Si es null (aviso de
// Apple), se usa el dueño ya guardado o el de la cuenta que compró.
// renueva: si Apple dice que se renovará sola (de los avisos de Apple).
export async function procesarTransaccion(supabase, tx, { username = null, cuentaId = null, renueva } = {}) {
  if (!tx || tx.bundleId !== PAQUETE_IOS) return { ok: false, error: 'Compra de otra app.' };
  const producto = PRODUCTOS_APPLE[tx.productId];
  if (!producto) return { ok: false, error: 'Plan desconocido en la App Store.' };
  const original = String(tx.originalTransactionId || tx.transactionId || '');
  if (!original || !tx.transactionId) return { ok: false, error: 'Compra inválida.' };

  // La cuenta que compró en el iPhone tiene que ser la misma que reclama.
  if (username && cuentaId && tx.appAccountToken
    && String(tx.appAccountToken).toLowerCase() !== String(cuentaId).toLowerCase()) {
    return { ok: false, error: 'Esta compra se hizo con otra cuenta de Jonah Beast Fuel.' };
  }

  const { data: guardada } = await supabase.from('compras_apple')
    .select('username').eq('transaccion_original', original).maybeSingle();
  // Una compra de Apple pertenece a un solo alumno.
  if (guardada && username && guardada.username !== username) {
    return { ok: false, error: 'Esta compra ya está vinculada a otra cuenta de Jonah Beast Fuel.' };
  }
  const dueno = guardada?.username || username || await alumnoDeCuenta(supabase, tx.appAccountToken);
  if (!dueno) return { ok: false, error: 'No se sabe de quién es la compra.' };

  const esPrueba = tx.environment !== 'Production';
  const venceEn = tx.expiresDate ? new Date(Number(tx.expiresDate)).toISOString() : null;
  const reembolsada = !!tx.revocationDate;
  const vigente = !reembolsada && venceEn && new Date(venceEn) > new Date();
  const estado = reembolsada ? 'reembolsado' : vigente ? 'activo' : 'vencido';

  await supabase.from('compras_apple').upsert({
    transaccion_original: original,
    username: dueno,
    producto: tx.productId,
    meses: producto.meses,
    estado,
    vence_en: venceEn,
    ...(typeof renueva === 'boolean' ? { renueva } : {}),
    ultima_transaccion: String(tx.transactionId),
    entorno: tx.environment || null,
    actualizado_en: new Date().toISOString(),
  }, { onConflict: 'transaccion_original' });

  const operacion = `apple_${tx.transactionId}`;
  if (reembolsada) {
    // Apple devolvió el dinero: queda anotado en el pago para que Jonah lo vea.
    await supabase.from('pagos')
      .update({ nota_admin: `Apple reembolsó este pago (${String(tx.revocationDate ? new Date(Number(tx.revocationDate)).toISOString().slice(0, 10) : '')}). Revisa si quitas el tiempo del plan.` })
      .eq('operacion', operacion).eq('metodo', 'App Store');
    return { ok: true, activado: false, estado };
  }
  if (!vigente) return { ok: true, activado: false, estado };

  const { data: alumno } = await supabase.from('alumnos')
    .select('nombre, fecha_vencimiento, plan').eq('username', dueno).maybeSingle();
  if (!alumno) return { ok: false, error: 'El alumno no existe.' };

  // Precio que cobró Apple (viene en milésimas). Si no viene en soles, el
  // precio de lista de iPhone.
  const monto = esPrueba ? 0
    : (tx.currency === 'PEN' && Number(tx.price) > 0 ? Math.round(Number(tx.price) / 10) / 100 : producto.precio);
  const { data: planesPrevios } = await supabase.from('pagos').select('id')
    .eq('username', dueno).eq('estado', 'aprobado')
    .or('metodo.is.null,metodo.not.ilike.*add-on*').limit(1);
  const bono = !esPrueba && ganaBono(alumno, (planesPrevios || []).length === 0, tx.originalPurchaseDate || tx.purchaseDate);

  // Las compras de prueba (TestFlight y revisión de Apple) quedan solo como
  // historial, con estado 'prueba': no suman tiempo, no entran a Finanzas
  // ni a Meta. Apple "renueva" las pruebas cada pocos minutos.
  const { error: errPago } = await supabase.from('pagos').insert({
    username: dueno,
    nombre: alumno.nombre || '',
    plan_meses: producto.meses,
    monto,
    metodo: 'App Store',
    operacion,
    estado: esPrueba ? 'prueba' : 'aprobado',
    nota_admin: esPrueba
      ? 'Compra de prueba de la App Store (TestFlight o revisión de Apple): no se cobró dinero real y no suma tiempo al plan.'
      : 'Precio que cobró Apple. Apple descuenta su comisión e impuestos antes de depositar.'
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

  // Las compras del iPhone no se avisan a Meta: Apple lo cuenta como
  // "rastreo" y la app no pide ese permiso (ver index.html).

  return { ok: true, activado: true, estado, fechaVencimiento: nuevaFecha, bono };
}
