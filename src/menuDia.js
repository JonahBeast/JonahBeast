/* ------------------------------------------------------------------ */
/* MENÚ DEL DÍA (Premium)                                              */
/* ------------------------------------------------------------------ */
/* Arma las comidas del día con los alimentos que le gustan al alumno y
   calcula las cantidades para que el total quede cerca de su meta de
   calorías y macros. No usa IA: solo la lista de alimentos de la app, así
   que sale al instante, no cuesta nada y no inventa platos.

   Cómo cuadra las macros:
   1. Reparte la meta del día entre las comidas (ej. almuerzo 35%).
   2. Cada comida tiene una "fórmula de plato" (proteína + acompañamiento
      + verdura + grasa). Calcula los gramos de la proteína para llegar a
      la proteína de esa comida, los del acompañamiento para los carbos y
      los de la grasa para lo que falte.
   3. Redondea a medidas que se pueden servir (huevos enteros, pan entero,
      10 g de arroz, cucharaditas de aceite) y corrige el día completo con
      la cena y el almuerzo para quedar dentro de ±5% de las calorías.

   Todo es determinístico: con la misma fecha, alumno y "variante" sale el
   mismo menú en cualquier celular. "Cambiar" y "Otro menú" solo suben la
   variante. Este archivo no depende de React: recibe la función que busca
   un alimento por su clave (buscarFood de App.jsx). */

// Gustos que el alumno elige. Cada opción apunta a alimentos de la lista.
export const OPCIONES_PROTEINA = [
  { id: 'pollo', label: 'Pollo', emoji: '🍗', alimentos: [
    { key: 'Pollo pechuga (Cocida)', texto: 'Pechuga de pollo a la plancha' },
    { key: 'Pollo pierna (sin piel) (Cocida)', texto: 'Pierna de pollo sin piel, al horno' },
  ] },
  { id: 'res', label: 'Carne de res', emoji: '🥩', alimentos: [
    { key: 'Carne de res (lomo fino) (Cocida)', texto: 'Lomo fino de res a la plancha' },
    { key: 'Carne de res (bistec) (Cocida)', texto: 'Bistec de res a la plancha' },
  ] },
  { id: 'cerdo', label: 'Cerdo', emoji: '🐖', alimentos: [
    { key: 'Cerdo (lomo) (Cocido)', texto: 'Lomo de cerdo a la plancha' },
  ] },
  { id: 'pescado', label: 'Pescado', emoji: '🐟', alimentos: [
    { key: 'Bonito (Cocido)', texto: 'Bonito a la plancha' },
    { key: 'Trucha (Cocida)', texto: 'Trucha a la plancha' },
  ] },
  { id: 'atun', label: 'Atún', emoji: '🥫', alimentos: [
    { key: 'Atún en lata en agua (escurrido) (-)', texto: 'Atún en agua (escurrido)' },
  ] },
  { id: 'pavo', label: 'Pavita', emoji: '🦃', alimentos: [
    { key: 'Pavo pechuga (Cocida)', texto: 'Pechuga de pavita a la plancha' },
  ] },
  { id: 'huevo', label: 'Huevo', emoji: '🥚', alimentos: [
    { key: 'Huevo de gallina (Cocido)', texto: 'Huevo sancochado' },
  ] },
];

export const OPCIONES_ACOMPANAMIENTO = [
  { id: 'arroz', label: 'Arroz', emoji: '🍚', alimentos: [{ key: 'Arroz blanco (Cocido)', texto: 'Arroz blanco' }] },
  { id: 'papa', label: 'Papa', emoji: '🥔', alimentos: [{ key: 'Papa (Cocida)', texto: 'Papa sancochada' }] },
  { id: 'camote', label: 'Camote', emoji: '🍠', alimentos: [{ key: 'Camote (Cocido)', texto: 'Camote sancochado' }] },
  { id: 'yuca', label: 'Yuca', emoji: '🌿', alimentos: [{ key: 'Yuca (Cocida)', texto: 'Yuca sancochada' }] },
  { id: 'fideos', label: 'Fideos', emoji: '🍝', alimentos: [{ key: 'Fideos / pasta (Cocidos)', texto: 'Fideos' }] },
  { id: 'quinua', label: 'Quinua', emoji: '🌾', alimentos: [{ key: 'Quinua (Cocida)', texto: 'Quinua' }] },
  { id: 'choclo', label: 'Choclo', emoji: '🌽', alimentos: [{ key: 'Choclo (maíz) (Cocido)', texto: 'Choclo sancochado' }] },
  { id: 'menestras', label: 'Menestras', emoji: '🫘', alimentos: [
    { key: 'Lenteja (Cocida)', texto: 'Lentejas' },
    { key: 'Frejol canario (Cocido)', texto: 'Frejol canario' },
    { key: 'Garbanzo (Cocido)', texto: 'Garbanzos' },
  ] },
];

export const OPCIONES_DESAYUNO = [
  { id: 'pan', label: 'Pan con algo', emoji: '🥪' },
  { id: 'avena', label: 'Avena', emoji: '🥣' },
  { id: 'huevos', label: 'Huevos', emoji: '🍳' },
];

export const GUSTOS_POR_DEFECTO = {
  proteinas: ['pollo', 'res', 'pescado', 'huevo'],
  acompanamientos: ['arroz', 'papa', 'camote'],
  desayunos: ['pan', 'huevos'],
  comidas: 5,
  platos: true,
};

/* Alimentos que Jonah agrega desde el panel pueden entrar al menú si les
   marca un uso (columna menu_uso de alimentos_extra; en la app llegan como
   food.menuUso). Estas son las opciones del panel. */
export function opcionesUsoMenu() {
  return [
    ...OPCIONES_PROTEINA.map(o => ({ valor: `proteina:${o.id}`, texto: `Proteína (almuerzo/cena) · ${o.label}` })),
    ...OPCIONES_ACOMPANAMIENTO.map(o => ({ valor: `acompanamiento:${o.id}`, texto: `Acompañamiento · ${o.label}` })),
    ...['pollo', 'res', 'cerdo', 'pescado', 'menestras'].map(id => ({ valor: `almuerzo:${id}`, texto: `Plato de almuerzo · con ${id === 'res' ? 'carne de res' : id}` })),
    { valor: 'desayuno', texto: 'Desayuno completo' },
    { valor: 'snack', texto: 'Media mañana / media tarde' },
  ];
}

function textoExtra(food) {
  return food.state && food.state !== '-' ? `${food.name} (${String(food.state).toLowerCase()})` : food.name;
}

// Qué comidas lleva el menú según cuántas hace al día, y qué parte de las
// calorías del día va a cada una.
export const REPARTO = {
  5: { 'Desayuno': 0.25, 'Media mañana': 0.10, 'Almuerzo': 0.35, 'Media tarde': 0.10, 'Cena': 0.20 },
  4: { 'Desayuno': 0.25, 'Almuerzo': 0.35, 'Media tarde': 0.15, 'Cena': 0.25 },
  3: { 'Desayuno': 0.30, 'Almuerzo': 0.40, 'Cena': 0.30 },
};

// Verduras del almuerzo y la cena (cantidad fija).
const ENSALADAS = [
  { texto: 'Ensalada de lechuga y tomate', partes: [['Lechuga (Cruda)', 60], ['Tomate (Crudo)', 80]] },
  { texto: 'Brócoli sancochado', partes: [['Brócoli (Cocido)', 120]] },
  { texto: 'Vainitas con zanahoria', partes: [['Vainita (Cocida)', 80], ['Zanahoria (Cocida)', 60]] },
  { texto: 'Ensalada de pepino y tomate', partes: [['Pepino (Crudo)', 80], ['Tomate (Crudo)', 80]] },
  { texto: 'Zapallito italiano salteado', partes: [['Zapallito italiano (Cocido)', 120]] },
];

// Platos peruanos para el almuerzo (máximo uno al día). Entra si le gusta
// su proteína (o, en las menestras, si eligió menestras). Algunos llevan un
// acompañamiento aparte (el ceviche, con camote).
const PLATOS = [
  { key: 'Lomo saltado (-)', proteina: 'res' },
  { key: 'Seco de res con frejoles (-)', proteina: 'res' },
  { key: 'Tallarines rojos con carne molida (-)', proteina: 'res' },
  { key: 'Olluquito con charqui (-)', proteina: 'res' },
  { key: 'Ají de gallina (-)', proteina: 'pollo' },
  { key: 'Arroz con pollo (-)', proteina: 'pollo' },
  { key: 'Tallarines rojos con pollo (-)', proteina: 'pollo' },
  { key: 'Escabeche de pollo (-)', proteina: 'pollo' },
  { key: 'Pollo al sillao (-)', proteina: 'pollo' },
  { key: 'Pollo a la olla con arroz (-)', proteina: 'pollo' },
  { key: 'Arroz chaufa (-)', proteina: 'pollo' },
  { key: 'Sudado de pescado (-)', proteina: 'pescado', acomp: { key: 'Arroz blanco (Cocido)', texto: 'Arroz blanco' } },
  { key: 'Ceviche de pescado (-)', proteina: 'pescado', acomp: { key: 'Camote (Cocido)', texto: 'Camote sancochado' } },
  { key: 'Adobo de cerdo (-)', proteina: 'cerdo', acomp: { key: 'Arroz blanco (Cocido)', texto: 'Arroz blanco' } },
  { key: 'Carapulcra (-)', proteina: 'cerdo' },
  { key: 'Menestra de lentejas con arroz (-)', menestra: true },
  { key: 'Frejolada (frejol con arroz) (-)', menestra: true },
];

const FRUTAS = [
  { key: 'Manzana (Cruda)', unidad: 'unidad', texto: 'Manzana' },
  { key: 'Plátano de seda (Cruda)', unidad: 'unidad', texto: 'Plátano de seda' },
  { key: 'Mandarina (Cruda)', gramos: 150, texto: 'Mandarinas' },
  { key: 'Papaya (Cruda)', gramos: 200, texto: 'Papaya picada' },
  { key: 'Piña (Cruda)', gramos: 150, texto: 'Piña picada' },
];

const PAN = [
  { key: 'Pan francés (-)', unidad: 'unidad', texto: 'Pan francés' },
  { key: 'Pan integral (-)', unidad: 'rebanada', texto: 'Pan integral (rebanada)' },
];

const RELLENOS_PAN = [
  { key: 'Huevo de gallina (Cocido)', unidad: 'unidad', texto: 'Huevo sancochado', gusto: 'huevo' },
  { key: 'Queso fresco (-)', unidad: 'tajada', texto: 'Queso fresco (tajada)' },
  { key: 'Jamón de pavo (-)', unidad: 'tajada', texto: 'Jamón de pavo (tajada)', gusto: 'pavo' },
  { key: 'Pollo pechuga (Cocida)', texto: 'Pollo deshilachado', gusto: 'pollo' },
];

const COMPLEMENTO_SNACK = [
  { key: 'Yogur natural (-)', texto: 'Yogur natural', min: 150, max: 300, paso: 50 },
  { key: 'Maní (Crudo)', texto: 'Maní', min: 15, max: 60, paso: 5 },
  { key: 'Queso fresco (-)', unidad: 'tajada', texto: 'Queso fresco (tajada)' },
  { key: 'Huevo de gallina (Cocido)', unidad: 'unidad', texto: 'Huevo sancochado', gusto: 'huevo' },
];

const ACEITE = { key: 'Aceite de oliva (-)', unidad: 'cucharadita', texto: 'Aceite de oliva' };
const PALTA = { key: 'Palta (Cruda)', texto: 'Palta', paso: 25 };
const LECHE = { key: 'Leche descremada (-)', texto: 'Leche descremada' };

/* ---------------------------- utilidades ---------------------------- */

function hash(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
// Números "al azar" pero siempre iguales para la misma semilla.
function azar(semilla) {
  let a = hash(semilla);
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const elegir = (r, lista) => lista[Math.floor(r() * lista.length) % lista.length];

const MACRO = { p: 'protein', c: 'carbs', f: 'fat' };

function macrosDe(food, g) {
  const k = g / 100;
  return { kcal: food.kcal * k, p: food.protein * k, c: food.carbs * k, f: food.fat * k };
}
function sumar(items) {
  return items.reduce((t, it) => {
    const m = macrosDe(it.food, it.g);
    return { kcal: t.kcal + m.kcal, p: t.p + m.p, c: t.c + m.c, f: t.f + m.f };
  }, { kcal: 0, p: 0, c: 0, f: 0 });
}

/* Un "item" del menú: alimento + gramos + cómo se ajusta.
   rol: 'p' (ajusta proteína), 'c' (carbos), 'f' (grasa), 'k' (calorías,
   para los platos preparados) o 'fijo'. porUnidad: gramos de una unidad
   (huevo, pan...) para redondear a unidades enteras. */
function item(buscar, def, rol, extra = {}) {
  const food = buscar(def.key);
  if (!food) return null;
  return { key: def.key, food, texto: def.texto, rol, g: extra.g || 0, ...limites(def, extra) };
}
function limites(def, extra) {
  return {
    min: extra.min ?? def.min ?? 0,
    max: extra.max ?? def.max ?? 1000,
    paso: extra.paso ?? def.paso ?? 10,
    unidad: def.unidad || null,
    porUnidad: extra.porUnidad || null,
  };
}

// Calcula los gramos de cada item ajustable para acercarse a la meta de
// la comida (proteína, carbos, grasa). Unas pocas vueltas bastan porque
// cada alimento aporta sobre todo a su macro.
function resolver(items, meta) {
  const ajustables = items.filter(it => it.rol !== 'fijo');
  for (let vuelta = 0; vuelta < 8; vuelta++) {
    for (const it of ajustables) {
      const otros = sumar(items.filter(x => x !== it));
      let g;
      if (it.rol === 'k') {
        g = ((meta.kcal - otros.kcal) / it.food.kcal) * 100;
      } else {
        const porGramo = it.food[MACRO[it.rol]] / 100;
        if (porGramo <= 0) continue;
        g = (meta[it.rol] - otros[it.rol]) / porGramo;
      }
      it.g = Math.min(it.max, Math.max(it.min, g));
    }
  }
}

function redondear(it) {
  if (it.rol === 'fijo') return;
  if (it.minSiHay && it.g > 0 && it.g < it.minSiHay) it.g = it.g >= it.minSiHay / 2 ? it.minSiHay : 0;
  if (it.porUnidad) {
    const n = Math.max(Math.round(it.min / it.porUnidad) || 1, Math.round(it.g / it.porUnidad));
    it.g = Math.min(it.max, n * it.porUnidad);
    return;
  }
  it.g = Math.min(it.max, Math.max(it.min, Math.round(it.g / it.paso) * it.paso));
}

/* ------------------------- armado por comida ------------------------ */

function sinRestringidos(lista, restricciones, buscar) {
  return lista.filter(d => {
    const f = buscar(d.key);
    return f && !restricciones.includes(f.name);
  });
}

function alimentosDe(opciones, ids, restricciones, buscar, extras = [], tipo = null) {
  const base = opciones.filter(o => ids.includes(o.id))
    .flatMap(o => sinRestringidos(o.alimentos, restricciones, buscar).map(a => ({ ...a, gusto: o.id })));
  const agregados = tipo ? extras
    .filter(f => ids.some(id => f.menuUso === `${tipo}:${id}`) && !restricciones.includes(f.name))
    .map(f => ({ key: f.key, texto: textoExtra(f), gusto: f.menuUso.split(':')[1] })) : [];
  return [...base, ...agregados];
}

function ensaladaItems(buscar, r) {
  const ens = elegir(r, ENSALADAS);
  return ens.partes.map(([key, g], i) => {
    const food = buscar(key);
    return food ? { key, food, g, rol: 'fijo', texto: i === 0 ? ens.texto : null, parteDe: i === 0 ? null : ens.texto } : null;
  }).filter(Boolean);
}

function gramosUnidad(buscar, gramsPerUnit, def) {
  const food = buscar(def.key);
  return food && def.unidad ? gramsPerUnit(food, def.unidad) : null;
}

function platoPrincipal(ctx, meta, r, evitarProteina) {
  const { buscar, gramsPerUnit, gustos, restricciones } = ctx;
  let proteinas = alimentosDe(OPCIONES_PROTEINA, gustos.proteinas.filter(p => p !== 'huevo' || gustos.proteinas.length === 1), restricciones, buscar, ctx.extras, 'proteina');
  if (!proteinas.length) proteinas = alimentosDe(OPCIONES_PROTEINA, ['pollo'], restricciones, buscar);
  const distintas = proteinas.filter(p => p.gusto !== evitarProteina);
  const prot = elegir(r, distintas.length ? distintas : proteinas);
  let acomp = alimentosDe(OPCIONES_ACOMPANAMIENTO, gustos.acompanamientos, restricciones, buscar, ctx.extras, 'acompanamiento');
  if (!acomp.length) acomp = alimentosDe(OPCIONES_ACOMPANAMIENTO, ['arroz'], restricciones, buscar);
  const carb = elegir(r, acomp);
  const porHuevo = prot.key.startsWith('Huevo') ? gramosUnidad(buscar, gramsPerUnit, { key: prot.key, unidad: 'unidad' }) : null;
  const items = [
    item(buscar, { ...prot, unidad: porHuevo ? 'unidad' : null }, 'p', porHuevo ? { min: porHuevo, max: porHuevo * 4, porUnidad: porHuevo } : { min: 50, max: 300, paso: 10 }),
    Object.assign(item(buscar, carb, 'c', { min: 0, max: 500, paso: 10 }) || {}, { minSiHay: 60 }),
    ...ensaladaItems(buscar, r),
    item(buscar, ACEITE, 'f', { min: 0, max: 15, paso: 5 }),
  ].filter(Boolean);
  resolver(items, meta);
  return { items, proteina: prot.gusto };
}

function platoPeruano(ctx, meta, r) {
  const { buscar, gustos, restricciones } = ctx;
  const platosExtra = ctx.extras.filter(f => f.menuUso?.startsWith('almuerzo:')).map(f => {
    const id = f.menuUso.split(':')[1];
    return id === 'menestras' ? { key: f.key, menestra: true } : { key: f.key, proteina: id };
  });
  const opciones = [...PLATOS, ...platosExtra].filter(p => p.menestra ? gustos.acompanamientos.includes('menestras') : gustos.proteinas.includes(p.proteina))
    .filter(p => { const f = buscar(p.key); return f && !restricciones.includes(f.name); });
  if (!opciones.length) return null;
  const plato = elegir(r, opciones);
  const food = buscar(plato.key);
  // Si su meta pide más proteína de la que trae el plato, el ajuste final
  // puede sumar una porción extra de la misma proteína (empieza en 0).
  // En las menestras, la proteína extra es la primera que le guste.
  const idExtra = plato.proteina || gustos.proteinas.find(p => p !== 'huevo') || gustos.proteinas[0];
  const extra = OPCIONES_PROTEINA.find(o => o.id === idExtra)?.alimentos
    .find(a => { const f = buscar(a.key); return f && !restricciones.includes(f.name); });
  const acomp = plato.acomp && buscar(plato.acomp.key) && !restricciones.includes(buscar(plato.acomp.key).name) ? plato.acomp : null;
  const items = [
    { key: plato.key, food, texto: food.name, rol: 'k', g: 0, min: 200, max: 650, paso: 25 },
    ...ensaladaItems(buscar, r),
    ...(extra ? [{ key: extra.key, food: buscar(extra.key), texto: `Extra: ${extra.texto.charAt(0).toLowerCase()}${extra.texto.slice(1)}`, rol: 'p', g: 0, min: 0, max: 150, paso: 10, minSiHay: 60 }] : []),
    ...(acomp ? [{ key: acomp.key, food: buscar(acomp.key), texto: acomp.texto, rol: 'c', g: 120, min: 0, max: 250, paso: 10, minSiHay: 80 }] : []),
  ];
  resolver(items, meta);
  return { items, proteina: plato.proteina, plato: true };
}

function desayuno(ctx, meta, r) {
  const { buscar, gramsPerUnit, gustos, restricciones } = ctx;
  const desayunosExtra = ctx.extras.filter(f => f.menuUso === 'desayuno' && !restricciones.includes(f.name));
  const estilos = [...(gustos.desayunos.length ? gustos.desayunos : ['pan']), ...(desayunosExtra.length ? ['extra'] : [])];
  const estilo = elegir(r, estilos);
  const huevoOk = gustos.proteinas.includes('huevo') && !restricciones.includes('Huevo de gallina');
  const conUnidad = (def, rol, maxUnidades) => {
    const pu = gramosUnidad(buscar, gramsPerUnit, def);
    return item(buscar, def, rol, pu ? { min: pu, max: pu * maxUnidades, porUnidad: pu } : { min: 30, max: 200, paso: 10 });
  };
  let items;
  if (estilo === 'extra') {
    const f = elegir(r, desayunosExtra);
    items = [{ key: f.key, food: f, texto: textoExtra(f), rol: 'k', g: 0, min: 100, max: 500, paso: 25 }];
  } else if (estilo === 'avena') {
    items = [
      item(buscar, { key: 'Avena en hojuelas (Cruda)', texto: 'Avena en hojuelas (cruda, para preparar)' }, 'c', { min: 30, max: 160, paso: 10 }),
      item(buscar, LECHE, 'fijo', { g: 250 }),
      huevoOk
        ? conUnidad({ key: 'Huevo de gallina (Cocido)', unidad: 'unidad', texto: 'Huevo sancochado' }, 'p', 3)
        : item(buscar, { key: 'Yogur natural (-)', texto: 'Yogur natural' }, 'p', { min: 100, max: 250, paso: 50 }),
      item(buscar, { key: 'Plátano de seda (Cruda)', unidad: 'unidad', texto: 'Plátano de seda' }, 'fijo', { g: 0 }),
    ].filter(Boolean);
    const platano = items.find(i => i.key.startsWith('Plátano'));
    if (platano) { const pu = gramsPerUnit(platano.food, 'unidad'); platano.g = pu / 2; platano.porUnidad = pu; platano.mitad = true; }
  } else if (estilo === 'huevos' && huevoOk) {
    const acompDesayuno = sinRestringidos([{ key: 'Camote (Cocido)', texto: 'Camote sancochado' }, { key: 'Papa (Cocida)', texto: 'Papa sancochada' }], restricciones, buscar);
    items = [
      conUnidad({ key: 'Huevo de gallina (Cocido)', unidad: 'unidad', texto: 'Huevo sancochado' }, 'p', 3),
      acompDesayuno.length ? item(buscar, elegir(r, acompDesayuno), 'c', { min: 60, max: 300, paso: 10 }) : conUnidad(PAN[0], 'c', 3),
      item(buscar, { key: 'Tomate (Crudo)', texto: 'Tomate en rodajas' }, 'fijo', { g: 80 }),
      item(buscar, PALTA, 'f', { min: 0, max: 150, paso: 25 }),
    ].filter(Boolean);
  } else {
    const panes = sinRestringidos(PAN, restricciones, buscar);
    const rellenos = sinRestringidos(RELLENOS_PAN, restricciones, buscar)
      .filter(x => !x.gusto || gustos.proteinas.includes(x.gusto));
    const pan = panes.length ? elegir(r, panes) : PAN[0];
    const relleno = rellenos.length ? elegir(r, rellenos) : RELLENOS_PAN[1];
    items = [
      conUnidad(pan, 'c', 4),
      relleno.unidad ? conUnidad(relleno, 'p', 4) : item(buscar, relleno, 'p', { min: 40, max: 150, paso: 10 }),
      item(buscar, PALTA, 'f', { min: 0, max: 150, paso: 25 }),
    ].filter(Boolean);
  }
  resolver(items, meta);
  return { items };
}

function snack(ctx, meta, r) {
  const { buscar, gramsPerUnit, gustos, restricciones } = ctx;
  const frutas = sinRestringidos(FRUTAS, restricciones, buscar);
  const fruta = frutas.length ? elegir(r, frutas) : null;
  const items = [];
  if (fruta) {
    const food = buscar(fruta.key);
    const g = fruta.unidad ? gramsPerUnit(food, fruta.unidad) : fruta.gramos;
    items.push({ key: fruta.key, food, g, rol: 'fijo', texto: fruta.texto, unidad: fruta.unidad || null, porUnidad: fruta.unidad ? g : null });
  }
  const restante = meta.kcal - sumar(items).kcal;
  if (restante > 60) {
    const opciones = [
      ...sinRestringidos(COMPLEMENTO_SNACK, restricciones, buscar).filter(x => !x.gusto || gustos.proteinas.includes(x.gusto)),
      ...ctx.extras.filter(f => f.menuUso === 'snack' && !restricciones.includes(f.name))
        .map(f => ({ key: f.key, texto: textoExtra(f), min: 50, max: 300, paso: 10 })),
    ];
    const comp = elegir(r, opciones.length ? opciones : [COMPLEMENTO_SNACK[0]]);
    const pu = gramosUnidad(buscar, gramsPerUnit, comp);
    // Mínimo 0: si el día ya está completo, el ajuste final puede quitarlo.
    const it = item(buscar, comp, 'k', pu ? { min: 0, max: pu * 2, porUnidad: pu } : { min: 0 });
    if (it && !pu) it.minSiHay = comp.min;
    if (it) items.push(it);
  }
  resolver(items, meta);
  return { items };
}

/* ------------------------------ el día ------------------------------ */

// Meta del día en gramos, desde la meta de "Comidas" (calorías y % de macros).
export function metaDelDia(mealPlan) {
  const kcal = Number(mealPlan?.targetKcal) || 2000;
  const m = mealPlan?.macros || { p: 0.3, c: 0.4, f: 0.3 };
  return { kcal, p: (kcal * m.p) / 4, c: (kcal * m.c) / 4, f: (kcal * m.f) / 9 };
}

export function comidasDelMenu(gustos) {
  return Object.keys(REPARTO[gustos?.comidas] || REPARTO[5]);
}

/* Arma el menú. variantes: { base, [comida]: n } — "Otro menú" sube base
   y "Cambiar" sube la de esa comida.
   consumido: { [comida]: {kcal, p, c, f} } con lo que ya registró hoy en
   cada comida (aunque no sea lo del menú, y aunque sea una comida que el
   menú no tiene). Esas comidas quedan como "registradas" con lo real, y
   las que faltan se recalculan con lo que le queda del día: si almorzó
   más, la cena sale más ligera. */
export function armarMenu({ buscar, gramsPerUnit, gustos, restricciones = [], mealPlan, semilla, variantes = {}, extras = [], consumido = {} }) {
  const g = { ...GUSTOS_POR_DEFECTO, ...(gustos || {}) };
  // extras: alimentos agregados por Jonah con un uso en el menú (menuUso).
  const ctx = { buscar, gramsPerUnit, gustos: g, restricciones, extras: (extras || []).filter(f => f && f.menuUso && f.kcal > 0) };
  const meta = metaDelDia(mealPlan);
  const reparto = REPARTO[g.comidas] || REPARTO[5];
  const base = variantes.base || 0;
  const rDia = azar(`${semilla}|dia|${base}`);
  const conPlato = g.platos && rDia() < 0.6; // ~4 de cada 7 días, un plato peruano en el almuerzo

  const yaComido = Object.values(consumido || {}).reduce((t, m) => ({
    kcal: t.kcal + (m.kcal || 0), p: t.p + (m.p || 0), c: t.c + (m.c || 0), f: t.f + (m.f || 0),
  }), { kcal: 0, p: 0, c: 0, f: 0 });
  // Las comidas sin registrar que quedaron antes de la última registrada
  // ya pasaron (se las saltó): no se les reparte nada.
  const orden = Object.keys(reparto);
  const ultima = orden.reduce((u, n, i) => (consumido?.[n] ? i : u), -1);
  const saltadas = orden.filter((n, i) => !consumido?.[n] && i < ultima);
  const pendientes = orden.filter((n, i) => !consumido?.[n] && i > ultima);
  const partePendiente = pendientes.reduce((a, n) => a + reparto[n], 0) || 1;
  // Lo que le queda del día para las comidas que faltan (nunca negativo).
  const resto = {
    kcal: Math.max(0, meta.kcal - yaComido.kcal), p: Math.max(0, meta.p - yaComido.p),
    c: Math.max(0, meta.c - yaComido.c), f: Math.max(0, meta.f - yaComido.f),
  };

  const comidas = [];
  let proteinaAlmuerzo = null;
  for (const [nombre, parte] of Object.entries(reparto)) {
    if (consumido?.[nombre]) {
      comidas.push({ nombre, registrado: true, items: [], totalesReg: consumido[nombre] });
      continue;
    }
    if (saltadas.includes(nombre)) { comidas.push({ nombre, saltada: true, items: [] }); continue; }
    const share = parte / partePendiente;
    const metaComida = { kcal: resto.kcal * share, p: resto.p * share, c: resto.c * share, f: resto.f * share };
    // Si ya casi no le queda nada para esta comida, no se propone comida.
    if (metaComida.kcal < 80) { comidas.push({ nombre, vacia: true, items: [], meta: metaComida }); continue; }
    const r = azar(`${semilla}|${nombre}|${base}|${variantes[nombre] || 0}`);
    let armado;
    if (nombre === 'Desayuno') armado = desayuno(ctx, metaComida, r);
    else if (nombre === 'Almuerzo') {
      armado = (conPlato && platoPeruano(ctx, metaComida, r)) || platoPrincipal(ctx, metaComida, r, null);
      proteinaAlmuerzo = armado.proteina;
    } else if (nombre === 'Cena') armado = platoPrincipal(ctx, metaComida, r, proteinaAlmuerzo);
    else armado = snack(ctx, metaComida, r);
    comidas.push({ nombre, items: armado.items, plato: !!armado.plato, meta: metaComida });
  }

  const porArmar = comidas.filter(c => !c.registrado && !c.vacia && !c.saltada);
  porArmar.forEach(c => c.items.forEach(redondear));
  if (porArmar.length) {
    corregirDia(porArmar, resto, meta);
  }
  const menu = presentar(comidas, meta, yaComido, buscar, gramsPerUnit);
  menu.adaptado = Object.keys(consumido || {}).length > 0 && pendientes.length > 0;
  menu.restante = redondeo(resto);
  menu.pendientes = pendientes;
  return menu;
}

// Ajusta el día completo para quedar cerca de la meta. Prueba subir o
// bajar un paso (10 g, un huevo, una cucharadita...) cada porción
// ajustable y se queda con el cambio que más acerca el día a la meta;
// repite hasta que ningún cambio mejore. Las calorías pesan más que las
// macros, y la proteína más que los carbos y la grasa.
// meta: lo que deben sumar estas comidas. escala: la meta del día completo,
// para medir los errores (si queda poca grasa por comer, no se castiga de
// más cada gramo de grasa).
function corregirDia(comidas, meta, escala = meta) {
  const items = comidas.flatMap(c => c.items).filter(it => it.rol !== 'fijo');
  const todos = comidas.flatMap(c => c.items);
  // Además de la meta del día, cada comida debe quedar cerca de su parte
  // (que el almuerzo no quede chico y el desayuno gigante).
  const errorComidas = () => comidas.reduce((a, c) => {
    const t = sumar(c.items);
    return a + ((t.kcal - c.meta.kcal) / escala.kcal) ** 2 + 0.7 * ((t.p - c.meta.p) / escala.p) ** 2;
  }, 0);
  const error = t => 4 * ((t.kcal - meta.kcal) / escala.kcal) ** 2
    + 3 * ((t.p - meta.p) / escala.p) ** 2
    + ((t.c - meta.c) / escala.c) ** 2
    + ((t.f - meta.f) / escala.f) ** 2
    + 3 * errorComidas();
  let actual = error(sumar(todos));
  for (let vuelta = 0; vuelta < 80; vuelta++) {
    let mejor = null;
    for (const it of items) {
      const paso = it.porUnidad || it.paso || 10;
      for (const signo of [1, -1]) {
        let nuevo = it.g + signo * paso;
        // Porciones opcionales: o no van, o van en una cantidad que se sirve.
        if (it.minSiHay && nuevo > 0 && nuevo < it.minSiHay) nuevo = signo > 0 ? it.minSiHay : 0;
        if (nuevo < it.min - 1e-6 || nuevo > it.max + 1e-6) continue;
        const antes = it.g;
        it.g = nuevo;
        const e = error(sumar(todos));
        it.g = antes;
        if (e < actual - 1e-9 && (!mejor || e < mejor.e)) mejor = { it, nuevo, e };
      }
    }
    if (!mejor) break;
    mejor.it.g = mejor.nuevo;
    actual = mejor.e;
  }
}

/* --------------------------- presentación --------------------------- */

const FRACCIONES = [[0.25, '¼'], [0.5, '½'], [0.75, '¾'], [1, '1'], [1.25, '1 ¼'], [1.5, '1 ½'], [1.75, '1 ¾'], [2, '2'], [2.5, '2 ½'], [3, '3']];
function fraccion(x) {
  let mejor = FRACCIONES[0];
  for (const f of FRACCIONES) if (Math.abs(f[0] - x) < Math.abs(mejor[0] - x)) mejor = f;
  return mejor[1];
}
// Medidas de casa aproximadas (solo para mostrar; se registra en gramos).
const REFERENCIA_CASERA = {
  'Arroz blanco (Cocido)': [150, 'taza'],
  'Quinua (Cocida)': [185, 'taza'],
  'Fideos / pasta (Cocidos)': [140, 'taza'],
  'Lenteja (Cocida)': [180, 'taza'],
  'Frejol canario (Cocido)': [180, 'taza'],
  'Garbanzo (Cocido)': [180, 'taza'],
  'Yogur natural (-)': [240, 'taza'],
  'Leche descremada (-)': [240, 'taza'],
  'Avena en hojuelas (Cruda)': [10, 'cucharada'],
  'Papa (Cocida)': [150, 'papa mediana', 'papas medianas'],
  'Camote (Cocido)': [150, 'camote mediano', 'camotes medianos'],
  'Yuca (Cocida)': [150, 'trozo mediano', 'trozos medianos'],
};

function cantidadTexto(it, gramsPerUnit) {
  if (it.porUnidad && it.unidad) {
    const n = it.mitad ? 0.5 : Math.round(it.g / it.porUnidad);
    const plural = n > 1 && !['unidad'].includes(it.unidad) ? `${it.unidad}s` : it.unidad;
    return it.mitad ? `½ ${it.unidad}` : `${n} ${n > 1 && it.unidad === 'unidad' ? 'unidades' : plural}`;
  }
  if (it.key === ACEITE.key) {
    const cdtas = Math.round(it.g / 5);
    return `${cdtas} ${cdtas === 1 ? 'cucharadita' : 'cucharaditas'}`;
  }
  if (it.rol === 'k' && it.food.group === 'Platos preparados') {
    const plato = gramsPerUnit(it.food, 'plato') || 400;
    const fr = fraccion(it.g / plato);
    const cuanto = ['1', '1 ¼', '1 ½', '1 ¾', '2'].includes(fr) ? `${fr} plato` : `${fr} de plato`;
    return `${cuanto} (${Math.round(it.g)} g)`;
  }
  const ref = REFERENCIA_CASERA[it.key];
  if (ref) {
    const n = it.g / ref[0];
    const fr = fraccion(n);
    const casera = ref[1] === 'cucharada' ? `${Math.round(n)} cucharadas`
      : ref[2] ? `${fr} ${['¼', '½', '¾', '1'].includes(fr) ? ref[1] : ref[2]}` : `${fr} ${ref[1]}`;
    return `${Math.round(it.g)} g (≈ ${casera})`;
  }
  return `${Math.round(it.g)} g`;
}

// Entrada lista para sumarse a "Comidas" (mismo formato que el resto).
function entradaDe(it, gramsPerUnit) {
  if (it.porUnidad && it.unidad && !it.mitad) {
    return { foodKey: it.key, qty: Math.round(it.g / it.porUnidad), unit: it.unidad };
  }
  if (it.key === ACEITE.key) return { foodKey: it.key, qty: Math.round(it.g / 5), unit: 'cucharadita' };
  return { foodKey: it.key, qty: Math.round(it.g), unit: 'gramos' };
}

function presentar(comidas, meta, yaComido, buscar, gramsPerUnit) {
  const lista = comidas.map(c => {
    if (c.registrado) return { nombre: c.nombre, registrado: true, lineas: [], entradas: [], totales: redondeo(c.totalesReg) };
    if (c.saltada) return { nombre: c.nombre, saltada: true, lineas: [], entradas: [], totales: redondeo({ kcal: 0, p: 0, c: 0, f: 0 }) };
    if (c.vacia) return { nombre: c.nombre, vacia: true, lineas: [], entradas: [], totales: redondeo({ kcal: 0, p: 0, c: 0, f: 0 }) };
    const items = c.items.filter(it => it.g > 0);
    const tot = sumar(items);
    // Las ensaladas de 2 verduras se muestran en una sola línea.
    const lineas = [];
    for (const it of items) {
      if (it.parteDe) continue;
      const compa = items.filter(x => x.parteDe && x.parteDe === it.texto);
      const g = it.g + compa.reduce((a, x) => a + x.g, 0);
      lineas.push({
        texto: it.texto || it.food.name,
        cantidad: compa.length ? `${Math.round(g)} g` : cantidadTexto(it, gramsPerUnit),
      });
    }
    return {
      nombre: c.nombre,
      plato: c.plato,
      lineas,
      entradas: items.map(it => entradaDe(it, gramsPerUnit)),
      totales: redondeo(tot),
    };
  });
  // Total del día: lo que ya registró + lo que falta según el menú.
  const plan = sumar(comidas.filter(c => !c.registrado).flatMap(c => c.items));
  const total = redondeo({ kcal: plan.kcal + yaComido.kcal, p: plan.p + yaComido.p, c: plan.c + yaComido.c, f: plan.f + yaComido.f });
  const ok = Math.abs(total.kcal - meta.kcal) <= meta.kcal * 0.05;
  return { comidas: lista, total, meta: redondeo(meta), ok };
}

function redondeo(t) {
  return { kcal: Math.round(t.kcal), p: Math.round(t.p), c: Math.round(t.c), f: Math.round(t.f) };
}
