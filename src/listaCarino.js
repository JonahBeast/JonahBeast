import { traerTodas } from './traerTodas.js';
/* MENSAJES DEL DÍA: a quién le escribe Jonah hoy por WhatsApp, con el
   mensaje ya listo, ordenado de lo más urgente a lo motivador. Cada
   persona sale una sola vez, en el primer paso que le toca:

   🔴 URGENTE
     1. 🎉 Bienvenida      — se registró en las últimas 24 horas.
     2. ⏳ Prueba por terminar — termina hoy o mañana.
     3. 🌱 Primera comida  — lleva más de un día sin anotar ninguna (hasta 7).
   🟠 IMPORTANTE
     4. 💪 Retomar         — en prueba lleva 2 a 4 días sin registrar; paga
                             y lleva 3 a 7.
     5. 🔔 Activar avisos  — no le llegan los avisos (usa la app dentro de
                             Facebook/Instagram/TikTok, iPhone sin instalar,
                             los bloqueó…). Solo los de los últimos 14 días.
     6. 🔁 Volver (gratis) — su prueba o plan venció (versión gratis) y se
                             está alejando: lleva 3 a 10 días sin registrar,
                             o su prueba terminó hace 1 a 7 días sin que
                             llegara a registrar nada. Solo los vencidos en
                             los últimos 60 días.
   🟢 ACOMPAÑAMIENTO
     7. 🙌 Celebrar        — acaba de pagar, cumplió una racha (7, 14, 21,
                             30, 60, 90 días), bajó un kilo más, cumple
                             meses con la app o cumpleaños.

   Si la bienvenida automática por WhatsApp (plantilla) ya le llegó, no se
   repite a mano.

   El tono es el de Jonah: cercano, humano, motivador, nunca de robot. Su
   historia (bajó de 104 a 90 kg en 2 meses y medio con su propia app, entrenamiento y
   disciplina; hace unos 4 años ya había bajado 37 kg) y la idea de
   que el cambio llega poco a poco, comida a comida.

   Se usa en tres lugares, con los mismos datos y las mismas reglas:
     - el panel (HOY → "📲 Mensajes del día"), con el botón "Escribirle";
     - el informe de las 8am de Jarvis (api/cron/informe-admin.js);
     - el aviso al celular apenas aparece alguien nuevo en la lista, a
       cualquier hora del día (api/cron/lista-carino-aviso.js).

   Al tocar "Escribirle" se anota (config → lista_carino_escritos): ese día
   queda ✅ y ese mismo paso no se repite en 7 días. */

export const CLAVE_ESCRITOS = 'lista_carino_escritos';
export const MAX_LISTA = 20;
const HITOS_RACHA = [7, 14, 21, 30, 60, 90];
const CUENTAS_PROPIAS = ['martin'];

export const NIVELES = [
  { id: 'urgente', titulo: '🔴 URGENTE', ayuda: 'Hazlo primero: es ahora o se enfría.' },
  { id: 'importante', titulo: '🟠 IMPORTANTE', ayuda: 'Hoy, en cuanto puedas.' },
  { id: 'acompanamiento', titulo: '🟢 ACOMPAÑAMIENTO', ayuda: 'Motivación y cariño: lo que crea vínculo.' },
];
export const ETAPAS = [
  { id: 'bienvenida', nivel: 'urgente', titulo: '🎉 Bienvenida', ayuda: 'Se acaban de registrar. Un saludo tuyo a tiempo marca la diferencia.' },
  { id: 'prueba', nivel: 'urgente', titulo: '⏳ Prueba por terminar', ayuda: 'Se les vence hoy o mañana: buen momento para invitarlos a seguir.' },
  { id: 'primera', nivel: 'urgente', titulo: '🌱 Primera comida', ayuda: 'Ya tienen cuenta, pero todavía no anotan nada.' },
  { id: 'retomar', nivel: 'importante', titulo: '💪 Retomar', ayuda: 'Venían registrando y se frenaron unos días.' },
  { id: 'avisos', nivel: 'importante', titulo: '🔔 Activar avisos', ayuda: 'No les llegan tus recordatorios. Les explicas cómo, en su celular.' },
  { id: 'volver', nivel: 'importante', titulo: '🔁 Volver (versión gratis)', ayuda: 'Su prueba o plan terminó y se están alejando. Un mensaje tuyo los trae de vuelta.' },
  { id: 'celebrar', nivel: 'acompanamiento', titulo: '🙌 Celebrar', ayuda: 'Logros y buenas noticias: celébralos con ellos.' },
];
const ORDEN = Object.fromEntries(ETAPAS.map((e, i) => [e.id, i]));

function sumarDias(iso, dias) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
}
function diasEntre(desde, hasta) {
  return Math.round((Date.parse(hasta + 'T00:00:00Z') - Date.parse(desde + 'T00:00:00Z')) / 86400000);
}
// Si el nombre es una sola letra o está vacío (ej. "F"), se usa la parte
// del usuario antes del primer punto o número (frank.alvah → Frank).
const primerNombre = (a) => {
  let n = String(a.nombre || '').trim().split(/\s+/)[0];
  if (n.length < 2) {
    const delUsuario = (String(a.username || '').match(/^[a-záéíóúñ]+/i) || [''])[0];
    n = delUsuario.length >= 3 ? delUsuario : n;
  }
  return n ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : '';
};
const nueve = t => String(t || '').replace(/\D/g, '').slice(-9);

export function leerEscritos(valor) {
  try { const o = typeof valor === 'string' ? JSON.parse(valor) : valor; return o && typeof o === 'object' ? o : {}; }
  catch { return {}; }
}
// Antes se guardaba solo la fecha; ahora la fecha y el paso.
function escritoDe(escritos, username) {
  const v = escritos?.[username];
  if (!v) return null;
  return typeof v === 'string' ? { f: v, e: null } : v;
}

/* Trae lo necesario de la base (sirve con el cliente del panel o con el
   del servidor). */
export async function cargarDatosCarino(supabase, hoyISO) {
  const desde = sumarDias(hoyISO, -120);
  const [{ data: alumnos }, { data: hist }, { data: pagos }, { data: cfg }, { data: est }, { data: subs }, { data: auto }] = await Promise.all([
    traerTodas(() => supabase.from('alumnos').select('username, nombre, telefono, plan, enabled, fecha_inicio, fecha_vencimiento, fecha_nacimiento, created_at')
      .eq('enabled', true).gte('fecha_vencimiento', sumarDias(hoyISO, -60)), 'username'),
    traerTodas(() => supabase.from('historial').select('username, fecha, comidas_count, peso')
      .gte('fecha', desde)),
    supabase.from('pagos').select('username, monto, metodo, revisado_en').eq('estado', 'aprobado')
      .gte('revisado_en', new Date(Date.now() - 36 * 3600000).toISOString()).range(0, 999),
    supabase.from('config').select('value').eq('key', CLAVE_ESCRITOS).maybeSingle(),
    traerTodas(() => supabase.from('estado_avisos').select('username, estado, navegador_interno, dispositivo'), 'username'),
    traerTodas(() => supabase.from('push_subs').select('username').eq('activa', true)),
    supabase.from('whatsapp_mensajes').select('telefono').eq('tipo', 'bienvenida_auto')
      .gte('creado_en', new Date(Date.now() - 3 * 86400000).toISOString()).range(0, 999),
  ]);
  return {
    alumnos: alumnos || [], hist: hist || [], pagos: pagos || [], escritos: leerEscritos(cfg?.value),
    estados: est || [], conAvisos: (subs || []).map(s => s.username),
    bienvenidaAuto: (auto || []).map(m => nueve(m.telefono)),
  };
}

/* Quien se registró dentro de Facebook/Instagram/TikTok: ahí la app no
   queda guardada ni le llegan los avisos. El enlace que Jonah manda por
   WhatsApp se abre en el navegador normal, así que el mensaje le da el
   camino para tener la app de verdad y con qué correo entrar.
   correo = { correo, google } (de api/correos-alumnos) o null. */
const CIERRE_JUNTOS = 'Vamos juntos por esos resultados. No estás solo/a, yo te acompaño 🦍';

/* Pasos numerados para tener la app instalada y entrar a su cuenta. La
   app todavía no está abierta a todos en Play Store, así que se instala
   desde el navegador: Android con Chrome, iPhone con Safari. */
export function pasosInstalarApp(dispositivo, correo) {
  const entrar = correo?.google
    ? `toca "¿Ya tienes cuenta? ENTRAR" y luego "Continuar con Google" con tu correo ${correo.correo}`
    : correo?.correo
      ? `toca "¿Ya tienes cuenta? ENTRAR" y entra con tu correo ${correo.correo} y tu contraseña`
      : 'toca "¿Ya tienes cuenta? ENTRAR" y entra con el correo y la contraseña con que te registraste';
  const pasos = dispositivo === 'iphone'
    ? [
        'Abre este enlace en Safari: https://jonahbeast.com',
        `Ahí ${entrar}`,
        'Toca el botón Compartir (el cuadrado con la flecha ↑) → "Agregar a pantalla de inicio" → "Agregar"',
        'Abre la app desde el ícono nuevo y toca "Activar avisos" para que te recuerde tus comidas',
        'Tómale foto a tu próxima comida 📸',
      ]
    : [
        'Abre este enlace en Chrome: https://jonahbeast.com',
        `Ahí ${entrar}`,
        'Toca los tres puntitos ⋮ (arriba a la derecha) → "Agregar a la pantalla principal" (o "Instalar app") → "Instalar"',
        'Abre la app desde el ícono nuevo y toca "Activar avisos" para que te recuerde tus comidas',
        'Tómale foto a tu próxima comida 📸',
      ];
  const numeros = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
  return pasos.map((t, i) => `${numeros[i]} ${t}`).join('\n');
}

/* Mensaje completo para quien se registró dentro de Facebook/Instagram/
   TikTok: ahí la app no queda guardada ni le llegan los avisos. El enlace
   que Jonah manda por WhatsApp se abre en el navegador normal, así que es
   el camino para tener la app de verdad. etapa: bienvenida | primera |
   avisos. correo = { correo, google } (de api/correos-alumnos) o null. */
export function mensajeInstalarApp(n, dispositivo, correo, { etapa = 'bienvenida', yaComio = false } = {}) {
  const hola = etapa === 'bienvenida'
    ? `¡Hola${n ? ' ' + n : ''}! 🙌 Soy Jonah, bienvenido/a a Jonah Beast Fuel.`
    : `¡Hola${n ? ' ' + n : ''}! 👋 Soy Jonah.`;
  const animo = etapa === 'avisos'
    ? '¡Qué bueno verte registrando tus comidas! Así se avanza 💪'
    : yaComio
    ? 'Ya registraste tu primera comida, ¡así se empieza! 💪'
    : etapa === 'primera'
      ? 'Vi que creaste tu cuenta y quiero ayudarte a arrancar. Ya diste el primer paso, que es el que más cuesta 💪'
      : 'Crear tu cuenta ya fue el primer paso, y es el que más cuesta 💪';
  const historia = 'Hace unos 4 años bajé 37 kg, y ahora bajé de 104 a 90 kg en 2 meses y medio con esta misma app, sumándole entrenamiento y disciplina. El cambio llega poco a poco, comida a comida.';
  const porQue = 'Como te registraste desde Instagram/Facebook, la app no quedó guardada en tu celular y ahí no te llegan mis avisos. Instálala así (1 minuto):';
  return `${hola}\n\n${animo} ${historia}\n\n${porQue}\n${pasosInstalarApp(dispositivo, correo)}\n\n${CIERRE_JUNTOS}`;
}

/* Mensaje para activar los avisos, según por qué no le llegan. */
export function mensajeAvisos(n, motivo, dispositivo, correo = null) {
  const hola = `Hola${n ? ' ' + n : ''} 👋 Soy Jonah.`;
  const cierre = 'Así te acompaño todos los días y no se te pasa ninguna comida 💪🦍';
  const nav = dispositivo === 'iphone' ? 'Safari' : 'Chrome';
  if (motivo === 'navegador') {
    return mensajeInstalarApp(n, dispositivo, correo, { etapa: 'avisos', yaComio: true });
  }
  if (motivo === 'ios_sin_instalar') {
    return `${hola} Para que te lleguen mis avisos en tu iPhone, instala la app (1 minuto): abre jonahbeast.com en Safari → botón Compartir (el cuadrado con la flecha ↑) → "Agregar a pantalla de inicio". Entra desde el ícono nuevo y toca "Activar avisos". ${cierre}`;
  }
  if (motivo === 'bloqueado') {
    const pasos = dispositivo === 'iphone'
      ? 'Ajustes del iPhone → Notificaciones → Jonah Beast Fuel → Permitir notificaciones'
      : 'Ajustes del celular → Aplicaciones → Jonah Beast Fuel (o Chrome) → Notificaciones → Permitir';
    return `${hola} Vi que los avisos de la app quedaron bloqueados en tu celular, y así me pierdo de acompañarte. Para activarlos: ${pasos}. Luego cierra la app y vuelve a abrirla. ${cierre}`;
  }
  if (motivo === 'no_soportado') {
    return `${hola} Tu navegador no deja que te lleguen mis avisos. Abre jonahbeast.com en ${dispositivo === 'iphone' ? 'Safari e instálala (Compartir → "Agregar a pantalla de inicio")' : 'Chrome'} y toca "Activar avisos". ${cierre}`;
  }
  return `${hola} ¡Vas bien! Para acompañarte de cerca, activa mis avisos: abre la app y en Inicio toca "Activar avisos" (sale arriba). ${cierre}`;
}

export const MOTIVO_AVISOS = {
  navegador: 'Usa la app dentro de Facebook/Instagram/TikTok',
  ios_sin_instalar: 'iPhone sin instalar la app',
  bloqueado: 'Bloqueó los avisos',
  no_soportado: 'Su navegador no permite avisos',
  sin_activar: 'Nunca activó los avisos',
};

export function armarListaCarino({ alumnos, hist, pagos, escritos, estados = [], conAvisos = [], bienvenidaAuto = [], correos = {}, hoyISO, ahora = Date.now(), incluirHechos = false }) {
  const ayer = sumarDias(hoyISO, -1);
  const porUsuario = {};
  (hist || []).forEach(h => { (porUsuario[h.username] = porUsuario[h.username] || []).push(h); });
  const estadoDe = Object.fromEntries((estados || []).map(e => [e.username, e]));
  const tieneAvisos = new Set(conAvisos);
  const yaBienvenida = new Set(bienvenidaAuto.filter(Boolean));
  const pagaron = new Set((pagos || []).filter(p => !/add-on/i.test(p.metodo || '')).map(p => p.username));
  const [, mesHoy, diaHoy] = hoyISO.split('-').map(Number);

  const lista = [];
  for (const a of alumnos || []) {
    if (CUENTAS_PROPIAS.includes(a.username)) continue;
    const n = primerNombre(a);
    const filas = (porUsuario[a.username] || []).slice().sort((x, y) => x.fecha.localeCompare(y.fecha));
    const conComida = new Set(filas.filter(f => Number(f.comidas_count) > 0).map(f => f.fecha));
    const ultimaComida = [...conComida].sort().pop() || null;
    const esPrueba = a.plan === 'trial' || a.plan === 'prueba';
    const diasDesdeInicio = a.fecha_inicio ? diasEntre(a.fecha_inicio, hoyISO) : null;
    const horas = a.created_at ? (ahora - Date.parse(a.created_at)) / 3600000 : (diasDesdeInicio ?? 99) * 24;
    const est = estadoDe[a.username];
    // Se registró dentro de Facebook/Instagram/TikTok: el mensaje le da el
    // enlace para descargar la app y con qué correo entrar.
    const interno = !!est?.navegador_interno;
    const instalar = (etapa, yaComio) => mensajeInstalarApp(n, est?.dispositivo, correos[a.username], { etapa, yaComio });

    // El primer paso del camino que le toca a esta persona.
    const caso = (() => {
      // Versión gratis (venció su prueba o su plan): solo "Volver".
      if (a.fecha_vencimiento && a.fecha_vencimiento < hoyISO) {
        const vencio = diasEntre(a.fecha_vencimiento, hoyISO);
        if (ultimaComida) {
          const sin = diasEntre(ultimaComida, hoyISO);
          if (sin < 3 || sin > 10) return null;
          return { etapa: 'volver', motivo: `Versión gratis · lleva ${sin} días sin registrar`,
            mensaje: `Hola${n ? ' ' + n : ''} 👋 Soy Jonah. Hace ${sin} días que no te veo registrar y quería saber cómo vas. Tu cuenta sigue activa y gratis: registra hoy aunque sea una comida y retomamos juntos 💪 Y si quieres que te acompañe con todo (foto en todas tus comidas, tu menú del día y yo por WhatsApp), te cuento de Premium. El cambio llega poco a poco, comida a comida. Vamos juntos por esos resultados, no estás solo/a, yo te acompaño 🦍` };
        }
        if (vencio < 1 || vencio > 7) return null;
        return { etapa: 'volver', motivo: `Versión gratis · su prueba terminó hace ${vencio} ${vencio === 1 ? 'día' : 'días'} sin registrar nada`,
          mensaje: `Hola${n ? ' ' + n : ''} 👋 Soy Jonah. Tu prueba de Premium terminó y no llegamos a empezar, pero tu cuenta sigue activa y es gratis para siempre. Hoy tómale foto a tu almuerzo (tienes 3 fotos gratis cada semana) y arrancamos de a poquito 📸 ¿Qué te frenó? Cuéntame y lo vemos juntos. Vamos juntos por esos resultados, no estás solo/a, yo te acompaño 🦍` };
      }
      // 1. Bienvenida (últimas 24 h), salvo que ya le llegó la automática.
      if (horas < 24) {
        if (a.telefono && yaBienvenida.has(nueve(a.telefono))) return null;
        return ultimaComida
          ? { etapa: 'bienvenida', motivo: `Se registró hoy${interno ? ' desde Instagram/Facebook' : ''} y ya anotó su primera comida 🔥`,
              mensaje: interno ? instalar('bienvenida', true) : `¡Hola${n ? ' ' + n : ''}! 🙌 Soy Jonah, bienvenido/a a Jonah Beast Fuel. Ya vi que registraste tu primera comida, ¡así se empieza! 💪 Hoy ya diste el paso que a muchos les cuesta meses. Yo bajé de 104 a 90 kg en 2 meses y medio con esta misma app, sumándole entrenamiento y disciplina, comida a comida. Vamos a ir juntos. Cualquier duda me escribes aquí, ¿ya? 🦍` }
          : { etapa: 'bienvenida', motivo: interno ? 'Se registró hoy desde Instagram/Facebook' : 'Se registró hoy',
              mensaje: interno ? instalar('bienvenida', false) : `¡Hola${n ? ' ' + n : ''}! 🙌 Soy Jonah, bienvenido/a a Jonah Beast Fuel. Qué bueno tenerte aquí 💪 Tu único reto de hoy: tómale una foto a tu próxima comida en la app (son 10 segundos) y listo. Yo bajé de 104 a 90 kg en 2 meses y medio empezando así, con la app, entrenamiento y disciplina, comida a comida. El cambio llega poco a poco, pero llega. Cualquier duda, aquí estoy 🦍` };
      }
      // 2. Prueba por terminar (hoy o mañana).
      if (esPrueba && (a.fecha_vencimiento === hoyISO || a.fecha_vencimiento === sumarDias(hoyISO, 1))) {
        const cuando = a.fecha_vencimiento === hoyISO ? 'hoy' : 'mañana';
        return conComida.size
          ? { etapa: 'prueba', motivo: `Su prueba termina ${cuando} · registró ${conComida.size} ${conComida.size === 1 ? 'día' : 'días'}`,
              mensaje: `Hola${n ? ' ' + n : ''} 👋 Tu Premium de prueba termina ${cuando}. En estos días registraste tus comidas ${conComida.size} ${conComida.size === 1 ? 'día' : 'días'}, ¡y eso ya es empezar a cambiar! 💪 No sueltes ahora que agarraste ritmo: con constancia, en unas semanas vas a ver la diferencia en el espejo. ¿Te cuento los planes para seguir juntos? 🦍` }
          : { etapa: 'prueba', motivo: `Su prueba termina ${cuando} y no llegó a usarla`,
              mensaje: `Hola${n ? ' ' + n : ''} 👋 Soy Jonah. Tu Premium de prueba termina ${cuando} y me quedé con ganas de acompañarte 😅 Igual la app sigue gratis para ti, para siempre. Si te animas, hoy registra una comida con una foto y empezamos de a poquito. ¿Qué te frenó? Cuéntame y lo vemos juntos 💪🦍` };
      }
      // 3. Primera comida: más de un día sin anotar nada (hasta 7).
      if (!ultimaComida && (diasDesdeInicio === null || diasDesdeInicio <= 7)) {
        const cuando = diasDesdeInicio === 1 ? 'ayer' : `hace ${diasDesdeInicio ?? 'unos'} días`;
        return { etapa: 'primera', motivo: `Se registró ${cuando}${interno ? ' desde Instagram/Facebook' : ''} y aún no anota ninguna comida`,
          mensaje: interno ? instalar('primera', false) : `Hola${n ? ' ' + n : ''} 👋 Soy Jonah. Vi que creaste tu cuenta y quiero ayudarte a arrancar 💪 Ya diste el primer paso, que es el más difícil. Ahora solo te pido una cosa: tómale una foto a tu próxima comida en la app (son 10 segundos). Yo bajé de 104 a 90 kg en 2 meses y medio empezando así, y sumándole entrenamiento y disciplina. El cambio llega poco a poco, pero llega. ¿Te ayudo con algo? 🦍` };
      }
      // 4. Retomar.
      if (ultimaComida) {
        const sin = diasEntre(ultimaComida, hoyISO);
        if (esPrueba && sin >= 2 && sin <= 4) {
          return { etapa: 'retomar', motivo: `En su prueba y lleva ${sin} días sin registrar`,
            mensaje: `Hola${n ? ' ' + n : ''} 👋 Te extrañé estos días en la app. Tranquilo/a, a todos nos pasa; lo importante es no soltar 💪 Hoy registra aunque sea una comida y retomamos juntos. Los resultados llegan con constancia, no con perfección 🦍` };
        }
        if (!esPrueba && sin >= 3 && sin <= 7) {
          return { etapa: 'retomar', motivo: `Paga y lleva ${sin} días sin registrar`,
            mensaje: `Hola${n ? ' ' + n : ''} 👋 Hace unos días que no te veo registrar. ¿Todo bien? A todos se nos complica a veces; lo importante es no soltar. Hoy registra aunque sea una comida y retomamos juntos 💪 Si algo no te está funcionando, cuéntame y lo ajustamos 🦍` };
        }
      }
      // 5. Activar avisos (nuevos de los últimos 14 días que ya registran).
      if (!tieneAvisos.has(a.username) && diasDesdeInicio !== null && diasDesdeInicio <= 14 && est) {
        const motivo = est.navegador_interno ? 'navegador' : est.estado;
        if (MOTIVO_AVISOS[motivo]) {
          return { etapa: 'avisos', motivo: MOTIVO_AVISOS[motivo], mensaje: mensajeAvisos(n, motivo, est.dispositivo, correos[a.username]) };
        }
      }
      // 6. Celebrar.
      if (pagaron.has(a.username)) {
        return { etapa: 'celebrar', motivo: 'Acaba de pagar su plan',
          mensaje: `¡${n || 'Hola'}, gracias por confiar en mí! 🙌 Ya tienes tu plan activo y desde hoy vamos juntos. Yo bajé de 104 a 90 kg en 2 meses y medio con esta misma app, entrenamiento y disciplina, comida a comida, y sé que tú también puedes avanzar a tu ritmo. Cualquier duda, escríbeme por aquí. ¡Vamos con todo! 🦍` };
      }
      let racha = 0;
      for (let d = ayer; conComida.has(d); d = sumarDias(d, -1)) racha++;
      if (HITOS_RACHA.includes(racha)) {
        return { etapa: 'celebrar', motivo: `Cumplió ${racha} días seguidos registrando 🔥`,
          mensaje: `¡${n || 'Hola'}, ${racha} días seguidos registrando! 🔥 Eso es disciplina de verdad, y la disciplina es la que trae los resultados. Estoy orgulloso de ti, sigue así 🦍` };
      }
      const conPeso = filas.filter(f => Number(f.peso) > 0);
      if (conPeso.length >= 2) {
        const inicial = Number(conPeso[0].peso);
        const actual = Number(conPeso[conPeso.length - 1].peso);
        const antes = conPeso.filter(f => f.fecha <= sumarDias(hoyISO, -3)).pop();
        const kgAhora = Math.floor(inicial - actual);
        const kgAntes = antes ? Math.floor(inicial - Number(antes.peso)) : 0;
        if (kgAhora >= 1 && kgAhora > kgAntes && conPeso[conPeso.length - 1].fecha >= sumarDias(hoyISO, -2)) {
          return { etapa: 'celebrar', motivo: `Ya bajó ${kgAhora} kg desde que empezó 💪`,
            mensaje: `¡${n || 'Hola'}, ya van ${kgAhora} kg menos desde que empezaste! 💪 Así se hace: poco a poco, sin dietas raras. Tu constancia se nota. ¿Cómo te sientes? 🦍` };
        }
      }
      if (a.fecha_nacimiento) {
        const [, m, d] = String(a.fecha_nacimiento).split('-').map(Number);
        if (m === mesHoy && d === diaHoy) {
          return { etapa: 'celebrar', motivo: 'Hoy es su cumpleaños 🎂',
            mensaje: `¡Feliz cumpleaños, ${n || 'crack'}! 🎂🎉 Te deseo un año lleno de salud, fuerza y muchos logros. Que este año sea el de tu mejor versión, y aquí estoy para acompañarte 💪🦍` };
        }
      }
      if (diasDesdeInicio && diasDesdeInicio > 0 && diasDesdeInicio % 30 === 0 && ultimaComida) {
        const meses = diasDesdeInicio / 30;
        const texto = meses === 1 ? '1 mes' : `${meses} meses`;
        return { etapa: 'celebrar', motivo: `Cumple ${texto} con la app 🎉`,
          mensaje: `¡${n || 'Hola'}, hoy cumples ${texto} con Jonah Beast Fuel! 🎉 Cada comida que registraste te trajo hasta aquí. Gracias por tu constancia. ¿Cómo vas con tu objetivo? 🦍` };
      }
      return null;
    })();
    if (!caso) continue;

    // Si ya le escribió hoy, queda ✅. Si le escribió por el mismo paso en
    // los últimos 7 días, no se repite.
    const escrito = escritoDe(escritos, a.username);
    const hecho = escrito?.f === hoyISO;
    if (!hecho && escrito && diasEntre(escrito.f, hoyISO) < 7 && (escrito.e === caso.etapa || escrito.e === null)) continue;
    if (hecho && !incluirHechos) continue;
    lista.push({ username: a.username, nombre: a.nombre || a.username, telefono: a.telefono || '', interno, ...caso, hecho });
  }
  return lista.sort((x, y) => ORDEN[x.etapa] - ORDEN[y.etapa]).slice(0, MAX_LISTA);
}

/* Anota que Jonah le escribió hoy a esta persona por este paso. */
export function anotarEscrito(escritos, username, etapa, hoyISO) {
  const nuevos = { ...escritos, [username]: { f: hoyISO, e: etapa } };
  Object.keys(nuevos).forEach(u => {
    const f = typeof nuevos[u] === 'string' ? nuevos[u] : nuevos[u]?.f;
    if (!f || diasEntre(f, hoyISO) > 30) delete nuevos[u];
  });
  return nuevos;
}

export function enlaceWhatsApp(telefono, texto) {
  const num = String(telefono || '').replace(/\D/g, '');
  const full = num ? (num.length <= 9 ? '51' + num : num) : '';
  return `https://wa.me/${full}?text=${encodeURIComponent(texto)}`;
}
