import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(process.argv[2] || new URL('../index.html', import.meta.url), 'utf8');
const helpers = source.slice(source.indexOf('const randInt ='), source.indexOf('/* 十二平均律'));
const find = source.slice(source.indexOf('function repeatTo('), source.indexOf('/* 第 6 关的题目'));
let seed = 42;
const math = Object.create(Math);
math.random = () => ((seed = (Math.imul(seed,1664525) + 1013904223) >>> 0) / 4294967296);
const context = vm.createContext({Math:math, Map, LETTER_WEIGHT:{B:4,C:4,D:2,E:2,F:2,G:2,A:2}});
vm.runInContext(helpers + find, context);
for(let i=0;i<100;i++){
  const letters = context.findKeyLetters(8,['B','E']);
  assert.equal(letters.filter(l => l === 'B').length,4,'two letters must each get four questions');
}
let cases = 0;
for(let a=0;a<=10;a++) for(let b=0;b<=10-a;b++) for(let c=0;c<=10-a-b;c++){
  const counts = [a,b,c], n = a+b+c;
  const list = counts.flatMap((count,key) => Array(count).fill(key));
  for(const prev of [undefined,0,1,2]){
    const output = Array.from(context.spaceOut(list, x => x, prev));
    assert.deepEqual(output.slice().sort(),list.slice().sort(),'scheduler must preserve every item');
    const feasible = counts.every((count,key) => count <= (prev === key ? Math.floor(n/2) : Math.ceil(n/2)));
    if(feasible){
      assert.ok(output.every((key,i) => key !== (i ? output[i-1] : prev)),`avoidable repeat for ${counts}, previous=${prev}`);
    }
    cases++;
  }
}
console.log(`PASS scheduling audit: ${cases} count/boundary cases, balanced B/E across 100 seeded draws`);
