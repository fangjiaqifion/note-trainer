#!/usr/bin/env node
// GitHub Pages 无站点 CDN purge API。此命令只重建远程已有 main，不推送本地代码。
import {execFileSync} from 'node:child_process';
import {verifyRelease} from './release_integrity.mjs';
const repo='fangjiaqifion/note-trainer';
const remote='https://fangjiaqifion.github.io/note-trainer/';
const execute=process.argv.includes('--execute');
function api(path,method='GET'){
  return JSON.parse(execFileSync('gh',['api','--method',method,path],{encoding:'utf8',timeout:15000}));
}
try{
  const user=api('user');
  if(user.login !== 'fangjiaqifion') throw new Error('GitHub 账户不匹配');
  const site=api('repos/' + repo + '/pages');
  if(site.build_type !== 'legacy' || site.source?.branch !== 'main' || site.source?.path !== '/')
    throw new Error('Pages 发布模式已改变，停止使用 legacy 重建接口');
  const commit=api('repos/' + repo + '/commits/main').sha;
  console.log('将重建远程已有 main：' + commit + '；本地代码不会被推送。');
  if(!execute){console.log('当前为只读检查。实际重建：npm run pages:refresh -- --execute');process.exit(0);}
  const started=Date.now();
  api('repos/' + repo + '/pages/builds','POST');
  const deadline=Date.now()+180000;
  let ready=false;
  while(Date.now()<deadline){
    const build=api('repos/' + repo + '/pages/builds/latest');
    if(build.commit === commit && Date.parse(build.created_at) >= started-1000){
      if(build.status === 'errored') throw new Error('Pages 重建失败：' + (build.error?.message || 'unknown'));
      if(build.status === 'built'){ready=true;break;}
    }
    console.log('等待 Pages 重建：' + build.status);
    await new Promise(resolve=>setTimeout(resolve,5000));
  }
  if(!ready) throw new Error('Pages 重建未在 180 秒内确认完成');
  const manifest=await verifyRelease(remote);
  console.log('Pages 重建及线上全部文件完整性核验完成，构建 ' + manifest.build);
  console.log('此步骤不代表本机浏览器已刷新；继续运行 npm run cache。');
}catch(error){console.error('远程重建/核验未完成：' + error.message);process.exitCode=1;}
