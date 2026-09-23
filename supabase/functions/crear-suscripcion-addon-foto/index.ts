import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PRECIO_MENSUAL = 11.90;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { username, correo } = await req.json();

    if (!username || typeof username !== "string") {
      return new Response(JSON.stringify({ error: "Falta el usuario del alumno." }), {
        status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    if (!correo || typeof correo !== "string" || !correo.includes("@")) {
      return new Response(JSON.stringify({ error: "Falta un correo v\u00e1lido del alumno." }), {
        status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const accessToken = Deno.env.get("MP_ACCESS_TOKEN");
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Falta configurar MP_ACCESS_TOKEN." }), {
        status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

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
      return new Response(JSON.stringify({ error: "Mercado Pago rechaz\u00f3 la solicitud.", detalle: data }), {
        status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    await supabase.from("alumnos").update({ mp_preapproval_id_addon: data.id }).eq("username", username);

    return new Response(JSON.stringify({ init_point: data.init_point }), {
      status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Error interno.", detalle: String(err) }), {
      status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
