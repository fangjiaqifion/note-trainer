/* note-trainer 烟雾测试
   运行：npm install && npm test
   依赖：playwright-core + 本机 Google Chrome（不下载浏览器）
   覆盖：首页九张卡、13 种题型 × 4 个视口的溢出检查、单音选项、
        新音 14 题的中途续学与完整结算、报告列数、控制台报错。 */

import assert from 'node:assert/strict';
import { generationAudit } from './generation_audit.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

function startServer(){
  const server = createServer(async function(req, res){
    const url = new URL(req.url, 'http://127.0.0.1');
    let path = decodeURIComponent(url.pathname);
    if(path === '/' || path === '') path = '/index.html';
    const file = normalize(join(ROOT, path));
    if(!file.startsWith(ROOT)){
      res.statusCode = 403;
      res.end('forbidden');
      return;
    }
    try{
      const body = await readFile(file);
      res.setHeader('content-type', MIME[extname(file)] || 'application/octet-stream');
      res.setHeader('cache-control', 'no-store');
      res.end(body);
    }catch(e){
      res.statusCode = 404;
      res.end('not found');
    }
  });
  return new Promise(function(resolve){
    server.listen(0, '127.0.0.1', function(){ resolve(server); });
  });
}

const SEED = {
  accounts: {
    v: 1,
    accounts: [{
      id: 't1', name: '测试', salt: 'smoke', hash: 'fnv1a:0',
      color: '#3C7DD9', createdAt: 0, lastActiveAt: 0
    }],
    currentId: 't1', legacyImported: false, locked: false
  },
  state: {
    v: 3, layout: 2, stars: {}, progress: {}, selected: null,
    spot: { note: 'A4', step: 0 }, focus: 'A4', lastSeen: {},
    events: [], eventSeq: 0, practiceSeq: 0, autoHistory: [],
    battery: null, level7: 1, legacyE4: 0,
    sound: false, speech: false, labels: false, decor: false,
    difficulty: 'auto', autoLevel: 'normal',
    createdAt: 0, updatedAt: 0
  }
};

async function seedLocalStorage(context){
  await context.addInitScript(function(seed){
    try{
      localStorage.setItem('nt.accounts.v1', JSON.stringify(seed.accounts));
      localStorage.setItem('nt.state.t1.v1', JSON.stringify(seed.state));
    }catch(e){}
  }, SEED);
}

/* 在页面里把某道题渲染到游戏页，用于版式检查。 */
async function renderCases(){
  const d = window.__dbg;
  const play = document.querySelector('#play');
  const stage = document.querySelector('#stage');
  const answer = document.querySelector('#answer');
  const cases = [
    ['kbfind', d.SPOT_STEPS[0]('A4')],
    ['find', d.SPOT_STEPS[1]('A4')],
    ['kbfind2', d.SPOT_STEPS[2]('A4')],
    ['s2k', d.SPOT_STEPS[3]('A4')],
    ['k2s', d.SPOT_STEPS[4]('A4')],
    ['clef', d.SPOT_STEPS[5]('A4')],
    ['beats', d.SPOT_STEPS[7]('A4')],
    ['play', d.SPOT_STEPS[9]('A4')],
    ['spot', d.buildQuestions(6)[0]],
    ['pairdir', d.buildQuestions(7)[0]],
    ['higher', d.buildQuestions(7).find(function(q){ return q.kind === 'higher'; })],
    ['ledger', d.buildQuestions(8)[0]],
    ['contrast', d.buildQuestions(9)[0]]
  ];
  const out = [];
  for(const item of cases){
    const name = item[0], q = item[1];
    if(!q) continue;
    document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
    play.classList.add('active');
    play.classList.remove('with-kb');
    stage.className = 'stage';
    answer.className = 'answer';
    stage.innerHTML = '';
    answer.innerHTML = '';
    d.G.q = q;
    q.answered = true;
    q.render();
    await new Promise(function(r){ requestAnimationFrame(function(){ requestAnimationFrame(r); }); });
    const s = stage.getBoundingClientRect();
    const a = answer.getBoundingClientRect();
    const p = document.querySelector('.prompt').getBoundingClientRect();
    const ok = a.bottom <= innerHeight + 0.5 &&
      s.bottom <= innerHeight + 0.5 &&
      s.top >= p.bottom - 0.6 &&
      s.right <= innerWidth + 0.5 &&
      a.right <= innerWidth + 0.5;
    out.push({ name: name, ok: ok, bottom: Math.round(Math.max(s.bottom, a.bottom)) });
  }
  return out;
}

async function layoutCheck(page){
  const viewports = [[844, 390], [390, 844], [820, 1180], [1180, 820]];
  for(const [width, height] of viewports){
    await page.setViewportSize({ width, height });
    const rows = await page.evaluate(renderCases);
    const bad = rows.filter(function(r){ return !r.ok; });
    assert.deepEqual(bad, [], `layout overflow at ${width}x${height}: ${JSON.stringify(bad)}`);
  }
}

async function singleChoiceCheck(page){
  const count = await page.evaluate(async function(){
    const d = window.__dbg;
    const old = d.S.selected.slice();
    d.S.selected = ['B3'];
    const q = d.buildQuestions(2).find(function(x){ return x.kind === 'k2s'; });
    document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
    document.querySelector('#play').classList.add('active');
    const stage = document.querySelector('#stage');
    const answer = document.querySelector('#answer');
    stage.className = 'stage';
    answer.className = 'answer';
    stage.innerHTML = '';
    answer.innerHTML = '';
    d.G.q = q;
    q.answered = true;
    q.render();
    const n = answer.querySelectorAll('.card-btn').length;
    d.S.selected = old;
    return n;
  });
  assert.ok(count >= 2, 'key -> staff must keep at least two choices');
}

async function answerOne(page){
  const kind = await page.evaluate(function(){ return window.__dbg.G.q && window.__dbg.G.q.kind; });
  if(!kind) throw new Error('no current question');

  if(kind === 'play'){
    await page.evaluate(function(){
      const d = window.__dbg, q = d.G.q;
      const b = document.querySelector('[data-side="' + d.NOTES[q.noteId].hand + '"]');
      if(b) b.click();
    });
    await page.waitForSelector('[data-finger]', { timeout: 4000 });
    await page.evaluate(function(){
      const d = window.__dbg, q = d.G.q;
      const b = document.querySelector('[data-finger="' + d.NOTES[q.noteId].finger + '"]');
      if(b) b.click();
    });
    await page.waitForSelector('#answer .kb .w', { timeout: 4000 });
  }else if(kind === 'beats' || kind === 'shape'){
    await page.evaluate(function(){
      const d = window.__dbg, q = d.G.q;
      if(q.kind === 'beats'){
        const b = Array.from(document.querySelectorAll('#answer .opt')).find(function(x){
          const n = x.querySelector('.num');
          return n && Number(n.textContent) === d.VALUES[q.valueId].beats;
        });
        if(b) b.click();
      }else{
        const b = document.querySelector('#answer .card-btn[data-value="' + q.valueId + '"]');
        if(b) b.click();
      }
    });
    await page.waitForSelector('#answer .kb .w', { timeout: 4000 });
  }else if(kind === 'k2s'){
    await page.evaluate(function(){
      const q = window.__dbg.G.q;
      const b = document.querySelector('#answer .card-btn[data-note="' + q.noteId + '"]');
      if(b) b.click();
    });
  }else if(kind === 'clef'){
    await page.evaluate(function(){
      const d = window.__dbg, q = d.G.q;
      const b = document.querySelector('[data-clef="' + d.NOTES[q.noteId].clef + '"]');
      if(b) b.click();
    });
  }else if(kind === 's2k' || kind === 'kbfind' || kind === 'find'){
    await page.evaluate(function(kind){
      const d = window.__dbg, q = d.G.q;
      const L = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const letter = function(m){ return L[((m % 12) + 12) % 12]; };
      const keys = Array.from(document.querySelectorAll('#answer .kb .w'));
      let k = null;
      if(kind === 'find'){
        k = keys.find(function(x){ return letter(Number(x.dataset.midi)) === q.letter; });
      }else{
        const used = keys.filter(function(x){ return x.classList.contains('used'); })
          .map(function(x){ return Number(x.dataset.midi); });
        k = keys.find(function(x){
          return Number(x.dataset.midi) === d.NOTES[q.noteId].midi && used.indexOf(Number(x.dataset.midi)) < 0;
        });
        if(!k){
          k = keys.find(function(x){
            return letter(Number(x.dataset.midi)) === d.NOTES[q.noteId].letter &&
              used.indexOf(Number(x.dataset.midi)) < 0;
          });
        }
      }
      if(k) k.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    }, kind);
  }else{
    throw new Error('answerOne does not handle ' + kind);
  }

  if(kind === 'beats' || kind === 'shape' || kind === 'play'){
    const info = await page.evaluate(function(){
      const d = window.__dbg, q = d.G.q;
      const ms = Math.round(60000 / d.DIFFS[d.G.diffKey].bpm);
      const k = Array.from(document.querySelectorAll('#answer .kb .w'))
        .find(function(x){ return Number(x.dataset.midi) === d.NOTES[q.noteId].midi; });
      if(!k) return null;
      k.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      return { ms: ms, beats: d.VALUES[q.valueId].beats };
    });
    assert.ok(info, 'hold key not found');
    await page.waitForTimeout(Math.round(info.ms * info.beats * 1.03));
    await page.evaluate(function(){
      const k = Array.from(document.querySelectorAll('#answer .kb .w'))
        .find(function(x){ return x.classList.contains('on'); });
      if(k) k.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });
  }

  const prev = await page.evaluate(function(){ return window.__dbg.G.i; });
  await page.waitForFunction(function(p){
    const result = document.querySelector('#result');
    return window.__dbg.G.i > p || (result && result.classList.contains('active'));
  }, prev, { timeout: 6000 });
}

async function clefOrderCheck(page){
  const result = await page.evaluate(function(){
    const d = window.__dbg;
    const bad = [];
    const seen = {};
    for(let k = 0; k < 200; k++){
      const letters = d.buildQuestions(3).map(function(q){
        return d.NOTES[q.noteId].letter;
      });
      seen[letters.join('')] = 1;
      for(let i = 1; i < letters.length; i++){
        if(letters[i] === letters[i - 1]){
          bad.push(letters.join(''));
          break;
        }
      }
    }
    return { bad: bad.slice(0, 5), distinct: Object.keys(seen).length };
  });
  assert.deepEqual(result.bad, [], 'skill 3 must not repeat the same note name twice in a row');
  assert.ok(result.distinct >= 20, 'skill 3 must produce varied orders');
}

async function repeatCheck(page){
  const problems = await page.evaluate(function(){
    const d = window.__dbg;
    const bad = [];
    function noteAdjacent(skill){
      for(let k = 0; k < 100; k++){
        const qs = d.buildQuestions(skill);
        for(let i = 1; i < qs.length; i++){
          if(qs[i].noteId && qs[i - 1].noteId && qs[i].noteId === qs[i - 1].noteId){
            bad.push('skill ' + skill + ': ' + qs.map(function(q){ return q.noteId; }).join(' '));
            return;
          }
        }
      }
    }
    [2, 4, 5, 9].forEach(noteAdjacent);
    for(let k = 0; k < 100; k++){
      const qs = d.buildDailySession();
      for(let i = 1; i < qs.length; i++){
        if(qs[i].noteId && qs[i - 1].noteId && qs[i].noteId === qs[i - 1].noteId){
          bad.push('daily: ' + qs.map(function(q){ return q.noteId; }).join(' '));
          return;
        }
      }
    }
    for(let k = 0; k < 100; k++){
      const qs = d.buildQuestions(8);
      for(let i = 1; i < qs.length; i++){
        if(qs[i].clef + '|' + qs[i].spot === qs[i - 1].clef + '|' + qs[i - 1].spot){
          bad.push('skill 8 position repeated');
          break;
        }
      }
    }
    return bad.slice(0, 5);
  });
  assert.deepEqual(problems, [], 'adjacent repeats: ' + problems.join(' | '));
}

/* 不同勾选组合下的出题多样性。旧测试只跑默认的「全部已学音」，
   所以第三关在「只勾 D、E」时退化成八题全是 D，测试照样通过。
   这里逐个换勾选音集，要求：有至少两个音时不能只剩一个；
   第三关勾过的音名都要出现，有对应写法时才要求两种谱号；
   第八关一节课里不能出现两道同一个位置。 */
async function selectionVarietyCheck(page){
  const result = await page.evaluate(function(){
    const d = window.__dbg;
    const oldSel = d.S.selected.slice();
    const oldProgress = JSON.parse(JSON.stringify(d.S.progress));
    const problems = [];
    const cases = [
      { name:'D+E', sel:['D4', 'E4'] },
      { name:'E only', sel:['E4'] },
      { name:'B only', sel:['B3'] },
      { name:'C only', sel:['C4'] },
      { name:'D+E+A3', sel:['D4', 'E4', 'A3'] },
      { name:'all', sel:d.NOTE_ORDER.slice() }
    ];
    const skills = [1, 2, 3, 4, 5, 8, 9];

    function keyOf(q, skill){
      if(skill === 1) return q.letter;
      if(skill === 3) return d.NOTES[q.noteId].letter;
      if(skill === 8) return q.clef + '|' + q.spot;
      return q.noteId;
    }

    cases.forEach(function(c){
      d.S.progress = JSON.parse(JSON.stringify(oldProgress));
      d.S.selected = c.sel.slice();
      c.sel.forEach(function(id){ d.S.progress[id] = { key:1, pos:1, fin:1 }; });

      skills.forEach(function(skill){
        const active = d.activeNotes(d.SKILLS[skill - 1].needs);
        if(skill === 9 && active.length < 2) return;
        for(let k = 0; k < 30; k++){
          const qs = d.buildQuestions(skill);
          if(!qs.length){
            problems.push(c.name + ' skill ' + skill + ' empty');
            break;
          }
          const keys = qs.map(function(q){ return keyOf(q, skill); });
          const distinct = {};
          keys.forEach(function(x){ distinct[x] = 1; });
          const distinctCount = Object.keys(distinct).length;
          /* 只勾一个音时，整节课只出这个音是正常的；
             有第二个音可出却还是同一个音，才是退化。 */
          if(distinctCount >= 2){
            for(let i = 1; i < keys.length; i++){
              if(keys[i] && keys[i] === keys[i - 1]){
                problems.push(c.name + ' skill ' + skill + ' adjacent ' + keys[i] + ': ' + keys.join(' '));
                break;
              }
            }
          }
          if(active.length >= 2 && distinctCount < 2){
            problems.push(c.name + ' skill ' + skill + ' collapsed to one item: ' + keys.join(' '));
          }
          if(skill === 3){
            c.sel.forEach(function(id){
              const letter = d.NOTES[id].letter;
              if(keys.indexOf(letter) < 0){
                problems.push(c.name + ' skill 3 missing selected ' + letter + ': ' + keys.join(' '));
              }
            });
            const clefs = {};
            qs.forEach(function(q){ clefs[d.NOTES[q.noteId].clef] = 1; });
            if(c.sel.includes('C4') || (c.sel.some(id => d.NOTES[id].clef === 'bass') && c.sel.some(id => d.NOTES[id].clef === 'treble'))){
              if(Object.keys(clefs).length < 2){
                problems.push(c.name + ' skill 3 only one clef: ' + keys.join(' '));
              }
            }
          }
          if(skill === 8){
            const seen = {};
            qs.forEach(function(q){
              const spot = q.clef + '|' + q.spot;
              if(seen[spot]) problems.push(c.name + ' skill 8 duplicate ' + spot);
              seen[spot] = 1;
            });
          }
        }
      });

      for(let k = 0; k < 20; k++){
        const qs = d.buildDailySession();
        const distinct = {};
        qs.forEach(function(q){ if(q.noteId) distinct[q.noteId] = 1; });
        if(Object.keys(distinct).length < 2) continue;
        for(let i = 1; i < qs.length; i++){
          if(qs[i].noteId && qs[i].noteId === qs[i - 1].noteId){
            problems.push(c.name + ' daily adjacent ' + qs[i].noteId);
            break;
          }
        }
      }
    });

    d.S.selected = oldSel;
    d.S.progress = oldProgress;
    return { problems: problems.slice(0, 12) };
  });
  assert.deepEqual(result.problems, [], 'selection variety: ' + result.problems.join(' | '));
}

async function ledgerCheck(page){
  const info = await page.evaluate(function(){
    const d = window.__dbg;
    const qs = d.buildQuestions(8);
    const q = qs[0];
    document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
    document.querySelector('#play').classList.add('active');
    const stage = document.querySelector('#stage');
    const answer = document.querySelector('#answer');
    stage.className = 'stage';
    answer.className = 'answer';
    stage.innerHTML = '';
    answer.innerHTML = '';
    d.G.q = q;
    q.answered = true;
    q.render();
    const sel = document.querySelector('.ledger-sentence select[data-key="num"]');
    return {
      count: qs.length,
      numbers: sel ? Array.from(sel.options).map(function(o){ return o.value; }).filter(Boolean) : []
    };
  });
  assert.equal(info.count, 6, 'skill 8 must have six questions');
  assert.deepEqual(info.numbers, ['1', '2', '3', '4', '5', '6', '7', '8'],
    'skill 8 number choices must always be 1-8');
}

async function spotlightCheck(page){
  await page.evaluate(function(){
    const d = window.__dbg;
    d.S.progress.A4 = { key: 0, pos: 0, fin: 0 };
    d.S.spot = { note: 'A4', step: 0 };
    d.S.focus = 'A4';
    d.startNoteImport('A4');
  });
  await page.waitForSelector('#play.active');

  for(let i = 0; i < 3; i++) await answerOne(page);
  assert.equal(await page.evaluate(function(){ return window.__dbg.S.spot.step; }), 3,
    'spotlight step must be saved after each answer');

  await page.click('#btnBack');
  await page.waitForSelector('#home.active');
  assert.equal(await page.evaluate(function(){ return window.__dbg.S.spot.step; }), 3,
    'spotlight step must survive leaving the lesson');

  await page.evaluate(function(){ window.__dbg.startSpotlight(); });
  await page.waitForSelector('#play.active');
  assert.equal(await page.evaluate(function(){ return window.__dbg.G.spotFrom; }), 3,
    'resume must start at the saved step');

  for(let i = 0; i < 20; i++){
    const done = await page.evaluate(function(){
      return document.querySelector('#result').classList.contains('active');
    });
    if(done) break;
    await answerOne(page);
  }

  const end = await page.evaluate(function(){
    const d = window.__dbg;
    return {
      result: document.querySelector('#result').classList.contains('active'),
      text: document.querySelector('#result').innerText,
      progress: d.S.progress.A4,
      spot: d.S.spot,
      selected: d.S.selected
    };
  });
  assert.ok(end.result, 'spotlight must reach the result screen');
  assert.match(end.text, /11\s*\/\s*11/, 'resumed lesson must finish its 11 remaining questions, got: ' + end.text.replace(/\s+/g, ' '));
  assert.match(end.text, /键位、谱位、指法都打开了/, 'resumed lesson must open all three flags');
  assert.deepEqual(end.progress, { key: 1, pos: 1, fin: 1 }, 'all three flags must open');
  assert.equal(end.spot, null, 'S.spot must clear after the lesson');
  assert.ok(end.selected.indexOf('A4') >= 0, 'A4 must be selected automatically');
}

async function reportCheck(page){
  await page.evaluate(function(){ window.__dbg.openReport(); });
  await page.waitForSelector('#reportModal.open');
  const report = await page.evaluate(function(){
    return {
      text: document.querySelector('#reportBody').innerText,
      headers: Array.from(document.querySelectorAll('.matrix th')).map(function(th){
        return th.textContent;
      })
    };
  });
  assert.ok(report.text.indexOf('九个技能') >= 0, 'report must say nine skills');
  assert.equal(report.headers.length, 11, 'matrix must have date + 9 skills + total');
}

/* clear-cache.html 的独立测试：用允许 Service Worker 的新 context，
   先种一个本游戏的旧缓存和一个别家缓存，清完只掉本游戏的缓存，
   localStorage 必须保留。 */
async function cacheResetCheck(browser, port){
  const context = await browser.newContext({
    viewport: { width: 820, height: 1180 },
    serviceWorkers: 'allow'
  });
  await seedLocalStorage(context);
  const page = await context.newPage();
  try{
    await page.goto('http://127.0.0.1:' + port + '/manifest.webmanifest');
    await page.evaluate(async function(){
      const other = await caches.open('other-app-cache');
      await other.put('./other', new Response('keep'));
      const sibling = await caches.open('note-trainer-sibling@' + location.origin + '/another-game/');
      await sibling.put('./sibling', new Response('keep sibling'));
    });
    await page.goto('http://127.0.0.1:' + port + '/index.html');
    await page.waitForSelector('#home.active');
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    const before = await page.evaluate(async function(){
      await navigator.serviceWorker.ready;
      const c = await caches.open('note-trainer-old-test');
      await c.put('./index.html', new Response('old', { headers: { 'content-type': 'text/html' } }));
      const other = await caches.open('other-app-cache');
      await other.put('./other', new Response('keep'));
      localStorage.setItem('nt.cache-test.keep', 'yes');
      return {
        sw: (await navigator.serviceWorker.getRegistrations()).length,
        caches: await caches.keys()
      };
    });
    assert.ok(before.sw >= 1, 'the game should register a service worker');
    assert.ok(before.caches.some(function(k){ return k.indexOf('note-trainer-') === 0; }));
    assert.ok(before.caches.includes('other-app-cache'), 'worker activation must preserve unrelated caches');
    assert.ok(before.caches.some(k => k.includes('sibling@')), 'worker activation must preserve sibling scope');

    await page.goto('http://127.0.0.1:' + port + '/clear-cache.html?stay=1&next=%2Findex.html');
    await page.waitForFunction(function(){
      return document.querySelector('h1').textContent === '缓存已清理';
    }, null, { timeout: 8000 });

    const after = await page.evaluate(async function(){
      return {
        sw: (await navigator.serviceWorker.getRegistrations()).length,
        caches: await caches.keys(),
        keep: localStorage.getItem('nt.cache-test.keep')
      };
    });
    assert.equal(after.sw, 0, 'clear-cache must unregister the game service worker');
    assert.ok(!after.caches.some(function(k){ return k.indexOf('note-trainer-') === 0 && !k.includes('sibling@'); }),
      'clear-cache must delete note-trainer caches');
    assert.ok(after.caches.some(k => k.includes('sibling@')), 'reset must preserve sibling scope');
    assert.ok(after.caches.indexOf('other-app-cache') >= 0,
      'clear-cache must leave other apps on the same origin alone');
    assert.equal(after.keep, 'yes', 'clear-cache must keep localStorage');
    assert.equal(await page.title(), 'note-trainer-cache:ok:', 'successful reset must send a completion receipt');

    // SW 开启时的真实升级/离线路径，不能把清理页缓存成游戏首页。
    await page.goto('http://127.0.0.1:' + port + '/index.html');
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await context.setOffline(true);
    await page.reload();
    await page.waitForSelector('#home.active');
    assert.ok(await page.locator('meta[name="app-build"]').count(), 'offline fallback must be the game shell');
    await context.setOffline(false);

    const build = await page.locator('meta[name="app-build"]').getAttribute('content');
    await page.goto('http://127.0.0.1:' + port + '/clear-cache.html?launch=1&token=auto&build=' + build);
    await page.waitForFunction(expected => document.title === 'note-trainer-ready:' + expected + ':auto', build);
    assert.equal(new URL(page.url()).searchParams.get('build'), build, 'reset must open the verified build');

    await page.route('**/manifest.webmanifest', route => route.fulfill({status:500,body:'test failure'}));
    await page.goto('http://127.0.0.1:' + port + '/clear-cache.html?stay=1&token=failure');
    await page.waitForFunction(() => document.documentElement.dataset.cacheStatus === 'failed');
    assert.equal(await page.title(), 'note-trainer-cache:failed:failure', 'HTTP errors must not report a successful reset');

    await page.goto('http://127.0.0.1:' + port + '/index.html?build=0000000000&verify=old-page');
    assert.equal(await page.title(), 'note-trainer-load:failed:old-page', 'an old page must not claim the requested build');
    assert.match(await page.locator('body').innerText(), /版本尚未更新/);

    // 模拟 Safari 的 SW 接口不返回：必须在步骤级超时后失败，不能无限挂起。
    await page.addInitScript(() => {
      Object.defineProperty(navigator.serviceWorker,'getRegistrations',{
        value:() => new Promise(() => {})
      });
    });
    await page.goto('http://127.0.0.1:' + port + '/clear-cache.html?stay=1&token=hang');
    await page.waitForFunction(() => document.documentElement.dataset.cacheStatus === 'failed', null, {timeout:12000});
    assert.equal(await page.title(),'note-trainer-cache:failed:hang');
    assert.match(await page.locator('body').innerText(),/service-worker 超时/);
  }finally{
    await context.close();
  }
}

async function main(){
  const server = await startServer();
  const port = server.address().port;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 820, height: 1180 },
    serviceWorkers: 'block'
  });
  const errors = [];
  const page = await context.newPage();
  page.on('pageerror', function(e){ errors.push(e.message); });
  page.on('console', function(m){ if(m.type() === 'error') errors.push(m.text()); });

  try{
    await seedLocalStorage(context);
    await page.goto('http://127.0.0.1:' + port + '/index.html');
    await page.waitForSelector('#home.active');

    const cards = await page.evaluate(function(){
      return document.querySelectorAll('#levelGrid .level-card').length;
    });
    assert.equal(cards, 9, 'home must show nine skill cards');
    console.log('PASS home: 9 skill cards');
    const build = await page.evaluate(() => ({
      meta: document.querySelector('meta[name="app-build"]').content,
      settings: document.querySelector('#buildTag').textContent
    }));
    assert.equal(build.settings, '构建 ' + build.meta, 'settings must display the actual page build');
    console.log('PASS build: settings matches page build ' + build.meta);

    await layoutCheck(page);
    console.log('PASS layout: 13 question types x 4 viewports');

    await singleChoiceCheck(page);
    console.log('PASS single note: key -> staff keeps 2 choices');

    await clefOrderCheck(page);
    console.log('PASS level 3: no adjacent same note name, varied order');

    await repeatCheck(page);
    console.log('PASS repeats: no adjacent same note in skills 2, 4, 5, 8, 9 and daily');

    await selectionVarietyCheck(page);
    console.log('PASS selection: every checked set keeps variety in skills 1-9 and daily');

    await generationAudit(page);

    await ledgerCheck(page);
    console.log('PASS level 8: 6 questions, numbers 1-8');

    await spotlightCheck(page);
    console.log('PASS spotlight: resume at saved step, open all flags');

    await reportCheck(page);
    console.log('PASS report: nine-skill matrix');

    await cacheResetCheck(browser, port);
    console.log('PASS cache reset: game caches cleared, other caches and localStorage kept');

    assert.deepEqual(errors, [], 'console errors: ' + errors.join(' | '));
    console.log('PASS console: no errors');
    console.log('\nAll smoke tests passed.');
  }finally{
    await browser.close();
    await new Promise(function(resolve){ server.close(resolve); });
  }
}

main().catch(function(err){
  console.error('\nFAIL:', err && err.message ? err.message : err);
  process.exitCode = 1;
});
