import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Dumbbell, User, Plus, Trash2, LogOut, Eye, ShieldCheck, X, ChevronRight, Flame, Salad, UserPlus, AlertTriangle, Loader2, MessageCircle, Target, LayoutDashboard, TrendingUp, Camera, CreditCard } from 'lucide-react';
import { supabase } from './supabaseClient';

/* ------------------------------------------------------------------ */
/* DATA                                                                */
/* ------------------------------------------------------------------ */

const RAW_FOODS = [
  ["Cereales","Arroz blanco","Crudo",365,7.1,80.0,0.7,1.3],
  ["Cereales","Arroz blanco","Cocido",130,2.7,28.0,0.3,0.4],
  ["Cereales","Quinua","Cruda",368,14.1,64.2,6.1,7.0],
  ["Cereales","Quinua","Cocida",120,4.4,21.3,1.9,2.8],
  ["Cereales","Avena en hojuelas","Cruda",389,16.9,66.3,6.9,10.6],
  ["Cereales","Avena","Cocida",71,2.5,12.0,1.5,1.7],
  ["Cereales","Kiwicha","Cruda",371,13.6,65.3,7.0,6.7],
  ["Cereales","Kiwicha","Cocida",102,3.8,19.0,1.6,2.1],
  ["Cereales","Cañihua","Cruda",350,15.0,63.0,7.6,8.0],
  ["Cereales","Choclo (maíz)","Crudo",96,3.4,21.0,1.5,2.4],
  ["Cereales","Choclo (maíz)","Cocido",90,3.3,19.0,1.3,2.2],
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
  ["Carnes y aves","Pollo pechuga","Cruda",110,23.0,0.0,1.5,0.0],
  ["Carnes y aves","Pollo pechuga","Cocida",165,31.0,0.0,3.6,0.0],
  ["Carnes y aves","Carne de res (bistec)","Cruda",143,21.4,0.0,6.0,0.0],
  ["Carnes y aves","Carne de res (bistec)","Cocida",217,26.7,0.0,11.8,0.0],
  ["Carnes y aves","Cerdo (lomo)","Crudo",143,21.0,0.0,6.0,0.0],
  ["Carnes y aves","Cerdo (lomo)","Cocido",212,27.8,0.0,10.7,0.0],
  ["Pescados","Bonito","Crudo",110,22.0,0.0,2.5,0.0],
  ["Pescados","Bonito","Cocido",136,26.0,0.0,3.2,0.0],
  ["Pescados","Atún","Crudo",116,25.4,0.0,1.0,0.0],
  ["Pescados","Atún","Cocido",132,28.2,0.0,1.3,0.0],
  ["Huevos","Huevo de gallina","Crudo",143,12.6,0.7,9.5,0.0],
  ["Huevos","Huevo de gallina","Cocido",155,12.6,1.1,10.6,0.0],
  ["Lácteos","Leche entera","-",61,3.2,4.8,3.3,0.0],
  ["Lácteos","Leche descremada","-",34,3.4,5.0,0.1,0.0],
  ["Lácteos","Yogur natural","-",61,3.5,4.7,3.3,0.0],
  ["Lácteos","Queso fresco","-",264,18.5,3.4,20.0,0.0],
  ["Frutas","Plátano de seda","Cruda",89,1.1,22.8,0.3,2.6],
  ["Frutas","Manzana","Cruda",52,0.3,13.8,0.2,2.4],
  ["Frutas","Palta","Cruda",160,2.0,8.5,14.7,6.7],
  ["Frutas","Papaya","Cruda",43,0.5,10.8,0.3,1.7],
  ["Frutas","Mango","Crudo",60,0.8,15.0,0.4,1.6],
  ["Frutas","Naranja","Cruda",47,0.9,11.8,0.1,2.4],
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
  ["Otros","Pan integral","-",247,9.6,46.2,3.3,6.9],
  ["Otros","Chía","Cruda",486,16.5,42.1,30.7,34.4],
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
  ["Platos preparados","Pollo a la brasa (con piel)","-",215,25.0,0.5,12.5,0.0],
  ["Platos preparados","Pollada (pollo frito)","-",250,22.0,10.0,14.0,0.8],
  ["Platos preparados","Ceviche de pescado","-",85,14.0,5.0,1.2,0.8],
  ["Platos preparados","Lomo saltado","-",175,11.0,14.0,8.0,1.3],
  ["Platos preparados","Arroz chaufa","-",165,8.0,21.0,5.5,1.0],
  ["Platos preparados","Tallarines rojos con pollo","-",170,9.5,20.0,5.5,1.5],
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
  ["Platos preparados","Milanesa de pollo","-",250,19.0,16.0,12.5,1.0],
  ["Platos preparados","Pescado frito","-",200,22.0,7.0,9.5,0.4],
  ["Platos preparados","Sudado de pescado","-",95,15.0,4.5,1.8,0.9],
  ["Platos preparados","Escabeche de pollo","-",130,13.0,7.0,5.5,1.4],
  ["Platos preparados","Salchipapa","-",270,8.0,28.0,14.0,2.5],
  ["Platos preparados","Pollo al horno","-",190,26.0,1.0,9.0,0.2],
  ["Platos preparados","Estofado de pollo","-",130,13.0,10.0,4.0,1.3],
  ["Platos preparados","Aguadito de pollo","-",70,5.5,7.5,2.0,0.8],
  ["Platos preparados","Caldo de gallina","-",65,6.5,5.0,2.2,0.4],
  ["Platos preparados","Sopa a la minuta","-",80,5.0,8.5,2.8,0.6],
  ["Platos preparados","Menestrón","-",90,4.5,11.0,3.0,2.2],
  ["Platos preparados","Ensalada de pollo","-",110,12.0,6.0,4.5,1.8],
  ["Platos preparados","Sándwich de pollo","-",230,14.0,26.0,8.0,1.6],
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
  ["Postres","Chocolate con leche","-",535,7.6,59.4,29.7,3.4],
  ["Postres","Galleta dulce rellena","-",480,5.0,66.0,21.0,2.0],
  ["Bebidas","Café negro sin azúcar","-",2,0.3,0.0,0.0,0.0],
  ["Bebidas","Café con leche","-",42,2.2,3.3,2.2,0.0],
  ["Bebidas","Té / infusión sin azúcar","-",1,0.0,0.2,0.0,0.0],
  ["Bebidas","Agua","-",0,0.0,0.0,0.0,0.0],
  ["Bebidas","Jugo de naranja natural","-",45,0.7,10.4,0.2,0.2],
  ["Bebidas","Gaseosa regular","-",42,0.0,10.6,0.0,0.0],
  ["Bebidas","Gaseosa dietética","-",0,0.0,0.0,0.0,0.0],
  ["Bebidas","Chicha morada con azúcar","-",55,0.1,13.8,0.0,0.1],
  ["Bebidas","Emoliente sin azúcar","-",8,0.1,2.0,0.0,0.0],
  ["Bebidas","Leche de almendras sin azúcar","-",15,0.6,0.6,1.2,0.3],
  ["Bebidas","Yogur bebible","-",70,3.0,11.0,1.5,0.0],
  ["Otros","Azúcar blanca","-",387,0.0,100.0,0.0,0.0],
  ["Otros","Miel de abeja","-",304,0.3,82.4,0.0,0.2],
  ["Otros","Mermelada","-",278,0.4,68.9,0.1,1.1],
  ["Otros","Galleta de soda","-",421,9.5,71.0,10.6,2.6],
  ["Otros","Avena instantánea en polvo","-",379,13.2,67.7,6.5,10.1],
  ["Otros","Proteína en polvo (whey)","-",400,80.0,8.0,6.0,1.0],
  ["Grasas","Aceite de oliva","-",884,0.0,0.0,100.0,0.0],
  ["Grasas","Almendras","Crudas",579,21.2,21.6,49.9,12.5],
  ["Grasas","Nueces","Crudas",654,15.2,13.7,65.2,6.7],
  ["Frutas","Arándanos","Crudos",57,0.7,14.5,0.3,2.4],
  ["Frutas","Sandía","Cruda",30,0.6,7.6,0.2,0.4],
  ["Frutas","Melón","Crudo",34,0.8,8.2,0.2,0.9],
  ["Frutas","Pera","Cruda",57,0.4,15.2,0.1,3.1],
  ["Verduras","Pepino","Crudo",15,0.7,3.6,0.1,0.5],
  ["Verduras","Pimiento","Crudo",31,1.0,6.0,0.3,2.1],
  ["Verduras","Cebolla","Cruda",40,1.1,9.3,0.1,1.7],
  ["Verduras","Apio","Crudo",16,0.7,3.0,0.2,1.6],
  ["Carnes y aves","Pollo pierna (sin piel)","Cocida",177,24.2,0.0,8.1,0.0],
  ["Carnes y aves","Pavo pechuga","Cocida",135,29.0,0.0,1.7,0.0],
  ["Carnes y aves","Jamón de pavo","-",104,16.9,2.6,3.0,0.0],
  ["Pescados","Trucha","Cocida",148,20.8,0.0,6.6,0.0],
  ["Pescados","Langostinos","Cocidos",99,20.9,0.2,1.4,0.0],
  ["Lácteos","Queso parmesano","-",392,35.8,3.2,25.8,0.0],
  ["Lácteos","Yogur griego natural","-",59,10.0,3.6,0.4,0.0],
];

const FOODS = RAW_FOODS.map(([group, name, state, kcal, protein, carbs, fat, fiber]) => ({
  group, name, state, kcal, protein, carbs, fat, fiber, key: `${name} (${state})`,
}));

const FOOD_GROUPS = [...new Set(FOODS.map(f => f.group))];

/* Unidades caseras: cuántos gramos equivale cada medida.
   Se resuelve por nombre exacto primero, luego por grupo. */
const UNITS_BY_NAME = {
  'Huevo de gallina': [['unidad', 50]],
  'Plátano de seda': [['unidad', 120]],
  'Manzana': [['unidad', 180]],
  'Naranja': [['unidad', 150]],
  'Pera': [['unidad', 170]],
  'Palta': [['unidad', 200], ['mitad', 100]],
  'Pan francés': [['unidad', 55]],
  'Pan integral': [['rebanada', 30]],
  'Galleta de soda': [['unidad', 6], ['paquete', 34]],
  'Aceite vegetal': [['cucharada', 14], ['cucharadita', 5]],
  'Aceite de oliva': [['cucharada', 14], ['cucharadita', 5]],
  'Mantequilla': [['cucharada', 14], ['cucharadita', 5]],
  'Azúcar blanca': [['cucharada', 12], ['cucharadita', 4]],
  'Miel de abeja': [['cucharada', 21], ['cucharadita', 7]],
  'Mermelada': [['cucharada', 20]],
  'Maní': [['puñado', 30], ['cucharada', 16]],
  'Almendras': [['puñado', 30], ['unidad', 1.2]],
  'Nueces': [['puñado', 30], ['unidad', 5]],
  'Chía': [['cucharada', 12], ['cucharadita', 4]],
  'Proteína en polvo (whey)': [['scoop', 30], ['cucharada', 15]],
  'Avena instantánea en polvo': [['cucharada', 9], ['taza', 80]],
  'Queso fresco': [['tajada', 30]],
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
  'Chocolate con leche': [['barra pequeña', 40], ['cuadrito', 8]],
  'Galleta dulce rellena': [['unidad', 12], ['paquete', 43]],
  'Clara de huevo': [['unidad', 33]],
  'Yema de huevo': [['unidad', 17]],
  'Atún en lata en agua (escurrido)': [['lata pequeña', 100], ['lata grande', 140]],
  'Atún en lata en aceite (escurrido)': [['lata pequeña', 100], ['lata grande', 140]],
  'Atún en lata en aceite (sin escurrir)': [['lata pequeña', 100], ['lata grande', 140]],
  'Pollo a la brasa (con piel)': [['1/4 de pollo', 250], ['1/8 de pollo', 125], ['porción', 200]],
  'Anticucho de corazón': [['palito', 80], ['porción (2 palitos)', 160]],
  'Ceviche de pescado': [['porción', 250], ['plato', 300]],
  'Salchipapa': [['porción', 300]],
  'Sándwich de pollo': [['unidad', 150]],
};
const UNITS_BY_GROUP = {
  'Bebidas': [['taza', 240], ['vaso', 200], ['jarra', 500]],
  'Lácteos': [['taza', 240], ['vaso', 200]],
  'Cereales': [['taza', 160]],
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

const ACTIVITY_FACTORS = { Sedentario: 1.2, Ligero: 1.375, Moderado: 1.55, Intenso: 1.725, 'Muy intenso': 1.9 };
const ACTIVITY_DESC = {
  Sedentario: 'Poco o nada de actividad física',
  Ligero: '1 a 2 días a la semana de actividad física',
  Moderado: '3 a 5 días a la semana de actividad física',
  Intenso: '6 a 7 días a la semana de actividad física',
  'Muy intenso': '7 días a la semana + trabajo activo',
};
const GOALS = {
  'Perder grasa': { emoji: '🔥', pct: -20, desc: 'Déficit calórico' },
  'Mantener peso': { emoji: '⚖️', pct: 0, desc: 'Sin déficit ni superávit' },
  'Ganar músculo': { emoji: '💪', pct: 10, desc: 'Superávit calórico' },
};
const MEAL_NAMES = ['Desayuno', 'Almuerzo', 'Cena', 'Snack / merienda'];

const ANGULOS = [
  { id: 'frente', label: 'De frente', emoji: '🧍', tip: 'Brazos relajados a los costados, mirando a la cámara' },
  { id: 'perfil', label: 'De perfil', emoji: '🧍‍♂️', tip: 'De lado, brazos relajados, mirando al frente' },
  { id: 'espalda', label: 'De espalda', emoji: '🔙', tip: 'Dando la espalda, brazos relajados' },
  { id: 'relajado', label: 'Libre', emoji: '💪', tip: 'La pose que quieras usar para comparar' },
];
const WHATSAPP_NUMBER = '51963760819';
const WHATSAPP_MESSAGE = 'Hola, tengo una consulta sobre mi plan.';

const EMPTY_FORM = { sexo: 'M', edad: 30, estatura: 170, peso: 70, cuello: 38, cintura: 85, cadera: 95, actividad: 'Moderado', objetivo: '', ajustePct: null, pesoInicial: null, pesoObjetivo: null };
const EMPTY_MEALS = () => ({ Desayuno: [], Almuerzo: [], Cena: [], 'Snack / merienda': [] });
const EMPTY_MEALPLAN = () => ({ targetKcal: 2000, macros: { p: 0.3, c: 0.4, f: 0.3 }, meals: EMPTY_MEALS() });

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

  return { bmi, bmiCat, bf, bfCat, fatKg, leanKg, muscleKg, tmb, tdee, iccVal, iccCat, idealMin, idealMax, water };
}

function entryGrams(entry) {
  const food = FOODS.find(f => f.key === entry.foodKey);
  if (!food) return 0;
  // Compatibilidad: registros antiguos guardaban solo gramos
  if (entry.unit === undefined || entry.unit === null) return Number(entry.grams) || 0;
  const qty = Number(entry.qty) || 0;
  return qty * gramsPerUnit(food, entry.unit);
}

function entryMacros(entry) {
  const food = FOODS.find(f => f.key === entry.foodKey);
  const g = entryGrams(entry);
  if (!food || !g) return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const factor = g / 100;
  return { kcal: food.kcal * factor, protein: food.protein * factor, carbs: food.carbs * factor, fat: food.fat * factor };
}

function uid() { return Math.random().toString(36).slice(2, 10); }

/* ------------------------------------------------------------------ */
/* MOTOR DE RECOMENDACIONES — "¿Qué puedo comer?"                     */
/* ------------------------------------------------------------------ */

const GROUP_EMOJI = {
  'Carnes y aves': '🍗', 'Pescados': '🐟', 'Huevos': '🥚', 'Cereales': '🍚',
  'Tubérculos': '🥔', 'Menestras': '🫘', 'Frutas': '🍎', 'Lácteos': '🥛',
};

const PROTEIN_PICKS = ['Pollo pechuga', 'Bonito', 'Atún', 'Huevo de gallina', 'Carne de res (bistec)'];
const CARB_PICKS = ['Arroz blanco', 'Papa', 'Camote', 'Quinua', 'Yuca'];

function buildCombo(proteinFood, carbFood, remaining) {
  const proteinTargetG = Math.max(remaining.protein, 15);
  const carbTargetG = Math.max(remaining.carbs, 15);
  let gP = proteinFood.protein > 0 ? (proteinTargetG / proteinFood.protein) * 100 : 100;
  let gC = carbFood.carbs > 0 ? (carbTargetG / carbFood.carbs) * 100 : 100;
  gP = Math.min(Math.max(gP, 60), 250);
  gC = Math.min(Math.max(gC, 60), 300);
  let kcal = (proteinFood.kcal * gP + carbFood.kcal * gC) / 100;
  if (kcal > remaining.kcal * 1.05 && remaining.kcal > 0) {
    const factor = remaining.kcal / kcal;
    gP *= factor; gC *= factor; kcal *= factor;
  }
  const protein = (proteinFood.protein * gP + carbFood.protein * gC) / 100;
  const carbs = (proteinFood.carbs * gP + carbFood.carbs * gC) / 100;
  const fat = (proteinFood.fat * gP + carbFood.fat * gC) / 100;
  const score = Math.abs(kcal - remaining.kcal) + Math.abs(protein - remaining.protein) * 2;
  return {
    id: `${proteinFood.key}__${carbFood.key}`,
    emoji: GROUP_EMOJI[proteinFood.group] || '🍽️',
    name: `${proteinFood.name} + ${carbFood.name}`,
    items: [{ food: proteinFood, grams: Math.round(gP) }, { food: carbFood, grams: Math.round(gC) }],
    kcal, protein, carbs, fat, score,
  };
}

function generateCombos(remaining) {
  if (remaining.kcal < 150) return [];
  const proteins = FOODS.filter(f => PROTEIN_PICKS.includes(f.name) && (f.state.startsWith('Coci') || f.group === 'Huevos'));
  const carbs = FOODS.filter(f => CARB_PICKS.includes(f.name) && f.state.startsWith('Coci'));
  const combos = [];
  proteins.forEach(p => carbs.forEach(c => combos.push(buildCombo(p, c, remaining))));
  combos.sort((a, b) => a.score - b.score);
  return combos.slice(0, 6);
}

function generateQuickOptions(remaining) {
  if (remaining.kcal <= 0 || remaining.kcal > 400) return [];
  return FOODS.filter(f => f.group === 'Frutas' || f.group === 'Lácteos').map(f => {
    let grams = f.kcal > 0 ? (remaining.kcal / f.kcal) * 100 : 100;
    grams = Math.min(Math.max(grams, 50), 300);
    const kcal = (f.kcal * grams) / 100;
    return {
      id: f.key, emoji: GROUP_EMOJI[f.group] || '🍽️', name: f.name,
      items: [{ food: f, grams: Math.round(grams) }],
      kcal, protein: (f.protein * grams) / 100, carbs: (f.carbs * grams) / 100, fat: (f.fat * grams) / 100,
    };
  }).filter(o => o.kcal <= remaining.kcal * 1.1).slice(0, 3);
}

function WhatCanIEat({ mealPlan, setMealPlan, remaining }) {
  const [open, setOpen] = useState(false);
  const [targetMeal, setTargetMeal] = useState(MEAL_NAMES[0]);
  const [added, setAdded] = useState(null);

  const combos = useMemo(() => generateCombos(remaining), [remaining]);
  const quick = useMemo(() => generateQuickOptions(remaining), [remaining]);
  const options = [...combos, ...quick];

  function addToDay(option) {
    setMealPlan(v => ({
      ...v,
      meals: {
        ...v.meals,
        [targetMeal]: [
          ...v.meals[targetMeal],
          ...option.items.map(it => ({ id: uid(), foodKey: it.food.key, qty: it.grams, unit: 'gramos' })),
        ],
      },
    }));
    setAdded(option.id);
    setTimeout(() => { setAdded(null); setOpen(false); }, 900);
  }

  return (
    <div className="bg-zinc-900 border border-orange-500/40 rounded-2xl p-5">
      <button onClick={() => setOpen(v => !v)} className={btnPrimary + ' w-full text-base py-3'}>
        🍽️ ¿Qué puedo comer?
      </button>
      {open && (
        <div className="mt-4 flex flex-col gap-4">
          {remaining.kcal <= 0 ? (
            <p className="text-emerald-400 text-sm jb-body text-center py-4">🎉 Ya cubriste tu objetivo de calorías por hoy. ¡Bien hecho!</p>
          ) : (
            <>
              <div className="text-center">
                <span className="jb-display text-2xl text-orange-500">{Math.round(remaining.kcal)} kcal</span>
                <p className="text-zinc-500 text-xs jb-body">disponibles · P {Math.round(remaining.protein)}g · C {Math.round(remaining.carbs)}g · G {Math.round(remaining.fat)}g</p>
              </div>
              <Field label="Agregar a">
                <select value={targetMeal} onChange={e => setTargetMeal(e.target.value)} className={inputCls}>
                  {MEAL_NAMES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
              {options.length === 0 ? (
                <p className="text-zinc-500 text-sm">Con tan pocas calorías disponibles, mejor espera a tu próxima comida.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {options.map(opt => (
                    <div key={opt.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{opt.emoji}</span>
                        <span className="jb-body text-sm text-zinc-100 font-medium">{opt.name}</span>
                      </div>
                      <div className="text-orange-500 jb-display text-lg">{Math.round(opt.kcal)} kcal</div>
                      <div className="text-zinc-500 text-xs jb-body">P {Math.round(opt.protein)}g · C {Math.round(opt.carbs)}g · G {Math.round(opt.fat)}g</div>
                      <div className="text-zinc-600 text-[11px] jb-body">
                        {opt.items.map(it => `${it.grams}g ${it.food.name}`).join(' + ')}
                      </div>
                      <button onClick={() => addToDay(opt)} className={(added === opt.id ? 'bg-emerald-500 text-zinc-950' : btnGhost) + ' text-sm py-1.5 mt-1'}>
                        {added === opt.id ? '✓ Agregado' : 'Agregar a mi día'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SMALL UI PIECES                                                    */
/* ------------------------------------------------------------------ */

const FONT_STYLE = (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700;800&display=swap');
    .jb-display { font-family: 'Anton', sans-serif; letter-spacing: 0.02em; }
    .jb-body { font-family: 'Inter', sans-serif; }
  `}</style>
);

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-1">
      <span className="jb-body text-[11px] uppercase tracking-wider text-zinc-500">{label}</span>
      <span className={`jb-display text-3xl ${accent || 'text-orange-500'}`}>{value}</span>
      {sub && <span className="jb-body text-xs text-zinc-400">{sub}</span>}
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

const inputCls = "bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 jb-body";
const btnPrimary = "bg-orange-500 hover:bg-orange-400 text-zinc-950 font-bold jb-body rounded-lg px-4 py-2.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2";
const btnGhost = "bg-transparent border border-zinc-700 hover:border-zinc-500 text-zinc-200 jb-body rounded-lg px-4 py-2.5 transition-colors flex items-center justify-center gap-2";
const btnDanger = "bg-transparent border border-red-900 hover:bg-red-950 text-red-400 jb-body rounded-lg px-3 py-2 transition-colors flex items-center justify-center gap-2 text-sm";

function Logo({ size = 'md' }) {
  const big = size === 'lg';
  return (
    <div className="flex items-center gap-2">
      <div className="bg-orange-500 rounded-md p-1.5">
        <Dumbbell className="text-zinc-950" size={big ? 26 : 18} strokeWidth={2.5} />
      </div>
      <span className={`jb-display text-zinc-50 tracking-wide ${big ? 'text-2xl' : 'text-lg'}`}>JONAH BEAST <span className="text-orange-500">FUEL</span></span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* LANDING                                                             */
/* ------------------------------------------------------------------ */

function Landing({ onChoose }) {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{
        backgroundImage: 'repeating-linear-gradient(45deg, #f97316 0, #f97316 2px, transparent 2px, transparent 40px)'
      }} />
      <div className="relative z-10 max-w-xl w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-orange-500 rounded-2xl p-4">
            <Dumbbell className="text-zinc-950" size={40} strokeWidth={2.5} />
          </div>
        </div>
        <h1 className="jb-display text-5xl sm:text-7xl text-zinc-50 leading-none mb-2">JONAH BEAST</h1>
        <div className="jb-display text-4xl sm:text-6xl text-orange-500 leading-none mb-4 tracking-widest">FUEL</div>

        <div className="relative mb-5">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-orange-500/60" />
            <Flame className="text-orange-500 shrink-0" size={20} />
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-orange-500/60" />
          </div>
          <h2 className="jb-display text-xl sm:text-2xl text-zinc-50 leading-tight my-3 px-2">
            LA ALIMENTACIÓN QUE<br className="sm:hidden" /> IMPULSA TU OBJETIVO
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-orange-500/60" />
            <Dumbbell className="text-orange-500 shrink-0" size={20} />
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-orange-500/60" />
          </div>
        </div>

        <p className="jb-body text-orange-500/90 text-sm mb-2 tracking-wide">EL FITNESS NO TIENE QUE SER COMPLICADO</p>

        <p className="jb-body text-zinc-400 text-base mb-10">Mide tu composición corporal. Arma tu plan de alimentación. Domina tu progreso.</p>

        <div className="grid sm:grid-cols-2 gap-4">
          <button onClick={() => onChoose('studentAuth')} className="group bg-zinc-900 border border-zinc-800 hover:border-orange-500 rounded-2xl p-6 text-left transition-colors">
            <User className="text-orange-500 mb-3" size={28} />
            <div className="jb-display text-xl text-zinc-50 mb-1">SOY ALUMNO</div>
            <p className="jb-body text-sm text-zinc-500">Ingresa con tu correo y contraseña</p>
            <div className="flex items-center gap-1 text-orange-500 text-sm jb-body mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              Entrar <ChevronRight size={16} />
            </div>
          </button>
          <button onClick={() => onChoose('studentAuth')} className="group bg-zinc-900 border border-zinc-800 hover:border-orange-500 rounded-2xl p-6 text-left transition-colors">
            <ShieldCheck className="text-orange-500 mb-3" size={28} />
            <div className="jb-display text-xl text-zinc-50 mb-1">ADMINISTRACIÓN</div>
            <p className="jb-body text-sm text-zinc-500">Acceso del equipo Jonah Beast Fuel</p>
            <div className="flex items-center gap-1 text-orange-500 text-sm jb-body mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              Entrar <ChevronRight size={16} />
            </div>
          </button>
        </div>

        <button onClick={() => onChoose('trial')}
          className="mt-4 w-full bg-orange-500 hover:bg-orange-400 rounded-2xl p-5 transition-colors">
          <div className="jb-display text-lg text-zinc-950">🚀 PRUEBA GRATIS 7 DÍAS</div>
          <p className="jb-body text-sm text-zinc-800 mt-1">Sin tarjeta · Acceso completo a la app</p>
        </button>

        <button onClick={() => onChoose('free')}
          className="mt-3 w-full bg-zinc-900 border border-zinc-800 hover:border-orange-500 rounded-2xl p-4 transition-colors">
          <div className="jb-display text-sm text-zinc-200">📏 SOLO MEDIR MI COMPOSICIÓN CORPORAL</div>
          <p className="jb-body text-xs text-zinc-500 mt-1">Sin registro · Resultados al instante</p>
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AUTH SCREENS                                                        */
/* ------------------------------------------------------------------ */

function FreeCalculator({ onBack }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [step, setStep] = useState('form');
  const [gate, setGate] = useState({ telefono: '', red: 'Instagram', codigo: '', nombre: '' });
  const [gateErr, setGateErr] = useState('');
  const [checking, setChecking] = useState(false);

  const results = useMemo(() => calcAll({
    ...form,
    edad: Number(form.edad) || 0, estatura: Number(form.estatura) || 1, peso: Number(form.peso) || 0,
    cuello: Number(form.cuello) || 1, cintura: Number(form.cintura) || 1, cadera: Number(form.cadera) || 1,
  }), [form]);

  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola, acabo de medir mi composición corporal en la web y quiero saber más sobre Jonah Beast Fuel.')}`;

  async function unlock() {
    setGateErr('');
    const tel = gate.telefono.replace(/\D/g, '');
    if (!gate.nombre.trim()) return setGateErr('Escribe tu nombre.');
    if (tel.length < 9) return setGateErr('Escribe tu número de celular (9 dígitos).');
    if (!gate.codigo.trim()) return setGateErr('Ingresa el código que se compartió en el live.');
    setChecking(true);
    let valid = '';
    try {
      const { data } = await supabase.from('config').select('value').eq('key', 'access_code').maybeSingle();
      valid = data ? data.value : '';
    } catch {}
    if (!valid || gate.codigo.trim().toUpperCase() !== valid.trim().toUpperCase()) {
      setChecking(false);
      return setGateErr('El código no es válido. Sígueme en Instagram o TikTok para obtenerlo.');
    }
    try {
      await supabase.from('leads').insert({
        nombre: gate.nombre.trim(), telefono: tel, red: gate.red,
        codigo: gate.codigo.trim().toUpperCase(),
        sexo: form.sexo, edad: Number(form.edad) || null, peso: Number(form.peso) || null,
        estatura: Number(form.estatura) || null,
        grasa_pct: Number(results.bf.toFixed(1)), imc: Number(results.bmi.toFixed(1)),
        tmb: Math.round(results.tmb), tdee: Math.round(results.tdee),
      });
    } catch {}
    setChecking(false);
    setStep('results');
  }

  return (
    <div className="min-h-screen bg-zinc-950 jb-body">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <Logo />
        <button onClick={onBack} className={btnGhost + ' py-1.5 px-3 text-sm'}>← Volver</button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-6">
        <div className="text-center">
          <h1 className="jb-display text-3xl sm:text-4xl text-zinc-50 mb-2">MIDE TU COMPOSICIÓN CORPORAL</h1>
          <p className="jb-body text-sm text-zinc-400">Gratis, sin registro. Solo necesitas una cinta métrica y una balanza.</p>
        </div>

        {step === 'form' ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Sexo">
                <select value={form.sexo} onChange={e => setForm(v => ({ ...v, sexo: e.target.value }))} className={inputCls}>
                  <option value="M">Hombre</option>
                  <option value="F">Mujer</option>
                </select>
              </Field>
              <Field label="Edad (años)">
                <input type="number" inputMode="numeric" className={inputCls} value={form.edad}
                  onChange={e => setForm(v => ({ ...v, edad: e.target.value === '' ? '' : Number(e.target.value) }))} />
              </Field>
              <Field label="Estatura (cm)">
                <input type="number" inputMode="decimal" className={inputCls} value={form.estatura}
                  onChange={e => setForm(v => ({ ...v, estatura: e.target.value === '' ? '' : Number(e.target.value) }))} />
              </Field>
              <Field label="Peso (kg)">
                <input type="number" inputMode="decimal" className={inputCls} value={form.peso}
                  onChange={e => setForm(v => ({ ...v, peso: e.target.value === '' ? '' : Number(e.target.value) }))} />
              </Field>
              <Field label="Cuello (cm)" helpHref="/guia-cuello.jpg">
                <input type="number" inputMode="decimal" className={inputCls} value={form.cuello}
                  onChange={e => setForm(v => ({ ...v, cuello: e.target.value === '' ? '' : Number(e.target.value) }))} />
              </Field>
              <Field label="Cintura (cm)" helpHref="/guia-cintura.jpg">
                <input type="number" inputMode="decimal" className={inputCls} value={form.cintura}
                  onChange={e => setForm(v => ({ ...v, cintura: e.target.value === '' ? '' : Number(e.target.value) }))} />
              </Field>
              <Field label="Cadera (cm)" helpHref="/guia-cadera.jpg">
                <input type="number" inputMode="decimal" className={inputCls} value={form.cadera}
                  onChange={e => setForm(v => ({ ...v, cadera: e.target.value === '' ? '' : Number(e.target.value) }))} />
              </Field>
              <Field label="Actividad física">
                <select value={form.actividad} onChange={e => setForm(v => ({ ...v, actividad: e.target.value }))} className={inputCls}>
                  {Object.keys(ACTIVITY_FACTORS).map(a => <option key={a} value={a}>{a} — {ACTIVITY_DESC[a]}</option>)}
                </select>
              </Field>
            </div>
            <button onClick={() => setStep('gate')} className={btnPrimary + ' w-full mt-5 py-3 text-base'}>
              VER MIS RESULTADOS
            </button>
          </div>
        ) : step === 'gate' ? (
          <div className="bg-zinc-900 border border-orange-500/40 rounded-2xl p-6 max-w-md w-full mx-auto">
            <h2 className="jb-display text-xl text-zinc-50 mb-2">🔓 ÚLTIMO PASO</h2>
            <p className="jb-body text-sm text-zinc-400 mb-5">
              Ingresa el código que compartimos en los lives y tu celular para desbloquear tus resultados.
            </p>
            <div className="flex flex-col gap-4">
              <Field label="Tu nombre">
                <input value={gate.nombre} onChange={e => setGate(v => ({ ...v, nombre: e.target.value }))}
                  className={inputCls} placeholder="Ej. María" />
              </Field>
              <Field label="¿Dónde nos sigues?">
                <select value={gate.red} onChange={e => setGate(v => ({ ...v, red: e.target.value }))} className={inputCls}>
                  <option value="Instagram">Instagram</option>
                  <option value="TikTok">TikTok</option>
                  <option value="Ambos">Ambos</option>
                </select>
              </Field>
              <Field label="Tu celular (WhatsApp)">
                <input type="tel" inputMode="tel" value={gate.telefono}
                  onChange={e => setGate(v => ({ ...v, telefono: e.target.value }))}
                  className={inputCls} placeholder="999 888 777" />
              </Field>
              <Field label="Código de acceso">
                <input value={gate.codigo} onChange={e => setGate(v => ({ ...v, codigo: e.target.value }))}
                  className={inputCls + ' uppercase'} placeholder="Ej. BEAST" />
              </Field>
              <p className="jb-body text-[11px] text-zinc-600">
                Al continuar aceptas que Jonah Beast Fuel guarde estos datos para contactarte. Puedes pedir que los eliminemos cuando quieras.
              </p>
              {gateErr && <p className="text-red-400 text-sm jb-body flex items-center gap-1.5"><AlertTriangle size={14} />{gateErr}</p>}
              <button onClick={unlock} disabled={checking} className={btnPrimary + ' py-3 text-base'}>
                {checking ? <Loader2 className="animate-spin" size={18} /> : 'DESBLOQUEAR MIS RESULTADOS'}
              </button>
              <button onClick={() => setStep('form')} className="jb-body text-sm text-zinc-500 hover:text-zinc-300">
                ← Volver a mis datos
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard label="% Grasa corporal" value={results.bf.toFixed(1) + '%'} sub={results.bfCat} />
              <StatCard label="IMC" value={results.bmi.toFixed(1)} sub={results.bmiCat} />
              <StatCard label="Masa grasa" value={results.fatKg.toFixed(1) + ' kg'} />
              <StatCard label="Masa magra" value={results.leanKg.toFixed(1) + ' kg'} />
              <StatCard label="Masa muscular est." value={results.muscleKg.toFixed(1) + ' kg'} />
              <StatCard label="Agua corporal est." value={results.water.toFixed(1) + ' L'} />
              <StatCard label="🔥 Metabolismo basal" value={Math.round(results.tmb)} sub="kcal/día en reposo" />
              <StatCard label="⚡ Gasto de mantenimiento" value={Math.round(results.tdee)} sub="kcal/día" accent="text-amber-400" />
              <StatCard label="Peso ideal" value={`${results.idealMin.toFixed(0)}-${results.idealMax.toFixed(0)} kg`} sub="rango saludable" />
            </div>

            <div className="bg-amber-950/40 border border-amber-800/50 rounded-xl p-3 flex gap-2">
              <AlertTriangle className="text-amber-500 shrink-0" size={16} />
              <p className="text-amber-200 text-xs jb-body">El IMC no distingue grasa de músculo. Estos valores son estimaciones de referencia, no un diagnóstico médico.</p>
            </div>

            <div className="bg-zinc-900 border border-orange-500/40 rounded-2xl p-6 text-center">
              <h2 className="jb-display text-xl text-zinc-50 mb-2">¿Y AHORA QUÉ HAGO CON ESTOS NÚMEROS?</h2>
              <p className="jb-body text-sm text-zinc-400 mb-5">
                Con Jonah Beast Fuel armas tu plan de alimentación con comida peruana, sabes qué comer según lo que te queda del día y sigues tu progreso. Pruébala 7 días gratis.
              </p>
              <a href={waUrl} target="_blank" rel="noopener noreferrer" className={btnPrimary + ' w-full py-3 text-base'}>
                <MessageCircle size={18} /> QUIERO PROBARLA GRATIS
              </a>
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

function TrialSignup({ onBack, onCreated }) {
  const [f, setF] = useState({ nombre: '', email: '', usuario: '', telefono: '', password: '', password2: '', referido: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [aviso, setAviso] = useState('');
  const [refEstado, setRefEstado] = useState(null); // {ok, nombre} | {ok:false}
  const [refConfirmado, setRefConfirmado] = useState(false);

  // Verifica el código mientras escribe
  useEffect(() => {
    const cod = f.referido.trim().toUpperCase();
    setRefConfirmado(false);
    if (!cod) { setRefEstado(null); return; }
    const t = setTimeout(async () => {
      try {
        const { data } = await supabase.from('referidores')
          .select('codigo, nombre, activo').ilike('codigo', cod).maybeSingle();
        setRefEstado(data && data.activo ? { ok: true, nombre: data.nombre } : { ok: false });
      } catch { setRefEstado(null); }
    }, 500);
    return () => clearTimeout(t);
  }, [f.referido]);

  async function submit(e) {
    e.preventDefault();
    setErr(''); setAviso('');
    const user = f.usuario.trim().replace(/^@/, '').toLowerCase();
    const email = f.email.trim().toLowerCase();
    if (!f.nombre.trim()) return setErr('Escribe tu nombre.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setErr('Escribe un correo válido.');
    if (!user) return setErr('Elige un nombre de usuario.');
    const tel = f.telefono.replace(/\D/g, '');
    if (tel.length < 9) return setErr('Escribe tu celular de WhatsApp (9 dígitos).');
    if (/[^a-z0-9._-]/.test(user)) return setErr('El usuario solo puede tener letras, números, punto, guion o guion bajo.');
    if (f.password.length < 6) return setErr('La contraseña debe tener al menos 6 caracteres.');
    if (f.password !== f.password2) return setErr('Las contraseñas no coinciden.');
    if (f.referido.trim() && refEstado && !refEstado.ok && !refConfirmado) {
      setRefConfirmado(true);
      return setErr('Ese código de referido no existe o ya no está activo. Revísalo, o toca de nuevo el botón para continuar sin él.');
    }

    setBusy(true);
    try {
      const { data: tomado } = await supabase.from('profiles').select('username').ilike('username', user).maybeSingle();
      if (tomado) { setBusy(false); return setErr('Ese usuario ya está tomado. Elige otro.'); }
    } catch {}

    const { data, error } = await supabase.auth.signUp({
      email, password: f.password,
      options: { data: { username: user, nombre: f.nombre.trim(), telefono: tel, codigo_referido: (refEstado && refEstado.ok) ? f.referido.trim().toUpperCase() : '' } },
    });

    if (error) {
      setBusy(false);
      if ((error.message || '').toLowerCase().includes('already registered'))
        return setErr('Ese correo ya tiene una cuenta. Inicia sesión.');
      return setErr('No se pudo crear tu cuenta: ' + error.message);
    }

    // El registro de alumno y su prueba de 7 días se crean
    // automáticamente en la base de datos al confirmarse la cuenta.

    setBusy(false);
    if (!data.session) {
      setAviso('Revisa tu correo y confirma tu cuenta para entrar. Si no lo ves, mira en spam.');
      return;
    }
    onCreated(user);
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6 py-10">
      <div className="max-w-md w-full">
        <div className="mb-6"><Logo size="lg" /></div>
        <div className="bg-zinc-900 border border-orange-500/40 rounded-2xl p-6">
          <div className="text-center mb-5">
            <div className="jb-display text-2xl text-orange-500 mb-1">7 DÍAS GRATIS</div>
            <p className="jb-body text-sm text-zinc-400">Sin tarjeta. Sin compromiso. Empieza hoy mismo.</p>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 mb-5">
            {['Mide tu composición corporal', 'Arma tu plan con comida peruana', 'Descubre qué comer según lo que te queda', 'Sigue tu progreso día a día'].map(t => (
              <div key={t} className="flex items-center gap-2 text-xs text-zinc-300 jb-body py-0.5">
                <span className="text-emerald-400">✓</span> {t}
              </div>
            ))}
          </div>

          {aviso ? (
            <div className="text-center">
              <MessageCircle className="text-emerald-400 mx-auto mb-3" size={32} />
              <p className="jb-body text-sm text-zinc-200 mb-4">{aviso}</p>
              <button onClick={onBack} className={btnGhost + ' w-full'}>Volver al inicio</button>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-3">
              <Field label="Tu nombre">
                <input value={f.nombre} onChange={e => setF(v => ({ ...v, nombre: e.target.value }))} className={inputCls} placeholder="Ej. María Pérez" />
              </Field>
              <Field label="Correo electrónico">
                <input type="email" inputMode="email" value={f.email} onChange={e => setF(v => ({ ...v, email: e.target.value }))} className={inputCls} placeholder="tucorreo@gmail.com" />
              </Field>
              <Field label="Usuario (para entrar)">
                <input value={f.usuario} onChange={e => setF(v => ({ ...v, usuario: e.target.value }))} className={inputCls} placeholder="ej. maria23" />
              </Field>
              <Field label="Celular (WhatsApp)">
                <input type="tel" inputMode="tel" value={f.telefono}
                  onChange={e => setF(v => ({ ...v, telefono: e.target.value }))}
                  className={inputCls} placeholder="999 888 777" />
              </Field>
              <Field label="Contraseña">
                <input type="password" value={f.password} onChange={e => setF(v => ({ ...v, password: e.target.value }))} className={inputCls} placeholder="Mínimo 6 caracteres" />
              </Field>
              <Field label="Repite tu contraseña">
                <input type="password" value={f.password2} onChange={e => setF(v => ({ ...v, password2: e.target.value }))} className={inputCls} />
              </Field>
              <Field label="Código de referido (opcional)">
                <input value={f.referido} onChange={e => setF(v => ({ ...v, referido: e.target.value }))}
                  className={inputCls + ' uppercase'} placeholder="Si alguien te recomendó, escríbelo aquí" />
              </Field>
              {f.referido.trim() && refEstado && (
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
                {busy ? <Loader2 className="animate-spin" size={18} /> : 'EMPEZAR MI PRUEBA GRATIS'}
              </button>
              <button type="button" onClick={onBack} className="jb-body text-sm text-zinc-500 hover:text-zinc-300 mt-1">← Volver</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function TrialSignupPlaceholder() { return null; }

function AdminAuth({ adminPassExists, onBack, onSetup, onLogin, busy }) {
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');

  function submit(e) {
    e.preventDefault();
    setErr('');
    if (!adminPassExists) {
      if (pass.length < 4) return setErr('La contraseña debe tener al menos 4 caracteres.');
      if (pass !== confirm) return setErr('Las contraseñas no coinciden.');
      onSetup(pass);
    } else {
      onLogin(pass, setErr);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
      <div className="max-w-sm w-full">
        <div className="mb-8"><Logo size="lg" /></div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="jb-display text-xl text-zinc-50 mb-1">{adminPassExists ? 'ACCESO ADMINISTRACIÓN' : 'CREA TU ACCESO'}</h2>
          <p className="jb-body text-sm text-zinc-500 mb-5">
            {adminPassExists ? 'Ingresa tu contraseña de administrador.' : 'Primera vez aquí: define tu contraseña de administrador.'}
          </p>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label="Contraseña">
              <input type="password" value={pass} onChange={e => setPass(e.target.value)} className={inputCls} autoFocus />
            </Field>
            {!adminPassExists && (
              <Field label="Confirmar contraseña">
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className={inputCls} />
              </Field>
            )}
            {err && <p className="text-red-400 text-sm jb-body flex items-center gap-1.5"><AlertTriangle size={14} />{err}</p>}
            <button type="submit" disabled={busy} className={btnPrimary}>
              {busy ? <Loader2 className="animate-spin" size={18} /> : (adminPassExists ? 'Ingresar' : 'Crear y entrar')}
            </button>
            <button type="button" onClick={onBack} className="jb-body text-sm text-zinc-500 hover:text-zinc-300 mt-1">← Volver</button>
          </form>
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
    if (error) return setErr('No se pudo cambiar la contraseña. Pide un enlace nuevo.');
    setListo(true);
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
      <div className="max-w-sm w-full">
        <div className="mb-8"><Logo size="lg" /></div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          {listo ? (
            <div className="text-center">
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

function StudentAuth({ onBack, onLogin, busy, expiredInfo, onClearExpired }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [modo, setModo] = useState('login');
  const [aviso, setAviso] = useState('');

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
    if (!email.trim()) return setErr('Escribe tu correo para enviarte el enlace.');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: window.location.origin,
    });
    if (error) return setErr('No se pudo enviar el correo. Intenta de nuevo.');
    setAviso('Te enviamos un enlace para crear una contraseña nueva. Revisa tu correo (y la carpeta de spam).');
  }

  if (expiredInfo) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6 py-10">
        <div className="max-w-md w-full">
          <div className="mb-6"><Logo size="lg" /></div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-4">
            <h2 className="jb-display text-xl text-zinc-50 mb-2">TU PRUEBA GRATIS TERMINÓ</h2>
            <p className="jb-body text-sm text-zinc-400">
              Pero nada de lo que hiciste se borró. Tu historial completo te está esperando.
            </p>
          </div>
          <TrialSummary stats={expiredInfo.stats} nombre={expiredInfo.nombre} />
          <button onClick={onClearExpired} className="jb-body text-sm text-zinc-500 hover:text-zinc-300 mt-4 w-full text-center">
            ← Volver a intentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
      <div className="max-w-sm w-full">
        <div className="mb-8"><Logo size="lg" /></div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="jb-display text-xl text-zinc-50 mb-1">
            {modo === 'login' ? 'ENTRAR A MI CUENTA' : 'RECUPERAR CONTRASEÑA'}
          </h2>
          <p className="jb-body text-sm text-zinc-500 mb-5">
            {modo === 'login' ? 'Ingresa con el correo que registraste.' : 'Te enviaremos un enlace a tu correo.'}
          </p>

          {aviso ? (
            <div className="text-center">
              <p className="jb-body text-sm text-emerald-300 mb-4">{aviso}</p>
              <button onClick={() => { setAviso(''); setModo('login'); }} className={btnGhost + ' w-full'}>Volver</button>
            </div>
          ) : (
            <form onSubmit={modo === 'login' ? submit : recuperar} className="flex flex-col gap-4">
              <Field label="Correo electrónico">
                <input type="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} autoFocus placeholder="tucorreo@gmail.com" />
              </Field>
              {modo === 'login' && (
                <Field label="Contraseña">
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputCls} />
                </Field>
              )}
              {err && <p className="text-red-400 text-sm jb-body flex items-center gap-1.5"><AlertTriangle size={14} />{err}</p>}
              <button type="submit" disabled={busy} className={btnPrimary}>
                {busy ? <Loader2 className="animate-spin" size={18} /> : (modo === 'login' ? 'Entrar' : 'Enviar enlace')}
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
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

function membershipLabel(u) {
  if (!u.enabled) return { text: 'Deshabilitado por ti', color: 'text-red-400', dot: 'bg-red-500' };
  const dl = daysLeft(u.fechaVencimiento);
  if (dl === null) return { text: 'Activo · sin vencimiento', color: 'text-emerald-400', dot: 'bg-emerald-500' };
  if (dl < 0) return { text: `Vencido hace ${Math.abs(dl)} día(s)`, color: 'text-red-400', dot: 'bg-red-500' };
  if (dl === 0) return { text: 'Vence hoy', color: 'text-amber-400', dot: 'bg-amber-500' };
  if (dl <= 7) return { text: `Vence en ${dl} día(s)`, color: 'text-amber-400', dot: 'bg-amber-500' };
  return { text: `Activo · ${dl} días restantes`, color: 'text-emerald-400', dot: 'bg-emerald-500' };
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
/* PRUEBA GRATIS DE 7 DÍAS                                             */
/* ------------------------------------------------------------------ */

const TRIAL_DAYS = 7;

const TRIAL_JOURNEY = {
  1: { titulo: 'Día 1 · Define tu objetivo', texto: 'Empieza midiendo tu composición corporal, elige tu objetivo y registra tus primeras comidas.', cta: null },
  2: { titulo: 'Día 2 · ¿Cómo vas comiendo?', texto: 'Revisa tu plan de alimentación: mira cuántas calorías llevas frente a tu objetivo del día.', cta: null },
  3: { titulo: 'Día 3 · Recomendaciones para ti', texto: 'Usa el botón "¿Qué puedo comer?" y descubre combinaciones que encajan con lo que te queda del día.', cta: null },
  4: { titulo: 'Día 4 · Tus patrones', texto: 'Ya tienes varios días registrados. Entra a "Mi progreso" y observa cómo se comporta tu alimentación.', cta: null },
  5: { titulo: 'Día 5 · Mira tu avance', texto: null, cta: null },
  6: { titulo: 'Día 6 · Tu prueba termina mañana', texto: 'Todo lo que registraste se queda contigo si continúas. Conserva tu historial y sigue viendo tu progreso.', cta: 'Ver planes' },
  7: { titulo: 'Día 7 · Último día de tu prueba', texto: 'Hoy termina tu acceso gratuito. Continúa y no pierdas nada de lo que has construido estos días.', cta: 'Continuar con Jonah Beast' },
};

function trialDayOf(u) {
  if (!u || u.plan !== 'trial' || !u.fechaInicio) return null;
  const [y, m, d] = u.fechaInicio.split('-').map(Number);
  const inicio = new Date(y, m - 1, d);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const dia = Math.floor((hoy - inicio) / 86400000) + 1;
  return Math.max(1, Math.min(dia, TRIAL_DAYS));
}

function formatActivity(lastActivity) {
  if (!lastActivity) return { text: 'Sin actividad', color: 'text-zinc-500', dot: 'bg-zinc-600' };
  const days = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
  if (days < 1) return { text: 'Hoy', color: 'text-emerald-400', dot: 'bg-emerald-500' };
  if (days === 1) return { text: 'Ayer', color: 'text-emerald-400', dot: 'bg-emerald-500' };
  if (days < 7) return { text: `Hace ${days} días`, color: 'text-amber-400', dot: 'bg-amber-500' };
  if (days < 30) return { text: `Hace ${days} días`, color: 'text-red-400', dot: 'bg-red-500' };
  return { text: `Hace ${Math.floor(days / 30)} mes(es)`, color: 'text-red-400', dot: 'bg-red-500' };
}

function ReferidosPanel({ users, onCambio }) {
  const [refs, setRefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [nuevo, setNuevo] = useState({ codigo: '', nombre: '', telefono: '', comision: 5 });
  const [err, setErr] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [expandido, setExpandido] = useState(null);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    try {
      const { data } = await supabase.from('referidores').select('*').order('created_at', { ascending: false });
      setRefs(data || []);
    } catch { setRefs([]); }
    setLoading(false);
  }

  async function crear(e) {
    e.preventDefault();
    setErr('');
    const cod = nuevo.codigo.trim().toUpperCase().replace(/\s/g, '');
    if (!cod) return setErr('Escribe el código.');
    if (!/^[A-Z0-9._-]+$/.test(cod)) return setErr('El código solo puede tener letras, números, punto, guion o guion bajo.');
    if (!nuevo.nombre.trim()) return setErr('Escribe el nombre de la persona.');
    if (refs.some(r => r.codigo.toUpperCase() === cod)) return setErr('Ese código ya existe.');
    setGuardando(true);
    try {
      const { error } = await supabase.from('referidores').insert({
        codigo: cod, nombre: nuevo.nombre.trim(),
        telefono: nuevo.telefono.trim().replace(/\s/g, '') || null,
        comision: Number(nuevo.comision) || 5, activo: true,
      });
      if (error) throw error;
      setNuevo({ codigo: '', nombre: '', telefono: '', comision: 5 });
      await cargar();
    } catch (e2) { setErr('No se pudo crear: ' + (e2.message || '')); }
    setGuardando(false);
  }

  async function alternar(r) {
    try {
      await supabase.from('referidores').update({ activo: !r.activo }).eq('codigo', r.codigo);
      await cargar();
    } catch {}
  }

  async function marcarPagada(username) {
    try {
      await supabase.from('alumnos')
        .update({ comision_pagada: true, comision_pagada_en: new Date().toISOString() })
        .eq('username', username);
      if (onCambio) await onCambio();
    } catch {}
  }

  async function revertirPago(username) {
    try {
      await supabase.from('alumnos')
        .update({ comision_pagada: false, comision_pagada_en: null })
        .eq('username', username);
      if (onCambio) await onCambio();
    } catch {}
  }

  // Agrupar alumnos por código de referido
  const porCodigo = useMemo(() => {
    const m = {};
    (users || []).forEach(u => {
      if (!u.codigoReferido) return;
      const c = u.codigoReferido.toUpperCase();
      (m[c] = m[c] || []).push(u);
    });
    return m;
  }, [users]);

  const totalPendiente = refs.reduce((acc, r) => {
    const lista = porCodigo[r.codigo.toUpperCase()] || [];
    return acc + lista.filter(u => u.plan === 'pago' && !u.comisionPagada).length * Number(r.comision);
  }, 0);

  const totalReferidos = Object.values(porCodigo).reduce((a, l) => a + l.length, 0);

  function waRef(r, monto, cantidad) {
    const num = (r.telefono || '').replace(/\D/g, '');
    const full = num ? (num.length <= 9 ? '51' + num : num) : '';
    const texto = `Hola ${r.nombre}, te escribo de Jonah Beast Fuel. Tienes ${cantidad} referido(s) que ya pagaron su plan. Tu comisión es de S/${monto.toFixed(2)}.`;
    return full ? `https://wa.me/${full}?text=${encodeURIComponent(texto)}`
                : `https://wa.me/?text=${encodeURIComponent(texto)}`;
  }

  return (
    <div className={`rounded-2xl overflow-hidden border ${totalPendiente > 0 ? 'bg-zinc-900 border-emerald-700/50' : 'bg-zinc-900 border-zinc-800'}`}>
      <button onClick={() => setOpen(v => !v)} className="w-full px-5 py-4 flex items-center justify-between text-left">
        <h2 className="jb-display text-base text-zinc-200">
          🤝 REFERIDOS · {totalReferidos} inscritos
          {totalPendiente > 0 && (
            <span className="ml-2 bg-emerald-500 text-zinc-950 text-xs px-2 py-0.5 rounded-full">
              S/{totalPendiente.toFixed(0)} por pagar
            </span>
          )}
        </h2>
        <ChevronRight size={18} className={`text-zinc-500 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-zinc-800 pt-4 flex flex-col gap-5">
          <div>
            <h3 className="jb-display text-sm text-zinc-300 mb-2">CREAR CÓDIGO</h3>
            <p className="jb-body text-xs text-zinc-500 mb-3">
              Entrégale el código a la persona. Cuando alguien se registre con él, aparecerá aquí.
            </p>
            <form onSubmit={crear} className="grid sm:grid-cols-5 gap-2 items-end">
              <Field label="Código">
                <input value={nuevo.codigo} onChange={e => setNuevo(v => ({ ...v, codigo: e.target.value }))}
                  className={inputCls + ' uppercase'} placeholder="COACHJUAN" />
              </Field>
              <Field label="Nombre">
                <input value={nuevo.nombre} onChange={e => setNuevo(v => ({ ...v, nombre: e.target.value }))}
                  className={inputCls} placeholder="Juan Pérez" />
              </Field>
              <Field label="Celular">
                <input type="tel" inputMode="tel" value={nuevo.telefono}
                  onChange={e => setNuevo(v => ({ ...v, telefono: e.target.value }))}
                  className={inputCls} placeholder="999888777" />
              </Field>
              <Field label="Comisión S/">
                <input type="number" step="0.5" value={nuevo.comision}
                  onChange={e => setNuevo(v => ({ ...v, comision: e.target.value }))}
                  className={inputCls} />
              </Field>
              <button type="submit" disabled={guardando} className={btnPrimary}>
                {guardando ? <Loader2 className="animate-spin" size={16} /> : <><Plus size={16} /> Crear</>}
              </button>
            </form>
            {err && <p className="text-red-400 text-sm jb-body mt-2 flex items-center gap-1.5"><AlertTriangle size={14} />{err}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="jb-display text-sm text-zinc-300">CÓDIGOS ACTIVOS</h3>
              <button onClick={cargar} className={btnGhost + ' py-1 px-3 text-xs'}>Actualizar</button>
            </div>

            {loading ? (
              <Loader2 className="animate-spin text-orange-500" size={20} />
            ) : refs.length === 0 ? (
              <p className="text-zinc-500 text-sm">Aún no has creado códigos.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {refs.map(r => {
                  const lista = porCodigo[r.codigo.toUpperCase()] || [];
                  const pagaron = lista.filter(u => u.plan === 'pago');
                  const porPagar = pagaron.filter(u => !u.comisionPagada);
                  const yaPagados = pagaron.filter(u => u.comisionPagada);
                  const montoPend = porPagar.length * Number(r.comision);
                  const abierto = expandido === r.codigo;

                  return (
                    <div key={r.codigo} className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
                      <div className="p-3 flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="jb-display text-sm text-orange-500">{r.codigo}</span>
                            <span className="text-zinc-100 text-sm jb-body">{r.nombre}</span>
                            {!r.activo && <span className="text-red-400 text-xs jb-body">(desactivado)</span>}
                          </div>
                          <div className="text-zinc-500 text-xs jb-body mt-0.5">
                            {lista.length} inscrito(s) · {pagaron.length} pagaron · S/{Number(r.comision).toFixed(2)} c/u
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {montoPend > 0 && (
                            <>
                              <span className="jb-display text-sm text-emerald-400">S/{montoPend.toFixed(2)}</span>
                              <a href={waRef(r, montoPend, porPagar.length)} target="_blank" rel="noopener noreferrer"
                                className={btnGhost + ' py-1.5 px-3 text-xs'}>
                                <MessageCircle size={13} />
                              </a>
                            </>
                          )}
                          {lista.length > 0 && (
                            <button onClick={() => setExpandido(abierto ? null : r.codigo)}
                              className={btnGhost + ' py-1.5 px-3 text-xs'}>
                              {abierto ? 'Ocultar' : 'Ver referidos'}
                            </button>
                          )}
                          <button onClick={() => alternar(r)}
                            className={(r.activo ? btnDanger : btnGhost) + ' py-1.5 px-3 text-xs'}>
                            {r.activo ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      </div>

                      {abierto && (
                        <div className="border-t border-zinc-800 p-3 flex flex-col gap-2">
                          {lista.map(u => {
                            const pago = u.plan === 'pago';
                            return (
                              <div key={u.username} className="flex items-center justify-between gap-3 flex-wrap bg-zinc-900 rounded-lg p-2.5">
                                <div>
                                  <div className="text-zinc-100 text-sm jb-body">{u.nombre || u.username}</div>
                                  <div className="text-xs jb-body">
                                    <span className={pago ? 'text-emerald-400' : 'text-zinc-500'}>
                                      {pago ? '✓ Pagó su plan' : 'En prueba gratis'}
                                    </span>
                                    {u.comisionPagada && (
                                      <span className="text-zinc-500"> · comisión pagada</span>
                                    )}
                                  </div>
                                </div>
                                {pago && (
                                  u.comisionPagada ? (
                                    <button onClick={() => revertirPago(u.username)}
                                      className="jb-body text-xs text-zinc-600 hover:text-zinc-400">
                                      Revertir
                                    </button>
                                  ) : (
                                    <button onClick={() => marcarPagada(u.username)}
                                      className={btnPrimary + ' py-1.5 px-3 text-xs'}>
                                      Pagué S/{Number(r.comision).toFixed(2)}
                                    </button>
                                  )
                                )}
                              </div>
                            );
                          })}
                          {yaPagados.length > 0 && (
                            <p className="jb-body text-[11px] text-zinc-600 mt-1">
                              {yaPagados.length} comisión(es) ya liquidada(s) con este código.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <p className="jb-body text-[11px] text-zinc-600">
            La comisión se marca como pagada solo cuando el alumno ya pagó su plan. Los que están en prueba gratis aún no generan comisión.
          </p>
        </div>
      )}
    </div>
  );
}

function LeadsPanel() {
  const [leads, setLeads] = useState([]);
  const [code, setCode] = useState('');
  const [savedCode, setSavedCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(100);
      setLeads(data || []);
    } catch { setLeads([]); }
    try {
      const { data } = await supabase.from('config').select('value').eq('key', 'access_code').maybeSingle();
      const c = data ? data.value : '';
      setCode(c); setSavedCode(c);
    } catch {}
    setLoading(false);
  }

  async function saveCode() {
    const c = code.trim().toUpperCase();
    if (!c) return;
    try { await supabase.from('config').upsert({ key: 'access_code', value: c }); } catch {}
    setCode(c); setSavedCode(c);
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full px-5 py-4 flex items-center justify-between text-left">
        <h2 className="jb-display text-base text-zinc-200">📏 CALCULADORA GRATIS · {leads.length} personas medidas</h2>
        <ChevronRight size={18} className={`text-zinc-500 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 flex flex-col gap-5 border-t border-zinc-800 pt-4">
          <div>
            <h3 className="jb-display text-sm text-zinc-300 mb-2">CÓDIGO DE ACCESO</h3>
            <p className="jb-body text-xs text-zinc-500 mb-3">Compártelo solo en tus lives o stories. Cámbialo cuando quieras.</p>
            <div className="flex gap-2 items-end flex-wrap">
              <input value={code} onChange={e => setCode(e.target.value)}
                className={inputCls + ' uppercase w-40'} placeholder="Ej. BEAST" />
              <button onClick={saveCode} disabled={code.trim().toUpperCase() === savedCode} className={btnPrimary + ' text-sm'}>
                {code.trim().toUpperCase() === savedCode ? 'Guardado' : 'Guardar código'}
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="jb-display text-sm text-zinc-300">PERSONAS QUE SE MIDIERON</h3>
              <button onClick={load} className={btnGhost + ' py-1 px-3 text-xs'}>Actualizar</button>
            </div>
            {loading ? (
              <Loader2 className="animate-spin text-orange-500" size={20} />
            ) : leads.length === 0 ? (
              <p className="text-zinc-500 text-sm">Aún nadie se ha medido con el código.</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                {leads.map(l => (
                  <div key={l.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-zinc-100 text-sm font-medium">{l.nombre || 'Sin nombre'}</div>
                      <div className="text-zinc-500 text-xs">
                        {l.telefono || 'sin celular'} · {l.red} · {new Date(l.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                      </div>
                    </div>
                    <div className="text-xs text-zinc-400 jb-body">
                      {l.grasa_pct}% grasa · IMC {l.imc} · {l.tdee} kcal
                    </div>
                    <a href={l.telefono
                      ? `https://wa.me/${l.telefono.replace(/\D/g,'').length <= 9 ? '51' + l.telefono.replace(/\D/g,'') : l.telefono.replace(/\D/g,'')}?text=${encodeURIComponent(`Hola ${l.nombre || ''}, vi que te mediste en Jonah Beast Fuel. ¿Quieres que revisemos tus resultados juntos?`)}`
                      : `https://wa.me/?text=${encodeURIComponent('Hola, vi que te mediste en Jonah Beast Fuel.')}`}
                      target="_blank" rel="noopener noreferrer" className={btnGhost + ' py-1 px-3 text-xs'}>
                      <MessageCircle size={13} /> Contactar
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminDashboard({ users, onAddUser, onToggleUser, onDeleteUser, onLogout, onViewStudent, onRenew, onRecargar }) {
  const [newUser, setNewUser] = useState({ username: '', password: '', nombre: '', telefono: '', fechaInicio: todayISO(), meses: 1 });
  const [formErr, setFormErr] = useState('');

  function submitNew(e) {
    e.preventDefault();
    setFormErr('');
    const uname = newUser.username.trim();
    if (!uname || !newUser.password) return setFormErr('Completa usuario y contraseña.');
    if (!newUser.telefono.trim()) return setFormErr('Ingresa el celular del alumno.');
    if (users.some(u => u.username.toLowerCase() === uname.toLowerCase())) return setFormErr('Ese usuario ya existe.');
    const inicio = newUser.fechaInicio || todayISO();
    const meses = Number(newUser.meses) || 1;
    onAddUser({
      username: uname, password: newUser.password, enabled: true, createdAt: new Date().toISOString(),
      nombre: newUser.nombre.trim(), telefono: newUser.telefono.trim().replace(/\s/g, ''),
      fechaInicio: inicio, fechaVencimiento: addMonthsISO(inicio, meses),
    });
    setNewUser({ username: '', password: '', nombre: '', telefono: '', fechaInicio: todayISO(), meses: 1 });
  }

  return (
    <div className="min-h-screen bg-zinc-950 jb-body">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <Logo />
        <button onClick={onLogout} className={btnGhost}><LogOut size={16} /> Salir</button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-8">
        <div>
          <h1 className="jb-display text-2xl text-zinc-50 mb-1">PANEL DE ADMINISTRACIÓN</h1>
          <p className="text-zinc-500 text-sm">Gestiona usuarios, pagos y suscripciones.</p>
        </div>

        <ReferidosPanel users={users} onCambio={onRecargar} />

        <VencimientosPanel users={users} onRenew={onRenew} />

        <PagosPanel />

        <LeadsPanel />

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h2 className="jb-display text-base text-zinc-200 mb-4 flex items-center gap-2"><UserPlus size={18} className="text-orange-500" /> NUEVO ALUMNO</h2>
          <form onSubmit={submitNew} className="grid sm:grid-cols-3 gap-3 items-end">
            <Field label="Nombre completo">
              <input value={newUser.nombre} onChange={e => setNewUser(v => ({ ...v, nombre: e.target.value }))} className={inputCls} placeholder="Ej. María Pérez" />
            </Field>
            <Field label="Celular (WhatsApp)">
              <input type="tel" inputMode="tel" value={newUser.telefono} onChange={e => setNewUser(v => ({ ...v, telefono: e.target.value }))} className={inputCls} placeholder="999888777" />
            </Field>
            <Field label="Usuario">
              <input value={newUser.username} onChange={e => setNewUser(v => ({ ...v, username: e.target.value }))} className={inputCls} placeholder="ej. maria23" />
            </Field>
            <Field label="Contraseña">
              <input value={newUser.password} onChange={e => setNewUser(v => ({ ...v, password: e.target.value }))} className={inputCls} placeholder="Contraseña temporal" />
            </Field>
            <Field label="Inicio de membresía">
              <input type="date" value={newUser.fechaInicio} onChange={e => setNewUser(v => ({ ...v, fechaInicio: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Duración">
              <select value={newUser.meses} onChange={e => setNewUser(v => ({ ...v, meses: Number(e.target.value) }))} className={inputCls}>
                <option value={1}>1 mes</option>
                <option value={2}>2 meses</option>
                <option value={3}>3 meses</option>
                <option value={6}>6 meses</option>
                <option value={12}>12 meses</option>
              </select>
            </Field>
            <button type="submit" className={btnPrimary}><Plus size={16} /> Agregar alumno</button>
          </form>
          {formErr && <p className="text-red-400 text-sm mt-2 flex items-center gap-1.5"><AlertTriangle size={14} />{formErr}</p>}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800">
            <h2 className="jb-display text-base text-zinc-200">ALUMNOS ({users.length})</h2>
          </div>
          {users.length === 0 ? (
            <p className="text-zinc-500 text-sm px-5 py-8 text-center">Aún no has agregado alumnos.</p>
          ) : (
            <div className="divide-y divide-zinc-800">
              {users.map(u => {
                const ms = membershipLabel(u);
                const act = formatActivity(u.lastActivity);
                const activo = membershipActive(u);
                return (
                <div key={u.username} className="px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${activo ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <div>
                      <div className="text-zinc-100 font-medium">
                        {u.nombre ? `${u.nombre} · ${u.username}` : u.username}
                      </div>
                      <div className="text-zinc-500 text-xs flex items-center gap-2 flex-wrap">
                        <span className={`flex items-center gap-1 ${ms.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${ms.dot}`} />
                          {ms.text}
                        </span>
                        <span className="text-zinc-700">·</span>
                        <span className={act.color}>{act.text}</span>
                        {u.codigoReferido && (
                          <>
                            <span className="text-zinc-700">·</span>
                            <span className="text-orange-500">ref: {u.codigoReferido}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {u.telefono && (
                      <a href={`https://wa.me/${u.telefono.replace(/\D/g, '').length <= 9 ? '51' + u.telefono.replace(/\D/g, '') : u.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${u.nombre || u.username}, te escribo de Jonah Beast.`)}`}
                        target="_blank" rel="noopener noreferrer" className={btnGhost + ' py-1.5 px-3 text-sm'}>
                        <MessageCircle size={14} />
                      </a>
                    )}
                    <button onClick={() => onRenew(u.username, 1)} className={btnGhost + ' py-1.5 px-3 text-sm'} title="Renovar 1 mes">
                      +1 mes
                    </button>
                    <button onClick={() => onViewStudent(u.username)} className={btnGhost + ' py-1.5 px-3 text-sm'}><Eye size={14} /> Ver datos</button>
                    <button onClick={() => onToggleUser(u.username)} className={(u.enabled ? btnDanger : btnGhost) + ' py-1.5 px-3 text-sm'}>
                      {u.enabled ? 'Deshabilitar' : 'Habilitar'}
                    </button>
                    <button onClick={() => onDeleteUser(u.username)} className="text-zinc-600 hover:text-red-400 transition-colors p-2"><Trash2 size={16} /></button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StudentDataModal({ username, data, onClose }) {
  const results = useMemo(() => (data?.form ? calcAll(data.form) : null), [data]);
  const [fotos, setFotos] = useState([]);
  const [fotoUrls, setFotoUrls] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const { data: filas } = await supabase.from('fotos_progreso').select('*')
          .eq('username', username).order('fecha', { ascending: false }).limit(60);
        const lista = filas || [];
        setFotos(lista);
        if (lista.length) {
          const rutas = lista.map(f => f.ruta);
          const { data: signed } = await supabase.storage.from('fotos-progreso').createSignedUrls(rutas, 3600);
          const u = {};
          (signed || []).forEach(s => { if (s.signedUrl) u[s.path] = s.signedUrl; });
          setFotoUrls(u);
        }
      } catch {}
    })();
  }, [username]);

  const sesionesFotos = useMemo(() => {
    const porFecha = {};
    fotos.forEach(f => {
      if (!porFecha[f.fecha]) porFecha[f.fecha] = { fecha: f.fecha, peso: f.peso, fotos: {} };
      porFecha[f.fecha].fotos[f.angulo] = f;
    });
    return Object.values(porFecha).sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [fotos]);
  const totals = useMemo(() => {
    if (!data?.mealPlan) return null;
    const t = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    Object.values(data.mealPlan.meals).forEach(entries => entries.forEach(en => {
      const m = entryMacros(en);
      t.kcal += m.kcal; t.protein += m.protein; t.carbs += m.carbs; t.fat += m.fat;
    }));
    return t;
  }, [data]);

  const objetivoAlumno = data?.form?.objetivo || '';
  const diffKcal = totals && data?.mealPlan ? totals.kcal - data.mealPlan.targetKcal : 0;
  const sinRegistrar = !data?.mealPlan?.meals
    || MEAL_NAMES.every(m => !(data.mealPlan.meals[m] || []).length);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[88vh] overflow-y-auto p-6 jb-body" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="jb-display text-xl text-zinc-50">{username}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200"><X size={20} /></button>
        </div>
        {!results ? (
          <p className="text-zinc-500 text-sm">Este alumno todavía no ha registrado sus datos.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <StatCard label="IMC" value={results.bmi.toFixed(1)} sub={results.bmiCat} />
              <StatCard label="% Grasa" value={results.bf.toFixed(1) + '%'} sub={results.bfCat} />
              <StatCard label="🔥 Metabolismo basal" value={Math.round(results.tmb)} sub="kcal/día" />
              <StatCard label="⚡ Gasto de mantenimiento" value={Math.round(results.tdee)} sub="kcal/día" />
            </div>
            {totals && (
              <div className="border-t border-zinc-800 pt-4">
                <h3 className="jb-display text-sm text-zinc-300 mb-2">PLAN DE ALIMENTACIÓN — TOTAL DEL DÍA</h3>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div><div className="text-orange-500 jb-display text-lg">{Math.round(totals.kcal)}</div><div className="text-zinc-500 text-xs">kcal</div></div>
                  <div><div className="text-orange-500 jb-display text-lg">{Math.round(totals.protein)}</div><div className="text-zinc-500 text-xs">prot g</div></div>
                  <div><div className="text-orange-500 jb-display text-lg">{Math.round(totals.carbs)}</div><div className="text-zinc-500 text-xs">carb g</div></div>
                  <div><div className="text-orange-500 jb-display text-lg">{Math.round(totals.fat)}</div><div className="text-zinc-500 text-xs">grasa g</div></div>
                </div>
                <p className="text-zinc-500 text-xs mt-2">
                  Objetivo: {data.mealPlan.targetKcal} kcal/día
                  {objetivoAlumno && ` · Meta: ${objetivoAlumno}`}
                  {' · '}
                  <span className={diffKcal > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                    {diffKcal > 0 ? '+' : ''}{Math.round(diffKcal)} kcal vs. objetivo
                  </span>
                </p>
              </div>
            )}

            <div className="border-t border-zinc-800 pt-4 mt-4">
              <h3 className="jb-display text-sm text-zinc-300 mb-3">QUÉ ESTÁ COMIENDO</h3>
              {MEAL_NAMES.map(meal => {
                const entries = (data.mealPlan?.meals?.[meal]) || [];
                const mt = entries.reduce((acc, en) => {
                  const m = entryMacros(en);
                  return { kcal: acc.kcal + m.kcal, protein: acc.protein + m.protein };
                }, { kcal: 0, protein: 0 });
                return (
                  <div key={meal} className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="jb-display text-xs text-orange-500">{meal.toUpperCase()}</span>
                      {entries.length > 0 && (
                        <span className="text-zinc-500 text-xs">{Math.round(mt.kcal)} kcal · P {Math.round(mt.protein)}g</span>
                      )}
                    </div>
                    {entries.length === 0 ? (
                      <p className="text-zinc-600 text-xs italic">Sin registrar</p>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {entries.map(en => {
                          const m = entryMacros(en);
                          const food = FOODS.find(f => f.key === en.foodKey);
                          const cant = en.unit ? `${en.qty} ${en.unit}` : `${en.grams} g`;
                          return (
                            <div key={en.id} className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 flex items-center justify-between gap-2 text-xs">
                              <span className="text-zinc-200">{food ? food.name : en.foodKey} <span className="text-zinc-500">({cant})</span></span>
                              <span className="text-zinc-400 shrink-0">
                                {Math.round(m.kcal)} kcal · P {m.protein.toFixed(0)} · C {m.carbs.toFixed(0)} · G {m.fat.toFixed(0)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {sinRegistrar && (
                <p className="text-zinc-600 text-xs italic mt-2">Este alumno todavía no ha registrado ninguna comida.</p>
              )}
            </div>

            {sesionesFotos.length > 0 && (
              <div className="border-t border-zinc-800 pt-4 mt-4">
                <h3 className="jb-display text-sm text-zinc-300 mb-3">📸 FOTOS DE PROGRESO</h3>
                <div className="flex flex-col gap-3">
                  {sesionesFotos.slice(0, 4).map(s2 => (
                    <div key={s2.fecha}>
                      <p className="jb-body text-xs text-zinc-400 mb-1.5">
                        {new Date(s2.fecha + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
                        {s2.peso && <span className="text-zinc-600"> · {s2.peso} kg</span>}
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {ANGULOS.map(a => {
                          const f = s2.fotos[a.id];
                          return f && fotoUrls[f.ruta] ? (
                            <a key={a.id} href={fotoUrls[f.ruta]} target="_blank" rel="noopener noreferrer" title={a.label}>
                              <img src={fotoUrls[f.ruta]} alt={a.label}
                                className="w-full aspect-[3/4] object-cover rounded-lg hover:opacity-80 transition-opacity" />
                            </a>
                          ) : (
                            <div key={a.id} className="w-full aspect-[3/4] bg-zinc-950 rounded-lg border border-zinc-800" />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {data.form?.pesoObjetivo && (
              <div className="border-t border-zinc-800 pt-4 mt-4">
                <h3 className="jb-display text-sm text-zinc-300 mb-2">META DE PESO</h3>
                <p className="text-zinc-400 text-sm">
                  {data.form.pesoInicial ? `${data.form.pesoInicial} kg → ` : ''}
                  <span className="text-zinc-100">{data.form.peso} kg</span> → {data.form.pesoObjetivo} kg objetivo
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* STUDENT DASHBOARD                                                    */
/* ------------------------------------------------------------------ */

function goalTargets(form, tdee) {
  const goal = form.objetivo || '';
  if (!goal) return null;
  const defaultPct = GOALS[goal].pct;
  const pct = form.ajustePct === null || form.ajustePct === undefined ? defaultPct : Number(form.ajustePct);
  const kcal = tdee * (1 + pct / 100);
  const protein = (Number(form.peso) || 0) * 2;
  const fat = (kcal * 0.25) / 9;
  const carbs = Math.max((kcal - protein * 4 - fat * 9) / 4, 0);
  return { goal, pct, kcal, protein, carbs, fat };
}

function GoalSelector({ form, setForm, tdee, peso }) {
  const goal = form.objetivo || '';
  const defaultPct = goal ? GOALS[goal].pct : 0;
  const pct = form.ajustePct === null || form.ajustePct === undefined ? defaultPct : Number(form.ajustePct);

  function pickGoal(g) {
    setForm(v => ({ ...v, objetivo: g, ajustePct: GOALS[g].pct }));
  }

  const t = goalTargets(form, tdee);
  const targetKcal = t ? t.kcal : 0;
  const proteinG = t ? t.protein : 0;
  const fatG = t ? t.fat : 0;
  const carbsG = t ? t.carbs : 0;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <AyudaTab texto="Elige qué quieres lograr y la app calcula cuántas calorías y proteína necesitas al día. Puedes ajustar el porcentaje si un profesional te indica otro." />
      <h2 className="jb-display text-base text-zinc-200 mb-1">🎯 ¿CUÁL ES TU OBJETIVO?</h2>
      <p className="jb-body text-xs text-zinc-500 mb-4">Elige uno y calculamos tus calorías y macros diarios.</p>

      <div className="grid sm:grid-cols-3 gap-3">
        {Object.entries(GOALS).map(([name, g]) => (
          <button key={name} onClick={() => pickGoal(name)}
            className={`rounded-xl p-4 text-left transition-colors border ${goal === name ? 'bg-orange-500 border-orange-500 text-zinc-950' : 'bg-zinc-950 border-zinc-800 hover:border-orange-500 text-zinc-100'}`}>
            <div className="text-xl mb-1">{g.emoji}</div>
            <div className="jb-display text-sm">{name.toUpperCase()}</div>
            <div className={`jb-body text-[11px] mt-0.5 ${goal === name ? 'text-zinc-800' : 'text-zinc-500'}`}>{g.desc}</div>
          </button>
        ))}
      </div>

      {goal && (
        <div className="mt-5 flex flex-col gap-4">
          <div className="flex items-end gap-3 flex-wrap">
            <Field label="Ajuste sobre mantenimiento (%)">
              <input type="number" className={inputCls + ' w-32'} value={pct}
                onChange={e => setForm(v => ({ ...v, ajustePct: e.target.value === '' ? 0 : Number(e.target.value) }))} />
            </Field>
            <p className="jb-body text-xs text-zinc-500 pb-2">
              Recomendado: {GOALS[goal].pct > 0 ? '+' : ''}{GOALS[goal].pct}% · puedes ajustarlo
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Calorías objetivo" value={Math.round(targetKcal)} sub="kcal/día" accent="text-amber-400" />
            <StatCard label="Proteína" value={Math.round(proteinG) + ' g'} sub="2 g por kg de peso" />
            <StatCard label="Carbohidratos" value={Math.round(Math.max(carbsG, 0)) + ' g'} />
            <StatCard label="Grasas" value={Math.round(fatG) + ' g'} sub="25% de las calorías" />
          </div>

          <div className="bg-amber-950/40 border border-amber-800/50 rounded-xl p-3 flex gap-2">
            <AlertTriangle className="text-amber-500 shrink-0" size={16} />
            <p className="text-amber-200 text-xs jb-body">Estos valores son una estimación de referencia, no una prescripción médica. Consúltalo con un profesional de la salud antes de aplicarlo.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function CalculatorTab({ form, setForm, results }) {
  const num = (k) => ({
    value: form[k],
    onChange: (e) => setForm(v => ({ ...v, [k]: e.target.value === '' ? '' : Number(e.target.value) })),
  });
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="lg:col-span-2">
        <AyudaTab texto="Ingresa tus medidas con una cinta métrica. Toca «¿Cómo medir?» junto a cada campo si tienes dudas. No necesitas hacerlo todos los días: tus datos quedan guardados y solo debes actualizarlos cada 2 semanas o cuando cambie tu peso." />
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h2 className="jb-display text-base text-zinc-200 mb-4">TUS DATOS</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sexo">
            <select value={form.sexo} onChange={e => setForm(v => ({ ...v, sexo: e.target.value }))} className={inputCls}>
              <option value="M">Hombre</option>
              <option value="F">Mujer</option>
            </select>
          </Field>
          <Field label="Edad (años)"><input type="number" className={inputCls} {...num('edad')} /></Field>
          <Field label="Estatura (cm)"><input type="number" className={inputCls} {...num('estatura')} /></Field>
          <Field label="Peso (kg)"><input type="number" className={inputCls} {...num('peso')} /></Field>
          <Field label="Cuello (cm)" helpHref="/guia-cuello.jpg"><input type="number" className={inputCls} {...num('cuello')} /></Field>
          <Field label="Cintura (cm)" helpHref="/guia-cintura.jpg"><input type="number" className={inputCls} {...num('cintura')} /></Field>
          <Field label="Cadera (cm)" helpHref="/guia-cadera.jpg"><input type="number" className={inputCls} {...num('cadera')} /></Field>
          <Field label="Actividad física">
            <select value={form.actividad} onChange={e => setForm(v => ({ ...v, actividad: e.target.value }))} className={inputCls}>
              {Object.keys(ACTIVITY_FACTORS).map(a => <option key={a} value={a}>{a} — {ACTIVITY_DESC[a]}</option>)}
            </select>
          </Field>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="IMC" value={results.bmi.toFixed(1)} sub={results.bmiCat} />
          <StatCard label="% Grasa corporal" value={results.bf.toFixed(1) + '%'} sub={results.bfCat} />
          <StatCard label="Masa grasa" value={results.fatKg.toFixed(1) + ' kg'} />
          <StatCard label="Masa magra" value={results.leanKg.toFixed(1) + ' kg'} />
          <StatCard label="Masa muscular est." value={results.muscleKg.toFixed(1) + ' kg'} />
          <StatCard label="Agua corporal est." value={results.water.toFixed(1) + ' L'} />
          <StatCard label="🔥 Metabolismo basal" value={Math.round(results.tmb)} sub="kcal/día en reposo" />
          <StatCard label="⚡ Gasto de mantenimiento" value={Math.round(results.tdee)} sub="kcal/día con tu actividad" accent="text-amber-400" />
          <StatCard label="Relación cintura-cadera" value={results.iccVal.toFixed(2)} sub={results.iccCat} />
          <StatCard label="Peso ideal" value={`${results.idealMin.toFixed(0)}-${results.idealMax.toFixed(0)} kg`} sub="rango saludable" />
        </div>
        <div className="bg-amber-950/40 border border-amber-800/50 rounded-xl p-3 flex gap-2">
          <AlertTriangle className="text-amber-500 shrink-0" size={16} />
          <p className="text-amber-200 text-xs jb-body">El IMC no distingue grasa de músculo: una persona muy musculosa puede salir "sobrepeso" sin serlo. Úsalo junto al % de grasa corporal.</p>
        </div>
      </div>
    </div>
  );
}

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

function TrialSummary({ stats, nombre, compacto }) {
  if (!stats) return null;
  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hola, terminé mi prueba en Jonah Beast. Registré ${stats.comidas} comidas${stats.adherencia !== null ? ` y cumplí mi objetivo el ${stats.adherencia}% de los días` : ''}. Quiero continuar, ¿cuáles son los planes?`)}`;

  return (
    <div className={`rounded-2xl border border-orange-500/50 bg-orange-950/30 ${compacto ? 'p-4' : 'p-6'}`}>
      <h3 className={`jb-display text-orange-400 mb-3 ${compacto ? 'text-sm' : 'text-lg'}`}>
        ESTO CONSTRUISTE {nombre ? `, ${nombre.split(' ')[0].toUpperCase()}` : ''}
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

      <a href={waUrl} target="_blank" rel="noopener noreferrer" className={btnPrimary + ' w-full py-3'}>
        <MessageCircle size={18} /> QUIERO CONTINUAR
      </a>
    </div>
  );
}

function RenewalBanner({ user, onRenovar }) {
  if (!user || user.plan === 'trial') return null;
  const dl = daysLeft(user.fechaVencimiento);
  if (dl === null || dl > 7) return null;

  const vencido = dl < 0;
  const hoy = dl === 0;
  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hola, soy ${user.nombre || user.username} y quiero renovar mi plan de Jonah Beast Fuel.`)}`;

  return (
    <div className={`rounded-2xl p-4 mb-6 border ${vencido || hoy
      ? 'bg-orange-950/40 border-orange-500/60' : 'bg-amber-950/30 border-amber-700/50'}`}>
      <div className="flex items-start gap-3">
        <CreditCard className={vencido || hoy ? 'text-orange-400 shrink-0' : 'text-amber-400 shrink-0'} size={20} />
        <div className="flex-1">
          <p className={`jb-display text-sm mb-1 ${vencido || hoy ? 'text-orange-400' : 'text-amber-400'}`}>
            {vencido ? 'TU PLAN VENCIÓ' : hoy ? 'TU PLAN VENCE HOY' : `TU PLAN VENCE EN ${dl} DÍA${dl > 1 ? 'S' : ''}`}
          </p>
          <p className="jb-body text-sm text-zinc-300">
            {vencido
              ? 'Renueva para seguir registrando tus comidas y no perder el seguimiento de tu progreso.'
              : 'Renueva ahora y sigue sin interrupciones. Tu historial y tus fotos se mantienen intactos.'}
          </p>
          <div className="flex gap-2 mt-3 flex-wrap">
            <button onClick={onRenovar} className={btnPrimary + ' py-2 px-4 text-sm'}>
              Renovar mi plan
            </button>
            <a href={waUrl} target="_blank" rel="noopener noreferrer" className={btnGhost + ' py-2 px-4 text-sm'}>
              <MessageCircle size={14} /> Consultar
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function VencimientosPanel({ users, onRenew }) {
  const [open, setOpen] = useState(true);

  const porVencer = useMemo(() => {
    return (users || [])
      .filter(u => u.fechaVencimiento && u.enabled)
      .map(u => ({ ...u, dl: daysLeft(u.fechaVencimiento) }))
      .filter(u => u.dl !== null && u.dl <= 7)
      .sort((a, b) => a.dl - b.dl);
  }, [users]);

  if (porVencer.length === 0) return null;

  function waLinkAlumno(u) {
    const num = (u.telefono || '').replace(/\D/g, '');
    const full = num ? (num.length <= 9 ? '51' + num : num) : '';
    const dl = u.dl;
    const texto = dl < 0
      ? `Hola ${u.nombre || u.username}, tu plan de Jonah Beast Fuel venció hace ${Math.abs(dl)} día(s). ¿Te ayudo a renovarlo para que no pierdas tu progreso?`
      : dl === 0
        ? `Hola ${u.nombre || u.username}, tu plan de Jonah Beast Fuel vence hoy. ¿Lo renovamos para que sigas sin interrupciones?`
        : `Hola ${u.nombre || u.username}, te escribo porque tu plan de Jonah Beast Fuel vence en ${dl} día(s). ¿Quieres renovarlo?`;
    return full ? `https://wa.me/${full}?text=${encodeURIComponent(texto)}`
                : `https://wa.me/?text=${encodeURIComponent(texto)}`;
  }

  return (
    <div className="bg-zinc-900 border border-amber-700/50 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full px-5 py-4 flex items-center justify-between text-left">
        <h2 className="jb-display text-base text-zinc-200">
          ⏰ POR VENCER
          <span className="ml-2 bg-amber-500 text-zinc-950 text-xs px-2 py-0.5 rounded-full">{porVencer.length}</span>
        </h2>
        <ChevronRight size={18} className={`text-zinc-500 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-zinc-800 pt-4">
          <p className="jb-body text-xs text-zinc-500 mb-3">
            Escríbeles antes de que venzan. Un mensaje a tiempo evita que se caigan.
          </p>
          <div className="flex flex-col gap-2">
            {porVencer.map(u => (
              <div key={u.username} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-zinc-100 text-sm font-medium jb-body">
                    {u.nombre ? `${u.nombre} · ${u.username}` : u.username}
                  </div>
                  <div className={`text-xs jb-body ${u.dl < 0 ? 'text-red-400' : u.dl <= 2 ? 'text-orange-400' : 'text-amber-400'}`}>
                    {u.dl < 0 ? `Venció hace ${Math.abs(u.dl)} día(s)` : u.dl === 0 ? 'Vence hoy' : `Vence en ${u.dl} día(s)`}
                    {u.plan === 'trial' ? ' · prueba gratis' : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a href={waLinkAlumno(u)} target="_blank" rel="noopener noreferrer"
                    className={btnPrimary + ' py-1.5 px-3 text-xs'}>
                    <MessageCircle size={13} /> Recordar
                  </a>
                  <button onClick={() => onRenew(u.username, 1)} className={btnGhost + ' py-1.5 px-3 text-xs'}>
                    +1 mes
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TrialBanner({ user }) {
  const dia = trialDayOf(user);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (dia && dia >= 5 && user) fetchTrialStats(user.username).then(setStats);
  }, [dia, user?.username]);

  if (!dia) return null;
  const j = TRIAL_JOURNEY[dia];
  const restantes = TRIAL_DAYS - dia;
  const urgente = dia >= 6;

  let texto = j.texto;
  if (dia === 5) {
    texto = stats && stats.adherencia !== null
      ? `Vas al ${stats.adherencia}% de adherencia a tu objetivo, con ${stats.comidas} comidas registradas. Sigue así y los resultados llegan solos.`
      : 'Entra a "Mi progreso" y mira cuánto has avanzado en estos días.';
  }

  return (
    <div className="mb-6">
      <div className={`rounded-2xl p-4 border ${urgente ? 'bg-orange-950/40 border-orange-500/50' : 'bg-zinc-900 border-zinc-800'}`}>
        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <span className={`jb-display text-sm ${urgente ? 'text-orange-400' : 'text-zinc-200'}`}>{j.titulo}</span>
          <span className="jb-body text-xs text-zinc-500">
            {restantes > 0 ? `${restantes} día(s) restantes` : 'Último día'}
          </span>
        </div>
        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-3">
          <div className={`h-full rounded-full ${urgente ? 'bg-orange-500' : 'bg-emerald-500'}`}
            style={{ width: `${(dia / TRIAL_DAYS) * 100}%` }} />
        </div>
        <p className="jb-body text-sm text-zinc-300">{texto}</p>
      </div>

      {urgente && stats && (
        <div className="mt-3">
          <TrialSummary stats={stats} nombre={user.nombre} />
        </div>
      )}
    </div>
  );
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
  { meses: 1, nombre: 'Mensual', configKey: 'precio_1', precioDefault: 29.90, badge: null },
  { meses: 3, nombre: 'Trimestral', configKey: 'precio_3', precioDefault: 79.90, badge: null },
  { meses: 6, nombre: 'Semestral', configKey: 'precio_6', precioDefault: 149.90, badge: 'MÁS ELEGIDO' },
  { meses: 12, nombre: 'Anual', configKey: 'precio_12', precioDefault: 249.90, badge: 'MEJOR PRECIO' },
];

function fmtS(n) {
  return 'S/' + Number(n).toFixed(2);
}

const BENEFICIOS = [
  'Composición corporal completa y actualizada',
  'Plan de alimentación con comida peruana',
  'Recomendaciones diarias de qué comer',
  'Historial y gráficos de tu progreso',
  'Fotos de progreso con comparación',
  'Soporte directo por WhatsApp',
];

function PagosPanel({ onAprobado }) {
  const [pagos, setPagos] = useState([]);
  const [urls, setUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);
  const [procesando, setProcesando] = useState(null);
  const [verGrande, setVerGrande] = useState(null);
  const [filtro, setFiltro] = useState('pendiente');

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    try {
      const { data } = await supabase.from('pagos').select('*')
        .order('creado_en', { ascending: false }).limit(100);
      const lista = data || [];
      setPagos(lista);
      const rutas = lista.filter(p => p.comprobante_ruta).map(p => p.comprobante_ruta);
      if (rutas.length) {
        const { data: signed } = await supabase.storage.from('comprobantes').createSignedUrls(rutas, 3600);
        const m = {};
        (signed || []).forEach(s => { if (s.signedUrl) m[s.path] = s.signedUrl; });
        setUrls(m);
      }
    } catch { setPagos([]); }
    setLoading(false);
  }

  async function aprobar(pago) {
    setProcesando(pago.id);
    try {
      const { data: al } = await supabase.from('alumnos').select('fecha_vencimiento')
        .eq('username', pago.username).maybeSingle();
      const base = al?.fecha_vencimiento && daysLeft(al.fecha_vencimiento) > 0
        ? al.fecha_vencimiento : todayISO();
      const nuevo = addMonthsISO(base, pago.plan_meses);
      await supabase.from('alumnos')
        .update({ fecha_vencimiento: nuevo, enabled: true, plan: 'pago' })
        .eq('username', pago.username);
      await supabase.from('pagos')
        .update({ estado: 'aprobado', revisado_en: new Date().toISOString() })
        .eq('id', pago.id);
      await cargar();
      if (onAprobado) onAprobado();
    } catch {}
    setProcesando(null);
  }

  async function rechazar(pago) {
    const nota = window.prompt('Motivo del rechazo (lo verá el alumno):', 'No pudimos verificar el pago');
    if (nota === null) return;
    setProcesando(pago.id);
    try {
      await supabase.from('pagos')
        .update({ estado: 'rechazado', nota_admin: nota, revisado_en: new Date().toISOString() })
        .eq('id', pago.id);
      await cargar();
    } catch {}
    setProcesando(null);
  }

  const pendientes = pagos.filter(p => p.estado === 'pendiente');
  const visibles = filtro === 'todos' ? pagos : pagos.filter(p => p.estado === filtro);
  const ingresoMes = pagos
    .filter(p => p.estado === 'aprobado' && new Date(p.creado_en).getMonth() === new Date().getMonth())
    .reduce((a, p) => a + Number(p.monto), 0);

  return (
    <div className={`rounded-2xl overflow-hidden border ${pendientes.length ? 'bg-zinc-900 border-orange-500/50' : 'bg-zinc-900 border-zinc-800'}`}>
      <button onClick={() => setOpen(v => !v)} className="w-full px-5 py-4 flex items-center justify-between text-left">
        <h2 className="jb-display text-base text-zinc-200">
          💰 PAGOS {pendientes.length > 0 && (
            <span className="ml-2 bg-orange-500 text-zinc-950 text-xs px-2 py-0.5 rounded-full">{pendientes.length} por revisar</span>
          )}
        </h2>
        <ChevronRight size={18} className={`text-zinc-500 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-zinc-800 pt-4">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <StatCard label="Por revisar" value={pendientes.length} />
            <StatCard label="Ingresos del mes" value={fmtS(ingresoMes)} accent="text-emerald-400" />
            <StatCard label="Total pagos" value={pagos.filter(p => p.estado === 'aprobado').length} sub="aprobados" />
          </div>

          <div className="flex gap-2 mb-3 flex-wrap">
            {[['pendiente', 'Por revisar'], ['aprobado', 'Aprobados'], ['rechazado', 'Rechazados'], ['todos', 'Todos']].map(([v, l]) => (
              <button key={v} onClick={() => setFiltro(v)}
                className={`jb-body text-xs px-3 py-1.5 rounded-lg ${filtro === v ? 'bg-orange-500 text-zinc-950 font-semibold' : 'bg-zinc-950 text-zinc-400 border border-zinc-800'}`}>
                {l}
              </button>
            ))}
            <button onClick={cargar} className={btnGhost + ' py-1 px-3 text-xs ml-auto'}>Actualizar</button>
          </div>

          {loading ? (
            <Loader2 className="animate-spin text-orange-500" size={20} />
          ) : visibles.length === 0 ? (
            <p className="text-zinc-500 text-sm py-4 text-center">
              {filtro === 'pendiente' ? 'No hay pagos por revisar.' : 'Sin registros.'}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {visibles.map(p => (
                <div key={p.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                    <div>
                      <div className="text-zinc-100 font-medium jb-body">
                        {p.nombre ? `${p.nombre} · ${p.username}` : p.username}
                      </div>
                      <div className="text-zinc-500 text-xs jb-body mt-0.5">
                        {p.metodo} · Op. {p.operacion} · {new Date(p.creado_en).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="jb-display text-xl text-orange-500">{fmtS(p.monto)}</div>
                      <div className="text-zinc-500 text-xs jb-body">{p.plan_meses} mes(es)</div>
                    </div>
                  </div>

                  {p.comprobante_ruta && urls[p.comprobante_ruta] && (
                    p.comprobante_ruta.endsWith('.pdf') ? (
                      <a href={urls[p.comprobante_ruta]} target="_blank" rel="noopener noreferrer"
                        className={btnGhost + ' w-full py-2 text-sm mb-3'}>Ver comprobante (PDF)</a>
                    ) : (
                      <img src={urls[p.comprobante_ruta]} alt="Comprobante"
                        onClick={() => setVerGrande(urls[p.comprobante_ruta])}
                        className="w-full max-h-56 object-contain rounded-lg bg-zinc-900 cursor-pointer mb-3" />
                    )
                  )}

                  {p.estado === 'pendiente' ? (
                    <div className="flex gap-2">
                      <button onClick={() => aprobar(p)} disabled={procesando === p.id}
                        className={btnPrimary + ' flex-1 py-2 text-sm'}>
                        {procesando === p.id ? <Loader2 className="animate-spin" size={16} /> : '✓ Aprobar y activar'}
                      </button>
                      <button onClick={() => rechazar(p)} disabled={procesando === p.id}
                        className={btnDanger + ' py-2 px-4'}>Rechazar</button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className={`jb-body text-xs px-2.5 py-1 rounded-full ${p.estado === 'aprobado'
                        ? 'bg-emerald-950/60 text-emerald-400' : 'bg-red-950/60 text-red-400'}`}>
                        {p.estado === 'aprobado' ? '✓ Aprobado' : '✕ Rechazado'}
                        {p.revisado_en && ` · ${new Date(p.revisado_en).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}`}
                      </span>
                      {p.nota_admin && <span className="jb-body text-xs text-zinc-500">{p.nota_admin}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {verGrande && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50" onClick={() => setVerGrande(null)}>
          <img src={verGrande} alt="" className="max-w-full max-h-full object-contain rounded-xl" />
          <button className="absolute top-4 right-4 text-white p-2"><X size={28} /></button>
        </div>
      )}
    </div>
  );
}

function PlanesTab({ username, nombre, userRecord, onPagoEnviado }) {
  const [precios, setPrecios] = useState({});
  const [datosPago, setDatosPago] = useState({});
  const [seleccion, setSeleccion] = useState(null);
  const [metodo, setMetodo] = useState('Yape');
  const [operacion, setOperacion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [err, setErr] = useState('');
  const [misPagos, setMisPagos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { cargar(); }, [username]);

  async function cargar() {
    setLoading(true);
    try {
      const { data } = await supabase.from('config').select('key, value');
      const m = {};
      (data || []).forEach(c => { m[c.key] = c.value; });
      setPrecios(m); setDatosPago(m);
    } catch {}
    try {
      const { data } = await supabase.from('pagos').select('*')
        .eq('username', username).order('creado_en', { ascending: false }).limit(10);
      setMisPagos(data || []);
    } catch {}
    setLoading(false);
  }

  function precioDe(plan) {
    const v = Number(precios[plan.configKey]);
    return v > 0 ? v : plan.precioDefault;
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

      if (!userRecord?.telefono && tel.length >= 9) {
        try { await supabase.from('alumnos').update({ telefono: tel }).eq('username', username); } catch {}
      }

      setSeleccion(null); setOperacion(''); setArchivo(null); setTelefono('');
      await cargar();
      if (onPagoEnviado) onPagoEnviado();
    } catch (e) {
      if (ruta) { try { await supabase.storage.from('comprobantes').remove([ruta]); } catch {} }
      setErr(e.message || 'No se pudo enviar. Intenta de nuevo.');
    }
    setEnviando(false);
  }

  const pendiente = misPagos.find(p => p.estado === 'pendiente');
  const faltaTelefono = !userRecord?.telefono;
  const dl = userRecord ? daysLeft(userRecord.fechaVencimiento) : null;
  const esTrial = userRecord?.plan === 'trial';

  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hola, soy ${nombre || username} y tengo una consulta sobre los planes de Jonah Beast.`)}`;

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-orange-500" size={28} /></div>;

  return (
    <div className="flex flex-col gap-6">
      {userRecord && dl !== null && (
        <div className={`rounded-2xl p-4 border ${dl <= 3 ? 'bg-orange-950/40 border-orange-500/50' : 'bg-zinc-900 border-zinc-800'}`}>
          <p className="jb-body text-sm text-zinc-300">
            {esTrial
              ? dl >= 0 ? `Estás en tu prueba gratis · ${dl} día(s) restantes` : 'Tu prueba gratis terminó'
              : dl >= 0 ? `Tu plan está activo · ${dl} día(s) restantes` : `Tu plan venció hace ${Math.abs(dl)} día(s)`}
          </p>
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
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
                  <div className="jb-display text-3xl text-orange-500 mb-0.5">{fmtS(precio)}</div>
                  <div className="jb-body text-xs text-zinc-500 mb-1">
                    {plan.meses === 1 ? 'por mes' : `${fmtS(porMes)} por mes`}
                  </div>
                  {ahorro > 0 && (
                    <div className="jb-body text-xs text-emerald-400 mb-3">Ahorras {ahorro}%</div>
                  )}
                  {ahorro === 0 && <div className="mb-3" />}
                  <button onClick={() => setSeleccion(plan)}
                    className={(plan.badge === 'MÁS ELEGIDO' ? btnPrimary : btnGhost) + ' w-full mt-auto py-2.5'}>
                    Elegir
                  </button>
                </div>
              );
            })}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <h3 className="jb-display text-sm text-zinc-300 mb-3">TODOS LOS PLANES INCLUYEN</h3>
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
            {['Yape', 'Plin', 'Transferencia'].map(m => (
              <button key={m} onClick={() => setMetodo(m)}
                className={`jb-body text-xs px-3 py-2 rounded-lg flex-1 transition-colors ${metodo === m
                  ? 'bg-orange-500 text-zinc-950 font-semibold' : 'bg-zinc-950 text-zinc-400 border border-zinc-800'}`}>
                {m}
              </button>
            ))}
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 mb-5">
            {metodo === 'Transferencia' ? (
              datosPago.banco_cuenta ? (
                <div className="jb-body text-sm text-zinc-300 flex flex-col gap-1">
                  <div><span className="text-zinc-500">Banco:</span> {datosPago.banco_nombre}</div>
                  <div><span className="text-zinc-500">Cuenta:</span> {datosPago.banco_cuenta}</div>
                  {datosPago.banco_cci && <div><span className="text-zinc-500">CCI:</span> {datosPago.banco_cci}</div>}
                  <div><span className="text-zinc-500">Titular:</span> {datosPago.banco_titular || datosPago.yape_titular}</div>
                </div>
              ) : (
                <p className="jb-body text-sm text-zinc-500">Escríbenos por WhatsApp para darte los datos bancarios.</p>
              )
            ) : (
              <div className="text-center">
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

          <h3 className="jb-display text-sm text-zinc-300 mb-3">2 · CONFIRMA TU PAGO</h3>
          <div className="flex flex-col gap-3">
            {faltaTelefono && (
              <Field label="Tu celular (WhatsApp)">
                <input type="tel" inputMode="tel" value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                  className={inputCls} placeholder="999 888 777" />
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
              Revisamos tu pago en menos de 24 horas. Te avisamos por WhatsApp cuando se active.
            </p>
          </div>
        </div>
      )}

      {misPagos.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="jb-display text-sm text-zinc-300 mb-3">MIS PAGOS</h3>
          <div className="flex flex-col gap-2">
            {misPagos.map(p => (
              <div key={p.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex items-center justify-between gap-2 flex-wrap">
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PhotosTab({ username, pesoActual }) {
  const [fotos, setFotos] = useState([]);
  const [urls, setUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [subiendo, setSubiendo] = useState(null);
  const [err, setErr] = useState('');
  const [verGrande, setVerGrande] = useState(null);
  const [comparar, setComparar] = useState(false);

  useEffect(() => { cargar(); }, [username]);

  async function cargar() {
    setLoading(true);
    try {
      const { data } = await supabase.from('fotos_progreso').select('*')
        .eq('username', username).order('fecha', { ascending: false }).limit(600);
      const lista = data || [];
      setFotos(lista);
      if (lista.length) {
        const rutas = lista.map(f => f.ruta);
        const { data: signed } = await supabase.storage.from('fotos-progreso').createSignedUrls(rutas, 3600);
        const mapa = {};
        (signed || []).forEach(s => { if (s.signedUrl) mapa[s.path] = s.signedUrl; });
        setUrls(mapa);
      }
    } catch { setFotos([]); }
    setLoading(false);
  }

  async function subir(angulo, file) {
    if (!file) return;
    setErr(''); setSubiendo(angulo);
    try {
      const blob = await comprimirImagen(file);
      const hoy = todayISO();
      const ruta = `${username}/${hoy}_${angulo}_${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from('fotos-progreso')
        .upload(ruta, blob, { contentType: 'image/jpeg', upsert: false });
      if (upErr) throw new Error('Al subir: ' + upErr.message);
      const { error: dbErr } = await supabase.from('fotos_progreso').insert({
        username, fecha: hoy, angulo, ruta, peso: Number(pesoActual) || null,
      });
      if (dbErr) {
        await supabase.storage.from('fotos-progreso').remove([ruta]);
        throw new Error('Al guardar: ' + dbErr.message);
      }
      await cargar();
    } catch (e) {
      setErr(e.message || 'No se pudo subir la foto. Revisa tu conexión e intenta de nuevo.');
    }
    setSubiendo(null);
  }

  async function borrar(foto) {
    if (!window.confirm('¿Borrar esta foto? No se puede recuperar.')) return;
    try {
      await supabase.storage.from('fotos-progreso').remove([foto.ruta]);
      await supabase.from('fotos_progreso').delete().eq('id', foto.id);
      await cargar();
    } catch {}
  }

  const porFecha = useMemo(() => {
    const m = {};
    fotos.forEach(f => { (m[f.fecha] = m[f.fecha] || []).push(f); });
    return Object.entries(m).sort((a, b) => b[0].localeCompare(a[0]));
  }, [fotos]);

  const hoy = todayISO();
  const deHoy = fotos.filter(f => f.fecha === hoy);
  const faltantes = ANGULOS.filter(a => !deHoy.some(f => f.angulo === a.id));

  function fmtFecha(f) {
    const [y, m, d] = f.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h2 className="jb-display text-base text-zinc-200 mb-1">📸 FOTOS DE HOY</h2>
        <p className="jb-body text-xs text-zinc-500 mb-4">
          Toma 4 fotos: de frente, de perfil, de espalda y una libre. La cámara de tu celular es suficiente. No es diario: hazlo cada 2 semanas para notar el cambio.
        </p>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 mb-4">
          <p className="jb-body text-xs text-zinc-400 mb-2 font-semibold">Para que la comparación sirva:</p>
          {['Misma ropa (ajustada o deportiva)', 'Mismo lugar y misma luz', 'A la misma hora, de preferencia en ayunas', 'Celular a la altura del pecho, a 2 pasos de distancia'].map(t => (
            <div key={t} className="flex items-start gap-2 text-[11px] text-zinc-500 jb-body py-0.5">
              <span className="text-orange-500 shrink-0">•</span> {t}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ANGULOS.map(a => {
            const ya = deHoy.find(f => f.angulo === a.id);
            const cargando = subiendo === a.id;
            return (
              <div key={a.id}>
                <label className={`block cursor-pointer rounded-xl border-2 border-dashed transition-colors overflow-hidden
                  ${ya ? 'border-emerald-600/50 bg-emerald-950/20' : 'border-zinc-700 hover:border-orange-500 bg-zinc-950'}`}>
                  <input type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={e => { subir(a.id, e.target.files[0]); e.target.value = ''; }} />
                  <div className="aspect-[3/4] flex flex-col items-center justify-center p-2 text-center">
                    {cargando ? (
                      <Loader2 className="animate-spin text-orange-500" size={24} />
                    ) : ya && urls[ya.ruta] ? (
                      <img src={urls[ya.ruta]} alt={a.label} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <>
                        <span className="text-2xl mb-1">{a.emoji}</span>
                        <span className="jb-body text-xs text-zinc-300 font-medium">{a.label}</span>
                        <span className="jb-body text-[10px] text-zinc-600 mt-1 leading-tight">{a.tip}</span>
                      </>
                    )}
                  </div>
                </label>
                {ya && (
                  <button onClick={() => borrar(ya)} className="jb-body text-[10px] text-zinc-600 hover:text-red-400 mt-1 w-full text-center">
                    Volver a tomar
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {err && <p className="text-red-400 text-sm jb-body mt-3 flex items-center gap-1.5"><AlertTriangle size={14} />{err}</p>}

        {faltantes.length === 0 && deHoy.length > 0 && (
          <p className="jb-body text-sm text-emerald-400 mt-4 text-center">
            ✓ Completaste tus 4 fotos de hoy. Repítelo cada 2 semanas para ver el cambio real.
          </p>
        )}
      </div>

      {porFecha.length > 1 && (
        <button onClick={() => setComparar(v => !v)} className={btnGhost + ' w-full py-3'}>
          {comparar ? 'Ver todas mis fotos' : '🔄 Comparar primera vs. última'}
        </button>
      )}

      {comparar && porFecha.length > 1 ? (
        <div className="bg-zinc-900 border border-orange-500/40 rounded-2xl p-5">
          <h2 className="jb-display text-base text-zinc-200 mb-4">TU CAMBIO</h2>
          {ANGULOS.map(a => {
            const primera = porFecha[porFecha.length - 1][1].find(f => f.angulo === a.id);
            const ultima = porFecha[0][1].find(f => f.angulo === a.id);
            if (!primera || !ultima || primera.id === ultima.id) return null;
            return (
              <div key={a.id} className="mb-5">
                <h3 className="jb-display text-xs text-orange-500 mb-2">{a.label.toUpperCase()}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[[primera, 'Antes'], [ultima, 'Ahora']].map(([f, etiqueta]) => (
                    <div key={f.id}>
                      {urls[f.ruta] && (
                        <img src={urls[f.ruta]} alt={etiqueta} onClick={() => setVerGrande(urls[f.ruta])}
                          className="w-full aspect-[3/4] object-cover rounded-xl cursor-pointer" />
                      )}
                      <p className="jb-body text-[11px] text-zinc-400 mt-1 text-center">
                        {etiqueta} · {fmtFecha(f.fecha)}{f.peso ? ` · ${f.peso} kg` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-orange-500" size={28} /></div>
      ) : porFecha.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
          <p className="jb-body text-sm text-zinc-500">
            Aún no tienes fotos. Las de hoy serán tu punto de partida — en unas semanas vas a agradecer haberlas tomado.
          </p>
        </div>
      ) : (
        porFecha.map(([fecha, lista]) => (
          <div key={fecha} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="jb-display text-sm text-zinc-300">{fmtFecha(fecha)}</h3>
              {lista[0].peso && <span className="jb-body text-xs text-zinc-500">{lista[0].peso} kg</span>}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {ANGULOS.map(a => {
                const f = lista.find(x => x.angulo === a.id);
                return (
                  <div key={a.id}>
                    {f && urls[f.ruta] ? (
                      <img src={urls[f.ruta]} alt={a.label} onClick={() => setVerGrande(urls[f.ruta])}
                        className="w-full aspect-[3/4] object-cover rounded-lg cursor-pointer" />
                    ) : (
                      <div className="w-full aspect-[3/4] rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                        <span className="text-zinc-700 text-xs">—</span>
                      </div>
                    )}
                    <p className="jb-body text-[10px] text-zinc-600 mt-1 text-center">{a.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {verGrande && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50" onClick={() => setVerGrande(null)}>
          <img src={verGrande} alt="" className="max-w-full max-h-full object-contain rounded-xl" />
          <button className="absolute top-4 right-4 text-white p-2"><X size={28} /></button>
        </div>
      )}

      <p className="jb-body text-[11px] text-zinc-600 text-center">
        Tus fotos son privadas. Solo tú y el equipo de soporte pueden verlas.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* COACH DIGITAL — análisis de tendencia                               */
/* ------------------------------------------------------------------ */

function MiniChart({ points, color = '#f97316', suffix = '' }) {
  if (!Array.isArray(points) || points.length < 2) return null;
  const limpios = points.filter(p => Number.isFinite(Number(p.v)));
  if (limpios.length < 2) return null;

  const vals = limpios.map(p => Number(p.v));
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = (max - min) || 1;
  const w = 300, h = 80, pad = 6;

  const coords = limpios.map((p, i) => {
    const x = pad + (i / (limpios.length - 1)) * (w - pad * 2);
    const y = h - pad - ((Number(p.v) - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const first = vals[0], last = vals[vals.length - 1];
  const delta = last - first;

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20" preserveAspectRatio="none">
        <polyline points={coords.join(' ')} fill="none" stroke={color} strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex justify-between text-[11px] text-zinc-500 jb-body mt-1">
        <span>{first.toFixed(1)}{suffix}</span>
        <span className={delta === 0 ? 'text-zinc-500' : delta < 0 ? 'text-emerald-400' : 'text-amber-400'}>
          {delta > 0 ? '+' : ''}{delta.toFixed(1)}{suffix}
        </span>
        <span>{last.toFixed(1)}{suffix}</span>
      </div>
    </div>
  );
}

function promedioSemana(rows, desde, hasta) {
  if (!Array.isArray(rows)) return null;
  const ini = Math.max(0, Math.min(desde, rows.length));
  const fin = Math.max(ini, Math.min(hasta, rows.length));
  const trozo = rows.slice(ini, fin).filter(r => Number(r.peso) > 0);
  if (!trozo.length) return null;
  const suma = trozo.reduce((a, r) => a + Number(r.peso), 0);
  const prom = suma / trozo.length;
  return Number.isFinite(prom) ? prom : null;
}

function analizarProgreso(rows, form) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const conPeso = rows.filter(r => Number(r.peso) > 0);
  const conComida = rows.filter(r => Number(r.kcal_consumidas) > 0);

  // Días transcurridos desde el primer registro
  let diasRango = 0;
  if (rows.length >= 2) {
    const a = new Date(String(rows[0].fecha).slice(0, 10) + 'T00:00:00');
    const b = new Date(String(rows[rows.length - 1].fecha).slice(0, 10) + 'T00:00:00');
    const calc = Math.round((b - a) / 86400000) + 1;
    diasRango = Number.isFinite(calc) && calc > 0 ? calc : rows.length;
  }

  // Adherencia
  const conObjetivo = conComida.filter(r => Number(r.kcal_objetivo) > 0);
  const enRango = conObjetivo.filter(r => {
    const ratio = Number(r.kcal_consumidas) / Number(r.kcal_objetivo);
    return ratio >= 0.85 && ratio <= 1.15;
  }).length;
  const adherencia = conObjetivo.length >= 3 ? Math.round((enRango / conObjetivo.length) * 100) : null;

  // Constancia del registro
  const constancia = diasRango > 0 ? Math.round((conComida.length / diasRango) * 100) : 0;

  // Aún no hay datos suficientes
  if (diasRango < 10 || conPeso.length < 4) {
    return {
      estado: 'inicial',
      titulo: 'ESTAMOS CONOCIENDO TU CUERPO',
      mensaje: `Llevas ${conComida.length} día(s) registrados. Con unas dos semanas de datos podré decirte si tu plan está funcionando o si conviene ajustarlo.`,
      accion: 'Sigue registrando tus comidas cada día. Es lo único que necesito.',
      color: 'zinc', adherencia, constancia,
    };
  }

  // Tendencia: promedio de los primeros 7 registros vs. los últimos 7.
  // Usar ventanas fijas (no mitades) evita subestimar el ritmo real.
  const ventana = Math.min(7, Math.max(2, Math.floor(conPeso.length / 3)));
  const pesoInicial = promedioSemana(conPeso, 0, ventana);
  const pesoActual = promedioSemana(conPeso, conPeso.length - ventana, conPeso.length);
  if (pesoInicial === null || pesoActual === null) {
    return { estado: 'inicial', titulo: 'FALTAN DATOS DE PESO',
      mensaje: 'Registra tu peso al menos 2 veces por semana para poder analizar tu tendencia.',
      accion: 'Actualiza tu peso en "Composición corporal".', color: 'zinc', adherencia, constancia };
  }

  const cambio = pesoActual - pesoInicial;
  const semanas = Math.max(diasRango / 7, 1);
  // Distancia real entre los centros de las dos ventanas comparadas
  const separacion = Math.max(conPeso.length - ventana, 1);
  const factorTiempo = separacion / Math.max(conPeso.length - 1, 1);
  const semanasEfectivas = Math.max(semanas * factorTiempo, 0.5);
  const porSemanaCalc = cambio / semanasEfectivas;
  const porSemana = Number.isFinite(porSemanaCalc) ? porSemanaCalc : 0;
  const pctSemana = (Math.abs(porSemana) / pesoInicial) * 100;
  const objetivo = form.objetivo || '';
  const perder = objetivo === 'Perder grasa';
  const ganar = objetivo === 'Ganar músculo';
  const estancado = Math.abs(porSemana) < 0.15;

  const base = { adherencia, constancia, cambio, porSemana, semanas: Math.round(semanas * 10) / 10 };

  // Prioridad 1: bajada demasiado rápida (riesgo de perder músculo)
  if (perder && porSemana < 0 && pctSemana > 1.2) {
    return { ...base, estado: 'rapido', color: 'amber',
      titulo: 'ESTÁS BAJANDO MUY RÁPIDO',
      mensaje: `Bajaste ${Math.abs(porSemana).toFixed(1)} kg por semana. A este ritmo se pierde músculo junto con la grasa, y el metabolismo se resiente.`,
      accion: 'Sube tus calorías objetivo un 10% y prioriza la proteína. Bajar entre 0.4 y 0.8 kg por semana es más sostenible.' };
  }

  // Prioridad 2: constancia baja — no se puede analizar bien
  if (constancia < 50) {
    return { ...base, estado: 'constancia', color: 'zinc',
      titulo: 'NECESITO MÁS REGISTROS',
      mensaje: `Registraste ${conComida.length} de ${diasRango} días. Con menos de la mitad de los días es difícil saber si el plan funciona o no.`,
      accion: 'Intenta registrar todos los días, aunque sea rápido. Los días que no anotas son los que suelen desviar el resultado.' };
  }

  // Prioridad 3: estancamiento
  if (estancado) {
    if (adherencia !== null && adherencia < 65) {
      return { ...base, estado: 'estancado_adherencia', color: 'amber',
        titulo: 'TU PROGRESO SE ESTANCÓ',
        mensaje: `Tu peso casi no cambió en ${Math.round(semanas)} semana(s). Antes de tocar tu plan: cumpliste tu objetivo de calorías solo el ${adherencia}% de los días.`,
        accion: 'El plan probablemente está bien; el reto es la constancia. Enfócate en acercarte a tu objetivo esta semana antes de cambiar nada.' };
    }
    return { ...base, estado: 'estancado', color: 'amber',
      titulo: 'TU PROGRESO SE ESTANCÓ',
      mensaje: `Tu peso se mantuvo estable en ${Math.round(semanas)} semana(s) y tu adherencia es buena${adherencia !== null ? ` (${adherencia}%)` : ''}. Tu cuerpo se adaptó a las calorías actuales.`,
      accion: perder
        ? 'Ajusta tu objetivo: baja entre 100 y 150 kcal, o aumenta tu actividad diaria. Cambios pequeños, no drásticos.'
        : ganar
          ? 'Sube tu objetivo entre 100 y 200 kcal para retomar el avance.'
          : 'Si tu meta es mantenerte, esto es exactamente lo que buscabas.' };
  }

  // Prioridad 4: va en la dirección correcta
  if (perder && porSemana < 0) {
    return { ...base, estado: 'bien', color: 'emerald',
      titulo: 'VAS PROGRESANDO CORRECTAMENTE',
      mensaje: `Bajaste ${Math.abs(cambio).toFixed(1)} kg en ${Math.round(semanas)} semana(s), un ritmo de ${Math.abs(porSemana).toFixed(1)} kg por semana. Es un ritmo saludable y sostenible.`,
      accion: 'Mantén tu plan tal como está. No cambies nada mientras siga funcionando.' };
  }
  if (ganar && porSemana > 0) {
    return { ...base, estado: 'bien', color: 'emerald',
      titulo: 'VAS PROGRESANDO CORRECTAMENTE',
      mensaje: `Subiste ${cambio.toFixed(1)} kg en ${Math.round(semanas)} semana(s). Vas en la dirección de tu objetivo.`,
      accion: 'Mantén tu plan y tu entrenamiento de fuerza. Así el peso ganado es músculo, no solo grasa.' };
  }

  // Prioridad 5: va en dirección contraria
  return { ...base, estado: 'contrario', color: 'amber',
    titulo: 'VAS EN DIRECCIÓN CONTRARIA',
    mensaje: `Tu objetivo es ${objetivo.toLowerCase() || 'mantenerte'}, pero tu peso ${porSemana > 0 ? 'subió' : 'bajó'} ${Math.abs(cambio).toFixed(1)} kg en ${Math.round(semanas)} semana(s).${adherencia !== null ? ` Tu adherencia fue del ${adherencia}%.` : ''}`,
    accion: adherencia !== null && adherencia < 65
      ? 'Antes de cambiar tu objetivo, prueba una semana acercándote a tus calorías. Suele bastar con eso.'
      : 'Revisa las porciones de lo que registras: a veces el cálculo se queda corto. Escríbenos si quieres que lo revisemos juntos.' };
}

function CoachCard({ analisis }) {
  if (!analisis || !analisis.titulo) return null;
  const c = ['emerald', 'amber', 'zinc'].includes(analisis.color) ? analisis.color : 'zinc';
  const estilos = {
    emerald: 'bg-emerald-950/30 border-emerald-700/50',
    amber: 'bg-amber-950/30 border-amber-700/50',
    zinc: 'bg-zinc-900 border-zinc-800',
  }[c];
  const textoTitulo = {
    emerald: 'text-emerald-400', amber: 'text-amber-400', zinc: 'text-zinc-200',
  }[c];
  const emoji = { emerald: '✅', amber: '⚠️', zinc: '📊' }[c];

  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    'Hola, revisé mi análisis en Jonah Beast Fuel y quiero una recomendación sobre mi plan.')}`;

  return (
    <div className={`rounded-2xl border p-5 ${estilos}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{emoji}</span>
        <h2 className={`jb-display text-base ${textoTitulo}`}>{analisis.titulo}</h2>
      </div>

      <p className="jb-body text-sm text-zinc-300 mb-3">{analisis.mensaje}</p>

      <div className="bg-zinc-950/60 rounded-xl p-3 mb-3">
        <p className="jb-body text-[11px] text-zinc-500 mb-1 uppercase tracking-wider">Qué hacer ahora</p>
        <p className="jb-body text-sm text-zinc-200">{analisis.accion}</p>
      </div>

      {(analisis.adherencia !== null || analisis.constancia > 0) && (
        <div className="flex gap-4 flex-wrap mb-3">
          {analisis.adherencia !== null && (
            <span className="jb-body text-xs text-zinc-400">
              Adherencia: <span className="text-zinc-200 font-semibold">{analisis.adherencia}%</span>
            </span>
          )}
          {analisis.constancia > 0 && (
            <span className="jb-body text-xs text-zinc-400">
              Días registrados: <span className="text-zinc-200 font-semibold">{analisis.constancia}%</span>
            </span>
          )}
          {Number.isFinite(analisis.porSemana) && (
            <span className="jb-body text-xs text-zinc-400">
              Ritmo: <span className="text-zinc-200 font-semibold">
                {analisis.porSemana > 0 ? '+' : ''}{analisis.porSemana.toFixed(2)} kg/sem
              </span>
            </span>
          )}
        </div>
      )}

      <a href={waUrl} target="_blank" rel="noopener noreferrer"
        className="jb-body text-xs text-orange-500 hover:text-orange-400 flex items-center gap-1.5">
        <MessageCircle size={13} /> Consultar con soporte
      </a>

      <p className="jb-body text-[10px] text-zinc-600 mt-3">
        Análisis automático basado en tus registros. No reemplaza la evaluación de un profesional de la salud.
      </p>
    </div>
  );
}

function ProgressTab({ username, form }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rango, setRango] = useState(30);

  useEffect(() => { load(); }, [username]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await supabase.from('historial').select('*')
        .eq('username', username).order('fecha', { ascending: true }).limit(1500);
      setRows(data || []);
    } catch { setRows([]); }
    setLoading(false);
  }

  const filtrados = useMemo(() => {
    const limite = new Date();
    limite.setDate(limite.getDate() - rango);
    return rows.filter(r => {
      const d = new Date(String(r.fecha).slice(0, 10) + 'T00:00:00');
      return !isNaN(d) && d >= limite;
    });
  }, [rows, rango]);

  const stats = useMemo(() => {
    if (!filtrados.length) return null;
    const conComida = filtrados.filter(r => Number(r.kcal_consumidas) > 0);
    const promKcal = conComida.length ? conComida.reduce((a, r) => a + Number(r.kcal_consumidas), 0) / conComida.length : 0;
    const promProt = conComida.length ? conComida.reduce((a, r) => a + Number(r.proteina_g || 0), 0) / conComida.length : 0;
    const objetivos = conComida.filter(r => Number(r.kcal_objetivo) > 0);
    const promObj = objetivos.length ? objetivos.reduce((a, r) => a + Number(r.kcal_objetivo), 0) / objetivos.length : 0;
    // Adherencia: días dentro del ±15% de su objetivo
    const enRango = objetivos.filter(r => {
      const ratio = Number(r.kcal_consumidas) / Number(r.kcal_objetivo);
      return ratio >= 0.85 && ratio <= 1.15;
    }).length;
    const adherencia = objetivos.length ? (enRango / objetivos.length) * 100 : null;
    return { promKcal, promProt, promObj, adherencia, diasRegistrados: conComida.length, totalDias: filtrados.length, enRango, objetivos: objetivos.length };
  }, [filtrados]);

  const analisis = useMemo(() => {
    try {
      return rows.length ? analizarProgreso(rows, form || {}) : null;
    } catch (e) {
      console.error('Error al analizar el progreso:', e);
      return null;
    }
  }, [rows, form]);

  const serie = (campo) => filtrados
    .filter(r => r[campo] !== null && r[campo] !== undefined && Number.isFinite(Number(r[campo])))
    .map(r => ({ v: Number(r[campo]), fecha: r.fecha }));

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-orange-500" size={28} /></div>;
  }

  if (rows.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
        <TrendingUp className="text-zinc-700 mx-auto mb-3" size={40} />
        <h2 className="jb-display text-lg text-zinc-200 mb-2">TU PROGRESO EMPIEZA HOY</h2>
        <p className="jb-body text-sm text-zinc-500">
          Cada vez que registres tu peso o tus comidas, se guarda automáticamente.
          En unos días verás aquí tus tendencias y promedios.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2 flex-wrap">
        {[7, 30, 90, 180, 365].map(d => (
          <button key={d} onClick={() => setRango(d)}
            className={`jb-body text-xs px-3 py-1.5 rounded-lg transition-colors ${rango === d ? 'bg-orange-500 text-zinc-950 font-semibold' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}`}>
            {d === 7 ? '7 días' : d === 30 ? '30 días' : d === 90 ? '3 meses' : d === 180 ? '6 meses' : '1 año'}
          </button>
        ))}
      </div>

      {analisis && <CoachCard analisis={analisis} />}

      {stats && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h2 className="jb-display text-base text-zinc-200 mb-4">MIS TENDENCIAS</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Promedio consumido" value={Math.round(stats.promKcal)} sub="kcal/día" />
            <StatCard label="Objetivo promedio" value={Math.round(stats.promObj)} sub="kcal/día" accent="text-amber-400" />
            <StatCard label="Proteína promedio" value={Math.round(stats.promProt) + ' g'} sub="al día" />
            <StatCard label="Días registrados" value={stats.diasRegistrados} sub={`de ${stats.totalDias}`} />
          </div>
          {stats.adherencia !== null && (
            <div className="mt-4 bg-zinc-950 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="jb-body text-sm text-zinc-300">Adherencia a tu objetivo</span>
                <span className="jb-display text-xl text-orange-500">{Math.round(stats.adherencia)}%</span>
              </div>
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full" style={{ width: `${stats.adherencia}%` }} />
              </div>
              <p className="jb-body text-xs text-zinc-400 mt-2">
                Estuviste cerca de tu objetivo en {stats.enRango} de {stats.objetivos} días registrados. ¡Eso es lo que construye resultados!
              </p>
            </div>
          )}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {[
          ['peso', 'PESO', ' kg', '#f97316'],
          ['grasa_pct', '% GRASA CORPORAL', '%', '#fbbf24'],
          ['masa_muscular', 'MASA MUSCULAR', ' kg', '#34d399'],
          ['kcal_consumidas', 'CALORÍAS DIARIAS', '', '#60a5fa'],
        ].map(([campo, titulo, sufijo, color]) => {
          const pts = serie(campo);
          return (
            <div key={campo} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <h3 className="jb-display text-xs text-zinc-400 mb-2">{titulo}</h3>
              {pts.length < 2 ? (
                <p className="jb-body text-xs text-zinc-600 py-6 text-center">Necesitas al menos 2 días de registro.</p>
              ) : (
                <MiniChart points={pts} color={color} suffix={sufijo} />
              )}
            </div>
          );
        })}
      </div>

      <p className="jb-body text-xs text-zinc-600 text-center">
        Tu historial se guarda solo cada vez que usas la app. Mientras más registres, más claro verás tu avance.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* GUÍA DE PRIMEROS PASOS                                              */
/* ------------------------------------------------------------------ */

function AyudaTab({ texto }) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 flex gap-2 mb-4">
      <span className="text-orange-500 shrink-0 text-sm">💡</span>
      <p className="jb-body text-xs text-zinc-400">{texto}</p>
    </div>
  );
}

function BienvenidaModal({ nombre, onClose }) {
  const [paso, setPaso] = useState(0);
  const pasos = [
    {
      emoji: '👋', titulo: `¡BIENVENIDO${nombre ? ', ' + nombre.split(' ')[0].toUpperCase() : ''}!`,
      texto: 'Jonah Beast Fuel te ayuda a saber exactamente cuánto comer y qué comer para llegar a tu objetivo. Te explico en 30 segundos cómo usarla.',
    },
    {
      emoji: '📏', titulo: 'PRIMERO: TUS NÚMEROS',
      texto: 'Ingresa tus medidas con una cinta métrica (cuello, cintura, cadera). La app calcula tu % de grasa y cuántas calorías quema tu cuerpo al día. Hay guías con fotos para medirte bien.',
    },
    {
      emoji: '🎯', titulo: 'SEGUNDO: TU OBJETIVO',
      texto: 'Elige si quieres perder grasa, ganar músculo o mantenerte. La app calcula sola cuántas calorías y proteína necesitas cada día.',
    },
    {
      emoji: '🍽️', titulo: 'TERCERO: REGISTRA LO QUE COMES',
      texto: 'Anota tus comidas con medidas de casa: "1 taza de arroz", "2 huevos", "1 plato de lomo saltado". Sin pesar nada. Verás al instante cuánto te queda del día.',
    },
    {
      emoji: '💪', titulo: '¿NO SABES QUÉ COMER?',
      texto: 'Toca el botón "¿Qué puedo comer?" y la app te sugiere combinaciones reales con comida peruana que encajan con las calorías que te quedan.',
    },
    {
      emoji: '📸', titulo: 'MIDE TU AVANCE',
      texto: 'Toma tus fotos cada 2 semanas y registra tu peso. En "Mi progreso" verás tus gráficos y en "Mis fotos" podrás comparar el antes y el ahora.',
    },
    {
      emoji: '📅', titulo: 'TU RUTINA DIARIA ES SIMPLE',
      texto: 'Solo registra tus comidas cada día. Nada más. Tus medidas quedan guardadas y no cambian hasta que tú las actualices.',
      extra: [
        ['Todos los días', 'Registra lo que comes'],
        ['Cada 2 semanas', 'Vuelve a medirte y toma fotos'],
        ['Cuando quieras', 'Revisa tu progreso'],
      ],
    },
  ];
  const p = pasos[paso];
  const ultimo = paso === pasos.length - 1;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-900 border border-orange-500/40 rounded-2xl max-w-md w-full p-6">
        <div className="text-center mb-5">
          <div className="text-5xl mb-3">{p.emoji}</div>
          <h2 className="jb-display text-xl text-orange-500 mb-3">{p.titulo}</h2>
          <p className="jb-body text-sm text-zinc-300 leading-relaxed">{p.texto}</p>
          {p.extra && (
            <div className="mt-4 flex flex-col gap-2">
              {p.extra.map(([cuando, que]) => (
                <div key={cuando} className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 flex items-center gap-3 text-left">
                  <span className="jb-display text-[11px] text-orange-500 w-24 shrink-0">{cuando.toUpperCase()}</span>
                  <span className="jb-body text-xs text-zinc-300">{que}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-center gap-1.5 mb-5">
          {pasos.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === paso ? 'w-6 bg-orange-500' : 'w-1.5 bg-zinc-700'}`} />
          ))}
        </div>

        <div className="flex gap-2">
          {paso > 0 && (
            <button onClick={() => setPaso(paso - 1)} className={btnGhost + ' py-2.5 px-4'}>Atrás</button>
          )}
          <button onClick={() => ultimo ? onClose() : setPaso(paso + 1)} className={btnPrimary + ' flex-1 py-2.5'}>
            {ultimo ? '¡Empecemos!' : 'Siguiente'}
          </button>
        </div>

        {!ultimo && (
          <button onClick={onClose} className="jb-body text-xs text-zinc-600 hover:text-zinc-400 mt-3 w-full text-center">
            Saltar guía
          </button>
        )}
      </div>
    </div>
  );
}

function PrimerosPasos({ form, mealPlan, tieneFotos, onIr, onVerGuia }) {
  const [oculto, setOculto] = useState(false);

  const midio = Number(form.cuello) > 0 && Number(form.cintura) > 0
    && Number(form.peso) > 0 && Number(form.estatura) > 0
    && !(Number(form.peso) === 70 && Number(form.estatura) === 170 && Number(form.cintura) === 85);
  const eligioObjetivo = !!form.objetivo;
  const registroComida = Object.values(mealPlan.meals || {}).some(e => e.some(x => x.foodKey));

  const pasos = [
    { id: 'calc', hecho: midio, titulo: 'Ingresa tus medidas', texto: 'Cuello, cintura, cadera y peso', tab: 'calc' },
    { id: 'goal', hecho: eligioObjetivo, titulo: 'Elige tu objetivo', texto: 'Perder grasa, ganar músculo o mantener', tab: 'goal' },
    { id: 'meal', hecho: registroComida, titulo: 'Registra tu primera comida', texto: 'Con medidas de casa: taza, plato, unidad', tab: 'meal' },
    { id: 'photo', hecho: tieneFotos, titulo: 'Toma tus fotos de inicio', texto: 'Tu punto de partida para comparar después', tab: 'photos' },
  ];

  const completados = pasos.filter(p => p.hecho).length;
  const todoListo = completados === pasos.length;

  if (todoListo || oculto) {
    return (
      <button onClick={onVerGuia}
        className="jb-body text-xs text-zinc-500 hover:text-orange-500 flex items-center gap-1.5 mb-4">
        <AlertTriangle size={13} /> ¿Cómo funciona la app?
      </button>
    );
  }

  const siguiente = pasos.find(p => !p.hecho);

  return (
    <div className="bg-zinc-900 border border-orange-500/40 rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="jb-display text-base text-zinc-200">🚀 PRIMEROS PASOS</h2>
        <span className="jb-body text-xs text-zinc-500">{completados} de {pasos.length}</span>
      </div>
      <p className="jb-body text-xs text-zinc-500 mb-3">
        Haz esto una sola vez al empezar. Después, tu única tarea diaria es registrar tus comidas.
      </p>

      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-4">
        <div className="h-full bg-orange-500 rounded-full transition-all"
          style={{ width: `${(completados / pasos.length) * 100}%` }} />
      </div>

      <div className="flex flex-col gap-2 mb-4">
        {pasos.map((p, i) => (
          <button key={p.id} onClick={() => onIr(p.tab)}
            className={`flex items-center gap-3 rounded-xl p-3 text-left transition-colors border ${p.hecho
              ? 'bg-emerald-950/20 border-emerald-800/40'
              : p.id === siguiente?.id
                ? 'bg-zinc-950 border-orange-500/50 hover:border-orange-500'
                : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 jb-display text-xs ${p.hecho
              ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'}`}>
              {p.hecho ? '✓' : i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`jb-body text-sm ${p.hecho ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>
                {p.titulo}
              </div>
              {!p.hecho && <div className="jb-body text-xs text-zinc-600">{p.texto}</div>}
            </div>
            {!p.hecho && <ChevronRight size={16} className="text-zinc-600 shrink-0" />}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {siguiente && (
          <button onClick={() => onIr(siguiente.tab)} className={btnPrimary + ' flex-1 py-2.5 text-sm'}>
            Continuar: {siguiente.titulo}
          </button>
        )}
        <button onClick={onVerGuia} className={btnGhost + ' py-2.5 px-4 text-sm'}>Ver guía</button>
      </div>

      <button onClick={() => setOculto(true)}
        className="jb-body text-[11px] text-zinc-600 hover:text-zinc-400 mt-3 w-full text-center">
        Ocultar por ahora
      </button>
    </div>
  );
}

function Dashboard({ form, setForm, results, mealPlan, targets }) {
  const pesoActual = Number(form.peso) || 0;
  const pesoInicial = form.pesoInicial === null || form.pesoInicial === undefined || form.pesoInicial === '' ? null : Number(form.pesoInicial);
  const pesoObjetivo = form.pesoObjetivo === null || form.pesoObjetivo === undefined || form.pesoObjetivo === '' ? null : Number(form.pesoObjetivo);

  let progreso = null;
  if (pesoInicial && pesoObjetivo && pesoInicial !== pesoObjetivo) {
    progreso = ((pesoInicial - pesoActual) / (pesoInicial - pesoObjetivo)) * 100;
    progreso = Math.max(Math.min(progreso, 100), 0);
  }

  const totalsHoy = { kcal: 0, protein: 0 };
  Object.values(mealPlan.meals).forEach(entries => entries.forEach(en => {
    const m = entryMacros(en);
    totalsHoy.kcal += m.kcal; totalsHoy.protein += m.protein;
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 flex gap-2">
        <span className="text-orange-500 shrink-0 text-sm">📅</span>
        <p className="jb-body text-xs text-zinc-400">
          <span className="text-zinc-200 font-semibold">Tu única tarea diaria es registrar lo que comes.</span> Tus
          medidas quedan guardadas y no cambian hasta que las actualices. Vuelve a medirte cada 2 semanas.
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h2 className="jb-display text-base text-zinc-200 mb-4">COMPOSICIÓN CORPORAL</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Peso actual" value={pesoActual.toFixed(1) + ' kg'} />
          <StatCard label="Grasa corporal" value={results.bf.toFixed(1) + '%'} sub={results.bfCat} />
          <StatCard label="Masa muscular est." value={results.muscleKg.toFixed(1) + ' kg'} />
          <StatCard label="Masa magra" value={results.leanKg.toFixed(1) + ' kg'} />
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h2 className="jb-display text-base text-zinc-200 mb-1">MI OBJETIVO DE PESO</h2>
        <p className="jb-body text-xs text-zinc-500 mb-4">Registra tu punto de partida y tu meta para ver tu avance.</p>
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          <Field label="Peso inicial (kg)">
            <input type="number" className={inputCls} value={form.pesoInicial ?? ''} placeholder={pesoActual || ''}
              onChange={e => setForm(v => ({ ...v, pesoInicial: e.target.value === '' ? null : Number(e.target.value) }))} />
          </Field>
          <Field label="Peso objetivo (kg)">
            <input type="number" className={inputCls} value={form.pesoObjetivo ?? ''} placeholder="Ej. 75"
              onChange={e => setForm(v => ({ ...v, pesoObjetivo: e.target.value === '' ? null : Number(e.target.value) }))} />
          </Field>
        </div>
        {progreso !== null ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="jb-body text-xs text-zinc-400">{pesoInicial} kg → {pesoObjetivo} kg</span>
              <span className="jb-display text-lg text-orange-500">{Math.round(progreso)}%</span>
            </div>
            <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full" style={{ width: `${progreso}%` }} />
            </div>
            <p className="jb-body text-xs text-zinc-500 mt-2">
              {progreso >= 100 ? '¡Llegaste a tu meta! Escríbenos por WhatsApp para definir el siguiente paso.'
                : `Te faltan ${Math.abs(pesoActual - pesoObjetivo).toFixed(1)} kg para tu meta.`}
            </p>
          </div>
        ) : (
          <p className="jb-body text-xs text-zinc-600">Completa ambos campos para ver tu progreso.</p>
        )}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h2 className="jb-display text-base text-zinc-200 mb-4">ALIMENTACIÓN DE HOY</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="Consumido hoy" value={Math.round(totalsHoy.kcal)} sub="kcal" />
          <StatCard label="Objetivo diario" value={targets ? Math.round(targets.kcal) : mealPlan.targetKcal} sub="kcal" accent="text-amber-400" />
          <StatCard label="Proteína hoy" value={Math.round(totalsHoy.protein) + ' g'} sub={targets ? `objetivo ${Math.round(targets.protein)} g` : ''} />
        </div>
        <CalorieStatus consumed={totalsHoy.kcal} target={targets ? targets.kcal : mealPlan.targetKcal} />
        <p className="jb-body text-xs text-zinc-600 mt-3">
          Mira tus promedios y tendencias de varios días en la pestaña "Mi progreso".
        </p>
      </div>
    </div>
  );
}

function CalorieStatus({ consumed, target }) {
  if (!target) return null;
  const ratio = consumed / target;
  let color, bg, border, text;
  if (consumed === 0) {
    return null;
  } else if (ratio < 0.85) {
    color = 'text-emerald-400'; bg = 'bg-emerald-950/40'; border = 'border-emerald-800/50';
    text = 'Vas bien — aún tienes margen para tus próximas comidas.';
  } else if (ratio <= 1.05) {
    color = 'text-amber-400'; bg = 'bg-amber-950/40'; border = 'border-amber-800/50';
    text = 'Ya casi llegas a tu objetivo del día.';
  } else {
    color = 'text-orange-400'; bg = 'bg-orange-950/30'; border = 'border-orange-800/40';
    text = 'Pasaste tu objetivo de hoy. Un día no define tu progreso — sigue normal mañana, sin compensar.';
  }
  const pctFill = Math.min(ratio * 100, 100);
  return (
    <div className={`${bg} ${border} border rounded-xl p-3 mb-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`jb-display text-sm ${color}`}>{Math.round(consumed)} / {Math.round(target)} kcal</span>
        <span className="jb-body text-[11px] text-zinc-400">{Math.round(ratio * 100)}%</span>
      </div>
      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${ratio < 0.85 ? 'bg-emerald-500' : ratio <= 1.05 ? 'bg-amber-500' : 'bg-orange-500'}`}
          style={{ width: `${pctFill}%` }} />
      </div>
      <p className="jb-body text-xs text-zinc-400 mt-2">{text}</p>
    </div>
  );
}

function MealTab({ mealPlan, setMealPlan, tdee, targets }) {
  const totals = useMemo(() => {
    const t = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    Object.values(mealPlan.meals).forEach(entries => entries.forEach(en => {
      const m = entryMacros(en);
      t.kcal += m.kcal; t.protein += m.protein; t.carbs += m.carbs; t.fat += m.fat;
    }));
    return t;
  }, [mealPlan]);

  const macroSum = mealPlan.macros.p + mealPlan.macros.c + mealPlan.macros.f;
  const objP = (mealPlan.targetKcal * mealPlan.macros.p) / 4;
  const objC = (mealPlan.targetKcal * mealPlan.macros.c) / 4;
  const objF = (mealPlan.targetKcal * mealPlan.macros.f) / 9;

  function updateEntry(meal, id, patch) {
    setMealPlan(v => ({
      ...v,
      meals: { ...v.meals, [meal]: v.meals[meal].map(en => en.id === id ? { ...en, ...patch } : en) },
    }));
  }
  function addEntry(meal) {
    setMealPlan(v => ({ ...v, meals: { ...v.meals, [meal]: [...v.meals[meal], { id: uid(), foodKey: '', qty: 100, unit: 'gramos' }] } }));
  }
  function removeEntry(meal, id) {
    setMealPlan(v => ({ ...v, meals: { ...v.meals, [meal]: v.meals[meal].filter(en => en.id !== id) } }));
  }

  function applyGoal() {
    if (!targets || !targets.kcal) return;
    setMealPlan(v => ({
      ...v,
      targetKcal: Math.round(targets.kcal),
      macros: {
        p: Math.round((targets.protein * 4 / targets.kcal) * 100) / 100,
        c: Math.round((targets.carbs * 4 / targets.kcal) * 100) / 100,
        f: Math.round((targets.fat * 9 / targets.kcal) * 100) / 100,
      },
    }));
  }

  const goalMismatch = targets && Math.abs(mealPlan.targetKcal - targets.kcal) > 5;

  return (
    <div className="flex flex-col gap-6">
      <datalist id="jb-foods">
        {FOODS.map(f => <option key={f.key} value={f.key} />)}
      </datalist>
      <AyudaTab texto="Escribe lo que comiste y elige la medida de casa (taza, plato, unidad). No necesitas pesar nada. Abajo verás cuánto llevas del día y cuánto te queda." />
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 flex gap-2">
        <AlertTriangle className="text-zinc-500 shrink-0" size={14} />
        <p className="jb-body text-[11px] text-zinc-500">
          Los platos preparados (ají de gallina, ceviche, pollo a la brasa…) son estimaciones promedio.
          La receta de cada casa o restaurante puede variar. Úsalos como referencia, no como medida exacta.
        </p>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h2 className="jb-display text-base text-zinc-200 mb-1">OBJETIVO DIARIO</h2>
        {targets ? (
          <p className="jb-body text-xs text-zinc-500 mb-4">
            Tu objetivo es <span className="text-orange-500 font-semibold">{targets.goal}</span> · {Math.round(targets.kcal)} kcal · P {Math.round(targets.protein)}g · C {Math.round(targets.carbs)}g · G {Math.round(targets.fat)}g
          </p>
        ) : (
          <p className="jb-body text-xs text-zinc-500 mb-4">Elige tu objetivo en la pestaña "Mi objetivo" para calcular estos valores automáticamente.</p>
        )}
        {goalMismatch && (
          <div className="bg-amber-950/40 border border-amber-800/50 rounded-xl p-3 flex items-center gap-2 mb-4">
            <AlertTriangle className="text-amber-500 shrink-0" size={16} />
            <p className="text-amber-200 text-xs jb-body">Estos valores no coinciden con tu objetivo ({Math.round(targets.kcal)} kcal). Toca "Usar mi objetivo" para sincronizarlos.</p>
          </div>
        )}
        <div className="grid sm:grid-cols-5 gap-3 items-end">
          <Field label="Calorías objetivo (kcal)">
            <input type="number" className={inputCls} value={mealPlan.targetKcal}
              onChange={e => setMealPlan(v => ({ ...v, targetKcal: Number(e.target.value) || 0 }))} />
          </Field>
          <Field label="% Proteína">
            <input type="number" step="0.05" className={inputCls} value={mealPlan.macros.p}
              onChange={e => setMealPlan(v => ({ ...v, macros: { ...v.macros, p: Number(e.target.value) || 0 } }))} />
          </Field>
          <Field label="% Carbohidratos">
            <input type="number" step="0.05" className={inputCls} value={mealPlan.macros.c}
              onChange={e => setMealPlan(v => ({ ...v, macros: { ...v.macros, c: Number(e.target.value) || 0 } }))} />
          </Field>
          <Field label="% Grasas">
            <input type="number" step="0.05" className={inputCls} value={mealPlan.macros.f}
              onChange={e => setMealPlan(v => ({ ...v, macros: { ...v.macros, f: Number(e.target.value) || 0 } }))} />
          </Field>
          {targets ? (
            <button onClick={applyGoal} className={btnPrimary + ' text-sm'}>
              <Target size={14} /> Usar mi objetivo ({Math.round(targets.kcal)})
            </button>
          ) : tdee ? (
            <button onClick={() => setMealPlan(v => ({ ...v, targetKcal: Math.round(tdee) }))} className={btnGhost + ' text-sm'}>
              <Flame size={14} /> Usar mi mantenimiento ({Math.round(tdee)})
            </button>
          ) : null}
        </div>
        {Math.abs(macroSum - 1) > 0.001 && (
          <p className="text-red-400 text-xs mt-2 flex items-center gap-1.5"><AlertTriangle size={13} /> Los porcentajes deben sumar 100% (ahora suman {Math.round(macroSum * 100)}%).</p>
        )}
      </div>

      <WhatCanIEat mealPlan={mealPlan} setMealPlan={setMealPlan} remaining={{
        kcal: mealPlan.targetKcal - totals.kcal,
        protein: objP - totals.protein,
        carbs: objC - totals.carbs,
        fat: objF - totals.fat,
      }} />

      {MEAL_NAMES.map(meal => (
        <div key={meal} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="jb-display text-sm text-orange-500 tracking-wide">{meal.toUpperCase()}</h3>
            <button onClick={() => addEntry(meal)} className={btnGhost + ' py-1.5 px-3 text-sm'}><Plus size={14} /> Agregar alimento</button>
          </div>
          {mealPlan.meals[meal].length === 0 ? (
            <p className="text-zinc-600 text-sm">Sin alimentos agregados.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {mealPlan.meals[meal].map(en => {
                const m = entryMacros(en);
                const food = FOODS.find(f => f.key === en.foodKey);
                const units = food ? unitsFor(food) : [['gramos', 1]];
                const currentUnit = en.unit === undefined || en.unit === null ? 'gramos' : en.unit;
                const currentQty = en.unit === undefined || en.unit === null ? (en.grams ?? '') : (en.qty ?? '');
                return (
                  <div key={en.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 flex flex-col sm:flex-row sm:items-center gap-2">
                    <input list="jb-foods" value={en.foodKey}
                      onChange={e => updateEntry(meal, en.id, { foodKey: e.target.value, unit: 'gramos', qty: currentQty || 100, grams: undefined })}
                      className={inputCls + ' py-2 sm:flex-[3] min-w-0'} placeholder="Escribe para buscar…" />
                    <div className="flex gap-2 items-center">
                      <input type="number" inputMode="decimal" value={currentQty}
                        onChange={e => updateEntry(meal, en.id, { qty: e.target.value, unit: currentUnit, grams: undefined })}
                        className={inputCls + ' py-2 w-20 shrink-0'} placeholder="Cant." />
                      <select value={currentUnit}
                        onChange={e => updateEntry(meal, en.id, { unit: e.target.value, qty: currentQty || 1, grams: undefined })}
                        className={inputCls + ' py-2 flex-1 sm:w-32 min-w-0'}>
                        {units.map(u => <option key={u[0]} value={u[0]}>{u[0]}</option>)}
                      </select>
                      <button onClick={() => removeEntry(meal, en.id)}
                        className="sm:hidden text-zinc-600 hover:text-red-400 p-2 shrink-0"><Trash2 size={18} /></button>
                    </div>
                    <div className="text-xs text-zinc-400 jb-body sm:flex-[2] sm:text-center">
                      {Math.round(m.kcal)} kcal · P {m.protein.toFixed(0)} · C {m.carbs.toFixed(0)} · G {m.fat.toFixed(0)}
                    </div>
                    <button onClick={() => removeEntry(meal, en.id)}
                      className="hidden sm:flex text-zinc-600 hover:text-red-400 justify-center shrink-0"><Trash2 size={15} /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      <div className="bg-zinc-900 border border-orange-500/30 rounded-2xl p-5">
        <h3 className="jb-display text-sm text-zinc-200 mb-3">TOTAL DEL DÍA VS. OBJETIVO</h3>
        <CalorieStatus consumed={totals.kcal} target={mealPlan.targetKcal} />
        <div className="grid grid-cols-4 gap-3 text-center">
          {[
            ['Kcal', totals.kcal, mealPlan.targetKcal],
            ['Proteína g', totals.protein, objP],
            ['Carbohidratos g', totals.carbs, objC],
            ['Grasas g', totals.fat, objF],
          ].map(([label, val, obj]) => (
            <div key={label}>
              <div className="jb-display text-2xl text-orange-500">{Math.round(val)}</div>
              <div className="text-zinc-500 text-xs">{label}</div>
              <div className="text-zinc-600 text-[11px] mt-0.5">obj. {Math.round(obj)} ({val - obj >= 0 ? '+' : ''}{Math.round(val - obj)})</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WhatsAppButton() {
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Consultar por WhatsApp"
      className="fixed bottom-6 right-6 z-50 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-full p-4 shadow-lg shadow-emerald-500/20 flex items-center justify-center transition-transform hover:scale-105"
    >
      <MessageCircle size={26} strokeWidth={2.2} />
    </a>
  );
}

function StudentDashboard({ username, form, setForm, mealPlan, setMealPlan, onLogout, saving, userRecord }) {
  const [tab, setTab] = useState('dash');
  const [verGuia, setVerGuia] = useState(false);
  const [tieneFotos, setTieneFotos] = useState(false);
  const [guiaVista, setGuiaVista] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { count } = await supabase.from('fotos_progreso')
          .select('id', { count: 'exact', head: true }).eq('username', username);
        setTieneFotos((count || 0) > 0);
      } catch {}
      try {
        const vista = localStorage.getItem('jb_guia_' + username);
        if (!vista) { setVerGuia(true); setGuiaVista(false); }
      } catch {}
    })();
  }, [username]);

  function cerrarGuia() {
    setVerGuia(false);
    try { localStorage.setItem('jb_guia_' + username, '1'); } catch {}
  }
  const results = useMemo(() => calcAll({
    ...form,
    edad: Number(form.edad) || 0, estatura: Number(form.estatura) || 1, peso: Number(form.peso) || 0,
    cuello: Number(form.cuello) || 1, cintura: Number(form.cintura) || 1, cadera: Number(form.cadera) || 1,
  }), [form]);

  return (
    <div className="min-h-screen bg-zinc-950 jb-body">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-3">
          <span className="text-zinc-500 text-sm hidden sm:inline">{saving ? 'Guardando…' : 'Guardado'} · {username}</span>
          <button onClick={onLogout} className={btnGhost}><LogOut size={16} /> Salir</button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 pt-6">
        {verGuia && <BienvenidaModal nombre={userRecord?.nombre} onClose={cerrarGuia} />}
        <TrialBanner user={userRecord} />
        <RenewalBanner user={userRecord} onRenovar={() => setTab('planes')} />
        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => setTab('dash')}
            className={`jb-display text-sm px-4 py-2.5 rounded-lg flex items-center gap-2 ${tab === 'dash' ? 'bg-orange-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}`}>
            <LayoutDashboard size={16} /> RESUMEN
          </button>
          <button onClick={() => setTab('calc')}
            className={`jb-display text-sm px-4 py-2.5 rounded-lg flex items-center gap-2 ${tab === 'calc' ? 'bg-orange-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}`}>
            <Dumbbell size={16} /> COMPOSICIÓN CORPORAL
          </button>
          <button onClick={() => setTab('goal')}
            className={`jb-display text-sm px-4 py-2.5 rounded-lg flex items-center gap-2 ${tab === 'goal' ? 'bg-orange-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}`}>
            <Target size={16} /> MI OBJETIVO
          </button>
          <button onClick={() => setTab('meal')}
            className={`jb-display text-sm px-4 py-2.5 rounded-lg flex items-center gap-2 ${tab === 'meal' ? 'bg-orange-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}`}>
            <Salad size={16} /> PLAN DE ALIMENTACIÓN
          </button>
          <button onClick={() => setTab('progress')}
            className={`jb-display text-sm px-4 py-2.5 rounded-lg flex items-center gap-2 ${tab === 'progress' ? 'bg-orange-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}`}>
            <TrendingUp size={16} /> MI PROGRESO
          </button>
          <button onClick={() => setTab('photos')}
            className={`jb-display text-sm px-4 py-2.5 rounded-lg flex items-center gap-2 ${tab === 'photos' ? 'bg-orange-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}`}>
            <Camera size={16} /> MIS FOTOS
          </button>
          <button onClick={() => setTab('planes')}
            className={`jb-display text-sm px-4 py-2.5 rounded-lg flex items-center gap-2 ${tab === 'planes' ? 'bg-orange-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}`}>
            <CreditCard size={16} /> MI PLAN
          </button>
        </div>
        <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-xl p-3 flex items-center gap-2 mb-6">
          <MessageCircle className="text-emerald-500 shrink-0" size={16} />
          <p className="text-emerald-200 text-xs jb-body">¿Tienes dudas? Escribe a nuestro soporte tocando el botón verde de WhatsApp, abajo a la derecha.</p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 pb-12">
        {tab === 'dash' && (
          <>
            <PrimerosPasos form={form} mealPlan={mealPlan} tieneFotos={tieneFotos}
              onIr={setTab} onVerGuia={() => setVerGuia(true)} />
            <Dashboard form={form} setForm={setForm} results={results} mealPlan={mealPlan} targets={goalTargets(form, results.tdee)} />
          </>
        )}
        {tab === 'calc' && <CalculatorTab form={form} setForm={setForm} results={results} />}
        {tab === 'goal' && <GoalSelector form={form} setForm={setForm} tdee={results.tdee} peso={form.peso} />}
        {tab === 'meal' && <MealTab mealPlan={mealPlan} setMealPlan={setMealPlan} tdee={results.tdee} targets={goalTargets(form, results.tdee)} />}
        {tab === 'progress' && <ProgressTab username={username} form={form} />}
        {tab === 'photos' && <PhotosTab username={username} pesoActual={form.peso} />}
        {tab === 'planes' && <PlanesTab username={username} nombre={userRecord?.nombre} userRecord={userRecord} />}
      </main>
      <WhatsAppButton />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ROOT APP                                                             */
/* ------------------------------------------------------------------ */

export default function App() {
  const [view, setView] = useState('landing');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [users, setUsers] = useState([]);
  const [adminPass, setAdminPass] = useState('');
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [viewingStudent, setViewingStudent] = useState(null);
  const [expiredInfo, setExpiredInfo] = useState(null);
  const [viewingStudentData, setViewingStudentData] = useState(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [mealPlan, setMealPlan] = useState(EMPTY_MEALPLAN());
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef(null);
  const skipNextSave = useRef(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setView('resetPassword');
    });
    const hash = window.location.hash || '';
    if (hash.includes('type=recovery')) setView('resetPassword');
    init();
    if (!hash.includes('type=recovery')) restoreSession();
    return () => { if (sub && sub.subscription) sub.subscription.unsubscribe(); };
  }, []);

  async function restoreSession() {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const { data: p } = await supabase.from('profiles').select('username, role').eq('id', data.session.user.id).maybeSingle();
      if (!p) return;
      if (p.role === 'admin') { setAdminAuthed(true); setView('admin'); return; }
      const { data: a } = await supabase.from('alumnos').select('*').eq('username', p.username).maybeSingle();
      if (a) {
        const u = { username: a.username, enabled: a.enabled, plan: a.plan || 'pago',
          fechaInicio: a.fecha_inicio, fechaVencimiento: a.fecha_vencimiento };
        if (!u.enabled || !membershipActive(u)) return;
      }
      await loadStudentSession(p.username);
    } catch {}
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
        codigoReferido: u.codigo_referido || null, comisionPagada: !!u.comision_pagada,
      }));
    } catch { usersList = []; }
    try {
      const { data: activityData } = await supabase.from('datos_alumnos').select('username, updated_at');
      const activityMap = {};
      (activityData || []).forEach(a => { activityMap[a.username] = a.updated_at; });
      usersList = usersList.map(u => ({ ...u, lastActivity: activityMap[u.username] || null }));
    } catch {}
    setUsers(usersList);
    setLoading(false);
  }

  async function handleAdminSetup(pass) {
    setBusy(true);
    try { await supabase.from('config').upsert({ key: 'admin_password', value: pass }); } catch {}
    setAdminPass(pass);
    setBusy(false);
    setAdminAuthed(true);
    setView('admin');
  }

  function handleAdminLogin(pass, setErr) {
    if (pass === adminPass) { setAdminAuthed(true); setView('admin'); }
    else setErr('Contraseña incorrecta.');
  }

  async function loadStudentSession(username) {
    let data = null;
    try {
      const { data: row } = await supabase.from('datos_alumnos').select('form, meal_plan').eq('username', username).maybeSingle();
      data = row ? { form: row.form, mealPlan: row.meal_plan } : null;
    } catch {}
    setCurrentUser(username);
    setForm(data?.form || EMPTY_FORM);
    setMealPlan(data?.mealPlan || EMPTY_MEALPLAN());
    skipNextSave.current = true;
    setView('student');
  }

  async function handleTrialCreated(username) {
    await init();
    setCurrentUser(username);
    setForm(EMPTY_FORM);
    setMealPlan(EMPTY_MEALPLAN());
    skipNextSave.current = true;
    setView('student');
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
    try {
      const { data: p } = await supabase.from('profiles').select('username, nombre, role').eq('id', data.user.id).maybeSingle();
      perfil = p;
    } catch {}
    if (!perfil) { setBusy(false); return setErr('No encontramos tu perfil. Escríbenos por WhatsApp.'); }

    if (perfil.role === 'admin') {
      setAdminAuthed(true);
      setBusy(false);
      await init();
      setView('admin');
      return;
    }

    let cuenta = null;
    try {
      const { data: a } = await supabase.from('alumnos').select('*').eq('username', perfil.username).maybeSingle();
      cuenta = a;
    } catch {}

    if (cuenta) {
      const u = {
        username: cuenta.username, enabled: cuenta.enabled, plan: cuenta.plan || 'pago',
        nombre: cuenta.nombre || perfil.nombre, fechaInicio: cuenta.fecha_inicio,
        fechaVencimiento: cuenta.fecha_vencimiento,
      };
      if (!u.enabled) { setBusy(false); return setErr('Tu acceso fue deshabilitado. Escríbenos para más información.'); }
      if (!membershipActive(u)) {
        if (u.plan === 'trial') {
          const stats = await fetchTrialStats(u.username);
          setBusy(false);
          setExpiredInfo({ stats, nombre: u.nombre });
          return;
        }
        setBusy(false);
        return setErr('Tu membresía venció. Escríbenos para renovarla y seguir usando la app.');
      }
    }

    await loadStudentSession(perfil.username);
    setBusy(false);
  }

  // autosave student data (debounced)
  useEffect(() => {
    if (view !== 'student' || !currentUser) return;
    if (skipNextSave.current) { skipNextSave.current = false; return; }
    setSaving(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await supabase.from('datos_alumnos').upsert({
          username: currentUser, form, meal_plan: mealPlan, updated_at: new Date().toISOString(),
        });
      } catch {}
      // Guardar foto del día para el historial de progreso
      try {
        const r = calcAll({
          ...form,
          edad: Number(form.edad) || 0, estatura: Number(form.estatura) || 1, peso: Number(form.peso) || 0,
          cuello: Number(form.cuello) || 1, cintura: Number(form.cintura) || 1, cadera: Number(form.cadera) || 1,
        });
        const t = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
        let comidas = 0, alimentos = 0;
        Object.values(mealPlan.meals).forEach(entries => {
          const conAlimento = entries.filter(en => en.foodKey);
          if (conAlimento.length) comidas += 1;
          alimentos += conAlimento.length;
          entries.forEach(en => {
            const m = entryMacros(en);
            t.kcal += m.kcal; t.protein += m.protein; t.carbs += m.carbs; t.fat += m.fat;
          });
        });
        await supabase.from('historial').upsert({
          username: currentUser, fecha: todayISO(),
          peso: Number(form.peso) || null,
          grasa_pct: Number(r.bf.toFixed(1)),
          masa_muscular: Number(r.muscleKg.toFixed(1)),
          masa_magra: Number(r.leanKg.toFixed(1)),
          imc: Number(r.bmi.toFixed(1)),
          kcal_consumidas: Math.round(t.kcal),
          proteina_g: Math.round(t.protein),
          carbos_g: Math.round(t.carbs),
          grasas_g: Math.round(t.fat),
          kcal_objetivo: Math.round(mealPlan.targetKcal) || null,
          comidas_count: comidas,
          alimentos_count: alimentos,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'username,fecha' });
      } catch {}
      setSaving(false);
    }, 700);
    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, mealPlan]);

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
    } catch {}
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
    } catch {}
  }
  async function toggleUser(username) {
    const target = users.find(u => u.username === username);
    const nextEnabled = target ? !target.enabled : true;
    setUsers(prev => prev.map(u => u.username === username ? { ...u, enabled: nextEnabled } : u));
    try { await supabase.from('alumnos').update({ enabled: nextEnabled }).eq('username', username); } catch {}
  }
  async function deleteUser(username) {
    setUsers(prev => prev.filter(u => u.username !== username));
    try {
      await supabase.from('datos_alumnos').delete().eq('username', username);
      await supabase.from('alumnos').delete().eq('username', username);
    } catch {}
  }

  async function logout() {
    try { await supabase.auth.signOut(); } catch {}
    setAdminAuthed(false);
    setCurrentUser(null);
    setForm(EMPTY_FORM);
    setMealPlan(EMPTY_MEALPLAN());
    setView('landing');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        {FONT_STYLE}
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  return (
    <>
      {FONT_STYLE}
      {view === 'resetPassword' && <ResetPassword onDone={() => { window.location.hash = ''; setView('studentAuth'); }} />}
      {view === 'landing' && <Landing onChoose={setView} />}
      {view === 'free' && <FreeCalculator onBack={() => setView('landing')} />}
      {view === 'trial' && <TrialSignup onBack={() => setView('landing')} onCreated={handleTrialCreated} />}
      {view === 'adminAuth' && (
        <AdminAuth adminPassExists={!!adminPass} onBack={() => setView('landing')} busy={busy}
          onSetup={handleAdminSetup} onLogin={handleAdminLogin} />
      )}
      {view === 'studentAuth' && (
        <StudentAuth onBack={() => setView('landing')} busy={busy} onLogin={handleStudentLogin}
          expiredInfo={expiredInfo} onClearExpired={() => setExpiredInfo(null)} />
      )}
      {view === 'admin' && adminAuthed && (
        <>
          <AdminDashboard users={users} onAddUser={addUser} onToggleUser={toggleUser}
            onDeleteUser={deleteUser} onLogout={logout} onViewStudent={openStudentData} onRenew={renewUser} onRecargar={init} />
          {viewingStudent && (
            <StudentDataModal username={viewingStudent} data={viewingStudentData}
              onClose={() => { setViewingStudent(null); setViewingStudentData(null); }} />
          )}
        </>
      )}
      {view === 'student' && currentUser && (
        <StudentDashboard username={currentUser} form={form} setForm={setForm}
          mealPlan={mealPlan} setMealPlan={setMealPlan} onLogout={logout} saving={saving}
          userRecord={users.find(u => u.username === currentUser)} />
      )}
    </>
  );
}
