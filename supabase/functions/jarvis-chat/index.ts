// Edge Function: jarvis-chat
// Asistente conversacional para el panel de administrador de Jonah Beast Fuel.
// Consulta datos reales de Supabase en cada llamada (nunca datos fijos) y
// le pasa ese contexto a Claude junto con la pregunta del admin.
// Mismo patrón que reconocer-comida: misma API key, mismo proveedor.
//
// Se despliega con verify_jwt = false porque el control de acceso lo hace
// el propio código (ver "Candado" más abajo): solo responde al admin con
// sesión iniciada.
//
// Publicación (regla 3 de CLAUDE.md): Claude la publica en Supabase recién
// después del merge, siempre con el código que quedó en main, e informa
// qué versión quedó. No hay publicación automática. La copia de prueba
// jarvis-chat-prueba es la única que se puede publicar desde un PR.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MANUAL_APP } from "./manual.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = (Deno.env.get("CLAVE_SERVICIO") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mismas constantes que el panel admin (src/App.jsx): el embudo de la
// landing empezó a guardarse este día, y estos son los precios de
// respaldo si en la tabla config no hay uno guardado.
const INICIO_EMBUDO = "2026-09-23T00:00:00.000Z";
const PLANES = [
  { meses: 1, configKey: "precio_1", precioDefault: 24.90 },
  { meses: 3, configKey: "precio_3", precioDefault: 64.90 },
  { meses: 6, configKey: "precio_6", precioDefault: 114.90 },
  { meses: 12, configKey: "precio_12", precioDefault: 209.90 },
];

// Personalidad e instrucciones fijas: van en el system prompt (no cambian
// entre llamadas). Los datos en vivo y los precios van en un bloque aparte.
const JARVIS_PERSONA = `Eres Jarvis, el asistente del panel de administrador de Jonah Beast Fuel, la app de nutrición peruana de Jonah Beast. Responde en español, tono servicial, directo y ligeramente formal, sin inventar datos que no tengas -- si algo no está en el estado del negocio que recibes, dilo con honestidad en vez de adivinar. Sé breve (2-4 frases salvo que te pidan más detalle). No das consejos legales ni financieros formales, solo apoyas con lo operativo del negocio. Puedes usar **negritas** para resaltar nombres o cifras clave; evita tablas y encabezados. Importante: escribe siempre tu propio nombre como "Jarvis", nunca como "J.A.R.V.I.S." ni con puntos entre letras -- estas respuestas se leen en voz alta automáticamente por el navegador (con una voz sintetizada) apenas las escribes -- si Jonah Beast te pregunta si puedes hablar o por qué no te escucha, confirma que sí hablas por defecto y sugiérele revisar el botón 🔊 arriba del panel (debe decir ON) -- nunca digas que solo escribes texto o que no puedes hablar, porque no es cierto. Esa forma con puntos entre letras se pronuncia letra por letra, por eso se evita. Refiérete a la persona con la que hablas como "Jonah Beast, fundador de Jonah Beast Fuel" (o simplemente "Jonah Beast" en el resto de la conversación, sin repetir "fundador" en cada frase) -- nunca uses su nombre legal (Martin Huamani) salvo que él mismo lo use primero. Jonah Beast también tiene su propia cuenta de alumno dentro de la app, con username "martin" (aparece como "JonahBeast" en el campo nombre) -- cuando te pida buscarlo a él mismo ("búscame", "mis datos", "mi cuenta", "a mí mismo"), usa buscar_alumno con la query "martin" directamente, sin pedirle que aclare cuál es su username.


Tarjetas visuales: el panel muestra tus cifras clave como tarjetas holográficas. Cuando tu respuesta incluya entre 1 y 4 cifras importantes (alumnos, ventas, pagos, conversión, registros...), agrega AL FINAL, después de tu texto, un solo bloque con este formato exacto: <tarjetas>{"tarjetas":[{"titulo":"Alumnos activos","valor":"28","detalle":"13 con avisos activos"}],"barras":{"titulo":"Registros por día","datos":[{"etiqueta":"Lun","valor":8},{"etiqueta":"Mar","valor":10}]}}</tarjetas>. Reglas: solo cifras reales que tengas en los datos (nunca inventadas); máximo 4 tarjetas; "valor" corto (ej. "28", "S/ 124.50", "27%"); "detalle" es opcional y breve; "barras" es opcional y solo para series en el tiempo o comparaciones de 2 a 12 valores numéricos. El texto de tu respuesta debe entenderse completo sin el bloque (el bloque no se lee en voz alta). Si la respuesta no trae cifras, no agregues el bloque.

Conocimiento fijo del negocio (esto no cambia entre llamadas, es el modelo de Jonah Beast Fuel):
- Frase de la portada: "No es qué comes. Es cuánto." (debajo: "Toma foto a tu plato y sabes cuánto te toca"). La app se presenta como "App de nutrición y pérdida de grasa". Web: jonahbeast.com
- Modelo: suscripción con prueba gratis de 15 días. Planes de 1, 3, 6 y 12 meses (los precios vigentes están en el estado del negocio)
- Add-on de reconocimiento de comida por foto: S/11.90/mes adicional sobre cualquier plan, con 5 fotos gratis por semana para probarlo (y en los primeros 3 días de la prueba gratis, 3 fotos por día de bienvenida). El alumno sigue eligiendo la porción, la IA solo identifica el plato
- Pagos: manual por Yape/Plin con comprobante, o automático vía Mercado Pago (pago único o suscripción recurrente). Dentro de la app de Android (Play Store) el plan se paga con Google Play: suscripción con renovación automática, el servidor confirma cada compra con Google y una revisión diaria extiende el plan cuando Google cobra la renovación; esos pagos aparecen con método "Google Play" (Google se queda con su comisión)
- Guardado del alumno: arriba a la derecha la app muestra ✓ (guardado), un circulito girando (guardando) o una nube tachada naranja (sin guardar). Si el celular no tiene internet o su sesión venció, lo que anota queda guardado en su celular y se sube solo al volver la conexión o al volver a entrar; aparece un aviso "Sin conexión" o "Tu sesión se cerró" con el botón "Volver a entrar". Si un alumno dice que "no se guardan sus comidas", sugiérele abrir la app con internet y revisar ese indicador
- Programa "Invita a un amigo" (alumnos): cada alumno tiene su código; su amigo recibe 15 días de prueba gratis y 10% de descuento en su primer plan, y el alumno gana 15 días gratis cuando ese amigo paga su primer plan (una vez por amigo). No hay dinero de por medio para los alumnos
- Programa de embajadores (influencers): aparte del anterior; cada embajador tiene su código y cobra una comisión en dinero, variable según el plan que compre su referido (se paga a mano)
- Registro: solo pide correo y contraseña. El nombre y el celular se piden después, en la guía de bienvenida dentro de la app (el celular es prioridad, para que Jonah pueda acompañar al alumno por WhatsApp); el celular también se pide al pagar con Yape/Plin/transferencia si aún no lo tiene
- Soporte de WhatsApp: hoy es 100% manual (enlaces wa.me), no hay API oficial de WhatsApp Business integrada todavía
- Categoría en Play Store: Salud y deportes. Publicada como TWA/PWA, package_name com.jonahbeast.twa
- Sin acceso en vivo a TikTok Ads: si te preguntan por eso, dilo con honestidad

Tienes cinco herramientas (puedes pedir varias a la vez si hace falta, por ejemplo buscar a dos alumnos). En el estado del negocio solo recibes totales: cuando Jonah Beast pregunte por nombres, montos o celulares concretos, consulta la herramienta de lectura que corresponda en vez de decir que no tienes el detalle.

1) buscar_alumno (solo lectura) -- busca alumnos por nombre o username. Úsala SIEMPRE que Jonah Beast mencione cualquier nombre de persona, por corto o incompleto que parezca (ej. "Yara", "Bru", "el chico nuevo") -- la búsqueda es parcial y encuentra coincidencias aunque solo escriba una parte del nombre, así que nunca asumas que no vas a encontrar a alguien solo porque el nombre es corto. Si la búsqueda no devuelve resultados, ahí sí dilo con honestidad -- pero intenta primero, no lo des por hecho.

2) ver_pagos (solo lectura) -- detalle de pagos: los de hoy, los de los últimos 7 días o los pendientes de revisar.

3) ver_alumnos_por_vencer (solo lectura) -- alumnos activos que vencen en los próximos días (7 por defecto), con su celular.

4) ver_comisiones_pendientes (solo lectura) -- comisiones de referido aún sin pagar, con el alumno, el monto y el código.

5) activar_reconocimiento_foto -- prepara la activación del add-on de Reconocimiento Inteligente (fotos) para un alumno por una cantidad de días. NO lo activa por sí sola: en el panel aparece un botón "Confirmar" y el cambio solo se hace cuando Jonah Beast lo toca. Es una acción real y con impacto en el negocio (es un add-on de pago), así que sigue este flujo SIEMPRE, sin saltarte pasos:
   a) Primero ubica al alumno con buscar_alumno si aún no tienes su username confirmado en esta conversación.
   b) Si Jonah Beast te pide activar el reconocimiento inteligente pero NO ha dicho por cuánto tiempo (días, semanas o meses), NUNCA llames a activar_reconocimiento_foto todavía -- pregúntale primero cuántos días quiere activarlo (puedes sugerir duraciones típicas como 7, 15 o 30 días si te pide una referencia).
   c) Solo llama a activar_reconocimiento_foto una vez que Jonah Beast haya confirmado explícitamente la duración en la conversación (ya sea en su mensaje original o en su respuesta a tu pregunta). Si te da la duración en otra unidad, conviértela tú mismo a días antes de llamar la herramienta (1 semana = 7, 1 mes = 30).
   d) Después de prepararlo, dile con claridad a quién, por cuántos días y hasta qué fecha quedaría vigente (la herramienta te devuelve esa fecha), y que toque el botón "Confirmar" para aplicarlo. Nunca digas que ya quedó activado: todavía no lo está.
   No tienes ninguna otra herramienta de escritura por ahora -- si te piden otro tipo de cambio (crear alumno, cambiar plan, eliminar algo), dilo con honestidad y aclara que no puedes hacerlo todavía.`;

// El manual completo de la app (docs/manual-app.md, copiado en manual.ts):
// así Jarvis sabe cómo funciona cada pantalla, botón y mensaje para el
// alumno, y se mantiene al día con cada cambio de la app.
const MANUAL_JARVIS = `Manual de la app Jonah Beast Fuel (cómo la ve y la usa el alumno, pantalla por pantalla). Úsalo cuando Jonah Beast pregunte cómo funciona algo de la app, qué ve un alumno o qué responderle a un alumno con dudas. Las "Reglas para el asistente" de la sección 0 son para el asistente de WhatsApp de los alumnos, no para ti: tú sigues tus propias instrucciones. Si el manual y el estado del negocio no coinciden en un dato (por ejemplo precios), manda el estado del negocio.

${MANUAL_APP}`;

const TOOLS = [
  {
    name: "ver_pagos",
    description: "Devuelve el detalle de pagos (nombre o username, monto, método, estado y fecha). periodo: 'hoy' (hora de Lima), 'semana' (últimos 7 días) o 'pendientes' (todos los que esperan revisión, de cualquier fecha).",
    input_schema: {
      type: "object",
      properties: { periodo: { type: "string", enum: ["hoy", "semana", "pendientes"] } },
      required: ["periodo"],
    },
  },
  {
    name: "ver_alumnos_por_vencer",
    description: "Devuelve los alumnos activos cuya membresía vence en los próximos días (nombre, username, celular, plan y fecha de vencimiento).",
    input_schema: {
      type: "object",
      properties: { dias: { type: "number", description: "Cuántos días hacia adelante mirar (1 a 60). Si no lo dice, usa 7." } },
      required: [],
    },
  },
  {
    name: "ver_comisiones_pendientes",
    description: "Devuelve las comisiones de referido que aún no se pagan (alumno, monto y código de referido).",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "buscar_alumno",
    description: "Busca uno o más alumnos de Jonah Beast Fuel por nombre o username. Devuelve sus datos básicos (nombre, username, teléfono, plan, fecha de vencimiento, si tiene el add-on de reconocimiento por foto activo).",
    input_schema: {
      type: "object",
      properties: { query: { type: "string", description: "Nombre o username (o parte de él) a buscar" } },
      required: ["query"],
    },
  },
  {
    name: "activar_reconocimiento_foto",
    description: "Prepara la activación del add-on de Reconocimiento Inteligente (fotos) para un alumno específico, por una cantidad exacta de días. No cambia nada todavía: el panel muestra un botón Confirmar y solo se activa cuando Jonah Beast lo toca. SOLO se debe llamar después de que Jonah Beast haya confirmado explícitamente la duración en días -- nunca con un valor supuesto o inventado.",
    input_schema: {
      type: "object",
      properties: {
        username: { type: "string", description: "Username exacto del alumno (ya confirmado con buscar_alumno)" },
        dias: { type: "number", description: "Cantidad de días a activar, ya convertida a días si Jonah Beast la dio en otra unidad" },
      },
      required: ["username", "dias"],
    },
  },
];

// Fecha YYYY-MM-DD en hora de Lima.
function fechaLima(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(d);
}

// Supabase entrega como máximo 1000 filas por consulta; se pide en
// bloques hasta traer todo.
async function traerTodo(consulta: (desde: number, hasta: number) => any) {
  const filas: any[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await consulta(desde, desde + 999);
    if (error) throw error;
    filas.push(...(data || []));
    if (!data || data.length < 1000) return filas;
  }
}

// Mismo criterio que el panel admin: habilitado y sin vencer (o sin fecha).
function esActivo(a: any, hoy: string) {
  return !!a.enabled && !(a.fecha_vencimiento && a.fecha_vencimiento < hoy);
}

// Mismo cálculo que el panel (resumirEmbudo + cohorteRegistros en
// src/App.jsx): personas únicas por paso, y a los registrados se les
// sigue hasta la prueba y el pago con su cuenta de alumno.
function resumirEmbudo(eventos: any[], alumnoPorUsuario: Record<string, any>, hoy: string) {
  const pasos = () => ({ vistas: 0, visitantes: new Set<string>(), clics: new Set<string>(), registros: new Set<string>(), usuarios: new Set<string>() });
  const total = pasos();
  const porFuente: Record<string, ReturnType<typeof pasos>> = {};
  eventos.forEach((r) => {
    // Eventos anteriores al identificador de visitante: cada uno es una persona.
    const quien = r.visitante_id || "evento-" + r.id;
    const f = (porFuente[r.fuente] = porFuente[r.fuente] || pasos());
    [total, f].forEach((g) => {
      if (r.evento === "vista") { g.vistas++; g.visitantes.add(quien); }
      else if (r.evento === "clic_cta") g.clics.add(quien);
      else if (r.evento === "registro") { g.registros.add(quien); if (r.username) g.usuarios.add(r.username); }
    });
  });
  const cohorte = (usuarios: Set<string>) => {
    const c = { conCuenta: 0, enPrueba: 0, pagaron: 0, sinPagar: 0 };
    usuarios.forEach((u) => {
      const a = alumnoPorUsuario[u.toLowerCase()];
      if (!a) return;
      c.conCuenta++;
      if (a.plan === "pago") c.pagaron++;
      else if (esActivo(a, hoy)) c.enPrueba++;
      else c.sinPagar++;
    });
    return c;
  };
  const numeros = (g: ReturnType<typeof pasos>) => ({
    vistas: g.vistas, visitantes: g.visitantes.size, clics: g.clics.size, registros: g.registros.size,
    sinSeguimiento: g.registros.size - g.usuarios.size, ...cohorte(g.usuarios),
  });
  return {
    ...numeros(total),
    fuentes: Object.entries(porFuente).map(([k, g]) => [k, numeros(g)] as const)
      .sort((a, b) => b[1].visitantes - a[1].visitantes),
  };
}

const pct = (num: number, den: number) => (den ? Math.round((num / den) * 100) + "%" : "—");

function textoEmbudo(e: ReturnType<typeof resumirEmbudo>) {
  let t = `${e.visitantes} visitantes únicos -> ${e.clics} tocaron el botón (${pct(e.clics, e.visitantes)}) -> ${e.registros} se registraron (${pct(e.registros, e.clics)}) -> ${e.conCuenta} empezaron la prueba (${pct(e.conCuenta, e.registros)}) -> ${e.pagaron} pagaron (${pct(e.pagaron, e.conCuenta)})`;
  if (e.conCuenta) t += `; de los que empezaron, ${e.enPrueba} siguen en prueba y ${e.sinPagar} terminaron sin pagar`;
  const sinConfirmar = e.registros - e.conCuenta - e.sinSeguimiento;
  if (sinConfirmar > 0) t += `; ${sinConfirmar} aún no confirman su correo`;
  if (e.sinSeguimiento > 0) t += `; ${e.sinSeguimiento} registro(s) antiguos sin datos para seguirlos hasta el pago`;
  return t + ` (${e.vistas} vistas en total)`;
}

// Activa el add-on de fotos. Solo se llama cuando Jonah Beast toca el botón
// "Confirmar" en el panel (nunca directamente desde una herramienta).
async function activarFoto(supabase: any, usernameIn: unknown, diasIn: unknown) {
  const username = String(usernameIn || "").trim();
  const dias = Math.round(Number(diasIn));
  if (!username || !Number.isFinite(dias) || dias <= 0 || dias > 366) {
    return { error: "Faltan datos válidos (username y días entre 1 y 366) para activar el add-on." };
  }
  const hasta = fechaLima(new Date(Date.now() + dias * 86400000));
  const { data: actualizado, error } = await supabase
    .from("alumnos")
    .update({
      reconocimiento_foto_activo: true,
      reconocimiento_foto_desde: fechaLima(),
      reconocimiento_foto_hasta: hasta,
    })
    .eq("username", username)
    .select("nombre, username, reconocimiento_foto_hasta")
    .maybeSingle();
  if (error) return { error: "No se pudo activar el add-on: " + error.message };
  return actualizado
    ? { ok: true, ...actualizado, dias }
    : { error: `No se encontró ningún alumno con username "${username}".` };
}

// Lee la respuesta de Anthropic en modo streaming (eventos SSE), avisa cada
// pedazo de texto con `alTexto` y arma el mensaje completo igual que en el
// modo normal: bloques de texto, de razonamiento (con su firma, que hay que
// devolver tal cual) y de herramientas.
async function leerStream(r: Response, alTexto: (t: string) => void) {
  const bloques: any[] = [];
  const jsonParcial: Record<number, string> = {};
  const usage: Record<string, number> = {};
  let stop_reason: string | null = null;
  const lector = r.body!.pipeThrough(new TextDecoderStream()).getReader();
  let pendiente = "";
  for (;;) {
    const { value, done } = await lector.read();
    if (done) break;
    pendiente += value;
    let corte;
    while ((corte = pendiente.indexOf("\n")) >= 0) {
      const linea = pendiente.slice(0, corte).replace(/\r$/, "");
      pendiente = pendiente.slice(corte + 1);
      if (!linea.startsWith("data:")) continue;
      const ev = JSON.parse(linea.slice(5).trim());
      if (ev.type === "message_start") Object.assign(usage, ev.message?.usage || {});
      else if (ev.type === "content_block_start") {
        bloques[ev.index] = { ...ev.content_block };
        if (ev.content_block.type === "tool_use") jsonParcial[ev.index] = "";
      } else if (ev.type === "content_block_delta") {
        const b = bloques[ev.index], d = ev.delta;
        if (d.type === "text_delta") { b.text = (b.text || "") + d.text; alTexto(d.text); }
        else if (d.type === "thinking_delta") b.thinking = (b.thinking || "") + d.thinking;
        else if (d.type === "signature_delta") b.signature = d.signature;
        else if (d.type === "input_json_delta") jsonParcial[ev.index] += d.partial_json;
      } else if (ev.type === "content_block_stop") {
        if (ev.index in jsonParcial) {
          try { bloques[ev.index].input = jsonParcial[ev.index] ? JSON.parse(jsonParcial[ev.index]) : {}; }
          catch { bloques[ev.index].input = {}; }
        }
      } else if (ev.type === "message_delta") {
        stop_reason = ev.delta?.stop_reason ?? stop_reason;
        Object.assign(usage, ev.usage || {});
      } else if (ev.type === "error") {
        throw new Error("stream: " + (ev.error?.type || "error"));
      }
    }
  }
  return { content: bloques.filter(Boolean), stop_reason, usage };
}

// El panel manda los últimos turnos. Solo se aceptan textos de usuario y
// de Jarvis, se quita la pregunta actual si viene repetida al final, y la
// conversación siempre empieza con un mensaje del usuario (lo exige la API).
function limpiarHistorial(historial: unknown, pregunta: string) {
  const turnos = (Array.isArray(historial) ? historial : [])
    .filter((t: any) => (t?.role === "user" || t?.role === "assistant") && typeof t.content === "string" && t.content.trim())
    .map((t: any) => ({ role: t.role as "user" | "assistant", content: t.content as string }))
    .slice(-6);
  const ultimo = turnos[turnos.length - 1];
  if (ultimo && ultimo.role === "user" && ultimo.content.trim() === pregunta.trim()) turnos.pop();
  while (turnos.length && turnos[0].role !== "user") turnos.shift();
  return turnos;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Candado: solo el admin (profiles.role = 'admin') con sesión iniciada
    // puede usar a Jarvis. Sin esto, cualquiera con la URL podía leer datos
    // de alumnos y pagos, o activar el add-on de fotos.
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "No autorizado." }, 401);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) return json({ error: "No autorizado." }, 401);
    const { data: perfil } = await supabase
      .from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
    if (perfil?.role !== "admin") return json({ error: "No autorizado." }, 403);

    const { pregunta, historial, stream, confirmar } = await req.json();

    // Botón "Confirmar" del panel: aquí sí se aplica el cambio, sin pasar
    // por Claude (el candado de admin ya se revisó arriba).
    if (confirmar) {
      if (confirmar.tipo !== "activar_foto") return json({ error: "Acción desconocida." }, 400);
      const r: any = await activarFoto(supabase, confirmar.username, confirmar.dias);
      console.log(JSON.stringify({ evento: "jarvis_confirmacion", tipo: confirmar.tipo, username: confirmar.username, dias: confirmar.dias, ok: !!r.ok }));
      return json({
        respuesta: r.ok
          ? `Listo, Jonah Beast: activé el reconocimiento por foto a **${r.nombre || r.username}** por ${r.dias} días, vigente hasta el ${r.reconocimiento_foto_hasta}.`
          : r.error,
        ok: !!r.ok,
      });
    }

    if (!pregunta || typeof pregunta !== "string") {
      return json({ error: "Falta la pregunta." }, 400);
    }

    // --- snapshot en vivo del negocio, se recalcula en cada llamada ---
    // Todas las fechas en hora de Lima (UTC-5, sin horario de verano).
    const hoyISO = fechaLima();
    const en7dias = fechaLima(new Date(Date.now() + 7 * 86400000));
    const inicioHoyLima = hoyISO + "T05:00:00.000Z"; // medianoche en Lima expresada en UTC
    const hace7dias = new Date(Date.now() - 7 * 86400000).toISOString();
    const desdeEmbudo = hace7dias > INICIO_EMBUDO ? hace7dias : INICIO_EMBUDO;

    // Todas las consultas a la vez, en vez de una detrás de otra.
    const [alumnos, pagosSemana, { count: pagosPendientes }, { count: leadsCalculadora }, { data: config }, eventosSemana] = await Promise.all([
      traerTodo((d, h) => supabase.from("alumnos")
        .select("username, nombre, telefono, plan, enabled, fecha_vencimiento, created_at, codigo_referido, comision_monto, comision_pagada, reconocimiento_foto_activo, reconocimiento_foto_hasta")
        .order("created_at", { ascending: false }).range(d, h)),
      traerTodo((d, h) => supabase.from("pagos")
        .select("username, nombre, monto, plan_meses, metodo, estado, creado_en")
        .gte("creado_en", hace7dias).order("creado_en", { ascending: false }).range(d, h)),
      supabase.from("pagos").select("*", { count: "exact", head: true }).eq("estado", "pendiente"),
      supabase.from("leads").select("*", { count: "exact", head: true }),
      supabase.from("config").select("key, value").in("key", PLANES.map((p) => p.configKey)),
      traerTodo((d, h) => supabase.from("embudo_landing_eventos")
        .select("id, evento, fuente, visitante_id, username, creado_en")
        .gte("creado_en", desdeEmbudo).order("creado_en", { ascending: true }).range(d, h)),
    ]);

    // Alumnos: se traen una sola vez y se cuentan aquí, con el mismo
    // criterio que el panel (en prueba / pagando = solo los vigentes).
    const alumnoPorUsuario: Record<string, any> = {};
    let activos = 0, enPrueba = 0, pagando = 0, conTelefono = 0, conAddonFoto = 0, conReferido = 0;
    alumnos.forEach((a) => {
      alumnoPorUsuario[(a.username || "").toLowerCase()] = a;
      if (a.telefono) conTelefono++;
      if (a.codigo_referido) conReferido++;
      if (a.reconocimiento_foto_activo && a.reconocimiento_foto_hasta && a.reconocimiento_foto_hasta >= hoyISO) conAddonFoto++;
      if (!esActivo(a, hoyISO)) return;
      activos++;
      if (a.plan === "trial" || a.plan === "prueba") enPrueba++;
      else if (a.plan === "pago") pagando++;
    });
    const totalAlumnos = alumnos.length;
    const vencidos = totalAlumnos - activos;
    const recientes = alumnos.slice(0, 5);
    const proximosAVencer = alumnos
      .filter((a) => esActivo(a, hoyISO) && a.fecha_vencimiento && a.fecha_vencimiento <= en7dias)
      .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento));
    const comisionesPendientes = alumnos.filter((a) => a.comision_monto !== null && a.comision_monto !== undefined && a.comision_pagada === false);
    const totalComisionesPendientes = comisionesPendientes.reduce((s, c) => s + Number(c.comision_monto || 0), 0);

    const pagosHoy = pagosSemana.filter((p) => p.creado_en >= inicioHoyLima);
    const montoAprobado = (lista: any[]) => lista.filter((p) => p.estado === "aprobado").reduce((s, p) => s + Number(p.monto || 0), 0);

    // Precios: los guardados en la tabla config (los mismos que ve el
    // alumno en la app); si falta alguno, el precio de respaldo.
    const preciosGuardados: Record<string, number> = {};
    (config || []).forEach((c: any) => { const v = parseFloat(c.value); if (v > 0) preciosGuardados[c.key] = v; });
    const preciosTexto = PLANES
      .map((p) => `${p.meses} ${p.meses === 1 ? "mes" : "meses"} S/${(preciosGuardados[p.configKey] ?? p.precioDefault).toFixed(2)}`)
      .join(", ");

    const embudoSemana = resumirEmbudo(eventosSemana, alumnoPorUsuario, hoyISO);
    const embudoHoy = resumirEmbudo(eventosSemana.filter((e) => e.creado_en >= inicioHoyLima), alumnoPorUsuario, hoyISO);
    const fuentesTexto = embudoSemana.fuentes
      .map(([f, v]) => `${f}: ${v.visitantes} visitantes, ${v.clics} clics, ${v.registros} registros, ${v.pagaron} pagaron`)
      .join("; ") || "sin datos aún";

    const contexto = `Estado actual de Jonah Beast Fuel (datos en vivo de Supabase, ahora mismo). Hoy es ${hoyISO}; todas las fechas de "hoy" están en hora de Lima.
- Precios vigentes de los planes: ${preciosTexto}
- Alumnos totales: ${totalAlumnos}
- Alumnos con celular capturado: ${conTelefono}
- Membresías activas (habilitadas y sin vencer): ${activos} -- de ellas, ${enPrueba} en prueba gratis vigente y ${pagando} pagando
- Membresías vencidas o deshabilitadas: ${vencidos}
- Con add-on de reconocimiento por foto activo: ${conAddonFoto}
- Con código de referido asignado: ${conReferido}
- Últimos 5 registros: ${recientes.map((r) => r.username).join(", ") || "ninguno"}
- Pagos registrados hoy: ${pagosHoy.length} (monto aprobado hoy: S/${montoAprobado(pagosHoy).toFixed(2)}) -- detalle con ver_pagos
- Pagos registrados en los últimos 7 días: ${pagosSemana.length} (monto aprobado en la semana: S/${montoAprobado(pagosSemana).toFixed(2)}) -- detalle con ver_pagos
- Pagos pendientes de revisar (todos, no solo hoy): ${pagosPendientes ?? 0}
- Alumnos activos que vencen en los próximos 7 días: ${proximosAVencer.length} -- detalle con ver_alumnos_por_vencer
- Comisiones de referido pendientes de pagar: ${comisionesPendientes.length} alumnos, total S/${totalComisionesPendientes.toFixed(2)} -- detalle con ver_comisiones_pendientes
- Embudo de la landing HOY (personas únicas, sin las visitas de Jonah Beast ni de la versión de prueba): ${textoEmbudo(embudoHoy)}
- Embudo de la landing ÚLTIMOS 7 DÍAS: ${textoEmbudo(embudoSemana)}
- Por fuente de tráfico (últimos 7 días): ${fuentesTexto}
- Leads de la calculadora gratis (total histórico): ${leadsCalculadora ?? 0}
Nota: "pagaron" en el embudo solo cuenta a quienes se registraron desde la landing; "pagando" en membresías cuenta a todos los alumnos.`;

    const mensajes: any[] = [
      ...limpiarHistorial(historial, pregunta),
      { role: "user", content: pregunta },
    ];

    // La personalidad y el manual de la app van primero y marcados para
    // caché (son iguales en todas las llamadas); los datos en vivo van
    // después porque cambian siempre.
    const system = [
      { type: "text", text: JARVIS_PERSONA },
      { type: "text", text: MANUAL_JARVIS, cache_control: { type: "ephemeral" } },
      { type: "text", text: contexto },
    ];

    // Consumo de esta pregunta (se suma en cada llamada a Claude y se deja
    // en los registros de Supabase al final, para poder medir el costo y si
    // la parte reutilizable del prompt se está aprovechando).
    const inicio = Date.now();
    const uso = { llamadas: 0, reintentos: 0, input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };
    const sumarUso = (u: any) => {
      uso.llamadas++;
      for (const k of ["input_tokens", "output_tokens", "cache_creation_input_tokens", "cache_read_input_tokens"] as const) uso[k] += Number(u?.[k] || 0);
    };

    // max_tokens incluye lo que el modelo "piensa" antes de responder: con
    // 500 las respuestas largas podían cortarse. Esfuerzo bajo = piensa poco,
    // suficiente para estas consultas y más rápido.
    // Si Anthropic está saturado (429/5xx/529) o falla la conexión antes de
    // empezar a responder, se reintenta hasta 2 veces antes de rendirse.
    // Con `alTexto`, la respuesta llega por partes (streaming) y cada pedazo
    // de texto se reenvía al panel apenas llega.
    async function llamarClaude(msgs: any[], alTexto?: (t: string) => void) {
      const cuerpo = JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 1500,
        output_config: { effort: "low" },
        system, messages: msgs, tools: TOOLS,
        ...(alTexto ? { stream: true } : {}),
      });
      for (let intento = 0; ; intento++) {
        let r: Response | null = null;
        try {
          r = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-api-key": ANTHROPIC_API_KEY,
              "anthropic-version": "2023-06-01",
            },
            body: cuerpo,
          });
        } catch (e) {
          console.error("Sin conexión con Anthropic:", (e as Error)?.message);
        }
        if (r?.ok) {
          const data = alTexto ? await leerStream(r, alTexto) : await r.json();
          sumarUso(data.usage);
          return data;
        }
        const reintentable = !r || r.status === 429 || r.status >= 500;
        const errTxt = r ? await r.text() : "sin respuesta";
        console.error("Error de Anthropic:", r?.status ?? "red", errTxt);
        if (!reintentable || intento >= 2) throw new Error("upstream");
        uso.reintentos++;
        const espera = Math.min(Number(r?.headers.get("retry-after")) || 0, 5) * 1000 || 1000 * (intento + 1);
        await new Promise((res) => setTimeout(res, espera));
      }
    }

    // Acciones que esperan el botón "Confirmar" del panel.
    const acciones: any[] = [];

    async function ejecutarHerramienta(bloque: any): Promise<unknown> {
      if (bloque.name === "buscar_alumno") {
        // Se quitan los caracteres que tienen significado especial en el
        // filtro de búsqueda, para que el texto se busque tal cual.
        const q = String(bloque.input?.query || "").replace(/[,()%*\\]/g, " ").trim().slice(0, 60);
        if (!q) return [];
        const { data: resultados, error } = await supabase
          .from("alumnos")
          .select("nombre, username, telefono, plan, enabled, fecha_inicio, fecha_vencimiento, reconocimiento_foto_activo, reconocimiento_foto_hasta")
          .or(`nombre.ilike.%${q}%,username.ilike.%${q}%`)
          .limit(5);
        if (error) return { error: "No se pudo buscar: " + error.message };
        return resultados || [];
      }
      if (bloque.name === "activar_reconocimiento_foto") {
        // No se activa aquí: se valida y se deja pendiente del botón.
        const username = String(bloque.input?.username || "").trim();
        const dias = Math.round(Number(bloque.input?.dias));
        if (!username || !Number.isFinite(dias) || dias <= 0 || dias > 366) {
          return { error: "Faltan datos válidos (username y días entre 1 y 366) para preparar el add-on." };
        }
        const alumno = alumnoPorUsuario[username.toLowerCase()];
        if (!alumno) return { error: `No se encontró ningún alumno con username "${username}".` };
        const hasta = fechaLima(new Date(Date.now() + dias * 86400000));
        const accion = { tipo: "activar_foto", username: alumno.username, nombre: alumno.nombre || alumno.username, dias, hasta };
        const i = acciones.findIndex((x) => x.tipo === accion.tipo && x.username === accion.username);
        if (i >= 0) acciones[i] = accion; else acciones.push(accion);
        return { pendiente_confirmacion: true, ...accion, aviso: "Todavía NO está activado. En el panel aparece el botón Confirmar; se activa solo cuando Jonah Beast lo toque." };
      }
      if (bloque.name === "ver_pagos") {
        const detalle = (p: any) => ({ nombre: p.nombre || p.username, monto: p.monto, plan_meses: p.plan_meses, metodo: p.metodo, estado: p.estado, fecha: p.creado_en });
        const periodo = String(bloque.input?.periodo || "");
        if (periodo === "hoy") return pagosHoy.map(detalle);
        if (periodo === "semana") return pagosSemana.map(detalle);
        if (periodo === "pendientes") {
          const { data, error } = await supabase.from("pagos")
            .select("username, nombre, monto, plan_meses, metodo, estado, creado_en")
            .eq("estado", "pendiente").order("creado_en", { ascending: false }).limit(50);
          if (error) return { error: "No se pudo leer los pagos pendientes: " + error.message };
          return (data || []).map(detalle);
        }
        return { error: "periodo debe ser 'hoy', 'semana' o 'pendientes'." };
      }
      if (bloque.name === "ver_alumnos_por_vencer") {
        const dias = Math.min(Math.max(Math.round(Number(bloque.input?.dias) || 7), 1), 60);
        const hasta = fechaLima(new Date(Date.now() + dias * 86400000));
        return alumnos
          .filter((a) => esActivo(a, hoyISO) && a.fecha_vencimiento && a.fecha_vencimiento <= hasta)
          .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento))
          .map((a) => ({ nombre: a.nombre || a.username, username: a.username, telefono: a.telefono || "sin celular", plan: a.plan, vence: a.fecha_vencimiento }));
      }
      if (bloque.name === "ver_comisiones_pendientes") {
        return comisionesPendientes.map((c) => ({ nombre: c.nombre || c.username, username: c.username, monto: c.comision_monto, codigo_referido: c.codigo_referido || "sin código" }));
      }
      return { error: "Herramienta desconocida." };
    }

    // Conversación completa con Claude, incluido el bucle de herramientas:
    // permite encadenar varios pasos dentro de una misma pregunta -- hasta 4
    // vueltas como tope de seguridad. Si Claude pide varias herramientas a la
    // vez, se ejecutan todas y se devuelven juntas en un solo mensaje.
    // `avisar` (solo en modo streaming) manda al panel cada pedazo de texto
    // y un aviso de "reiniciar" cuando Jarvis va a consultar datos, para que
    // el panel borre el texto previo y muestre solo la respuesta final.
    async function conversar(avisar?: (ev: Record<string, unknown>) => void) {
      const alTexto = avisar ? (t: string) => avisar({ tipo: "texto", texto: t }) : undefined;
      let data = await llamarClaude(mensajes, alTexto);
      let vueltas = 0;
      while (data.stop_reason === "tool_use" && vueltas < 4) {
        vueltas++;
        const bloques = (data.content || []).filter((c: any) => c.type === "tool_use");
        if (!bloques.length) break;
        avisar?.({ tipo: "reiniciar" });
        const resultados = await Promise.all(bloques.map(async (b: any) => {
          let resultado: unknown;
          try { resultado = await ejecutarHerramienta(b); }
          catch (e) { resultado = { error: "Falló la herramienta: " + ((e as Error)?.message || "error") }; }
          const esError = !!resultado && typeof resultado === "object" && "error" in (resultado as object);
          return { type: "tool_result", tool_use_id: b.id, content: JSON.stringify(resultado), ...(esError ? { is_error: true } : {}) };
        }));
        mensajes.push({ role: "assistant", content: data.content }, { role: "user", content: resultados });
        data = await llamarClaude(mensajes, alTexto);
      }
      const textoFinal = (data.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text || "").join("").trim();
      const { texto, visual } = separarVisual(textoFinal);
      const respuesta = texto || "No alcancé a terminar esa consulta. ¿Me la puedes pedir de nuevo, un poco más concreta?";
      return { respuesta, acciones, ...(visual ? { visual } : {}) };
    }

    const registrarUso = (ok: boolean) => console.log(JSON.stringify({
      evento: "jarvis_uso", ok, streaming: !!stream, ms: Date.now() - inicio, ...uso,
    }));

    // Modo streaming: el panel recibe una línea JSON por evento
    // ({tipo:"texto"}, {tipo:"reiniciar"}, y al final {tipo:"fin"} o
    // {tipo:"error"}), así el texto aparece mientras se escribe.
    if (stream) {
      const codificar = new TextEncoder();
      const cuerpo = new ReadableStream({
        async start(ctrl) {
          const avisar = (ev: Record<string, unknown>) => ctrl.enqueue(codificar.encode(JSON.stringify(ev) + "\n"));
          try {
            const r = await conversar(avisar);
            avisar({ tipo: "fin", ...r });
            registrarUso(true);
          } catch (e) {
            console.error("Jarvis (streaming):", (e as Error)?.message);
            avisar({ tipo: "error", error: "No pude procesar eso ahora mismo." });
            registrarUso(false);
          }
          ctrl.close();
        },
      });
      return new Response(cuerpo, {
        headers: { ...CORS_HEADERS, "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-cache" },
      });
    }

    try {
      const r = await conversar();
      registrarUso(true);
      return json(r);
    } catch (e) {
      registrarUso(false);
      throw e;
    }
  } catch (e) {
    return json({ error: (e as Error)?.message || "Error inesperado." }, 500);
  }
});

// Separa el bloque <tarjetas>{...}</tarjetas> del texto de la respuesta y lo
// deja limpio y acotado para que el panel lo dibuje. Si viene mal formado, se
// descarta y queda solo el texto.
function separarVisual(textoFinal: string): { texto: string; visual: any } {
  const m = textoFinal.match(/<tarjetas>([\s\S]*?)<\/tarjetas>/);
  const texto = textoFinal.replace(/<tarjetas>[\s\S]*?(<\/tarjetas>|$)/g, "").trim();
  if (!m) return { texto, visual: null };
  try {
    const v = JSON.parse(m[1]);
    const corto = (x: unknown, n: number) => String(x ?? "").replace(/\s+/g, " ").trim().slice(0, n);
    const tarjetas = (Array.isArray(v?.tarjetas) ? v.tarjetas : []).slice(0, 4)
      .map((t: any) => ({ titulo: corto(t?.titulo, 40), valor: corto(t?.valor, 20), ...(t?.detalle ? { detalle: corto(t.detalle, 60) } : {}) }))
      .filter((t: any) => t.titulo && t.valor);
    const datos = (Array.isArray(v?.barras?.datos) ? v.barras.datos : []).slice(0, 12)
      .map((d: any) => ({ etiqueta: corto(d?.etiqueta, 12), valor: Number(d?.valor) }))
      .filter((d: any) => d.etiqueta && Number.isFinite(d.valor));
    const barras = datos.length >= 2 ? { titulo: corto(v.barras?.titulo, 50), datos } : null;
    if (!tarjetas.length && !barras) return { texto, visual: null };
    return { texto, visual: { tarjetas, ...(barras ? { barras } : {}) } };
  } catch {
    return { texto, visual: null };
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "content-type": "application/json" },
  });
}
