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
//   "descartar" → {id, respuesta}: el pedido queda descartado con el mensaje
//                de Jonah (ej. "Ya estaba en la app como …") y se le avisa a
//                quien lo pidió por las mismas vías.
//
//   "revisar_propio" → {id}: la IA revisa un alimento que acaba de crear o
//                corregir un alumno ("+ Crear mi alimento"). La llama la app
//                del alumno al guardarlo (solo para sus propios alimentos).
//                Si la IA está SEGURA: lo da por bueno, corrige sus números o
//                lo cambia por el mismo alimento de la app. Si no está segura,
//                queda "dudoso" y le llega a Jonah (panel + aviso al celular).
//                Lo que hizo queda en revision_ia (con los números del alumno).
//   "atender_pedido" → {nombre}: la IA atiende el pedido que acaba de hacer
//                un alumno con "🙋 Pedirle a Jonah que lo agregue". Si está
//                SEGURA: si ya existe, le responde con qué nombre buscarlo; si
//                no, calcula los macros y lo agrega a la app para todos. Si no
//                está segura, el pedido queda pendiente para Jonah (con los
//                macros ya calculados) y le llega un aviso. En propuesta.ia_estado
//                queda lo que hizo (revisando / agregado / descartado / dudoso).
//   Variantes: al agregar un pedido (lo haga la IA o Jonah), la IA propone
//                hasta 3 variantes comunes del plato en restaurantes peruanos
//                (ej. Jalea de pescado → Jalea mixta). Nadie las está
//                esperando, así que NO se agregan solas: quedan "sugeridas"
//                para que Jonah las revise una vez al día (Jarvis se lo dice
//                en el informe de la mañana, api/cron/informe-admin.js). Desde el panel:
//                "agregar_variante" / "descartar_variante" → {id, indice}.
//                Lo que pasó con cada una queda en propuesta.variantes_resultado.
//   Menú del día: la IA también sugiere para qué serviría cada alimento en
//                el menú (propuesta.menu_uso, y en cada variante). Nunca se
//                aplica solo: Jonah lo acepta o lo cambia en su revisión
//                diaria (Jarvis le avisa en el informe de la mañana).
//   "automatico" → la tarea automática (cada 15 min, con x-webhook-secret):
//                revisa los alimentos creados y atiende los pedidos (también
//                los de WhatsApp y los de las fotos) que quedaron sin atender.
//
// Además de la notificación, la app le muestra al alumno sus pedidos
// resueltos al abrirla (función mis_pedidos_resueltos), así se entera aunque
// tenga los avisos apagados. Al panel se le dice a quién NO le llegó la
// notificación (avisos.sin_avisos).
//
// verify_jwt = false porque el candado de admin está en el código (igual
// que jarvis-chat). Publicación (regla de CLAUDE.md): solo después del
// merge, con el código de main.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ALIMENTOS_APP, CLAVES_APP, GRUPOS_APP, USOS_MENU } from "./alimentos.ts";

// Jonah calculando desde el panel: la IA más fuerte. Lo automático (pedidos
// de alumnos y revisión de sus alimentos) usa una ~2.5 veces más barata; si
// no está segura, igual queda para que Jonah lo revise.
const MODELO = "claude-opus-5-5";
const MODELO_AUTOMATICO = "claude-sonnet-5-5";
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
    const cuerpo = await req.json().catch(() => ({}));
    const { accion, id, nombre, alimento, respuesta } = cuerpo || {};

    // Tarea automática (api/cron/alimentos-revision.js).
    if (accion === "automatico") {
      if (!AVISO_SECRETO || req.headers.get("x-webhook-secret") !== AVISO_SECRETO) return json({ error: "No autorizado." }, 401);
      const [alimentos, pedidos] = await Promise.all([revisarPendientes(), atenderPedidosPendientes()]);
      return json({ ok: true, alimentos, pedidos });
    }

    // Candado: sesión iniciada. Todo es solo para el admin, menos que un
    // alumno pida revisar SU alimento.
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "No autorizado." }, 401);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) return json({ error: "No autorizado." }, 401);
    const { data: perfil } = await supabase.from("profiles").select("role, username").eq("id", authData.user.id).maybeSingle();
    if (accion === "revisar_propio") {
      if (!perfil?.username) return json({ error: "No autorizado." }, 403);
      return json(await revisarPropio(String(id || ""), perfil.role === "admin" ? null : perfil.username));
    }
    if (accion === "atender_pedido") {
      if (!perfil?.username) return json({ error: "No autorizado." }, 403);
      return json(await atenderMiPedido(String(nombre || ""), perfil.username));
    }
    if (perfil?.role !== "admin") return json({ error: "No autorizado." }, 403);

    if (accion === "calcular") return json(await calcular(String(nombre || "").trim().slice(0, 80), id));
    if (accion === "aprobar") return json(await aprobar(alimento, id));
    if (accion === "descartar") return json(await descartar(Number(id), respuesta));
    if (accion === "agregar_variante") return json(await agregarVarianteSugerida(Number(id), Number(cuerpo?.indice)));
    if (accion === "descartar_variante") return json(await descartarVariante(Number(id), Number(cuerpo?.indice)));
    return json({ error: "Acción desconocida." }, 400);
  } catch (e) {
    const mensaje = (e as Error)?.message || "Error inesperado.";
    console.error("alimentos-pedidos:", mensaje);
    return json({ error: mensaje }, e instanceof ErrorDeDatos ? 400 : 500);
  }
});

class ErrorDeDatos extends Error {}

// ---------------------------------------------------------------- calcular

const VALORES_MENU = ["", ...USOS_MENU.map((u) => u.valor)];
const DESCRIPCION_MENU = "Para qué serviría en el menú del día (una sugerencia que revisa Jonah): uno de los valores de la lista de usos del menú, o \"\" si no va en el menú.";

const ESQUEMA_PROPUESTA = {
  type: "object",
  properties: {
    ya_existe: { type: "string", description: "Nombre EXACTO de un alimento de la lista que ya es lo mismo que lo pedido, o \"\" si no hay." },
    por_partes: {
      type: "array", items: { type: "string" },
      description: "Si lo pedido es una mezcla casera de ingredientes que YA están cada uno en la lista y cuyas cantidades cambian según quien lo prepara (ej. avena con leche y whey, batido de plátano con proteína, pan con palta y huevo): los nombres EXACTOS de esos ingredientes copiados de la lista (2 a 5). Lista vacía si es un plato con receta estándar (restaurante, comida típica) o si falta algún ingrediente en la lista.",
    },
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
    seguridad: {
      type: "string", enum: ["alta", "media", "baja"],
      description: "alta SOLO si sabes exactamente qué es (o, con ya_existe, que es exactamente lo mismo) y apostarías a tus números. Nombre ambiguo, genérico, una marca que no conoces o algo que no es comida → baja.",
    },
    variantes: {
      type: "array",
      description: "Hasta 3 variantes del mismo plato que se piden comúnmente en restaurantes peruanos, que NO estén en la lista y cuyos macros sean claramente distintos (ej. Jalea de pescado → Jalea mixta). Lista vacía si no hay o si ya_existe no está vacío.",
      items: {
        type: "object",
        properties: {
          nombre: { type: "string" },
          grupo: { type: "string", enum: GRUPOS_APP },
          estado: { type: "string" },
          kcal: { type: "number" },
          proteina: { type: "number" },
          carbos: { type: "number" },
          grasa: { type: "number" },
          fibra: { type: "number" },
          unidad: { type: "string" },
          gramos_unidad: { type: "number" },
          seguridad: { type: "string", enum: ["alta", "media", "baja"] },
          menu_uso: { type: "string", enum: VALORES_MENU, description: DESCRIPCION_MENU },
        },
        required: ["nombre", "grupo", "estado", "kcal", "proteina", "carbos", "grasa", "fibra", "unidad", "gramos_unidad", "seguridad", "menu_uso"],
        additionalProperties: false,
      },
    },
    menu_uso: { type: "string", enum: VALORES_MENU, description: DESCRIPCION_MENU },
  },
  required: ["ya_existe", "grupo", "nombre", "estado", "kcal", "proteina", "carbos", "grasa", "fibra", "unidad", "gramos_unidad", "nota", "seguridad", "variantes", "menu_uso", "por_partes"],
  additionalProperties: false,
};

// Mensaje para quien pidió una mezcla casera que ya se puede registrar por
// partes (misma frase que propone el panel al descartar).
function mensajePorPartes(nombres: string[]) {
  return `Lo puedes registrar por partes, cada uno con tu cantidad 💪: ${nombres.join(" + ")}. Así es más exacto y luego te sale en ⭐ Favoritos o con "Repetir ayer" 🦍`;
}

async function calcular(nombre: string, id?: number, tipo = "alimento", modelo = MODELO) {
  if (!nombre) throw new ErrorDeDatos("Escribe el nombre del alimento.");
  const extras = await nombresExtra();
  const lista = [...ALIMENTOS_APP, ...extras].join("\n");

  const cuerpo = JSON.stringify({
    model: modelo,
    max_tokens: 16000,
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: ESQUEMA_PROPUESTA },
    },
    fallbacks: "default",
    system: [{
      type: "text",
      text: `Eres nutricionista y armas la base de alimentos de Jonah Beast Fuel, una app peruana de nutrición. Te piden agregar un alimento o plato. Calcula sus macros POR CADA 100 g, tal como se come (cocido si se come cocido), con porciones y recetas típicas de Perú. Usa como referencia la Tabla Peruana de Composición de Alimentos (CENAN/INS) y, si no está, USDA o recetas caseras promedio.

Reglas:
- Números por 100 g, con un decimal como máximo. kcal ≈ 4·proteína + 4·carbos + 9·grasa (acepta un pequeño desvío por fibra o alcohol).
- Si en la lista de la app ya hay algo que es lo mismo (aunque tenga otro nombre o esté escrito distinto), pon su nombre exacto en "ya_existe". Si solo es parecido, deja "ya_existe" vacío.
- Mezclas caseras (por_partes): si lo pedido es una combinación que cada persona arma a su gusto con ingredientes que YA están en la lista (ej. "avena con proteína" = avena en hojuelas + leche + proteína en polvo; "batido de plátano con whey"), pon esos ingredientes en "por_partes" con su nombre exacto. Así el alumno lo registra por partes con sus cantidades y la app no se llena de mezclas personales. NO lo uses para platos con receta estándar de restaurante o comida típica (lomo saltado, ají de gallina, jugo surtido de juguería): esos se agregan como plato. Si falta algún ingrediente en la lista, deja "por_partes" vacío. Igual calcula los macros de la mezcla típica, por si Jonah decide agregarla.
- El nombre y el grupo deben seguir el estilo de la lista. Para platos preparados usa estado "-".
- En la medida casera piensa en cómo lo sirve la gente en Perú (ej. un plato de comida ≈ 400 g, una unidad de pan francés ≈ 55 g).
- En "seguridad" sé honesto: si está en "alta", se agrega a la app de todos sin que Jonah lo revise. Ante la duda, "media" o "baja" (lo revisa Jonah).
- Alimentos SIMPLES de un solo ingrediente con valores conocidos (semillas, frutas, verduras, menestras, carnes o pescados al natural, lácteos, productos básicos): pon "alta" aunque el pedido esté mal escrito o sin tildes, SIEMPRE QUE el nombre correcto sea obvio (ej. "linasa" → Linaza, "brocoli" → Brócoli, "kiwisha" → Kiwicha) y uses valores de la Tabla Peruana o USDA. Si el nombre se presta a dos alimentos distintos, no es "alta".
- Frituras, apanados, salteados y platos caseros cuyas calorías dependen mucho del aceite o la receta (chicharrones, jaleas, apanados, saltados): nunca "alta"; los revisa Jonah.
- Menú del día (menu_uso): la app arma menús para bajar grasa con estos usos:
${USOS_MENU.map((u) => `  · ${u.valor} = ${u.texto}`).join("\n")}
  Sugiere uno SOLO si el alimento encaja de verdad en un menú saludable con porción controlada (a la plancha, sancochado, al horno, guisos caseros). Frituras, comida rápida, postres, dulces, bebidas azucaradas y alcohol → "". Es solo una sugerencia: la revisa Jonah.
- Variantes: piensa como la carta de un restaurante peruano. Si piden "Jalea de pescado", en la carta también está "Jalea mixta"; si piden "Ceviche de pescado", "Ceviche mixto". Máximo 3, solo las comunes de verdad (no inventes), que no estén en la lista y con macros claramente distintos del plato pedido (si serían casi iguales, no la pongas). Cada una con sus números por 100 g, su medida casera y su propia seguridad. Si el pedido ya existe, va por partes o no es un plato con variantes, deja la lista vacía.

Alimentos que ya están en la app (nombre y estado):
${lista}`,
    }],
    messages: [{ role: "user", content: `Alimento pedido: ${nombre}` }],
  });

  const data = await llamarClaude(cuerpo, tipo);
  if (data.stop_reason === "refusal") throw new Error("La IA no pudo calcular este alimento. Llénalo a mano.");
  const texto = (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text || "").join("");
  let propuesta: any;
  try { propuesta = JSON.parse(texto); } catch { throw new Error("La IA respondió algo que no se pudo leer. Intenta de nuevo."); }
  const redondear = (o: any) => { for (const k of ["kcal", "proteina", "carbos", "grasa", "fibra", "gramos_unidad"]) o[k] = Math.max(0, Math.round(Number(o[k]) * 10) / 10 || 0); };
  redondear(propuesta);
  propuesta.variantes = (Array.isArray(propuesta.variantes) ? propuesta.variantes : []).slice(0, 3);
  propuesta.variantes.forEach(redondear);
  const usoValido = (u: unknown) => VALORES_MENU.includes(String(u || "")) ? String(u || "") : "";
  propuesta.menu_uso = usoValido(propuesta.menu_uso);
  propuesta.por_partes = (Array.isArray(propuesta.por_partes) ? propuesta.por_partes : []).map((n: unknown) => String(n || "").trim()).filter(Boolean).slice(0, 5);
  propuesta.variantes.forEach((v: any) => { v.menu_uso = usoValido(v.menu_uso); });

  if (id) {
    await supabase.from("pedidos_alimentos").update({ propuesta, actualizado_en: new Date().toISOString() }).eq("id", id);
  }
  return { propuesta };
}

async function llamarClaude(cuerpo: string, tipo = "alimento") {
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
      await anotarUsoIA(supabase, { tipo, modelo: data.model || MODELO, usage: data.usage });
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

// ------------------------------------------- revisar alimentos de alumnos

// Un alimento que se quedó "revisando" más de esto (la función se cortó) se
// vuelve a revisar en la siguiente tarea automática.
const REVISANDO_VENCE_MS = 30 * 60000;
const MAX_POR_TAREA = 8; // se revisan a la vez, para que la tarea no pase el límite de tiempo

const ESQUEMA_REVISION = {
  type: "object",
  properties: {
    veredicto: {
      type: "string", enum: ["bien", "corregir", "ya_existe", "no_se"],
      description: "bien = los números del alumno son razonables; corregir = tienen un error claro; ya_existe = la lista ya tiene exactamente ese alimento; no_se = no lo conoces bien o el nombre es ambiguo.",
    },
    seguridad: { type: "string", enum: ["alta", "media", "baja"], description: "alta SOLO si apostarías a que tu veredicto es correcto." },
    ya_existe: { type: "string", description: "Si veredicto = ya_existe: nombre EXACTO copiado de la lista. Si no, \"\"." },
    kcal: { type: "number", description: "Tu estimación por 100 g." },
    proteina: { type: "number" },
    carbos: { type: "number" },
    grasa: { type: "number" },
    nota: { type: "string", description: "Una línea para Jonah: qué viste (ej. \"Puso los datos de una porción de 30 g, no de 100 g\")." },
  },
  required: ["veredicto", "seguridad", "ya_existe", "kcal", "proteina", "carbos", "grasa", "nota"],
  additionalProperties: false,
};

// ¿Las calorías cuadran con los macros? (4 kcal por g de proteína y carbos,
// 9 por g de grasa; se acepta un desvío por fibra, alcohol o redondeo).
function cuadra(k: number, p: number, c: number, g: number) {
  if (!(k > 0) || k > 900 || p < 0 || c < 0 || g < 0 || p + c + g > 100) return false;
  const calc = 4 * p + 4 * c + 9 * g;
  return Math.abs(calc - k) <= 40 || Math.abs(calc - k) / k <= 0.25;
}

// Toma un alimento para revisarlo (así la app del alumno y la tarea
// automática no lo revisan dos veces a la vez).
async function tomar(filaId: string) {
  const vencido = new Date(Date.now() - REVISANDO_VENCE_MS).toISOString();
  const { data } = await supabase.from("alimentos_personales")
    .update({ revision: "revisando", revisado_en: new Date().toISOString() })
    .eq("id", filaId).is("reemplazo", null)
    .or(`revision.is.null,and(revision.eq.revisando,revisado_en.lt."${vencido}")`)
    .select("*").maybeSingle();
  return data;
}

async function revisarPropio(filaId: string, username: string | null) {
  if (!filaId) throw new ErrorDeDatos("Falta el alimento.");
  const { data: fila } = await supabase.from("alimentos_personales").select("id, username").eq("id", filaId).maybeSingle();
  if (!fila || (username && fila.username !== username)) throw new ErrorDeDatos("Ese alimento no existe.");
  const tomada = await tomar(filaId);
  if (!tomada) return { revision: null };
  return await revisarUno(tomada);
}

async function revisarPendientes() {
  const vencido = new Date(Date.now() - REVISANDO_VENCE_MS).toISOString();
  const { data } = await supabase.from("alimentos_personales").select("id")
    .is("reemplazo", null)
    .or(`revision.is.null,and(revision.eq.revisando,revisado_en.lt."${vencido}")`)
    .order("created_at").limit(MAX_POR_TAREA);
  const resultado: Record<string, number> = {};
  const contar = (k: string) => { resultado[k] = (resultado[k] || 0) + 1; };
  await Promise.all((data || []).map(async ({ id }: any) => {
    const tomada = await tomar(id);
    if (!tomada) return;
    try {
      contar((await revisarUno(tomada)).revision || "cambiado_mientras");
    } catch (e) {
      console.error("No se pudo revisar el alimento", id, (e as Error)?.message);
      contar("error");
    }
  }));
  return resultado;
}

async function revisarUno(fila: any) {
  const antes = { kcal: Number(fila.kcal) || 0, proteina: Number(fila.proteina) || 0, carbos: Number(fila.carbos) || 0, grasas: Number(fila.grasas) || 0 };
  let ia: any;
  try {
    ia = await opinionIA(fila.nombre, antes);
  } catch (e) {
    // Sin respuesta de la IA: se suelta para que la tarea automática lo reintente.
    await supabase.from("alimentos_personales").update({ revision: null, revisado_en: null }).eq("id", fila.id).eq("revision", "revisando");
    throw e;
  }
  const r1 = (v: unknown) => Math.max(0, Math.round(Number(v) * 10) / 10 || 0);
  const cifrasIA = { kcal: r1(ia.kcal), proteina: r1(ia.proteina), carbos: r1(ia.carbos), grasa: r1(ia.grasa) };
  const segura = ia.seguridad === "alta";
  const ahora = new Date().toISOString();
  const revisionIA: any = { auto: true, veredicto: ia.veredicto, seguridad: ia.seguridad, nota: String(ia.nota || "").slice(0, 300), ia: cifrasIA, antes, en: ahora };

  let cambios: any = null;
  if (segura && ia.veredicto === "ya_existe") {
    const i = ALIMENTOS_APP.findIndex((n) => n.toLowerCase() === String(ia.ya_existe || "").trim().toLowerCase());
    const extra = i < 0 ? await claveExtra(String(ia.ya_existe || "")) : null;
    const clave = i >= 0 ? CLAVES_APP[i] : extra;
    if (clave) { cambios = { revision: "existe", reemplazo: clave }; revisionIA.ya_existe = clave; }
  } else if (segura && ia.veredicto === "bien" && cuadra(antes.kcal, antes.proteina, antes.carbos, antes.grasas)) {
    cambios = { revision: "ok" };
  } else if (segura && ia.veredicto === "corregir" && cuadra(cifrasIA.kcal, cifrasIA.proteina, cifrasIA.carbos, cifrasIA.grasa)) {
    cambios = { revision: "corregido", kcal: cifrasIA.kcal, proteina: cifrasIA.proteina, carbos: cifrasIA.carbos, grasas: cifrasIA.grasa };
  }
  if (!cambios) revisionIA.auto = false;
  const revision = cambios?.revision || "dudoso";

  // Solo si nadie lo tocó mientras tanto (el alumno pudo corregirlo).
  const { data: guardada, error } = await supabase.from("alimentos_personales")
    .update({ ...(cambios || { revision: "dudoso" }), revisado_en: ahora, revision_ia: revisionIA })
    .eq("id", fila.id).eq("revision", "revisando").select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!guardada) return { revision: null };

  if (revision === "dudoso" && !horaDeSilencio()) {
    await enviarPush({ admin: true, body: `🍴 La IA no está segura de "${fila.nombre}" (@${fila.username}). Revísalo en HOY → Alimentos creados por alumnos.` });
  }
  return { revision };
}

// De 10pm a 7am (Perú) no se le manda el aviso a Jonah; igual queda en el panel.
function horaDeSilencio() {
  const hora = (new Date().getUTCHours() + 24 - 5) % 24;
  return hora >= 22 || hora < 7;
}

async function claveExtra(etiqueta: string) {
  const { data } = await supabase.from("alimentos_extra").select("nombre, estado");
  const e = etiqueta.trim().toLowerCase();
  const a = (data || []).find((x: any) => (x.estado && x.estado !== "-" ? `${x.nombre} (${String(x.estado).toLowerCase()})` : x.nombre).toLowerCase() === e);
  return a ? `${a.nombre} (${a.estado || "-"})` : null;
}

async function opinionIA(nombre: string, antes: { kcal: number; proteina: number; carbos: number; grasas: number }) {
  const extras = await nombresExtra();
  const lista = [...ALIMENTOS_APP, ...extras].join("\n");
  const cuerpo = JSON.stringify({
    model: MODELO_AUTOMATICO,
    max_tokens: 16000,
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: ESQUEMA_REVISION },
    },
    fallbacks: "default",
    system: [{
      type: "text",
      text: `Eres nutricionista de Jonah Beast Fuel, una app peruana de nutrición. Un alumno creó su propio alimento escribiendo su nombre y sus números POR CADA 100 g (muchas veces copiados de la etiqueta del producto). Revisa si esos números están bien. Usa como referencia la Tabla Peruana de Composición de Alimentos (CENAN/INS), USDA y productos comunes en Perú.

Veredictos:
- "bien": los números son razonables para ese alimento. Las marcas varían: si es un producto de marca y los números son creíbles para ese tipo de producto, está bien aunque no coincidan con tu estimación.
- "corregir": hay un error claro (puso los datos de una porción y no de 100 g, confundió proteína con carbos, un cero de más, calorías que no cuadran con los macros, valores imposibles) Y conoces bien ese alimento para dar los números correctos.
- "ya_existe": la lista de la app ya tiene EXACTAMENTE ese alimento (lo mismo y en el mismo estado: cocido/crudo, con/sin azúcar…). Si solo es parecido, NO es ya_existe.
- "no_se": no conoces bien el alimento, el nombre es ambiguo o no te alcanza para decidir.

Seguridad: pon "alta" solo si apostarías a que tu veredicto es correcto. Ante la duda, "media" o "baja": en ese caso Jonah lo revisa a mano, y eso está bien.

En kcal/proteina/carbos/grasa pon SIEMPRE tu estimación por 100 g (tal como se come), con un decimal como máximo, que cuadre: kcal ≈ 4·proteína + 4·carbos + 9·grasa.

Alimentos que ya están en la app (nombre y estado):
${lista}`,
    }],
    messages: [{ role: "user", content: `Alimento del alumno: ${nombre}\nSus números por 100 g: ${antes.kcal} kcal · proteína ${antes.proteina} g · carbos ${antes.carbos} g · grasa ${antes.grasas} g` }],
  });
  const data = await llamarClaude(cuerpo, "alimento_revision");
  if (data.stop_reason === "refusal") return { veredicto: "no_se", seguridad: "baja", ya_existe: "", kcal: 0, proteina: 0, carbos: 0, grasa: 0, nota: "La IA no quiso revisarlo." };
  const texto = (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text || "").join("");
  try { return JSON.parse(texto); } catch { throw new Error("La IA respondió algo que no se pudo leer."); }
}

// ------------------------------------------------- atender pedidos (IA)

// Toma un pedido pendiente para atenderlo (así la app y la tarea
// automática no lo atienden dos veces a la vez). Devuelve el pedido o null.
async function tomarPedido(pedidoId: number) {
  const vencido = new Date(Date.now() - REVISANDO_VENCE_MS).toISOString();
  const { data } = await supabase.from("pedidos_alimentos")
    .update({ propuesta: { ia_estado: "revisando", ia_en: new Date().toISOString() }, actualizado_en: new Date().toISOString() })
    .eq("id", pedidoId).eq("estado", "pendiente")
    .or(`propuesta.is.null,propuesta->>ia_estado.is.null,and(propuesta->>ia_estado.eq.revisando,propuesta->>ia_en.lt."${vencido}")`)
    .select("*").maybeSingle();
  return data;
}

async function atenderMiPedido(nombre: string, username: string) {
  const clave = nombre.replace(/\s+/g, " ").trim().slice(0, 80).toLowerCase();
  if (!clave) throw new ErrorDeDatos("Falta el nombre.");
  const { data: pedido } = await supabase.from("pedidos_alimentos").select("id, solicitantes")
    .eq("clave", clave).eq("estado", "pendiente").maybeSingle();
  if (!pedido || !(pedido.solicitantes || []).some((s: any) => s?.username === username)) return { estado: null };
  const tomado = await tomarPedido(pedido.id);
  if (!tomado) return { estado: null };
  return await atenderPedido(tomado);
}

async function atenderPedidosPendientes() {
  const vencido = new Date(Date.now() - REVISANDO_VENCE_MS).toISOString();
  const { data } = await supabase.from("pedidos_alimentos").select("id")
    .eq("estado", "pendiente")
    .or(`propuesta.is.null,propuesta->>ia_estado.is.null,and(propuesta->>ia_estado.eq.revisando,propuesta->>ia_en.lt."${vencido}")`)
    .order("creado_en").limit(MAX_POR_TAREA);
  const resultado: Record<string, number> = {};
  const contar = (k: string) => { resultado[k] = (resultado[k] || 0) + 1; };
  await Promise.all((data || []).map(async ({ id }: any) => {
    const tomado = await tomarPedido(id);
    if (!tomado) return;
    try {
      contar((await atenderPedido(tomado)).estado || "cambiado_mientras");
    } catch (e) {
      console.error("No se pudo atender el pedido", id, (e as Error)?.message);
      contar("error");
    }
  }));
  return resultado;
}

// Busca, sin IA, alimentos de la app con el mismo nombre que el pedido
// (sin importar mayúsculas, tildes ni el estado entre paréntesis: "arroz
// verde" → "Arroz verde (cocido)"). Devuelve hasta 3 nombres, o [] si no hay.
const normalizar = (t: string) => String(t || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
async function igualesEnApp(nombre: string) {
  const q = normalizar(nombre);
  if (!q) return [];
  const todos = [...ALIMENTOS_APP, ...await nombresExtra()];
  return [...new Set(todos.filter((n) => normalizar(n) === q || normalizar(n.replace(/\s*\([^()]*\)$/, "")) === q))].slice(0, 3);
}

// Etiqueta (como en la lista de la app) → nombre para mostrarle al alumno.
async function existeEnApp(etiqueta: string) {
  const e = etiqueta.trim().toLowerCase();
  if (!e) return null;
  const i = ALIMENTOS_APP.findIndex((n) => n.toLowerCase() === e);
  if (i >= 0) return ALIMENTOS_APP[i];
  const extras = await nombresExtra();
  return extras.find((n: string) => n.toLowerCase() === e) || null;
}

async function atenderPedido(pedido: any) {
  const soltar = () => supabase.from("pedidos_alimentos").update({ propuesta: null }).eq("id", pedido.id)
    .eq("estado", "pendiente").eq("propuesta->>ia_estado", "revisando");
  // 0) Si el nombre ya está tal cual en la app, se responde sin gastar IA.
  const iguales = await igualesEnApp(pedido.nombre);
  if (iguales.length) {
    const ahora0 = new Date().toISOString();
    await supabase.from("pedidos_alimentos").update({ propuesta: { ya_existe: iguales[0], sin_ia: true, ia_estado: "descartado", ia_en: ahora0 } }).eq("id", pedido.id);
    const lista = iguales.map((n) => `"${n}"`).join(" o ");
    const r = await descartar(pedido.id, `Ya estaba en la app como ${lista}. Búscalo con ese nombre en "REGISTRAR" → "Escribir" 🙌`);
    return { estado: "descartado", ya_existe: iguales[0], sin_ia: true, avisos: r.avisos };
  }
  let propuesta: any;
  try {
    propuesta = (await calcular(pedido.nombre, undefined, "alimento_pedido_auto", MODELO_AUTOMATICO)).propuesta;
  } catch (e) {
    await soltar(); // se reintenta en la siguiente tarea automática
    throw e;
  }
  const ahora = new Date().toISOString();
  const segura = propuesta.seguridad === "alta";
  const guardar = (estadoIA: string, extra: any = {}) => ({ ...propuesta, ...extra, ia_estado: estadoIA, ia_en: ahora });

  // 1) Ya existe en la app: se le responde con qué nombre buscarlo.
  if (segura && propuesta.ya_existe) {
    const nombreApp = await existeEnApp(String(propuesta.ya_existe));
    if (nombreApp) {
      await supabase.from("pedidos_alimentos").update({ propuesta: guardar("descartado", { ya_existe: nombreApp }) }).eq("id", pedido.id);
      const r = await descartar(pedido.id, `Ya estaba en la app como "${nombreApp}". Búscalo con ese nombre en "REGISTRAR" → "Escribir" 🙌`);
      return { estado: "descartado", ya_existe: nombreApp, avisos: r.avisos };
    }
  }

  // 1b) Mezcla casera con ingredientes que ya están en la app: se le dice
  // que la registre por partes (no se llena la app de mezclas personales).
  if (segura && !propuesta.ya_existe && propuesta.por_partes.length >= 2) {
    const nombres = await Promise.all(propuesta.por_partes.map((n: string) => existeEnApp(n)));
    if (nombres.every(Boolean)) {
      const partes = nombres as string[];
      await supabase.from("pedidos_alimentos").update({ propuesta: guardar("descartado", { por_partes: partes, variantes: [] }) }).eq("id", pedido.id);
      const r = await descartar(pedido.id, mensajePorPartes(partes));
      return { estado: "descartado", por_partes: partes, avisos: r.avisos };
    }
    propuesta.por_partes = []; // algún ingrediente no está: sigue como pedido normal
  }

  // 2) No existe y la IA está segura de sus números: se agrega para todos.
  if (segura && !propuesta.ya_existe && !propuesta.por_partes.length && cuadra(propuesta.kcal, propuesta.proteina, propuesta.carbos, propuesta.grasa)) {
    try {
      await supabase.from("pedidos_alimentos").update({ propuesta: guardar("agregado") }).eq("id", pedido.id);
      const r = await aprobar(propuesta, pedido.id);
      const etiqueta = propuesta.estado && propuesta.estado !== "-" ? `${propuesta.nombre} (${String(propuesta.estado).toLowerCase()})` : propuesta.nombre;
      return { estado: "agregado", alimento: etiqueta, avisos: r.avisos };
    } catch (e) {
      // ej. ya había uno con ese nombre: que lo vea Jonah
      console.error("No se pudo agregar solo el pedido", pedido.id, (e as Error)?.message);
      propuesta.nota = `${propuesta.nota || ""} (No se pudo agregar solo: ${(e as Error)?.message || "error"})`.trim();
    }
  }

  // 3) No está segura: queda para Jonah, con los macros ya calculados.
  await supabase.from("pedidos_alimentos").update({ propuesta: guardar("dudoso"), actualizado_en: ahora }).eq("id", pedido.id).eq("estado", "pendiente");
  if (!horaDeSilencio()) {
    await enviarPush({ admin: true, body: `🍽️ La IA no está segura del pedido "${pedido.nombre}". Revísalo en HOY → Pedidos de alimentos.` });
  }
  return { estado: "dudoso" };
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

const etiquetaDe = (a: { nombre: string; estado: string }) => a.estado && a.estado !== "-" ? `${a.nombre} (${a.estado.toLowerCase()})` : a.nombre;

// Agrega un alimento a la lista de la app (alimentos_extra).
async function agregarAlimento(entrada: any) {
  const alimento = limpiarAlimento(entrada);
  const etiqueta = etiquetaDe(alimento);
  if (ALIMENTOS_APP.some((n) => n.toLowerCase() === etiqueta.toLowerCase())) {
    throw new ErrorDeDatos(`"${etiqueta}" ya está en la app. Si es otra cosa, cámbiale el nombre.`);
  }
  const { data: nuevo, error } = await supabase.from("alimentos_extra").insert(alimento).select("id").single();
  if (error) {
    if (error.code === "23505") throw new ErrorDeDatos(`"${etiqueta}" ya lo agregaste antes.`);
    throw new Error(error.message);
  }
  return { id: nuevo.id as number, etiqueta, alimento };
}

// Variantes del plato que se acaba de agregar: quedan como sugerencia para
// que Jonah las revise (las que ya estaban en la app se anotan como tales).
// Nunca frena la aprobación del pedido.
async function agregarVariantes(pedidoId: number) {
  try {
    const { data: pedido } = await supabase.from("pedidos_alimentos").select("propuesta").eq("id", pedidoId).maybeSingle();
    const propuesta = pedido?.propuesta;
    const variantes = Array.isArray(propuesta?.variantes) ? propuesta.variantes.slice(0, 3) : [];
    if (!variantes.length || propuesta.variantes_resultado) return;
    const resultado: any[] = [];
    for (const v of variantes) {
      const nombre = String(v?.nombre || "").trim();
      if (!nombre) continue;
      const base = { ...v, nombre, grupo: GRUPOS_APP.includes(v.grupo) ? v.grupo : propuesta.grupo, estado: String(v.estado || "-").trim() || "-" };
      const etiqueta = etiquetaDe(base);
      if (etiqueta.toLowerCase() === etiquetaDe(propuesta).toLowerCase() || await existeEnApp(etiqueta)) {
        resultado.push({ nombre: etiqueta, estado: "ya_existia" });
        continue;
      }
      // "estado" aquí es el estado de la revisión (sugerida, agregada…); el
      // estado del alimento (crudo, cocido, "-") se guarda aparte para que no
      // termine pegado al nombre en la app ("Picante de pollo (sugerida)").
      resultado.push({ ...base, etiqueta, estado: "sugerida", estado_alimento: base.estado, cuadra: cuadra(v.kcal, v.proteina, v.carbos, v.grasa) });
    }
    await supabase.from("pedidos_alimentos").update({ propuesta: { ...propuesta, variantes_resultado: resultado } }).eq("id", pedidoId);
  } catch (e) {
    console.error("Variantes:", (e as Error)?.message);
  }
}

// Jonah agrega desde el panel una variante que quedó como sugerencia.
async function agregarVarianteSugerida(pedidoId: number, indice: number) {
  const { data: pedido } = await supabase.from("pedidos_alimentos").select("propuesta").eq("id", pedidoId).maybeSingle();
  const lista = pedido?.propuesta?.variantes_resultado;
  const v = Array.isArray(lista) ? lista[indice] : null;
  if (!v || v.estado !== "sugerida") throw new ErrorDeDatos("Esa variante ya no está pendiente.");
  const r = await agregarAlimento({ ...v, estado: v.estado_alimento || "-" });
  lista[indice] = { ...v, estado: "agregada", alimento_id: r.id, por: "jonah", revisada_en: new Date().toISOString() };
  await supabase.from("pedidos_alimentos").update({ propuesta: { ...pedido.propuesta, variantes_resultado: lista } }).eq("id", pedidoId);
  return { ok: true, alimento_id: r.id };
}

async function descartarVariante(pedidoId: number, indice: number) {
  const { data: pedido } = await supabase.from("pedidos_alimentos").select("propuesta").eq("id", pedidoId).maybeSingle();
  const lista = pedido?.propuesta?.variantes_resultado;
  const v = Array.isArray(lista) ? lista[indice] : null;
  if (!v || v.estado !== "sugerida") throw new ErrorDeDatos("Esa variante ya no está pendiente.");
  lista[indice] = { ...v, estado: "descartada", revisada_en: new Date().toISOString() };
  await supabase.from("pedidos_alimentos").update({ propuesta: { ...pedido.propuesta, variantes_resultado: lista } }).eq("id", pedidoId);
  return { ok: true };
}

async function aprobar(entrada: any, id?: number) {
  const { id: nuevoId, alimento } = await agregarAlimento(entrada);
  const nuevo = { id: nuevoId };
  if (!id) return { ok: true, alimento_id: nuevo.id, avisos: null };

  const { data: pedido } = await supabase.from("pedidos_alimentos").select("*").eq("id", id).maybeSingle();
  const avisos = pedido ? await avisarSolicitantes(pedido.solicitantes || [], {
    push: `✅ ¡Listo! ${alimento.nombre} ya está en la app. Búscalo en "REGISTRAR" → "Escribir" 🙌`,
    whatsapp: `✅ ¡Listo! *${alimento.nombre}* ya está en la app 🙌\nCierra y vuelve a abrir la app, y búscalo en "REGISTRAR" → "Escribir".\n¿Me avisas si todo está conforme?`,
  }) : null;
  await supabase.from("pedidos_alimentos").update({
    estado: "agregado", alimento_id: nuevo.id, avisos,
    resuelto_en: new Date().toISOString(), actualizado_en: new Date().toISOString(),
  }).eq("id", id);
  await agregarVariantes(id);
  return { ok: true, alimento_id: nuevo.id, avisos };
}

async function descartar(id: number, respuesta: unknown) {
  if (!id) throw new ErrorDeDatos("Falta el pedido.");
  const texto = String(respuesta || "").replace(/\s+/g, " ").trim().slice(0, 300);
  const { data: pedido } = await supabase.from("pedidos_alimentos").select("*").eq("id", id).maybeSingle();
  if (!pedido) throw new ErrorDeDatos("Ese pedido ya no existe.");
  if (pedido.estado !== "pendiente") throw new ErrorDeDatos("Ese pedido ya estaba resuelto.");
  const avisos = texto ? await avisarSolicitantes(pedido.solicitantes || [], {
    push: `Sobre tu pedido "${pedido.nombre}": ${texto}`,
    whatsapp: `Sobre tu pedido *${pedido.nombre}*: ${texto}`,
  }) : null;
  const ahora = new Date().toISOString();
  const { error } = await supabase.from("pedidos_alimentos").update({
    estado: "descartado", respuesta: texto || null, avisos, resuelto_en: ahora, actualizado_en: ahora,
  }).eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true, avisos };
}

// A cada persona que pidió el plato se le avisa una sola vez. En la app,
// solo cuenta como avisado quien tiene los avisos activos y le llegó el
// envío; al resto se le lista en sin_avisos (igual lo verá al abrir la app).
async function avisarSolicitantes(solicitantes: any[], mensajes: { push: string; whatsapp: string }) {
  const telefonos = [...new Set(solicitantes.filter((s) => s?.origen === "whatsapp" && s.telefono).map((s) => String(s.telefono)))];
  const usernames = [...new Set(solicitantes.filter((s) => s?.origen !== "whatsapp" && s.username).map((s) => String(s.username)))];
  const avisos = { whatsapp: [] as string[], app: [] as string[], sin_avisos: [] as string[], a_mano: [] as { telefono: string; nombre: string | null }[] };

  if (telefonos.length) {
    const { data: cuenta } = await supabase.from("whatsapp_cuenta").select("phone_number_id, token").eq("id", 1).maybeSingle();
    for (const telefono of telefonos) {
      const nombreCliente = solicitantes.find((s) => String(s.telefono) === telefono)?.nombre || null;
      const enviado = cuenta?.token ? await avisarPorWhatsApp(cuenta, telefono, mensajes.whatsapp).catch((e) => {
        console.error("No se pudo avisar por WhatsApp:", (e as Error)?.message);
        return false;
      }) : false;
      if (enviado) avisos.whatsapp.push(telefono); else avisos.a_mano.push({ telefono, nombre: nombreCliente });
    }
  }

  if (usernames.length) {
    const { data: subs } = await supabase.from("push_subs").select("username").eq("activa", true).in("username", usernames);
    const conAvisos: string[] = [...new Set<string>((subs || []).map((s: any) => String(s.username)))];
    avisos.sin_avisos = usernames.filter((u) => !conAvisos.includes(u));
    const enviados = conAvisos.length ? await enviarPush({ usernames: conAvisos, body: mensajes.push }) : 0;
    if (enviados > 0) avisos.app = conAvisos;
    else avisos.sin_avisos = usernames;
  }
  return avisos;
}

async function avisarPorWhatsApp(cuenta: any, telefono: string, texto: string) {
  // Meta solo deja escribir sin plantilla dentro de las 24 h desde el último mensaje del cliente.
  const { data: ultimo } = await supabase.from("whatsapp_mensajes").select("creado_en")
    .eq("telefono", telefono).eq("direccion", "entrante").order("creado_en", { ascending: false }).limit(1).maybeSingle();
  if (!ultimo || Date.now() - new Date(ultimo.creado_en).getTime() > VENTANA_WHATSAPP_MS - 5 * 60000) return false;

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

// Devuelve cuántas notificaciones salieron (0 si no se pudo).
async function enviarPush(datos: { usernames?: string[]; admin?: boolean; body: string }): Promise<number> {
  if (!AVISO_SECRETO) return 0;
  try {
    const r = await fetch("https://jonahbeast.com/api/aviso-push", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-webhook-secret": AVISO_SECRETO },
      body: JSON.stringify(datos),
    });
    const data = await r.json().catch(() => ({}));
    return Number(data?.enviados) || 0;
  } catch (e) {
    console.error("No se pudo mandar el aviso push:", (e as Error)?.message);
    return 0;
  }
}

// Anota en la tabla ia_uso cuántos tokens usó la IA en esta llamada, para
// que el panel de Rentabilidad calcule el costo real. Si falla, no
// interrumpe nada (solo queda en el log).
async function anotarUsoIA(supabase: any, fila: { tipo: string; username?: string | null; modelo?: string; usage?: any }) {
  try {
    const u = fila.usage || {};
    const { error } = await supabase.from("ia_uso").insert({
      funcion: "alimentos-pedidos", tipo: fila.tipo, username: fila.username || null, modelo: fila.modelo || "desconocido",
      tokens_entrada: Number(u.input_tokens) || 0, tokens_salida: Number(u.output_tokens) || 0,
      tokens_cache_lectura: Number(u.cache_read_input_tokens) || 0, tokens_cache_escritura: Number(u.cache_creation_input_tokens) || 0,
    });
    if (error) console.error("No se pudo anotar el uso de IA:", error.message);
  } catch (e) {
    console.error("No se pudo anotar el uso de IA:", (e as Error)?.message);
  }
}
