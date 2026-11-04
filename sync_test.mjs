// Explicit isolated test integration. Never scans the normal account namespace.
import {createTransport} from './experiments/supabase_sync/transport.mjs';
const PREFIX='nt.sync-test.';
export function createGameSync({storage, report, fetchImpl=fetch, locks=navigator.locks, events=window, loadConfig, delay=10000, random=Math.random, online=()=>navigator.onLine, clock={setTimeout:(fn,ms)=>setTimeout(fn,ms),clearTimeout:id=>clearTimeout(id)}}) {
  let transport, config, active=false, timer, retry=0, loseResponse=false, disposed=false, paused=false;
  const status=text=>report(text);
  function load(key,fallback){
    try{return JSON.parse(storage.getItem(PREFIX+key) || JSON.stringify(fallback));}
    catch{throw Object.assign(new Error('本机同步数据无法读取'),{permanent:true});}
  }
  function rows(){
    const accounts=load('accounts.v1',{accounts:[]});
    if(!Array.isArray(accounts?.accounts)) throw Object.assign(new Error('名册格式错误'),{permanent:true});
    return accounts.accounts.flatMap(a=>{
      const state=load('state.'+a.id+'.v1',{events:[]});
      if(!Array.isArray(state?.events)) throw Object.assign(new Error('记录格式错误'),{permanent:true});
      return state.events.map(e=>{
        if(!e || typeof e.id!=='string' || !e.id) throw Object.assign(new Error('记录缺少稳定 ID'),{permanent:true});
        // Explicit allowlist: never upload a name, PIN, account object or auth tokens.
        const payload={v:1};
        for(const k of ['seq','pseq','t','sid','mode','phase','battery','skill','kind','note','letter','value','clef','spot','relation','staffY1','staffY2','higher','ask','target','pair','chosen','diff','first','wrong','ms']) payload[k]=e[k];
        return {id:e.id,participant_id:a.id,payload};
      });
    });
  }
  async function locked(fn){
    if(!locks) throw new Error('浏览器不支持同步锁');
    return locks.request(PREFIX+'sync', fn);
  }
  async function setup(){
    if(transport) return;
    if(loadConfig) config=await loadConfig();
    else {
      const r=await fetchImpl('/__sync_test/config',{cache:'no-store',signal:AbortSignal.timeout(8000)});
      if(!r.ok) throw Object.assign(new Error('测试配置不可用'),{permanent:true});
      config=await r.json();
    }
    if(config.url !== 'https://pokrwqirkjcjlworttvk.supabase.co' || !config.publishableKey?.startsWith('sb_publishable_')) throw Object.assign(new Error('测试项目配置不匹配'),{permanent:true});
    transport=createTransport({...config,storage,sessionKey:PREFIX+'session',fetchImpl});
  }
  function acknowledgements(){const ids=load('ack',[]);if(!Array.isArray(ids) || ids.some(x=>typeof x!=='string')) throw Object.assign(new Error('回执格式错误'),{permanent:true});return new Set(ids);}
  async function drain(){
    const confirmed=acknowledgements();
    const pending=rows().filter(e=>!confirmed.has(e.id));
    let count=0;
    for(let i=0;i<pending.length;i+=50){
      const batch=pending.slice(i,i+50), ack=await transport(batch);
      if(loseResponse){ loseResponse=false;throw new Error('Test: discard successful response'); }
      if(!Array.isArray(ack) || ack.length!==batch.length || new Set(ack).size!==batch.length || batch.some(e=>!ack.includes(e.id))) throw new Error('服务端回执不完整');
      ack.forEach(id=>confirmed.add(id));
      // Receipt persistence failures retain local answers and permit idempotent retries.
      storage.setItem(PREFIX+'ack',JSON.stringify([...confirmed]));
      count+=batch.length;
    }
    return {count,remaining:rows().filter(e=>!confirmed.has(e.id)).length};
  }
  async function run(check=false){
    if(active || disposed || (paused && !check)) return;
    if(!online()){ status('当前离线，记录仍在本机；联网后继续同步。');return; }
    active=true;
    status('正在检查本机待同步记录…');
    clock.clearTimeout(timer);timer=null;
    try{
      await locked(async()=>{
        const start=performance.now();
        // An idle save must not initialize auth or send an empty RPC.
        if(!check){const ack=acknowledgements();if(!rows().some(e=>!ack.has(e.id))){status('本机记录均已同步；无需请求数据库。');return;}}
        status('正在连接测试数据库…');
        await setup();
        const configured=performance.now();
        if(check) await transport([]); // Real auth and authorized DB RPC; writes no fake practice rows.
        const connected=performance.now();
        const result=await drain();
        status((check?'配置 '+Math.round(configured-start)+' ms；认证 + 数据库连接 '+Math.round(connected-configured)+' ms；':'')+
          '本轮确认 '+result.count+' 题，待同步 '+result.remaining+' 题；总耗时 '+Math.round(performance.now()-start)+' ms');
        retry=0;
        if(result.remaining) schedule(250);
      });
    }catch(error){
      if(error.permanent){paused=true;status('同步已暂停，记录仍在本机；请检查身份或配置后点击重试。');}
      else {
        status('同步未完成，记录仍在本机；请检查网络并重试。');
        schedule(Math.max(error.retryAfter||0,Math.min(60000,2000*2**Math.min(retry++,5))*(0.8+random()*0.4)));
      }
    }finally{active=false;}
  }
  function schedule(ms=delay){
    if(disposed || paused || timer!=null) return;
    timer=clock.setTimeout(()=>{timer=null;run();},ms);
  }
  async function verify(){
    try{
      await locked(async()=>{
        await setup();
        await transport.authenticate();
        const session=JSON.parse(storage.getItem(PREFIX+'session'));
        const local=rows();
        // Query only IDs created by this test browser, never request other students' records.
        let count=0;
        const canonical=value=>JSON.stringify(value,Object.keys(value).sort());
        for(let i=0;i<local.length;i+=50){
          const batch=local.slice(i,i+50);
          const url=config.url+'/rest/v1/nt_sync_events?select=event_id,participant_id,payload&event_id=in.('+batch.map(e=>encodeURIComponent(e.id)).join(',')+')';
          const started=performance.now();
          const r=await fetchImpl(url,{headers:{apikey:config.publishableKey,authorization:'Bearer '+session.access_token},signal:AbortSignal.timeout(8000),cache:'no-store'});
          if(!r.ok) throw new Error();
          const remote=await r.json();
          if(remote.length!==batch.length || batch.some(e=>!remote.some(x=>x.event_id===e.id && x.participant_id===e.participant_id && canonical(x.payload)===canonical(e.payload)))) throw new Error();
          count+=remote.length;
          status('服务器逐字段核对通过 '+count+' / '+local.length+' 题；本批读取 '+Math.round(performance.now()-started)+' ms');
        }
        if(!local.length) status('本机还没有答题记录，请先实际完成题目再核对。');
      });
    }catch{status('服务器核对未通过或未同步，请保留本机记录并重试。');}
  }
  const onSave=()=>schedule(), onOnline=()=>{if(!paused){clock.clearTimeout(timer);timer=null;schedule(0);}};
  events.addEventListener('nt-test-saved',onSave);
  events.addEventListener('online',onOnline);
  // Recover saves that happened before the asynchronous module finished loading.
  schedule();
  return {check:()=>{paused=false;return run(true);},flush:()=>run(),verify,simulateResponseLoss(){loseResponse=true;status('已安排丢弃下一批成功回执；请实际答一题，随后自动重试。');},dispose(){ disposed=true;clock.clearTimeout(timer);events.removeEventListener('nt-test-saved',onSave);events.removeEventListener('online',onOnline); }};
}
