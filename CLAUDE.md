# Jonah Beast Fuel — reglas para Claude

## Cómo comunicarte conmigo

- Respóndeme siempre en **español**.
- No soy programador: explica los cambios en **palabras simples**, sin jerga técnica. Si un término técnico es inevitable, explícalo en una frase.

## Flujo de trabajo

- Cuando termines un cambio, súbelo a la rama de trabajo y **espera a que Vercel construya la versión de prueba**. Luego dame el **link directo** a esa versión con `?preview=1` al final (por ejemplo `https://...vercel.app/?preview=1`). Ese parámetro hace que mis propias visitas no cuenten en las métricas de la landing.
- **Nunca hagas el merge** de un pull request sin que yo lo pida explícitamente.

## Estilo de la app

- Fondo **carbón**, acentos **naranja ají** y textos en **crema**.
- Títulos en **Anton** (clase `jb-display`) y texto normal en **Work Sans** (clase `jb-body`).
- Los colores están definidos en `tailwind.config.js`: la escala `zinc` es la paleta carbón → crema (`zinc-950` carbón, `zinc-50` crema) y la escala `orange` es el naranja ají (`orange-500` `#E8590C`, `orange-400` `#FF7020`).
- Mantén este estilo en cualquier pantalla nueva o modificada.

## Datos del proyecto

- App React + Vite + Tailwind, con Supabase como base de datos y publicada en Vercel.
- Casi toda la app está en `src/App.jsx`. Las funciones de servidor y tareas automáticas están en `api/`.
- Comprueba que compila con `npm run build` antes de subir cambios.
