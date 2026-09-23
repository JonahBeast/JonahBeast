import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
    const { username, meses, correo } = await req.json();

    if (!username || typeof username !== "string") {
      return new Response(JSON.stringify({ error: "Falta el usuario del alumno." }), {
        status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    const mesesNum = Number(meses);
    if (![1, 3, 6].includes(mesesNum)) {
      return new Response(JSON.stringify({ error: "Duraci\u00f3n inv\u00e1lida." }), {
        status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    if (!correo || typeof correo !== "string" || !correo.includes("@")) {
      return new Response(JSON.stringify({ error: "Falta un correo v\u00e1lido del alumno." }), {
        status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const precio = Math.round(PRECIO_MENSUAL * mesesNum * 100) / 100;

    const accessToken = Deno.env.get("MP_ACCESS_TOKEN");
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Falta configurar MP_ACCESS_TOKEN." }), {
        status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Misma convenci\u00f3n que crear-pago-unico, pero con un prefijo
    // "addon-foto::" para que el webhook sepa que esto activa el add-on
    // de Reconocimiento Inteligente, no un plan principal.
    const referencia = `addon-foto::${username}::${mesesNum}`;

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{
          title: `Jonah Beast Fuel - Reconocimiento Inteligente (${mesesNum} ${mesesNum === 1 ? "mes" : "meses"})`,
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
      return new Response(JSON.stringify({ error: "Mercado Pago rechaz\u00f3 la solicitud.", detalle: data }), {
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
