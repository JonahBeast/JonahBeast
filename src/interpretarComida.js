/* Interpreta lo que el alumno dice o escribe con varios alimentos ("1 pan
   y 2 huevos") y lo busca en la lista de la app. Lo usan el registro por
   voz y las tarjetas de Beast (src/alumno.jsx). Se movió tal cual desde
   src/alumno.jsx (17 oct 2026) para poder probarlo con
   scripts/probar-frases.mjs. No importa nada de App.jsx. */
import { ALIMENTOS_RETIRADOS, medidaParaPan } from './buscador.js';

/* Interpreta una frase con varios alimentos separados por "+", "y" o
   comas — ej. "1 pan + 2 huevos + 1 taza de café" — y devuelve un
   alimento con cantidad estimada por cada parte reconocida. No es IA:
   es una búsqueda por coincidencia de texto contra tu propia base de
   230 alimentos, priorizando la coincidencia más larga y específica. */
// ¿"aguja" contiene "frase" como palabras enteras? ("pan francés" sí tiene
// "pan"; "arroz con ají panca" no.)
export function contienePalabras(aguja, frase) {
  const esc = frase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-záéíóúñü])${esc}($|[^a-záéíóúñü])`, 'i').test(aguja);
}

// "ciento cincuenta" → 150, "noventa y dos" → 92, "veintidós" → 22.
// Solo números de 11 en adelante: "un", "dos"… (cantidades) se leen aparte.
const UNIDADES_LETRAS = { uno: 1, un: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9 };
const NUMEROS_LETRAS = {
  once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veinte: 20, veintiuno: 21, veintiun: 21, veintiuna: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25,
  veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
};
const CENTENAS_LETRAS = { cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300, cuatrocientos: 400, cuatrocientas: 400, quinientos: 500, quinientas: 500 };
export function numerosEnCifras(texto) {
  const sinTilde = w => w.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const palabras = String(texto || '').split(/(\s+)/);
  const salida = [];
  for (let i = 0; i < palabras.length; i++) {
    const w = sinTilde(palabras[i]);
    let valor = null, j = i;
    if (CENTENAS_LETRAS[w]) {
      valor = CENTENAS_LETRAS[w];
      // "ciento cincuenta", "doscientos veinte"
      const sig = sinTilde(palabras[i + 2] || '');
      if (NUMEROS_LETRAS[sig]) { valor += NUMEROS_LETRAS[sig]; j = i + 2; }
      else if (UNIDADES_LETRAS[sig] && sig !== 'un' && sig !== 'una') { valor += UNIDADES_LETRAS[sig]; j = i + 2; }
    } else if (NUMEROS_LETRAS[w]) {
      valor = NUMEROS_LETRAS[w];
    }
    if (valor === null) { salida.push(palabras[i]); continue; }
    // "noventa y dos": decena + "y" + unidad
    const base = NUMEROS_LETRAS[sinTilde(palabras[j] || '')] || 0;
    if (base >= 30 && base % 10 === 0 && sinTilde(palabras[j + 2] || '') === 'y' && UNIDADES_LETRAS[sinTilde(palabras[j + 4] || '')]) {
      valor += UNIDADES_LETRAS[sinTilde(palabras[j + 4])];
      j += 4;
    }
    salida.push(String(valor));
    i = j;
  }
  return salida.join('');
}

export function interpretarVarios(textoCompleto, FOODS) {
  const NUM_PALABRAS = {
    un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
    seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  };
  // Se separa por conectores explícitos ("+", "y", "más", comas) Y
  // además, cada vez que aparece una nueva cantidad (un número o "dos",
  // "tres"...) se asume que empieza un alimento distinto — así no hace
  // falta decir "más" entre cada uno para que se registren todos.
  // Primero los números dichos en letras pasan a cifras ("noventa y dos
  // gramos" → "92 gramos"): antes la "y" del número partía la frase y
  // "noventa" quedaba como si fuera un alimento.
  // "1/4 de pollo", "medio pollo", "un cuarto de pollo": cómo se pide el
  // pollo en Perú (ver prepararPorciones).
  let marcado = prepararPorciones(numerosEnCifras(textoCompleto)).replace(/\+|,|\by\b|\bm[aá]s\b/gi, ' ||| ');
  // Un número que es parte del nombre ("torta tres leches") no es una
  // cantidad: antes partía la frase en "torta" + "3 leches" (17 oct).
  for (const [num, sig] of numerosEnNombres(FOODS)) {
    marcado = marcado.replace(new RegExp(`\\b${num}(\\s+${sig})`, 'gi'), `xxnum${num}xx$1`);
  }
  marcado = marcado.replace(/\b(\d+|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\b/gi, '|||$1')
    .replace(/xxnum(\w+?)xx/g, '$1');
  // Sin puntos ni signos: el dictado termina frases con "." y eso no dejaba
  // reconocer la última palabra ("redondas.").
  const partes = medidaDespues(marcado.split('|||').map(s => s.replace(/[.,;:¡!¿?"]+/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean));

  // Genera variantes en singular de una palabra en español, para que
  // "panes" también encuentre "Pan francés" y "huevos" encuentre
  // "Huevo de gallina" — la base de datos guarda todo en singular.
  function variantesSingular(palabra) {
    const set = new Set([palabra]);
    if (palabra.length > 4 && /[^aeiouáéíóú]es$/.test(palabra)) set.add(palabra.slice(0, -2)); // panes -> pan
    if (palabra.length > 3 && palabra.endsWith('s')) set.add(palabra.slice(0, -1)); // huevos -> huevo
    return [...set];
  }

  function interpretarParte(parte) {
    let cantidad = 1;
    let resto = parte;
    const mDigito = parte.match(/^(\d+)\s+(.*)$/);
    if (mDigito) {
      cantidad = parseInt(mDigito[1], 10);
      resto = mDigito[2];
    } else {
      const palabras = parte.split(/\s+/);
      if (NUM_PALABRAS[palabras[0]?.toLowerCase()]) {
        cantidad = NUM_PALABRAS[palabras[0].toLowerCase()];
        resto = palabras.slice(1).join(' ');
      }
    }
    // "café con 2 cucharaditas de azúcar" se parte en "café con" + …: el
    // "con" suelto del final no es parte del alimento (era "Café con leche").
    resto = resto.replace(/\s+(con|y|de|del|el|la|en)$/i, '');
    resto = resto.replace(/^(tazas?|platos?|porci[oó]n(es)?|vasos?|rebanadas?|tajadas?|cucharadas?|cucharaditas?|unidad(es)?)\s+de\s+/i, '').trim();
    // "cuarto de pollo a la brasa", "octavo de pollada": la porción se
    // anota en esa medida (1/4 o 1/8) y no cuenta para buscar el plato.
    let porcion = null;
    const mPorcion = resto.match(/^(cuartos?|octavos?)\s+(?:de\s+)?(.*)$/i);
    if (mPorcion) {
      porcion = /^c/i.test(mPorcion[1]) ? 'cuarto' : 'octavo';
      resto = mPorcion[2];
    }

    // Si la persona dijo la unidad de peso explícitamente ("150 g de
    // yogurt", "200 ml de leche"), se respeta ese gramaje tal cual —
    // no se multiplica por la unidad natural del alimento.
    let gramosExplicitos = null;
    const mPeso = resto.match(/^(kg|kilogramos?|kilos?|gramos?|grs?|g|ml|mililitros?)\b\.?\s*(?:de\s+)?(.*)$/i);
    if (mPeso) {
      const esKilo = /^k/i.test(mPeso[1]);
      gramosExplicitos = cantidad * (esKilo ? 1000 : 1);
      resto = mPeso[2];
    }

    // Cómo se dice en casa → cómo está en la app.
    // Sin tildes (17 oct): "gaseosa dietetica" escrita o dictada sin tilde
    // salía "Gaseosa regular" (84 kcal) porque solo coincidía "gaseosa". Se
    // compara lo dicho y el nombre de la app los dos sin tildes.
    let restoLower = sinTildes(resto)
      .replace(/\b(sancochad|hervid)(o|a)s?\b/g, 'cocid')
      .replace(/\byogurt\b/g, 'yogur')
      .replace(/\bqueques?\b/g, 'keke')
      // "papas fritas aparte": "aparte" no es parte del nombre (con los
      // alimentos del panel salía "Papa dorada (Frita)", 17 oct).
      .replace(/\s+(aparte|extra|adicional)\b/g, '')
      // "té" (2 letras) no se buscaba: "té sin azúcar" no encontraba nada.
      .replace(/\bte\b(?!\s*\/?\s*infusion)/g, 'te infusion');
    const marca = gaseosaDeMarca(restoLower);
    if (marca) restoLower = marca;
    const restoVariantes = variantesSingular(restoLower);
    // "Sin azúcar" (o "natural"): manda el que no lleva azúcar, nunca el
    // "Con azúcar" (antes "jugo de papaya sin azúcar" elegía el con azúcar
    // porque contaba la palabra "azúcar").
    const pideSinAzucar = /\bsin\s+az[uú]car\b|\bnatural\b/i.test(resto);
    // Palabras que vienen después de "sin" no cuentan para el estado.
    const tokensResto = restoLower.split(/\s+/);
    const palabrasEstado = tokensResto.filter((w, k) => w.length > 3 && tokensResto[k - 1] !== 'sin');

    // Se calculan TODAS las coincidencias razonables (no solo la
    // mejor), para poder detectar cuando hay varias parecidas y no
    // está claro cuál es — en vez de adivinar en silencio.
    const candidatas = [];
    for (const f of FOODS) {
      if (ALIMENTOS_RETIRADOS.has(f.key)) continue;
      let nombreLower = sinTildesDe(f, 'name');
      if (contienePalabras(nombreLower, 'keke')) nombreLower += ' queque';
      else if (contienePalabras(nombreLower, 'queque')) nombreLower += ' keke';
      const estadoLower = (f.state && f.state !== '-') ? sinTildesDe(f, 'state') : '';
      let score = 0;
      // Se compara por palabras enteras: "pan" no es "ají panca" ni "papa"
      // es "papaya".
      for (const rv of restoVariantes) {
        if (nombreLower === rv) score = Math.max(score, 100);
        // Si el nombre empieza con lo dicho, gana por poco al que solo lo
        // lleva dentro: "azúcar" es "Azúcar blanca" antes que "Limonada con
        // azúcar" (17 oct; igual sigue preguntando cuál).
        else if (rv.length > 2 && contienePalabras(nombreLower, rv)) score = Math.max(score, 50 + rv.length + (nombreLower.startsWith(`${rv} `) ? 1 : 0));
        else if (nombreLower.length > 2 && contienePalabras(rv, nombreLower)) score = Math.max(score, 30 + nombreLower.length);
      }
      if (score === 0) {
        // Lo que va después de "sin" no cuenta como coincidencia: con "café con
        // leche sin azúcar" ganaba "Café negro sin azúcar" por la palabra
        // "azúcar" (17 oct).
        const palabrasResto = tokensResto.filter((w, k) => w.length > 3 && tokensResto[k - 1] !== 'sin');
        const palabrasNombre = new Set(nombreLower.split(/[^a-záéíóúñü]+/).filter(Boolean).flatMap(variantesSingular));
        let coincidencias = 0;
        for (const w of palabrasResto) {
          if (variantesSingular(w).some(v => palabrasNombre.has(v))) coincidencias++;
        }
        if (coincidencias > 0) score = coincidencias * 5;
      }
      // El estado (frito, cocido, crudo...) también cuenta — así "huevo
      // frito" distingue de "huevo cocido", no los deja empatados.
      // El estado no rescata un nombre que no se dijo: con "un cuarto de pollo
      // a la brasa con papas fritas y ensalada" ganaba "Saltado de pollo (Con
      // papas fritas)" (813 kcal) solo por "pollo" + el estado "con papas
      // fritas". Si el estado es un acompañamiento (con o sin papas o arroz),
      // la coincidencia es por palabras sueltas y la primera palabra del
      // nombre no se dijo ("saltado"), el estado no suma.
      const primeraDelNombre = nombreLower.split(/[^a-zñü]+/).find(w => w.length > 3);
      const nombreNoDicho = score < 30 && primeraDelNombre && /\b(papas?|arroz)\b/.test(estadoLower) && !tokensResto.some(w => variantesSingular(w).includes(primeraDelNombre) || variantesSingular(primeraDelNombre).includes(w));
      if (estadoLower && score > 0 && !nombreNoDicho) {
        // Palabras cortas ("con", "sin", "de") no cuentan: "jugo de papaya
        // con un plátano" no es el jugo "Con azúcar".
        for (const w of palabrasEstado) {
          // La palabra que ya está en el nombre no suma otra vez por el estado:
          // "2 panes" salía "Pan con jamonada (Pan blanco)" (400 kcal) porque
          // "pan" estaba en su estado (17 oct).
          if (variantesSingular(w).some(v => contienePalabras(nombreLower, v))) continue;
          if (variantesSingular(w).some(v => estadoLower === v || estadoLower.includes(v))) {
            score += 40;
            break;
          }
        }
      }
      // Lo crudo no gana en silencio: "arroz blanco", "quinua" o "papa" por
      // voz o con Beast son lo cocido (antes salía "Arroz blanco (Crudo)",
      // 365 kcal por 100 g en vez de 130, porque en la lista va primero).
      // Igual que en la foto y en "Escribir". Si dice "crudo", manda lo
      // crudo. Las verduras quedan como estaban (en ensalada van crudas).
      if (score > 0 && /crud/.test(estadoLower) && !/crud/.test(restoLower) && f.group !== 'Verduras'
        && FOODS.some(o => o.name === f.name && o.key !== f.key && !/crud/i.test(o.state || ''))) score -= 5;
      if (score > 0 && pideSinAzucar) {
        const textoFood = `${nombreLower} ${estadoLower}`;
        if (/con az[uú]car/.test(textoFood)) score = 1;
        else if (score >= 10 && /sin az[uú]car|natural/.test(textoFood)) score += 45;
      }
      if (score > 0) candidatas.push({ food: f, score });
    }
    candidatas.sort((a, b) => b.score - a.score);
    // Lo que es solo un ingrediente del mejor no compite con él: con "jugo
    // de papaya" no se pregunta por "Papaya (cruda)".
    if (candidatas.length > 1) {
      const nombreMejor = candidatas[0].food.name.toLowerCase();
      for (let k = candidatas.length - 1; k > 0; k--) {
        const n = candidatas[k].food.name.toLowerCase();
        if (n !== nombreMejor && n.length < nombreMejor.length && contienePalabras(nombreMejor, n)) candidatas.splice(k, 1);
      }
    }

    // Nada parecido en la app: no se pierde en silencio, queda para
    // buscarlo (o pedírselo a Jonah) después.
    if (candidatas.length === 0) {
      return resto.trim().length > 1 ? { textoOriginal: parte.trim(), textoBuscar: resto.trim(), cantidad, porcion, sinCoincidencia: true } : null;
    }

    const mejor = candidatas[0].food;
    const mejorScore = candidatas[0].score;

    // Si hay 2+ opciones distintas con un puntaje parecido al mejor
    // (dentro del 70%), no se adivina — se le pregunta al alumno cuál
    // de todas es. Se compara por "key" (nombre + estado), no solo el
    // nombre — así "Huevo de gallina (Frito)" y "(Cocido)" no se tapan
    // entre sí por compartir el mismo nombre base.
    let empatadas = candidatas.filter(c => c.score >= mejorScore * 0.7 && c.food.key !== mejor.key);
    // "Jugo de papaya" a secas: se pregunta si fue con o sin azúcar cuando
    // la app tiene las dos versiones (la natural o "Sin azúcar").
    let preguntarAzucar = false;
    if (!pideSinAzucar && !/\bcon\s+az[uú]car\b/i.test(resto) && /con az[uú]car/i.test(`${mejor.name} ${mejor.state}`)) {
      const sinAz = versionSinAzucar(mejor, FOODS);
      if (sinAz) { empatadas = [{ food: sinAz }, ...empatadas.filter(c => c.food.key !== sinAz.key)]; preguntarAzucar = true; }
    }
    // ¿Lo que encontró cubre todo lo que dijo? "pan de avena" no es
    // "Avena (cocida)": sobra "pan". Si sobra una palabra, se pregunta (con
    // "No es ninguna") en vez de anotar otra cosa en silencio.
    // "aparte", "extra", "adicional" (17 oct): dicen que es otra porción, no
    // otro alimento ("papas fritas aparte" no debe preguntar "¿cuál es?").
    const RELLENO_VOZ = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'con', 'y', 'a', 'al', 'en', 'un', 'una', 'mi', 'sin', 'para', 'tipo', 'medio', 'media', 'poco', 'taza', 'plato', 'vaso', 'aparte', 'extra', 'adicional']);
    const palabrasFood = new Set(sinTildes(`${mejor.name} ${mejor.state || ''}`).split(/[^a-záéíóúñü]+/).filter(Boolean).flatMap(variantesSingular));
    const parcial = mejorScore < 100 && restoLower.split(/\s+/)
      .filter(w => w.length > 2 && !RELLENO_VOZ.has(w) && !(pideSinAzucar && /^(az[uú]car|natural)$/.test(w)))
      .some(w => !variantesSingular(w).some(v => palabrasFood.has(v) || [...palabrasFood].some(pf => pf.startsWith(v) || v.startsWith(pf) && pf.length > 3)));
    const necesitaAclarar = (empatadas.length > 0 && (mejorScore < 90 || preguntarAzucar)) || parcial; // coincidencia exacta no se cuestiona (salvo con o sin azúcar)
    const opciones = necesitaAclarar
      ? [mejor, ...empatadas.map(c => c.food)].slice(0, 4)
      : null;

    return {
      textoOriginal: parte.trim(), textoBuscar: resto.trim(), cantidad, gramosExplicitos, porcion,
      food: mejor, necesitaAclarar, opciones, parcial,
    };
  }

  // Platos que ya traen sus acompañamientos (revisión de cálculos, 17 oct):
  // "1 cuarto de pollo a la brasa, papas fritas, ensalada de lechuga" sumaba
  // el plato completo MÁS papas y lechuga (1573 kcal en vez de 1090; desde
  // el 17 oct el plato va por su receta: 1017).
  const items = [];
  for (const parte of unirPlatosConY(partes, FOODS, variantesSingular)) {
    // "Pan con palta", "2 panes con huevo": no son platos, son el pan y lo
    // que va dentro (pedido por Jonah, 17 oct).
    const enPartes = panConRelleno(parte, FOODS, interpretarParte, NUM_PALABRAS);
    if (enPartes) { items.push(...enPartes); continue; }
    const it = interpretarParte(parte);
    // "pollada con papas", "pescado frito con arroz": lo que va después del
    // "con" se perdía si el plato no lo nombra. Si es un acompañamiento
    // (papas, ensalada, arroz, frejoles), se anota aparte; si el plato ya lo
    // trae, se quita más abajo.
    const corte = parte.toLowerCase().lastIndexOf(' con ');
    const cola = corte > 0 ? parte.slice(corte + 5).trim() : '';
    if (it && (it.parcial || it.sinCoincidencia) && cola && categoriaAcompanamiento(cola)) {
      const cabeza = interpretarParte(parte.slice(0, corte).trim());
      // "papas fritas y ensalada": se busca solo "papas fritas" (con todo salía
      // el plato de la brasa otra vez); la ensalada del plato no se suma.
      const acomp = interpretarParte(cola.replace(/\s+(y|con)\s+(su |la )?(ensalada|ensaladita)\b.*$/i, ''));
      if (cabeza && !cabeza.sinCoincidencia && acomp && !acomp.sinCoincidencia) {
        items.push(cabeza, { ...acomp, cantidad: 1, porcion: null });
        continue;
      }
    }
    if (it) items.push(it);
  }
  return ajustarAcompanamientos(items, FOODS);
}

const sinTildes = t => String(t || '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
// Los números que van dentro de un nombre de la app, con la palabra que les
// sigue: [["tres", "leches"]].
const CACHE_NUMEROS = new WeakMap();
function numerosEnNombres(FOODS) {
  let pares = CACHE_NUMEROS.get(FOODS);
  if (!pares) {
    const vistos = new Set();
    for (const f of FOODS) {
      for (const m of sinTildes(f.name).matchAll(/\b(un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+([a-z]+)/g)) vistos.add(`${m[1]} ${m[2]}`);
    }
    pares = [...vistos].map(v => v.split(' '));
    CACHE_NUMEROS.set(FOODS, pares);
  }
  return pares;
}

/* Gaseosas por su marca (17 oct): "un vaso de Inca Kola" no se encontraba.
   Las etiquetas peruanas dan casi lo mismo que la "Gaseosa regular" de la app
   (42 kcal y 10,6 g de azúcar en 100 ml): Inca Kola 84 kcal en 200 ml (42 en
   100 ml; Coca-Cola Perú, coca-cola.com/pe), Coca-Cola 42, Pepsi 44 y Sprite
   40 en 100 ml (etiquetas de botellas de 500 ml revisadas en Lima y Chimbote,
   Rev Peru Med Exp Salud Publica 2018;35(1)). Sus versiones "zero", "sin
   azúcar", "light" o "diet" son 0 kcal: la "Gaseosa dietética". Fanta (52 kcal
   en 100 ml en ese estudio, y menos en otras versiones), Guaraná y Kola Real
   no se cambian: su etiqueta es distinta o no hay una fuente segura. La
   "Fanta zero" sí (0 kcal). "Mate de coca" no es Coca-Cola. */
export function gaseosaDeMarca(texto) {
  const t = sinTildes(texto);
  const cero = /\b(zero|cero|sin azucar|light|diet|dietetica)\b/.test(t);
  if (/\b(inca ?kola|inka ?kola|incakola|coca ?-?cola|cocacola|pepsi|sprite)\b/.test(t) || /^cocas?\b/.test(t)) return cero ? 'gaseosa dietetica' : 'gaseosa regular';
  if (cero && /\bfanta\b/.test(t)) return 'gaseosa dietetica';
  return null;
}

// El nombre y el estado de cada alimento sin tildes, calculados una vez.
const CACHE_SIN_TILDES = new WeakMap();
function sinTildesDe(food, campo) {
  let c = CACHE_SIN_TILDES.get(food);
  if (!c) { c = { name: sinTildes(food.name), state: sinTildes(food.state) }; CACHE_SIN_TILDES.set(food, c); }
  return c[campo];
}

/* La medida dicha DESPUÉS del alimento (17 oct): "gaseosa un vaso", "arroz
   dos platos", "pollo un cuarto". La frase se parte en cada cantidad y "un
   vaso" quedaba como un alimento que no se encontraba (y "dos platos" daba
   "Tallarín saltado (plato)"). Si una parte es solo cantidad + medida, va
   con el alimento de antes, como si se hubiera dicho primero: "un vaso de
   gaseosa". */
const SOLO_MEDIDA = /^(\d+|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+(vasos?|tazas?|tacitas?|platos?|platitos?|porci[oó]n(?:es)?|unidad(?:es)?|cuartos?|octavos?|latas?|botellas?|rebanadas?|tajadas?|presas?|cucharadas?|cucharaditas?|cucharones?|jarras?|filetes?|kg|kilos?|kilogramos?|gramos?|grs?|g|ml|mililitros?)$/i;
export function medidaDespues(partes) {
  const salida = [];
  for (const parte of partes) {
    const m = parte.match(SOLO_MEDIDA);
    const antes = salida[salida.length - 1];
    if (m && antes && !SOLO_MEDIDA.test(antes)) {
      // "1 gaseosa" + "un vaso": la cantidad es la de la medida.
      const alimento = antes.replace(/^(1|un|una|uno)\s+/i, '');
      if (alimento !== antes || !/^(\d+|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s/i.test(antes)) {
        salida[salida.length - 1] = prepararPorciones(`${m[1]} ${m[2]} de ${alimento}`);
        continue;
      }
    }
    salida.push(parte);
  }
  return salida;
}

/* "1/4 de pollo" → "un cuarto de pollo a la brasa"; "medio pollo" → "2
   cuartos de pollo a la brasa". En Perú "un cuarto de pollo" a secas es
   el de la pollería (a la brasa); si dice pollada, broaster, al horno, a
   la olla… se respeta. */
export function prepararPorciones(texto) {
  return String(texto || '')
    .replace(/\b1\s*\/\s*4\b/g, 'un cuarto')
    .replace(/\b1\s*\/\s*8\b/g, 'un octavo')
    .replace(/\bmedio\s+pollo\b/gi, '2 cuartos de pollo')
    // La entrepierna de la brasa o la pollada es su octavo pierna (el muslo).
    .replace(/\b(pollada|pollo a la brasa)\s+entrepierna\b/gi, '$1 pierna entrepierna')
    .replace(/\b(cuartos?|octavos?)\s+de\s+pollo\b(?!\s+(a\s+la\s+brasa|al\s+horno|a\s+la\s+olla|al\s+sillao|broaster|frito|apanado|a\s+la\s+plancha|sancochado|guisado))/gi, '$1 de pollo a la brasa');
}

/* "Pan con palta", "2 panes con huevo", "pan con mantequilla": no son platos
   (Jonah, 17 oct: "no los diría como platos porque no son platos"). Antes
   "pan con palta" anotaba solo una palta entera (320 kcal) y "2 panes con
   huevo" anotaba 2 panes con jamonada. Se anotan el pan (francés si no dice
   otro; 1 por pan) y lo que va dentro, en lo que lleva 1 pan:
     palta: 1 "porción para pan" (50 g, ≈ ¼ de palta; estimado);
     huevo: 1 huevo (frito si no dice cómo);
     mantequilla: 1 cucharadita (5 g; estimado);
     aceituna: 3 aceitunas (estimado);
     camote: 60 g (lo que lleva el pan con chicharrón de la app);
     lo demás (queso, mermelada…): su medida casera de siempre.
   Los sándwiches que sí son platos de la lista (pan con pollo, con jamonada,
   con chicharrón…) no se tocan. */
const PAN_CON = /^(?:(\d+|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+)?(?:pan|panes|pancito|pancitos)(\s+(?:franc[eé]s|integral(?:es)?|de molde|blanco|blancos))?\s+con\s+(.+)$/i;
function panConRelleno(parte, FOODS, interpretarParte, NUM_PALABRAS) {
  const m = String(parte).trim().match(PAN_CON);
  if (!m) return null;
  const relleno = m[3].trim();
  const primera = sinTildes(relleno).replace(/^(un|una|unos|unas|su|sus)\s+/, '').split(/\s+/)[0].replace(/[^a-z0-9]/g, '');
  // Palabra entera: "pan con jamón" no es "Pan con jamonada" (17 oct).
  if (!primera || FOODS.some(f => f.group === 'Platos preparados' && new RegExp(`^pan con ${primera}([^a-z]|$)`).test(sinTildes(f.name)))) return null;
  const n = m[1] ? (NUM_PALABRAS[m[1].toLowerCase()] || parseInt(m[1], 10) || 1) : 1;
  const tipo = sinTildes(m[2] || '');
  const clavePan = /integral/.test(tipo) ? 'Pan integral (-)' : /molde/.test(tipo) ? 'Pan de molde blanco (-)' : 'Pan francés (-)';
  const pan = FOODS.find(f => f.key === clavePan);
  if (!pan) return null;
  const itemPan = {
    textoOriginal: parte.trim(), textoBuscar: m[2] ? `pan${m[2]}` : 'pan', cantidad: n, gramosExplicitos: null, porcion: null,
    food: pan, necesitaAclarar: false, opciones: null, parcial: false,
  };
  let dentro = interpretarParte(relleno);
  if (!dentro) return [itemPan];
  dentro = { ...dentro, textoOriginal: relleno, cantidad: n };
  if (dentro.sinCoincidencia) return [itemPan, dentro];
  const t = sinTildes(relleno);
  // "Pan con huevo": frito si no dice cómo (sancochado, revuelto…).
  if (dentro.food.name === 'Huevo de gallina' && !/\b(sancoch|cocid|herv|crud|frit|duro|pasado)/.test(t)) {
    const frito = FOODS.find(f => f.key === 'Huevo de gallina (Frito)');
    if (frito) dentro = { ...dentro, food: frito, necesitaAclarar: false, opciones: null };
  }
  const porPan = medidaParaPan(dentro.food);
  return [itemPan, porPan ? { ...dentro, medida: { unit: porPan.unit, qty: porPan.qty * n } } : dentro];
}

/* Lo que se dice como acompañamiento de un plato. Devuelve 'papas',
   'ensalada', 'arroz', 'frejoles' o 'salchicha', o null. Si dice "extra",
   "aparte" u "otra", es una porción más y no se toma como la del plato. */
export function categoriaAcompanamiento(texto) {
  let t = sinTildes(texto).replace(/[.,;:¡!¿?"]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (/\b(extra|adicional|aparte|otra|otro|doble)\b/.test(t)) return null;
  t = t.replace(/^((con|de|su|sus|unas?|unos|las?|los|el|\d+)\s+)+/, '');
  if (/^(papas?|papitas?)( (fritas?|sancochadas?|cocidas?|hervidas?|doradas?|al hilo|amarillas?|blancas?|nativas?|a la francesa|de la casa|y|con|su|sus|ensalada|ensaladita))*$/.test(t)) return 'papas'; // "papas fritas y ensalada" (17 oct)
  if (/^(ensalada|ensaladita)( (de|con|y|la|casa|fresca|criolla|mixta|verde|cocida|lechuga|tomate|pepino|verduras|col|repollo|zanahoria|cebolla))*$/.test(t)) return 'ensalada';
  if (/^(lechuga|tomate|pepino)( (y|con|de) (lechuga|tomate|pepino))*$/.test(t)) return 'ensalada';
  if (/^(arroz|arrocito)( (blanco|blanquito|graneado|cocido))?$/.test(t)) return 'arroz';
  if (/^(frejol(es)?|frijol(es)?|frejolitos?)( canario)?$/.test(t)) return 'frejoles';
  if (/^(salchichas?|hot ?dogs?)$/.test(t)) return 'salchicha';
  return null;
}

/* Los acompañamientos que un plato de la app ya trae en sus calorías. Se
   lee del nombre ("… con arroz", "… y arroz", "(presa con papa…)") para
   que valga también con los platos que Jonah agrega desde el panel, más los
   que lo traen sin decirlo: la salchipapa (papas y salchicha), el
   salchipollo (papas, src/recetasPlatos.js), el lomo
   saltado y el saltado de pollo (papas fritas salteadas: por eso tienen
   11 a 14 g de carbohidratos en 100 g), el chaufa y los arroces, el tacu
   tacu (arroz y frejoles) y la frejolada. */
export function acompanamientosDelPlato(food) {
  if (food?.group !== 'Platos preparados') return new Set();
  const n = sinTildes(`${food?.name || ''}`);
  const tras = n.split(/\bcon\b|\(/).slice(1).join(' ');
  const trae = new Set();
  if (/\barroz\b/.test(tras) || /^arroz\b/.test(n) || /^tacu tacu\b/.test(n)) trae.add('arroz');
  // El lomo y el saltado de pollo "Sin papas fritas" (17 oct) no las traen.
  const sinPapas = /\bsin papas\b/.test(sinTildes(food?.state));
  if (/\bpapas?\b/.test(tras) || (!sinPapas && /^(salchipapa|salchipollo|lomo saltado|saltado de pollo)\b/.test(n))) trae.add('papas');
  if (/\b(frejol|frejoles)\b/.test(tras) || /^(frejolada|tacu tacu)\b/.test(n)) trae.add('frejoles');
  if (/\bensalada\b/.test(tras)) trae.add('ensalada');
  if (/^salchipapa\b/.test(n)) trae.add('salchicha');
  return trae;
}

/* "Seco de res con frejoles y arroz", "Pollo a la brasa con papas y
   ensalada", "triple de pollo, jamón y queso", "empanada mixta de carne y
   pollo": la "y" y la coma partían el plato en pedazos ("seco de res con
   frejoles" + "arroz", que se sumaba aparte). Si lo que sigue (sin cantidad
   propia) es justo lo que el nombre de un plato de la app lleva después de
   su "y", su coma o su paréntesis, y la frase junta nombra todo el plato,
   se vuelven a juntar. "Lomo saltado y arroz" no se junta: "Lomo saltado
   con arroz" no lleva "y". */
function unirPlatosConY(partes, FOODS, variantesSingular) {
  const palabras = t => sinTildes(t).split(/[^a-zñü]+/).filter(w => w.length > 2 && !['con', 'del', 'las', 'los', 'solo'].includes(w));
  const mismas = (a, b) => variantesSingular(a).includes(b) || variantesSingular(b).includes(a);
  const platos = [];
  for (const f of FOODS) {
    if (ALIMENTOS_RETIRADOS.has(f.key) || f.group !== 'Platos preparados') continue;
    const m = f.name.match(/^(.*?)(?:\s+y\s+|,\s*|\s*\()(.*)$/);
    if (m) platos.push({ todas: palabras(f.name), cola: palabras(m[2]) });
  }
  const conCantidad = t => /^(\d|un\b|una\b|uno\b|dos\b|tres\b|cuatro\b|cinco\b|seis\b|siete\b|ocho\b|nueve\b|diez\b)/i.test(t);
  const salida = [];
  for (let i = 0; i < partes.length; i++) {
    let unidas = 0;
    // La unión más larga que nombra un plato completo.
    for (let k = partes.length - 1 - i; k >= 1 && !unidas; k--) {
      const siguientes = partes.slice(i + 1, i + 1 + k);
      if (siguientes.some(conCantidad)) continue;
      const enJunta = palabras([partes[i], ...siguientes].join(' y '));
      if (platos.some(({ todas, cola }) => cola.length
        && siguientes.every(p => palabras(p).length && palabras(p).every(w => cola.some(c => mismas(w, c))))
        && todas.every(w => enJunta.some(j => mismas(w, j))))) unidas = k;
    }
    salida.push(partes.slice(i, i + 1 + unidas).join(' y '));
    i += unidas;
  }
  return salida;
}

const PLATO_BRASA = 'Pollo a la brasa con papas y ensalada (-)';
// 17 oct: también el lomo saltado y el saltado de pollo (la papa que se nombra
// junto a ellos es la frita: "lomo saltado más papas" anotaba la papa
// sancochada), el bistec, el churrasco y la chuleta (bistec a lo pobre,
// churrasco con papas fritas). Con "sancochada", "cocida"… manda lo dicho.
const CON_PAPAS_FRITAS = /^(Pollo a la brasa|Pollada|Pollo broaster|Hamburguesa|Salchi|Alitas|Chicharrón de pollo|Hot dog|Pieza de pollo|McNuggets|Chicken fingers|Milanesa|Filete de pollo frito|Lomo saltado|Saltado de pollo|Carne de res \(bistec\)|Churrasco|Chuleta)/i;

/* Pollo a la brasa con papas y ensalada POR CORTE (pedido de Jonah, 17 oct:
   "en las pollerías lo sirven parte pierna y parte pecho"). Si dijo el corte
   (pierna, entrepierna, pecho) y el pollo vino con papas o ensalada, es el
   plato de ese corte, en cuarto u octavo y con o sin piel (con piel si no lo
   dijo). Sin corte, sigue el plato de siempre. */
const NOMBRE_PLATO_BRASA = 'Pollo a la brasa con papas y ensalada';
function platoBrasaPorCorte(it, FOODS, conAcompanamiento) {
  if (!it.food || it.gramosExplicitos || !/^Pollo a la brasa\b/.test(it.food.name)) return it;
  const t = sinTildes(it.textoOriginal || it.textoBuscar);
  const corte = /\bentrepierna\b/.test(t) ? 'entrepierna' : /\bpierna\b/.test(t) ? 'pierna' : /\b(pecho|pechuga)\b/.test(t) ? 'pecho' : null;
  if (!corte) return it;
  const piel = /\bsin piel\b/.test(t) ? 'sin piel' : 'con piel';
  const esPlato = (conAcompanamiento || /\b(con|y) (sus )?(papas?|papitas?|ensalada)\b/.test(t)) && !/\b(solo|sola) (la )?presa\b/.test(t);
  if (!esPlato) {
    // Sin papas ni ensalada es la presa sola: si la búsqueda dio con un plato
    // por corte (comparten "pecho", "piel"…), vuelve a la presa de ese corte.
    if (it.food.name !== NOMBRE_PLATO_BRASA || !it.food.state || it.food.state === '-') return it;
    const presa = FOODS.find(f => f.key === `Pollo a la brasa ${corte === 'pecho' ? 'pecho' : 'pierna'} (solo la presa) (${piel === 'sin piel' ? 'Sin piel' : 'Con piel'})`);
    return presa ? { ...it, food: presa, necesitaAclarar: false, opciones: null } : it;
  }
  // El cuarto pierna ya es pierna + entrepierna; en el octavo van aparte.
  const estado = it.porcion === 'octavo' ? `1/8 ${corte} ${piel}` : `1/4 ${corte === 'entrepierna' ? 'pierna' : corte} ${piel}`;
  const plato = FOODS.find(f => f.name === NOMBRE_PLATO_BRASA && f.state === estado && !ALIMENTOS_RETIRADOS.has(f.key));
  return plato ? { ...it, food: plato, necesitaAclarar: false, opciones: null } : it;
}

/* Lomo saltado, lomo saltado con arroz y saltado de pollo: con papas fritas o
   sin papas fritas, por separado (pedido de Jonah, 17 oct: "a veces el lomo
   lo preparan aparte y las papas fritas las sirven aparte").
   - "lomo saltado con papas (fritas)" → el que trae las papas;
   - "lomo saltado sin papas" → sin papas;
   - "lomo saltado y papas fritas aparte" (las papas dichas como otro
     alimento) → sin papas, y las papas se anotan aparte (mismo total);
   - "lomo saltado" a secas → pregunta "¿con papas fritas o sin?" (con papas
     primero: es como más se sirve). */
const SALTADOS = new Set(['Lomo saltado', 'Lomo saltado con arroz', 'Saltado de pollo']);
const esPapaSuelta = it => !!it.food && !SALTADOS.has(it.food.name)
  && (it.food.key === 'Papas fritas (comida rápida) (-)' || /^papa\b/i.test(it.food.name) || categoriaAcompanamiento(it.textoBuscar || it.textoOriginal) === 'papas');
function resolverSaltados(items, FOODS) {
  const papasAparte = items.some(esPapaSuelta);
  return items.map(it => {
    if (!it.food || !SALTADOS.has(it.food.name)) return it;
    const con = FOODS.find(f => f.name === it.food.name && f.state === 'Con papas fritas');
    const sin = FOODS.find(f => f.name === it.food.name && f.state === 'Sin papas fritas');
    if (!con || !sin) return it;
    const t = sinTildes(it.textoOriginal || it.textoBuscar);
    const elegido = food => ({ ...it, food, necesitaAclarar: false, opciones: null });
    if (/\bsin (las |sus )?(papas?|papitas?)\b/.test(t)) return elegido(sin);
    if (/\b(con|y) (sus |las )?(papas?|papitas?)\b|\bpapas? fritas?\b/.test(t)) return elegido(con);
    if (papasAparte) return elegido(sin);
    return { ...it, food: con, necesitaAclarar: true, opciones: [con, sin] };
  });
}

/* Después de entender cada parte:
   1. "Un cuarto de pollo a la brasa" + papas o ensalada (sin decir pierna,
      pecho ni piel) es el plato "Pollo a la brasa con papas y ensalada".
      Con el corte dicho, el plato de ese corte (platoBrasaPorCorte).
   2. Lo que el plato ya trae (sus papas, su ensalada, su arroz…) no se suma
      otra vez. Antes, el lomo saltado con o sin papas (resolverSaltados).
   3. "Papas" al lado de un pollo a la brasa, pollada, broaster o
      hamburguesa: se pregunta, con las papas fritas primero. "Ensalada" a
      secas: se pregunta, con la de lechuga primero (antes salía "Ensalada
      de frutas"). */
function ajustarAcompanamientos(items, FOODS) {
  const cat = it => (it.food && !it.gramosExplicitos ? categoriaAcompanamiento(it.textoBuscar || it.textoOriginal) : null);
  const plato = FOODS.find(f => f.key === PLATO_BRASA);
  const conAcompanamiento = items.some(it => ['papas', 'ensalada'].includes(cat(it)));
  // 1.
  if (plato && conAcompanamiento) {
    items = items.map(it => {
      if (!it.food || !/^Pollo a la brasa\b/.test(it.food.name) || (it.food.key === PLATO_BRASA && !it.necesitaAclarar)) return it;
      if (it.gramosExplicitos || /\b(pierna|pecho|entrepierna|piel|presa|solo|pechuga|ala)\b/i.test(it.textoBuscar || '')) return it;
      return { ...it, food: plato, necesitaAclarar: false, opciones: null };
    });
  }
  items = items.map(it => platoBrasaPorCorte(it, FOODS, conAcompanamiento));
  items = resolverSaltados(items, FOODS);
  // "Pecho sin piel": la versión dicha, sin preguntar otra vez.
  items = items.map(it => {
    const piel = /\b(sin|con) piel\b/i.exec(it.textoBuscar || '');
    if (!piel || !it.necesitaAclarar || !it.opciones) return it;
    const dicha = it.opciones.find(o => o.name === it.food.name && sinTildes(o.state) === `${piel[1].toLowerCase()} piel`);
    return dicha ? { ...it, food: dicha, necesitaAclarar: false, opciones: null } : it;
  });
  // 2.
  const incluidos = new Set();
  items.forEach(it => { if (it.food) acompanamientosDelPlato(it.food).forEach(c => incluidos.add(c)); });
  if (incluidos.size) {
    items = items.filter(it => {
      const c = cat(it);
      return !(c && incluidos.has(c) && !acompanamientosDelPlato(it.food).size);
    });
  }
  // 4. (17 oct) "Un café con leche con dos cucharaditas de azúcar": si dijo
  // cuánta azúcar le puso, la bebida va SIN azúcar y el azúcar aparte (antes
  // se contaba dos veces: el café "Con azúcar" + las cucharaditas).
  if (items.some(it => it.food && /^az[uú]car\b/i.test(it.food.name))) {
    items = items.map(it => {
      const f = it.necesitaAclarar && it.opciones?.length ? it.opciones[0] : it.food;
      if (!f || /^az[uú]car\b/i.test(f.name) || !/con az[uú]car/i.test(`${f.name} ${f.state}`)) return it;
      const sin = versionSinAzucar(f, FOODS);
      return sin ? { ...it, food: sin, necesitaAclarar: false, opciones: null } : it;
    });
  }
  // 3.
  const conFritas = items.some(it => it.food && CON_PAPAS_FRITAS.test(it.food.name));
  const fritas = FOODS.find(f => f.key === 'Papas fritas (comida rápida) (-)');
  const ensaladaFresca = FOODS.find(f => /^Ensalada fresca\b/.test(f.name)) || FOODS.find(f => f.key === 'Lechuga (Cruda)');
  return items.map(it => {
    const c = cat(it);
    const t = sinTildes(it.textoBuscar || '');
    if (c === 'papas' && conFritas && fritas && !/\b(frit|sancoch|cocid|herv|dorad|horno|nativ|amarill)/.test(t)) {
      const otras = [it.food, ...(it.opciones || [])].filter(f => f && f.key !== fritas.key);
      return { ...it, food: fritas, necesitaAclarar: true, opciones: [fritas, ...otras].slice(0, 4) };
    }
    if (c === 'ensalada' && ensaladaFresca && /^(una |la |su |con )?(ensalada|ensaladita)$/.test(t)) {
      const otras = [it.food, ...(it.opciones || [])].filter(f => f && f.key !== ensaladaFresca.key);
      return { ...it, food: ensaladaFresca, necesitaAclarar: true, opciones: [ensaladaFresca, ...otras].slice(0, 4) };
    }
    return it;
  });
}

/* La versión sin azúcar de una bebida "con azúcar": la del mismo nombre que
   dice "sin azúcar" o "natural" ("Jugo de papaya natural", "Limonada (Sin
   azúcar)", "Emoliente sin azúcar") o, si no hay, la del mismo nombre sin
   estado y con menos carbohidratos ("Café con leche (-)": 3,3 g, solo la
   lactosa, contra 7,2 g del "Con azúcar"). null si la app no la tiene (ej.
   "Avena / quinua de bebida"). */
export function versionSinAzucar(food, FOODS) {
  if (!food) return null;
  const base = n => sinTildes(n).replace(/\b(con|sin) azucar\b|\bnatural\b/g, ' ').replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
  const texto = f => sinTildes(`${f.name} ${f.state || ''}`);
  const mismas = FOODS.filter(f => f.key !== food.key && !ALIMENTOS_RETIRADOS.has(f.key) && base(f.name) === base(food.name) && !/con azucar/.test(texto(f)));
  return mismas.find(f => /sin azucar|\bnatural\b/.test(texto(f)))
    || mismas.find(f => f.name === food.name && (!f.state || f.state === '-') && Number(f.carbs) < Number(food.carbs))
    || null;
}

/* La medida de la porción dicha ("cuarto", "octavo") en las medidas de
   ese alimento: "1/4 con papas", "cuarto de pollo", "octavo (pierna)"… */
export function unidadDePorcion(food, porcion, unitsFor, texto = '') {
  if (!food || !porcion) return null;
  const patron = porcion === 'cuarto' ? /^(1\/4|cuarto)/ : /^(1\/8|octavo)/;
  const posibles = unitsFor(food).map(u => u[0]).filter(u => patron.test(u));
  if (!posibles.length) return null;
  if (porcion === 'octavo' && /entrepierna/i.test(texto)) return posibles.find(u => /entrepierna/.test(u)) || posibles[0];
  return posibles[0];
}

// "taza", "tazas", "vaso", "cucharadas"… dicho en el texto, entre las
// medidas de una palabra que tiene el alimento (no "plato", "unidad" ni
// "porción", que
// ya son la porción por defecto de lo que se dice sin medida).
function medidaDicha(food, texto, unitsFor) {
  const t = String(texto || '').toLowerCase();
  if (!t) return null;
  for (const [u] of unitsFor(food)) {
    if (u === 'gramos' || u === 'plato' || u === 'unidad' || u === 'porción' || /[\s/()]/.test(u)) continue;
    const plural = /[aeiou]$/.test(u) ? `${u}s` : `${u}es`;
    if (new RegExp(`(^|[^a-záéíóúñ])(${u}|${plural})([^a-záéíóúñ]|$)`).test(t)) return u;
  }
  return null;
}

// Cuánto se anota de cada alimento entendido: los gramos que dijo, o la
// medida casera por defecto por la cantidad.
export function porcionDelItem(it, unidadPorDefecto, unitsFor) {
  if (it.gramosExplicitos) return { unit: 'gramos', qty: it.gramosExplicitos };
  // La medida que ya trae lo entendido ("pan con palta" → 1 porción para pan),
  // si ese alimento la tiene.
  if (it.medida && (it.medida.unit === 'gramos' || (unitsFor && unitsFor(it.food).some(u => u[0] === it.medida.unit)))) {
    return { unit: it.medida.unit, qty: it.medida.qty };
  }
  const enPorcion = unitsFor && unidadDePorcion(it.food, it.porcion, unitsFor, it.textoOriginal);
  if (enPorcion) return { unit: enPorcion, qty: it.cantidad || 1 };
  // La medida casera dicha, si el alimento la tiene ("2 tazas de lentejas
  // crudas" → 2 tazas, no la porción por defecto × 2). 17 oct: antes solo
  // coincidía cuando la medida dicha era la de por defecto.
  const dicha = unitsFor && medidaDicha(it.food, it.textoOriginal, unitsFor);
  if (dicha) return { unit: dicha, qty: it.cantidad || 1 };
  const d = unidadPorDefecto(it.food);
  return { unit: d.unit, qty: d.qty * (it.cantidad || 1) };
}
