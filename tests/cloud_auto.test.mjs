import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {canAutoEnroll,autoParticipant} from '../cloud_client.mjs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const methods=html.slice(html.indexOf('    memoryToken:id=>'),html.indexOf('    beforeBind:function()'));
function fixture(){
 const state={v:3,events:[{seq:1,first:true}],selected:['C4']},roster={v:1,accounts:[{id:'local1',name:'TEST01',hash:'local-only',salt:'local-only'}]};
 const data=new Map([['accounts',JSON.stringify(roster)],['state.local1',JSON.stringify(state)]]);let writes=0,failAt=0;
 const c=vm.createContext({ACCOUNTS:roster,ACCOUNTS_KEY:'accounts',CURRENT:null,S:null,TEACHER_MODE:true,currentGeneration:()=>true,JSON,
  localStorage:{getItem:k=>data.get(k)??null,setItem(k,v){if(++writes===failAt)throw Error('quota');data.set(k,v);}},
  stateKey:id=>'state.'+id,readJSON:k=>JSON.parse(data.get(k)||'null'),window:{dispatchEvent(){}},Event:class{},renderTeacherList(){}});
 c.captureRosterBackup=()=>({roster:JSON.parse(JSON.stringify(c.ACCOUNTS)),states:Object.fromEntries(c.ACCOUNTS.accounts.map(a=>[a.id,JSON.parse(data.get('state.'+a.id)||'null')]))});
 c.accountById=id=>c.ACCOUNTS.accounts.find(a=>a.id===id);
 vm.runInContext('const host={'+methods+'};globalThis.host=host;',c);
 return {c,data,fail(n){writes=0;failAt=n;},prepare(){return {rosterToken:data.get('accounts'),original:data.get('state.local1'),memoryToken:c.host.memoryToken('local1'),events:[{id:'durable-event',seq:1,first:true}]};}};
}
test('automatic enrolment is class-scoped and uses deterministic nonidentifying codes',async()=>{
 assert.equal(canAutoEnroll({role:'teacher',workspace:'a'},{cloudAuto:true,cloudWorkspace:'a'}),true);
 for(const role of ['learner','researcher'])assert.equal(canAutoEnroll({role,workspace:'a'},{cloudAuto:true,cloudWorkspace:'a'}),false);
 assert.equal(canAutoEnroll({role:'teacher',workspace:'b'},{cloudAuto:true,cloudWorkspace:'a'}),false);
 assert.equal(canAutoEnroll({role:'teacher',workspace:'a'},{cloudWorkspace:'a'}),false);
 assert.equal(await autoParticipant('local1'),await autoParticipant('local1'));assert.notEqual(await autoParticipant('local1'),await autoParticipant('local2'));
 assert.match(await autoParticipant('local1'),/^S[a-f0-9]{24}$/);
});
test('cloud default adopts the initial local roster once, never another teacher workspace',()=>{
 const f=fixture();f.c.host.enableCloudDefault('class-a');assert.equal(f.c.ACCOUNTS.accounts[0].cloudAuto,true);assert.equal(f.c.ACCOUNTS.accounts[0].cloudWorkspace,'class-a');assert.ok(f.data.has('nt.cloud.autoBackup'));
 const before=f.data.get('accounts');f.c.host.enableCloudDefault('class-b');assert.equal(f.data.get('accounts'),before);
 const g=fixture();g.c.ACCOUNTS.accounts[0].cloudWorkspace='class-b';g.data.set('accounts',JSON.stringify(g.c.ACCOUNTS));g.c.host.enableCloudDefault('class-a');assert.equal(g.c.ACCOUNTS.accounts[0].cloudWorkspace,'class-b');
});
test('automatic attachment preserves records, current memory, ownership and a rollback snapshot',()=>{
 const f=fixture();f.c.host.enableCloudDefault('class-a');const p=f.prepare();f.c.host.attachAuto('local1','remote1','class-a',p);
 assert.equal(f.c.ACCOUNTS.accounts[0].cloudStudent,'remote1');assert.equal(JSON.parse(f.data.get('state.local1')).events[0].id,'durable-event');assert.equal(JSON.parse(f.data.get('nt.cloud.autoBackup')).states.local1.events[0].seq,1);
});
test('answers or roster changes during registration abort attachment without overwriting work',()=>{
 for(const change of ['state','roster','memory']){
  const f=fixture();f.c.host.enableCloudDefault('class-a');if(change==='memory'){f.c.CURRENT=f.c.ACCOUNTS.accounts[0];f.c.S=JSON.parse(f.data.get('state.local1'));}
  const p=f.prepare();if(change==='state')f.data.set('state.local1',JSON.stringify({v:3,events:[{seq:1},{seq:2}]}));
  if(change==='roster')f.data.set('accounts',f.data.get('accounts')+' ');
  if(change==='memory')f.c.S.events.push({seq:2});
  const before=new Map(f.data);assert.throws(()=>f.c.host.attachAuto('local1','remote1','class-a',p));for(const [k,v] of before)assert.equal(f.data.get(k),v);
 }
});
test('quota failure before metadata commit preserves source records and permits safe retry',()=>{
 for(const n of [1,2,3]){
  const f=fixture();f.c.host.enableCloudDefault('class-a');const p=f.prepare();f.fail(n);assert.throws(()=>f.c.host.attachAuto('local1','remote1','class-a',p),/quota/);
  assert.equal(f.c.ACCOUNTS.accounts[0].cloudStudent,undefined);assert.equal(JSON.parse(f.data.get('state.local1')).events[0].seq,1);
 }
});
