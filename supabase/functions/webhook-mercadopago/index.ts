import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

function addMonthsISO(iso: string, months: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

Deno.serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    let type = url.searchParams.get("type") || url.searchParams.get("topic");
    let dataId = url.searchParams.get("data.id") || url.searchParams.get("id");

    if (!type || !dataId) {
      try {
        const body = await req.json();
        type = type || body.type || body.topic;
        dataId = dataId || body.data?.id || body.resource;
      } catch { /* sin cuerpo JSON */ }
    }

    if (type !== "payment" || !dataId) return new Response("ok", { status: 200 });

    const accessToken = Deno.env.get("MP_ACCESS_TOKEN");
    if (!accessToken) return new Response("falta MP_ACCESS_TOKEN", { status: 500 });

    const pagoRes = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
      headers: { "Authorization": `Bearer ${accessToken}` },
    });
    if (!pagoRes.ok) return new Response("ok", { status: 200 });
    const pago = await pagoRes.json();
    if (pago.status !== "approved") return new Response("ok", { status: 200 });

    const referencia: string = pago.external_reference || "";
    const monto = Number(pago.transaction_amount);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // --- Pago de un PEDIDO DE TIENDA ---
    if (referencia.startsWith("tienda::")) {
      const pedidoId = referencia.split("::")[1];
      if (!pedidoId) return new Response("ok", { status: 200 });

      const { data: pedido } = await supabase.from("tienda_pedidos").select("estado").eq("id", pedidoId).maybeSingle();
      if (!pedido || pedido.estado === "aprobado") return new Response("ok", { status: 200 }); // ya procesado, no duplicar

      await supabase.from("tienda_pedidos")
        .update({ estado: "aprobado", operacion: String(pago.id) })
        .eq("id", pedidoId);
      // El descuento de stock y el registro en Finanzas los hace el trigger de la base de datos
      return new Response("ok", { status: 200 });
    }

    // --- Pago del ADD-ON "Reconocimiento Inteligente" (fotos) ---
    // Referencia: addon-foto::<username>::<meses>. Si ya tenia el add-on
    // activo, extiende desde su fecha de vencimiento actual (no resetea
    // el ciclo de 30 dias que ya tenia corriendo); si estaba vencido o
    // nunca lo activo, arranca de hoy.
    if (referencia.startsWith("addon-foto::")) {
      const partes = referencia.split("::");
      const usernameAddon = partes[1];
      const mesesAddon = parseInt(partes[2], 10);
      if (!usernameAddon || !mesesAddon || mesesAddon <= 0) return new Response("ok", { status: 200 });

      const { data: alumnoAddon } = await supabase.from("alumnos")
        .select("reconocimiento_foto_desde, reconocimiento_foto_hasta")
        .eq("username", usernameAddon).maybeSingle();
      const activo = !!(alumnoAddon?.reconocimiento_foto_hasta && alumnoAddon.reconocimiento_foto_hasta > todayISO());
      const baseHasta = activo ? alumnoAddon!.reconocimiento_foto_hasta : todayISO();
      const nuevaHasta = addMonthsISO(baseHasta, mesesAddon);
      const nuevaDesde = activo ? alumnoAddon!.reconocimiento_foto_desde : todayISO();

      const { error: errPagoAddon } = await supabase.from("pagos").insert({
        username: usernameAddon, plan_meses: mesesAddon, monto,
        metodo: "Mercado Pago (add-on foto)", operacion: String(pago.id), estado: "aprobado",
      });
      if (errPagoAddon) return new Response("ok", { status: 200 }); // ya procesado, no duplicar

      await supabase.from("alumnos").update({
        reconocimiento_foto_desde: nuevaDesde, reconocimiento_foto_hasta: nuevaHasta,
      }).eq("username", usernameAddon);

      return new Response("ok", { status: 200 });
    }

    // --- Pago de una SUSCRIPCION (usuario::meses), como ya funcionaba ---
    const [username, mesesStr] = referencia.split("::");
    const meses = parseInt(mesesStr, 10);
    if (!username || !meses || meses <= 0) return new Response("ok", { status: 200 });

    const { error: errPago } = await supabase.from("pagos").insert({
      username, plan_meses: meses, monto, metodo: "Mercado Pago", operacion: String(pago.id), estado: "aprobado",
    });
    if (errPago) return new Response("ok", { status: 200 });

    const { data: alumno } = await supabase.from("alumnos").select("fecha_vencimiento").eq("username", username).maybeSingle();
    const base = alumno?.fecha_vencimiento && alumno.fecha_vencimiento > todayISO() ? alumno.fecha_vencimiento : todayISO();
    const nuevaFecha = addMonthsISO(base, meses);
    await supabase.from("alumnos").update({ fecha_vencimiento: nuevaFecha, enabled: true, plan: "pago" }).eq("username", username);

    return new Response("ok", { status: 200 });
  } catch (err) {
    return new Response("error: " + String(err), { status: 200 });
  }
});
