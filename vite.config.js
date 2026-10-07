import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Identificador de esta versión publicada: el commit en Vercel o, si no
// hay, la hora del build. La app lo compara con /version.json para saber
// si hay una versión nueva y recargarse sola (ver usarVersionNueva en App.jsx).
const VERSION = process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now())

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'version-json',
      apply: 'build',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ v: VERSION }) })
      },
    },
  ],
  // Commit y rama de la versión publicada (Vercel los da al construir). El
  // panel los usa para copiar el manual de main a la base (manual_app).
  define: {
    __COMMIT__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA || ''),
    __RAMA__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_REF || ''),
    __VERSION__: JSON.stringify(VERSION),
  },
})
