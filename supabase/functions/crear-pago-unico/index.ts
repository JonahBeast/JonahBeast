import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Precios de respaldo: solo se usan si en la tabla config no hay uno
// guardado (son los mismos que usa la app).
const PRECIOS_RESPALDO: Record<number, number> = {
  1: 24.90,
  3: 64.90,
  6: 114.90,
  12: 209.90,
};

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

// Precio del plan calculado aquí: el de la tabla config (o el de respaldo)
// menos el descuento del código de referido del alumno, si el código sigue
// activo. Es el mismo cálculo que muestra la app. Nunca se usa un % que
// mande el navegador. Devuelve null si el alumno no existe.
async function precioDelPlan(supabase: any, username: string, meses: number): Promise<number | null> {
  const [{ data: config }, { data: alumno }] = await Promise.all([
    supabase.from("config").select("value").eq("key", `precio_${meses}`).maybeSingle(),
    supabase.from("alumnos").select("codigo_referido").eq("username", username).maybeSingle(),
  ]);
  if (!alumno) return null;
  const guardado = parseFloat(config?.value);
  const base = guardado > 0 ? guardado : PRECIOS_RESPALDO[meses];
  let descuento = 0;
  const codigo = String(alumno.codigo_referido || "").trim();
  if (codigo) {
    const { data: referidor } = await supabase.from("referidores")
      .select("descuento_pct").ilike("codigo", codigo.replace(/[\\%_]/g, (c) => "\\" + c))
      .eq("activo", true).maybeSingle();
    descuento = Math.min(Math.max(Number(referidor?.descuento_pct) || 0, 0), 100);
  }
  return Math.round(base * (1 - descuento / 100) * 100) / 100;
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
    if (!PRECIOS_RESPALDO[mesesNum]) return responder({ error: "Plan invalido." }, 400);
    if (!correo || typeof correo !== "string" || !correo.includes("@")) {
      return responder({ error: "Falta un correo valido del alumno." }, 400);
    }

    const precio = await precioDelPlan(supabase, username, mesesNum);
    if (!precio) return responder({ error: "No encontramos tu cuenta de alumno." }, 404);

    const accessToken = Deno.env.get("MP_ACCESS_TOKEN");
    if (!accessToken) return responder({ error: "Falta configurar MP_ACCESS_TOKEN." }, 500);

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
      console.error("Mercado Pago rechazo la preferencia:", mpRes.status, JSON.stringify(data));
      return responder({ error: "Mercado Pago rechazo la solicitud." }, 400);
    }

    return responder({ init_point: data.init_point });
  } catch (err) {
    console.error("crear-pago-unico:", String(err));
    return responder({ error: "Error interno." }, 500);
  }
});
