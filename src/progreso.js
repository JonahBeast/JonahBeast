/* Análisis del progreso del alumno ("el coach" de la pestaña Progreso).
   Lo usa la app del alumno y también el panel de admin, para que Jonah vea
   exactamente lo mismo que la app le está diciendo a cada alumno. */

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

export function analizarProgreso(rows, form) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  // Descarta pesos atípicos aislados (ej. un registro viejo con el peso
  // de fábrica 70 kg sin medir todavía) para que no distorsionen la
  // tendencia real. Se compara contra la mediana, que no se deja
  // arrastrar por uno o dos valores raros como sí le pasa al promedio.
  const pesosCrudos = rows.filter(r => Number(r.peso) > 0).map(r => Number(r.peso)).sort((a, b) => a - b);
  const pesoMediana = pesosCrudos.length
    ? (pesosCrudos.length % 2 ? pesosCrudos[(pesosCrudos.length - 1) / 2]
      : (pesosCrudos[pesosCrudos.length / 2 - 1] + pesosCrudos[pesosCrudos.length / 2]) / 2)
    : 0;
  const conPeso = rows.filter(r => {
    const p = Number(r.peso);
    if (!(p > 0)) return false;
    if (pesosCrudos.length >= 3 && pesoMediana > 0 && Math.abs(p - pesoMediana) / pesoMediana > 0.15) return false;
    return true;
  });
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
  if (diasRango < 10 || conPeso.length < 4) {
    return {
      estado: 'inicial',
      titulo: 'ESTAMOS CONOCIENDO TU CUERPO',
      mensaje: `Llevas ${conComida.length} día(s) registrados. Con unas dos semanas de datos podré decirte si tu plan está funcionando o si conviene ajustarlo.`,
      accion: 'Sigue registrando tus comidas cada día. Es lo único que necesito.',
      color: 'zinc', adherencia, constancia,
    };
  }

  // Tendencia: promedio de los primeros 7 registros vs. los últimos 7.
  // Usar ventanas fijas (no mitades) evita subestimar el ritmo real.
  const ventana = Math.min(7, Math.max(2, Math.floor(conPeso.length / 3)));
  const pesoInicial = promedioSemana(conPeso, 0, ventana);
  const pesoActual = promedioSemana(conPeso, conPeso.length - ventana, conPeso.length);
  if (pesoInicial === null || pesoActual === null) {
    return { estado: 'inicial', titulo: 'FALTAN DATOS DE PESO',
      mensaje: 'Registra tu peso al menos 2 veces por semana para poder analizar tu tendencia.',
      accion: 'Actualiza tu peso en "Mi cuerpo" → "Mis datos".', color: 'zinc', adherencia, constancia };
  }

  const cambio = pesoActual - pesoInicial;
  const semanas = Math.max(diasRango / 7, 1);
  // Distancia real entre los centros de las dos ventanas comparadas
  const separacion = Math.max(conPeso.length - ventana, 1);
  const factorTiempo = separacion / Math.max(conPeso.length - 1, 1);
  const semanasEfectivas = Math.max(semanas * factorTiempo, 0.5);
  const porSemanaCalc = cambio / semanasEfectivas;
  const porSemana = Number.isFinite(porSemanaCalc) ? porSemanaCalc : 0;
  const pctSemana = (Math.abs(porSemana) / pesoInicial) * 100;
  const objetivo = form.objetivo || '';
  const perder = objetivo === 'Perder grasa';
  const ganar = objetivo === 'Ganar músculo';
  const estancado = Math.abs(porSemana) < 0.15;

  const base = { adherencia, constancia, cambio, porSemana, semanas: Math.round(semanas * 10) / 10 };

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
    case 'bien': return { grupo: 'bien', emoji: '✅', texto: `Va bien${ritmo ? ' · ' + ritmo : ''}` };
    case 'rapido': return { grupo: 'atencion', emoji: '⚠️', texto: `Baja muy rápido${ritmo ? ' · ' + ritmo : ''}` };
    case 'estancado': return { grupo: 'atencion', emoji: '⏸️', texto: 'Estancado (cumple su plan)' };
    case 'estancado_adherencia': return { grupo: 'atencion', emoji: '⏸️', texto: `Estancado · cumple ${a.adherencia}% de días` };
    case 'contrario': return { grupo: 'atencion', emoji: '🔁', texto: `Dirección contraria${ritmo ? ' · ' + ritmo : ''}` };
    case 'constancia': return { grupo: 'datos', emoji: '📝', texto: `Registra poco (${a.constancia}% de días)` };
    default: return { grupo: 'datos', emoji: '🌱', texto: 'Conociéndolo (menos de 2 semanas)' };
  }
}
