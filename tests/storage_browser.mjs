import {chromium} from 'playwright-core';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const server=spawn(process.execPath,['scripts/local_server.mjs','0'],{stdio:['ignore','pipe','pipe']});
const base=await new Promise((resolve,reject)=>{server.stdout.once('data',d=>resolve(String(d).match(/http:\/\/\S+/)[0]+'/'));server.once('error',reject);});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();
 await page.goto(base);await page.locator('#btnGateTeacher').click();
 await page.locator('#teacherPin').fill('1234');await page.locator('#teacherPin2').fill('1234');await page.locator('#btnTeacherSetupSave').click();
 await page.locator('#btnTeacherNew').click();await page.locator('#accName').fill('QUOTA-TEST');await page.locator('#accPin').fill('1111');await page.locator('#accPin2').fill('1111');await page.locator('#btnAccCreate').click();
 await page.getByRole('button',{name:'进入',exact:true}).click();
 await page.getByRole('button',{name:'1 键盘上的位置 ★★★',exact:true}).click();
 await page.evaluate(()=>{window.testStorageWrite=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('nt.state.'))throw new DOMException('quota','QuotaExceededError');return window.testStorageWrite.call(this,key,value);};});
 const letter=(await page.locator('#promptText').innerText()).match(/[BCD]/)[0];
 await page.locator('#answer [data-midi="'+({B:59,C:60,D:62}[letter])+'"]').click();
 await page.locator('#storageFailure.open').waitFor();
 assert.equal(await page.evaluate(()=>window.__dbg.G.i),0);
 const downloading=page.waitForEvent('download');await page.locator('#btnUnsavedBackup').click();const download=await downloading;
 const backup=JSON.parse(await readFile(await download.path(),'utf8'));assert.equal(backup.state.events.length,1);
 await page.evaluate(()=>{Storage.prototype.setItem=window.testStorageWrite;delete window.testStorageWrite;});
 await page.locator('#btnRetryStorage').click();await page.waitForFunction(()=>window.__dbg.G.i===1);
 assert.equal(await page.evaluate(()=>window.__dbg.S.events.length),1);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('nt.state.'+window.__dbg.CURRENT.id+'.v1')).events.length),1);
 console.log('PASS actual game storage failure: no next question, emergency download retains answer, retry advances once without duplicate');
}finally{await browser.close();server.kill();}
