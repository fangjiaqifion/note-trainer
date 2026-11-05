import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
const migration=(await readFile(new URL('../scripts/migrations/001_cloud.sql',import.meta.url),'utf8'))+'\n'+(await readFile(new URL('../scripts/migrations/002_archive_expiry.sql',import.meta.url),'utf8'));
const teacher=randomUUID(),learner=randomUUID(),researcher=randomUUID(),stranger=randomUUID(),otherTeacher=randomUUID();
const hash=x=>createHash('sha256').update(x).digest('hex');
test('real PostgreSQL: enrolment, recovery, RLS, scoped roles, revocation, immutable batches and CAS',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon; create role authenticated; create schema auth;
   create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
  for(const id of [teacher,learner,researcher,stranger,otherTeacher]) await db.query('insert into auth.users values($1)',[id]);
  await db.exec(migration);
  async function as(user,fn){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);await db.exec('set role authenticated');try{return await fn();}finally{await db.exec('reset role');}}
  const rpc=async(name,args)=> (await db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) as result`,args)).rows[0].result;
  const bootstrap=randomBytes(32).toString('hex');
  await db.query("insert into nt_private.bootstrap(hash,expires_at) values(decode($1,'hex'),now()+interval '1 hour')",[hash(bootstrap)]);
  const w=await as(teacher,()=>rpc('nt_cloud_create',[bootstrap]));
  assert.equal(await as(teacher,()=>rpc('nt_cloud_create',[bootstrap])),w);
  await assert.rejects(as(stranger,()=>rpc('nt_cloud_create',[bootstrap])));
  const s=await as(teacher,()=>rpc('nt_cloud_add_student',[w,'local1','P001']));
  assert.equal(await as(teacher,()=>rpc('nt_cloud_add_student',[w,'local1','P001'])),s);
  const s2=await as(teacher,()=>rpc('nt_cloud_add_student',[w,'local2','P002']));
  const grants={};
  for(const [role,user,student] of [['learner',learner,s],['researcher',researcher,null]]){
   const code=randomBytes(32).toString('hex');
   grants[role]=await as(teacher,()=>rpc('nt_cloud_issue',[w,student,role,hash(code)]));
   const claimed=await as(user,()=>rpc('nt_cloud_claim',[code]));assert.equal(claimed.role,role);
   assert.deepEqual(await as(user,()=>rpc('nt_cloud_claim',[code])),claimed);
  }
  const payload={seq:1,t:123,first:1,ms:100,kind:'find'},e=randomUUID();
  const batch=JSON.stringify([{id:e,payload}]);
  assert.deepEqual(await as(learner,()=>rpc('nt_cloud_batch',[s,batch])),[e]);
  assert.deepEqual(await as(learner,()=>rpc('nt_cloud_batch',[s,batch])),[e]);
  for(const [user,student] of [[learner,s2],[researcher,s],[stranger,s]]) await assert.rejects(as(user,()=>rpc('nt_cloud_batch',[student,batch])));
  await assert.rejects(as(learner,()=>rpc('nt_cloud_issue',[w,null,'teacher',hash('malicious')])));
  await assert.rejects(as(researcher,()=>rpc('nt_cloud_add_student',[w,'p3','P003'])));
  await as(stranger,async()=>assert.equal((await db.query('select * from public.nt_cloud_events')).rows.length,0));
  await as(learner,async()=>{
   assert.equal((await db.query('select * from public.nt_cloud_students')).rows.length,1);
   await assert.rejects(db.exec('select * from nt_private.codes'));
   await assert.rejects(db.exec('delete from public.nt_cloud_events'));
   await assert.rejects(db.exec("update public.nt_cloud_students set revision=99"));
  });
  await as(researcher,async()=>assert.equal((await db.query('select * from public.nt_cloud_events')).rows.length,1));
  const later=randomUUID();
  await assert.rejects(as(teacher,()=>rpc('nt_cloud_batch',[s,JSON.stringify([{id:later,payload},{id:e,payload:{...payload,ms:999}}])])));
  assert.equal((await db.query('select count(*)::int n from public.nt_cloud_events')).rows[0].n,1,'conflict rolls back entire batch');
  const state={v:3,progress:{},stars:{},selected:[],autoHistory:[],battery:null};
  const first=await as(learner,()=>rpc('nt_cloud_save',[s,0,JSON.stringify(state)]));assert.equal(first.revision,1);
  assert.equal((await as(learner,()=>rpc('nt_cloud_save',[s,0,JSON.stringify(state)]))).conflict,false,'lost response replay');
  assert.equal((await as(teacher,()=>rpc('nt_cloud_save',[s,0,JSON.stringify({...state,selected:['C4']})]))).conflict,true);
  await assert.rejects(as(researcher,()=>rpc('nt_cloud_save',[s,1,JSON.stringify(state)])));
  await as(teacher,()=>rpc('nt_cloud_revoke',[grants.learner]));
  await assert.rejects(as(learner,()=>rpc('nt_cloud_batch',[s,batch])));
  await as(learner,async()=>assert.equal((await db.query('select * from public.nt_cloud_events')).rows.length,0));
  // Revocation does not remove collected research records.
  await as(teacher,async()=>assert.equal((await db.query('select * from public.nt_cloud_events')).rows.length,1));
  const recovery=randomBytes(32).toString('hex');
  await as(teacher,()=>rpc('nt_cloud_issue',[w,null,'teacher',hash(recovery)]));
  const archive=await as(teacher,()=>rpc('nt_cloud_backup',[w]));
  assert.equal(archive.events.length,1);assert.equal(archive.students.length,2);
  assert.equal(JSON.stringify(archive).includes(recovery),false,'no plaintext recovery key in backup');
  await assert.rejects(as(researcher,()=>rpc('nt_cloud_backup',[w])));
  await assert.rejects(as(learner,()=>rpc('nt_cloud_devices',[w])));
  await as(otherTeacher,()=>rpc('nt_cloud_claim',[recovery]));
  const devices=await as(otherTeacher,()=>rpc('nt_cloud_devices',[w]));
  const root=devices.find(d=>d.role==='teacher'&&!d.current);
  await as(otherTeacher,()=>rpc('nt_cloud_revoke_device',[root.id]));
  await assert.rejects(as(teacher,()=>rpc('nt_cloud_codes',[w])),'original bootstrap device can be revoked');
  const restored=new PGlite();
  try{
   await restored.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$$$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$$$;
    grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`.replaceAll('$$',()=> '$'));
   await restored.exec(migration);
   await restored.query('select nt_private.restore_snapshot($1)',[JSON.stringify(archive)]);
   assert.equal((await restored.query('select count(*)::int n from public.nt_cloud_events')).rows[0].n,1);
   assert.equal((await restored.query('select state from public.nt_cloud_students where id=$1',[s])).rows[0].state.v,3);
   await assert.rejects(restored.query('select nt_private.restore_snapshot($1)',[JSON.stringify(archive)]),'never overwrite live workspace');
   const fresh=randomUUID();await restored.query('insert into auth.users values($1)',[fresh]);
   await restored.query("select set_config('request.jwt.claim.sub',$1,false)",[fresh]);await restored.exec('set role authenticated');
   assert.equal((await restored.query('select public.nt_cloud_claim($1) a',[recovery])).rows[0].a.role,'teacher');
   assert.equal((await restored.query('select count(*)::int n from public.nt_cloud_events')).rows[0].n,1,'teacher recovers without old auth identities');
   await assert.rejects(restored.query('select nt_private.restore_snapshot($1)',[JSON.stringify(archive)]),'restore is admin only');
  }finally{await restored.close();}
  await db.exec('set role anon');await assert.rejects(rpc('nt_cloud_codes',[w]));
 }finally{await db.close();}
});
