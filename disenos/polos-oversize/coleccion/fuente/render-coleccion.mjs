// Renderiza las piezas de la colección a PNG transparente (300 dpi a tamaño real).
// Uso: node render-coleccion.mjs [filtro]   (CHROME=/opt/pw-browsers/chromium)
// Las piezas con el gorila llevan _BORRADOR: el logo original mide 400x480 px y está agrandado.
import { chromium } from '/opt/node-tools/node_modules/playwright-core/index.mjs';
const dir=new URL('.',import.meta.url).pathname, out=dir+'../imprenta/', f=process.argv[2]||'';
const piezas=[['1','espalda'],['1','frente',1],['1','nuca'],['2','espalda',1],['2','frente'],['2','nuca'],['3','frente',1],['3','espalda'],['3','nuca']];
const nombre={1:'diseno-1-barra-comida-a-comida',2:'diseno-2-logo-espalda',3:'diseno-3-logo-frente'};
const b=await chromium.launch({executablePath:process.env.CHROME||'/opt/pw-browsers/chromium',args:['--allow-file-access-from-files']});
for(const [d,pz,gor] of piezas)for(const polo of ['negro','crema']){
  const file=`${nombre[d]}-${pz}-polo-${polo}${gor?'_BORRADOR':''}.png`; if(!file.includes(f))continue;
  const p=await b.newPage({viewport:{width:1700,height:2000},deviceScaleFactor:3});
  await p.goto(`file://${dir}arte-coleccion.html?d=${d}&pieza=${pz}&polo=${polo}`);
  await p.waitForSelector('body[data-listo]');await p.waitForTimeout(400);
  const w=+await p.getAttribute('body','data-w'),h=+await p.getAttribute('body','data-h');
  await p.screenshot({path:out+file,omitBackground:true,clip:{x:0,y:0,width:w,height:h}});
  console.log(file,(w/39.37).toFixed(1)+' x '+(h/39.37).toFixed(1)+' cm');await p.close();}
await b.close();
