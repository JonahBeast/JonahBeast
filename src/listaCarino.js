/* LISTA DE CARIÑO: cada día, las (como mucho) 6 personas a las que más
   les haría bien un mensaje personal de Jonah, con el mensaje ya escrito.
   Los avisos automáticos acompañan; lo que crea vínculo es que Jonah
   escriba en persona en el momento justo.

   Se usa en dos lugares, con los mismos datos y las mismas reglas:
     - el panel (HOY → "💛 Tu lista de cariño"), con el botón "Escribirle";
     - el informe de las 8am de Jarvis (api/cron/informe-admin.js);
     - los avisos de la 1pm y las 7:30pm (api/cron/lista-carino-aviso.js),
       para que Jonah escriba en sus ratos libres sin revisar el panel.

   A quién elige, en este orden:
     1. Acaba de pagar (gracias por confiar).
     2. Logros: hito de racha ayer (7, 14, 21, 30, 60, 90 días) o un kilo
        más perdido desde que empezó.
     3. En riesgo: paga y lleva 3 a 7 días sin registrar.
     4. Nuevo que no arranca (6 horas o más sin ninguna comida, hasta 7
        días); prueba que termina hoy o mañana (y sí la usó); en prueba y
        lleva 2 a 4 días sin registrar; nuevo que usa la app dentro de
        Facebook/Instagram/TikTok (ahí no le llegan los avisos).
     5. Aniversario: 1, 2, 3… meses con la app.
   Los mensajes van en la voz de Jonah: motivadores, con su historia (bajó
   de 104 a 90.2 kg en 2 meses con su propia app) y la idea de que el
   cambio llega poco a poco, comida a comida.
   No repite a quien Jonah ya le escribió desde esta lista en los últimos
   7 días (se anota en config → lista_carino_escritos al tocar
   "Escribirle"). */

export const CLAVE_ESCRITOS = 'lista_carino_escritos';
export const MAX_LISTA = 6;
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
  const [{ data: alumnos }, { data: hist }, { data: pagos }, { data: cfg }, { data: est }] = await Promise.all([
    supabase.from('alumnos').select('username, nombre, telefono, plan, enabled, fecha_inicio, fecha_vencimiento, created_at')
      .eq('enabled', true).gte('fecha_vencimiento', hoyISO).range(0, 4999),
    supabase.from('historial').select('username, fecha, comidas_count, peso')
      .gte('fecha', desde).range(0, 19999),
    supabase.from('pagos').select('username, monto, metodo, revisado_en').eq('estado', 'aprobado')
      .gte('revisado_en', new Date(Date.now() - 36 * 3600000).toISOString()).range(0, 999),
    supabase.from('config').select('value').eq('key', CLAVE_ESCRITOS).maybeSingle(),
    supabase.from('estado_avisos').select('username, navegador_interno').eq('navegador_interno', true).range(0, 4999),
  ]);
  return {
    alumnos: alumnos || [], hist: hist || [], pagos: pagos || [], escritos: leerEscritos(cfg?.value),
    enNavegador: (est || []).map(e => e.username),
  };
}

export function armarListaCarino({ alumnos, hist, pagos, escritos, enNavegador = [], hoyISO, ahora = Date.now() }) {
  const navegadorInterno = new Set(enNavegador);
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
        `¡${n}, gracias por confiar en mí! 🙌 Ya tienes tu plan activo y desde hoy vamos juntos. Yo bajé de 104 a 90 kg con esta misma app, comida a comida, y sé que tú también puedes. Cualquier duda, escríbeme por aquí. ¡Vamos con todo! 🦍`);
      continue;
    }

    // 2a. Hito de racha cumplido ayer.
    let racha = 0;
    for (let d = ayer; conComida.has(d); d = sumarDias(d, -1)) racha++;
    if (HITOS_RACHA.includes(racha)) {
      agregar(a, 2, `🔥 Cumplió ${racha} días seguidos registrando`,
        `¡${n}, ${racha} días seguidos registrando! 🔥 Eso es disciplina de verdad, y la disciplina es la que trae los resultados. Estoy orgulloso de ti, sigue así 🦍`);
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
          `¡${n}, ya van ${kgAhora} kg menos desde que empezaste! 💪 Así se hace: poco a poco, sin dietas raras. Tu constancia se nota. ¿Cómo te sientes? 🦍`);
        continue;
      }
    }

    // 3a. Paga y lleva 3 a 7 días sin registrar.
    if (!esPrueba && ultimaComida) {
      const sin = diasEntre(ultimaComida, hoyISO);
      if (sin >= 3 && sin <= 7) {
        agregar(a, 3, `😶 Paga y lleva ${sin} días sin registrar`,
          `Hola ${n} 👋 Hace unos días que no te veo registrar. ¿Todo bien? A todos se nos complica a veces; lo importante es no soltar. Hoy registra aunque sea una comida y retomamos juntos 💪 Si algo no te está funcionando, cuéntame y lo ajustamos 🦍`);
        continue;
      }
    }

    // 4a. Nuevo que no arranca: 6 horas o más sin ninguna comida (hasta 7 días).
    const diasDesdeInicio = a.fecha_inicio ? diasEntre(a.fecha_inicio, hoyISO) : null;
    const horas = a.created_at ? (ahora - Date.parse(a.created_at)) / 3600000 : (diasDesdeInicio ?? 0) * 24;
    if (!ultimaComida && horas >= 6 && (diasDesdeInicio === null || diasDesdeInicio <= 7)) {
      const cuando = horas < 24 ? 'hoy' : diasDesdeInicio === 1 ? 'ayer' : `hace ${diasDesdeInicio} días`;
      agregar(a, 4, `🌱 Se registró ${cuando} y aún no anota ninguna comida`,
        `Hola ${n} 👋 Soy Jonah. ¡Qué bueno que te uniste a Jonah Beast Fuel! Ya diste el primer paso, que es el más difícil 💪 Ahora solo te pido una cosa: tómale una foto a tu próxima comida en la app (son 10 segundos). Yo bajé de 104 a 90 kg empezando así, comida a comida. El cambio llega poco a poco, pero llega. ¿Te ayudo con algo? 🦍`);
      continue;
    }

    // 3c. Prueba que termina hoy o mañana, y sí la usó.
    if (esPrueba && ultimaComida && (a.fecha_vencimiento === hoyISO || a.fecha_vencimiento === sumarDias(hoyISO, 1))) {
      const cuando = a.fecha_vencimiento === hoyISO ? 'hoy' : 'mañana';
      agregar(a, 4, `⏳ Su prueba termina ${cuando} (y la está usando)`,
        `Hola ${n} 👋 Tu Premium de prueba termina ${cuando}. En estos días registraste tus comidas ${conComida.size} ${conComida.size === 1 ? 'día' : 'días'}, ¡y eso ya es empezar a cambiar! 💪 No sueltes ahora que agarraste ritmo: con constancia, en unas semanas vas a ver la diferencia en el espejo. ¿Te cuento los planes para seguir juntos? 🦍`);
      continue;
    }

    // 4c. En prueba y lleva 2 a 4 días sin registrar.
    if (esPrueba && ultimaComida) {
      const sin = diasEntre(ultimaComida, hoyISO);
      if (sin >= 2 && sin <= 4) {
        agregar(a, 4, `😶 En prueba y lleva ${sin} días sin registrar`,
          `Hola ${n} 👋 Te extrañé estos días en la app. Tranquilo, a todos nos pasa; lo importante es no soltar 💪 Hoy registra aunque sea una comida y retomamos juntos. Los resultados llegan con constancia, no con perfección 🦍`);
        continue;
      }
    }

    // 4d. Nuevo que usa la app dentro de Facebook/Instagram/TikTok: ahí no
    // le llegan los avisos.
    if (ultimaComida && navegadorInterno.has(a.username) && diasDesdeInicio !== null && diasDesdeInicio <= 7) {
      agregar(a, 4, '🌐 Usa la app dentro de Facebook/Instagram (no le llegan avisos)',
        `Hola ${n} 🔥 ¡Vas muy bien con tus registros! Para acompañarte todos los días con mis avisos, ábrela en Chrome (Safari si tienes iPhone): entra a jonahbeast.com con tu correo. Así no se te pasa ninguna comida y los cambios llegan más rápido 💪🦍`);
      continue;
    }

    // 5. Aniversario de meses con la app.
    if (diasDesdeInicio && diasDesdeInicio > 0 && diasDesdeInicio % 30 === 0) {
      const meses = diasDesdeInicio / 30;
      const texto = meses === 1 ? '1 mes' : `${meses} meses`;
      agregar(a, 5, `🎉 Cumple ${texto} con la app`,
        `¡${n}, hoy cumples ${texto} con Jonah Beast Fuel! 🎉 Cada comida que registraste te trajo hasta aquí. Gracias por tu constancia. ¿Cómo vas con tu objetivo? 🦍`);
    }
  }

  return candidatos.sort((x, y) => x.prioridad - y.prioridad).slice(0, MAX_LISTA);
}

export function enlaceWhatsApp(telefono, texto) {
  const num = String(telefono || '').replace(/\D/g, '');
  const full = num ? (num.length <= 9 ? '51' + num : num) : '';
  return `https://wa.me/${full}?text=${encodeURIComponent(texto)}`;
}
