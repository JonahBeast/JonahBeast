/* "¿Cuántas calorías tiene tu plato?" en la portada, sin registrarse
   (pedido por Jonah, 16 oct 2026, idea de Fitia): la persona escribe
   "lomo saltado" y ve al toque sus calorías con la misma lista, las mismas
   medidas caseras y el mismo buscador de la app (src/buscador.js), antes de
   que le pidamos nada. Se descarga solo al abrirlo: la portada sigue liviana.

   Medición (embudo_landing_eventos, evento 'buscador_portada'):
     busco                  → empezó a buscar (una vez por visita)
     vio_resultado:<texto>  → buscó eso y vio resultados
     sin_resultado:<texto>  → buscó eso y no encontró nada
     toco_registro:<clave>  → tocó "Crear mi cuenta gratis" en ese plato
     abrio_link:<plato>     → llegó con un link compartido (?q=)
     registro:<clave>       → creó su cuenta después de usar el buscador
   y 'compartir_plato' con detalle "portada:<clave>". */
import { useState, useEffect, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import { FOODS, unitsFor, entryMacros, registrarEventoEmbudo, FichasPlatos } from './App.jsx';
import { buscarAlimentos, panConPartes, medidaParaPan, unidadPorDefecto, nombreAlimento, slugAlimento, arrozDelPlato, esPlatoSinPapa, fuenteCorta, normalizar, raizPalabra, SINONIMOS } from './buscador.js';
import { BotonCompartirPlato, textoPorcionConGramos } from './compartirPlato.jsx';

const MAX_RESULTADOS = 4;

// Lo que se puede buscar: la lista de la app sin productos escaneados ni la
// carta de PECAFIT (ya no es aliado y repetiría platos con otro número).
function alimentosPortada() {
  return FOODS.filter(f => !f.esProducto && !/PECAFIT/i.test(f.name));
}

// Una vez por visita (pestaña) para cada detalle, así no se cuenta de más.
function anotarUnaVez(detalle) {
  try {
    const clave = 'jb-bp-' + detalle;
    if (sessionStorage.getItem(clave)) return;
    sessionStorage.setItem(clave, '1');
  } catch { /* sin almacenamiento */ }
  registrarEventoEmbudo('buscador_portada', { detalle: String(detalle).slice(0, 120) });
}

// "?q=lomo-saltado-con-arroz": el plato exacto (por su clave) o, si no
// existe, lo que diga el texto.
function platoDelLink(q) {
  const slug = String(q || '').toLowerCase().trim();
  if (!slug) return null;
  const exacto = alimentosPortada().find(f => slugAlimento(f) === slug);
  return { slug, food: exacto || null, texto: exacto ? textoParaBuscar(exacto) : slug.replace(/-/g, ' ') };
}
function textoParaBuscar(f) {
  return f.state && f.state !== '-' ? `${f.name} ${f.state.toLowerCase()}` : f.name;
}

// ¿El alimento tiene TODAS las palabras buscadas? (como el buscador de la
// app). Si ninguno las tiene, el buscador de la app muestra lo que se parece
// a la palabra más larga ("chifles con chancaca" → Chancaca): en la portada
// eso va aparte, como "lo más parecido", para no confundir.
function tieneTodo(f, q) {
  const objetivo = normalizar(f.key + ' ' + f.name + ' ' + (f.group || ''));
  return normalizar(q).split(' ').filter(Boolean).map(raizPalabra).every(w => objetivo.includes(w));
}

export default function BuscadorPortada({ q: qLink, ficha = false, onCerrar, onRegistrar, onFoto }) {
  const [link] = useState(() => platoDelLink(qLink));
  const [texto, setTexto] = useState(link?.texto || '');
  const [fijado, setFijado] = useState(link?.food?.key || null);
  const [verMas, setVerMas] = useState(false);
  const [fuentes, setFuentes] = useState(null);
  const inputRef = useRef(null);
  const cajaRef = useRef(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Llegó con un link compartido (?q=); las fichas de la portada se miden aparte.
    if (link?.slug && !ficha) anotarUnaVez('abrio_link:' + link.slug);
    else if (!link?.slug) setTimeout(() => inputRef.current?.focus(), 80);
    // La fuente de cada alimento (se baja aparte, solo al abrir el buscador).
    import('../docs/alimentos-verificados.json').then(m => setFuentes(m.default?.alimentos || {}), () => {});
    return () => { document.body.style.overflow = prev; };
  }, []);

  const resultados = useMemo(() => {
    const q = texto.trim();
    if (!q) return [];
    const quiereCrudo = /crud/i.test(q);
    let lista = buscarAlimentos(alimentosPortada(), q, 30)
      .map((f, i) => ({ f, i, p: !quiereCrudo && /crud/i.test(f.state || '') ? 1 : 0 }))
      .sort((a, b) => a.p - b.p || a.i - b.i).map(x => x.f);
    if (fijado) {
      const f = FOODS.find(x => x.key === fijado);
      if (f) lista = [f, ...lista.filter(x => x.key !== fijado)];
    }
    return lista;
  }, [texto, fijado]);
  // Solo parecidos (no tienen todas las palabras ni un sinónimo): van aparte.
  // "Pan con palta" no es un plato: salen el pan y lo de dentro (17 oct).
  const enPartes = useMemo(() => !fijado && panConPartes(alimentosPortada(), texto), [texto, fijado]);
  const soloParecidos = resultados.length > 0 && !fijado && !enPartes && !SINONIMOS[normalizar(texto)] && !resultados.some(f => tieneTodo(f, texto));
  // Al cambiar lo que busca, la lista vuelve arriba.
  useEffect(() => { cajaRef.current?.scrollTo?.({ top: 0 }); }, [texto]);

  // Qué buscó, cuando deja de escribir (1,2 s), para saber qué platos piden.
  useEffect(() => {
    const q = normalizar(texto);
    if (q.length < 3) return;
    const t = setTimeout(() => {
      anotarUnaVez('busco');
      anotarUnaVez((resultados.length && !soloParecidos ? 'vio_resultado:' : 'sin_resultado:') + q.slice(0, 60));
    }, 1200);
    return () => clearTimeout(t);
  }, [texto, resultados.length, soloParecidos]);

  function registrar(food) {
    anotarUnaVez('toco_registro:' + (food?.key || 'sin_resultado'));
    try { sessionStorage.setItem('jb-desde-buscador', food?.key || 'sin_resultado'); } catch { /* sin almacenamiento */ }
    onRegistrar();
  }

  const mostrados = resultados.slice(0, verMas ? 10 : MAX_RESULTADOS);
  const q = texto.trim();

  return (
    <div ref={cajaRef} className="fixed inset-0 z-50 bg-zinc-950 overflow-y-auto" role="dialog" aria-label="¿Cuántas calorías tiene tu plato?">
      <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 pb-3" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <img src="/logo-marca.webp" alt="" className="w-7 shrink-0" />
              <h2 className="jb-display text-lg text-zinc-50 tracking-wide leading-tight truncate">¿CUÁNTAS CALORÍAS TIENE TU PLATO?</h2>
            </div>
            <button type="button" onClick={onCerrar} className="text-zinc-400 hover:text-zinc-100 p-2 -m-1 shrink-0" aria-label="Cerrar"><X size={22} /></button>
          </div>
          <div className="relative">
            <input ref={inputRef} type="text" inputMode="search" autoComplete="off" enterKeyHint="search" value={texto}
              onChange={e => { setTexto(e.target.value); setFijado(null); setVerMas(false); }}
              onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
              placeholder="Escribe tu plato. Ej: lomo saltado" aria-label="Escribe tu plato"
              className="w-full jb-body text-base rounded-full pl-4 pr-11 py-3 bg-zinc-900 border border-zinc-700 focus:border-orange-500 text-zinc-50 placeholder:text-zinc-500 outline-none" />
            {texto && (
              <button type="button" onClick={() => { setTexto(''); setFijado(null); setVerMas(false); inputRef.current?.focus(); }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-100" aria-label="Borrar lo escrito">
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        {!q && (
          <>
            <p className="jb-body text-sm text-zinc-400 mb-2">Los más buscados (un plato como se sirve en casa):</p>
            <FichasPlatos onElegir={food => {
              anotarUnaVez('ficha:' + food.key);
              setTexto(textoParaBuscar(food)); setFijado(food.key); setVerMas(false);
            }} />
            <p className="jb-body text-xs text-zinc-500 mt-4 leading-relaxed">Los mismos números de la app: Tabla Peruana de Alimentos (CENAN) primero, con tu plato como se sirve en casa, con o sin arroz.</p>
          </>
        )}

        {q && (!resultados.length || soloParecidos) && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
            <p className="text-3xl mb-1">🍽️</p>
            <p className="jb-body text-sm text-zinc-200 leading-relaxed">Todavía no encuentro <b className="text-zinc-50">«{q}»</b>. Tómale foto a tu plato y la app te dice sus calorías al toque, o crea tu cuenta gratis y lo anotas como te quede más fácil.</p>
            <button type="button" onClick={onFoto} className="mt-3 w-full jb-body text-sm text-zinc-100 border border-zinc-700 hover:border-orange-500 rounded-full py-2.5">📸 Pruébala con tu plato</button>
            <BotonRegistro onClick={() => registrar(null)} />
          </div>
        )}
        {soloParecidos && <p className="jb-body text-sm text-zinc-400 mt-5 mb-2">Lo más parecido que tengo:</p>}
        {enPartes && resultados.length > 0 && <p className="jb-body text-sm text-zinc-400 mb-2">Se cuenta en partes: el pan y lo que va dentro (lo que lleva 1 pan).</p>}

        <div className="flex flex-col gap-3">
          {mostrados.map(f => <TarjetaPlato key={f.key} food={f} fuentes={fuentes} onRegistrar={() => registrar(f)}
            porcion={enPartes ? medidaParaPan(f) : null} />)}
        </div>
        {!verMas && resultados.length > MAX_RESULTADOS && (
          <button type="button" onClick={() => setVerMas(true)} className="w-full mt-3 jb-body text-sm text-zinc-400 hover:text-zinc-200 underline underline-offset-2">
            Ver {Math.min(resultados.length, 10) - MAX_RESULTADOS} más parecidos
          </button>
        )}
      </div>
    </div>
  );
}

function BotonRegistro({ onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="mt-3 w-full bg-orange-500 hover:bg-orange-400 text-zinc-950 rounded-2xl px-4 py-3 text-center shadow-[0_10px_30px_-12px_rgba(232,89,12,.8)]">
      <span className="block jb-body text-[13px] font-semibold leading-snug">📸 Anótalo y que Beast te diga cómo encaja en tu día</span>
      <span className="block jb-display text-lg tracking-wide mt-0.5">CREAR MI CUENTA GRATIS →</span>
    </button>
  );
}

function TarjetaPlato({ food, fuentes, onRegistrar, porcion: dePan = null }) {
  // En "pan con palta": lo que lleva 1 pan (si el alimento tiene esa medida).
  const porcion = dePan && (dePan.unit === 'gramos' || unitsFor(food).some(u => u[0] === dePan.unit)) ? dePan : unidadPorDefecto(food, unitsFor);
  const m = entryMacros({ foodKey: food.key, unit: porcion.unit, qty: porcion.qty });
  const arroz = arrozDelPlato(food);
  const fuente = fuentes ? fuenteCorta(fuentes[food.key]?.fuente) : null;
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="jb-body text-base font-semibold text-zinc-50 leading-snug">{nombreAlimento(food)}</p>
          <p className="jb-body text-sm text-zinc-400 mt-0.5">{textoPorcionConGramos(food, porcion)}</p>
        </div>
        <p className="jb-display text-3xl text-orange-400 tabular-nums leading-none shrink-0 text-right">{Math.round(m.kcal)}<span className="block jb-body text-xs text-orange-300 font-semibold mt-1">kcal</span></p>
      </div>
      <p className="jb-body text-sm text-zinc-300 tabular-nums mt-2">
        Proteína <b className="text-zinc-50">{Math.round(m.protein)} g</b> · Carbos <b className="text-zinc-50">{Math.round(m.carbs)} g</b> · Grasa <b className="text-zinc-50">{Math.round(m.fat)} g</b>
      </p>
      {arroz === 'sin' && <p className="jb-body text-[13px] text-amber-300/90 mt-1.5">🍚 Sin arroz: agrégalo aparte</p>}
      {arroz === 'con' && <p className="jb-body text-[13px] text-zinc-300 mt-1.5">🍚 Con arroz incluido</p>}
      {esPlatoSinPapa(food) && <p className="jb-body text-[13px] text-amber-300/90 mt-1.5">🥔 Sin papa: agrégala aparte</p>}
      {fuente && <p className="jb-body text-[11px] text-zinc-500 mt-1">Fuente: {fuente}</p>}
      <BotonRegistro onClick={onRegistrar} />
      <div className="flex justify-center mt-2">
        <BotonCompartirPlato food={food} porcion={porcion}
          onCompartido={r => registrarEventoEmbudo('compartir_plato', { detalle: `portada:${r}:${food.key}`.slice(0, 120) })} />
      </div>
    </div>
  );
}
