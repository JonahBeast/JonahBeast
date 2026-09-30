/* LISTA DE CARIÑO: cada día, las (como mucho) 3 personas a las que más
   les haría bien un mensaje personal de Jonah, con el mensaje ya escrito.
   Los avisos automáticos acompañan; lo que crea vínculo es que Jonah
   escriba en persona en el momento justo.

   Se usa en dos lugares, con los mismos datos y las mismas reglas:
     - el panel (HOY → "💛 Tu lista de cariño"), con el botón "Escribirle";
     - el informe de las 8am de Jarvis (api/cron/informe-admin.js).

   A quién elige, en este orden:
     1. Acaba de pagar (gracias por confiar).
     2. Logros: hito de racha ayer (7, 14, 21, 30, 60, 90 días) o un kilo
        más perdido desde que empezó.
     3. En riesgo: paga y lleva 3 a 7 días sin registrar; nuevo que no
        arranca; prueba que termina hoy o mañana (y sí la usó).
     4. Aniversario: 1, 2, 3… meses con la app.
   No repite a quien Jonah ya le escribió desde esta lista en los últimos
   7 días (se anota en config → lista_carino_escritos al tocar
   "Escribirle"). */

export const CLAVE_ESCRITOS = 'lista_carino_escritos';
export const MAX_LISTA = 3;
const HITOS_RACHA = [7, 14, 21, 30, 60, 90];
const CUENTAS_PROPIAS = ['martin'];

function sumarDias(iso, dias) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
}
function diasEntre(desde, hasta) {
  return Math.round((Date.parse(hasta + 'T00:00:00Z') - Date.parse(desde + 'T00:00:00Z')) / 86400000);
}
const primerNombre = (a) => String(a.nombre || a.username || '').trim().split(/\s+/)[0] || '';

export function leerEscritos(valor) {
  try { const o = typeof valor === 'string' ? JSON.parse(valor) : valor; return o && typeof o === 'object' ? o : {}; }
  catch { return {}; }
}

/* Trae lo necesario de la base (sirve con el cliente del panel o con el
   del servidor). */
export async function cargarDatosCarino(supabase, hoyISO) {
  const desde = sumarDias(hoyISO, -120);
  const [{ data: alumnos }, { data: hist }, { data: pagos }, { data: cfg }] = await Promise.all([
    supabase.from('alumnos').select('username, nombre, telefono, plan, enabled, fecha_inicio, fecha_vencimiento')
      .eq('enabled', true).gte('fecha_vencimiento', hoyISO).range(0, 4999),
    supabase.from('historial').select('username, fecha, comidas_count, peso')
      .gte('fecha', desde).range(0, 19999),
    supabase.from('pagos').select('username, monto, metodo, revisado_en').eq('estado', 'aprobado')
      .gte('revisado_en', new Date(Date.now() - 36 * 3600000).toISOString()).range(0, 999),
    supabase.from('config').select('value').eq('key', CLAVE_ESCRITOS).maybeSingle(),
  ]);
  return { alumnos: alumnos || [], hist: hist || [], pagos: pagos || [], escritos: leerEscritos(cfg?.value) };
}

export function armarListaCarino({ alumnos, hist, pagos, escritos, hoyISO }) {
  const ayer = sumarDias(hoyISO, -1);
  const porUsuario = {};
  (hist || []).forEach(h => { (porUsuario[h.username] = porUsuario[h.username] || []).push(h); });

  const candidatos = [];
  const agregar = (a, prioridad, motivo, mensaje) => candidatos.push({
    username: a.username, nombre: a.nombre || a.username, telefono: a.telefono || '', prioridad, motivo, mensaje,
  });

  const pagaron = new Set((pagos || []).filter(p => !/add-on/i.test(p.metodo || '')).map(p => p.username));

  for (const a of alumnos || []) {
    if (CUENTAS_PROPIAS.includes(a.username)) continue;
    const escrito = escritos?.[a.username];
    if (escrito && diasEntre(escrito, hoyISO) < 7) continue;
    const n = primerNombre(a);
    const filas = (porUsuario[a.username] || []).slice().sort((x, y) => x.fecha.localeCompare(y.fecha));
    const conComida = new Set(filas.filter(f => Number(f.comidas_count) > 0).map(f => f.fecha));
    const ultimaComida = [...conComida].sort().pop() || null;
    const esPrueba = a.plan === 'trial' || a.plan === 'prueba';

    // 1. Acaba de pagar.
    if (pagaron.has(a.username)) {
      agregar(a, 1, '🙌 Acaba de pagar su plan',
        `¡${n}, gracias por confiar en mí! 🙌 Ya tienes tu plan activo. Cualquier duda con la app o con tu alimentación, escríbeme por aquí. Vamos con todo 🦍`);
      continue;
    }

    // 2a. Hito de racha cumplido ayer.
    let racha = 0;
    for (let d = ayer; conComida.has(d); d = sumarDias(d, -1)) racha++;
    if (HITOS_RACHA.includes(racha)) {
      agregar(a, 2, `🔥 Cumplió ${racha} días seguidos registrando`,
        `¡${n}, ${racha} días seguidos registrando! 🔥 Eso es disciplina de verdad. Sigue así, estoy orgulloso de ti 🦍`);
      continue;
    }

    // 2b. Un kilo más perdido (entre hace 3 días y hoy).
    const conPeso = filas.filter(f => Number(f.peso) > 0);
    if (conPeso.length >= 2) {
      const inicial = Number(conPeso[0].peso);
      const actual = Number(conPeso[conPeso.length - 1].peso);
      const antes = conPeso.filter(f => f.fecha <= sumarDias(hoyISO, -3)).pop();
      const kgAhora = Math.floor(inicial - actual);
      const kgAntes = antes ? Math.floor(inicial - Number(antes.peso)) : 0;
      if (kgAhora >= 1 && kgAhora > kgAntes && conPeso[conPeso.length - 1].fecha >= sumarDias(hoyISO, -2)) {
        agregar(a, 2, `💪 Ya bajó ${kgAhora} kg desde que empezó`,
          `¡${n}, ya van ${kgAhora} kg menos desde que empezaste! 💪 Tu constancia se nota. ¿Cómo te sientes?`);
        continue;
      }
    }

    // 3a. Paga y lleva 3 a 7 días sin registrar.
    if (!esPrueba && ultimaComida) {
      const sin = diasEntre(ultimaComida, hoyISO);
      if (sin >= 3 && sin <= 7) {
        agregar(a, 3, `😶 Paga y lleva ${sin} días sin registrar`,
          `Hola ${n} 👋 Hace unos días que no te veo registrar. ¿Todo bien? Si algo se complicó, cuéntame y lo ajustamos juntos 💪`);
        continue;
      }
    }

    // 3b. Nuevo que no arranca (2 a 7 días sin ninguna comida).
    const diasDesdeInicio = a.fecha_inicio ? diasEntre(a.fecha_inicio, hoyISO) : null;
    if (!ultimaComida && diasDesdeInicio !== null && diasDesdeInicio >= 2 && diasDesdeInicio <= 7) {
      agregar(a, 4, `🌱 Nuevo hace ${diasDesdeInicio} días y aún no registra nada`,
        `Hola ${n} 👋 Soy Jonah. Vi que te uniste hace unos días. ¿Te ayudo con tu primer registro? Tómale una foto a tu próxima comida en la app y listo 📸`);
      continue;
    }

    // 3c. Prueba que termina hoy o mañana, y sí la usó.
    if (esPrueba && ultimaComida && (a.fecha_vencimiento === hoyISO || a.fecha_vencimiento === sumarDias(hoyISO, 1))) {
      const cuando = a.fecha_vencimiento === hoyISO ? 'hoy' : 'mañana';
      agregar(a, 4, `⏳ Su prueba termina ${cuando} (y la está usando)`,
        `Hola ${n} 👋 Tu prueba termina ${cuando}. Vi que ya estás registrando, ¡bien ahí! ¿Qué te está pareciendo? Si quieres seguir, te cuento los planes 🦍`);
      continue;
    }

    // 4. Aniversario de meses con la app.
    if (diasDesdeInicio && diasDesdeInicio > 0 && diasDesdeInicio % 30 === 0) {
      const meses = diasDesdeInicio / 30;
      const texto = meses === 1 ? '1 mes' : `${meses} meses`;
      agregar(a, 5, `🎉 Cumple ${texto} con la app`,
        `¡${n}, hoy cumples ${texto} con Jonah Beast Fuel! 🎉 Gracias por tu constancia. ¿Cómo vas con tu objetivo?`);
    }
  }

  return candidatos.sort((x, y) => x.prioridad - y.prioridad).slice(0, MAX_LISTA);
}

export function enlaceWhatsApp(telefono, texto) {
  const num = String(telefono || '').replace(/\D/g, '');
  const full = num ? (num.length <= 9 ? '51' + num : num) : '';
  return `https://wa.me/${full}?text=${encodeURIComponent(texto)}`;
}
