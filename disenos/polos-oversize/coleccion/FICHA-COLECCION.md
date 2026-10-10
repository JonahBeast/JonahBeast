# Ficha para la imprenta · Colección de 3 polos oversize Jonah Beast Fuel

Tres diseños nuevos, distintos entre sí y distintos del primer polo ("FUEL" con el gorila de fuego, que sigue en `../imprenta/`).

**Vista rápida para Jonah:** `mockups/coleccion-resumen.jpg` (los 3 diseños, frente y espalda, en su color de polo principal). Cada diseño tiene además su hoja con las 4 vistas (negro y crema): `mockups/diseno-N-...-mockups-4-vistas.jpg`.

## Cosas que valen para los 3

- Todos los archivos de `imprenta/` son **PNG con fondo transparente, a 300 dpi y ya al tamaño real** (no hay que agrandarlos ni achicarlos).
- Cada pieza viene en dos versiones: `-polo-negro` (letras crema) y `-polo-crema` (letras carbón). Hay que usar la del color de polo que se va a imprimir.
- "HPS" = el punto más alto del hombro, justo donde empieza el cuello. Las medidas son con el polo extendido, talla de referencia **L oversize** (pecho ≈ 62 cm, largo ≈ 74 cm). En S y M se puede reducir la espalda un 10 %; en XL y XXL dejarla igual.
- **Sin cifras de kilos, sin promesas, sin fotos de personas.** No lleva año ("EST.") porque en el proyecto no hay ningún dato que confirme el año de inicio; si Jonah confirma que fue 2025, se agrega en minutos.
- Tela sugerida: algodón peinado 20/1 o 24/1, 200-240 g (heavyweight), cuello rib de 2-2,5 cm, hombro caído.
- Pedir siempre **1 polo de prueba** antes del lote.

## Colores

| Color | HEX | Pantone aproximado | Uso |
|---|---|---|---|
| Naranja ají | `#E8590C` | 1655 C | Color de acento en los 3 diseños |
| Crema | `#F7F2E7` | 9224 C | Textos y rellenos en el polo negro |
| Carbón | `#16110D` | Black 6 C | Textos y líneas en el polo crema; líneas del gorila |

Los 3 diseños usan **solo estos colores planos** (sin degradados ni brillos), por eso también sirven para serigrafía.

## Sobre el gorila (importante)

El gorila de los diseños 2 y 3 **no es la imagen original agrandada**: lo redibujé por computadora como un sello de 3 tintas planas (carbón, naranja y crema), con bordes limpios. Por eso **se imprime nítido** al tamaño real y ningún archivo de esta colección es borrador.
Ojo: como el original es chico (cara de 200 px y cuerpo de 400 px), el redibujo **simplifica algunos detalles finos** (pelo, sombras). Se ve como un estampado de serigrafía y le queda bien a este estilo. Si Jonah consigue el logo original en alta (PNG de 4.000 px o más, o mejor en vector), se vuelve a generar con más detalle (`fuente/sello.py` y `fuente/poster.py`).

---

## Diseño 1 · "COMIDA A COMIDA" (tipográfico, sin gorila)

La frase repetida 7 veces; cada línea se va llenando de naranja como una barra de progreso, hasta quedar llena abajo: el cambio llega poco a poco.

| Pieza | Archivo | Tamaño | Dónde va |
|---|---|---|---|
| Espalda | `imprenta/diseno-1-comida-a-comida-espalda-polo-negro.png` / `-crema.png` | 32 × 32,7 cm | Centrada; borde de arriba a 8 cm bajo la costura del cuello de atrás (≈10 cm bajo el HPS). |
| Frente | `imprenta/diseno-1-comida-a-comida-frente-polo-negro.png` / `-crema.png` | 9,7 × 1,8 cm | Pecho izquierdo de quien lo usa; borde de arriba a 12 cm bajo el HPS, centro de la pieza a 10 cm del centro del polo. Interruptor "BEAST MODE: ON". |
| Nuca (opcional) | `imprenta/diseno-1-comida-a-comida-nuca-polo-negro.png` / `-crema.png` | 7 × 1 cm | Por fuera, centrada, 1,5 cm bajo la costura del cuello. |

- **Colores:** 2 tintas (naranja + crema en polo negro; naranja + carbón en polo crema).
- **Técnica:** **serigrafía** (ideal: 2 colores planos, sale barato en cantidad y muy durable). DTF también sirve para pocas unidades.
- **Polo recomendado:** **negro** (el principal); crema también funciona.
- Nota: el contorno de las letras mide ~1,3 mm de grosor y el texto "JONAH BEAST FUEL" del frente ~2 mm de alto; la serigrafía y el DTF lo sacan bien. Si la imprenta dice que es muy fino, avisar y lo engroso.

## Diseño 2 · "ATHLETIC DEPT." (escudo tipo club universitario)

Insignia redonda con la cara del gorila, "JONAH BEAST" en arco con letras varsity (naranja con doble borde), cinta "FUEL ATHLETIC DEPT." y "LIMA ★ PERÚ".

| Pieza | Archivo | Tamaño | Dónde va |
|---|---|---|---|
| Espalda | `imprenta/diseno-2-athletic-dept-espalda-polo-negro.png` / `-crema.png` | 30 × 29,3 cm | Centrada; borde de arriba a 8 cm bajo la costura del cuello de atrás. |
| Frente | `imprenta/diseno-2-athletic-dept-frente-polo-negro.png` / `-crema.png` | 24 × 9,1 cm | Pecho al centro; borde de arriba a 12 cm bajo el HPS. |
| Parche de manga | `imprenta/diseno-2-athletic-dept-manga-polo-negro.png` / `-crema.png` | 7 × 7 cm (se puede bajar a 6 cm) | Manga izquierda de quien lo usa, centrado en la manga, a unos 8 cm del hombro. |
| Nuca (opcional) | `imprenta/diseno-2-athletic-dept-nuca-polo-negro.png` / `-crema.png` | 7 × 1 cm | Por fuera, centrada, 1,5 cm bajo la costura del cuello. |

- **Colores:** 3 tintas (naranja, carbón y crema). En el polo del mismo color, la tinta igual al polo se puede dejar sin imprimir (la imprenta lo sabe hacer: "usar el polo como color").
- **Técnica:** **serigrafía** para cantidad (3 colores planos) o **DTF** para pocas unidades.
- **Polo recomendado:** **crema** (look vintage universitario, el principal); el negro también queda muy bien.

## Diseño 3 · "SIGUE COMIENDO PERUANO" (póster vintage)

Póster con rayos de sol, el gorila de medio cuerpo saliendo desde abajo, "BEAST" gigante detrás y la franja "SIGUE COMIENDO PERUANO". Tiene un desgaste vintage (poritos sin tinta) a propósito.

| Pieza | Archivo | Tamaño | Dónde va |
|---|---|---|---|
| Espalda | `imprenta/diseno-3-poster-peruano-espalda-polo-negro.png` / `-crema.png` | 32 × 43,3 cm | Centrada; borde de arriba a 7 cm bajo la costura del cuello de atrás (≈9 cm bajo el HPS). |
| Frente | `imprenta/diseno-3-poster-peruano-frente-polo-negro.png` / `-crema.png` | 8,4 × 7,2 cm | Pecho izquierdo de quien lo usa; borde de arriba a 11 cm bajo el HPS, centro a 10 cm del centro del polo. |
| Nuca (opcional) | `imprenta/diseno-3-poster-peruano-nuca-polo-negro.png` / `-crema.png` | 7 × 1 cm | Por fuera, centrada, 1,5 cm bajo la costura del cuello. |

- **Colores:** 3 tintas (naranja, crema y carbón).
- **Técnica:** **DTF** recomendado (el desgaste tiene puntitos muy finos y el DTF los respeta). En serigrafía se puede, pero pedir malla fina (120-150 hilos/cm) para que no se tapen los poros.
- **Polo recomendado:** **negro** (el principal, los rayos naranjas resaltan más); el crema da un aire de póster antiguo.
- El desgaste es intencional: decirle a la imprenta que **no lo "limpie"**.

---

## Cómo se rehacen (por si hay cambios)

Todo está en `fuente/`:
- `arte-coleccion.html`: el arte de las 3 piezas (textos, medidas, colores).
- `render-coleccion.mjs`: genera los PNG de `imprenta/` (luego `distress.py` le pone el desgaste al diseño 3: espalda con `7 0.8 1`, frente con `7 0.6 0.4`).
- `mockup.html` y `render-mockups.mjs`: generan los mockups.
- `sello.py` (cara del gorila) y `poster.py` (gorila de cuerpo entero): redibujan el gorila en tintas planas.
