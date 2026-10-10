// Mockups de la colección: node render-mockups.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright-core/index.mjs';
const dir=new URL('.',import.meta.url).pathname;
const NOM={1:'diseno-1-comida-a-comida',2:'diseno-2-athletic-dept',3:'diseno-3-poster-peruano'};
const b=await chromium.launch({executablePath:process.env.CHROME||'/opt/pw-browsers/chromium',args:['--allow-file-access-from-files']});
for(const d of [1,2,3])for(const polo of ['negro','crema'])for(const vista of ['frente','espalda']){
 const p=await b.newPage({viewport:{width:1700,height:1560},deviceScaleFactor:1});
 await p.goto(`file://${dir}mockup.html?d=${d}&polo=${polo}&vista=${vista}`);
 await p.waitForSelector('body[data-listo]');
 await p.screenshot({path:`${dir}../mockups/${NOM[d]}-mockup-polo-${polo}-${vista}.png`});await p.close();}
await b.close();
