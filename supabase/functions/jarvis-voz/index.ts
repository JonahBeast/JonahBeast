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
// es una voz aparte: es la voz masculina "onyx" con instrucciones de estilo
// de mayordomo inteligente (no imita la voz de ningún actor real).
const VOCES = ["jarvis", "coral", "nova", "shimmer", "sage", "onyx", "ash", "echo"];
// Tope de texto por llamada: acota el costo de cada respuesta.
const MAX_CARACTERES = 1500;
const INSTRUCCIONES =
  "Habla en español latinoamericano neutro, como una asistente de inteligencia artificial futurista " +
  "y elegante: tono calmado, seguro y cercano, ritmo ágil, pronunciación clara de nombres y cifras. " +
  "Suena natural, nunca robótica.";
const INSTRUCCIONES_JARVIS =
  "Habla en español latinoamericano neutro como un mayordomo de inteligencia artificial muy sofisticado: " +
  "voz masculina grave, serena y elegante, formal pero cercana, con total seguridad y un toque sutil de ironía fina. " +
  "Ritmo pausado y preciso, pronunciación impecable de nombres y cifras. Nunca suenes robótico ni exagerado.";

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
    const voice = elegida === "jarvis" ? "onyx" : elegida;
    const instructions = elegida === "jarvis" ? INSTRUCCIONES_JARVIS : INSTRUCCIONES;

    const r = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { "authorization": `Bearer ${OPENAI_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o-mini-tts", voice, input, instructions, response_format: "mp3" }),
    });
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
