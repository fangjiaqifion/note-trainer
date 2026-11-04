import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

export const ASSETS = ['index.html','sw.js','clear-cache.html','manifest.webmanifest',
  'sync_test.mjs','experiments/supabase_sync/transport.mjs','icon.svg','icon-180.png','icon-192.png','icon-512.png'];
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const pageBuild = text => /<meta name="app-build" content="([^"]+)">/.exec(text)?.[1];

export async function writeIntegrity(root, build){
  const files = Object.fromEntries(await Promise.all(ASSETS.map(async file =>
    [file, sha256(await readFile(join(root,file)))])));
  const manifest = {schema:1, build, files};
  await writeFile(join(root,'release.json'), JSON.stringify(manifest,null,2) + '\n');
  return manifest;
}

export function validateManifest(manifest){
  if(manifest?.schema !== 1 || !/^[a-f0-9]{10}$/.test(manifest.build) ||
    !ASSETS.every(file => /^[a-f0-9]{64}$/.test(manifest.files?.[file] || '')) ||
    Object.keys(manifest.files || {}).length !== ASSETS.length)
    throw new Error('release.json 格式不正确或缺少必要文件');
  return manifest;
}

export async function verifyRelease(base, expected, {fetchImpl=fetch, nonce=Date.now()}={}){
  async function get(file){
    const url = new URL(file,base);
    url.searchParams.set('nt_verify',String(nonce));
    const response = await fetchImpl(url, {cache:'no-store',signal:AbortSignal.timeout(8000),
      headers:{'cache-control':'no-cache','pragma':'no-cache'}});
    if(!response.ok) throw new Error(file + ': HTTP ' + response.status);
    return Buffer.from(await response.arrayBuffer());
  }
  const manifest = validateManifest(JSON.parse((await get('release.json')).toString()));
  if(expected && JSON.stringify(manifest) !== JSON.stringify(expected))
    throw new Error('远程发布清单与待发布构建不一致：' + manifest.build + ' / ' + expected.build);
  await Promise.all(ASSETS.map(async file => {
    const bytes = await get(file);
    if(sha256(bytes) !== manifest.files[file]) throw new Error(file + ': 文件哈希不一致，部署或 CDN 尚未更新');
    if(file === 'index.html' && pageBuild(bytes.toString()) !== manifest.build)
      throw new Error('首页构建号与清单不一致');
    if(file === 'sw.js' && !bytes.toString().includes("const CACHE = 'note-trainer-" + manifest.build + "';"))
      throw new Error('Service Worker 构建号与清单不一致');
  }));
  return manifest;
}
