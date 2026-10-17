/* MEDIDAS RETIRADAS (17 oct 2026, pedido de Jonah).

   Cuando a un alimento se le quita una medida casera (ej. el arroz ya no
   se mide en "taza"), lo que ya estaba anotado con esa medida no debe
   cambiar: antes la app no la encontraba y la contaba como 1 g (casi 0
   kcal). Aquí queda cada medida retirada con los gramos que tenía, SOLO
   para calcular lo ya anotado: no sale en los botones ni en el buscador.

   Los gramos salen del historial de git de src/App.jsx (la última versión
   en que existía la medida) o, en las que venían de los alimentos que
   Jonah agrega desde el panel (tabla alimentos_extra), de su fila.

   Si quitas o cambias una medida casera, pásala aquí con sus gramos de
   antes: "npm run build" lo revisa (scripts/verificar-medidas.mjs) y no
   deja seguir si falta.

   Clave: la del alimento ("Nombre (Estado)"), o el nombre solo si vale
   para todas sus versiones. */
export const MEDIDAS_RETIRADAS = {
  // "taza" de los cereales, hasta el 22 de septiembre. La app la medía en
  // 160 g para todos; Jonah decidió (17 oct) contarla con lo que pesa una
  // taza real de cada uno (USDA, "1 cup"): arroz crudo 185 g, arroz cocido
  // 158 g, avena en hojuelas 81 g, avena cocida 234 g, kiwicha cruda 193 g,
  // kiwicha cocida 246 g, cornflakes 28 g. Cañihua y choclo siguen en 160 g:
  // no hay una fuente segura de lo que pesa su taza.
  'Arroz blanco (Crudo)': { taza: 185 },
  'Arroz blanco (Cocido)': { taza: 158 },
  'Avena en hojuelas (Cruda)': { taza: 81 },
  'Avena (Cocida)': { taza: 234 },
  'Kiwicha (Cruda)': { taza: 193 },
  'Kiwicha (Cocida)': { taza: 246 },
  'Cañihua (Cruda)': { taza: 160 },
  'Cañihua (Cocida)': { taza: 160 },
  'Choclo (maíz) (Crudo)': { taza: 160 },
  'Choclo (maíz) (Cocido)': { taza: 160 },
  'Cereal cornflakes sin gluten (-)': { taza: 28 },
  // Gaseosas: "taza" y "jarra" de las bebidas, hasta el 6 de octubre.
  'Gaseosa regular (-)': { taza: 240, jarra: 500 },
  'Gaseosa dietética (-)': { taza: 240, jarra: 500 },
  'Leche de coco (-)': { taza: 240, vaso: 200, jarra: 500 },
  // Platos que pasaron a su medida real (presa, filete, porción): las
  // medidas de "Platos preparados" que tenían antes.
  'Pollada (pollo frito) (-)': { plato: 400, 'media porción': 200, 'porción grande': 500 },
  'Chicharrón de pollo (-)': { plato: 400, 'media porción': 200, 'porción grande': 500 },
  'Filete de pollo frito (Estimado - varía según receta)': { plato: 400, 'media porción': 200, 'porción grande': 500 },
  'Milanesa de pollo (-)': { 'media porción': 200, 'porción grande': 500 },
  'Pescado frito (-)': { 'media porción': 200, 'porción grande': 500 },
  'Pollo al horno (-)': { 'media porción': 200, 'porción grande': 500 },
  'Chicharrón de chancho (-)': { 'media porción': 200, 'porción grande': 500 },
  'Panqueques de avena (Estimado - varía según receta)': { 'media porción': 200, 'porción grande': 500 },
  'Wafle de avena (Estimado - varía según receta)': { 'media porción': 200, 'porción grande': 500 },
  // Entradas (16 oct): de plato de fondo a porción de entrada.
  'Causa limeña (-)': { 'media porción': 200, 'porción grande': 500 },
  'Papa a la huancaína (-)': { 'media porción': 200, 'porción grande': 500 },
  'Ocopa arequipeña (-)': { 'media porción': 200, 'porción grande': 500 },
  'Rocoto relleno (-)': { 'media porción': 200, 'porción grande': 500 },
  'Cheesecake (PECAFIT) (-)': { 'keke entero': 900 },
  // Medidas que venían de un alimento del panel con el mismo nombre
  // (alimentos_extra: "Papa · frita" porción 120 g, "Yuca · frita" trozo
  // 40 g, "Camote · frito" rodaja 25 g, "Plátano maduro/bellaco · frito"
  // porción 100 g) y que la app usaba también para la papa sancochada, la
  // yuca y el camote. La papa dejó de tenerla el 15 de octubre (pasó a
  // "unidad"); las demás se dejan aquí por si les pasa lo mismo.
  'Papa (Cocida)': { porción: 120 },
  'Papa (Cruda)': { porción: 120 },
  'Papa (Frita)': { porción: 120 },
  'Yuca (Cocida)': { trozo: 40 },
  'Yuca (Cruda)': { trozo: 40 },
  'Camote (Cocido)': { rodaja: 25 },
  'Camote (Crudo)': { rodaja: 25 },
  'Plátano maduro (Frito)': { porción: 100 },
  'Plátano bellaco (Frito)': { porción: 100 },
};

// Gramos de una medida retirada (o null si no lo es).
export function gramosMedidaRetirada(food, unit) {
  if (!food || !unit) return null;
  const r = MEDIDAS_RETIRADAS[food.key] || MEDIDAS_RETIRADAS[food.name];
  const g = r && r[unit];
  return g > 0 ? g : null;
}
