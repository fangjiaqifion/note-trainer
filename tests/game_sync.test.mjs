import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameSync} from '../sync_test.mjs';
const P='nt.sync-test.';
function fixture(n=1,options={}){
  const data=new Map(), calls=[], remote=new Map(), messages=[];
  const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
  const events=Array.from({length:n},(_,i)=>({id:'event-'+i,seq:i+1,first:1,wrong:0,ms:100}));
  storage.setItem(P+'accounts.v1',JSON.stringify({accounts:[{id:'p1',name:'Never send this',hash:'private'}]}));
  storage.setItem(P+'state.p1.v1',JSON.stringify({events}));
  storage.setItem('nt.accounts.v1',JSON.stringify({accounts:[{id:'real'}]}));
  storage.setItem('nt.state.real.v1',JSON.stringify({events:[{id:'real-event'}]}));
  let fail=false, partial=false, httpStatus=0;
  const response=v=>({ok:true,json:async()=>v});
  const fetchImpl=async(url,opts={})=>{
    calls.push({url,opts});
    if(url==='/__sync_test/config') return response({url:'https://pokrwqirkjcjlworttvk.supabase.co',publishableKey:'sb_publishable_test'});
    if(url.endsWith('/signup')) return response({access_token:'access',refresh_token:'refresh',expires_at:9999999999});
    if(httpStatus) return {ok:false,status:httpStatus,headers:new Headers({'retry-after':'30'})};
    const batch=JSON.parse(opts.body).items;
    for(const e of batch) remote.set(e.id,e);
    if(fail && batch.length){fail=false;throw new Error('lost response');}
    return response(partial && batch.length ? [] : batch.map(e=>e.id));
  };
  const eventBus=new EventTarget();
  const m=createGameSync({online:()=>true,...options,storage,fetchImpl,locks:{request:async(_,fn)=>fn()},events:eventBus,report:t=>messages.push(t)});
  return {m,data,calls,remote,messages,storage,eventBus,http:n=>{httpStatus=n;},fail:()=>{fail=true;},partial:()=>{partial=true;}};
}
test('game outbox uploads saved answers only, strips identities and splits at 50',async()=>{
  const f=fixture(51);try{
    await f.m.check();
    assert.equal(f.remote.size,51);
    assert.deepEqual(f.calls.filter(c=>c.url.endsWith('nt_sync_batch')).map(c=>JSON.parse(c.opts.body).items.length),[0,50,1]);
    assert.equal(f.remote.has('real-event'),false);
    assert.equal(JSON.stringify([...f.remote.values()]).includes('Never send this'),false);
    assert.equal(JSON.stringify([...f.remote.values()]).includes('private'),false);
    await f.m.check();assert.equal(f.remote.size,51);
    assert.equal(JSON.parse(f.storage.getItem(P+'ack')).length,51);
  }finally{f.m.dispose();}
});
test('lost response and partial receipts keep local answers for idempotent retry',async()=>{
  for(const mode of ['fail','partial']){
    const f=fixture();try{
      f[mode]();await f.m.check();
      assert.equal(f.storage.getItem(P+'ack'),null);
      assert.equal(JSON.parse(f.storage.getItem(P+'state.p1.v1')).events.length,1);
      assert.match(f.messages.at(-1),/仍在本机/);
      if(mode==='fail'){await f.m.check();assert.equal(f.remote.size,1);assert.equal(JSON.parse(f.storage.getItem(P+'ack')).length,1);}
    }finally{f.m.dispose();}
  }
});
test('local receipt storage failure never claims sync success',async()=>{
  const f=fixture();const set=f.storage.setItem;
  f.storage.setItem=(k,v)=>{if(k===P+'ack') throw new Error('disk full');set(k,v);};
  try{await f.m.check();assert.match(f.messages.at(-1),/仍在本机/);assert.equal(f.remote.size,1);assert.equal(f.storage.getItem(P+'ack'),null);}
  finally{f.m.dispose();}
});

test('actual answer recorder saves immediately and retains records beyond the former limit',async()=>{
  const {readFileSync}=await import('node:fs');
  const vm=await import('node:vm');
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const start=html.indexOf('function recordAnswer(q){');
  const code=html.slice(start,html.indexOf('/* 换题',start));
  let saves=0;
  const S={events:Array.from({length:8000},(_,i)=>({seq:i+1})),eventSeq:8000,practiceSeq:8000};
  const c=vm.createContext({S,G:{mode:'skill',level:1,sid:'session',diffKey:'normal'},NOTES:{},SYNC_TEST:false,Date,performance,saveStore:()=>saves++,currentDiffKey:()=> 'normal'});
  vm.runInContext(code,c);c.recordAnswer({kind:'find',letter:'C',wrong:1});
  assert.equal(S.events.length,8001);assert.equal(S.events[0].seq,1);assert.equal(S.events.at(-1).wrong,1);assert.equal(saves,1);
});

test('10000 saved answers use exactly 200 batches; idle flush makes no requests',async()=>{
  const f=fixture(10000);try{
    await f.m.flush();
    assert.equal(f.remote.size,10000);
    assert.equal(f.calls.filter(c=>c.url.endsWith('nt_sync_batch')).length,200);
    const before=f.calls.length;await f.m.flush();assert.equal(f.calls.length,before);
    assert.equal(f.calls.filter(c=>c.url.endsWith('/signup')).length,1);
  }finally{f.m.dispose();}
});
test('continuous save notifications share one deadline and disposal cancels it',()=>{
  const jobs=new Map();let id=0;
  const f=fixture(0,{clock:{setTimeout:(fn,ms)=>{jobs.set(++id,{fn,ms});return id;},clearTimeout:i=>jobs.delete(i)}});
  for(let i=0;i<1000;i++) f.eventBus.dispatchEvent(new Event('nt-test-saved'));
  assert.equal(jobs.size,1);assert.equal([...jobs.values()][0].ms,10000);
  f.m.dispose();assert.equal(jobs.size,0);
});
test('offline game sends no requests and retains answers',async()=>{
  const f=fixture(3,{online:()=>false});try{await f.m.check();assert.equal(f.calls.length,0);assert.equal(JSON.parse(f.storage.getItem(P+'state.p1.v1')).events.length,3);}
  finally{f.m.dispose();}
});
test('rate limit retains Retry-After despite save storm; permanent errors pause',async()=>{
 for(const status of [429,403]){
  const jobs=new Map();let id=0;
  const f=fixture(1,{random:()=>0,clock:{setTimeout:(fn,ms)=>{jobs.set(++id,{fn,ms});return id;},clearTimeout:i=>jobs.delete(i)}});
  try{
   f.http(status);await f.m.check();
   if(status===429){assert.equal([...jobs.values()][0].ms,30000);for(let i=0;i<100;i++) f.eventBus.dispatchEvent(new Event('nt-test-saved'));assert.equal(jobs.size,1);assert.equal([...jobs.values()][0].ms,30000);}
   else{const before=f.calls.length;f.eventBus.dispatchEvent(new Event('nt-test-saved'));await f.m.flush();assert.equal(f.calls.length,before);assert.equal(jobs.size,0);assert.match(f.messages.at(-1),/已暂停/);}
  }finally{f.m.dispose();}
 }
});
test('corrupt receipts fail closed before sending any answer',async()=>{
 const f=fixture();try{f.storage.setItem(P+'ack','{"broken":true}');await f.m.flush();assert.equal(f.calls.length,0);assert.match(f.messages.at(-1),/已暂停/);}finally{f.m.dispose();}
});
