import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Dumbbell, User, Plus, Trash2, LogOut, Eye, ShieldCheck, X, ChevronRight, Flame, Salad, UserPlus, AlertTriangle, Loader2, MessageCircle } from 'lucide-react';
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
];

const FOODS = RAW_FOODS.map(([group, name, state, kcal, protein, carbs, fat, fiber]) => ({
  group, name, state, kcal, protein, carbs, fat, fiber, key: `${name} (${state})`,
}));

const FOOD_GROUPS = [...new Set(FOODS.map(f => f.group))];

const ACTIVITY_FACTORS = { Sedentario: 1.2, Ligero: 1.375, Moderado: 1.55, Intenso: 1.725, 'Muy intenso': 1.9 };
const MEAL_NAMES = ['Desayuno', 'Almuerzo', 'Cena', 'Snack / merienda'];
const WHATSAPP_NUMBER = '51963760819';
const WHATSAPP_MESSAGE = 'Hola, tengo una consulta sobre mi plan.';

const EMPTY_FORM = { sexo: 'M', edad: 30, estatura: 170, peso: 70, cuello: 38, cintura: 85, cadera: 95, actividad: 'Moderado' };
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

function entryMacros(entry) {
  const food = FOODS.find(f => f.key === entry.foodKey);
  const g = Number(entry.grams) || 0;
  if (!food || !g) return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const factor = g / 100;
  return { kcal: food.kcal * factor, protein: food.protein * factor, carbs: food.carbs * factor, fat: food.fat * factor };
}

function uid() { return Math.random().toString(36).slice(2, 10); }

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
      <span className={`jb-display text-zinc-50 tracking-wide ${big ? 'text-2xl' : 'text-lg'}`}>JONAH BEAST</span>
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
        <h1 className="jb-display text-6xl sm:text-7xl text-zinc-50 leading-none mb-3">JONAH BEAST</h1>
        <p className="jb-body text-zinc-400 text-base mb-10">Mide tu composición corporal. Arma tu plan de alimentación. Domina tu progreso.</p>

        <div className="grid sm:grid-cols-2 gap-4">
          <button onClick={() => onChoose('studentAuth')} className="group bg-zinc-900 border border-zinc-800 hover:border-orange-500 rounded-2xl p-6 text-left transition-colors">
            <User className="text-orange-500 mb-3" size={28} />
            <div className="jb-display text-xl text-zinc-50 mb-1">SOY ALUMNO</div>
            <p className="jb-body text-sm text-zinc-500">Ingresa con tu usuario y contraseña</p>
            <div className="flex items-center gap-1 text-orange-500 text-sm jb-body mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              Entrar <ChevronRight size={16} />
            </div>
          </button>
          <button onClick={() => onChoose('adminAuth')} className="group bg-zinc-900 border border-zinc-800 hover:border-orange-500 rounded-2xl p-6 text-left transition-colors">
            <ShieldCheck className="text-orange-500 mb-3" size={28} />
            <div className="jb-display text-xl text-zinc-50 mb-1">SOY ENTRENADOR</div>
            <p className="jb-body text-sm text-zinc-500">Gestiona el acceso de tus alumnos</p>
            <div className="flex items-center gap-1 text-orange-500 text-sm jb-body mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              Entrar <ChevronRight size={16} />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AUTH SCREENS                                                        */
/* ------------------------------------------------------------------ */

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
          <h2 className="jb-display text-xl text-zinc-50 mb-1">{adminPassExists ? 'ACCESO ENTRENADOR' : 'CREA TU ACCESO'}</h2>
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

function StudentAuth({ onBack, onLogin, busy }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  function submit(e) {
    e.preventDefault();
    setErr('');
    if (!username || !password) return setErr('Completa usuario y contraseña.');
    onLogin(username.trim(), password, setErr);
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
      <div className="max-w-sm w-full">
        <div className="mb-8"><Logo size="lg" /></div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="jb-display text-xl text-zinc-50 mb-1">ACCESO ALUMNO</h2>
          <p className="jb-body text-sm text-zinc-500 mb-5">Usa el usuario y contraseña que te dio tu entrenador.</p>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label="Usuario">
              <input value={username} onChange={e => setUsername(e.target.value)} className={inputCls} autoFocus />
            </Field>
            <Field label="Contraseña">
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputCls} />
            </Field>
            {err && <p className="text-red-400 text-sm jb-body flex items-center gap-1.5"><AlertTriangle size={14} />{err}</p>}
            <button type="submit" disabled={busy} className={btnPrimary}>
              {busy ? <Loader2 className="animate-spin" size={18} /> : 'Entrar'}
            </button>
            <button type="button" onClick={onBack} className="jb-body text-sm text-zinc-500 hover:text-zinc-300 mt-1">← Volver</button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ADMIN DASHBOARD                                                     */
/* ------------------------------------------------------------------ */

function formatActivity(lastActivity) {
  if (!lastActivity) return { text: 'Sin actividad', color: 'text-zinc-500', dot: 'bg-zinc-600' };
  const days = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
  if (days < 1) return { text: 'Hoy', color: 'text-emerald-400', dot: 'bg-emerald-500' };
  if (days === 1) return { text: 'Ayer', color: 'text-emerald-400', dot: 'bg-emerald-500' };
  if (days < 7) return { text: `Hace ${days} días`, color: 'text-amber-400', dot: 'bg-amber-500' };
  if (days < 30) return { text: `Hace ${days} días`, color: 'text-red-400', dot: 'bg-red-500' };
  return { text: `Hace ${Math.floor(days / 30)} mes(es)`, color: 'text-red-400', dot: 'bg-red-500' };
}

function AdminDashboard({ users, onAddUser, onToggleUser, onDeleteUser, onLogout, onViewStudent }) {
  const [newUser, setNewUser] = useState({ username: '', password: '' });
  const [formErr, setFormErr] = useState('');

  function submitNew(e) {
    e.preventDefault();
    setFormErr('');
    const uname = newUser.username.trim();
    if (!uname || !newUser.password) return setFormErr('Completa usuario y contraseña.');
    if (users.some(u => u.username.toLowerCase() === uname.toLowerCase())) return setFormErr('Ese usuario ya existe.');
    onAddUser({ username: uname, password: newUser.password, enabled: true, createdAt: new Date().toISOString() });
    setNewUser({ username: '', password: '' });
  }

  return (
    <div className="min-h-screen bg-zinc-950 jb-body">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <Logo />
        <button onClick={onLogout} className={btnGhost}><LogOut size={16} /> Salir</button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-8">
        <div>
          <h1 className="jb-display text-2xl text-zinc-50 mb-1">PANEL DEL ENTRENADOR</h1>
          <p className="text-zinc-500 text-sm">Crea, habilita o deshabilita el acceso de tus alumnos.</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h2 className="jb-display text-base text-zinc-200 mb-4 flex items-center gap-2"><UserPlus size={18} className="text-orange-500" /> NUEVO ALUMNO</h2>
          <form onSubmit={submitNew} className="grid sm:grid-cols-3 gap-3 items-end">
            <Field label="Usuario">
              <input value={newUser.username} onChange={e => setNewUser(v => ({ ...v, username: e.target.value }))} className={inputCls} placeholder="ej. maria23" />
            </Field>
            <Field label="Contraseña">
              <input value={newUser.password} onChange={e => setNewUser(v => ({ ...v, password: e.target.value }))} className={inputCls} placeholder="Contraseña temporal" />
            </Field>
            <button type="submit" className={btnPrimary}><Plus size={16} /> Agregar</button>
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
              {users.map(u => (
                <div key={u.username} className="px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${u.enabled ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <div>
                      <div className="text-zinc-100 font-medium">{u.username}</div>
                      <div className="text-zinc-500 text-xs flex items-center gap-2">
                        <span>{u.enabled ? 'Activo' : 'Deshabilitado'}</span>
                        <span className="text-zinc-700">·</span>
                        {(() => {
                          const act = formatActivity(u.lastActivity);
                          return (
                            <span className={`flex items-center gap-1 ${act.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${act.dot}`} />
                              {act.text}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => onViewStudent(u.username)} className={btnGhost + ' py-1.5 px-3 text-sm'}><Eye size={14} /> Ver datos</button>
                    <button onClick={() => onToggleUser(u.username)} className={(u.enabled ? btnDanger : btnGhost) + ' py-1.5 px-3 text-sm'}>
                      {u.enabled ? 'Deshabilitar' : 'Habilitar'}
                    </button>
                    <button onClick={() => onDeleteUser(u.username)} className="text-zinc-600 hover:text-red-400 transition-colors p-2"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StudentDataModal({ username, data, onClose }) {
  const results = useMemo(() => (data?.form ? calcAll(data.form) : null), [data]);
  const totals = useMemo(() => {
    if (!data?.mealPlan) return null;
    const t = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    Object.values(data.mealPlan.meals).forEach(entries => entries.forEach(en => {
      const m = entryMacros(en);
      t.kcal += m.kcal; t.protein += m.protein; t.carbs += m.carbs; t.fat += m.fat;
    }));
    return t;
  }, [data]);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 jb-body" onClick={e => e.stopPropagation()}>
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
                <p className="text-zinc-500 text-xs mt-2">Objetivo: {data.mealPlan.targetKcal} kcal/día</p>
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

function CalculatorTab({ form, setForm, results }) {
  const num = (k) => ({
    value: form[k],
    onChange: (e) => setForm(v => ({ ...v, [k]: e.target.value === '' ? '' : Number(e.target.value) })),
  });
  return (
    <div className="grid lg:grid-cols-2 gap-6">
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
          <Field label="Cuello (cm)" helpHref="/guia-cuello.png"><input type="number" className={inputCls} {...num('cuello')} /></Field>
          <Field label="Cintura (cm)" helpHref="/guia-cintura.png"><input type="number" className={inputCls} {...num('cintura')} /></Field>
          <Field label="Cadera (cm)" helpHref="/guia-cadera.png"><input type="number" className={inputCls} {...num('cadera')} /></Field>
          <Field label="Actividad física">
            <select value={form.actividad} onChange={e => setForm(v => ({ ...v, actividad: e.target.value }))} className={inputCls}>
              {Object.keys(ACTIVITY_FACTORS).map(a => <option key={a} value={a}>{a}</option>)}
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

function MealTab({ mealPlan, setMealPlan, tdee }) {
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
    setMealPlan(v => ({ ...v, meals: { ...v.meals, [meal]: [...v.meals[meal], { id: uid(), foodKey: '', grams: 100 }] } }));
  }
  function removeEntry(meal, id) {
    setMealPlan(v => ({ ...v, meals: { ...v.meals, [meal]: v.meals[meal].filter(en => en.id !== id) } }));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h2 className="jb-display text-base text-zinc-200 mb-4">OBJETIVO DIARIO</h2>
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
          {tdee && (
            <button onClick={() => setMealPlan(v => ({ ...v, targetKcal: Math.round(tdee) }))} className={btnGhost + ' text-sm'}>
              <Flame size={14} /> Usar mi GET ({Math.round(tdee)})
            </button>
          )}
        </div>
        {Math.abs(macroSum - 1) > 0.001 && (
          <p className="text-red-400 text-xs mt-2 flex items-center gap-1.5"><AlertTriangle size={13} /> Los porcentajes deben sumar 100% (ahora suman {Math.round(macroSum * 100)}%).</p>
        )}
      </div>

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
                return (
                  <div key={en.id} className="grid grid-cols-12 gap-2 items-center bg-zinc-950 border border-zinc-800 rounded-lg p-2">
                    <select value={en.foodKey} onChange={e => updateEntry(meal, en.id, { foodKey: e.target.value })}
                      className={inputCls + ' col-span-5 py-1.5'}>
                      <option value="">Selecciona un alimento…</option>
                      {FOOD_GROUPS.map(g => (
                        <optgroup key={g} label={g}>
                          {FOODS.filter(f => f.group === g).map(f => <option key={f.key} value={f.key}>{f.key}</option>)}
                        </optgroup>
                      ))}
                    </select>
                    <input type="number" value={en.grams} onChange={e => updateEntry(meal, en.id, { grams: e.target.value })}
                      className={inputCls + ' col-span-2 py-1.5'} placeholder="g" />
                    <div className="col-span-4 text-xs text-zinc-400 jb-body text-center">
                      {Math.round(m.kcal)} kcal · P {m.protein.toFixed(0)}g · C {m.carbs.toFixed(0)}g · G {m.fat.toFixed(0)}g
                    </div>
                    <button onClick={() => removeEntry(meal, en.id)} className="col-span-1 text-zinc-600 hover:text-red-400 flex justify-center"><Trash2 size={15} /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      <div className="bg-zinc-900 border border-orange-500/30 rounded-2xl p-5">
        <h3 className="jb-display text-sm text-zinc-200 mb-3">TOTAL DEL DÍA VS. OBJETIVO</h3>
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

function StudentDashboard({ username, form, setForm, mealPlan, setMealPlan, onLogout, saving }) {
  const [tab, setTab] = useState('calc');
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
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('calc')}
            className={`jb-display text-sm px-4 py-2.5 rounded-lg flex items-center gap-2 ${tab === 'calc' ? 'bg-orange-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}`}>
            <Dumbbell size={16} /> COMPOSICIÓN CORPORAL
          </button>
          <button onClick={() => setTab('meal')}
            className={`jb-display text-sm px-4 py-2.5 rounded-lg flex items-center gap-2 ${tab === 'meal' ? 'bg-orange-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}`}>
            <Salad size={16} /> PLAN DE ALIMENTACIÓN
          </button>
        </div>
        <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-xl p-3 flex items-center gap-2 mb-6">
          <MessageCircle className="text-emerald-500 shrink-0" size={16} />
          <p className="text-emerald-200 text-xs jb-body">¿Tienes dudas? Escríbele a tu entrenador tocando el botón verde de WhatsApp, abajo a la derecha.</p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 pb-12">
        {tab === 'calc'
          ? <CalculatorTab form={form} setForm={setForm} results={results} />
          : <MealTab mealPlan={mealPlan} setMealPlan={setMealPlan} tdee={results.tdee} />}
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
  const [viewingStudentData, setViewingStudentData] = useState(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [mealPlan, setMealPlan] = useState(EMPTY_MEALPLAN());
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef(null);
  const skipNextSave = useRef(true);

  useEffect(() => { init(); }, []);

  async function init() {
    let usersList = [];
    try {
      const { data, error } = await supabase.from('alumnos').select('*').order('created_at');
      if (error) throw error;
      usersList = (data || []).map(u => ({
        username: u.username, password: u.password, enabled: u.enabled, createdAt: u.created_at, lastActivity: null,
      }));
    } catch { usersList = []; }
    try {
      const { data: activityData } = await supabase.from('datos_alumnos').select('username, updated_at');
      const activityMap = {};
      (activityData || []).forEach(a => { activityMap[a.username] = a.updated_at; });
      usersList = usersList.map(u => ({ ...u, lastActivity: activityMap[u.username] || null }));
    } catch {}
    setUsers(usersList);
    try {
      const { data } = await supabase.from('config').select('value').eq('key', 'admin_password').maybeSingle();
      setAdminPass(data ? data.value : '');
    } catch { setAdminPass(''); }
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

  async function handleStudentLogin(username, password, setErr) {
    const u = users.find(x => x.username.toLowerCase() === username.toLowerCase());
    if (!u || u.password !== password) return setErr('Usuario o contraseña incorrectos.');
    if (!u.enabled) return setErr('Tu acceso fue deshabilitado por tu entrenador. Contáctalo para más información.');
    setBusy(true);
    let data = null;
    try {
      const { data: row } = await supabase.from('datos_alumnos').select('form, meal_plan').eq('username', u.username).maybeSingle();
      data = row ? { form: row.form, mealPlan: row.meal_plan } : null;
    } catch {}
    setCurrentUser(u.username);
    setForm(data?.form || EMPTY_FORM);
    setMealPlan(data?.mealPlan || EMPTY_MEALPLAN());
    skipNextSave.current = true;
    setBusy(false);
    setView('student');
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
    try { await supabase.from('alumnos').insert({ username: u.username, password: u.password, enabled: true }); } catch {}
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

  function logout() {
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
      {view === 'landing' && <Landing onChoose={setView} />}
      {view === 'adminAuth' && (
        <AdminAuth adminPassExists={!!adminPass} onBack={() => setView('landing')} busy={busy}
          onSetup={handleAdminSetup} onLogin={handleAdminLogin} />
      )}
      {view === 'studentAuth' && (
        <StudentAuth onBack={() => setView('landing')} busy={busy} onLogin={handleStudentLogin} />
      )}
      {view === 'admin' && adminAuthed && (
        <>
          <AdminDashboard users={users} onAddUser={addUser} onToggleUser={toggleUser}
            onDeleteUser={deleteUser} onLogout={logout} onViewStudent={openStudentData} />
          {viewingStudent && (
            <StudentDataModal username={viewingStudent} data={viewingStudentData}
              onClose={() => { setViewingStudent(null); setViewingStudentData(null); }} />
          )}
        </>
      )}
      {view === 'student' && currentUser && (
        <StudentDashboard username={currentUser} form={form} setForm={setForm}
          mealPlan={mealPlan} setMealPlan={setMealPlan} onLogout={logout} saving={saving} />
      )}
    </>
  );
}
