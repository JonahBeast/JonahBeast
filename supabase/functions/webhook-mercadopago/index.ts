import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Precios de respaldo de los planes: solo se usan si en la tabla config no
// hay uno guardado (son los mismos que usan la app y crear-pago-unico).
const PRECIOS_RESPALDO: Record<number, number> = { 1: 24.90, 3: 64.90, 6: 114.90, 12: 209.90 };
const PRECIO_ADDON_MENSUAL = 11.90;
// Margen para redondeos de centavos al comparar lo pagado con lo esperado.
const TOLERANCIA = 0.01;

function addMonthsISO(iso: string, months: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// Mismo cálculo que crear-pago-unico / crear-suscripcion: precio de config
// (o de respaldo) menos el descuento del código de referido del alumno.
// Devuelve null si el alumno no existe.
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

const soles = (n: number) => `S/${n.toFixed(2)}`;

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

    // El pago siempre se consulta directo a Mercado Pago con nuestra llave:
    // un aviso falso no puede inventar un pago aprobado.
    const pagoRes = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
      headers: { "Authorization": `Bearer ${accessToken}` },
    });
    if (!pagoRes.ok) return new Response("ok", { status: 200 });
    const pago = await pagoRes.json();
    if (pago.status !== "approved") return new Response("ok", { status: 200 });

    const referencia: string = pago.external_reference || "";
    const monto = Number(pago.transaction_amount);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (pago.currency_id && pago.currency_id !== "PEN") {
      console.error("Pago en otra moneda, no se activa nada:", pago.id, pago.currency_id, referencia);
      return new Response("ok", { status: 200 });
    }

    // --- Pago de un PEDIDO DE TIENDA ---
    if (referencia.startsWith("tienda::")) {
      const pedidoId = referencia.split("::")[1];
      if (!pedidoId) return new Response("ok", { status: 200 });

      const { data: pedido } = await supabase.from("tienda_pedidos")
        .select("estado, monto_total, nota_motivo").eq("id", pedidoId).maybeSingle();
      if (!pedido || pedido.estado === "aprobado") return new Response("ok", { status: 200 }); // ya procesado, no duplicar

      // Si se pagó menos que el total del pedido, no se aprueba: queda
      // pendiente con una nota para que el admin lo revise.
      const esperado = Number(pedido.monto_total) || 0;
      if (monto + TOLERANCIA < esperado) {
        const aviso = `Pago MP ${pago.id}: se pagó ${soles(monto)} de ${soles(esperado)} - revisar`;
        if (!String(pedido.nota_motivo || "").includes(`Pago MP ${pago.id}`)) {
          await supabase.from("tienda_pedidos")
            .update({ nota_motivo: pedido.nota_motivo ? `${pedido.nota_motivo} · ${aviso}` : aviso })
            .eq("id", pedidoId);
        }
        console.error("Pedido pagado de menos:", pedidoId, monto, esperado);
        return new Response("ok", { status: 200 });
      }

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
      if (!usernameAddon || ![1, 3, 6].includes(mesesAddon)) return new Response("ok", { status: 200 });

      // Si se pagó menos de lo que cuesta, se registra como rechazado con
      // una nota (así queda a la vista en el panel) y no se activa nada.
      // No se deja "pendiente" porque aprobarlo desde el panel extendería
      // el plan principal, no el add-on.
      const esperado = Math.round(PRECIO_ADDON_MENSUAL * mesesAddon * 100) / 100;
      if (monto + TOLERANCIA < esperado) {
        await supabase.from("pagos").insert({
          username: usernameAddon, plan_meses: mesesAddon, monto,
          metodo: "Mercado Pago (add-on foto)", operacion: String(pago.id), estado: "rechazado",
          nota_admin: `Se pagó ${soles(monto)} y el add-on cuesta ${soles(esperado)}: no se activó. Revisar en Mercado Pago.`,
        });
        console.error("Add-on pagado de menos:", pago.id, usernameAddon, monto, esperado);
        return new Response("ok", { status: 200 });
      }

      const { data: alumnoAddon } = await supabase.from("alumnos")
        .select("reconocimiento_foto_desde, reconocimiento_foto_hasta")
        .eq("username", usernameAddon).maybeSingle();
      if (!alumnoAddon) return new Response("ok", { status: 200 });
      const activo = !!(alumnoAddon.reconocimiento_foto_hasta && alumnoAddon.reconocimiento_foto_hasta > todayISO());
      const baseHasta = activo ? alumnoAddon.reconocimiento_foto_hasta : todayISO();
      const nuevaHasta = addMonthsISO(baseHasta, mesesAddon);
      const nuevaDesde = activo ? alumnoAddon.reconocimiento_foto_desde : todayISO();

      // La base de datos no deja registrar dos veces la misma operación de
      // Mercado Pago: si este aviso llega repetido, el insert falla y no se
      // vuelve a extender.
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

    // --- Pago de un PLAN (usuario::meses), unico o de suscripcion ---
    const [username, mesesStr] = referencia.split("::");
    const meses = parseInt(mesesStr, 10);
    if (!username || !PRECIOS_RESPALDO[meses]) return new Response("ok", { status: 200 });

    const esperado = await precioDelPlan(supabase, username, meses);
    if (esperado === null) return new Response("ok", { status: 200 }); // el alumno no existe

    // Si se pagó menos de lo que cuesta el plan, se registra el pago como
    // pendiente, con una nota, y no se activa nada: el admin decide desde
    // el panel si lo aprueba.
    if (monto + TOLERANCIA < esperado) {
      await supabase.from("pagos").insert({
        username, plan_meses: meses, monto, metodo: "Mercado Pago", operacion: String(pago.id), estado: "pendiente",
        nota_admin: `Se pagó ${soles(monto)} y el plan cuesta ${soles(esperado)}: no se activó automáticamente.`,
      });
      console.error("Plan pagado de menos:", pago.id, username, monto, esperado);
      return new Response("ok", { status: 200 });
    }

    const { error: errPago } = await supabase.from("pagos").insert({
      username, plan_meses: meses, monto, metodo: "Mercado Pago", operacion: String(pago.id), estado: "aprobado",
    });
    if (errPago) return new Response("ok", { status: 200 }); // ya procesado, no duplicar

    const { data: alumno } = await supabase.from("alumnos").select("fecha_vencimiento").eq("username", username).maybeSingle();
    const base = alumno?.fecha_vencimiento && alumno.fecha_vencimiento > todayISO() ? alumno.fecha_vencimiento : todayISO();
    const nuevaFecha = addMonthsISO(base, meses);
    await supabase.from("alumnos").update({ fecha_vencimiento: nuevaFecha, enabled: true, plan: "pago" }).eq("username", username);

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("webhook-mercadopago:", String(err));
    return new Response("error", { status: 200 });
  }
});
