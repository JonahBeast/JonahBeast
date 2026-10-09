// Edge Function: jarvis-voz
// Convierte las respuestas de Jarvis en audio con una voz realista (OpenAI,
// modelo gpt-4o-mini-tts) para el panel de administrador. Si esta función
// falla o no tiene la clave, el panel vuelve solo a la voz del celular.
//
// Se despliega con verify_jwt = false, igual que jarvis-chat: el control de
// acceso lo hace el propio código (solo el admin con sesión iniciada).
//
// Necesita el secreto OPENAI_API_KEY en Supabase (Edge Functions → Secrets).
// Publicación (CLAUDE.md): solo después del merge, con el código de main.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = (Deno.env.get("CLAVE_SERVICIO") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Voces que ofrece el panel (la primera es la de por defecto). "jarvis" no
// es una voz aparte: es la voz masculina "cedar" (la más natural de OpenAI)
// con instrucciones de estilo de mayordomo inteligente (no imita la voz de
// ningún actor real). Si "cedar" no respondiera, se usa "onyx".
const VOCES = ["jarvis", "friday", "beast", "beast2", "cedar", "marin", "coral", "nova", "shimmer", "sage", "onyx", "ash", "echo"];
const VOZ_JARVIS = "cedar";
const VOZ_JARVIS_RESPALDO = "onyx";
// "friday": voz femenina "marin" con estilo de asistente de laboratorio
// joven y directa (respaldo: "coral").
const VOZ_FRIDAY = "marin";
const VOZ_FRIDAY_RESPALDO = "coral";
// "beast": el gorila de la app como compañero (docs/idea-beast.md), con
// personalidad de pata peruano: cercano, motivador y con humor. Dos voces
// para que Jonah elija la que suena más humana: "beast" = "onyx" (grave, la
// del gorila de los videos) y "beast2" = "ash" (más expresiva).
const VOZ_BEAST = "onyx";
const VOZ_BEAST_RESPALDO = "ash";
const VOZ_BEAST2 = "ash";
const VOZ_BEAST2_RESPALDO = "onyx";
// Tope de texto por llamada: acota el costo de cada respuesta.
const MAX_CARACTERES = 1500;
const INSTRUCCIONES =
  "Habla en español latinoamericano neutro, como una asistente de inteligencia artificial futurista " +
  "y elegante: tono seguro y cercano, ritmo rápido y fluido de conversación, sin pausas largas, " +
  "pronunciación clara de nombres y cifras. Suena natural, nunca robótica.";
// Estilo inspirado en las IA mayordomo del cine, sin imitar a ningún actor.
// Antes pedía "calma absoluta" y "pausas": sonaba lento. Ahora, ágil.
const INSTRUCCIONES_JARVIS =
  "Eres la voz de un asistente de inteligencia artificial refinado y leal, al estilo de un mayordomo británico muy culto " +
  "que habla español latinoamericano neutro. Voz masculina de registro medio, cálida, dicción nítida. " +
  "Habla RÁPIDO y FLUIDO, a la velocidad de una conversación ágil entre personas que se conocen bien: " +
  "encadena las frases sin pausas largas, sin alargar las palabras y sin dramatizar. " +
  "Seguro y eficiente, cortés, con humor seco apenas insinuado. " +
  "Pronuncia nombres y cifras con claridad pero sin frenar. Nunca suenes robótico, lento ni teatral.";
// Más humana, más grave y más de barrio (pedidos de Jonah del 9 de
// octubre): que hable como le hablas a tu pata de toda la vida. Va por
// partes, como recomienda OpenAI para estas voces.
const INSTRUCCIONES_BEAST =
  "Quién eres: Beast, el gorila de la app Jonah Beast Fuel. Le hablas a tu pata de toda la vida, al que conoces desde el colegio: " +
  "con confianza total, en confianza de barrio, como en la esquina o en una pichanga con los amigos. No eres asistente, ni locutor, ni vendedor. " +
  "Voz: masculina, MUY grave y profunda, que sale del pecho, un poco ronca y relajada, como de un pata grandote y buena gente. Habla sonriendo. " +
  "Acento: limeño de barrio bien marcado, con la entonación cantadita que sube y se estira al final de las frases; se comen un poco las eses del final " +
  "y algunas d (\"cansao\", \"pesao\"); nada de español neutro, mexicano ni español de España. " +
  "Jerga: las palabras de la calle (causa, causita, pata, oe, pe, ps, ya fue, al toque, chévere, bacán, roche, mandarse, bajarse) dilas con total naturalidad, " +
  "como alguien de Lima que las dice todos los días, sin remarcarlas ni actuarlas. \"Oe\" se dice corto y con energía. " +
  "Emoción: buen humor de amigos; se te escapa una risa de verdad (\"jajaja\") en lo gracioso; cuando motivas, subes la energía como cuando alientas a tu pata en la cancha. Nunca regañas. " +
  "Ritmo: de conversación real entre amigos, suelto, con pausitas y respiraciones naturales; alarga palabras cuando sale natural (\"tranquiii\", \"vamooos\"). " +
  "Prohibido sonar robótico, monótono, leído, formal, teatral o de locutor de radio: tiene que sonar a audio de WhatsApp de un amigo.";
// Estilo inspirado en la asistente IA femenina del cine, sin imitar a ninguna actriz.
const INSTRUCCIONES_FRIDAY =
  "Eres la voz de una asistente de inteligencia artificial de laboratorio, joven, lista y leal, que habla español " +
  "latinoamericano neutro. Voz femenina de registro medio, clara y cálida. Habla RÁPIDO y FLUIDO, práctica y directa, " +
  "como una compañera de trabajo de confianza que ya sabe lo que el jefe necesita: frases encadenadas, sin pausas largas. " +
  "Relajada y segura, un poco informal, con un toque de picardía y humor rápido apenas insinuado. " +
  "Pronuncia nombres y cifras con claridad pero sin frenar. Nunca suenes robótica, lenta ni teatral.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Candado: solo el admin (profiles.role = 'admin') con sesión iniciada.
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "No autorizado." }, 401);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) return json({ error: "No autorizado." }, 401);
    const { data: perfil } = await supabase
      .from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
    if (perfil?.role !== "admin") return json({ error: "No autorizado." }, 403);

    if (!OPENAI_API_KEY) return json({ error: "sin_clave" }, 503);

    const { texto, voz } = await req.json();
    const input = String(texto || "").replace(/\s+/g, " ").trim().slice(0, MAX_CARACTERES);
    if (!input) return json({ error: "Falta el texto." }, 400);
    const elegida = VOCES.includes(voz) ? voz : VOCES[0];
    const instructions = elegida === "jarvis" ? INSTRUCCIONES_JARVIS : elegida === "friday" ? INSTRUCCIONES_FRIDAY : (elegida === "beast" || elegida === "beast2") ? INSTRUCCIONES_BEAST : INSTRUCCIONES;
    const pedir = (voice: string) => fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { "authorization": `Bearer ${OPENAI_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o-mini-tts", voice, input, instructions, response_format: "mp3" }),
    });
    let r = await pedir(elegida === "jarvis" ? VOZ_JARVIS : elegida === "friday" ? VOZ_FRIDAY : elegida === "beast" ? VOZ_BEAST : elegida === "beast2" ? VOZ_BEAST2 : elegida);
    // Si OpenAI no acepta la voz nueva, sigue hablando con la de respaldo.
    if (r.status === 400 && elegida === "jarvis") r = await pedir(VOZ_JARVIS_RESPALDO);
    if (r.status === 400 && elegida === "friday") r = await pedir(VOZ_FRIDAY_RESPALDO);
    if (r.status === 400 && elegida === "beast") r = await pedir(VOZ_BEAST_RESPALDO);
    if (r.status === 400 && elegida === "beast2") r = await pedir(VOZ_BEAST2_RESPALDO);
    if (!r.ok || !r.body) {
      console.error("jarvis-voz: OpenAI respondió", r.status, (await r.text().catch(() => "")).slice(0, 300));
      return json({ error: "No se pudo generar la voz." }, 502);
    }
    // Consumo, para poder medir el costo en los registros de Supabase.
    console.log(JSON.stringify({ evento: "jarvis_voz", caracteres: input.length, voz: elegida }));
    return new Response(r.body, {
      headers: { ...CORS_HEADERS, "content-type": "audio/mpeg", "cache-control": "no-store" },
    });
  } catch (e) {
    console.error("jarvis-voz:", (e as Error)?.message);
    return json({ error: "Error inesperado." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "content-type": "application/json" },
  });
}
