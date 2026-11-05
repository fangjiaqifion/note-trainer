// Reuses the existing virtual learner. Does not create identities, permissions, or answer rows.
import {chromium} from 'playwright-core';
import {fileURLToPath} from 'node:url';
import {writeFile,chmod} from 'node:fs/promises';
import assert from 'node:assert/strict';
if(!process.argv.includes('--execute')){console.log('加 --execute 才复用现有虚拟学生检查完整离线启动。');process.exit(0);}
const dir=new URL('../.release/cloud_live/',import.meta.url);
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const path=fileURLToPath(new URL('learner.json',dir));
 const context=await browser.newContext({serviceWorkers:'allow',storageState:path}),page=await context.newPage();
 await page.goto('https://fangjiaqifion.github.io/note-trainer/index.html?build=156b85e041');
 await page.locator('#home.active').waitFor();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 const before=await page.evaluate(()=>window.__dbg.S.events);
 await context.setOffline(true);await page.reload();await page.locator('#home.active').waitFor();
 assert.equal(await page.evaluate(()=>navigator.onLine),false);
 assert.deepEqual(await page.evaluate(()=>window.__dbg.S.events),before);
 await page.getByRole('button',{name:'1 键盘上的位置 ★★★',exact:true}).click();await page.locator('#promptText').waitFor();
 await page.reload();await page.locator('#home.active').waitFor();assert.deepEqual(await page.evaluate(()=>window.__dbg.S.events),before);
 await context.setOffline(false);await context.storageState({path});await chmod(path,0o600);
 const result={complete:true,build:'156b85e041',fullNetworkOfflineReload:true,boundCloudProfileLoadsOffline:true,questionRendersOffline:true,answerCountUnchanged:before.length};
 await writeFile(new URL('offline_summary.json',dir),JSON.stringify(result,null,2),{mode:0o600});console.log(result);
}finally{await browser.close();}
