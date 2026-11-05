// Isolated browser + real local PostgreSQL. No live project calls or real credentials.
import {PGlite} from '@electric-sql/pglite';
import {chromium} from 'playwright-core';
import {readFile,mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const db=new PGlite(),owner=randomUUID(),tokens=new Map(),contexts=[],errors=[];let chain=Promise.resolve(),loseRegistration=true,ownerHasFactor=false;
await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
await db.query('insert into auth.users values($1)',[owner]);
for(const f of ['001_cloud.sql','002_archive_expiry.sql','003_teacher_portal.sql'])await db.exec(await readFile(new URL('../scripts/migrations/'+f,import.meta.url),'utf8'));
await db.query("insert into nt_private.portal_admins(user_id,require_mfa_after) values($1,now()-interval '1 minute')",[owner]);
const server=spawn(process.execPath,['scripts/local_server.mjs','0'],{stdio:['ignore','pipe','pipe']});
const base=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Test server startup timed out')),10000);server.stdout.once('data',d=>{clearTimeout(timer);resolve(String(d).match(/http:\/\/\S+/)[0]+'/');});server.once('error',reject);server.once('exit',code=>{clearTimeout(timer);reject(Error('Test server exited before startup: '+code));});});
const browser=await chromium.launch({channel:'chrome',headless:true});
function token(uid,mfa=false){const key=randomUUID();tokens.set(key,{uid,mfa});return {access_token:key,refresh_token:key,expires_at:9999999999};}
async function context(){
 const c=await browser.newContext({serviceWorkers:'block'});contexts.push(c);c.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 await c.route('https://pokrwqirkjcjlworttvk.supabase.co/**',route=>{
  const run=async()=>{
   const req=route.request(),url=new URL(req.url()),body=req.postData()?req.postDataJSON():{},auth=tokens.get(req.headers().authorization?.replace('Bearer ',''));
   if(url.pathname.endsWith('/signup')){const id=randomUUID();await db.query('insert into auth.users values($1)',[id]);return route.fulfill({json:token(id)});}
   if(url.pathname.endsWith('/token')){
    if(url.searchParams.get('grant_type')==='password')return route.fulfill({json:token(owner)});
    const prev=tokens.get(body.refresh_token);return route.fulfill({json:token(prev.uid,prev.mfa)});
   }
   if(url.pathname.endsWith('/user'))return route.fulfill({json:{id:owner,factors:ownerHasFactor?[{id:'fixture-factor',factor_type:'totp',status:'verified',friendly_name:'Test authenticator'}]:[]}});
   if(url.pathname.endsWith('/factors'))return route.fulfill({json:{id:'fixture-factor',type:'totp',totp:{secret:'JBSWY3DPEHPK3PXP'}}});
   if(url.pathname.endsWith('/challenge'))return route.fulfill({json:{id:'fixture-challenge'}});
   if(url.pathname.endsWith('/verify')){ownerHasFactor=true;return route.fulfill({json:token(owner,true)});}
   if(url.pathname.endsWith('/logout'))return route.fulfill({status:204,body:''});
   await db.exec('begin');
   try{
    await db.query("select set_config('request.jwt.claim.sub',$1,true)",[auth?.uid||'']);
    await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({aal:auth?.mfa?'aal2':'aal1',amr:auth?.mfa?[{method:'totp',timestamp:Math.floor(Date.now()/1000)}]:[]})]);
    await db.exec(auth?'set local role authenticated':'set local role anon');
    let value;
    if(url.pathname.includes('/rpc/')){
     const name=url.pathname.split('/').pop();if(!/^nt_(cloud|portal)_[a-z_]+$/.test(name))throw Error('unexpected RPC');
     const pairs=Object.entries(body);if(pairs.some(([k])=>!/^[a-z_]+$/.test(k)))throw Error('bad parameter');
     value=(await db.query('select public.'+name+'('+pairs.map(([k],i)=>k+'=> $'+(i+1)).join(',')+') a',pairs.map(([,v])=>v&&typeof v==='object'?JSON.stringify(v):v))).rows[0].a;
    }else if(url.pathname.endsWith('/nt_cloud_students'))value=(await db.query('select * from public.nt_cloud_students where workspace_id=$1',[url.searchParams.get('workspace_id').slice(3)])).rows;
    else throw Error('unexpected API');
    await db.exec('commit');
    if(loseRegistration&&url.pathname.endsWith('/nt_portal_register')){loseRegistration=false;return route.abort('connectionreset');}
    return route.fulfill({json:value});
   }catch(e){await db.exec('rollback');return route.fulfill({status:e.code==='42501'?403:400,json:{message:'fixture rejected request'}});}
  };chain=chain.then(run,run);return chain;
 });return c;
}
try{
 const admin=await context(),m=await admin.newPage();await m.goto(base+'manage.html');
 await m.locator('#email').fill('admin@example.invalid');await m.locator('#password').fill('fixture-password');await m.locator('#loginForm button').click();
 await m.locator('#mfaForm').waitFor({state:'visible'});assert.equal(await m.locator('#enrollment').isVisible(),true);assert.equal(await m.locator('#dashboard').isVisible(),false);
 await m.locator('#otp').fill('123456');await m.locator('#mfaForm button').click();await m.locator('#dashboard').waitFor({state:'visible'});
 await m.locator('#newInvite').click();await m.locator('#inviteNote').fill('Synthetic group');await m.locator('#inviteLimit').fill('2');await m.locator('#inviteForm button').first().click();
 await m.locator('#issuedPanel').waitFor({state:'visible'});const invite=await m.locator('#issuedInvite').inputValue();assert.ok(invite.startsWith('INV-'));
 await m.locator('#savedInvite').click();
 const teacher=await context(),p=await teacher.newPage();await p.goto(base);await p.locator('#btnGateTeacher').click();await p.locator('#teacherPin').fill('1234');await p.locator('#teacherPin2').fill('1234');await p.locator('#btnTeacherSetupSave').click();
 await p.locator('#btnTeacherCloud').click();await p.locator('#cloudRegisterTab').click();await p.locator('#cloudInvitation').fill(invite);await p.locator('#cloudRegisterName').fill('Teacher_01');await p.locator('#cloudRegister').click();
 await p.waitForFunction(()=>document.querySelector('#cloudStatus').textContent.includes('不允许空格或符号'));
 assert.equal((await db.query('select count(*)::int n from nt_private.portal_teachers')).rows[0].n,0);
 await p.locator('#cloudRegisterName').fill('Teacher01');await p.locator('#cloudRegister').click();
 await p.waitForFunction(()=>document.querySelector('#cloudModal').getAttribute('aria-busy')!=='true');
 // The first request committed but its response was lost. A retry must not consume a second slot.
 await p.locator('#cloudRegister').click();await p.locator('#cloudPacket').waitFor({state:'visible'});
 const key=await p.locator('#cloudIssued').inputValue();assert.ok(key.startsWith('NT2-'));
 assert.equal((await db.query('select used from nt_private.portal_invites')).rows[0].used,1);
 await p.reload();await p.locator('#btnGateTeacher').click();for(const n of '1234')await p.locator('#keypad [data-k="'+n+'"]').click();await p.locator('#btnTeacherCloud').click();
 await p.locator('#cloudPacket').waitFor({state:'visible'});assert.ok((await p.locator('#cloudIssued').inputValue())===key,'unconfirmed credential survives reload');await p.locator('#cloudSavedCode').click();
 assert.equal(await p.evaluate(()=>localStorage.getItem('nt.cloud.registrationPending')),null);
 const other=await context(),q=await other.newPage();await q.goto(base);await q.locator('#btnGateCloud').click();await q.locator('#cloudLoginName').fill('TEACHER01');await q.locator('#cloudLoginKey').fill(key);await q.locator('#cloudLocalPin').fill('4321');await q.locator('#cloudLogin').click();
 await q.waitForFunction(()=>document.querySelector('#cloudStatus').textContent.includes('当前云端角色：教师'));
 assert.equal(await q.locator('#cloudLoginKey').inputValue(),'');
 const denial=await q.evaluate(async()=>{const c=JSON.parse(localStorage.getItem('nt.cloud.config')),k=JSON.parse(localStorage.getItem('nt.cloud.authKey')),s=JSON.parse(localStorage.getItem(k));return (await fetch(c.url+'/rest/v1/rpc/nt_portal_admin_list',{method:'POST',headers:{apikey:c.publishableKey,authorization:'Bearer '+s.access_token,'content-type':'application/json'},body:'{}'})).status;});assert.equal(denial,403);
 await m.locator('#refresh').click();await m.locator('#teachersTab').click();await m.locator('#search').fill('teacher01');await m.locator('#teacherTable button').click();
 m.once('dialog',d=>d.accept());await m.locator('#toggleTeacher').click();await m.waitForFunction(()=>document.querySelector('#toggleTeacher').textContent==='恢复账户');
 await m.locator('#teacherNote').fill('Synthetic suspended account');await m.locator('#saveTeacherNote').click();await m.waitForFunction(()=>document.querySelector('#toggleTeacher').textContent==='恢复账户');
 await q.locator('#cloudRefresh').click();await q.waitForFunction(()=>document.querySelector('#cloudStatus').textContent.includes('已停用或本机授权已撤销'));
 // Empty RLS reads are expected on suspension; write/management operations must explicitly fail.
 const deniedCodes=await q.evaluate(async()=>{const c=JSON.parse(localStorage.getItem('nt.cloud.config')),k=JSON.parse(localStorage.getItem('nt.cloud.authKey')),s=JSON.parse(localStorage.getItem(k)),a=JSON.parse(localStorage.getItem('nt.cloud.access'));return (await fetch(c.url+'/rest/v1/rpc/nt_cloud_codes',{method:'POST',headers:{apikey:c.publishableKey,authorization:'Bearer '+s.access_token,'content-type':'application/json'},body:JSON.stringify({w:a.workspace})})).status;});assert.equal(deniedCodes,403);
 await mkdir(new URL('../.release/portal_preview/',import.meta.url),{recursive:true});
 await m.screenshot({path:fileURLToPath(new URL('../.release/portal_preview/manage.png',import.meta.url)),fullPage:true});
 await q.locator('#cloudSwitch').click();
 await q.screenshot({path:fileURLToPath(new URL('../.release/portal_preview/login.png',import.meta.url)),fullPage:true});
 await m.setViewportSize({width:390,height:844});assert.ok(await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const direct=await context(),v=await direct.newPage();await v.setViewportSize({width:390,height:844});await v.goto(base);await v.locator('#btnGateCloud').click();await v.locator('#cloudRegisterTab').click();
 await v.locator('#cloudInvitation').fill(invite);await v.locator('#cloudRegisterName').fill('Teacher02');await v.locator('#cloudLocalPin').fill('5678');await v.locator('#cloudRegister').click();await v.locator('#cloudPacket').waitFor({state:'visible'});
 assert.equal((await db.query('select used from nt_private.portal_invites')).rows[0].used,2);
 assert.ok(await v.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'registration key must not overflow mobile viewport');
 await v.locator('#cloudSavedCode').click();

 assert.deepEqual(errors,[]);console.log('PASS portal UI: MFA gate, invitation issue, validation, lost registration receipt, saved key recovery, new-device login, admin denial and suspension.');
}finally{await browser.close();server.kill();await db.close();}
