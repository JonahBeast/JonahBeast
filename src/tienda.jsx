// Parte de la app que se descarga solo cuando hace falta (tienda).
// Se generó separando src/App.jsx: el código es el mismo de antes.
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Plus, Trash2, LogOut, Eye, ShieldCheck, X, ChevronRight, Flame, Salad, UserPlus, AlertTriangle, Loader2, MessageCircle, Target, LayoutDashboard, TrendingUp, Camera, CreditCard, Mic, ShoppingCart, Phone } from 'lucide-react';
import { supabase, supabaseUrl, supabaseKey } from './supabaseClient';
import {
  CATEGORIAS_TIENDA,
  Field,
  btnPrimary,
  cambiarCantidad,
  inputCls,
} from './App.jsx';

/* ------------------------------------------------------------------ */
/* ROOT APP                                                             */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* JONAH BEAST STORE                                                    */
/* ------------------------------------------------------------------ */

// Nombres de archivo de los logos en /public/marcas/ (sin la extensión .png)
const MARCAS_TRABAJAMOS = ['evogen', 'insane-labz', 'bluhealth-nutrition', 'dragon-pharma', 'youngla'];

const DEPARTAMENTOS_PERU = {
  'Amazonas': ['Chachapoyas', 'Bagua', 'Bongará', 'Condorcanqui', 'Luya', 'Rodríguez de Mendoza', 'Utcubamba'],
  'Áncash': ['Huaraz', 'Aija', 'Antonio Raymondi', 'Asunción', 'Bolognesi', 'Carhuaz', 'Carlos F. Fitzcarrald', 'Casma', 'Corongo', 'Huari', 'Huarmey', 'Huaylas', 'Mariscal Luzuriaga', 'Ocros', 'Pallasca', 'Pomabamba', 'Recuay', 'Santa', 'Sihuas', 'Yungay'],
  'Apurímac': ['Abancay', 'Andahuaylas', 'Antabamba', 'Aymaraes', 'Cotabambas', 'Chincheros', 'Grau'],
  'Arequipa': ['Arequipa', 'Camaná', 'Caravelí', 'Castilla', 'Caylloma', 'Condesuyos', 'Islay', 'La Unión'],
  'Ayacucho': ['Huamanga', 'Cangallo', 'Huanca Sancos', 'Huanta', 'La Mar', 'Lucanas', 'Parinacochas', 'Páucar del Sara Sara', 'Sucre', 'Víctor Fajardo', 'Vilcas Huamán'],
  'Cajamarca': ['Cajamarca', 'Cajabamba', 'Celendín', 'Chota', 'Contumazá', 'Cutervo', 'Hualgayoc', 'Jaén', 'San Ignacio', 'San Marcos', 'San Miguel', 'San Pablo', 'Santa Cruz'],
  'Callao': ['Callao'],
  'Cusco': ['Cusco', 'Acomayo', 'Anta', 'Calca', 'Canas', 'Canchis', 'Chumbivilcas', 'Espinar', 'La Convención', 'Paruro', 'Paucartambo', 'Quispicanchi', 'Urubamba'],
  'Huancavelica': ['Huancavelica', 'Acobamba', 'Angaraes', 'Castrovirreyna', 'Churcampa', 'Huaytará', 'Tayacaja'],
  'Huánuco': ['Huánuco', 'Ambo', 'Dos de Mayo', 'Huacaybamba', 'Huamalíes', 'Leoncio Prado', 'Marañón', 'Pachitea', 'Puerto Inca', 'Lauricocha', 'Yarowilca'],
  'Ica': ['Ica', 'Chincha', 'Nazca', 'Palpa', 'Pisco'],
  'Junín': ['Huancayo', 'Concepción', 'Chanchamayo', 'Jauja', 'Junín', 'Satipo', 'Tarma', 'Yauli', 'Chupaca'],
  'La Libertad': ['Trujillo', 'Ascope', 'Bolívar', 'Chepén', 'Julcán', 'Otuzco', 'Pacasmayo', 'Pataz', 'Sánchez Carrión', 'Santiago de Chuco', 'Gran Chimú', 'Virú'],
  'Lambayeque': ['Chiclayo', 'Ferreñafe', 'Lambayeque'],
  'Lima': ['Lima', 'Barranca', 'Cajatambo', 'Canta', 'Cañete', 'Huaral', 'Huarochirí', 'Huaura', 'Oyón', 'Yauyos'],
  'Loreto': ['Maynas', 'Alto Amazonas', 'Datem del Marañón', 'Loreto', 'Mariscal Ramón Castilla', 'Putumayo', 'Requena', 'Ucayali'],
  'Madre de Dios': ['Tambopata', 'Manú', 'Tahuamanu'],
  'Moquegua': ['Mariscal Nieto', 'General Sánchez Cerro', 'Ilo'],
  'Pasco': ['Pasco', 'Daniel Alcides Carrión', 'Oxapampa'],
  'Piura': ['Piura', 'Ayabaca', 'Huancabamba', 'Morropón', 'Paita', 'Sullana', 'Talara', 'Sechura'],
  'Puno': ['Puno', 'Azángaro', 'Carabaya', 'Chucuito', 'El Collao', 'Huancané', 'Lampa', 'Melgar', 'Moho', 'San Antonio de Putina', 'San Román', 'Sandia', 'Yunguyo'],
  'San Martín': ['Moyobamba', 'Bellavista', 'El Dorado', 'Huallaga', 'Lamas', 'Mariscal Cáceres', 'Picota', 'Rioja', 'San Martín', 'Tocache'],
  'Tacna': ['Tacna', 'Candarave', 'Jorge Basadre', 'Tarata'],
  'Tumbes': ['Tumbes', 'Contralmirante Villar', 'Zarumilla'],
  'Ucayali': ['Coronel Portillo', 'Atalaya', 'Padre Abad', 'Purús'],
};

function TiendaProductoCard({ p, variantes, onAgregar, ancho }) {
  const hayStock = variantes.some(v => v.stock > 0);
  const precio = p.precio_oferta || p.precio;
  const esSuplemento = p.categoria === 'suplementos';
  // Con foto de modelo: la persona usando la prenda va como principal
  // (llena el recuadro) y la foto del producto solo aparece al pasar
  // el mouse, o al tocar la imagen en el celular (donde no hay hover).
  const tieneModelo = !!p.imagen_modelo_url;
  const [verProducto, setVerProducto] = useState(false);
  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden group transition-all hover:border-orange-600/60 hover:shadow-lg hover:shadow-orange-950/40 ${ancho || ''}`}>
      <div className={`${tieneModelo ? 'h-56' : 'h-44'} relative flex items-center justify-center overflow-hidden`}
        onClick={() => tieneModelo && p.imagen_url && setVerProducto(v => !v)}
        style={{ background: esSuplemento
          ? 'linear-gradient(135deg, rgba(62,138,138,0.35), rgba(20,25,28,1))'
          : 'linear-gradient(135deg, rgba(255,90,46,0.30), rgba(20,20,24,1))' }}>
        {tieneModelo ? (
          <>
            <img src={p.imagen_modelo_url} alt={p.nombre} loading="lazy"
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${p.imagen_url ? 'group-hover:opacity-0' : ''} ${verProducto ? 'opacity-0' : 'opacity-100'}`} />
            {p.imagen_url && (
              <img src={p.imagen_url} alt={p.nombre} loading="lazy"
                className={`absolute inset-0 w-full h-full object-contain p-2 transition-opacity duration-300 group-hover:opacity-100 ${verProducto ? 'opacity-100' : 'opacity-0'}`} />
            )}
            {p.imagen_url && (
              <span className="absolute bottom-1.5 right-1.5 flex gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${verProducto ? 'bg-zinc-500' : 'bg-orange-500'}`} />
                <span className={`w-1.5 h-1.5 rounded-full ${verProducto ? 'bg-orange-500' : 'bg-zinc-500'}`} />
              </span>
            )}
          </>
        ) : p.imagen_url
          ? <img src={p.imagen_url} alt={p.nombre} loading="lazy" className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-110" />
          : <span className="text-zinc-500 text-[11px]">📦 Foto próximamente</span>}
        {p.precio_oferta && (
          <span className="absolute top-2 left-2 bg-orange-500 text-zinc-950 text-[9px] font-bold px-1.5 py-0.5 rounded">OFERTA</span>
        )}
      </div>
      <div className="p-2.5">
        <div className="text-zinc-200 text-xs font-medium leading-tight">{p.nombre}</div>
        {p.marca && <div className="text-teal-400 text-[10px] mt-0.5 font-medium">{p.marca}</div>}
        <div className="flex items-baseline gap-1.5 mt-1">
          {p.precio_oferta && <span className="text-zinc-500 text-[10px] line-through">S/{p.precio.toFixed(2)}</span>}
          <span className="text-orange-500 text-sm font-bold">S/{precio.toFixed(2)}</span>
        </div>
        {!hayStock ? (
          <div className="mt-2 text-center text-[11px] text-zinc-600 bg-zinc-950 rounded-lg py-1.5">Agotado</div>
        ) : (
          <select
            defaultValue=""
            onChange={e => {
              const v = variantes.find(x => x.id === e.target.value);
              if (v && v.stock > 0) onAgregar(v);
              e.target.value = '';
            }}
            className="mt-2 w-full bg-gradient-to-r from-orange-500 to-orange-600 text-zinc-950 text-[11px] font-semibold rounded-lg py-1.5 text-center"
          >
            <option value="" disabled>Elegir</option>
            {variantes.map(v => (
              <option key={v.id} value={v.id} disabled={v.stock === 0}>
                {v.nombre}{v.stock === 0 ? ' (agotado)' : ''}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

function TiendaSeccionCurada({ titulo, productos, variantesPorProducto, onAgregar }) {
  if (!productos.length) return null;
  return (
    <div className="py-4">
      <h2 className="jb-display text-sm text-zinc-100 px-5 mb-2.5 tracking-wide">{titulo}</h2>
      <div className="flex gap-3 overflow-x-auto px-5 pb-1" style={{ scrollSnapType: 'x mandatory' }}>
        {productos.map(p => (
          <div key={p.id} style={{ scrollSnapAlign: 'start' }} className="shrink-0 w-36">
            <TiendaProductoCard p={p} variantes={variantesPorProducto[p.id] || []}
              onAgregar={v => onAgregar(p, v)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function TiendaPublica({ username, onIrALaApp }) {
  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState([]);
  const [variantesPorProducto, setVariantesPorProducto] = useState({});
  const [categoria, setCategoria] = useState('todos');
  const [marcaFiltro, setMarcaFiltro] = useState('todas');
  const [carrito, setCarrito] = useState([]);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [checkoutAbierto, setCheckoutAbierto] = useState(false);
  const [cliente, setCliente] = useState({ nombre: '', telefono: '', correo: '', direccion: '', departamento: '', provincia: '', distrito: '', fechaNacimiento: '' });
  const [enviando, setEnviando] = useState(false);
  const [err, setErr] = useState('');
  const [codigoDescuento, setCodigoDescuento] = useState('');
  const [newsletterCorreo, setNewsletterCorreo] = useState('');
  const [newsletterOk, setNewsletterOk] = useState(false);
  const [globoAyudaVisible, setGloboAyudaVisible] = useState(true);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    try {
      const { data: prods } = await supabase.from('tienda_productos').select('*').eq('activo', true).order('creado_en');
      const { data: vars } = await supabase.from('tienda_variantes').select('*');
      setProductos(prods || []);
      const porProd = {};
      (vars || []).forEach(v => {
        porProd[v.producto_id] = porProd[v.producto_id] || [];
        porProd[v.producto_id].push(v);
      });
      setVariantesPorProducto(porProd);
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
    setLoading(false);
  }

  const marcas = useMemo(() => {
    const set = new Set(productos.filter(p => p.categoria === 'suplementos' && p.marca).map(p => p.marca));
    return Array.from(set);
  }, [productos]);

  const productosFiltrados = productos.filter(p => {
    if (categoria !== 'todos' && p.categoria !== categoria) return false;
    if (categoria === 'suplementos' && marcaFiltro !== 'todas' && p.marca !== marcaFiltro) return false;
    return true;
  });

  function agregarAlCarrito(producto, variante) {
    setCarrito(prev => {
      const existe = prev.find(i => i.varianteId === variante.id);
      if (existe) return prev.map(i => i.varianteId === variante.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      const precio = producto.precio_oferta || producto.precio;
      return [...prev, {
        varianteId: variante.id, productoId: producto.id, nombre: producto.nombre,
        varianteNombre: variante.nombre, precio, cantidad: 1,
      }];
    });
    setCarritoAbierto(true);
  }

  function cambiarCantidad(varianteId, delta) {
    setCarrito(prev => prev
      .map(i => i.varianteId === varianteId ? { ...i, cantidad: i.cantidad + delta } : i)
      .filter(i => i.cantidad > 0));
  }

  const totalCarrito = carrito.reduce((a, i) => a + i.precio * i.cantidad, 0);

  async function confirmarPedido() {
    setErr('');
    if (!cliente.nombre.trim() || !cliente.telefono.trim() || !cliente.correo.trim()) {
      return setErr('Completa nombre, celular y correo.');
    }
    if (!cliente.departamento || !cliente.provincia || !cliente.distrito.trim() || !cliente.direccion.trim()) {
      return setErr('Completa departamento, provincia, distrito y dirección para el envío.');
    }
    setEnviando(true);
    try {
      const distritoCompleto = `${cliente.distrito.trim()}, ${cliente.provincia}, ${cliente.departamento}`;
      const { data, error } = await supabase.functions.invoke('crear-pedido-tienda', {
        body: {
          items: carrito.map(i => ({ varianteId: i.varianteId, cantidad: i.cantidad })),
          nombreCliente: cliente.nombre.trim(), telefonoCliente: cliente.telefono.trim(),
          correo: cliente.correo.trim(), direccion: cliente.direccion.trim(), distrito: distritoCompleto,
          fechaNacimiento: cliente.fechaNacimiento || null,
          codigoDescuento: codigoDescuento.trim() || null,
          username: username || null,
        },
      });
      if (error || !data?.init_point) throw new Error(data?.error || 'No se pudo procesar el pedido.');
      window.location.href = data.init_point;
    } catch (e) {
      setErr(e.message || 'No se pudo conectar con Mercado Pago.');
    }
    setEnviando(false);
  }

  function whatsappPedido() {
    const detalle = carrito.map(i => `${i.cantidad}x ${i.nombre} (${i.varianteNombre})`).join(', ');
    const texto = `Hola, quiero comprar: ${detalle}. Total aprox: S/ ${totalCarrito.toFixed(2)}`;
    window.open(`https://wa.me/51963760819?text=${encodeURIComponent(texto)}`, '_blank');
  }

  async function suscribirseNewsletter() {
    if (!newsletterCorreo.trim() || !newsletterCorreo.includes('@')) return;
    try {
      await supabase.from('tienda_newsletter').insert({ correo: newsletterCorreo.trim() });
      setNewsletterOk(true);
    } catch {
      setNewsletterOk(true); // si ya estaba suscrito, igual mostramos éxito
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 jb-body pb-24" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-950/95 backdrop-blur z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-teal-500 flex items-center justify-center text-sm">🦍</div>
          <span className="jb-display text-sm text-zinc-100">JONAH <span className="text-orange-500">BEAST</span> <span className="text-teal-400">STORE</span></span>
        </div>
        <button onClick={() => setCarritoAbierto(true)} className="relative">
          <ShoppingCart size={20} className="text-zinc-200" />
          {carrito.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-orange-500 text-zinc-950 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {carrito.reduce((a, i) => a + i.cantidad, 0)}
            </span>
          )}
        </button>
      </div>

      {/* Barra promocional a color, tipo ticker */}
      <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-teal-500 text-zinc-950 text-[11px] font-semibold text-center py-2">
        🔥 ENVÍO GRATIS DESDE S/200 · PAGA CON MERCADO PAGO O WHATSAPP
      </div>

      {/* Hero de bienvenida con degradado de marca */}
      <div className="relative overflow-hidden px-5 pt-8 pb-5 text-center"
        style={{ background: 'radial-gradient(circle at 50% -10%, rgba(255,90,46,0.25), transparent 60%), radial-gradient(circle at 20% 100%, rgba(62,138,138,0.2), transparent 55%)' }}>
        <h1 className="jb-display text-2xl text-zinc-50 leading-tight">EQUÍPATE COMO<br /><span className="text-orange-500">BESTIA</span></h1>
        <p className="text-zinc-400 text-xs mt-2">Ropa, accesorios, suplementos deportivos <span className="text-teal-400 font-medium">y estilo de vida</span></p>
        <p className="text-teal-400 text-[11px] mt-2 mb-4">📦 Coordina la entrega el mismo día por WhatsApp (sujeto a stock y zona)</p>

        {/* Franja de marcas con las que trabajamos, deslizándose sin parar, a buen tamaño */}
        <div className="overflow-hidden -mx-5">
          <div className="flex items-center gap-5 whitespace-nowrap" style={{ animation: 'marquee-marcas 22s linear infinite', width: 'max-content' }}>
            {[...MARCAS_TRABAJAMOS, ...MARCAS_TRABAJAMOS].map((m, i) => (
              <img key={i} src={`/marcas/${m}.png`} alt={m} className="h-32 rounded-xl shrink-0 shadow-lg" />
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden border-y border-zinc-900 py-1.5 bg-zinc-950">
        <div className="whitespace-nowrap text-[11px] text-zinc-600 font-medium" style={{ animation: 'marquee 18s linear infinite' }}>
          🔥 LO NUEVO &nbsp;·&nbsp; 💪 ESTILO Y ACTITUD BESTIA &nbsp;·&nbsp; 🚀 ENVÍOS A TODO EL PERÚ &nbsp;·&nbsp; 🔥 LO NUEVO &nbsp;·&nbsp; 💪 ESTILO Y ACTITUD BESTIA &nbsp;·&nbsp; 🚀 ENVÍOS A TODO EL PERÚ &nbsp;·&nbsp;
        </div>
        <style>{`@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
          @keyframes marquee-marcas { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
      </div>

      <div className="flex gap-2 px-5 py-3 overflow-x-auto border-b border-zinc-900">
        <button onClick={() => setCategoria('todos')} className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${categoria === 'todos' ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-zinc-950 font-semibold shadow-lg shadow-orange-500/20' : 'bg-zinc-900 text-zinc-400'}`}>Lo nuevo</button>
        {CATEGORIAS_TIENDA.map(c => (
          <button key={c.id} onClick={() => setCategoria(c.id)} className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${categoria === c.id ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-zinc-950 font-semibold shadow-lg shadow-orange-500/20' : 'bg-zinc-900 text-zinc-400'}`}>{c.label}</button>
        ))}
      </div>

      {categoria === 'suplementos' && marcas.length > 0 && (
        <div className="flex gap-2 px-5 py-2 overflow-x-auto">
          <button onClick={() => setMarcaFiltro('todas')} className={`text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap border ${marcaFiltro === 'todas' ? 'border-teal-500 text-teal-400 bg-teal-500/10' : 'border-zinc-800 text-zinc-500'}`}>Todas las marcas</button>
          {marcas.map(m => (
            <button key={m} onClick={() => setMarcaFiltro(m)} className={`text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap border ${marcaFiltro === m ? 'border-teal-500 text-teal-400 bg-teal-500/10' : 'border-zinc-800 text-zinc-500'}`}>{m}</button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-orange-500" size={24} /></div>
      ) : productosFiltrados.length === 0 ? (
        <p className="text-center text-zinc-500 text-sm py-16">Sin productos en esta categoría todavía.</p>
      ) : categoria === 'todos' ? (
        <div className="pb-2">
          <TiendaSeccionCurada titulo="🔥 LO NUEVO" productos={productos.slice(0, 10)}
            variantesPorProducto={variantesPorProducto} onAgregar={agregarAlCarrito} />
          <TiendaSeccionCurada titulo="PARA ÉL" productos={productos.filter(p => p.categoria === 'hombre')}
            variantesPorProducto={variantesPorProducto} onAgregar={agregarAlCarrito} />
          <TiendaSeccionCurada titulo="PARA ELLA" productos={productos.filter(p => p.categoria === 'mujer')}
            variantesPorProducto={variantesPorProducto} onAgregar={agregarAlCarrito} />
          <TiendaSeccionCurada titulo="ACCESORIOS" productos={productos.filter(p => p.categoria === 'accesorios')}
            variantesPorProducto={variantesPorProducto} onAgregar={agregarAlCarrito} />
          <TiendaSeccionCurada titulo="SUPLEMENTOS" productos={productos.filter(p => p.categoria === 'suplementos')}
            variantesPorProducto={variantesPorProducto} onAgregar={agregarAlCarrito} />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-4 max-w-5xl mx-auto">
          {productosFiltrados.map(p => (
            <TiendaProductoCard key={p.id} p={p} variantes={variantesPorProducto[p.id] || []}
              onAgregar={v => agregarAlCarrito(p, v)} />
          ))}
        </div>
      )}

      {/* Newsletter + métodos de pago */}
      <div className="px-5 py-8 border-t border-zinc-900 mt-4 flex flex-col items-center gap-3">
        <p className="text-zinc-300 text-xs font-medium">Suscríbete para enterarte de lanzamientos</p>
        {newsletterOk ? (
          <p className="text-emerald-400 text-xs">✓ ¡Listo! Ya estás suscrito.</p>
        ) : (
          <div className="flex gap-2 w-full max-w-xs">
            <input type="email" placeholder="tucorreo@ejemplo.com" value={newsletterCorreo}
              onChange={e => setNewsletterCorreo(e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200" />
            <button onClick={suscribirseNewsletter} className="bg-teal-600 text-zinc-950 text-xs font-semibold rounded-lg px-3">OK</button>
          </div>
        )}
        <div className="flex gap-2.5 mt-2 items-center">
          {/* Visa: fondo azul, texto blanco en cursiva */}
          <div className="w-10 h-6 rounded flex items-center justify-center" style={{ background: '#1A1F71' }}>
            <span className="text-white text-[10px] font-bold italic tracking-tight">VISA</span>
          </div>
          {/* Mastercard: los dos círculos superpuestos rojo/naranja */}
          <div className="w-10 h-6 rounded bg-zinc-100 flex items-center justify-center relative">
            <div className="w-3.5 h-3.5 rounded-full absolute" style={{ background: '#EB001B', right: '19px' }} />
            <div className="w-3.5 h-3.5 rounded-full absolute" style={{ background: '#F79E1B', left: '19px', mixBlendMode: 'multiply' }} />
          </div>
          {/* American Express: caja azul */}
          <div className="w-10 h-6 rounded flex items-center justify-center" style={{ background: '#2E77BC' }}>
            <span className="text-white text-[8px] font-bold">AMEX</span>
          </div>
          {/* Diners Club: círculo azul oscuro */}
          <div className="w-10 h-6 rounded bg-zinc-100 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#0079BE' }}>
              <div className="w-2 h-2 rounded-full bg-zinc-100" />
            </div>
          </div>
        </div>
        <p className="text-zinc-600 text-[10px]">Pagos procesados de forma segura por Mercado Pago</p>
      </div>

      <button onClick={onIrALaApp} className="fixed bottom-4 left-4 right-4 bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs py-2.5 rounded-xl">
        ← Ir a Jonah Beast Fuel (la app de nutrición)
      </button>

      {/* Burbuja flotante de ayuda, con Jonah como cara del ecosistema */}
      <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-2">
        {globoAyudaVisible && (
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl rounded-br-sm px-3.5 py-2.5 shadow-lg max-w-[200px] relative">
            <button onClick={() => setGloboAyudaVisible(false)}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center">
              <X size={11} className="text-zinc-300" />
            </button>
            <p className="text-zinc-200 text-xs font-medium">¿Necesitas ayuda?</p>
            <p className="text-orange-400 text-xs">Escríbeme 👋</p>
          </div>
        )}
        <a href="https://wa.me/51963760819?text=Hola%2C%20tengo%20una%20consulta%20sobre%20la%20tienda"
          target="_blank" rel="noopener noreferrer"
          className="w-14 h-14 rounded-full bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/40 overflow-hidden border-2 border-emerald-400/50">
          <img src="/jonah-avatar.png" alt="Jonah" className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
          <span style={{ display: 'none' }} className="w-full h-full items-center justify-center">
            <MessageCircle size={22} className="text-white" />
          </span>
        </a>
      </div>

      {/* Carrito lateral */}
      {carritoAbierto && !checkoutAbierto && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setCarritoAbierto(false)} />
          <div className="relative w-full max-w-sm bg-zinc-950 h-full flex flex-col">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="jb-display text-sm text-zinc-100">TU CARRITO</h2>
              <button onClick={() => setCarritoAbierto(false)}><X size={18} className="text-zinc-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {carrito.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center mt-8">Tu carrito está vacío.</p>
              ) : carrito.map(i => (
                <div key={i.varianteId} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex justify-between items-center gap-2">
                  <div className="min-w-0">
                    <div className="text-zinc-200 text-xs">{i.nombre}</div>
                    <div className="text-zinc-500 text-[11px]">{i.varianteNombre} · S/{i.precio.toFixed(2)}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => cambiarCantidad(i.varianteId, -1)} className="w-6 h-6 rounded bg-zinc-800 text-zinc-300">-</button>
                    <span className="text-zinc-200 text-xs w-4 text-center">{i.cantidad}</span>
                    <button onClick={() => cambiarCantidad(i.varianteId, 1)} className="w-6 h-6 rounded bg-zinc-800 text-zinc-300">+</button>
                  </div>
                </div>
              ))}
            </div>
            {carrito.length > 0 && (
              <div className="p-4 border-t border-zinc-800 flex flex-col gap-2">
                <div className="flex gap-2">
                  <input placeholder="Código de descuento" value={codigoDescuento}
                    onChange={e => setCodigoDescuento(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200" />
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-zinc-400">Total</span>
                  <span className="text-orange-500 font-semibold">S/{totalCarrito.toFixed(2)}</span>
                </div>
                <p className="text-[10px] text-zinc-600 -mt-1">El descuento se aplica al pagar, si el código es válido.</p>
                <button onClick={() => setCheckoutAbierto(true)} className={btnPrimary + ' py-3'}>Pagar con Mercado Pago</button>
                <button onClick={whatsappPedido} className="bg-emerald-600 text-white text-sm font-semibold rounded-xl py-3 flex items-center justify-center gap-2">
                  <MessageCircle size={16} /> Comprar por WhatsApp
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout */}
      {checkoutAbierto && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setCheckoutAbierto(false)} />
          <div className="relative w-full max-w-sm bg-zinc-950 h-full flex flex-col overflow-y-auto p-5 gap-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="jb-display text-sm text-zinc-100">DATOS DE ENVÍO</h2>
              <button onClick={() => setCheckoutAbierto(false)}><X size={18} className="text-zinc-400" /></button>
            </div>
            <Field label="Nombre completo">
              <input value={cliente.nombre} onChange={e => setCliente(v => ({ ...v, nombre: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Celular">
              <input type="tel" value={cliente.telefono} onChange={e => setCliente(v => ({ ...v, telefono: e.target.value }))} className={inputCls} placeholder="999 888 777" />
            </Field>
            <Field label="Correo">
              <input type="email" value={cliente.correo} onChange={e => setCliente(v => ({ ...v, correo: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Departamento">
              <select value={cliente.departamento}
                onChange={e => setCliente(v => ({ ...v, departamento: e.target.value, provincia: '' }))}
                className={inputCls}>
                <option value="">Elige tu departamento...</option>
                {Object.keys(DEPARTAMENTOS_PERU).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            {cliente.departamento && (
              <Field label="Provincia">
                <select value={cliente.provincia} onChange={e => setCliente(v => ({ ...v, provincia: e.target.value }))} className={inputCls}>
                  <option value="">Elige tu provincia...</option>
                  {DEPARTAMENTOS_PERU[cliente.departamento].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
            )}
            <Field label="Distrito">
              <input value={cliente.distrito} onChange={e => setCliente(v => ({ ...v, distrito: e.target.value }))} className={inputCls} placeholder="Ej. San Miguel" />
            </Field>
            <Field label="Dirección">
              <input value={cliente.direccion} onChange={e => setCliente(v => ({ ...v, direccion: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Fecha de nacimiento (opcional, para sorpresas 🎂)">
              <input type="date" value={cliente.fechaNacimiento} onChange={e => setCliente(v => ({ ...v, fechaNacimiento: e.target.value }))} className={inputCls} />
            </Field>
            {err && <p className="text-red-400 text-xs flex items-center gap-1.5"><AlertTriangle size={13} />{err}</p>}
            <button onClick={confirmarPedido} disabled={enviando} className={btnPrimary + ' py-3 mt-2'}>
              {enviando ? <Loader2 className="animate-spin" size={18} /> : `Pagar S/${totalCarrito.toFixed(2)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export {
  TiendaPublica,
};
