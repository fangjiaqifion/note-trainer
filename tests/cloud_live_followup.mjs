// Requires explicit approval: add a virtual student, recover a teacher, revoke two virtual grants.
// Reuses only the virtual class saved by cloud_pipeline; never selects another workspace.
import {readFile,writeFile,access} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import {createCloudClient,decodeRecovery} from '../cloud_client.mjs';
if(!process.argv.includes('--execute')){console.log('待明确授权：仅针对 cloud_live 虚拟班级，新增第二学生、恢复教师、撤销虚拟码/设备、验证隔离灾备。加 --execute 才执行。');process.exit(0);}
const dir=new URL('../.release/cloud_live/',import.meta.url),origin='https://fangjiaqifion.github.io';
async function saved(name){const state=JSON.parse(await readFile(new URL(name,dir),'utf8'));return new Map((state.origins.find(x=>x.origin===origin)?.localStorage||[]).map(x=>[x.name,x.value]));}
function client(data){const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};return createCloudClient({storage,locks:{request:async(_,fn)=>fn()}});}
async function save(name,data){await writeFile(new URL(name,dir),JSON.stringify({cookies:[],origins:[{origin,localStorage:[...data].map(([name,value])=>({name,value}))}]}),{mode:0o600});}
const rootData=await saved('teacher.json'),learnerData=await saved('learner.json'),researchData=await saved('researcher.json');
const root=client(rootData),learner=client(learnerData),researcher=client(researchData);
const recovery=JSON.parse(await readFile(new URL('teacher_recovery.json',dir),'utf8')).recovery;
const recoveredData=await access(new URL('recovered_teacher.json',dir)).then(()=>saved('recovered_teacher.json'),()=>new Map());
const teacher=client(recoveredData);let stage='teacher recovery';
try{
 if(!teacher.access)await teacher.recover(recovery);await save('recovered_teacher.json',recoveredData);
 assert.equal(teacher.access.role,'teacher');
 const primary=(await teacher.students()).find(s=>s.code==='P001');assert.ok(primary);
 stage='cross-student permissions';
 const secondary=await teacher.addStudent('QA-SECONDARY','QA-SECONDARY');
 assert.equal((await learner.students()).length,1);
 await assert.rejects(learner.profile(secondary));
 await assert.rejects(learner.rpc('batch',{s:secondary,items:[]}),e=>e.status===403);
 const codes=await teacher.codes(),researchCode=codes.find(c=>c.role==='researcher');assert.ok(researchCode);
 if(!researchCode.revoked)assert.equal((await researcher.students()).length,2);
 await assert.rejects(researcher.rpc('save',{s:primary.id,expected_revision:primary.revision,new_state:primary.state}),e=>e.status===403);
 stage='research code revocation';
 await teacher.revoke(researchCode.id);assert.equal((await researcher.students()).length,0);
 stage='original device revocation';
 const devices=await teacher.devices(),rootDevice=devices.find(d=>d.role==='teacher'&&!d.current&&!d.revoked);
 if(rootDevice)await teacher.revokeDevice(rootDevice.id);
 await assert.rejects(root.codes(),e=>e.status===403);
 stage='consistent real-service backup';
 const archive=await teacher.backup();assert.equal(archive.students.length,2);assert.equal(archive.events.length,2);
 await writeFile(new URL('class_backup.json',dir),JSON.stringify(archive),{mode:0o600});
 stage='isolated disaster restore';
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
  await db.exec(await readFile(new URL('../scripts/migrations/001_cloud.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../scripts/migrations/002_archive_expiry.sql',import.meta.url),'utf8'));
  await db.query('select nt_private.restore_snapshot($1)',[JSON.stringify(archive)]);
  const rows=(await db.query('select student_id,event_id,payload from public.nt_cloud_events order by event_id')).rows;
  assert.deepEqual(rows,archive.events.map(({student_id,event_id,payload})=>({student_id,event_id,payload})).sort((a,b)=>a.event_id.localeCompare(b.event_id)));
  const fresh=randomUUID();await db.query('insert into auth.users values($1)',[fresh]);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[fresh]);await db.exec('set role authenticated');
  assert.equal((await db.query('select public.nt_cloud_claim($1) a',[decodeRecovery(recovery).secret])).rows[0].a.role,'teacher');
  assert.equal((await db.query('select count(*)::int n from public.nt_cloud_events')).rows[0].n,2);
  await assert.rejects(db.query('select nt_private.restore_snapshot($1)',[JSON.stringify(archive)]));
 }finally{await db.close();}
 await save('recovered_teacher.json',recoveredData);
 const summary={completedAt:new Date().toISOString(),crossStudentReadDenied:true,crossStudentWriteStatus:403,researcherWriteStatus:403,revokedResearcherRows:0,originalTeacherDeviceRevoked:true,recoveredTeacher:true,backupStudents:2,backupEvents:2,isolatedRestoreExact:true};
 await writeFile(new URL('followup_summary.json',dir),JSON.stringify(summary,null,2),{mode:0o600});console.log(summary);
}catch(error){await save('recovered_teacher.json',recoveredData);console.error('真实服务后续验收未完成：'+stage+'；'+error.name);process.exitCode=1;}
