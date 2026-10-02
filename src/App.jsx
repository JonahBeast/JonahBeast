import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Plus, Trash2, LogOut, Eye, ShieldCheck, X, ChevronRight, Flame, Salad, UserPlus, AlertTriangle, Loader2, MessageCircle, Target, LayoutDashboard, TrendingUp, CreditCard, Mic, ShoppingCart, Phone } from 'lucide-react';
import { supabase, supabaseUrl, supabaseKey } from './supabaseClient';

// Partes que se descargan solo cuando hacen falta: quien entra a la
// portada no baja el panel de admin, la app del alumno ni la tienda.
// Si alguien tenía la app abierta durante una actualización, la parte que
// pide ya no existe: se recarga la página una vez para traer la versión nueva.
function cargarParte(importar) {
  return () => importar().then(m => { try { sessionStorage.removeItem('jb-recarga-parte'); } catch {} return m; }).catch(err => {
    let yaRecargo = false;
    try { yaRecargo = sessionStorage.getItem('jb-recarga-parte') === '1'; sessionStorage.setItem('jb-recarga-parte', '1'); } catch {}
    if (!yaRecargo) { window.location.reload(); return new Promise(() => {}); }
    throw err;
  });
}
const AdminDashboard = React.lazy(cargarParte(() => import('./admin.jsx').then(m => ({ default: m.AdminDashboard }))));
const StudentDataModal = React.lazy(cargarParte(() => import('./admin.jsx').then(m => ({ default: m.StudentDataModal }))));
const StudentDashboard = React.lazy(cargarParte(() => import('./alumno.jsx').then(m => ({ default: m.StudentDashboard }))));
const TiendaPublica = React.lazy(cargarParte(() => import('./tienda.jsx').then(m => ({ default: m.TiendaPublica }))));
const PanelReferidor = React.lazy(cargarParte(() => import('./referidor.jsx').then(m => ({ default: m.PanelReferidor }))));

/* ------------------------------------------------------------------ */
/* DATA                                                                */
/* ------------------------------------------------------------------ */

const RAW_FOODS = [
  ["Cereales","Arroz blanco","Crudo",365,7.1,80.0,0.7,1.3],
  ["Cereales","Arroz blanco","Cocido",130,2.7,28.0,0.3,0.4],
  ["Cereales","Arroz verde","Cocido",160,3.3,26.0,4.5,1.5],
  ["Cereales","Arroz amarillo (a la jardinera)","Cocido",150,3.2,26.0,3.5,1.8],
  ["Cereales","Arroz aderezado (con ají panca)","Cocido",165,3.0,27.0,5.0,1.0],
  ["Cereales","Arroz chaufa (solo el arroz)","Cocido",156,4.0,21.6,5.5,0.6],
  ["Cereales","Quinua","Cruda",368,14.1,64.2,6.1,7.0],
  ["Cereales","Quinua","Cocida",120,4.4,21.3,1.9,2.8],
  ["Cereales","Avena en hojuelas","Cruda",389,16.9,66.3,6.9,10.6],
  ["Cereales","Avena","Cocida",71,2.5,12.0,1.5,1.7],
  ["Cereales","Kiwicha","Cruda",371,13.6,65.3,7.0,6.7],
  ["Cereales","Kiwicha","Cocida",102,3.8,19.0,1.6,2.1],
  ["Cereales","Cañihua","Cruda",350,15.0,63.0,7.6,8.0],
  ["Cereales","Cañihua","Cocida",114,4.7,20.9,2.4,3.2],
  ["Cereales","Choclo (maíz)","Crudo",96,3.4,21.0,1.5,2.4],
  ["Cereales","Choclo (maíz)","Cocido",90,3.3,19.0,1.3,2.2],
  ["Cereales","Cereal cornflakes sin gluten","-",378,7.0,84.0,0.4,3.0],
  ["Menestras","Lenteja","Cruda",353,25.8,60.0,1.1,10.7],
  ["Menestras","Lenteja","Cocida",116,9.0,20.0,0.4,7.9],
  ["Menestras","Frejol canario","Crudo",341,21.4,61.3,1.5,15.5],
  ["Menestras","Frejol canario","Cocido",127,8.7,22.8,0.5,6.4],
  ["Menestras","Garbanzo","Crudo",364,19.3,61.0,6.0,17.4],
  ["Menestras","Garbanzo","Cocido",164,8.9,27.4,2.6,7.6],
  ["Menestras","Pallar","Crudo",338,21.5,63.4,1.5,19.0],
  ["Menestras","Pallar","Cocido",113,7.8,20.2,0.4,7.0],
  ["Menestras","Haba seca","Cruda",341,26.1,58.3,1.5,25.0],
  ["Menestras","Haba","Cocida",110,7.9,19.6,0.4,5.4],
  ["Tubérculos","Papa","Cruda",77,2.0,17.0,0.1,2.2],
  ["Tubérculos","Papa","Cocida",87,1.9,20.1,0.1,1.8],
  ["Tubérculos","Camote","Crudo",86,1.6,20.1,0.1,3.0],
  ["Tubérculos","Camote","Cocido",90,2.0,20.7,0.1,3.3],
  ["Tubérculos","Yuca","Cruda",160,1.4,38.1,0.3,1.8],
  ["Tubérculos","Yuca","Cocida",112,0.6,27.1,0.1,1.2],
  ["Tubérculos","Olluco","Crudo",62,1.5,13.9,0.1,1.9],
  ["Tubérculos","Olluco","Cocido",54,1.2,12.3,0.1,1.6],
  ["Tubérculos","Plátano bellaco","Sancochado",116,0.8,31.2,0.2,2.3],
  ["Carnes y aves","Pollo pechuga","Cruda",110,23.0,0.0,1.5,0.0],
  ["Carnes y aves","Pollo pechuga","Cocida",165,31.0,0.0,3.6,0.0],
  ["Carnes y aves","Carne de res (bistec)","Cruda",143,21.4,0.0,6.0,0.0],
  ["Carnes y aves","Carne de res (bistec)","Cocida",217,26.7,0.0,11.8,0.0],
  ["Carnes y aves","Churrasco","Cruda (sin hueso)",155,21.0,0.0,8.0,0.0],
  ["Carnes y aves","Churrasco","Cocida (sin hueso)",235,26.5,0.0,14.0,0.0],
  ["Carnes y aves","Churrasco","Cruda (con hueso)",140,18.9,0.0,7.2,0.0],
  ["Carnes y aves","Churrasco","Cocida (con hueso)",212,23.9,0.0,12.6,0.0],
  ["Carnes y aves","Cerdo (lomo)","Crudo",143,21.0,0.0,6.0,0.0],
  ["Carnes y aves","Cerdo (lomo)","Cocido",212,27.8,0.0,10.7,0.0],
  ["Carnes y aves","Chuleta de cerdo","Cocida",231,25.7,0.0,13.9,0.0],
  ["Carnes y aves","Mollejitas de pollo","Cocidas",172,30.4,0.0,3.7,0.0],
  ["Pescados","Bonito","Crudo",110,22.0,0.0,2.5,0.0],
  ["Pescados","Bonito","Cocido",136,26.0,0.0,3.2,0.0],
  ["Pescados","Atún","Crudo",116,25.4,0.0,1.0,0.0],
  ["Pescados","Atún","Cocido",132,28.2,0.0,1.3,0.0],
  ["Huevos","Huevo de gallina","Crudo",143,12.6,0.7,9.5,0.0],
  ["Huevos","Huevo de gallina","Cocido",155,12.6,1.1,10.6,0.0],
  ["Huevos","Huevo de gallina","Frito",196,13.6,0.8,14.8,0.0],
  ["Huevos","Huevo de codorniz","Crudo",158,13.1,0.4,11.1,0.0],
  ["Huevos","Huevo de codorniz","Cocido",158,13.1,0.4,11.1,0.0],
  ["Lácteos","Leche entera","-",61,3.2,4.8,3.3,0.0],
  ["Lácteos","Leche descremada","-",34,3.4,5.0,0.1,0.0],
  ["Lácteos","Leche sin lactosa","-",46,3.2,4.9,1.5,0.0],
  ["Lácteos","Yogur natural","-",61,3.5,4.7,3.3,0.0],
  ["Lácteos","Queso fresco","-",264,18.5,3.4,20.0,0.0],
  ["Frutas","Plátano de seda","Cruda",89,1.1,22.8,0.3,2.6],
  ["Frutas","Manzana","Cruda",52,0.3,13.8,0.2,2.4],
  ["Frutas","Palta","Cruda",160,2.0,8.5,14.7,6.7],
  ["Frutas","Papaya","Cruda",43,0.5,10.8,0.3,1.7],
  ["Frutas","Mango","Crudo",60,0.8,15.0,0.4,1.6],
  ["Frutas","Mandarina","Cruda",53,0.8,13.3,0.3,1.8],
  ["Frutas","Ensalada de frutas","Estimado - varía según receta",55,0.7,14.0,0.2,1.5],
  ["Frutas","Naranja","Cruda",47,0.9,11.8,0.1,2.4],
  ["Frutas","Durazno","Crudo",39,0.9,9.5,0.3,1.5],
  ["Frutas","Piña","Cruda",50,0.5,13.1,0.1,1.4],
  ["Frutas","Uva","Cruda",69,0.7,18.1,0.2,0.9],
  ["Frutas","Fresa","Cruda",32,0.7,7.7,0.3,2.0],
  ["Verduras","Tomate","Crudo",18,0.9,3.9,0.2,1.2],
  ["Verduras","Lechuga","Cruda",15,1.4,2.9,0.2,1.3],
  ["Verduras","Zanahoria","Cruda",41,0.9,9.6,0.2,2.8],
  ["Verduras","Zanahoria","Cocida",35,0.8,8.2,0.2,3.0],
  ["Verduras","Brócoli","Crudo",34,2.8,6.6,0.4,2.6],
  ["Verduras","Brócoli","Cocido",35,2.4,7.2,0.4,3.3],
  ["Verduras","Espinaca","Cruda",23,2.9,3.6,0.4,2.2],
  ["Verduras","Espinaca","Cocida",23,3.0,3.8,0.3,2.4],
  ["Verduras","Zapallo","Crudo",26,1.0,6.5,0.1,0.5],
  ["Verduras","Zapallo","Cocido",20,0.7,4.9,0.1,1.1],
  ["Verduras","Vainita","Cruda",31,1.8,7.0,0.1,3.4],
  ["Verduras","Vainita","Cocida",35,1.9,7.9,0.2,3.2],
  ["Grasas","Aceite vegetal","-",884,0.0,0.0,100.0,0.0],
  ["Grasas","Mantequilla","-",717,0.9,0.1,81.0,0.0],
  ["Grasas","Maní","Crudo",567,25.8,16.1,49.2,8.5],
  ["Otros","Pan francés","-",274,9.1,55.5,1.7,2.3],
  ["Otros","Rapiditas Clásicas (Bimbo)","-",315,8.5,47.7,10.0,1.8],
  ["Otros","Rapiditas Integrales (Bimbo)","-",246,9.6,36.5,6.7,4.5],
  ["Otros","Rapiditas XL (Bimbo)","-",315,8.5,47.7,10.0,1.8],
  ["Otros","Pan integral","-",247,9.6,46.2,3.3,6.9],
  ["Otros","Pan árabe","-",275,9.1,55.7,1.2,2.2],
  ["Otros","Pan árabe integral","-",262,9.8,55.0,2.6,7.4],
  // Comidas que los alumnos tuvieron que crear a mano o que faltaban
  // (valores por 100 g, estimados de preparaciones típicas en Lima).
  ["Carnes y aves","Jamonada","-",250,12.0,4.0,21.0,0.0],
  ["Carnes y aves","Salchicha (hot dog)","-",290,11.0,3.0,26.0,0.0],
  ["Otros","Tostadas","-",390,12.0,70.0,6.0,4.0],
  ["Platos preparados","Pan con jamonada","-",265,10.1,37.3,8.5,1.5],
  ["Platos preparados","Pan con pollo","-",230,13.0,24.0,9.0,1.5],
  ["Platos preparados","Pan con chicharrón","-",280,12.0,25.0,15.0,1.5],
  ["Platos preparados","Butifarra","-",230,11.0,22.0,11.0,1.5],
  ["Platos preparados","Hot dog","-",260,9.0,23.0,15.0,1.0],
  ["Platos preparados","Hamburguesa de carretilla","-",250,11.0,25.0,12.0,1.5],
  ["Platos preparados","Pizza americana","-",266,11.0,33.0,10.0,2.3],
  ["Platos preparados","Pollo broaster","-",290,22.0,12.0,17.0,0.5],
  ["Platos preparados","Salchipollo","-",260,11.0,22.0,14.0,2.0],
  ["Platos preparados","Sopa wantán","-",60,4.0,6.0,2.0,0.5],
  ["Platos preparados","Humita","-",230,5.0,30.0,10.0,2.5],
  ["Postres","Picarones con miel","-",330,4.0,50.0,13.0,1.5],
  ["Galletas y snacks","Cancha serrana","Tostada",470,8.0,65.0,20.0,7.0],
  ["Cereales","Granola","-",471,10.0,64.0,20.0,7.0],
  ["Grasas","Mantequilla de maní","-",588,25.0,20.0,50.0,6.0],
  ["Bebidas","Refresco de cebada","Con azúcar",40,0.3,10.0,0.0,0.0],
  ["Bebidas","Cerveza","-",43,0.5,3.6,0.0,0.0],
  ["Otros","Cachanga","Frita",320,6.5,42.0,13.5,1.5],
  ["Otros","Chía","Cruda",486,16.5,42.1,30.7,34.4],
  ["Carnes y aves","Pollo pierna (con piel)","Cocida",232,23.5,0.0,15.0,0.0],
  ["Carnes y aves","Pato (sin piel)","Cocido",201,23.5,0.0,11.2,0.0],
  ["Carnes y aves","Cerdo (costilla)","Cocida",290,25.0,0.0,21.0,0.0],
  ["Carnes y aves","Pollo pierna (sin piel)","Cruda",120,20.0,0.0,4.3,0.0],
  ["Carnes y aves","Pollo encuentro (con piel)","Cocido",245,22.8,0.0,16.8,0.0],
  ["Carnes y aves","Pollo encuentro (sin piel)","Cocido",178,24.5,0.0,8.6,0.0],
  ["Carnes y aves","Pollo entrepierna","Cocida",219,23.0,0.0,13.9,0.0],
  ["Carnes y aves","Pollo ala (con piel)","Cocida",266,24.0,0.0,18.5,0.0],
  ["Carnes y aves","Pollo pechuga (con piel)","Cocida",197,29.8,0.0,7.8,0.0],
  ["Carnes y aves","Pollo molido","Cocido",189,23.9,0.0,10.2,0.0],
  ["Carnes y aves","Pollo menudencia (hígado)","Cocido",167,24.5,0.9,6.5,0.0],
  ["Carnes y aves","Gallina","Cocida",237,27.0,0.0,13.9,0.0],
  ["Carnes y aves","Carne de res (lomo fino)","Cocida",180,29.0,0.0,6.6,0.0],
  ["Carnes y aves","Carne molida de res","Cocida",250,26.0,0.0,16.0,0.0],
  ["Carnes y aves","Hígado de res","Cocido",175,26.5,5.1,4.9,0.0],
  ["Menestras","Arveja verde","Cocida",84,5.4,15.6,0.2,5.5],
  ["Menestras","Arveja partida (seca)","Cocida",118,8.3,21.1,0.4,8.3],
  ["Menestras","Frejol negro","Cocido",132,8.9,23.7,0.5,8.7],
  ["Menestras","Frejol panamito","Cocido",127,8.7,22.8,0.5,7.4],
  ["Menestras","Frejol castilla","Cocido",116,7.7,20.8,0.5,6.5],
  ["Menestras","Frejol bayo","Cocido",127,8.2,23.0,0.5,7.9],
  ["Menestras","Lenteja bebé","Cocida",116,9.0,20.1,0.4,7.9],
  ["Menestras","Tarwi (chocho)","Cocido",151,15.6,9.6,6.2,4.8],
  ["Menestras","Soya","Cocida",173,16.6,9.9,9.0,6.0],
  ["Verduras","Zapallo macre","Cocido",34,1.0,8.1,0.1,1.1],
  ["Verduras","Caigua","Cruda",20,0.8,4.3,0.2,1.2],
  ["Verduras","Zapallito italiano","Cocido",17,1.2,3.1,0.3,1.0],
  ["Verduras","Coliflor","Cocida",23,1.8,4.1,0.5,2.3],
  ["Verduras","Col / repollo","Cruda",25,1.3,5.8,0.1,2.5],
  ["Verduras","Betarraga","Cocida",44,1.7,10.0,0.2,2.0],
  ["Verduras","Poro","Crudo",61,1.5,14.2,0.3,1.8],
  ["Verduras","Nabo","Cocido",22,0.7,5.1,0.1,2.0],
  ["Verduras","Alcachofa","Cocida",53,2.9,11.9,0.3,5.7],
  ["Verduras","Champiñón","Cocido",28,2.2,5.3,0.5,2.2],
  ["Verduras","Choclo desgranado","Cocido",96,3.4,21.0,1.5,2.4],
  ["Platos preparados","Locro de zapallo","-",95,3.2,14.5,2.8,2.2],
  ["Platos preparados","Arroz con pato","-",178,11.5,19.0,6.5,1.2],
  ["Platos preparados","Carapulcra","-",165,8.0,20.5,5.5,2.0],
  ["Platos preparados","Olluquito con charqui","-",110,7.5,13.0,3.5,1.8],
  ["Platos preparados","Adobo de cerdo","-",175,15.0,6.0,10.0,0.8],
  ["Platos preparados","Ají de pollo","-",160,9.5,12.0,8.5,1.0],
  ["Platos preparados","Pollo al sillao","-",185,18.5,6.5,9.5,0.5],
  ["Platos preparados","Papa dorada al sillao","Estimado - varía según receta",140,2.2,24.0,3.8,1.7],
  ["Platos preparados","Frejolada (frejol con arroz)","-",140,6.5,22.0,3.0,5.0],
  ["Platos preparados","Menestra de lentejas con arroz","-",130,6.0,21.5,2.5,4.5],
  ["Platos preparados","Chanfainita","-",145,13.0,9.0,6.5,1.0],
  ["Platos preparados","Papa rellena","-",210,7.0,26.0,8.5,2.2],
  ["Platos preparados","Empanada de carne","Horneada",255,9.0,24.0,13.5,1.6],
  ["Platos preparados","Empanada de pollo","Horneada",230,10.5,25.0,10.5,1.4],
  ["Platos preparados","Empanada mixta (carne y pollo)","Horneada",245,10.0,24.5,12.0,1.5],
  ["Platos preparados","Tamal","-",235,7.5,26.0,11.0,2.5],
  ["Platos preparados","Juane","-",190,10.5,20.0,7.5,1.5],
  ["Galletas y snacks","Galleta Morocha (bañada en chocolate)","-",488,5.9,73.9,18.8,0.9],
  ["Galletas y snacks","Galleta de soda (salada)","-",433,10.1,68.0,14.7,3.0],
  ["Galletas y snacks","Galleta de vainilla (dulce, tipo Casino/Margarita)","-",434,6.0,74.9,12.7,1.1],
  ["Galletas y snacks","Galleta Casino (vainilla rellena)","-",478,5.5,68.0,20.0,1.0],
  ["Galletas y snacks","Galleta Margarita (vainilla rellena)","-",480,5.5,67.0,20.5,1.0],
  ["Galletas y snacks","Galleta Chomp (chispas de chocolate)","-",485,6.0,65.0,22.0,1.5],
  ["Galletas y snacks","Galleta Cua Cua (wafer con chocolate)","-",515,6.0,62.0,27.0,1.0],
  ["Galletas y snacks","Galleta Club Social (cracker)","-",480,8.0,65.0,20.0,2.0],
  ["Platos preparados","Pachamanca","-",195,17.0,14.0,8.0,1.8],
  ["Platos preparados","Sopa de pollo con fideos","-",75,5.5,8.0,2.2,0.6],
  ["Platos preparados","Chupe de camarones","-",105,7.5,9.0,4.2,0.8],
  ["Platos preparados","Parihuela","-",90,12.0,4.5,2.5,0.5],
  ["Bebidas","Café negro","Con azúcar",15,0.3,3.4,0.0,0.0],
  ["Bebidas","Café con leche","Con azúcar",58,2.2,7.2,2.2,0.0],
  ["Bebidas","Té / infusión","Con azúcar",14,0.0,3.6,0.0,0.0],
  ["Bebidas","Jugo de papaya","Con azúcar",58,0.5,14.3,0.2,0.8],
  ["Bebidas","Jugo de piña","Con azúcar",66,0.4,16.5,0.1,0.3],
  ["Bebidas","Jugo de naranja","Con azúcar",63,0.7,15.0,0.2,0.2],
  ["Bebidas","Jugo de maracuyá","Con azúcar",70,0.6,17.1,0.2,0.4],
  ["Bebidas","Jugo surtido","Con azúcar",63,0.6,15.4,0.2,0.6],
  ["Bebidas","Limonada","Sin azúcar",8,0.1,2.1,0.0,0.1],
  ["Bebidas","Emoliente","Con azúcar",26,0.1,6.5,0.0,0.0],
  ["Bebidas","Avena / quinua de bebida","Con azúcar",68,1.8,13.5,0.9,0.9],
  ["Bebidas","Chicha morada","Sin azúcar",18,0.1,4.5,0.0,0.1],
  ["Pescados y mariscos","Atún en lata en agua (escurrido)","-",116,25.5,0.0,0.8,0.0],
  ["Pescados y mariscos","Atún en lata en aceite (escurrido)","-",198,29.1,0.0,8.2,0.0],
  ["Pescados y mariscos","Atún en lata en aceite (sin escurrir)","-",250,24.0,0.0,17.0,0.0],
  ["Huevos","Clara de huevo","Cocida",52,10.9,0.7,0.2,0.0],
  ["Huevos","Yema de huevo","Cocida",322,15.9,3.6,26.5,0.0],
  ["Platos preparados","Ají de gallina","-",165,9.0,12.0,9.0,1.0],
  ["Platos preparados","Arroz con pollo","-",150,8.0,19.0,4.5,1.2],
  ["Platos preparados","Pollo a la brasa (solo la presa)","-",215,25.0,0.5,12.5,0.0],
  ["Platos preparados","Pollo a la brasa con papas y ensalada","-",232,14.5,17.0,12.0,1.6],
  ["Platos preparados","Pollada (pollo frito)","-",250,22.0,10.0,14.0,0.8],
  ["Platos preparados","Ceviche de pescado","-",85,14.0,5.0,1.2,0.8],
  ["Platos preparados","Lomo saltado","-",175,11.0,14.0,8.0,1.3],
  ["Platos preparados","Arroz chaufa","-",165,8.0,21.0,5.5,1.0],
  ["Platos preparados","Arroz chaufa de carne","-",167,8.0,17.8,6.6,0.5],
  ["Platos preparados","Arroz chaufa de chancho","-",166,8.2,17.8,6.4,0.5],
  ["Platos preparados","Arroz chaufa especial","-",169,11.4,15.1,6.5,0.4],
  ["Platos preparados","Arroz a la jardinera","-",175,9.3,18.2,7.0,1.3],
  ["Platos preparados","Arroz con chancho","-",202,9.6,18.9,9.8,0.7],
  ["Platos preparados","Ensalada rusa","-",105,1.6,12.7,5.6,2.1],
  ["Platos preparados","Tallarines rojos con pollo","-",170,9.5,20.0,5.5,1.5],
  ["Platos preparados","Tallarines rojos con carne molida","-",160,8.5,18.0,6.0,1.5],
  ["Platos preparados","Tallarines verdes","-",185,8.0,22.0,7.5,1.8],
  ["Platos preparados","Causa limeña","-",145,4.5,20.0,5.5,1.8],
  ["Platos preparados","Papa a la huancaína","-",150,4.5,15.0,8.0,1.6],
  ["Platos preparados","Ocopa arequipeña","-",160,5.0,15.0,9.0,1.8],
  ["Platos preparados","Seco de res con frejoles","-",160,12.0,14.0,6.5,3.0],
  ["Platos preparados","Cau cau","-",120,9.0,12.0,4.0,1.5],
  ["Platos preparados","Tacu tacu","-",200,7.0,28.0,7.0,4.0],
  ["Platos preparados","Rocoto relleno","-",180,8.0,14.0,10.0,1.8],
  ["Platos preparados","Anticucho de corazón","-",150,20.0,3.0,6.5,0.3],
  ["Platos preparados","Chicharrón de pollo","-",260,20.0,14.0,14.0,0.8],
  ["Platos preparados","Chicharrón de chancho","-",350,22.0,0.5,28.0,0.0],
  ["Platos preparados","Arroz con mariscos","-",155,9.0,20.0,4.5,1.2],
  ["Platos preparados","Hamburguesa clásica (Bembos)","-",248,12.0,22.0,13.0,1.5],
  ["Platos preparados","Alitas broaster (Bembos)","-",290,20.0,10.0,19.0,0.5],
  ["Platos preparados","Alitas crocantes (carrito)","Estimado - varía según receta",270,21.0,6.0,18.0,0.3],
  ["Platos preparados","Alitas BBQ (carrito)","Estimado - varía según receta",250,19.0,12.0,14.0,0.2],
  ["Platos preparados","Alitas acevichadas (carrito)","Estimado - varía según receta",260,19.0,8.0,16.0,0.2],
  ["Platos preparados","Alitas búfalo (carrito)","Estimado - varía según receta",280,19.0,4.0,20.0,0.2],
  ["Platos preparados","Papas fritas (comida rápida)","-",312,3.4,41.0,15.0,3.8],
  ["Platos preparados","Hamburguesa clásica (McDonald's)","-",257,12.5,20.0,14.5,1.3],
  ["Platos preparados","McNuggets","-",296,15.0,17.0,19.0,1.0],
  ["Platos preparados","Pieza de pollo Original (KFC)","-",241,20.0,9.0,14.0,0.3],
  ["Platos preparados","Pieza de pollo Crujiente (KFC)","-",270,21.3,10.4,15.9,0.3],
  ["Platos preparados","Alitas picantes (KFC)","-",319,15.5,12.8,22.5,0.3],
  ["Platos preparados","Twister (KFC)","-",269,14.7,13.1,23.1,1.5],
  ["Platos preparados","Milanesa de pollo","-",250,19.0,16.0,12.5,1.0],
  ["Platos preparados","Torreja de espinaca y tomate","-",113,6.5,2.4,8.7,0.7],
  ["Platos preparados","Filete de pollo frito","Estimado - varía según receta",230,21.0,12.0,11.0,0.8],
  ["Platos preparados","Pescado frito","-",200,22.0,7.0,9.5,0.4],
  ["Platos preparados","Sudado de pescado","-",95,15.0,4.5,1.8,0.9],
  ["Platos preparados","Escabeche de pollo","-",130,13.0,7.0,5.5,1.4],
  ["Platos preparados","Salchipapa","-",270,8.0,28.0,14.0,2.5],
  ["Platos preparados","Pollo al horno","-",190,26.0,1.0,9.0,0.2],
  ["Platos preparados","Pollo a la olla (presa con papa y verduras)","-",130,10.7,8.0,5.3,1.4],
  ["Platos preparados","Pollo a la olla con arroz","-",128,7.9,14.9,3.6,1.1],
  ["Platos preparados","Estofado de pollo","-",130,13.0,10.0,4.0,1.3],
  ["Platos preparados","Estofado de carne","-",150,12.5,10.0,7.0,1.2],
  ["Platos preparados","Aguadito de pollo","-",70,5.5,7.5,2.0,0.8],
  ["Platos preparados","Caldo de gallina","-",65,6.5,5.0,2.2,0.4],
  ["Platos preparados","Sopa a la minuta","-",80,5.0,8.5,2.8,0.6],
  ["Platos preparados","Menestrón","-",90,4.5,11.0,3.0,2.2],
  ["Platos preparados","Ensalada de pollo","-",110,12.0,6.0,4.5,1.8],
  ["Platos preparados","Sándwich de pollo","-",230,14.0,26.0,8.0,1.6],
  ["Platos preparados","Panqueques de avena","Estimado - varía según receta",180,7.0,22.0,6.0,2.5],
  ["Platos preparados","Wafle de avena","Estimado - varía según receta",200,6.5,23.0,8.0,2.5],
  ["Cereales","Fideos / pasta","Crudos",371,13.0,74.7,1.5,3.2],
  ["Cereales","Fideos / pasta","Cocidos",131,5.0,25.0,0.9,1.3],
  ["Cereales","Fideos integrales","Cocidos",124,5.3,26.5,0.5,3.9],
  ["Cereales","Tallarín saltado (plato)","-",168,8.5,22.0,5.0,1.5],
  ["Bebidas","Jugo de papaya natural","-",40,0.5,9.8,0.2,0.8],
  ["Bebidas","Jugo de piña natural","-",48,0.4,12.0,0.1,0.3],
  ["Bebidas","Jugo de maracuyá natural","-",52,0.6,12.6,0.2,0.4],
  ["Bebidas","Jugo de fresa natural","-",35,0.5,8.4,0.2,0.9],
  ["Bebidas","Jugo surtido (papaya+piña+naranja)","-",45,0.6,10.9,0.2,0.6],
  ["Bebidas","Limonada con azúcar","-",40,0.1,10.2,0.0,0.1],
  ["Postres","Picarón","-",290,3.5,45.0,10.5,1.2],
  ["Postres","Mazamorra morada","-",105,0.5,25.5,0.2,0.6],
  ["Postres","Arroz con leche","-",130,2.8,24.0,2.6,0.3],
  ["Postres","Combinado (mazamorra + arroz con leche)","-",118,1.7,24.8,1.4,0.5],
  ["Postres","Suspiro a la limeña","-",330,5.5,52.0,11.0,0.0],
  ["Postres","Turrón de Doña Pepa","-",395,4.0,68.0,12.0,1.5],
  ["Postres","Alfajor","-",425,5.0,58.0,19.0,1.5],
  ["Postres","Torta de chocolate","-",370,4.5,52.0,16.0,1.8],
  ["Postres","Helado de vainilla","-",207,3.5,23.6,11.0,0.7],
  ["Postres","Gelatina preparada","-",62,1.2,14.0,0.0,0.0],
  ["Postres","Flan / crema volteada","-",190,4.5,28.0,6.5,0.0],
  ["Postres","Churro relleno","-",380,5.0,48.0,18.5,1.5],
  ["Postres","Queque simple","-",340,5.0,50.0,13.0,1.0],
  ["Postres","Keke de plátano","-",277,4.0,47.4,8.5,1.5],
  ["Postres","Keke de naranja","-",320,5.0,45.0,13.0,1.0],
  ["Postres","Keke de vainilla","-",340,5.0,50.0,13.0,1.0],
  ["Postres","Keke de zanahoria","-",370,4.5,44.0,19.0,1.5],
  ["Postres","Keke marmoleado","-",350,5.0,50.0,15.0,1.0],
  ["Postres","Keke de arándanos","-",330,5.5,50.0,12.0,1.5],
  ["Postres","Panetón","-",340,7.0,55.0,10.0,2.0],
  ["Postres","Torta tres leches","-",285,4.5,35.0,13.0,0.3],
  ["Postres","Cocada","-",460,3.0,55.0,25.0,3.0],
  ["Postres","Manjar blanco","-",315,6.5,55.0,7.5,0.0],
  ["Postres","Leche asada","-",150,3.7,26.7,3.4,0.0],
  ["Postres","Chocolate con leche","-",535,7.6,59.4,29.7,3.4],
  ["Postres","Galleta dulce rellena","-",480,5.0,66.0,21.0,2.0],
  ["Bebidas","Café negro sin azúcar","-",2,0.3,0.0,0.0,0.0],
  ["Bebidas","Café con leche","-",42,2.2,3.3,2.2,0.0],
  ["Bebidas","Café con leche descremada","-",22,2.0,3.0,0.1,0.0],
  ["Bebidas","Capuchino","-",40,2.3,3.4,1.9,0.0],
  ["Bebidas","Capuchino","Con azúcar",58,2.3,7.8,1.9,0.0],
  ["Bebidas","Té / infusión sin azúcar","-",1,0.0,0.2,0.0,0.0],
  ["Bebidas","Agua","-",0,0.0,0.0,0.0,0.0],
  ["Bebidas","Jugo de naranja natural","-",45,0.7,10.4,0.2,0.2],
  ["Bebidas","Gaseosa regular","-",42,0.0,10.6,0.0,0.0],
  ["Bebidas","Gaseosa dietética","-",0,0.0,0.0,0.0,0.0],
  ["Bebidas","Chicha morada con azúcar","-",55,0.1,13.8,0.0,0.1],
  ["Bebidas","Emoliente sin azúcar","-",8,0.1,2.0,0.0,0.0],
  ["Bebidas","Leche de almendras sin azúcar","-",15,0.6,0.6,1.2,0.3],
  ["Bebidas","Leche de coco","-",180,1.8,3.0,18.0,0.0],
  ["Bebidas","Yogur bebible","-",70,3.0,11.0,1.5,0.0],
  ["Otros","Azúcar blanca","-",387,0.0,100.0,0.0,0.0],
  ["Otros","Miel de abeja","-",304,0.3,82.4,0.0,0.2],
  ["Otros","Mermelada","-",278,0.4,68.9,0.1,1.1],
  ["Otros","Galleta de soda","-",421,9.5,71.0,10.6,2.6],
  ["Otros","Avena instantánea en polvo","-",379,13.2,67.7,6.5,10.1],
  ["Otros","Proteína en polvo (whey)","-",400,80.0,8.0,6.0,1.0],
  ["Otros","Crema de arroz","Estimado - varía según marca",375,7.0,83.0,0.5,1.0],
  ["Otros","Proteína en polvo (isolate)","-",380,88.0,3.0,1.0,0.5],
  ["Grasas","Aceite de oliva","-",884,0.0,0.0,100.0,0.0],
  ["Grasas","Mayonesa","-",680,1.0,0.6,75.0,0.0],
  ["Grasas","Almendras","Crudas",579,21.2,21.6,49.9,12.5],
  ["Grasas","Nueces","Crudas",654,15.2,13.7,65.2,6.7],
  ["Grasas","Pecanas","Crudas",691,9.2,13.9,72.0,9.6],
  ["Frutas","Arándanos","Crudos",57,0.7,14.5,0.3,2.4],
  ["Frutas","Sandía","Cruda",30,0.6,7.6,0.2,0.4],
  ["Frutas","Melón","Crudo",34,0.8,8.2,0.2,0.9],
  ["Frutas","Pera","Cruda",57,0.4,15.2,0.1,3.1],
  ["Frutas","Tuna","Cruda (pelada)",41,0.7,9.6,0.5,3.6],
  ["Verduras","Pepino","Crudo",15,0.7,3.6,0.1,0.5],
  ["Verduras","Pimiento","Crudo",31,1.0,6.0,0.3,2.1],
  ["Verduras","Cebolla","Cruda",40,1.1,9.3,0.1,1.7],
  ["Verduras","Apio","Crudo",16,0.7,3.0,0.2,1.6],
  ["Carnes y aves","Pollo pierna (sin piel)","Cocida",177,24.2,0.0,8.1,0.0],
  ["Carnes y aves","Pavo pechuga","Cocida",135,29.0,0.0,1.7,0.0],
  ["Carnes y aves","Pavita muslo (medallón, sin piel)","Cocida",170,28.0,0.0,6.5,0.0],
  ["Carnes y aves","Jamón de pavo","-",104,16.9,2.6,3.0,0.0],
  ["Carnes y aves","Jamón inglés","-",145,18.0,1.5,6.5,0.0],
  ["Carnes y aves","Chorizo parrillero","-",330,17.0,3.0,28.0,0.0],
  ["Pescados","Trucha","Cocida",148,20.8,0.0,6.6,0.0],
  ["Pescados","Langostinos","Cocidos",99,20.9,0.2,1.4,0.0],
  ["Lácteos","Queso parmesano","-",392,35.8,3.2,25.8,0.0],
  ["Lácteos","Yogur griego natural","-",59,10.0,3.6,0.4,0.0],
  ["Lácteos","Yogur saborizado","Con azúcar",90,2.8,15.0,2.2,0.0],
  /* --- Carta PECAFIT (restaurante aliado) --- */
  /* Valores por 100g, recalculados desde "Resumen de Macros Validados — Carta Pecafit"
     (correcciones: filete de pollo en sandwich y bowl andino, stevia en gotas para waffles,
     y 3 recetas nuevas). Peso de porción real en WEIGHT_TABLE más abajo. */
  ["Platos preparados","Sandwich de pollo (PECAFIT)","-",367.36,29.24,21.89,18.46,0.0],
  ["Platos preparados","Sandwich de atún (PECAFIT)","-",345.52,24.26,19.62,19.20,0.0],
  ["Platos preparados","Omelette (PECAFIT)","-",180.36,12.33,12.35,9.68,0.0],
  ["Platos preparados","Bowl de avena (PECAFIT)","-",247.40,8.25,43.85,5.11,0.0],
  ["Platos preparados","Waffles de avena y plátano (PECAFIT)","-",446.43,17.30,75.09,9.77,0.0],
  ["Platos preparados","Waffle de beterraga y mango (PECAFIT)","-",403.13,16.21,66.16,9.15,0.0],
  ["Platos preparados","Filete de pollo (PECAFIT)","-",217.10,12.84,33.23,3.16,0.0],
  ["Platos preparados","Quinua chaufa (PECAFIT)","-",250.93,20.12,28.14,6.10,0.0],
  ["Platos preparados","Bowl andino (PECAFIT)","-",220.19,15.63,29.40,4.31,0.0],
  ["Platos preparados","Bowl Super Power (PECAFIT)","-",262.76,14.66,23.25,13.13,0.0],
  ["Platos preparados","Trucha (PECAFIT)","-",123.28,11.55,9.14,4.48,0.0],
  ["Platos preparados","Peca Power Meat (PECAFIT)","-",114.75,12.60,7.25,3.67,0.0],
  ["Platos preparados","Wrap proteico (PECAFIT)","-",190.96,26.70,4.27,7.26,0.0],
  ["Platos preparados","Wrap filete de pollo (PECAFIT)","-",146.38,24.61,2.07,3.97,0.0],
  ["Platos preparados","Wrap crocante (PECAFIT)","-",128.21,20.31,3.20,3.56,0.0],
  ["Platos preparados","Cake de plátano (PECAFIT)","-",566.74,15.26,59.09,31.05,0.0],
  ["Platos preparados","Torta de cacao (PECAFIT)","-",465.39,12.83,49.35,26.57,0.0],
  ["Platos preparados","Cheesecake (PECAFIT)","-",426.54,15.28,50.41,20.43,0.0],
  ["Platos preparados","Parfait (PECAFIT)","-",138.27,4.63,13.26,8.08,0.0],
];

const FOODS = RAW_FOODS.map(([group, name, state, kcal, protein, carbs, fat, fiber]) => ({
  group, name, state, kcal, protein, carbs, fat, fiber, key: `${name} (${state})`,
}));

const FOOD_GROUPS = [...new Set(FOODS.map(f => f.group))];

/* Alimentos que Jonah agrega desde el panel (tabla alimentos_extra, ver
   "Pedidos de alimentos"). Se suman a FOODS al abrir la app, sin publicar
   una versión nueva. Las pantallas que los muestran se enteran con
   usarAlimentosExtra(), que las vuelve a dibujar cuando llegan. */
let versionAlimentos = 0;
const oyentesAlimentos = new Set();
let cargaAlimentosExtra = null;
function cargarAlimentosExtra(forzar = false) {
  if (cargaAlimentosExtra && !forzar) return cargaAlimentosExtra;
  cargaAlimentosExtra = (async () => {
    let cambio = false;
    try {
      const [extra, productos] = await Promise.all([
        supabase.from('alimentos_extra').select('*').order('id'),
        supabase.from('productos').select('*').order('creado_en').limit(5000),
      ]);
      for (const a of extra.data || []) {
        const state = a.estado || '-';
        const key = `${a.nombre} (${state})`;
        if (FOODS.some(f => f.key === key)) continue;
        FOODS.push({
          group: a.grupo, name: a.nombre, state, key, esExtra: true, menuUso: a.menu_uso || null,
          kcal: Number(a.kcal), protein: Number(a.proteina), carbs: Number(a.carbos), fat: Number(a.grasa), fiber: Number(a.fibra) || 0,
        });
        if (a.unidad && Number(a.gramos_unidad) > 0 && !UNITS_BY_NAME[a.nombre]) {
          UNITS_BY_NAME[a.nombre] = [[a.unidad, Number(a.gramos_unidad)], ...(UNITS_BY_GROUP[a.grupo] || []).filter(u => u[0] !== a.unidad)];
        }
        cambio = true;
      }
      for (const p of productos.data || []) {
        if (sumarProducto(p)) cambio = true;
      }
    } catch {}
    if (cambio) avisarAlimentos();
  })();
  return cargaAlimentosExtra;
}

function avisarAlimentos() {
  versionAlimentos++;
  oyentesAlimentos.forEach(avisar => avisar(versionAlimentos));
}

/* Productos escaneados por código de barras (tabla productos): van al
   grupo "Productos", con la marca en lugar del estado ("Yogurt bebible
   fresa · gloria") y su porción de la etiqueta como medida de casa. No se
   mandan a la IA de la foto (esProducto). Devuelve la clave del alimento
   (o null si no se pudo sumar). */
function claveProducto(p) {
  return `${p.nombre} (${p.marca || 'Producto'})`;
}
function sumarProducto(p) {
  if (!p || !p.nombre) return null;
  const key = claveProducto(p);
  if (FOODS.some(f => f.key === key)) return null;
  FOODS.push({
    group: 'Productos', name: p.nombre, state: p.marca || 'Producto', key, esProducto: true, codigo: p.codigo,
    kcal: Number(p.kcal), protein: Number(p.proteina), carbs: Number(p.carbos), fat: Number(p.grasa), fiber: Number(p.fibra) || 0,
  });
  if (Number(p.porcion_g) > 0 && !UNITS_BY_NAME[p.nombre]) {
    UNITS_BY_NAME[p.nombre] = [['porción', Number(p.porcion_g)]];
  }
  return key;
}
// Para el producto recién escaneado: lo suma al momento y avisa a las pantallas.
function agregarProductoAFoods(p) {
  const nuevo = sumarProducto(p);
  if (nuevo) avisarAlimentos();
  return claveProducto(p);
}
function usarAlimentosExtra() {
  const [version, setVersion] = useState(versionAlimentos);
  useEffect(() => {
    oyentesAlimentos.add(setVersion);
    setVersion(versionAlimentos);
    cargarAlimentosExtra();
    return () => { oyentesAlimentos.delete(setVersion); };
  }, []);
  return version;
}


















/* Unidades caseras: cuántos gramos equivale cada medida.
   Se resuelve por nombre exacto primero, luego por grupo. */
const UNITS_BY_NAME = {
  'Huevo de gallina': [['unidad', 50]],
  'Huevo de codorniz': [['unidad', 9]],
  'Plátano de seda': [['unidad', 120]],
  'Plátano bellaco': [['unidad', 250], ['mitad', 125], ['rodaja', 25]],
  'Manzana': [['unidad', 180]],
  'Naranja': [['unidad', 150]],
  'Pera': [['unidad', 170]],
  'Tuna': [['unidad', 100]],
  'Palta': [['unidad', 200], ['mitad', 100]],
  'Pan francés': [['unidad', 55]],
  'Pan árabe': [['unidad', 60]],
  'Pan árabe integral': [['unidad', 60]],
  'Jamonada': [['rebanada', 15]],
  'Salchicha (hot dog)': [['unidad', 45]],
  'Tostadas': [['unidad', 10]],
  'Pan con jamonada': [['unidad', 85]],
  'Pan con pollo': [['unidad', 200]],
  'Pan con chicharrón': [['unidad', 220]],
  'Butifarra': [['unidad', 180]],
  'Hot dog': [['unidad', 110]],
  'Hamburguesa de carretilla': [['unidad', 200]],
  'Pizza americana': [['tajada', 110]],
  'Pollo broaster': [['presa', 150]],
  // Pollada y pollo frito se sirven en cuarto u octavo de pollo (carne sin
  // hueso, aprox.). La foto elige cuál según los gramos que calcula la IA.
  'Pollada (pollo frito)': [['cuarto de pollo', 220], ['octavo de pollo', 110]],
  'Chicharrón de pollo': [['porción', 200]],
  'Filete de pollo frito': [['filete', 150]],
  'Humita': [['unidad', 150]],
  'Picarones con miel': [['porción', 150]],
  'Cancha serrana': [['puñado', 30]],
  'Granola': [['taza', 110], ['cucharada', 10]],
  'Mantequilla de maní': [['cucharada', 16]],
  'Refresco de cebada': [['vaso', 250]],
  'Cerveza': [['vaso', 300], ['lata', 355], ['botella grande', 620]],
  'Quinua': [['taza', 185]],
  'Fresa': [['unidad', 15]],
  'Pan integral': [['rebanada', 30]],
  'Galleta de soda': [['unidad', 6], ['paquete', 34]],
  'Aceite vegetal': [['cucharada', 14], ['cucharadita', 5]],
  'Arroz verde': [['porción', 150], ['plato', 250]],
  'Arroz amarillo (a la jardinera)': [['porción', 150], ['plato', 250]],
  'Arroz aderezado (con ají panca)': [['porción', 150], ['plato', 250]],
  'Arroz chaufa (solo el arroz)': [['porción', 150], ['plato', 250]],
  'Ensalada rusa': [['porción', 200], ['taza', 150]],
  'Aceite de oliva': [['cucharada', 14], ['cucharadita', 5]],
  'Mayonesa': [['cucharada', 15], ['cucharadita', 5]],
  'Mantequilla': [['cucharada', 14], ['cucharadita', 5]],
  'Azúcar blanca': [['cucharada', 12], ['cucharadita', 4]],
  'Miel de abeja': [['cucharada', 21], ['cucharadita', 7]],
  'Mermelada': [['cucharada', 20]],
  'Maní': [['puñado', 30], ['cucharada', 16]],
  'Almendras': [['puñado', 30], ['unidad', 1.2]],
  'Nueces': [['puñado', 30], ['unidad', 5]],
  'Pecanas': [['puñado', 30], ['unidad', 3]],
  'Chía': [['cucharada', 12], ['cucharadita', 4]],
  'Proteína en polvo (whey)': [['scoop', 30], ['cucharada', 15]],
  'Crema de arroz': [['scoop', 30], ['cucharada', 15]],
  'Proteína en polvo (isolate)': [['scoop', 30], ['cucharada', 15]],
  'Avena instantánea en polvo': [['cucharada', 9], ['taza', 80]],
  'Queso fresco': [['tajada', 30]],
  'Jamón inglés': [['tajada', 20]],
  'Chorizo parrillero': [['unidad', 65]],
  'Hamburguesa clásica (Bembos)': [['unidad', 220]],
  'Alitas broaster (Bembos)': [['unidad', 60]],
  'Alitas crocantes (carrito)': [['unidad', 60], ['porción (6 unidades)', 360]],
  'Alitas BBQ (carrito)': [['unidad', 60], ['porción (6 unidades)', 360]],
  'Alitas acevichadas (carrito)': [['unidad', 60], ['porción (6 unidades)', 360]],
  'Alitas búfalo (carrito)': [['unidad', 60], ['porción (6 unidades)', 360]],
  'Papas fritas (comida rápida)': [['porción', 150]],
  "Hamburguesa clásica (McDonald's)": [['unidad', 215]],
  'McNuggets': [['unidad', 16], ['porción (6 unidades)', 96]],
  'Queso parmesano': [['cucharada', 5]],
  'Jamón de pavo': [['tajada', 25]],
  'Fideos / pasta': [['taza', 140], ['plato', 220]],
  'Fideos integrales': [['taza', 140], ['plato', 220]],
  'Tallarín saltado (plato)': [['plato', 350], ['porción', 250]],
  'Picarón': [['unidad', 60], ['porción (3 unidades)', 180]],
  'Mazamorra morada': [['porción', 200], ['taza', 240], ['vaso', 200]],
  'Arroz con leche': [['porción', 180], ['taza', 240]],
  'Combinado (mazamorra + arroz con leche)': [['porción', 250], ['vaso', 200]],
  'Suspiro a la limeña': [['porción', 120], ['copa', 100]],
  'Turrón de Doña Pepa': [['porción', 90], ['tajada', 70]],
  'Alfajor': [['unidad', 40]],
  'Torta de chocolate': [['tajada', 100], ['porción', 120]],
  'Helado de vainilla': [['bola', 60], ['porción', 120], ['taza', 130]],
  'Gelatina preparada': [['porción', 150], ['taza', 240]],
  'Flan / crema volteada': [['porción', 130]],
  'Churro relleno': [['unidad', 70]],
  'Queque simple': [['tajada', 70], ['porción', 90]],
  'Keke de plátano': [['tajada', 70], ['porción', 90]],
  'Keke de naranja': [['tajada', 70], ['porción', 90]],
  'Keke de vainilla': [['tajada', 70], ['porción', 90]],
  'Keke de zanahoria': [['tajada', 80], ['porción', 100]],
  'Keke marmoleado': [['tajada', 70], ['porción', 90]],
  'Keke de arándanos': [['tajada', 70], ['porción', 90]],
  'Panetón': [['tajada', 80], ['porción', 100]],
  'Torta tres leches': [['tajada', 100], ['porción', 130]],
  'Cocada': [['unidad', 30]],
  'Manjar blanco': [['cucharada', 20], ['porción', 30]],
  'Leche asada': [['porción', 120]],
  'Chocolate con leche': [['barra pequeña', 40], ['cuadrito', 8]],
  'Galleta dulce rellena': [['unidad', 12], ['paquete', 43]],
  'Clara de huevo': [['unidad', 33]],
  'Yema de huevo': [['unidad', 17]],
  'Atún en lata en agua (escurrido)': [['lata pequeña', 100], ['lata grande', 140]],
  'Atún en lata en aceite (escurrido)': [['lata pequeña', 100], ['lata grande', 140]],
  'Atún en lata en aceite (sin escurrir)': [['lata pequeña', 100], ['lata grande', 140]],
  'Pollo a la brasa (solo la presa)': [['1/4 de pollo', 250], ['1/8 de pollo', 125], ['porción', 200]],
  'Pollo a la brasa con papas y ensalada': [['1/4 con papas', 470], ['1/8 con papas', 300], ['plato', 470]],
  'Pollo pierna (con piel)': [['presa', 130], ['unidad', 130]],
  'Pollo pierna (sin piel)': [['presa', 110], ['unidad', 110]],
  'Pollo encuentro (con piel)': [['presa', 150], ['unidad', 150]],
  'Pollo encuentro (sin piel)': [['presa', 125], ['unidad', 125]],
  'Pollo entrepierna': [['presa', 160], ['unidad', 160]],
  'Pollo ala (con piel)': [['unidad', 45], ['par', 90]],
  'Pollo pechuga (con piel)': [['presa', 200], ['media pechuga', 150]],
  'Gallina': [['presa', 180]],
  'Locro de zapallo': [['plato', 400], ['porción', 300]],
  'Carapulcra': [['plato', 350], ['porción', 250]],
  'Pollo al sillao': [['plato', 300], ['porción', 200]],
  'Pollo a la olla (presa con papa y verduras)': [['plato', 380], ['presa con papa', 280]],
  'Pollo a la olla con arroz': [['plato', 580], ['plato chico', 420]],
  'Papa dorada al sillao': [['porción', 150]],
  'Papa rellena': [['unidad', 200]],
  'Empanada de carne': [['unidad', 90]],
  'Empanada de pollo': [['unidad', 90]],
  'Empanada mixta (carne y pollo)': [['unidad', 90]],
  'Tamal': [['unidad', 180]],
  'Juane': [['unidad', 300]],
  'Galleta Morocha (bañada en chocolate)': [['unidad', 20]],
  'Galleta de soda (salada)': [['unidad', 7]],
  'Galleta de vainilla (dulce, tipo Casino/Margarita)': [['unidad', 8]],
  'Galleta Casino (vainilla rellena)': [['paquete', 28]],
  'Galleta Margarita (vainilla rellena)': [['paquete', 30]],
  'Galleta Chomp (chispas de chocolate)': [['unidad', 10]],
  'Galleta Cua Cua (wafer con chocolate)': [['unidad', 20]],
  'Galleta Club Social (cracker)': [['unidad', 6]],
  'Chupe de camarones': [['plato', 400]],
  'Parihuela': [['plato', 400]],
  'Sopa de pollo con fideos': [['plato', 400]],
  'Tarwi (chocho)': [['taza', 180], ['porción', 150]],
  'Arveja verde': [['taza', 160], ['porción', 150]],
  'Anticucho de corazón': [['palito', 80], ['porción (2 palitos)', 160]],
  'Ceviche de pescado': [['porción', 250], ['plato', 300]],
  'Salchipapa': [['porción', 300]],
  'Sándwich de pollo': [['unidad', 150]],
  'Rapiditas Clásicas (Bimbo)': [['unidad', 26]],
  'Rapiditas Integrales (Bimbo)': [['unidad', 26]],
  'Rapiditas XL (Bimbo)': [['unidad', 52]],
  'Pieza de pollo Original (KFC)': [['presa', 97]],
  'Torreja de espinaca y tomate': [['unidad', 200]],
  'Pieza de pollo Crujiente (KFC)': [['presa', 113]],
  'Alitas picantes (KFC)': [['unidad', 28], ['porción (2 unidades)', 56]],
  'Twister (KFC)': [['unidad', 235]],
  /* --- Carta PECAFIT (restaurante aliado) --- */
  'Sandwich de pollo (PECAFIT)': [['unidad', 220]],
  'Sandwich de atún (PECAFIT)': [['unidad', 230]],
  'Omelette (PECAFIT)': [['plato', 220]],
  'Bowl de avena (PECAFIT)': [['bowl', 350]],
  'Waffles de avena y plátano (PECAFIT)': [['porción', 300]],
  'Waffle de beterraga y mango (PECAFIT)': [['porción', 320]],
  'Filete de pollo (PECAFIT)': [['plato', 480]],
  'Quinua chaufa (PECAFIT)': [['plato', 500]],
  'Bowl andino (PECAFIT)': [['bowl', 480]],
  'Bowl Super Power (PECAFIT)': [['bowl', 500]],
  'Trucha (PECAFIT)': [['plato', 400]],
  'Peca Power Meat (PECAFIT)': [['plato', 600]],
  'Wrap proteico (PECAFIT)': [['unidad', 280]],
  'Wrap filete de pollo (PECAFIT)': [['unidad', 260]],
  'Wrap crocante (PECAFIT)': [['unidad', 240]],
  'Cake de plátano (PECAFIT)': [['tajada', 100]],
  'Torta de cacao (PECAFIT)': [['tajada', 100]],
  /* Pesos estimados — PENDIENTE confirmar con el peso real */
  'Cheesecake (PECAFIT)': [['tajada', 112.5]],
  'Parfait (PECAFIT)': [['porción', 350]],
};
const UNITS_BY_GROUP = {
  'Bebidas': [['taza', 240], ['vaso', 200], ['jarra', 500]],
  'Lácteos': [['taza', 240], ['vaso', 200]],
  'Menestras': [['taza', 180]],
  'Postres': [['porción', 150]],
  'Platos preparados': [['plato', 400], ['media porción', 200], ['porción grande', 500]],
};







function unitsFor(food) {
  const list = [['gramos', 1]];
  const byName = UNITS_BY_NAME[food.name];
  const byGroup = UNITS_BY_GROUP[food.group];
  if (byName) list.push(...byName);
  else if (byGroup) list.push(...byGroup);
  return list;
}





function gramsPerUnit(food, unit) {
  const found = unitsFor(food).find(u => u[0] === unit);
  return found ? found[1] : 1;
}

/* Convierte una cantidad en gramos a la unidad casera más natural del
   alimento (si existe una) — así "70g de pan francés" se muestra como
   "1 unidad" y no como un número de gramos sin sentido para el usuario.
   Las unidades que se cuentan por pieza entera (huevo, pan, rebanada)
   se redondean a números enteros — nadie come "2.5 huevos". Las que sí
   admiten mitades con sentido (taza, porción, plato) se dejan en pasos
   de 0.5. */
/* Unidades que se cuentan por pieza entera y visible (huevo, pan,
   rebanada...) — se usa tanto para redondear a enteros al convertir
   gramos, como para saber cuándo es seguro aplicarle un conteo de la
   IA (contar objetos es confiable; estimar peso no). */
const UNIDADES_DISCRETAS = ['unidad', 'rebanada', 'tajada', 'palito', 'presa', 'bola', 'scoop'];



const ACTIVITY_FACTORS = { Sedentario: 1.2, Ligero: 1.375, Moderado: 1.55, Intenso: 1.725, 'Muy intenso': 1.9 };
const ACTIVITY_DESC = {
  Sedentario: 'Poco o nada de actividad física',
  Ligero: '1 a 2 días a la semana de actividad física',
  Moderado: '3 a 5 días a la semana de actividad física',
  Intenso: '6 a 7 días a la semana de actividad física',
  'Muy intenso': '7 días a la semana + trabajo activo',
};

const MEAL_NAMES = ['Desayuno', 'Media mañana', 'Almuerzo', 'Media tarde', 'Cena'];

const ANGULOS = [
  { id: 'frente', label: 'De frente', emoji: '🧍', tip: 'Brazos relajados a los costados, mirando a la cámara' },
  { id: 'perfil', label: 'De perfil', emoji: '🧍‍♂️', tip: 'De lado, brazos relajados, mirando al frente' },
  { id: 'espalda', label: 'De espalda', emoji: '🔙', tip: 'Dando la espalda, brazos relajados' },
  { id: 'relajado', label: 'Libre', emoji: '💪', tip: 'La pose que quieras usar para comparar' },
];
const WHATSAPP_NUMBER = '51963760819';


// Un alumno nuevo empieza con los campos vacíos: antes venían llenos con
// valores de ejemplo (70 kg, 170 cm...) que parecían datos reales.
const EMPTY_FORM = { sexo: 'M', edad: '', estatura: '', peso: '', cuello: '', cintura: '', cadera: '', actividad: 'Moderado', objetivo: '', ajustePct: null, pesoInicial: null, pesoObjetivo: null };
// Valores de ejemplo de las cuentas antiguas (se detectan y se muestran vacíos al cargar).
const FORM_EJEMPLO = { ...EMPTY_FORM, edad: 30, estatura: 170, peso: 70, cuello: 38, cintura: 85, cadera: 95 };

// Datos básicos (sin cinta métrica): con esto ya se calculan las calorías.
// Se descartan los valores de ejemplo 70/170/85 de las cuentas antiguas.
function tieneDatosBasicos(f) {
  const edad = Number(f?.edad), estatura = Number(f?.estatura), peso = Number(f?.peso);
  if (!(edad > 0 && estatura >= 90 && peso >= 20)) return false;
  return !(peso === 70 && estatura === 170 && Number(f?.cintura) === 85);
}

// Medidas con cinta (opcionales): solo sirven para el % de grasa.
function tieneMedidasCinta(f) {
  const cuello = Number(f?.cuello), cintura = Number(f?.cintura), cadera = Number(f?.cadera);
  return cuello >= 15 && cintura > cuello && (f?.sexo === 'M' || cadera >= 40);
}
const EMPTY_MEALS = () => ({ Desayuno: [], 'Media mañana': [], Almuerzo: [], 'Media tarde': [], Cena: [] });
const EMPTY_MEALPLAN = () => ({ targetKcal: 2000, macros: { p: 0.3, c: 0.4, f: 0.3 }, meals: EMPTY_MEALS(), restricciones: [] });

/* ------------------------------------------------------------------ */
/* CALCULATIONS                                                       */
/* ------------------------------------------------------------------ */

function calcAll(f) {
  const { sexo, edad, estatura, peso, cuello, cintura, cadera } = f;
  const bmi = peso / ((estatura / 100) ** 2);
  const bmiCat = bmi < 18.5 ? 'Bajo peso' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Sobrepeso' : 'Obesidad';

  let bf;
  if (sexo === 'M') {
    bf = 495 / (1.0324 - 0.19077 * Math.log10(cintura - cuello) + 0.15456 * Math.log10(estatura)) - 450;
  } else {
    bf = 495 / (1.29579 - 0.35004 * Math.log10(cintura + cadera - cuello) + 0.221 * Math.log10(estatura)) - 450;
  }

  let bfCat;
  if (sexo === 'M') {
    if (edad < 40) bfCat = bf < 8 ? 'Bajo' : bf <= 19 ? 'Saludable' : bf <= 24 ? 'Sobrepeso' : 'Alto';
    else if (edad < 60) bfCat = bf < 11 ? 'Bajo' : bf <= 21 ? 'Saludable' : bf <= 27 ? 'Sobrepeso' : 'Alto';
    else bfCat = bf < 13 ? 'Bajo' : bf <= 24 ? 'Saludable' : bf <= 29 ? 'Sobrepeso' : 'Alto';
  } else {
    if (edad < 40) bfCat = bf < 21 ? 'Bajo' : bf <= 32 ? 'Saludable' : bf <= 38 ? 'Sobrepeso' : 'Alto';
    else if (edad < 60) bfCat = bf < 23 ? 'Bajo' : bf <= 33 ? 'Saludable' : bf <= 39 ? 'Sobrepeso' : 'Alto';
    else bfCat = bf < 24 ? 'Bajo' : bf <= 35 ? 'Saludable' : bf <= 41 ? 'Sobrepeso' : 'Alto';
  }

  const fatKg = peso * (bf / 100);
  const leanKg = peso - fatKg;
  const muscleKg = leanKg * 0.5;

  const tmb = sexo === 'M' ? 10 * peso + 6.25 * estatura - 5 * edad + 5 : 10 * peso + 6.25 * estatura - 5 * edad - 161;
  const tdee = tmb * (ACTIVITY_FACTORS[f.actividad] || 1.55);

  const iccVal = cintura / cadera;
  const iccCat = sexo === 'M'
    ? (iccVal < 0.9 ? 'Riesgo bajo' : iccVal < 1 ? 'Riesgo moderado' : 'Riesgo alto')
    : (iccVal < 0.8 ? 'Riesgo bajo' : iccVal < 0.85 ? 'Riesgo moderado' : 'Riesgo alto');

  const h2 = (estatura / 100) ** 2;
  const idealMin = 18.5 * h2;
  const idealMax = 24.9 * h2;

  const water = sexo === 'M'
    ? 2.447 - 0.09156 * edad + 0.1074 * estatura + 0.3362 * peso
    : -2.097 + 0.1069 * estatura + 0.2466 * peso;

  // basicos: hay edad, estatura y peso reales (calorías, IMC, peso ideal).
  // cinta: hay cuello, cintura y cadera (grasa, masa magra y muscular).
  const basicos = tieneDatosBasicos(f);
  const cinta = basicos && tieneMedidasCinta(f);

  return { bmi, bmiCat, bf, bfCat, fatKg, leanKg, muscleKg, tmb, tdee, iccVal, iccCat, idealMin, idealMax, water, basicos, cinta };
}

/* Tope de seguridad: 5 kg de un mismo alimento en una comida.
   Evita que un error de tipeo (ej. 10000 g) arruine el historial. */
const MAX_GRAMOS_ENTRADA = 5000;

/* Alimentos creados por el alumno. Se registran aquí para que
   entryMacros los encuentre igual que los de la base. */
let FOODS_PERSONALES = [];
function setFoodsPersonales(lista) { FOODS_PERSONALES = lista || []; }
function buscarFood(key) {
  return FOODS.find(f => f.key === key) || FOODS_PERSONALES.find(f => f.key === key);
}

function entryGrams(entry) {
  const food = buscarFood(entry.foodKey);
  if (!food) return 0;
  let g;
  if (entry.unit === undefined || entry.unit === null) {
    g = Number(entry.grams) || 0;
  } else {
    const qty = Number(entry.qty) || 0;
    g = qty * gramsPerUnit(food, entry.unit);
  }
  if (!Number.isFinite(g) || g < 0) return 0;
  return Math.min(g, MAX_GRAMOS_ENTRADA);
}

// Aceite que el alumno marcó en un frito o saltado (entry.aceite). Los
// datos de esos platos ya traen el aceite normal: "poco" resta un 30% de la
// grasa del plato (poco aceite o freidora de aire); "bastante" y "mucho"
// suman 1 o 2 cucharadas de aceite vegetal.
const CLAVE_ACEITE_VEGETAL = 'Aceite vegetal (-)';
const ACEITE_CUCHARADAS = { bastante: 1, mucho: 2 };
const ACEITE_POCO_MENOS_GRASA = 0.3;
// Fritos y saltados: los únicos a los que se les pregunta por el aceite (y
// a los que se les aplica). Si el alumno cambia el alimento por otro que no
// es frito, la marca de aceite deja de contar.
function esFritoOSaltado(food) {
  return /frit|saltad|chaufa|broaster|chicharr|apanad|empanizad/i.test(food?.key || '');
}

function entryMacros(entry) {
  const food = buscarFood(entry.foodKey);
  const g = entryGrams(entry);
  if (!food || !g) return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const factor = g / 100;
  const m = { kcal: food.kcal * factor, protein: food.protein * factor, carbs: food.carbs * factor, fat: food.fat * factor };
  if (!entry.aceite || !esFritoOSaltado(food)) return m;
  if (entry.aceite === 'poco') {
    const menos = m.fat * ACEITE_POCO_MENOS_GRASA;
    m.fat -= menos;
    m.kcal = Math.max(0, m.kcal - menos * 9);
  } else if (ACEITE_CUCHARADAS[entry.aceite] && entry.foodKey !== CLAVE_ACEITE_VEGETAL) {
    const a = entryMacros({ foodKey: CLAVE_ACEITE_VEGETAL, unit: 'cucharada', qty: ACEITE_CUCHARADAS[entry.aceite] });
    m.kcal += a.kcal; m.protein += a.protein; m.carbs += a.carbs; m.fat += a.fat;
  }
  return m;
}

function uid() { return Math.random().toString(36).slice(2, 10); }



/* ------------------------------------------------------------------ */
/* COMBINACIONES REALES                                                 */
/* Platos que un peruano sí arma en casa, no cruces al azar.            */
/* ------------------------------------------------------------------ */

const COMBOS_REALES = [
  /* ---------- DESAYUNO ---------- */
  { comida: 'Desayuno', emoji: '🍳', nombre: 'Pan con huevo y café con leche',
    items: [['Huevo de gallina (Cocido)', 100], ['Pan integral (-)', 60], ['Café con leche (-)', 200]] },
  { comida: 'Desayuno', emoji: '🥣', nombre: 'Avena con plátano',
    items: [['Avena (Cocida)', 250], ['Plátano de seda (Cruda)', 120], ['Leche descremada (-)', 150]] },
  { comida: 'Desayuno', emoji: '🥑', nombre: 'Pan con palta y huevo',
    items: [['Pan integral (-)', 60], ['Palta (Cruda)', 60], ['Huevo de gallina (Cocido)', 100]] },
  { comida: 'Desayuno', emoji: '🥛', nombre: 'Yogur con avena y fruta',
    items: [['Yogur natural (-)', 200], ['Avena en hojuelas (Cruda)', 40], ['Papaya (Cruda)', 150]] },
  { comida: 'Desayuno', emoji: '🧀', nombre: 'Pan con queso y quinua',
    items: [['Pan francés (-)', 55], ['Queso fresco (-)', 40], ['Quinua (Cocida)', 200]] },
  { comida: 'Desayuno', emoji: '🍳', nombre: 'Huevos revueltos con pan',
    items: [['Huevo de gallina (Cocido)', 150], ['Pan francés (-)', 55], ['Tomate (Crudo)', 80]] },

  /* ---------- ALMUERZO ---------- */
  { comida: 'Almuerzo', emoji: '🍗', nombre: 'Pollo a la plancha con arroz y ensalada',
    items: [['Pollo pechuga (Cocida)', 150], ['Arroz blanco (Cocido)', 200], ['Lechuga (Cruda)', 60], ['Tomate (Crudo)', 80]] },
  { comida: 'Almuerzo', emoji: '🐟', nombre: 'Pescado con arroz y ensalada',
    items: [['Bonito (Cocido)', 150], ['Arroz blanco (Cocido)', 200], ['Zanahoria (Cocida)', 80], ['Vainita (Cocida)', 80]] },
  { comida: 'Almuerzo', emoji: '🫘', nombre: 'Lentejas con arroz y pollo',
    items: [['Lenteja (Cocida)', 200], ['Arroz blanco (Cocido)', 150], ['Pollo pechuga (Cocida)', 100]] },
  { comida: 'Almuerzo', emoji: '🥩', nombre: 'Bistec con papa y ensalada',
    items: [['Carne de res (bistec) (Cocida)', 150], ['Papa (Cocida)', 250], ['Lechuga (Cruda)', 60], ['Tomate (Crudo)', 80]] },
  { comida: 'Almuerzo', emoji: '🐟', nombre: 'Ceviche con camote y choclo',
    items: [['Ceviche de pescado (-)', 250], ['Camote (Cocido)', 100], ['Choclo (maíz) (Cocido)', 80]] },
  { comida: 'Almuerzo', emoji: '🍛', nombre: 'Arroz con pollo y ensalada',
    items: [['Arroz con pollo (-)', 350], ['Lechuga (Cruda)', 60], ['Tomate (Crudo)', 60]] },
  { comida: 'Almuerzo', emoji: '🍲', nombre: 'Frejoles con arroz y pescado',
    items: [['Frejol canario (Cocido)', 200], ['Arroz blanco (Cocido)', 150], ['Bonito (Cocido)', 120]] },
  { comida: 'Almuerzo', emoji: '🍝', nombre: 'Fideos con pollo y verduras',
    items: [['Fideos / pasta (Cocidos)', 220], ['Pollo pechuga (Cocida)', 130], ['Brócoli (Cocido)', 100]] },
  { comida: 'Almuerzo', emoji: '🥘', nombre: 'Estofado de pollo con arroz',
    items: [['Estofado de pollo (-)', 250], ['Arroz blanco (Cocido)', 180]] },

  /* ---------- CENA ---------- */
  { comida: 'Cena', emoji: '🍗', nombre: 'Pollo con camote y ensalada',
    items: [['Pollo pechuga (Cocida)', 130], ['Camote (Cocido)', 150], ['Lechuga (Cruda)', 80]] },
  { comida: 'Cena', emoji: '🥗', nombre: 'Ensalada de atún con palta',
    items: [['Atún en lata en agua (escurrido) (-)', 120], ['Palta (Cruda)', 70], ['Lechuga (Cruda)', 80], ['Tomate (Crudo)', 80]] },
  { comida: 'Cena', emoji: '🍳', nombre: 'Huevos con palta y pan integral',
    items: [['Huevo de gallina (Cocido)', 100], ['Palta (Cruda)', 70], ['Pan integral (-)', 60]] },
  { comida: 'Cena', emoji: '🍲', nombre: 'Caldo de gallina',
    items: [['Caldo de gallina (-)', 400], ['Pan francés (-)', 55]] },
  { comida: 'Cena', emoji: '🐟', nombre: 'Pescado al vapor con verduras',
    items: [['Sudado de pescado (-)', 250], ['Papa (Cocida)', 150], ['Brócoli (Cocido)', 100]] },
  { comida: 'Cena', emoji: '🥪', nombre: 'Sándwich de pollo con té',
    items: [['Sándwich de pollo (-)', 150], ['Té / infusión sin azúcar (-)', 200]] },
  { comida: 'Cena', emoji: '🥗', nombre: 'Ensalada de pollo',
    items: [['Ensalada de pollo (-)', 300], ['Pan integral (-)', 30]] },

  /* ---------- SNACK (comparten pool entre Media mañana y Media tarde) ---------- */
  { comida: 'Media mañana', emoji: '🍎', nombre: 'Fruta con maní',
    items: [['Manzana (Cruda)', 180], ['Maní (Crudo)', 25]] },
  { comida: 'Media mañana', emoji: '🥛', nombre: 'Yogur griego con fruta',
    items: [['Yogur griego natural (-)', 170], ['Fresa (Cruda)', 120]] },
  { comida: 'Media mañana', emoji: '🥑', nombre: 'Pan con palta',
    items: [['Pan integral (-)', 30], ['Palta (Cruda)', 50]] },
  { comida: 'Media mañana', emoji: '🥚', nombre: 'Huevo cocido con fruta',
    items: [['Huevo de gallina (Cocido)', 50], ['Plátano de seda (Cruda)', 120]] },
  { comida: 'Media mañana', emoji: '🌰', nombre: 'Puñado de frutos secos',
    items: [['Almendras (Crudas)', 30]] },
  { comida: 'Media mañana', emoji: '🍌', nombre: 'Plátano con avena',
    items: [['Plátano de seda (Cruda)', 120], ['Avena (Cocida)', 200]] },
];

// Comidas que comparten el mismo pool de combos (ambos "snacks" del día)
const COMIDAS_EQUIVALENTES = { 'Media tarde': 'Media mañana' };

/* Arma la opción ajustando las porciones a lo que le queda del día */
function armarOpcion(combo, restante) {
  const items = [];
  for (const [clave, base] of combo.items) {
    const food = FOODS.find(f => f.key === clave);
    if (food) items.push({ food, grams: base });
  }
  if (!items.length) return null;

  const totalBase = items.reduce((a, it) => a + (it.food.kcal * it.grams) / 100, 0);
  if (totalBase <= 0) return null;

  // Escalar entre 60% y 130% para que siga siendo una porción realista
  let factor = restante.kcal > 0 ? restante.kcal / totalBase : 1;
  factor = Math.min(Math.max(factor, 0.6), 1.3);

  const finales = items.map(it => ({
    food: it.food,
    grams: Math.max(10, Math.round((it.grams * factor) / 5) * 5),
  }));

  const t = finales.reduce((a, it) => ({
    kcal: a.kcal + (it.food.kcal * it.grams) / 100,
    protein: a.protein + (it.food.protein * it.grams) / 100,
    carbs: a.carbs + (it.food.carbs * it.grams) / 100,
    fat: a.fat + (it.food.fat * it.grams) / 100,
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });

  // Qué tan bien encaja: calorías y proteína pesan más
  const score = Math.abs(t.kcal - restante.kcal) + Math.abs(t.protein - restante.protein) * 3;

  return {
    id: combo.nombre,
    emoji: combo.emoji,
    name: combo.nombre,
    comida: combo.comida,
    items: finales,
    ...t,
    score,
  };
}

/* Sugiere combinaciones apropiadas para la comida en curso, evitando
   los alimentos que el alumno marcó como "nunca me sugieras". */
function generateCombos(remaining, comida, restricciones = []) {
  if (remaining.kcal < 120) return [];
  const comidaBuscada = COMIDAS_EQUIVALENTES[comida] || comida;
  const propias = COMBOS_REALES.filter(c => !comidaBuscada || c.comida === comidaBuscada);
  const base = propias.length ? propias : COMBOS_REALES;

  const opciones = base
    .map(c => armarOpcion(c, remaining))
    .filter(Boolean)
    // Descartar lo que se pase mucho de lo que le queda
    .filter(o => o.kcal <= remaining.kcal * 1.25 || remaining.kcal < 200)
    .filter(o => !restricciones.length || !o.items.some(it => restricciones.includes(it.food.name)));

  opciones.sort((a, b) => a.score - b.score);
  return opciones.slice(0, 5);
}

/* ── "¿QUÉ PUEDO COMER?" CON LÓGICA DE CADA COMIDA ────────────────────────
   Además de los platos típicos de arriba, arma combinaciones con alimentos
   que hay en cualquier casa peruana, según lo que tiene sentido a esa hora:
   - Desayuno: pan, avena o camote + huevo, queso, palta o pollo + café,
     té o fruta.
   - Almuerzo: proteína + arroz, papa, camote, fideos, quinua, yuca o
     menestras + ensalada o verduras.
   - Cena (más ligera): pollo, pescado, huevo, atún o pavita + camote,
     papa, quinua, pan integral o un poco de arroz + verduras. Sin menestras
     ni fideos; el ceviche y los platos típicos pesados son solo del almuerzo.
   - Media mañana / media tarde: fruta + yogur, maní, almendras, queso o huevo.
   Cada parte trae su id de proteína para filtrar por "¿Qué tienes para cocinar?". */
const PROTEINAS_SUGERENCIA = [
  { id: 'pollo', key: 'Pollo pechuga (Cocida)', g: 130, n: 'Pollo a la plancha', e: '🍗' },
  { id: 'res', key: 'Carne de res (bistec) (Cocida)', g: 120, n: 'Bistec a la plancha', e: '🥩' },
  { id: 'pescado', key: 'Bonito (Cocido)', g: 140, n: 'Pescado a la plancha', e: '🐟' },
  { id: 'pescado', key: 'Trucha (Cocida)', g: 140, n: 'Trucha a la plancha', e: '🐟' },
  { id: 'cerdo', key: 'Cerdo (lomo) (Cocido)', g: 120, n: 'Lomo de cerdo a la plancha', e: '🐖' },
  { id: 'pavo', key: 'Pavo pechuga (Cocida)', g: 130, n: 'Pavita a la plancha', e: '🦃' },
  { id: 'atun', key: 'Atún en lata en agua (escurrido) (-)', g: 120, n: 'Atún', e: '🥫' },
  { id: 'huevo', key: 'Huevo de gallina (Cocido)', g: 100, n: 'Huevos sancochados', e: '🥚' },
];
const CARBOS_ALMUERZO = [
  { key: 'Arroz blanco (Cocido)', g: 180, n: 'arroz' }, { key: 'Papa (Cocida)', g: 220, n: 'papa sancochada' },
  { key: 'Camote (Cocido)', g: 180, n: 'camote' }, { key: 'Fideos / pasta (Cocidos)', g: 200, n: 'fideos' },
  { key: 'Quinua (Cocida)', g: 180, n: 'quinua' }, { key: 'Yuca (Cocida)', g: 150, n: 'yuca' },
  { key: 'Lenteja (Cocida)', g: 180, n: 'lentejas' }, { key: 'Frejol canario (Cocido)', g: 180, n: 'frejoles' },
];
const CARBOS_CENA = [
  { key: 'Camote (Cocido)', g: 130, n: 'camote' }, { key: 'Papa (Cocida)', g: 160, n: 'papa sancochada' },
  { key: 'Quinua (Cocida)', g: 130, n: 'quinua' }, { key: 'Pan integral (-)', g: 60, n: 'pan integral' },
  { key: 'Arroz blanco (Cocido)', g: 110, n: 'un poco de arroz' },
];
const VERDURAS_SUGERENCIA = [
  { items: [['Lechuga (Cruda)', 60], ['Tomate (Crudo)', 80]], n: 'ensalada' },
  { items: [['Brócoli (Cocido)', 100]], n: 'brócoli' },
  { items: [['Vainita (Cocida)', 80], ['Zanahoria (Cocida)', 80]], n: 'verduras' },
  { items: [['Pepino (Crudo)', 80], ['Tomate (Crudo)', 80]], n: 'ensalada de pepino' },
  { items: [['Zanahoria (Cruda)', 80], ['Lechuga (Cruda)', 50]], n: 'ensalada de zanahoria' },
];
/* Lo que casi siempre hay en una casa. Las sugerencias solo usan esto, lo que
   el alumno ya suele comer y la proteína que marcó en "¿Qué tienes para cocinar?". */
const BASICOS_CASA = new Set([
  'Arroz blanco (Cocido)', 'Papa (Cocida)', 'Camote (Cocido)', 'Fideos / pasta (Cocidos)',
  'Lenteja (Cocida)', 'Frejol canario (Cocido)', 'Avena (Cocida)', 'Pan francés (-)', 'Pan integral (-)',
  'Huevo de gallina (Cocido)', 'Pollo pechuga (Cocida)', 'Carne de res (bistec) (Cocida)',
  'Atún en lata en agua (escurrido) (-)', 'Queso fresco (-)', 'Yogur natural (-)', 'Maní (Crudo)',
  'Café con leche (-)', 'Té / infusión sin azúcar (-)', 'Palta (Cruda)',
  'Plátano de seda (Cruda)', 'Manzana (Cruda)', 'Papaya (Cruda)', 'Mandarina (Cruda)',
  'Lechuga (Cruda)', 'Tomate (Crudo)', 'Pepino (Crudo)', 'Zanahoria (Cruda)', 'Zanahoria (Cocida)',
]);
const BASES_DESAYUNO = [
  { key: 'Pan francés (-)', g: 55, n: 'Pan', pan: true }, { key: 'Pan integral (-)', g: 60, n: 'Pan integral', pan: true },
  { key: 'Camote (Cocido)', g: 150, n: 'Camote sancochado' }, { key: 'Avena (Cocida)', g: 250, n: 'Avena' },
];
const ACOMP_DESAYUNO = [
  { id: 'huevo', key: 'Huevo de gallina (Cocido)', g: 100, n: 'huevo', e: '🍳' },
  { id: 'queso', key: 'Queso fresco (-)', g: 40, n: 'queso fresco', e: '🧀' },
  { id: 'palta', key: 'Palta (Cruda)', g: 50, n: 'palta', e: '🥑' },
  { id: 'pollo', key: 'Pollo pechuga (Cocida)', g: 60, n: 'pollo', e: '🍗' },
  { id: 'pavo', key: 'Jamón de pavo (-)', g: 40, n: 'jamón de pavo', e: '🥪' },
];
const BEBIDAS_DESAYUNO = [
  { key: 'Café con leche (-)', g: 200, n: 'café con leche' }, { key: 'Té / infusión sin azúcar (-)', g: 200, n: 'té' },
  { key: 'Papaya (Cruda)', g: 150, n: 'papaya' }, { key: 'Plátano de seda (Cruda)', g: 100, n: 'plátano' },
];
const FRUTAS_SNACK = [
  { key: 'Manzana (Cruda)', g: 160, n: 'Manzana', e: '🍎' }, { key: 'Plátano de seda (Cruda)', g: 110, n: 'Plátano', e: '🍌' },
  { key: 'Papaya (Cruda)', g: 200, n: 'Papaya', e: '🍈' }, { key: 'Mandarina (Cruda)', g: 150, n: 'Mandarina', e: '🍊' },
  { key: 'Fresa (Cruda)', g: 150, n: 'Fresas', e: '🍓' },
];
const ACOMP_SNACK = [
  { id: 'yogur', key: 'Yogur natural (-)', g: 150, n: 'yogur' }, { id: 'mani', key: 'Maní (Crudo)', g: 20, n: 'maní' },
  { id: 'almendras', key: 'Almendras (Crudas)', g: 20, n: 'almendras' }, { id: 'queso', key: 'Queso fresco (-)', g: 30, n: 'queso fresco' },
  { id: 'huevo', key: 'Huevo de gallina (Cocido)', g: 50, n: 'un huevo sancochado' },
];
const PLATOS_TIPICOS_PROTEINA = {
  'Ceviche con camote y choclo': 'pescado', 'Pescado con arroz y ensalada': 'pescado', 'Frejoles con arroz y pescado': 'pescado',
  'Pescado al vapor con verduras': 'pescado', 'Ensalada de atún con palta': 'atun', 'Bistec con papa y ensalada': 'res',
  'Huevos con palta y pan integral': 'huevo', 'Caldo de gallina': 'pollo',
};

function combosArmados(comida) {
  const out = [];
  const conE = (n, e, prote, items) => out.push({ comida, nombre: n, emoji: e, proteina: prote, items });
  if (comida === 'Desayuno') {
    BASES_DESAYUNO.forEach(b => ACOMP_DESAYUNO.forEach(a => {
      if (b.key === 'Avena (Cocida)' && a.id !== 'huevo') return; // avena: con huevo aparte o sola con fruta
      BEBIDAS_DESAYUNO.forEach(bb => {
        if (b.key === 'Avena (Cocida)' && bb.key === 'Café con leche (-)') return;
        const nombre = b.pan ? `${b.n} con ${a.n} y ${bb.n}` : `${b.n} con ${a.n} y ${bb.n}`;
        conE(nombre, a.e, a.id, [[b.key, b.g], [a.key, a.g], [bb.key, bb.g]]);
      });
    }));
    ['Plátano de seda (Cruda)', 'Papaya (Cruda)'].forEach((k, i) =>
      conE(`Avena con ${i ? 'papaya' : 'plátano'} y yogur`, '🥣', 'yogur', [['Avena (Cocida)', 250], [k, i ? 150 : 100], ['Yogur natural (-)', 120]]));
  } else if (comida === 'Almuerzo' || comida === 'Cena') {
    const carbos = comida === 'Almuerzo' ? CARBOS_ALMUERZO : CARBOS_CENA;
    PROTEINAS_SUGERENCIA.forEach(p => carbos.forEach(c => VERDURAS_SUGERENCIA.forEach(v => {
      if (p.id === 'atun' && ['Lenteja (Cocida)', 'Frejol canario (Cocido)', 'Fideos / pasta (Cocidos)'].includes(c.key)) return;
      if (p.id === 'huevo' && comida === 'Almuerzo' && ['Fideos / pasta (Cocidos)', 'Yuca (Cocida)'].includes(c.key)) return;
      const g = comida === 'Cena' ? Math.round(p.g * 0.9 / 5) * 5 : p.g;
      conE(`${p.n} con ${c.n} y ${v.n}`, p.e, p.id, [[p.key, g], [c.key, c.g], ...v.items]);
    })));
  } else {
    FRUTAS_SNACK.forEach(f => {
      conE(f.n, f.e, null, [[f.key, f.g]]);
      ACOMP_SNACK.forEach(a => conE(`${f.n} con ${a.n}`, f.e, a.id, [[f.key, f.g], [a.key, a.g]]));
    });
  }
  return out;
}

/* Todas las sugerencias para una comida, ordenadas: primero las que mejor
   encajan con lo que le toca en esa comida y las que usan alimentos que el
   alumno ya come (los tiene en casa), alternando la proteína para que no
   salgan 4 de pollo seguidas. proteinas: ids elegidos en "¿Qué tienes para
   cocinar?" (vacío = todas). */
function sugerenciasComida({ objetivo, comida, restricciones = [], preferidos = new Set(), proteinas = [] }) {
  if (!objetivo || objetivo.kcal < 120) return [];
  const comidaBuscada = COMIDAS_EQUIVALENTES[comida] || comida;
  const tipicos = COMBOS_REALES.filter(c => c.comida === comidaBuscada)
    .map(c => ({ ...c, proteina: PLATOS_TIPICOS_PROTEINA[c.nombre] || (/(pollo)/i.test(c.nombre) ? 'pollo' : /atún/i.test(c.nombre) ? 'atun' : /huevo/i.test(c.nombre) ? 'huevo' : null) }));
  const armados = combosArmados(comidaBuscada === 'Media mañana' ? 'Media mañana' : comidaBuscada);
  const vistos = new Set();
  const todos = [...tipicos, ...armados].filter(c => { if (vistos.has(c.nombre)) return false; vistos.add(c.nombre); return true; });
  const esSnack = comidaBuscada === 'Media mañana';
  const aLaMano = new Set([...BASICOS_CASA, ...preferidos,
    ...PROTEINAS_SUGERENCIA.filter(p => proteinas.includes(p.id)).map(p => p.key)]);
  const opciones = todos
    .filter(c => esSnack || !proteinas.length || proteinas.includes(c.proteina))
    .filter(c => c.items.every(([k]) => aLaMano.has(k)))
    .map(c => {
      const o = armarOpcion(c, objetivo);
      if (!o) return null;
      const conocidos = o.items.filter(it => preferidos.has(it.food.key)).length;
      return { ...o, proteina: c.proteina, tipico: tipicos.includes(c), score: o.score - conocidos * 20 };
    })
    .filter(Boolean)
    .filter(o => o.kcal <= objetivo.kcal * 1.3 || objetivo.kcal < 200)
    .filter(o => !restricciones.length || !o.items.some(it => restricciones.includes(it.food.name)));
  opciones.sort((a, b) => a.score - b.score);
  // Alterna la proteína: reparte en grupos por proteína y los intercala.
  const grupos = {};
  opciones.forEach(o => { (grupos[o.proteina || 'otro'] = grupos[o.proteina || 'otro'] || []).push(o); });
  const colas = Object.values(grupos);
  const intercalada = [];
  while (colas.some(c => c.length)) colas.forEach(c => { if (c.length) intercalada.push(c.shift()); });
  // En cada grupo de 4 (lo que se ve a la vez) se evita repetir la proteína,
  // el acompañamiento y la verdura: así no salen 4 "con arroz y ensalada".
  const partes = o => o.items.map(it => it.food.key);
  const salida = [];
  const pool = intercalada;
  while (pool.length) {
    const grupo = salida.slice(salida.length - (salida.length % 4));
    const usados = new Set(grupo.flatMap(partes));
    const acomps = new Set(grupo.map(g => partes(g)[1]));
    const prots = new Set(grupo.map(g => g.proteina));
    const nuevoAcomp = o => !acomps.has(partes(o)[1]);
    const nuevaProt = o => !prots.has(o.proteina);
    const nadaRepetido = o => !partes(o).slice(1).some(k => usados.has(k));
    // De más a menos exigente: todo distinto → acompañamiento y proteína
    // distintos → al menos el acompañamiento → al menos la proteína.
    const reglas = [o => nuevaProt(o) && nadaRepetido(o), o => nuevaProt(o) && nuevoAcomp(o), nuevoAcomp, nuevaProt];
    let i = -1;
    for (const r of reglas) { i = pool.findIndex(r); if (i >= 0) break; }
    salida.push(pool.splice(i < 0 ? 0 : i, 1)[0]);
  }
  return salida;
}

/* Opciones sueltas para cuando queda poco margen */
function generateQuickOptions(remaining, restricciones = []) {
  if (remaining.kcal <= 0 || remaining.kcal > 350) return [];
  const sueltos = [
    ['Manzana (Cruda)', 180, '🍎'], ['Plátano de seda (Cruda)', 120, '🍌'],
    ['Papaya (Cruda)', 200, '🍈'], ['Yogur natural (-)', 200, '🥛'],
    ['Huevo de gallina (Cocido)', 100, '🥚'], ['Almendras (Crudas)', 25, '🌰'],
    ['Queso fresco (-)', 50, '🧀'], ['Piña (Cruda)', 200, '🍍'],
  ];
  const salida = [];
  for (const [clave, base, emoji] of sueltos) {
    const food = FOODS.find(f => f.key === clave);
    if (!food) continue;
    if (restricciones.includes(food.name)) continue;
    let grams = base;
    const kcalBase = (food.kcal * grams) / 100;
    if (kcalBase > remaining.kcal) {
      grams = Math.round(((remaining.kcal / food.kcal) * 100) / 5) * 5;
    }
    if (grams < 15) continue;
    const kcal = (food.kcal * grams) / 100;
    if (kcal > remaining.kcal * 1.1) continue;
    salida.push({
      id: food.key, emoji, name: food.name,
      items: [{ food, grams }],
      kcal,
      protein: (food.protein * grams) / 100,
      carbs: (food.carbs * grams) / 100,
      fat: (food.fat * grams) / 100,
    });
  }
  return salida.sort((a, b) => b.protein - a.protein).slice(0, 4);
}



















function ModoDeslizar({ remaining, restricciones, mealDestino, onAgregarCombo }) {
  const combos = useMemo(
    () => [...generateCombos(remaining, mealDestino, restricciones), ...generateQuickOptions(remaining, restricciones)],
    [remaining, restricciones, mealDestino]
  );
  const [idx, setIdx] = useState(0);
  const [dx, setDx] = useState(0);
  const arrastrando = useRef(false);
  const startXRef = useRef(null);

  useEffect(() => { setIdx(0); }, [mealDestino]);

  const actual = combos[idx % Math.max(1, combos.length)];

  function onStart(x) { startXRef.current = x; arrastrando.current = true; }
  function onMove(x) { if (startXRef.current === null) return; setDx(x - startXRef.current); }
  function onEnd() {
    arrastrando.current = false;
    if (dx > 80 && actual) { onAgregarCombo(actual); siguiente(); }
    else if (dx < -80) { siguiente(); }
    setDx(0);
    startXRef.current = null;
  }
  function siguiente() { setIdx(v => v + 1); }

  if (!combos.length) {
    return <p className="jb-body text-xs text-zinc-500 text-center py-6">No hay sugerencias disponibles con lo que te queda del día — vuelve más tarde.</p>;
  }
  if (!actual) return null;

  const tintado = dx > 30 ? 'border-emerald-500/70 bg-emerald-950/20' : dx < -30 ? 'border-red-500/70 bg-red-950/10' : 'border-orange-500/25';

  return (
    <div className="flex flex-col items-center gap-3 py-3">
      <div className="flex items-center gap-3 w-full max-w-xs">
        <div className={`flex flex-col items-center gap-0.5 shrink-0 transition-opacity ${dx < -20 ? 'opacity-100' : 'opacity-30'}`}>
          <span className="text-xl">◀</span>
          <span className="jb-body text-[9px] text-zinc-500">Saltar</span>
        </div>
        <div
          className={`relative bg-zinc-950 border-2 rounded-2xl p-5 flex-1 text-center select-none transition-colors ${tintado}`}
          style={{
            transform: `translateX(${dx}px) rotate(${dx / 20}deg)`,
            transition: arrastrando.current ? 'none' : 'transform 0.25s ease, border-color 0.15s ease',
            touchAction: 'pan-y',
          }}
          onTouchStart={e => onStart(e.touches[0].clientX)}
          onTouchMove={e => onMove(e.touches[0].clientX)}
          onTouchEnd={onEnd}
        >
          <div className="text-4xl mb-2">{actual.emoji}</div>
          <p className="jb-display text-base text-zinc-100 mb-1">{actual.name}</p>
          <p className="jb-body text-xs text-zinc-500">{Math.round(actual.kcal)} kcal · P {Math.round(actual.protein)}g</p>
        </div>
        <div className={`flex flex-col items-center gap-0.5 shrink-0 transition-opacity ${dx > 20 ? 'opacity-100' : 'opacity-30'}`}>
          <span className="text-xl">▶</span>
          <span className="jb-body text-[9px] text-zinc-500">Agregar</span>
        </div>
      </div>
      <div className="flex gap-6 mt-1">
        <button onClick={siguiente} className="w-12 h-12 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-xl">✕</button>
        <button onClick={() => { onAgregarCombo(actual); siguiente(); }} className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center text-xl">✓</button>
      </div>
      <p className="jb-body text-[10px] text-zinc-600">👆 Desliza la tarjeta a la derecha para agregar, a la izquierda para saltar</p>
    </div>
  );
}







/* ------------------------------------------------------------------ */
/* SMALL UI PIECES                                                    */
/* ------------------------------------------------------------------ */

const FONT_STYLE = (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Anton&family=Work+Sans:wght@400;500;600;700&display=swap');
    .jb-display { font-family: 'Anton', sans-serif; letter-spacing: 0.02em; }
    .jb-body { font-family: 'Work Sans', sans-serif; }

    /* Llama viva: parpadeo orgánico de escala/rotación/brillo para el
       ícono de marca, en vez de un fuego estático. */
    @keyframes jb-flame-flicker {
      0%, 100% { transform: scale(1) rotate(-2deg); filter: drop-shadow(0 0 2px rgba(249,115,22,0.55)); }
      12% { transform: scale(1.06) rotate(3deg); filter: drop-shadow(0 0 5px rgba(253,186,116,0.75)); }
      27% { transform: scale(0.95) rotate(-4deg); filter: drop-shadow(0 0 2px rgba(249,115,22,0.45)); }
      41% { transform: scale(1.08) rotate(2deg); filter: drop-shadow(0 0 7px rgba(253,224,71,0.8)); }
      58% { transform: scale(0.97) rotate(-2deg); filter: drop-shadow(0 0 3px rgba(249,115,22,0.5)); }
      74% { transform: scale(1.04) rotate(4deg); filter: drop-shadow(0 0 5px rgba(253,186,116,0.7)); }
      88% { transform: scale(0.98) rotate(-1deg); filter: drop-shadow(0 0 2px rgba(249,115,22,0.5)); }
    }
    .jb-flame-live { animation: jb-flame-flicker 1.6s ease-in-out infinite; transform-origin: 50% 85%; }
  `}</style>
);

/* Mascota "Beast": un gorilita reactivo que cambia de expresión según
   el contexto. Reutilizable en loaders, estados vacíos y celebraciones. */
const BEAST_MOODS = {
  sleepy: '😴', flex: '💪', happy: '😄', shock: '😱', proud: '🦍',
  thinking: '🤔', fire: '🔥', wink: '😏',
};
function BeastMascot({ mood = 'happy', size = 40, className = '' }) {
  return (
    <span className={className} style={{ width: size, height: size, display: 'inline-block', verticalAlign: 'middle' }}>
      <img src="/jonah-avatar.png" alt="Jonah"
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
        onError={(e) => { e.target.outerHTML = BEAST_MOODS[mood] || BEAST_MOODS.happy; }} />
    </span>
  );
}

/* Frases rotativas para reemplazar el típico "Cargando..." — le dan
   personalidad peruana a la espera en vez de un spinner genérico. */
const FRASES_CARGA = [
  'Calentando el ají...',
  'Contando arrocitos...',
  'Pesando la papita...',
  'Afilando el cuchillo del cebiche...',
  'Avivando la brasa del pollo...',
  'Batiendo la chicha morada...',
  'Sazonando tu progreso...',
  'Preparando tu próximo combo...',
];
function fraseDeCarga() {
  return FRASES_CARGA[Math.floor(Math.random() * FRASES_CARGA.length)];
}

/* Vibración sutil de celular al lograr algo — no falla si el
   dispositivo/navegador no lo soporta. */
function vibrar(patron = 30) {
  try { if (navigator.vibrate) navigator.vibrate(patron); } catch {}
}

/* Detecta si la app corre empaquetada desde Play Store (TWA). Google
   exige que las apps de Play Store no muestren un flujo de pago propio
   (Yape/Plin) para contenido digital por suscripción — solo pueden
   mostrar precios como información, sin botón de pago ni datos
   bancarios. Este chequeo NO afecta a la versión web/PWA normal, que
   sigue mostrando el flujo completo de pago como siempre.
   Método recomendado por Google: dentro de una TWA, document.referrer
   siempre empieza con "android-app://". */
function esTWA() {
  try { return document.referrer.startsWith('android-app://'); } catch { return false; }
}

/* Pago con Google Play dentro de la app de Android (Digital Goods API).
   Solo existe cuando la app se abre desde la versión de Play Store que
   trae el cobro de Google activado; en la web o en una versión vieja de
   la app devuelve null y se sigue mostrando lo de siempre. El plan lo
   activa el servidor (/api/google-play/verificar) después de confirmar
   la compra directo con Google. */
const PLAY_BILLING = 'https://play.google.com/billing';
const PRODUCTOS_PLAY = { 1: 'jb_plan_mensual', 3: 'jb_plan_trimestral', 6: 'jb_plan_semestral', 12: 'jb_plan_anual' };
const URL_SUSCRIPCIONES_PLAY = 'https://play.google.com/store/account/subscriptions?package=com.jonahbeast.twa';

const esperar = (ms) => new Promise(r => setTimeout(r, ms));

/* Conecta con el cobro de Google Play. Recién instalada la app, Chrome a
   veces tarda en tener lista la conexión, así que se reintenta varias
   veces antes de rendirse. Devuelve { srv, precios, listo, diag }:
   listo = se puede mostrar "Suscribirme"; diag = código corto de lo que
   falló (se muestra chiquito en pantalla para poder revisarlo). */
async function conectarGooglePlay(skus) {
  let diag = 'sin-servicio';
  for (let intento = 0; intento < 5; intento++) {
    if (intento > 0) await esperar(1000 * intento);
    if (!('getDigitalGoodsService' in window)) { diag = 'sin-api'; continue; }
    let srv;
    try { srv = await window.getDigitalGoodsService(PLAY_BILLING); } catch (e) { diag = 'servicio:' + (e?.name || 'error'); continue; }
    if (!srv) { diag = 'servicio-vacio'; continue; }
    try {
      const detalles = await srv.getDetails(skus);
      const precios = {};
      (detalles || []).forEach(d => { precios[d.itemId] = d.price; });
      if (Object.keys(precios).length > 0) return { srv, precios, listo: true, diag: '' };
      diag = 'sin-productos';
    } catch (e) { diag = 'precios:' + (e?.name || 'error'); }
    // Hay conexión con Google pero no llegaron los precios: al último
    // intento se muestra igual el pago, con los precios de la web.
    if (intento === 4) return { srv, precios: {}, listo: true, diag };
  }
  // Sin la API de precios, igual se prueba si Chrome puede abrir el pago
  // de Google Play directamente.
  try {
    if (window.PaymentRequest) {
      const pr = new PaymentRequest(
        [{ supportedMethods: PLAY_BILLING, data: { sku: skus[0] } }],
        { total: { label: 'Total', amount: { currency: 'PEN', value: '0' } } },
      );
      if (await pr.canMakePayment()) return { srv: null, precios: {}, listo: true, diag: diag + '+pago' };
    }
  } catch {}
  return { srv: null, precios: {}, listo: false, diag };
}

async function enviarCompraGoogle(purchaseToken) {
  const { data: { session } } = await supabase.auth.getSession();
  const r = await fetch('/api/google-play/verificar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
    body: JSON.stringify({ purchaseToken }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) throw new Error(data.error || 'No pudimos activar tu plan.');
  return data;
}

/* Reenvía al servidor las compras de Google que tenga el celular, por si
   alguna quedó sin activar (se cerró la app o falló el internet justo
   después de pagar). Devuelve true si activó algún plan. */
async function sincronizarComprasGoogle(servicio) {
  let activo = false;
  try {
    const compras = await servicio.listPurchases();
    for (const c of compras || []) {
      try { const r = await enviarCompraGoogle(c.purchaseToken); if (r.activado) activo = true; } catch {}
    }
  } catch {}
  return activo;
}









/* Sistema simple de notificaciones flotantes (toasts).
   Cualquier componente puede llamar showToast('mensaje') sin necesidad
   de pasar props; se comunica vía CustomEvent y un solo <ToastHost/>
   montado en la raíz de la app se encarga de mostrarlas. */
function showToast(message, tipo = 'success') {
  window.dispatchEvent(new CustomEvent('jb-toast', { detail: { message, tipo, id: Math.random().toString(36).slice(2) } }));
}

function ToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    function onToast(e) {
      const t = e.detail;
      setToasts(list => [...list, t]);
      setTimeout(() => setToasts(list => list.filter(x => x.id !== t.id)), 2800);
    }
    window.addEventListener('jb-toast', onToast);
    return () => window.removeEventListener('jb-toast', onToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map(t => (
        <div key={t.id}
          className={`jb-body text-sm px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 ${t.tipo === 'error' ? 'bg-red-500 text-zinc-950' : 'bg-emerald-500 text-zinc-950'}`}>
          <span>{t.tipo === 'error' ? '⚠️' : '✓'}</span> {t.message}
        </div>
      ))}
    </div>
  );
}

/* Bloques "esqueleto" animados para estados de carga, en vez de un spinner suelto */
function Skeleton({ className }) {
  return <div className={`bg-zinc-800 rounded-lg animate-pulse ${className || ''}`} />;
}

function SkeletonDashboard() {
  const [frase] = useState(fraseDeCarga);
  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center gap-2 justify-center py-2">
        <BeastMascot mood="thinking" size={22} />
        <span className="jb-body text-xs text-zinc-500">{frase}</span>
      </div>
      <Skeleton className="h-20 w-full rounded-2xl" />
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3 min-w-0">
        <Skeleton className="h-4 w-40" />
        <div className="flex justify-around py-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <Skeleton className="h-20 w-20 rounded-full" />
          <Skeleton className="h-20 w-20 rounded-full" />
        </div>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}

function addDaysISO(iso, days) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}





/* Tarjeta de racha: cuántos días seguidos registró comidas, la semana
   actual (L-D) y la insignia del último hito alcanzado. Se calcula a
   partir de la tabla `historial` (comidas_count por fecha). */
/* Resumen de un vistazo: kcal de hoy vs objetivo, racha y si el reto de
   la semana está pendiente — todo en una sola línea, arriba de todo,
   para que el alumno entienda su día en 1 segundo al abrir la app. */
function ResumenDelDia({ username, totalsHoy, targets }) {
  const [racha, setRacha] = useState(0);

  useEffect(() => {
    if (!username) return;
    (async () => {
      try {
        const desde = addDaysISO(todayISO(), -60);
        const { data } = await supabase.from('historial')
          .select('fecha, comidas_count').eq('username', username).gte('fecha', desde);
        const m = {};
        (data || []).forEach(r => { m[r.fecha] = Number(r.comidas_count) || 0; });
        const hoy = todayISO();
        const registro = iso => (m[iso] || 0) > 0;
        let r = 0;
        let cursor = registro(hoy) ? hoy : addDaysISO(hoy, -1);
        while (registro(cursor)) { r++; cursor = addDaysISO(cursor, -1); }
        setRacha(r);
      } catch {}
    })();
  }, [username]);

  const objetivo = targets ? Math.round(targets.kcal) : 0;
  const consumido = Math.round(totalsHoy.kcal);
  const pct = objetivo ? Math.min(100, (consumido / objetivo) * 100) : 0;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 mb-4 flex items-center gap-3 overflow-x-auto">
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-orange-500">🔥</span>
        <span className="jb-body text-xs text-zinc-300 whitespace-nowrap">{consumido}/{objetivo || '—'} kcal</span>
      </div>
      <div className="h-3 w-px bg-zinc-800 shrink-0" />
      <div className="flex items-center gap-1.5 shrink-0">
        <span>💪</span>
        <span className="jb-body text-xs text-zinc-300 whitespace-nowrap">{racha > 0 ? `Racha ${racha}d` : 'Sin racha aún'}</span>
      </div>
    </div>
  );
}



/* Check-in rápido: para días sin ganas de pensar mucho, registra de un
   toque el combo más frecuente de cada comida (de los últimos 45 días). */
function CheckinRapidoButton({ username, mealPlan, setMealPlan }) {
  const [cargando, setCargando] = useState(false);
  const hoyVacio = Object.values(mealPlan.meals || {}).every(arr => arr.length === 0);
  if (!hoyVacio) return null;

  async function comiNormal() {
    setCargando(true);
    try {
      const { data } = await supabase.from('historial')
        .select('meal_plan').eq('username', username)
        .not('meal_plan', 'is', null).order('fecha', { ascending: false }).limit(45);

      const conteoPorComida = {};
      (data || []).forEach(r => {
        Object.entries(r.meal_plan?.meals || {}).forEach(([meal, lista]) => {
          if (!MEAL_NAMES.includes(meal)) return;
          conteoPorComida[meal] = conteoPorComida[meal] || {};
          (lista || []).forEach(en => {
            if (!en.foodKey) return;
            const k = JSON.stringify({ f: en.foodKey, u: en.unit ?? null, q: en.qty ?? en.grams });
            conteoPorComida[meal][k] = (conteoPorComida[meal][k] || 0) + 1;
          });
        });
      });

      const nuevosMeals = { ...mealPlan.meals };
      let algo = false;
      MEAL_NAMES.forEach(meal => {
        const conteo = conteoPorComida[meal];
        if (!conteo || Object.keys(conteo).length === 0) return;
        // Toma los 2 alimentos más repetidos de esa comida
        const top = Object.entries(conteo).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => JSON.parse(k));
        nuevosMeals[meal] = top.map(it => ({
          id: uid(), foodKey: it.f, qty: it.q ?? 100, unit: it.u ?? 'gramos',
        }));
        algo = true;
      });

      if (algo) {
        setMealPlan(v => ({ ...v, meals: nuevosMeals }));
        vibrar(20);
        showToast('✅ Registramos tu día con lo que sueles comer');
      } else {
        showToast('Aún no tenemos suficiente historial para esto', 'error');
      }
    } catch {
      showToast('No se pudo completar, intenta de nuevo', 'error');
    }
    setCargando(false);
  }

  return (
    <button onClick={comiNormal} disabled={cargando}
      className="w-full bg-zinc-900 border border-zinc-800 hover:border-orange-500/40 rounded-2xl p-4 mb-6 flex items-center gap-3 text-left transition-colors">
      <div className="w-10 h-10 rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-lg shrink-0">
        {cargando ? <Loader2 className="animate-spin text-orange-500" size={18} /> : '⚡'}
      </div>
      <div>
        <p className="jb-display text-sm text-zinc-100">COMÍ NORMAL HOY</p>
        <p className="jb-body text-xs text-zinc-500">Registra tu día con lo que sueles comer, de un toque</p>
      </div>
    </button>
  );
}

/* Sugiere un alimento real de proteína (de tu propia base de 230
   alimentos) y calcula la cantidad exacta para cubrir lo que le falta
   al alumno hoy — mismo cálculo que la sustitución inteligente, no
   texto inventado. */
function sugerirProteinaJonah(gapProtein, remainingKcal) {
  const candidatos = FOODS.filter(f =>
    ['Carnes y aves', 'Pescados', 'Pescados y mariscos'].includes(f.group) && f.protein > 15);
  if (!candidatos.length) return null;
  const food = FOODS.find(f => f.name.toLowerCase().includes('pollo') && f.state === 'Cocido') || candidatos[0];
  let grams = Math.max(50, Math.round((gapProtein / food.protein) * 100 / 5) * 5);
  const kcalNecesarias = (food.kcal * grams) / 100;
  if (remainingKcal > 0 && kcalNecesarias > remainingKcal * 1.3) {
    grams = Math.max(50, Math.round(((remainingKcal / food.kcal) * 100) / 5) * 5);
  }
  return { food, grams };
}

/* Construye el consejo de Jonah a partir de los datos reales del día
   (no es texto generado por IA — son las mismas cifras que ya calcula
   la app, solo redactadas como si te hablara directamente). */
function mensajeDeJonah(totalsHoy, targets) {
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  if (!targets || !targets.kcal) {
    return 'Termina de configurar tu objetivo en "Mi objetivo" y te doy recomendaciones reales para tu día.';
  }
  const kcalRestante = Math.round(targets.kcal - totalsHoy.kcal);
  const protRestante = Math.round(targets.protein - totalsHoy.protein);
  const carbRestante = Math.round((targets.carbs || 0) - (totalsHoy.carbs || 0));

  if (kcalRestante <= 0) {
    return pick([
      `¡Ya cumpliste tu objetivo de ${Math.round(targets.kcal)} kcal de hoy! Así se hace 🔥`,
      'Objetivo del día completado. Modo bestia activado 🦍🔥',
      'Kcal de hoy: listas. Descansa tranquilo, lo hiciste bien.',
    ]);
  }

  if (protRestante >= 15) {
    const sug = sugerirProteinaJonah(protRestante, kcalRestante);
    if (sug) {
      const base = pick([
        `Te faltan ${protRestante}g de proteína. Te recomiendo ${sug.grams}g de ${sug.food.name} + una ensalada.`,
        `Aún necesitas ${protRestante}g de proteína hoy — ${sug.grams}g de ${sug.food.name} te los da de sobra.`,
      ]);
      return base + (carbRestante <= 20 ? ' Y ya no necesitas más carbohidratos por ahora.' : '');
    }
  }

  const proteinaCubierta = protRestante < 15;
  const carbsCubiertos = carbRestante <= 20;

  if (proteinaCubierta && carbsCubiertos) {
    return pick([
      `Tu proteína y carbohidratos de hoy ya están cubiertos. Te quedan ${kcalRestante} kcal — ciérralas con algo ligero.`,
      `Vas muy bien hoy. Con ${kcalRestante} kcal libres, cualquier snack pequeño te cierra el día perfecto.`,
    ]);
  }

  if (proteinaCubierta && !carbsCubiertos) {
    return pick([
      `Tu proteína ya está cubierta. Te faltan ${Math.max(0, carbRestante)}g de carbohidratos — un poco de fruta o cereal te viene bien.`,
      `Proteína lista 💪. Aún puedes sumar ${Math.max(0, carbRestante)}g de carbohidratos con algo de fruta o arroz.`,
    ]);
  }

  return pick([
    `Te quedan ${kcalRestante} kcal por hoy. Vas bien, sigue así.`,
    `Llevas un buen ritmo — ${kcalRestante} kcal disponibles todavía.`,
    `Todo en orden. Aún tienes ${kcalRestante} kcal para completar tu día.`,
  ]);
}

/* Abanico de respuestas de Jonah cuando lo tocas repetido: alterna
   entre consejo real de macros, frase motivacional y recordatorio,
   para que no se sienta como un bucle de 2 mensajes. */
const JONAH_FRASES_MOTIVACION = [
  'Cada registro es un ladrillo más de tu resultado. Sigue así 🦍',
  'No hace falta perfección, solo constancia.',
  'Ya diste el paso más difícil: empezar.',
  'Tu cuerpo ya empezó a notar el esfuerzo.',
  'No olvides la importancia de hidratarte: toma mínimo 2 a 3 litros de agua al día 💧',
  'Estoy contigo, acompañándote en tu proceso 🦍',
  '¿Cómo va tu día? Aquí estoy si me necesitas.',
  'Jonah siempre estará al pendiente de ti.',
  'No caminas solo(a) en esto. Yo sigo aquí, contigo.',
  'Cada pequeño paso de hoy es parte de tu mejor versión.',
];
const JONAH_FRASES_OCIO = [
  '¿Ya registraste algo hoy? Toca para que te diga cómo vas.',
  'Estoy aquí cuando me necesites 💪',
  'Toca de nuevo y te doy otro consejo 🦍',
  '¿Cómo vas con el agua hoy? Recuerda tus 2-3 litros diarios.',
];

/* Jonah, la mascota interactiva de la app. Se presenta la primera vez,
   se "golpea el pecho" cuando lleva un rato sin interacción, y al
   tocarlo da un consejo calculado con tus datos reales del día. */
/* Versión de Jonah para pantallas sin sesión (Landing, registro) — sin
   datos de macros todavía, pero igual de viva: respira, se golpea el
   pecho y ruge sola, y al tocarla cambia de frase motivacional. */
function JonahMiniIdle({ fraseInicial, frases }) {
  const [golpeando, setGolpeando] = useState(false);
  const [rugiendo, setRugiendo] = useState(false);
  const [mensaje, setMensaje] = useState(fraseInicial);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let activo = true;
    let t;
    function loop(primeraVez) {
      t = setTimeout(() => {
        if (!activo) return;
        if (Math.random() < 0.5) { setGolpeando(true); setTimeout(() => setGolpeando(false), 700); }
        else { setRugiendo(true); setTimeout(() => setRugiendo(false), 900); }
        loop(false);
      }, primeraVez ? 1200 : 5000 + Math.random() * 3000);
    }
    loop(true);
    return () => { activo = false; clearTimeout(t); };
  }, []);

  function tocar() {
    setGolpeando(true);
    vibrar(15);
    setTimeout(() => setGolpeando(false), 500);
    if (frases && frases.length) {
      setMensaje(frases[idx % frases.length]);
      setIdx(v => v + 1);
    }
  }

  return (
    <div className="text-center">
      <div className="relative inline-block">
        {rugiendo && (
          <span className="absolute -top-2 -right-1 jb-display text-[9px] bg-orange-500 text-zinc-950 px-1.5 py-0.5 rounded-full z-10 whitespace-nowrap">
            ¡RAWR!
          </span>
        )}
        {rugiendo && (
          <>
            <span className="jb-jonah-onda absolute inset-0 rounded-full border-2 border-orange-400 pointer-events-none" />
            <span className="jb-jonah-onda absolute inset-0 rounded-full border-2 border-orange-400 pointer-events-none" style={{ animationDelay: '0.15s' }} />
          </>
        )}
        <button onClick={tocar}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-violet-600 flex items-center justify-center overflow-hidden"
          style={{ animation: golpeando ? 'jb-jonah-golpe 0.35s ease-in-out 2' : rugiendo ? 'jb-jonah-rugido 0.45s ease-in-out 2' : 'jb-jonah-respira 2.6s ease-in-out infinite' }}
          title="Toca a Jonah">
          <img src="/jonah-avatar.png" alt="Jonah" className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = 'none'; }} />
        </button>
      </div>
      <style>{`
        @keyframes jb-jonah-golpe { 0%, 100% { transform: scale(1) rotate(0deg); } 50% { transform: scale(1.18) rotate(-4deg); } }
        @keyframes jb-jonah-rugido { 0%, 100% { transform: scale(1) rotate(0deg); } 50% { transform: scale(1.36) rotate(3deg); } }
        @keyframes jb-jonah-respira { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.045); } }
        @keyframes jb-jonah-onda-expandir { 0% { transform: scale(1); opacity: 0.75; } 100% { transform: scale(1.9); opacity: 0; } }
        .jb-jonah-onda { animation: jb-jonah-onda-expandir 0.9s ease-out; }
      `}</style>
      {mensaje && <p className="jb-body text-xs text-zinc-400 mt-2 max-w-[240px] mx-auto">{mensaje}</p>}
    </div>
  );
}

function JonahGorila({ username, totalsHoy, targets }) {
  const [presentado, setPresentado] = useState(() => {
    try { return localStorage.getItem(`jb-jonah-intro-${username}`) === '1'; } catch { return false; }
  });
  const [mensaje, setMensaje] = useState(null);
  const [golpeando, setGolpeando] = useState(false);
  const [rugiendo, setRugiendo] = useState(false);
  const [idx, setIdx] = useState(0);
  const ociosoRef = useRef(null);

  useEffect(() => {
    if (!presentado) {
      setMensaje('¡Hola! Soy Jonah 🦍 y estoy aquí para lograr tus objetivos, juntos.');
      const t = setTimeout(() => {
        setPresentado(true);
        try { localStorage.setItem(`jb-jonah-intro-${username}`, '1'); } catch {}
        setMensaje(null);
      }, 4200);
      return () => clearTimeout(t);
    }
  }, [presentado, username]);

  // Cuando pasa un rato sin que lo toquen, alterna entre golpearse el
  // pecho y rugir — nunca queda del todo estático.
  useEffect(() => {
    function reiniciarOcio(primeraVez) {
      if (ociosoRef.current) clearTimeout(ociosoRef.current);
      ociosoRef.current = setTimeout(() => {
        if (Math.random() < 0.5) {
          setGolpeando(true);
          setTimeout(() => setGolpeando(false), 700);
        } else {
          setRugiendo(true);
          setTimeout(() => setRugiendo(false), 900);
        }
        reiniciarOcio(false);
      }, primeraVez ? 1200 : 6000 + Math.random() * 3000);
    }
    reiniciarOcio(true);
    return () => { if (ociosoRef.current) clearTimeout(ociosoRef.current); };
  }, []);

  function tocar() {
    if (!presentado) return; // deja que termine su presentación primero
    setGolpeando(true);
    vibrar(15);
    setTimeout(() => setGolpeando(false), 500);

    // Abanico de respuestas: alterna consejo real de macros, frase
    // motivacional y recordatorio, para que no se sienta un bucle de 2.
    const tipo = idx % 3;
    if (tipo === 0) setMensaje(mensajeDeJonah(totalsHoy, targets));
    else if (tipo === 1) setMensaje(JONAH_FRASES_MOTIVACION[Math.floor(Math.random() * JONAH_FRASES_MOTIVACION.length)]);
    else setMensaje(JONAH_FRASES_OCIO[Math.floor(Math.random() * JONAH_FRASES_OCIO.length)]);
    setIdx(v => v + 1);
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6 flex items-start gap-3">
      <div className="relative shrink-0">
        {rugiendo && (
          <span className="absolute -top-2 -right-1 jb-display text-[10px] bg-orange-500 text-zinc-950 px-1.5 py-0.5 rounded-full z-10 whitespace-nowrap">
            ¡RAWR!
          </span>
        )}
        {rugiendo && (
          <>
            <span className="jb-jonah-onda absolute inset-0 rounded-full border-2 border-orange-400 pointer-events-none" />
            <span className="jb-jonah-onda absolute inset-0 rounded-full border-2 border-orange-400 pointer-events-none" style={{ animationDelay: '0.15s' }} />
          </>
        )}
        <button onClick={tocar}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-violet-600 flex items-center justify-center overflow-hidden"
          style={{ animation: golpeando ? 'jb-jonah-golpe 0.35s ease-in-out 2' : rugiendo ? 'jb-jonah-rugido 0.45s ease-in-out 2' : 'jb-jonah-respira 2.6s ease-in-out infinite' }}
          title="Toca a Jonah">
          <img src="/jonah-avatar.png" alt="Jonah" className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = 'none'; }} />
        </button>
      </div>
      <style>{`
        @keyframes jb-jonah-golpe {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.18) rotate(-4deg); }
        }
        @keyframes jb-jonah-rugido {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.36) rotate(3deg); }
        }
        @keyframes jb-jonah-respira {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.045); }
        }
        @keyframes jb-jonah-onda-expandir {
          0% { transform: scale(1); opacity: 0.75; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        .jb-jonah-onda { animation: jb-jonah-onda-expandir 0.9s ease-out; }
      `}</style>
      <div className="flex-1 min-w-0">
        <p className="jb-display text-xs text-orange-500 mb-1">JONAH</p>
        <p className="jb-body text-sm text-zinc-200 leading-snug">
          {mensaje || 'Toca a Jonah para que te diga qué te conviene comer ahora.'}
        </p>
      </div>
    </div>
  );
}





function StatCard({ label, value, sub, accent }) {  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-1">
      <span className="jb-body text-[11px] uppercase tracking-wider text-zinc-500">{label}</span>
      <span className={`jb-display text-3xl ${accent || 'text-orange-500'}`}>{value}</span>
      {sub && <span className="jb-body text-xs text-zinc-400">{sub}</span>}
    </div>
  );
}

/* Anillo de progreso circular para macros (kcal / proteína / carbos).
   color: clase de color Tailwind para el trazo (usa valores hex vía style). */
/* Número que "cuenta" animadamente de un valor a otro, en vez de
   cambiar de golpe — refuerza la sensación de progreso en vivo. */
function AnimatedNumber({ value, duration = 650 }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const frameRef = useRef(null);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    if (from === to || !Number.isFinite(from) || !Number.isFinite(to)) {
      setDisplay(to);
      prevRef.current = to;
      return;
    }
    let start = null;
    function step(ts) {
      if (!start) start = ts;
      const progress = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cúbico
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) frameRef.current = requestAnimationFrame(step);
      else prevRef.current = to;
    }
    frameRef.current = requestAnimationFrame(step);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return display;
}

function MacroRing({ pct, value, numeric, label, colorHex, size = 92, stroke = 9 }) {
  const clamped = Math.max(0, Math.min(100, pct || 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} stroke="#27272a" strokeWidth={stroke} fill="none" />
          <circle cx={size / 2} cy={size / 2} r={r} stroke={colorHex} strokeWidth={stroke} fill="none"
            strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="jb-display text-base text-zinc-50">
            {numeric !== undefined ? <AnimatedNumber value={numeric} /> : value}
          </span>
        </div>
      </div>
      <span className="jb-body text-[11px] uppercase tracking-wider text-zinc-500 text-center break-words" style={{ maxWidth: size + 12 }}>{label}</span>
    </div>
  );
}

function Field({ label, helpHref, children }) {
  return (
    <label className="flex flex-col gap-1.5 jb-body">
      <span className="text-xs uppercase tracking-wider text-zinc-400 flex items-center gap-2">
        {label}
        {helpHref && (
          <a href={helpHref} target="_blank" rel="noopener noreferrer"
            className="text-orange-500 normal-case tracking-normal font-semibold text-[11px] underline hover:text-orange-400">
            ¿Cómo medir?
          </a>
        )}
      </span>
      {children}
    </label>
  );
}

const inputCls = "bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 jb-body";
const btnPrimary = "bg-orange-500 hover:bg-orange-400 text-zinc-950 font-bold jb-body rounded px-4 py-2.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2";
const btnGhost = "bg-transparent border border-zinc-700 hover:border-orange-500 text-zinc-100 jb-body rounded px-4 py-2.5 transition-colors flex items-center justify-center gap-2";


function Logo({ size = 'md', compacto = false }) {
  const big = size === 'lg';
  return (
    <div className="flex items-center gap-2">
      <div className="bg-orange-500 rounded-md p-1.5">
        <Flame className="jb-flame-live text-zinc-950" size={big ? 26 : 18} strokeWidth={2.5} fill="currentColor" />
      </div>
      {/* compacto (barra de arriba de la app): en celulares angostos la letra se
          achica sola para que "FUEL" no quede tapado por los botones. */}
      <span className={`jb-display text-zinc-50 tracking-wide ${big ? 'text-2xl' : compacto ? 'text-[clamp(13px,4.1vw,16px)] sm:text-lg whitespace-nowrap' : 'text-base sm:text-lg whitespace-nowrap'}`}>JONAH BEAST <span className="text-orange-500">FUEL</span></span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* RETO BEAST 15 DÍAS (jonahbeast.com/reto)                            */
/* ------------------------------------------------------------------ */

/* Página para el live de TikTok: invita a personas que buscan un cambio
   real a usar la app de Play Store los 15 días de su prueba gratis. Los participantes crean su
   cuenta con el código RETO para reconocerlos en el panel.
   RETO_GRUPO_URL es el Grupo de Google que está como lista de
   verificadores en Play Console (unirse al grupo = poder instalar). */
const RETO_GRUPO_URL = 'https://groups.google.com/g/reto-beast-fuel';
const RETO_CODIGO = 'RETO';
const RETO_CUPOS = 30;
const URL_VERIFICADOR = 'https://play.google.com/apps/testing/com.jonahbeast.twa';
const URL_PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.jonahbeast.twa';

function RetoPage({ onIrALaApp }) {
  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola Jonah, quiero entrar al Reto Beast 15 días y tengo una duda.')}`;
  const waGmailUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola Jonah, quiero entrar al Reto Beast y no me deja unirme al grupo. Mi Gmail (el de mi Play Store) es: ')}`;
  const waCuentaUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola Jonah, ya tengo cuenta en Jonah Beast Fuel y entré al Reto Beast. Mi usuario es: ')}`;
  const pasos = [
    RETO_GRUPO_URL
      ? { t: 'Únete al grupo del reto', d: 'Con tu cuenta de Google (la misma de tu Play Store).', url: RETO_GRUPO_URL, cta: 'Unirme al grupo',
          aviso: 'Si te sale "No tienes permiso" o te pide "Acceder": toca los 3 puntitos ⋯ arriba → "Abrir en el navegador" (Chrome) y vuelve a tocar "Unirme al grupo".',
          ayuda: '¿No te deja unirte? Mándame tu Gmail (el de tu Play Store) por WhatsApp y yo te agrego al grupo.',
          ayudaUrl: waGmailUrl, ayudaCta: 'No me deja: enviar mi Gmail por WhatsApp' }
      : { t: 'Pásame tu correo de Gmail', d: 'El mismo de tu Play Store. Te agrego a la lista del reto.', url: waUrl, cta: 'Enviar mi Gmail por WhatsApp' },
    { t: 'Acepta ser verificador (probador)', d: 'Toca "Convertirte en verificador" (a algunos les sale "Convertirte en probador"; es lo mismo). Si ya dice "Eres verificador" o "Eres un probador", ya está: sigue al paso 3. Ojo: no toques "Abandonar el programa" ni "Instala la versión pública" (son para salir del reto).', url: URL_VERIFICADOR, cta: 'Aceptar' },
    { t: 'Instala la app', d: 'Desde Play Store. Ábrela siempre desde el ícono de la app, no desde el navegador.', url: URL_PLAY_STORE, cta: 'Instalar en Play Store' },
    { t: `Crea tu cuenta con el código ${RETO_CODIGO}`, d: `Al registrarte en la app, en "Código de invitación" escribe ${RETO_CODIGO}. Tienes 15 días de Premium gratis.`,
      extra: '¿Ya tienes cuenta? No crees otra: entra con tu cuenta de siempre y avísame por WhatsApp que estás en el reto.',
      extraUrl: waCuentaUrl, extraCta: 'Ya tengo cuenta: avisar por WhatsApp' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 jb-body">
      <div className="max-w-xl mx-auto px-4 pb-16" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
        <div className="flex items-center justify-between mb-8">
          <Logo />
          <button onClick={onIrALaApp} className="text-xs text-zinc-400 hover:text-orange-400">Ir a la app</button>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <p className="jb-display text-orange-500 text-sm tracking-widest">RETO BEAST</p>
          <span className="text-[11px] font-semibold text-zinc-950 bg-orange-500 rounded-full px-2 py-0.5">SOLO {RETO_CUPOS} CUPOS</span>
        </div>
        <h1 className="jb-display text-5xl leading-none text-zinc-50 mb-4">15 DÍAS.<br />UN CAMBIO REAL.</h1>
        <div className="inline-flex items-center gap-2 bg-zinc-900 border border-orange-500/60 rounded-xl px-3 py-2 mb-4">
          <span className="text-lg">📅</span>
          <p className="text-sm text-zinc-200">Empieza el <strong className="text-zinc-50">jueves 1 de octubre</strong> · termina el <strong className="text-zinc-50">jueves 15 de octubre</strong></p>
        </div>
        <p className="text-zinc-300 mb-6">
          Busco personas que de verdad quieran bajar grasa o ganar músculo comiendo peruano.
          Usa la app de Jonah Beast Fuel <strong className="text-zinc-50">los 15 días</strong>, registra todo lo que comes y deja que los resultados hablen. Mientras más constante seas, más se nota el cambio.
        </p>

        <div className="bg-zinc-900 border border-orange-500/60 rounded-2xl p-4 mb-8">
          <p className="text-2xl mb-1">🏅</p>
          <p className="jb-display text-lg text-zinc-50">COMPLETA EL RETO</p>
          <p className="text-sm text-zinc-300">Registra tus comidas los 15 días y llévate <strong className="text-orange-400">1 mes gratis</strong> de tu plan al terminar.</p>
        </div>

        <h2 className="jb-display text-2xl text-zinc-50 mb-3">CÓMO ENTRAR</h2>
        <ol className="grid gap-3 mb-8">
          {pasos.map((p, i) => (
            <li key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex gap-3">
              <span className="jb-display text-orange-500 text-2xl leading-none w-6 shrink-0">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-zinc-50 font-semibold">{p.t}</p>
                <p className="text-sm text-zinc-400 mt-0.5">{p.d}</p>
                {p.extra && (
                  <div className="mt-3 border-t border-zinc-800 pt-3">
                    <p className="text-sm text-zinc-300">{p.extra}</p>
                    <a href={p.extraUrl} target="_blank" rel="noopener noreferrer" className={btnGhost + ' mt-2 py-2 text-sm'}>
                      <MessageCircle size={16} /> {p.extraCta}
                    </a>
                  </div>
                )}
                {p.url && (
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className={btnPrimary + ' mt-3 py-2.5 text-sm'}>
                    {p.cta}
                  </a>
                )}
                {p.aviso && (
                  <p className="mt-3 text-xs text-zinc-300 bg-orange-500/10 border border-orange-500/40 rounded-lg px-3 py-2">⚠️ {p.aviso}</p>
                )}
                {p.ayuda && (
                  <div className="mt-3 border-t border-zinc-800 pt-3">
                    <p className="text-sm text-zinc-300">{p.ayuda}</p>
                    <a href={p.ayudaUrl} target="_blank" rel="noopener noreferrer" className={btnGhost + ' mt-2 py-2.5 text-sm'}>
                      <MessageCircle size={16} /> {p.ayudaCta}
                    </a>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>

        <h2 className="jb-display text-2xl text-zinc-50 mb-3">REGLAS</h2>
        <ul className="grid gap-2 text-sm text-zinc-300 mb-8">
          <li>🎟️ Solo <strong className="text-zinc-50">{RETO_CUPOS} cupos</strong>: entran los primeros en completar los pasos.</li>
          <li>📱 Necesitas un celular <strong className="text-zinc-50">Android</strong> con Play Store.</li>
          <li>🍽️ Registra tus comidas en la app <strong className="text-zinc-50">todos los días, los 15 días</strong> del reto.</li>
          <li>💬 Al final, cuéntanos qué mejorarías de la app.</li>
          <li>🤝 El premio es por completar el reto, <strong className="text-zinc-50">no</strong> por la calificación que le pongas a la app en Play Store.</li>
        </ul>

        <p className="text-xs text-zinc-500 mb-6">
          ¿Tienes iPhone? Puedes usar la app desde el navegador en jonahbeast.com con el código {RETO_CODIGO}, pero el reto es para quienes usan la app de Play Store.
          El mes gratis se suma a tu plan al terminar el reto.
        </p>

        <a href={waUrl} target="_blank" rel="noopener noreferrer" className={btnGhost + ' w-full py-3'}>
          <MessageCircle size={18} /> ¿Dudas? Escríbeme por WhatsApp
        </a>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* LANDING                                                             */
/* ------------------------------------------------------------------ */

const TESTIMONIOS = [
  {
    nombre: 'Jonah Beast',
    antes: '/testimonios/martin-antes.jpg',
    despues: '/testimonios/martin-despues.jpg',
    dato: '37 kg perdidos en 3 años y 8 meses',
    cifra: 37, prefijo: '−', unidad: 'KG', detalle: 'en 3 años y 8 meses',
    quote: 'Como fundador de Jonah Beast Fuel, quiero ayudar a otras personas a lograr sus objetivos.',
  },
  {
    nombre: 'Andrea R.',
    antes: '/testimonios/andrea-antes.jpg',
    despues: '/testimonios/andrea-despues.jpg',
    dato: 'Cambios notables en 6 meses',
    cifra: 6, prefijo: '', unidad: 'MESES', detalle: 'de cambio visible',
    quote: 'Apliqué un déficit calórico y logré cambios notables. Esta app va a ser un boom para quienes buscan cambios verdaderos.',
  },
  {
    nombre: 'César C.',
    antes: '/testimonios/cesar-antes.jpg',
    despues: '/testimonios/cesar-despues.jpg',
    dato: 'Mejoró su composición corporal en 1 año',
    cifra: 1, prefijo: '', unidad: 'AÑO', detalle: 'recomponiendo su cuerpo',
    quote: 'No bastaba con ir al gimnasio — el 70% de los resultados están en la comida. Aprendí a comer estratégicamente.',
  },
];

/* ------------------------------------------------------------------ */
/* EMBUDO DE LA LANDING                                                */
/* ------------------------------------------------------------------ */

/* Solo se cuenta el tráfico del sitio real. Las versiones de prueba de
   Vercel (jonah-beast-xxxx.vercel.app) y la compu local usan la misma
   base de datos, así que sin este filtro ensuciarían los números. */
const HOSTS_PRODUCCION = ['jonahbeast.com', 'www.jonahbeast.com', 'jonah-beast.vercel.app'];

/* Marca este navegador para que nunca cuente en el embudo. Se usa al
   abrir cualquier página con ?preview=1 y al entrar como admin, y se
   guarda para siempre en este navegador (no solo en la pestaña). */
function marcarNoContarEmbudo() {
  try { localStorage.setItem('jb-no-contar', '1'); } catch {}
}

function embudoDebeContar() {
  try {
    if (new URLSearchParams(window.location.search).get('preview') === '1') marcarNoContarEmbudo();
  } catch {}
  if (!HOSTS_PRODUCCION.includes(window.location.hostname)) return false;
  try {
    if (localStorage.getItem('jb-no-contar') === '1') return false;
    // Un alumno que ya inició sesión en este celular no es un visitante nuevo.
    if (localStorage.getItem('jb-conocido') === '1') return false;
  } catch {}
  return true;
}

/* Identificador anónimo y aleatorio de este navegador, para contar
   personas (visitantes únicos) y no solo cargas de página. No guarda
   ningún dato personal. */
function visitanteEmbudo() {
  try {
    let id = localStorage.getItem('jb-visitante');
    if (!id) {
      id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).slice(2);
      localStorage.setItem('jb-visitante', id);
    }
    return id;
  } catch { return null; }
}

/* Fuente del tráfico: se lee de la URL (?utm_source=tiktok o
   ?fuente=tiktok) y se recuerda en la pestaña, para que el clic y el
   registro sepan de dónde vino la visita aunque ya no esté en la URL. */
function fuenteEmbudo() {
  try {
    const params = new URLSearchParams(window.location.search);
    const deUrl = params.get('utm_source') || params.get('fuente');
    if (deUrl) { sessionStorage.setItem('jb-fuente', deUrl.toLowerCase()); return deUrl.toLowerCase(); }
    return sessionStorage.getItem('jb-fuente') || 'directo';
  } catch { return 'directo'; }
}

/* Guarda un paso del embudo: 'vista', 'clic_cta' o 'registro'. Falla en
   silencio -- nunca debe bloquear ni ralentizar al visitante. */
/* Camino al pago de un alumno: vio los planes → eligió un plan → eligió
   cómo pagar → envió el pago. Solo en el sitio real (nunca el admin ni las
   versiones de prueba) y cada paso una vez al día por alumno, para que
   recargar la pantalla no lo cuente dos veces. "detalle" = meses del plan
   o medio de pago. */
function registrarPasoPago(evento, username, detalle = null) {
  try {
    if (new URLSearchParams(window.location.search).get('preview') === '1') marcarNoContarEmbudo();
  } catch {}
  try {
    if (!HOSTS_PRODUCCION.includes(window.location.hostname) && localStorage.getItem('jb-probar-embudo') !== '1') return Promise.resolve();
    if (localStorage.getItem('jb-no-contar') === '1') return Promise.resolve();
    const clave = `jb-pago-${evento}-${username}-${detalle || ''}-${todayISO()}`;
    if (localStorage.getItem(clave)) return Promise.resolve();
    localStorage.setItem(clave, '1');
  } catch { return Promise.resolve(); }
  if (!username) return Promise.resolve();
  return supabase.from('embudo_landing_eventos')
    .insert({ evento, username, detalle: detalle === null ? null : String(detalle), fuente: fuenteEmbudo(), visitante_id: visitanteEmbudo() })
    .then(() => {}, () => {});
}

function registrarEventoEmbudo(evento, extra = {}) {
  if (!embudoDebeContar()) return;
  supabase.from('embudo_landing_eventos')
    .insert({ evento, fuente: fuenteEmbudo(), visitante_id: visitanteEmbudo(), ...extra })
    .then(() => {}, () => {});
}

/* Último día gratis si la persona se registra hoy, ej. "8 de octubre".
   Igual que trialDayOf: el día del registro es el día 1, así que el
   último día de prueba es hoy + (TRIAL_DAYS - 1). Una fecha concreta se
   siente más real que "15 días". */
function fechaFinPrueba() {
  const fin = new Date();
  fin.setDate(fin.getDate() + TRIAL_DAYS - 1 + diasCodigoLive());
  return fin.toLocaleDateString('es-PE', { day: 'numeric', month: 'long' });
}

/* Código del live: se escribe en la calculadora (opcional) y, si Jonah le
   puso premio en el panel, suma días de Premium a la prueba. Queda
   guardado en ese celular (7 días) y se canjea al entrar por primera vez a
   la cuenta nueva (canjear_codigo_live en la base: una vez por cuenta). */
const CLAVE_CODIGO_LIVE = 'jb-codigo-live';
const CLAVE_GRASA_WHATSAPP = 'jb-grasa-whatsapp';
// Lo que puso en la calculadora (datos y medidas con cinta): pasa al
// recorrido (ya viene lleno) y a su cuenta nueva, así en la app ve su % de
// grasa sin volver a medirse.
const CLAVE_MEDIDAS_CALC = 'jb-medidas-calc';
function guardarMedidasCalc(form) {
  try {
    const { sexo, edad, estatura, peso, actividad, cuello, cintura, cadera } = form;
    localStorage.setItem(CLAVE_MEDIDAS_CALC, JSON.stringify({ sexo, edad, estatura, peso, actividad, cuello, cintura, cadera, ts: Date.now() }));
  } catch {}
}
function leerMedidasCalc() {
  try {
    const m = JSON.parse(localStorage.getItem(CLAVE_MEDIDAS_CALC) || 'null');
    if (!m || !m.ts || Date.now() - m.ts > 30 * 86400000) return null;
    return m;
  } catch { return null; }
}

/* Link del video "comenta QUIERO" (jonahbeast.com/calculadora): abre directo
   la calculadora y, para ver el % de grasa, pide crear la cuenta gratis (en
   la web normal se pide por WhatsApp). Si no trae ?fuente=, cuenta como
   fuente "quiero" en el embudo. */
function esLinkCalculadora() {
  try { return window.location.pathname.replace(/\/+$/, '') === '/calculadora'; } catch { return false; }
}
function leerCodigoLive() {
  try {
    const c = JSON.parse(localStorage.getItem(CLAVE_CODIGO_LIVE) || 'null');
    if (!c || !c.codigo || Date.now() - c.ts > 7 * 86400000) return null;
    return c;
  } catch { return null; }
}
function diasCodigoLive() { return leerCodigoLive()?.dias || 0; }
function avisarCodigoLive(dias) {
  if (dias > 0) setTimeout(() => showToast(`🎁 Tu código del live te dio +${dias} días de Premium`), 800);
}
async function canjearCodigoLive() {
  const c = leerCodigoLive();
  if (!c) return 0;
  try {
    const { data, error } = await supabase.rpc('canjear_codigo_live', { p_codigo: c.codigo });
    if (error || !data || data.estado === 'sin_sesion' || data.estado === 'sin_cuenta') return 0;
    try { localStorage.removeItem(CLAVE_CODIGO_LIVE); } catch {}
    return data.estado === 'ok' ? data.dias : 0;
  } catch { return 0; }
}

/* Prueba social real junto al botón: las fotos "después" de los mismos
   alumnos de la sección de testimonios, sin números inventados. */
function PruebaSocialMini({ size = 26 }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <div className="flex -space-x-2 shrink-0">
        {TESTIMONIOS.map(t => (
          <img key={t.nombre} src={t.despues} alt="" aria-hidden="true"
            className="rounded-full object-cover object-top border-2 border-zinc-950"
            style={{ width: size, height: size }} />
        ))}
      </div>
      <p className="jb-body text-[11px] text-zinc-400 text-left leading-tight">
        Resultados reales: <span className="text-zinc-200 font-semibold">Jonah −37 kg</span>, Andrea y César
      </p>
    </div>
  );
}

/* "Pruébala sin registrarte": el visitante le toma foto a su plato y ve
   sus calorías antes de crear una cuenta. La IA es la misma de la app
   (función reconocer-comida en modo demo: 1 foto al día por visitante).
   Debajo del resultado, la invitación a registrarse. */
function visitanteDemo() {
  const id = visitanteEmbudo();
  if (id) return id;
  window.__jbVisitante = window.__jbVisitante || Math.random().toString(36).slice(2) + Date.now().toString(36);
  return window.__jbVisitante;
}

function DemoFotoPlato({ onCerrar, onRegistrar }) {
  const [estado, setEstado] = useState('elegir'); // elegir | analizando | resultado | vacio | limite | error
  const [preview, setPreview] = useState(null);
  const [items, setItems] = useState([]);
  const [progreso, setProgreso] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (estado !== 'analizando') return;
    setProgreso(0);
    const id = setInterval(() => setProgreso(p => (p >= 95 ? 95 : p + Math.max(1, Math.round((95 - p) * 0.12)))), 150);
    return () => clearInterval(id);
  }, [estado]);

  async function elegir(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    registrarEventoEmbudo('demo_foto');
    try {
      const blob = await comprimirImagen(file, 1200, 0.85);
      const dataUrl = await new Promise((ok, mal) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = mal; r.readAsDataURL(blob); });
      setPreview(dataUrl);
      setEstado('analizando');
      const { data, error } = await supabase.functions.invoke('reconocer-comida', {
        body: {
          demo: true, visitante: visitanteDemo(), mimeType: 'image/jpeg',
          imagenBase64: dataUrl.split(',')[1] || '',
          alimentos: FOODS.map(f => ({ key: f.key, name: f.name })),
        },
      });
      if (error) throw error;
      if (data?.error === 'limite_demo') { setEstado('limite'); registrarEventoEmbudo('demo_limite'); return; }
      if (data?.error) throw new Error(data.error);
      const lista = (data?.items || []).map(it => {
        const clave = Array.isArray(it.opciones) ? it.opciones[0] : it.key;
        const food = buscarFood(clave);
        if (!food) return null;
        const gramos = Number(it.gramos) > 0 ? Number(it.gramos) : 150;
        return { food, gramos, kcal: Math.round(food.kcal * gramos / 100), protein: food.protein * gramos / 100, carbs: food.carbs * gramos / 100, fat: food.fat * gramos / 100 };
      }).filter(Boolean);
      if (!lista.length) { setEstado('vacio'); return; }
      setItems(lista);
      setEstado('resultado');
      registrarEventoEmbudo('demo_resultado', { detalle: String(lista.length) });
    } catch {
      setEstado('error');
    }
  }

  const total = items.reduce((t, i) => ({ kcal: t.kcal + i.kcal, p: t.p + i.protein, c: t.c + i.carbs, g: t.g + i.fat }), { kcal: 0, p: 0, c: 0, g: 0 });
  const elegirFoto = () => inputRef.current?.click();
  // Dos entradas claras: la cámara directa y la galería (antes era un solo
  // botón y en algunos celulares no quedaba claro que se podía tomar foto).
  const camaraRef = useRef(null);
  const tomarFoto = () => camaraRef.current?.click();

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-sm overflow-y-auto">
      <div className="max-w-md mx-auto px-4 py-5 min-h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <p className="jb-display text-lg text-zinc-50">📸 PRUÉBALA CON TU PLATO</p>
          <button onClick={onCerrar} className="text-zinc-500 hover:text-zinc-300 p-2" aria-label="Cerrar"><X size={20} /></button>
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={elegir} />
        <input ref={camaraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={elegir} />

        {preview && (
          <div className="relative rounded-2xl overflow-hidden border border-orange-500/50 mb-4 bg-zinc-900">
            <img src={preview} alt="Tu plato" className="w-full max-h-72 object-cover" />
            {estado === 'analizando' && (
              <div className="absolute left-[6%] right-[6%] h-0.5 bg-orange-500 transition-all duration-150"
                style={{ top: `${8 + (progreso / 100) * 84}%`, boxShadow: '0 0 12px 4px rgba(232,89,12,0.85)' }} />
            )}
          </div>
        )}

        {estado === 'elegir' && (
          <div className="flex-1 flex flex-col justify-center text-center gap-4">
            <p className="jb-body text-zinc-300">Tómale foto a lo que vas a comer y mira cuántas calorías tiene. <span className="text-zinc-50 font-semibold">Sin registrarte.</span></p>
            <button onClick={tomarFoto} className="w-full bg-orange-500 hover:bg-orange-400 rounded-full py-4 jb-display text-lg text-zinc-950 tracking-wide">📷 TOMAR FOTO AHORA</button>
            <button onClick={elegirFoto} className="w-full border border-orange-500/60 hover:border-orange-400 rounded-full py-3.5 jb-display text-base text-orange-400 tracking-wide">🖼️ SUBIR UNA FOTO DE MI GALERÍA</button>
            <p className="jb-body text-xs text-zinc-500">Funciona con comida peruana: lomo saltado, ceviche, pollo a la brasa, menú del día…</p>
          </div>
        )}

        {estado === 'analizando' && (
          <div className="text-center">
            <p className="jb-body text-orange-300 inline-flex items-center gap-2"><Loader2 className="animate-spin" size={16} />
              {progreso < 35 ? 'Detectando alimentos…' : progreso < 70 ? 'Comparando con platos peruanos…' : 'Calculando calorías…'}</p>
          </div>
        )}

        {estado === 'resultado' && (
          <div className="flex flex-col gap-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <p className="jb-display text-[11px] tracking-[0.18em] text-orange-300 mb-2">⚡ DETECTADO</p>
              <div className="flex flex-col gap-2">
                {items.map((it, i) => (
                  <div key={i} className="flex items-baseline justify-between gap-3 bg-zinc-950 rounded-xl px-3 py-2">
                    <span className="jb-body text-sm text-zinc-100">{it.food.name} <span className="text-zinc-500">· {it.gramos} g</span></span>
                    <span className="jb-display text-lg text-orange-400 tabular-nums shrink-0">{it.kcal}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-baseline justify-between mt-3 px-1">
                <span className="jb-display text-base text-zinc-50">TOTAL</span>
                <span className="jb-display text-4xl text-orange-400 tabular-nums">{total.kcal.toLocaleString('es-PE')} <span className="text-base text-zinc-50">KCAL</span></span>
              </div>
              <p className="jb-body text-xs text-zinc-400 px-1 mt-1 tabular-nums">Proteína {Math.round(total.p)} g · Carbos {Math.round(total.c)} g · Grasa {Math.round(total.g)} g</p>
            </div>
            <div className="bg-orange-500/10 border border-orange-500/40 rounded-2xl p-4 text-center">
              <p className="jb-display text-xl text-zinc-50 leading-tight">¿Y CUÁNTO TE TOCA A TI?</p>
              <p className="jb-body text-sm text-zinc-300 mt-1">Crea tu cuenta y la app calcula tu meta de calorías, te dice qué porción servirte y lleva la cuenta de tu día.</p>
              <button onClick={onRegistrar} className="w-full mt-3 bg-orange-500 hover:bg-orange-400 rounded-full py-3.5 jb-display text-base text-zinc-950 tracking-wide">CREAR MI CUENTA GRATIS</button>
              <p className="jb-body text-[11px] text-zinc-500 mt-2">Gratis para siempre · 7 días de Premium incluidos · Sin tarjeta. Los números son aproximados: la app te deja ajustar la porción.</p>
            </div>
          </div>
        )}

        {estado === 'vacio' && (
          <div className="text-center flex flex-col gap-3">
            <p className="jb-body text-zinc-300">No reconocí comida en esta foto. Prueba con otra donde se vea bien el plato, desde arriba y con luz.</p>
            <button onClick={elegirFoto} className="w-full bg-orange-500 hover:bg-orange-400 rounded-full py-3.5 jb-display text-base text-zinc-950">📷 PROBAR OTRA FOTO</button>
          </div>
        )}

        {estado === 'limite' && (
          <div className="text-center flex flex-col gap-3">
            <p className="jb-body text-zinc-300">Ya usaste tu foto de prueba de hoy. Crea tu cuenta gratis: tus primeros <span className="text-zinc-50 font-semibold">7 días de Premium</span> tienes foto en todas tus comidas, y después sigues gratis.</p>
            <button onClick={onRegistrar} className="w-full bg-orange-500 hover:bg-orange-400 rounded-full py-3.5 jb-display text-base text-zinc-950">CREAR MI CUENTA GRATIS</button>
          </div>
        )}

        {estado === 'error' && (
          <div className="text-center flex flex-col gap-3">
            <p className="jb-body text-zinc-300">No pude analizar la foto. Revisa tu conexión e inténtalo de nuevo.</p>
            <button onClick={elegirFoto} className="w-full bg-orange-500 hover:bg-orange-400 rounded-full py-3.5 jb-display text-base text-zinc-950">📷 INTENTAR DE NUEVO</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Landing({ onChoose }) {


  // Embudo: una 'vista' al abrir la landing y un 'clic_cta' al tocar
  // cualquiera de los botones de prueba gratis. Las reglas de qué se
  // cuenta y qué no están en embudoDebeContar().
  // Si en este equipo hay una sesión iniciada (un alumno que vuelve), no es
  // un visitante nuevo: no se cuenta como vista.
  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data }) => { if (!data?.session) registrarEventoEmbudo('vista'); })
      .catch(() => registrarEventoEmbudo('vista'));
  }, []);
  const [demoAbierta, setDemoAbierta] = useState(false);
  function abrirDemo() {
    registrarEventoEmbudo('demo_abrir');
    try { if (window.fbq) window.fbq('track', 'ViewContent'); } catch (e) {}
    setDemoAbierta(true);
  }
  function registrarClicCTA() {
    registrarEventoEmbudo('clic_cta');
    // Avisa a Meta que alguien mostró interés (tocó "prueba gratis").
    try {
      if (window.fbq) window.fbq('track', 'Lead');
    } catch (e) {}
    // Antes de crear la cuenta: su objetivo y sus datos (Recorrido). Si ya
    // lo hizo en este celular, va directo a crear la cuenta.
    onChoose(leerRecorrido() ? 'trial' : 'recorrido');
  }

  // Portada igual a la de la app instalada: primero el logo animado (solo
  // la primera vez en la visita; se salta tocando) y luego Jonah y Andrea a
  // pantalla completa, con "EMPEZAR AHORA".
  const [splash, setSplash] = useState(splashWebPendiente);
  useEffect(() => {
    if (!splash) return;
    const t = setTimeout(() => { marcarSplashWebVisto(); setSplash(false); }, Math.max(0, SPLASH_WEB_MS - msDeSplash()));
    return () => clearTimeout(t);
  }, [splash]);
  const [fotoIdx, setFotoIdx] = useState(0);
  const [ciclo, setCiclo] = useState(0);
  useEffect(() => {
    if (splash) return;
    const t = setTimeout(() => { setFotoIdx(i => (i + 1) % BIENVENIDA_FOTOS.length); setCiclo(c => c + 1); }, BIENVENIDA_FOTOS[fotoIdx].ms);
    return () => clearTimeout(t);
  }, [splash, fotoIdx]);


  const anim = (nombre, retraso, dur = '.45s') => ({ animation: `${nombre} ${dur} ease-out ${retraso}s forwards` });

  if (splash) return <SplashMarca onSaltar={() => { marcarSplashWebVisto(); setSplash(false); }} />;

  const foto = BIENVENIDA_FOTOS[fotoIdx];
  const logro = (
    <div className="jbb-a" key={`logro-${fotoIdx}`} style={anim('jbb-pop', ciclo === 0 ? .35 : .1)}>
      <span className="jb-display inline-block bg-orange-500 text-zinc-950 rounded-xl px-3 py-1 text-3xl lg:text-4xl">{foto.logro}</span>
      <p className="jb-body text-sm text-zinc-50 mt-1" style={{ textShadow: '0 2px 10px #000' }}>{foto.nombre}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 relative overflow-x-hidden">
      <style>{ESTILOS_BIENVENIDA}</style>

      {/* ---------- Primera pantalla: igual que la app instalada ----------
          En el celular, la foto ocupa toda la pantalla y el texto va abajo.
          En la computadora, la foto grande a la izquierda y el texto a la
          derecha. */}
      <section className="relative min-h-[100svh] lg:grid lg:grid-cols-2 lg:items-center lg:gap-14 lg:max-w-6xl lg:mx-auto lg:px-10 lg:py-10">
        <div className="absolute inset-0 pointer-events-none hidden lg:block"
          style={{ background: 'radial-gradient(circle at 70% 40%, rgba(232,89,12,.18), transparent 55%)' }} />

        {/* Fotos (Jonah y Andrea) con zoom lento */}
        <div className="absolute inset-0 overflow-hidden lg:relative lg:inset-auto lg:h-[84vh] lg:max-h-[820px] lg:rounded-3xl lg:border lg:border-orange-500/40"
          style={{ boxShadow: '0 20px 60px -20px rgba(232,89,12,.55)' }}>
          {BIENVENIDA_FOTOS.map((f, i) => (
            <div key={f.src} className="absolute inset-0 overflow-hidden transition-opacity duration-700" style={{ opacity: i === fotoIdx ? 1 : 0 }}>
              <img key={i === fotoIdx ? `on-${ciclo}` : 'off'} src={f.src} alt={i === fotoIdx ? f.nombre : ''} className="w-full h-full object-cover"
                style={{ objectPosition: '50% 18%', animation: i === fotoIdx ? 'jbb-zoom 4.5s ease-out forwards' : undefined }} />
            </div>
          ))}
          <div className="absolute inset-0 lg:hidden" style={{ background: 'linear-gradient(180deg, rgba(22,17,13,.55) 0%, rgba(22,17,13,0) 20%, rgba(22,17,13,0) 30%, rgba(22,17,13,.9) 58%, #16110D 100%)' }} />
          <div className="absolute inset-x-0 bottom-0 h-48 hidden lg:block" style={{ background: 'linear-gradient(to top, rgba(22,17,13,.9), transparent)' }} />
          <div className="absolute left-6 bottom-6 hidden lg:block">{logro}</div>
          <div className="absolute right-5 top-5 hidden lg:flex gap-1.5" aria-hidden="true">
            {BIENVENIDA_FOTOS.map((f, i) => <span key={f.src} className={`w-2 h-2 rounded-full transition-colors ${i === fotoIdx ? 'bg-orange-500' : 'bg-zinc-50/40'}`} />)}
          </div>
        </div>

        {/* Arriba en el celular: logo y puntos del carrusel */}
        <div className="jbb-a absolute left-5 right-5 flex items-center justify-between lg:hidden" style={{ top: 'max(1.25rem, env(safe-area-inset-top))', ...anim('jbb-baja', .1) }}>
          <div className="flex items-center gap-2">
            <img src="/logo-marca.webp" alt="" className="w-8" />
            <span className="jb-display text-lg text-zinc-50 tracking-wide">JONAH BEAST <span className="text-orange-400">FUEL</span></span>
          </div>
          <div className="flex gap-1.5" aria-hidden="true">
            {BIENVENIDA_FOTOS.map((f, i) => <span key={f.src} className={`w-2 h-2 rounded-full transition-colors ${i === fotoIdx ? 'bg-orange-500' : 'bg-zinc-50/40'}`} />)}
          </div>
        </div>

        {/* Texto y botones */}
        <div className="relative z-10 min-h-[100svh] lg:min-h-0 flex flex-col justify-end lg:justify-center gap-3 px-5 lg:px-0 max-w-md mx-auto lg:mx-0 w-full"
          style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <div className="jbb-a hidden lg:flex items-center gap-3 mb-4" style={anim('jbb-baja', .1)}>
            <img src="/logo-marca.webp" alt="" className="w-12" />
            <div>
              <div className="jb-display text-2xl text-zinc-50 tracking-wide leading-none">JONAH BEAST <span className="text-orange-400">FUEL</span></div>
              <div className="jb-body text-[11px] tracking-[0.2em] uppercase text-zinc-400 mt-1">App de nutrición y pérdida de grasa</div>
            </div>
          </div>
          <div className="lg:hidden">{logro}</div>
          <h1 className="jb-display leading-[0.92] text-[15vw] sm:text-7xl lg:text-[5.5rem] mt-2">
            <span className="jbb-a block text-zinc-50" style={anim('jbb-sube', .55)}>TU CAMBIO</span>
            <span className="jbb-a block text-orange-400" style={anim('jbb-sube', .7)}>EMPIEZA AQUÍ</span>
          </h1>
          <p className="jbb-a jb-body text-base lg:text-lg text-zinc-300" style={anim('jbb-sube', .85)}>Tu plan con comida peruana, justo para tu meta.</p>
          <div className="jbb-a flex items-center gap-3" style={anim('jbb-sube', 1)}>
            <div className="flex">
              {['martin', 'andrea', 'cesar'].map((n, i) => (
                <img key={n} src={`/testimonios/${n}-despues.jpg`} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-zinc-950"
                  style={{ objectPosition: '50% 15%', marginLeft: i ? -10 : 0 }} />
              ))}
            </div>
            <p className="jb-body text-xs text-zinc-300 leading-snug">Hombres y mujeres reales<br />ya empezaron su cambio</p>
          </div>
          <button onClick={registrarClicCTA} className="jbb-a w-full bg-orange-500 hover:bg-orange-400 rounded-full py-4 jb-display text-xl text-zinc-950 tracking-wide mt-1"
            style={{ ...anim('jbb-pop', 1.15), boxShadow: '0 14px 44px -10px rgba(232,89,12,.8)' }}>
            <span className="inline-block" style={{ animation: 'jbb-late 1.6s ease-in-out 2s infinite' }}>EMPEZAR AHORA</span>
          </button>
          <p className="jbb-a jb-body text-zinc-400 text-xs text-center" style={anim('jbb-sube', 1.25)}>
            <span className="text-orange-400 font-semibold">Gratis para siempre</span> · 7 días de Premium incluidos · Sin tarjeta
          </p>
          <div className="jbb-a flex items-center justify-center gap-4" style={anim('jbb-sube', 1.3)}>
            <button onClick={abrirDemo} className="jb-body text-[13px] whitespace-nowrap text-zinc-200 border border-zinc-700 hover:border-orange-500 rounded-full px-3.5 py-2 transition-colors">
              📸 Pruébala con tu plato
            </button>
            <button onClick={() => onChoose('studentAuth')} className="jb-body text-[13px] whitespace-nowrap text-zinc-400 py-2">
              ¿Ya tienes cuenta? <span className="text-orange-400 font-semibold">ENTRAR</span>
            </button>
          </div>
          <button onClick={() => onChoose('free')} className="jbb-a jb-body text-xs text-zinc-500 hover:text-zinc-300 mt-1 self-center" style={anim('jbb-sube', 1.4)}>
            📏 ¿Solo quieres medirte? Hazlo sin registro →
          </button>
        </div>
      </section>

      {demoAbierta && <DemoFotoPlato onCerrar={() => setDemoAbierta(false)} onRegistrar={registrarClicCTA} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AUTH SCREENS                                                        */
/* ------------------------------------------------------------------ */

function FreeCalculator({ onBack, onEmpezar, grasaConCuenta = false }) {
  // Vacío (con ejemplos en gris): antes venía lleno y mucha gente veía
  // resultados que no eran suyos.
  const [form, setForm] = useState({ ...EMPTY_FORM, actividad: 'Moderado' });
  const [step, setStep] = useState('form');
  const [codigo, setCodigo] = useState('');
  const [verCodigo, setVerCodigo] = useState(false);
  // Por WhatsApp solo la primera vez: en ese celular ya lo pidió (Jonah
  // ya tiene su número), así que las siguientes veces lo ve directo y se le
  // invita a crear su cuenta para guardar su historial.
  const [yaLoPidio] = useState(() => { try { return localStorage.getItem(CLAVE_GRASA_WHATSAPP) === '1'; } catch { return false; } });
  const [grasaVisible, setGrasaVisible] = useState(yaLoPidio);
  const [premio, setPremio] = useState(() => leerCodigoLive());
  const [error, setError] = useState('');
  const [revisando, setRevisando] = useState(false);
  // Link del video: entró directo a la calculadora; cuenta como visita.
  useEffect(() => {
    if (!grasaConCuenta) return;
    supabase.auth.getSession()
      .then(({ data }) => { if (!data?.session) registrarEventoEmbudo('vista', { detalle: 'calculadora' }); })
      .catch(() => registrarEventoEmbudo('vista', { detalle: 'calculadora' }));
  }, []);
  // Al ir a crear su cuenta, lo que puso aquí se lleva al recorrido y a la cuenta.
  function empezar(detalle) {
    guardarMedidasCalc(form);
    if (detalle) registrarEventoEmbudo(detalle);
    onEmpezar();
  }

  const num = k => Number(form[k]) || 0;
  const conCinta = num('cuello') >= 15 && num('cintura') > num('cuello') && (form.sexo === 'M' || num('cadera') >= 40);
  const results = useMemo(() => calcAll({
    ...form,
    edad: num('edad'), estatura: num('estatura') || 1, peso: num('peso'),
    cuello: num('cuello') || 1, cintura: num('cintura') || 1, cadera: num('cadera') || 1,
  }), [form]);

  /* Primera parte (calorías, IMC, peso saludable): libre. El % de grasa,
     masa magra y muscular (lo más valioso): se ve al pedirlo por WhatsApp
     (él le escribe a Jonah con sus números), con o sin código. El código
     del live solo da el premio de Premium que Jonah elige en el panel. */
  async function verResultados() {
    setError('');
    if (!(num('edad') >= 14 && num('edad') <= 90)) return setError('Pon tu edad (entre 14 y 90 años).');
    if (!(num('estatura') >= 120 && num('estatura') <= 230)) return setError('Pon tu estatura en centímetros (ej. 165).');
    if (!(num('peso') >= 30 && num('peso') <= 300)) return setError('Pon tu peso en kilos (ej. 72).');
    if (codigo.trim()) {
      setRevisando(true);
      let r = null;
      try {
        const { data } = await supabase.rpc('validar_codigo_live', { p_codigo: codigo.trim() });
        r = data;
      } catch {}
      setRevisando(false);
      if (!r?.valido) {
        return setError('Ese código no es válido o ya venció. Puedes dejarlo vacío y ver tus resultados igual.');
      }
      const c = { codigo: codigo.trim().toUpperCase(), dias: r.dias || 0, ts: Date.now() };
      try { localStorage.setItem(CLAVE_CODIGO_LIVE, JSON.stringify(c)); } catch {}
      setPremio(c);
      registrarEventoEmbudo('calculadora_codigo', { detalle: c.codigo });
    }
    registrarEventoEmbudo('calculadora_resultados', { detalle: conCinta ? 'con_cinta' : 'sin_cinta' });
    setStep('results');
    window.scrollTo({ top: 0 });
  }

  const mensajeGrasa = `Hola Jonah, medí mi composición corporal en la web: ${results.bf.toFixed(1)}% de grasa (${results.bfCat.toLowerCase()}), masa muscular ${results.muscleKg.toFixed(1)} kg, IMC ${results.bmi.toFixed(1)} y gasto de mantenimiento ${Math.round(results.tdee)} kcal al día (peso ${num('peso')} kg). ¿Me ayudas a empezar mi plan?`;
  const campo = (k, label, extra = {}) => (
    <Field label={label} helpHref={extra.ayuda}>
      <input type="number" inputMode="decimal" className={inputCls + ' w-full placeholder:text-zinc-600'} value={form[k]} placeholder={extra.ph}
        onChange={e => setForm(v => ({ ...v, [k]: e.target.value === '' ? '' : Number(e.target.value) }))} />
    </Field>
  );

  return (
    <div className="min-h-screen bg-zinc-950 jb-body">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}>
        <Logo />
        <button onClick={onBack} className={btnGhost + ' py-1.5 px-3 text-sm'}>← Volver</button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-6">
        <div className="text-center">
          <h1 className="jb-display text-3xl sm:text-4xl text-zinc-50 mb-2">MIDE TU COMPOSICIÓN CORPORAL</h1>
          <p className="jb-body text-sm text-zinc-400">{grasaConCuenta
            ? 'Gratis, sin registro: tus calorías al instante. Con una cinta métrica, también tu % de grasa (lo ves al crear tu cuenta gratis).'
            : 'Gratis, sin registro. Para tu % de grasa necesitas una cinta métrica.'}</p>
        </div>

        {step === 'form' ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Sexo">
                <select value={form.sexo} onChange={e => setForm(v => ({ ...v, sexo: e.target.value }))} className={inputCls + ' w-full min-w-0'}>
                  <option value="M">Hombre</option>
                  <option value="F">Mujer</option>
                </select>
              </Field>
              {campo('edad', 'Edad (años)', { ph: '30' })}
              {campo('estatura', 'Estatura (cm)', { ph: '165' })}
              {campo('peso', 'Peso (kg)', { ph: '72' })}
              <Field label="Actividad física">
                <select value={form.actividad} onChange={e => setForm(v => ({ ...v, actividad: e.target.value }))} className={inputCls + ' w-full min-w-0'}>
                  {Object.keys(ACTIVITY_FACTORS).map(a => <option key={a} value={a}>{a} — {ACTIVITY_DESC[a]}</option>)}
                </select>
              </Field>
            </div>
            <p className="jb-display text-sm text-zinc-200 mt-5 mb-1">📏 PARA TU % DE GRASA <span className="text-zinc-500 text-xs">· CON CINTA MÉTRICA</span></p>
            <p className="jb-body text-xs text-zinc-500 mb-3">Opcional. Si no tienes cinta, igual ves tus calorías y tu peso saludable.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {campo('cuello', 'Cuello (cm)', { ph: '38', ayuda: '/guia-cuello.jpg' })}
              {campo('cintura', 'Cintura (cm)', { ph: '85', ayuda: '/guia-cintura.jpg' })}
              {campo('cadera', 'Cadera (cm)', { ph: '95', ayuda: '/guia-cadera.jpg' })}
            </div>
            {verCodigo ? (
              <div className="mt-4">
                <Field label="Código del live (opcional)">
                  <input value={codigo} onChange={e => setCodigo(e.target.value)} className={inputCls + ' uppercase'} placeholder="Ej. BEAST" />
                </Field>
              </div>
            ) : (
              <button type="button" onClick={() => setVerCodigo(true)} className="jb-body text-xs text-zinc-500 hover:text-zinc-300 underline mt-4">
                ¿Tienes el código de un live?
              </button>
            )}
            {error && <p className="text-amber-400 text-sm jb-body flex items-center gap-1.5 mt-3"><AlertTriangle size={14} />{error}</p>}
            <button onClick={verResultados} disabled={revisando} className={btnPrimary + ' w-full mt-5 py-3 text-base'}>
              {revisando ? <Loader2 className="animate-spin" size={18} /> : 'VER MIS RESULTADOS'}
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="⚡ Gasto de mantenimiento" value={Math.round(results.tdee)} sub="kcal/día" accent="text-amber-400" />
              <StatCard label="🔥 Metabolismo basal" value={Math.round(results.tmb)} sub="kcal/día en reposo" />
              <StatCard label="IMC" value={results.bmi.toFixed(1)} sub={results.bmiCat} />
              <StatCard label="Peso saludable" value={`${results.idealMin.toFixed(0)}-${results.idealMax.toFixed(0)} kg`} sub="para tu estatura" />
            </div>

            {conCinta ? (
              <div className="relative bg-zinc-900 border border-orange-500/40 rounded-2xl p-5 overflow-hidden">
                <p className="jb-display text-base text-zinc-50 mb-3">📏 TU COMPOSICIÓN CORPORAL</p>
                <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 ${grasaVisible ? '' : 'blur-md select-none pointer-events-none'}`} aria-hidden={!grasaVisible}>
                  <StatCard label="% Grasa corporal" value={results.bf.toFixed(1) + '%'} sub={results.bfCat} />
                  <StatCard label="Masa grasa" value={results.fatKg.toFixed(1) + ' kg'} />
                  <StatCard label="Masa magra" value={results.leanKg.toFixed(1) + ' kg'} />
                  <StatCard label="Masa muscular est." value={results.muscleKg.toFixed(1) + ' kg'} />
                </div>
                {!grasaVisible && grasaConCuenta && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-5 bg-zinc-950/60 text-center">
                    <p className="jb-display text-lg text-zinc-50">TU % DE GRASA ESTÁ LISTO</p>
                    <p className="jb-body text-xs text-zinc-300 max-w-xs">Crea tu cuenta gratis y míralo en la app, con tu plan para bajarlo. Tus medidas ya quedan guardadas.</p>
                    <button onClick={() => empezar('calculadora_cuenta')} className={btnPrimary + ' w-full max-w-xs py-3 text-sm'}>
                      🔓 CREAR MI CUENTA GRATIS Y VER MI % DE GRASA
                    </button>
                  </div>
                )}
                {!grasaVisible && !grasaConCuenta && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-5 bg-zinc-950/60 text-center">
                    <p className="jb-display text-lg text-zinc-50">TU % DE GRASA ESTÁ LISTO</p>
                    <p className="jb-body text-xs text-zinc-300 max-w-xs">Míralo ahora y recíbelo en tu WhatsApp, junto con la ayuda de Jonah para empezar.</p>
                    <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensajeGrasa)}`} target="_blank" rel="noopener noreferrer"
                      onClick={() => {
                        setGrasaVisible(true); registrarEventoEmbudo('calculadora_whatsapp');
                        try { localStorage.setItem(CLAVE_GRASA_WHATSAPP, '1'); } catch {}
                      }}
                      className={btnPrimary + ' w-full max-w-xs py-3 text-sm'}>
                      📲 VER MI % DE GRASA Y RECIBIRLO POR WHATSAPP
                    </a>
                    <button onClick={() => empezar()} className="jb-body text-xs text-zinc-300 underline">o crea tu cuenta gratis y guárdalo ahí</button>
                  </div>
                )}
                {yaLoPidio && (
                  <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                    <p className="jb-body text-xs text-zinc-300 flex-1">
                      📈 ¿Quieres ver cómo baja tu % de grasa semana a semana? Crea tu cuenta gratis y guarda tu historial.
                    </p>
                    <button onClick={() => empezar()} className={btnPrimary + ' py-2 px-4 text-xs shrink-0'}>Guardar mi historial</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
                <p className="jb-display text-base text-zinc-50 mb-1">¿Y TU % DE GRASA?</p>
                <p className="jb-body text-sm text-zinc-400 mb-3">Con una cinta métrica mides tu cuello, cintura y cadera y te decimos tu % de grasa y tu masa muscular.</p>
                <button onClick={() => setStep('form')} className={btnGhost + ' py-2 px-4 text-sm'}>📏 Agregar mis medidas</button>
              </div>
            )}

            {premio && (
              <div className="rounded-2xl border border-orange-500/60 bg-orange-500/10 p-4 text-center">
                <p className="jb-display text-base text-zinc-50">
                  {premio.dias > 0 ? `🎁 CÓDIGO ${premio.codigo} ACTIVADO: +${premio.dias} DÍAS DE PREMIUM` : `✅ CÓDIGO ${premio.codigo} ACTIVADO`}
                </p>
                {premio.dias > 0 && (
                  <p className="jb-body text-xs text-zinc-300 mt-1">
                    Se suman a tus {TRIAL_DAYS} días de prueba al crear tu cuenta: {TRIAL_DAYS + premio.dias} días de Premium gratis en total.
                  </p>
                )}
              </div>
            )}

            <div className="bg-amber-950/40 border border-amber-800/50 rounded-xl p-3 flex gap-2">
              <AlertTriangle className="text-amber-500 shrink-0" size={16} />
              <p className="text-amber-200 text-xs jb-body">El IMC no distingue grasa de músculo. Estos valores son estimaciones de referencia, no un diagnóstico médico.</p>
            </div>

            <div className="bg-zinc-900 border border-orange-500/40 rounded-2xl p-6 text-center">
              <h2 className="jb-display text-xl text-zinc-50 mb-2">¿Y AHORA QUÉ HAGO CON ESTOS NÚMEROS?</h2>
              <p className="jb-body text-sm text-zinc-400 mb-5">
                Arma tu plan con comida peruana, justo para tu meta: cuánto comer, qué comer y tu avance día a día. Gratis para siempre, con {TRIAL_DAYS + (premio?.dias || 0)} días de Premium incluidos.
              </p>
              <button onClick={() => empezar()} className={btnPrimary + ' w-full py-3 text-base'}>
                TU CAMBIO EMPIEZA AQUÍ
              </button>
              <button onClick={() => setStep('form')} className="jb-body text-sm text-zinc-500 hover:text-zinc-300 mt-4">
                ← Cambiar mis datos
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

/* Genera un usuario disponible a partir del correo (parte antes del @),
   agregando un número al final si ya existe. */
async function generarUsuarioDesdeCorreo(email) {
  const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'alumno';
  let candidato = base;
  let intento = 0;
  while (intento < 30) {
    const { data } = await supabase.from('profiles').select('username').ilike('username', candidato).maybeSingle();
    if (!data) return candidato;
    intento += 1;
    candidato = `${base}${Math.floor(Math.random() * 9000) + 100}`;
  }
  return `${base}${Date.now().toString().slice(-6)}`;
}

// Supabase rechaza contraseñas débiles o que ya aparecen en filtraciones
// públicas de internet (protección "leaked passwords"). Su mensaje viene
// en inglés; aquí se traduce. Devuelve null si el error es de otro tipo.
function mensajeContrasenaRechazada(error) {
  const texto = (error?.message || '').toLowerCase();
  if (error?.code !== 'weak_password' && !texto.includes('weak') && !texto.includes('pwned')) return null;
  const motivos = error?.reasons || [];
  if (motivos.includes('pwned') || texto.includes('easy to guess') || texto.includes('pwned'))
    return 'Esa contraseña es muy común o ya se filtró en internet. Elige otra.';
  if (motivos.includes('length')) return 'La contraseña es muy corta. Elige una más larga.';
  return 'Esa contraseña es muy fácil de adivinar. Elige otra más segura.';
}

/* "Continuar con Google": crea la cuenta (o entra) con un toque, sin
   escribir correo ni contraseña. Google devuelve a la persona a la app ya
   con la sesión abierta; restoreSession la lleva a su prueba. La base le
   arma un usuario único a partir del correo (handle_new_user). */
async function entrarConGoogle(setErr) {
  try { sessionStorage.setItem('jb-google-inicio', String(Date.now())); } catch {}
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/' + (window.location.search || '') },
  });
  if (error) {
    registrarEventoEmbudo('error_registro', { detalle: 'google: ' + String(error.message || '').slice(0, 80) });
    if (setErr) setErr('No se pudo abrir Google. Intenta de nuevo o usa tu correo.');
  }
}

/* Navegador dentro de Instagram, Facebook, Messenger o TikTok (donde se
   abre la página al tocar un anuncio). Ahí Google bloquea su ingreso
   ("disallowed_useragent"), así que en vez del botón se explica cómo
   entrar: con el correo, o abriendo la página en el navegador. */
function navegadorDentroDeApp() {
  try {
    const ua = navigator.userAgent || '';
    if (/FBAN|FBAV|FB_IAB|FBIOS|Messenger/i.test(ua)) return 'Facebook';
    if (/Instagram/i.test(ua)) return 'Instagram';
    if (/musical_ly|BytedanceWebview|TikTok/i.test(ua)) return 'TikTok';
    return null;
  } catch { return null; }
}

function BotonGoogle({ onClick, texto = 'Continuar con Google' }) {
  const app = navegadorDentroDeApp();
  if (app) {
    return (
      <div className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-left">
        <p className="jb-body text-sm text-zinc-200">Estás dentro de {app}: ahí Google no deja entrar.</p>
        <p className="jb-body text-xs text-zinc-400 mt-0.5">Usa tu correo aquí abajo, o toca <span className="text-zinc-200">⋯</span> arriba y elige <span className="text-zinc-200">"Abrir en el navegador"</span> para entrar con Google.</p>
      </div>
    );
  }
  return (
    <button type="button" onClick={onClick}
      className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-zinc-50 hover:bg-white text-zinc-900 jb-body font-semibold text-base py-3 transition-colors">
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
      </svg>
      {texto}
    </button>
  );
}

function SeparadorO({ texto = 'o con tu correo' }) {
  return (
    <div className="flex items-center gap-3 my-1">
      <span className="flex-1 h-px bg-zinc-800" />
      <span className="jb-body text-xs text-zinc-500">{texto}</span>
      <span className="flex-1 h-px bg-zinc-800" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* RECORRIDO ANTES DEL REGISTRO ("TU CAMBIO EMPIEZA AQUÍ")              */
/* ------------------------------------------------------------------ */
/* Antes de crear la cuenta: objetivo, datos y actividad, y le mostramos su
   plan con sus números. Quien ya ve su plan tiene más ganas de guardarlo.
   Las respuestas quedan en el celular (jb-recorrido) y pasan a su cuenta
   al entrar por primera vez (formConRecorrido). Cada paso se cuenta en el
   embudo ('recorrido', detalle = número de paso) para ver dónde se va. */
const CLAVE_RECORRIDO = 'jb-recorrido';
const OBJETIVOS_RECORRIDO = [
  { valor: 'Perder grasa', emoji: '🔥', texto: 'Bajar grasa', sub: 'Verme y sentirme más ligero' },
  { valor: 'Ganar músculo', emoji: '💪', texto: 'Ganar músculo', sub: 'Subir de peso con buena comida' },
  { valor: 'Mantener peso', emoji: '⚖️', texto: 'Mantenerme y comer mejor', sub: 'Ordenar lo que como' },
];

function leerRecorrido() {
  try {
    const r = JSON.parse(localStorage.getItem(CLAVE_RECORRIDO) || 'null');
    if (!r || !r.ts || Date.now() - r.ts > 30 * 86400000) return null;
    return r;
  } catch { return null; }
}

// Si la cuenta todavía no tiene sus datos, se completan con el recorrido
// y, si se midió en la calculadora, con sus medidas de cinta (así ve su %
// de grasa en la app sin volver a medirse).
function formConRecorrido(form) {
  if (tieneDatosBasicos(form)) return form;
  const r = leerRecorrido();
  const m = leerMedidasCalc();
  if (!r && !m) return form;
  try { localStorage.removeItem(CLAVE_RECORRIDO); localStorage.removeItem(CLAVE_MEDIDAS_CALC); } catch {}
  let nuevo = { ...form };
  if (m) {
    nuevo = { ...nuevo, sexo: m.sexo || nuevo.sexo, edad: m.edad, estatura: m.estatura, peso: m.peso, actividad: m.actividad || nuevo.actividad, pesoInicial: m.peso };
    if (m.cuello && m.cintura) nuevo = { ...nuevo, cuello: m.cuello, cintura: m.cintura, cadera: m.cadera || nuevo.cadera };
  }
  if (r) {
    nuevo = {
      ...nuevo, sexo: r.sexo, edad: r.edad, estatura: r.estatura, peso: r.peso, actividad: r.actividad,
      objetivo: r.objetivo, ajustePct: null, pesoInicial: r.peso,
      pesoObjetivo: r.objetivo === 'Mantener peso' ? null : r.pesoObjetivo,
    };
  }
  return nuevo;
}

// Su plan: mismas fórmulas que la app (Mifflin-St Jeor, proteína sobre masa magra estimada).
function planDelRecorrido(r) {
  const peso = Number(r.peso), est = Number(r.estatura), edad = Number(r.edad);
  const tmb = r.sexo === 'M' ? 10 * peso + 6.25 * est - 5 * edad + 5 : 10 * peso + 6.25 * est - 5 * edad - 161;
  const tdee = tmb * (ACTIVITY_FACTORS[r.actividad] || 1.55);
  const pct = r.objetivo === 'Perder grasa' ? -20 : r.objetivo === 'Ganar músculo' ? 10 : 0;
  const kcal = Math.max(tdee * (1 + pct / 100), 800);
  const magra = peso * 0.75;
  let proteina = magra * 2.2;
  if (proteina * 4 > kcal * 0.4) proteina = (kcal * 0.4) / 4;
  if (proteina < magra * 1.6) proteina = magra * 1.6;
  let semanas = null;
  const meta = Number(r.pesoObjetivo);
  if (r.objetivo === 'Perder grasa' && meta > 0 && meta < peso) {
    const kgSemana = ((tdee - kcal) * 7) / 7700;
    if (kgSemana > 0) semanas = Math.ceil((peso - meta) / kgSemana);
  } else if (r.objetivo === 'Ganar músculo' && meta > peso) {
    semanas = Math.ceil((meta - peso) / 0.25);
  }
  return { kcal: Math.round(kcal / 10) * 10, proteina: Math.round(proteina), semanas };
}

// Mensaje que manda al tocar "Recibir mi plan por WhatsApp". El asistente
// de WhatsApp reconoce el inicio ("Este es mi plan de Jonah Beast Fuel").
function mensajePlanWhatsApp(r, plan, extra = '') {
  const objetivo = { 'Perder grasa': 'bajar grasa', 'Ganar músculo': 'ganar músculo', 'Mantener peso': 'mantenerme y comer mejor' }[r.objetivo] || r.objetivo;
  const meta = r.objetivo !== 'Mantener peso' && r.pesoObjetivo
    ? `, meta ${r.pesoObjetivo} kg${plan.semanas ? ` en unas ${plan.semanas} semanas` : ''}` : '';
  return `Hola Jonah, este es mi plan de Jonah Beast Fuel: objetivo ${objetivo}, ${plan.kcal.toLocaleString('es-PE')} kcal y ${plan.proteina} g de proteína al día (peso actual ${r.peso} kg${meta}).${extra ? ' ' + extra : ' ¿Me ayudas a empezar?'}`;
}

function NumeroGrande({ label, valor, onCambio, paso = 1, min, max, unidad, placeholder }) {
  const n = Number(valor);
  const ajustar = d => {
    const base = Number.isFinite(n) && valor !== '' ? n : Number(placeholder) || min;
    onCambio(String(Math.min(max, Math.max(min, Math.round((base + d) * 10) / 10))));
  };
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
      <p className="jb-body text-xs text-zinc-400 mb-2">{label}</p>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => ajustar(-paso)} className="w-11 h-11 rounded-full border border-orange-500/60 text-orange-400 text-xl shrink-0">−</button>
        <input type="number" inputMode="decimal" value={valor} placeholder={placeholder}
          onChange={e => onCambio(e.target.value)}
          className="flex-1 min-w-0 bg-transparent text-center jb-display text-4xl text-zinc-50 outline-none tabular-nums placeholder:text-zinc-700 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
        <button type="button" onClick={() => ajustar(paso)} className="w-11 h-11 rounded-full border border-orange-500/60 text-orange-400 text-xl shrink-0">+</button>
      </div>
      <p className="jb-body text-[11px] text-zinc-500 text-center mt-1">{unidad}</p>
    </div>
  );
}

/* Botón "← Atrás" arriba a la izquierda, visible, en las pantallas antes
   de entrar (recorrido, crear cuenta, ingresar). */
const VISTAS_CON_ATRAS = ['free', 'recorrido', 'trial', 'studentAuth', 'adminAuth'];

function BotonAtras({ onClick, className = '', style }) {
  return (
    <button type="button" onClick={onClick} aria-label="Atrás" style={style}
      className={'jb-body text-sm font-semibold text-zinc-200 bg-zinc-900/80 border border-zinc-700 rounded-full px-3.5 py-1.5 hover:border-orange-500 hover:text-zinc-50 transition-colors ' + className}>
      ← Atrás
    </button>
  );
}

function Recorrido({ onBack, onListo }) {
  const guardado = leerRecorrido();
  // Si viene de la calculadora, sus datos ya vienen puestos.
  const [r, setR] = useState(() => {
    if (guardado) return guardado;
    const m = leerMedidasCalc();
    const vacio = { objetivo: '', sexo: '', edad: '', estatura: '', peso: '', actividad: '', pesoObjetivo: '' };
    return m ? { ...vacio, sexo: m.sexo || '', edad: m.edad ?? '', estatura: m.estatura ?? '', peso: m.peso ?? '', actividad: m.actividad || '' } : vacio;
  });
  // Cada paso queda en el historial del navegador: el botón "atrás" del
  // celular vuelve al paso anterior (y del primero, a la portada).
  const [paso, setPaso] = useState(() => {
    const e = window.history.state;
    return e?.jb === 'recorrido' && e.paso > 0 ? e.paso : 0;
  });
  useEffect(() => {
    const onPop = e => { if (e.state?.jb === 'recorrido') setPaso(e.state.paso || 0); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const fijar = (campo, valor) => setR(v => ({ ...v, [campo]: valor }));
  const conMeta = r.objetivo !== 'Mantener peso';
  const pasos = conMeta ? ['objetivo', 'persona', 'cuerpo', 'actividad', 'meta', 'plan'] : ['objetivo', 'persona', 'cuerpo', 'actividad', 'plan'];
  const actual = pasos[Math.min(paso, pasos.length - 1)];

  useEffect(() => {
    registrarEventoEmbudo(actual === 'plan' ? 'recorrido_plan' : 'recorrido', actual === 'plan' ? {} : { detalle: String(paso + 1) });
    window.scrollTo({ top: 0 });
  }, [actual]);

  const edad = Number(r.edad), est = Number(r.estatura), peso = Number(r.peso), meta = Number(r.pesoObjetivo);
  const valido = {
    objetivo: !!r.objetivo,
    persona: !!r.sexo && edad >= 14 && edad <= 90,
    cuerpo: est >= 120 && est <= 230 && peso >= 30 && peso <= 300,
    actividad: !!r.actividad,
    meta: r.objetivo === 'Perder grasa' ? meta >= 30 && meta < peso : meta > peso && meta <= 300,
    plan: true,
  }[actual];
  const error = {
    persona: r.edad !== '' && !(edad >= 14 && edad <= 90) ? 'Pon una edad entre 14 y 90 años.' : '',
    cuerpo: r.estatura !== '' && !(est >= 120 && est <= 230) ? 'La estatura va en centímetros (ej. 165).'
      : r.peso !== '' && !(peso >= 30 && peso <= 300) ? 'Revisa tu peso en kilos (ej. 72).' : '',
    meta: r.pesoObjetivo !== '' && !valido ? (r.objetivo === 'Perder grasa' ? 'Tu peso meta debe ser menor a tu peso actual.' : 'Tu peso meta debe ser mayor a tu peso actual.') : '',
  }[actual] || '';

  function siguiente() {
    if (!valido) return;
    if (actual === 'actividad' && conMeta && !r.pesoObjetivo) {
      fijar('pesoObjetivo', String(r.objetivo === 'Perder grasa' ? Math.round(peso - 5) : Math.round(peso + 3)));
    }
    const nuevo = Math.min(pasos.length - 1, paso + 1);
    try { window.history.pushState({ jb: 'recorrido', paso: nuevo }, ''); } catch {}
    setPaso(nuevo);
  }
  function atras() {
    const e = window.history.state;
    if (paso > 0 && e?.jb === 'recorrido' && e.paso === paso) window.history.back();
    else if (paso > 0) setPaso(p => p - 1);
    else onBack();
  }
  function guardarRecorridoLocal() {
    try { localStorage.setItem(CLAVE_RECORRIDO, JSON.stringify({ ...r, ts: Date.now() })); } catch {}
  }
  function guardarPlan() {
    guardarRecorridoLocal();
    registrarEventoEmbudo('recorrido_cuenta');
    onListo();
  }

  const plan = actual === 'plan' ? planDelRecorrido(r) : null;
  const opcion = (activo, onClick, contenido, key) => (
    <button key={key} type="button" onClick={onClick}
      className={`w-full text-left rounded-2xl border px-4 py-3.5 transition-colors ${activo ? 'bg-orange-500/15 border-orange-500 text-zinc-50' : 'bg-zinc-950 border-zinc-800 text-zinc-200'}`}>
      {contenido}
    </button>
  );

  return (
    <div className="min-h-screen bg-zinc-950 px-5 py-6 relative overflow-hidden" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 50% 0%, rgba(249,115,22,0.12), transparent 60%)' }} />
      <div className="max-w-md mx-auto relative flex flex-col min-h-[calc(100vh-3rem-env(safe-area-inset-top))]">
        <div className="flex items-center gap-3 mb-5">
          <BotonAtras onClick={atras} className="shrink-0" />
          <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full transition-all duration-300" style={{ width: `${((paso + 1) / pasos.length) * 100}%` }} />
          </div>
          <span className="jb-body text-[11px] text-zinc-500 tabular-nums">{paso + 1}/{pasos.length}</span>
        </div>

        <div className="flex-1 flex flex-col gap-3">
          {actual === 'objetivo' && (
            <>
              <h1 className="jb-display text-3xl text-zinc-50 leading-tight">¿QUÉ QUIERES LOGRAR?</h1>
              <p className="jb-body text-sm text-zinc-400 mb-2">Armamos tu plan con comida peruana, según tu objetivo.</p>
              {OBJETIVOS_RECORRIDO.map(o => opcion(r.objetivo === o.valor, () => { fijar('objetivo', o.valor); fijar('pesoObjetivo', ''); },
                <span className="flex items-center gap-3"><span className="text-2xl">{o.emoji}</span>
                  <span><span className="jb-display text-lg block">{o.texto.toUpperCase()}</span><span className="jb-body text-xs text-zinc-400">{o.sub}</span></span></span>, o.valor))}
            </>
          )}
          {actual === 'persona' && (
            <>
              <h1 className="jb-display text-3xl text-zinc-50 leading-tight">CUÉNTANOS DE TI</h1>
              <p className="jb-body text-sm text-zinc-400 mb-2">Tu cuerpo gasta distinto según tu sexo y tu edad.</p>
              <div className="grid grid-cols-2 gap-3">
                {[['M', '🙋‍♂️ Hombre'], ['F', '🙋‍♀️ Mujer']].map(([v, t]) => opcion(r.sexo === v, () => fijar('sexo', v), <span className="jb-display text-lg block text-center">{t}</span>, v))}
              </div>
              <NumeroGrande label="Edad" valor={r.edad} onCambio={v => fijar('edad', v)} min={14} max={90} unidad="años" placeholder="30" />
            </>
          )}
          {actual === 'cuerpo' && (
            <>
              <h1 className="jb-display text-3xl text-zinc-50 leading-tight">TU ESTATURA Y TU PESO</h1>
              <p className="jb-body text-sm text-zinc-400 mb-2">Con esto calculamos cuánto gasta tu cuerpo al día.</p>
              <NumeroGrande label="Estatura" valor={r.estatura} onCambio={v => fijar('estatura', v)} min={120} max={230} unidad="centímetros" placeholder="165" />
              <NumeroGrande label="Peso actual" valor={r.peso} onCambio={v => fijar('peso', v)} paso={0.5} min={30} max={300} unidad="kilos" placeholder="70" />
            </>
          )}
          {actual === 'actividad' && (
            <>
              <h1 className="jb-display text-3xl text-zinc-50 leading-tight">¿QUÉ TAN ACTIVO ERES?</h1>
              <p className="jb-body text-sm text-zinc-400 mb-2">Cuenta el ejercicio y también tu trabajo.</p>
              {Object.keys(ACTIVITY_FACTORS).map(a => opcion(r.actividad === a, () => fijar('actividad', a),
                <span><span className="jb-display text-base block">{a.toUpperCase()}</span><span className="jb-body text-xs text-zinc-400">{ACTIVITY_DESC[a]}</span></span>, a))}
            </>
          )}
          {actual === 'meta' && (
            <>
              <h1 className="jb-display text-3xl text-zinc-50 leading-tight">¿A QUÉ PESO QUIERES LLEGAR?</h1>
              <p className="jb-body text-sm text-zinc-400 mb-2">Hoy pesas {r.peso} kg. Pon una meta realista; luego la puedes cambiar.</p>
              <NumeroGrande label="Peso meta" valor={r.pesoObjetivo} onCambio={v => fijar('pesoObjetivo', v)} paso={0.5} min={30} max={300} unidad="kilos" />
            </>
          )}
          {actual === 'plan' && plan && (
            <>
              <p className="jb-body text-xs text-orange-300 uppercase tracking-wider">Tu plan está listo</p>
              <h1 className="jb-display text-3xl text-zinc-50 leading-tight">ESTO ES LO QUE TE TOCA</h1>
              <div className="relative bg-zinc-900 border border-orange-500/50 rounded-3xl p-5 overflow-hidden" style={{ boxShadow: '0 0 40px -12px rgba(232,89,12,.5)' }}>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div>
                    <p className="jb-display text-4xl text-orange-400 tabular-nums">{plan.kcal.toLocaleString('es-PE')}</p>
                    <p className="jb-body text-xs text-zinc-400">kcal al día</p>
                  </div>
                  <div>
                    <p className="jb-display text-4xl text-orange-400 tabular-nums">{plan.proteina} g</p>
                    <p className="jb-body text-xs text-zinc-400">de proteína al día</p>
                  </div>
                </div>
                {plan.semanas && (
                  <p className="jb-body text-sm text-zinc-200 text-center mt-4">
                    A este ritmo llegarías a <span className="text-orange-400 font-semibold">{r.pesoObjetivo} kg</span> en unas <span className="text-orange-400 font-semibold">{plan.semanas} semanas</span>.
                  </p>
                )}
                {r.objetivo === 'Mantener peso' && (
                  <p className="jb-body text-sm text-zinc-200 text-center mt-4">Para mantenerte en {r.peso} kg comiendo ordenado y rico.</p>
                )}
              </div>
              <ul className="jb-body text-sm text-zinc-300 flex flex-col gap-1.5 mt-1">
                <li>📸 Tómale foto a tu plato y la app te dice cuánto es</li>
                <li>🍽️ Tu menú del día con comida peruana, justo para tu meta</li>
                <li>📈 Sigue tu avance día a día</li>
              </ul>
              <p className="jb-body text-[11px] text-zinc-500">Son estimaciones de referencia, no una receta médica.</p>
            </>
          )}
          {error && <p className="jb-body text-xs text-amber-400">{error}</p>}
        </div>

        <div className="pt-4">
          {actual === 'plan' ? (
            <>
              <button onClick={guardarPlan} className="w-full bg-orange-500 hover:bg-orange-400 rounded-full py-4 jb-display text-lg text-zinc-950 tracking-wide">
                CREAR MI CUENTA Y GUARDAR MI PLAN
              </button>
              {/* El botón de WhatsApp ya no va aquí: sacaba a la gente antes de
                  crear su cuenta (sobre todo dentro de TikTok/Instagram). Ahora
                  lo ofrece la app después de su primera comida (PlanPorWhatsApp). */}
              <p className="jb-body text-xs text-zinc-400 text-center mt-2"><span className="text-orange-400 font-semibold">Gratis para siempre</span> · 7 días de Premium incluidos · Sin tarjeta</p>
            </>
          ) : (
            <button onClick={siguiente} disabled={!valido}
              className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-40 rounded-full py-4 jb-display text-lg text-zinc-950 tracking-wide">
              {actual === 'actividad' && !conMeta ? 'VER MI PLAN' : actual === 'meta' ? 'VER MI PLAN' : 'SIGUIENTE'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* BIENVENIDA DE LA APP INSTALADA                                       */
/* ------------------------------------------------------------------ */
/* Solo en la app instalada (Play Store o agregada a la pantalla de inicio)
   y sin sesión: el logo animado y luego, a pantalla completa, Jonah y
   Andrea alternando, con "TU CAMBIO EMPIEZA AQUÍ" fijo. La web de los
   anuncios sigue con la portada de siempre (sin animación que demore).
   Para verla en el navegador: ?bienvenida=1. */
function appInstalada() {
  try { if (new URLSearchParams(window.location.search).get('bienvenida') === '1') return true; } catch {}
  try {
    return esTWA() || window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  } catch { return false; }
}

const ESTILOS_BIENVENIDA = `
@keyframes jbb-logo { 0% { opacity: 0; transform: scale(.3); } 60% { opacity: 1; transform: scale(1.06); } 100% { opacity: 1; transform: scale(1); } }
@keyframes jbb-marca { from { opacity: 0; letter-spacing: .4em; } to { opacity: 1; letter-spacing: .06em; } }
@keyframes jbb-linea { from { width: 0; } to { width: 62%; } }
@keyframes jbb-sube { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: none; } }
@keyframes jbb-baja { from { opacity: 0; transform: translateY(-18px); } to { opacity: 1; transform: none; } }
@keyframes jbb-pop { 0% { opacity: 0; transform: scale(.4); } 70% { opacity: 1; transform: scale(1.08); } 100% { opacity: 1; transform: scale(1); } }
@keyframes jbb-zoom { from { transform: scale(1.14); } to { transform: scale(1.03); } }
@keyframes jbb-late { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.025); } }
.jbb-a { opacity: 0; animation-fill-mode: forwards; }
`;

// El logo animado (también se usa mientras la app revisa la sesión).
// Si se vuelve a montar (la pantalla de carga pasa a la portada), la
// animación sigue donde iba en vez de empezar de nuevo.
let splashInicio = null;
function msDeSplash() {
  if (splashInicio === null) return 0;
  return performance.now() - splashInicio;
}
function SplashMarca({ onSaltar }) {
  if (splashInicio === null) splashInicio = performance.now();
  const ya = msDeSplash() / 1000;
  const a = (nombre, dur, retraso) => ({ animation: `${nombre} ${dur}s ease-out ${(retraso - ya).toFixed(2)}s forwards` });
  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center gap-5 overflow-hidden" onClick={onSaltar}>
      <style>{ESTILOS_BIENVENIDA}</style>
      <div className="absolute w-[140vw] h-[140vw] max-w-[900px] max-h-[900px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(232,89,12,.32), rgba(232,89,12,0) 55%)' }} />
      <img src="/logo-marca.webp" alt="" className="jbb-a relative w-[34vw] max-w-[180px]" style={a('jbb-logo', .6, .15)} />
      <p className="jbb-a relative jb-display text-[8.5vw] sm:text-4xl text-zinc-50 whitespace-nowrap" style={a('jbb-marca', .5, .5)}>
        JONAH BEAST <span className="text-orange-400">FUEL</span>
      </p>
      <div className="relative h-1 rounded-full bg-orange-500 w-0" style={{ ...a('jbb-linea', .45, .8), boxShadow: '0 0 18px 4px rgba(232,89,12,.7)' }} />
      <p className="jbb-a relative jb-body text-[3.4vw] sm:text-sm tracking-[.2em] text-zinc-300" style={a('jbb-sube', .4, 1)}>
        NO ES QUÉ COMES. ES CUÁNTO.
      </p>
    </div>
  );
}

// En la web, el logo animado sale solo la primera vez que se abre la
// portada en esa visita (al volver atrás no se repite), y nunca a quien
// pidió menos movimiento en su celular.
const SPLASH_WEB_MS = 1600;
function splashWebPendiente() {
  try {
    if (sessionStorage.getItem('jb-splash-visto') === '1') return false;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    return true;
  } catch { return false; }
}
function marcarSplashWebVisto() {
  try { sessionStorage.setItem('jb-splash-visto', '1'); } catch {}
}

const BIENVENIDA_FOTOS = [
  { src: '/testimonios/martin-despues.jpg', logro: '−37 KG', nombre: 'Jonah · en 3 años y 8 meses', ms: 3400 },
  { src: '/testimonios/andrea-despues.jpg', logro: '6 MESES', nombre: 'Andrea · de cambio visible', ms: 3000 },
];

function Bienvenida({ onEmpezar, onEntrar }) {
  // Si la app ya mostró el logo mientras revisaba la sesión, no se repite.
  const [fase, setFase] = useState(() => (typeof performance !== 'undefined' && performance.now() > 1700 ? 'foto' : 'splash'));
  const [idx, setIdx] = useState(0);
  const [ciclo, setCiclo] = useState(0);
  useEffect(() => { registrarEventoEmbudo('vista', { detalle: 'app' }); }, []);
  useEffect(() => {
    if (fase !== 'splash') return;
    const t = setTimeout(() => setFase('foto'), 1700);
    return () => clearTimeout(t);
  }, [fase]);
  // Carrusel: Jonah primero (más tiempo), luego Andrea, y vuelve.
  useEffect(() => {
    if (fase !== 'foto') return;
    const t = setTimeout(() => { setIdx(i => (i + 1) % BIENVENIDA_FOTOS.length); setCiclo(c => c + 1); }, BIENVENIDA_FOTOS[idx].ms);
    return () => clearTimeout(t);
  }, [fase, idx]);

  if (fase === 'splash') return <SplashMarca />;
  const anim = (nombre, retraso, dur = '.45s') => ({ animation: `${nombre} ${dur} ease-out ${retraso}s forwards` });
  return (
    <div className="fixed inset-0 bg-zinc-950 overflow-hidden">
      <style>{ESTILOS_BIENVENIDA}</style>
      <div className="absolute inset-0 max-w-md mx-auto">
        {BIENVENIDA_FOTOS.map((f, i) => (
          <div key={f.src} className="absolute inset-0 overflow-hidden transition-opacity duration-700" style={{ opacity: i === idx ? 1 : 0 }}>
            <img key={i === idx ? `on-${ciclo}` : 'off'} src={f.src} alt="" className="w-full h-full object-cover"
              style={{ objectPosition: '50% 18%', animation: i === idx ? 'jbb-zoom 4.5s ease-out forwards' : undefined }} />
          </div>
        ))}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(22,17,13,.55) 0%, rgba(22,17,13,0) 20%, rgba(22,17,13,0) 34%, rgba(22,17,13,.9) 62%, #16110D 100%)' }} />

        <div className="jbb-a absolute left-5 right-5 flex items-center justify-between" style={{ top: 'max(1.25rem, env(safe-area-inset-top))', ...anim('jbb-baja', .1) }}>
          <div className="flex items-center gap-2">
            <img src="/logo-marca.webp" alt="" className="w-8" />
            <span className="jb-display text-lg text-zinc-50 tracking-wide">JONAH BEAST <span className="text-orange-400">FUEL</span></span>
          </div>
          <div className="flex gap-1.5" aria-hidden="true">
            {BIENVENIDA_FOTOS.map((f, i) => <span key={f.src} className={`w-2 h-2 rounded-full transition-colors ${i === idx ? 'bg-orange-500' : 'bg-zinc-50/40'}`} />)}
          </div>
        </div>

        <div className="absolute left-5 right-5 flex flex-col gap-3" style={{ bottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <div className="jbb-a" key={`logro-${idx}`} style={anim('jbb-pop', ciclo === 0 ? .35 : .1)}>
            <span className="jb-display inline-block bg-orange-500 text-zinc-950 rounded-xl px-3 py-1 text-3xl">{BIENVENIDA_FOTOS[idx].logro}</span>
            <p className="jb-body text-sm text-zinc-50 mt-1" style={{ textShadow: '0 2px 10px #000' }}>{BIENVENIDA_FOTOS[idx].nombre}</p>
          </div>
          <h1 className="jb-display leading-[0.92] text-[15vw] sm:text-7xl mt-2">
            <span className="jbb-a block text-zinc-50" style={anim('jbb-sube', .55)}>TU CAMBIO</span>
            <span className="jbb-a block text-orange-400" style={anim('jbb-sube', .7)}>EMPIEZA AQUÍ</span>
          </h1>
          <p className="jbb-a jb-body text-base text-zinc-300" style={anim('jbb-sube', .85)}>Tu plan con comida peruana, justo para tu meta.</p>
          <div className="jbb-a flex items-center gap-3" style={anim('jbb-sube', 1)}>
            <div className="flex">
              {['martin', 'andrea', 'cesar'].map((n, i) => (
                <img key={n} src={`/testimonios/${n}-despues.jpg`} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-zinc-950"
                  style={{ objectPosition: '50% 15%', marginLeft: i ? -10 : 0 }} />
              ))}
            </div>
            <p className="jb-body text-xs text-zinc-300 leading-snug">Hombres y mujeres reales<br />ya empezaron su cambio</p>
          </div>
          <button onClick={onEmpezar} className="jbb-a w-full bg-orange-500 hover:bg-orange-400 rounded-full py-4 jb-display text-xl text-zinc-950 tracking-wide mt-1"
            style={{ ...anim('jbb-pop', 1.15), boxShadow: '0 14px 44px -10px rgba(232,89,12,.8)' }}>
            <span className="inline-block" style={{ animation: 'jbb-late 1.6s ease-in-out 2s infinite' }}>EMPEZAR AHORA</span>
          </button>
          <button onClick={onEntrar} className="jbb-a jb-body text-sm text-zinc-400 py-1" style={anim('jbb-sube', 1.3)}>
            ¿Ya tienes cuenta? <span className="text-orange-400 font-semibold">ENTRAR</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function TrialSignup({ onBack, onCreated }) {
  const refDesdeURL = (() => {
    try { return new URLSearchParams(window.location.search).get('ref') || ''; } catch { return ''; }
  })();
  const [f, setF] = useState({ email: '', password: '', telefono: '', referido: refDesdeURL });
  const [verPass, setVerPass] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [aviso, setAviso] = useState('');
  const [refEstado, setRefEstado] = useState(null); // {ok, nombre} | {ok:false}
  const [refConfirmado, setRefConfirmado] = useState(false);
  // El campo de código se esconde tras "¿Tienes un código?" para que el
  // formulario se vea más corto; si llegó con ?ref= se abre ya lleno.
  const [verReferido, setVerReferido] = useState(!!refDesdeURL);
  const planGuardado = useMemo(() => { const r = leerRecorrido(); return r ? planDelRecorrido(r) : null; }, []);

  // Verifica el código mientras escribe
  useEffect(() => {
    const cod = f.referido.trim().toUpperCase();
    setRefConfirmado(false);
    if (!cod) { setRefEstado(null); return; }
    const t = setTimeout(async () => {
      try {
        // validar_codigo solo dice si el código es válido (y de quién es);
        // la tabla de embajadores ya no se puede leer desde la app.
        const { data } = await supabase.rpc('validar_codigo', { p_codigo: cod });
        setRefEstado(data && data.ok ? { ok: true, nombre: data.nombre } : { ok: false });
      } catch { setRefEstado(null); }
    }, 500);
    return () => clearTimeout(t);
  }, [f.referido]);

  async function submit(e) {
    e.preventDefault();
    setErr(''); setAviso('');
    const email = f.email.trim().toLowerCase();
    // Cada tropiezo queda anotado en el embudo ("error_registro"), para
    // saber qué frena a quien quiere registrarse.
    const tropiezo = (detalle, texto) => { registrarEventoEmbudo('error_registro', { detalle }); setErr(texto); };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return tropiezo(email ? 'correo_invalido' : 'correo_vacio', 'Escribe un correo válido.');
    if (f.password.length < 6) return tropiezo('contrasena_corta', 'La contraseña debe tener al menos 6 caracteres.');
    // El WhatsApp es obligatorio: si no vuelve a abrir la app (pasa mucho
    // con quien llega desde un anuncio), es la única forma de escribirle.
    const tel = f.telefono.replace(/\D/g, '').replace(/^51(?=9\d{8}$)/, '');
    if (tel.length < 9) return tropiezo(tel ? 'telefono_invalido' : 'telefono_vacio', 'Escribe tu celular de WhatsApp (9 dígitos) para que pueda acompañarte.');
    if (f.referido.trim() && refEstado && !refEstado.ok && !refConfirmado) {
      setRefConfirmado(true);
      return tropiezo('referido_invalido', 'Ese código de referido no existe o ya no está activo. Revísalo, o toca de nuevo el botón para continuar sin él.');
    }

    setBusy(true);
    let user = '';
    try {
      user = await generarUsuarioDesdeCorreo(email);
    } catch (e) {
      setBusy(false);
      return tropiezo('error_usuario', 'No se pudo preparar tu cuenta. Intenta de nuevo.');
    }

    const { data, error } = await supabase.auth.signUp({
      email, password: f.password,
      options: { data: { username: user, nombre: '', codigo_referido: (refEstado && refEstado.ok) ? f.referido.trim().toUpperCase() : '' } },
    });

    if (error) {
      setBusy(false);
      if ((error.message || '').toLowerCase().includes('already registered'))
        return tropiezo('correo_existente', 'Ese correo ya tiene una cuenta. Inicia sesión.');
      const rechazo = mensajeContrasenaRechazada(error);
      if (rechazo) return tropiezo('contrasena_rechazada', rechazo);
      return tropiezo('error_sistema: ' + String(error.message || '').slice(0, 80), 'No se pudo crear tu cuenta: ' + error.message);
    }

    // El registro de alumno y su prueba de Premium de 7 días se crean
    // automáticamente en la base de datos al confirmarse la cuenta.
    // El celular se pide aquí (obligatorio) y se guarda apenas existe su
    // ficha de alumno (la crea la base al registrarse; se reintenta por si
    // tarda un momento). La fecha de nacimiento se pide en Planes.

    // Avisa a TikTok y a Meta que se completó un registro exitoso, para
    // que puedan optimizar las campañas hacia este evento de conversión.
    avisarRegistroTikTok(data?.user?.id);
    try {
      if (window.fbq) window.fbq('track', 'CompleteRegistration');
    } catch (e) {}

    // Paso 'registro' del embudo: la cuenta quedó creada. Se guarda el
    // usuario para poder seguir a esta persona hasta la prueba y el pago.
    registrarEventoEmbudo('registro', { username: user });

    if (data.session) {
      for (let intento = 0; intento < 4; intento++) {
        try {
          const { data: fila } = await supabase.from('alumnos').update({ telefono: tel }).eq('username', user).select('username').maybeSingle();
          if (fila) break;
        } catch {}
        await new Promise(r => setTimeout(r, 600));
      }
    }

    setBusy(false);
    if (!data.session) {
      setAviso('Revisa tu correo y confirma tu cuenta para entrar. Si no lo ves, mira en spam.');
      return;
    }
    onCreated(user);
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6 py-16 relative overflow-hidden" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 50% 0%, rgba(249,115,22,0.12), transparent 60%)' }} />
      <BotonAtras onClick={onBack} className="absolute left-4 z-10" style={{ top: 'calc(env(safe-area-inset-top) + 1rem)' }} />
      <div className="max-w-md w-full relative">
        <div className="mb-6"><Logo size="lg" /></div>
        <div className="bg-zinc-900 border border-orange-500/40 rounded-2xl p-6 shadow-xl shadow-black/40">
          <div className="mb-5">
            {planGuardado ? (
              <>
                <h1 className="jb-display text-3xl text-zinc-50 leading-[0.98] mb-2">GUARDA<br />TU PLAN</h1>
                <p className="jb-body text-sm text-zinc-300 mb-1">
                  Tu meta: <span className="text-orange-400 font-semibold tabular-nums">{planGuardado.kcal.toLocaleString('es-PE')} kcal</span> y <span className="text-orange-400 font-semibold tabular-nums">{planGuardado.proteina} g de proteína</span> al día.
                </p>
                <p className="jb-body text-sm text-zinc-400">
                  <span className="text-orange-400 font-semibold">Gratis para siempre</span>, con Premium hasta el {fechaFinPrueba()} · sin tarjeta.
                </p>
              </>
            ) : (
              <>
                <h1 className="jb-display text-3xl text-zinc-50 leading-[0.98] mb-2">CREA TU<br />CUENTA GRATIS</h1>
                <p className="jb-body text-sm text-zinc-400">
                  <span className="text-orange-400 font-semibold">Gratis para siempre</span>, con Premium hasta el {fechaFinPrueba()} · sin tarjeta. Registro en 30 segundos.
                </p>
              </>
            )}
            {diasCodigoLive() > 0 && (
              <p className="jb-body text-xs text-orange-300 mt-2">🎁 Incluye +{diasCodigoLive()} días de Premium por tu código del live.</p>
            )}
          </div>

          {!aviso && (
            <ul className="jb-body text-sm text-zinc-300 flex flex-col gap-1.5 mb-5">
              <li>📸 Macros de tu plato con una foto</li>
              <li>🍽️ Plan con comida peruana</li>
              <li>📈 Seguimiento de tu progreso</li>
            </ul>
          )}

          {aviso ? (
            <div className="text-center">
              <MessageCircle className="text-emerald-400 mx-auto mb-3" size={32} />
              <p className="jb-body text-sm text-zinc-200 mb-4">{aviso}</p>
              <button onClick={onBack} className={btnGhost + ' w-full'}>Volver al inicio</button>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-3">
              <BotonGoogle onClick={() => entrarConGoogle(setErr)} />
              <SeparadorO />
              <Field label="Correo electrónico">
                <input type="email" inputMode="email" value={f.email} onChange={e => setF(v => ({ ...v, email: e.target.value }))} className={inputCls} placeholder="tucorreo@gmail.com" />
              </Field>
              <Field label="Contraseña">
                <div className="relative">
                  <input type={verPass ? 'text' : 'password'} value={f.password} onChange={e => setF(v => ({ ...v, password: e.target.value }))} className={inputCls + ' pr-10'} placeholder="Mínimo 6 caracteres" />
                  <button type="button" onClick={() => setVerPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                    <Eye size={16} />
                  </button>
                </div>
              </Field>
              <Field label="Tu WhatsApp">
                <input type="tel" inputMode="tel" autoComplete="tel" value={f.telefono} onChange={e => setF(v => ({ ...v, telefono: e.target.value }))} className={inputCls} placeholder="9XX XXX XXX" />
                <span className="jb-body text-[11px] text-zinc-500 block mt-1">Para acompañarte y avisarte si se te pasa una comida. Nada de spam.</span>
              </Field>
              {verReferido ? (
                <Field label="Código de referido (opcional)">
                  <input value={f.referido} onChange={e => setF(v => ({ ...v, referido: e.target.value }))}
                    autoFocus={!refDesdeURL}
                    className={inputCls + ' uppercase'} placeholder="Escribe tu código" />
                </Field>
              ) : (
                <button type="button" onClick={() => setVerReferido(true)}
                  className="jb-body text-xs text-zinc-500 hover:text-orange-400 text-left underline underline-offset-2 self-start">
                  ¿Tienes un código?
                </button>
              )}
              {verReferido && f.referido.trim() && refEstado && (
                refEstado.ok ? (
                  <p className="text-emerald-400 text-xs jb-body -mt-2">
                    ✓ Código válido · te recomendó {refEstado.nombre}
                  </p>
                ) : (
                  <p className="text-amber-400 text-xs jb-body -mt-2 flex items-start gap-1.5">
                    <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                    <span>Ese código no existe o ya no está activo. Puedes corregirlo o continuar sin él.</span>
                  </p>
                )
              )}
              {err && <p className="text-red-400 text-sm jb-body flex items-center gap-1.5"><AlertTriangle size={14} />{err}</p>}
              <button type="submit" disabled={busy} className={btnPrimary + ' py-3 text-base mt-1'}>
                {busy ? <Loader2 className="animate-spin" size={18} /> : 'CREAR MI CUENTA GRATIS'}
              </button>
              <p className="jb-body text-[11px] text-zinc-600 text-center -mt-0.5">
                Al crear tu cuenta, aceptas nuestra{' '}
                <a href="https://jonahbeast.com/privacidad.html" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-400 underline">
                  Política de Privacidad
                </a>
              </p>
              <button type="button" onClick={onBack} className="jb-body text-sm text-zinc-500 hover:text-zinc-300 mt-1">← Volver</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function TrialSignupPlaceholder() { return null; }

function AdminAuth({ onBack, onLogin, busy }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [modo, setModo] = useState('login');
  const [codigo, setCodigo] = useState('');
  const [passNueva, setPassNueva] = useState('');
  const [passNueva2, setPassNueva2] = useState('');
  const [busyCodigo, setBusyCodigo] = useState(false);

  function submit(e) {
    e.preventDefault();
    setErr('');
    if (!email.trim() || !pass) return setErr('Completa tu correo y contraseña.');
    onLogin(email.trim(), pass, setErr);
  }

  async function recuperar(e) {
    e.preventDefault();
    setErr('');
    if (!email.trim()) return setErr('Escribe tu correo para enviarte el código.');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    if (error) return setErr('No se pudo enviar el código. Intenta de nuevo en un momento.');
    setModo('codigo');
  }

  async function verificarCodigo(e) {
    e.preventDefault();
    setErr('');
    if (!codigo.trim()) return setErr('Escribe el código de verificación que te llegó por correo.');
    if (passNueva.length < 6) return setErr('La contraseña nueva debe tener al menos 6 caracteres.');
    if (passNueva !== passNueva2) return setErr('Las contraseñas no coinciden.');
    setBusyCodigo(true);
    const { error: errCodigo } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(), token: codigo.trim(), type: 'recovery',
    });
    if (errCodigo) {
      setBusyCodigo(false);
      return setErr('El código no es válido o ya venció. Pide uno nuevo.');
    }
    const { error: errPass } = await supabase.auth.updateUser({ password: passNueva });
    setBusyCodigo(false);
    if (errPass) return setErr(mensajeContrasenaRechazada(errPass) || 'No se pudo cambiar la contraseña: ' + (errPass.message || 'intenta de nuevo.'));
    onLogin(email.trim().toLowerCase(), passNueva, setErr);
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6 py-16 relative" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }}>
      <BotonAtras onClick={onBack} className="absolute left-4 z-10" style={{ top: 'calc(env(safe-area-inset-top) + 1rem)' }} />
      <div className="max-w-sm w-full">
        <div className="mb-8"><Logo size="lg" /></div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="jb-display text-xl text-zinc-50 mb-1">
            {modo === 'login' ? 'ACCESO ADMINISTRACIÓN' : modo === 'codigo' ? 'REVISA TU CORREO' : 'RECUPERAR CONTRASEÑA'}
          </h2>
          <p className="jb-body text-sm text-zinc-500 mb-5">
            {modo === 'login' ? 'Ingresa con tu mismo correo y contraseña de cuenta.'
              : modo === 'codigo' ? `Te mandamos un código de verificación a ${email}. Escríbelo abajo junto a tu contraseña nueva.`
              : 'Te enviaremos un código a tu correo.'}
          </p>

          {modo === 'codigo' ? (
            <form onSubmit={verificarCodigo} className="flex flex-col gap-4">
              <Field label="Código de verificación">
                <input type="text" inputMode="numeric" value={codigo} onChange={e => setCodigo(e.target.value)}
                  className={inputCls} autoFocus placeholder="Código del correo" />
              </Field>
              <Field label="Contraseña nueva">
                <input type="password" value={passNueva} onChange={e => setPassNueva(e.target.value)} className={inputCls} placeholder="Mínimo 6 caracteres" />
              </Field>
              <Field label="Repite la contraseña">
                <input type="password" value={passNueva2} onChange={e => setPassNueva2(e.target.value)} className={inputCls} />
              </Field>
              {err && <p className="text-red-400 text-sm jb-body flex items-center gap-1.5"><AlertTriangle size={14} />{err}</p>}
              <button type="submit" disabled={busyCodigo} className={btnPrimary}>
                {busyCodigo ? <Loader2 className="animate-spin" size={18} /> : 'Cambiar contraseña y entrar'}
              </button>
              <button type="button" onClick={() => { setModo('recuperar'); setErr(''); }} className="jb-body text-xs text-orange-500 hover:text-orange-400">
                ¿No te llegó? Pedir otro código
              </button>
              <button type="button" onClick={onBack} className="jb-body text-sm text-zinc-500 hover:text-zinc-300 mt-1">← Volver</button>
            </form>
          ) : (
            <form onSubmit={modo === 'login' ? submit : recuperar} className="flex flex-col gap-4">
              <Field label="Correo">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} autoFocus />
              </Field>
              {modo === 'login' && (
                <Field label="Contraseña">
                  <input type="password" value={pass} onChange={e => setPass(e.target.value)} className={inputCls} />
                </Field>
              )}
              {err && <p className="text-red-400 text-sm jb-body flex items-center gap-1.5"><AlertTriangle size={14} />{err}</p>}
              <button type="submit" disabled={busy} className={btnPrimary}>
                {busy ? <Loader2 className="animate-spin" size={18} /> : (modo === 'login' ? 'Ingresar' : 'Enviar código')}
              </button>
              <button type="button" onClick={() => { setModo(modo === 'login' ? 'recuperar' : 'login'); setErr(''); }}
                className="jb-body text-xs text-orange-500 hover:text-orange-400">
                {modo === 'login' ? '¿Olvidaste tu contraseña?' : '← Volver a iniciar sesión'}
              </button>
              <button type="button" onClick={onBack} className="jb-body text-sm text-zinc-500 hover:text-zinc-300 mt-1">← Volver</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function ResetPassword({ onDone }) {
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [listo, setListo] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (pass.length < 6) return setErr('La contraseña debe tener al menos 6 caracteres.');
    if (pass !== pass2) return setErr('Las contraseñas no coinciden.');
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pass });
    setBusy(false);
    if (error) return setErr(mensajeContrasenaRechazada(error) || 'No se pudo cambiar la contraseña. Pide un enlace nuevo.');
    setListo(true);
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 50% 0%, rgba(249,115,22,0.12), transparent 60%)' }} />
      <div className="max-w-sm w-full relative">
        <div className="mb-8"><Logo size="lg" /></div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl shadow-black/40">
          {listo ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-2xl mx-auto mb-3">✅</div>
              <h2 className="jb-display text-xl text-emerald-400 mb-2">¡LISTO!</h2>
              <p className="jb-body text-sm text-zinc-400 mb-5">Tu contraseña quedó actualizada.</p>
              <button onClick={onDone} className={btnPrimary + ' w-full py-3'}>Entrar a mi cuenta</button>
            </div>
          ) : (
            <>
              <h2 className="jb-display text-xl text-zinc-50 mb-1">CREA TU CONTRASEÑA NUEVA</h2>
              <p className="jb-body text-sm text-zinc-500 mb-5">Elige una que recuerdes fácilmente.</p>
              <form onSubmit={submit} className="flex flex-col gap-4">
                <Field label="Contraseña nueva">
                  <input type="password" value={pass} onChange={e => setPass(e.target.value)} className={inputCls} autoFocus placeholder="Mínimo 6 caracteres" />
                </Field>
                <Field label="Repite la contraseña">
                  <input type="password" value={pass2} onChange={e => setPass2(e.target.value)} className={inputCls} />
                </Field>
                {err && <p className="text-red-400 text-sm jb-body flex items-center gap-1.5"><AlertTriangle size={14} />{err}</p>}
                <button type="submit" disabled={busy} className={btnPrimary + ' py-3'}>
                  {busy ? <Loader2 className="animate-spin" size={18} /> : 'Guardar contraseña'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* "¿Qué te faltó para quedarte?": una pregunta de un toque cuando se
   termina la prueba gratis. La respuesta llega al panel de Jonah
   ("Volver a invitar"). Se responde una vez; en este celular se recuerda. */
const MOTIVOS_SALIDA = [
  { key: 'precio', label: '💸 El precio' },
  { key: 'tiempo', label: '⏰ No tuve tiempo' },
  { key: 'no_entendi', label: '🤔 No la entendí bien' },
  { key: 'foto', label: '📸 La foto no me funcionó bien' },
  { key: 'comidas', label: '🍽️ No encontré mis comidas' },
  { key: 'otro', label: '✍️ Otro' },
];

function EncuestaSalida({ username }) {
  const clave = 'jb-motivo-salida:' + username;
  const [enviado, setEnviado] = useState(() => { try { return !!localStorage.getItem(clave); } catch { return false; } });
  const [otro, setOtro] = useState(false);
  const [detalle, setDetalle] = useState('');
  const [enviando, setEnviando] = useState(false);
  async function enviar(motivo, texto = '') {
    setEnviando(true);
    try { await supabase.rpc('registrar_motivo_salida', { p_motivo: motivo, p_detalle: texto }); } catch {}
    try { localStorage.setItem(clave, motivo); } catch {}
    setEnviando(false);
    setEnviado(true);
  }
  if (enviado) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
        <p className="jb-body text-sm text-zinc-300">🙌 ¡Gracias! Con tu respuesta mejoramos la app.</p>
      </div>
    );
  }
  return (
    <div className="bg-zinc-900 border border-orange-500/40 rounded-2xl p-4 mb-4">
      <p className="jb-display text-sm text-zinc-50">¿QUÉ TE FALTÓ PARA QUEDARTE?</p>
      <p className="jb-body text-xs text-zinc-400 mb-3">Un toque y nos ayudas a mejorar. Lo lee Jonah.</p>
      <div className="flex flex-wrap gap-2">
        {MOTIVOS_SALIDA.map(m => (
          <button key={m.key} type="button" disabled={enviando}
            onClick={() => (m.key === 'otro' ? setOtro(true) : enviar(m.key))}
            className={`jb-body text-xs px-3 py-1.5 rounded-full border transition-colors ${m.key === 'otro' && otro ? 'bg-orange-500 border-orange-500 text-zinc-950' : 'border-zinc-700 text-zinc-200 hover:border-orange-500'}`}>
            {m.label}
          </button>
        ))}
      </div>
      {otro && (
        <div className="mt-3 flex gap-2">
          <input value={detalle} onChange={e => setDetalle(e.target.value)} maxLength={300} autoFocus
            placeholder="Cuéntanos en pocas palabras" className={inputCls + ' flex-1 text-sm'} />
          <button type="button" disabled={enviando || !detalle.trim()} onClick={() => enviar('otro', detalle)}
            className={btnPrimary + ' px-4 text-sm'}>Enviar</button>
        </div>
      )}
    </div>
  );
}

function StudentAuth({ onBack, onLogin, busy, expiredInfo, onClearExpired, onMembresiaActiva, onSeguirGratis }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [modo, setModo] = useState('login');
  const [aviso, setAviso] = useState('');
  const [codigo, setCodigo] = useState('');
  const [passNueva, setPassNueva] = useState('');
  const [passNueva2, setPassNueva2] = useState('');
  const [busyCodigo, setBusyCodigo] = useState(false);

  function submit(e) {
    e.preventDefault();
    setErr('');
    if (onClearExpired) onClearExpired();
    if (!email || !password) return setErr('Completa correo y contraseña.');
    onLogin(email.trim().toLowerCase(), password, setErr);
  }

  async function recuperar(e) {
    e.preventDefault();
    setErr(''); setAviso('');
    if (!email.trim()) return setErr('Escribe tu correo para enviarte el código.');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    if (error) return setErr('No se pudo enviar el código. Intenta de nuevo en un momento.');
    setModo('codigo');
  }

  async function verificarCodigo(e) {
    e.preventDefault();
    setErr('');
    if (!codigo.trim()) return setErr('Escribe el código de verificación que te llegó por correo.');
    if (passNueva.length < 6) return setErr('La contraseña nueva debe tener al menos 6 caracteres.');
    if (passNueva !== passNueva2) return setErr('Las contraseñas no coinciden.');
    setBusyCodigo(true);
    const { error: errCodigo } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(), token: codigo.trim(), type: 'recovery',
    });
    if (errCodigo) {
      setBusyCodigo(false);
      return setErr('El código no es válido o ya venció. Pide uno nuevo.');
    }
    const { error: errPass } = await supabase.auth.updateUser({ password: passNueva });
    setBusyCodigo(false);
    if (errPass) return setErr(mensajeContrasenaRechazada(errPass) || 'No se pudo cambiar la contraseña: ' + (errPass.message || 'intenta de nuevo.'));
    onLogin(email.trim().toLowerCase(), passNueva, setErr);
  }

  // Mientras espera que le aprueben el pago, revisa cada 20s si ya se
  // activó — así no tiene que saber que debe cerrar sesión y volver a
  // entrar. En cuanto detecta que ya tiene acceso, entra directo.
  useEffect(() => {
    if (!expiredInfo?.username) return;
    const intervalo = setInterval(async () => {
      try {
        const { data } = await supabase.from('alumnos')
          .select('enabled, plan, fecha_vencimiento').eq('username', expiredInfo.username).maybeSingle();
        if (data && membershipActive({ enabled: data.enabled, plan: data.plan, fechaVencimiento: data.fecha_vencimiento })) {
          clearInterval(intervalo);
          if (onMembresiaActiva) onMembresiaActiva();
        }
      } catch (e) { console.error('Fallo en revisión periódica:', e); }
    }, 20000);
    return () => clearInterval(intervalo);
  }, [expiredInfo?.username]);

  if (expiredInfo) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6 py-10">
        <div className="max-w-md w-full">
          <div className="mb-6"><Logo size="lg" /></div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-4">
            <h2 className="jb-display text-xl text-zinc-50 mb-2">
              {expiredInfo.esPrueba === false ? 'TU PREMIUM VENCIÓ' : 'TU PRUEBA DE PREMIUM TERMINÓ'}
            </h2>
            <p className="jb-body text-sm text-zinc-400">
              {expiredInfo.esPrueba === false
                ? 'Renueva para seguir donde te quedaste. Nada de lo que hiciste se borró: tu historial completo te está esperando.'
                : 'Pero nada de lo que hiciste se borró. Tu historial completo te está esperando.'}
            </p>
            {expiredInfo.userRecord?.enabled && onSeguirGratis && (
              <>
                <p className="jb-body text-sm text-zinc-300 mt-3">
                  Puedes seguir usando la app <span className="text-orange-400 font-semibold">gratis</span>.
                </p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3">
                    <p className="jb-display text-xs text-zinc-300 mb-1.5">GRATIS</p>
                    <ul className="jb-body text-[11px] text-zinc-400 space-y-1 leading-snug">
                      <li>✓ Registrar tus comidas</li>
                      <li>✓ Tu meta de calorías</li>
                      <li>✓ Código de barras</li>
                      <li>✓ Tu peso y tu racha</li>
                      <li>✓ 3 fotos por semana</li>
                      <li>✓ Tendencias de 7 días</li>
                    </ul>
                  </div>
                  <div className="rounded-xl bg-zinc-950 border border-orange-500/50 p-3">
                    <p className="jb-display text-xs text-orange-400 mb-1.5">👑 PREMIUM</p>
                    <ul className="jb-body text-[11px] text-zinc-300 space-y-1 leading-snug">
                      <li>✓ Foto en todas tus comidas</li>
                      <li>✓ Registro por voz</li>
                      <li>✓ Menú de la semana y lista de compras</li>
                      <li>✓ Tu % de grasa y músculo</li>
                      <li>✓ Fotos de progreso y coach</li>
                      <li>✓ Jonah por WhatsApp</li>
                    </ul>
                  </div>
                </div>
                <div className="grid gap-2 mt-4">
                  <button onClick={() => document.getElementById('planes-para-continuar')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="jb-display w-full rounded-xl bg-orange-500 hover:bg-orange-400 text-zinc-950 py-3 text-base tracking-wide">
                    QUIERO PREMIUM
                  </button>
                  <button onClick={onSeguirGratis}
                    className="jb-body w-full rounded-xl border border-zinc-700 hover:border-zinc-500 text-zinc-200 py-3 text-sm font-semibold">
                    Seguir con la versión gratis
                  </button>
                </div>
              </>
            )}
          </div>
          {/* Bono de +7 días: en las 48 h después de vencer la prueba, arriba
              de todo (antes quedaba abajo y había que bajar para verlo). */}
          {ventanaBono(expiredInfo.userRecord) && (
            <div className="mb-5">
              <RelojBono user={expiredInfo.userRecord}
                onVerPlanes={() => document.getElementById('planes-para-continuar')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />
            </div>
          )}
          {expiredInfo.esPrueba !== false && <EncuestaSalida username={expiredInfo.username} />}
          <TrialSummary stats={expiredInfo.stats} nombre={expiredInfo.nombre} planPagado={expiredInfo.esPrueba === false}
            onVerPlanes={() => document.getElementById('planes-para-continuar')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />

          <div id="planes-para-continuar" className="mt-5 scroll-mt-4">
            <PlanesTab username={expiredInfo.username} nombre={expiredInfo.nombre} userRecord={expiredInfo.userRecord} ocultarEstado sinRelojBono />
          </div>

          <button onClick={onClearExpired} className="jb-body text-sm text-zinc-500 hover:text-zinc-300 mt-4 w-full text-center">
            ← Entrar con otra cuenta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6 py-16 relative overflow-hidden" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 50% 0%, rgba(249,115,22,0.12), transparent 60%)' }} />
      <BotonAtras onClick={onBack} className="absolute left-4 z-10" style={{ top: 'calc(env(safe-area-inset-top) + 1rem)' }} />
      <div className="max-w-sm w-full relative">
        <div className="mb-4"><Logo size="lg" /></div>
        {modo === 'login' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 mb-4 flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-gradient-to-br from-orange-500 to-violet-600 flex items-center justify-center">
              <img src="/jonah-avatar.png" alt="Jonah" className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; }} />
            </span>
            <p className="jb-body text-xs text-zinc-400">
              <span className="text-orange-500 font-semibold">Jonah:</span> ¡bienvenido de vuelta! Entra y sigamos con tu objetivo.
            </p>
          </div>
        )}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl shadow-black/40">
          <h2 className="jb-display text-xl text-zinc-50 mb-1">
            {modo === 'login' ? 'ENTRAR A MI CUENTA' : modo === 'codigo' ? 'REVISA TU CORREO' : 'RECUPERAR CONTRASEÑA'}
          </h2>
          <p className="jb-body text-sm text-zinc-500 mb-5">
            {modo === 'login' ? 'Ingresa con el correo que registraste.'
              : modo === 'codigo' ? `Te mandamos un código de verificación a ${email}. Escríbelo abajo junto a tu contraseña nueva.`
              : 'Te enviaremos un código a tu correo.'}
          </p>

          {modo === 'codigo' ? (
            <form onSubmit={verificarCodigo} className="flex flex-col gap-4">
              <Field label="Código de verificación">
                <input type="text" inputMode="numeric" value={codigo} onChange={e => setCodigo(e.target.value)}
                  className={inputCls} autoFocus placeholder="Código del correo" />
              </Field>
              <Field label="Contraseña nueva">
                <input type="password" value={passNueva} onChange={e => setPassNueva(e.target.value)} className={inputCls} placeholder="Mínimo 6 caracteres" />
              </Field>
              <Field label="Repite la contraseña">
                <input type="password" value={passNueva2} onChange={e => setPassNueva2(e.target.value)} className={inputCls} />
              </Field>
              {err && <p className="text-red-400 text-sm jb-body flex items-center gap-1.5"><AlertTriangle size={14} />{err}</p>}
              <button type="submit" disabled={busyCodigo} className={btnPrimary}>
                {busyCodigo ? <Loader2 className="animate-spin" size={18} /> : 'Cambiar contraseña y entrar'}
              </button>
              <button type="button" onClick={() => { setModo('recuperar'); setErr(''); }} className="jb-body text-xs text-orange-500 hover:text-orange-400">
                ¿No te llegó? Pedir otro código
              </button>
              <button type="button" onClick={onBack} className="jb-body text-sm text-zinc-500 hover:text-zinc-300">← Volver</button>
            </form>
          ) : (
            <form onSubmit={modo === 'login' ? submit : recuperar} className="flex flex-col gap-4">
              {modo === 'login' && (
                <>
                  <BotonGoogle onClick={() => entrarConGoogle(setErr)} texto="Entrar con Google" />
                  <SeparadorO />
                </>
              )}
              <Field label="Correo electrónico">
                <input type="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} placeholder="tucorreo@gmail.com" />
              </Field>
              {modo === 'login' && (
                <Field label="Contraseña">
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputCls} />
                </Field>
              )}
              {err && <p className="text-red-400 text-sm jb-body flex items-center gap-1.5"><AlertTriangle size={14} />{err}</p>}
              <button type="submit" disabled={busy} className={btnPrimary}>
                {busy ? <Loader2 className="animate-spin" size={18} /> : (modo === 'login' ? 'Entrar' : 'Enviar código')}
              </button>
              <button type="button" onClick={() => { setModo(modo === 'login' ? 'recuperar' : 'login'); setErr(''); }}
                className="jb-body text-xs text-orange-500 hover:text-orange-400">
                {modo === 'login' ? '¿Olvidaste tu contraseña?' : '← Volver a iniciar sesión'}
              </button>
              <button type="button" onClick={onBack} className="jb-body text-sm text-zinc-500 hover:text-zinc-300">← Volver</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ADMIN DASHBOARD                                                     */
/* ------------------------------------------------------------------ */

function todayISO() {
  return fechaLocalISO(new Date());
}

// Fecha YYYY-MM-DD en la hora del equipo (no en UTC).
function fechaLocalISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ */
/* GUARDADO DEL ALUMNO                                                 */
/* ------------------------------------------------------------------ */

// Cada cambio del alumno se copia primero en el celular y la copia se
// borra recién cuando la base confirma que lo recibió. Si no hay internet
// o la sesión venció, la copia queda ahí, se reintenta sola y se recupera
// al volver a abrir la app. Antes el error se ignoraba en silencio: el
// alumno veía su comida en pantalla, pero nunca llegaba a la base.
const clavePendiente = username => `jb-pendiente-${username}`;

function leerPendiente(username) {
  try {
    const t = localStorage.getItem(clavePendiente(username));
    const p = t ? JSON.parse(t) : null;
    return p && p.mealPlan && p.form && p.fecha ? p : null;
  } catch { return null; }
}

function escribirPendiente(username, p) {
  try { localStorage.setItem(clavePendiente(username), JSON.stringify(p)); } catch {}
}

// Solo borra la copia si nadie la reemplazó por una más nueva mientras se guardaba.
function borrarPendiente(username, ts) {
  try {
    const p = leerPendiente(username);
    if (!p || p.ts <= ts) localStorage.removeItem(clavePendiente(username));
  } catch {}
}

// Junta dos versiones del mismo día sin perder alimentos: se queda con la
// del servidor y le suma los alimentos que solo estaban en el celular.
function unirComidas(servidor, local) {
  const meals = { ...EMPTY_MEALS(), ...(servidor?.meals || {}) };
  Object.entries(local?.meals || {}).forEach(([comida, entradas]) => {
    const ids = new Set((meals[comida] || []).map(en => en.id));
    meals[comida] = [...(meals[comida] || []), ...(entradas || []).filter(en => en.foodKey && !ids.has(en.id))];
  });
  return { ...(servidor || local), meals };
}

function filaHistorial({ username, form, mealPlan, fecha }) {
  const r = calcAll({
    ...form,
    edad: Number(form.edad) || 0, estatura: Number(form.estatura) || 1, peso: Number(form.peso) || 0,
    cuello: Number(form.cuello) || 1, cintura: Number(form.cintura) || 1, cadera: Number(form.cadera) || 1,
  });
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  let comidas = 0, alimentos = 0;
  Object.values(mealPlan.meals || {}).forEach(entries => {
    const conAlimento = entries.filter(en => en.foodKey);
    if (conAlimento.length) comidas += 1;
    alimentos += conAlimento.length;
    entries.forEach(en => {
      const m = entryMacros(en);
      t.kcal += m.kcal; t.protein += m.protein; t.carbs += m.carbs; t.fat += m.fat;
    });
  });
  // Solo se guardan los datos que el alumno ingresó de verdad: sin
  // datos básicos no hay peso ni IMC, y sin medidas con cinta no hay
  // % de grasa (antes se guardaban valores de ejemplo como si fueran
  // reales y ensuciaban su progreso).
  return {
    username, fecha,
    peso: r.basicos ? (Number(form.peso) || null) : null,
    grasa_pct: r.cinta ? Number(r.bf.toFixed(1)) : null,
    masa_muscular: r.cinta ? Number(r.muscleKg.toFixed(1)) : null,
    masa_magra: r.cinta ? Number(r.leanKg.toFixed(1)) : null,
    imc: r.basicos ? Number(r.bmi.toFixed(1)) : null,
    kcal_consumidas: Math.round(t.kcal),
    proteina_g: Math.round(t.protein),
    carbos_g: Math.round(t.carbs),
    grasas_g: Math.round(t.fat),
    kcal_objetivo: Math.round(mealPlan.targetKcal) || null,
    comidas_count: comidas,
    alimentos_count: alimentos,
    meal_plan: mealPlan,
    updated_at: new Date().toISOString(),
  };
}

// Sube un cambio a la base. Devuelve 'ok', 'sesion' (hay que volver a
// entrar) o 'red' (sin internet u otro fallo: se reintenta más tarde).
async function subirDatosAlumno(p) {
  try {
    // Un cambio de un día anterior solo va al historial de ese día: el plan
    // abierto en la base ya es el de hoy.
    if (p.fecha === todayISO()) {
      const { error } = await supabase.from('datos_alumnos').upsert({
        username: p.username, form: p.form, meal_plan: p.mealPlan,
        meal_plan_fecha: p.fecha, updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    }
    const { error } = await supabase.from('historial').upsert(filaHistorial(p), { onConflict: 'username,fecha' });
    if (error) throw error;
    return 'ok';
  } catch (e) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'red';
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return 'sesion';
    } catch {}
    const msg = String(e?.message || '').toLowerCase();
    if (e?.status === 401 || e?.code === 'PGRST301' || e?.code === 'PGRST303' || msg.includes('jwt')) return 'sesion';
    return 'red';
  }
}

function addMonthsISO(iso, months) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  // Si el día no existe en el mes destino (ej. 31 de enero + 1 mes),
  // se ajusta al último día de ese mes en vez de saltar al siguiente.
  const anioDestino = y + Math.floor((m - 1 + months) / 12);
  const mesDestino = ((m - 1 + months) % 12 + 12) % 12;
  const ultimoDia = new Date(anioDestino, mesDestino + 1, 0).getDate();
  const dia = Math.min(d, ultimoDia);
  const dt = new Date(anioDestino, mesDestino, dia);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function daysLeft(vencimiento) {
  if (!vencimiento) return null;
  const [y, m, d] = vencimiento.split('-').map(Number);
  const fin = new Date(y, m - 1, d);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((fin - hoy) / (1000 * 60 * 60 * 24));
}

/* Un alumno puede entrar solo si el entrenador lo tiene habilitado
   Y su membresía no ha vencido. */
function membershipActive(u) {
  if (!u.enabled) return false;
  const dl = daysLeft(u.fechaVencimiento);
  if (dl === null) return true;
  return dl >= 0;
}

/* Versión gratis: la cuenta sigue habilitada pero su prueba o plan venció.
   Ya no se bloquea: puede seguir usando la app con las funciones gratis.
   La pantalla de "tu prueba terminó" se muestra una sola vez por cada
   vencimiento; después entra directo. */
function claveGratisVisto(username, fechaVencimiento) {
  return `jb-gratis-visto:${username}:${fechaVencimiento || ''}`;
}
function yaVioPantallaGratis(username, fechaVencimiento) {
  try { return localStorage.getItem(claveGratisVisto(username, fechaVencimiento)) === '1'; } catch { return false; }
}
function marcarPantallaGratisVista(username, fechaVencimiento) {
  try { localStorage.setItem(claveGratisVisto(username, fechaVencimiento), '1'); } catch {}
}



/* ------------------------------------------------------------------ */
/* SEGURIDAD DE CONTRASEÑAS (PBKDF2 con Web Crypto)                    */
/* ------------------------------------------------------------------ */

function bufToHex(buf) {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password, saltHex) {
  const salt = saltHex
    ? Uint8Array.from(saltHex.match(/.{2}/g).map(h => parseInt(h, 16)))
    : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' }, key, 256);
  return { hash: bufToHex(bits), salt: bufToHex(salt) };
}

async function verifyPassword(password, hashHex, saltHex) {
  if (!hashHex || !saltHex) return false;
  const { hash } = await hashPassword(password, saltHex);
  return hash === hashHex;
}

/* ------------------------------------------------------------------ */
/* PRUEBA DE PREMIUM DE 7 DÍAS (después, versión gratis)               */
/* ------------------------------------------------------------------ */

const TRIAL_DAYS = 7;
















 






























































async function fetchTrialStats(username) {
  try {
    const { data } = await supabase.from('historial').select('*')
      .eq('username', username).order('fecha', { ascending: true }).limit(60);
    if (!data || !data.length) return null;
    const conRegistro = data.filter(r => Number(r.alimentos_count) > 0 || Number(r.kcal_consumidas) > 0);
    const comidas = data.reduce((a, r) => a + (Number(r.comidas_count) || 0), 0);
    const alimentos = data.reduce((a, r) => a + (Number(r.alimentos_count) || 0), 0);
    const objetivos = conRegistro.filter(r => Number(r.kcal_objetivo) > 0);
    const enRango = objetivos.filter(r => {
      const ratio = Number(r.kcal_consumidas) / Number(r.kcal_objetivo);
      return ratio >= 0.85 && ratio <= 1.15;
    }).length;
    const adherencia = objetivos.length ? Math.round((enRango / objetivos.length) * 100) : null;
    const pesos = data.filter(r => r.peso).map(r => Number(r.peso));
    const grasas = data.filter(r => r.grasa_pct).map(r => Number(r.grasa_pct));
    return {
      dias: conRegistro.length,
      comidas, alimentos, adherencia, enRango, totalObjetivos: objetivos.length,
      deltaPeso: pesos.length >= 2 ? pesos[pesos.length - 1] - pesos[0] : null,
      deltaGrasa: grasas.length >= 2 ? grasas[grasas.length - 1] - grasas[0] : null,
    };
  } catch { return null; }
}

/* Bono por suscribirse a tiempo: el PRIMER plan pagado de alguien en
   prueba gratis, enviado antes de que termine su prueba o hasta 48 horas
   después, recibe 7 días extra (se suman solos al aprobarse el pago). La
   cuenta regresiva se muestra desde el día 13 de la prueba. Mismo criterio
   en webhook-mercadopago, api/_lib/google-play.js y la aprobación manual. */
const BONO_DIAS = 7;
const BONO_GRACIA_HORAS = 48;
function finPruebaMs(fechaVencimiento) {
  return new Date(`${fechaVencimiento}T23:59:59-05:00`).getTime();
}
function ganaBonoSuscripcion(u, primerPlan, enviadoEn) {
  if (!primerPlan || !u || !(u.plan === 'trial' || u.plan === 'prueba') || !u.fechaVencimiento) return false;
  const limite = finPruebaMs(u.fechaVencimiento) + BONO_GRACIA_HORAS * 3600000;
  const enviado = enviadoEn ? new Date(enviadoEn).getTime() : Date.now();
  return Number.isFinite(enviado) && enviado <= limite;
}
// null si no toca mostrar el reloj; si toca: fase 'prueba' (cuenta hasta
// que termina la prueba) o 'gracia' (las 48 h de después).
function ventanaBono(u, ahora = Date.now()) {
  if (!u || !(u.plan === 'trial' || u.plan === 'prueba') || !u.fechaVencimiento) return null;
  const fin = finPruebaMs(u.fechaVencimiento);
  const inicio = fin - 3 * 86400000 + 1000; // 00:00 del antepenúltimo día de la prueba
  const limite = fin + BONO_GRACIA_HORAS * 3600000;
  if (ahora < inicio || ahora > limite) return null;
  return ahora <= fin ? { fase: 'prueba', hasta: fin } : { fase: 'gracia', hasta: limite };
}

function RelojBono({ user, onVerPlanes }) {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    const iv = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);
  const v = ventanaBono(user, ahora);
  if (!v) return null;
  const resta = Math.max(0, Math.floor((v.hasta - ahora) / 1000));
  const d = Math.floor(resta / 86400), h = Math.floor((resta % 86400) / 3600), m = Math.floor((resta % 3600) / 60), s = resta % 60;
  const dos = n => String(n).padStart(2, '0');
  const gracia = v.fase === 'gracia';
  return (
    <div className="relative rounded-2xl border border-orange-500/60 bg-gradient-to-br from-orange-950/60 to-zinc-900 p-4 overflow-hidden"
      style={{ boxShadow: '0 0 34px -12px rgba(232,89,12,.6)' }}>
      <p className="jb-display text-base text-zinc-50 leading-tight">
        {gracia ? '⏳ ÚLTIMA OPORTUNIDAD: +7 DÍAS GRATIS' : '🎁 SUSCRÍBETE Y OBTÉN +7 DÍAS GRATIS'}
      </p>
      <p className="jb-body text-xs text-zinc-300 mt-1">
        {gracia
          ? 'Tu prueba terminó, pero si te suscribes ahora igual te regalamos 7 días extra en tu plan.'
          : 'Si te suscribes antes de que termine tu prueba, sumamos 7 días extra a tu plan. Tus días de prueba no se pierden.'}
      </p>
      <div className="flex items-end gap-1.5 mt-3" aria-label={`Quedan ${d} días, ${h} horas y ${m} minutos`}>
        {[[d, 'días'], [h, 'horas'], [m, 'min'], [s, 'seg']].map(([n, t], i) => (
          <div key={t} className="flex items-end gap-1.5">
            {i > 0 && <span className="jb-display text-2xl text-orange-500/70 leading-none pb-4">:</span>}
            <div className="flex flex-col items-center">
              <span className="jb-display text-3xl text-orange-400 tabular-nums leading-none bg-zinc-950/70 border border-orange-500/30 rounded-lg px-2 py-1.5 min-w-[3rem] text-center">{i === 0 ? n : dos(n)}</span>
              <span className="jb-body text-[10px] text-zinc-400 mt-1">{t}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="jb-body text-[11px] text-zinc-500 mt-2">Con Yape, Plin o transferencia cuenta desde que envías tu comprobante.</p>
      {onVerPlanes && (
        <button onClick={onVerPlanes} className={btnPrimary + ' w-full py-3 mt-3'}>
          Ver planes y suscribirme
        </button>
      )}
    </div>
  );
}

function TrialSummary({ stats, nombre, compacto, onVerPlanes, planPagado }) {
  if (!stats) return null;
  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hola, ${planPagado ? 'se venció mi plan' : 'terminé mi prueba'} en Jonah Beast. Registré ${stats.comidas} comidas${stats.adherencia !== null ? ` y cumplí mi objetivo el ${stats.adherencia}% de los días` : ''}. Quiero continuar, ¿cuáles son los planes?`)}`;

  return (
    <div className={`rounded-2xl border border-orange-500/50 bg-orange-950/30 ${compacto ? 'p-4' : 'p-6'}`}>
      <h3 className={`jb-display text-orange-400 mb-3 ${compacto ? 'text-sm' : 'text-lg'}`}>
        ESTO CONSTRUISTE{nombre ? `, ${nombre.split(' ')[0].toUpperCase()}` : ''}
      </h3>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-zinc-950/60 rounded-xl p-3 text-center">
          <div className="jb-display text-2xl text-orange-500">{stats.comidas}</div>
          <div className="jb-body text-[11px] text-zinc-400">comidas registradas</div>
        </div>
        <div className="bg-zinc-950/60 rounded-xl p-3 text-center">
          <div className="jb-display text-2xl text-orange-500">{stats.dias}</div>
          <div className="jb-body text-[11px] text-zinc-400">días de seguimiento</div>
        </div>
        <div className="bg-zinc-950/60 rounded-xl p-3 text-center">
          <div className="jb-display text-2xl text-orange-500">
            {stats.adherencia !== null ? stats.adherencia + '%' : '—'}
          </div>
          <div className="jb-body text-[11px] text-zinc-400">cumpliste tu objetivo</div>
        </div>
      </div>

      {(stats.deltaPeso !== null || stats.deltaGrasa !== null) && (
        <div className="flex gap-3 mb-4 flex-wrap">
          {stats.deltaPeso !== null && Math.abs(stats.deltaPeso) >= 0.1 && (
            <span className="jb-body text-xs text-zinc-300">
              Peso: <span className={stats.deltaPeso < 0 ? 'text-emerald-400' : 'text-amber-400'}>
                {stats.deltaPeso > 0 ? '+' : ''}{stats.deltaPeso.toFixed(1)} kg
              </span>
            </span>
          )}
          {stats.deltaGrasa !== null && Math.abs(stats.deltaGrasa) >= 0.1 && (
            <span className="jb-body text-xs text-zinc-300">
              Grasa corporal: <span className={stats.deltaGrasa < 0 ? 'text-emerald-400' : 'text-amber-400'}>
                {stats.deltaGrasa > 0 ? '+' : ''}{stats.deltaGrasa.toFixed(1)}%
              </span>
            </span>
          )}
        </div>
      )}

      <p className="jb-body text-sm text-zinc-300 mb-4">
        {stats.adherencia !== null && stats.adherencia >= 70
          ? `Cumpliste tu objetivo ${stats.enRango} de ${stats.totalObjetivos} días. Esa constancia es exactamente lo que cambia un cuerpo — y apenas empezaste.`
          : stats.dias >= 3
            ? `Ya conoces tus números y sabes qué comer. Lo difícil (empezar) ya lo hiciste.`
            : `Tienes tus números y tu plan listos. Ahora viene la parte donde se ven los resultados.`}
      </p>

      <p className="jb-body text-xs text-zinc-400 mb-4">
        Si continúas, conservas tu historial completo, tus gráficos de progreso y tus recomendaciones diarias. Si no, todo esto se queda aquí.
      </p>

      {onVerPlanes ? (
        <div className="flex flex-col gap-2">
          <button onClick={onVerPlanes} className={btnPrimary + ' w-full py-3'}>
            <CreditCard size={18} /> QUIERO CONTINUAR
          </button>
          <a href={waUrl} target="_blank" rel="noopener noreferrer" className={btnGhost + ' w-full py-2 text-sm'}>
            <MessageCircle size={14} /> Prefiero consultar por WhatsApp
          </a>
        </div>
      ) : (
        <a href={waUrl} target="_blank" rel="noopener noreferrer" className={btnPrimary + ' w-full py-3'}>
          <MessageCircle size={18} /> QUIERO CONTINUAR
        </a>
      )}
    </div>
  );
}





















const VAPID_PUBLIC = 'BOTMzeHDkdZj1YhaDaGBqp1Ytnld-NFAzYKdaiRtZTgdIvcydaxhFyrggYyyelk9lSoSrp7ZaE6P1tAxK1Kb08c';

function base64ToUint8(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(b64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}



































/* ------------------------------------------------------------------ */
/* FOTOS DE PROGRESO                                                   */
/* ------------------------------------------------------------------ */


/* Comprime la foto en el navegador antes de subirla:
   las fotos de celular pesan 3-8 MB y así bajan a ~200 KB */
function comprimirImagen(file, maxLado = 1200, calidad = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la foto'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagen no compatible'));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxLado) { height = height * (maxLado / width); width = maxLado; }
        else if (height > maxLado) { width = width * (maxLado / height); height = maxLado; }
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(width); canvas.height = Math.round(height);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('No se pudo procesar la foto')), 'image/jpeg', calidad);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ------------------------------------------------------------------ */
/* PLANES Y PAGOS                                                       */
/* ------------------------------------------------------------------ */

const PLANES = [
  { meses: 1, nombre: 'Mensual', configKey: 'precio_1', precioDefault: 24.90, badge: null },
  { meses: 3, nombre: 'Trimestral', configKey: 'precio_3', precioDefault: 64.90, badge: null },
  { meses: 6, nombre: 'Semestral', configKey: 'precio_6', precioDefault: 114.90, badge: 'MÁS ELEGIDO' },
  { meses: 12, nombre: 'Anual', configKey: 'precio_12', precioDefault: 209.90, badge: 'MEJOR PRECIO' },
];

function fmtS(n) {
  return 'S/' + Number(n).toFixed(2);
}

// Lo que suma Premium frente a la versión gratis (ver docs/manual-app.md 13.8).
const BENEFICIOS = [
  'Tu menú del día y de la semana, armado con lo que te gusta y justo para tu meta',
  'Tu lista de compras de la semana, lista para compartir',
  'Foto inteligente en todas tus comidas',
  'Registro por voz y lectura de etiquetas con foto',
  '"¿Qué puedo comer?" todos los días, con comida peruana',
  'Tu % de grasa y masa muscular, con historial',
  'Tendencias hasta 1 año, constancia y coach',
  'Fotos de progreso con comparación',
  'Jonah y su asistente por WhatsApp',
];



function PlanesTab({ username, nombre, userRecord, onPagoEnviado, ocultarEstado = false, sinRelojBono = false }) {
  const [precios, setPrecios] = useState({});
  const [dcto, setDcto] = useState(0);
  const [dctoSoloPrimerPlan, setDctoSoloPrimerPlan] = useState(false);
  const [refNombre, setRefNombre] = useState('');
  const [datosPago, setDatosPago] = useState({});
  const [seleccion, setSeleccion] = useState(null);
  const [metodo, setMetodo] = useState('Yape');
  const [operacion, setOperacion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fechaNac, setFechaNac] = useState(userRecord?.fecha_nacimiento || '');
  const [archivo, setArchivo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [err, setErr] = useState('');
  const [misPagos, setMisPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [correo, setCorreo] = useState(userRecord?.correo || '');
  const [creandoMP, setCreandoMP] = useState(false);
  const [mpTipo, setMpTipo] = useState('unico');
  // Google Play (solo en la app de Android con el cobro de Google activado)
  const [playSrv, setPlaySrv] = useState(null);
  const [playListo, setPlayListo] = useState(false);
  const [playDiag, setPlayDiag] = useState('');
  const [playBuscando, setPlayBuscando] = useState(() => esTWA());
  const [playPrecios, setPlayPrecios] = useState({});
  const [comprandoPlay, setComprandoPlay] = useState(null);
  const [playMsg, setPlayMsg] = useState('');

  useEffect(() => { cargar(); }, [username]);
  useEffect(() => { registrarPasoPago('vio_planes', username); }, [username]);

  useEffect(() => {
    if (!esTWA()) return;
    let vivo = true;
    (async () => {
      const r = await conectarGooglePlay(Object.values(PRODUCTOS_PLAY));
      if (!vivo) return;
      setPlayDiag(r.diag); setPlayBuscando(false);
      if (!r.listo) return;
      setPlayPrecios(r.precios); setPlaySrv(r.srv); setPlayListo(true);
      if (r.srv && await sincronizarComprasGoogle(r.srv)) window.location.reload();
    })();
    return () => { vivo = false; };
  }, [username]);

  async function comprarConGooglePlay(plan) {
    const sku = PRODUCTOS_PLAY[plan.meses];
    if (!playListo || !sku || comprandoPlay) return;
    setPlayMsg(''); setComprandoPlay(sku);
    registrarPasoPago('eligio_plan', username, plan.meses);
    registrarPasoPago('eligio_metodo', username, 'Google Play');
    try {
      const pedido = new PaymentRequest(
        [{ supportedMethods: PLAY_BILLING, data: { sku } }],
        { total: { label: 'Total', amount: { currency: 'PEN', value: '0' } } },
      );
      const respuesta = await pedido.show();
      const { purchaseToken } = respuesta.details;
      registrarPasoPago('pago_enviado', username, 'Google Play');
      // El cobro ya lo hizo Google: se cierra su ventana como exitosa y
      // luego el servidor activa el plan.
      try { await respuesta.complete('success'); } catch {}
      try {
        const r = await enviarCompraGoogle(purchaseToken);
        showToast(r.prueba ? 'Compra de prueba registrada (no suma tiempo al plan).' : r.bono ? '¡Listo! Tu plan ya está activo, con +7 días de regalo 🎁' : '¡Listo! Tu plan ya está activo 💪');
        setTimeout(() => window.location.reload(), 1200);
      } catch (e) {
        setPlayMsg('Tu pago quedó registrado en Google. Estamos activando tu plan: vuelve a abrir la app en unos minutos. Si no se activa, escríbenos por WhatsApp.');
      }
    } catch (e) {
      // El alumno cerró la ventana de pago: no es un error.
      if (e?.name !== 'AbortError') setPlayMsg('No se pudo abrir el pago de Google Play. Intenta de nuevo.');
    }
    setComprandoPlay(null);
  }

  async function cargar() {
    setLoading(true);
    try {
      const { data } = await supabase.from('config').select('key, value');
      const m = {};
      (data || []).forEach(c => { m[c.key] = c.value; });
      setPrecios(m); setDatosPago(m);
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
    let pagos = [];
    try {
      const { data } = await supabase.from('pagos').select('*')
        .eq('username', username).order('creado_en', { ascending: false }).limit(10);
      pagos = data || [];
      setMisPagos(pagos);
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
    // Descuento si entró con código de embajador, influencer o de un amigo.
    // El de un amigo ("Invita a un amigo", tipo alumno) es solo para su
    // primer plan: igual que en las funciones de pago.
    const yaPagoUnPlan = pagos.some(p => p.estado === 'aprobado' && !/add-on/i.test(p.metodo || ''));
    try {
      if (userRecord && userRecord.codigoReferido) {
        const { data } = await supabase.rpc('validar_codigo', { p_codigo: userRecord.codigoReferido });
        if (data && data.ok && Number(data.descuento_pct) > 0 && !(data.tipo === 'alumno' && yaPagoUnPlan)) {
          setDcto(Number(data.descuento_pct));
          setDctoSoloPrimerPlan(data.tipo === 'alumno');
          setRefNombre(data.nombre || '');
        }
      }
    } catch {}
    setLoading(false);
  }

  function precioBase(plan) {
    const v = Number(precios[plan.configKey]);
    return v > 0 ? v : plan.precioDefault;
  }
  function precioDe(plan) {
    return precioBase(plan) * (1 - dcto / 100);
  }

  async function enviarPago() {
    setErr('');
    if (!seleccion) return setErr('Elige un plan.');
    const tel = telefono.replace(/\D/g, '');
    if (!userRecord?.telefono && tel.length < 9) return setErr('Escribe tu celular de WhatsApp (9 dígitos).');
    if (!operacion.trim()) return setErr('Escribe el número de operación de tu pago.');
    if (!archivo) return setErr('Adjunta la captura de tu pago.');
    setEnviando(true);
    let ruta = null;
    try {
      const blob = archivo.type === 'application/pdf' ? archivo : await comprimirImagen(archivo, 1400, 0.8);
      const ext = archivo.type === 'application/pdf' ? 'pdf' : 'jpg';
      ruta = `${username}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('comprobantes')
        .upload(ruta, blob, { contentType: archivo.type === 'application/pdf' ? 'application/pdf' : 'image/jpeg' });
      if (upErr) throw new Error('Al subir el comprobante: ' + upErr.message);

      const { error: dbErr } = await supabase.from('pagos').insert({
        username, nombre: nombre || '', plan_meses: seleccion.meses,
        monto: precioDe(seleccion), metodo, operacion: operacion.trim(),
        comprobante_ruta: ruta, estado: 'pendiente',
      });
      if (dbErr) throw new Error('Al registrar el pago: ' + dbErr.message);
      registrarPasoPago('pago_enviado', username, metodo);

      if (!userRecord?.telefono && tel.length >= 9) {
        try { await supabase.from('alumnos').update({ telefono: tel }).eq('username', username); } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
      }
      if (!userRecord?.fecha_nacimiento && fechaNac) {
        try { await supabase.from('alumnos').update({ fecha_nacimiento: fechaNac }).eq('username', username); } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
      }

      setSeleccion(null); setOperacion(''); setArchivo(null); setTelefono('');
      await cargar();
      if (onPagoEnviado) onPagoEnviado();
      showToast('Pago enviado, lo revisamos en menos de 24h');
    } catch (e) {
      if (ruta) { try { await supabase.storage.from('comprobantes').remove([ruta]); } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); } }
      setErr(e.message || 'No se pudo enviar. Intenta de nuevo.');
      showToast('No se pudo enviar el pago', 'error');
    }
    setEnviando(false);
  }

  const pendiente = misPagos.find(p => p.estado === 'pendiente');
  const faltaTelefono = !userRecord?.telefono;

  async function pagarConMercadoPago() {
    setErr('');
    if (!seleccion) return setErr('Elige un plan.');
    if (!correo.trim() || !correo.includes('@')) return setErr('Escribe un correo válido.');
    setCreandoMP(true);
    try {
      if (correo.trim() !== userRecord?.correo) {
        try { await supabase.from('alumnos').update({ correo: correo.trim() }).eq('username', username); } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
      }
      if (!userRecord?.fecha_nacimiento && fechaNac) {
        try { await supabase.from('alumnos').update({ fecha_nacimiento: fechaNac }).eq('username', username); } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
      }
      const funcion = mpTipo === 'recurrente' ? 'crear-suscripcion' : 'crear-pago-unico';
      const { data, error } = await supabase.functions.invoke(funcion, {
        body: { username, meses: seleccion.meses, correo: correo.trim(), descuentoPct: dcto },
      });
      if (error || !data?.init_point) throw new Error(data?.error || 'No se pudo iniciar el pago.');
      // Se anota antes de salir a Mercado Pago (máximo 1.5 s de espera).
      await Promise.race([registrarPasoPago('pago_enviado', username, mpTipo === 'recurrente' ? 'Mercado Pago (suscripción)' : 'Mercado Pago'), new Promise(r => setTimeout(r, 1500))]);
      window.location.href = data.init_point;
    } catch (e) {
      setErr(e.message || 'No se pudo conectar con Mercado Pago.');
    }
    setCreandoMP(false);
  }
  const dl = userRecord ? daysLeft(userRecord.fechaVencimiento) : null;
  const esTrial = userRecord?.plan === 'trial';

  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hola, soy ${nombre || username} y tengo una consulta sobre los planes de Jonah Beast.`)}`;

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-orange-500" size={28} /></div>;

  // Versión para Play Store: solo precios como información, sin botón
  // de pago ni datos bancarios — así cumplimos la política de Google
  // sin dejar de ser transparentes con el precio real.
  // App de Android con el cobro de Google activado: se paga con Google
  // Play, con renovación automática. Los precios salen de Google.
  if (esTWA() && playBuscando) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <Loader2 className="animate-spin text-orange-500" size={28} />
        <p className="jb-body text-sm text-zinc-400">Conectando con Google Play…</p>
      </div>
    );
  }

  const relojBono = !sinRelojBono && ventanaBono(userRecord) ? <RelojBono user={userRecord} /> : null;

  if (esTWA() && playListo) {
    return (
      <div className="flex flex-col gap-5">
        {relojBono}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
          <p className="jb-display text-2xl text-zinc-50 mb-1">ELIGE TU PLAN</p>
          <p className="jb-body text-sm text-zinc-400">
            {esTrial ? (dl >= 0 ? `Te quedan ${dl} día(s) de Premium de prueba. ` : 'Tu prueba de Premium terminó. ') : ''}
            Paga seguro con tu cuenta de Google Play.
          </p>
        </div>

        <div className="grid gap-3">
          {PLANES.map(plan => {
            const sku = PRODUCTOS_PLAY[plan.meses];
            const precio = playPrecios[sku];
            const valor = precio ? Number(precio.value) : precioBase(plan);
            const cargando = comprandoPlay === sku;
            return (
              <div key={plan.meses} className={`bg-zinc-900 border rounded-2xl p-4 ${plan.badge ? 'border-orange-500/60' : 'border-zinc-800'}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="jb-display text-lg text-zinc-50">{plan.nombre.toUpperCase()}</p>
                    {plan.badge && <span className="jb-body text-[10px] font-semibold text-orange-400">{plan.badge}</span>}
                  </div>
                  <div className="text-right">
                    <p className="jb-display text-2xl text-orange-500">{fmtS(valor)}</p>
                    <p className="jb-body text-xs text-zinc-400">
                      {plan.meses > 1 ? `cada ${plan.meses} meses · ` : 'al mes · '}{fmtS(valor / (plan.meses * 30))} al día
                    </p>
                  </div>
                </div>
                <button onClick={() => comprarConGooglePlay(plan)} disabled={!!comprandoPlay}
                  className={btnPrimary + ' w-full justify-center py-3 disabled:opacity-60'}>
                  {cargando ? <Loader2 className="animate-spin" size={18} /> : <CreditCard size={18} />} Suscribirme
                </button>
              </div>
            );
          })}
        </div>

        {playMsg && <p className="jb-body text-sm text-amber-300 text-center">{playMsg}</p>}

        <div className="flex flex-col gap-1.5">
          {BENEFICIOS.map(b => (
            <p key={b} className="jb-body text-sm text-zinc-300">✅ {b}</p>
          ))}
        </div>

        <p className="jb-body text-xs text-zinc-500 text-center">
          La suscripción se renueva sola al terminar cada periodo. Puedes cancelarla cuando quieras desde Google Play y
          mantienes tu acceso hasta el final del periodo pagado.
        </p>
        <a href={URL_SUSCRIPCIONES_PLAY} target="_blank" rel="noopener noreferrer"
          className="jb-body text-xs text-orange-400 text-center underline">
          Administrar mi suscripción en Google Play
        </a>
      </div>
    );
  }

  if (esTWA()) {
    const waUrlPlan = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      `Hola, soy ${nombre || username} y quiero activar mi plan de Jonah Beast Fuel.`)}`;
    return (
      <div className="flex flex-col gap-5">
        {relojBono}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
          <div className="w-16 h-16 mx-auto mb-2 rounded-full overflow-hidden bg-gradient-to-br from-orange-500 to-violet-600 flex items-center justify-center">
            <img src="/jonah-avatar.png" alt="Jonah" className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
          <p className="jb-display text-base text-zinc-100 mb-1">
            {esTrial ? (dl >= 0 ? `${dl} día(s) restantes de tu Premium de prueba` : 'Tu prueba de Premium terminó') : 'Tu plan'}
          </p>
          <p className="jb-body text-sm text-zinc-400">Estos son nuestros planes disponibles:</p>
        </div>

        <div className="grid gap-2">
          {PLANES.map(plan => (
            <div key={plan.meses} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <p className="jb-body text-sm text-zinc-200">{plan.nombre}</p>
                {plan.badge && <span className="jb-body text-[10px] text-orange-500">{plan.badge}</span>}
              </div>
              <p className="jb-display text-lg text-orange-500">{fmtS(precioDe(plan))}</p>
            </div>
          ))}
        </div>

        {dcto > 0 && (
          <p className="jb-body text-xs text-emerald-400 text-center">
            🎉 Tienes {dcto}% de descuento{refNombre ? ` por ${refNombre}` : ''} — ya aplicado en los precios de arriba.
          </p>
        )}

        <a href={waUrlPlan} target="_blank" rel="noopener noreferrer" className={btnPrimary + ' justify-center py-3'}
          onClick={() => registrarPasoPago('eligio_metodo', username, 'WhatsApp')}>
          <MessageCircle size={18} /> Escribir por WhatsApp para activar
        </a>
        <p className="jb-body text-xs text-zinc-500 text-center">
          Te ayudamos a coordinar tu pago y activamos tu cuenta al toque.
          {playDiag && <span className="block mt-1 text-[10px] text-zinc-700">GP: {playDiag}</span>}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 min-w-0">
      {relojBono}
      {userRecord && dl !== null && !ocultarEstado && (
        <div className={`relative rounded-2xl p-4 pl-5 border overflow-hidden flex items-center gap-4 ${dl <= 3 ? 'bg-orange-950/40 border-orange-500/50' : 'bg-zinc-900 border-zinc-800'}`}>
          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${dl <= 3 ? 'bg-orange-500' : 'bg-emerald-500'}`} />
          <div className={`w-11 h-11 rounded-full flex items-center justify-center text-lg shrink-0 ${dl <= 3 ? 'bg-orange-500' : 'bg-emerald-500'}`}>
            {esTrial ? '🎁' : dl <= 3 ? '⏰' : '✅'}
          </div>
          <div>
            <p className="jb-display text-xs text-zinc-400 mb-0.5">{esTrial ? 'PREMIUM DE PRUEBA' : 'TU PLAN'}</p>
            <p className="jb-body text-sm text-zinc-200">
              {esTrial
                ? dl >= 0 ? `${dl} día(s) restantes` : 'Tu prueba de Premium terminó'
                : dl >= 0 ? `Activo · ${dl} día(s) restantes` : `Venció hace ${Math.abs(dl)} día(s)`}
            </p>
          </div>
        </div>
      )}

      {pendiente && (
        <div className="bg-amber-950/40 border border-amber-800/50 rounded-2xl p-4 flex gap-3">
          <Loader2 className="text-amber-500 shrink-0 animate-spin" size={20} />
          <div>
            <p className="jb-body text-sm text-amber-200 font-semibold">Tu pago está en revisión</p>
            <p className="jb-body text-xs text-amber-300/80 mt-0.5">
              Recibimos tu comprobante por {fmtS(pendiente.monto)} ({pendiente.plan_meses} mes(es)).
              Lo confirmamos en menos de 24 horas y tu acceso se activa solo.
            </p>
          </div>
        </div>
      )}

      {!seleccion ? (
        <>
          <div className="text-center">
            <h2 className="jb-display text-2xl text-zinc-50 mb-1">ELIGE TU PLAN</h2>
            <p className="jb-body text-sm text-zinc-400">Mientras más tiempo, mejor precio por mes.</p>
            <div className="flex items-center justify-center gap-1.5 flex-wrap mt-3">
              {[['🟣', 'Yape'], ['🔵', 'Plin'], ['💳', 'Tarjeta'], ['🏦', 'Transferencia']].map(([e, m]) => (
                <span key={m} className="jb-body text-[11px] text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-full px-2.5 py-1">{e} {m}</span>
              ))}
            </div>
            <div className="mt-3"><PruebaSocialMini size={22} /></div>
          </div>

          {dcto > 0 && (
            <div className="bg-emerald-950/30 border border-emerald-700/50 rounded-xl p-3 flex items-center gap-2">
              <span className="text-lg">🎁</span>
              <p className="jb-body text-sm text-emerald-300">
                Tienes <span className="font-semibold">{dcto}% de descuento</span> {dctoSoloPrimerPlan ? 'en tu primer plan' : 'en todos los planes'}
                {refNombre ? ` por venir de ${refNombre}` : ''}. Ya está aplicado en los precios.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PLANES.map(plan => {
              const precio = precioDe(plan);
              const porMes = precio / plan.meses;
              const ahorro = plan.meses > 1
                ? Math.round((1 - porMes / precioDe(PLANES[0])) * 100) : 0;
              return (
                <div key={plan.meses}
                  className={`relative rounded-2xl border p-5 flex flex-col ${plan.badge === 'MÁS ELEGIDO'
                    ? 'bg-zinc-900 border-orange-500 shadow-lg shadow-orange-500/10'
                    : 'bg-zinc-900 border-zinc-800'}`}>
                  {plan.badge && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-orange-500 text-zinc-950 jb-display text-[10px] px-3 py-0.5 rounded-full whitespace-nowrap">
                      {plan.badge}
                    </span>
                  )}
                  <div className="jb-display text-sm text-zinc-400 mb-1">{plan.nombre.toUpperCase()}</div>
                  {dcto > 0 && (
                    <div className="jb-body text-xs text-zinc-600 line-through">{fmtS(precioBase(plan))}</div>
                  )}
                  <div className="jb-display text-3xl text-orange-500 mb-0.5">{fmtS(precio)}</div>
                  <div className="jb-body text-xs text-zinc-500 mb-1">
                    {plan.meses === 1 ? 'por mes' : `${fmtS(porMes)} por mes`}
                    <span className="text-zinc-300"> · {fmtS(precio / (plan.meses * 30))} al día</span>
                  </div>
                  {ahorro > 0 && (
                    <div className="jb-body text-xs text-emerald-400 mb-3">Ahorras {ahorro}%</div>
                  )}
                  {ahorro === 0 && <div className="mb-3" />}
                  <button onClick={() => { setSeleccion(plan); registrarPasoPago('eligio_plan', username, plan.meses); }}
                    className={(plan.badge === 'MÁS ELEGIDO' ? btnPrimary : btnGhost) + ' w-full mt-auto py-2.5'}>
                    Elegir
                  </button>
                </div>
              );
            })}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <h3 className="jb-display text-sm text-zinc-300 mb-3">👑 PREMIUM INCLUYE</h3>
            <div className="grid sm:grid-cols-2 gap-y-1.5">
              {BENEFICIOS.map(b => (
                <div key={b} className="flex items-start gap-2 jb-body text-sm text-zinc-400">
                  <span className="text-emerald-400 shrink-0">✓</span> {b}
                </div>
              ))}
            </div>
          </div>

          <a href={waUrl} target="_blank" rel="noopener noreferrer" className={btnGhost + ' w-full py-3'}>
            <MessageCircle size={16} /> Tengo una consulta antes de pagar
          </a>
        </>
      ) : (
        <div className="bg-zinc-900 border border-orange-500/40 rounded-2xl p-5">
          <button onClick={() => { setSeleccion(null); setErr(''); }}
            className="jb-body text-sm text-zinc-500 hover:text-zinc-300 mb-4">← Cambiar de plan</button>

          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 mb-5 text-center">
            <div className="jb-body text-xs text-zinc-500">Plan {seleccion.nombre}</div>
            <div className="jb-display text-3xl text-orange-500 my-1">{fmtS(precioDe(seleccion))}</div>
            <div className="jb-body text-xs text-zinc-500">{seleccion.meses} mes(es) de acceso</div>
          </div>

          <h3 className="jb-display text-sm text-zinc-300 mb-3">1 · REALIZA TU PAGO</h3>
          <div className="flex gap-2 mb-3">
            {[
              ['Yape', '🟣', 'bg-[#7c2ae8]'],
              ['Plin', '🔵', 'bg-[#00c2d1]'],
              ['Transferencia', '🏦', 'bg-zinc-600'],
              ['Mercado Pago', '💳', 'bg-sky-500'],
            ].map(([m, emoji, dot]) => (
              <button key={m} onClick={() => { setMetodo(m); registrarPasoPago('eligio_metodo', username, m); }}
                className={`jb-body text-xs px-3 py-2 rounded-lg flex-1 flex items-center justify-center gap-1.5 transition-colors ${metodo === m
                  ? 'bg-orange-500 text-zinc-950 font-semibold' : 'bg-zinc-950 text-zinc-400 border border-zinc-800'}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${metodo === m ? 'bg-zinc-950/20' : dot}`}>
                  {emoji}
                </span>
                {m}
              </button>
            ))}
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 mb-5">
            {metodo === 'Mercado Pago' ? (
              <div className="text-center">
                <div className="w-9 h-9 rounded-full mx-auto mb-2 flex items-center justify-center text-sm bg-sky-500">💳</div>
                <p className="jb-body text-sm text-zinc-300">Paga con tarjeta o tu saldo de Mercado Pago.</p>
                <p className="jb-body text-xs text-zinc-500 mt-1">Tu plan se activa automáticamente en cuanto se confirme el pago.</p>
              </div>
            ) : metodo === 'Transferencia' ? (
              datosPago.banco_cuenta ? (
                <div className="jb-body text-sm text-zinc-300 flex flex-col gap-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs">🏦</span>
                    <span className="text-zinc-200 font-medium">{datosPago.banco_nombre}</span>
                  </div>
                  <div><span className="text-zinc-500">Cuenta:</span> {datosPago.banco_cuenta}</div>
                  {datosPago.banco_cci && <div><span className="text-zinc-500">CCI:</span> {datosPago.banco_cci}</div>}
                  <div><span className="text-zinc-500">Titular:</span> {datosPago.banco_titular || datosPago.yape_titular}</div>
                </div>
              ) : (
                <p className="jb-body text-sm text-zinc-500">Escríbenos por WhatsApp para darte los datos bancarios.</p>
              )
            ) : (
              <div className="text-center">
                <div className={`w-9 h-9 rounded-full mx-auto mb-2 flex items-center justify-center text-sm ${metodo === 'Plin' ? 'bg-[#00c2d1]' : 'bg-[#7c2ae8]'}`}>
                  {metodo === 'Plin' ? '🔵' : '🟣'}
                </div>
                <div className="jb-body text-xs text-zinc-500 mb-1">Número de {metodo}</div>
                <div className="jb-display text-2xl text-zinc-50 tracking-wider">
                  {metodo === 'Plin' ? datosPago.plin_numero : datosPago.yape_numero}
                </div>
                <div className="jb-body text-xs text-zinc-400 mt-1">
                  {metodo === 'Plin' ? datosPago.plin_titular : datosPago.yape_titular}
                </div>
              </div>
            )}
            <p className="jb-body text-xs text-zinc-600 mt-3 text-center">
              Monto exacto: <span className="text-orange-500 font-semibold">{fmtS(precioDe(seleccion))}</span>
            </p>
          </div>

          {metodo === 'Mercado Pago' ? (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <button onClick={() => setMpTipo('unico')}
                  className={`jb-body text-xs px-3 py-2 rounded-lg flex-1 transition-colors ${mpTipo === 'unico'
                    ? 'bg-orange-500 text-zinc-950 font-semibold' : 'bg-zinc-950 text-zinc-400 border border-zinc-800'}`}>
                  Pago único
                </button>
                <button onClick={() => setMpTipo('recurrente')}
                  className={`jb-body text-xs px-3 py-2 rounded-lg flex-1 transition-colors ${mpTipo === 'recurrente'
                    ? 'bg-orange-500 text-zinc-950 font-semibold' : 'bg-zinc-950 text-zinc-400 border border-zinc-800'}`}>
                  Suscripción automática
                </button>
              </div>
              <p className="jb-body text-[11px] text-zinc-500 text-center -mt-1">
                {mpTipo === 'unico'
                  ? 'Pagas una sola vez. Cuando se acerque el vencimiento, vuelves a elegir tu plan y pagar.'
                  : `Se te cobrará automáticamente cada ${seleccion.meses === 1 ? 'mes' : `${seleccion.meses} meses`} hasta que canceles la suscripción desde tu cuenta de Mercado Pago.`}
              </p>
              <Field label="Tu correo electrónico">
                <input type="email" value={correo} onChange={e => setCorreo(e.target.value)}
                  className={inputCls} placeholder="tucorreo@ejemplo.com" />
              </Field>
              {!userRecord?.fecha_nacimiento && (
                <Field label="Tu fecha de nacimiento (para tu sorpresa de cumpleaños 🎂)">
                  <input type="date" value={fechaNac} onChange={e => setFechaNac(e.target.value)}
                    className={inputCls} />
                </Field>
              )}
              {err && <p className="text-red-400 text-sm jb-body flex items-center gap-1.5"><AlertTriangle size={14} />{err}</p>}
              <button onClick={pagarConMercadoPago} disabled={creandoMP} className={btnPrimary + ' py-3 text-base'}>
                {creandoMP ? <Loader2 className="animate-spin" size={18} /> : 'PAGAR CON MERCADO PAGO'}
              </button>
              <p className="jb-body text-[11px] text-zinc-600 text-center">
                Te llevamos a la página segura de Mercado Pago para completar el pago.
              </p>
            </div>
          ) : (
          <>
          <h3 className="jb-display text-sm text-zinc-300 mb-3">2 · CONFIRMA TU PAGO</h3>
          <div className="flex flex-col gap-3">
            {faltaTelefono && (
              <Field label="Tu celular (WhatsApp)">
                <input type="tel" inputMode="tel" value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                  className={inputCls} placeholder="999 888 777" />
              </Field>
            )}
            {!userRecord?.fecha_nacimiento && (
              <Field label="Tu fecha de nacimiento (para tu sorpresa de cumpleaños 🎂)">
                <input type="date" value={fechaNac} onChange={e => setFechaNac(e.target.value)}
                  className={inputCls} />
              </Field>
            )}
            <Field label="Número de operación">
              <input value={operacion} onChange={e => setOperacion(e.target.value)}
                className={inputCls} placeholder="Ej. 00123456" inputMode="numeric" />
            </Field>

            <label className="cursor-pointer">
              <span className="text-xs uppercase tracking-wider text-zinc-400 jb-body block mb-1.5">Captura del pago</span>
              <input type="file" accept="image/*,application/pdf" className="hidden"
                onChange={e => setArchivo(e.target.files[0] || null)} />
              <div className={`rounded-lg border-2 border-dashed p-4 text-center transition-colors ${archivo
                ? 'border-emerald-600/50 bg-emerald-950/20' : 'border-zinc-700 hover:border-orange-500 bg-zinc-950'}`}>
                <p className="jb-body text-sm text-zinc-300">
                  {archivo ? `✓ ${archivo.name}` : 'Toca para adjuntar tu captura'}
                </p>
              </div>
            </label>

            {err && <p className="text-red-400 text-sm jb-body flex items-center gap-1.5"><AlertTriangle size={14} />{err}</p>}

            <button onClick={enviarPago} disabled={enviando} className={btnPrimary + ' py-3 text-base'}>
              {enviando ? <Loader2 className="animate-spin" size={18} /> : 'ENVIAR MI PAGO'}
            </button>
            <p className="jb-body text-[11px] text-zinc-600 text-center">
              Revisamos tu pago en menos de 24 horas. Te avisamos con una notificación en tu celular apenas se active.
            </p>
          </div>
          </>
          )}
        </div>
      )}

      {misPagos.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="jb-display text-sm text-zinc-300 mb-3">MIS PAGOS</h3>
          <div className="flex flex-col gap-2">
            {misPagos.map(p => {
              const color = p.estado === 'aprobado' ? 'emerald' : p.estado === 'rechazado' ? 'red' : 'amber';
              return (
                <div key={p.id} className={`relative bg-zinc-950 border rounded-lg p-3 pl-4 overflow-hidden flex items-center justify-between gap-2 flex-wrap ${color === 'emerald' ? 'border-emerald-800/50' : color === 'red' ? 'border-red-800/50' : 'border-amber-700/50'}`}>
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${color === 'emerald' ? 'bg-emerald-500' : color === 'red' ? 'bg-red-500' : 'bg-amber-500'}`} />
                  <div>
                    <div className="jb-body text-sm text-zinc-200">{fmtS(p.monto)} · {p.plan_meses} mes(es)</div>
                    <div className="jb-body text-xs text-zinc-500">
                      {p.metodo} · {new Date(p.creado_en).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                    </div>
                  </div>
                  <span className={`jb-body text-xs px-2.5 py-1 rounded-full ${p.estado === 'aprobado'
                    ? 'bg-emerald-950/60 text-emerald-400' : p.estado === 'rechazado'
                      ? 'bg-red-950/60 text-red-400' : 'bg-amber-950/60 text-amber-400'}`}>
                    {p.estado === 'aprobado' ? 'Aprobado' : p.estado === 'rechazado' ? 'Rechazado' : 'En revisión'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}



































































function textoPorcion({ unit, qty }) {
  if (unit === 'gramos') return `${Math.round(qty)} g`;
  if (qty === 1 || /[\s/]/.test(unit)) return `${qty} ${unit}`;
  const plural = unit === 'porción' ? 'porciones' : /[aeiou]$/.test(unit) ? unit + 's' : unit + 'es';
  return `${qty} ${plural}`;
}





const ESTILOS_ESCANER = `
@keyframes jb-scan-sweep { 0% { top: -15%; } 50% { top: 100%; } 100% { top: -15%; } }
@keyframes jbe-esquina { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }
@keyframes jbe-entrar { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes jbe-punto { 0%, 100% { opacity: .15; } 50% { opacity: .6; } }
.jbe-esquina { animation: jbe-esquina 1.2s ease-in-out infinite; }
.jbe-entrar { animation: jbe-entrar .45s cubic-bezier(.2,.8,.3,1) both; }
.jbe-rejilla { background-image: radial-gradient(rgba(255,112,32,.55) 1px, transparent 1.2px); background-size: 14px 14px; animation: jbe-punto 2.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .jbe-esquina, .jbe-entrar, .jbe-rejilla { animation: none !important; } }
`;





















// Cuánto sube o baja cada toque de − / + según la medida.
function pasoDeUnidad(unit) {
  if (unit === 'gramos') return 10;
  if (UNIDADES_DISCRETAS.includes(unit)) return 1;
  return 0.5;
}

function cambiarCantidad(qty, unit, direccion) {
  const paso = pasoDeUnidad(unit);
  const base = Math.round((Number(qty) || 0) / paso) * paso;
  const nueva = base + direccion * paso;
  return Math.max(paso, Math.round(nueva * 100) / 100);
}























const CATEGORIAS_TIENDA = [
  { id: 'hombre', label: 'Hombre' },
  { id: 'mujer', label: 'Mujer' },
  { id: 'accesorios', label: 'Accesorios' },
  { id: 'suplementos', label: 'Suplementos' },
];











// Se piden apenas carga la página, en paralelo con la sesión.
cargarAlimentosExtra();

/* TikTok: si la visita viene de un anuncio, la dirección trae ?ttclid=…
   Se guarda 7 días para mandarlo con el registro (Events API), así TikTok
   sabe qué anuncio trajo a esa persona aunque el píxel del navegador falle. */
try {
  const ttclid = new URLSearchParams(window.location.search).get('ttclid');
  if (ttclid) localStorage.setItem('jb-ttclid', JSON.stringify({ v: ttclid.slice(0, 300), ts: Date.now() }));
} catch {}

/* Registro completado: el píxel del navegador y, además, el servidor
   (api/tiktok-registro, Events API) con el mismo event_id para que TikTok
   no lo cuente dos veces. Nunca bloquea ni falla hacia el alumno. */
function avisarRegistroTikTok(userId) {
  const eventId = userId ? `reg_${userId}` : undefined;
  try { if (window.ttq) window.ttq.track('CompleteRegistration', {}, eventId ? { event_id: eventId } : undefined); } catch (e) {}
  if (!userId) return;
  try {
    let ttclid = null;
    try {
      const c = JSON.parse(localStorage.getItem('jb-ttclid') || 'null');
      if (c && Date.now() - c.ts < 7 * 864e5) ttclid = c.v;
    } catch {}
    const ttp = (document.cookie.match(/(?:^|;\s*)_ttp=([^;]+)/) || [])[1] || null;
    fetch('/api/tiktok-registro', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ user_id: userId, ttclid, ttp, url: window.location.href, referrer: document.referrer || null }),
    }).catch(() => {});
  } catch {}
}

export default function App() {
  const [view, setView] = useState(() => {
    try {
      if (window.location.pathname.startsWith('/tienda')) return 'tienda';
      if (window.location.pathname.startsWith('/reto')) return 'reto';
      if (esLinkCalculadora()) {
        if (!new URLSearchParams(window.location.search).get('fuente') && !new URLSearchParams(window.location.search).get('utm_source')) {
          try { sessionStorage.setItem('jb-fuente', 'quiero'); } catch {}
        }
        return 'free';
      }
      return new URLSearchParams(window.location.search).get('ref') ? 'trial' : 'landing';
    } catch { return 'landing'; }
  });
  const [linkCalculadora] = useState(esLinkCalculadora);
  // Pantallas antes de entrar: se abren con irA (quedan en el historial del
  // navegador) para que el botón "atrás" del celular regrese a la anterior
  // en vez de cerrar la app; "← Atrás" hace lo mismo (volver).
  function irA(v) {
    try { window.history.pushState({ jb: v }, ''); } catch {}
    setView(v);
  }
  function volver() {
    if (VISTAS_CON_ATRAS.includes(window.history.state?.jb)) window.history.back();
    else setView('landing');
  }
  useEffect(() => {
    const onPop = e => {
      const destino = VISTAS_CON_ATRAS.includes(e.state?.jb) ? e.state.jb : 'landing';
      setView(v => (VISTAS_CON_ATRAS.includes(v) || v === 'landing' ? destino : v));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const [loading, setLoading] = useState(true);
  // La landing recién se muestra cuando ya se sabe si hay una sesión
  // guardada: así un alumno que abre la app no la ve un instante (ni
  // cuenta como visita del embudo) antes de entrar a su panel.
  const [sesionRevisada, setSesionRevisada] = useState(false);
  const [busy, setBusy] = useState(false);
  const [users, setUsers] = useState([]);
  const [adminPass, setAdminPass] = useState('');
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [viewingStudent, setViewingStudent] = useState(null);
  const [expiredInfo, setExpiredInfo] = useState(null);
  // App instalada (Play Store o pantalla de inicio): bienvenida con animación en vez de la portada web.
  const [instalada] = useState(() => appInstalada());
  const [viewingStudentData, setViewingStudentData] = useState(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [mealPlan, setMealPlan] = useState(EMPTY_MEALPLAN());
  // 'ok' | 'guardando' | 'pendiente' (sin internet: se reintenta solo) | 'sesion' (hay que volver a entrar)
  const [estadoGuardado, setEstadoGuardado] = useState('ok');
  const saveTimer = useRef(null);
  const skipNextSave = useRef(true);

  const [tokenRef, setTokenRef] = useState(null);

  useEffect(() => {
    // Enlace del referidor: jonahbeast.com/r/su-token
    const m = window.location.pathname.match(/^\/r\/([A-Za-z0-9._-]+)/);
    if (m) { setTokenRef(m[1]); return; }

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setView('resetPassword');
    });
    const hash = window.location.hash || '';
    if (hash.includes('type=recovery')) setView('resetPassword');
    // Google devolvió un error (la persona canceló o algo falló): se anota
    // en el embudo y se limpia la dirección.
    try {
      const q = new URLSearchParams(window.location.search);
      const h = new URLSearchParams(hash.replace(/^#/, ''));
      const errorOAuth = q.get('error_description') || h.get('error_description') || q.get('error') || h.get('error');
      if (errorOAuth && sessionStorage.getItem('jb-google-inicio')) {
        sessionStorage.removeItem('jb-google-inicio');
        registrarEventoEmbudo('error_registro', { detalle: 'google: ' + errorOAuth.slice(0, 80) });
        window.history.replaceState(null, '', window.location.pathname);
      }
    } catch {}
    // La lista de alumnos solo sirve con una sesión abierta (admin o
    // alumno), y sin sesión la base la devuelve vacía. Antes la landing
    // esperaba esas consultas antes de mostrarse; ahora un visitante nuevo
    // ve la página apenas se sabe que no tiene sesión.
    if (!hash.includes('type=recovery')) restoreSession();
    else { setSesionRevisada(true); setLoading(false); }
    return () => { if (sub && sub.subscription) sub.subscription.unsubscribe(); };
  }, []);

  // Mientras el alumno escribe su correo (o se registra), ya se va
  // descargando su parte de la app, para que al entrar no tenga que esperar.
  useEffect(() => {
    if (view === 'studentAuth' || view === 'trial' || view === 'recorrido') import('./alumno.jsx').catch(() => {});
  }, [view]);

  /* Vuelta de "Continuar con Google": si la cuenta se acaba de crear, se
     cuenta como 'registro' en el embudo y se avisa a TikTok y Meta, igual
     que el registro con correo. Solo si salió del botón en esta pestaña. */
  function volvioDeGoogle(user, perfil) {
    let inicio = null;
    try { inicio = sessionStorage.getItem('jb-google-inicio'); sessionStorage.removeItem('jb-google-inicio'); } catch {}
    if (!inicio) return;
    const nueva = user?.created_at && Date.now() - new Date(user.created_at).getTime() < 15 * 60 * 1000;
    if (nueva && perfil.role !== 'admin') {
      // Antes de marcarlo como conocido: si no, el embudo ya no lo cuenta.
      registrarEventoEmbudo('registro', { username: perfil.username, detalle: 'google' });
      avisarRegistroTikTok(user?.id);
      try { if (window.fbq) window.fbq('track', 'CompleteRegistration'); } catch (e) {}
    }
    try { localStorage.setItem('jb-conocido', '1'); } catch {}
  }

  async function restoreSession() {
    try {
      // En la página del reto no se entra a la cuenta: se muestra la página
      // aunque haya una sesión abierta (al tocar "Ir a la app" recarga en /).
      if (window.location.pathname.startsWith('/reto')) return;
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const { data: p } = await supabase.from('profiles').select('username, nombre, role').eq('id', data.session.user.id).maybeSingle();
      if (!p) return;
      volvioDeGoogle(data.session.user, p);
      import(p.role === 'admin' ? './admin.jsx' : './alumno.jsx').catch(() => {});
      if (p.role === 'admin') {
        setAdminAuthed(true);
        marcarNoContarEmbudo();
        await init();
        if (!window.location.pathname.startsWith('/tienda')) setView('admin');
        return;
      }
      const { data: a } = await supabase.from('alumnos').select('*').eq('username', p.username).maybeSingle();
      if (a) {
        const u = { username: a.username, enabled: a.enabled, plan: a.plan || 'pago',
          fechaInicio: a.fecha_inicio, fechaVencimiento: a.fecha_vencimiento };
        if (!u.enabled) return;
        // Prueba o plan vencido: en vez de mostrarle la landing de gente
        // nueva, va directo a su resumen y a los planes para pagar.
        if (!membershipActive(u) && !yaVioPantallaGratis(u.username, u.fechaVencimiento)) { await mostrarVencido(a, p.nombre); return; }
      }
      await loadStudentSession(p.username);
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
    finally { setSesionRevisada(true); setLoading(false); }
  }

  async function init() {
    let usersList = [];
    try {
      const { data, error } = await supabase.from('alumnos').select('*').order('created_at');
      if (error) throw error;
      usersList = (data || []).map(u => ({
        username: u.username, password: u.password, enabled: u.enabled, createdAt: u.created_at, lastActivity: null,
        nombre: u.nombre || '', telefono: u.telefono || '', plan: u.plan || 'pago',
        passHash: u.pass_hash || null, passSalt: u.pass_salt || null,
        fechaInicio: u.fecha_inicio || null, fechaVencimiento: u.fecha_vencimiento || null,
        fechaNacimiento: u.fecha_nacimiento || null,
        codigoReferido: u.codigo_referido || null, comisionPagada: !!u.comision_pagada,
        comisionMonto: u.comision_monto === null || u.comision_monto === undefined ? null : Number(u.comision_monto),
        planMesesReferido: u.plan_meses_referido || null,
        reconocimientoFotoDesde: u.reconocimiento_foto_desde || null,
        reconocimientoFotoHasta: u.reconocimiento_foto_hasta || null,
        estadoAvisos: u.estado_avisos || null,
      }));
    } catch { usersList = []; }
    try {
      const { data: activityData } = await supabase.from('datos_alumnos').select('username, updated_at');
      const activityMap = {};
      (activityData || []).forEach(a => { activityMap[a.username] = a.updated_at; });
      usersList = usersList.map(u => ({ ...u, lastActivity: activityMap[u.username] || null }));
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
    setUsers(usersList);
    setLoading(false);
  }

  async function handleAdminSetup(pass) {
    setBusy(true);
    try { await supabase.from('config').upsert({ key: 'admin_password', value: pass }); } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
    setAdminPass(pass);
    setBusy(false);
    setAdminAuthed(true);
    setView('admin');
  }

  async function handleAdminLogin(email, pass, setErr) {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error || !data?.user) {
        setErr('Correo o contraseña incorrectos.');
        setBusy(false);
        return;
      }
      const { data: perfil } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
      if (perfil?.role !== 'admin') {
        setErr('Esta cuenta no tiene permisos de administrador.');
        await supabase.auth.signOut();
        setBusy(false);
        return;
      }
      setAdminAuthed(true);
      try { localStorage.setItem('jb-conocido', '1'); } catch {}
      marcarNoContarEmbudo();
      await init();
      setView('admin');
    } catch {
      setErr('No se pudo iniciar sesión, intenta de nuevo.');
    }
    setBusy(false);
  }

  // Pantalla de "tu prueba terminó" / "tu plan venció": su resumen y los
  // planes para pagar. Al pagar, StudentAuth detecta que ya tiene acceso
  // y entra solo a la app.
  async function mostrarVencido(cuenta, nombrePerfil) {
    const esPrueba = cuenta.plan === 'trial' || cuenta.plan === 'prueba';
    const userRecord = {
      username: cuenta.username, enabled: cuenta.enabled, plan: cuenta.plan || 'pago',
      nombre: cuenta.nombre || nombrePerfil, fechaInicio: cuenta.fecha_inicio,
      fechaVencimiento: cuenta.fecha_vencimiento, telefono: cuenta.telefono,
      codigoReferido: cuenta.codigo_referido, correo: cuenta.correo,
      fecha_nacimiento: cuenta.fecha_nacimiento,
    };
    const stats = await fetchTrialStats(cuenta.username);
    setExpiredInfo({ stats, nombre: userRecord.nombre, username: cuenta.username, userRecord, esPrueba });
    setView('studentAuth');
  }

  async function loadStudentSession(username) {
    // La ficha del alumno (nombre, plan, fechas...) se vuelve a cargar al
    // entrar: si inició sesión recién, la lista cargada al abrir la página
    // todavía no la tenía (sin sesión no se puede leer) y la app no sabía
    // ni su nombre hasta recargar.
    const diasLive = await canjearCodigoLive();
    await init();
    let data = null;
    try {
      const { data: row } = await supabase.from('datos_alumnos')
        .select('form, meal_plan, meal_plan_fecha, updated_at').eq('username', username).maybeSingle();
      data = row ? { form: row.form, mealPlan: row.meal_plan, fecha: row.meal_plan_fecha, updatedAt: row.updated_at } : null;
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }

    const hoy = todayISO();

    // Cambios que quedaron en el celular sin llegar a la base (sin internet
    // o con la sesión vencida): se recuperan en vez de perderse.
    const pendiente = leerPendiente(username);
    let hayPendienteHoy = false;
    if (pendiente) {
      // Si la base tiene algo más nuevo del mismo día (por ejemplo, desde
      // otro equipo), se juntan ambos; si no, manda la copia del celular.
      const servidorMasNuevo = data?.fecha === pendiente.fecha && data?.updatedAt
        && new Date(data.updatedAt).getTime() > pendiente.ts;
      const recuperado = servidorMasNuevo
        ? { ...pendiente, form: data.form || pendiente.form, mealPlan: unirComidas(data.mealPlan, pendiente.mealPlan), ts: Date.now() }
        : pendiente;
      if (pendiente.fecha === hoy) {
        data = { ...(data || {}), form: recuperado.form, mealPlan: recuperado.mealPlan, fecha: hoy };
        escribirPendiente(username, recuperado);
        hayPendienteHoy = true;
      } else {
        // De un día anterior: va al historial de ese día.
        const r = await subirDatosAlumno(recuperado);
        if (r === 'ok') borrarPendiente(username, pendiente.ts);
        else escribirPendiente(username, recuperado);
        if (data?.fecha === pendiente.fecha) data = { ...data, mealPlan: recuperado.mealPlan };
      }
    }

    let plan = data?.mealPlan || EMPTY_MEALPLAN();

    // Migración: si el plan viene del esquema anterior de comidas (con
    // "Snack / merienda" en vez de "Media mañana" / "Media tarde"),
    // conserva esos alimentos moviéndolos a "Media tarde" en vez de
    // perderlos silenciosamente.
    if (plan.meals && plan.meals['Snack / merienda'] && !MEAL_NAMES.includes('Snack / merienda')) {
      const viejos = plan.meals['Snack / merienda'];
      const nuevosMeals = { ...EMPTY_MEALS(), ...plan.meals };
      delete nuevosMeals['Snack / merienda'];
      nuevosMeals['Media tarde'] = [...(nuevosMeals['Media tarde'] || []), ...viejos];
      plan = { ...plan, meals: nuevosMeals };
    }
    // Asegura que existan todas las comidas actuales aunque el plan sea viejo
    if (plan.meals) {
      plan = { ...plan, meals: { ...EMPTY_MEALS(), ...plan.meals } };
    }

    // Si el plan abierto es de un día anterior, se archiva y empieza uno nuevo
    if (data?.mealPlan && data.fecha && data.fecha !== hoy) {
      try {
        await supabase.from('historial')
          .update({ meal_plan: data.mealPlan })
          .eq('username', username).eq('fecha', data.fecha);
      } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
      plan = { ...plan, meals: EMPTY_MEALS() };
    }

    // Cuentas antiguas que nunca cambiaron los valores de ejemplo
    // (30 años, 170 cm, 70 kg...): se muestran vacíos para que el alumno
    // ingrese los suyos, en vez de parecer datos reales.
    let formGuardado = data?.form || EMPTY_FORM;
    const ej = FORM_EJEMPLO;
    if (['edad', 'estatura', 'peso', 'cuello', 'cintura', 'cadera'].every(k => Number(formGuardado[k]) === ej[k])) {
      formGuardado = { ...formGuardado, edad: '', estatura: '', peso: '', cuello: '', cintura: '', cadera: '' };
    }

    // Si se registró después del recorrido (ej. con Google), sus datos
    // entran a la cuenta: se guardan apenas abre.
    const antesRecorrido = formGuardado;
    formGuardado = formConRecorrido(formGuardado);

    setCurrentUser(username);
    setForm(formGuardado);
    setMealPlan(plan);
    // Con una copia pendiente de hoy, se sube apenas abre (el reintento
    // automático también la toma); si no, no hay nada nuevo que guardar.
    skipNextSave.current = !hayPendienteHoy && formGuardado === antesRecorrido;
    setEstadoGuardado(leerPendiente(username) ? 'guardando' : 'ok');
    setView('student');
    avisarCodigoLive(diasLive);
  }

  async function handleTrialCreated(username) {
    const diasLive = await canjearCodigoLive();
    await init();
    setCurrentUser(username);
    const form = formConRecorrido(EMPTY_FORM);
    setForm(form);
    setMealPlan(EMPTY_MEALPLAN());
    skipNextSave.current = form === EMPTY_FORM;
    setView('student');
    avisarCodigoLive(diasLive);
  }

  async function handleStudentLogin(email, password, setErr) {
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setBusy(false);
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('email not confirmed'))
        return setErr('Aún no confirmaste tu correo. Revisa tu bandeja (y spam).');
      return setErr('Correo o contraseña incorrectos.');
    }

    let perfil = null;
    try { localStorage.setItem('jb-conocido', '1'); } catch {}
    try {
      const { data: p } = await supabase.from('profiles').select('username, nombre, role').eq('id', data.user.id).maybeSingle();
      perfil = p;
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
    if (!perfil) { setBusy(false); return setErr('No encontramos tu perfil. Escríbenos por WhatsApp.'); }

    if (perfil.role === 'admin') {
      setAdminAuthed(true);
      marcarNoContarEmbudo();
      setBusy(false);
      await init();
      setView('admin');
      return;
    }

    let cuenta = null;
    try {
      const { data: a } = await supabase.from('alumnos').select('*').eq('username', perfil.username).maybeSingle();
      cuenta = a;
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }

    if (cuenta) {
      const u = {
        username: cuenta.username, enabled: cuenta.enabled, plan: cuenta.plan || 'pago',
        nombre: cuenta.nombre || perfil.nombre, fechaInicio: cuenta.fecha_inicio,
        fechaVencimiento: cuenta.fecha_vencimiento, telefono: cuenta.telefono,
        codigoReferido: cuenta.codigo_referido,
      };
      if (!u.enabled) { setBusy(false); return setErr('Tu acceso fue deshabilitado. Escríbenos para más información.'); }
      if (!membershipActive(u) && !yaVioPantallaGratis(u.username, u.fechaVencimiento)) {
        // Prueba o plan pagado vencido: resumen y planes para pagar en la
        // app (antes, al plan pagado solo se le decía "escríbenos").
        await mostrarVencido(cuenta, perfil.nombre);
        setBusy(false);
        return;
      }
    }

    await loadStudentSession(perfil.username);
    setBusy(false);
  }

  // autosave student data (debounced)
  useEffect(() => {
    if (view !== 'student' || !currentUser) return;
    if (skipNextSave.current) { skipNextSave.current = false; return; }
    // La copia en el celular se escribe al instante, antes de intentar subirla.
    const cambio = { username: currentUser, form, mealPlan, fecha: todayISO(), ts: Date.now() };
    escribirPendiente(currentUser, cambio);
    setEstadoGuardado('guardando');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const r = await subirDatosAlumno(cambio);
      if (r === 'ok') {
        borrarPendiente(currentUser, cambio.ts);
        setEstadoGuardado(leerPendiente(currentUser) ? 'guardando' : 'ok');
      } else setEstadoGuardado(r === 'sesion' ? 'sesion' : 'pendiente');
    }, 700);
    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, mealPlan]);

  // Reintenta subir lo que quedó pendiente: al volver el internet, al
  // volver a la app y cada 30 segundos mientras quede algo sin subir.
  useEffect(() => {
    if (view !== 'student' || !currentUser) return;
    let enCurso = false;
    const reintentar = async () => {
      const p = leerPendiente(currentUser);
      if (!p || enCurso) return;
      if (navigator.onLine === false) { setEstadoGuardado('pendiente'); return; }
      enCurso = true;
      const r = await subirDatosAlumno(p);
      enCurso = false;
      if (r === 'ok') {
        borrarPendiente(currentUser, p.ts);
        if (!leerPendiente(currentUser)) setEstadoGuardado('ok');
      } else setEstadoGuardado(r === 'sesion' ? 'sesion' : 'pendiente');
    };
    const alVolver = () => { if (document.visibilityState === 'visible') reintentar(); };
    const sinRed = () => { if (leerPendiente(currentUser)) setEstadoGuardado('pendiente'); };
    window.addEventListener('online', reintentar);
    window.addEventListener('offline', sinRed);
    document.addEventListener('visibilitychange', alVolver);
    const iv = setInterval(reintentar, 30000);
    reintentar();
    return () => {
      window.removeEventListener('online', reintentar);
      window.removeEventListener('offline', sinRed);
      document.removeEventListener('visibilitychange', alVolver);
      clearInterval(iv);
    };
  }, [view, currentUser]);

  async function openStudentData(username) {
    setViewingStudent(username);
    setViewingStudentData(null);
    try {
      const { data } = await supabase.from('datos_alumnos').select('form, meal_plan').eq('username', username).maybeSingle();
      setViewingStudentData(data ? { form: data.form, mealPlan: data.meal_plan } : {});
    } catch { setViewingStudentData({}); }
  }

  async function addUser(u) {
    setUsers(prev => [...prev, u]);
    try {
      await supabase.from('alumnos').insert({
        username: u.username, password: u.password, enabled: true,
        nombre: u.nombre || null, telefono: u.telefono || null,
        fecha_inicio: u.fechaInicio || null, fecha_vencimiento: u.fechaVencimiento || null,
      });
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
  }

  async function renewUser(username, meses) {
    const target = users.find(u => u.username === username);
    if (!target) return;
    const base = target.fechaVencimiento && daysLeft(target.fechaVencimiento) > 0
      ? target.fechaVencimiento : todayISO();
    const nuevo = addMonthsISO(base, meses);
    setUsers(prev => prev.map(u => u.username === username ? { ...u, fechaVencimiento: nuevo, enabled: true } : u));
    try {
      await supabase.from('alumnos').update({ fecha_vencimiento: nuevo, enabled: true }).eq('username', username);
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
  }
  // desdeHoy: para quien ya venció hace tiempo ("Volver a invitar"): los
  // días se cuentan desde hoy y la cuenta se vuelve a encender.
  async function adjustDaysUser(username, dias, motivo, desdeHoy = false) {
    const target = users.find(u => u.username === username);
    if (!target || !dias) return;
    const base = desdeHoy ? todayISO() : target.fechaVencimiento || todayISO();
    const nuevo = addDaysISO(base, dias);
    const cambios = desdeHoy ? { fecha_vencimiento: nuevo, enabled: true } : { fecha_vencimiento: nuevo };
    setUsers(prev => prev.map(u => u.username === username ? { ...u, fechaVencimiento: nuevo, ...(desdeHoy ? { enabled: true } : {}) } : u));
    try {
      await supabase.from('alumnos').update(cambios).eq('username', username);
      await supabase.from('ajustes_membresia').insert({ username, dias, motivo: motivo || null, fecha_resultante: nuevo });
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
  }
  // Activa "Reconocimiento Inteligente" (fotos) para un alumno por N meses,
  // contados desde hoy — igual que renewUser, pero para el add-on de
  // fotos en vez del plan principal. Se guarda la fecha de inicio además
  // de la de vencimiento, porque el cupo mensual del add-on se cuenta en
  // bloques de 30 días desde esa fecha, no por mes calendario.
  async function activarAddOnFoto(username, meses) {
    const target = users.find(u => u.username === username);
    if (!target) return;
    const desde = todayISO();
    const hasta = addMonthsISO(desde, meses);
    setUsers(prev => prev.map(u => u.username === username
      ? { ...u, reconocimientoFotoDesde: desde, reconocimientoFotoHasta: hasta } : u));
    try {
      await supabase.from('alumnos').update({
        reconocimiento_foto_desde: desde, reconocimiento_foto_hasta: hasta,
      }).eq('username', username);
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
  }
  async function desactivarAddOnFoto(username) {
    setUsers(prev => prev.map(u => u.username === username
      ? { ...u, reconocimientoFotoDesde: null, reconocimientoFotoHasta: null } : u));
    try {
      await supabase.from('alumnos').update({
        reconocimiento_foto_desde: null, reconocimiento_foto_hasta: null,
      }).eq('username', username);
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
  }
  async function toggleUser(username) {
    const target = users.find(u => u.username === username);
    const nextEnabled = target ? !target.enabled : true;
    setUsers(prev => prev.map(u => u.username === username ? { ...u, enabled: nextEnabled } : u));
    try { await supabase.from('alumnos').update({ enabled: nextEnabled }).eq('username', username); } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
  }
  async function deleteUser(username) {
    setUsers(prev => prev.filter(u => u.username !== username));
    try {
      // Borra todo el rastro del alumno (medidas, comidas, fotos, alimentos
      // personales, notificaciones, ajustes y su plan). Su correo y
      // contraseña de acceso quedan intactos: si vuelve a entrar, la app
      // le muestra el aviso de "no encontramos tu perfil" en vez de
      // fallar en silencio. Los pagos NO se borran, quedan como registro
      // contable.
      await supabase.from('datos_alumnos').delete().eq('username', username);
      await supabase.from('historial').delete().eq('username', username);
      await supabase.from('fotos_progreso').delete().eq('username', username);
      await supabase.from('alimentos_personales').delete().eq('username', username);
      await supabase.from('comidas_guardadas').delete().eq('username', username);
      await supabase.from('push_subs').delete().eq('username', username);
      await supabase.from('ajustes_membresia').delete().eq('username', username);
      await supabase.from('alumnos').delete().eq('username', username);
      await supabase.from('profiles').delete().eq('username', username);
    } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
  }

  async function logout() {
    try { await supabase.auth.signOut(); } catch (e) { alert('No se pudo completar la acción: ' + (e?.message || 'Intenta de nuevo.')); }
    setAdminAuthed(false);
    setEstadoGuardado('ok');
    setCurrentUser(null);
    setForm(EMPTY_FORM);
    setMealPlan(EMPTY_MEALPLAN());
    setView('landing');
  }

  /* El panel del referidor no depende de los datos internos de la app,
     así que se muestra sin esperar la carga inicial. */
  if (tokenRef) {
    return (
      <>
        {FONT_STYLE}
        <PanelReferidor token={tokenRef} onSalir={() => {
          window.history.replaceState({}, '', '/');
          setTokenRef(null);
          init();
        }} />
      </>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950">
        {FONT_STYLE}
        <div className="border-b border-zinc-800 px-6 py-4"><Logo /></div>
        <SkeletonDashboard />
      </div>
    );
  }

  return (
    <>
      {FONT_STYLE}
      {/* Franja fija que cubre el área del reloj/notch del iPhone en todas las pantallas,
          para que el contenido nunca se cuele detrás al hacer scroll. */}
      <div
        className="fixed top-0 left-0 right-0 bg-zinc-950 pointer-events-none"
        style={{ height: 'env(safe-area-inset-top)', zIndex: 100 }}
      />
      <ToastHost />
      {tokenRef && <PanelReferidor token={tokenRef} onSalir={() => {
        window.history.replaceState({}, '', '/');
        setTokenRef(null);
      }} />}
      {!tokenRef && view === 'resetPassword' && <ResetPassword onDone={() => { window.location.hash = ''; setView('studentAuth'); }} />}
      {!tokenRef && view === 'landing' && (sesionRevisada
        ? (instalada
          ? <Bienvenida onEntrar={() => irA('studentAuth')} onEmpezar={() => {
              registrarEventoEmbudo('clic_cta', { detalle: 'app' });
              try { if (window.fbq) window.fbq('track', 'Lead'); } catch (e) {}
              irA(leerRecorrido() ? 'trial' : 'recorrido');
            }} />
          : <Landing onChoose={irA} />)
        : (instalada || splashWebPendiente()) ? <SplashMarca /> : (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <Loader2 className="animate-spin text-orange-500" size={28} />
        </div>
      ))}
      {!tokenRef && view === 'reto' && <RetoPage onIrALaApp={() => { window.location.href = '/'; }} />}
      {!tokenRef && view === 'tienda' && <TiendaPublica username={currentUser} onIrALaApp={() => { window.history.replaceState({}, '', '/'); setView('landing'); }} />}
      {!tokenRef && view === 'free' && <FreeCalculator grasaConCuenta={linkCalculadora} onBack={() => {
        // Desde el link del video, "Volver" lleva a la portada.
        if (linkCalculadora && !VISTAS_CON_ATRAS.includes(window.history.state?.jb)) { try { window.history.replaceState({}, '', '/'); } catch {} }
        volver();
      }} onEmpezar={() => {
        registrarEventoEmbudo('clic_cta', { detalle: 'calculadora' });
        try { if (window.fbq) window.fbq('track', 'Lead'); } catch (e) {}
        irA(leerRecorrido() ? 'trial' : 'recorrido');
      }} />}
      {!tokenRef && view === 'recorrido' && <Recorrido onBack={volver} onListo={() => irA('trial')} />}
      {!tokenRef && view === 'trial' && <TrialSignup onBack={volver} onCreated={handleTrialCreated} />}
      {!tokenRef && view === 'adminAuth' && (
        <AdminAuth onBack={volver} busy={busy} onLogin={handleAdminLogin} />
      )}
      {!tokenRef && view === 'studentAuth' && (
        <StudentAuth onBack={volver} busy={busy} onLogin={handleStudentLogin}
          expiredInfo={expiredInfo}
          onClearExpired={async () => {
            // Cierra la sesión del alumno vencido para poder entrar con otra cuenta.
            try { await supabase.auth.signOut(); } catch {}
            setExpiredInfo(null);
          }}
          onMembresiaActiva={() => loadStudentSession(expiredInfo.username)}
          onSeguirGratis={async () => {
            marcarPantallaGratisVista(expiredInfo.username, expiredInfo.userRecord?.fechaVencimiento);
            const username = expiredInfo.username;
            setExpiredInfo(null);
            await loadStudentSession(username);
          }} />
      )}
      {!tokenRef && view === 'admin' && adminAuthed && (
        <>
          <AdminDashboard users={users} onAddUser={addUser} onToggleUser={toggleUser}
            onDeleteUser={deleteUser} onLogout={logout} onViewStudent={openStudentData} onRenew={renewUser} onAdjustDays={adjustDaysUser}
            onActivarAddOnFoto={activarAddOnFoto} onDesactivarAddOnFoto={desactivarAddOnFoto} onRecargar={init} />
          {viewingStudent && (
            <StudentDataModal username={viewingStudent} data={viewingStudentData}
              onClose={() => { setViewingStudent(null); setViewingStudentData(null); }} />
          )}
        </>
      )}
      {!tokenRef && view === 'student' && currentUser && (
        <StudentDashboard username={currentUser} form={form} setForm={setForm}
          mealPlan={mealPlan} setMealPlan={setMealPlan} onLogout={logout} estadoGuardado={estadoGuardado}
          userRecord={users.find(u => u.username === currentUser)} />
      )}
    </>
  );
}

export {
  ACTIVITY_DESC,
  BONO_DIAS,
  RelojBono,
  ganaBonoSuscripcion,
  ventanaBono,
  ACTIVITY_FACTORS,
  ANGULOS,
  AnimatedNumber,
  BeastMascot,
  CATEGORIAS_TIENDA,
  ESTILOS_ESCANER,
  FOODS,
  cargarAlimentosExtra,
  usarAlimentosExtra,
  agregarProductoAFoods,
  Field,
  HOSTS_PRODUCCION,
  Logo,
  MAX_GRAMOS_ENTRADA,
  MEAL_NAMES,
  PLANES,
  PlanesTab,
  Skeleton,
  StatCard,
  TRIAL_DAYS,
  UNIDADES_DISCRETAS,
  VAPID_PUBLIC,
  WHATSAPP_NUMBER,
  mensajePlanWhatsApp,
  addDaysISO,
  addMonthsISO,
  base64ToUint8,
  btnGhost,
  btnPrimary,
  buscarFood,
  calcAll,
  cambiarCantidad,
  comprimirImagen,
  daysLeft,
  entryGrams,
  entryMacros,
  esFritoOSaltado,
  esTWA,
  fechaLocalISO,
  fetchTrialStats,
  fmtS,
  generateCombos,
  sugerenciasComida,
  PROTEINAS_SUGERENCIA,
  generateQuickOptions,
  gramsPerUnit,
  inputCls,
  membershipActive,
  setFoodsPersonales,
  showToast,
  textoPorcion,
  tieneDatosBasicos,
  todayISO,
  uid,
  unitsFor,
  vibrar,
};
