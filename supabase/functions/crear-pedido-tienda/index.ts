import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const { items, nombreCliente, telefonoCliente, correo, direccion, distrito, username, fechaNacimiento, codigoDescuento } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "El carrito esta vacio." }), {
        status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    if (!nombreCliente || !telefonoCliente || !correo) {
      return new Response(JSON.stringify({ error: "Faltan datos del cliente." }), {
        status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const varianteIds = items.map((i: any) => i.varianteId);
    const { data: variantes, error: errVar } = await supabase
      .from("tienda_variantes")
      .select("id, nombre, stock, producto_id, tienda_productos(nombre, precio, precio_oferta, activo)")
      .in("id", varianteIds);

    if (errVar || !variantes) {
      return new Response(JSON.stringify({ error: "No se pudo validar el carrito." }), {
        status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Validamos el codigo de descuento en el servidor (nunca confiamos en un % que mande el navegador)
    let descuentoPct = 0;
    let codigoValidado: string | null = null;
    if (codigoDescuento) {
      const { data: cod } = await supabase.from("tienda_codigos_descuento")
        .select("*").eq("codigo", codigoDescuento.toUpperCase().trim()).eq("activo", true).maybeSingle();
      if (cod && (cod.usos_maximos === null || cod.usos_actuales < cod.usos_maximos)) {
        descuentoPct = Number(cod.porcentaje);
        codigoValidado = cod.codigo;
      } else {
        return new Response(JSON.stringify({ error: "El código de descuento no es válido o ya expiró." }), {
          status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
    }

    let montoTotal = 0;
    const mpItems: any[] = [];
    const detalleItems: any[] = [];

    for (const pedido of items) {
      const v = variantes.find((x: any) => x.id === pedido.varianteId);
      if (!v || !v.tienda_productos?.activo) {
        return new Response(JSON.stringify({ error: "Un producto ya no esta disponible." }), {
          status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      if (v.stock < pedido.cantidad) {
        return new Response(JSON.stringify({ error: `Sin stock suficiente de ${v.tienda_productos.nombre} (${v.nombre}).` }), {
          status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      let precio = v.tienda_productos.precio_oferta || v.tienda_productos.precio;
      if (descuentoPct > 0) precio = Math.round(precio * (1 - descuentoPct / 100) * 100) / 100;
      montoTotal += precio * pedido.cantidad;
      mpItems.push({ title: `${v.tienda_productos.nombre} - ${v.nombre}`, quantity: pedido.cantidad, unit_price: precio, currency_id: "PEN" });
      detalleItems.push({ varianteId: v.id, cantidad: pedido.cantidad, precioUnitario: precio });
    }

    const { data: pedidoCreado, error: errPedido } = await supabase
      .from("tienda_pedidos")
      .insert({
        origen: "web", username: username || null, nombre_cliente: nombreCliente,
        telefono_cliente: telefonoCliente, direccion, distrito,
        monto_total: montoTotal, metodo_pago: "Mercado Pago", estado: "pendiente",
        nota_motivo: codigoValidado ? `Código: ${codigoValidado}` : null,
      })
      .select("id")
      .single();

    if (errPedido || !pedidoCreado) {
      return new Response(JSON.stringify({ error: "No se pudo crear el pedido." }), {
        status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    await supabase.from("tienda_pedido_items").insert(
      detalleItems.map(d => ({ pedido_id: pedidoCreado.id, variante_id: d.varianteId, cantidad: d.cantidad, precio_unitario: d.precioUnitario }))
    );

    if (codigoValidado) {
      await supabase.from("tienda_codigos_descuento").update({ usos_actuales: (await supabase.from("tienda_codigos_descuento").select("usos_actuales").eq("codigo", codigoValidado).single()).data!.usos_actuales + 1 }).eq("codigo", codigoValidado);
    }

    const telLimpio = String(telefonoCliente).replace(/\D/g, '');
    const { data: clienteExistente } = await supabase.from("tienda_clientes").select("telefono, total_compras").eq("telefono", telLimpio).maybeSingle();
    if (clienteExistente) {
      await supabase.from("tienda_clientes").update({
        nombre: nombreCliente, correo, direccion, distrito,
        fecha_nacimiento: fechaNacimiento || undefined,
        ultima_compra: new Date().toISOString().slice(0, 10),
        total_compras: (clienteExistente.total_compras || 0) + 1,
      }).eq("telefono", telLimpio);
    } else {
      await supabase.from("tienda_clientes").insert({
        telefono: telLimpio, nombre: nombreCliente, correo, direccion, distrito,
        fecha_nacimiento: fechaNacimiento || null,
      });
    }

    const accessToken = Deno.env.get("MP_ACCESS_TOKEN");
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
      return new Response(JSON.stringify({ error: "Mercado Pago rechazo la solicitud.", detalle: mpData }), {
        status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ init_point: mpData.init_point, pedidoId: pedidoCreado.id }), {
      status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Error interno.", detalle: String(err) }), {
      status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
