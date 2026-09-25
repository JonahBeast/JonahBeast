// Edge Function: alimentos-pedidos
// Pedidos de alimentos del panel de admin. Cuando un cliente pide un plato
// que no está en la app (por WhatsApp o porque la foto lo vio), queda en la
// tabla pedidos_alimentos. Desde el panel, Jonah:
//
//   "calcular" → {nombre, id?}: la IA calcula los macros por 100 g (y dice si
//                ya existe algo igual en la app). Con id, se guardan en el pedido.
//   "aprobar"  → {alimento, id?}: el alimento se agrega a alimentos_extra (la
//                app lo muestra al momento) y se avisa a quienes lo pidieron:
//                por WhatsApp (si escribieron en las últimas 24 h, la regla de
//                Meta) o con una notificación en la app. Sin id, solo agrega.
//
// verify_jwt = false porque el candado de admin está en el código (igual
// que jarvis-chat). Publicación (regla de CLAUDE.md): solo después del
// merge, con el código de main.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ALIMENTOS_APP, GRUPOS_APP } from "./alimentos.ts";

const MODELO = "claude-opus-5";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const AVISO_SECRETO = Deno.env.get("NUEVO_ALUMNO_SECRET") || "";
const GRAPH = "https://graph.facebook.com/v23.0";
const VENTANA_WHATSAPP_MS = 24 * 3600000; // Meta solo deja escribir libre 24 h después del último mensaje del cliente

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "content-type": "application/json" } });
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  (Deno.env.get("CLAVE_SERVICIO") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    // Candado: solo el admin con sesión iniciada.
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "No autorizado." }, 401);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) return json({ error: "No autorizado." }, 401);
    const { data: perfil } = await supabase.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
    if (perfil?.role !== "admin") return json({ error: "No autorizado." }, 403);

    const { accion, id, nombre, alimento } = await req.json();
    if (accion === "calcular") return json(await calcular(String(nombre || "").trim().slice(0, 80), id));
    if (accion === "aprobar") return json(await aprobar(alimento, id));
    return json({ error: "Acción desconocida." }, 400);
  } catch (e) {
    const mensaje = (e as Error)?.message || "Error inesperado.";
    console.error("alimentos-pedidos:", mensaje);
    return json({ error: mensaje }, e instanceof ErrorDeDatos ? 400 : 500);
  }
});

class ErrorDeDatos extends Error {}

// ---------------------------------------------------------------- calcular

const ESQUEMA_PROPUESTA = {
  type: "object",
  properties: {
    ya_existe: { type: "string", description: "Nombre EXACTO de un alimento de la lista que ya es lo mismo que lo pedido, o \"\" si no hay." },
    grupo: { type: "string", enum: GRUPOS_APP },
    nombre: { type: "string", description: "Nombre corto y claro, como los de la lista (ej. \"Plátano bellaco\", \"Tallarines rojos con carne molida\")." },
    estado: { type: "string", description: "Cómo se come: \"Cocido\", \"Crudo\", \"Frito\", \"Sancochado\"… o \"-\" si es un plato preparado, bebida o producto listo." },
    kcal: { type: "number" },
    proteina: { type: "number" },
    carbos: { type: "number" },
    grasa: { type: "number" },
    fibra: { type: "number" },
    unidad: { type: "string", description: "Medida casera natural (\"unidad\", \"plato\", \"taza\", \"rebanada\"…) o \"\" si no aplica." },
    gramos_unidad: { type: "number", description: "Gramos de esa medida casera, o 0 si no hay unidad." },
    nota: { type: "string", description: "Una línea para Jonah: de dónde salen los números o qué conviene revisar." },
  },
  required: ["ya_existe", "grupo", "nombre", "estado", "kcal", "proteina", "carbos", "grasa", "fibra", "unidad", "gramos_unidad", "nota"],
  additionalProperties: false,
};

async function calcular(nombre: string, id?: number) {
  if (!nombre) throw new ErrorDeDatos("Escribe el nombre del alimento.");
  const extras = await nombresExtra();
  const lista = [...ALIMENTOS_APP, ...extras].join("\n");

  const cuerpo = JSON.stringify({
    model: MODELO,
    max_tokens: 16000,
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: ESQUEMA_PROPUESTA },
    },
    fallbacks: "default",
    system: [{
      type: "text",
      cache_control: { type: "ephemeral" },
      text: `Eres nutricionista y armas la base de alimentos de Jonah Beast Fuel, una app peruana de nutrición. Te piden agregar un alimento o plato. Calcula sus macros POR CADA 100 g, tal como se come (cocido si se come cocido), con porciones y recetas típicas de Perú. Usa como referencia la Tabla Peruana de Composición de Alimentos (CENAN/INS) y, si no está, USDA o recetas caseras promedio.

Reglas:
- Números por 100 g, con un decimal como máximo. kcal ≈ 4·proteína + 4·carbos + 9·grasa (acepta un pequeño desvío por fibra o alcohol).
- Si en la lista de la app ya hay algo que es lo mismo (aunque tenga otro nombre o esté escrito distinto), pon su nombre exacto en "ya_existe". Si solo es parecido, deja "ya_existe" vacío.
- El nombre y el grupo deben seguir el estilo de la lista. Para platos preparados usa estado "-".
- En la medida casera piensa en cómo lo sirve la gente en Perú (ej. un plato de comida ≈ 400 g, una unidad de pan francés ≈ 55 g).

Alimentos que ya están en la app (nombre y estado):
${lista}`,
    }],
    messages: [{ role: "user", content: `Alimento pedido: ${nombre}` }],
  });

  const data = await llamarClaude(cuerpo);
  if (data.stop_reason === "refusal") throw new Error("La IA no pudo calcular este alimento. Llénalo a mano.");
  const texto = (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text || "").join("");
  let propuesta: any;
  try { propuesta = JSON.parse(texto); } catch { throw new Error("La IA respondió algo que no se pudo leer. Intenta de nuevo."); }
  for (const k of ["kcal", "proteina", "carbos", "grasa", "fibra", "gramos_unidad"]) propuesta[k] = Math.max(0, Math.round(Number(propuesta[k]) * 10) / 10 || 0);

  if (id) {
    await supabase.from("pedidos_alimentos").update({ propuesta, actualizado_en: new Date().toISOString() }).eq("id", id);
  }
  return { propuesta };
}

async function llamarClaude(cuerpo: string) {
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
    if (r?.ok) {
      const data = await r.json();
      console.log(JSON.stringify({ evento: "alimentos_pedidos_uso", modelo: data.model, stop: data.stop_reason, ...data.usage }));
      return data;
    }
    const reintentable = !r || r.status === 429 || r.status >= 500;
    console.error("Error de Anthropic:", r?.status ?? "red", r ? await r.text() : "");
    if (!reintentable || intento >= 2) throw new Error("La IA no respondió. Intenta de nuevo en un rato.");
    await new Promise((res) => setTimeout(res, 1000 * (intento + 1)));
  }
}

async function nombresExtra() {
  const { data } = await supabase.from("alimentos_extra").select("nombre, estado");
  return (data || []).map((a: any) => a.estado && a.estado !== "-" ? `${a.nombre} (${String(a.estado).toLowerCase()})` : a.nombre);
}

// ----------------------------------------------------------------- aprobar

function limpiarAlimento(a: any) {
  const texto = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  const num = (v: unknown, max: number, campo: string) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > max) throw new ErrorDeDatos(`Revisa ${campo}: debe ser un número entre 0 y ${max}.`);
    return Math.round(n * 10) / 10;
  };
  const nombre = texto(a?.nombre, 80);
  if (!nombre) throw new ErrorDeDatos("Falta el nombre del alimento.");
  const grupo = texto(a?.grupo, 40);
  if (!GRUPOS_APP.includes(grupo)) throw new ErrorDeDatos("Elige un grupo de la lista.");
  const estado = texto(a?.estado, 30) || "-";
  const unidad = texto(a?.unidad, 30);
  const gramosUnidad = unidad ? num(a?.gramos_unidad, 2000, "los gramos de la medida casera") : 0;
  if (unidad && !gramosUnidad) throw new ErrorDeDatos("Pon cuántos gramos pesa la medida casera, o déjala vacía.");
  return {
    nombre, grupo, estado,
    kcal: num(a?.kcal, 900, "las calorías (por 100 g)"),
    proteina: num(a?.proteina, 100, "la proteína"),
    carbos: num(a?.carbos, 100, "los carbohidratos"),
    grasa: num(a?.grasa, 100, "la grasa"),
    fibra: num(a?.fibra, 100, "la fibra"),
    unidad: unidad || null,
    gramos_unidad: unidad ? gramosUnidad : null,
  };
}

async function aprobar(entrada: any, id?: number) {
  const alimento = limpiarAlimento(entrada);
  const etiqueta = alimento.estado !== "-" ? `${alimento.nombre} (${alimento.estado.toLowerCase()})` : alimento.nombre;
  if (ALIMENTOS_APP.some((n) => n.toLowerCase() === etiqueta.toLowerCase())) {
    throw new ErrorDeDatos(`"${etiqueta}" ya está en la app. Si es otra cosa, cámbiale el nombre.`);
  }

  const { data: nuevo, error } = await supabase.from("alimentos_extra").insert(alimento).select("id").single();
  if (error) {
    if (error.code === "23505") throw new ErrorDeDatos(`"${etiqueta}" ya lo agregaste antes.`);
    throw new Error(error.message);
  }
  if (!id) return { ok: true, alimento_id: nuevo.id, avisos: null };

  const { data: pedido } = await supabase.from("pedidos_alimentos").select("*").eq("id", id).maybeSingle();
  const avisos = pedido ? await avisarSolicitantes(pedido.solicitantes || [], alimento.nombre) : null;
  await supabase.from("pedidos_alimentos").update({
    estado: "agregado", alimento_id: nuevo.id, avisos,
    resuelto_en: new Date().toISOString(), actualizado_en: new Date().toISOString(),
  }).eq("id", id);
  return { ok: true, alimento_id: nuevo.id, avisos };
}

// A cada persona que pidió el plato se le avisa una sola vez.
async function avisarSolicitantes(solicitantes: any[], nombre: string) {
  const telefonos = [...new Set(solicitantes.filter((s) => s?.origen === "whatsapp" && s.telefono).map((s) => String(s.telefono)))];
  const usernames = [...new Set(solicitantes.filter((s) => s?.origen !== "whatsapp" && s.username).map((s) => String(s.username)))];
  const avisos = { whatsapp: [] as string[], app: usernames, a_mano: [] as { telefono: string; nombre: string | null }[] };

  if (telefonos.length) {
    const { data: cuenta } = await supabase.from("whatsapp_cuenta").select("phone_number_id, token").eq("id", 1).maybeSingle();
    for (const telefono of telefonos) {
      const nombreCliente = solicitantes.find((s) => String(s.telefono) === telefono)?.nombre || null;
      const enviado = cuenta?.token ? await avisarPorWhatsApp(cuenta, telefono, nombre).catch((e) => {
        console.error("No se pudo avisar por WhatsApp:", (e as Error)?.message);
        return false;
      }) : false;
      if (enviado) avisos.whatsapp.push(telefono); else avisos.a_mano.push({ telefono, nombre: nombreCliente });
    }
  }

  if (usernames.length) {
    await enviarPush({ usernames, body: `✅ ¡Listo! ${nombre} ya está en la app. Búscalo en "REGISTRAR" → "Escribir" 🙌` });
  }
  return avisos;
}

async function avisarPorWhatsApp(cuenta: any, telefono: string, nombre: string) {
  // Meta solo deja escribir sin plantilla dentro de las 24 h desde el último mensaje del cliente.
  const { data: ultimo } = await supabase.from("whatsapp_mensajes").select("creado_en")
    .eq("telefono", telefono).eq("direccion", "entrante").order("creado_en", { ascending: false }).limit(1).maybeSingle();
  if (!ultimo || Date.now() - new Date(ultimo.creado_en).getTime() > VENTANA_WHATSAPP_MS - 5 * 60000) return false;

  const texto = `✅ ¡Listo! *${nombre}* ya está en la app 🙌\nCierra y vuelve a abrir la app, y búscalo en "REGISTRAR" → "Escribir".\n¿Me avisas si todo está conforme?`;
  const r = await fetch(`${GRAPH}/${cuenta.phone_number_id}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cuenta.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: telefono, type: "text", text: { body: texto, preview_url: false } }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Graph ${r.status}: ${JSON.stringify(data?.error || data).slice(0, 300)}`);
  await supabase.from("whatsapp_mensajes").insert({
    telefono, wa_id: data?.messages?.[0]?.id || null, direccion: "asistente", tipo: "texto", texto,
  });
  return true;
}

async function enviarPush(datos: { usernames?: string[]; admin?: boolean; body: string }) {
  if (!AVISO_SECRETO) return;
  try {
    await fetch("https://jonahbeast.com/api/aviso-push", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-webhook-secret": AVISO_SECRETO },
      body: JSON.stringify(datos),
    });
  } catch (e) {
    console.error("No se pudo mandar el aviso push:", (e as Error)?.message);
  }
}
