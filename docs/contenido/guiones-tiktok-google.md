# Guiones de TikTok para que Google nos encuentre

Encargo de Jonah, 15 de octubre de 2026. Tres guiones de grabación (Jonah a cámara) pensados para que el resumen con IA de Google lea en TikTok lo que la gente busca: "app para contar calorías de comida peruana", "contador de calorías", "calorías del lomo saltado / ají de gallina" y "Tabla Peruana del CENAN".

## Antes de grabar: lo que hace que Google lo lea

- **Google lee lo que se dice, no solo lo que se ve.** Las palabras clave van **dichas en voz, claras y despacio, en los primeros 5 segundos**, y repetidas en el texto en pantalla, en la descripción y en los hashtags.
- **Al subirlo, activa los subtítulos automáticos de TikTok** y revísalos: que digan bien "CENAN", "lomo saltado", "ají de gallina" y "Jonah Beast Fuel". Si se equivocan, corrígelos ahí mismo.
- **Di el nombre completo de la app en voz alta** ("Jonah Beast Fuel") una vez en cada video: así Google une la búsqueda con nuestro nombre. La marca va sola; lo de la comida peruana va en la frase de al lado, nunca pegado al nombre.
- **No nombramos a ninguna otra app.** Cuando Jonah dice "las apps que yo probaba", es su experiencia, sin decir cuáles.
- **Duración:** 35 a 42 segundos (Jonah pidió 30 a 45 para meter las palabras clave; los guiones de agencia normales son de 30).
- **Sobre los kilos:** contar su historia en su cuenta (contenido normal, no anuncio) está bien. **Si alguno de estos videos se usa como anuncio pagado, la escena de la historia se cambia** por una sin cifras (TikTok y Meta no aceptan kilos en anuncios de peso): "Así, comida a comida, cambié mi forma de comer".
- **Ningún antes/después:** en pantalla nunca va una foto de Jonah de antes.

## Datos que usan los guiones (de la lista de la app, `src/App.jsx`)

| Alimento | Por 100 g | 1 plato (400 g) | Media porción (200 g) | ¿Lleva arroz? |
|---|---|---|---|---|
| Lomo saltado | 175 kcal | **700 kcal** | 350 kcal | No: "🍚 Sin arroz: agrégalo aparte" |
| Ají de gallina | 165 kcal | **660 kcal** | 330 kcal | No: "🍚 Sin arroz: agrégalo aparte" |
| Arroz blanco cocido | 130 kcal | 150 g = **195 kcal** | | |

- Lomo saltado + 150 g de arroz: **unas 895 kcal** ("casi 900").
- Ají de gallina + 150 g de arroz: **unas 855 kcal**.
- Fuente de la base: Tablas Peruanas de Composición de Alimentos (CENAN/INS) como primera fuente y USDA cuando el alimento no está (`docs/alimentos-verificados.json`). Los platos preparados son estimados promedio: por eso Jonah dice "un plato normal" y "unas … calorías", nunca "exacto".
- **Antes de grabar, revisa en tu app que salga lo mismo** (plato de 400 g y la etiqueta 🍚). Si al grabar la foto da otros gramos, di el número que sale en tu pantalla.

## Calendario sugerido (TikTok)

Horas provisionales de Perú (12:30 a 1:30 pm y 7 a 9 pm) hasta que mandes tus horas más activas.

| Día | Hora | Red | Pieza | Tipo |
|---|---|---|---|---|
| Sábado 18 oct | 12:45 pm | TikTok personal de Jonah | Guion 1 · Lomo saltado y el arroz | Educativo |
| Martes 21 oct | 7:30 pm | TikTok personal de Jonah | Guion 2 · Tabla Peruana del CENAN | Autoridad |
| Jueves 23 oct | 1:00 pm | TikTok personal de Jonah | Guion 3 · Calorías en 10 segundos | Viral |

- Los tres van primero a tu **cuenta personal** (la prueba de 30 días sigue hasta el 3 de noviembre) con `?fuente=personal_tiktok`. Si quieres subirlos también a la cuenta de la app, hazlo 2 o 3 días después con `?fuente=tiktok_bio` en la bio de esa cuenta.
- Súbelos también como reel en Facebook (ahí llega a mucha más gente), con la misma descripción.
- Los tres no se pisan con la entrega del sábado: si esa semana ya hay un video de lomo saltado, mueve el Guion 1 a la semana siguiente para no repetir.

---

## Guion 1 · "¿Cuántas calorías tiene tu lomo saltado? Depende del arroz"

**Para dónde es:** TikTok, cuenta personal de Jonah (también reel de Facebook). Vertical 9:16. Unos 38 s (≈100 palabras). **Tipo: Educativo** (saber cuánto comes · sin dejar la comida peruana).

**Lugares:** mesa de comedor o de un local (escenas 1, 2, 4), de pie en la cocina (escena 3), calle o puerta de la casa (escenas 5 y 6). Hace falta un plato real de lomo saltado y un plato de arroz aparte.

| Escena | Lo que dice Jonah | Acción en pantalla | Cámara |
|---|---|---|---|
| 1 · Gancho (0–4 s) | "¿Cuántas calorías tiene tu lomo saltado? Depende de algo que casi nadie cuenta: el arroz." | Sentado a la mesa, levanta el plato de lomo saltado hacia la cámara y al decir "el arroz" señala el plato de arroz al costado. | Medio cuerpo, celular vertical a la altura de los ojos. Arranca hablando desde el primer cuadro, sin saludo. |
| 2 · Problema (4–11 s) | "Yo usaba un contador de calorías, buscaba lomo saltado y no salía. Y si salía, no me decía si llevaba arroz." | Muestra el celular a la cámara con cara de "¿y ahora?", encoge los hombros. | Cerca de la cara. Toma aparte para insertar: el dedo deslizando una lista en el celular. |
| 3 · Solución (11–18 s) | "Por eso hice mi propia app para contar calorías de comida peruana: Jonah Beast Fuel. Mira, le tomo foto." | De pie en la cocina, camina hacia la cámara con el plato y le toma foto con el celular. | Plano medio que se acerca (él camina 2 pasos). Toma aparte: la pantalla del celular mientras saca la foto. |
| 4 · Beneficio (18–27 s) | "Un plato normal de lomo saltado: unas 700 calorías. Y me avisa: sin arroz, agrégalo aparte. Con su arroz, casi 900." | Muestra la pantalla de la app con el resultado y la etiqueta 🍚; al decir "con su arroz" agrega el arroz en la app. | La pantalla del celular de cerca (toma aparte, sin reflejos), luego vuelve a su cara. |
| 5 · Historia (27–34 s) | "Así, comida a comida, hace unos años bajé 37 kilos. Y ahora bajé de 104 a 90 en dos meses y medio, con mi app, entrenando algunos días y con disciplina." | De pie en la calle o en la puerta, habla tranquilo, sin mostrar fotos de antes. | Medio cuerpo, de frente. |
| 6 · Llamado (34–38 s) | "No es dejar el lomo. Es saber cuánto comes. Tómale foto a tu plato gratis: link en mi perfil." | Señala hacia abajo (donde está su perfil) y sonríe. | Cerca de la cara. Quieto 2 s al final para el cierre del gorila. |

**Texto en pantalla (palabras grandes; en amarillo la más importante):**
1. "¿CUÁNTAS CALORÍAS TIENE TU **LOMO SALTADO**?" · ícono: plato
2. "NO SALÍA EN MI **CONTADOR DE CALORÍAS**" · ícono: lupa
3. "APP PARA CONTAR CALORÍAS DE **COMIDA PERUANA**" · ícono: cámara
4. "1 PLATO: **~700 KCAL**" → "🍚 SIN ARROZ: AGRÉGALO APARTE" → "CON ARROZ: **~900**" · ícono: arroz
5. "COMIDA A **COMIDA**" · ícono: fuego
6. "TÓMALE FOTO GRATIS → **LINK EN MI PERFIL**" · ícono: flecha · cierre "Jonah Beast Fuel · Comida a comida"

**Descripción para pegar:**
> ¿Cuántas calorías tiene el lomo saltado? Un plato normal anda por las 700, y sin contar el arroz. Por eso hice mi propia app para contar calorías de comida peruana: le tomas foto y te dice si le falta sumar el arroz. Guárdalo para tu próximo almuerzo. Pruébala gratis, link en mi perfil.

**Hashtags:** #lomosaltado #caloriascomidaperuana #contadordecalorias #comidaperuana #contarcalorias #jonahbeastfuel

**Link marcado (en la bio):** `https://jonahbeast.com/?fuente=personal_tiktok` (cuenta personal) · si va a la cuenta de la app: `https://jonahbeast.com/?fuente=tiktok_bio`

**Versión B del gancho para probar:** "Tu lomo saltado no tiene 700 calorías. Tiene casi 900. ¿Sabes por qué?" (mismo resto del guion).

---

## Guion 2 · "De dónde salen las calorías de mi app: la Tabla Peruana del CENAN"

**Para dónde es:** TikTok, cuenta personal de Jonah (también reel de Facebook). Vertical 9:16. Unos 42 s (≈110 palabras). **Tipo: Autoridad** (saber cuánto comes · sin dejar la comida peruana).

**Lugares:** escritorio con la laptop o el celular (escenas 1 y 2), cocina con un plato de ají de gallina (escenas 3 y 4), de pie en un lugar tranquilo (escenas 5 y 6).

| Escena | Lo que dice Jonah | Acción en pantalla | Cámara |
|---|---|---|---|
| 1 · Gancho (0–5 s) | "¿De dónde salen las calorías de un contador de calorías? En mi app, de la Tabla Peruana del CENAN." | En el escritorio, voltea el celular hacia la cámara con la app abierta en un plato peruano. | Cerca de la cara, celular vertical. Arranca hablando. |
| 2 · Problema (5–12 s) | "Cuando empecé, las apps que probaba usaban datos de afuera. Buscaba ají de gallina y no aparecía." | Niega con la cabeza, se ríe un poco. | Medio cuerpo. Toma aparte: escribiendo "ají de gallina" en el celular. |
| 3 · Solución (12–22 s) | "Por eso en Jonah Beast Fuel la primera fuente es la Tabla Peruana de Composición de Alimentos, del CENAN, del Instituto Nacional de Salud. Y los platos están como se sirven en casa: plato, unidad, cucharón. O en gramos, si usas balanza." | Camina hacia la cámara en la cocina; al decir "plato, unidad, cucharón" los cuenta con los dedos y señala el plato. | Plano medio que se acerca. Toma aparte: la app mostrando las medidas (plato, media porción) y el botón "⚖️ Lo pesé". |
| 4 · Beneficio (22–30 s) | "Un plato de ají de gallina: unas 660 calorías. Y te avisa: sin arroz, agrégalo aparte. Es un estimado, pero un estimado peruano." | Le toma foto al plato y muestra el resultado con la etiqueta 🍚. | El plato de cerca y después la pantalla del celular (tomas aparte). |
| 5 · Historia y criterio (30–38 s) | "No soy nutricionista. Hace unos años bajé 37 kilos, y ahora bajé de 104 a 90 en dos meses y medio con mi app, entrenando algunos días y con disciplina. A mí me funcionó saber cuánto como." | De pie, quieto, mirando a la cámara, tono tranquilo. | Medio cuerpo, de frente. |
| 6 · Llamado (38–42 s) | "Pruébala gratis, link en mi perfil. Y mándaselo a quien dice que con comida peruana no se puede contar calorías." | Señala hacia abajo y luego hace el gesto de "compartir" con la mano. | Cerca de la cara. Quieto 2 s al final. |

**Texto en pantalla (en amarillo la más importante):**
1. "¿DE DÓNDE SALEN LAS CALORÍAS DE TU **CONTADOR DE CALORÍAS**?" · ícono: signo de pregunta
2. "BUSCABA **AJÍ DE GALLINA**… Y NO ESTABA" · ícono: lupa
3. "**TABLA PERUANA DEL CENAN**" (debajo, chico: "Instituto Nacional de Salud") → "PLATO · UNIDAD · CUCHARÓN · ⚖️ GRAMOS" · ícono: libro
4. "1 PLATO: **~660 KCAL**" → "🍚 SIN ARROZ: AGRÉGALO APARTE" · ícono: arroz
5. "LO QUE **A MÍ** ME FUNCIONÓ" · ícono: corazón
6. "PRUÉBALA GRATIS → **LINK EN MI PERFIL**" · cierre "Jonah Beast Fuel · Comida a comida"

**Descripción para pegar:**
> ¿De dónde salen las calorías de mi app? De la Tabla Peruana de Composición de Alimentos del CENAN (Instituto Nacional de Salud), con los platos como se sirven en casa. Así cuentas las calorías del ají de gallina, del lomo saltado y de tu menú sin dejar la comida peruana. Mándaselo a quien dice que no se puede.

**Hashtags:** #tablaperuana #cenan #contadordecalorias #caloriascomidaperuana #ajidegallina #comidaperuana

**Link marcado (en la bio):** `https://jonahbeast.com/?fuente=personal_tiktok` · cuenta de la app: `https://jonahbeast.com/?fuente=tiktok_bio`

**Versión B del gancho para probar:** "Las calorías de mi app no las inventé: salen de la Tabla Peruana del CENAN."

**Ojo:** no decir "todas las calorías salen del CENAN" ni "es exacto". Lo verdadero es "la primera fuente" y "un estimado". Tampoco "aprobado por el INS" ni "oficial": el CENAN es la fuente de los datos, no nos avala.

---

## Guion 3 · "Así cuento calorías sin dejar la comida peruana (en 10 segundos)"

**Para dónde es:** TikTok, cuenta personal de Jonah (también reel de Facebook). Vertical 9:16. Unos 40 s (≈105 palabras). **Tipo: Viral (su día a día con la app)** (saber cuánto comes · sin dejar la comida peruana · comida a comida).

**Lugares:** mesa de almuerzo (oficina o casa) con un plato de ají de gallina con arroz (escenas 1 a 3), de pie en la cocina o la calle (escenas 4 a 6). En pantalla, un cronómetro de 10 s en la esquina durante las escenas 1 y 2.

| Escena | Lo que dice Jonah | Acción en pantalla | Cámara |
|---|---|---|---|
| 1 · Gancho (0–4 s) | "Así cuento calorías sin dejar la comida peruana. En diez segundos. Mira." | Pone el plato frente a la cámara y saca el celular, rápido. | Medio cuerpo; el plato entra al cuadro con un movimiento. Arranca hablando. |
| 2 · Foto (4–12 s) | "Foto al plato… y listo: ají de gallina, con su arroz aparte, como debe ser. Esta app para contar calorías de comida peruana ya sabe lo que es." | Toma la foto, muestra la pantalla con el ají y el arroz sumados. | El plato de cerca y luego la pantalla del celular (tomas aparte). |
| 3 · Voz (12–19 s) | "¿Sin tiempo para la foto? Le hablo: 'almorcé lomo saltado con arroz'. Y lo anota." | Habla al celular como si mandara un audio. | Cerca de la cara con el celular a un lado. Toma aparte: la pantalla anotando. |
| 4 · Más formas (19–26 s) | "También escribo, escaneo el código de barras o toco mis favoritos. Y si no sé qué comer, le pregunto a Beast, mi gorila: ¿qué como?" | De pie, cuenta con los dedos cada forma; al final muestra el chat de Beast. | Plano medio que se acerca (camina 2 pasos). Tomas aparte: el escáner sobre una lata y el chat de Beast. |
| 5 · Historia (26–34 s) | "Así, comida a comida, hace unos años bajé 37 kilos. Y ahora de 104 a 90 en dos meses y medio, con Jonah Beast Fuel, entrenando algunos días y con disciplina." | De pie, tranquilo. | Medio cuerpo, de frente. |
| 6 · Llamado (34–40 s) | "Es gratis y tienes 7 días de Premium sin tarjeta. Link en mi perfil. Guárdalo para tu próximo almuerzo." | Señala hacia abajo y hace el gesto de "guardar". | Cerca de la cara. Quieto 2 s al final. |

**Texto en pantalla (en amarillo la más importante):**
1. "CUENTO CALORÍAS EN **10 SEGUNDOS**" + cronómetro · ícono: reloj
2. "📸 **FOTO**" → "AJÍ DE GALLINA + ARROZ APARTE" · ícono: cámara
3. "🎤 **VOZ**" · ícono: micrófono
4. "✍️ ESCRIBIR · CÓDIGO DE BARRAS · ⭐ FAVORITOS" → "🦍 **BEAST: ¿QUÉ COMO?**" · ícono: gorila (el logo original, sin cambiarlo)
5. "COMIDA A **COMIDA**" · ícono: fuego
6. "GRATIS · 7 DÍAS PREMIUM SIN TARJETA → **LINK EN MI PERFIL**" · cierre "Jonah Beast Fuel · Comida a comida"

**Descripción para pegar:**
> Así cuento calorías sin dejar la comida peruana: foto al plato, voz o código de barras, y en segundos sé cuánto tiene mi ají de gallina con su arroz. Es la app para contar calorías que hice para mí. Gratis, con 7 días de Premium sin tarjeta: link en mi perfil.

**Hashtags:** #contadordecalorias #caloriascomidaperuana #comidaperuana #almuerzoperuano #contarcalorias #jonahbeastfuel

**Link marcado (en la bio):** `https://jonahbeast.com/?fuente=personal_tiktok` · cuenta de la app: `https://jonahbeast.com/?fuente=tiktok_bio`

**Versión B del gancho para probar:** "¿Contar calorías comiendo ají de gallina? Te lo hago en 10 segundos."

**Ojo:** la nota de voz a Beast es de Premium y de la prueba; anotar con foto, escribir, código y favoritos funcionan también en la gratis. Por eso el llamado dice "7 días de Premium", sin prometer que todo es gratis para siempre.

---

## Consejos de grabación (los tres)

- Luz de frente: ventana o local bien iluminado, nunca la ventana detrás.
- Celular en vertical y a la altura de los ojos.
- 2 segundos quieto antes y después de cada frase (para cortar limpio).
- Graba cada escena 2 o 3 veces.
- Tomas extra sin hablar: el plato de cerca, la app en el celular, tomarle foto a la comida, el escáner sobre un producto. Así el editor cubre los cortes.
- De pie y en lugares distintos en cada escena, y **camina hacia la cámara en la escena de la solución** (como el segundo video de la agencia que te gustó).
- Habla despacio en las palabras clave ("contador de calorías", "Tabla Peruana del CENAN", "lomo saltado", "ají de gallina"): los subtítulos automáticos las tienen que escribir bien.
- La pantalla del celular: brillo al máximo y sin notificaciones (modo avión o "no molestar").

## Qué mirar después

- **En la app (lo que importa):** registros con fuente `personal_tiktok` (o `tiktok_bio`) en los 7 días después de cada video, y cuántos de ellos anotan su primera comida.
- **En TikTok:** espectadores (personas, no visualizaciones), tiempo promedio de reproducción, % que lo terminó, guardados, compartidos y visitas al perfil.
- **En Google (lo nuevo de este encargo):** 2 a 4 semanas después de subirlos, busca en Google "¿cuál es la mejor app para contar calorías de comida peruana?" y "calorías del lomo saltado" y mira si en el resumen con IA aparece Jonah Beast Fuel o alguno de estos videos como fuente. Manda captura. Es una señal lenta y nadie la garantiza: Google decide qué cita.
- Si un gancho rinde mucho mejor que el otro (A o B), lo repetimos con otros platos (seco, arroz chaufa, pollo a la brasa) en las siguientes entregas.
