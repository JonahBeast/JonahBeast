import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PRECIO_MENSUAL = 11.90;

function responder(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// El alumno sale de la sesión iniciada, nunca de lo que mande el navegador.
// Así nadie puede cancelar la suscripción de otro alumno mandando su usuario.
async function usuarioDeLaSesion(supabase: any, req: Request): Promise<string | null> {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  const { data: perfil } = await supabase.from("profiles").select("username").eq("id", data.user.id).maybeSingle();
  return perfil?.username || null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { correo } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      (Deno.env.get("CLAVE_SERVICIO") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!,
    );

    const username = await usuarioDeLaSesion(supabase, req);
    if (!username) return responder({ error: "Inicia sesión para pagar." }, 401);

    if (!correo || typeof correo !== "string" || !correo.includes("@")) {
      return responder({ error: "Falta un correo válido del alumno." }, 400);
    }

    const accessToken = Deno.env.get("MP_ACCESS_TOKEN");
    if (!accessToken) return responder({ error: "Falta configurar MP_ACCESS_TOKEN." }, 500);

    const { data: alumnoActual } = await supabase
      .from("alumnos")
      .select("mp_preapproval_id_addon")
      .eq("username", username)
      .maybeSingle();

    if (alumnoActual?.mp_preapproval_id_addon) {
      try {
        await fetch(`https://api.mercadopago.com/preapproval/${alumnoActual.mp_preapproval_id_addon}`, {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "cancelled" }),
        });
      } catch { /* si ya estaba cancelada o no existe, seguimos igual */ }
    }

    const referencia = `addon-foto::${username}::1`;

    const mpRes = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason: "Jonah Beast Fuel - Reconocimiento Inteligente (mensual)",
        external_reference: referencia,
        payer_email: correo,
        back_url: "https://jonahbeast.com",
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: PRECIO_MENSUAL,
          currency_id: "PEN",
        },
        status: "pending",
      }),
    });

    const data = await mpRes.json();

    if (!mpRes.ok) {
      console.error("Mercado Pago rechazo la suscripcion del add-on:", mpRes.status, JSON.stringify(data));
      return responder({ error: "Mercado Pago rechazó la solicitud." }, 400);
    }

    await supabase.from("alumnos").update({ mp_preapproval_id_addon: data.id }).eq("username", username);

    return responder({ init_point: data.init_point });
  } catch (err) {
    console.error("crear-suscripcion-addon-foto:", String(err));
    return responder({ error: "Error interno." }, 500);
  }
});
