/* Precio y saldo de la IA (Anthropic). Lo usan el panel de admin y el
   informe de la mañana de Jarvis (api/cron/informe-admin.js), así los dos
   calculan igual. */

// Precio en dólares por millón de tokens (entrada, salida, lectura y
// escritura de caché). Con esto y los tokens de la tabla ia_uso sale el
// costo real de cada llamada.
export const PRECIOS_IA_USD = {
  'claude-sonnet-5': [2, 10, 0.2, 2.5],
  'claude-opus-5': [5, 25, 0.5, 6.25],
  'claude-opus-5-5': [4, 20, 0.4, 5],
  'claude-haiku-4-5': [1, 5, 0.1, 1.25],
};

export function costoUsdIA(f) {
  const m = String(f.modelo || '');
  const p = PRECIOS_IA_USD[m]
    || (m.includes('haiku') ? PRECIOS_IA_USD['claude-haiku-4-5'] : m.includes('opus') ? PRECIOS_IA_USD['claude-opus-5'] : PRECIOS_IA_USD['claude-sonnet-5']);
  return ((Number(f.tokens_entrada) || 0) * p[0] + (Number(f.tokens_salida) || 0) * p[1]
    + (Number(f.tokens_cache_lectura) || 0) * p[2] + (Number(f.tokens_cache_escritura) || 0) * p[3]) / 1e6;
}

// Debajo de esto (en dólares), Jarvis avisa que conviene recargar.
export const SALDO_IA_MINIMO_USD = 5;

/* Saldo estimado. movimientos = filas de ia_saldo ({tipo, monto_usd, fecha}).
   Punto de partida: el último "saldo_real" anotado (o, si no hay, la
   primera recarga); se suman las recargas posteriores y se resta el gasto
   de ia_uso desde ese momento. Devuelve null si todavía no hay nada anotado.
   Para pedir el gasto: desdeISO = resultado.desde. */
export function puntoDePartidaSaldo(movimientos) {
  const lista = [...(movimientos || [])].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  if (!lista.length) return null;
  const reales = lista.filter(m => m.tipo === 'saldo_real');
  const ancla = reales.length ? reales[reales.length - 1] : null;
  const desde = ancla ? ancla.fecha : lista[0].fecha;
  const base = ancla ? Number(ancla.monto_usd) : 0;
  const recargas = lista.filter(m => m.tipo === 'recarga' && (ancla ? new Date(m.fecha) > new Date(ancla.fecha) : true))
    .reduce((s, m) => s + Number(m.monto_usd), 0);
  return { desde, base: base + recargas, ancla };
}

export function saldoEstimado(movimientos, usosDesde) {
  const p = puntoDePartidaSaldo(movimientos);
  if (!p) return null;
  const gastado = (usosDesde || []).filter(u => new Date(u.creado_en) >= new Date(p.desde)).reduce((s, u) => s + costoUsdIA(u), 0);
  return { saldo: p.base - gastado, gastado, desde: p.desde, ancla: p.ancla };
}
