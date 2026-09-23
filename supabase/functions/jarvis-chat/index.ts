// Edge Function: jarvis-chat
// Asistente conversacional para el panel de administrador de Jonah Beast Fuel.
// Consulta datos reales de Supabase en cada llamada (nunca datos fijos) y
// le pasa ese contexto a Claude junto con la pregunta del admin.
// Mismo patrón que reconocer-comida: misma API key, mismo proveedor.
//
// Versión 17 (la que está publicada en Supabase). Se despliega con
// verify_jwt = false porque el control de acceso lo hace el propio código
// (ver "Candado" más abajo): solo responde al admin con sesión iniciada.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JARVIS_PERSONA = `Eres Jarvis, el asistente del panel de administrador de Jonah Beast Fuel, la app de nutrición peruana de Jonah Beast. Responde en español, tono servicial, directo y ligeramente formal, sin inventar datos que no tengas -- si algo no está en el contexto que te paso, dilo con honestidad en vez de adivinar. Sé breve (2-4 frases salvo que te pidan más detalle). No das consejos legales ni financieros formales, solo apoyas con lo operativo del negocio. Importante: escribe siempre tu propio nombre como "Jarvis", nunca como "J.A.R.V.I.S." ni con puntos entre letras -- estas respuestas se leen en voz alta automáticamente por el navegador (con una voz sintetizada) apenas las escribes -- si Jonah Beast te pregunta si puedes hablar o por qué no te escucha, confirma que sí hablas por defecto y sugiérele revisar el botón 🔊 arriba del panel (debe decir ON) -- nunca digas que solo escribes texto o que no puedes hablar, porque no es cierto. Esa forma con puntos entre letras se pronuncia letra por letra, por eso se evita. Refiérete a la persona con la que hablas como "Jonah Beast, fundador de Jonah Beast Fuel" (o simplemente "Jonah Beast" en el resto de la conversación, sin repetir "fundador" en cada frase) -- nunca uses su nombre legal (Martin Huamani) salvo que él mismo lo use primero. Jonah Beast también tiene su propia cuenta de alumno dentro de la app, con username "martin" (aparece como "JonahBeast" en el campo nombre) -- cuando te pida buscarlo a él mismo ("búscame", "mis datos", "mi cuenta", "a mí mismo"), usa buscar_alumno con la query "martin" directamente, sin pedirle que aclare cuál es su username.

Conocimiento fijo del negocio (esto no cambia entre llamadas, es el modelo de Jonah Beast Fuel):
- Eslogan: "La alimentación que impulsa tu objetivo". Web: jonahbeast.com
- Modelo: suscripción con prueba gratis de 15 días. Planes: 1 mes S/24.90, 3 meses S/64.90, 6 meses S/114.90, 12 meses S/209.90
- Add-on de reconocimiento de comida por foto: S/11.90/mes adicional sobre cualquier plan, con 5 fotos gratis por semana para probarlo. El alumno sigue eligiendo la porción, la IA solo identifica el plato
- Pagos: manual por Yape/Plin con comprobante, o automático vía Mercado Pago (pago único o suscripción recurrente)
- Programa de referidos/embajadores: cada alumno tiene un código de referido con comisión variable según el plan que compre el referido
- Registro: pide nombre y celular obligatorios en el onboarding (el celular es prioridad, para que Jonah pueda acompañar al alumno por WhatsApp)
- Soporte de WhatsApp: hoy es 100% manual (enlaces wa.me), no hay API oficial de WhatsApp Business integrada todavía
- Categoría en Play Store: Salud y deportes. Publicada como TWA/PWA, package_name com.jonahbeast.twa

Tienes dos herramientas:

1) buscar_alumno (solo lectura) -- busca alumnos por nombre o username. Úsala SIEMPRE que Jonah Beast mencione cualquier nombre de persona, por corto o incompleto que parezca (ej. "Yara", "Bru", "el chico nuevo") -- la búsqueda es parcial y encuentra coincidencias aunque solo escriba una parte del nombre, así que nunca asumas que no vas a encontrar a alguien solo porque el nombre es corto. Si la búsqueda no devuelve resultados, ahí sí dilo con honestidad -- pero intenta primero, no lo des por hecho.

2) activar_reconocimiento_foto -- SÍ modifica datos: activa el add-on de Reconocimiento Inteligente (fotos) para un alumno por una cantidad de días. Esta es una acción real y con impacto en el negocio (es un add-on de pago), así que sigue este flujo SIEMPRE, sin saltarte pasos:
   a) Primero ubica al alumno con buscar_alumno si aún no tienes su username confirmado en esta conversación.
   b) Si Jonah Beast te pide activar el reconocimiento inteligente pero NO ha dicho por cuánto tiempo (días, semanas o meses), NUNCA llames a activar_reconocimiento_foto todavía -- pregúntale primero cuántos días quiere activarlo (puedes sugerir duraciones típicas como 7, 15 o 30 días si te pide una referencia).
   c) Solo llama a activar_reconocimiento_foto una vez que Jonah Beast haya confirmado explícitamente la duración en la conversación (ya sea en su mensaje original o en su respuesta a tu pregunta). Si te da la duración en otra unidad, conviértela tú mismo a días antes de llamar la herramienta (1 semana = 7, 1 mes = 30).
   d) Después de activarlo, confírmale con claridad a quién se lo activaste, por cuántos días, y hasta qué fecha queda vigente (la herramienta te devuelve esa fecha).
   No tienes ninguna otra herramienta de escritura por ahora -- si te piden otro tipo de cambio (crear alumno, cambiar plan, eliminar algo), dilo con honestidad y aclara que no puedes hacerlo todavía.`;

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

    const hoyISO = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());

    // --- snapshot en vivo del negocio, se recalcula en cada llamada ---
    const { count: totalAlumnos } = await supabase
      .from("alumnos").select("*", { count: "exact", head: true });
    const { count: conTelefono } = await supabase
      .from("alumnos").select("*", { count: "exact", head: true }).not("telefono", "is", null);
    const { count: activos } = await supabase
      .from("alumnos").select("*", { count: "exact", head: true }).gte("fecha_vencimiento", hoyISO);
    const { count: enPrueba } = await supabase
      .from("alumnos").select("*", { count: "exact", head: true }).eq("plan", "trial");
    const { count: conAddonFoto } = await supabase
      .from("alumnos").select("*", { count: "exact", head: true })
      .eq("reconocimiento_foto_activo", true).gte("reconocimiento_foto_hasta", hoyISO);
    const { count: conReferido } = await supabase
      .from("alumnos").select("*", { count: "exact", head: true }).not("codigo_referido", "is", null);
    const { data: recientes } = await supabase
      .from("alumnos").select("username, created_at")
      .order("created_at", { ascending: false }).limit(5);

    const hoyInicio = hoyISO + "T05:00:00.000Z"; // medianoche en Lima (UTC-5) expresada en UTC
    const { data: pagosHoy } = await supabase
      .from("pagos").select("username, nombre, monto, plan_meses, metodo, estado, creado_en")
      .gte("creado_en", hoyInicio).order("creado_en", { ascending: false });
    const hace7dias = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: pagosSemana } = await supabase
      .from("pagos").select("username, nombre, monto, plan_meses, metodo, estado, creado_en")
      .gte("creado_en", hace7dias).order("creado_en", { ascending: false });
    const { count: pagosPendientes } = await supabase
      .from("pagos").select("*", { count: "exact", head: true }).eq("estado", "pendiente");
    const montoHoy = (pagosHoy || []).filter(p => p.estado === "aprobado").reduce((s, p) => s + Number(p.monto || 0), 0);
    const montoSemana = (pagosSemana || []).filter(p => p.estado === "aprobado").reduce((s, p) => s + Number(p.monto || 0), 0);

    const en7dias = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date(Date.now() + 7 * 86400000));
    const { data: proximosAVencer } = await supabase
      .from("alumnos").select("nombre, username, telefono, fecha_vencimiento")
      .gte("fecha_vencimiento", hoyISO).lte("fecha_vencimiento", en7dias)
      .order("fecha_vencimiento", { ascending: true });

    const { data: comisionesPendientes } = await supabase
      .from("alumnos").select("nombre, username, comision_monto, codigo_referido")
      .not("comision_monto", "is", null).eq("comision_pagada", false);
    const totalComisionesPendientes = (comisionesPendientes || []).reduce((s, c) => s + Number(c.comision_monto || 0), 0);

    // Embudo de la landing (vistas -> clic -> registro), anclado a hoy
    // igual que en el panel admin, para no mezclar con historial viejo.
    const inicioTrackingEmbudo = hoyISO + "T00:00:00.000Z";
    const { count: vistasLanding } = await supabase
      .from("embudo_landing_eventos").select("*", { count: "exact", head: true })
      .eq("evento", "vista").gte("creado_en", inicioTrackingEmbudo);
    const { count: clicsLanding } = await supabase
      .from("embudo_landing_eventos").select("*", { count: "exact", head: true })
      .eq("evento", "clic_cta").gte("creado_en", inicioTrackingEmbudo);

    // Embudo de leads/CRM: gente que se midió pero no se ha registrado,
    // más las etapas ya vistas arriba (prueba/activos/vencidos).
    const { count: leadsSinRegistrar } = await supabase
      .from("leads").select("*", { count: "exact", head: true });

    const { count: registrosHoyLanding } = await supabase
      .from("alumnos").select("*", { count: "exact", head: true }).gte("created_at", inicioTrackingEmbudo);

    const { data: eventosPorFuente } = await supabase
      .from("embudo_landing_eventos").select("fuente, evento").gte("creado_en", inicioTrackingEmbudo);
    const resumenFuentes: Record<string, { vistas: number; clics: number }> = {};
    (eventosPorFuente || []).forEach((r: any) => {
      resumenFuentes[r.fuente] = resumenFuentes[r.fuente] || { vistas: 0, clics: 0 };
      if (r.evento === "vista") resumenFuentes[r.fuente].vistas++; else resumenFuentes[r.fuente].clics++;
    });
    const fuentesTexto = Object.entries(resumenFuentes)
      .map(([f, v]) => `${f}: ${v.vistas} vistas/${v.clics} clics`).join(", ") || "sin datos aún";

    const vencidos = (totalAlumnos ?? 0) - (activos ?? 0);
    const contexto = `Estado actual de Jonah Beast Fuel (datos en vivo de Supabase, ahora mismo):
- Alumnos totales: ${totalAlumnos ?? "desconocido"}
- Alumnos con celular capturado: ${conTelefono ?? "desconocido"}
- Membresías activas (no vencidas): ${activos ?? "desconocido"}
- Membresías vencidas: ${vencidos}
- En prueba gratis (plan trial): ${enPrueba ?? "desconocido"}
- Con add-on de reconocimiento por foto activo: ${conAddonFoto ?? "desconocido"}
- Con código de referido asignado: ${conReferido ?? "desconocido"}
- Últimos 5 registros: ${(recientes || []).map(r => r.username).join(", ") || "ninguno"}
- Pagos registrados hoy (según fecha de Perú): ${(pagosHoy || []).length} (monto aprobado hoy: S/${montoHoy.toFixed(2)})${(pagosHoy || []).length ? " -- detalle: " + (pagosHoy || []).map(p => `${p.nombre || p.username} (S/${p.monto}, ${p.metodo}, ${p.estado})`).join("; ") : ""}
- Pagos registrados en los últimos 7 días: ${(pagosSemana || []).length} (monto aprobado en la semana: S/${montoSemana.toFixed(2)})${(pagosSemana || []).length ? " -- detalle: " + (pagosSemana || []).map(p => `${p.nombre || p.username} (S/${p.monto}, ${p.metodo}, ${p.estado}, ${p.creado_en})`).join("; ") : ""}
- Pagos pendientes de revisar (todos, no solo hoy): ${pagosPendientes ?? 0}
- Alumnos que vencen en los próximos 7 días: ${(proximosAVencer || []).length}${(proximosAVencer || []).length ? " -- detalle: " + (proximosAVencer || []).map(a => `${a.nombre || a.username} (vence ${a.fecha_vencimiento}, tel: ${a.telefono || "sin celular"})`).join("; ") : ""}
- Comisiones de referido pendientes de pagar: ${(comisionesPendientes || []).length} alumnos, total S/${totalComisionesPendientes.toFixed(2)}${(comisionesPendientes || []).length ? " -- detalle: " + (comisionesPendientes || []).map(c => `${c.nombre || c.username} (S/${c.comision_monto}, código ${c.codigo_referido || "sin código"})`).join("; ") : ""}
- Embudo de la landing (contado desde hoy): ${vistasLanding ?? 0} vistas -> ${clicsLanding ?? 0} clics en el botón -> ${registrosHoyLanding ?? 0} registros completados hoy
- Desglose por fuente de tráfico (hoy): ${fuentesTexto}
- Embudo de leads/CRM: ${leadsSinRegistrar ?? 0} personas se midieron pero no se han registrado como alumnos -> ${enPrueba ?? 0} en prueba gratis -> ${activos ?? 0} activos/pagando -> ${vencidos} vencidos

Nota: no tengo acceso en vivo a TikTok Ads -- si te preguntan por eso, dilo con honestidad. El usuario está en Perú, todas las fechas de "hoy" ya están calculadas en hora de Lima. Hoy es ${hoyISO}.`;

    const turnosPrevios = Array.isArray(historial) ? historial.slice(-6) : [];
    let mensajes: any[] = [
      { role: "user", content: JARVIS_PERSONA + "\n\n" + contexto },
      { role: "assistant", content: "Entendido. Estoy listo para ayudar con el estado actual de Jonah Beast Fuel." },
      ...turnosPrevios,
      { role: "user", content: pregunta },
    ];

    const tools = [
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

    async function llamarClaude(msgs: any[]) {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 500, messages: msgs, tools }),
      });
      if (!r.ok) {
        const errTxt = await r.text();
        console.error("Error de Anthropic:", r.status, errTxt);
        throw new Error("upstream");
      }
      return r.json();
    }

    let data = await llamarClaude(mensajes);

    // Bucle de herramientas: permite encadenar varios pasos dentro de una
    // misma pregunta (ej. buscar al alumno y luego, si ya se dio la
    // duración, activar el add-on) -- hasta 4 vueltas como tope de
    // seguridad para nunca quedar en un ciclo infinito.
    let vueltas = 0;
    while (data.stop_reason === "tool_use" && vueltas < 4) {
      vueltas++;
      const bloqueHerramienta = (data.content || []).find((c: any) => c.type === "tool_use");
      if (!bloqueHerramienta) break;

      let resultadoHerramienta: unknown = null;

      if (bloqueHerramienta.name === "buscar_alumno") {
        const q = String(bloqueHerramienta.input?.query || "").trim();
        const { data: resultados } = await supabase
          .from("alumnos")
          .select("nombre, username, telefono, plan, fecha_inicio, fecha_vencimiento, reconocimiento_foto_activo, reconocimiento_foto_hasta")
          .or(`nombre.ilike.%${q}%,username.ilike.%${q}%`)
          .limit(5);
        resultadoHerramienta = resultados || [];
      } else if (bloqueHerramienta.name === "activar_reconocimiento_foto") {
        const username = String(bloqueHerramienta.input?.username || "").trim();
        const dias = Number(bloqueHerramienta.input?.dias);
        if (!username || !Number.isFinite(dias) || dias <= 0) {
          resultadoHerramienta = { error: "Faltan datos válidos (username y días) para activar el add-on." };
        } else {
          const hasta = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" })
            .format(new Date(Date.now() + dias * 86400000));
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
          resultadoHerramienta = error
            ? { error: "No se pudo activar el add-on: " + error.message }
            : (actualizado
                ? { ok: true, ...actualizado, dias_activados: dias }
                : { error: `No se encontró ningún alumno con username "${username}".` });
        }
      } else {
        resultadoHerramienta = { error: "Herramienta desconocida." };
      }

      mensajes = [
        ...mensajes,
        { role: "assistant", content: data.content },
        {
          role: "user",
          content: [{
            type: "tool_result",
            tool_use_id: bloqueHerramienta.id,
            content: JSON.stringify(resultadoHerramienta),
          }],
        },
      ];
      data = await llamarClaude(mensajes);
    }

    const respuesta = (data.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text || "").join("");

    return json({ respuesta });
  } catch (e) {
    return json({ error: e?.message || "Error inesperado." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "content-type": "application/json" },
  });
}
