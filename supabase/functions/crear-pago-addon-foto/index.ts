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
    const { meses, correo } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const username = await usuarioDeLaSesion(supabase, req);
    if (!username) return responder({ error: "Inicia sesión para pagar." }, 401);

    const mesesNum = Number(meses);
    if (![1, 3, 6].includes(mesesNum)) {
      return responder({ error: "Duración inválida." }, 400);
    }
    if (!correo || typeof correo !== "string" || !correo.includes("@")) {
      return responder({ error: "Falta un correo válido del alumno." }, 400);
    }

    const precio = Math.round(PRECIO_MENSUAL * mesesNum * 100) / 100;

    const accessToken = Deno.env.get("MP_ACCESS_TOKEN");
    if (!accessToken) return responder({ error: "Falta configurar MP_ACCESS_TOKEN." }, 500);

    // Misma convención que crear-pago-unico, pero con un prefijo
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
      console.error("Mercado Pago rechazo la preferencia del add-on:", mpRes.status, JSON.stringify(data));
      return responder({ error: "Mercado Pago rechazó la solicitud." }, 400);
    }

    return responder({ init_point: data.init_point });
  } catch (err) {
    console.error("crear-pago-addon-foto:", String(err));
    return responder({ error: "Error interno." }, 500);
  }
});
