/* Análisis del progreso del alumno ("el coach" de la pestaña Progreso).
   Lo usa la app del alumno y también el panel de admin, para que Jonah vea
   exactamente lo mismo que la app le está diciendo a cada alumno. */

const r1 = v => Math.round(Number(v) * 10) / 10;
const sumarDias = (iso, n) => { const d = new Date(String(iso).slice(0, 10) + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const diasEntre = (a, b) => Math.round((new Date(String(b).slice(0, 10) + 'T00:00:00Z') - new Date(String(a).slice(0, 10) + 'T00:00:00Z')) / 86400000);
const hoyLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
const fechaBonita = iso => { const [, m, d] = String(iso).slice(0, 10).split('-').map(Number); return `${d} ${MESES[m - 1]}`; };

/* Historia real del peso de un alumno: [{ f: 'AAAA-MM-DD', kg, inicial? }].
   La tabla historial guarda cada día una copia del peso del perfil aunque
   ese día no se haya pesado (y si un día se vuelve a guardar, con el peso
   de ese momento), así que no sirve tal cual. Se arma con:
   - el peso inicial (form.pesoInicial), en la fecha en que empezó;
   - los pesajes anotados en la app (form.pesajes, desde oct 2026);
   - los cambios de peso que se ven en historial (pesos distintos al
     actual: el actual se fecha con form.pesoFecha, que es cuando se pesó);
   - el peso actual (form.peso) en form.pesoFecha.
   Solo quedan los puntos donde el peso cambia. */
export function historialDePeso(form = {}, hist = [], al = null) {
  const actual = r1(form.peso);
  const inicio = String(al?.fecha_inicio || al?.created_at || (hist[0] && hist[0].fecha) || '').slice(0, 10);
  // Sin pesoFecha (alumnos de antes de guardarla), su peso actual se fecha
  // el primer día en que aparece ese peso en su historial.
  const fechaActual = form.pesoFecha
    || (hist.find(h => r1(h.peso) === actual && (!inicio || h.fecha >= sumarDias(inicio, -1)))?.fecha)
    || inicio || null;
  const puntos = [];
  if (Number(form.pesoInicial) > 0 && inicio) puntos.push({ f: inicio, kg: r1(form.pesoInicial), inicial: true });
  // Antes de llenar sus datos, el perfil trae 70 kg de ejemplo: esos días
  // del principio no son un peso real.
  const conPeso = hist.filter(h => Number(h.peso) > 0 && (!inicio || h.fecha >= sumarDias(inicio, -1)));
  const real = conPeso.findIndex(h => r1(h.peso) !== 70);
  const desde = real > 0 && r1(form.pesoInicial) !== 70 ? real : 0;
  // Un peso aislado muy lejos del resto (más de 15% de la mediana) es un
  // error de tipeo (ej. 110 en vez de 101): no se cuenta.
  const valores = conPeso.slice(desde).map(h => r1(h.peso)).sort((a, b) => a - b);
  const mediana = valores.length ? valores[Math.floor(valores.length / 2)] : 0;
  conPeso.slice(desde).forEach(h => {
    if (valores.length >= 3 && mediana > 0 && Math.abs(r1(h.peso) - mediana) / mediana > 0.15) return;
    const kg = r1(h.peso);
    if (kg === actual) return;
    if (fechaActual && h.fecha > fechaActual) return;
    puntos.push({ f: h.fecha, kg });
  });
  (Array.isArray(form.pesajes) ? form.pesajes : []).forEach(p => { if (p?.f && Number(p.kg) > 0) puntos.push({ f: p.f, kg: r1(p.kg) }); });
  if (actual > 0 && fechaActual) puntos.push({ f: fechaActual, kg: actual });
  puntos.sort((a, b) => a.f.localeCompare(b.f) || (b.inicial ? 1 : 0) - (a.inicial ? 1 : 0));
  const salida = [];
  puntos.forEach(p => {
    const ult = salida[salida.length - 1];
    if (ult && ult.kg === p.kg) return;
    if (ult && ult.f === p.f && !ult.inicial) { salida[salida.length - 1] = p; return; }
    salida.push(p);
  });
  return salida;
}

export function promedioSemana(rows, desde, hasta) {
  if (!Array.isArray(rows)) return null;
  const ini = Math.max(0, Math.min(desde, rows.length));
  const fin = Math.max(ini, Math.min(hasta, rows.length));
  const trozo = rows.slice(ini, fin).filter(r => Number(r.peso) > 0);
  if (!trozo.length) return null;
  const suma = trozo.reduce((a, r) => a + Number(r.peso), 0);
  const prom = suma / trozo.length;
  return Number.isFinite(prom) ? prom : null;
}

/* rows: los días que mira (su rango, ej. 30 días). form: su perfil.
   extra.todas: todo su historial (para saber su peso al empezar el rango);
   extra.inicio: fecha en que empezó; extra.hoy: fecha de hoy.
   El peso se lee de sus pesajes reales (historialDePeso), no de la copia
   que se guarda cada día: así no se le dice "estancado" a quien bajó, ni a
   quien simplemente no se ha vuelto a pesar. */
export function analizarProgreso(rows, form = {}, extra = {}) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const conComida = rows.filter(r => Number(r.kcal_consumidas) > 0);

  // Días transcurridos desde el primer registro
  let diasRango = 0;
  if (rows.length >= 2) {
    const a = new Date(String(rows[0].fecha).slice(0, 10) + 'T00:00:00');
    const b = new Date(String(rows[rows.length - 1].fecha).slice(0, 10) + 'T00:00:00');
    const calc = Math.round((b - a) / 86400000) + 1;
    diasRango = Number.isFinite(calc) && calc > 0 ? calc : rows.length;
  }

  // Adherencia
  const conObjetivo = conComida.filter(r => Number(r.kcal_objetivo) > 0);
  const enRango = conObjetivo.filter(r => {
    const ratio = Number(r.kcal_consumidas) / Number(r.kcal_objetivo);
    return ratio >= 0.85 && ratio <= 1.15;
  }).length;
  const adherencia = conObjetivo.length >= 3 ? Math.round((enRango / conObjetivo.length) * 100) : null;

  // Constancia del registro
  const constancia = diasRango > 0 ? Math.round((conComida.length / diasRango) * 100) : 0;

  // Aún no hay datos suficientes
  if (diasRango < 10) {
    return {
      estado: 'inicial',
      titulo: 'ESTAMOS CONOCIENDO TU CUERPO',
      mensaje: `Llevas ${conComida.length} día(s) registrados. Con unas dos semanas de datos podré decirte si tu plan está funcionando o si conviene ajustarlo.`,
      accion: 'Sigue registrando tus comidas cada día. Es lo único que necesito.',
      color: 'zinc', adherencia, constancia,
    };
  }

  // Peso: sus pesajes reales. Se compara su peso al empezar el rango con
  // su último pesaje.
  const todas = Array.isArray(extra.todas) && extra.todas.length ? extra.todas : rows;
  const pesos = historialDePeso(form, todas, { fecha_inicio: extra.inicio || todas[0]?.fecha });
  const hoy = extra.hoy || hoyLocal();
  const desdeRango = String(rows[0].fecha).slice(0, 10);
  const ultimo = pesos[pesos.length - 1] || null;
  const previos = pesos.filter(p => p.f <= desdeRango);
  const pesoBase = previos.length ? previos[previos.length - 1] : pesos[0] || null;
  const diasSinPesarse = ultimo ? diasEntre(ultimo.f, hoy) : null;

  // No se ha vuelto a pesar en este tiempo (o hace más de 2 semanas): no se
  // le puede decir si avanza o no; se le pide que se pese.
  if (!ultimo || ultimo === pesoBase || diasSinPesarse > 14) {
    return {
      estado: 'pesate', color: 'zinc', adherencia, constancia,
      titulo: 'TE FALTA PESARTE',
      mensaje: ultimo
        ? `Tu último peso anotado es ${ultimo.kg.toFixed(1)} kg (${fechaBonita(ultimo.f)}). Sin un peso nuevo no puedo saber si tu plan está funcionando, y no quiero decirte algo que no es.`
        : 'Todavía no tengo tu peso. Sin él no puedo saber si tu plan está funcionando.',
      accion: 'Pésate en ayunas, después de ir al baño (ideal el domingo), y anótalo en "Mi cuerpo" → "Mis datos". Con eso te digo cómo vas.',
    };
  }

  const pesoInicial = pesoBase.kg;
  const pesoActual = ultimo.kg;
  const cambio = pesoActual - pesoInicial;
  const desdeFecha = pesoBase.f > desdeRango ? pesoBase.f : desdeRango;
  const semanas = Math.max(diasEntre(desdeFecha, ultimo.f) / 7, 1);
  const porSemanaCalc = cambio / semanas;
  const porSemana = Number.isFinite(porSemanaCalc) ? porSemanaCalc : 0;
  const pctSemana = (Math.abs(porSemana) / pesoInicial) * 100;
  const objetivo = form.objetivo || '';
  const perder = objetivo === 'Perder grasa';
  const ganar = objetivo === 'Ganar músculo';
  const mantener = !perder && !ganar;
  const estancado = Math.abs(porSemana) < 0.15;

  const base = { adherencia, constancia, cambio, porSemana, semanas: Math.round(semanas * 10) / 10, pesoInicial, pesoActual, ultimoPesaje: ultimo.f };

  // Prioridad 1: bajada demasiado rápida (riesgo de perder músculo)
  if (perder && porSemana < 0 && pctSemana > 1.2) {
    return { ...base, estado: 'rapido', color: 'amber',
      titulo: 'ESTÁS BAJANDO MUY RÁPIDO',
      mensaje: `Bajaste ${Math.abs(porSemana).toFixed(1)} kg por semana. A este ritmo se pierde músculo junto con la grasa, y el metabolismo se resiente.`,
      accion: 'Sube tus calorías objetivo un 10% y prioriza la proteína. Bajar entre 0.4 y 0.8 kg por semana es más sostenible.' };
  }

  // Prioridad 2: constancia baja — no se puede analizar bien
  if (constancia < 50) {
    return { ...base, estado: 'constancia', color: 'zinc',
      titulo: 'NECESITO MÁS REGISTROS',
      mensaje: `Registraste ${conComida.length} de ${diasRango} días. Con menos de la mitad de los días es difícil saber si el plan funciona o no.`,
      accion: 'Intenta registrar todos los días, aunque sea rápido. Los días que no anotas son los que suelen desviar el resultado.' };
  }

  // Quiere mantenerse y se mantiene: va bien.
  if (estancado && mantener) {
    return { ...base, estado: 'bien', color: 'emerald',
      titulo: 'TE ESTÁS MANTENIENDO',
      mensaje: `Tu peso se mantuvo estable (${pesoActual.toFixed(1)} kg). Es justo lo que buscabas.`,
      accion: 'Sigue así: registra tus comidas y pésate una vez por semana para que no se mueva.' };
  }

  // Prioridad 3: estancamiento
  if (estancado) {
    if (adherencia !== null && adherencia < 65) {
      return { ...base, estado: 'estancado_adherencia', color: 'amber',
        titulo: 'TU PROGRESO SE ESTANCÓ',
        mensaje: `Tu peso casi no cambió en ${Math.round(semanas)} semana(s). Antes de tocar tu plan: cumpliste tu objetivo de calorías solo el ${adherencia}% de los días.`,
        accion: 'El plan probablemente está bien; el reto es la constancia. Enfócate en acercarte a tu objetivo esta semana antes de cambiar nada.' };
    }
    return { ...base, estado: 'estancado', color: 'amber',
      titulo: 'TU PROGRESO SE ESTANCÓ',
      mensaje: `Tu peso se mantuvo estable en ${Math.round(semanas)} semana(s) y tu adherencia es buena${adherencia !== null ? ` (${adherencia}%)` : ''}. Tu cuerpo se adaptó a las calorías actuales.`,
      accion: perder
        ? 'Ajusta tu objetivo: baja entre 100 y 150 kcal, o aumenta tu actividad diaria. Cambios pequeños, no drásticos.'
        : ganar
          ? 'Sube tu objetivo entre 100 y 200 kcal para retomar el avance.'
          : 'Si tu meta es mantenerte, esto es exactamente lo que buscabas.' };
  }

  // Prioridad 4: va en la dirección correcta
  if (perder && porSemana < 0) {
    return { ...base, estado: 'bien', color: 'emerald',
      titulo: 'VAS PROGRESANDO CORRECTAMENTE',
      mensaje: `Bajaste ${Math.abs(cambio).toFixed(1)} kg en ${Math.round(semanas)} semana(s), un ritmo de ${Math.abs(porSemana).toFixed(1)} kg por semana. Es un ritmo saludable y sostenible.`,
      accion: 'Mantén tu plan tal como está. No cambies nada mientras siga funcionando.' };
  }
  if (ganar && porSemana > 0) {
    return { ...base, estado: 'bien', color: 'emerald',
      titulo: 'VAS PROGRESANDO CORRECTAMENTE',
      mensaje: `Subiste ${cambio.toFixed(1)} kg en ${Math.round(semanas)} semana(s). Vas en la dirección de tu objetivo.`,
      accion: 'Mantén tu plan y tu entrenamiento de fuerza. Así el peso ganado es músculo, no solo grasa.' };
  }

  // Prioridad 5: va en dirección contraria
  return { ...base, estado: 'contrario', color: 'amber',
    titulo: 'VAS EN DIRECCIÓN CONTRARIA',
    mensaje: `Tu objetivo es ${objetivo.toLowerCase() || 'mantenerte'}, pero tu peso ${porSemana > 0 ? 'subió' : 'bajó'} ${Math.abs(cambio).toFixed(1)} kg en ${Math.round(semanas)} semana(s).${adherencia !== null ? ` Tu adherencia fue del ${adherencia}%.` : ''}`,
    accion: adherencia !== null && adherencia < 65
      ? 'Antes de cambiar tu objetivo, prueba una semana acercándote a tus calorías. Suele bastar con eso.'
      : 'Revisa las porciones de lo que registras: a veces el cálculo se queda corto. Escríbenos si quieres que lo revisemos juntos.' };
}


/* Resumen corto para el panel: en qué grupo cae cada alumno según lo que
   le dice la app. grupo: 'bien' (va bien), 'atencion' (hay que
   recomendarle otro camino) o 'datos' (aún no hay datos para saberlo). */
export function resumenProgreso(a) {
  if (!a || !a.estado) return { grupo: 'datos', emoji: '🌱', texto: 'Sin datos aún' };
  const ritmo = Number.isFinite(a.porSemana) ? `${a.porSemana > 0 ? '+' : a.porSemana < 0 ? '−' : ''}${Math.abs(a.porSemana).toFixed(1)} kg/sem` : '';
  switch (a.estado) {
    case 'bien': return { grupo: 'bien', emoji: '✅', texto: a.titulo === 'TE ESTÁS MANTENIENDO' ? 'Se mantiene (su meta)' : `Va bien${ritmo ? ' · ' + ritmo : ''}` };
    case 'rapido': return { grupo: 'atencion', emoji: '⚠️', texto: `Baja muy rápido${ritmo ? ' · ' + ritmo : ''}` };
    case 'estancado': return { grupo: 'atencion', emoji: '⏸️', texto: 'Estancado (cumple su plan)' };
    case 'estancado_adherencia': return { grupo: 'atencion', emoji: '⏸️', texto: `Estancado · cumple ${a.adherencia}% de días` };
    case 'contrario': return { grupo: 'atencion', emoji: '🔁', texto: `Dirección contraria${ritmo ? ' · ' + ritmo : ''}` };
    case 'constancia': return { grupo: 'datos', emoji: '📝', texto: `Registra poco (${a.constancia}% de días)` };
    case 'pesate': return { grupo: 'datos', emoji: '⚖️', texto: 'Le falta pesarse' };
    default: return { grupo: 'datos', emoji: '🌱', texto: 'Conociéndolo (menos de 2 semanas)' };
  }
}
