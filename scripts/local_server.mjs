#!/usr/bin/env node
// 专用开发服务器：所有响应禁止 HTTP 缓存，拒绝源码目录之外的路径。
import {createServer} from 'node:http';
import {readFile,realpath} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,createHash} from 'node:crypto';
const root = await realpath(resolve(dirname(fileURLToPath(import.meta.url)),'..'));
const port = Number(process.argv[2] || 8765);
const serverSignature = createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex');
const receipts = new Map();
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
const server = createServer(async (req,res) => {
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('Pragma','no-cache');
  res.setHeader('X-Note-Trainer-Server',serverSignature);
  try{
    const url = new URL(req.url,'http://localhost');
    const path = decodeURIComponent(url.pathname);
    if(path.startsWith('/__release/')){
      if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)){
        res.writeHead(403);res.end('loopback only');return;
      }
      // 回执仅存内存，随机令牌、十分钟有效，不接触浏览器账户/存档。
      for(const [token,value] of receipts) if(Date.now()-value.created > 600000) receipts.delete(token);
      res.setHeader('Content-Type','application/json');
      if(path === '/__release/register' && req.method === 'POST'){
        let body='';for await(const chunk of req){body+=chunk;if(body.length>2048) throw new Error('oversize');}
        const input=JSON.parse(body), next=new URL(input.next);
        const localPort=String(server.address().port);
        const local=['127.0.0.1','localhost'].includes(next.hostname) && next.protocol === 'http:' && next.port === localPort;
        const remote=next.origin === 'https://fangjiaqifion.github.io' && next.pathname === '/note-trainer/index.html';
        if(!/^[a-f0-9]{10}$/.test(input.build) || (!local && !remote) || next.searchParams.get('build') !== input.build)
          throw new Error('invalid callback destination');
        const token=randomBytes(24).toString('hex');
        receipts.set(token,{build:input.build,next:next.href,created:Date.now(),status:'waiting'});
        res.end(JSON.stringify({token}));return;
      }
      const token=path.split('/').pop(), item=receipts.get(token);
      if(!item){res.writeHead(404);res.end('{}');return;}
      if(path === '/__release/receipt/'+token && req.method === 'GET'){
        if(item.status !== 'waiting'){res.writeHead(409);res.end('{"error":"receipt already used"}');return;}
        if(url.searchParams.get('build') !== item.build){res.writeHead(409);res.end('{"error":"build mismatch"}');return;}
        if(url.searchParams.get('status') === 'failed'){
          item.status='failed';item.stage=/^[a-z-]+$/.test(url.searchParams.get('stage') || '') ? url.searchParams.get('stage') : 'unknown';
          res.end(JSON.stringify({status:'failed',stage:item.stage,message:'缓存清理未完成；本次不能作为新版代码测试。'}));return;
        }
        item.status='ready';res.writeHead(302,{'Location':item.next});res.end();return;
      }
      if(path === '/__release/check/'+token && req.method === 'GET'){
        res.end(JSON.stringify({status:item.status,build:item.build,stage:item.stage}));return;
      }
      res.writeHead(404);res.end('{}');return;
    }
    if(path.split('/').some(part => part.startsWith('.') && part !== '')) throw new Error('private path');
    const target = await realpath(resolve(root,'.' + (path === '/' ? '/index.html' : path)));
    if(!target.startsWith(root + sep)) throw new Error('outside root');
    const bytes = await readFile(target);
    res.writeHead(200,{'Content-Type':mime[extname(target)] || 'application/octet-stream'});
    res.end(req.method === 'HEAD' ? undefined : bytes);
  }catch{ res.writeHead(404);res.end('not found'); }
}).listen(port,'0.0.0.0',() => console.log('Note Trainer: http://127.0.0.1:' + server.address().port));
