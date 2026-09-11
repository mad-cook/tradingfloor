import {chromium} from 'playwright';import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];const samples=[];const missing=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/vo/')&&!r.ok())missing.push(r.url());});
await page.goto('http://localhost:3100');await page.getByRole('button',{name:'Enter the floor'}).click();
for(let i=0;i<50;i++){await page.waitForTimeout(250);samples.push(await page.evaluate(()=>window.__floorAudio));}
const active=samples.filter(Boolean);assert.ok(active.some(x=>x.played>=2),'Voices must actually play after entry');assert.ok(active.every(x=>x.active<=2),'No more than two foreground voices');assert.ok(active.at(-1).effects>0,'Office sound effects must play');
await page.screenshot({path:'reports/floor-voices.png',fullPage:true});
await page.getByRole('button',{name:'Mute sound',exact:true}).click();await page.waitForTimeout(1000);
const muted=await page.evaluate(()=>window.__floorAudio);assert.equal(muted.enabled,false);assert.equal(muted.active,0);assert.equal(await page.locator('.voice-bubble').count(),0);
await page.getByRole('button',{name:'Enable sound',exact:true}).click();await page.waitForTimeout(4500);const resumed=await page.evaluate(()=>window.__floorAudio);assert.equal(resumed.enabled,true);assert.ok(resumed.played>muted.played);
assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);assert.equal(resumed.failures,0);
await writeFile('reports/audio-check.json',JSON.stringify({samples:active,muted,resumed,errors,missing},null,2));console.log(JSON.stringify({maxVoices:Math.max(...active.map(s=>s.active)),muted,resumed,errors,missing},null,2));
await browser.close();

