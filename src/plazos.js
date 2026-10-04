/* Plazo para responder un alimento que pidió o creó un alumno: 1 hora.
   De noche (10pm a 7am, hora Perú) no se le avisa a Jonah, así que lo que
   llega a esa hora se responde antes de las 8am. Lo usan la app del alumno
   ("Tus pedidos en camino") y el panel ("Alimentos por revisar"). La tarea
   api/cron/alimentos-revision.js repite esta misma regla para el
   recordatorio de los 40 minutos. Perú no cambia de hora: siempre UTC-5. */
export const PLAZO_ALIMENTO_MS = 60 * 60 * 1000;
const PERU_MS = 5 * 60 * 60 * 1000;

export function horaLimiteAlimento(desde) {
  const t = new Date(desde || Date.now()).getTime();
  const peru = new Date(t - PERU_MS);
  const hora = peru.getUTCHours();
  if (hora >= 22 || hora < 7) {
    if (hora >= 22) peru.setUTCDate(peru.getUTCDate() + 1);
    peru.setUTCHours(8, 0, 0, 0);
    return peru.getTime() + PERU_MS;
  }
  return t + PLAZO_ALIMENTO_MS;
}

// "11:05 a. m." en hora Perú (y "mañana 8:00 a. m." si es otro día).
export function horaPeruCorta(ms) {
  const texto = new Date(ms).toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Lima' });
  const dia = d => new Date(d).toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
  return dia(ms) !== dia(Date.now()) && ms > Date.now() ? `mañana ${texto}` : texto;
}

// Minutos que faltan (negativo si ya pasó).
export function minutosHasta(ms) {
  return Math.round((ms - Date.now()) / 60000);
}
