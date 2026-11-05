import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
test('old archives restore after code expiry without restoring access; only admin can reauthorize',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
  for(const file of ['001_cloud.sql','002_archive_expiry.sql'])await db.exec(await readFile(new URL('../scripts/migrations/'+file,import.meta.url),'utf8'));
  const w=randomUUID(),s=randomUUID(),u=randomUUID(),code='a'.repeat(64),now='2000-01-01T00:00:00Z';
  const archive={app:'note-trainer-cloud',version:1,workspace:{id:w,created_at:now},students:[{id:s,workspace_id:w,local_id:'legacy',code:'P001',state:{v:3,progress:{C4:{key:true}}},revision:7,updated_at:now}],events:[],codes:[{id:randomUUID(),workspace_id:w,student_id:null,role:'teacher',hash:hash(code),revoked:false,expires_at:now,created_at:now}]};
  await db.query('select nt_private.restore_snapshot($1)',[JSON.stringify(archive)]);
  await db.query('insert into auth.users values($1)',[u]);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[u]);await db.exec('set role authenticated');
  await assert.rejects(db.query('select public.nt_cloud_claim($1)',[code]));
  assert.equal((await db.query('select * from public.nt_cloud_students')).rows.length,0);
  await assert.rejects(db.query('select nt_private.restore_snapshot($1)',[JSON.stringify(archive)]));
  await db.exec('reset role');
  assert.equal((await db.query('select revision from public.nt_cloud_students where id=$1',[s])).rows[0].revision,7);
  const renewed='b'.repeat(64);
  await db.query("insert into nt_private.codes(workspace_id,role,hash,expires_at) values($1,'teacher',decode($2,'hex'),now()+interval '1 year')",[w,hash(renewed)]);
  await db.exec('set role authenticated');await db.query('select public.nt_cloud_claim($1)',[renewed]);
  assert.equal((await db.query('select state from public.nt_cloud_students')).rows[0].state.progress.C4.key,true);
 }finally{await db.close();}
});
