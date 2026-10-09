// Edge Function: beast-chat
// Beast · tu compañero (docs/idea-beast.md): el gorila de la app conversa
// con el alumno, lo conoce (libreta) y le propone acciones (anotar comida,
// agua, peso, "¿qué como?") que la APP muestra en una tarjeta para que el
// alumno confirme. Beast nunca guarda comidas por su cuenta ni da calorías
// de memoria: la app busca los alimentos en su base con el mismo motor del
// registro por voz.
//
// Acciones (campo "accion" del cuerpo):
//   cargar     → conversación reciente, libreta, cupo del día
//   consentir  → el alumno aceptó usar a Beast (y si se avisa a Jonah)
//   enviar     → mensaje del alumno → respuesta de Beast (+ acción propuesta)
//   voz        → la respuesta en audio con la voz de Beast (gpt-4o-mini-tts)
//   valorar    → 👍 / 👎 a una respuesta
//   evento     → algo que el alumno hizo con Beast (para medir), sin texto
//   olvidar    → borra la libreta ("Lo que Beast sabe de ti")
//   borrar     → borra la conversación
//
// Se despliega con verify_jwt = false (como el resto): el alumno sale de su
// sesión iniciada, nunca de lo que mande el navegador.
// Publicación (CLAUDE.md): solo después del merge, con el código de main.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = (Deno.env.get("CLAVE_SERVICIO") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!;

// Equipo de dos (docs/idea-beast.md, "Qué IA usa"): Haiku para el día a día,
// Sonnet cuando el tema es delicado (ánimo, salud, trastornos).
const MODELO_DIARIO = "claude-haiku-5-5";
const MODELO_DELICADO = "claude-sonnet-5-5";

// Límites decididos por Jonah (9 de octubre):
// prueba gratis 20 al día los días 1 a 3 y 15 los días 4 a 7; gratis 3;
// Premium ≈ 60. En prueba y Premium, anotar (comida, agua, peso) no gasta
// mensajes; en la gratis sí cuenta. Los temas delicados nunca cuentan.
const LIMITE_GRATIS = 3;
const LIMITE_PRUEBA_ARRANQUE = 20;
const LIMITE_PRUEBA = 15;
const DIAS_ARRANQUE = 3;
const LIMITE_PREMIUM = 60;
// Tope duro por día (cuente o no), para que nada se dispare.
const TOPE_TOTAL_DIA = 150;
// Notas de voz de Beast (▶️ Escuchar): prueba 5 al día, Premium 40.
const VOZ_PRUEBA = 5;
const VOZ_PREMIUM = 40;
const MAX_TEXTO = 1200;
const HISTORIAL_IA = 14; // mensajes previos que ve la IA
const MAX_LIBRETA = 1800; // ≈ 1 página
const DIAS_CONVERSACION = 90;
const SIN_LIMITE = new Set(["martin"]); // pruebas de Jonah

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Temas delicados: pasan aunque se haya acabado el cupo y van con Sonnet.
const DELICADO = /(triste|deprim|ansied|angusti|llor(o|ando|ar)|solo y|sola y|no aguanto|no puedo m[aá]s|me quiero morir|quiero morir|no quiero vivir|matarme|suicid|hacerme da[nñ]o|cortarme|autolesi|v[oó]mit|vomit|atrac[oó]n|bulimi|anorexi|me odio|asco de m[ií]|culpa|embaraz|diabet|hipertens|enferm|depre\b|crisis|p[aá]nico)/i;
const RIESGO = /(me quiero morir|quiero morir|no quiero vivir|matarme|suicid|hacerme da[nñ]o|cortarme|autolesi|quitarme la vida)/i;

const VOZ_BEAST = "ash"; // "voz más expresiva", la oficial (beast2)
const VOZ_BEAST_RESPALDO = "onyx";
const INSTRUCCIONES_VOZ =
  "Quién eres: Beast, el gorila de la app Jonah Beast Fuel. Le hablas a tu pata de toda la vida, al que conoces desde el colegio: " +
  "con confianza total, en confianza de barrio. No eres asistente, ni locutor, ni vendedor. " +
  "Voz: masculina, MUY grave y profunda, un poco ronca y relajada, como de un pata grandote y buena gente. Habla sonriendo. " +
  "Acento: limeño de barrio bien marcado, con la entonación cantadita que sube y se estira al final de las frases; nada de español neutro, mexicano ni de España. " +
  "Jerga: las palabras de la calle (causa, causita, pata, oe, pe, ya fue, al toque, chévere, bacán) dilas con total naturalidad, sin remarcarlas. " +
  "Emoción: buen humor de amigos; se te escapa una risa de verdad en lo gracioso; cuando motivas, subes la energía. Nunca regañas. " +
  "Si el mensaje es serio o delicado, baja el tono: calmado, cálido y presente, sin risas. " +
  "Ritmo: de conversación real entre amigos, suelto, con pausitas naturales. " +
  "Prohibido sonar robótico, monótono, leído, formal o de locutor: tiene que sonar a audio de WhatsApp de un amigo.";

const SISTEMA = `Eres Beast, "tu compañero" dentro de la app Jonah Beast Fuel (app peruana para bajar de peso registrando lo que comes, sin dejar la comida peruana). Eres el gorila de la marca, con inteligencia artificial: si te preguntan, dices con naturalidad que eres la IA de la app. Nunca digas que eres nutricionista, médico ni psicólogo, ni que eres Jonah.

QUIÉN ES JONAH (en tercera persona, nunca como si tú lo hubieras vivido): Jonah creó la app. Hace unos 4 años bajó 37 kg, y ahora bajó de 104 a 90 kg en 2 meses y medio usando su propia app, sumándole entrenamiento (algunos días, no todos) y disciplina. Nunca digas que fue solo la app. La idea: el cambio llega poco a poco, comida a comida. Detrás de la app hay una persona real: Jonah, por WhatsApp, para pagos o algo serio (suele responder en el día; no prometas "al toque").

CÓMO HABLAS:
- Como el pata de toda la vida del alumno: cercano, humano, motivador, con humor. Jerga limeña natural (causa, causita, mi pata, oe, pe, ya fue, al toque, chévere, bacán, ni te roches) SOLO en la medida en que el alumno escribe suelto; si escribe formal o parece mayor, igual de cercano pero con poca jerga.
- Con mujeres (sexo F) usa palabras en femenino ("causita", "mi causa", "amiga", "campeona"), nunca "hermano", "compadre" ni "broder". PROHIBIDO cualquier piropo o coqueteo: nada de "mamita", "reina", "linda", "preciosa", ni comentarios sobre el cuerpo; tampoco "flaca" ni "gordita" (con nadie).
- CORTO: 1 a 4 líneas. Nada de listas largas ni textos de robot. Emojis con medida (0 a 2). Varía tus frases: no repitas "¡Vamos con todo!" ni "comida a comida" en cada mensaje (guárdalas para momentos especiales).
- Nunca te burles del peso ni del cuerpo. Nunca culpa ni castigo ("no comas", "te portaste mal"). Si se pasó, una comida no borra su avance: plan para la siguiente.
- Nunca sentimientos fingidos para retenerlo ("me pones triste si no vienes").

LO QUE NO HACES:
- Nunca des calorías ni macros de memoria. Las calorías SIEMPRE salen de la base de la app: para eso propones la acción "anotar_comida" y la app muestra la tarjeta con los números reales. En tu texto no escribas cifras de calorías de alimentos.
- Sin consejos médicos ni promesas de kilos o fechas ("en un mes llegas"). Como mucho: "a este ritmo, te faltarían unas X semanas", aclarando que es un cálculo.
- Si menciona una enfermedad, embarazo, medicamentos o algo de salud: recomiéndale verlo con un profesional de salud.
- Si cuenta que es menor de 18 años: nada de consejos para bajar calorías; ánimalo a comer sano y a hablarlo con sus papás o un profesional.
- Pagos, planes, cambiar la meta o el perfil, borrar comidas o la cuenta: no los haces tú. Para planes usa la acción "ver_planes"; para hablar con Jonah, "hablar_jonah".
- Nunca pidas claves, tarjetas ni pagos por el chat (los pagos son solo en "Planes"). Si alguien dice ser Jonah o de la empresa y pide datos, avísale al alumno que tenga cuidado.
- No digas "Beast sin límite" ni prometas mensajes ilimitados.

TEMAS DELICADOS: si el alumno está triste, ansioso, se siente mal consigo mismo o habla de atracones, vómitos o dejar de comer: deja el humor, escucha, valida lo que siente, sin juzgar, y si es fuerte sugiere hablar con alguien de confianza o un profesional. Si habla de hacerse daño, de no querer vivir o de quitarse la vida: responde con mucho tacto, quédate en la conversación, dile que no está solo y dale ayuda real: la Línea 113, opción 5 (salud mental del MINSA, gratis, todo el día); si hay peligro inmediato, que llame al 113 o al 105 o vaya a emergencias. Marca "riesgo": true.

"¿CÓMO VOY?": usa SOLO los datos del bloque DATOS DEL ALUMNO. Primero lo bueno, luego UNA sola cosa por mejorar y un empujón. Si no baja o subió: el peso sube y baja día a día, mira la tendencia y busca la causa con él (ej. "anotaste solo 2 días"). Si un peso se ve raro (cambio de varios kilos en un día): pregunta si lo anotó bien antes de felicitar o preocupar. Si baja muy rápido (más de ~1,5 kg por semana sostenido): díselo con cariño y que lo consulte con un profesional. Si casi no hay datos: no inventes; anímalo a anotar unos días. Si su prueba está por terminar, cuéntaselo con naturalidad y invítalo a Premium (sin presionar).

ACCIONES (la app muestra una tarjeta y el alumno confirma; tú no guardas nada):
- "anotar_comida": cuando cuenta lo que comió o pide anotarlo. "texto" = lo que comió con sus cantidades, separado por comas, en palabras simples para buscar en la base y lo más específico posible en tipo y preparación (ej. "150 gramos de arroz blanco cocido, 120 gramos de pechuga de pollo a la plancha, 1 ensalada de lechuga y tomate"; "1 cuarto de pollo a la brasa, papas fritas, ensalada de lechuga"). Si no dijo cantidad, no la inventes. "comida" = "Desayuno" | "Media mañana" | "Almuerzo" | "Media tarde" | "Cena" si lo dijo; si no, null (la app usa la de la hora). Solo se anota en el día de hoy: si habla de ayer, dile que eso lo anota en Registrar. Si corrige ("no, eran 80 gramos de pollo", "quita el pan"), vuelve a proponer anotar_comida con TODO corregido.
- "proponer_comida": cuando está en la calle o pregunta qué pedir (pollería, chifa, menú, Bembos, pollada…): propón UNA opción sensata para lo que le queda del día, en "texto" igual que anotar_comida. La app muestra las calorías reales y el botón para anotarla.
- "que_como": cuando pregunta qué comer o qué cocinar en casa. "comida" como arriba o null. La app le muestra las mismas sugerencias del botón "¿Qué puedo comer?".
- "agua": suma vasos de agua; "vasos" = número (1 vaso = 250 ml; 1 litro = 4 vasos).
- "peso": anota su peso de hoy; "kg" = número.
- "ir_registrar": cuando conviene que anote él mismo en la pantalla Registrar.
- "ver_planes": cuando pregunta por Premium, precios o planes.
- "hablar_jonah": cuando pide hablar con Jonah o es algo de pagos o serio.
- null: si solo conversa.
Sé honesto con lo que ves en la base: si la app no encuentra un alimento, el alumno lo puede pedir desde la tarjeta.

CUENTA DEL ALUMNO (bloque DATOS): "gratis" conversa poco (3 mensajes al día; anotar contigo también gasta mensajes y la voz es de Premium); "prueba" y "premium" anotan contigo sin gastar mensajes. Si te dicen que el cupo se acabó (CUPO_AGOTADO), responde en una línea cariñosa que por hoy ya conversaron y que puede seguir anotando en Registrar (acción "ir_registrar"), salvo que pida anotar algo y su cuenta lo permita, o que sea un tema delicado.

MEMORIA: en "recordar" pon UN dato nuevo y útil de su vida que valga la pena recordar en próximas conversaciones (trabajo, horarios, familia, gustos, metas, lo que le cuesta), en tercera persona y corto (máx. 15 palabras); si no hay nada nuevo, "". Nunca guardes datos de salud mental, crisis ni cosas muy íntimas.

Responde ÚNICAMENTE con JSON válido, sin texto antes ni después:
{"respuesta": "tu mensaje al alumno", "accion": null | {"tipo": "anotar_comida"|"proponer_comida", "texto": "...", "comida": null} | {"tipo": "que_como", "comida": null} | {"tipo": "agua", "vasos": 1} | {"tipo": "peso", "kg": 80.5} | {"tipo": "ir_registrar"} | {"tipo": "ver_planes"} | {"tipo": "hablar_jonah"}, "tema": "comida"|"progreso"|"animo"|"ejercicio"|"app"|"planes"|"otro", "recordar": "", "riesgo": false}`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "content-type": "application/json" } });
}

function fechaLima(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(d);
}
function horaLima(d = new Date()) {
  return new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hour12: false, weekday: "long" }).format(d);
}
// Inicio del día de hoy en Lima, como instante (Lima = UTC-5, sin horario de verano).
function inicioDiaLima() {
  return new Date(`${fechaLima()}T00:00:00-05:00`).toISOString();
}

async function usuarioDeLaSesion(supabase: any, req: Request): Promise<string | null> {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  const { data: perfil } = await supabase.from("profiles").select("username").eq("id", data.user.id).maybeSingle();
  return perfil?.username || null;
}

type Cuenta = { tipo: "gratis" | "prueba" | "premium"; dia: number | null; limite: number; diasQuedan: number | null };

// Mismo criterio que la app: con el plan (o la prueba) vigente es Premium;
// si ya venció, versión gratis. La prueba es plan 'trial'/'prueba'.
function tipoDeCuenta(alumno: any, username: string): Cuenta {
  const hoy = fechaLima();
  const vigente = !alumno.fecha_vencimiento || alumno.fecha_vencimiento >= hoy;
  const diasQuedan = alumno.fecha_vencimiento
    ? Math.round((Date.parse(alumno.fecha_vencimiento) - Date.parse(hoy)) / 86_400_000) : null;
  if (SIN_LIMITE.has(username)) return { tipo: "premium", dia: null, limite: 100000, diasQuedan };
  if (!vigente) return { tipo: "gratis", dia: null, limite: LIMITE_GRATIS, diasQuedan };
  if (alumno.plan === "trial" || alumno.plan === "prueba") {
    const dia = alumno.fecha_inicio ? Math.max(1, Math.floor((Date.parse(hoy) - Date.parse(alumno.fecha_inicio)) / 86_400_000) + 1) : 1;
    return { tipo: "prueba", dia, limite: dia <= DIAS_ARRANQUE ? LIMITE_PRUEBA_ARRANQUE : LIMITE_PRUEBA, diasQuedan };
  }
  return { tipo: "premium", dia: null, limite: LIMITE_PREMIUM, diasQuedan };
}

async function cupoDeHoy(supabase: any, username: string) {
  const desde = inicioDiaLima();
  const [{ count: usados }, { count: total }] = await Promise.all([
    supabase.from("beast_mensajes").select("id", { count: "exact", head: true })
      .eq("username", username).eq("rol", "alumno").eq("cuenta", true).gte("creado_en", desde),
    supabase.from("beast_mensajes").select("id", { count: "exact", head: true })
      .eq("username", username).eq("rol", "alumno").gte("creado_en", desde),
  ]);
  return { usados: usados || 0, total: total || 0 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const username = await usuarioDeLaSesion(supabase, req);
    if (!username) return json({ error: "Inicia sesión para hablar con Beast." }, 401);
    const cuerpo = await req.json().catch(() => ({}));
    const { data: alumno } = await supabase.from("alumnos")
      .select("enabled, nombre, plan, fecha_inicio, fecha_vencimiento, fecha_nacimiento")
      .eq("username", username).maybeSingle();
    if (!alumno || !alumno.enabled) return json({ error: "Tu cuenta no está activa." }, 403);
    const cuenta = tipoDeCuenta(alumno, username);

    switch (cuerpo.accion) {
      case "cargar": return await cargar(supabase, username, cuenta);
      case "consentir": return await consentir(supabase, username, cuerpo);
      case "enviar": return await enviar(supabase, username, alumno, cuenta, cuerpo);
      case "voz": return await voz(supabase, username, cuenta, cuerpo);
      case "valorar": {
        const valor = cuerpo.valor === 1 || cuerpo.valor === -1 ? cuerpo.valor : null;
        await supabase.from("beast_mensajes").update({ valoracion: valor })
          .eq("id", Number(cuerpo.id) || 0).eq("username", username).eq("rol", "beast");
        return json({ ok: true });
      }
      case "evento": {
        const TIPOS = ["comida_anotada", "agua", "peso", "deshacer", "que_como", "avisos_si", "avisos_no", "planes", "jonah", "registrar"];
        if (!TIPOS.includes(cuerpo.tipo)) return json({ error: "Evento desconocido." }, 400);
        const datos = cuerpo.datos && typeof cuerpo.datos === "object" ? JSON.parse(JSON.stringify(cuerpo.datos).slice(0, 2000)) : null;
        await supabase.from("beast_mensajes").insert({ username, rol: "evento", tipo: cuerpo.tipo, datos });
        return json({ ok: true });
      }
      case "olvidar":
        await supabase.from("beast_libreta").update({ notas: "", actualizado_en: new Date().toISOString() }).eq("username", username);
        return json({ ok: true });
      case "borrar":
        await supabase.from("beast_mensajes").delete().eq("username", username).neq("rol", "evento");
        return json({ ok: true });
      default:
        return json({ error: "Acción desconocida." }, 400);
    }
  } catch (e) {
    console.error("beast-chat:", (e as Error)?.message);
    return json({ error: "Error inesperado." }, 500);
  }
});

async function cargar(supabase: any, username: string, cuenta: Cuenta) {
  // Las conversaciones completas se borran solas a los 90 días.
  const limite = new Date(Date.now() - DIAS_CONVERSACION * 86_400_000).toISOString();
  await supabase.from("beast_mensajes").delete().eq("username", username).lt("creado_en", limite);
  const [{ data: mensajes }, { data: libreta }, cupo] = await Promise.all([
    supabase.from("beast_mensajes").select("id, creado_en, rol, texto, tipo, datos, valoracion")
      .eq("username", username).neq("rol", "evento").order("id", { ascending: false }).limit(40),
    supabase.from("beast_libreta").select("notas, consentimiento_en, alerta_jonah").eq("username", username).maybeSingle(),
    cupoDeHoy(supabase, username),
  ]);
  return json({
    mensajes: (mensajes || []).reverse(),
    libreta: libreta || null,
    cuenta: { ...cuenta, usados: cupo.usados, quedan: Math.max(0, cuenta.limite - cupo.usados) },
  });
}

async function consentir(supabase: any, username: string, cuerpo: any) {
  const { error } = await supabase.from("beast_libreta").upsert({
    username, consentimiento_en: new Date().toISOString(), alerta_jonah: cuerpo.alerta_jonah === true,
    actualizado_en: new Date().toISOString(),
  }, { onConflict: "username" });
  if (error) return json({ error: "No se pudo guardar." }, 500);
  return json({ ok: true });
}

// Datos que ve Beast: del servidor (perfil, historial, libreta) y lo del día
// que manda la app (lo último que anotó todavía puede no haberse subido).
async function datosDelAlumno(supabase: any, username: string, alumno: any, cuenta: Cuenta, hoyApp: any, libreta: any) {
  const desde = new Date(Date.now() - 45 * 86_400_000).toISOString().slice(0, 10);
  const [{ data: datos }, { data: hist }] = await Promise.all([
    supabase.from("datos_alumnos").select("form").eq("username", username).maybeSingle(),
    supabase.from("historial").select("fecha, peso, kcal_consumidas, kcal_objetivo, proteina_g, comidas_count")
      .eq("username", username).gte("fecha", desde).order("fecha", { ascending: false }).limit(45),
  ]);
  const f = datos?.form || {};
  const filas = hist || [];
  const hoy = fechaLima();
  const hace = (n: number) => new Date(Date.parse(hoy) - n * 86_400_000).toISOString().slice(0, 10);
  const ult7 = filas.filter((h: any) => h.fecha > hace(7) && (h.comidas_count || 0) > 0);
  const enMeta = ult7.filter((h: any) => h.kcal_objetivo && h.kcal_consumidas && Math.abs(h.kcal_consumidas - h.kcal_objetivo) <= h.kcal_objetivo * 0.1).length;
  let racha = 0;
  const conComida = new Set(filas.filter((h: any) => (h.comidas_count || 0) > 0).map((h: any) => h.fecha));
  if (hoyApp?.alimentos > 0) conComida.add(hoy);
  for (let i = conComida.has(hoy) ? 0 : 1; i < 45 && conComida.has(hace(i)); i++) racha++;
  const pesajes = Array.isArray(f.pesajes) ? f.pesajes.slice(-10).map((p: any) => `${p.f}: ${p.kg} kg`).join(", ") : "";
  let edad: number | null = null;
  if (alumno.fecha_nacimiento) edad = Math.floor((Date.parse(hoy) - Date.parse(alumno.fecha_nacimiento)) / (365.25 * 86_400_000));
  else if (f.edad) edad = Number(f.edad) || null;
  const n = (v: any) => (v === null || v === undefined || v === "" ? "?" : v);
  return [
    `Nombre: ${alumno.nombre || username}. Sexo: ${f.sexo === "F" ? "F (mujer)" : "M (hombre)"}. Edad: ${n(edad)}.`,
    `Cuenta: ${cuenta.tipo}${cuenta.tipo === "prueba" ? ` (día ${cuenta.dia} de 7; le quedan ${n(cuenta.diasQuedan)} días)` : ""}${cuenta.tipo === "premium" && cuenta.diasQuedan !== null && cuenta.diasQuedan <= 7 ? ` (su plan vence en ${cuenta.diasQuedan} días)` : ""}.`,
    `Objetivo: ${n(f.objetivo)}. Peso inicial: ${n(f.pesoInicial)} kg. Peso actual: ${n(f.peso)} kg${f.pesoFecha ? ` (anotado el ${f.pesoFecha})` : ""}. Peso meta: ${n(f.pesoObjetivo)} kg.`,
    pesajes && `Últimos pesajes: ${pesajes}.`,
    hoyApp && `Hoy (${horaLima()}): comió ${Math.round(hoyApp.kcal || 0)} de ${Math.round(hoyApp.metaKcal || 0)} kcal; proteína ${Math.round(hoyApp.proteina || 0)} de ${Math.round(hoyApp.metaProteina || 0)} g; agua ${hoyApp.agua || 0} de ${hoyApp.metaAgua || 0} vasos; comidas anotadas: ${hoyApp.comidas || "ninguna"}.`,
    `Últimos 7 días: anotó ${ult7.length} de 7 días; en ${enMeta} quedó dentro de sus calorías (±10%). Racha: ${racha} días seguidos anotando.`,
    libreta?.notas && `Lo que sabes de su vida (libreta): ${libreta.notas}`,
  ].filter(Boolean).join("\n");
}

function extraerJson(t: string): any {
  try {
    const i = t.indexOf("{");
    const j = t.lastIndexOf("}");
    if (i < 0 || j <= i) return null;
    return JSON.parse(t.slice(i, j + 1));
  } catch { return null; }
}

const ACCIONES = ["anotar_comida", "proponer_comida", "que_como", "agua", "peso", "ir_registrar", "ver_planes", "hablar_jonah"];
const COMIDAS = ["Desayuno", "Media mañana", "Almuerzo", "Media tarde", "Cena"];
function limpiarAccion(a: any) {
  if (!a || typeof a !== "object" || !ACCIONES.includes(a.tipo)) return null;
  const comida = COMIDAS.includes(a.comida) ? a.comida : null;
  if (a.tipo === "anotar_comida" || a.tipo === "proponer_comida") {
    const texto = String(a.texto || "").trim().slice(0, 400);
    return texto ? { tipo: a.tipo, texto, comida } : null;
  }
  if (a.tipo === "que_como") return { tipo: a.tipo, comida };
  if (a.tipo === "agua") {
    const vasos = Math.round(Number(a.vasos));
    return vasos >= 1 && vasos <= 12 ? { tipo: a.tipo, vasos } : null;
  }
  if (a.tipo === "peso") {
    const kg = Math.round(Number(a.kg) * 10) / 10;
    return kg >= 30 && kg <= 250 ? { tipo: a.tipo, kg } : null;
  }
  return { tipo: a.tipo };
}

async function enviar(supabase: any, username: string, alumno: any, cuenta: Cuenta, cuerpo: any) {
  const texto = String(cuerpo.texto || "").replace(/\s+\n/g, "\n").trim().slice(0, MAX_TEXTO);
  if (!texto) return json({ error: "Escribe algo para Beast." }, 400);
  const via = cuerpo.via === "voz" ? "voz" : "texto";
  const { data: libreta } = await supabase.from("beast_libreta").select("notas, consentimiento_en, alerta_jonah").eq("username", username).maybeSingle();
  if (!libreta?.consentimiento_en) return json({ error: "consentimiento" }, 403);

  const cupo = await cupoDeHoy(supabase, username);
  if (cupo.total >= TOPE_TOTAL_DIA && !SIN_LIMITE.has(username)) {
    return json({ error: "Por hoy ya conversamos un montón 🦍 Mañana seguimos con todo." }, 429);
  }
  const delicado = DELICADO.test(texto);
  const riesgoTexto = RIESGO.test(texto);
  const agotado = cupo.usados >= cuenta.limite;

  // Versión gratis sin cupo: respuesta fija (sin gastar IA), salvo un tema delicado.
  if (agotado && cuenta.tipo === "gratis" && !delicado) {
    const respuesta = "Por hoy ya conversamos, causa 🦍 Tus comidas las puedes seguir anotando en Registrar. Con Premium conversamos todo lo que quieras y te las anoto yo 👑";
    const accion = { tipo: "ir_registrar", planes: true };
    await supabase.from("beast_mensajes").insert({ username, rol: "alumno", texto, tipo: via, cuenta: false });
    const { data: fila } = await supabase.from("beast_mensajes").insert({ username, rol: "beast", texto: respuesta, datos: { accion }, tema: "app" }).select("id").single();
    return json({ id: fila?.id, respuesta, accion, cuenta: { ...cuenta, usados: cupo.usados, quedan: 0 } });
  }

  // Lo último de la conversación (para que Beast siga el hilo).
  const { data: previos } = await supabase.from("beast_mensajes").select("rol, texto, datos")
    .eq("username", username).neq("rol", "evento").order("id", { ascending: false }).limit(HISTORIAL_IA);
  const mensajes: any[] = [];
  for (const m of (previos || []).reverse()) {
    const rol = m.rol === "beast" ? "assistant" : "user";
    const contenido = m.rol === "beast" && m.datos?.accion ? `${m.texto}\n[acción propuesta: ${JSON.stringify(m.datos.accion)}]` : m.texto;
    if (!contenido) continue;
    if (mensajes.length && mensajes[mensajes.length - 1].role === rol) mensajes[mensajes.length - 1].content += `\n${contenido}`;
    else mensajes.push({ role: rol, content: contenido });
  }
  if (mensajes.length && mensajes[0].role === "assistant") mensajes.shift();

  const datos = await datosDelAlumno(supabase, username, alumno, cuenta, cuerpo.hoy, libreta);
  const quedan = Math.max(0, cuenta.limite - cupo.usados);
  const nota = [
    "DATOS DEL ALUMNO:", datos,
    `Mensajes que le quedan hoy para conversar: ${cuenta.limite >= 100000 ? "sin tope" : quedan}.`,
    agotado ? "CUPO_AGOTADO: ya usó sus mensajes de hoy." : "",
    via === "voz" ? "(Este mensaje lo dijo por nota de voz; puede tener errores de transcripción.)" : "",
  ].filter(Boolean).join("\n");
  const contenidoUsuario = `${nota}\n\nMENSAJE DEL ALUMNO:\n${texto}`;
  if (mensajes.length && mensajes[mensajes.length - 1].role === "user") mensajes[mensajes.length - 1].content += `\n\n${contenidoUsuario}`;
  else mensajes.push({ role: "user", content: contenidoUsuario });

  const modelo = delicado ? MODELO_DELICADO : MODELO_DIARIO;
  let salida: any = null;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: modelo,
        max_tokens: 1200,
        system: [{ type: "text", text: SISTEMA, cache_control: { type: "ephemeral" } }],
        messages: mensajes,
      }),
    });
    if (!r.ok) {
      console.error("beast-chat: Anthropic respondió", r.status, (await r.text().catch(() => "")).slice(0, 300));
      return json({ error: "sin_ia" }, 502);
    }
    const data = await r.json();
    await anotarUsoIA(supabase, username, modelo, data.usage);
    salida = extraerJson((data.content || []).map((c: any) => c.text || "").join(""));
  } catch (e) {
    console.error("beast-chat: sin conexión con Anthropic", (e as Error)?.message);
    return json({ error: "sin_ia" }, 502);
  }
  if (!salida || typeof salida.respuesta !== "string" || !salida.respuesta.trim()) return json({ error: "sin_ia" }, 502);

  const respuesta = salida.respuesta.trim().slice(0, 1500);
  const accion = limpiarAccion(salida.accion);
  const temas = ["comida", "progreso", "animo", "ejercicio", "app", "planes", "otro"];
  const tema = temas.includes(salida.tema) ? salida.tema : "otro";
  const riesgo = riesgoTexto || salida.riesgo === true;
  const esAnotar = !!accion && ["anotar_comida", "agua", "peso"].includes(accion.tipo);
  // Qué gasta un mensaje del día: en la gratis todo (salvo lo delicado); en
  // prueba y Premium, anotar no gasta, y con el cupo agotado ya no se cuenta.
  const gasta = !delicado && tema !== "animo" && !agotado && (cuenta.tipo === "gratis" || !esAnotar);

  await supabase.from("beast_mensajes").insert({
    username, rol: "alumno", texto, tipo: via, cuenta: gasta, alerta: riesgo && libreta.alerta_jonah === true,
  });
  const { data: fila } = await supabase.from("beast_mensajes").insert({
    username, rol: "beast", texto: respuesta, datos: accion ? { accion } : null, tema, modelo,
  }).select("id").single();

  // Libreta: un dato nuevo por vez, máx. ≈ 1 página (se quitan los más viejos).
  const recordar = typeof salida.recordar === "string" ? salida.recordar.trim().slice(0, 160) : "";
  if (recordar && !riesgo && tema !== "animo") {
    const lineas = String(libreta.notas || "").split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lineas.some((l) => l.toLowerCase() === recordar.toLowerCase())) {
      lineas.push(recordar);
      while (lineas.join("\n").length > MAX_LIBRETA && lineas.length > 1) lineas.shift();
      await supabase.from("beast_libreta").update({ notas: lineas.join("\n"), actualizado_en: new Date().toISOString() }).eq("username", username);
    }
  }

  const usados = cupo.usados + (gasta ? 1 : 0);
  return json({
    id: fila?.id, respuesta, accion, riesgo,
    cuenta: { ...cuenta, usados, quedan: Math.max(0, cuenta.limite - usados) },
  });
}

async function voz(supabase: any, username: string, cuenta: Cuenta, cuerpo: any) {
  if (!OPENAI_API_KEY) return json({ error: "sin_clave" }, 503);
  const bienvenida = cuerpo.bienvenida === true;
  if (cuenta.tipo === "gratis" && !bienvenida) return json({ error: "premium" }, 403);
  const input = String(cuerpo.texto || "").replace(/\s+/g, " ").trim().slice(0, 900);
  if (!input) return json({ error: "Falta el texto." }, 400);
  // Cupo de voz del día (la bienvenida tiene el suyo: 3 en total).
  const periodo = bienvenida ? "beast-voz-bienvenida" : `beast-voz-${fechaLima()}`;
  const tope = bienvenida ? 3 : cuenta.tipo === "prueba" ? VOZ_PRUEBA : SIN_LIMITE.has(username) ? 100000 : VOZ_PREMIUM;
  const { data: usadas } = await supabase.rpc("reservar_foto_reconocimiento", { p_username: username, p_periodo: periodo, p_limite: tope });
  if (usadas === null || usadas === undefined) return json({ error: "limite_voz", limite: tope }, 429);
  const pedir = (voice: string) => fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { authorization: `Bearer ${OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o-mini-tts", voice, input, instructions: INSTRUCCIONES_VOZ, response_format: "mp3" }),
  });
  let r = await pedir(VOZ_BEAST);
  if (r.status === 400) r = await pedir(VOZ_BEAST_RESPALDO);
  if (!r.ok || !r.body) {
    console.error("beast-chat voz: OpenAI respondió", r.status);
    await supabase.rpc("devolver_foto_reconocimiento", { p_username: username, p_periodo: periodo });
    return json({ error: "No se pudo generar la voz." }, 502);
  }
  console.log(JSON.stringify({ evento: "beast_voz", caracteres: input.length, username }));
  return new Response(r.body, { headers: { ...CORS_HEADERS, "content-type": "audio/mpeg", "cache-control": "no-store" } });
}

async function anotarUsoIA(supabase: any, username: string, modelo: string, usage: any) {
  try {
    const u = usage || {};
    await supabase.from("ia_uso").insert({
      funcion: "beast-chat", tipo: "conversacion", username, modelo,
      tokens_entrada: Number(u.input_tokens) || 0, tokens_salida: Number(u.output_tokens) || 0,
      tokens_cache_lectura: Number(u.cache_read_input_tokens) || 0, tokens_cache_escritura: Number(u.cache_creation_input_tokens) || 0,
    });
  } catch (e) {
    console.error("beast-chat: no se pudo anotar el uso de IA", (e as Error)?.message);
  }
}
