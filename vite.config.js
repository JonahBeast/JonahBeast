import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Commit y rama de la versión publicada (Vercel los da al construir). El
  // panel los usa para copiar el manual de main a la base (manual_app).
  define: {
    __COMMIT__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA || ''),
    __RAMA__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_REF || ''),
  },
})
