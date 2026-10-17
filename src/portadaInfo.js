/* Textos de las secciones nuevas de la portada y de las páginas por
   objetivo (17 oct, aprobado por Jonah: ideas de fitia.app con nuestra
   marca y sin promesas que no podamos probar).

   Un solo lugar para el texto: lo usan la portada (src/portadaSecciones.jsx)
   y las páginas /bajar-de-peso, /subir-de-peso y /mantener-peso
   (scripts/objetivos/generar.mjs). Los datos para Google (FAQPage) se arman
   con estas mismas frases, así lo que lee Google es lo que se ve.

   Es JavaScript simple (sin JSX ni nada del navegador) para que el script
   de las páginas lo pueda leer en el build.

   MENSAJE DE PAÍS: lo peruano (CENAN, platos, pollería, chifa, soles, Yape,
   Plin) vive solo en estos textos, para cambiarlos si algún día la app sale
   en otro país. El nombre, el logo y "Comida a comida" no se tocan.

   Reglas (CLAUDE.md, "Exactitud ante todo"): cada frase tiene que ser
   verdad y comprobable en el código. Nunca "oficial", "avalado", "la más
   precisa", "verificada por nutricionistas", cifras de usuarios ni kilos
   prometidos. Dónde se comprobó cada respuesta:
   - fuente: docs/alimentos-verificados.json (los 480 alimentos tienen su
     fuente; la mayoría, la Tabla Peruana del CENAN) y fuenteCorta en
     src/buscador.js (el buscador de la portada muestra "Fuente: …").
   - pesar: unitsFor / "⚖️ Lo pesé" en src/alumno.jsx (manual 8.2).
   - objetivo: GOALS en src/alumno.jsx (−20 % / +10 % por defecto,
     ajustable) y los retos para subir (src/equipo.jsx: como mucho ½ kg por
     semana).
   - corregir: − / + en la fila, editar a fondo y "Deshacer" (manual 8.3).
   - pagar: pantalla de planes (Yape, Plin, transferencia, Mercado Pago
     pago único o suscripción; manual 13.2 y 13.3). Solo en la web.
   - fuera de casa: RAW_FOODS (brasa por corte, chaufa, tallarín saltado,
     sopa wantán, anticucho, salchipapa, hamburguesa de carretilla,
     picarones, KFC, Bembos) y "¿Estás fuera de casa? Cuéntale a Beast"
     (manual 8.1). */

export const HISTORIA_JONAH = 'Hace unos años bajé 37 kg, y ahora bajé de 104 a 90 kg en 2 meses y medio con mi propia app, sumándole entrenamiento algunos días y disciplina.';

// Preguntas frecuentes. soloWeb: no sale en las apps de Play Store ni de
// iPhone (ahí se paga con Google o Apple). enlace: botón debajo de la
// respuesta ({ texto, href }).
export const PREGUNTAS_FRECUENTES = [
  { id: 'fuente', pregunta: '¿De dónde salen las calorías?',
    respuesta: 'La primera fuente es la Tabla Peruana de Composición de Alimentos del CENAN (Instituto Nacional de Salud). Si un alimento no está ahí, uso la etiqueta del producto o la base del USDA (de Estados Unidos), y en algunos platos, una receta promedio. En el buscador de calorías de jonahbeast.com cada plato te dice de dónde sale su número. Son valores aproximados: cambian un poco según la receta y la porción.',
    enlace: { texto: 'Cómo contamos las calorías →', href: '/contador-de-calorias' } },
  { id: 'pesar', pregunta: '¿Tengo que pesar mi comida?',
    respuesta: 'No. Anotas en medida casera: 1 plato, 1 unidad, 1 presa, 1 lata, 1 cucharada. Y si tienes balanza, tocas "⚖️ Lo pesé" y pones los gramos exactos.' },
  { id: 'objetivo', pregunta: '¿Sirve para bajar, mantener o subir de peso?',
    respuesta: 'Sí, para los tres. Eliges tu objetivo (bajar grasa, mantenerte o ganar músculo) y la app calcula tus calorías y tu proteína del día con tu edad, estatura, peso y actividad. Para bajar empieza con 20\u00a0% menos de lo que gastas y para subir con 10\u00a0% más, y tú lo puedes cambiar. También puedes armar un reto con tus amigos o tu familia para bajar o para subir de peso (para subir, como mucho ½ kg por semana). Son números de referencia, no una receta médica: cada cuerpo va a su ritmo.' },
  { id: 'gratis', pregunta: '¿Qué es gratis y qué es Premium?',
    respuesta: 'Gratis, para siempre y sin tarjeta: anotar tus comidas escribiendo o con código de barras, tu meta de calorías, tu peso, tu racha, 3 fotos por semana y los retos en equipo. Premium suma la foto en todas tus comidas, la voz, a Beast contigo todo el día, tu menú del día y de la semana, y tu % de grasa con historial. Al crear tu cuenta tienes 7 días de Premium incluidos; cuando terminan, sigues gratis y nadie te cobra solo.',
    enlace: { texto: 'Ver la lista completa →', href: '#gratis-premium' } },
  { id: 'corregir', pregunta: '¿Puedo corregir lo que anoté?',
    respuesta: 'Sí, en un toque. Cambias la cantidad con − y + en la misma fila, o tocas el alimento para cambiar la medida, los gramos o el alimento. Y si lo quitas sin querer, tienes "Deshacer".' },
  { id: 'quien', pregunta: '¿Quién está detrás?',
    respuesta: `Yo, Jonah. ${HISTORIA_JONAH} No dejé la comida peruana: aprendí a medirla. Hice esta app para que tú también cuentes tu comida sin adivinar. El cambio llega poco a poco, comida a comida.` },
  { id: 'pagar', pregunta: '¿Cómo pago?', soloWeb: true,
    respuesta: 'En soles, con Yape, Plin, transferencia o Mercado Pago (tarjeta o saldo). Con Yape, Plin o transferencia me mandas la captura desde la app y activo tu plan apenas la veo (de 7 am a 10 pm). Con Mercado Pago se activa solo cuando se aprueba el pago: pagas una vez, o eliges que se cobre solo cada periodo y lo cancelas cuando quieras desde tu cuenta de Mercado Pago.' },
  { id: 'fuera', pregunta: '¿Funciona si como fuera de casa?',
    respuesta: 'Sí. En la app están los platos de la pollería (pollo a la brasa por cuarto u octavo, pierna o pecho), del chifa (chaufa, tallarín saltado, sopa wantán), del menú (lomo saltado, ají de gallina, arroz con pollo y muchos más), de la comida al paso (anticucho, salchipapa, hamburguesa de carretilla, picarones) y de algunas cadenas, como KFC y Bembos. Y si no sabes qué pedir, cuéntale a Beast dónde estás y te ayuda a elegir con lo que te queda del día.' },
];

/* "Gratis para siempre vs. Premium": sale de lo que hace la app de verdad
   (src/alumno.jsx) y de la tabla del manual (docs/manual-app.md, 13.8). Si
   cambia un límite en la app, cambiarlo aquí también.
   gratis / premium: true = ✓, false = —, o un texto corto ("3 por semana"). */
export const GRATIS_PREMIUM = [
  { funcion: 'Anotar tus comidas escribiendo, con favoritos y tus propios alimentos', gratis: true, premium: true },
  { funcion: 'Código de barras de los productos', gratis: true, premium: true },
  { funcion: 'Medida casera o "⚖️ Lo pesé" en gramos', gratis: true, premium: true },
  { funcion: 'Tu meta de calorías y macros para tu objetivo', gratis: true, premium: true },
  { funcion: 'Tu peso, tu racha y tus insignias', gratis: true, premium: true },
  { funcion: 'Retos en equipo con tus amigos o tu familia', gratis: true, premium: true },
  // 🔎 "Consultar calorías" (la barra arriba del Inicio, PR #484): todavía no
  // está en main. Cuando se una, sumar esta fila:
  // { funcion: '🔎 Consultar calorías de un plato sin anotarlo', gratis: true, premium: true },
  { funcion: '📸 Foto de tu plato', gratis: '3 por semana', premium: 'En todas tus comidas' },
  { funcion: '🦍 Beast, tu compañero', gratis: '3 mensajes al día', premium: 'Todo el día, también por voz' },
  { funcion: '"¿Qué puedo comer?"', gratis: '3 veces por semana', premium: 'Siempre' },
  { funcion: 'Tu menú del día', gratis: 'El desayuno', premium: 'Todas tus comidas' },
  { funcion: 'Tendencias de tu progreso', gratis: '7 días', premium: 'Hasta 1 año' },
  { funcion: 'Tu % de grasa', gratis: 'Se mide 1 vez', premium: 'Cuando quieras, con historial y masa muscular' },
  { funcion: '🎙️ Anotar con tu voz', gratis: false, premium: true },
  { funcion: 'Leer la tabla nutricional con una foto', gratis: false, premium: true },
  { funcion: 'Menú de la semana y lista de compras', gratis: false, premium: true },
  { funcion: 'Fotos de tu progreso', gratis: false, premium: true },
  { funcion: 'Ajustar tu meta a mano', gratis: false, premium: true },
  { funcion: 'Jonah y su asistente por WhatsApp para tu nutrición', gratis: false, premium: true },
];

/* Testimonios de alumnos: VACÍO a propósito. Jonah consigue las frases
   reales de Joselyn, Yanet, Yara y Giannina con su permiso por escrito.
   Nunca inventar una frase. Sin kilos prometidos ni antes y después.
   Mientras la lista esté vacía, la sección no se muestra.
   Ejemplo de cómo va cada una (foto opcional, en public/testimonios/):
   { nombre: 'Nombre de pila', frase: 'Lo que dijo, tal cual.', foto: '/testimonios/nombre.webp' } */
export const TESTIMONIOS_ALUMNOS = [];

/* Botones "Disponible en Google Play / App Store": apagados hasta que la
   app de Play Store salga de la prueba cerrada y Apple apruebe la de
   iPhone. Para encenderlos, cambiar false por true.
   FALTA ANTES DE ENCENDER: guardar los badges oficiales, tal cual se
   descargan y sin modificarlos, en public/tiendas/ (desde esta sesión no se
   pudieron bajar: la red bloquea play.google.com y apple.com):
   - google-play-es.png: play.google.com/intl/es-419/badges/ (español)
   - app-store-es.svg: developer.apple.com/app-store/marketing/guidelines/
     ("Descárgalo en el App Store", negro, español) */
export const TIENDAS_PUBLICAS = { play: false, ios: false };
export const LINK_PLAY = 'https://play.google.com/store/apps/details?id=com.jonahbeast.twa'; // android/twa-manifest.json → packageId
// El número de la app en la App Store (apps.apple.com/pe/app/id…) todavía
// no está en el repositorio: se ve en App Store Connect → la app →
// "Información de la app" → "ID de Apple". Ponerlo aquí antes de encender ios.
export const LINK_APP_STORE = '';

/* Páginas por objetivo (scripts/objetivos/generar.mjs). El botón lleva a
   la app con ?empezar=<objetivo> (abre el recorrido con ese objetivo ya
   elegido) y ?fuente=objetivo_<…> para medir cuántos se registran desde
   cada una. Voz de Jonah, sin prometer kilos. */
export const PAGINAS_OBJETIVO = [
  {
    ruta: '/bajar-de-peso', clave: 'bajar', objetivoApp: 'Perder grasa',
    titulo: 'Contador de calorías para bajar de peso con comida peruana | Jonah Beast Fuel',
    descripcion: 'Baja de peso contando las calorías de tu comida peruana: tu meta del día, medida casera y anotar con una foto, tu voz o escribiendo. Gratis para siempre, sin tarjeta.',
    h1: ['Bajar de peso', 'sin dejar tu comida'],
    bajada: 'Soy Jonah. No dejé el lomo saltado ni el pollo a la brasa: aprendí a medirlos. Con la app ves cuántas calorías te tocan al día para bajar y anotas tu comida con una foto, con tu voz o escribiendo.',
    puntos: [
      ['🎯', 'Tu meta del día', 'Con tu edad, estatura, peso y actividad, la app calcula tus calorías y tu proteína. Para bajar empieza con 20\u00a0% menos de lo que gastas, y tú lo puedes ajustar.'],
      ['🍚', 'Tu plato, como lo sirves', 'Medida casera (1 plato, 1 presa, 1 unidad) o "⚖️ Lo pesé" en gramos. Y te aviso si el plato viene con o sin arroz, para que no se te pase.'],
      ['🦍', 'Cómo encaja cada comida', 'Al anotar ves si la comida encaja bien en tu día y cuánto te queda. Beast te dice qué comer después.'],
      ['⚖️', 'Tu peso, sin obsesionarte', 'Tu pesaje de la semana y tu racha. Y si quieres compañía, un reto con tus amigos o tu familia.'],
    ],
  },
  {
    ruta: '/subir-de-peso', clave: 'subir', objetivoApp: 'Ganar músculo',
    titulo: 'Contador de calorías para subir de peso con comida peruana | Jonah Beast Fuel',
    descripcion: 'Sube de peso comiendo bien: tus calorías y tu proteína del día con tu comida peruana, medida casera y anotar con una foto, tu voz o escribiendo. Gratis para siempre, sin tarjeta.',
    h1: ['Subir de peso', 'comiendo bien'],
    bajada: 'Para subir también hay que contar: si no comes lo suficiente, no subes. Eliges "Ganar músculo" y la app calcula cuántas calorías y cuánta proteína te tocan, con tu comida de siempre.',
    puntos: [
      ['🎯', 'Tu meta del día', 'Para subir, la app empieza con 10\u00a0% más de lo que gastas y calcula tu proteína según tu cuerpo. Tú lo puedes ajustar.'],
      ['🍗', 'Que no te falte proteína', 'Al anotar ves cuánta proteína llevas y, si vas bajo, la app te lo recuerda para tu siguiente comida.'],
      ['📸', 'Anotar sin complicarte', 'Con una foto, con tu voz o escribiendo, en medida casera o en gramos con "⚖️ Lo pesé".'],
      ['💪', 'Un reto para subir', 'Arma un reto con tus amigos para subir de peso. La app no deja metas de más de ½ kg por semana: más rápido es grasa, no músculo. Súmale entrenamiento y anótalo en la app.'],
    ],
  },
  {
    ruta: '/mantener-peso', clave: 'mantener', objetivoApp: 'Mantener peso',
    titulo: 'Contador de calorías para mantener tu peso con comida peruana | Jonah Beast Fuel',
    descripcion: 'Mantén tu peso y come mejor contando las calorías de tu comida peruana: tu meta del día, medida casera y anotar con una foto, tu voz o escribiendo. Gratis para siempre, sin tarjeta.',
    h1: ['Mantener tu peso', 'y comer mejor'],
    bajada: 'Llegaste a tu peso, o solo quieres ordenar lo que comes. Eliges "Mantener peso" y la app calcula cuánto comer para quedarte donde estás, sin dejar tu comida de siempre.',
    puntos: [
      ['🎯', 'Tu meta del día', 'La app calcula lo que gastas al día con tu edad, estatura, peso y actividad, y esa es tu meta. Tú la puedes ajustar.'],
      ['⚖️', 'Tu peso, semana a semana', 'Con tu pesaje de la semana ves si te mantienes, y lo corriges a tiempo.'],
      ['🍚', 'Tu plato, como lo sirves', 'Medida casera o "⚖️ Lo pesé" en gramos, y te aviso si el plato viene con o sin arroz.'],
      ['🤝', 'Comer mejor, acompañado', 'Un reto de "Comer mejor" con tu familia o tus amigos: gana el que más días anota sus comidas, sin kilos de por medio.'],
    ],
  },
];

// Nota honesta que va en las tres páginas.
export const NOTA_OBJETIVO = 'Cada cuerpo va a su ritmo: no te prometo kilos. El cambio llega poco a poco, comida a comida. Son números de referencia, no una receta médica; si tienes una condición de salud, consulta con tu médico.';

// Datos para Google (FAQPage), con el mismo texto que se ve.
export function faqJsonLd(preguntas) {
  return {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: preguntas.map(p => ({ '@type': 'Question', name: p.pregunta, acceptedAnswer: { '@type': 'Answer', text: p.respuesta } })),
  };
}
