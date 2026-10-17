/* Buscador de alimentos compartido: lo usan la app del alumno (src/alumno.jsx)
   y el buscador "¿Cuántas calorías tiene tu plato?" de la portada
   (src/buscadorPortada.jsx), para que los dos den los mismos resultados.
   Se movió tal cual desde src/alumno.jsx y src/App.jsx (16 oct 2026): el
   comportamiento es el mismo. No importa nada de App.jsx, así la portada no
   carga la app del alumno. */

// Alimentos que ya no se ofrecen (ni en el buscador ni en la foto) porque
// se reemplazaron por versiones más precisas, pero siguen existiendo para
// que lo que los alumnos ya anotaron con ellos no cambie.
export const ALIMENTOS_RETIRADOS = new Set([
  'Pollada (pollo frito) (-)', // → Pollada pierna / Pollada pecho
  'Pollo a la brasa (solo la presa) (-)', // → Pollo a la brasa pierna / pecho
  // → con piel / sin piel (16 oct)
  'Pollada pierna (-)', 'Pollada pecho (-)',
  'Pollo a la brasa pierna (solo la presa) (-)', 'Pollo a la brasa pecho (solo la presa) (-)',
  'Pollo al horno (-)', // → Pollo al horno pierna / pecho, con o sin piel (16 oct)
  // Sándwiches → versión en pan blanco o en pan integral (pedido por Jonah, 15 oct).
  'Pan con jamonada (-)', 'Pan con pollo (-)', 'Pan con chicharrón (-)', 'Butifarra (-)',
  'Hot dog (-)', 'Hamburguesa de carretilla (-)', 'Sándwich de pollo (-)',
  // → con papas fritas / sin papas fritas (pedido por Jonah, 17 oct). El
  // "Saltado de pollo" es el que se agregó desde el panel (alimentos_extra):
  // se retira aquí, sin tocar la base.
  'Lomo saltado (-)', 'Lomo saltado con arroz (-)', 'Saltado de pollo (-)',
]);

/* Quita tildes y pasa a minúsculas para que "platano" encuentre "Plátano"
   y "cafe" encuentre "Café". */
export function normalizar(txt) {
  return String(txt || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/* Sinónimos y nombres alternativos que la gente usa. */
export const SINONIMOS = {
  'frijol': 'frejol', 'frijoles': 'frejol', 'poroto': 'frejol',
  'macdonald': 'mcdonald', 'macdonalds': 'mcdonald', "macdonald's": 'mcdonald', 'mcdonalds': 'mcdonald',
  'vembos': 'bembos', 'vembo': 'bembos',
  'yogurt': 'yogur', 'yoghurt': 'yogur',
  'palta': 'palta aguacate', 'aguacate': 'palta',
  'maiz': 'choclo', 'elote': 'choclo',
  'camote': 'camote batata', 'batata': 'camote',
  'chancho': 'cerdo', 'res': 'res carne',
  'gaseosa': 'gaseosa refresco', 'refresco': 'gaseosa',
  'pan de molde': 'pan integral', 'galletas': 'galleta',
  'menestra': 'lenteja frejol garbanzo', 'menestras': 'lenteja frejol garbanzo',
  'avena': 'avena', 'quaker': 'avena',
  'clara': 'clara huevo', 'claras': 'clara huevo',
  'atun': 'atun', 'pechuga': 'pechuga pollo',
  'bellaco': 'platano bellaco', 'platano verde': 'platano bellaco', 'platano sancochado': 'platano bellaco', 'platano de freir': 'platano bellaco', 'platano para sancochar': 'platano bellaco',
  'pecana': 'pecanas', 'pecan': 'pecanas', 'nuez pecana': 'pecanas', 'nueces pecanas': 'pecanas',
  'papa': 'papa', 'arroz': 'arroz',
  // Ingredientes de casa (15 oct 2026): cómo los llama la gente.
  'pollo sancochado': 'pollo pechuga cocida', 'calamar': 'pota', 'calamares': 'pota',
  'mejillon': 'choros', 'mejillones': 'choros', 'conchas': 'conchas de abanico', 'mahi mahi': 'perico',
  'azucar morena': 'azucar rubia', 'panela': 'chancaca', 'salsa de soya': 'sillao', 'sillado': 'sillao',
  'catsup': 'ketchup', 'sesamo': 'ajonjoli', 'castana': 'castanas', 'nuez de brasil': 'castanas',
  'pasa': 'pasas', 'evaporada': 'leche evaporada', 'leche gloria': 'leche evaporada',
  'callos': 'mondongo', 'pancita': 'mondongo', 'physalis': 'aguaymanto', 'fruta del dragon': 'pitahaya',
};

/* Busca alimentos por palabras sueltas y en cualquier orden:
   "pollo pechuga" encuentra "Pechuga de pollo". */
// El sinónimo SUMA resultados, no reemplaza lo escrito: antes "refresco"
// buscaba solo "gaseosa" y el "Refresco de cebada" no aparecía (el alumno
// creía que no estaba y lo creaba de nuevo).
// Cada palabra se busca por su raíz: "papas fritas" encuentra "Papa (Frita)"
// y "yuca frito" encuentra "Yuca (Frita)" (plural y masculino/femenino de
// cómo está preparado no deben esconder el alimento).
const PREPARACION_RAIZ = /^(frit|cocid|crud|sancochad|hornead|asad|guisad|apanad|rellen|salad|dorad)(o|a|os|as)$/;
export function raizPalabra(w) {
  const m = w.match(PREPARACION_RAIZ);
  if (m) return m[1];
  if (w.length >= 5 && /[lnrd]es$/.test(w)) return w.slice(0, -2); // frejoles, panes, limones
  return w.length >= 4 && w.endsWith('s') ? w.slice(0, -1) : w;
}
/* "Pan con palta" → { pan: Pan francés, relleno: "palta" }; null si no es
   "pan con …" o si es un sándwich de la lista (pan con pollo, con jamonada,
   con chicharrón…), que sí es un plato. Lo usan el buscador de la app y el
   de la portada. */
export function panConPartes(lista, texto) {
  const m = normalizar(texto).match(/^(?:\d+ |un |una |dos |tres )?(?:pan|panes|pancito|pancitos)( frances| integral| de molde)? con (.+)$/);
  if (!m) return null;
  const primera = m[2].split(' ')[0];
  if (lista.some(f => f.group === 'Platos preparados' && normalizar(f.name).startsWith(`pan con ${primera}`))) return null;
  const clavePan = /integral/.test(m[1] || '') ? 'Pan integral (-)' : /molde/.test(m[1] || '') ? 'Pan de molde blanco (-)' : 'Pan francés (-)';
  const pan = lista.find(f => f.key === clavePan);
  return pan ? { pan, relleno: m[2] } : null;
}

/* Lo que lleva 1 pan de cada relleno (17 oct), para "pan con …" en la voz,
   Beast y la portada: palta 1 "porción para pan" (50 g, ≈ ¼ de palta;
   estimado), huevo 1 unidad, mantequilla 1 cucharadita (5 g; estimado),
   aceituna 3 (estimado), camote 60 g (lo del pan con chicharrón de la app).
   null: su medida casera de siempre (queso, mermelada…). */
export function medidaParaPan(food) {
  const n = food?.name || '';
  return n === 'Palta' ? { unit: 'porción para pan', qty: 1 }
    : n === 'Huevo de gallina' ? { unit: 'unidad', qty: 1 }
      : n === 'Mantequilla' ? { unit: 'cucharadita', qty: 1 }
        : /^aceitunas?\b/i.test(n) ? { unit: 'unidad', qty: 3 }
          : n === 'Camote' ? { unit: 'gramos', qty: 60 }
            : null;
}

export function buscarAlimentos(lista, texto, limite = 40) {
  const q = normalizar(texto);
  if (!q) return lista.filter(f => !ALIMENTOS_RETIRADOS.has(f.key)).slice(0, limite);
  // "Pan con palta", "2 panes con huevo" no son platos (Jonah, 17 oct): salen
  // el pan y lo que va dentro, para anotar cada uno (antes solo la palta).
  const partes = panConPartes(lista, q);
  if (partes) {
    const dentro = buscarAlimentos(lista, partes.relleno, limite).filter(f => f.key !== partes.pan.key);
    return [partes.pan, ...dentro].slice(0, limite);
  }
  const alternativas = [q.split(' ').filter(Boolean).map(raizPalabra)];
  if (SINONIMOS[q] && normalizar(SINONIMOS[q]) !== q) alternativas.push(normalizar(SINONIMOS[q]).split(' ').filter(Boolean).map(raizPalabra));
  const palabras = alternativas[0];
  const conPuntaje = [];
  for (const f of lista) {
    if (ALIMENTOS_RETIRADOS.has(f.key)) continue;
    let objetivo = normalizar(f.key + ' ' + f.name + ' ' + (f.group || ''));
    if (objetivo.includes('keke')) objetivo += ' queque';
    else if (objetivo.includes('queque')) objetivo += ' keke';
    if (!alternativas.some(ps => ps.every(w => objetivo.includes(w)))) continue;
    const nombreNorm = normalizar(f.name);
    let puntaje = 3;
    if (nombreNorm.startsWith(q)) puntaje = 0;
    else if (nombreNorm.includes(q)) puntaje = 1;
    else if (objetivo.includes(q)) puntaje = 2;
    // Los platos de pollo a la brasa por corte ("1/4 pecho con piel"…, 17 oct)
    // van después de lo demás si no se buscó un corte: con "pollo a la brasa"
    // salen primero el plato de siempre y las presas, no 10 versiones.
    if (/^1\/[48] /.test(f.state || '') && !/\b(pierna|pecho|entrepierna|pechuga)\b/.test(q)) puntaje += 0.5;
    conPuntaje.push({ f, puntaje });
  }
  conPuntaje.sort((a, b) => a.puntaje - b.puntaje || a.f.name.localeCompare(b.f.name));
  // "1/4 de pollo con papas", "un cuarto de pollo a la brasa con papas y
  // ensalada": la cantidad y las palabras de unión no están en el nombre y
  // la búsqueda caía a una sola palabra ("ensalada"). Se busca otra vez
  // sin ellas (y "un cuarto de pollo" es el de la pollería, a la brasa).
  if (conPuntaje.length === 0 && palabras.length > 1) {
    const RELLENO = /^(\d+([/.,]\d+)?|un|una|uno|medio|media|cuartos?|octavos?|de|del|la|el|los|las|con|y|a|al)$/;
    let limpio = q.replace(/\b1\s*\/\s*[48]\b/g, ' ');
    if (/\b(cuartos?|octavos?|1\s*\/\s*[48]|medio)\s+(de\s+)?pollo\b/.test(q) && !/\b(brasa|pollada|broaster|horno|olla|sillao|plancha)\b/.test(q)) limpio += ' brasa';
    // Y si no, lo que va antes del "con" ("pollo a la brasa pierna con papas").
    const corte = limpio.lastIndexOf(' con ');
    const antesDelCon = corte > 0 && /^(papas?|papitas?|ensalada|arroz|frejol)/.test(limpio.slice(corte + 5)) ? limpio.slice(0, corte) : '';
    for (const texto of [limpio, antesDelCon]) {
      const utiles = texto.split(' ').filter(w => w && !RELLENO.test(w)).map(raizPalabra);
      if (!utiles.length || utiles.join(' ') === palabras.join(' ')) continue;
      const frase = utiles.join(' ');
      const otra = [];
      for (const f of lista) {
        if (ALIMENTOS_RETIRADOS.has(f.key)) continue;
        const objetivo = normalizar(f.key + ' ' + f.name + ' ' + (f.group || ''));
        if (!utiles.every(w => objetivo.includes(w))) continue;
        const nombreNorm = normalizar(f.name);
        otra.push({ f, puntaje: nombreNorm.startsWith(frase) ? 0 : nombreNorm.includes(frase) ? 1 : 3 });
      }
      // Mismo puntaje: el orden de la lista (como la búsqueda de siempre).
      otra.sort((a, b) => a.puntaje - b.puntaje);
      if (otra.length) return otra.slice(0, limite).map(x => x.f);
    }
  }
  if (conPuntaje.length === 0 && palabras.length > 1) {
    // Nada coincidió con todo: buscar solo por la palabra más larga
    const clave = palabras.slice().sort((a, b) => b.length - a.length)[0];
    return lista
      .filter(f => normalizar(f.key + ' ' + f.name).includes(clave))
      .slice(0, limite);
  }
  return conPuntaje.slice(0, limite).map(x => x.f);
}

/* Al elegir un alimento, propone la medida más natural.
   Para una torta: "1 tajada", no "100 gramos".                */
// Alimentos donde conviene forzar gramos aunque exista una unidad
// casera registrada (ej. Quinua tiene "taza" como medida, pero en un
// plato peruano se pesa en gramos, no se sirve por tazas).
export const GRAMOS_DEFAULT_POR_NOMBRE = {
  // 1 taza ≈ 30 g (USDA FoodData Central: corn flakes, 1 taza = 28 g).
  // Antes 100 g (378 kcal, más de 3 tazas). 17 oct.
  'Cereal cornflakes sin gluten': 30,
  'Chicharrón de chancho': 180,
  // Cereales de plato (arroz, quinua, etc.) se pesan en gramos en la
  // práctica — nadie mide un plato de arroz peruano en tazas.
  'Quinua': 150,
};

/* Secos y crudos (revisión de cálculos, 17 oct): su porción por defecto
   era la del grupo (150 g de avena cruda = 584 kcal; 1 taza de lentejas
   crudas = 635 kcal), varias porciones de lo que se come. Ahora:
   - Avena en hojuelas: ½ taza (40 g, su medida en UNITS_BY_NAME; la
     porción de la etiqueta de Quaker y la de los menús de la app).
   - Cereales y menestras crudos: lo que rinde la porción cocida por
     defecto de la app (las mismas kcal: gramos cocidos × kcal cocido ÷
     kcal crudo, con la tabla de la app), redondeado a 5 g. Ej.: 150 g de
     arroz cocido (195 kcal) salen de ~55 g crudo (201 kcal).
   - Haba seca (no tiene versión cocida en la app): 60 g, como las demás
     menestras secas (estimado).
   - Fideos crudos: 95 g (rinden el plato de 220 g cocido).
   - Avena instantánea en polvo: 4 cucharadas (36 g; la porción de
     referencia de la FDA para cereal caliente seco es 40 g). */
export const PORCION_POR_DEFECTO_CLAVE = {
  'Arroz blanco (Crudo)': { unit: 'gramos', qty: 55 },
  'Quinua (Cruda)': { unit: 'gramos', qty: 35 },
  'Kiwicha (Cruda)': { unit: 'gramos', qty: 40 },
  'Cañihua (Cruda)': { unit: 'gramos', qty: 50 },
  'Lenteja (Cruda)': { unit: 'gramos', qty: 60 },
  'Frejol canario (Crudo)': { unit: 'gramos', qty: 65 },
  'Garbanzo (Crudo)': { unit: 'gramos', qty: 80 },
  'Pallar (Crudo)': { unit: 'gramos', qty: 60 },
  'Haba seca (Cruda)': { unit: 'gramos', qty: 60 },
  'Fideos / pasta (Crudos)': { unit: 'gramos', qty: 95 },
  'Avena instantánea en polvo (-)': { unit: 'cucharada', qty: 4 },
};

export function unidadPorDefecto(food, unitsFor) {
  if (!food) return { unit: 'gramos', qty: 100 };
  const fija = PORCION_POR_DEFECTO_CLAVE[food.key];
  if (fija && (fija.unit === 'gramos' || unitsFor(food).some(u => u[0] === fija.unit))) return { ...fija };
  if (GRAMOS_DEFAULT_POR_NOMBRE[food.name]) {
    return { unit: 'gramos', qty: GRAMOS_DEFAULT_POR_NOMBRE[food.name] };
  }
  const lista = unitsFor(food);

  // Si solo existe "gramos", se usa una cantidad razonable según el grupo
  if (lista.length <= 1) {
    const porGrupo = {
      'Grasas': 15, 'Otros': 30, 'Bebidas': 200, 'Postres': 120,
      'Platos preparados': 350, 'Verduras': 100, 'Frutas': 150,
      'Cereales': 150, 'Menestras': 180, 'Lácteos': 200,
      'Carnes y aves': 150, 'Pescados y mariscos': 150, 'Huevos': 100,
      'Tubérculos': 150,
    };
    return { unit: 'gramos', qty: porGrupo[food.group] || 100 };
  }

  /* Los alimentos que Jonah agrega desde el panel traen su propia medida
     (la primera, ej. "1 unidad" de 160 g para un triple): esa manda. Antes
     ganaba el "plato" de 400 g de su grupo y un sándwich sumaba 920 kcal
     (revisión de cálculos, 17 oct). */
  if (food.esExtra && lista[1] && lista[1][0] !== 'gramos' && lista[1][1] >= 10) {
    return { unit: lista[1][0], qty: 1 };
  }

  /* Se prefiere la medida de casa más común, en este orden */
  const preferidas = [
    '1/4 con papas', '1/4 de pollo', 'presa', 'plato', 'tajada', 'unidad',
    'porción', 'taza', 'vaso', 'rebanada', 'bola', 'scoop', 'puñado',
    'lata pequeña', 'cucharada', 'palito', 'mitad',
  ];
  // Bebidas: en Perú se toman en vaso, no en taza.
  for (const pref of food.group === 'Bebidas' ? ['vaso', ...preferidas] : preferidas) {
    const encontrada = lista.find(u => u[0] === pref);
    if (!encontrada) continue;
    // Descartar medidas demasiado pequeñas para ser una porción real
    // (ej. "1 almendra" = 1 g). Se pide al menos 10 g.
    if (encontrada[1] < 10) continue;
    return { unit: encontrada[0], qty: 1 };
  }

  // Si no hay ninguna conocida, se usa la primera que no sea gramos
  const otra = lista.find(u => u[0] !== 'gramos');
  return otra ? { unit: otra[0], qty: 1 } : { unit: 'gramos', qty: 100 };
}

/* Guisos que en Perú se comen con arroz y cuyas calorías NO lo incluyen:
   la app dice "🍚 Sin arroz: agrégalo aparte". Su versión con el arroz
   incluido se llama "… con arroz" (ej. "Lomo saltado con arroz"). */
export const PLATOS_SIN_ARROZ = new Set([
  'Ají de gallina', 'Ají de pollo', 'Pollo al sillao', 'Estofado de pollo',
  'Escabeche de pollo', 'Estofado de carne', 'Seco de res con frejoles', 'Lomo saltado',
  'Adobo de cerdo', 'Carapulcra', 'Olluquito con charqui', 'Cau cau', 'Chanfainita',
  'Sudado de pescado', 'Saltado de pollo',
]);
/* Sus versiones "con arroz" (16 oct 2026): 1 plato = 300 g del guiso +
   180 g de arroz blanco cocido. [con arroz, guiso]. */
export const GUISOS_CON_ARROZ = [
  ['Lomo saltado con arroz', 'Lomo saltado'], ['Ají de gallina con arroz', 'Ají de gallina'],
  ['Ají de pollo con arroz', 'Ají de pollo'], ['Seco de res con frejoles y arroz', 'Seco de res con frejoles'],
  ['Estofado de pollo con arroz', 'Estofado de pollo'], ['Estofado de carne con arroz', 'Estofado de carne'],
  ['Cau cau con arroz', 'Cau cau'], ['Olluquito con charqui y arroz', 'Olluquito con charqui'],
  ['Pollo al sillao con arroz', 'Pollo al sillao'], ['Sudado de pescado con arroz', 'Sudado de pescado'],
];
/* La foto NO usa los "con arroz": ve el guiso y el arroz por separado, cada
   uno con sus gramos (mismo número, y así no se cuenta el arroz dos veces).
   Por nombre: vale también para sus versiones con o sin papas fritas. */
const NOMBRES_CON_ARROZ = new Set(GUISOS_CON_ARROZ.map(([n]) => n));
export function vaEnLaFoto(food) {
  return !!food && !ALIMENTOS_RETIRADOS.has(food.key) && !(!food.esExtra && NOMBRES_CON_ARROZ.has(food.name));
}
export const esPlatoSinArroz =food => !!food && (!!food.sinArroz || (!food.esExtra && PLATOS_SIN_ARROZ.has(food.name)));

/* Platos que en Perú se sirven con papa sancochada y cuyas calorías NO la
   incluyen (pedido por Jonah, 17 oct: "el ají de gallina muchas veces viene
   con la papa sancochada, pero eso sería mejor aparte"): la app dice
   "🥔 Sin papa: agrégala aparte", como con el arroz. No van los que ya la
   traen en sus calorías: papa a la huancaína, ocopa, causa, carapulcra (papa
   seca), cau cau y estofados (papa en trozos), pollo a la olla ("con papa"). */
export const PLATOS_SIN_PAPA = new Set([
  'Ají de gallina', 'Ají de pollo', 'Ají de gallina con arroz', 'Ají de pollo con arroz',
]);
export const esPlatoSinPapa = food => !!food && !food.esExtra && PLATOS_SIN_PAPA.has(food.name);

// Nombre para mostrar: "Huevo de gallina · cocido" en vez de "Huevo de gallina (Cocido)".
export function nombreAlimento(food) {
  if (!food) return '';
  return food.state && food.state !== '-' ? `${food.name} · ${food.state.toLowerCase()}` : food.name;
}

/* ---------- Portada y "Compartir este plato" (16 oct 2026) ---------- */

/* Clave del alimento en forma de link: "Pollo al horno pierna (Con piel)" →
   "pollo-al-horno-pierna-con-piel"; "Lomo saltado (-)" → "lomo-saltado". */
export function slugAlimento(food) {
  if (!food) return '';
  const texto = food.state && food.state !== '-' ? `${food.name} ${food.state}` : food.name;
  return normalizar(texto).replace(/[^a-z0-9ñ]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);
}

/* Link para compartir un plato: la portada con el buscador abierto en ese
   plato (?q=) y la fuente "compartir", para medir cuántos llegan así. */
export function linkPlato(food) {
  return `https://jonahbeast.com/?q=${encodeURIComponent(slugAlimento(food))}&fuente=compartir`;
}

/* ¿El plato trae arroz? 'sin' = guiso que se come con arroz y no lo incluye
   ("🍚 Sin arroz: agrégalo aparte"); 'con' = plato preparado que ya trae su
   arroz (arroz con pollo, chaufa, "… con arroz"); null = no aplica (una
   fruta, un pan, el arroz solo). */
export function arrozDelPlato(food) {
  if (!food) return null;
  if (esPlatoSinArroz(food)) return 'sin';
  if (food.group === 'Platos preparados' && /\barroz\b|chaufa/.test(normalizar(food.name))) return 'con';
  return null;
}

/* Fuente en pocas palabras, a partir de docs/alimentos-verificados.json. */
export function fuenteCorta(texto) {
  const t = String(texto || '');
  if (!t) return null;
  if (/pecafit/i.test(t)) return 'receta validada del restaurante';
  if (/^cálculo: guiso \+ arroz/i.test(t)) return 'cálculo: guiso + arroz (Tabla Peruana del CENAN y USDA)';
  // "USDA… La tabla peruana de 2017 (…) calcula más bajo": es USDA.
  const cenan = /CENAN|TPCA|tabla peruana/i.test(t) && !/^USDA FoodData Central\. La tabla peruana/i.test(t);
  const usda = /USDA/i.test(t);
  const base = cenan && usda ? 'Tabla Peruana del CENAN y USDA'
    : cenan ? 'Tabla Peruana del CENAN'
      : usda ? 'USDA'
        : /etiqueta|información nutricional/i.test(t) ? 'etiqueta del producto'
          : /receta/i.test(t) ? 'receta promedio' : null;
  if (!base) return null;
  return /^(calculado|cálculo)/i.test(t) ? `cálculo con ${base}` : base;
}
