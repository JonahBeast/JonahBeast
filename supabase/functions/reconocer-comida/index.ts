// Edge Function: reconocer-comida
// Recibe una foto de comida y devuelve 1-4 platos identificados, con los
// gramos que la IA calcula mirando el plato y si se ve frito o saltado,
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
// Bienvenida: los primeros 3 días de la prueba gratis, 3 fotos por día
// (desayuno, almuerzo y cena), para que el alumno viva la función completa
// justo cuando decide si se queda. Desde el día 4 vuelve a 5 por semana, y
// quien quiera más compra Reconocimiento Inteligente.
const LIMITE_BIENVENIDA_DIARIO = 3;
const DIAS_BIENVENIDA = 3;

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

// Días entre dos fechas YYYY-MM-DD (b - a).
function diasEntre(a: string, b: string) {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
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

    const { imagenBase64, mimeType, alimentos, consulta, accion, codigo, producto } = await req.json();

    // Solo alumnos con la membresía vigente (habilitados y sin vencer, o
    // sin fecha de vencimiento), igual que en la app.
    const { data: alumno } = await supabase
      .from("alumnos")
      .select("enabled, plan, fecha_inicio, fecha_vencimiento, reconocimiento_foto_desde, reconocimiento_foto_hasta")
      .eq("username", username)
      .maybeSingle();
    if (!alumno || !alumno.enabled || (alumno.fecha_vencimiento && alumno.fecha_vencimiento < fechaLima())) {
      return json({ error: "Tu membresía no está activa. Renueva tu plan para usar el reconocimiento por foto." }, 403);
    }

    const hoy = new Date();
    const hoyLima = fechaLima(hoy);
    const tieneAddOn = !!(alumno.reconocimiento_foto_hasta && new Date(alumno.reconocimiento_foto_hasta + "T23:59:59Z") > hoy);
    const esPrueba = alumno.plan === "trial" || alumno.plan === "prueba";
    const diaPrueba = esPrueba && alumno.fecha_inicio ? diasEntre(alumno.fecha_inicio, hoyLima) + 1 : null;
    const enBienvenida = !tieneAddOn && diaPrueba !== null && diaPrueba >= 1 && diaPrueba <= DIAS_BIENVENIDA;
    const tipo = tieneAddOn ? "addon" : enBienvenida ? "bienvenida" : "semanal";
    const periodo = tieneAddOn ? periodoDesdeActivacion(alumno.reconocimiento_foto_desde, hoy)
      : enBienvenida ? `bienvenida-${hoyLima}` : numeroDeSemanaISO(hoy);
    const limite = tieneAddOn ? LIMITE_PAGO_MENSUAL : enBienvenida ? LIMITE_BIENVENIDA_DIARIO : LIMITE_GRATIS_SEMANAL;
    // Días de bienvenida que quedan DESPUÉS de hoy (0 = hoy es el último).
    const diasBienvenidaRestantes = enBienvenida ? DIAS_BIENVENIDA - (diaPrueba as number) : 0;
    const cupo = { tipo, limite, tieneAddOn, diasBienvenidaRestantes, hasta: alumno.reconocimiento_foto_hasta || null };

    // Código de barras (ver "PRODUCTOS" al final del archivo):
    // - buscar_codigo: tabla productos → Open Food Facts. No gasta fotos.
    // - leer_etiqueta: la IA lee la tabla nutricional de la foto. Gasta
    //   una foto del cupo, igual que reconocer un plato.
    // - guardar_producto: guarda lo leído (con el nombre que confirma el
    //   alumno) para que el siguiente que lo escanee lo encuentre.
    if (accion === "buscar_codigo") return json(await buscarProducto(supabase, codigo));
    if (accion === "guardar_producto") return json(await guardarProducto(supabase, codigo, producto, username));
    if (accion === "leer_etiqueta") {
      if (typeof imagenBase64 !== "string" || !imagenBase64) return json({ error: "Falta la foto de la etiqueta." }, 400);
      if (imagenBase64.length > MAX_IMAGEN_BASE64) return json({ error: "La foto es demasiado pesada." }, 413);
      const { data: usadasEtiqueta, error: errEtiqueta } = await supabase.rpc("reservar_foto_reconocimiento", {
        p_username: username, p_periodo: periodo, p_limite: limite,
      });
      if (errEtiqueta) return json({ error: "No se pudo procesar la foto. Intenta de nuevo." }, 500);
      if (usadasEtiqueta === null || usadasEtiqueta === undefined) return json({ error: "limite_alcanzado", ...cupo, usadas: limite }, 200);
      const leida = await leerEtiqueta(imagenBase64, TIPOS_IMAGEN.includes(mimeType) ? mimeType : "image/jpeg");
      if (!leida.ok) {
        // Si la IA falló, la foto se devuelve; si la etiqueta no se leía, cuenta.
        if (leida.fallo) await supabase.rpc("devolver_foto_reconocimiento", { p_username: username, p_periodo: periodo });
        return json({ error: leida.error, ...cupo, usadas: leida.fallo ? usadasEtiqueta - 1 : usadasEtiqueta }, leida.fallo ? 502 : 200);
      }
      return json({ producto: leida.producto, ...cupo, usadas: usadasEtiqueta });
    }

    // Consulta: solo dice cuántas fotos le quedan, sin usar la IA.
    if (consulta === true) {
      const { data: fila } = await supabase.from("fotos_reconocimiento_uso")
        .select("usadas").eq("username", username).eq("periodo", periodo).maybeSingle();
      return json({ ...cupo, usadas: Number(fila?.usadas) || 0 });
    }

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
      return json({ error: "limite_alcanzado", ...cupo, usadas: limite }, 200);
    }
    const devolverFoto = () => supabase.rpc("devolver_foto_reconocimiento", { p_username: username, p_periodo: periodo });

    // Solo la clave (ej. "Pollo pechuga (Cocida)"): ya incluye el nombre, así
    // la lista pesa casi la mitad que mandando "clave :: nombre".
    const listaPlatos = [...new Set(alimentosValidos.map((a: any) => a.key))].join("\n");

    const prompt = `Eres un identificador de platos de comida peruana. Te doy una foto de una mesa/plato de comida y una lista de alimentos válidos (una clave por línea).

Identifica TODOS los alimentos distintos visibles en la foto que coincidan con algo de esta lista. Si hay varios (ej. café + pan + jugo), devuélvelos todos por separado. Si no reconoces nada de la lista con confianza razonable, devuelve una lista vacía — NUNCA inventes una clave que no esté en la lista.

Fíjate bien en la FORMA de cada alimento, no solo en el color de la salsa que lo cubre — una salsa roja/marrón puede cubrir fideos, papa o carne por igual, y son formas muy distintas: los fideos/tallarines son alargados y delgados, la papa son trozos irregulares más gruesos, la carne tiene textura fibrosa o en cubos. No asumas que un alimento es "papa" solo porque hay trozos con salsa oscura si la forma es claramente alargada como fideo.

PLATOS COMBINADOS: si la foto muestra un plato peruano conocido que está en la lista como plato preparado, usa ESE plato en vez de separarlo en sus partes. En particular:
- Fideos/tallarines con una salsa VERDE encima o mezclada (albahaca/espinaca) son "Tallarines verdes", aunque la salsa esté servida aparte sobre los fideos. NO es ocopa.
- Fideos con salsa ROJA de tomate son "Tallarines rojos" (con pollo o con carne molida, según lo que se vea).
- La ocopa y la huancaína son salsas que se sirven sobre PAPA sancochada (en rodajas), no sobre fideos; la huancaína es amarilla y la ocopa verde-amarillenta y espesa.
En estos casos, los gramos del plato combinado son los de los fideos más la salsa juntos. Lo que venga al costado (un bistec, una presa, un huevo) va aparte.

Si dos o más alimentos de la lista representan la MISMA comida visualmente pero se diferencian por algo que la foto no puede mostrar (ej. "con azúcar" vs "sin azúcar" en una bebida, cuando no se ve el azúcar siendo servida o disuelta), NO elijas uno solo adivinando — en vez de "key", incluye "opciones" con las claves de todas las variantes plausibles (2 o más), y usa confianza "media". Usa "opciones" solo para este caso de ambigüedad real; si no hay duda, usa "key" normal como siempre.

Para cada alimento, si es de un tipo que se cuenta por pieza entera y visible (ej. huevos, panes, frutas enteras), cuenta cuántas unidades ves e inclúyelo en "cantidad". Cuenta SOLO piezas que veas completas o casi completas — si una pieza está parcialmente tapada por otro alimento, cortada por el borde del plato o de la foto, o solo se le ve un pedazo, sigue siendo UNA pieza, no la cuentes dos veces ni la confundas con otra unidad separada. Si no aplica o no estás seguro del conteo, usa "cantidad": 1.

Para cada alimento, calcula también cuántos GRAMOS de ese alimento hay servidos en la foto ("gramos"; en bebidas, los ml del vaso o taza). Usa como referencia el tamaño del plato (un plato llano peruano mide unos 26 cm; uno de postre, unos 20 cm), los cubiertos, el vaso o la mano, y piensa en el volumen: altura y superficie que ocupa. Referencias: una taza de arroz cocido ≈ 160 g y ocupa más o menos un puño; un filete o bistec del tamaño de la palma ≈ 120 g; una presa de pollo mediana ≈ 130 g; un vaso ≈ 250 ml. Si un alimento se cuenta por piezas, da los gramos de todas las piezas juntas. Da un número redondo, sin rangos.
Cuidado con dos errores comunes que hacen calcular DE MÁS:
- Carnes planas (bistec, milanesa, filete de pollo apanado): en casa peruana suelen ser DELGADAS (0.5–1 cm). Un bistec casero delgado pesa 100–150 g AUNQUE cubra medio plato: una lámina delgada de carne se extiende mucho y pesa poco. Da más de 150 g solo si la carne se ve claramente gruesa (1.5 cm o más) o si hay dos piezas o más.
- Bistec vs. churrasco: si la carne de res es una lámina delgada, es "bistec", no "churrasco". El churrasco es un corte GRUESO (1.5–2 cm) con borde de grasa visible; úsalo solo si se ve ese grosor.
- Fideos, tallarines y ensaladas sueltas: si están esparcidos en capa delgada por el plato, pesan menos de lo que parece; un plato llano con fideos esparcidos suele tener 100–150 g. Cuenta la altura del montón, no solo la superficie.

Marca "aceite": true si el alimento se ve frito, saltado, apanado o brillante de aceite; si no, false.

Si en la foto se ve con claridad un plato o alimento que NO está en la lista (ni nada equivalente), escribe su nombre común en español peruano en "no_encontrados" (ej. "Pollo a la olla"), máximo 3, nombres cortos sin marcas ni cantidades. Si todo lo visible está en la lista, deja "no_encontrados" vacío.

Lista de alimentos válidos:
${listaPlatos}

Responde ÚNICAMENTE con JSON válido, sin texto adicional, en este formato exacto:
{"items": [{"key": "clave_exacta_de_la_lista", "confianza": "alta|media|baja", "cantidad": 1, "gramos": 180, "aceite": false}, {"opciones": ["clave_variante_1", "clave_variante_2"], "confianza": "media", "cantidad": 1, "gramos": 250, "aceite": false}], "no_encontrados": []}
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
          max_tokens: 800,
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
    let items: { key: string; confianza: string; cantidad?: number; gramos?: number | null; aceite?: boolean; opciones?: string[] }[] = [];
    let noEncontrados: string[] = [];
    try {
      const limpio = textoRespuesta.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(limpio);
      items = Array.isArray(parsed.items) ? parsed.items : [];
      const vistos = new Set<string>();
      noEncontrados = (Array.isArray(parsed.no_encontrados) ? parsed.no_encontrados : [])
        .filter((n: unknown) => typeof n === "string")
        .map((n: string) => n.replace(/\s+/g, " ").trim().slice(0, 80))
        .filter((n: string) => n.length > 0 && !vistos.has(n.toLowerCase()) && vistos.add(n.toLowerCase()))
        .slice(0, 3);
    } catch {
      items = [];
    }

    // Gramos: número entre 5 y 1500 (lo demás se descarta y la app usa
    // la porción normal). La app además lo acota a 0.3–3 veces la porción
    // normal de cada alimento.
    items = items.map((it) => {
      const g = Math.round(Number(it.gramos));
      return {
        ...it,
        cantidad: Math.max(1, Math.min(12, Math.round(Number(it.cantidad)) || 1)),
        gramos: Number.isFinite(g) && g >= 5 && g <= 1500 ? g : null,
        aceite: it.aceite === true,
      };
    });

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

    // Platos que la IA vio pero no tenemos: quedan anotados para que el
    // admin los vea en su panel y los agregue. Si falla, no afecta al alumno.
    if (noEncontrados.length) {
      const { error: errNo } = await supabase.from("platos_no_encontrados")
        .insert(noEncontrados.map((nombre) => ({ username, nombre })));
      if (errNo) console.error("No se pudo anotar platos no encontrados:", errNo.message);
    }

    // La foto ya quedó contada al reservarla, antes de llamar a la IA.
    return json({ items, noEncontrados, ...cupo, usadas });
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

/* ------------------------------------------------------------------ */
/* PRODUCTOS (código de barras)                                         */
/* Valores siempre por 100 g (o 100 ml).                                */
/* ------------------------------------------------------------------ */

const CODIGO_VALIDO = /^[0-9]{6,14}$/;

function numeroEn(v: unknown, max: number): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= max ? Math.round(n * 10) / 10 : null;
}
function textoCorto(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

// Lo que sale de la base, de Open Food Facts o de la etiqueta, en un solo formato.
function productoLimpio(p: any) {
  const kcal = numeroEn(p?.kcal, 900);
  const proteina = numeroEn(p?.proteina, 100);
  const carbos = numeroEn(p?.carbos, 100);
  const grasa = numeroEn(p?.grasa, 100);
  if (kcal === null || proteina === null || carbos === null || grasa === null) return null;
  const porcion = numeroEn(p?.porcion_g, 2000);
  return {
    nombre: textoCorto(p?.nombre, 80), marca: textoCorto(p?.marca, 40) || null,
    kcal, proteina, carbos, grasa, fibra: numeroEn(p?.fibra, 100) ?? 0,
    porcion_g: porcion && porcion > 0 ? porcion : null,
  };
}

async function buscarProducto(supabase: any, codigo: unknown) {
  const cod = String(codigo || "").replace(/\D/g, "");
  if (!CODIGO_VALIDO.test(cod)) return { encontrado: false, error: "Ese código no parece válido." };

  const { data: guardado } = await supabase.from("productos").select("*").eq("codigo", cod).maybeSingle();
  if (guardado) {
    await supabase.from("productos").update({ veces_usado: (guardado.veces_usado || 0) + 1 }).eq("codigo", cod);
    return { encontrado: true, producto: guardado };
  }

  // Open Food Facts: base mundial y gratuita. Solo sirve si trae calorías y
  // los tres macros por 100 g.
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${cod}.json?fields=product_name,product_name_es,brands,nutriments,serving_quantity`, {
      headers: { "User-Agent": "JonahBeastFuel/1.0 (https://jonahbeast.com)" },
      signal: AbortSignal.timeout(6000),
    });
    if (r.ok) {
      const d = await r.json();
      const n = d?.product?.nutriments || {};
      const kcal = n["energy-kcal_100g"] ?? (n["energy_100g"] !== undefined ? Number(n["energy_100g"]) / 4.184 : undefined);
      const p = productoLimpio({
        nombre: d?.product?.product_name_es || d?.product?.product_name,
        marca: String(d?.product?.brands || "").split(",")[0],
        kcal, proteina: n.proteins_100g, carbos: n.carbohydrates_100g, grasa: n.fat_100g, fibra: n.fiber_100g,
        porcion_g: d?.product?.serving_quantity,
      });
      if (d?.status === 1 && p && p.nombre) {
        const fila = { codigo: cod, ...p, nombre: await nombreUnico(supabase, cod, p.nombre, p.marca), fuente: "open_food_facts", veces_usado: 1 };
        const { data: nuevo, error } = await supabase.from("productos").upsert(fila).select("*").single();
        if (error) console.error("No se pudo guardar el producto de Open Food Facts:", error.message);
        return { encontrado: true, producto: nuevo || fila };
      }
    }
  } catch (e) {
    console.error("Open Food Facts no respondió:", (e as Error)?.message);
  }
  return { encontrado: false };
}

// Si ya hay otro producto con el mismo nombre y marca (otra presentación),
// se le agregan los últimos dígitos del código para que en la app no se
// confundan.
async function nombreUnico(supabase: any, codigo: string, nombre: string, marca: string | null) {
  let q = supabase.from("productos").select("codigo").eq("nombre", nombre).neq("codigo", codigo).limit(1);
  q = marca ? q.eq("marca", marca) : q.is("marca", null);
  const { data } = await q;
  return data && data.length ? `${nombre.slice(0, 72)} · ${codigo.slice(-4)}` : nombre;
}

async function guardarProducto(supabase: any, codigo: unknown, producto: unknown, username: string) {
  const cod = String(codigo || "").replace(/\D/g, "");
  if (!CODIGO_VALIDO.test(cod)) return { error: "Ese código no parece válido." };
  const p = productoLimpio(producto);
  if (!p || !p.nombre) return { error: "Revisa el nombre y los valores del producto." };
  const { data: existe } = await supabase.from("productos").select("*").eq("codigo", cod).maybeSingle();
  if (existe) return { producto: existe }; // otro alumno lo guardó antes: se usa ese
  const fila = { codigo: cod, ...p, nombre: await nombreUnico(supabase, cod, p.nombre, p.marca), fuente: "etiqueta", creado_por: username, veces_usado: 1 };
  const { data, error } = await supabase.from("productos").insert(fila).select("*").single();
  if (error) {
    console.error("No se pudo guardar el producto:", error.message);
    return { error: "No se pudo guardar el producto. Intenta de nuevo." };
  }
  return { producto: data };
}

async function leerEtiqueta(imagenBase64: string, tipoImagen: string): Promise<{ ok: true; producto: any } | { ok: false; error: string; fallo?: boolean }> {
  const prompt = `Esta es la foto de la TABLA NUTRICIONAL (información nutricional) de un producto empacado, probablemente peruano.

Lee los valores y devuélvelos POR 100 g (o por 100 ml si es líquido). Si la tabla solo trae valores "por porción", conviértelos a 100 g usando el tamaño de la porción que dice la tabla (ej. porción 30 g con 120 kcal → 400 kcal por 100 g).
- "kcal": energía en kilocalorías (si solo viene en kJ, divide entre 4.184).
- "carbos": carbohidratos totales. "grasa": grasa total. "fibra": fibra (0 si no aparece).
- "porcion_g": el tamaño de UNA porción en gramos o ml según la tabla (null si no aparece).
- "nombre" y "marca": solo si se leen en la foto; si no, cadena vacía. Nombre corto en español, sin la marca ni el peso (ej. "Yogurt bebible sabor fresa").
Si la foto no es una tabla nutricional o no se puede leer con seguridad, responde {"legible": false}.

Responde ÚNICAMENTE con JSON válido, sin texto adicional:
{"legible": true, "nombre": "", "marca": "", "porcion_g": 30, "kcal": 400, "proteina": 8, "carbos": 70, "grasa": 10, "fibra": 3}`;
  let data: any;
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 400,
        messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: tipoImagen, data: imagenBase64 } },
          { type: "text", text: prompt },
        ] }],
      }),
    });
    if (!resp.ok) {
      console.error("Error de Anthropic (etiqueta):", resp.status, await resp.text());
      return { ok: false, fallo: true, error: "No se pudo leer la etiqueta. Intenta de nuevo." };
    }
    data = await resp.json();
  } catch (e) {
    console.error("Sin conexión con Anthropic (etiqueta):", (e as Error)?.message);
    return { ok: false, fallo: true, error: "No se pudo leer la etiqueta. Intenta de nuevo." };
  }
  const texto = (data.content || []).map((c: any) => c.text || "").join("");
  console.log("Etiqueta leída por la IA:", texto);
  try {
    const parsed = JSON.parse(texto.replace(/```json|```/g, "").trim());
    if (parsed?.legible === false) return { ok: false, error: "No pudimos leer la tabla nutricional. Toma la foto más cerca, con buena luz y sin reflejos." };
    const p = productoLimpio(parsed);
    if (!p) return { ok: false, error: "No pudimos leer bien los valores. Toma la foto más cerca, con buena luz y sin reflejos." };
    return { ok: true, producto: p };
  } catch {
    return { ok: false, error: "No pudimos leer la tabla nutricional. Intenta con otra foto." };
  }
}
