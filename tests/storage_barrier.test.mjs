import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const code=html.slice(html.indexOf('function judge('),html.indexOf('/* 把一道题的结果',html.indexOf('function judge(')));
test('failed durable answer save blocks advancement; retry resumes without recording twice',()=>{
 let recorded=0,delays=0,resume;
 const G={q:{wrong:0},busy:false,session:1,first:0,i:0,qs:[{},{}]};
 const c=vm.createContext({G,recordAnswer:()=>{recorded++;return false;},holdForStorage:fn=>{resume=fn;},toast:()=>{},praise:()=>'',confetti:()=>{},delay:()=>delays++});
 vm.runInContext(code,c);c.judge(true);assert.equal(recorded,1);assert.equal(delays,0);assert.equal(G.i,0);assert.equal(G.busy,true);
 c.judge(true);assert.equal(recorded,1);resume();assert.equal(delays,1);assert.equal(recorded,1);
});
