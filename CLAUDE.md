# Jonah Beast Fuel — reglas para Claude

## Cómo comunicarte conmigo

- Respóndeme siempre en **español**.
- No soy programador: explica los cambios en **palabras simples**, sin jerga técnica. Si un término técnico es inevitable, explícalo en una frase.

## Flujo de trabajo

- Cuando termines un cambio, súbelo a la rama de trabajo y **espera a que Vercel construya la versión de prueba**. Luego dame el **link directo** a esa versión con `?preview=1` al final (por ejemplo `https://...vercel.app/?preview=1`). Ese parámetro hace que mis propias visitas no cuenten en las métricas de la landing.
- **Nunca hagas el merge** de un pull request sin que yo lo pida explícitamente.
- Cuando hagas una mejora, **busca todos los lugares de la app donde pasa lo mismo y propónmelos juntos en el mismo cambio**, para que la experiencia del alumno quede pareja (ej. si el peso pasa a regla deslizable, que sea en todas las pantallas donde se pone el peso).

## Base de datos y Supabase (proyecto `jnhvpjrxilubkyhculoh`)

- **Nunca borres ni modifiques datos de alumnos, pagos o cuentas sin preguntarme antes**, y dime exactamente qué filas vas a tocar.
- **Los cambios en la estructura de la base** (columnas o tablas nuevas) **me los explicas antes de hacerlos.**
- **Las edge functions solo se publican después del merge**, y siempre con el código que quedó en `main`, para que GitHub y Supabase nunca tengan versiones distintas. Después de publicar, dime qué versión quedó.
  - **Única excepción:** la copia de prueba de Jarvis, `jarvis-chat-prueba`, se puede publicar desde la rama de un PR para probarlo en la versión de prueba de Vercel (que llama a esa copia). El Jarvis real, `jarvis-chat`, solo se publica después del merge.
- **Jarvis (`jarvis-chat`) se publica con `verify_jwt` en `false`**, porque el candado de admin está dentro del código.

## Estilo de la app

- Fondo **carbón**, acentos **naranja ají** y textos en **crema**.
- Títulos en **Anton** (clase `jb-display`) y texto normal en **Work Sans** (clase `jb-body`).
- Los colores están definidos en `tailwind.config.js`: la escala `zinc` es la paleta carbón → crema (`zinc-950` carbón, `zinc-50` crema) y la escala `orange` es el naranja ají (`orange-500` `#E8590C`, `orange-400` `#FF7020`).
- Mantén este estilo en cualquier pantalla nueva o modificada.

## Tono de los mensajes

- **Todo mensaje a alumnos o clientes** (WhatsApp, avisos, textos de la app, mensajes listos del panel) va en la voz de Jonah: **cercano, humano y motivador, nunca de robot**.
- Habla como persona ("Soy Jonah", "vamos juntos", "cualquier duda me escribes aquí"), usa su historia cuando sume, **siempre completa y sin exagerar**: hace unos 4 años bajó 37 kg, y ahora bajó de 104 a 90 kg en 2 meses y medio con su propia app **sumándole entrenamiento (algunos días, no todos) y disciplina**. Nunca decir que fue solo la app y la idea de que **el cambio llega poco a poco, comida a comida**.
- Nada de textos fríos o de trámite. Sin prometer resultados iguales para todos.

## Datos del proyecto

- App React + Vite + Tailwind, con Supabase como base de datos y publicada en Vercel.
- La app está en `src/`: `App.jsx` tiene la portada, el registro/ingreso y todo lo compartido; `alumno.jsx` (app del alumno), `admin.jsx` (panel de admin y Jarvis), `tienda.jsx` y `referidor.jsx` se descargan solo cuando hacen falta. Las funciones de servidor y tareas automáticas están en `api/`.
- Comprueba que compila con `npm run build` antes de subir cambios.

## Manual de la app y Jarvis

- `docs/manual-app.md` es el manual de la app (pantallas, botones y mensajes). Lo usan Jarvis y el asistente de WhatsApp.
- **Cada cambio que el alumno vea en la app se anota en el manual en el mismo PR.**
- Jarvis y el asistente de WhatsApp leen el manual de la tabla `manual_app` de la base (una sola fila), no de su código. Esa fila **la actualizo yo** después de cada merge con el botón **"🔄 Actualizar manual de Jarvis"** del panel (pestaña 📸 IA, tarjeta "📘 MANUAL DE JARVIS"), que copia el manual de `main` con su commit y comprueba que quedó idéntico. Si se me olvida, la app me avisa al celular.
- **Claude no escribe en `manual_app`.** Si el PR toca el manual, después del merge solo me recuerda que toque ese botón. Si le pido revisar, puede leer la fila y comparar su huella con la del archivo de `main`, sin cambiarla.
- Un cambio que solo toca el manual ya **no** obliga a volver a publicar `jarvis-chat` ni `whatsapp-webhook`.
- `npm run manual-jarvis` sigue copiando la lista de alimentos de `src/App.jsx` a `whatsapp-webhook` y `alimentos-pedidos` (`alimentos.ts`). Si se olvida, `npm run build` falla y avisa.
