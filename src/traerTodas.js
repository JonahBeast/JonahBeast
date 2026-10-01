/* La base (Supabase) entrega como máximo 1000 filas por pedido, aunque se
   pidan más con .range(0, 19999): el resto se pierde sin avisar. traerTodas
   pide de a 1000 filas, en orden, hasta traerlas todas, y devuelve lo mismo
   que una consulta normal ({ data, error }).

   armar: función que arma la consulta SIN .range (se llama una vez por cada
          tanda de 1000).
   orden: columna (o lista de columnas) única para ordenar, así ninguna fila
          se repite ni se salta entre tandas. Por defecto 'id'.

   Lo usan el panel de admin, la app y las tareas automáticas (api/cron). */
const TANDA = 1000;

export async function traerTodas(armar, orden = 'id') {
  const columnas = Array.isArray(orden) ? orden : [orden];
  const data = [];
  for (let desde = 0; ; desde += TANDA) {
    let q = armar();
    columnas.forEach(c => { q = q.order(c, { ascending: true }); });
    const { data: filas, error } = await q.range(desde, desde + TANDA - 1);
    if (error) return { data: data.length ? data : null, error };
    data.push(...(filas || []));
    if (!filas || filas.length < TANDA) return { data, error: null };
  }
}
