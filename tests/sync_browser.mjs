// UI-generated answers against a deterministic HTTP failure fixture. No student data.
import {chromium} from 'playwright-core';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const server=spawn(process.execPath,['scripts/local_server.mjs','0'],{stdio:['ignore','pipe','pipe']});
const base=await new Promise((resolve,reject)=>{server.stdout.once('data',data=>resolve(String(data).trim().match(/http:\/\/\S+/)[0]+'/'));server.once('error',reject);server.once('exit',c=>reject(new Error('Server exit '+c)));});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({serviceWorkers:'block'});
const page=await context.newPage(),remote=new Map(),calls=[];
let offline=false,lost=false;
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await context.route('**/__sync_test/config',r=>r.fulfill({json:{url:'https://pokrwqirkjcjlworttvk.supabase.co',publishableKey:'sb_publishable_fixture'}}));
await context.route('https://pokrwqirkjcjlworttvk.supabase.co/**',async route=>{
 const req=route.request();calls.push(req.url());
 if(offline) return route.abort('internetdisconnected');
 if(req.url().endsWith('/signup')) return route.fulfill({json:{access_token:'fixture',refresh_token:'fixture-refresh',expires_at:9999999999}});
 if(req.method()==='GET') return route.fulfill({json:[...remote.values()].map(e=>({event_id:e.id,participant_id:e.participant_id,payload:e.payload}))});
 const batch=req.postDataJSON().items;for(const e of batch) remote.set(e.id,e);
 if(lost && batch.length){lost=false;return route.abort('connectionreset');}
 return route.fulfill({json:batch.map(e=>e.id)});
});
async function answer(){
 await page.locator('#promptText').waitFor();
 const prompt=await page.locator('#promptText').innerText(),letter=prompt.match(/[BCD]/)[0];
 await page.locator('#answer [data-midi="'+({B:59,C:60,D:62}[letter])+'"]').click();
}
try{
 await page.goto(base+'index.html?sync_test=1');
 await page.locator('#syncNew').click();await page.getByRole('button',{name:'1 键盘上的位置 ★★★',exact:true}).click();
 await answer();await page.waitForFunction(()=>document.querySelector('#syncStatus').textContent.includes('本轮确认 1 题'),null,{timeout:16000});
 assert.equal(remote.size,1);assert.equal(calls.filter(u=>u.endsWith('nt_sync_batch')).length,1,'no diagnostic empty RPC on automatic sync');
 offline=true;
 await page.locator('#promptText').filter({hasNotText:await page.locator('#promptText').innerText()}).waitFor({timeout:2000}).catch(()=>{});
 await answer();await page.locator('#syncCheck').click();
 await page.waitForFunction(()=>document.querySelector('#syncStatus').textContent.includes('同步未完成'),null,{timeout:5000});
 await page.reload();await page.locator('#syncSwitch').click();
 assert.equal(await page.evaluate(()=>window.__dbg.S.events.length),2,'unsynced answer survives reload');
 offline=false;lost=true;await page.locator('#syncCheck').click();
 await page.waitForFunction(()=>document.querySelector('#syncStatus').textContent.includes('本轮确认 1 题'),null,{timeout:12000});
 assert.equal(remote.size,2,'lost response retry must not duplicate');
 await page.locator('#syncVerify').click();await page.waitForFunction(()=>document.querySelector('#syncStatus').textContent.includes('核对通过 2 / 2'),null,{timeout:5000});
 const second=await context.newPage();await second.goto(base+'index.html?sync_test=1');
 await second.getByText(/隔离测试已在另一个标签页打开/).waitFor();await second.close();
 assert.deepEqual(errors,[]);console.log('PASS browser sync: UI answers, 10s batching, offline reload, lost response retry, readback and tab lock');
}finally{await browser.close();server.kill();}
