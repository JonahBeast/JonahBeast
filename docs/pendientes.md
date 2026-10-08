# Pendientes de Jonah Beast Fuel

(Claude: esto se carga solo al empezar cada sesión. Cuando una tarea termina, bórrala de aquí en el mismo PR. Las reglas que valen para siempre van en CLAUDE.md, no aquí. Mantenlo corto.)

## Pendiente

- **Frenar pesos mal escritos.** Si un alumno anota un cambio muy grande (ej. 5 kg en un día), la app le pregunta "¿Seguro?" antes de guardar. Casos vistos: Jimena (70 → 54,4 kg en una semana) e Irvin (−5 kg en un día). Jonah aún no lo ha pedido: espera su OK.

## Con fecha

- **Cada lunes 8:52 am: revisión semanal de la base de alimentos** (rutina "Revisión semanal de la base de alimentos", `trig_01CBY8prRNz3CQ7mYWHY8KkV`, pedida por Jonah el 6 de octubre; se dispara en la sesión donde se pidió, que tiene acceso a Supabase). Claude revisa repetidos, números que no cuadran, nombres, medidas, regla del arroz y lo que agregó la IA sola, y le manda a Jonah una lista numerada para aprobar. No cambia nada sin su OK.

- **20 de octubre: revisar la prueba de "la IA agrega sola los pedidos de seguridad media"** (salió el 6 de octubre). Antes: la IA pasaba a Jonah 25 de 30 pedidos; de los "media" que aprobó, 15 de 16 con los mismos números. Ver en `pedidos_alimentos` cuántos agregó sola (`propuesta->>ia_estado = 'agregado'` y `seguridad = 'media'`), cuántos corrigió o quitó Jonah y si se coló algún repetido. Si salió mal, volver a exigir "alta" (`agregable` en `alimentos-pedidos`).

- **27 de octubre: revisar las páginas de calorías** (jonahbeast.com/calorias, publicadas el 3 de octubre). Pedir a Jonah capturas de Search Console ("Páginas" y "Rendimiento") y ver en `embudo_landing_eventos` las visitas y registros con fuente `calorias` (y qué plato los trajo en `campana`). Hay un recordatorio programado en la sesión donde se pidió. **Si traen gente, proponer las ideas en espera** (6 de octubre), en este orden:
  1. Páginas "Qué pedir en…" (Bembos, KFC, pollería, chifa, menú del día) con los alimentos de la app.
  2. Calculadoras gratis como páginas propias (calorías para bajar de peso, IMC, proteína) que invitan a la app.
  3. Carruseles para Instagram/Facebook con los datos de calorías (Jonah solo publica; sirven para la prueba de sus redes personales).
  4. Menú de 7 días descargable a cambio del WhatsApp: solo cuando el asistente de WhatsApp esté activo.
  Si no traen gente, no hacer más páginas.

- **10 de octubre:** revisar en qué paso se quedan los nuevos antes de su primera comida (eventos `primera_comida`, `foto_comida`, `abrir_navegador`). Hay un recordatorio programado en la sesión donde se pidió.
- **Que paguen más (desde el 5 de octubre):** salió la pantalla "¿Seguimos juntos?" de fin de prueba (evento `fin_prueba`), el pago con solo la captura + aviso al toque a Jonah (`api/pago-enviado.js`) y el registro con avisos en vivo. Punto de partida: 59 registros, 15 vieron planes, 3 eligieron plan, 1 envió pago, 2 pagando. Revisar el 10 de octubre y el 19 de octubre si sube "vieron planes" y "pagaron". Siguiente idea si no basta: QR de Yape en la pantalla de pago (falta que Jonah mande la imagen).
- **19 de octubre: ¿sirven los 3 especialistas?** (`.claude/agents/`, armados el 8 de octubre). Usarlos en la revisión de pagos del 10 de octubre (`especialista-que-paguen`), en el resumen de anuncios del 12 de octubre (`especialista-anuncios`) y en la prueba de redes personales (`especialista-contenido`). El 19, junto con la revisión de pagos, decir a Jonah cuáles ayudaron y proponer quitar el que no.
- **11 de octubre:** contar cuántos se registraron con código de alumno tras el flyer. Punto de partida: 39 alumnos con código, 1 registro en total, 0 pagos. Si funciona, proponer el botón "Compartir en mi estado" dentro de la app.

## En curso

- **Aviso de pagos a Meta (evento Purchase).** Código listo en este PR (`api/_lib/meta-compra.js`, llamado desde `api/pago-aprobado.js` y la verificación de Google Play). Falta que Jonah genere el token de la API de conversiones (Administrador de eventos → conjunto "Jonah Beast Fuel" 1084905720987308 → Configuración) y lo guarde en Vercel como `META_CAPI_TOKEN`; luego merge y probar con "Probar eventos" (`META_TEST_EVENT_CODE`). Recordatorio programado para la noche del 5 de octubre.
- **Anuncios Meta (desde el 5 de octubre).** Campaña "Gratis para siempre · Lead" a S/13 diarios, sin tope ni fecha de fin (≈S/390 al mes), con 2 anuncios compitiendo: "Tómale foto" con la oferta corregida y "Jonah fundador" (sin antes/después ni kilos). Los 8 anuncios viejos con "15 días gratis" quedaron archivados. La agencia todavía no empieza: arrancará aparte con S/600 al mes. Comparar los dos anuncios en el resumen del lunes 12 de octubre; después, pasar la campaña a optimizar "Registro" y, cuando haya pagos medidos, "Compra".
- **Google (Search Console avisó "Duplicada sin canónica", 7 de octubre).** Ya en la app real: dirección oficial `https://jonahbeast.com/…` (PR #336), `www` redirige a `jonahbeast.com` (PR #337). En este PR: las direcciones que no existen dan "no existe" (404, `public/404.html`) en vez de la portada, y `/privacidad` lleva a `/privacidad.html`. Rutas de la app en `vercel.json`: `/`, `/calculadora`, `/reto`, `/tienda`, `/r/…` (si se crea una ruta nueva, agregarla ahí). Falta que Jonah, en Search Console → Páginas → "Duplicada…", toque "Validar corrección".
- **Video corto "Tómale foto" (voz de Frida, 16,5 s).** Listo en `public/anuncios/video-corto-tomale-foto.mp4`. Meta: Jonah lo sube a la Biblioteca de contenido multimedia de "Jonah Beast Fuel - Anuncios" y Claude lo agrega como 3.er anuncio de "Gratis para siempre" (mismos S/13, marcar IA). TikTok: Claude no puede crear campañas ni subir archivos ahí hasta diciembre; Jonah publica el video en @jonah.beast_fuel y arma a mano la prueba de S/10 diarios por 7 días (cuenta "Jonah Beast Corp 0913", objetivo registros con el píxel, link `?fuente=tiktok`). Revisar resultados en el resumen del lunes.

- **Tres frentes nuevos para traer gente (6 de octubre):**
  1. **Reto en grupo en el banco de Jonah** (con "Mis equipos", no hay que construir nada): **en pausa, Jonah lo retoma cuando quiera.** Al retomarlo: confirmar si su trabajo permite promoverlo, fecha (se propuso lunes + 28 días), premio y si quiere un código con 15 días de Premium (fila nueva: pedir su OK); luego armar el mensaje de invitación con su voz.
  2. **"Mándame la foto de tu plato" por WhatsApp** (el asistente responde las calorías e invita a la app): esperar a que el asistente de WhatsApp esté activo.
  3. **Videos "¿Cuántas calorías tiene…?"** con los platos de jonahbeast.com/calorias (narrados por Viernes o el gorila, o Jonah): **Jonah avisa** cuándo quiere los guiones; no empezar antes.

- **Alimentos por revisar.** En "Candidatos para la base" quedan "Refresco cebada" (@jerch_2004) y "Hamburguesa" (@yara1701): la recomendación es unirlos con "Refresco de cebada (con azúcar)" y "Hamburguesa clásica (Bembos)".
- **Idea sin pedir:** que Jarvis también pueda revisar los pedidos de alimentos ("analízalos") desde el panel.

- **Flyer de estados de WhatsApp.** Jonah se lo manda a Joselyn Flores y a Yanet (alumnas con resultados y constancia). No usar a Jimena ni a Irvin: sus pesos parecen errores.

- **Videos de la guía rápida (Gorila 53 s, Viernes (antes "Frida") 43 s).** Listos y entregados a Jonah (el 4 de octubre). Falta que Jonah los publique (marcar "contenido generado por IA"; sin cifras de peso). La función de prueba `jarvis-voz-prueba` quedó suelta en Supabase (sin uso; Jonah puede borrarla).

## Anuncios (análisis del 4 de octubre, últimos 30 días)

- **Gasto:** Meta S/249 (solo la cuenta de la empresa "Jonah Beast Fuel - Anuncios"; **falta la cuenta personal "Martin Huamani"**, donde Jonah también anuncia y que Claude no puede leer todavía), TikTok S/39. Registros en la app: 46; hoy paga 1 de esos 46. **Pagando ahora: 2** (Joselyn y Yanet; la tercera cuenta con plan pago es `martin`, de Jonah).
- **Límite de gasto:** los pagos aprobados promedian ~S/36. Hoy cuesta ~S/289 por alumno que paga (unas 8 veces el límite). Ojo: la tabla `pagos` puede no incluir Mercado Pago ni Google Play, y con 1 pago de 46 el número se mueve mucho.
- **Conclusión:** el problema es que los registros no pagan, no la cantidad de gente. No subir el presupuesto antes de resolverlo (se mira con la revisión del 10 de octubre).
- **TikTok:** 2.757 clics pero solo ~19 visitas marcadas como TikTok y 0 registros. Revisar si el link del anuncio lleva `?fuente=tiktok`.
- **Meta:** la mejor campaña es "Gratis para siempre · Lead" (36 leads a S/1,81; en la base solo ~17 registros venidos de Meta). "Prueba web · Este es Jonah" optimiza clics, no registros.
- **Medición:** la app ya guarda la fuente (`?fuente=` o `?utm_source=`) y la campaña/anuncio (`?utm_campaign=`, `?utm_content=`) de cada visita. Se ve en el panel (🎯 EMBUDO → "Por fuente" y la tarjeta de costo por alumno). Falta que cada anuncio lleve esos parámetros.
- **Agencia:** Jonah la paga hoy (otra sesión la cuenta a ~S/500 al mes; Jonah debe confirmarlo; con eso cada alumno que paga saldría en ~S/790, y los números están bajos porque falta el gasto de la cuenta personal). Consejo dado: no cortarla todavía; pedirle su reporte, ponerle meta de "costo por alumno que paga" y usar a Claude 30 días como segunda opinión. Nadie garantiza resultados.

## Prueba: contenido en las redes personales de Jonah (30 días)

- **Plan de Jonah:** empezar a crear contenido y campañas en sus redes personales (más seguidores y más público), y lo que funcione replicarlo en las redes de la app. La pregunta es si conviene: la gente quiere ver a una persona detrás del producto.
- **Postura de Claude:** sí conviene probarlo, medido, sin dejar las redes de la app. A favor: los anuncios con el gorila y "Este es Jonah" son los que mejor rinden. Dudas: seguidores no son compradores (no se sabe quiénes lo siguen), el cuello de botella es pasar de registro a pago (1 de 46), todo en una sola cuenta (ya hubo problemas con el portafolio de la empresa), Meta limita anuncios de bajar de peso (antes/después, promesas) y Claude no puede leer la cuenta personal de anuncios.
- **Cómo medir:** un link distinto por canal (`?fuente=personal_ig`, `?fuente=personal_tiktok`; las bios de la app usan `tiktok_bio` e `ig_bio`). Jonah ya cambió los links de sus perfiles el 4 de octubre; el día 30 es el 3 de noviembre. Medir registros, cuántos pagan y costo por alumno que paga; no "me gusta" ni vistas. Definir la meta antes de empezar (por ejemplo, costar menos que hoy con la agencia) y decidir con números al día 30.
- **Falta de Jonah:** en qué redes personales publicará y cuántos seguidores tiene en cada una; captura de las estadísticas de audiencia (país, edad, sexo); captura de la cuenta personal de anuncios de los últimos 30 días (campañas activas/pausadas, gasto, clics, resultados) y decir qué anuncios maneja la agencia y cuáles él.
