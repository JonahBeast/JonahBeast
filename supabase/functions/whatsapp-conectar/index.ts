// Edge Function: whatsapp-conectar
// Conecta el WhatsApp Business de Jonah con la app (coexistencia): el panel
// de admin abre la ventana oficial de Meta, Jonah escanea el QR con su
// WhatsApp Business, y Meta devuelve un código de un solo uso. Aquí ese
// código se cambia por la llave de acceso, se suscribe la app a los
// mensajes del número y se pide a Meta que copie contactos e historial.
//
// Acciones (POST {accion}):
//   "estado"   → si hay un número conectado (nunca devuelve la llave).
//   "conectar" → {code, waba_id, phone_number_id} de la ventana de Meta.
//
// verify_jwt = false porque el candado de admin está en el código (igual
// que jarvis-chat). Necesita el secreto WHATSAPP_APP_SECRET.
// Publicación (regla de CLAUDE.md): solo después del merge, con el código de main.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GRAPH = "https://graph.facebook.com/v23.0";
const APP_ID = "1123671916889585"; // app "Jonah Beast Asistente" en Meta for Developers
const APP_SECRET = Deno.env.get("WHATSAPP_APP_SECRET") || "";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "content-type": "application/json" } });
}

async function graph(ruta: string, token: string | null, cuerpo?: unknown) {
  const r = await fetch(GRAPH + ruta, {
    method: cuerpo ? "POST" : "GET",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(cuerpo ? { "Content-Type": "application/json" } : {}) },
    ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error?.message || `Meta respondió ${r.status}`);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      (Deno.env.get("CLAVE_SERVICIO") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!,
    );

    // Candado: solo el admin con sesión iniciada.
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "No autorizado." }, 401);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) return json({ error: "No autorizado." }, 401);
    const { data: perfil } = await supabase.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
    if (perfil?.role !== "admin") return json({ error: "No autorizado." }, 403);

    const { accion, code, waba_id, phone_number_id } = await req.json();

    if (accion === "estado") {
      const { data: cuenta } = await supabase.from("whatsapp_cuenta")
        .select("telefono, nombre_visible, conectado_en, token").eq("id", 1).maybeSingle();
      return json({
        conectado: !!cuenta?.token,
        telefono: cuenta?.telefono || null,
        nombre: cuenta?.nombre_visible || null,
        conectado_en: cuenta?.conectado_en || null,
        falta_secreto: !APP_SECRET,
      });
    }

    if (accion !== "conectar") return json({ error: "Acción desconocida." }, 400);
    if (!APP_SECRET) return json({ error: "Falta el secreto WHATSAPP_APP_SECRET en Supabase." }, 500);
    if (!code || !waba_id || !phone_number_id) return json({ error: "Meta no devolvió todos los datos. Intenta conectar de nuevo." }, 400);

    // 1) El código de un solo uso se cambia por la llave de acceso del negocio.
    const intercambio = await graph(
      `/oauth/access_token?client_id=${APP_ID}&client_secret=${encodeURIComponent(APP_SECRET)}&code=${encodeURIComponent(code)}`,
      null,
    );
    const llave = intercambio?.access_token;
    if (!llave) return json({ error: "Meta no entregó la llave de acceso." }, 502);

    // 2) La app se suscribe a los mensajes de esa cuenta de WhatsApp.
    await graph(`/${waba_id}/subscribed_apps`, llave, {});

    // 3) Datos del número, para mostrarlos en el panel.
    const numero = await graph(`/${phone_number_id}?fields=display_phone_number,verified_name`, llave).catch(() => ({}));

    await supabase.from("whatsapp_cuenta").upsert({
      id: 1, waba_id, phone_number_id, token: llave,
      telefono: numero?.display_phone_number || null,
      nombre_visible: numero?.verified_name || null,
      conectado_en: new Date().toISOString(),
    }, { onConflict: "id" });

    // 4) Coexistencia: Meta copia contactos e historial del WhatsApp Business.
    // Si falla, el número igual queda conectado; solo no se ve el historial viejo.
    const copias: Record<string, string> = {};
    for (const sync_type of ["smb_app_state_sync", "history"]) {
      try {
        await graph(`/${phone_number_id}/smb_app_data`, llave, { messaging_product: "whatsapp", sync_type });
        copias[sync_type] = "ok";
      } catch (e) {
        copias[sync_type] = (e as Error)?.message || "error";
      }
    }
    console.log(JSON.stringify({ evento: "whatsapp_conectado", waba_id, phone_number_id, copias }));

    return json({ ok: true, telefono: numero?.display_phone_number || null, nombre: numero?.verified_name || null, copias });
  } catch (e) {
    console.error("whatsapp-conectar:", (e as Error)?.message);
    return json({ error: (e as Error)?.message || "Error inesperado." }, 500);
  }
});
