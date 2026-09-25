// Edge Function: whatsapp-webhook
// Asistente de WhatsApp de Jonah Beast Fuel. Meta avisa aquí cada mensaje
// que llega al número de Jonah (y cada mensaje que Jonah manda desde su
// celular, gracias a la coexistencia). El asistente responde con Claude,
// usando el manual de la app (manual.ts, copiado de docs/manual-app.md con
// "npm run manual-jarvis") y los datos del alumno si ya es alumno.
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
// Se despliega con verify_jwt = false: Meta no manda sesión. La seguridad es
// la firma X-Hub-Signature-256 (secreto WHATSAPP_APP_SECRET): sin firma
// válida no se procesa nada.
//
// Publicación (regla de CLAUDE.md): solo después del merge, con el código de main.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";
import { MANUAL_APP } from "./manual.ts";
import { ALIMENTOS_APP } from "./alimentos.ts";

const GRAPH = "https://graph.facebook.com/v23.0";
const MODELO = "claude-opus-5";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const APP_SECRET = Deno.env.get("WHATSAPP_APP_SECRET") || "";
const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "jonahbeast-asistente";
const AVISO_SECRETO = Deno.env.get("NUEVO_ALUMNO_SECRET") || "";

// Horas que el asistente se queda callado en un chat.
const PAUSA_TRAS_PASAR_A_JONAH = 24;
const PAUSA_TRAS_RESPUESTA_DE_JONAH = 12;
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
- Si quien escribe no es alumno, invítalo a la prueba gratis de 15 días sin tarjeta en jonahbeast.com.

Reglas (además de las de la sección 0 del manual):
- Nunca apruebes pagos, des accesos, prometas descuentos, ni des consejos médicos.
- Nunca des información sensible: datos de otras personas, números de Yape/Plin o cuentas bancarias (di que están en la app, en el ícono de tarjeta "Mi plan"), el código de la calculadora, contraseñas o códigos de verificación.
- Solo hablas de Jonah Beast Fuel (la app, planes, alimentación dentro de la app, la tienda). Si preguntan otra cosa, di con amabilidad que solo puedes ayudar con la app.
- Si piden agregar un alimento o plato a la app: primero revisa la lista "Alimentos que ya están en la app" y los que Jonah agregó hace poco. Si ya existe (aunque se escriba distinto), dile con qué nombre buscarlo en "REGISTRAR" → "Escribir". Si no existe, usa la herramienta pedir_alimento (sin escribir texto: el sistema le responde al cliente que se están calculando los macros y le avisa cuando esté listo). No uses pasar_a_jonah para esto.
- Usa la herramienta pasar_a_jonah cuando: haya un pago por aprobar, rechazado o con problemas; pidan descuentos o precios especiales; haya temas médicos (embarazo, diabetes, lesiones, medicamentos, trastornos de la alimentación); haya reclamos, enojo o pedidos de reembolso; no sepas la respuesta; o pidan hablar con una persona. Cuando la uses, no escribas texto: el sistema le avisa al cliente.`;

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
}];

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  (Deno.env.get("CLAVE_SERVICIO") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!,
);

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // Meta confirma el webhook una sola vez con un GET.
  if (req.method === "GET") {
    if (url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === VERIFY_TOKEN) {
      return new Response(url.searchParams.get("hub.challenge") || "", { status: 200 });
    }
    return new Response("No autorizado", { status: 403 });
  }
  if (req.method !== "POST") return new Response("ok", { status: 200 });

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
      }
    }
  }
}

// Los últimos 9 dígitos: así se compara "51963760819" con "963 760 819".
function nueveDigitos(tel: string) {
  return String(tel || "").replace(/\D/g, "").slice(-9);
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
  const { tipo, texto } = textoDe(msg);

  // Meta a veces repite el aviso: el id del mensaje es único, así no se
  // responde dos veces lo mismo.
  const { error: repetido } = await supabase.from("whatsapp_mensajes")
    .insert({ telefono, wa_id: msg.id, direccion: "entrante", tipo, texto });
  if (repetido) return;

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

  await graph(cuenta, `/${cuenta.phone_number_id}/messages`, { messaging_product: "whatsapp", status: "read", message_id: msg.id }).catch(() => {});

  let respuesta: { texto?: string; pasar?: { motivo: string; resumen: string }; pedido?: string };
  try {
    respuesta = await preguntarAClaude(cuenta, telefono, msg, alumno, nombreWa);
  } catch (e) {
    console.error("whatsapp-webhook: Claude no respondió:", (e as Error)?.message);
    respuesta = { pasar: { motivo: "otro", resumen: `El asistente no pudo responder a ${alumno?.nombre || nombreWa || "+" + telefono} (error técnico). Último mensaje: ${texto.slice(0, 120)}` } };
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
  } else if (respuesta.texto) {
    await enviarTexto(cuenta, telefono, respuesta.texto);
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

function fechaLima(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(d);
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
- Precios vigentes: Mensual S/${precio("precio_1")}, Trimestral S/${precio("precio_3")}, Semestral S/${precio("precio_6")}, Anual S/${precio("precio_12")}. Complemento Reconocimiento Inteligente: S/11.90 al mes.
- Nombre en WhatsApp: ${nombreWa || "desconocido"}. Número: +${telefono}.`;

  if (!alumno) {
    return t + `\n- No está registrado como alumno con este número (posible cliente nuevo, o se registró con otro celular). No tienes datos de ninguna cuenta.`;
  }
  const vigente = !!alumno.enabled && !(alumno.fecha_vencimiento && alumno.fecha_vencimiento < hoy);
  const tipoPlan = alumno.plan === "pago" ? "plan pagado" : (alumno.plan === "trial" || alumno.plan === "prueba") ? "prueba gratis" : (alumno.plan || "sin plan");
  const { data: pago } = await supabase.from("pagos")
    .select("plan_meses, monto, metodo, estado, creado_en").eq("username", alumno.username)
    .order("creado_en", { ascending: false }).limit(1).maybeSingle();
  t += `\n- Es alumno (el número coincide con su cuenta): ${alumno.nombre || alumno.username}.
- Plan: ${tipoPlan}, ${vigente ? "vigente" : "vencido o deshabilitado"}${alumno.fecha_vencimiento ? `, vence el ${alumno.fecha_vencimiento}` : ""}.
- Reconocimiento Inteligente (fotos): ${alumno.reconocimiento_foto_hasta && alumno.reconocimiento_foto_hasta >= hoy ? `activo hasta el ${alumno.reconocimiento_foto_hasta}` : "no activo"}.
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

async function preguntarAClaude(cuenta: any, telefono: string, msg: any, alumno: any, nombreWa: string | null) {
  const mensajes = await historial(telefono);
  if (!mensajes.length || mensajes[mensajes.length - 1].role !== "user") return {};

  // La foto que acaba de mandar va junto a su último mensaje.
  if (msg.type === "image" && msg.image?.id) {
    const imagen = await imagenEnBase64(cuenta, msg.image.id).catch(() => null);
    if (imagen) {
      const ultimo = mensajes[mensajes.length - 1];
      ultimo.content = [imagen, { type: "text", text: String(ultimo.content) }];
    }
  }

  const cuerpo = JSON.stringify({
    model: MODELO,
    max_tokens: 16000,
    output_config: { effort: "low" },
    fallbacks: "default",
    // El manual es igual en todas las llamadas: va primero y queda en caché.
    // Los datos de la conversación cambian siempre: van después.
    system: [
      { type: "text", text: `${PERSONA}\n\n# Manual de la app\n\n${MANUAL_APP}\n\n# Alimentos que ya están en la app (nombre y cómo se come)\n\n${ALIMENTOS_APP.join("\n")}`, cache_control: { type: "ephemeral" } },
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

  if (data.stop_reason === "refusal") {
    return { pasar: { motivo: "otro", resumen: `El asistente no pudo responder a ${alumno?.nombre || nombreWa || "+" + telefono}.` } };
  }
  const bloques = data.content || [];
  const herramienta = bloques.find((b: any) => b.type === "tool_use" && b.name === "pasar_a_jonah");
  if (herramienta) {
    return { pasar: { motivo: String(herramienta.input?.motivo || "otro"), resumen: String(herramienta.input?.resumen || "").slice(0, 300) } };
  }
  const pedido = bloques.find((b: any) => b.type === "tool_use" && b.name === "pedir_alimento");
  const alimento = String(pedido?.input?.alimento || "").replace(/\s+/g, " ").trim().slice(0, 80);
  if (alimento) return { pedido: alimento };
  const texto = bloques.filter((b: any) => b.type === "text").map((b: any) => b.text || "").join("").trim();
  return { texto };
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

async function enviarTexto(cuenta: any, telefono: string, texto: string) {
  // WhatsApp acepta hasta 4096 caracteres por mensaje.
  const partes = texto.match(/[\s\S]{1,4000}(?=\s|$)|[\s\S]{1,4000}/g) || [];
  for (const parte of partes) {
    try {
      const r = await graph(cuenta, `/${cuenta.phone_number_id}/messages`, {
        messaging_product: "whatsapp", recipient_type: "individual", to: telefono,
        type: "text", text: { body: parte.trim(), preview_url: false },
      });
      await supabase.from("whatsapp_mensajes").insert({
        telefono, wa_id: r?.messages?.[0]?.id || null, direccion: "asistente", tipo: "texto", texto: parte.trim(),
      });
    } catch (e) {
      console.error("No se pudo enviar el WhatsApp:", (e as Error)?.message);
      return;
    }
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
