import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PRECIOS: Record<number, number> = {
  1: 24.90,
  3: 64.90,
  6: 114.90,
  12: 209.90,
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { username, meses, correo, descuentoPct } = await req.json();

    if (!username || typeof username !== "string") {
      return new Response(JSON.stringify({ error: "Falta el usuario del alumno." }), {
        status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    const mesesNum = Number(meses);
    const precioBase = PRECIOS[mesesNum];
    if (!precioBase) {
      return new Response(JSON.stringify({ error: "Plan invalido." }), {
        status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    if (!correo || typeof correo !== "string" || !correo.includes("@")) {
      return new Response(JSON.stringify({ error: "Falta un correo valido del alumno." }), {
        status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const desc = Math.min(Math.max(Number(descuentoPct) || 0, 0), 100);
    const precio = Math.round(precioBase * (1 - desc / 100) * 100) / 100;

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

    // Si el alumno ya tiene una suscripcion activa de Mercado Pago, la cancelamos antes de crear
    // la nueva, para que nunca queden dos cobros automaticos corriendo a la vez.
    const { data: alumnoActual } = await supabase
      .from("alumnos")
      .select("mp_preapproval_id")
      .eq("username", username)
      .maybeSingle();

    if (alumnoActual?.mp_preapproval_id) {
      try {
        await fetch(`https://api.mercadopago.com/preapproval/${alumnoActual.mp_preapproval_id}`, {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "cancelled" }),
        });
      } catch { /* si ya estaba cancelada o no existe, seguimos igual */ }
    }

    const nombrePlan = mesesNum === 1 ? "Mensual" : mesesNum === 3 ? "Trimestral" : mesesNum === 6 ? "Semestral" : "Anual";
    const referencia = `${username}::${mesesNum}`;

    const mpRes = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason: `Jonah Beast Fuel - Plan ${nombrePlan}`,
        external_reference: referencia,
        payer_email: correo,
        back_url: "https://jonahbeast.com",
        auto_recurring: {
          frequency: mesesNum,
          frequency_type: "months",
          transaction_amount: precio,
          currency_id: "PEN",
        },
        status: "pending",
      }),
    });

    const data = await mpRes.json();

    if (!mpRes.ok) {
      return new Response(JSON.stringify({ error: "Mercado Pago rechazo la solicitud.", detalle: data }), {
        status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Guardamos el id de esta nueva suscripcion para poder cancelarla la proxima vez que compre otro plan
    await supabase.from("alumnos").update({ mp_preapproval_id: data.id }).eq("username", username);

    return new Response(JSON.stringify({ init_point: data.init_point }), {
      status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Error interno.", detalle: String(err) }), {
      status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
