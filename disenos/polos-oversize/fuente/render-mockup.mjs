import { chromium } from '/opt/node-tools/node_modules/playwright-core/index.mjs';
const dir=new URL('.',import.meta.url).pathname;
const b=await chromium.launch({executablePath:process.env.CHROME,args:['--allow-file-access-from-files']});
for(const polo of ['negro','crema'])for(const vista of ['frente','espalda']){
 const p=await b.newPage({viewport:{width:1700,height:1560},deviceScaleFactor:1});
 await p.goto(`file://${dir}mockup.html?polo=${polo}&vista=${vista}`);
 await p.waitForSelector('body[data-listo]');
 await p.screenshot({path:`${dir}../mockups/mockup-polo-${polo}-${vista}.png`});await p.close();}
await b.close();
