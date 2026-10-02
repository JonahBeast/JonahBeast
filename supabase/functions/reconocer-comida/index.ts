// Edge Function: reconocer-comida
// Recibe una foto de comida y devuelve 1-4 platos identificados, con los
// gramos que la IA calcula mirando el plato y si se ve frito o saltado,
// buscando SOLO dentro de la lista de nombres que le mandamos
// (tu propia base de datos), para que nunca invente un plato
// que no exista en Jonah Beast Fuel.
//
// Mismo modelo (Sonnet 5.5) para todos los alumnos -- dar peor calidad a
// quien paga que a quien prueba gratis sería backwards.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
// IA que lee las fotos (plato, etiqueta y código de barras).
const MODELO_FOTOS = "claude-sonnet-5-5";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = (Deno.env.get("CLAVE_SERVICIO") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!;

// Premium (un plan pagado vigente, o la prueba de Premium mientras dura):
// foto inteligente en todas las comidas, 5 por día (desayuno, almuerzo,
// cena y 2 snacks). La app no le muestra un contador: el tope solo existe
// para cuidar costos.
const LIMITE_PLAN_DIARIO = 5;
// Versión gratis (la prueba o el plan ya vencieron, pero la cuenta sigue
// habilitada): 3 fotos por semana, se renuevan cada lunes.
const LIMITE_GRATIS_SEMANAL = 3;
const LIMITE_SUGERENCIAS_GRATIS = 3; // "¿Qué puedo comer?" en la versión gratis, por semana
// Leer la tabla nutricional de un producto NO usa las fotos de comida:
// tiene su propio tope diario. El producto queda guardado para todos.
const LIMITE_ETIQUETAS_DIARIO = 5;
// Cuentas sin tope de fotos (ni de etiquetas), para las pruebas de Jonah.
// Las fotos se siguen contando y el costo queda en ia_uso como siempre.
const FOTOS_SIN_LIMITE = new Set(["martin"]);
const LIMITE_SIN_TOPE = 100000;
// Prueba sin cuenta (la portada): quien llega de un anuncio le toma foto a
// su plato y ve sus calorías antes de registrarse. Topes para que no se
// abuse: 1 foto al día por visitante, 3 por conexión (una casa u oficina
// comparte la misma) y 100 al día en total (unos US$3 como máximo).
// Solo reconoce el plato: nada del alumno (frecuentes, correcciones,
// alimentos propios), nada de códigos ni etiquetas.
const DEMO_POR_VISITANTE = 1;
const DEMO_POR_CONEXION = 3;
const DEMO_TOTAL_DIARIO = 100;

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

    const cuerpo = await req.json();
    const { imagenBase64, mimeType, alimentos, consulta, accion, codigo, producto } = cuerpo;
    const sesion = await usuarioDeLaSesion(supabase, req);
    if (!sesion && cuerpo?.demo !== true) return json({ error: "Inicia sesión para usar el reconocimiento por foto." }, 401);
    if (!sesion) return await fotoDePrueba(supabase, req, cuerpo);
    const username = sesion;
    const personales = cuerpo.personales;
    return await fotoDeAlumno(supabase, username, { imagenBase64, mimeType, alimentos, personales, consulta, accion, codigo, producto });
  } catch (e) {
    console.error("reconocer-comida:", (e as Error)?.message);
    return json({ error: "Error inesperado." }, 500);
  }
});

// Foto de un alumno con sesión: su cupo, sus alimentos, sus correcciones.
async function fotoDeAlumno(supabase: any, username: string, { imagenBase64, mimeType, alimentos, personales, consulta, accion, codigo, producto }: any) {
  try {
    // Cuenta habilitada: con el plan (o la prueba) vigente es Premium; si ya
    // venció, sigue en la versión gratis. Solo una cuenta deshabilitada por
    // el admin queda fuera.
    const { data: alumno } = await supabase
      .from("alumnos")
      .select("enabled, plan, fecha_vencimiento, reconocimiento_foto_hasta")
      .eq("username", username)
      .maybeSingle();
    if (!alumno || !alumno.enabled) {
      return json({ error: "Tu cuenta no está activa. Escríbenos para más información." }, 403);
    }

    const hoy = new Date();
    const hoyLima = fechaLima(hoy);
    const tieneAddOn = !!(alumno.reconocimiento_foto_hasta && new Date(alumno.reconocimiento_foto_hasta + "T23:59:59Z") > hoy);
    const premium = !alumno.fecha_vencimiento || alumno.fecha_vencimiento >= hoyLima || tieneAddOn;
    const sinLimite = FOTOS_SIN_LIMITE.has(username);
    const tipo = sinLimite ? "ilimitado" : premium ? "diario" : "gratis";
    const periodo = sinLimite || premium ? `dia-${hoyLima}` : numeroDeSemanaISO(hoy);
    const limite = sinLimite ? LIMITE_SIN_TOPE : premium ? LIMITE_PLAN_DIARIO : LIMITE_GRATIS_SEMANAL;
    const cupo = { tipo, limite, tieneAddOn, hasta: alumno.reconocimiento_foto_hasta || null };

    // Código de barras (ver "PRODUCTOS" al final del archivo):
    // - buscar_codigo: tabla productos → Open Food Facts. No gasta fotos.
    // - leer_etiqueta: la IA lee la tabla nutricional de la foto. No gasta
    //   fotos de comida: tiene su propio tope diario (LIMITE_ETIQUETAS_DIARIO).
    // - guardar_producto: guarda lo leído (con el nombre que confirma el
    //   alumno) para que el siguiente que lo escanee lo encuentre.
    if (accion === "buscar_codigo") return json(await buscarProducto(supabase, codigo));
    // Plan B de "Tomar foto al código": si las barras no se leen, la IA lee
    // los números impresos debajo. No gasta fotos (es una lectura corta).
    if (accion === "leer_codigo_foto") {
      if (typeof imagenBase64 !== "string" || !imagenBase64) return json({ error: "Falta la foto del código." }, 400);
      if (imagenBase64.length > MAX_IMAGEN_BASE64) return json({ error: "La foto es demasiado pesada." }, 413);
      return json({ codigo: await leerNumerosCodigo(imagenBase64, TIPOS_IMAGEN.includes(mimeType) ? mimeType : "image/jpeg", (usage) => anotarUsoIA(supabase, { tipo: "codigo", username, modelo: MODELO_FOTOS, usage })) });
    }
    if (accion === "guardar_producto") return json(await guardarProducto(supabase, codigo, producto, username));
    if (accion === "leer_etiqueta") {
      // Leer la tabla nutricional con IA es Premium.
      if (!premium && !sinLimite) return json({ error: "premium", funcion: "etiqueta" }, 200);
      if (typeof imagenBase64 !== "string" || !imagenBase64) return json({ error: "Falta la foto de la etiqueta." }, 400);
      if (imagenBase64.length > MAX_IMAGEN_BASE64) return json({ error: "La foto es demasiado pesada." }, 413);
      const periodoEtiqueta = `etiqueta-${hoyLima}`;
      const { data: usadasEtiqueta, error: errEtiqueta } = await supabase.rpc("reservar_foto_reconocimiento", {
        p_username: username, p_periodo: periodoEtiqueta, p_limite: sinLimite ? LIMITE_SIN_TOPE : LIMITE_ETIQUETAS_DIARIO,
      });
      if (errEtiqueta) return json({ error: "No se pudo procesar la foto. Intenta de nuevo." }, 500);
      if (usadasEtiqueta === null || usadasEtiqueta === undefined) return json({ error: "limite_alcanzado", limite: LIMITE_ETIQUETAS_DIARIO }, 200);
      const leida = await leerEtiqueta(imagenBase64, TIPOS_IMAGEN.includes(mimeType) ? mimeType : "image/jpeg", (usage) => anotarUsoIA(supabase, { tipo: "etiqueta", username, modelo: MODELO_FOTOS, usage }));
      if (!leida.ok) {
        // Si la IA falló, la lectura se devuelve; si la etiqueta no se leía, cuenta.
        if (leida.fallo) await supabase.rpc("devolver_foto_reconocimiento", { p_username: username, p_periodo: periodoEtiqueta });
        return json({ error: leida.error }, leida.fallo ? 502 : 200);
      }
      return json({ producto: leida.producto });
    }

    // "¿Qué puedo comer?": no usa IA, pero en la versión gratis se puede
    // abrir 3 veces por semana. Se cuenta en la misma tabla de cupos, con
    // su propio periodo. "consultar" solo dice cuántas le quedan; "usar"
    // descuenta una (si ya no quedan, responde limite_alcanzado).
    if (accion === "sugerencia_consultar" || accion === "sugerencia_usar") {
      if (premium || sinLimite) return json({ premium: true });
      const periodoSug = `sugerencia-${numeroDeSemanaISO(hoy)}`;
      if (accion === "sugerencia_consultar") {
        const { data: fila } = await supabase.from("fotos_reconocimiento_uso")
          .select("usadas").eq("username", username).eq("periodo", periodoSug).maybeSingle();
        return json({ premium: false, limite: LIMITE_SUGERENCIAS_GRATIS, usadas: Number(fila?.usadas) || 0 });
      }
      const { data: usadasSug, error: errSug } = await supabase.rpc("reservar_foto_reconocimiento", {
        p_username: username, p_periodo: periodoSug, p_limite: LIMITE_SUGERENCIAS_GRATIS,
      });
      if (errSug) return json({ error: "No se pudo revisar. Intenta de nuevo." }, 500);
      if (usadasSug === null || usadasSug === undefined) {
        return json({ premium: false, error: "limite_alcanzado", limite: LIMITE_SUGERENCIAS_GRATIS, usadas: LIMITE_SUGERENCIAS_GRATIS });
      }
      return json({ premium: false, limite: LIMITE_SUGERENCIAS_GRATIS, usadas: Number(usadasSug) });
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
    const limpiarLista = (lista: unknown) => (Array.isArray(lista) ? lista : [])
      .filter((a: any) => a && typeof a.key === "string" && typeof a.name === "string" && a.key && a.name)
      .map((a: any) => ({ key: a.key.slice(0, MAX_TEXTO_ALIMENTO), name: a.name.slice(0, MAX_TEXTO_ALIMENTO) }));
    // "alimentos" es la lista común (igual para todos los alumnos) y
    // "personales" los alimentos propios de este alumno. Van separados para
    // que la lista común quede en caché (ver más abajo).
    const alimentosComunes = limpiarLista(alimentos);
    const alimentosPersonales = limpiarLista(personales).slice(0, MAX_ALIMENTOS);
    const alimentosValidos = [...alimentosPersonales, ...alimentosComunes];
    if (!alimentosComunes.length) return json({ error: "Faltan datos (alimentos)." }, 400);

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

    // Lo que este alumno registró más en las últimas 2 semanas: ayuda a la
    // IA a desempatar entre alimentos que se ven iguales en foto (ej. pollo
    // y pavita). Va en el mensaje, no en las instrucciones, para no romper
    // la caché que comparten todas las fotos.
    const clavesOk = new Set(alimentosValidos.map((a: any) => a.key));
    const [frecuentes, corregidos, deTodos, porciones] = await Promise.all([
      alimentosFrecuentes(supabase, username, clavesOk),
      correccionesDelAlumno(supabase, username, clavesOk),
      correccionesDeTodos(supabase, clavesOk),
      porcionesDelAlumno(supabase, username, clavesOk),
    ]);

    const r = await reconocerPlato(supabase, { imagenBase64, tipoImagen, alimentosComunes, alimentosPersonales, frecuentes, corregidos, deTodos, porciones, usuarioUso: username });
    if (!r) {
      await devolverFoto();
      return json({ error: "No se pudo procesar la foto. Intenta de nuevo." }, 502);
    }
    const { items, noEncontrados, alternativas } = r;

    // Platos que la IA vio pero no tenemos: quedan anotados para que el
    // admin los vea en su panel y los agregue. Si falla, no afecta al alumno.
    if (noEncontrados.length) {
      const { error: errNo } = await supabase.from("platos_no_encontrados")
        .insert(noEncontrados.map((nombre) => ({ username, nombre })));
      if (errNo) console.error("No se pudo anotar platos no encontrados:", errNo.message);
    }

    // La foto ya quedó contada al reservarla, antes de llamar a la IA.
    return json({ items, noEncontrados, alternativas, ...cupo, usadas });
  } catch (e) {
    console.error("reconocer-comida:", (e as Error)?.message);
    return json({ error: "Error inesperado." }, 500);
  }
}

// Reconoce los alimentos de la foto con la IA, solo dentro de la lista que
// se le manda. Devuelve null si la IA falló (quien llama devuelve la foto).
async function reconocerPlato(supabase: any, { imagenBase64, tipoImagen, alimentosComunes, alimentosPersonales, frecuentes, corregidos, deTodos, porciones = [], usuarioUso }: {
  imagenBase64: string; tipoImagen: string; alimentosComunes: any[]; alimentosPersonales: any[]; frecuentes: string[]; corregidos: string[];
  deTodos: CorreccionesDeTodos; porciones?: string[]; usuarioUso: string;
}): Promise<{ items: any[]; noEncontrados: string[]; alternativas: Record<string, string[]> } | null> {
  const alimentosValidos = [...alimentosPersonales, ...alimentosComunes];
  // Solo la clave (ej. "Pollo pechuga (Cocida)"): ya incluye el nombre, así
  // la lista pesa casi la mitad que mandando "clave :: nombre".
  const listaPlatos = [...new Set(alimentosComunes.map((a: any) => a.key))].join("\n");
  const clavesComunes = new Set(alimentosComunes.map((a: any) => a.key));
  const listaPersonales = [...new Set(alimentosPersonales.map((a: any) => a.key))].filter((k) => !clavesComunes.has(k)).join("\n");


  const prompt = `Eres un identificador de platos de comida peruana. Te doy una foto de una mesa/plato de comida y una lista de alimentos válidos (una clave por línea).

Identifica TODOS los alimentos distintos visibles en la foto que coincidan con algo de esta lista. Si hay varios (ej. café + pan + jugo), devuélvelos todos por separado. Si no reconoces nada de la lista con confianza razonable, devuelve una lista vacía — NUNCA inventes una clave que no esté en la lista.

Fíjate bien en la FORMA de cada alimento, no solo en el color de la salsa que lo cubre — una salsa roja/marrón puede cubrir fideos, papa o carne por igual, y son formas muy distintas: los fideos/tallarines son alargados y delgados, la papa son trozos irregulares más gruesos, la carne tiene textura fibrosa o en cubos. No asumas que un alimento es "papa" solo porque hay trozos con salsa oscura si la forma es claramente alargada como fideo.

PLATOS COMBINADOS: si la foto muestra un plato peruano conocido que está en la lista como plato preparado, usa ESE plato en vez de separarlo en sus partes. En particular:
- Fideos/tallarines con una salsa VERDE encima o mezclada (albahaca/espinaca) son "Tallarines verdes", aunque la salsa esté servida aparte sobre los fideos. NO es ocopa.
- Fideos con salsa ROJA de tomate son "Tallarines rojos" (con pollo o con carne molida, según lo que se vea).
- La ocopa y la huancaína son salsas que se sirven sobre PAPA sancochada (en rodajas), no sobre fideos; la huancaína es amarilla y la ocopa verde-amarillenta y espesa.
En estos casos, los gramos del plato combinado son los de los fideos más la salsa juntos. Lo que venga al costado (un bistec, una presa, un huevo) va aparte.
- Arroces de color: el arroz VERDE (con culantro) es "Arroz verde"; el arroz AMARILLO con arvejas, zanahoria y choclo es "Arroz amarillo (a la jardinera)"; el arroz ROJIZO o anaranjado con aderezo de ají panca es "Arroz aderezado (con ají panca)"; el arroz DORADO o marrón claro por el sillao, salteado, con pedacitos de huevo revuelto y cebolla china, es chaufa: "Arroz chaufa (solo el arroz)"; la carne del chaufa puede ser pollo, res o chancho (cerdo): si no se distingue, usa "opciones"; si se ven varias carnes mezcladas (chaufa especial), registra cada carne aparte con sus gramos, o "Arroz chaufa especial" si no se pueden separar. Si se ve la presa o la carne junto al arroz (arroz con pollo, con pato, a la jardinera, con chancho, chaufa), registra el arroz y la carne APARTE, cada uno con su clave y sus gramos. Si solo se ve el arroz, sin carne, usa solo la clave del arroz.
- Ensalada rusa vs. ensalada de betarraga: si las verduras picadas (papa, betarraga, zanahoria, vainita) se ven cubiertas o mezcladas con MAYONESA (blanca o rosada y cremosa), es "Ensalada rusa". Si la betarraga se ve sola o con cebolla, suelta y brillante de limón, sin crema, es "Ensalada de betarraga".
- Pollada, pollo frito, broaster y chicharrón de pollo: su clave es SOLO el pollo. Las papas (fritas, doradas o sancochadas), la yuca, el mote, la ensalada y las cremas van aparte, cada una con su propia clave y sus gramos. Una pollada suele ser 1/4 de pollo (≈ 220 g de carne) o 1/8 (≈ 110 g); casi nunca más.
- PECAFIT (restaurante aliado, sus platos están en la lista con "(PECAFIT)" en el nombre): si en la foto se ve el envase, la bolsa, el táper, el sticker o el logo de PECAFIT, usa el plato de PECAFIT que corresponda como UN solo alimento, sin separar sus partes, con los gramos del plato completo. Si NO se ve la marca, no asumas que es de PECAFIT aunque se parezca: registra el plato por partes, como siempre.

Si te paso "Correcciones que este alumno ya hizo", son fotos anteriores donde la IA se equivocó y el alumno eligió el alimento correcto (ej. la IA dijo pollo y era pavita). Si algo de esta foto se parece a lo que la IA dijo antes, lo más probable es que sea lo que el alumno corrigió: úsalo como "key", o en "opciones" en primer lugar si no estás seguro.

Si te paso "Correcciones frecuentes de todos los alumnos", son confusiones que la IA tuvo con fotos de varios alumnos distintos (la IA dijo X → en realidad era Y). Si algo de esta foto se parece a X, no respondas solo X: usa "opciones" con Y en primer lugar y X después, con confianza "media" — salvo que en la foto se vea con claridad cuál de los dos es. Las correcciones de este mismo alumno pesan más que las de todos.

Si te paso "Lo que este alumno suele comer" (lo que más registró en las últimas 2 semanas), úsalo SOLO para desempatar cuando algo de la foto se parece a dos o más alimentos de la lista: prefiere el que el alumno suele comer. Nunca agregues un alimento solo porque está en esa lista: tiene que verse en la foto.

Si dos o más alimentos de la lista representan la MISMA comida visualmente pero se diferencian por algo que la foto no puede mostrar (ej. "con azúcar" vs "sin azúcar" en una bebida, cuando no se ve el azúcar siendo servida o disuelta), NO elijas uno solo adivinando — en vez de "key", incluye "opciones" con las claves de todas las variantes plausibles (2 o más), y usa confianza "media". Usa "opciones" solo para este caso de ambigüedad real; si no hay duda, usa "key" normal como siempre.

Para cada alimento, si es de un tipo que se cuenta por pieza entera y visible (ej. huevos, panes, frutas enteras), cuenta cuántas unidades ves e inclúyelo en "cantidad". Cuenta SOLO piezas que veas completas o casi completas — si una pieza está parcialmente tapada por otro alimento, cortada por el borde del plato o de la foto, o solo se le ve un pedazo, sigue siendo UNA pieza, no la cuentes dos veces ni la confundas con otra unidad separada. Si no aplica o no estás seguro del conteo, usa "cantidad": 1.

Para cada alimento, calcula también cuántos GRAMOS de ese alimento hay servidos en la foto ("gramos"; en bebidas, los ml del vaso o taza). Usa como referencia el tamaño del plato (un plato llano peruano mide unos 26 cm; uno de postre, unos 20 cm), los cubiertos, el vaso o la mano, y piensa en el volumen: altura y superficie que ocupa. Referencias: una taza de arroz cocido ≈ 160 g y ocupa más o menos un puño; un filete o bistec del tamaño de la palma ≈ 120 g; una presa de pollo mediana ≈ 130 g; un vaso ≈ 250 ml. Si un alimento se cuenta por piezas, da los gramos de todas las piezas juntas. Da un número redondo, sin rangos.
Cuidado con estos errores comunes que hacen calcular DE MÁS:
- Arroz: es el alimento que más se calcula de más. Una porción casera servida con cucharón o en molde pesa 120–150 g aunque ocupe un tercio del plato; el arroz cocido es liviano y esponjoso. Da más de 180 g solo si el arroz ocupa claramente la mitad del plato o más, o se ve un montón alto. Si dudas entre dos cantidades, elige la menor.
- Carnes planas (una lámina: bistec, milanesa, filete de pollo apanado): en casa peruana suelen ser DELGADAS (0.5–1 cm). Un bistec casero delgado pesa 100–150 g AUNQUE cubra medio plato: una lámina delgada de carne se extiende mucho y pesa poco. Da más de 150 g solo si la carne se ve claramente gruesa (1.5 cm o más) o si hay dos piezas o más.
- Carne en TROZOS o cubos (chaufa, saltado, guiso, estofado, carne picada en el arroz): la regla de las carnes planas NO aplica. Calcula por el volumen del montón de trozos: un puñado de trozos ≈ 100–120 g; si la carne cubre buena parte del plato o hay muchos trozos, pueden ser 250–350 g. No la achiques por defecto.
- Pavita vs. res: el medallón de pavita (corte del muslo del pavo) es carne oscura en ruedas gruesas y redondas, y se confunde con res. Si la carne tiene forma de medallón redondo y compacto, considera "Pavita muslo (medallón, sin piel)"; si dudas entre pavita y res, usa "opciones" con ambas.
- Pollo vs. pavita vs. res: cocidos (a la olla, al jugo, guisados, con salsa o sin piel a la vista), una pierna o muslo de pollo, un trozo de pavita y un trozo de res se parecen mucho en foto. Si no puedes asegurar cuál es, NO adivines: usa "opciones" con las 2 o 3 claves plausibles (ej. "Pollo pierna (con piel) (Cocida)" y "Pavita muslo (medallón, sin piel) (Cocida)"), con confianza "media". Si una de ellas está en "Lo que este alumno suele comer", ponla PRIMERA en "opciones".
- Pavita a la olla / pavita al jugo / pavita guisada: es carne de pavita (muslo) cocinada en su salsa. Registra la carne como "Pavita muslo (medallón, sin piel)" y el arroz u otros acompañamientos aparte; los gramos de la carne son solo la carne, sin contar la salsa.
- Bistec vs. churrasco: si la carne de res es una lámina delgada, es "bistec", no "churrasco". El churrasco es un corte GRUESO (1.5–2 cm) con borde de grasa visible; úsalo solo si se ve ese grosor.
- Papa sancochada vs. dorada vs. frita: la papa sancochada (clave de papa "Cocida") es de color pálido y superficie lisa y opaca, sin partes tostadas; la papa dorada tiene la superficie tostada, dorada y brillante de aceite; las papas fritas son bastones o rodajas crocantes. En la pollada y el pollo frito la papa puede venir sancochada O dorada: no asumas que es dorada; si no ves con claridad la superficie tostada, usa "opciones" con la papa cocida primero y la dorada después.
- Fideos, tallarines y ensaladas sueltas: si están esparcidos en capa delgada por el plato, pesan menos de lo que parece; un plato llano con fideos esparcidos suele tener 100–150 g. Cuenta la altura del montón, no solo la superficie.

Marca "aceite": true si el alimento se ve frito, saltado, apanado o brillante de aceite; si no, false.

Si en la foto se ve con claridad un plato o alimento que NO está en la lista (ni nada equivalente), escribe su nombre común en español peruano en "no_encontrados" (ej. "Pollo a la olla"), máximo 3, nombres cortos sin marcas ni cantidades. Si todo lo visible está en la lista, deja "no_encontrados" vacío.

Lista de alimentos válidos:
${listaPlatos}

Responde ÚNICAMENTE con JSON válido, sin texto adicional, en este formato exacto:
{"items": [{"key": "clave_exacta_de_la_lista", "confianza": "alta|media|baja", "cantidad": 1, "gramos": 180, "aceite": false}, {"opciones": ["clave_variante_1", "clave_variante_2"], "confianza": "media", "cantidad": 1, "gramos": 250, "aceite": false}], "no_encontrados": []}
Cada item tiene "key" (caso normal) O "opciones" (caso ambiguo), nunca ambos.`;

  const modelo = MODELO_FOTOS;

  // Si la IA falla (o no se puede conectar) devuelve null, y quien llamó
  // devuelve la foto reservada para que no se pierda.
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
        // max_tokens incluye lo que la IA "piensa" antes de responder, no
        // solo el JSON: con margen para que no se corte. Solo se paga lo
        // que de verdad usa (hoy ~180 por foto).
        max_tokens: 3000,
        // Esfuerzo medio: piensa un poco antes de estimar porciones.
        output_config: { effort: "medium" },
        // Las instrucciones y la lista común son iguales en todas las
        // fotos: van primero y quedan en caché unos minutos, así la
        // siguiente foto (de cualquier alumno) paga ~10% por esa parte.
        // Lo que cambia (la foto y los alimentos propios) va después.
        system: [{ type: "text", text: prompt, cache_control: { type: "ephemeral" } }],
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: tipoImagen, data: imagenBase64 } },
            { type: "text", text: [
              listaPersonales && `Alimentos propios de este alumno (también son válidos, úsalos igual que los de la lista):\n${listaPersonales}`,
              corregidos.length && `Correcciones que este alumno ya hizo (la IA dijo → en realidad era):\n${corregidos.join("\n")}`,
              deTodos.reglas.length && `Correcciones frecuentes de todos los alumnos (la IA dijo → en realidad era):\n${deTodos.reglas.join("\n")}`,
              frecuentes.length && `Lo que este alumno suele comer (lo que más registró en las últimas 2 semanas, de más a menos):\n${frecuentes.join("\n")}`,
              porciones.length && `Porciones habituales de este alumno (en sus fotos anteriores corrigió los gramos que calculó la IA; es lo que de verdad suele servirse):\n${porciones.join("\n")}\nSi en esta foto aparece alguno de esos alimentos con una porción parecida a la de siempre, usa su porción habitual como punto de partida para los gramos. Si en la foto se ve claramente más o menos, calcula lo que ves.`,
              "Identifica los alimentos de esta foto. Responde solo con el JSON final, sin explicaciones antes ni después.",
            ].filter(Boolean).join("\n\n") },
          ],
        }],
      }),
    });
    if (!resp.ok) {
      console.error("Error de Anthropic:", resp.status, await resp.text());
      return null;
    }
    data = await resp.json();
    await anotarUsoIA(supabase, { tipo: "plato", username: usuarioUso, modelo, usage: data.usage });
  } catch (e) {
    console.error("Sin conexión con Anthropic:", (e as Error)?.message);
    return null;
  }

  const textoRespuesta = (data.content || []).map((c: any) => c.text || "").join("");
  console.log("Respuesta cruda de la IA:", textoRespuesta);
  let items: { key: string; confianza: string; cantidad?: number; gramos?: number | null; aceite?: boolean; opciones?: string[] }[] = [];
  let noEncontrados: string[] = [];
  const parsed = extraerJson(textoRespuesta);
  // Si la respuesta no trae el JSON (o viene cortada), se trata como una
  // falla de la IA: quien llamó devuelve la foto y el alumno reintenta.
  if (!parsed) return null;
  try {
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

  // Opciones rápidas para "✏️ No es esto": lo que otros alumnos eligieron
  // cuando la IA dijo cada uno de estos alimentos (solo los de esta foto).
  const alternativas: Record<string, string[]> = {};
  for (const it of items) {
    for (const k of (it.key ? [it.key] : it.opciones || [])) {
      const alts = (deTodos.alternativas[k] || []).filter((a) => a !== k && clavesValidas.has(a));
      if (alts.length) alternativas[k] = alts;
    }
  }

  return { items, noEncontrados, alternativas };
}

// Foto de prueba desde la portada, sin cuenta (ver DEMO_* arriba). Se
// reservan los tres cupos antes de llamar a la IA; si alguno está lleno o
// la IA falla, se devuelven los que ya se reservaron.
async function fotoDePrueba(supabase: any, req: Request, cuerpo: any) {
  const { imagenBase64, mimeType, alimentos } = cuerpo || {};
  const visitante = typeof cuerpo?.visitante === "string" ? cuerpo.visitante.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64) : "";
  if (visitante.length < 8) return json({ error: "Faltan datos." }, 400);
  if (typeof imagenBase64 !== "string" || !imagenBase64 || !Array.isArray(alimentos) || !alimentos.length) {
    return json({ error: "Faltan datos (imagenBase64 o alimentos)." }, 400);
  }
  if (imagenBase64.length > MAX_IMAGEN_BASE64) return json({ error: "La foto es demasiado pesada." }, 413);
  if (alimentos.length > MAX_ALIMENTOS) return json({ error: "La lista de alimentos es demasiado larga." }, 400);
  const alimentosComunes = alimentos
    .filter((a: any) => a && typeof a.key === "string" && typeof a.name === "string" && a.key && a.name)
    .map((a: any) => ({ key: a.key.slice(0, MAX_TEXTO_ALIMENTO), name: a.name.slice(0, MAX_TEXTO_ALIMENTO) }));
  if (!alimentosComunes.length) return json({ error: "Faltan datos (alimentos)." }, 400);
  const tipoImagen = TIPOS_IMAGEN.includes(mimeType) ? mimeType : "image/jpeg";

  // La conexión se guarda resumida (huella), nunca la dirección tal cual.
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "sin-ip";
  const huella = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip))))
    .slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
  const periodo = `demo-${fechaLima()}`;
  const cupos = [
    { username: `demo:v:${visitante}`, limite: DEMO_POR_VISITANTE },
    { username: `demo:ip:${huella}`, limite: DEMO_POR_CONEXION },
    { username: "demo:total", limite: DEMO_TOTAL_DIARIO },
  ];
  const reservados: string[] = [];
  const devolver = () => Promise.all(reservados.map((u) =>
    supabase.rpc("devolver_foto_reconocimiento", { p_username: u, p_periodo: periodo })));
  for (const c of cupos) {
    const { data, error } = await supabase.rpc("reservar_foto_reconocimiento", { p_username: c.username, p_periodo: periodo, p_limite: c.limite });
    if (error) {
      console.error("No se pudo reservar la foto de prueba:", error.message);
      await devolver();
      return json({ error: "No se pudo procesar la foto. Intenta de nuevo." }, 500);
    }
    if (data === null || data === undefined) {
      await devolver();
      return json({ error: "limite_demo" }, 200);
    }
    reservados.push(c.username);
  }

  const r = await reconocerPlato(supabase, {
    imagenBase64, tipoImagen, alimentosComunes, alimentosPersonales: [], frecuentes: [], corregidos: [],
    deTodos: await correccionesDeTodos(supabase, new Set(alimentosComunes.map((a: any) => a.key))), usuarioUso: "demo-portada",
  });
  if (!r) {
    await devolver();
    return json({ error: "No se pudo procesar la foto. Intenta de nuevo." }, 502);
  }
  // Si no reconoció comida, al visitante se le devuelve su foto para que
  // pruebe con otra (la conexión y el total sí la cuentan: así nadie puede
  // mandar fotos vacías sin fin).
  if (!r.items.length) {
    await supabase.rpc("devolver_foto_reconocimiento", { p_username: cupos[0].username, p_periodo: periodo });
  }
  return json({ items: r.items, noEncontrados: r.noEncontrados });
}

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

async function leerEtiqueta(imagenBase64: string, tipoImagen: string, anotar: (usage: any) => Promise<void>): Promise<{ ok: true; producto: any } | { ok: false; error: string; fallo?: boolean }> {
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
        model: MODELO_FOTOS,
        max_tokens: 1500,
        output_config: { effort: "low" },
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
    await anotar(data.usage);
  } catch (e) {
    console.error("Sin conexión con Anthropic (etiqueta):", (e as Error)?.message);
    return { ok: false, fallo: true, error: "No se pudo leer la etiqueta. Intenta de nuevo." };
  }
  const texto = (data.content || []).map((c: any) => c.text || "").join("");
  console.log("Etiqueta leída por la IA:", texto);
  try {
    const parsed = extraerJson(texto);
    if (!parsed) throw new Error("sin JSON");
    if (parsed?.legible === false) return { ok: false, error: "No pudimos leer la tabla nutricional. Toma la foto más cerca, con buena luz y sin reflejos." };
    const p = productoLimpio(parsed);
    if (!p) return { ok: false, error: "No pudimos leer bien los valores. Toma la foto más cerca, con buena luz y sin reflejos." };
    return { ok: true, producto: p };
  } catch {
    return { ok: false, error: "No pudimos leer la tabla nutricional. Intenta con otra foto." };
  }
}

// Dígito de control de EAN-8 / UPC-A / EAN-13: descarta lecturas con un
// número cambiado.
function codigoValido(cod: string) {
  if (![8, 12, 13].includes(cod.length)) return false;
  const d = cod.split("").map(Number);
  const control = d.pop() as number;
  const suma = d.reverse().reduce((a, n, i) => a + n * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (suma % 10)) % 10 === control;
}

/* La IA a veces explica lo que ve antes del JSON ("Se ve un caldo...
   {...}"), o escribe uno, se corrige y escribe otro. Se toma el último
   JSON completo de la respuesta. Devuelve null si no hay ninguno válido. */
function extraerJson(texto: string): any | null {
  const limpio = String(texto || "").replace(/```json|```/g, "");
  const fin = limpio.lastIndexOf("}");
  for (let ini = limpio.lastIndexOf("{", fin); ini >= 0; ini = limpio.lastIndexOf("{", ini - 1)) {
    try {
      const v = JSON.parse(limpio.slice(ini, fin + 1));
      if (v && typeof v === "object" && !Array.isArray(v)) return v;
    } catch { /* sigue buscando más atrás */ }
    if (ini === 0) break;
  }
  return null;
}

async function leerNumerosCodigo(imagenBase64: string, tipoImagen: string, anotar: (usage: any) => Promise<void>): Promise<string | null> {
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODELO_FOTOS,
        max_tokens: 1000,
        output_config: { effort: "low" },
        messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: tipoImagen, data: imagenBase64 } },
          { type: "text", text: 'En la foto hay un código de barras de un producto. Lee los números impresos debajo (o al lado) de las barras, todos seguidos y sin espacios (normalmente 13 dígitos, ej. 7751271012345). Responde SOLO con los dígitos. Si no se leen con seguridad, responde "NO".' },
        ] }],
      }),
    });
    if (!resp.ok) { console.error("Error de Anthropic (código):", resp.status, await resp.text()); return null; }
    const data = await resp.json();
    await anotar(data.usage);
    const texto = (data.content || []).map((c: any) => c.text || "").join("");
    const cod = texto.replace(/\D/g, "");
    console.log("Código leído por la IA:", texto.trim(), codigoValido(cod) ? "(válido)" : "(no válido)");
    return codigoValido(cod) ? cod : null;
  } catch (e) {
    console.error("Sin conexión con Anthropic (código):", (e as Error)?.message);
    return null;
  }
}

// Anota en la tabla ia_uso cuántos tokens usó la IA en esta llamada, para
// que el panel de Rentabilidad calcule el costo real. Si falla, no
// interrumpe nada (solo queda en el log).
// Hasta 12 alimentos que el alumno registró más en los últimos 14 días
// (historial.meal_plan.meals), solo los que siguen existiendo en la lista.
// Lo de los últimos 3 días vale el triple, para que un alimento que el
// alumno empezó a comer hace poco (ej. pavita) entre rápido a la lista.
// Si algo falla, se sigue sin esta ayuda.
async function alimentosFrecuentes(supabase: any, username: string, validas: Set<string>): Promise<string[]> {
  try {
    const desde = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);
    const reciente = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);
    const { data, error } = await supabase.from("historial").select("fecha, meal_plan")
      .eq("username", username).gte("fecha", desde).limit(20);
    if (error) throw error;
    const cuenta = new Map<string, number>();
    for (const fila of data || []) {
      const peso = typeof fila?.fecha === "string" && fila.fecha >= reciente ? 3 : 1;
      const comidas = fila?.meal_plan?.meals;
      if (!comidas || typeof comidas !== "object") continue;
      for (const lista of Object.values(comidas)) {
        if (!Array.isArray(lista)) continue;
        for (const e of lista as any[]) {
          const k = typeof e?.foodKey === "string" ? e.foodKey : "";
          if (k && validas.has(k)) cuenta.set(k, (cuenta.get(k) || 0) + peso);
        }
      }
    }
    return [...cuenta.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k]) => k);
  } catch (e) {
    console.error("No se pudieron leer los alimentos frecuentes:", (e as Error)?.message);
    return [];
  }
}

// Hasta 8 correcciones del alumno en los últimos 60 días: en las fotos
// anteriores la IA sugirió X y el alumno eligió "¿Qué era en realidad?" → Y
// (reconocimiento_foto_feedback.sugeridos[].corregido_a). Solo las que
// siguen existiendo en la lista. Si algo falla, se sigue sin esta ayuda.
async function correccionesDelAlumno(supabase: any, username: string, validas: Set<string>): Promise<string[]> {
  try {
    const desde = new Date(Date.now() - 60 * 86_400_000).toISOString();
    const { data, error } = await supabase.from("reconocimiento_foto_feedback").select("sugeridos")
      .eq("username", username).gte("created_at", desde).order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    // Cada foto cuenta una vez por par (en un grupo de opciones, todas
    // las alternativas llevan la misma corrección).
    const pares = new Map<string, { de: Set<string>; a: string; veces: number }>();
    for (const fila of data || []) {
      const vistos = new Set<string>();
      for (const s of Array.isArray(fila?.sugeridos) ? fila.sugeridos : []) {
        const de = typeof s?.key === "string" ? s.key : "";
        const a = typeof s?.corregido_a === "string" ? s.corregido_a : "";
        if (!de || !a || de === a || !validas.has(a)) continue;
        const p = pares.get(a) || { de: new Set<string>(), a, veces: 0 };
        p.de.add(de);
        if (!vistos.has(a)) { p.veces++; vistos.add(a); }
        pares.set(a, p);
      }
    }
    return [...pares.values()].sort((x, y) => y.veces - x.veces).slice(0, 8)
      .map((p) => `${[...p.de].slice(0, 3).join(" o ")} → ${p.a} (${p.veces} ${p.veces === 1 ? "vez" : "veces"})`);
  } catch (e) {
    console.error("No se pudieron leer las correcciones:", (e as Error)?.message);
    return [];
  }
}

// Porciones habituales del alumno (últimos 60 días): alimentos a los que
// les corrigió los gramos que calculó la IA en 2 fotos o más, siempre hacia
// el mismo lado (las veces que lo dejó igual no cuentan en contra). La
// porción habitual es la mediana de sus últimas 5 fotos de ese alimento. Ej.: alguien en déficit que sirve 110 g de arroz y la IA le calcula
// 150 g. Va en el mensaje (no en las instrucciones) para no romper la caché.
// Si algo falla, se sigue sin esta ayuda.
async function porcionesDelAlumno(supabase: any, username: string, validas: Set<string>): Promise<string[]> {
  try {
    const desde = new Date(Date.now() - 60 * 86_400_000).toISOString();
    const { data, error } = await supabase.from("reconocimiento_foto_feedback").select("sugeridos")
      .eq("username", username).gte("created_at", desde).order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    const porClave = new Map<string, { ia: number[]; final: number[] }>();
    for (const fila of data || []) {
      for (const s of Array.isArray(fila?.sugeridos) ? fila.sugeridos : []) {
        const clave = typeof s?.key === "string" ? s.key : "";
        const ia = Number(s?.gramos_ia), fin = Number(s?.gramos_final);
        if (!clave || s?.corregido_a || !validas.has(clave) || !(ia > 0) || !(fin > 0)) continue;
        const p = porClave.get(clave) || { ia: [], final: [] };
        p.ia.push(ia); p.final.push(fin);
        porClave.set(clave, p);
      }
    }
    const mediana = (v: number[]) => { const o = [...v].sort((a, b) => a - b); const m = Math.floor(o.length / 2); return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2; };
    const lineas: { texto: string; veces: number }[] = [];
    for (const [clave, p] of porClave) {
      // Cuenta cuántas veces bajó o subió la porción (más de 10%); si lo
      // movió hacia los dos lados, no hay una porción habitual clara.
      const menos = p.final.filter((f, i) => f < p.ia[i] * 0.9).length;
      const mas = p.final.filter((f, i) => f > p.ia[i] * 1.1).length;
      if (!((menos >= 2 && mas === 0) || (mas >= 2 && menos === 0))) continue;
      // Las últimas 5 fotos (vienen de la más nueva a la más vieja).
      const fin = mediana(p.final.slice(0, 5)), ia = mediana(p.ia.slice(0, 5));
      if (Math.abs(fin / ia - 1) < 0.1) continue;
      lineas.push({ texto: `${clave}: suele servirse unos ${Math.round(fin / 5) * 5} g (la IA había calculado unos ${Math.round(ia / 5) * 5} g; ${p.final.length} fotos)`, veces: p.final.length });
    }
    return lineas.sort((a, b) => b.veces - a.veces).slice(0, 8).map((l) => l.texto);
  } catch (e) {
    console.error("No se pudieron leer las porciones del alumno:", (e as Error)?.message);
    return [];
  }
}

// Lo que corrigieron todos los alumnos en los últimos 180 días (la IA dijo X
// y el alumno eligió "¿Qué era en realidad?" / "No es esto" → Y).
// - reglas: pares que corrigieron 3 alumnos distintos o más; van a la IA
//   para todas las fotos. Jonah puede apagar un par desde su panel (config
//   "correcciones_ia_off": lista JSON de "X→Y").
// - alternativas: para cada X, hasta 3 Y (de más a menos alumnos), para las
//   opciones rápidas de "No es esto". Aquí basta 1 alumno: solo sugieren.
// Si algo falla, se sigue sin esta ayuda.
const MIN_ALUMNOS_CORRECCION = 3;
type CorreccionesDeTodos = { reglas: string[]; alternativas: Record<string, string[]> };
async function correccionesDeTodos(supabase: any, validas: Set<string>): Promise<CorreccionesDeTodos> {
  try {
    const desde = new Date(Date.now() - 180 * 86_400_000).toISOString();
    const [{ data, error }, { data: cfg }] = await Promise.all([
      supabase.from("reconocimiento_foto_feedback").select("username, sugeridos")
        .gte("created_at", desde).order("created_at", { ascending: false }).limit(3000),
      supabase.from("config").select("value").eq("key", "correcciones_ia_off").maybeSingle(),
    ]);
    if (error) throw error;
    let apagadas = new Set<string>();
    try {
      const lista = JSON.parse(cfg?.value || "[]");
      if (Array.isArray(lista)) apagadas = new Set(lista.filter((x: unknown) => typeof x === "string"));
    } catch { /* sin lista */ }
    const pares = new Map<string, { de: string; a: string; alumnos: Set<string> }>();
    for (const fila of data || []) {
      const quien = typeof fila?.username === "string" ? fila.username : "";
      for (const s of Array.isArray(fila?.sugeridos) ? fila.sugeridos : []) {
        const de = typeof s?.key === "string" ? s.key : "";
        const a = typeof s?.corregido_a === "string" ? s.corregido_a : "";
        if (!quien || !de || !a || de === a || !validas.has(de) || !validas.has(a)) continue;
        const id = `${de}→${a}`;
        if (apagadas.has(id)) continue;
        const p = pares.get(id) || { de, a, alumnos: new Set<string>() };
        p.alumnos.add(quien);
        pares.set(id, p);
      }
    }
    const lista = [...pares.values()].sort((x, y) => y.alumnos.size - x.alumnos.size);
    const reglas = lista.filter((p) => p.alumnos.size >= MIN_ALUMNOS_CORRECCION).slice(0, 25)
      .map((p) => `${p.de} → ${p.a} (${p.alumnos.size} alumnos)`);
    const alternativas: Record<string, string[]> = {};
    for (const p of lista) {
      const l = alternativas[p.de] || (alternativas[p.de] = []);
      if (l.length < 3) l.push(p.a);
    }
    return { reglas, alternativas };
  } catch (e) {
    console.error("No se pudieron leer las correcciones de todos:", (e as Error)?.message);
    return { reglas: [], alternativas: {} };
  }
}

async function anotarUsoIA(supabase: any, fila: { tipo: string; username?: string | null; modelo?: string; usage?: any }) {
  try {
    const u = fila.usage || {};
    const { error } = await supabase.from("ia_uso").insert({
      funcion: "reconocer-comida", tipo: fila.tipo, username: fila.username || null, modelo: fila.modelo || "desconocido",
      tokens_entrada: Number(u.input_tokens) || 0, tokens_salida: Number(u.output_tokens) || 0,
      tokens_cache_lectura: Number(u.cache_read_input_tokens) || 0, tokens_cache_escritura: Number(u.cache_creation_input_tokens) || 0,
    });
    if (error) console.error("No se pudo anotar el uso de IA:", error.message);
  } catch (e) {
    console.error("No se pudo anotar el uso de IA:", (e as Error)?.message);
  }
}
