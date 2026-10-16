# Jonah Beast Fuel — reglas para Claude

## Cómo comunicarte conmigo

- Respóndeme siempre en **español**.
- No soy programador: explica los cambios en **palabras simples**, sin jerga técnica. Si un término técnico es inevitable, explícalo en una frase.

## Flujo de trabajo

- Cuando termines un cambio, súbelo a la rama de trabajo y **espera a que Vercel construya la versión de prueba**. Luego dame el **link directo** a esa versión con `?preview=1` al final (por ejemplo `https://...vercel.app/?preview=1`). Ese parámetro hace que mis propias visitas no cuenten en las métricas de la landing.
- **Nunca hagas el merge** de un pull request sin que yo lo pida explícitamente.
- Cuando hagas una mejora, **busca todos los lugares de la app donde pasa lo mismo y propónmelos juntos en el mismo cambio**, para que la experiencia del alumno quede pareja (ej. si el peso pasa a regla deslizable, que sea en todas las pantallas donde se pone el peso).
- **Sé proactivo: no arregles solo el caso que te muestro** (pedido de Jonah, 13 de octubre, tras el atún en lata). Cuando reporte un problema, antes de entregar:
  1. **Busca la causa, no el síntoma**, y revisa **todos los casos que tienen esa misma causa**: los alimentos de la lista de la app, **los que se agregan desde el panel** (`alimentos_extra`, revisándolos en la base) y los productos escaneados.
  2. Revisa **todas las formas de hacer lo mismo** (foto, código, escribir, voz, favoritos, Beast, WhatsApp) y que se comporten igual.
  3. **Lo nuevo se ve y funciona como lo que ya existe** (ej. una tarjeta nueva lleva el mismo ✓, kcal a la derecha y botones que las demás).
  4. Arréglalo todo en el mismo PR y dime en palabras simples **qué más encontraste**. Si algo es grande o cambia una decisión suya, propónmelo en vez de hacerlo.
  5. Respeta siempre las dos formas de medir: **medida casera** (plato, unidad, lata) para quien no pesa y **gramos** ("⚖️ Lo pesé") para quien usa balanza.
- **Los detalles importan: queremos dar la mejor experiencia.** Antes de dar un cambio por terminado, recórrelo como lo haría el alumno, de principio a fin: qué ve justo después de tocar cada botón, si queda claro que se guardó, si la pantalla lo lleva a lo que acaba de hacer, si algo queda abierto o desordenado, y si todas las formas de hacer lo mismo (foto, código, escribir, voz, atajos…) se comportan igual. Si encuentras un detalle así, arréglalo en el mismo cambio o propónmelo.

## App de Android (Google Play)

- **Mientras la app esté en prueba cerrada, cada semana con mejoras se sube una versión nueva a Google Play** (subir `appVersionCode` y `appVersionName` en `android/twa-manifest.json`), con notas de novedades que digan qué se mejoró gracias a los verificadores. Aunque la app de Play Store muestra jonahbeast.com y los cambios se ven solos, Google solo cuenta las versiones subidas a la prueba (lo pidió al rechazar el acceso a producción el 11 de octubre). Claude avisa a Jonah cuándo toca, compila el `.aab` y lo firma con la llave del Drive (con su permiso cada vez); Jonah lo sube. Pasos en `android/LEEME.md`.
- Antes de entregar una versión, revisar los requisitos actuales de Google Play (por ejemplo, la versión mínima de Android que exige).

## Base de datos y Supabase (proyecto `jnhvpjrxilubkyhculoh`)

- **Nunca borres ni modifiques datos de alumnos, pagos o cuentas sin preguntarme antes**, y dime exactamente qué filas vas a tocar.
- **Los cambios en la estructura de la base** (columnas o tablas nuevas) **me los explicas antes de hacerlos.**
- **Al aplicar una migración con el conector de Supabase, quita los `drop … if exists` que no hacen falta** (lo que se va a crear todavía no existe) y, si es larga, aplícala por partes. Una orden con `drop` pide una confirmación extra que en el celular de Jonah no llega y se cancela sola (pasó 5 veces con los cupones el 14 de octubre). Si de verdad hay que reemplazar algo que ya existe, avísale para hacerlo desde la computadora o el editor SQL de Supabase.
- **Las edge functions solo se publican después del merge**, y siempre con el código que quedó en `main`, para que GitHub y Supabase nunca tengan versiones distintas. Después de publicar, dime qué versión quedó.
  - **Excepciones:** las copias de prueba de Jarvis (`jarvis-chat-prueba`) y de Beast (`beast-chat-prueba`, autorizada por Jonah el 9 de octubre) se pueden publicar desde la rama de un PR para probarlas en la versión de prueba de Vercel (que llama a esas copias). Los reales, `jarvis-chat` y `beast-chat`, solo se publican después del merge.
- **Beast (`beast-chat`) se publica con `verify_jwt` en `false`**: el alumno sale de su sesión dentro del código.
- **Jarvis (`jarvis-chat`) se publica con `verify_jwt` en `false`**, porque el candado de admin está dentro del código.
- **Viernes** es Jarvis con voz femenina y otro nombre (se activa diciendo "Viernes" o "Hola Viernes"): usa la misma función `jarvis-chat` y la misma memoria.

## Alimentos nuevos

- **Cada plato que se agregue a la app debe decir si lleva arroz o no.** Si es un guiso que en Perú se come con arroz y sus calorías no lo incluyen, va en `PLATOS_SIN_ARROZ` (`src/alumno.jsx`), para que salga "🍚 Sin arroz: agrégalo aparte". Si las calorías sí incluyen el arroz, el nombre lo dice (ej. "Pollo a la olla con arroz"). Al agregarlo, dile a Jonah cuál de las dos es.
- **Los pedidos de alimentos que la IA deja para revisar los resuelve Claude** (encargo de Jonah del 6 de octubre; desde el 7 de octubre también los alimentos que los alumnos crean ellos mismos y la IA marcó "no está segura"): cada hora de 8 am a 9 pm (rutina `trig_016oFFyssqxaTuMpWpAq8PBv`; cada 30 min no se puede, el mínimo es 1 hora) los agrega, corrige, une con uno de la app, deja solo para el alumno o los responde con los mismos criterios (números que cuadran, sin repetidos, regla de nombres, fuente, medida casera y regla del arroz). A Jonah solo le avisa. **Mensaje de WhatsApp listo para los alumnos que pagan y los que están en su prueba** (decisión de Jonah del 9 de octubre; a los de prueba, invitándolos con cariño a seguir); a los gratis les basta la tarjeta que la app les muestra sola (que los invita a Premium), salvo que se vean activos (entonces, un mensaje que los invite a Premium) o que no se sepa qué es el alimento (siempre se les pregunta). Si un alimento creado por un alumno se corrige y es común y claro, queda para todos, no solo para él. Así hasta que el asistente de WhatsApp lo haga solo.
- **Cada lunes Claude revisa que la base de alimentos siga limpia** (rutina `trig_01CBY8prRNz3CQ7mYWHY8KkV`) y le pasa a Jonah una lista numerada; renombrar, unir o quitar alimentos solo con su OK.

## Estilo de la app

- Fondo **carbón**, acentos **naranja ají** y textos en **crema**.
- Títulos en **Anton** (clase `jb-display`) y texto normal en **Work Sans** (clase `jb-body`).
- Los colores están definidos en `tailwind.config.js`: la escala `zinc` es la paleta carbón → crema (`zinc-950` carbón, `zinc-50` crema) y la escala `orange` es el naranja ají (`orange-500` `#E8590C`, `orange-400` `#FF7020`).
- Mantén este estilo en cualquier pantalla nueva o modificada.
- **El gorila de la marca es el logo original (`public/logo-marca.webp`, el gorila de fuego) y no se cambia ni se modifica** (decisión de Jonah, 10 de octubre): no se redibuja, simplifica, recolorea ni recorta; solo se escala entero. En diseños (polos, anuncios, flyers) **no inventar nada ajeno a la marca**: solo el logo, "JONAH BEAST FUEL", "COMIDA A COMIDA", "Sigue comiendo peruano. Esta vez, con resultados.", jonahbeast.com, los colores y las tipografías. Para bordado, el taller digitaliza el logo original.
- **La marca es universal; lo peruano es el mensaje del país** (decisión de Jonah, 12 de octubre: hoy empezamos en Perú y algún día quizás en otros países). La marca va igual en todas partes: **"Jonah Beast Fuel · Comida a comida"**, el gorila de fuego, la historia de Jonah, los colores y las tipografías. Lo de la comida peruana ("sin dejar la comida peruana", "Sigue comiendo peruano…", los platos) va **aparte**, en descripciones, textos y anuncios que se puedan cambiar por país; nunca pegado al nombre, al logo ni a la frase de marca.

## Tono de los mensajes

- **Todo mensaje a alumnos o clientes** (WhatsApp, avisos, textos de la app, mensajes listos del panel) va en la voz de Jonah: **cercano, humano y motivador, nunca de robot**.
- Habla como persona ("Soy Jonah", "vamos juntos", "cualquier duda me escribes aquí"), usa su historia cuando sume, **siempre completa y sin exagerar**: hace unos años bajó 37 kg (sin el número de años, para que no envejezca; decisión de Jonah del 15 de octubre), y ahora bajó de 104 a 90 kg en 2 meses y medio con su propia app **sumándole entrenamiento (algunos días, no todos) y disciplina**. Nunca decir que fue solo la app y la idea de que **el cambio llega poco a poco, comida a comida**.
- Nada de textos fríos o de trámite. Sin prometer resultados iguales para todos.

## Datos del proyecto

- App React + Vite + Tailwind, con Supabase como base de datos y publicada en Vercel.
- La app está en `src/`: `App.jsx` tiene la portada, el registro/ingreso y todo lo compartido; `alumno.jsx` (app del alumno), `admin.jsx` (panel de admin y Jarvis), `tienda.jsx` y `referidor.jsx` se descargan solo cuando hacen falta. Las funciones de servidor y tareas automáticas están en `api/`.
- Comprueba que compila con `npm run build` antes de subir cambios. El build empieza con el **revisor automático** (`eslint.config.js`): si encuentra un error real (un nombre que no existe, una pieza borrada que se sigue usando, un hook mal puesto), frena el build y Vercel no publica. `npm run revisar` muestra además los avisos de código que no se usa (no frenan).

## Manual de la app y Jarvis

- `docs/manual-app.md` es el manual de la app (pantallas, botones y mensajes). Lo usan Jarvis y el asistente de WhatsApp.
- **Cada cambio que el alumno vea en la app se anota en el manual en el mismo PR.**
- Jarvis y el asistente de WhatsApp leen el manual de la tabla `manual_app` de la base (una sola fila), no de su código. Esa fila **la actualizo yo** después de cada merge con el botón **"🔄 Actualizar manual de Jarvis y Viernes"** del panel (pestaña 📸 IA, tarjeta "📘 MANUAL DE JARVIS Y VIERNES"), que copia el manual de `main` con su commit y comprueba que quedó idéntico. Si se me olvida, la app me avisa al celular.
- **Claude no escribe en `manual_app`.** Si el PR toca el manual, después del merge solo me recuerda que toque ese botón. Si le pido revisar, puede leer la fila y comparar su huella con la del archivo de `main`, sin cambiarla.
- Un cambio que solo toca el manual ya **no** obliga a volver a publicar `jarvis-chat` ni `whatsapp-webhook`.
- `npm run manual-jarvis` sigue copiando la lista de alimentos de `src/App.jsx` a `whatsapp-webhook` y `alimentos-pedidos` (`alimentos.ts`). Si se olvida, `npm run build` falla y avisa.

## Especialistas (`.claude/agents/`)

Diez ayudantes de Claude con las reglas y datos del proyecto (pedidos por Jonah el 8 de octubre; el community manager, el de alianzas, el de experiencia del alumno, el de seguridad y el de desarrollo, el 16 de octubre). **Reunión quincenal del equipo** el 1 y el 15 de cada mes, 8:51 am de Lima (rutina `trig_01FEqXvm7m3Mo2Nwy4AXgHBp`; si cae domingo pasa al lunes): cada especialista resume sus 2 semanas con números, Claude arma un informe en una página privada con la meta de 100 alumnos pagando, las 3 decisiones para Jonah y si sobra o falta alguien en el equipo. Si se suma o se quita un especialista, actualizar esta lista. Úsalos cuando el tema calce y pásale a Jonah su resultado en palabras simples:

- `especialista-que-paguen`: por qué los registros no pagan y qué probar (revisiones de pagos, embudo).
- `especialista-anuncios`: planea y arma campañas de Meta y TikTok, decide a quién se le muestran (tráfico: remarketing, parecidos a los que pagan, excluir a quien ya paga), resumen de los lunes y costo por alumno que paga. En Meta crea las campañas **en pausa**; nada se enciende, gasta ni cambia sin el OK explícito de Jonah.
- `especialista-contenido`: guiones (también el guion de grabación escena por escena que Jonah sigue al grabar), textos para redes, WhatsApp y anuncios con la voz de Jonah.
- `especialista-diseno`: imágenes de anuncios, carruseles, flyers y portadas con el estilo de la marca y en los tamaños de cada red. No inventa fotos realistas de personas ni usa antes/después en anuncios.
- `especialista-community`: community manager. Con las capturas o textos que Jonah le pasa, responde comentarios y mensajes de Instagram, Facebook y TikTok con su voz, detecta a quién invitar por privado (links `?fuente=dm_app` / `dm_personal`), arma el banco de respuestas, cuida los mensajes delicados (nunca consejo médico; Línea 113) y propone temas de contenido. No publica ni responde por su cuenta.
- `especialista-alianzas`: consigue y cuida aliados (gimnasios, entrenadores, nutricionistas, centros de trabajo y, más adelante, influencers chicos): lista y orden de contactos, mensajes y seguimientos con la voz de Jonah, el trato (descuento y comisión), el kit de cada aliado (código de embajador, link `?ref=<CODIGO>&fuente=aliado_<nombre>`, panel `/r/…`, cupón, flyer), preparación de reuniones y medición semanal por aliado. No contacta a nadie ni crea códigos o cupones sin el OK de Jonah.
- `especialista-desarrollo`: desarrollo y producto. Construye funciones y mejoras de la app siguiendo todas las reglas de este archivo (versión de prueba con `?preview=1`, nunca une sin el OK de Jonah) y cada mes trae un plan de mejoras: qué hace la competencia (Fitia, NutriKaloría, Calano, MyFitnessPal, Cal AI…), lo nuevo en IA y en celulares, y la salud técnica de la app (velocidad, celulares baratos, accesibilidad, piezas desactualizadas), siempre ordenado por lo que mueve la meta de alumnos que pagan.
- `especialista-experiencia`: experiencia del alumno. Recorre la app como un alumno nuevo (del registro al día 2 y a los planes), lee lo que dicen los alumnos (👎 de Beast, `motivos_salida`, correcciones de la foto, pedidos de alimentos, quejas que pasa Jonah) y lo cruza con el embudo; entrega las 3 a 5 fricciones más importantes con su mejora concreta. No cambia la app: propone y Claude construye con el OK de Jonah.
- `especialista-seguridad`: ciberseguridad defensiva. Revisión mensual (el 28, rutina `trig_01ADzgbWMqvrFob1zqLMU26a`, para llevarla a la reunión del día 1) y **antes de pasar a la app real cualquier cambio que toque pagos, cuentas, datos de alumnos, la base o funciones del servidor**: avisos de seguridad de Supabase, reglas de acceso de cada tabla, funciones del servidor, llaves en el código, piezas de terceros y señales raras; guía a Jonah con la verificación en dos pasos de sus cuentas. Solo lee y propone; nunca pide contraseñas ni códigos.
- `especialista-video`: videos publicitarios desde cero y edición de los videos que graba Jonah con el "estilo agencia" (textos palabra por palabra, íconos neón, zooms, destellos, cierre del gorila, formato de cada red), con todo el audio: voz de Viernes o del gorila, limpiar la voz de Jonah, música con permiso, efectos y volumen parejo. No crea videos realistas de personas ni publica nada.

Si cambia una regla o un dato que ellos usan (precios, voz, historia de Jonah, eventos del embudo), actualízalo también en su archivo.

## Pendientes entre sesiones

Cada sesión nueva empieza sin recordar la anterior. Para no perder el hilo, los pendientes, las fechas y lo que está en curso viven en `docs/pendientes.md`, que se carga solo al empezar:

@docs/pendientes.md

- **Al terminar una tarea, bórrala de ese archivo en el mismo PR** y anota lo nuevo que quedó pendiente. Que sea corto: solo lo vigente.
- Lo que vale para siempre (reglas, forma de trabajar) va en este archivo, no en `docs/pendientes.md`.
