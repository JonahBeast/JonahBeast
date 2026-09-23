// Edge Function: jarvis-chat
// Asistente conversacional para el panel de administrador de Jonah Beast Fuel.
// Consulta datos reales de Supabase en cada llamada (nunca datos fijos) y
// le pasa ese contexto a Claude junto con la pregunta del admin.
// Mismo patrón que reconocer-comida: misma API key, mismo proveedor.
//
// Se despliega con verify_jwt = false porque el control de acceso lo hace
// el propio código (ver "Candado" más abajo): solo responde al admin con
// sesión iniciada. Se publica en Supabase después de cada merge, con el
// código que quedó en main (ver CLAUDE.md).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

Conocimiento fijo del negocio (esto no cambia entre llamadas, es el modelo de Jonah Beast Fuel):
- Eslogan: "La alimentación que impulsa tu objetivo". Web: jonahbeast.com
- Modelo: suscripción con prueba gratis de 15 días. Planes de 1, 3, 6 y 12 meses (los precios vigentes están en el estado del negocio)
- Add-on de reconocimiento de comida por foto: S/11.90/mes adicional sobre cualquier plan, con 5 fotos gratis por semana para probarlo. El alumno sigue eligiendo la porción, la IA solo identifica el plato
- Pagos: manual por Yape/Plin con comprobante, o automático vía Mercado Pago (pago único o suscripción recurrente)
- Programa de referidos/embajadores: cada alumno tiene un código de referido con comisión variable según el plan que compre el referido
- Registro: pide nombre y celular obligatorios en el onboarding (el celular es prioridad, para que Jonah pueda acompañar al alumno por WhatsApp)
- Soporte de WhatsApp: hoy es 100% manual (enlaces wa.me), no hay API oficial de WhatsApp Business integrada todavía
- Categoría en Play Store: Salud y deportes. Publicada como TWA/PWA, package_name com.jonahbeast.twa
- Sin acceso en vivo a TikTok Ads: si te preguntan por eso, dilo con honestidad

Tienes dos herramientas (puedes pedir varias a la vez si hace falta, por ejemplo buscar a dos alumnos):

1) buscar_alumno (solo lectura) -- busca alumnos por nombre o username. Úsala SIEMPRE que Jonah Beast mencione cualquier nombre de persona, por corto o incompleto que parezca (ej. "Yara", "Bru", "el chico nuevo") -- la búsqueda es parcial y encuentra coincidencias aunque solo escriba una parte del nombre, así que nunca asumas que no vas a encontrar a alguien solo porque el nombre es corto. Si la búsqueda no devuelve resultados, ahí sí dilo con honestidad -- pero intenta primero, no lo des por hecho.

2) activar_reconocimiento_foto -- SÍ modifica datos: activa el add-on de Reconocimiento Inteligente (fotos) para un alumno por una cantidad de días. Esta es una acción real y con impacto en el negocio (es un add-on de pago), así que sigue este flujo SIEMPRE, sin saltarte pasos:
   a) Primero ubica al alumno con buscar_alumno si aún no tienes su username confirmado en esta conversación.
   b) Si Jonah Beast te pide activar el reconocimiento inteligente pero NO ha dicho por cuánto tiempo (días, semanas o meses), NUNCA llames a activar_reconocimiento_foto todavía -- pregúntale primero cuántos días quiere activarlo (puedes sugerir duraciones típicas como 7, 15 o 30 días si te pide una referencia).
   c) Solo llama a activar_reconocimiento_foto una vez que Jonah Beast haya confirmado explícitamente la duración en la conversación (ya sea en su mensaje original o en su respuesta a tu pregunta). Si te da la duración en otra unidad, conviértela tú mismo a días antes de llamar la herramienta (1 semana = 7, 1 mes = 30).
   d) Después de activarlo, confírmale con claridad a quién se lo activaste, por cuántos días, y hasta qué fecha queda vigente (la herramienta te devuelve esa fecha).
   No tienes ninguna otra herramienta de escritura por ahora -- si te piden otro tipo de cambio (crear alumno, cambiar plan, eliminar algo), dilo con honestidad y aclara que no puedes hacerlo todavía.`;

const TOOLS = [
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
    description: "Activa el add-on de Reconocimiento Inteligente (fotos) para un alumno específico, por una cantidad exacta de días. SOLO se debe llamar después de que Jonah Beast haya confirmado explícitamente la duración en días -- nunca con un valor supuesto o inventado.",
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

    const { pregunta, historial } = await req.json();
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
- Pagos registrados hoy: ${pagosHoy.length} (monto aprobado hoy: S/${montoAprobado(pagosHoy).toFixed(2)})${pagosHoy.length ? " -- detalle: " + pagosHoy.map((p) => `${p.nombre || p.username} (S/${p.monto}, ${p.metodo}, ${p.estado})`).join("; ") : ""}
- Pagos registrados en los últimos 7 días: ${pagosSemana.length} (monto aprobado en la semana: S/${montoAprobado(pagosSemana).toFixed(2)})${pagosSemana.length ? " -- detalle: " + pagosSemana.map((p) => `${p.nombre || p.username} (S/${p.monto}, ${p.metodo}, ${p.estado}, ${p.creado_en})`).join("; ") : ""}
- Pagos pendientes de revisar (todos, no solo hoy): ${pagosPendientes ?? 0}
- Alumnos activos que vencen en los próximos 7 días: ${proximosAVencer.length}${proximosAVencer.length ? " -- detalle: " + proximosAVencer.map((a) => `${a.nombre || a.username} (vence ${a.fecha_vencimiento}, tel: ${a.telefono || "sin celular"})`).join("; ") : ""}
- Comisiones de referido pendientes de pagar: ${comisionesPendientes.length} alumnos, total S/${totalComisionesPendientes.toFixed(2)}${comisionesPendientes.length ? " -- detalle: " + comisionesPendientes.map((c) => `${c.nombre || c.username} (S/${c.comision_monto}, código ${c.codigo_referido || "sin código"})`).join("; ") : ""}
- Embudo de la landing HOY (personas únicas, sin las visitas de Jonah Beast ni de la versión de prueba): ${textoEmbudo(embudoHoy)}
- Embudo de la landing ÚLTIMOS 7 DÍAS: ${textoEmbudo(embudoSemana)}
- Por fuente de tráfico (últimos 7 días): ${fuentesTexto}
- Leads de la calculadora gratis (total histórico): ${leadsCalculadora ?? 0}
Nota: "pagaron" en el embudo solo cuenta a quienes se registraron desde la landing; "pagando" en membresías cuenta a todos los alumnos.`;

    const mensajes: any[] = [
      ...limpiarHistorial(historial, pregunta),
      { role: "user", content: pregunta },
    ];

    // La personalidad va primero y marcada para caché (es igual en todas
    // las llamadas); los datos en vivo van después porque cambian siempre.
    const system = [
      { type: "text", text: JARVIS_PERSONA, cache_control: { type: "ephemeral" } },
      { type: "text", text: contexto },
    ];

    async function llamarClaude(msgs: any[]) {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 500, system, messages: msgs, tools: TOOLS }),
      });
      if (!r.ok) {
        const errTxt = await r.text();
        console.error("Error de Anthropic:", r.status, errTxt);
        throw new Error("upstream");
      }
      return r.json();
    }

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
        const username = String(bloque.input?.username || "").trim();
        const dias = Math.round(Number(bloque.input?.dias));
        if (!username || !Number.isFinite(dias) || dias <= 0 || dias > 366) {
          return { error: "Faltan datos válidos (username y días entre 1 y 366) para activar el add-on." };
        }
        const hasta = fechaLima(new Date(Date.now() + dias * 86400000));
        const { data: actualizado, error } = await supabase
          .from("alumnos")
          .update({
            reconocimiento_foto_activo: true,
            reconocimiento_foto_desde: hoyISO,
            reconocimiento_foto_hasta: hasta,
          })
          .eq("username", username)
          .select("nombre, username, reconocimiento_foto_hasta")
          .maybeSingle();
        if (error) return { error: "No se pudo activar el add-on: " + error.message };
        return actualizado
          ? { ok: true, ...actualizado, dias_activados: dias }
          : { error: `No se encontró ningún alumno con username "${username}".` };
      }
      return { error: "Herramienta desconocida." };
    }

    let data = await llamarClaude(mensajes);

    // Bucle de herramientas: permite encadenar varios pasos dentro de una
    // misma pregunta (ej. buscar al alumno y luego, si ya se dio la
    // duración, activar el add-on) -- hasta 4 vueltas como tope de
    // seguridad. Si Claude pide varias herramientas a la vez, se ejecutan
    // todas y se devuelven todas las respuestas juntas en un solo mensaje.
    let vueltas = 0;
    while (data.stop_reason === "tool_use" && vueltas < 4) {
      vueltas++;
      const bloques = (data.content || []).filter((c: any) => c.type === "tool_use");
      if (!bloques.length) break;
      const resultados = await Promise.all(bloques.map(async (b: any) => {
        let resultado: unknown;
        try { resultado = await ejecutarHerramienta(b); }
        catch (e) { resultado = { error: "Falló la herramienta: " + ((e as Error)?.message || "error") }; }
        const esError = !!resultado && typeof resultado === "object" && "error" in (resultado as object);
        return { type: "tool_result", tool_use_id: b.id, content: JSON.stringify(resultado), ...(esError ? { is_error: true } : {}) };
      }));
      mensajes.push({ role: "assistant", content: data.content }, { role: "user", content: resultados });
      data = await llamarClaude(mensajes);
    }

    const respuesta = (data.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text || "").join("").trim()
      || "No alcancé a terminar esa consulta. ¿Me la puedes pedir de nuevo, un poco más concreta?";

    return json({ respuesta });
  } catch (e) {
    return json({ error: (e as Error)?.message || "Error inesperado." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "content-type": "application/json" },
  });
}
