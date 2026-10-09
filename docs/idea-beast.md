# Beast · tu compañero (idea de Jonah, 9 de octubre)

Todo lo conversado con Jonah sobre Beast. **Todavía no se construye:** se propone después de la revisión de pagos del 10 de octubre, si se ve que la gente se va por perder la motivación.

## Qué es

- Nació como una app aparte de "amigo digital". Se decidió que **viva dentro de Jonah Beast Fuel**.
- Es **el gorila**, y se llama **"Beast"** para no confundirlo con Jonah persona.
- En la app se presenta como **"Beast · tu compañero"** (Jonah lo prefiere a "coach" porque es más cercano). Siempre se ve que es la IA de la app ("IA de Jonah Beast Fuel"). **Nunca "nutricionista".**
- Sabe nombre, meta y comidas, y lo que el alumno le cuente de su vida (trabajo, hijos, fines de semana). Se acuerda de todo, escribe primero ("ayer no anotaste nada, ¿todo bien?") y aconseja como amigo.
- Cuenta la historia de Jonah en tercera persona ("Jonah, el que creó esta app, bajó 37 kg…"), nunca como si él la hubiera vivido.
- **Hábito sano:** el alumno vuelve porque Beast le resuelve algo (lo conoce, le resuelve el "¿qué como?", lo rescata del mal día, lo celebra y le cuida el camino). Nada de culpa ni sentimientos fingidos ("me pones triste si no vienes").
- **Para venderlo:** "Beast, tu compañero que te conoce y te lleva a tu meta", "No vas solo: Beast va contigo, comida a comida", "👑 Premium: tu compañero Beast sin límite".

## Cómo se ve

- La burbuja del gorila ocupa el lugar del botón de WhatsApp: borde naranja, el nombre "BEAST", un puntito cuando tiene algo que decir y un globito con su mensaje.
- Al tocarla se abre un **chat estilo WhatsApp dentro de la app**, con botones rápidos, foto y voz, el aviso de los mensajes gratis que quedan y siempre **"🙋 Hablar con Jonah (persona) por WhatsApp"** para pagos o algo serio.
- Imagen de la propuesta hecha el 9 de octubre (HTML + Playwright, sobre la captura de inicio de Carla, `public/anuncios/pantallas/1-inicio-calorias-del-dia.png`).

## Voz

- **Al lanzar: notas de voz como en WhatsApp.** El alumno mantiene apretado 🎤, habla y suelta. En el chat sale el texto que entendió Beast, para que vea que lo escuchó bien. Usa la misma transcripción que ya tiene la app para anotar comidas por voz (`gpt-4o-mini-transcribe`, en `reconocer-comida`).
- **Beast responde por escrito**, con un botón **▶️ Escuchar** para oírlo con su voz de gorila (la de los videos, `gpt-4o-mini-tts`, como `jarvis-voz`). Opción para que siempre responda hablando. Idea: que la voz de Beast sea un gusto de Premium ("👑 Con Premium, Beast te habla").
- **Más adelante:** conversación en vivo, como una llamada (como Jarvis y Viernes), quizás como plus de Premium ("📞 Habla con Beast"), si se ve que usan mucho la voz. Cuesta más y es más trabajo.
- **Costo:** escuchar una nota cuesta fracciones de céntimo y que Beast hable una respuesta, alrededor de 1 céntimo. Un alumno que usa mucho la voz suma ≈ S/0,20 a S/0,30 al mes (≈ S/1 al mes en total con Beast).

## Lo que Beast puede hacer (por los mismos caminos de la app)

Regla de oro: usa los caminos que ya existen, con las mismas reglas. Lo que hace Beast queda igual que lo hecho a mano (aparece en "Tu día", llega la tarjeta de novedades) y en el panel se marca "vía Beast" para medir cuánto lo usan. **Siempre confirma con una tarjeta y botones antes de guardar.**

| Acción | Regla |
|---|---|
| 🍽️ Anotar una comida (texto o foto) | Tarjeta para confirmar antes de guardar |
| ⚖️ Anotar el peso | Si el cambio es raro (ej. 5 kg en un día), pregunta "¿Seguro?" |
| 💧 Sumar agua | Directo |
| 🙋 Pedir un alimento | Premium, igual que hoy. Entra a `pedidos_alimentos` con la misma revisión de la IA y la misma rutina de cada hora. En la versión gratis lo ayuda a crearlo |
| ➕ Crear su alimento | Igual que hoy |
| 📈 Ver su progreso | Solo lee |

**Lo que no hace:** pagos y planes (lo lleva a planes o al WhatsApp de Jonah), cambiar la meta o el perfil (lo lleva a esa pantalla), borrar comidas o la cuenta (solo desde la app). **Nunca agrega alimentos a la base por su cuenta.** Las calorías siempre salen de la base de alimentos de la app, nunca "de memoria".

## Qué IA usa

- **Equipo de dos:** Haiku 5.5 (económico) para el día a día (~95% de los mensajes); Sonnet 5.5 (fino) para temas delicados (ánimo, trastornos de la alimentación, salud) y para ordenar la libreta una vez al día. El cambio es automático y el alumno no lo nota.
- **Antes de lanzarlo, una prueba:** unas 30 conversaciones realistas (día normal, se pasó, día triste, preguntas difíciles) respondidas por Haiku y por Sonnet. Jonah las lee sin saber cuál es cuál y elige.

## Costos (con S/24,90 al mes)

- ≈ **S/0,70 al mes por alumno** con el equipo Haiku + Sonnet (≈ S/0,50 solo con Haiku; ≈ S/7,50 solo con Sonnet). Va de unos céntimos (entra poco) a ≈ S/3 (Premium que conversa muchísimo). Es menos del 3% de lo que paga.
- El riesgo son los gratis: con 2 de cada 100 pagando se queda a mano; con 5 de cada 100 se gana bien.
- **Límites:** pocos mensajes gratis al día (3 a 5), que escriba primero solo a quien responde, freno en Premium (≈ 60 al día) y alarma al celular si el gasto de IA del mes se pasa.
- Confirmar el gasto real el primer mes en la tabla `ia_uso`.

## Memoria y datos personales

- **Libreta** resumida: dura mientras la cuenta esté activa, con tope de ≈ 1 página (al llenarse, Beast la resume; si crece sin tope, cada mensaje sale más caro).
- **Conversaciones completas:** se borran solas a los 90 días.
- Todo se borra al eliminar la cuenta; la libreta, tras 12 meses sin entrar.
- Opción **"Lo que Beast sabe de ti"** en el chat para ver y borrar.
- Guardarlo cuesta casi nada (1.000 alumnos ≈ 10 a 30 MB).
- Necesita tabla nueva para la memoria (explicársela a Jonah antes).
- **Ley 29733 de Protección de Datos Personales** (peso, comidas y salud son datos sensibles): pedir permiso la primera vez que abre a Beast, actualizar `public/privacidad.html` y no usar esos datos para anuncios ni compartirlos.

## Cuidados

Que siempre diga que es IA. Protocolo si alguien habla de depresión, hacerse daño o trastornos de la alimentación (responder con tacto y dar un contacto de ayuda real). Sin consejos médicos ni promesas de kilos. Si mencionan una enfermedad o un embarazo, recomendar ver a un profesional.

## WhatsApp

**Se fusiona con el asistente de WhatsApp:** un solo Beast con la misma memoria y dos puertas. La app es su casa; WhatsApp sirve para ir a buscar a quien deja de entrar (los avisos de la app solo llegan a 1 de cada 3). Orden: primero en la app y medir si suben los pagos; si funciona, conectarle WhatsApp en vez de hacer un asistente aparte.
