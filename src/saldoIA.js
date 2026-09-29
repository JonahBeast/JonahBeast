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

/* Recarga automática de Anthropic (config → ia_recarga_auto):
   { activa, umbral, restablecer }: cuando el saldo baja a "umbral", Anthropic
   lo sube a "restablecer" cobrando a la tarjeta. El estimado aplica la misma
   regla, así no hace falta anotar cada recarga automática. */
export const RECARGA_AUTO_POR_DEFECTO = { activa: true, umbral: 10, restablecer: 20 };

export function leerRecargaAuto(valor) {
  try {
    const v = typeof valor === 'string' ? JSON.parse(valor) : valor;
    if (!v) return null;
    const umbral = Number(v.umbral), restablecer = Number(v.restablecer);
    if (!(umbral >= 0) || !(restablecer > umbral)) return null;
    return { activa: v.activa !== false, umbral, restablecer };
  } catch { return null; }
}

// Devuelve { saldo, gastado, desde, ancla, recargasAuto: [{ fecha, monto }] } o null.
export function saldoEstimado(movimientos, usosDesde, recargaAuto = null) {
  const p = puntoDePartidaSaldo(movimientos);
  if (!p) return null;
  const inicio = new Date(p.desde);
  // Uso y recargas anotadas, en orden, desde el punto de partida.
  const recargasAnotadas = (movimientos || []).filter(m => m.tipo === 'recarga' && new Date(m.fecha) > inicio && !(p.ancla && new Date(m.fecha) <= new Date(p.ancla.fecha)));
  const eventos = [
    ...(usosDesde || []).filter(u => new Date(u.creado_en) >= inicio).map(u => ({ t: new Date(u.creado_en), costo: costoUsdIA(u) })),
    ...recargasAnotadas.map(m => ({ t: new Date(m.fecha), recarga: Number(m.monto_usd) })),
  ].sort((a, b) => a.t - b.t);
  const recargasPrevias = recargasAnotadas.reduce((s, m) => s + Number(m.monto_usd), 0);
  let saldo = p.base - recargasPrevias; // las recargas anotadas se suman en su momento
  let gastado = 0;
  const recargasAuto = [];
  const auto = recargaAuto && recargaAuto.activa ? recargaAuto : null;
  for (const e of eventos) {
    if (e.recarga) { saldo += e.recarga; continue; }
    saldo -= e.costo; gastado += e.costo;
    if (auto && saldo <= auto.umbral) {
      recargasAuto.push({ fecha: e.t.toISOString(), monto: auto.restablecer - saldo });
      saldo = auto.restablecer;
    }
  }
  return { saldo, gastado, desde: p.desde, ancla: p.ancla, recargasAuto };
}
