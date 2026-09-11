import {chromium} from 'playwright';import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('reports',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:3100',{waitUntil:'domcontentloaded'});
await page.getByRole('button',{name:'Enter the floor'}).click();
await page.waitForTimeout(6000);
await page.screenshot({path:'reports/floor-desktop.png',fullPage:true});
console.log('DESKTOP',await page.evaluate(()=>({title:document.title,overflow:document.documentElement.scrollWidth>innerWidth,metrics:window.__floorMetrics,labels:document.querySelectorAll('.desk-label').length})));
await page.locator('.desk-label').first().click({force:true});await page.waitForTimeout(1800);
await page.screenshot({path:'reports/floor-dossier.png',fullPage:true});
console.log('DOSSIER',await page.locator('.identity h2').textContent());
await page.keyboard.press('Escape');await page.getByRole('button',{name:'Trade ledger',exact:true}).click();
console.log('TICKETS',await page.locator('.ticket').count());
await page.getByRole('button',{name:'Personnel',exact:true}).click();console.log('PERSONNEL',await page.locator('.personnel>button').count());
await page.getByRole('button',{name:'Trading floor',exact:true}).click();await page.setViewportSize({width:390,height:844});await page.waitForTimeout(2000);
await page.screenshot({path:'reports/floor-mobile.png',fullPage:true});
console.log('MOBILE',await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,width:innerWidth})));
console.log('ERRORS',JSON.stringify(errors));await writeFile('reports/browser-check.json',JSON.stringify({errors,at:new Date().toISOString()},null,2));
await browser.close();if(errors.length)process.exitCode=1;




