import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import {ASSETS,writeIntegrity,verifyRelease,validateManifest} from '../scripts/release_integrity.mjs';

test('完整性核验拦截混合部署、旧构建、错误页与缺失清单',async()=>{
  const root=await mkdtemp(join(tmpdir(),'nt-release-'));
  const build='1234567890';
  let corrupt='',missing='',old=false;
  const server=createServer(async(req,res)=>{
    const url=new URL(req.url,'http://localhost');
    assert.ok(url.searchParams.has('nt_verify'),'each request must bypass stale URL keys');
    assert.equal(req.headers['cache-control'],'no-cache');
    const file=url.pathname.slice(1);
    if(file===missing){res.writeHead(404);res.end('not found');return;}
    const bytes=file===corrupt ? Buffer.from('old CDN bytes') : await readFile(join(root,file));
    res.end(old && file==='release.json' ? JSON.stringify({...manifest,build:'0000000000'}) : bytes);
  });
  try{
    for(const file of ASSETS) await writeFile(join(root,file),file==='index.html'
      ? '<meta name="app-build" content="'+build+'">'
      : file==='sw.js' ? "const CACHE = 'note-trainer-"+build+"';" : 'fixture '+file);
    var manifest=await writeIntegrity(root,build);
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const base='http://127.0.0.1:'+server.address().port+'/';
    assert.deepEqual(await verifyRelease(base,manifest),manifest);
    corrupt='sw.js';await assert.rejects(verifyRelease(base,manifest),/sw.js.*哈希/);corrupt='';
    old=true;await assert.rejects(verifyRelease(base,manifest),/发布清单/);old=false;
    missing='clear-cache.html';await assert.rejects(verifyRelease(base,manifest),/clear-cache.html.*404/);missing='';
    await assert.rejects(verifyRelease(base,undefined,{fetchImpl:async()=>new Response('oops',{status:503})}),/503/);
    assert.throws(()=>validateManifest({...manifest,files:{'../secret':'a'.repeat(64)}}),/格式/);
    missing='release.json';await assert.rejects(verifyRelease(base,manifest),/release.json.*404/);
  }finally{await new Promise(resolve=>server.close(resolve));await rm(root,{recursive:true,force:true});}
});

test('本地服务器禁止 HTTP 缓存且不暴露 .git',async()=>{
  const {spawn}=await import('node:child_process');
  const child=spawn(process.execPath,[fileURLToPath(new URL('../scripts/local_server.mjs',import.meta.url)),'0'],{stdio:['ignore','pipe','pipe']});
  try{
    const base=await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('server start timeout')),5000);
      child.once('error',error=>{clearTimeout(timer);reject(error);});
      child.stdout.on('data',data=>{
        const match=/http:\/\/127\.0\.0\.1:\d+/.exec(String(data));
        if(match){clearTimeout(timer);resolve(match[0]+'/');}
      });
    });
    const response=await fetch(base+'index.html');
    assert.equal(response.status,200);
    assert.match(response.headers.get('cache-control'),/no-store/);
    assert.match(response.headers.get('x-note-trainer-server'),/^[a-f0-9]{64}$/);
    assert.equal((await fetch(base+'.git/config')).status,404);
    assert.equal((await fetch(base+'%2e%2e%2FAGENTS.md')).status,404);
    const registration=await fetch(base+'__release/register',{method:'POST',body:JSON.stringify({
      build:'1234567890',next:base+'index.html?build=1234567890'
    })});
    const {token}=await registration.json();
    assert.match(token,/^[a-f0-9]{48}$/);
    const check=()=>fetch(base+'__release/check/'+token).then(r=>r.json());
    assert.equal((await check()).status,'waiting');
    assert.equal((await fetch(base+'__release/receipt/'+token+'?build=0000000000',{redirect:'manual'})).status,409);
    assert.equal((await check()).status,'waiting','wrong build cannot acknowledge success');
    assert.equal((await fetch(base+'__release/receipt/'+token+'?build=1234567890',{redirect:'manual'})).status,302);
    assert.equal((await check()).status,'ready');
    assert.equal((await fetch(base+'__release/receipt/'+token+'?build=1234567890',{redirect:'manual'})).status,409);
    const failedToken=(await (await fetch(base+'__release/register',{method:'POST',body:JSON.stringify({
      build:'1234567890',next:base+'index.html?build=1234567890'
    })})).json()).token;
    await fetch(base+'__release/receipt/'+failedToken+'?build=1234567890&status=failed&stage=service-worker');
    const failure=await (await fetch(base+'__release/check/'+failedToken)).json();
    assert.equal(failure.status,'failed');assert.equal(failure.stage,'service-worker');
  }finally{child.kill();}
});
