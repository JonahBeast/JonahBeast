// Edge Function: whatsapp-webhook
// Asistente de WhatsApp de Jonah Beast Fuel. Meta avisa aquí cada mensaje
// que llega al número de Jonah (y cada mensaje que Jonah manda desde su
// celular, gracias a la coexistencia). El asistente responde con Claude,
// usando el manual de la app (docs/manual-app.md, que se lee de la tabla
// manual_app) y los datos del alumno si ya es alumno.
// Si piden un alimento que no está en la app, lo deja en la lista de
// "Pedidos de alimentos" del panel (tabla pedidos_alimentos) y le avisa a
// Jonah; cuando Jonah lo aprueba, la función alimentos-pedidos le escribe al
// cliente que ya está.
//
// Cuándo responde (ajuste "whatsapp_asistente" en la tabla config):
//   apagado (o sin ajuste) → solo guarda los mensajes, no responde.
//   prueba                 → responde solo a los números de
//                            "whatsapp_numeros_prueba" (separados por comas).
//   activo                 → responde a todos.
// Si el chat está con Jonah (se lo pasó el asistente, o Jonah escribió desde
// su celular), el asistente se queda callado hasta que vence la pausa o el
// admin se lo devuelve desde el panel.
//
// Chats personales (el número es el WhatsApp de Jonah, también personal):
//   1) Los contactos guardados en su celular (Meta los manda por el campo
//      smb_app_state_sync) quedan como "personal", salvo que sean alumnos.
//   2) Jonah agrega o quita números a mano en "No responder" del panel.
//   En los chats "personal" el asistente no responde ni guarda nada.
//   3) Si un número nuevo escribe algo claramente personal, Claude usa la
//      herramienta mensaje_personal y el asistente no responde.
//
// Cuidados antes de responder:
//   - Mensajes seguidos del cliente: espera unos segundos y responde una
//     sola vez a todo junto.
//   - Justo antes de enviar vuelve a mirar: si llegó otro mensaje o Jonah
//     respondió desde su celular, no envía nada.
//   - Reacciones (👍) y avisos del sistema no se responden.
//   - Tope diario total de respuestas de la IA (LIMITE_RESPUESTAS_IA_DIA) y
//     aviso a Jonah si la IA falla o si vence la conexión (una vez, no por chat).
//
// Notas de voz: se pasan a texto con OpenAI (secreto OPENAI_API_KEY) y el
// asistente responde como si le hubieran escrito.
//
// Otras dos entradas, además de los avisos de Meta:
//   - Simulador del panel (POST con la sesión del admin, {simular}): responde
//     lo mismo que el asistente pero sin enviar ni guardar nada.
//   - Seguimiento (POST con x-webhook-secret, {accion: "seguimiento"}), cada
//     hora desde api/cron/whatsapp-seguimiento: recuerda crear la cuenta a
//     quien preguntó y no se registró, y da la bienvenida a quien ya lo hizo,
//     siempre dentro de las 24 h en que WhatsApp permite escribir.
//
// Se despliega con verify_jwt = false: Meta no manda sesión. La seguridad es
// la firma X-Hub-Signature-256 (secreto WHATSAPP_APP_SECRET): sin firma
// válida no se procesa nada.
//
// Publicación (regla de CLAUDE.md): solo después del merge, con el código de main.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";
import { ALIMENTOS_APP } from "./alimentos.ts";

const GRAPH = "https://graph.facebook.com/v23.0";
const MODELO = "claude-opus-5";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const APP_SECRET = Deno.env.get("WHATSAPP_APP_SECRET") || "";
const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "jonahbeast-asistente";
const AVISO_SECRETO = Deno.env.get("NUEVO_ALUMNO_SECRET") || "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const MAX_AUDIO = 20 * 1024 * 1024;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "content-type": "application/json" } });
}

// Horas que el asistente se queda callado en un chat.
const PAUSA_TRAS_PASAR_A_JONAH = 24;
const PAUSA_TRAS_RESPUESTA_DE_JONAH = 12;
// Tope de mensajes de un mismo número por día: pasado eso, el asistente
// deja de responder (evita que alguien gaste la IA mandando spam) y le pasa
// el chat a Jonah.
const LIMITE_MENSAJES_DIA = 40;
// Tope de respuestas de la IA en el día, sumando todos los chats (spam de
// muchos números o un bot de otra empresa conversando con el nuestro).
// Pasado el tope, el asistente calla hasta mañana y Jonah recibe un aviso.
const LIMITE_RESPUESTAS_IA_DIA = 400;
// Si el cliente manda varios mensajes seguidos ("Hola" + "info" + "precio"),
// se espera este tiempo y se responde una sola vez, a todo junto.
const ESPERA_MENSAJES_SEGUIDOS_MS = 8000;
// Tipos de aviso que no son un mensaje para responder (una reacción 👍, un
// mensaje que WhatsApp no sabe mostrar, avisos del sistema).
const TIPOS_SIN_RESPUESTA = ["reaction", "unsupported", "system", "ephemeral", "request_welcome"];
const MAX_IMAGEN = 5 * 1024 * 1024; // límite de imágenes de la API de Claude

const MENSAJE_PASO_A_JONAH = "🙋 Te paso con Jonah para que te ayude personalmente. Te escribe en breve.";
const mensajePedido = (alimento: string) =>
  `🍽️ ¡Buen pedido! Estamos calculando los macros de *${alimento}*… Te aviso apenas esté en la app 💪`;

const PERSONA = `Eres el asistente virtual de WhatsApp de Jonah Beast Fuel, la app peruana de nutrición de Jonah Beast. Atiendes a clientes y alumnos por WhatsApp en nombre del equipo.

Cómo escribes:
- En español peruano, cercano y amable, tuteando. Mensajes cortos (1 a 4 frases), como en un chat. Emojis con moderación.
- Formato de WhatsApp: *negrita* con un solo asterisco, listas con guiones o números. Nada de títulos con # ni tablas.
- Si es el primer mensaje de la conversación, preséntate en una frase como el asistente virtual de Jonah Beast Fuel.
- Para explicar cómo usar la app, da pasos cortos y numerados con los nombres de botones entre comillas, tal como aparecen en el manual.

Qué sabes:
- El manual de la app (abajo) y los datos del cliente que vienen en el bloque "Datos de esta conversación". No inventes nada que no esté ahí: ni precios, ni fechas, ni funciones de la app.
- Los precios vigentes están en "Datos de esta conversación"; úsalos solo de ahí.
- Si quien escribe no es alumno, invítalo a crear su cuenta gratis en jonahbeast.com: es gratis para siempre, sin tarjeta, con 7 días de Premium incluidos.
- Los mensajes que empiezan con "(nota de voz)" son audios que ya pasamos a texto: responde a lo que dice. Si solo dice "(nota de voz)", no se pudo escuchar: pide con amabilidad que lo escriba.
- Si el mensaje empieza con "Hola Jonah, este es mi plan de Jonah Beast Fuel" (o la versión antigua "Hola Jonah 👋 Este es mi plan…"), viene del botón "Recibir mi plan por WhatsApp" de la web (manual, sección 3): felicítalo por dar el primer paso, repítele su plan con SUS números tal cual (no los cambies ni calcules otros), explícale en 2 o 3 líneas cómo se ve en su día con comida peruana (repartir las calorías en sus comidas, proteína en cada una, sin prohibir nada) y dile que cree su cuenta gratis en jonahbeast.com desde el mismo celular: su plan ya queda guardado y tiene 7 días de Premium. Sé breve y cálido.
- La historia de Jonah (es real, puedes contarla): Jonah usa su propia app. El 27 de julio de 2026 pesaba 104 kg y al 30 de septiembre pesaba 90.2 kg: bajó 13.8 kg en 2 meses (unos 10 kg de grasa, es un estimado) registrando cada comida con la app, con comida peruana y sin pasar hambre. No agregues otros números ni prometas que a todos les irá igual: cada cuerpo es distinto.
- Puedes mandar la foto del antes y después de Jonah con la herramienta mandar_antes_despues. Úsala cuando ayude a motivar: alguien que recién empieza o recién se registró, que pregunta si la app funciona o si los resultados son reales, o que duda en empezar o pagar. Escribe también tu mensaje de texto (corto) junto con la herramienta: el sistema manda primero tu texto y luego la foto. Mándala como máximo una vez por conversación: si en "Datos de esta conversación" dice que ya se la mandaste, no la vuelvas a mandar. No la uses en reclamos, temas médicos, pagos con problemas ni chats personales.
- Si el mensaje empieza con "Hola Jonah, medí mi composición corporal en la web" (o la versión antigua "Hola Jonah 👋 Medí mi composición…"), viene de la calculadora de jonahbeast.com (manual, sección 2): felicítalo, explícale en simple qué significan SUS números tal cual (no calcules otros; el % de grasa y el IMC son estimaciones de referencia, no un diagnóstico), dale un primer paso concreto y dile que cree su cuenta gratis en jonahbeast.com para tener su plan con comida peruana, con 7 días de Premium. Sé breve y cálido.

Reglas (además de las de la sección 0 del manual):
- Nunca apruebes pagos, des accesos, prometas descuentos, ni des consejos médicos.
- Nunca des información sensible: datos de otras personas, números de Yape/Plin o cuentas bancarias (di que están en la app, en el ícono de tarjeta "Mi plan"), el código de la calculadora, contraseñas o códigos de verificación.
- Solo hablas de Jonah Beast Fuel (la app, planes, alimentación dentro de la app, la tienda). Si preguntan otra cosa, di con amabilidad que solo puedes ayudar con la app.
- Si piden agregar un alimento o plato a la app: primero revisa la lista "Alimentos que ya están en la app" y los que Jonah agregó hace poco. Si ya existe (aunque se escriba distinto), dile con qué nombre buscarlo en "REGISTRAR" → "Escribir". Si no existe, usa la herramienta pedir_alimento (sin escribir texto: el sistema le responde al cliente que se están calculando los macros y le avisa cuando esté listo). No uses pasar_a_jonah para esto.
- Este WhatsApp es también el número personal de Jonah. Si el mensaje es claramente personal (familia, pareja, amigos, planes para salir, trabajo o temas ajenos a Jonah Beast Fuel) y no pregunta nada de la app, los planes, los pagos, la alimentación ni la tienda, usa la herramienta mensaje_personal (sin escribir texto): no se responde y el chat queda para Jonah. Si hay cualquier duda (por ejemplo "hola", "información" o "precio" de un número nuevo), NO la uses: responde normalmente.
- Usa la herramienta pasar_a_jonah cuando: haya un pago por aprobar, rechazado o con problemas; pidan descuentos o precios especiales; haya temas médicos (embarazo, diabetes, lesiones, medicamentos, trastornos de la alimentación); haya reclamos, enojo o pedidos de reembolso; no sepas la respuesta; o pidan hablar con una persona. Cuando la uses, no escribas texto: el sistema le avisa al cliente.`;

// Antes y después de Jonah (está en public/ de la web). El asistente la
// manda como máximo una vez por conversación.
const FOTO_ANTES_DESPUES = "https://jonahbeast.com/antes-despues-jonah.jpg";
const TEXTO_ANTES_DESPUES = "(foto) Antes y después de Jonah: 104 kg → 90.2 kg en 2 meses con su propia app";

const HERRAMIENTAS = [{
  name: "pedir_alimento",
  description: "Deja anotado un alimento o plato que el cliente quiere que se agregue a la app porque no está. Jonah calcula los macros y lo agrega; cuando esté listo, el sistema le avisa al cliente por aquí. El asistente sigue atendiendo este chat.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      alimento: { type: "string", description: "Nombre corto del alimento o plato, en español peruano, sin cantidades. Ej.: \"Plátano bellaco\", \"Tallarines verdes con bistec\"." },
    },
    required: ["alimento"],
    additionalProperties: false,
  },
}, {
  name: "pasar_a_jonah",
  description: "Pasa la conversación a Jonah (una persona) y deja al asistente en silencio en este chat. El sistema le manda al cliente un mensaje avisando que Jonah le escribe en breve, y le avisa a Jonah en su celular.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      motivo: { type: "string", enum: ["pago", "descuento", "medico", "reclamo", "no_se", "pide_persona", "otro"] },
      resumen: { type: "string", description: "Una línea para Jonah: quién es y qué necesita. Ej.: \"Alumna Carla pide reembolso de su plan trimestral\"." },
    },
    required: ["motivo", "resumen"],
    additionalProperties: false,
  },
}, {
  name: "mandar_antes_despues",
  description: "Manda al cliente la imagen del antes y después de Jonah (104 kg el 27 de julio → 90.2 kg el 30 de septiembre, usando su propia app). Escribe además un texto corto: el sistema manda primero el texto y después la foto. Máximo una vez por conversación.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  },
}, {
  name: "mensaje_personal",
  description: "El mensaje es claramente personal para Jonah (familia, pareja, amigos, temas ajenos a Jonah Beast Fuel). El asistente no responde nada y el chat queda para Jonah. Nunca la uses si hay dudas.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      resumen: { type: "string", description: "De qué trata, en pocas palabras. Ej.: \"saludo familiar\"." },
    },
    required: ["resumen"],
    additionalProperties: false,
  },
}];

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  (Deno.env.get("CLAVE_SERVICIO") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!,
);

// Manual de la app: se lee de la tabla manual_app (se actualiza después de
// cada merge con el texto de main), así cambiar el manual no obliga a volver
// a publicar esta función. Se guarda unos minutos en memoria; si la tabla no
// responde, se usa el último que se leyó. Si nunca se pudo leer, el
// asistente no inventa: pasa a Jonah las dudas sobre cómo usar la app.
const MANUAL_NO_DISPONIBLE = "(El manual no está disponible en este momento. Si preguntan cómo usar la app, cómo funciona algo o qué dice un botón, no inventes: usa pasar_a_jonah.)";
let manualCache: { texto: string; leido: number } | null = null;
async function cargarManual(): Promise<string> {
  if (manualCache && Date.now() - manualCache.leido < 5 * 60_000) return manualCache.texto;
  try {
    const { data, error } = await supabase.from("manual_app").select("texto").eq("id", 1).maybeSingle();
    if (error) throw error;
    if (data?.texto) {
      manualCache = { texto: data.texto, leido: Date.now() };
      return data.texto;
    }
  } catch (e) {
    console.error("No se pudo leer el manual:", (e as Error)?.message);
  }
  return manualCache?.texto || MANUAL_NO_DISPONIBLE;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // Meta confirma el webhook una sola vez con un GET.
  if (req.method === "GET") {
    if (url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === VERIFY_TOKEN) {
      return new Response(url.searchParams.get("hub.challenge") || "", { status: 200 });
    }
    return new Response("No autorizado", { status: 403 });
  }
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return new Response("ok", { status: 200 });

  // Seguimiento (cron) y simulador del panel: no vienen de Meta.
  if (AVISO_SECRETO && req.headers.get("x-webhook-secret") === AVISO_SECRETO) {
    const r = await seguimiento().catch((e) => ({ error: (e as Error)?.message || "error" }));
    return json(r);
  }
  if (!req.headers.get("x-hub-signature-256") && req.headers.get("authorization")) return await simular(req);

  const crudo = await req.text();
  if (!APP_SECRET || !(await firmaValida(crudo, req.headers.get("x-hub-signature-256") || ""))) {
    console.error("whatsapp-webhook: firma inválida o falta WHATSAPP_APP_SECRET");
    return new Response("No autorizado", { status: 401 });
  }

  let cuerpo: any;
  try { cuerpo = JSON.parse(crudo); } catch { return new Response("ok", { status: 200 }); }

  // Meta espera la respuesta rápido: el trabajo sigue en segundo plano.
  const trabajo = procesar(cuerpo).catch((e) => console.error("whatsapp-webhook:", (e as Error)?.message || e));
  // @ts-ignore EdgeRuntime existe en Supabase
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(trabajo); else await trabajo;
  return new Response("ok", { status: 200 });
});

async function firmaValida(crudo: string, cabecera: string) {
  const esperado = cabecera.replace(/^sha256=/, "");
  if (!esperado) return false;
  const llave = await crypto.subtle.importKey("raw", new TextEncoder().encode(APP_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const firma = new Uint8Array(await crypto.subtle.sign("HMAC", llave, new TextEncoder().encode(crudo)));
  const hex = Array.from(firma).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex.length !== esperado.length) return false;
  let dif = 0;
  for (let i = 0; i < hex.length; i++) dif |= hex.charCodeAt(i) ^ esperado.charCodeAt(i);
  return dif === 0;
}

async function procesar(cuerpo: any) {
  const { data: cuenta } = await supabase.from("whatsapp_cuenta")
    .select("phone_number_id, token").eq("id", 1).maybeSingle();

  for (const entrada of cuerpo?.entry || []) {
    for (const cambio of entrada?.changes || []) {
      const valor = cambio?.value || {};
      if (cuenta?.phone_number_id && valor?.metadata?.phone_number_id && valor.metadata.phone_number_id !== cuenta.phone_number_id) continue;
      if (cambio.field === "messages") {
        for (const msg of valor.messages || []) await atenderMensaje(cuenta, valor, msg);
      } else if (cambio.field === "smb_message_echoes") {
        for (const eco of valor.message_echoes || []) await registrarRespuestaDeJonah(eco);
      } else if (cambio.field === "smb_app_state_sync") {
        for (const s of valor.state_sync || []) await sincronizarContacto(s);
      }
    }
  }
}

// Los últimos 9 dígitos: así se compara "51963760819" con "963 760 819".
function nueveDigitos(tel: string) {
  return String(tel || "").replace(/\D/g, "").slice(-9);
}

// Número en el formato en que Meta manda los mensajes: solo dígitos y con
// el 51 de Perú si vino sin código de país.
function telefonoWhatsApp(tel: string) {
  const d = String(tel || "").replace(/\D/g, "");
  return d.length === 9 ? "51" + d : d;
}

async function esPersonal(telefono: string) {
  const { data } = await supabase.from("whatsapp_chats").select("modo").eq("telefono", telefono).maybeSingle();
  return data?.modo === "personal";
}

// Regla 1: un contacto guardado en el celular de Jonah es personal (familia,
// amigos), salvo que sea alumno. Si lo borra de sus contactos, vuelve al
// asistente. Lo que Jonah puso a mano en "No responder" no se toca.
async function sincronizarContacto(s: any) {
  if (s?.type !== "contact") return;
  const telefono = telefonoWhatsApp(s.contact?.phone_number || "");
  if (telefono.length < 11) return;
  const { data: chat } = await supabase.from("whatsapp_chats").select("modo, motivo, nombre").eq("telefono", telefono).maybeSingle();
  if (s.action === "remove") {
    if (chat?.modo === "personal" && chat?.motivo === "contacto") {
      await supabase.from("whatsapp_chats").update({ modo: "asistente", motivo: null }).eq("telefono", telefono);
    }
    return;
  }
  if (chat?.modo === "personal") return;
  if (await buscarAlumno(telefono)) return;
  const nombre = String(s.contact?.full_name || s.contact?.first_name || "").trim() || chat?.nombre || null;
  const { error } = await supabase.from("whatsapp_chats").upsert({
    telefono, nombre, modo: "personal", motivo: "contacto", resumen: null, pausado_hasta: null,
  }, { onConflict: "telefono" });
  if (error) { console.error("No se pudo marcar el contacto como personal:", error.message); return; }
  // Lo que se hubiera guardado antes de saber que era personal, se borra.
  await supabase.from("whatsapp_mensajes").delete().eq("telefono", telefono);
}

function textoDe(msg: any): { tipo: string; texto: string } {
  switch (msg?.type) {
    case "text": return { tipo: "texto", texto: msg.text?.body || "" };
    case "image": return { tipo: "imagen", texto: msg.image?.caption ? `(foto) ${msg.image.caption}` : "(foto)" };
    case "audio": return { tipo: "audio", texto: "(nota de voz)" };
    case "video": return { tipo: "video", texto: msg.video?.caption ? `(video) ${msg.video.caption}` : "(video)" };
    case "document": return { tipo: "documento", texto: `(documento) ${msg.document?.filename || ""}`.trim() };
    case "sticker": return { tipo: "sticker", texto: "(sticker)" };
    case "location": return { tipo: "ubicacion", texto: "(ubicación)" };
    case "button": return { tipo: "texto", texto: msg.button?.text || "" };
    case "interactive": return { tipo: "texto", texto: msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || "" };
    default: return { tipo: msg?.type || "otro", texto: `(${msg?.type || "mensaje"})` };
  }
}

async function atenderMensaje(cuenta: any, valor: any, msg: any) {
  const telefono = String(msg?.from || "");
  if (!telefono || !msg?.id) return;
  // Reglas 1 y 2: chat personal de Jonah. Ni se guarda ni se responde.
  if (await esPersonal(telefono)) return;
  if (TIPOS_SIN_RESPUESTA.includes(msg?.type)) return;
  const { tipo, texto } = textoDe(msg);

  // Meta a veces repite el aviso: el id del mensaje es único, así no se
  // responde dos veces lo mismo.
  const { error: repetido } = await supabase.from("whatsapp_mensajes")
    .insert({ telefono, wa_id: msg.id, direccion: "entrante", tipo, texto });
  if (repetido) return;

  // Nota de voz: se pasa a texto para que el asistente la entienda.
  if (msg.type === "audio" && msg.audio?.id && cuenta?.token) {
    const dicho = await transcribir(cuenta, msg.audio.id).catch((e) => {
      console.error("No se pudo transcribir la nota de voz:", (e as Error)?.message);
      return "";
    });
    if (dicho) await supabase.from("whatsapp_mensajes").update({ texto: `(nota de voz) ${dicho}` }).eq("wa_id", msg.id);
  }

  const nombreWa = valor?.contacts?.find((c: any) => c.wa_id === telefono)?.profile?.name || valor?.contacts?.[0]?.profile?.name || null;
  const alumno = await buscarAlumno(telefono);
  const ahora = new Date();

  const { data: chat } = await supabase.from("whatsapp_chats").select("*").eq("telefono", telefono).maybeSingle();
  await supabase.from("whatsapp_chats").upsert({
    telefono,
    nombre: alumno?.nombre || nombreWa || chat?.nombre || null,
    username: alumno?.username || chat?.username || null,
    ultimo_mensaje_en: ahora.toISOString(),
  }, { onConflict: "telefono" });

  if (!cuenta?.token || !cuenta?.phone_number_id) return; // aún no se conectó el número
  if (!(await debeResponder(telefono))) return;

  // Chat con Jonah: el asistente calla hasta que venza la pausa.
  if (chat?.modo === "jonah") {
    if (!chat.pausado_hasta || new Date(chat.pausado_hasta) > ahora) return;
    await supabase.from("whatsapp_chats").update({ modo: "asistente", motivo: null, resumen: null, pausado_hasta: null }).eq("telefono", telefono);
  }

  // Tope diario por número.
  const inicioDia = `${fechaLima()}T00:00:00-05:00`;
  const { count: hoyCliente } = await supabase.from("whatsapp_mensajes")
    .select("id", { count: "exact", head: true }).eq("telefono", telefono).eq("direccion", "entrante").gte("creado_en", inicioDia);
  if ((hoyCliente || 0) > LIMITE_MENSAJES_DIA) {
    const resumen = `${alumno?.nombre || nombreWa || "+" + telefono} mandó más de ${LIMITE_MENSAJES_DIA} mensajes hoy: el asistente dejó de responderle hasta mañana.`;
    await enviarTexto(cuenta, telefono, MENSAJE_PASO_A_JONAH);
    await supabase.from("whatsapp_chats").update({
      modo: "jonah", motivo: "otro", resumen, pausado_hasta: new Date(Date.now() + 12 * 3600000).toISOString(),
    }).eq("telefono", telefono);
    await avisarAJonah(telefono, alumno?.nombre || nombreWa, resumen);
    return;
  }

  // Mensajes seguidos: se espera un momento; si llegó otro después, ese
  // responde a todo junto (el historial incluye este).
  await new Promise((r) => setTimeout(r, ESPERA_MENSAJES_SEGUIDOS_MS));
  if (!(await esElUltimoDelCliente(telefono, msg.id))) return;

  // Tope diario de la IA sumando todos los chats.
  const { count: hoyIA } = await supabase.from("ia_uso")
    .select("id", { count: "exact", head: true }).eq("funcion", "whatsapp-webhook").eq("tipo", "whatsapp").gte("creado_en", inicioDia);
  if ((hoyIA || 0) >= LIMITE_RESPUESTAS_IA_DIA) {
    await avisarUnaVez("whatsapp_aviso_tope", fechaLima(),
      `⚠️ El asistente de WhatsApp llegó a ${LIMITE_RESPUESTAS_IA_DIA} respuestas hoy y se pausó hasta mañana (para cuidar el gasto). Revisa los chats en el panel.`);
    return;
  }

  await graph(cuenta, `/${cuenta.phone_number_id}/messages`, { messaging_product: "whatsapp", status: "read", message_id: msg.id }).catch(() => {});

  let respuesta: { texto?: string; pasar?: { motivo: string; resumen: string }; pedido?: string; personal?: string; antesDespues?: boolean };
  try {
    respuesta = await preguntarAClaude(cuenta, telefono, msg, alumno, nombreWa);
  } catch (e) {
    console.error("whatsapp-webhook: Claude no respondió:", (e as Error)?.message);
    // Falla técnica (IA caída o sin saldo): al cliente no se le promete nada;
    // el chat queda para Jonah y le llega UN aviso por hora, no uno por chat.
    await supabase.from("whatsapp_chats").update({
      modo: "jonah", motivo: "otro",
      resumen: `El asistente no pudo responder (falla técnica). Último mensaje: ${texto.slice(0, 120)}`,
      pausado_hasta: new Date(Date.now() + PAUSA_TRAS_PASAR_A_JONAH * 3600000).toISOString(),
    }).eq("telefono", telefono);
    await avisarUnaVez("whatsapp_aviso_falla", new Date().toISOString().slice(0, 13),
      "⚠️ El asistente de WhatsApp no puede responder (la IA no contesta; revisa el saldo). Los chats que llegan quedan para ti en el panel.");
    return;
  }

  // Mientras la IA pensaba pudo llegar otro mensaje (ese responde a todo) o
  // Jonah pudo responder desde su celular: entonces no se envía nada.
  if (!(await esElUltimoDelCliente(telefono, msg.id))) return;
  const { data: ahoraChat } = await supabase.from("whatsapp_chats").select("modo, pausado_hasta").eq("telefono", telefono).maybeSingle();
  if (ahoraChat?.modo === "personal") return;
  if (ahoraChat?.modo === "jonah" && (!ahoraChat.pausado_hasta || new Date(ahoraChat.pausado_hasta) > new Date())) return;

  if (respuesta.personal) {
    // Regla 3: la IA vio que es un mensaje personal. El chat queda como
    // personal (no se vuelve a consultar a la IA) y no se guarda nada.
    const { error } = await supabase.from("whatsapp_chats").upsert({
      telefono, modo: "personal", motivo: "ia", resumen: null, pausado_hasta: null,
    }, { onConflict: "telefono" });
    if (error) console.error("No se pudo marcar el chat como personal:", error.message);
    else await supabase.from("whatsapp_mensajes").delete().eq("telefono", telefono);
    return;
  }

  if (respuesta.pasar) {
    await enviarTexto(cuenta, telefono, MENSAJE_PASO_A_JONAH);
    await supabase.from("whatsapp_chats").update({
      modo: "jonah", motivo: respuesta.pasar.motivo, resumen: respuesta.pasar.resumen,
      pausado_hasta: new Date(Date.now() + PAUSA_TRAS_PASAR_A_JONAH * 3600000).toISOString(),
    }).eq("telefono", telefono);
    await avisarAJonah(telefono, alumno?.nombre || nombreWa, respuesta.pasar.resumen);
  } else if (respuesta.pedido) {
    await registrarPedido(telefono, alumno, nombreWa, respuesta.pedido);
    await enviarTexto(cuenta, telefono, mensajePedido(respuesta.pedido));
  } else if (respuesta.texto || respuesta.antesDespues) {
    if (respuesta.texto) await enviarTexto(cuenta, telefono, respuesta.texto);
    if (respuesta.antesDespues && !(await yaMandoAntesDespues(telefono))) await enviarAntesDespues(cuenta, telefono);
  }
}

// El plato queda en "Pedidos de alimentos" del panel (si ya lo pidió otra
// persona, se suma al mismo pedido) y Jonah recibe una notificación.
async function registrarPedido(telefono: string, alumno: any, nombreWa: string | null, alimento: string) {
  const quien = alumno?.nombre || nombreWa || null;
  const { error } = await supabase.rpc("sumar_pedido_alimento", {
    p_nombre: alimento,
    p_solicitante: { origen: "whatsapp", telefono, nombre: quien, username: alumno?.username || null, fecha: new Date().toISOString() },
  });
  if (error) console.error("No se pudo guardar el pedido de alimento:", error.message);
  if (!AVISO_SECRETO) return;
  try {
    await fetch("https://jonahbeast.com/api/aviso-push", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-webhook-secret": AVISO_SECRETO },
      body: JSON.stringify({
        admin: true,
        body: `🍽️ ${quien || "+" + telefono} pide agregar "${alimento}" a la app. Revísalo en Pedidos de alimentos.`,
      }),
    });
  } catch (e) {
    console.error("No se pudo avisar del pedido:", (e as Error)?.message);
  }
}

async function registrarRespuestaDeJonah(eco: any) {
  const telefono = String(eco?.to || "");
  if (!telefono || !eco?.id) return;
  if (await esPersonal(telefono)) return; // chat personal: no se guarda
  // Solo chats que ya existen (un cliente que escribió antes): lo que Jonah
  // conversa con otros números desde su celular no se guarda.
  const { data: existe } = await supabase.from("whatsapp_chats").select("telefono").eq("telefono", telefono).maybeSingle();
  if (!existe) return;
  const { tipo, texto } = textoDe(eco);
  const { error: repetido } = await supabase.from("whatsapp_mensajes")
    .insert({ telefono, wa_id: eco.id, direccion: "jonah", tipo, texto });
  if (repetido) return;

  // Jonah está respondiendo en persona: el asistente calla en este chat.
  const { data: chat } = await supabase.from("whatsapp_chats").select("pausado_hasta").eq("telefono", telefono).maybeSingle();
  const nueva = Date.now() + PAUSA_TRAS_RESPUESTA_DE_JONAH * 3600000;
  const actual = chat?.pausado_hasta ? new Date(chat.pausado_hasta).getTime() : 0;
  await supabase.from("whatsapp_chats").upsert({
    telefono, modo: "jonah",
    pausado_hasta: new Date(Math.max(nueva, actual)).toISOString(),
    ultimo_mensaje_en: new Date().toISOString(),
  }, { onConflict: "telefono" });
}

async function debeResponder(telefono: string) {
  const { data } = await supabase.from("config").select("key, value")
    .in("key", ["whatsapp_asistente", "whatsapp_numeros_prueba"]);
  const ajustes: Record<string, string> = {};
  (data || []).forEach((c: any) => { ajustes[c.key] = c.value; });
  const modo = ajustes.whatsapp_asistente || "apagado";
  if (modo === "activo") return true;
  if (modo !== "prueba") return false;
  const permitidos = String(ajustes.whatsapp_numeros_prueba || "").split(",").map(nueveDigitos).filter(Boolean);
  return permitidos.includes(nueveDigitos(telefono));
}

async function buscarAlumno(telefono: string) {
  const n9 = nueveDigitos(telefono);
  if (n9.length < 9) return null;
  const { data } = await supabase.from("alumnos")
    .select("username, nombre, telefono, plan, enabled, fecha_inicio, fecha_vencimiento, reconocimiento_foto_hasta")
    .ilike("telefono", `%${n9.slice(0, 3)}%${n9.slice(3, 6)}%${n9.slice(6)}`).limit(3);
  // Solo si el número calza con un único alumno; si hay dudas, se trata
  // como cliente sin cuenta (no se dan datos de nadie).
  const exactos = (data || []).filter((a: any) => nueveDigitos(a.telefono) === n9);
  return exactos.length === 1 ? exactos[0] : null;
}

// Cuenta habilitada con la prueba o el plan vencido: versión gratis (el
// asistente de WhatsApp y pedir alimentos son Premium).
function esVersionGratis(alumno: any, hoy: string) {
  return !!alumno && !!alumno.enabled && !!alumno.fecha_vencimiento && alumno.fecha_vencimiento < hoy;
}

function fechaLima(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(d);
}

async function yaMandoAntesDespues(telefono: string) {
  const { count } = await supabase.from("whatsapp_mensajes")
    .select("id", { count: "exact", head: true }).eq("telefono", telefono).eq("tipo", "antes_despues");
  return (count || 0) > 0;
}

async function contexto(alumno: any, nombreWa: string | null, telefono: string) {
  const hoy = fechaLima();
  const { data: config } = await supabase.from("config").select("key, value").in("key", ["precio_1", "precio_3", "precio_6", "precio_12"]);
  const respaldo: Record<string, number> = { precio_1: 24.90, precio_3: 64.90, precio_6: 114.90, precio_12: 209.90 };
  const precio = (k: string) => {
    const v = parseFloat((config || []).find((c: any) => c.key === k)?.value);
    return (v > 0 ? v : respaldo[k]).toFixed(2);
  };
  const { data: extras } = await supabase.from("alimentos_extra").select("nombre, estado").order("nombre");
  const agregados = (extras || []).map((a: any) => a.estado && a.estado !== "-" ? `${a.nombre} (${String(a.estado).toLowerCase()})` : a.nombre);
  let t = `Datos de esta conversación (hoy es ${hoy}, hora de Lima):
- Alimentos que Jonah agregó hace poco (también están en la app): ${agregados.length ? agregados.join(", ") : "ninguno"}.
- Precios vigentes: Mensual S/${precio("precio_1")}, Trimestral S/${precio("precio_3")}, Semestral S/${precio("precio_6")}, Anual S/${precio("precio_12")}. La captura inteligente (5 fotos de comida al día) viene incluida en todos los planes; ya no se vende aparte.
- Nombre en WhatsApp: ${nombreWa || "desconocido"}. Número: +${telefono}.
- Foto del antes y después de Jonah: ${(await yaMandoAntesDespues(telefono)) ? "YA se la mandaste en esta conversación (no la vuelvas a mandar)" : "todavía no se la mandaste"}.`;

  if (!alumno) {
    return t + `\n- No está registrado como alumno con este número (posible cliente nuevo, o se registró con otro celular). No tienes datos de ninguna cuenta.`;
  }
  const vigente = !!alumno.enabled && !(alumno.fecha_vencimiento && alumno.fecha_vencimiento < hoy);
  const tipoPlan = alumno.plan === "pago" ? "plan pagado" : (alumno.plan === "trial" || alumno.plan === "prueba") ? "prueba gratis" : (alumno.plan || "sin plan");
  const { data: pago } = await supabase.from("pagos")
    .select("plan_meses, monto, metodo, estado, creado_en").eq("username", alumno.username)
    .order("creado_en", { ascending: false }).limit(1).maybeSingle();
  t += `\n- Es alumno (el número coincide con su cuenta): ${alumno.nombre || alumno.username}.
- Plan: ${tipoPlan}, ${vigente ? "vigente (Premium)" : alumno.enabled ? "vencido: está en la versión gratis" : "deshabilitado"}${alumno.fecha_vencimiento ? `, vence el ${alumno.fecha_vencimiento}` : ""}.${esVersionGratis(alumno, hoy) ? `
- IMPORTANTE: está en la versión gratis y el asistente de WhatsApp es Premium. Sí ayúdale con planes y precios, cómo pagar, su cuenta, problemas técnicos de la app y cómo usar lo que tiene gratis. Pero si pide consejos de alimentación, qué comer, cuántas calorías tiene algo, revisar sus comidas o agregar un alimento a la app, dile con amabilidad que eso es Premium, que en la versión gratis puede buscarlo o crear su propio alimento en la app, y ofrécele los planes. No uses pedir_alimento con él.` : ""}
- Complemento antiguo de fotos (ya no se vende; con plan tiene 5 fotos al día igual): ${alumno.reconocimiento_foto_hasta && alumno.reconocimiento_foto_hasta >= hoy ? `activo hasta el ${alumno.reconocimiento_foto_hasta}` : "no activo"}.
- Último pago: ${pago ? `S/${Number(pago.monto).toFixed(2)} por ${pago.plan_meses} mes(es), ${pago.metodo || "método no indicado"}, estado "${pago.estado}", enviado el ${String(pago.creado_en).slice(0, 10)}` : "no tiene pagos registrados"}.`;
  return t;
}

// Historial reciente del chat, en el formato de la API: el cliente es
// "user"; el asistente y Jonah son "assistant". La API exige que empiece con
// "user" y acepta turnos seguidos del mismo rol (los junta).
async function historial(telefono: string) {
  const { data } = await supabase.from("whatsapp_mensajes")
    .select("direccion, texto, creado_en").eq("telefono", telefono)
    .order("creado_en", { ascending: false }).limit(20);
  const turnos = (data || []).reverse()
    .filter((m: any) => m.texto)
    .map((m: any) => ({
      role: m.direccion === "entrante" ? "user" : "assistant",
      content: m.direccion === "jonah" ? `(Jonah respondió en persona) ${m.texto}` : m.texto,
    }));
  while (turnos.length && turnos[0].role !== "user") turnos.shift();
  return turnos as { role: "user" | "assistant"; content: any }[];
}

async function imagenEnBase64(cuenta: any, mediaId: string) {
  const info = await graph(cuenta, `/${mediaId}`, null);
  if (!info?.url || (info.file_size && info.file_size > MAX_IMAGEN)) return null;
  const r = await fetch(info.url, { headers: { Authorization: `Bearer ${cuenta.token}` } });
  if (!r.ok) return null;
  const bytes = new Uint8Array(await r.arrayBuffer());
  if (bytes.length > MAX_IMAGEN) return null;
  const tipo = String(info.mime_type || "image/jpeg").split(";")[0];
  if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(tipo)) return null;
  return { type: "image", source: { type: "base64", media_type: tipo, data: encodeBase64(bytes) } };
}

async function preguntarAClaude(cuenta: any, telefono: string, msg: any, alumno: any, nombreWa: string | null, dados?: { role: "user" | "assistant"; content: any }[]) {
  const mensajes = dados || await historial(telefono);
  if (!mensajes.length || mensajes[mensajes.length - 1].role !== "user") return {};

  // La foto que acaba de mandar va junto a su último mensaje.
  if (cuenta && msg.type === "image" && msg.image?.id) {
    const imagen = await imagenEnBase64(cuenta, msg.image.id).catch(() => null);
    if (imagen) {
      const ultimo = mensajes[mensajes.length - 1];
      ultimo.content = [imagen, { type: "text", text: String(ultimo.content) }];
    }
  }

  const cuerpo = JSON.stringify({
    model: MODELO,
    max_tokens: 2000, // una respuesta de WhatsApp es corta: acota el gasto
    output_config: { effort: "low" },
    fallbacks: "default",
    // El manual es igual en todas las llamadas: va primero y queda en caché.
    // Los datos de la conversación cambian siempre: van después.
    system: [
      { type: "text", text: `${PERSONA}\n\n# Manual de la app\n\n${await cargarManual()}\n\n# Alimentos que ya están en la app (nombre y cómo se come)\n\n${ALIMENTOS_APP.join("\n")}`, cache_control: { type: "ephemeral" } },
      { type: "text", text: await contexto(alumno, nombreWa, telefono) },
    ],
    tools: HERRAMIENTAS,
    messages: mensajes,
  });

  let data: any = null;
  for (let intento = 0; ; intento++) {
    let r: Response | null = null;
    try {
      r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "server-side-fallback-2026-07-01",
        },
        body: cuerpo,
      });
    } catch (e) {
      console.error("Sin conexión con Anthropic:", (e as Error)?.message);
    }
    if (r?.ok) { data = await r.json(); break; }
    const reintentable = !r || r.status === 429 || r.status >= 500;
    console.error("Error de Anthropic:", r?.status ?? "red", r ? await r.text() : "");
    if (!reintentable || intento >= 2) throw new Error("upstream");
    await new Promise((res) => setTimeout(res, 1000 * (intento + 1)));
  }

  console.log(JSON.stringify({ evento: "whatsapp_uso", modelo: data.model, stop: data.stop_reason, ...data.usage }));
  await anotarUsoIA(supabase, { tipo: dados ? "whatsapp_prueba" : "whatsapp", username: alumno?.username, modelo: data.model || MODELO, usage: data.usage });

  if (data.stop_reason === "refusal") {
    return { pasar: { motivo: "otro", resumen: `El asistente no pudo responder a ${alumno?.nombre || nombreWa || "+" + telefono}.` } };
  }
  const bloques = data.content || [];
  const herramienta = bloques.find((b: any) => b.type === "tool_use" && b.name === "pasar_a_jonah");
  if (herramienta) {
    return { pasar: { motivo: String(herramienta.input?.motivo || "otro"), resumen: String(herramienta.input?.resumen || "").slice(0, 300) } };
  }
  // Regla 3: mensaje personal de un número nuevo. No se responde.
  const personal = bloques.find((b: any) => b.type === "tool_use" && b.name === "mensaje_personal");
  if (personal) {
    console.log(JSON.stringify({ evento: "whatsapp_personal", resumen: String(personal.input?.resumen || "").slice(0, 80) }));
    return { personal: String(personal.input?.resumen || "mensaje personal").slice(0, 120) };
  }
  const pedido = bloques.find((b: any) => b.type === "tool_use" && b.name === "pedir_alimento");
  const alimento = String(pedido?.input?.alimento || "").replace(/\s+/g, " ").trim().slice(0, 80);
  if (alimento && esVersionGratis(alumno, fechaLima())) {
    return { texto: `Pedir que agreguemos alimentos a la app es parte de Premium 👑. En la versión gratis puedes crearlo tú en la app: "REGISTRAR" → "Escribir" → "+ Crear mi alimento". Si quieres, te cuento los planes.` };
  }
  if (alimento) return { pedido: alimento };
  const texto = bloques.filter((b: any) => b.type === "text").map((b: any) => b.text || "").join("").trim();
  const antesDespues = bloques.some((b: any) => b.type === "tool_use" && b.name === "mandar_antes_despues");
  return antesDespues ? { texto, antesDespues } : { texto };
}

async function graph(cuenta: any, ruta: string, cuerpo: unknown) {
  const r = await fetch(GRAPH + ruta, {
    method: cuerpo ? "POST" : "GET",
    headers: { Authorization: `Bearer ${cuenta.token}`, ...(cuerpo ? { "Content-Type": "application/json" } : {}) },
    ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Graph ${r.status}: ${JSON.stringify(data?.error || data).slice(0, 300)}`);
  return data;
}

async function enviarTexto(cuenta: any, telefono: string, texto: string, tipo = "texto") {
  // WhatsApp acepta hasta 4096 caracteres por mensaje.
  const partes = texto.match(/[\s\S]{1,4000}(?=\s|$)|[\s\S]{1,4000}/g) || [];
  for (const parte of partes) {
    try {
      const r = await graph(cuenta, `/${cuenta.phone_number_id}/messages`, {
        messaging_product: "whatsapp", recipient_type: "individual", to: telefono,
        type: "text", text: { body: parte.trim(), preview_url: false },
      });
      await supabase.from("whatsapp_mensajes").insert({
        telefono, wa_id: r?.messages?.[0]?.id || null, direccion: "asistente", tipo, texto: parte.trim(),
      });
    } catch (e) {
      const m = (e as Error)?.message || "";
      console.error("No se pudo enviar el WhatsApp:", m);
      // Llave vencida o revocada (Meta responde 401 o el error 190).
      if (/Graph 401|"code":190/.test(m)) {
        await avisarUnaVez("whatsapp_aviso_llave", fechaLima(),
          "⚠️ La conexión de tu WhatsApp venció: el asistente ya no puede responder. Entra al panel → WHATSAPP → Conectar mi WhatsApp.");
      }
      return;
    }
  }
}

async function enviarAntesDespues(cuenta: any, telefono: string) {
  try {
    const r = await graph(cuenta, `/${cuenta.phone_number_id}/messages`, {
      messaging_product: "whatsapp", recipient_type: "individual", to: telefono,
      type: "image", image: { link: FOTO_ANTES_DESPUES },
    });
    await supabase.from("whatsapp_mensajes").insert({
      telefono, wa_id: r?.messages?.[0]?.id || null, direccion: "asistente", tipo: "antes_despues", texto: TEXTO_ANTES_DESPUES,
    });
  } catch (e) {
    console.error("No se pudo enviar el antes y después:", (e as Error)?.message || "");
  }
}

async function avisarAJonah(telefono: string, nombre: string | null, resumen: string) {
  if (!AVISO_SECRETO) return;
  try {
    await fetch("https://jonahbeast.com/api/whatsapp-aviso", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-webhook-secret": AVISO_SECRETO },
      body: JSON.stringify({ telefono, nombre, resumen }),
    });
  } catch (e) {
    console.error("No se pudo avisar a Jonah:", (e as Error)?.message);
  }
}

// ¿Este mensaje sigue siendo el último que mandó el cliente?
async function esElUltimoDelCliente(telefono: string, waId: string) {
  const { data } = await supabase.from("whatsapp_mensajes").select("wa_id")
    .eq("telefono", telefono).eq("direccion", "entrante")
    .order("creado_en", { ascending: false }).limit(1).maybeSingle();
  return !data || data.wa_id === waId;
}

// Aviso al celular de Jonah que no debe repetirse: se manda una sola vez por
// "periodo" (ej. el día o la hora), anotado en config.
async function avisarUnaVez(clave: string, periodo: string, texto: string) {
  const { data } = await supabase.from("config").select("value").eq("key", clave).maybeSingle();
  if (data?.value === periodo) return;
  await supabase.from("config").upsert({ key: clave, value: periodo });
  if (!AVISO_SECRETO) return;
  try {
    await fetch("https://jonahbeast.com/api/aviso-push", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-webhook-secret": AVISO_SECRETO },
      body: JSON.stringify({ admin: true, body: texto }),
    });
  } catch (e) {
    console.error("No se pudo avisar a Jonah:", (e as Error)?.message);
  }
}

// Anota en la tabla ia_uso cuántos tokens usó la IA en esta llamada, para
// que el panel de Rentabilidad calcule el costo real. Si falla, no
// interrumpe nada (solo queda en el log).
async function anotarUsoIA(supabase: any, fila: { tipo: string; username?: string | null; modelo?: string; usage?: any }) {
  try {
    const u = fila.usage || {};
    const { error } = await supabase.from("ia_uso").insert({
      funcion: "whatsapp-webhook", tipo: fila.tipo, username: fila.username || null, modelo: fila.modelo || "desconocido",
      tokens_entrada: Number(u.input_tokens) || 0, tokens_salida: Number(u.output_tokens) || 0,
      tokens_cache_lectura: Number(u.cache_read_input_tokens) || 0, tokens_cache_escritura: Number(u.cache_creation_input_tokens) || 0,
    });
    if (error) console.error("No se pudo anotar el uso de IA:", error.message);
  } catch (e) {
    console.error("No se pudo anotar el uso de IA:", (e as Error)?.message);
  }
}

// Nota de voz → texto (OpenAI). Devuelve "" si no hay clave o no se pudo.
async function transcribir(cuenta: any, mediaId: string) {
  if (!OPENAI_API_KEY) return "";
  const info = await graph(cuenta, `/${mediaId}`, null);
  if (!info?.url || (info.file_size && info.file_size > MAX_AUDIO)) return "";
  const r = await fetch(info.url, { headers: { Authorization: `Bearer ${cuenta.token}` } });
  if (!r.ok) return "";
  const bytes = new Uint8Array(await r.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_AUDIO) return "";
  const tipo = String(info.mime_type || "audio/ogg").split(";")[0];
  const extension = tipo.includes("mpeg") ? "mp3" : tipo.includes("mp4") || tipo.includes("aac") ? "m4a" : tipo.includes("amr") ? "amr" : "ogg";
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: tipo }), `nota.${extension}`);
  form.append("model", "gpt-4o-mini-transcribe");
  form.append("language", "es");
  const t = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST", headers: { authorization: `Bearer ${OPENAI_API_KEY}` }, body: form,
  });
  if (!t.ok) {
    console.error("OpenAI (transcripción) respondió", t.status, (await t.text().catch(() => "")).slice(0, 200));
    return "";
  }
  const d = await t.json().catch(() => ({}));
  console.log(JSON.stringify({ evento: "whatsapp_nota_de_voz", segundos_aprox: Math.round(bytes.length / 4000) }));
  return String(d?.text || "").replace(/\s+/g, " ").trim().slice(0, 2000);
}

// Simulador del panel: el admin escribe como si fuera un cliente y ve lo que
// respondería el asistente. No se envía ni se guarda nada.
async function simular(req: Request) {
  try {
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    const { data: authData } = await supabase.auth.getUser(token);
    if (!authData?.user) return json({ error: "No autorizado." }, 401);
    const { data: perfil } = await supabase.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
    if (perfil?.role !== "admin") return json({ error: "No autorizado." }, 403);

    const { simular: datos } = await req.json();
    const mensajes = (Array.isArray(datos?.mensajes) ? datos.mensajes : [])
      .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string" && m.content.trim())
      .slice(-20)
      .map((m: any) => ({ role: m.role, content: m.content.slice(0, 2000) }));
    while (mensajes.length && mensajes[0].role !== "user") mensajes.shift();
    if (!mensajes.length || mensajes[mensajes.length - 1].role !== "user") return json({ error: "Escribe un mensaje." }, 400);

    let alumno: any = null;
    const username = String(datos?.username || "").trim();
    if (username) {
      const { data } = await supabase.from("alumnos")
        .select("username, nombre, telefono, plan, enabled, fecha_inicio, fecha_vencimiento, reconocimiento_foto_hasta")
        .ilike("username", username).maybeSingle();
      if (!data) return json({ error: `No encontré al alumno "${username}".` }, 404);
      alumno = data;
    }
    const nombre = String(datos?.nombre || "").trim().slice(0, 40) || (alumno ? alumno.nombre : null);
    const r: any = await preguntarAClaude(null, "51900000000", { type: "text" }, alumno, nombre, mensajes);
    if (r.pasar) return json({ texto: MENSAJE_PASO_A_JONAH, pasar: r.pasar });
    if (r.pedido) return json({ texto: mensajePedido(r.pedido), pedido: r.pedido });
    if (r.personal) return json({ personal: r.personal });
    if (r.antesDespues) return json({ texto: `${r.texto || ""}\n\n📷 (Aquí se envía la foto del antes y después de Jonah)`.trim(), antesDespues: true });
    return json({ texto: r.texto || "" });
  } catch (e) {
    console.error("whatsapp-webhook (simulador):", (e as Error)?.message);
    return json({ error: "No se pudo simular: " + ((e as Error)?.message || "error") }, 500);
  }
}

// Seguimiento, cada hora (8am a 9pm de Lima), solo a chats que el asistente
// atiende y dentro de las 24 h desde el último mensaje del cliente:
//   - Lead que preguntó y no se registró: pasadas 3 h sin responder, un
//     recordatorio amable (una sola vez por número).
//   - Lead que luego creó su cuenta y guardó este celular: bienvenida con su
//     nombre y el primer paso (una sola vez).
async function seguimiento() {
  const hora = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Lima", hour: "numeric", hourCycle: "h23" }).format(new Date()));
  if (hora < 8 || hora >= 21) return { ok: true, enviados: 0, motivo: "fuera de horario" };
  const { data: cuenta } = await supabase.from("whatsapp_cuenta").select("phone_number_id, token").eq("id", 1).maybeSingle();
  if (!cuenta?.token || !cuenta?.phone_number_id) return { ok: true, enviados: 0, motivo: "sin conexión" };

  const ahora = Date.now();
  const desde = new Date(ahora - 23 * 3600000).toISOString();
  const { data: recientes } = await supabase.from("whatsapp_mensajes")
    .select("telefono").eq("direccion", "entrante").gte("creado_en", desde).range(0, 4999);
  const telefonos = [...new Set<string>((recientes || []).map((m: any) => String(m.telefono)))];
  let enviados = 0;

  for (const telefono of telefonos) {
    const { data: chat } = await supabase.from("whatsapp_chats").select("modo, nombre, username").eq("telefono", telefono).maybeSingle();
    if (!chat || chat.modo === "personal" || chat.modo === "jonah") continue;
    if (!(await debeResponder(telefono))) continue;
    const { data: msgs } = await supabase.from("whatsapp_mensajes")
      .select("direccion, tipo, creado_en").eq("telefono", telefono)
      .order("creado_en", { ascending: false }).limit(50);
    const lista = msgs || [];
    const ultimo = lista[0];
    const ultimoCliente = lista.find((m: any) => m.direccion === "entrante");
    if (!ultimo || !ultimoCliente) continue;
    if (ahora - new Date(ultimoCliente.creado_en).getTime() > 23 * 3600000) continue;
    const yaEnviado = (tipo: string) => lista.some((m: any) => m.tipo === tipo);
    const primerNombre = (n: string | null) => String(n || "").trim().split(/\s+/)[0] || "";

    const alumno = await buscarAlumno(telefono);
    if (alumno) {
      // Era lead (el chat no tenía cuenta) y ya se registró.
      if (chat.username || yaEnviado("bienvenida")) continue;
      if (!alumno.fecha_inicio || alumno.fecha_inicio < fechaLima(new Date(ahora - 3 * 86400000))) continue;
      const nombre = primerNombre(alumno.nombre) || primerNombre(chat.nombre);
      await supabase.from("whatsapp_chats").update({ username: alumno.username, nombre: alumno.nombre || chat.nombre }).eq("telefono", telefono);
      await enviarTexto(cuenta, telefono,
        `🎉 ¡${nombre ? nombre + ", y" : "Y"}a vi que creaste tu cuenta! Bienvenido/a a Jonah Beast Fuel. Tu primer paso: en la app toca *"REGISTRAR"* y tómale una foto a tu próxima comida 📸. Cualquier duda, me escribes aquí 💪`,
        "bienvenida");
      enviados++;
      continue;
    }
    // Lead sin cuenta: el último mensaje es del asistente (no está esperando
    // respuesta) y pasaron al menos 3 h.
    if (yaEnviado("seguimiento") || ultimo.direccion !== "asistente") continue;
    if (ahora - new Date(ultimo.creado_en).getTime() < 3 * 3600000) continue;
    const nombre = primerNombre(chat.nombre);
    await enviarTexto(cuenta, telefono,
      `Hola${nombre ? " " + nombre : ""} 👋 ¿Pudiste crear tu cuenta en *jonahbeast.com*? Es gratis y tienes 7 días de Premium para empezar con tu plan. Si te trabaste en algún paso, cuéntame y te ayudo 💪`,
      "seguimiento");
    enviados++;
  }
  return { ok: true, enviados, revisados: telefonos.length };
}
