/* "Compartir este plato" (pedido por Jonah, 16 oct 2026, idea de Fitia):
   una tarjeta imagen con la marca (fondo carbón, el gorila de fuego original
   entero, "Jonah Beast Fuel · Comida a comida", el plato con su porción
   casera en gramos, kcal, proteína, carbos, grasa, si trae arroz o no y
   jonahbeast.com) que se comparte con el menú del celular. El link lleva a
   la portada con ese plato abierto en el buscador (?q=…&fuente=compartir).
   Mismo botón en la portada, en el buscador de la app y en lo anotado. */
import { useState } from 'react';
import { entryMacros, entryGrams, textoPorcion, showToast, vibrar } from './App.jsx';
import { nombreAlimento, linkPlato, arrozDelPlato, slugAlimento } from './buscador.js';

const CARBON = '#16110D', CREMA = '#F7F2E7', NARANJA = '#E8590C', NARANJA_CLARO = '#FF7020';

// Porción en palabras con sus gramos: "1 plato (480 g)"; en gramos, "250 g".
export function textoPorcionConGramos(food, porcion) {
  const gramos = Math.round(entryGrams({ foodKey: food.key, unit: porcion.unit, qty: porcion.qty }));
  if (porcion.unit === 'gramos' || porcion.unit === 'ml') return textoPorcion(porcion);
  return `${textoPorcion(porcion)} (${gramos} g)`;
}

export function datosPlato(food, porcion) {
  // Con el aceite que eligió al anotarlo (si eligió), igual que en su día.
  const m = entryMacros({ foodKey: food.key, unit: porcion.unit, qty: porcion.qty, aceite: porcion.aceite });
  return {
    nombre: nombreAlimento(food),
    porcion: textoPorcionConGramos(food, porcion),
    kcal: Math.round(m.kcal), p: Math.round(m.protein), c: Math.round(m.carbs), g: Math.round(m.fat),
    arroz: arrozDelPlato(food),
    link: linkPlato(food),
  };
}

function partirEnLineas(g, texto, ancho) {
  const palabras = String(texto).split(' ');
  const lineas = []; let actual = '';
  palabras.forEach(w => {
    const prueba = actual ? `${actual} ${w}` : w;
    if (g.measureText(prueba).width > ancho && actual) { lineas.push(actual); actual = w; } else actual = prueba;
  });
  if (actual) lineas.push(actual);
  return lineas;
}

// Tarjeta 1080×1350 (4:5: se ve entera en WhatsApp, Instagram y Facebook).
export async function imagenPlato(d) {
  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = CARBON; g.fillRect(0, 0, W, H);
  const luz = g.createRadialGradient(W / 2, 560, 40, W / 2, 560, 620);
  luz.addColorStop(0, 'rgba(232,89,12,0.22)'); luz.addColorStop(1, 'rgba(232,89,12,0)');
  g.fillStyle = luz; g.fillRect(0, 0, W, H);
  try { await document.fonts?.load?.('120px Anton'); await document.fonts?.load?.('600 40px "Work Sans"'); } catch { /* sin fuentes */ }

  // Marca: el logo original entero (400×480, sin recortar) y el nombre.
  const logo = await new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = '/logo-marca.webp'; });
  if (logo) g.drawImage(logo, 70, 60, 150, 180);
  g.textAlign = 'left';
  g.font = '70px Anton, Impact, sans-serif';
  g.fillStyle = CREMA; g.fillText('JONAH BEAST', 250, 150);
  const anchoJB = g.measureText('JONAH BEAST ').width;
  g.fillStyle = NARANJA_CLARO; g.fillText('FUEL', 250 + anchoJB, 150);
  g.font = '600 30px "Work Sans", sans-serif';
  g.fillStyle = NARANJA_CLARO; g.fillText('C O M I D A   A   C O M I D A', 252, 200);

  // El plato.
  g.textAlign = 'center';
  let tam = 96, lineas;
  do {
    g.font = `${tam}px Anton, Impact, sans-serif`;
    lineas = partirEnLineas(g, d.nombre.toUpperCase(), 940);
    tam -= 6;
  } while (lineas.length > 3 && tam > 54);
  g.fillStyle = CREMA;
  const altoLinea = tam + 14;
  let y = 360;
  lineas.forEach((l, i) => g.fillText(l, W / 2, y + i * altoLinea));
  y += (lineas.length - 1) * altoLinea + 70;
  g.font = '500 42px "Work Sans", sans-serif';
  g.fillStyle = '#C9B99C';
  g.fillText(d.porcion, W / 2, y);

  // Las calorías, en grande.
  y += 210;
  g.font = '230px Anton, Impact, sans-serif';
  g.fillStyle = NARANJA_CLARO;
  const numero = String(d.kcal);
  const anchoNum = g.measureText(numero).width;
  g.font = '70px Anton, Impact, sans-serif';
  const anchoKcal = g.measureText(' KCAL').width;
  const x0 = W / 2 - (anchoNum + anchoKcal) / 2;
  g.textAlign = 'left';
  g.font = '230px Anton, Impact, sans-serif';
  g.fillText(numero, x0, y);
  g.font = '70px Anton, Impact, sans-serif';
  g.fillText(' KCAL', x0 + anchoNum, y);
  g.textAlign = 'center';

  // Proteína, carbos y grasa.
  y += 50;
  const cajas = [[`${d.p} g`, 'PROTEÍNA'], [`${d.c} g`, 'CARBOS'], [`${d.g} g`, 'GRASA']];
  const anchoCaja = 280, sep = 30, xi = (W - (anchoCaja * 3 + sep * 2)) / 2;
  cajas.forEach(([v, n], i) => {
    const x = xi + i * (anchoCaja + sep);
    g.fillStyle = '#1B140E'; g.strokeStyle = 'rgba(232,89,12,0.45)'; g.lineWidth = 3;
    g.beginPath(); g.roundRect ? g.roundRect(x, y, anchoCaja, 150, 24) : g.rect(x, y, anchoCaja, 150); g.fill(); g.stroke();
    g.fillStyle = CREMA; g.font = '64px Anton, Impact, sans-serif'; g.fillText(v, x + anchoCaja / 2, y + 78);
    g.fillStyle = '#A99E8C'; g.font = '600 26px "Work Sans", sans-serif'; g.fillText(n, x + anchoCaja / 2, y + 120);
  });
  y += 150;

  // Con o sin arroz, bien claro.
  if (d.arroz) {
    y += 70;
    const texto = d.arroz === 'sin' ? '🍚 SIN ARROZ: VA APARTE' : '🍚 CON ARROZ INCLUIDO';
    g.font = '600 38px "Work Sans", sans-serif';
    const ancho = g.measureText(texto).width + 70;
    g.fillStyle = d.arroz === 'sin' ? 'rgba(245,164,104,0.14)' : 'rgba(232,89,12,0.18)';
    g.strokeStyle = d.arroz === 'sin' ? '#F5A468' : NARANJA; g.lineWidth = 3;
    g.beginPath(); g.roundRect ? g.roundRect(W / 2 - ancho / 2, y - 48, ancho, 72, 36) : g.rect(W / 2 - ancho / 2, y - 48, ancho, 72); g.fill(); g.stroke();
    g.fillStyle = d.arroz === 'sin' ? '#F5A468' : CREMA;
    g.fillText(texto, W / 2, y + 2);
  }

  // Pie: jonahbeast.com.
  g.fillStyle = '#8A7F6E'; g.font = '500 28px "Work Sans", sans-serif';
  g.fillText('Valores aproximados · cuenta el tuyo comida a comida', W / 2, H - 170);
  g.fillStyle = NARANJA; g.fillRect(0, H - 130, W, 130);
  g.fillStyle = CARBON; g.font = '74px Anton, Impact, sans-serif';
  g.fillText('JONAHBEAST.COM', W / 2, H - 38);
  return new Promise(res => c.toBlob(b => res(b), 'image/png'));
}

async function copiarTexto(texto) {
  try { await navigator.clipboard.writeText(texto); return true; } catch { return false; }
}

// Comparte la tarjeta con el menú del celular; si no se puede, la descarga
// y copia el link. Devuelve 'ok' | 'cancelado' | 'descargado' | 'error'.
export async function compartirPlato(food, porcion) {
  const d = datosPlato(food, porcion);
  const texto = `${d.nombre}: ${d.porcion} ≈ ${d.kcal} kcal 🍽️ Mira las calorías de tu plato aquí: ${d.link}`;
  let blob = null;
  try { blob = await imagenPlato(d); } catch { blob = null; }
  if (blob) {
    const archivo = new File([blob], `calorias-${slugAlimento(food) || 'plato'}.png`, { type: 'image/png' });
    try {
      if (navigator.canShare?.({ files: [archivo] })) { await navigator.share({ files: [archivo], text: texto }); return 'ok'; }
    } catch (e) { if (e?.name === 'AbortError') return 'cancelado'; }
  }
  // Sin compartir con archivo (computadora, navegador viejo): solo el texto
  // con el link, o descargar la imagen y copiar el link.
  try {
    if (!blob && navigator.share) { await navigator.share({ text: texto }); return 'ok'; }
  } catch (e) { if (e?.name === 'AbortError') return 'cancelado'; }
  if (!blob) return (await copiarTexto(texto)) ? 'descargado' : 'error';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `calorias-${slugAlimento(food) || 'plato'}.png`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  await copiarTexto(texto);
  return 'descargado';
}

/* El botón, igual en todas partes. onCompartido(resultado) para medirlo
   (la portada y la app lo anotan distinto). */
export function BotonCompartirPlato({ food, porcion, onCompartido, className = '' }) {
  const [ocupado, setOcupado] = useState(false);
  if (!food || !porcion) return null;
  async function tocar(e) {
    e.stopPropagation();
    if (ocupado) return;
    vibrar(10);
    setOcupado(true);
    const r = await compartirPlato(food, porcion);
    setOcupado(false);
    if (r === 'descargado') showToast('Imagen guardada y link copiado: pégalo donde quieras 👍');
    else if (r === 'error') showToast('No se pudo compartir. Intenta de nuevo.', 'error');
    if (r !== 'error') onCompartido?.(r);
  }
  return (
    <button type="button" onClick={tocar} disabled={ocupado}
      className={'inline-flex items-center justify-center gap-1.5 jb-body text-sm text-zinc-200 border border-zinc-700 hover:border-orange-500 rounded-full px-3.5 py-2 transition-colors disabled:opacity-60 ' + className}>
      {ocupado ? 'Preparando la imagen…' : '📤 Compartir este plato'}
    </button>
  );
}
