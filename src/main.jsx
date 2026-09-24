import React from 'react'
import ReactDOM from 'react-dom/client'
import { inject } from '@vercel/analytics'
import App from './App.jsx'
import './index.css'

// Analítica de Vercel (país, tipo de celular, de dónde viene la visita).
// Igual que el contador propio de la landing: no cuentan las visitas de
// Jonah (?preview=1 marca ese celular) ni los celulares donde ya entró un
// alumno, para que solo se vean visitantes de afuera.
inject({
  beforeSend: (evento) => {
    try {
      if (new URLSearchParams(window.location.search).get('preview') === '1') return null
      if (localStorage.getItem('jb-no-contar') === '1') return null
      if (localStorage.getItem('jb-conocido') === '1') return null
    } catch {}
    return evento
  },
})

// Mientras se descarga una parte de la app (panel del alumno, admin o
// tienda) se ve el fondo carbón con el cargador naranja.
const Cargando = (
  <div style={{ minHeight: '100vh', background: '#16110D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #3a2e26', borderTopColor: '#E8590C', animation: 'jb-girar .8s linear infinite' }} />
    <style>{'@keyframes jb-girar { to { transform: rotate(360deg) } }'}</style>
  </div>
)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <React.Suspense fallback={Cargando}>
      <App />
    </React.Suspense>
  </React.StrictMode>,
)
