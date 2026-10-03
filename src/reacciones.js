// Reacciones del muro de la Comunidad. Los "tipo" son los que acepta la
// base (comunidad_reacciones). En las fotos de platos van las de comida;
// en logros, entrenos y anuncios, las de celebrar.
export const REACCIONES_PLATO = [
  { tipo: 'rico', emoji: '😋', texto: 'Qué rico' },
  { tipo: 'antojo', emoji: '🤤', texto: 'Se me antoja' },
  { tipo: 'encanta', emoji: '😍', texto: 'Me encanta' },
  { tipo: 'fuego', emoji: '🔥', texto: 'Fuego' },
  { tipo: 'aplauso', emoji: '👏', texto: 'Aplausos' },
];
export const REACCIONES_LOGRO = [
  { tipo: 'fuego', emoji: '🔥', texto: 'Fuego' },
  { tipo: 'fuerza', emoji: '💪', texto: 'Fuerza' },
  { tipo: 'aplauso', emoji: '👏', texto: 'Aplausos' },
  { tipo: 'fiesta', emoji: '🥳', texto: 'A celebrar' },
  { tipo: 'wow', emoji: '🤩', texto: 'Wow' },
];
export function reaccionesPara(item) {
  return item?.tipo === 'foto' ? REACCIONES_PLATO : REACCIONES_LOGRO;
}
