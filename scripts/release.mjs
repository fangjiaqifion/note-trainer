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

/* 构建号只由页面内容决定：index.html（去掉构建号那一行）、manifest、三个图标。
   内容没变就不换号，也就不会产生无意义的提交。 */
async function stampBuild(){
  const indexPath = join(ROOT, 'index.html');
  const index = await readFile(indexPath, 'utf8');
  const stripped = index.replace(/[ \t]*<meta name="app-build" content="[^"]*">\s*\n?/, '');
  const parts = [Buffer.from(stripped, 'utf8')];
  for(const name of ['manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png']){
    parts.push(await readFile(join(ROOT, name)));
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
    return res.ok && (res.text.indexOf('app-build') >= 0 || res.text.indexOf('识谱小练习') >= 0);
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
  try{
    execFile('open', ['-a', app, url], () => {});
    return true;
  }catch(e){
    return false;
  }
}

function closeResetTabs(){
  const safari = `tell application "Safari"
    set doomed to {}
    repeat with w in windows
      repeat with t in tabs of w
        try
          if URL of t contains "clear-cache.html" then set end of doomed to t
        end try
      end repeat
    end repeat
    repeat with t in doomed
      try
        close t
      end try
    end repeat
  end tell`;
  const chrome = `tell application "Google Chrome"
    repeat with w in windows
      set n to count of tabs of w
      repeat while n > 0
        try
          if URL of tab n of w contains "clear-cache.html" then close tab n of w
        end try
        set n to n - 1
      end repeat
    end repeat
  end tell`;
  return new Promise((resolve) => {
    execFile('osascript', ['-e', safari], { timeout: 8000 }, () => {
      execFile('osascript', ['-e', chrome], { timeout: 8000 }, () => resolve());
    });
  });
}

async function clearBrowserCaches(origins, link){
  const browsers = [];
  if(await exists('/Applications/Safari.app')) browsers.push('Safari');
  if(await exists('/Applications/Google Chrome.app')) browsers.push('Google Chrome');

  const targets = [];
  for(const origin of origins){
    try{
      const res = await fetchText(`${origin}clear-cache.html`, 5000);
      if(res.ok && res.text.indexOf('清理缓存') >= 0) targets.push(origin);
      else log(`跳过 ${origin}：clear-cache.html 还不可用（HTTP ${res.status}）`);
    }catch(e){
      log(`跳过 ${origin}：${e.message}`);
    }
  }
  if(!targets.length) return;

  const resetUrls = [];
  for(const origin of targets){
    const next = `${origin}index.html`;
    resetUrls.push(`${origin}clear-cache.html?stay=1&next=${encodeURIComponent(next)}`);
  }

  if(!OPEN){
    log('需要手动清理时打开这些地址（每个浏览器各一次）：');
    for(const b of browsers) for(const u of resetUrls) log(`  ${b}: ${u}`);
    return;
  }
  if(!browsers.length){
    log('没找到 Safari 或 Chrome，跳过自动清缓存。');
    return;
  }

  log('打开 Safari / Chrome 清理这个游戏的离线缓存…');
  for(const b of browsers) for(const u of resetUrls) openApp(b, u);
  await sleep(3000);
  await closeResetTabs();
  log('清缓存标签页已关闭。');

  for(const b of browsers) openApp(b, link);
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
    const link = localOk ? `${LOCAL}index.html` : REMOTE;
    log(`当前构建：${build}`);
    log(`链接：${link}`);
    await clearBrowserCaches([REMOTE, ...(localOk ? [LOCAL] : [])], link);
    return;
  }

  if(!SKIP_TESTS){
    log('跑回归测试…');
    run('npm', ['test']);
  }

  const build = await stampBuild();
  log(`构建号：${build}`);

  if(PUSH){
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
    if(!ready) log(`警告：${REMOTE_TIMEOUT} 秒内没等到 Pages 更新，链接可能还是上一版；稍后刷新即可。`);
    await ensureLocalServer();
    await clearBrowserCaches([REMOTE, LOCAL], REMOTE + 'index.html');
    log('');
    log(`远程链接（推送后测试用这个）：${REMOTE}index.html`);
    log(`本地链接（备用）：${LOCAL}index.html`);
  }else{
    const localOk = await ensureLocalServer();
    if(!localOk) throw new Error(`本地服务器没有起来：${LOCAL}`);
    await clearBrowserCaches([REMOTE, LOCAL], `${LOCAL}index.html`);
    log('');
    log(`本地链接（未推送，测试用这个）：${LOCAL}index.html`);
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
