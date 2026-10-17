# Imágenes de los platos: guía para dibujarlas

Aprobado por Jonah el 17 de octubre de 2026: una imagen chiquita de cada plato a la izquierda de su nombre (como Fitia), en lugar del emoji. **No son fotos: son ilustraciones dibujadas en código** (SVG pasado a WebP de 160×160, unos 4 a 5 KB cada una).

## Dónde se ven

Solo en la **"base de datos"**: donde la gente **busca** un plato para saber sus calorías, como hace Fitia (decisión de Jonah, 17 oct):

- la portada: las fichas de platos y los resultados de "¿Cuántas calorías tiene tu plato?";
- "🔎 Consultar calorías" dentro de la app, cuando llegue (rama `claude/consultar-calorias`: importa `MiniaturaPlato` de `src/miniaturaPlato.jsx`).

**No** van al registrar: ni en "Escribir", ni en el buscador de alimentos al anotar, ni en la hoja de primera comida, la cantidad, lo anotado del día, favoritos, frecuentes, Beast, la confirmación o "Compartir este plato". Ahí anotar queda rápido y limpio, con el emoji de siempre. En la portada, si un plato no tiene imagen, no sale nada en su lugar.

## El estilo (igual en todas)

- Un plato redondo visto **desde arriba**, centrado, sobre **fondo carbón** (`#16110D`) con un **aro naranja ají** fino (`#E8590C`) y una sombra suave. Las 3 muestras: `lomo-saltado-con-arroz.svg`, `ceviche-de-pescado.svg` y `pollo-a-la-brasa-con-papas-y-ensalada.svg` (generador `gen/platos.py`).
- Estilo plano con volumen sutil (degradados, sombras chicas), colores reales de la comida.
- Se ve a 36–48 px en el celular: **pocas piezas y grandes**, que se reconozcan por color y forma. Nada de texto, logos ni marcas (ni en la gaseosa).
- Cuadrado 1:1 y el plato ocupando ~85 % del cuadro (el programa recorta al centro).
- **Exacta:** la imagen muestra solo lo que suman las calorías de ese alimento en la app. Si el plato no trae arroz, no se dibuja arroz; si las papas van aparte, no se dibujan papas. Las bebidas en un vaso visto desde arriba (o en ¾), sin botella.

## Cómo se suben a la app

1. Cada archivo se llama como el plato, con su versión: `lomo-saltado-con-arroz.svg`, `huevo-de-gallina-frito.svg` (es el mismo nombre del link `?q=` de "Compartir este plato"; también sirve "Huevo de gallina (Frito).svg").
2. `node scripts/preparar-fotos-platos.mjs <carpeta>`: dibuja cada SVG, lo recorta en cuadrado, lo reduce a 160×160, lo pasa a WebP (menos de 8 KB), lo guarda en `public/platos/` y lo anota en `src/fotosPlatos.json`. Con `--probar` solo muestra los pesos.
3. Si un nombre no calza con ningún alimento, el programa avisa y sugiere los parecidos. Para un alimento agregado desde el panel (`alimentos_extra`), se pasa su clave: `--clave "Nombre (versión)"`.
4. `npm run build` y recorrer la versión de prueba a 390 px.

## Los 40 más anotados (y cómo debe verse cada uno)

Alumnos reales, últimos 60 días (18 ago – 17 oct 2026), contados en `historial.meal_plan` (cada vez que un alimento se anotó en una comida). Sin los verificadores de Google Play (`esVerificadorPlay`: registrados desde el 14 oct sin celular de Perú) ni las cuentas de Jonah (`martin`, `jhc10_05apple`, `4hfy7tnvwh`). La porción es la medida por defecto de la app: la imagen debe mostrar esa cantidad.

| # | Alimento (clave exacta) | Veces | Alumnos | Porción de la app | Cómo debe verse |
|---|---|---|---|---|---|
| 1 | Arroz blanco (Cocido) | 155 | 25 | 150 g | Solo arroz blanco graneado, en un montoncito redondo (como sale del molde). Sin guiso, sin menestra. |
| 2 | Pan francés (-) | 152 | 17 | 1 unidad (35 g) | Un pan francés entero, dorado, con su corte arriba. Sin relleno ni mantequilla. |
| 3 | Plátano de seda (Cruda) | 94 | 17 | 1 unidad (120 g) | Un plátano de seda amarillo entero, con cáscara. Sin cortar. |
| 4 | Huevo de gallina (Cocido) | 80 | 27 | 1 unidad (50 g) | Huevo sancochado partido a la mitad (clara blanca, yema amarilla firme). Sin aceite. |
| 5 | Huevo de gallina (Frito) | 69 | 14 | 1 unidad (50 g) | Huevo frito: clara con borde dorado y yema entera. Sin pan, sin arroz. |
| 6 | Café negro (Con azúcar) | 67 | 11 | 1 vaso (200 ml) | Taza de café negro (sin leche ni espuma) con una cucharita de azúcar al lado para decir "con azúcar". |
| 7 | Palta (Cruda) | 61 | 17 | 1 unidad (200 g) | Palta entera partida en dos, una mitad con pepa. Sin pan. |
| 8 | Pollo pechuga (Cocida) | 52 | 16 | 1 filete (120 g) | Un filete de pechuga a la plancha, sin piel, sin hueso, sin apanar. Sin guarnición. |
| 9 | Fresa (Cruda) | 45 | 8 | 1 unidad (15 g) | Fresas rojas enteras con su hojita (2–3 para que se reconozca). Sin crema ni azúcar. |
| 10 | Avena / quinua de bebida (Con azúcar) | 44 | 9 | 1 vaso (200 ml) | Vaso de avena/quinua de bebida, color crema espeso, con canela en polvo arriba. Sin leche aparte. |
| 11 | Agua (-) | 41 | 7 | 1 vaso (200 ml) | Vaso de agua transparente con un toque celeste. Nada más. |
| 12 | Gaseosa regular (-) | 40 | 10 | 1 vaso (200 ml) | Vaso con gaseosa y burbujas, **sin botella ni logo**. **Oscura tipo cola** (aprobado por Jonah el 17 oct), con burbujas y hielo, sin marca. |
| 13 | Papa (Cocida) | 40 | 17 | 1 unidad (150 g) | Una papa sancochada entera (o partida), con cáscara amarilla clara. Sin huancaína ni mantequilla. |
| 14 | Avena en hojuelas (Cruda) | 30 | 5 | 150 g | Hojuelas de avena secas en un bowl (sin leche, sin agua). Ojo: es avena cruda, no la preparada. |
| 15 | Pan integral (-) | 28 | 12 | 1 rebanada (30 g) | Una rebanada de pan integral (miga marrón con granos). Sin relleno. |
| 16 | Yogur griego natural (-) | 26 | 7 | 1 taza (240 g) | Bowl de yogur griego blanco, espeso. Sin fruta, sin granola, sin miel. |
| 17 | Té / infusión (Con azúcar) | 26 | 5 | 1 vaso (200 ml) | Taza de té/infusión color ámbar con la bolsita y una cucharita de azúcar al lado. |
| 18 | Arroz blanco (Crudo) | 24 | 12 | 150 g | Granos de arroz crudo (secos, blancos, sueltos) en un bowl. Debe verse distinto al cocido. |
| 19 | Huevo de gallina (Crudo) | 24 | 7 | 1 unidad (50 g) | Huevo entero con cáscara (marrón claro). Sin cocinar. |
| 20 | Manzana (Cruda) | 23 | 10 | 1 unidad (180 g) | Una manzana roja entera con hojita. |
| 21 | Arroz chaufa (-) | 22 | 13 | 1 plato (400 g) | Chaufa **de pollo**: arroz frito dorado con trocitos de pollo, huevo revuelto y cebollita china. Sin wantán ni sopa. |
| 22 | Pollo al horno (-) | 21 | 9 | 1 presa (200 g) | **Retirado el 16 oct**: ya no se ofrece (ahora es pierna, entrepierna o pecho, con o sin piel). No se dibuja; están dibujadas sus 6 versiones (pierna, entrepierna o pecho, con o sin piel; presa sola, sin papas ni ensalada). |
| 23 | Proteína en polvo (whey) (-) | 21 | 4 | 1 scoop (30 g) | Un scoop de polvo (color vainilla/chocolate claro) sobre un montoncito. Sin vaso de batido ni marca. |
| 24 | Café con leche (Con azúcar) | 21 | 8 | 1 vaso (200 ml) | Taza de café con leche (color caramelo claro) con cucharita de azúcar al lado. |
| 25 | Queso fresco (-) | 21 | 12 | 1 tajada (30 g) | Una tajada de queso fresco blanco (rectangular). Sin pan. |
| 26 | Avena (Cocida) | 19 | 8 | 150 g | Bowl de avena cocida (papilla crema). Sin fruta, sin canela encima (para no confundir con la de bebida). |
| 27 | Carne de res (bistec) (Cocida) | 18 | 9 | 150 g | Un bistec de res a la plancha, marrón, sin hueso. Sin papas, sin arroz, sin huevo. |
| 28 | Fideos / pasta (Cocidos) | 18 | 5 | 1 plato (220 g) | Fideos tipo spaghetti cocidos, **sin salsa** (color trigo). Sin queso. |
| 29 | Papas fritas (comida rápida) (-) | 18 | 7 | 1 porción (150 g) | Papas fritas en bastones, doradas, en montoncito. Sin salchicha, sin cremas. |
| 30 | Lomo saltado (-) | 16 | 8 | 1 plato (400 g) | **Retirado el 17 oct (#483)**: ahora es "Lomo saltado (Con papas fritas)" (carne, cebolla roja, tomate, ají amarillo y papas fritas) y "(Sin papas fritas)" (carne, cebolla, tomate y ají; sin papas ni arroz). Lo mismo para "Lomo saltado con arroz" y "Saltado de pollo". Las 6 están dibujadas. |
| 31 | Almendras (Crudas) | 16 | 3 | 1 puñado (30 g) | Un puñado de almendras con cáscara marrón (piel). Sin sal. |
| 32 | Sopa de pollo con fideos (-) | 16 | 6 | 1 plato (400 g) | Plato hondo de caldo con fideos, una presa chica de pollo y verduras (zanahoria, apio). Sin pan ni arroz. |
| 33 | Lenteja (Cocida) | 16 | 7 | 1 taza (180 g) | Lentejas cocidas (guiso marrón), solas. **Sin arroz** (hay "Menestra de lentejas con arroz" aparte). |
| 34 | Ceviche de pescado (-) | 15 | 8 | 1 plato (300 g) | Cubos de pescado blanco con cebolla roja en juliana y ají limo. **Sin camote, sin choclo, sin cancha**: en la app van aparte (si se dibujan, se cuentan dos veces). Corregida (17 oct): sin camote, choclo ni lechuga. |
| 35 | Papaya (Cruda) | 15 | 5 | 150 g | Trozos o una tajada de papaya naranja (sin pepas). |
| 36 | Chicha morada con azúcar (-) | 14 | 4 | 1 vaso (200 ml) | Vaso de chicha morada (morado oscuro) con trocitos de piña/manzana. Sin botella ni logo. |
| 37 | Tamal (-) | 14 | 6 | 1 unidad (180 g) | Tamal abierto sobre su hoja de plátano (masa amarilla, con su presa). **Sin salsa criolla ni pan.** Relleno: **de pollo** (aprobado por Jonah el 17 oct), con una aceituna. |
| 38 | Jamón inglés (-) | 13 | 3 | 1 tajada (20 g) | Una tajada de jamón rosado doblada. Sin pan. |
| 39 | Tomate (Crudo) | 13 | 7 | 100 g | Un tomate rojo entero o en rodajas. Sin aliño. |
| 40 | Tallarines rojos con pollo (-) | 13 | 3 | 1 plato (400 g) | Tallarines en salsa roja **con su presa de pollo** encima (ya está incluida). Sin papa a la huancaína ni arroz. |

**Siguientes (por si se retira otro):** Quinua (Cocida) 12 · Carne de res (lomo fino) (Cocida) 12 (1 solo alumno) · Arroz con pollo (-) 12 · Tallarines verdes (-) 12.

**También la portada** (las 6 fichas, que ve todo el que llega): Lomo saltado con arroz (Con papas fritas), Ceviche de pescado (-) (#34), Pollo a la brasa con papas y ensalada (-) ✓ muestra hecha, Ají de gallina (-) (sin arroz y sin papa: solo el ají con huevo y aceituna), Arroz con pollo (-) (arroz verde **con su presa**, sin papa a la huancaína) y Arroz chaufa (-) (#21). Las 6 están dibujadas.

**Dibujadas (17 oct): 60.** Los 38 de la lista que siguen vigentes, las 6 del pollo al horno, las 6 del lomo y saltado de pollo (con y sin papas fritas, con y sin arroz), las 6 fichas de la portada y los platos de un toque de la primera comida (pan con pollo y pan con jamonada en pan blanco, yogur natural, mandarina, tallarines verdes, caldo de gallina y estofado de pollo), que también se buscan en la portada. **Faltan:** los cortes nuevos del pollo a la brasa (pierna, entrepierna o pecho, con o sin piel, 1/4 u 1/8): hoy salen sin imagen. Se dibujan con `python3 -I scripts/ilustraciones-platos/dibujar.py <carpeta>` (cada plato es una función con su nombre de archivo) y se pasan a la app con el script de abajo. El pollo a la brasa con papas y ensalada es la muestra aprobada (`muestras.py`).

## Peso en la app

60 imágenes: **180 KB en total** (2,0 a 4,9 KB cada una; ninguna pasa de 8 KB). No se descargan al abrir la app: cada una baja solo cuando aparece en pantalla.
