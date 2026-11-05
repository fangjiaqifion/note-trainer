import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {randomUUID,createHash,randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {username,teacherKey,parseTeacherKey,invitationKey,parseInvitation} from '../portal_identity.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
test('identity syntax is alphanumeric and case-insensitive; credentials are independent',()=>{
 assert.equal(username('Teacher01'),'teacher01');
 for(const n of ['abc_','ab-c',' 中文','a b','abc\n','ab','a'.repeat(33)])assert.throws(()=>username(n));
 const key=randomBytes(32).toString('hex'),invite=randomBytes(24).toString('hex');
 assert.equal(parseTeacherKey(teacherKey(key)),key);assert.equal(parseInvitation(invitationKey(invite)),invite);
 assert.throws(()=>parseTeacherKey(invitationKey(invite)));assert.throws(()=>parseInvitation(teacherKey(key)));
});
test('portal: invite reuse, idempotency, MFA, suspension, reset, RLS, limits and data preservation',async()=>{
 const db=new PGlite(),owner=randomUUID(),a=randomUUID(),b=randomUUID(),c=randomUUID();
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
  for(const id of [owner,a,b,c])await db.query('insert into auth.users values($1)',[id]);
  for(const file of ['001_cloud.sql','002_archive_expiry.sql','003_teacher_portal.sql','004_automatic_students.sql'])await db.exec(await readFile(new URL('../scripts/migrations/'+file,import.meta.url),'utf8'));
  await db.query("insert into nt_private.portal_admins(user_id,require_mfa_after) values($1,now()-interval '1 minute')",[owner]);
  async function as(id,name,args=[],mfa=false){
   await db.exec('begin');
   try{
    await db.query("select set_config('request.jwt.claim.sub',$1,true)",[id]);
    await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({aal:mfa?'aal2':'aal1',amr:mfa?[{method:'totp',timestamp:Math.floor(Date.now()/1000)}]:[]})]);
    await db.exec('set local role authenticated');
    const out=(await db.query('select public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') a',args)).rows[0].a;
    await db.exec('commit');return out;
   }catch(e){await db.exec('rollback');throw e;}
  }
  await assert.rejects(as(owner,'nt_portal_admin_list'),/administrator/);
  await assert.rejects(as(a,'nt_portal_admin_list',[],true),/administrator/);
  const invitation=randomBytes(24).toString('hex'),secret=randomBytes(32).toString('hex'),second=randomBytes(32).toString('hex');
  const expiry=new Date(Date.now()+86400000).toISOString();
  const inviteId=await as(owner,'nt_portal_admin_invite',[hash(invitation),'batch',expiry,2],true);
  assert.equal(await as(owner,'nt_portal_admin_invite',[hash(invitation),'batch',expiry,2],true),inviteId);
  for(const name of ['teacher_name','Teacher-1','Test 01','中文老师'])assert.equal((await as(a,'nt_portal_register',[invitation,name,hash(secret)])).error,'invalid_registration');
  const first=await as(a,'nt_portal_register',[invitation,'Teacher01',hash(secret)]);
  assert.equal(first.username,'teacher01');assert.equal(first.role,'teacher');
  assert.deepEqual(await as(a,'nt_portal_register',[invitation,'Teacher01',hash(secret)]),first);
  assert.equal((await as(b,'nt_portal_register',[invitation,'TEACHER01',hash(second)])).error,'username_unavailable');
  const next=await as(b,'nt_portal_register',[invitation,'Teacher02',hash(second)]);assert.notEqual(first.workspace,next.workspace);
  assert.equal((await as(c,'nt_portal_register',[invitation,'Teacher03',hash(randomBytes(32).toString('hex'))])).error,'invitation_unavailable');
  const listing=await as(owner,'nt_portal_admin_list',[],true);assert.equal(listing.invites[0].used,2);assert.equal(listing.teachers.length,2);
  assert.equal(JSON.stringify(listing).includes(secret),false);assert.equal(JSON.stringify(listing).includes(hash(secret)),false);assert.equal(listing.invites[0].hash,undefined);
  assert.equal((await as(c,'nt_portal_login',['TEACHER01',secret])).workspace,first.workspace);
  assert.equal((await as(c,'nt_portal_login',['teacher02',secret])).error,'invalid_login');
  await assert.rejects(as(a,'nt_portal_admin_invite',[hash('bad'),'bad',expiry,1],true));
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[a]);await db.exec('set role authenticated');
  assert.equal((await db.query('select * from public.nt_cloud_workspaces')).rows.length,1);
  await assert.rejects(db.exec('select * from nt_private.portal_teachers'));await assert.rejects(db.exec('select * from nt_private.portal_admins'));await db.exec('reset role');
  const student=await as(a,'nt_cloud_add_student',[first.workspace,'local-a','P001']);
  await as(a,'nt_cloud_label',[student,'TEST01','#3C7DD9']);
  assert.equal((await as(a,'nt_cloud_labels',[first.workspace]))[0].display_name,'TEST01');
  assert.equal((await as(b,'nt_cloud_labels',[first.workspace])).length,0);
  const readOnly=randomUUID();await db.query('insert into auth.users values($1)',[readOnly]);
  const readOnlyCode=randomBytes(32).toString('hex');await as(a,'nt_cloud_issue',[first.workspace,null,'researcher',hash(readOnlyCode)]);await as(readOnly,'nt_cloud_claim',[readOnlyCode]);
  assert.equal((await as(readOnly,'nt_cloud_labels',[first.workspace])).length,0,'researchers never receive student display names');
  await assert.rejects(as(readOnly,'nt_cloud_label',[student,'INVALID','#3C7DD9']));
  await as(a,'nt_cloud_batch',[student,JSON.stringify([{id:randomUUID(),payload:{seq:1,first:true}}])]);
  const t=listing.teachers.find(t=>t.username==='teacher01');
  await as(owner,'nt_portal_admin_teacher',[t.id,false,'suspended'],true);
  await as(owner,'nt_portal_admin_note',[t.id,'updated while suspended'],true);
  assert.equal((await as(owner,'nt_portal_admin_list',[],true)).teachers.find(x=>x.id===t.id).enabled,false,'notes do not restore a suspended account');
  assert.equal((await as(c,'nt_portal_login',['teacher01',secret])).error,'invalid_login');await assert.rejects(as(a,'nt_cloud_codes',[first.workspace]));
  assert.equal((await db.query('select count(*)::int n from public.nt_cloud_events')).rows[0].n,1);
  await as(owner,'nt_portal_admin_teacher',[t.id,true,'restored'],true);
  const devices=await as(owner,'nt_portal_admin_devices',[t.id],true);
  await as(owner,'nt_portal_admin_revoke_device',[devices.find(d=>d.role==='teacher').id],true);
  const fresh=randomBytes(32).toString('hex');await db.query('select nt_private.portal_reset_teacher($1,$2)',[t.id,hash(fresh)]);
  assert.equal((await as(c,'nt_portal_login',['teacher01',secret])).error,'invalid_login');await assert.rejects(as(a,'nt_cloud_codes',[first.workspace]));
  assert.equal((await as(c,'nt_portal_login',['teacher01',fresh])).workspace,first.workspace);
  const archive=await as(c,'nt_cloud_backup',[first.workspace]);assert.equal(archive.events.length,1);
  assert.equal(archive.student_labels[0].display_name,'TEST01');
  assert.equal(archive.portal_teacher.username,'teacher01');assert.equal(archive.portal_teacher.initial_user,undefined);assert.equal(archive.portal_teacher.note,undefined);
  const restored=new PGlite();
  try{
   await restored.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
   for(const file of ['001_cloud.sql','002_archive_expiry.sql','003_teacher_portal.sql','004_automatic_students.sql'])await restored.exec(await readFile(new URL('../scripts/migrations/'+file,import.meta.url),'utf8'));
   await restored.query('select nt_private.restore_snapshot($1)',[JSON.stringify(archive)]);
   const uid=randomUUID();await restored.query('insert into auth.users values($1)',[uid]);await restored.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);await restored.exec('set role authenticated');
   const out=(await restored.query('select public.nt_portal_login($1,$2) a',['Teacher01',fresh])).rows[0].a;
   assert.equal(out.workspace,first.workspace);assert.equal((await restored.query('select * from public.nt_cloud_events')).rows.length,1);
   assert.equal((await restored.query('select public.nt_cloud_labels($1) a',[first.workspace])).rows[0].a[0].display_name,'TEST01');
  }finally{await restored.close();}
  await as(owner,'nt_portal_admin_update_invite',[inviteId,false,expiry,3],true);
  assert.equal((await as(b,'nt_portal_login',['teacher02',second])).workspace,next.workspace);
  await assert.rejects(as(owner,'nt_portal_admin_update_invite',[inviteId,true,expiry,1],true));
  for(let i=0;i<65;i++)await as(b,'nt_portal_login',['teacher02','0'.repeat(64)]);
  assert.equal((await as(b,'nt_portal_login',['teacher02',second])).error,'rate_limit');
  await db.query('update nt_private.portal_admins set enabled=false where user_id=$1',[owner]);await assert.rejects(as(owner,'nt_portal_admin_list',[],true));
  await db.query("update nt_private.portal_admins set enabled=true,require_mfa_after=now()+interval '1 minute' where user_id=$1",[owner]);
  await assert.rejects(as(owner,'nt_portal_admin_list',[],true),'owner recovery invalidates the old MFA proof');
  await db.exec('set role anon');assert.equal((await db.query('select public.nt_portal_health() a')).rows[0].a,true);
  await assert.rejects(db.query('select public.nt_portal_register($1,$2,$3)',[invitation,'Anonymous',hash(fresh)]));
 }finally{await db.close();}
});

test('health checks use only the dedicated RPC, retry finitely, and never log keys or responses',async()=>{
 const source=await readFile(new URL('../scripts/cloud_health.mjs',import.meta.url),'utf8');
 const run=new (Object.getPrototypeOf(async function(){}).constructor)('process','fetch','AbortSignal','setTimeout','console',source);
 for(const success of [true,false]){
  const output=[],p={env:{NT_SUPABASE_URL:'https://pokrwqirkjcjlworttvk.supabase.co',NT_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture'}};let calls=0;
  await run(p,async(url,options)=>{calls++;assert.ok(url.endsWith('/rest/v1/rpc/nt_portal_health'));assert.equal(options.headers.authorization,undefined);return {ok:success,json:async()=>success};},AbortSignal,fn=>fn(),{log:s=>output.push(s),error:s=>output.push(s)});
  assert.equal(calls,success?1:3);assert.equal(p.exitCode,success?undefined:1);assert.equal(output.join('').includes(p.env.NT_SUPABASE_PUBLISHABLE_KEY),false);
 }
});
