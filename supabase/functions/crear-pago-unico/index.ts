import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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

    const nombrePlan = mesesNum === 1 ? "Mensual" : mesesNum === 3 ? "Trimestral" : mesesNum === 6 ? "Semestral" : "Anual";
    const referencia = `${username}::${mesesNum}`;

    // Checkout Pro: preferencia de pago UNICO, sin cobro automatico futuro.
    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{
          title: `Jonah Beast Fuel - Plan ${nombrePlan}`,
          quantity: 1,
          unit_price: precio,
          currency_id: "PEN",
        }],
        payer: { email: correo },
        external_reference: referencia,
        back_urls: {
          success: "https://jonahbeast.com",
          failure: "https://jonahbeast.com",
          pending: "https://jonahbeast.com",
        },
        auto_return: "approved",
      }),
    });

    const data = await mpRes.json();

    if (!mpRes.ok) {
      return new Response(JSON.stringify({ error: "Mercado Pago rechazo la solicitud.", detalle: data }), {
        status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ init_point: data.init_point }), {
      status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Error interno.", detalle: String(err) }), {
      status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
