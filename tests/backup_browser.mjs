// Synthetic profiles in a disposable Chrome context, never the user's browser storage.
import {chromium} from 'playwright-core';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const server=spawn(process.execPath,['scripts/local_server.mjs','0'],{stdio:['ignore','pipe','pipe']});
const base=await new Promise((resolve,reject)=>{server.stdout.once('data',d=>resolve(String(d).match(/http:\/\/\S+/)[0]+'/'));server.once('error',reject);server.once('exit',c=>reject(Error('Server exit '+c)));});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({serviceWorkers:'block',acceptDownloads:true});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
function hash(text){let h=0x811c9dc5;for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,0x01000193);}return 'fnv1a:'+(h>>>0).toString(16);}
const pin={salt:'fixture',hash:hash('fixture:1234')};
const roster={v:1,accounts:[{id:'p1',name:'synthetic',...pin}],teacher:pin,locked:true,currentId:null,legacyImported:true};
const state={v:3,stars:{1:2},progress:{B3:{key:true,pos:true,fin:true},C4:{key:true,pos:true,fin:true},D4:{key:true,pos:true,fin:true}},events:[{seq:1,pseq:1,t:1,ms:100,first:true,skill:1,mode:'skill',note:'C4'}],selected:['B3','C4','D4'],autoHistory:[],battery:null,eventSeq:1,practiceSeq:1,level7:1,sound:false,speech:false};
async function teacher(){
 await page.locator('#btnGateTeacher').click();
 for(const n of '1234') await page.locator('#keypad [data-k="'+n+'"]').click();
 await page.locator('#btnRosterBackup').waitFor({state:'visible'});
}
async function download(button){const pending=page.waitForEvent('download');await page.locator(button).click();const file=await pending;return JSON.parse(await readFile(await file.path(),'utf8'));}
try{
 await page.goto(base);
 await page.evaluate(({roster,state})=>{localStorage.setItem('nt.accounts.v1',JSON.stringify(roster));localStorage.setItem('nt.state.p1.v1',JSON.stringify(state));},{roster,state});
 await page.reload();await teacher();
 const backup=await download('#btnRosterBackup');assert.deepEqual(backup.states.p1,state);
 const stale=await context.newPage();await stale.goto(base);
 const changed=structuredClone(backup);changed.roster.accounts[0].name='renamed';changed.states.p1.events.push({...state.events[0],seq:2,pseq:2});changed.states.p1.eventSeq=2;changed.states.p1.practiceSeq=2;
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('#rosterFile').setInputFiles({name:'roster.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(changed))});
 await page.waitForFunction(()=>window.__dbg?.ACCOUNTS?.stateGeneration);
 assert.equal(await page.evaluate(()=>window.__dbg.ACCOUNTS.accounts[0].name),'renamed');
 await teacher();const restored=await download('#btnRosterBackup');assert.deepEqual(restored.states,changed.states);
 const previous=await download('#btnPreviousBackup');assert.deepEqual(previous.states,backup.states);
 assert.equal(previous.roster.accounts[0].name,'synthetic');
 // A stale tab's login path calls saveAccounts/saveStore. Neither may revert the restore.
 await stale.locator('#whoGrid button').first().click();
 for(const n of '1234') await stale.locator('#keypad [data-k="'+n+'"]').click();
 await stale.waitForFunction(()=>document.body.textContent.includes('档案已在其他页面恢复'));
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('nt.accounts.v1')).accounts[0].name),'renamed');
 assert.deepEqual(errors,[]);
 console.log('PASS backup browser: teacher export, file restore, reload, full roundtrip, previous snapshot and stale tab protection');
}finally{await browser.close();server.kill();}
