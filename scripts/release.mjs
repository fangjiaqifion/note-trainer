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
import { readFile, writeFile, access } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawn, spawnSync, execFile } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
    return { ok: res.ok, status: res.status, text: await res.text() };
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
  for(const name of ['manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'clear-cache.html', 'sw.js']){
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
      const res = await fetchText(`${REMOTE}index.html?cb=${Date.now()}`);
      last = res.ok ? `HTTP ${res.status}` : `HTTP ${res.status}`;
      const m = /<meta name="app-build" content="([^"]*)">/.exec(res.text || '');
      if(res.ok && m && m[1] === build){
        log(`远程已更新到构建 ${build}`);
        return true;
      }
      if(res.ok && m && m[1] !== build) last = `远程仍是 ${m[1]}`;
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
    return res.ok && res.text === await readFile(join(ROOT, 'index.html'), 'utf8');
  }catch(e){
    return false;
  }
}

async function ensureLocalServer(){
  if(await localIsOurs()) return true;
  log(`在 ${PORT} 端口起本地服务器…`);
  const child = spawn('python3', ['-m', 'http.server', String(PORT)], {
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
    execFile('open', ['-a', app, url], (error) => error ? reject(error) : resolve());
  });
}

// 只读取本轮清理页的标题；完成信号由页面在所有异步步骤结束后写入。
function resetTitles(app, token){
  const script = app === 'Safari' ?
    'tell application "Safari"\nset found to {}\nrepeat with w in windows\nrepeat with t in tabs of w\ntry\nif URL of t contains "' + token + '" then set end of found to name of t\nend try\nend repeat\nend repeat\nreturn found as text\nend tell' :
    'tell application "Google Chrome"\nset found to {}\nrepeat with w in windows\nrepeat with t in tabs of w\ntry\nif URL of t contains "' + token + '" then set end of found to title of t\nend try\nend repeat\nend repeat\nreturn found as text\nend tell';
  return new Promise(resolve => execFile('osascript', ['-e', script], {timeout:4000}, (error, stdout) => {
    resolve(error ? '' : stdout);
  }));
}

async function clearBrowserCaches(origins, link){
  const browsers = [];
  if(await exists('/Applications/Safari.app') || await exists('/System/Applications/Safari.app')) browsers.push('Safari');
  if(await exists('/Applications/Google Chrome.app')) browsers.push('Google Chrome');
  const token = 'release-' + Date.now();
  const targets = [];
  for(const origin of origins){
    try{
      const res = await fetchText(origin + 'clear-cache.html?cb=' + token, 5000);
      if(res.ok && res.text.includes('清理缓存')) targets.push({origin, receipts:res.text.includes('note-trainer-cache:')});
      else log('未清理 ' + origin + '：清理页不可用（HTTP ' + res.status + '）');
    }catch(e){ log('未清理 ' + origin + '：' + e.message); }
  }
  const pending = [];
  for(const app of browsers){
    for(let i=0; i<targets.length; i++){
      const target = targets[i];
      const receipt = token + '-' + i;
      const url = target.origin + 'clear-cache.html?stay=1&token=' + receipt + '&cb=' + token;
      if(!OPEN){ log('未执行自动清理 ' + app + ': ' + url); continue; }
      try{
        await openApp(app, url);
        pending.push({app, ...target, receipt});
      }catch(e){ log('未清理 ' + app + ' ' + target.origin + ': ' + e.message); }
    }
  }
  const deadline = Date.now() + 25000;
  while(pending.some(t => t.receipts && !t.done) && Date.now() < deadline){
    for(const app of browsers){
      if(!pending.some(t => t.app === app && t.receipts && !t.done)) continue;
      const titles = await resetTitles(app, token);
      for(const target of pending.filter(t => t.app === app && !t.done)){
        if(titles.includes('note-trainer-cache:ok:' + target.receipt)){
          target.done = true;
          log('已核验缓存清理：' + app + ' ' + target.origin);
        }else if(titles.includes('note-trainer-cache:failed:' + target.receipt)){
          target.receipts = false;
          log('缓存清理失败：' + app + ' ' + target.origin);
        }
      }
    }
    if(pending.some(t => t.receipts && !t.done)) await sleep(500);
  }
  for(const target of pending.filter(t => !t.done)){
    log('缓存清理未核验：' + target.app + ' ' + target.origin +
      (target.receipts ? '（超时或 macOS 自动化权限不可用；查看保留的清理页）' : '（远程清理页版本较旧或清理失败；查看保留的清理页）'));
  }
  if(!browsers.length) log('未找到 Safari / Chrome，未执行浏览器缓存清理。');
  // 保留本轮清理页及其成功/失败状态，避免三秒后提前关闭或误关其他项目。
  if(OPEN) for(const app of browsers) await openApp(app, link);
}

async function main(){
  if(has('--help') || has('-h')){
    log('用法：npm run release -- [--local|--push] [--no-open] [--skip-tests] [--message "..."]');
    return;
  }

  if(CACHE_ONLY){
    const build = readBuild();
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
  log(`构建号：${build}`);

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
      run('git', ['add', '-A']);
      const changed = spawnSync('git', ['diff', '--cached', '--quiet'], { cwd: ROOT }).status !== 0;
      if(changed) run('git', ['commit', '-m', MESSAGE || `发布：构建 ${build}`]);
    }
    log('推送到 origin/main…');
    run('git', ['push', 'origin', 'HEAD']);
    const ready = await waitForRemote(build);
    if(!ready) throw new Error(`推送已完成，但 ${REMOTE_TIMEOUT} 秒内未确认 Pages 构建 ${build}；不交付旧版远程测试链接。`);
    await ensureLocalServer();
    await clearBrowserCaches([REMOTE, LOCAL, `http://localhost:${PORT}/`], REMOTE + 'index.html?build=' + build);
    log('');
    log(`远程链接（推送后测试用这个）：${REMOTE}index.html?build=${build}`);
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
  log(`测试前先看设置页最下面的「构建 ${build}」；对不上就是缓存没清干净。`);
}

main().catch((err) => {
  console.error('\n失败：' + (err && err.message ? err.message : err));
  process.exitCode = 1;
});
