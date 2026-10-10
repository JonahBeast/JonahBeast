# Ficha para el taller de bordado · Polos piqué Jonah Beast Fuel

## Lo más importante: el gorila no se cambia

El gorila es **siempre el logo original de Jonah Beast** (`bordado/logo-original-jonah-beast.png`, igual a `public/logo-marca.webp`). Nosotros **no lo redibujamos ni lo simplificamos**.

- El **taller** hace el "ponchado": pasa el logo a puntadas de bordado con su programa. Le entregamos el logo original, el tamaño y la ubicación.
- El taller tiene que **respetar el logo lo más fiel posible**: la misma forma, los mismos colores (marrón oscuro de la piel de roca, gris de la cara, naranja y amarillo del fuego, naranja de las letras y de la pistola de combustible) y el contorno naranja. No debe quitarle partes ni cambiarlo.
- Antes de hacer el lote, el taller debe **bordar una muestra** y mandar foto a Jonah para que la apruebe.
- **Aviso:** el logo que tenemos mide solo **400 × 480 píxeles**. Para que el taller lo copie bien, conviene que **Jonah consiga el archivo original en alta** (de quien diseñó el logo: PNG de 2.000 px o más, o mejor en vector: AI, EPS, SVG o PDF) y se lo mande al taller.
- El logo tiene mucho detalle (fuego, grietas, letras chicas en el pecho). A 7-9 cm, el bordado siempre pierde algo de detalle. Por eso hay que pedirle al taller que diga, con la muestra en la mano, si se ve bien o si hace falta subir el tamaño. Más grande se ve mejor.

## Las 3 propuestas

Solo cambian la ubicación, el tamaño, el color del polo y los textos de la marca. "HPS" es el punto más alto del hombro, justo donde empieza el cuello. Las medidas son en talla **L**, con el polo extendido.

| Propuesta | Qué lleva | Medida | Ubicación |
|---|---|---|---|
| **1 · Logo en el pecho** | Solo el logo original | **5,8 × 7 cm** (ancho × alto) | Pecho izquierdo de quien lo usa. Centro del logo a **10 cm del centro del polo** (de la línea de botones). Borde de arriba a **14,5 cm bajo el HPS**. |
| **2 · Logo + manga** | Logo original en el pecho | **7,5 × 9 cm** | Pecho izquierdo. Centro a **10 cm del centro del polo**. Borde de arriba a **13,5 cm bajo el HPS**. |
| | "JONAH BEAST FUEL" en la manga | **5,9 × 0,7 cm** (letras de 6 mm) | Manga izquierda, centrado en el ancho de la manga, horizontal (paralelo al borde). La línea de abajo va a **4 cm sobre el borde de la manga**. |
| **3 · Logo + COMIDA A COMIDA** | Logo original en el pecho | **6,7 × 8 cm** | Pecho izquierdo. Centro a **10 cm del centro del polo**. Borde de arriba a **14 cm bajo el HPS**. |
| | "COMIDA A COMIDA" atrás | **7,2 × 0,7 cm** (letras de 6 mm) | Espalda, centrado. Borde de arriba a **2 cm bajo la costura del cuello de atrás**. |

**Colores de polo:** carbón/negro o crema/hueso (en el naranja, el fuego del logo se perdería).

## Archivos para el taller (carpeta `bordado/`)

| Archivo | Qué es |
|---|---|
| `logo-original-jonah-beast.png` y `.webp` | El logo original, sin ningún cambio (400 × 480 px, fondo transparente). |
| `manga-jonah-beast-fuel-polo-carbon.svg` / `.png` | Texto de la manga para el polo carbón: letras crema y "FUEL" naranja. |
| `manga-jonah-beast-fuel-polo-crema.svg` / `.png` | Texto de la manga para el polo crema: letras carbón y "FUEL" naranja. |
| `espalda-comida-a-comida-polo-carbon.svg` / `.png` | Texto de la espalda para el polo carbón, en crema. |
| `espalda-comida-a-comida-polo-crema.svg` / `.png` | Texto de la espalda para el polo crema, en carbón. |

- Los textos van en vector `.svg`, ya al tamaño real en milímetros y con las letras convertidas en formas (no hace falta instalar ninguna fuente). También van en PNG a 300 dpi con fondo transparente.
- Para ver cómo queda puesto: carpeta `mockups/` y `pique-resumen.jpg`.

### Colores de hilo de los textos

| Hilo | HEX | Madeira Classic 40 (aprox.) | Isacord 40 (aprox.) |
|---|---|---|---|
| Crema | `#F7F2E7` | 1071 Off White / 1082 Ecru | 0670 Cream / 0761 Oat Flour |
| Carbón | `#16110D` | 1000 Black | 0020 Black |
| Naranja ají | `#E8590C` | 1078 Tangerine o 1378 | 1300 Paprika o 1102 Pumpkin |

Las referencias de Madeira e Isacord son **aproximadas** (no se compararon con la carta física). El taller debe elegir el hilo con su carta en la mano. Los colores del logo se toman del logo mismo.

## Notas para el taller

1. **Muestra bordada antes del lote** (1 polo por propuesta), con foto para que Jonah apruebe.
2. Densidad normal para piqué, con **entretela de recorte** y **base (underlay)**, para que el relieve del piqué no se vea entre las puntadas. Las letras de 6 mm van en puntada satín.
3. **Polo:** piqué **100% algodón** (o algodón con poliéster si lo quieren más resistente para el gym), de **200-220 g/m²**, con cuello y puños tejidos (rib) y 2 o 3 botones del mismo tono del polo.
4. Lavar al revés y no planchar encima del bordado.

## Para volver a generar los archivos

En `fuente/`: `python3 generar.py` (textos SVG), `node png.mjs` (PNG a 300 dpi), `node mockups.mjs` (mockups) y `node resumen.mjs` (resumen; antes hay que recortar los frentes en `fuente/frentes/`). Los scripts de Node necesitan la variable `CHROME` con la ruta de Chromium.
