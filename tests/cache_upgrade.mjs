// An old worker deliberately serves broken unversioned modules. A fresh page must bypass them.
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,extname} from 'node:path';
import assert from 'node:assert/strict';
import {ASSETS} from '../scripts/release_integrity.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));let enableWorker=false;
const oldWorker=`self.addEventListener('install',e=>e.waitUntil(caches.open('note-trainer-stale-graph').then(async c=>{for(const f of ['cloud_ui.mjs','cloud_client.mjs','audio_readiness.mjs','experiments/supabase_sync/transport.mjs'])await c.put(new URL(f,self.location.href),new Response('throw new Error("STALE_MODULE_MUST_NOT_LOAD")',{headers:{'content-type':'text/javascript'}}));await self.skipWaiting();})));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(u.pathname.endsWith('.mjs')&&!u.search)e.respondWith(caches.open('note-trainer-stale-graph').then(async c=>(await c.match(e.request))||fetch(e.request)));});`;
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;res.setHeader('Cache-Control','no-store');
 if(path==='/old-worker.js'){res.setHeader('Content-Type','text/javascript');res.end(oldWorker);return;}
 if(path==='/upgrade.html'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><p>Upgrade fixture</p>');return;}
 if(path==='/sw.js'&&!enableWorker){res.writeHead(503);res.end('hold old controller until module check');return;}
 const name=path==='/'?'index.html':path.slice(1);
 if(![...ASSETS,'release.json'].includes(name)){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',mime[extname(name)]||'application/octet-stream');res.end(await readFile(join(root,name)));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port+'/';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const context=await browser.newContext({serviceWorkers:'allow'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'upgrade.html');await page.evaluate(async()=>{localStorage.setItem('nt.upgrade.keep','yes');await navigator.serviceWorker.register('./old-worker.js');});
 await page.waitForFunction(()=>navigator.serviceWorker.controller?.scriptURL.endsWith('/old-worker.js'));
 await page.goto(base+'index.html');await page.locator('#btnGateCloud').click();await page.locator('#cloudModal.open').waitFor();
 assert.equal(await page.evaluate(()=>navigator.serviceWorker.controller.scriptURL.endsWith('/old-worker.js')),true);
 enableWorker=true;await page.reload();await page.waitForFunction(()=>navigator.serviceWorker.controller?.scriptURL.endsWith('/sw.js'));
 await context.setOffline(true);await page.reload();await page.locator('#btnGateCloud').click();await page.locator('#cloudModal.open').waitFor();
 assert.equal(await page.evaluate(()=>localStorage.getItem('nt.upgrade.keep')),'yes');assert.deepEqual(errors,[]);
 console.log('PASS cache upgrade: stale module graph bypassed, current graph works fully offline, local data preserved');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
