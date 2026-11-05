// Read-only remote followup using the already recovered virtual teacher identity.
import {chromium} from 'playwright-core';
import {readFile,writeFile,chmod} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
if(!process.argv.includes('--execute')){console.log('加 --execute 才复用虚拟教师检查线上导出字段；不新增服务器权限或答题。');process.exit(0);}
const dir=new URL('../.release/cloud_live/',import.meta.url);
const release=JSON.parse(await readFile(new URL('../release.json',import.meta.url),'utf8'));
const learner=JSON.parse(await readFile(new URL('learner.json',dir),'utf8'));
const local=learner.origins.find(x=>x.origin==='https://fangjiaqifion.github.io').localStorage;
const account=JSON.parse(local.find(x=>x.name==='nt.accounts.v1').value).accounts[0];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const statePath=fileURLToPath(new URL('recovered_teacher.json',dir));
 const context=await browser.newContext({serviceWorkers:'block',storageState:statePath}),page=await context.newPage();
 await page.goto('https://fangjiaqifion.github.io/note-trainer/index.html?build='+release.build);
 assert.equal(await page.locator('meta[name="app-build"]').getAttribute('content'),release.build);
 // Set a disposable local switch PIN. The server identity is unchanged and already authorized.
 await page.locator('#btnGateTeacher').click();
 if(await page.locator('#teacherSetupModal.open').count()){await page.locator('#teacherPin').fill('1234');await page.locator('#teacherPin2').fill('1234');await page.locator('#btnTeacherSetupSave').click();}
 else for(const n of '1234')await page.locator('#keypad [data-k="'+n+'"]').click();
 await page.locator('#btnTeacherCloud').click();
 await page.locator('#cloudRoster .cloud-row').filter({hasText:'P001'}).getByRole('button',{name:'只读报告',exact:true}).click();
 await page.getByText('P001：2 题',{exact:false}).waitFor();
 const downloading=page.waitForEvent('download');await page.locator('#cloudReadReport button').click();const download=await downloading;
 const data=JSON.parse(await readFile(await download.path(),'utf8'));
 assert.equal(data.student_id,account.cloudStudent);assert.equal(data.workspace_id,account.cloudWorkspace);assert.equal(data.events.length,2);
 await page.locator('#cloudReadReport').scrollIntoViewIfNeeded();await page.screenshot({path:fileURLToPath(new URL('final_export_report.png',dir))});
 await context.storageState({path:statePath});await chmod(statePath,0o600);
 const result={build:release.build,stableStudentId:true,stableWorkspaceId:true,events:2,readOnlyFollowup:true};
 await writeFile(new URL('export_summary.json',dir),JSON.stringify(result,null,2),{mode:0o600});console.log(result);
}finally{await browser.close();}
