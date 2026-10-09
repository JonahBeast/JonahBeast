import { chromium } from '/opt/node-tools/node_modules/playwright-core/index.mjs';
const [,,html,out,w,h,query]=process.argv;
const b=await chromium.launch({executablePath:process.env.CHROME});
const p=await b.newPage({viewport:{width:+w,height:+h},deviceScaleFactor:3});
await p.goto('file://'+html+'?'+query);
await p.waitForSelector('body[data-listo]');await p.waitForTimeout(300);
await p.screenshot({path:out,omitBackground:true,fullPage:false});
await b.close();
