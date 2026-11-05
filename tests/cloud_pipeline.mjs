// Standard game UI + real PostgreSQL permissions through a deterministic HTTP adapter.
// Independent contexts stand in for devices; no sync_test flag and no localStorage seeding.
import {PGlite} from '@electric-sql/pglite';
import {chromium} from 'playwright-core';
import {spawn} from 'node:child_process';
import {readFile,mkdir,writeFile,access,chmod} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const LIVE=process.env.NT_CLOUD_LIVE==='1';
const liveDir=new URL('../.release/cloud_live/',import.meta.url);
let run={stage:'starting'},contexts=[];
if(LIVE){
 await mkdir(liveDir,{recursive:true});
 if(await access(new URL('teacher.json',liveDir)).then(()=>true,()=>false))throw Error('已有线上验收身份。请复用已保存会话排查，禁止盲目重建班级。');
}
const db=LIVE?null:new PGlite();
if(db){
await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
await db.exec(await readFile(new URL('../scripts/migrations/001_cloud.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../scripts/migrations/002_archive_expiry.sql',import.meta.url),'utf8'));
}
const bootstrap=LIVE?(await readFile(new URL('../.release/cloud_bootstrap.txt',import.meta.url),'utf8')).trim():randomBytes(32).toString('hex');
const config=LIVE?JSON.parse(await readFile(new URL('../.release/browser_test_config.json',import.meta.url),'utf8')):{url:'https://pokrwqirkjcjlworttvk.supabase.co',publishableKey:'sb_publishable_fixture'};
if(!/^[a-f0-9]{64}$/.test(bootstrap))throw Error('开通码文件格式错误');
if(db)await db.query("insert into nt_private.bootstrap(hash,expires_at) values(decode($1,'hex'),now()+interval '1 hour')",[createHash('sha256').update(bootstrap).digest('hex')]);
const server=spawn(process.execPath,['scripts/local_server.mjs','0'],{stdio:['ignore','pipe','pipe']});
const localBase=await new Promise((resolve,reject)=>{server.stdout.once('data',d=>resolve(String(d).match(/http:\/\/\S+/)[0]+'/'));server.once('error',reject);});
const base=LIVE?'https://fangjiaqifion.github.io/note-trainer/':localBase;
const browser=await chromium.launch({channel:'chrome',headless:true});
let chain=Promise.resolve(),lose=false,offline=false;
const errors=[],calls=[];
async function context(){
 const c=await browser.newContext({serviceWorkers:'block'});contexts.push(c);
 if(LIVE){
  await c.route('https://pokrwqirkjcjlworttvk.supabase.co/**',async route=>{
   calls.push(new URL(route.request().url()).pathname);
   if(offline)return route.abort('internetdisconnected');
   if(lose && route.request().url().endsWith('/nt_cloud_batch')){const response=await route.fetch();if(response.ok()){lose=false;return route.abort('connectionreset');}return route.fulfill({response});}
   return route.continue();
  });
  c.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));return c;
 }
 await c.route('https://pokrwqirkjcjlworttvk.supabase.co/**',route=>{
  const run=async()=>{
   const req=route.request(),u=new URL(req.url()),body=req.postData()?req.postDataJSON():{};
   calls.push(u.pathname);
   if(offline)return route.abort('internetdisconnected');
   if(u.pathname.endsWith('/signup')){const id=randomUUID();await db.query('insert into auth.users values($1)',[id]);return route.fulfill({json:{access_token:id,refresh_token:id,expires_at:9999999999}});}
   if(u.pathname.endsWith('/token'))return route.fulfill({json:{access_token:body.refresh_token,refresh_token:body.refresh_token,expires_at:9999999999}});
   const uid=req.headers().authorization?.replace('Bearer ','');
   await db.exec('begin');
   try{
    await db.query("select set_config('request.jwt.claim.sub',$1,true)",[uid]);await db.exec('set local role authenticated');
    let value;
    if(u.pathname.includes('/rpc/')){
     const name=u.pathname.split('/').pop();if(!/^nt_cloud_[a-z_]+$/.test(name))throw Error('invalid RPC');
     const params=Object.entries(body);const query=`select public.${name}(${params.map(([k],i)=>{if(!/^[a-z_]+$/.test(k))throw Error('invalid parameter');return k+'=> $'+(i+1);}).join(',')}) result`;
     value=(await db.query(query,params.map(([,v])=>v && typeof v==='object'?JSON.stringify(v):v))).rows[0].result;
    }else if(u.pathname.endsWith('/nt_cloud_students')){
     const sid=u.searchParams.get('id')?.slice(3),w=u.searchParams.get('workspace_id')?.slice(3);
     value=(await db.query('select * from public.nt_cloud_students where '+(sid?'id=$1':'workspace_id=$1')+' order by id',[sid||w])).rows;
    }else if(u.pathname.endsWith('/nt_cloud_events')){
     value=(await db.query('select cursor::text,event_id,payload from public.nt_cloud_events where student_id=$1 and cursor>$2 order by cursor limit 500',[u.searchParams.get('student_id').slice(3),u.searchParams.get('cursor').slice(3)])).rows;
    }else throw Error('unexpected endpoint');
    await db.exec('commit');
    if(lose&&u.pathname.endsWith('_batch')){lose=false;return route.abort('connectionreset');}
    return route.fulfill({json:value});
   }catch(e){await db.exec('rollback');return route.fulfill({status:e.code==='42501'?403:400,json:{message:'fixture rejected request',code:e.code||'fixture'}});}
  };
  chain=chain.then(run,run);return chain;
 });
 c.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));return c;
}
async function pin(page,value){for(const n of value)await page.locator('#keypad [data-k="'+n+'"]').click();}
async function teacher(page){await page.locator('#btnGateTeacher').click();await pin(page,'1234');await page.locator('#btnTeacherCloud').waitFor({state:'visible'});await page.locator('#btnTeacherCloud').click();}
async function answer(page){await page.locator('#promptText').waitFor();const text=await page.locator('#promptText').innerText(),letter=text.match(/[BCD]/)[0];await page.locator('#answer [data-midi="'+({B:59,C:60,D:62}[letter])+'"]').click();}
async function waitStatus(page,fragment){await page.waitForFunction(text=>document.querySelector('#cloudStatus').textContent.includes(text),fragment,{timeout:20000});}
async function checkpoint(stage){run.stage=stage;if(LIVE){for(let i=0;i<contexts.length;i++){const path=fileURLToPath(new URL(['teacher.json','learner.json','researcher.json'][i]||('device'+i+'.json'),liveDir));await contexts[i].storageState({path});await chmod(path,0o600);}await writeFile(new URL('status.json',liveDir),JSON.stringify(run,null,2),{mode:0o600});}}
async function serverRows(page){return page.evaluate(async()=>{
 const cfg=JSON.parse(localStorage.getItem('nt.cloud.config')),key=JSON.parse(localStorage.getItem('nt.cloud.authKey')||'"nt.cloud.auth"'),session=JSON.parse(localStorage.getItem(key));
 const student=window.__dbg.ACCOUNTS.accounts.find(a=>a.cloudStudent).cloudStudent;
 const response=await fetch(cfg.url+'/rest/v1/nt_cloud_events?select=event_id,payload&student_id=eq.'+student,{headers:{apikey:cfg.publishableKey,authorization:'Bearer '+session.access_token},cache:'no-store'});
 if(!response.ok)throw Error('server readback failed');return response.json();
});}
try{
 const probe=await browser.newContext({serviceWorkers:'block'}),bad=await probe.newPage();
 await bad.route('**/cloud_ui.mjs*',r=>r.fulfill({status:503,body:'unavailable'}));
 await bad.goto(base+'index.html?verify=module-failure');
 await bad.waitForFunction(()=>document.title==='note-trainer-load:failed:module-failure');
 await probe.close();
 const first=await context(),p=await first.newPage();await p.goto(base);
 if(LIVE){const release=JSON.parse(await readFile(new URL('../release.json',import.meta.url),'utf8'));assert.equal(await p.locator('meta[name="app-build"]').getAttribute('content'),release.build);run.build=release.build;}
 await checkpoint('standard page opened');
 await p.locator('#btnGateTeacher').click();await p.locator('#teacherPin').fill('1234');await p.locator('#teacherPin2').fill('1234');await p.locator('#btnTeacherSetupSave').click();
 await p.locator('#btnTeacherNew').click();await p.locator('#accName').fill('TEST01');await p.locator('#accPin').fill('1111');await p.locator('#accPin2').fill('1111');await p.locator('#btnAccCreate').click();
 await p.locator('#btnTeacherCloud').click();await p.locator('#cloudRecoveryTab').click();await p.locator('summary').filter({hasText:'首次开通班级'}).click();
 await p.locator('#cloudConfig').setInputFiles({name:'config.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(config))});
 await waitStatus(p,'配置已加载');await p.locator('#cloudBootstrap').fill(bootstrap);await p.locator('#cloudCreate').click();await waitStatus(p,'恢复码已生成');
 const teacherRecovery=await p.locator('#cloudIssued').inputValue();assert.ok(teacherRecovery.startsWith('nt1.'));if(LIVE)await writeFile(new URL('teacher_recovery.json',liveDir),JSON.stringify({recovery:teacherRecovery}),{mode:0o600});await checkpoint('cloud class created');
 await p.locator('#cloudParticipant').fill('P001');p.once('dialog',d=>d.accept());await p.locator('#cloudBind').click();
 await p.waitForFunction(()=>!!window.__dbg?.ACCOUNTS.accounts[0]?.cloudStudent);
 await teacher(p);await p.locator('#cloudRetry').click();await waitStatus(p,'本机记录已同步');await p.locator('#cloudRefresh').click();
 await p.locator('#cloudRoster button').filter({hasText:'学生恢复码'}).click();await waitStatus(p,'恢复码已生成');const learnerRecovery=await p.locator('#cloudIssued').inputValue();if(LIVE)await writeFile(new URL('learner_recovery.json',liveDir),JSON.stringify({recovery:learnerRecovery}),{mode:0o600});
 await p.locator('#cloudSafety summary').click();await p.locator('#cloudResearchCode').click();await waitStatus(p,'恢复码已生成');
 await p.waitForFunction(previous=>document.querySelector('#cloudIssued').value!==previous,learnerRecovery);const researcherRecovery=await p.locator('#cloudIssued').inputValue();if(LIVE)await writeFile(new URL('researcher_recovery.json',liveDir),JSON.stringify({recovery:researcherRecovery}),{mode:0o600});await checkpoint('scoped codes issued');
 await p.locator('#cloudClose').click();await p.locator('#btnTeacherExit').click();await p.locator('#whoGrid button').first().click();await pin(p,'1111');
 await p.getByRole('button',{name:'1 键盘上的位置 ★★★',exact:true}).click();await answer(p);
 // Wait for the genuine ten-second auto-batch after an actual UI answer.
 await waitStatus(p,'本机记录已同步');
 await p.waitForFunction(()=>JSON.parse(localStorage.getItem('nt.cloud.meta.'+window.__dbg.CURRENT.cloudStudent)||'{}').ack?.length===1);
 if(db)assert.equal((await db.query('select count(*)::int n from public.nt_cloud_events')).rows[0].n,1);
 else{const rows=await serverRows(p),events=await p.evaluate(()=>window.__dbg.S.events);assert.equal(rows.length,1);assert.deepEqual(rows[0].payload,events[0]);}
 await checkpoint('actual answer read back');
 const second=await context(),q=await second.newPage();await q.goto(base);await q.locator('#btnGateCloud').click();await q.locator('#cloudRecoveryTab').click();await q.locator('#cloudRecovery').fill(learnerRecovery);await q.locator('#cloudRecover').click();await waitStatus(q,'学生');
 await q.locator('#cloudLocalPinBox summary').click();await q.locator('#cloudLocalPin').fill('2222');q.once('dialog',d=>d.accept());await q.locator('#cloudRoster button').filter({hasText:'载入本机'}).click();
 await q.waitForFunction(()=>!!window.__dbg?.ACCOUNTS.accounts[0]?.cloudStudent);await q.locator('#whoGrid button').first().click();await pin(q,'2222');await q.locator('#home.active').waitFor();
 assert.equal(await q.evaluate(()=>window.__dbg.S.events.length),1,'new device restores the actual answer');
 await q.getByRole('button',{name:'1 键盘上的位置 ★★★',exact:true}).click();offline=true;await answer(q);await q.reload();
 await q.waitForFunction(()=>document.querySelector('#home.active')||document.querySelector('#gate.active'));if(await q.locator('#gate.active').count()){await q.locator('#whoGrid button').first().click();await pin(q,'2222');}await q.locator('#home.active').waitFor();assert.equal(await q.evaluate(()=>window.__dbg.S.events.length),2,'offline UI answer survives reload');
 offline=false;lose=true;
 await q.locator('#btnSettings').click();await q.locator('#btnCloudSettings').click();await q.locator('#cloudRetry').click();
 await q.waitForFunction(()=>JSON.parse(localStorage.getItem('nt.cloud.meta.'+window.__dbg.CURRENT.cloudStudent)||'{}').ack?.length===2,null,{timeout:20000});
 if(db)assert.equal((await db.query('select count(*)::int n from public.nt_cloud_events')).rows[0].n,2,'lost response retry is idempotent');
 else{const rows=await serverRows(q),events=await q.evaluate(()=>window.__dbg.S.events);assert.equal(rows.length,2);for(const e of events)assert.deepEqual(rows.find(r=>r.event_id===e.id).payload,e);}
 await checkpoint('second device offline and lost receipt read back');
 const third=await context(),r=await third.newPage();await r.goto(base);await r.locator('#btnGateCloud').click();await r.locator('#cloudRecoveryTab').click();await r.locator('#cloudRecovery').fill(researcherRecovery);await r.locator('#cloudLocalPin').fill('3333');await r.locator('#cloudRecover').click();await waitStatus(r,'研究者只读');
 assert.equal(await r.locator('#cloudRoster button').filter({hasText:'载入本机'}).count(),0);
 await r.locator('#cloudRoster button').filter({hasText:'只读报告'}).click();await r.getByText('P001：2 题',{exact:false}).waitFor();
 const exporting=r.waitForEvent('download');await r.locator('#cloudReadReport button').click();const exported=await exporting;
 const exportData=JSON.parse(await readFile(await exported.path(),'utf8'));
 assert.equal(exportData.participant,'P001');assert.equal(exportData.events.length,2);
 assert.equal(exportData.student_id,await q.evaluate(()=>window.__dbg.CURRENT.cloudStudent));
 assert.equal(exportData.workspace_id,await q.evaluate(()=>window.__dbg.CURRENT.cloudWorkspace));
 if(LIVE){
  const denied=await r.evaluate(async()=>{const cfg=JSON.parse(localStorage.getItem('nt.cloud.config')),key=JSON.parse(localStorage.getItem('nt.cloud.authKey')),session=JSON.parse(localStorage.getItem(key)),access=JSON.parse(localStorage.getItem('nt.cloud.access'));const profiles=await fetch(cfg.url+'/rest/v1/nt_cloud_students?select=id',{headers:{apikey:cfg.publishableKey,authorization:'Bearer '+session.access_token}}).then(r=>r.json());const response=await fetch(cfg.url+'/rest/v1/rpc/nt_cloud_batch',{method:'POST',headers:{apikey:cfg.publishableKey,authorization:'Bearer '+session.access_token,'content-type':'application/json'},body:JSON.stringify({s:profiles[0].id,items:[]})});return response.status;});
  assert.equal(denied,403);await r.screenshot({path:fileURLToPath(new URL('researcher_report.png',liveDir))});run.realReadback=2;run.researcherWriteStatus=denied;run.requests=calls.length;
 }
 assert.deepEqual(errors,[]);await checkpoint('complete');
 console.log('PASS standard-page cloud pipeline: UI-created teacher/student, enrolment, scoped recovery, actual answer upload, second-device history, offline reload, lost receipt retry and readonly researcher report');
}catch(error){run.failureType=error.name;await checkpoint('failed: '+run.stage);if(LIVE){console.error('线上验收中断，已保留虚拟身份与诊断阶段；未打印凭据。');process.exitCode=1;}else throw error;}finally{if(LIVE)await checkpoint(run.stage);await browser.close();server.kill();if(db)await db.close();}
