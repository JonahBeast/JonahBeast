# Jonah Beast Fuel — reglas para Claude

## Cómo comunicarte conmigo

- Respóndeme siempre en **español**.
- No soy programador: explica los cambios en **palabras simples**, sin jerga técnica. Si un término técnico es inevitable, explícalo en una frase.

## Flujo de trabajo

- Cuando termines un cambio, súbelo a la rama de trabajo y **espera a que Vercel construya la versión de prueba**. Luego dame el **link directo** a esa versión con `?preview=1` al final (por ejemplo `https://...vercel.app/?preview=1`). Ese parámetro hace que mis propias visitas no cuenten en las métricas de la landing.
- **Nunca hagas el merge** de un pull request sin que yo lo pida explícitamente.

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

## Datos del proyecto

- App React + Vite + Tailwind, con Supabase como base de datos y publicada en Vercel.
- La app está en `src/`: `App.jsx` tiene la portada, el registro/ingreso y todo lo compartido; `alumno.jsx` (app del alumno), `admin.jsx` (panel de admin y Jarvis), `tienda.jsx` y `referidor.jsx` se descargan solo cuando hacen falta. Las funciones de servidor y tareas automáticas están en `api/`.
- Comprueba que compila con `npm run build` antes de subir cambios.

## Manual de la app y Jarvis

- `docs/manual-app.md` es el manual de la app (pantallas, botones y mensajes). Lo usan Jarvis y el asistente de WhatsApp.
- **Cada cambio que el alumno vea en la app se anota en el manual en el mismo PR**, y después se corre `npm run manual-jarvis` para copiarlo a Jarvis (`supabase/functions/jarvis-chat/manual.ts`). Si se olvida, `npm run build` falla y avisa.
- Si el cambio toca el manual, después del merge se publica también `jarvis-chat` (con `manual.ts`), para que Jarvis quede al día.
