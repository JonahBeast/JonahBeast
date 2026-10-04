# Pendientes de Jonah Beast Fuel

(Claude: esto se carga solo al empezar cada sesión. Cuando una tarea termina, bórrala de aquí en el mismo PR. Las reglas que valen para siempre van en CLAUDE.md, no aquí. Mantenlo corto.)

## Pendiente

- **Frenar pesos mal escritos.** Si un alumno anota un cambio muy grande (ej. 5 kg en un día), la app le pregunta "¿Seguro?" antes de guardar. Casos vistos: Jimena (70 → 54,4 kg en una semana) e Irvin (−5 kg en un día). Jonah aún no lo ha pedido: espera su OK.

## Con fecha

- **10 de octubre:** revisar en qué paso se quedan los nuevos antes de su primera comida (eventos `primera_comida`, `foto_comida`, `abrir_navegador`). Hay un recordatorio programado en la sesión donde se pidió.
- **11 de octubre:** contar cuántos se registraron con código de alumno tras el flyer. Punto de partida: 39 alumnos con código, 1 registro en total, 0 pagos. Si funciona, proponer el botón "Compartir en mi estado" dentro de la app.

## En curso

- **Flyer de estados de WhatsApp.** Jonah se lo manda a Joselyn Flores y a Yanet (alumnas con resultados y constancia). No usar a Jimena ni a Irvin: sus pesos parecen errores.

- **Voz en off del video "guía rápida" (41 s).** En el panel (📸 IA) está la tarjeta "🎙️ Voz para mis videos" con el guion cargado y la voz de Frida. Jonah genera el mp3, lo descarga y se lo pasa a Claude (por Google Drive), que lo ajusta a las escenas del video. También hay guiones y voces de Jarvis y de "Jonah el gorila" (motivador y enérgico, personaje de la marca). Las voces del gorila necesitan publicar la función `jarvis-voz` actualizada DESPUÉS del merge (Claude la publica y dice la versión). TikTok suele pedir marcar el contenido con voz sintética.

## Anuncios (análisis del 4 de octubre, últimos 30 días)

- **Gasto:** Meta S/249 (solo la cuenta de la empresa "Jonah Beast Fuel - Anuncios"; **falta la cuenta personal "Martin Huamani"**, donde Jonah también anuncia y que Claude no puede leer todavía), TikTok S/39. Registros en la app: 46; hoy paga 1 de esos 46. **Pagando ahora: 2** (Joselyn y Yanet; la tercera cuenta con plan pago es `martin`, de Jonah).
- **Límite de gasto:** los pagos aprobados promedian ~S/36. Hoy cuesta ~S/289 por alumno que paga (unas 8 veces el límite). Ojo: la tabla `pagos` puede no incluir Mercado Pago ni Google Play, y con 1 pago de 46 el número se mueve mucho.
- **Conclusión:** el problema es que los registros no pagan, no la cantidad de gente. No subir el presupuesto antes de resolverlo (se mira con la revisión del 10 de octubre).
- **TikTok:** 2.757 clics pero solo ~19 visitas marcadas como TikTok y 0 registros. Revisar si el link del anuncio lleva `?fuente=tiktok`.
- **Meta:** la mejor campaña es "Gratis para siempre · Lead" (36 leads a S/1,81; en la base solo ~17 registros venidos de Meta). "Prueba web · Este es Jonah" optimiza clics, no registros.
- **Medición:** la landing no guarda de qué anuncio viene cada visita. Propuesta (necesita OK de Jonah): agregar la campaña al link de cada anuncio.
- **Agencia:** Jonah la paga hoy (otra sesión la cuenta a ~S/500 al mes; Jonah debe confirmarlo; con eso cada alumno que paga saldría en ~S/790, y los números están bajos porque falta el gasto de la cuenta personal). Consejo dado: no cortarla todavía; pedirle su reporte, ponerle meta de "costo por alumno que paga" y usar a Claude 30 días como segunda opinión. Nadie garantiza resultados.

## Prueba: contenido en las redes personales de Jonah (30 días)

- **Plan de Jonah:** empezar a crear contenido y campañas en sus redes personales (más seguidores y más público), y lo que funcione replicarlo en las redes de la app. La pregunta es si conviene: la gente quiere ver a una persona detrás del producto.
- **Postura de Claude:** sí conviene probarlo, medido, sin dejar las redes de la app. A favor: los anuncios con el gorila y "Este es Jonah" son los que mejor rinden. Dudas: seguidores no son compradores (no se sabe quiénes lo siguen), el cuello de botella es pasar de registro a pago (1 de 46), todo en una sola cuenta (ya hubo problemas con el portafolio de la empresa), Meta limita anuncios de bajar de peso (antes/después, promesas) y Claude no puede leer la cuenta personal de anuncios.
- **Cómo medir:** un link o código distinto por canal (`?fuente=personal_ig`, `?fuente=personal_tiktok`, el de la app). Medir registros, cuántos pagan y costo por alumno que paga; no "me gusta" ni vistas. Definir la meta antes de empezar (por ejemplo, costar menos que hoy con la agencia) y decidir con números al día 30.
- **Falta de Jonah:** en qué redes personales publicará y cuántos seguidores tiene en cada una; captura de las estadísticas de audiencia (país, edad, sexo); captura de la cuenta personal de anuncios de los últimos 30 días (campañas activas/pausadas, gasto, clics, resultados) y decir qué anuncios maneja la agencia y cuáles él.
