import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const code=html.slice(html.indexOf('function validateRosterBackup('),html.indexOf('function exportBackup(){'));
const stateKey=html.slice(html.indexOf('function stateKey('),html.indexOf('/* 名册。'));
function fixture(){
  const credential={salt:'salt',hash:'fnv1a:123'};
  const roster={v:1,teacher:credential,accounts:[{id:'p1',name:'same',...credential},{id:'p2',name:'same',...credential}],currentId:'p1'};
  const state={v:3,progress:{C4:{key:true}},stars:{1:2},selected:['C4'],events:[{seq:9,pseq:8}],eventSeq:9,practiceSeq:8,autoHistory:[],battery:{id:'battery',items:[{note:'C4'}]}};
  const store=new Map([['accounts',JSON.stringify(roster)],['state.p1.v1',JSON.stringify(state)],['state.p2.v1',JSON.stringify(state)]]);
  let writes=0, failAt=0;
  const context=vm.createContext({ACCOUNTS:roster,ACCOUNTS_KEY:'accounts',STATE_PREFIX:'state.',SYNC_TEST:false,SCHEMA_VERSION:3,crypto:{randomUUID},localStorage:{getItem:k=>store.get(k)??null,setItem(k,v){if(++writes===failAt) throw Error('quota');store.set(k,v);},removeItem:k=>store.delete(k)}});
  vm.runInContext(stateKey+code,context);
  return {context,store,fail(n){writes=0;failAt=n;},backup(){return context.captureRosterBackup();},restore(b){return context.restoreRosterBackup(b,store.get('accounts'));}};
}
test('full roster preserves IDs, duplicate names, credentials, history and battery; repeat import is replacement',()=>{
  const f=fixture(), b=f.backup();
  const first=f.restore(b);f.context.ACCOUNTS=first;
  const out=f.backup();
  assert.equal(out.roster.accounts.length,2);
  assert.equal(JSON.stringify(out.states),JSON.stringify(b.states));
  assert.equal(JSON.stringify(out.roster.accounts),JSON.stringify(b.roster.accounts));
  const second=f.restore(b);
  assert.notEqual(second.stateGeneration,first.stateGeneration);
  assert.equal(second.accounts.length,2);
  assert.equal(f.store.get('state.p1.v1'),JSON.stringify(b.states.p1));
  assert.equal(second.previousRoster.stateGeneration,first.stateGeneration);
});
test('every staged/commit write failure preserves active roster and every original state',()=>{
  for(let n=1;n<=3;n++){
    const f=fixture(),b=f.backup(),before=new Map(f.store);f.fail(n);
    assert.throws(()=>f.restore(b),/quota/);
    for(const [k,v] of before) assert.equal(f.store.get(k),v);
    assert.equal([...f.store.keys()].filter(k=>k.startsWith('state.')).length,2);
  }
});
test('rejects incomplete, duplicate IDs, unknown versions, wrong namespace and unsafe archives without writes',()=>{
  for(const change of [b=>delete b.states.p1,b=>b.roster.accounts[1].id='p1',b=>b.version=2,b=>b.namespace='test',b=>b.states.p1.events={},b=>b.states.p1.v=99,b=>b.states.p1=JSON.parse('{"__proto__":{},"v":3}')]){
    const f=fixture(),b=f.backup(),before=JSON.stringify([...f.store]);change(b);
    assert.throws(()=>f.restore(b));assert.equal(JSON.stringify([...f.store]),before);
  }
});
test('missing/corrupt source state aborts backup and restore rather than exporting blank data',()=>{
  const f=fixture(),b=f.backup();f.store.delete('state.p1.v1');
  assert.throws(()=>f.backup(),/缺失/);assert.throws(()=>f.restore(b),/缺失/);
});
test('stale tab cannot commit a restore or pass generation guard after a restore',()=>{
  const f=fixture(),b=f.backup(),before=f.store.get('accounts');f.restore(b);
  assert.equal(f.context.currentGeneration(),false);
  assert.throws(()=>f.context.restoreRosterBackup(b,before),/变化/);
});
test('single-profile quota failure retains memory and disk and never reports success',()=>{
  const original={progress:{},stars:{},events:[{seq:1}]};
  const c=vm.createContext({S:original,CURRENT:{id:'p1',name:'test'},TEACHER_MODE:true,SYNC_TEST:false,
    FileReader:class{readAsText(){this.result=JSON.stringify({state:{progress:{},stars:{},events:[{seq:2}]}});this.onload();}},
    currentGeneration:()=>true,window:{confirm:()=>true},upgradeState:()=>{},newState:()=>({}),SCHEMA_VERSION:3,
    ensureProgress:()=>{},ensureSelection:()=>{},writeJSON:()=>false,stateKey:()=>'',warnStorage:()=>{},
    renderHome:()=>assert.fail('must not render success'),toast:()=>assert.fail('must not toast success')});
  vm.runInContext(html.slice(html.indexOf('function importBackup(file){'),html.indexOf('function clearEvents(){')),c);
  c.importBackup({});assert.equal(c.S,original);
});
