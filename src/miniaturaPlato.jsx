/* Imagen chiquita de cada plato a la izquierda de su nombre (aprobado por
   Jonah el 17 oct 2026, como Fitia), en lugar del emoji. Son ilustraciones
   dibujadas en código (un plato visto desde arriba sobre fondo carbón, con
   aro naranja), pasadas a WebP de 160×160 (~5 KB).

   - Solo donde el alumno ELIGE su plato (decisión de Jonah, 17 oct): los
     resultados del buscador de la app ("escribir"), las tarjetas de la hoja
     de primera comida y la portada (fichas y resultados del buscador sin
     registrarse). No en la cantidad, lo anotado, favoritos, frecuentes,
     Beast, la confirmación ni compartir: ahí anotar queda rápido y limpio.
   - El mapa "alimento → archivo" vive en UN solo lugar: src/fotosPlatos.json
     ({ "Lomo saltado con arroz (-)": "lomo-saltado-con-arroz.webp?v=1a2b3c4d" }).
     La clave es la clave exacta del alimento (nombre + versión): cada
     versión lleva su propia imagen (el huevo frito no usa la del cocido,
     ni el lomo saltado sin arroz la del que trae arroz).
   - Los archivos van en public/platos/. Los prepara y anota en el mapa
     `node scripts/preparar-fotos-platos.mjs <carpeta>`.
   - Qué debe llevar (y no llevar) cada plato: docs/fotos-platos.md.
   - Si un alimento no tiene imagen (o no carga), se ve el emoji de siempre,
     en la misma caja que hoy: nada salta.

   Uso: los hijos son lo que se ve hoy (el emoji), `className` la caja del
   emoji de hoy y `tam` el lado del cuadrado de la imagen en px.
     <MiniaturaPlato food={f} tam={48} className="text-xl shrink-0">{emojiAlimento(f)}</MiniaturaPlato>
   Sin hijos, si no hay imagen no se dibuja nada (la portada, que hoy no
   lleva emoji). */
import { useState } from 'react';
import FOTOS_PLATOS from './fotosPlatos.json';

export function fotoDePlato(food) {
  if (!food) return null;
  const clave = food.key || `${food.name} (${food.state || '-'})`;
  const archivo = FOTOS_PLATOS[clave];
  return archivo ? `/platos/${archivo}` : null;
}

export default function MiniaturaPlato({ food, tam = 48, className = '', children = null }) {
  const src = fotoDePlato(food);
  const [falla, setFalla] = useState(null);
  if (!src || falla === src) {
    if (children == null) return null;
    return className ? <span className={className}>{children}</span> : children;
  }
  return (
    <img src={src} alt="" aria-hidden="true" loading="lazy" decoding="async" draggable={false}
      width={tam} height={tam} style={{ width: tam, height: tam }}
      onError={() => setFalla(src)}
      className="block shrink-0 rounded-xl object-cover bg-zinc-900" />
  );
}
