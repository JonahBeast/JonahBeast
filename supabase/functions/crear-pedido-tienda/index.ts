import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Topes de un carrito: productos distintos y unidades de cada uno.
const MAX_PRODUCTOS = 30;
const MAX_UNIDADES = 99;

function responder(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// Si el comprador tiene sesión de alumno, el pedido queda a su nombre.
// El usuario nunca se toma de lo que mande el navegador.
async function usuarioDeLaSesion(supabase: any, req: Request): Promise<string | null> {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  const { data: perfil } = await supabase.from("profiles").select("username").eq("id", data.user.id).maybeSingle();
  return perfil?.username || null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const { items, nombreCliente, telefonoCliente, correo, direccion, distrito, fechaNacimiento, codigoDescuento } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return responder({ error: "El carrito esta vacio." }, 400);
    }
    if (!nombreCliente || !telefonoCliente || !correo) {
      return responder({ error: "Faltan datos del cliente." }, 400);
    }

    // Cada producto debe venir con una cantidad entera entre 1 y 99. Si el
    // mismo producto viene repetido, se suman sus cantidades antes de
    // revisar el stock (antes cada línea se revisaba por separado).
    const cantidades = new Map<string, number>();
    for (const i of items) {
      const varianteId = typeof i?.varianteId === "string" ? i.varianteId : "";
      const cantidad = Number(i?.cantidad);
      if (!varianteId || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAX_UNIDADES) {
        return responder({ error: "Hay una cantidad inválida en el carrito." }, 400);
      }
      cantidades.set(varianteId, (cantidades.get(varianteId) || 0) + cantidad);
    }
    if (cantidades.size > MAX_PRODUCTOS) {
      return responder({ error: "El carrito tiene demasiados productos." }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const username = await usuarioDeLaSesion(supabase, req);

    const { data: variantes, error: errVar } = await supabase
      .from("tienda_variantes")
      .select("id, nombre, stock, producto_id, tienda_productos(nombre, precio, precio_oferta, activo)")
      .in("id", [...cantidades.keys()]);

    if (errVar || !variantes) {
      return responder({ error: "No se pudo validar el carrito." }, 400);
    }

    // Validamos el codigo de descuento en el servidor (nunca confiamos en un % que mande el navegador).
    // El uso del código se cuenta recién cuando el pedido se paga (lo hace la base de datos).
    let descuentoPct = 0;
    let codigoValidado: string | null = null;
    if (codigoDescuento) {
      const { data: cod } = await supabase.from("tienda_codigos_descuento")
        .select("*").eq("codigo", String(codigoDescuento).toUpperCase().trim()).eq("activo", true).maybeSingle();
      if (cod && (cod.usos_maximos === null || cod.usos_actuales < cod.usos_maximos)) {
        descuentoPct = Math.min(Math.max(Number(cod.porcentaje) || 0, 0), 100);
        codigoValidado = cod.codigo;
      } else {
        return responder({ error: "El código de descuento no es válido o ya expiró." }, 400);
      }
    }

    let montoTotal = 0;
    const mpItems: any[] = [];
    const detalleItems: any[] = [];

    for (const [varianteId, cantidad] of cantidades) {
      const v: any = variantes.find((x: any) => x.id === varianteId);
      if (!v || !v.tienda_productos?.activo) {
        return responder({ error: "Un producto ya no esta disponible." }, 400);
      }
      if (v.stock < cantidad) {
        return responder({ error: `Sin stock suficiente de ${v.tienda_productos.nombre} (${v.nombre}).` }, 400);
      }
      let precio = Number(v.tienda_productos.precio_oferta || v.tienda_productos.precio);
      if (descuentoPct > 0) precio = Math.round(precio * (1 - descuentoPct / 100) * 100) / 100;
      montoTotal += precio * cantidad;
      mpItems.push({ title: `${v.tienda_productos.nombre} - ${v.nombre}`, quantity: cantidad, unit_price: precio, currency_id: "PEN" });
      detalleItems.push({ varianteId: v.id, cantidad, precioUnitario: precio });
    }
    montoTotal = Math.round(montoTotal * 100) / 100;

    const accessToken = Deno.env.get("MP_ACCESS_TOKEN");
    if (!accessToken) return responder({ error: "Falta configurar MP_ACCESS_TOKEN." }, 500);

    const { data: pedidoCreado, error: errPedido } = await supabase
      .from("tienda_pedidos")
      .insert({
        origen: "web", username, nombre_cliente: nombreCliente,
        telefono_cliente: telefonoCliente, direccion, distrito,
        monto_total: montoTotal, metodo_pago: "Mercado Pago", estado: "pendiente",
        nota_motivo: codigoValidado ? `Código: ${codigoValidado}` : null,
      })
      .select("id")
      .single();

    if (errPedido || !pedidoCreado) {
      return responder({ error: "No se pudo crear el pedido." }, 500);
    }

    await supabase.from("tienda_pedido_items").insert(
      detalleItems.map(d => ({ pedido_id: pedidoCreado.id, variante_id: d.varianteId, cantidad: d.cantidad, precio_unitario: d.precioUnitario }))
    );

    // Cliente nuevo: se guarda con 0 compras (la compra se suma cuando el
    // pedido se paga). Cliente que ya existe: NO se cambian sus datos, para
    // que nadie pueda sobrescribir el nombre, correo o dirección de otra
    // persona solo con saber su celular.
    const telLimpio = String(telefonoCliente).replace(/\D/g, '');
    if (telLimpio) {
      const { data: clienteExistente } = await supabase.from("tienda_clientes").select("telefono").eq("telefono", telLimpio).maybeSingle();
      if (!clienteExistente) {
        await supabase.from("tienda_clientes").insert({
          telefono: telLimpio, nombre: nombreCliente, correo, direccion, distrito,
          fecha_nacimiento: fechaNacimiento || null,
          total_compras: 0,
        });
      }
    }

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        items: mpItems,
        payer: { email: correo },
        external_reference: `tienda::${pedidoCreado.id}`,
        back_urls: { success: "https://jonahbeast.com/tienda", failure: "https://jonahbeast.com/tienda", pending: "https://jonahbeast.com/tienda" },
        auto_return: "approved",
      }),
    });
    const mpData = await mpRes.json();
    if (!mpRes.ok) {
      console.error("Mercado Pago rechazo el pedido:", mpRes.status, JSON.stringify(mpData));
      return responder({ error: "Mercado Pago rechazo la solicitud." }, 400);
    }

    return responder({ init_point: mpData.init_point, pedidoId: pedidoCreado.id });
  } catch (err) {
    console.error("crear-pedido-tienda:", String(err));
    return responder({ error: "Error interno." }, 500);
  }
});
