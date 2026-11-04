#!/usr/bin/env node
/* 发布与测试流水线。
 *
 *   npm run release -- --local          本机测试：跑测试、写构建号、清缓存、给出本地链接
 *   npm run release -- --push           发布：跑测试、写构建号、提交、推送、等 Pages、清缓存、给远程链接
 *   npm run release -- --cache-only     只清缓存并给出当前链接
 *
 * 常用参数：
 *   --no-open        不打开 Safari / Chrome（只打印链接和清缓存地址）
 *   --skip-tests     跳过 npm test（只在明确知道改动很小的时候用）
 *   --message "..."  发布提交信息；默认「发布：构建 <build>」
 *   --timeout 180    等 GitHub Pages 更新的秒数
 *
 * 清缓存只清这个游戏：Service Worker 的 scope 必须等于当前目录，
 * CacheStorage 的名字必须以 note-trainer- 开头。localStorage 不清，
 * 学生账户、勾选、进度和答题记录都保留。
 */
import { readFile, writeFile, access, mkdir, open, unlink } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawn, spawnSync, execFile } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeIntegrity, verifyRelease } from './release_integrity.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const REMOTE = 'https://fangjiaqifion.github.io/note-trainer/';
const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const value = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const PORT = Number(value('--port', 8765));
const LOCAL = `http://127.0.0.1:${PORT}/`;
const PUSH = has('--push');
const CACHE_ONLY = has('--cache-only');
const OPEN = !has('--no-open');
const SKIP_TESTS = has('--skip-tests');
const REMOTE_TIMEOUT = Number(value('--timeout', 180));
const report = {schema:1, startedAt:new Date().toISOString(), mode:PUSH ? 'remote' : 'local', status:'running', targets:[]};
async function saveReport(){
  await mkdir(join(ROOT,'.release'),{recursive:true});
  await writeFile(join(ROOT,'.release/status.json'),JSON.stringify(report,null,2) + '\n');
}

let ownsLock=false;
const lockPath=join(ROOT,'.release/pipeline.lock');
async function acquireLock(){
  await mkdir(join(ROOT,'.release'),{recursive:true});
  for(let attempt=0;attempt<2;attempt++){
    try{
      const file=await open(lockPath,'wx');
      await file.writeFile(String(process.pid));await file.close();ownsLock=true;return;
    }catch(error){
      if(error.code !== 'EEXIST') throw error;
      const pid=Number(await readFile(lockPath,'utf8').catch(()=>''));
      if(Number.isInteger(pid) && pid>0){
        try{process.kill(pid,0);}catch(probe){
          if(probe.code === 'ESRCH'){await unlink(lockPath).catch(()=>{});continue;}
        }
      }
      throw new Error('已有发布/缓存流水线运行，请等待完成；不会并行清理或覆盖运行状态。');
    }
  }
  throw new Error('无法获取流水线运行锁');
}

const MESSAGE = value('--message', '') || value('-m', '');

function log(msg){ console.log(msg); }
function sleep(ms){ return new Promise((r) => setTimeout(r, ms)); }

function run(cmd, cmdArgs, opts = {}){
  const res = spawnSync(cmd, cmdArgs, { cwd: ROOT, stdio: 'inherit', ...opts });
  if(res.error) throw res.error;
  if(res.status !== 0) throw new Error(`${cmd} ${cmdArgs.join(' ')} 退出码 ${res.status}`);
  return res;
}

function capture(cmd, cmdArgs){
  const res = spawnSync(cmd, cmdArgs, { cwd: ROOT, encoding: 'utf8' });
  if(res.error) throw res.error;
  if(res.status !== 0) throw new Error(`${cmd} ${cmdArgs.join(' ')} 失败：${(res.stderr || '').trim()}`);
  return (res.stdout || '').trim();
}

async function exists(path){
  try{ await access(path); return true; }catch(e){ return false; }
}

async function fetchText(url, timeout = 8000){
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try{
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'cache-control': 'no-cache', 'pragma': 'no-cache' }
    });
    return { ok: res.ok, status: res.status, text: await res.text(), headers:Object.fromEntries(res.headers) };
  }finally{
    clearTimeout(timer);
  }
}

/* 构建号覆盖页面、manifest、图标、清理页及去掉生成号的 Service Worker。
   内容没变就不换号，也就不会产生无意义的提交。 */
async function stampBuild(){
  const indexPath = join(ROOT, 'index.html');
  const index = await readFile(indexPath, 'utf8');
  const stripped = index.replace(/[ \t]*<meta name="app-build" content="[^"]*">\s*\n?/, '');
  const parts = [Buffer.from(stripped, 'utf8')];
  for(const name of ['sync_test.mjs','experiments/supabase_sync/transport.mjs','manifest.webmanifest', 'icon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'clear-cache.html', 'sw.js']){
    const bytes = await readFile(join(ROOT, name));
    parts.push(name === 'sw.js' ? Buffer.from(bytes.toString().replace(/const CACHE = 'note-trainer-[^']*';/, "const CACHE = 'note-trainer-BUILD';")) : bytes);
  }
  const build = createHash('sha256').update(Buffer.concat(parts)).digest('hex').slice(0, 10);

  const nextIndex = /<meta name="app-build" content="[^"]*">/.test(index)
    ? index.replace(/<meta name="app-build" content="[^"]*">/, `<meta name="app-build" content="${build}">`)
    : index.replace('<meta name="format-detection" content="telephone=no">',
        `<meta name="format-detection" content="telephone=no">\n<meta name="app-build" content="${build}">`);
  if(nextIndex !== index) await writeFile(indexPath, nextIndex);

  const swPath = join(ROOT, 'sw.js');
  const sw = await readFile(swPath, 'utf8');
  const nextSw = sw.replace(/const CACHE = 'note-trainer-[^']*';/, `const CACHE = 'note-trainer-${build}';`);
  if(nextSw !== sw) await writeFile(swPath, nextSw);

  await writeIntegrity(ROOT, build);
  return build;
}

function readBuild(){
  const m = /<meta name="app-build" content="([^"]*)">/.exec(
    readFileSync(join(ROOT, 'index.html'), 'utf8')
  );
  return m ? m[1] : 'dev';
}

async function waitForRemote(build){
  const deadline = Date.now() + REMOTE_TIMEOUT * 1000;
  let last = '';
  while(Date.now() < deadline){
    try{
      const expected = JSON.parse(await readFile(join(ROOT,'release.json'),'utf8'));
      await verifyRelease(REMOTE,expected);
      log('远程首页、SW、清理页、manifest、图标全部哈希一致：' + build);
      return true;
    }catch(e){
      last = e.message;
    }
    log(`等 GitHub Pages…（${last}，还剩 ${Math.max(0, Math.round((deadline - Date.now()) / 1000))} 秒）`);
    await sleep(5000);
  }
  return false;
}

async function localIsOurs(){
  try{
    const res = await fetchText(`${LOCAL}index.html`, 2000);
    return res.ok && res.headers['x-note-trainer-server'] === createHash('sha256').update(await readFile(join(ROOT,'scripts/local_server.mjs'))).digest('hex') && res.headers['cache-control']?.includes('no-store') && res.text === await readFile(join(ROOT, 'index.html'), 'utf8');
  }catch(e){
    return false;
  }
}

async function ensureLocalServer(){
  if(await localIsOurs()) return true;
  try{
    await fetch(LOCAL,{signal:AbortSignal.timeout(1000)});
    throw new Error('端口 ' + PORT + ' 已被旧服务器或其他项目占用。请停止旧服务或使用 --port 新端口；不自动终止未知进程。');
  }catch(e){if(e.message.startsWith('端口 ')) throw e;}
  log(`在 ${PORT} 端口起无 HTTP 缓存的本地服务器…`);
  const child = spawn(process.execPath, [join(ROOT,'scripts/local_server.mjs'), String(PORT)], {
    cwd: ROOT, detached: true, stdio: 'ignore'
  });
  child.unref();
  for(let i = 0; i < 25; i++){
    await sleep(300);
    if(await localIsOurs()) return true;
  }
  return false;
}

function openApp(app, url){
  return new Promise((resolve, reject) => {
    execFile('open', ['-a', app, url], {timeout:10000}, (error) => error ? reject(error) : resolve());
  });
}

async function clearBrowserCaches(origins, link){
  if(has('--local-only')) origins = origins.filter(origin => origin !== REMOTE);
  report.scope = has('--local-only') ? 'local-only' : 'local-and-remote';
  const browsers = [];
  if(await exists('/Applications/Safari.app') || await exists('/System/Applications/Safari.app')) browsers.push('Safari');
  if(await exists('/Applications/Google Chrome.app')) browsers.push('Google Chrome');
  const token = 'release-' + Date.now();
  const expected = JSON.parse(await readFile(join(ROOT,'release.json'),'utf8'));
  for(let i=0; i<origins.length; i++){
    const origin = origins[i];
    let manifest;
    try{
      manifest = await verifyRelease(origin, origin === REMOTE && !PUSH ? undefined : expected);
      log('服务器发布文件已核验：' + origin + ' 构建 ' + manifest.build);
    }catch(e){
      report.targets.push({origin,status:'server-unverified',error:e.message});
      log('服务器未核验：' + origin + ' ' + e.message);
      continue;
    }
    for(const app of browsers){
      const registration = await fetch(LOCAL + '__release/register',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({build:manifest.build,next:origin + 'index.html?build=' + manifest.build}),
        signal:AbortSignal.timeout(3000)
      });
      if(!registration.ok) throw new Error('本地回执服务不可用');
      const {token:receipt} = await registration.json();
      const callback = LOCAL + '__release/receipt/' + receipt;
      const url = origin + 'clear-cache.html?launch=1&token=' + receipt + '&build=' + manifest.build + '&cb=' + token + '&callback=' + encodeURIComponent(callback);
      const target = {app,origin,build:manifest.build,receipt,status:OPEN ? 'waiting' : 'prepared',url};
      report.targets.push(target);
      if(!OPEN){log('待浏览器清理与加载核验 ' + app + ': ' + url);continue;}
      try{
        await openApp(app,url);
        // Safari 会延迟后台标签页加载；每个目标收到回执后才打开下一个。
        const deadline=Date.now()+60000;
        while(target.status === 'waiting' && Date.now()<deadline){
          try{
            const response=await fetch(LOCAL+'__release/check/'+target.receipt,{cache:'no-store',signal:AbortSignal.timeout(2000)});
            if(!response.ok) throw new Error('回执状态 HTTP '+response.status);
            const receipt=await response.json();
            if(receipt.status === 'ready' && receipt.build === target.build){
              target.status='ready';log('浏览器实际已加载：'+target.app+' '+target.origin+' '+target.build);
            }else if(receipt.status === 'failed'){
              target.status='failed';target.error='清理步骤失败：'+receipt.stage;
              log(target.app+' '+target.origin+' '+target.error);
            }
          }catch(e){target.error=e.message;}
          if(target.status === 'waiting') await sleep(500);
        }
        if(target.status === 'waiting'){target.status='timeout';target.error='未收到游戏实际加载回执，检查清理页与网络';}
        await saveReport();
      }catch(e){target.status='failed';target.error=e.message;}
    }
  }
  await saveReport();
  const complete = browsers.includes('Safari') && browsers.includes('Google Chrome') &&
    report.targets.length === origins.length * 2 && report.targets.every(t => t.status === 'ready');
  report.status = complete ? 'ready' : OPEN ? 'incomplete' : 'prepared';
  await saveReport();
  log('流水线状态：' + report.status + '；详情 .release/status.json');
  if(OPEN && !complete) throw new Error('缓存/加载核验未全部完成，不能把本轮标记为测试就绪。');
  if(OPEN) for(const app of browsers) await openApp(app,link);
}

async function main(){
  if(PUSH && has('--local-only')) throw new Error('--push 不能与 --local-only 合用，远程交付必须核验远程浏览器加载。');
  if(has('--help') || has('-h')){
    log('用法：npm run release -- [--local|--push|--build-only|--verify-remote] [--no-open] [--local-only] [--message "..."]');
    return;
  }

  await acquireLock();

  if(has('--verify-remote')){
    const expected = JSON.parse(await readFile(join(ROOT,'release.json'),'utf8'));
    await verifyRelease(REMOTE,expected);
    // Read-only verification must preserve the completed browser receipt report.
    log('远程全部发布文件与本地构建一致：' + expected.build);
    return;
  }

  if(CACHE_ONLY){
    const build = readBuild();
    report.build=build;
    const localOk = await ensureLocalServer();
    if(!localOk) log(`警告：${PORT} 端口没有起来，本地链接不可用。`);
    if(!localOk) throw new Error('本地服务器不可用，不能交付本地测试链接');
    const link = `${LOCAL}index.html?build=${build}`;
    log(`当前构建：${build}`);
    log(`链接：${link}`);
    await clearBrowserCaches([REMOTE, LOCAL, `http://localhost:${PORT}/`], link);
    return;
  }

  const build = await stampBuild();
  report.build=build;
  log(`构建号：${build}`);

  if(has('--build-only')){report.status='built';await saveReport();log('仅构建完成；未执行测试、清缓存或部署。');return;}

  if(!SKIP_TESTS){
    log('跑回归测试…');
    run('npm', ['test']);
  }

  if(PUSH){
    if(capture('gh', ['api', 'user', '--jq', '.login']) !== 'fangjiaqifion'){
      throw new Error('当前 GitHub 账户不是 fangjiaqifion，停止推送。');
    }
    if(capture('git', ['rev-parse', '--abbrev-ref', 'HEAD']) !== 'main'){
      throw new Error('GitHub Pages 从 main 发布，请先切回 main 再推送。');
    }
    const dirty = capture('git', ['status', '--porcelain']);
    if(dirty){
      log('提交本次发布：');
      log(dirty.split('\n').map((l) => '  ' + l).join('\n'));
      const allowed = ['index.html','sw.js','release.json'];
      const paths = new Set([
        ...capture('git',['diff','--name-only']).split('\n'),
        ...capture('git',['diff','--cached','--name-only']).split('\n'),
        ...capture('git',['ls-files','--others','--exclude-standard']).split('\n')
      ].filter(Boolean));
      if([...paths].some(path => !allowed.includes(path)))
        throw new Error('请先提交功能改动；发布只自动提交 index.html、sw.js、release.json，避免夹带其他工作。');
      run('git', ['add', '--', ...allowed]);
      const changed = spawnSync('git', ['diff', '--cached', '--quiet'], { cwd: ROOT }).status !== 0;
      if(changed) run('git', ['-c','user.name=FANG, Jiaqi','-c','user.email=fangjiaqifion@gmail.com','commit', '-m', MESSAGE || `发布构建 ${build}`]);
    }
    log('推送到 origin/main…');
    run('git', ['push', 'origin', 'HEAD']);
    const ready = await waitForRemote(build);
    if(!ready) throw new Error(`推送已完成，但 ${REMOTE_TIMEOUT} 秒内未确认 Pages 构建 ${build}；不交付旧版远程测试链接。`);
    await ensureLocalServer();
    await clearBrowserCaches([REMOTE, LOCAL, `http://localhost:${PORT}/`], REMOTE + 'index.html?build=' + build);
    log('');
    log(`${OPEN ? '远程链接（六个目标均已核验）' : '待浏览器核验的远程地址（prepared）'}：${REMOTE}index.html?build=${build}`);
    log(`本地链接（备用）：${LOCAL}index.html`);
  }else{
    const localOk = await ensureLocalServer();
    if(!localOk) throw new Error(`本地服务器没有起来：${LOCAL}`);
    log(`本地测试链接：${LOCAL}index.html?build=${build}`);
    await clearBrowserCaches([REMOTE, LOCAL, `http://localhost:${PORT}/`], `${LOCAL}index.html?build=${build}`);
    log('');
    log(`本地链接（未推送，测试用这个）：${LOCAL}index.html?build=${build}`);
    const ip = spawnSync('ipconfig', ['getifaddr', 'en0'], { encoding: 'utf8' }).stdout.trim() ||
               spawnSync('ipconfig', ['getifaddr', 'en1'], { encoding: 'utf8' }).stdout.trim();
    if(ip) log(`iPad（同一 Wi-Fi）：http://${ip}:${PORT}/index.html`);
    log('测完再推送：npm run release -- --push');
  }

  log('');
  log(`目标构建 ${build}；只有实际加载回执匹配才标记 ready，未核验先查 .release/status.json。`);
}

main().catch(async (err) => {
  report.status='failed';report.error=err.message;if(ownsLock) await saveReport();
  console.error('\n失败：' + (err && err.message ? err.message : err));
  process.exitCode = 1;
}).finally(async()=>{if(ownsLock) await unlink(lockPath).catch(()=>{});});
