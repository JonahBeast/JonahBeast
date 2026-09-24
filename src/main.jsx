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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
