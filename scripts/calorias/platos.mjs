// Los platos que tienen su página en jonahbeast.com/calorias/<slug>.
// Las calorías y porciones NO van aquí: salen de la lista de alimentos de la
// app (RAW_FOODS y sus medidas en src/App.jsx), así la página y la app
// siempre dicen lo mismo. Aquí solo va lo que la app no tiene: el nombre
// para la página, el grupo y el consejo de Jonah (en su voz).
//
//   alimento: nombre exacto en RAW_FOODS.
//   porcion:  (opcional) qué medida se muestra en grande; si no, la primera.
//   etiqueta: (opcional) cómo se llama esa medida en grande.
//   el:       (opcional) artículo si no es "el": 'la', 'los' o 'las'.
//   frase:    (opcional) cómo se dice la porción en una oración; si no,
//             "<etiqueta> de <plato>" (ej. "Un plato de lomo saltado").
//   aclara:   (opcional) aclaración bajo el número grande.

export const GRUPOS = [
  { id: 'segundos', titulo: 'Segundos y platos de fondo' },
  { id: 'arroces', titulo: 'Arroces y tallarines' },
  { id: 'mar', titulo: 'Pescados y mariscos' },
  { id: 'entradas', titulo: 'Entradas' },
  { id: 'sopas', titulo: 'Sopas y caldos' },
  { id: 'paso', titulo: 'Al paso' },
  { id: 'postres', titulo: 'Postres' },
];

export const PLATOS = [
  // Segundos y platos de fondo
  { slug: 'lomo-saltado', alimento: 'Lomo saltado', nombre: 'Lomo saltado', grupo: 'segundos',
    consejo: 'Yo me lo como igual, solo le bajo el arroz a la mitad y le pido más cebolla y tomate. No se trata de dejar tu lomo, sino de saber cuánto comes.' },
  { slug: 'aji-de-gallina', alimento: 'Ají de gallina', nombre: 'Ají de gallina', grupo: 'segundos',
    consejo: 'La crema lleva pan, leche y queso, por eso suma rápido. Sírvete una porción normal, acompáñala con la papa en vez de mucho arroz y disfrútala sin culpa.' },
  { slug: 'pollo-a-la-brasa', etiqueta: 'Un cuarto con papas', frase: 'Un cuarto de pollo a la brasa con papas', alimento: 'Pollo a la brasa con papas y ensalada', nombre: 'Pollo a la brasa con papas', grupo: 'segundos',
    consejo: 'Un cuarto con papas es casi una comida y media. Si quieres comerlo seguido, pide octavo, cambia parte de las papas por más ensalada y ojo con las cremas, que también suman.' },
  { slug: 'seco-de-res-con-frejoles', alimento: 'Seco de res con frejoles', nombre: 'Seco de res con frejoles', grupo: 'segundos',
    consejo: 'Buen plato: la carne y los frejoles te dan proteína y te llenan. Si le bajas un poco el arroz, queda un almuerzo muy completo.' },
  { slug: 'cau-cau', alimento: 'Cau cau', nombre: 'Cau cau', grupo: 'segundos',
    consejo: 'Es de los segundos más livianos. Lo que más suma es el arroz que lo acompaña: con media porción de arroz ya estás bien.' },
  { slug: 'tacu-tacu', alimento: 'Tacu tacu', nombre: 'Tacu tacu', grupo: 'segundos',
    consejo: 'Es arroz con frejol frito en la sartén, así que es de los más pesados. Si lo comes, que sea con un buen bistec o huevo y una ensalada al lado, y la porción normal, no la grande.' },
  { slug: 'rocoto-relleno', alimento: 'Rocoto relleno', nombre: 'Rocoto relleno', grupo: 'segundos',
    consejo: 'El rocoto lleva carne y queso, y casi siempre viene con pastel de papa. Un rocoto con su acompañamiento ya es un almuerzo; no hace falta sumarle arroz.' },
  { slug: 'chicharron-de-chancho', alimento: 'Chicharrón de chancho', nombre: 'Chicharrón de chancho', grupo: 'segundos',
    consejo: 'Tiene mucha proteína, pero también bastante grasa. Para un domingo está bien: una porción, con su sarsa criolla y camote, y el resto del día comes más ligero.' },
  { slug: 'carapulcra', el: 'la', alimento: 'Carapulcra', nombre: 'Carapulcra', grupo: 'segundos',
    consejo: 'La papa seca ya es tu carbohidrato. Si la acompañas con sopa seca, sírvete poquito de cada una para no duplicar.' },
  { slug: 'olluquito-con-charqui', alimento: 'Olluquito con charqui', nombre: 'Olluquito con charqui', grupo: 'segundos',
    consejo: 'Es de los platos criollos más livianos y el charqui te da proteína. Aquí casi todo lo suma el arroz: mídelo y listo.' },
  { slug: 'adobo-de-cerdo', alimento: 'Adobo de cerdo', nombre: 'Adobo de cerdo', grupo: 'segundos',
    consejo: 'Buena proteína. Elige las partes con menos grasa y acompáñalo con su camote o su pan, no con los dos.' },
  { slug: 'arroz-con-pato', alimento: 'Arroz con pato', nombre: 'Arroz con pato', grupo: 'segundos',
    consejo: 'El pato tiene más grasa que el pollo y el arroz va bien cargado. Pide la presa con menos piel y un poco menos de arroz, y le sumas su sarsa.' },
  { slug: 'frejolada', el: 'los', alimento: 'Frejolada (frejol con arroz)', nombre: 'Frejoles con arroz', grupo: 'segundos',
    consejo: 'Los frejoles llenan y tienen fibra. Si le sumas un huevo o un pedazo de pollo, tienes un plato completo y barato.' },
  { slug: 'lentejas-con-arroz', el: 'las', alimento: 'Menestra de lentejas con arroz', nombre: 'Lentejas con arroz', grupo: 'segundos',
    consejo: 'Uno de mis favoritos para el día a día: barato, llena y tiene fibra. Súmale una proteína, como pescado o huevo, y tu almuerzo está completo.' },
  { slug: 'chanfainita', el: 'la', alimento: 'Chanfainita', nombre: 'Chanfainita', grupo: 'segundos',
    consejo: 'Tiene buena proteína por el bofe y no es de los más pesados. Ojo con el arroz y el mote que la acompañan, ahí se van las calorías.' },
  { slug: 'pachamanca', el: 'la', alimento: 'Pachamanca', nombre: 'Pachamanca', grupo: 'segundos',
    consejo: 'Viene con varias carnes, papa, camote, haba y humita. Elige 2 carnes y 2 acompañamientos, no todo, y la disfrutas igual.' },
  { slug: 'estofado-de-pollo', alimento: 'Estofado de pollo', nombre: 'Estofado de pollo', grupo: 'segundos',
    consejo: 'Es un plato casero bien balanceado: pollo, papa y verduras. Con poquito arroz, o sin arroz porque ya tiene papa, queda perfecto.' },
  { slug: 'escabeche-de-pollo', alimento: 'Escabeche de pollo', nombre: 'Escabeche de pollo', grupo: 'segundos',
    consejo: 'Buena proteína y bastante cebolla. Lo que más suma es el camote y el arroz: con uno de los dos basta.' },
  { slug: 'juane', frase: 'Un juane', alimento: 'Juane', nombre: 'Juane', grupo: 'segundos',
    consejo: 'Un juane con su arroz, pollo, huevo y aceituna ya es una comida completa. Uno con su ensalada de cocona o tu cebollita, y no necesitas más.' },
  { slug: 'pollada', etiqueta: 'Un cuarto de pollo', frase: 'Un cuarto de pollada', el: 'la', alimento: 'Pollada (pollo frito)', nombre: 'Pollada', grupo: 'segundos',
    consejo: 'Es pollo frito, así que suma más que uno al horno. Si vas a una pollada, disfrútala, y el resto del día comes ligero. Una comida no te arruina el avance.' },

  // Arroces y tallarines
  { slug: 'arroz-con-pollo', alimento: 'Arroz con pollo', nombre: 'Arroz con pollo', grupo: 'arroces',
    consejo: 'Pide la presa más grande y menos arroz: más proteína y menos carbohidrato. Con su papa a la huancaína al lado ya es mucho: elige uno de los dos.' },
  { slug: 'arroz-chaufa', alimento: 'Arroz chaufa', nombre: 'Arroz chaufa', grupo: 'arroces',
    consejo: 'El chaufa es casi todo arroz con aceite. Si te provoca, pide media porción y súmale pollo o huevo, o comparte el plato.' },
  { slug: 'tallarines-verdes', el: 'los', alimento: 'Tallarines verdes', nombre: 'Tallarines verdes', grupo: 'arroces',
    consejo: 'El pesto lleva queso y aceite, y el fideo suma rápido. Media porción de tallarín con un buen bistec o pollo es un plato mucho más equilibrado.' },
  { slug: 'tallarines-rojos-con-pollo', el: 'los', alimento: 'Tallarines rojos con pollo', nombre: 'Tallarines rojos con pollo', grupo: 'arroces',
    consejo: 'La salsa roja es más liviana que la verde. Pide la presa grande y menos fideo, y tienes un almuerzo rico y completo.' },
  { slug: 'arroz-con-mariscos', alimento: 'Arroz con mariscos', nombre: 'Arroz con mariscos', grupo: 'arroces',
    consejo: 'Los mariscos tienen buena proteína, pero el plato es sobre todo arroz. Media porción con su sarsa y un ceviche de entrada es una gran combinación.' },

  // Pescados y mariscos
  { slug: 'ceviche', alimento: 'Ceviche de pescado', nombre: 'Ceviche de pescado', grupo: 'mar',
    aclara: 'Solo el ceviche: sin camote, choclo ni cancha.',
    consejo: 'El pescado con limón es de lo más sano que hay: mucha proteína y casi nada de grasa. Lo que suma es lo de al lado: camote, choclo y la cancha. Elige uno y disfruta.' },
  { slug: 'sudado-de-pescado', alimento: 'Sudado de pescado', nombre: 'Sudado de pescado', grupo: 'mar',
    consejo: 'De los mejores platos si quieres bajar: mucha proteína y poca grasa. Acompáñalo con yuca o arroz, una porción normal.' },
  { slug: 'pescado-frito', alimento: 'Pescado frito', nombre: 'Pescado frito', grupo: 'mar',
    consejo: 'El pescado es buenísimo, pero frito absorbe aceite. Si puedes, pídelo a la plancha; si es frito, acompáñalo con ensalada en vez de papas fritas.' },
  { slug: 'chupe-de-camarones', alimento: 'Chupe de camarones', nombre: 'Chupe de camarones', grupo: 'mar',
    consejo: 'Lleva leche, huevo, queso y papa, así que llena bastante. Un plato de chupe ya es tu almuerzo completo: no le sumes un segundo.' },
  { slug: 'parihuela', el: 'la', alimento: 'Parihuela', nombre: 'Parihuela', grupo: 'mar',
    consejo: 'Es de las sopas más livianas y con mucha proteína del mar. Si te quedas con hambre, súmale un poco de arroz o yuca, no pan.' },

  // Entradas
  { slug: 'causa-limena', el: 'la', alimento: 'Causa limeña', nombre: 'Causa limeña', grupo: 'entradas',
    porcion: 'media porción', etiqueta: 'Una porción de entrada',
    consejo: 'La papa amarilla y la mayonesa son las que suman. Como entrada, una porción normal está perfecta; si va de plato principal, que sea con atún o pollo.' },
  { slug: 'papa-a-la-huancaina', el: 'la', alimento: 'Papa a la huancaína', nombre: 'Papa a la huancaína', grupo: 'entradas',
    porcion: 'media porción', etiqueta: 'Una porción de entrada',
    consejo: 'La crema lleva queso, galleta y aceite. Pide la crema aparte y úsala con medida: el sabor está igual y comes bastante menos.' },
  { slug: 'ocopa', el: 'la', alimento: 'Ocopa arequipeña', nombre: 'Ocopa', grupo: 'entradas',
    porcion: 'media porción', etiqueta: 'Una porción de entrada',
    consejo: 'Es parecida a la huancaína: la salsa lleva maní, queso y galleta. Rica de entrada, pero con media porción ya está; después un segundo ligero.' },
  { slug: 'papa-rellena', frase: 'Una papa rellena', el: 'la', alimento: 'Papa rellena', nombre: 'Papa rellena', grupo: 'entradas',
    consejo: 'Una papa rellena es casi un almuerzo chico. Si la comes al paso, que sea una y con su sarsa; en vez de dos, súmale una ensalada.' },
  { slug: 'tamal', frase: 'Un tamal', alimento: 'Tamal', nombre: 'Tamal', grupo: 'entradas',
    consejo: 'Para el desayuno del domingo está bien: un tamal con su sarsa y un café. Lo que suma es acompañarlo con pan: elige uno de los dos.' },
  { slug: 'humita', frase: 'Una humita', el: 'la', alimento: 'Humita', nombre: 'Humita', grupo: 'entradas',
    consejo: 'Es choclo con manteca, rica y llenadora. Una humita es tu carbohidrato de esa comida; acompáñala con un huevo o queso fresco.' },
  { slug: 'anticuchos', porcion: 'porción (2 palitos)', etiqueta: 'Una porción de 2 palitos', frase: 'Una porción de 2 palitos de anticucho', el: 'los', alimento: 'Anticucho de corazón', nombre: 'Anticuchos de corazón', grupo: 'entradas',
    consejo: 'El corazón tiene mucha proteína y poca grasa. Lo que más suma es la papa y el choclo que vienen al lado: dos palitos con su choclo es una gran opción.' },

  // Sopas y caldos
  { slug: 'aguadito-de-pollo', alimento: 'Aguadito de pollo', nombre: 'Aguadito de pollo', grupo: 'sopas',
    consejo: 'Liviano y reconfortante. Si quieres que te llene más, pide la presa grande: así le sumas proteína sin sumar mucho más.' },
  { slug: 'caldo-de-gallina', alimento: 'Caldo de gallina', nombre: 'Caldo de gallina', grupo: 'sopas',
    consejo: 'El caldo en sí es liviano; lo que suma es el fideo, la papa y la grasa de la gallina. Pide la presa sin pellejo y un poco menos de fideo.' },
  { slug: 'sopa-a-la-minuta', el: 'la', alimento: 'Sopa a la minuta', nombre: 'Sopa a la minuta', grupo: 'sopas',
    consejo: 'Lleva carne molida, fideo y leche, y llena rápido. De entrada, media porción; o un plato entero y un segundo más ligero.' },
  { slug: 'menestron', alimento: 'Menestrón', nombre: 'Menestrón', grupo: 'sopas',
    consejo: 'Tiene muchas verduras y frejol, buen plato para llenarte con pocas calorías. Si va con carne, mejor: le sumas proteína.' },

  // Al paso
  { slug: 'pan-con-chicharron', frase: 'Un pan con chicharrón', alimento: 'Pan con chicharrón', nombre: 'Pan con chicharrón', grupo: 'paso',
    consejo: 'Es un clásico del domingo y no tienes por qué dejarlo. Uno, con su camote y su sarsa, y el resto del día comes más ligero. Comida a comida.' },
  { slug: 'salchipapa', el: 'la', alimento: 'Salchipapa', nombre: 'Salchipapa', grupo: 'paso',
    consejo: 'Papas fritas, salchicha y cremas: es de lo que más suma. Si te provoca, comparte la porción o pide la chica, y ojo con las cremas.' },
  { slug: 'butifarra', frase: 'Una butifarra', el: 'la', alimento: 'Butifarra', nombre: 'Butifarra', grupo: 'paso',
    consejo: 'Un pan con jamón del país y sarsa: ni tan pesado ni tan ligero. Uno está bien para un desayuno o lonche; dos ya es mucho.' },

  // Postres
  { slug: 'picarones', el: 'los', alimento: 'Picarones con miel', nombre: 'Picarones con miel', grupo: 'postres',
    consejo: 'Son fritos y con miel, así que suman bastante. Comparte la porción o pide menos miel, y disfrútalos de vez en cuando, sin culpa.' },
  { slug: 'mazamorra-morada', el: 'la', alimento: 'Mazamorra morada', nombre: 'Mazamorra morada', grupo: 'postres',
    consejo: 'Es de los postres más livianos porque casi no tiene grasa. Una porción normal después del almuerzo está bien.' },
  { slug: 'arroz-con-leche', alimento: 'Arroz con leche', nombre: 'Arroz con leche', grupo: 'postres',
    consejo: 'No es de los más pesados, pero tiene bastante azúcar. Una porción chica, o un combinado a medias con mazamorra, y listo.' },
  { slug: 'suspiro-a-la-limena', alimento: 'Suspiro a la limeña', nombre: 'Suspiro a la limeña', grupo: 'postres',
    consejo: 'Manjar y merengue: es muy dulce y suma rápido. Una copa chica para compartir es la mejor forma de disfrutarlo.' },
  { slug: 'turron-de-dona-pepa', alimento: 'Turrón de Doña Pepa', nombre: 'Turrón de Doña Pepa', grupo: 'postres',
    consejo: 'Cuando llega octubre se antoja, y está bien darse el gusto. Una tajada delgada, no la porción grande, y la cuentas en tu día.' },
  { slug: 'torta-tres-leches', el: 'la', alimento: 'Torta tres leches', nombre: 'Torta tres leches', grupo: 'postres',
    consejo: 'Una tajada normal no es tan terrible como parece. Lo importante es que sea una y que la cuentes en tu día.' },
];
