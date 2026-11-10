/* 识谱小练习 · 我的音 — 离线缓存
   缓存名由 scripts/release.mjs 按页面内容生成，不要手改；
   每次都取新文件（cache:'reload'），避免安装时把 HTTP 缓存里的旧页
   一起装进离线包。页面导航始终网络优先，离线时才回退。 */
const CACHE = 'note-trainer-87cfb76b40';
const SCOPED_CACHE = CACHE + '@' + self.registration.scope;
const mine = k => k.startsWith('note-trainer-') &&
  (!k.includes('@') || k.endsWith('@' + self.registration.scope));
const ASSETS = ['./portal_identity.mjs', './portal_config.mjs', './cloud_client.mjs', './cloud_ui.mjs', './audio_readiness.mjs', './sync_test.mjs', './experiments/supabase_sync/transport.mjs', './', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(SCOPED_CACHE).then(function (c) {
      return c.addAll(ASSETS.map(function (url) {
        return new Request(url, { cache: 'reload' });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return mine(k) && k !== SCOPED_CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  if (e.request.headers.get('X-Note-Trainer-Reset') === '1') return;
  const url = new URL(e.request.url);
  // 清理页不进离线包，也不能被导航逻辑写成 index.html。
  if(url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope) ||
     url.pathname.endsWith('/clear-cache.html') || url.pathname.endsWith('/manage.html') || url.pathname.endsWith('/manage.mjs')) return;
  if (e.request.mode === 'navigate') {
    const network = fetch(new Request(e.request, {cache:'no-cache'}));
    e.waitUntil(network.then(async function(r){
      if(r.ok && (url.pathname.endsWith('/index.html') || url.href.split('?')[0] === self.registration.scope)){
        const copy = r.clone();
        const c = await caches.open(SCOPED_CACHE);
        await c.put('./index.html', copy);
      }
    }).catch(function(){}));
    e.respondWith(network.catch(async function(){
      const c = await caches.open(SCOPED_CACHE);
      return (await c.match('./index.html')) || Response.error();
    }));
  } else {
    e.respondWith(caches.open(SCOPED_CACHE).then(function(c){
      // Only alias module URLs for this exact build. Old workers miss the new query
      // and fetch fresh code; this worker can serve its coherent module graph offline.
      let key=e.request,versioned=false;
      if(url.pathname.endsWith('.mjs') && url.searchParams.get('build')===CACHE.slice('note-trainer-'.length)){
        const canonical=new URL(url);canonical.search='';key=canonical.href;versioned=true;
      }
      return c.match(key).then(function(r){
        if(r && versioned){
          // A synthetic response keeps the requested URL as import.meta.url; a
          // cached canonical response would erase the build query for child imports.
          const headers=new Headers(r.headers);headers.delete('content-encoding');headers.delete('content-length');
          return new Response(r.body,{status:r.status,statusText:r.statusText,headers:headers});
        }
        return r || fetch(e.request);
      });
    }));
  }
});
