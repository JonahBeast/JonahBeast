// Edge Function: reconocer-comida
// Recibe una foto de comida y devuelve 1-4 platos identificados,
// buscando SOLO dentro de la lista de nombres que le mandamos
// (tu propia base de datos), para que nunca invente un plato
// que no exista en Jonah Beast Fuel.
//
// Mismo modelo (Sonnet 5) para todos los alumnos, tengan o no el
// add-on activo -- dar peor calidad a quien paga que a quien prueba
// gratis sería backwards.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = (Deno.env.get("CLAVE_SERVICIO") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!;

const LIMITE_GRATIS_SEMANAL = 5;
const LIMITE_PAGO_MENSUAL = 200;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function numeroDeSemanaISO(d = new Date()) {
  const LIMA_OFFSET_MS = -5 * 3600000;
  const local = new Date(d.getTime() + LIMA_OFFSET_MS);
  const diaSemana = local.getUTCDay();
  const diasHastaLunes = diaSemana === 0 ? 6 : diaSemana - 1;
  const lunes = new Date(local.getTime());
  lunes.setUTCDate(local.getUTCDate() - diasHastaLunes);
  const y = lunes.getUTCFullYear();
  const m = String(lunes.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(lunes.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function periodoDesdeActivacion(desdeISO: string, d = new Date()) {
  const desde = new Date(desdeISO + "T00:00:00Z");
  const diffMs = d.getTime() - desde.getTime();
  const bloque = Math.max(0, Math.floor(diffMs / (30 * 86400000)));
  const inicioBloque = new Date(desde.getTime() + bloque * 30 * 86400000);
  const y = inicioBloque.getUTCFullYear();
  const m = String(inicioBloque.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(inicioBloque.getUTCDate()).padStart(2, "0");
  return `addon-${y}-${m}-${dd}`;
}

// Fecha YYYY-MM-DD en hora de Lima.
function fechaLima(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(d);
}

// El alumno sale de la sesión iniciada, nunca de lo que mande el navegador:
// así nadie puede usar la IA (y gastar créditos) a nombre de otro o con
// usuarios inventados.
async function usuarioDeLaSesion(supabase: any, req: Request): Promise<string | null> {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  const { data: perfil } = await supabase.from("profiles").select("username").eq("id", data.user.id).maybeSingle();
  return perfil?.username || null;
}

// Topes para que cada llamada a la IA tenga un costo acotado.
const MAX_IMAGEN_BASE64 = 7_000_000; // ~5 MB de imagen, el máximo que acepta la IA
const MAX_ALIMENTOS = 5000;
const MAX_TEXTO_ALIMENTO = 120;
const TIPOS_IMAGEN = ["image/jpeg", "image/png", "image/webp", "image/gif"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const username = await usuarioDeLaSesion(supabase, req);
    if (!username) return json({ error: "Inicia sesión para usar el reconocimiento por foto." }, 401);

    const { imagenBase64, mimeType, alimentos } = await req.json();

    if (typeof imagenBase64 !== "string" || !imagenBase64 || !Array.isArray(alimentos) || !alimentos.length) {
      return json({ error: "Faltan datos (imagenBase64 o alimentos)." }, 400);
    }
    if (imagenBase64.length > MAX_IMAGEN_BASE64) {
      return json({ error: "La foto es demasiado pesada." }, 413);
    }
    const tipoImagen = TIPOS_IMAGEN.includes(mimeType) ? mimeType : "image/jpeg";
    if (alimentos.length > MAX_ALIMENTOS) {
      return json({ error: "La lista de alimentos es demasiado larga." }, 400);
    }
    const alimentosValidos = alimentos
      .filter((a: any) => a && typeof a.key === "string" && typeof a.name === "string" && a.key && a.name)
      .map((a: any) => ({ key: a.key.slice(0, MAX_TEXTO_ALIMENTO), name: a.name.slice(0, MAX_TEXTO_ALIMENTO) }));
    if (!alimentosValidos.length) return json({ error: "Faltan datos (alimentos)." }, 400);

    // Solo alumnos con la membresía vigente (habilitados y sin vencer, o
    // sin fecha de vencimiento), igual que en la app.
    const { data: alumno } = await supabase
      .from("alumnos")
      .select("enabled, fecha_vencimiento, reconocimiento_foto_desde, reconocimiento_foto_hasta")
      .eq("username", username)
      .maybeSingle();
    if (!alumno || !alumno.enabled || (alumno.fecha_vencimiento && alumno.fecha_vencimiento < fechaLima())) {
      return json({ error: "Tu membresía no está activa. Renueva tu plan para usar el reconocimiento por foto." }, 403);
    }

    const hoy = new Date();
    const tieneAddOn = !!(alumno.reconocimiento_foto_hasta && new Date(alumno.reconocimiento_foto_hasta + "T23:59:59Z") > hoy);
    const periodo = tieneAddOn ? periodoDesdeActivacion(alumno.reconocimiento_foto_desde, hoy) : numeroDeSemanaISO(hoy);
    const limite = tieneAddOn ? LIMITE_PAGO_MENSUAL : LIMITE_GRATIS_SEMANAL;

    // Se reserva la foto ANTES de llamar a la IA, en un solo paso en la
    // base de datos: si mandan muchas fotos a la vez, solo pasan las que
    // entran en el cupo. Si la IA falla, la foto se devuelve más abajo.
    const { data: usadas, error: errCupo } = await supabase.rpc("reservar_foto_reconocimiento", {
      p_username: username, p_periodo: periodo, p_limite: limite,
    });
    if (errCupo) {
      console.error("No se pudo reservar el cupo de fotos:", errCupo.message);
      return json({ error: "No se pudo procesar la foto. Intenta de nuevo." }, 500);
    }
    if (usadas === null || usadas === undefined) {
      return json({ error: "limite_alcanzado", tieneAddOn, usadas: limite, limite, hasta: alumno.reconocimiento_foto_hasta || null }, 200);
    }
    const devolverFoto = () => supabase.rpc("devolver_foto_reconocimiento", { p_username: username, p_periodo: periodo });

    const listaPlatos = alimentosValidos.map((a: any) => `${a.key} :: ${a.name}`).join("\n");

    const prompt = `Eres un identificador de platos de comida peruana. Te doy una foto de una mesa/plato de comida y una lista de alimentos válidos (formato "clave :: nombre").

Identifica TODOS los alimentos distintos visibles en la foto que coincidan con algo de esta lista. Si hay varios (ej. café + pan + jugo), devuélvelos todos por separado. Si no reconoces nada de la lista con confianza razonable, devuelve una lista vacía — NUNCA inventes una clave que no esté en la lista.

Fíjate bien en la FORMA de cada alimento, no solo en el color de la salsa que lo cubre — una salsa roja/marrón puede cubrir fideos, papa o carne por igual, y son formas muy distintas: los fideos/tallarines son alargados y delgados, la papa son trozos irregulares más gruesos, la carne tiene textura fibrosa o en cubos. No asumas que un alimento es "papa" solo porque hay trozos con salsa oscura si la forma es claramente alargada como fideo.

Si dos o más alimentos de la lista representan la MISMA comida visualmente pero se diferencian por algo que la foto no puede mostrar (ej. "con azúcar" vs "sin azúcar" en una bebida, cuando no se ve el azúcar siendo servida o disuelta), NO elijas uno solo adivinando — en vez de "key", incluye "opciones" con las claves de todas las variantes plausibles (2 o más), y usa confianza "media". Usa "opciones" solo para este caso de ambigüedad real; si no hay duda, usa "key" normal como siempre.

Para cada alimento, si es de un tipo que se cuenta por pieza entera y visible (ej. huevos, panes, frutas enteras), cuenta cuántas unidades ves e inclýyelo en "cantidad". Cuenta SOLO piezas que veas completas o casi completas — si una pieza está parcialmente tapada por otro alimento, cortada por el borde del plato o de la foto, o solo se le ve un pedazo, sigue siendo UNA pieza, no la cuentes dos veces ni la confundas con otra unidad separada. Si no aplica o no estás seguro del conteo, usa "cantidad": 1. NUNCA estimes gramos, tazas ni ningún otro tipo de porción — solo el conteo de piezas enteras cuando sea obvio a simple vista.

Lista de alimentos válidos:
${listaPlatos}

Responde ÚNICAMENTE con JSON válido, sin texto adicional, en este formato exacto:
{"items": [{"key": "clave_exacta_de_la_lista", "confianza": "alta|media|baja", "cantidad": 1}, {"opciones": ["clave_variante_1", "clave_variante_2"], "confianza": "media", "cantidad": 1}]}
Cada item tiene "key" (caso normal) O "opciones" (caso ambiguo), nunca ambos.`;

    const modelo = "claude-sonnet-5";

    // Si la IA falla (o no se puede conectar), se devuelve la foto reservada
    // para que el alumno no la pierda.
    let data: any;
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: modelo,
          max_tokens: 500,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: tipoImagen, data: imagenBase64 } },
              { type: "text", text: prompt },
            ],
          }],
        }),
      });
      if (!resp.ok) {
        console.error("Error de Anthropic:", resp.status, await resp.text());
        await devolverFoto();
        return json({ error: "No se pudo procesar la foto. Intenta de nuevo." }, 502);
      }
      data = await resp.json();
    } catch (e) {
      console.error("Sin conexión con Anthropic:", (e as Error)?.message);
      await devolverFoto();
      return json({ error: "No se pudo procesar la foto. Intenta de nuevo." }, 502);
    }

    const textoRespuesta = (data.content || []).map((c: any) => c.text || "").join("");
    console.log("Respuesta cruda de la IA:", textoRespuesta);
    let items: { key: string; confianza: string; cantidad?: number; opciones?: string[] }[] = [];
    try {
      const limpio = textoRespuesta.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(limpio);
      items = Array.isArray(parsed.items) ? parsed.items : [];
    } catch {
      items = [];
    }

    items = items.map((it) => ({
      ...it,
      cantidad: Math.max(1, Math.min(12, Math.round(Number(it.cantidad)) || 1)),
    }));

    const porNombre = new Map<string, number>();
    for (const a of alimentosValidos) porNombre.set(a.name, (porNombre.get(a.name) || 0) + 1);
    const clavesValidas = new Map<string, string>();
    for (const a of alimentosValidos) {
      clavesValidas.set(a.key, a.key);
      if (porNombre.get(a.name) === 1 && !clavesValidas.has(a.name)) clavesValidas.set(a.name, a.key);
    }
    items = items
      .map((it) => {
        if (Array.isArray((it as any).opciones)) {
          const validas = [...new Set((it as any).opciones.map((k: string) => clavesValidas.get(k)).filter(Boolean))];
          return validas.length >= 2 ? { ...it, key: "", opciones: validas } : null;
        }
        return { ...it, key: clavesValidas.get(it.key) || "" };
      })
      .filter((it) => it !== null && (it.key !== "" || Array.isArray((it as any).opciones))) as any[];

    // La foto ya quedó contada al reservarla, antes de llamar a la IA.
    return json({ items, usadas, limite, tieneAddOn, hasta: alumno.reconocimiento_foto_hasta || null });
  } catch (e) {
    console.error("reconocer-comida:", (e as Error)?.message);
    return json({ error: "Error inesperado." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "content-type": "application/json" },
  });
}
