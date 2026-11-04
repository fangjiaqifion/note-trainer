// Loopback-only game integration. Never scans the normal account namespace.
import {createTransport} from './experiments/supabase_sync/transport.mjs';
const PREFIX='nt.sync-test.';
export function createGameSync({storage, report, fetchImpl=fetch, locks=navigator.locks, events=window}) {
  let transport, config, active=false, timer, retry=0, loseResponse=false;
  const status=text=>report(text);
  function rows(){
    const accounts=JSON.parse(storage.getItem(PREFIX+'accounts.v1') || '{"accounts":[]}');
    return accounts.accounts.flatMap(a=>{
      const state=JSON.parse(storage.getItem(PREFIX+'state.'+a.id+'.v1') || '{"events":[]}');
      return state.events.map(e=>{
        if(!e.id) throw new Error('记录缺少稳定 ID');
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
    const r=await fetchImpl('/__sync_test/config',{cache:'no-store',signal:AbortSignal.timeout(8000)});
    if(!r.ok) throw new Error('测试配置不可用');
    config=await r.json();
    if(config.url !== 'https://pokrwqirkjcjlworttvk.supabase.co' || !config.publishableKey?.startsWith('sb_publishable_')) throw new Error('测试项目配置不匹配');
    transport=createTransport({...config,storage,sessionKey:PREFIX+'session',fetchImpl});
  }
  function acknowledgements(){return new Set(JSON.parse(storage.getItem(PREFIX+'ack') || '[]'));}
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
    if(active) return;
    active=true;
    clearTimeout(timer);
    try{
      await locked(async()=>{
        const start=performance.now();
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
    }catch{
      status('同步未完成，记录仍在本机；请检查网络并重试。');
      schedule(Math.min(60000,2000*2**Math.min(retry++,5)));
    }finally{active=false;}
  }
  function schedule(ms=1500){clearTimeout(timer);timer=setTimeout(()=>run(),ms);}
  async function verify(){
    try{
      await locked(async()=>{
        await setup();
        await transport([]);
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
  const onSave=()=>schedule(), onOnline=()=>schedule(0);
  events.addEventListener('nt-test-saved',onSave);
  events.addEventListener('online',onOnline);
  // No signup until an explicit startup check, answer save or online retry.
  return {check:()=>run(true),verify,simulateResponseLoss(){loseResponse=true;status('已安排丢弃下一批成功回执；请实际答一题，随后自动重试。');},dispose(){ clearTimeout(timer);events.removeEventListener('nt-test-saved',onSave);events.removeEventListener('online',onOnline); }};
}
