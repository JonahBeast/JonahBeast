/* DETECTOR DE PARECIDOS: antes de agregar un alimento a la base, busca si
   ya hay uno igual con otro nombre ("Pollo sancochado" → "Pollo pechuga
   (cocida)", "Sangrecita" → "Sangrecita (cocido)"). Compara las palabras
   del nombre y de cómo se come, sin tildes, sin palabras de relleno ("de",
   "con"…) y con sinónimos de cocción (sancochado = hervido = cocido). Lo
   usan:
     - el panel (al aprobar o agregar un alimento: "⚠️ Se parece a…");
     - api/cron/verificar-alimentos.js (la revisión de cada lunes).
   La función alimentos-pedidos tiene una copia de esta misma regla (no
   puede leer archivos de src/): si cambias algo aquí, cámbialo allá. */

const RELLENO = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'con', 'y', 'a', 'al', 'en', 'para', 'tipo', 'estilo', 'un', 'una', 'mi']);
const SINONIMOS = {
  sancochado: 'cocido', sancochada: 'cocido', hervido: 'cocido', hervida: 'cocido', cocida: 'cocido', sancocho: 'cocido',
  frita: 'frito', fritos: 'frito', fritas: 'frito', horneada: 'horneado', asada: 'asado', crudo: 'crudo', cruda: 'crudo',
  sangre: 'sangrecita',
};

// Palabras que solo dicen cómo se come (ya pasadas por SINONIMOS).
const ESTADOS = new Set(['cocido', 'crudo', 'frito', 'horneado', 'tostado', 'tostada', 'natural']);

export function palabrasAlimento(texto) {
  return [...new Set(String(texto || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    .split(/[^a-zñ0-9]+/).filter(Boolean)
    // "sin azúcar" no es lo mismo que "con azúcar": lo que va después de "sin" se marca.
    .map((p, i, t) => (t[i - 1] === 'sin' ? 'sin_' + p : p)).filter(p => p !== 'sin')
    .map(p => SINONIMOS[p] || (p.length > 4 && p.endsWith('s') ? p.slice(0, -1) : p))
    .map(p => SINONIMOS[p] || p)
    .filter(p => !RELLENO.has(p) && p !== '-'))];
}

// Qué tanto se parecen dos nombres (0 a 1).
export function parecido(a, b) {
  const A = palabrasAlimento(a), B = palabrasAlimento(b);
  if (!A.length || !B.length) return 0;
  const comunes = A.filter(p => B.includes(p)).length;
  if (!comunes) return 0;
  const jaccard = comunes / new Set([...A, ...B]).size;
  // Todas las palabras del nombre más corto están en el otro (si tiene 2+):
  // "pollo cocido" dentro de "pollo pechuga cocido".
  const corto = Math.min(A.length, B.length);
  const contenido = corto >= 2 && comunes === corto ? 0.75 : 0;
  // Un nombre de una palabra que es el otro más solo cómo se come:
  // "Sangrecita" = "Sangrecita (cocido)", "Papa" = "Papa (cocida)".
  const [chico, grande] = A.length <= B.length ? [A, B] : [B, A];
  const soloEstado = chico.length === 1 && grande.includes(chico[0]) && grande.every(p => p === chico[0] || ESTADOS.has(p)) ? 0.75 : 0;
  return Math.max(jaccard, contenido, soloEstado);
}

export const UMBRAL_PARECIDO = 0.5;

/* lista: [{ etiqueta, ...lo que quieras devolver }]. Devuelve los más
   parecidos (hasta "max"), del más al menos parecido. "etiqueta" es el
   nombre con cómo se come, como sale en la app: "Pollo pechuga (cocida)". */
export function alimentosParecidos(etiqueta, lista, max = 3) {
  const propia = String(etiqueta || '').trim().toLowerCase();
  return lista
    .filter(x => String(x.etiqueta || '').trim().toLowerCase() !== propia)
    .map(x => ({ ...x, parecido: parecido(etiqueta, x.etiqueta) }))
    .filter(x => x.parecido >= UMBRAL_PARECIDO)
    .sort((a, b) => b.parecido - a.parecido)
    .slice(0, max);
}

/* Revisión de cada lunes: alimentos agregados (alimentos_extra) que pueden
   estar repetidos con otro nombre, o que tienen calorías muy distintas de
   uno casi igual (uno de los dos puede estar mal). extras: filas de
   alimentos_extra; app: [{ etiqueta, kcal }] (api/_lib/alimentos-app.js).
   Devuelve [{ nombre, problemas: [texto] }]. */
export function buscarRepetidos(extras, app) {
  const etiquetaDe = a => a.estado && a.estado !== '-' ? `${a.nombre} (${String(a.estado).toLowerCase()})` : a.nombre;
  const todos = [...app.map(x => ({ ...x, deApp: true })), ...extras.map(a => ({ etiqueta: etiquetaDe(a), kcal: Number(a.kcal), id: a.id }))];
  const vistos = new Set();
  const salida = [];
  for (const a of extras) {
    const etiqueta = etiquetaDe(a);
    const iguales = alimentosParecidos(etiqueta, todos.filter(x => x.id !== a.id), 3).filter(x => x.parecido >= 0.75);
    const problemas = [];
    for (const x of iguales) {
      const par = [etiqueta, x.etiqueta].sort().join('|');
      if (vistos.has(par)) continue;
      vistos.add(par);
      const k1 = Number(a.kcal) || 0, k2 = Number(x.kcal) || 0;
      const distintas = Math.max(k1, k2) > 0 && Math.abs(k1 - k2) / Math.max(k1, k2) > 0.4;
      problemas.push(distintas
        ? `se parece mucho a "${x.etiqueta}" pero tiene calorías muy distintas (${Math.round(k1)} vs ${Math.round(k2)} kcal): revisa si es lo mismo y cuál está bien`
        : `puede estar repetido con "${x.etiqueta}"${x.deApp ? '' : ' (también agregado por pedido)'}`);
    }
    if (problemas.length) salida.push({ nombre: etiqueta, problemas });
  }
  return salida;
}
