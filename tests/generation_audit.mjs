import assert from 'node:assert/strict';

// 全部 255 个非空勾选集合 × 三档难度 × 两种错误历史 × 三个固定随机种子。
// 检查返回内容本身，避免「相邻不重复」在全空/全同音时虚假通过。
export async function generationAudit(page){
  const result = await page.evaluate(function(){
    const d = window.__dbg, s = d.S, g = d.G;
    const saved = { selected:s.selected, progress:s.progress, events:s.events, difficulty:s.difficulty,
      diffKey:g.diffKey, lastSeen:s.lastSeen };
    const random = Math.random;
    const failures = [];
    let sessions = 0;
    const samples = [];
    function check(ok, msg){ if(!ok && failures.length < 20) failures.push(msg); }
    function inspect(qs, skill, sel, prefix){
      sessions++;
      const n = skill === 'daily' ? 10 : d.SKILLS[skill - 1].count
        ? d.SKILLS[skill - 1].count(d.DIFFS[g.diffKey].count) : d.DIFFS[g.diffKey].count;
      // 易混音只允许已定义的相邻/易混对子；没有合法对子时为空。
      if([9,12].includes(skill) && !qs.length) return;
      check(qs.length === n, prefix + ' count ' + qs.length + '/' + n);
      const key = q => skill === 1 ? q.letter : skill === 3 ? d.NOTES[q.noteId].letter
        : skill === 8 ? q.clef + '|' + q.spot : q.noteId;
      const keys = qs.map(key).filter(Boolean);
      if([1,2,3,4,5,'daily'].includes(skill)){
        const expected = skill === 1 || skill === 3
          ? [...new Set(sel.map(id => d.NOTES[id].letter))] : sel;
        if(n >= expected.length && skill !== 'daily'){
          expected.forEach(id => check(keys.includes(id), prefix + ' missing ' + id));
        }
        qs.forEach(q => {
          if(q.noteId) check(sel.includes(q.noteId === 'C4B' ? 'C4' : q.noteId), prefix + ' unselected ' + q.noteId);
          if(q.kind === 'find') check(sel.some(id => d.NOTES[id].letter === q.letter), prefix + ' unselected letter ' + q.letter);
        });
      }
      if([9,12].includes(skill)) qs.forEach(q=>{
        check(q.choiceIds.every(id=>sel.includes(id)),prefix+' unselected comparison choice');
        check(q.choiceIds.length===(skill===12?3:2),prefix+' choice count');
      });
      if(skill === 9) qs.forEach(q=>{
        const base=q.clef==='treble'?2:4;
        const letterAt=y=>((base+Math.round((4-y)*2))%7+7)%7;
        check(letterAt(q.y1)!==letterAt(q.y2),prefix+' ambiguous same-letter pair');
      });
      if(skill === 8) check(new Set(keys).size === n, prefix + ' duplicate position');
      if([1,2,3,4,5].includes(skill) && new Set(keys).size > 1){
        const counts = keys.reduce((a,k) => (a[k] = (a[k] || 0) + 1, a), {});
        if(Math.max(...Object.values(counts)) <= Math.ceil(keys.length / 2)){
          check(keys.every((k,i) => i === 0 || k !== keys[i-1]), prefix + ' adjacent ' + keys.join(','));
        }
      }
      if(skill === 'daily'){
        for(let i=1; i<qs.length; i++){
          if(qs[i].noteId && qs[i-1].noteId && sel.length > 1)
            check(qs[i].noteId !== qs[i-1].noteId, prefix + ' daily adjacent');
        }
        // 两个不同字母时，找键盘也必须计入全节音数，恰好各五题。
        if(sel.length === 2 && d.NOTES[sel[0]].letter !== d.NOTES[sel[1]].letter){
          const letters = qs.map(q => q.letter || d.NOTES[q.noteId].letter);
          check(letters.filter(l => l === d.NOTES[sel[0]].letter).length === 5, prefix + ' daily imbalance ' + letters);
          check(letters.every((l,i) => !i || l !== letters[i-1]), prefix + ' daily visible repeat ' + letters);
        }
      }
    }
    try{
      s.progress = Object.fromEntries(d.NOTE_ORDER.map(id => [id,{key:1,pos:1,fin:1}]));
      s.lastSeen = {};
      audit: for(let mask=1; mask < (1 << d.NOTE_ORDER.length); mask++){
        const sel = d.NOTE_ORDER.filter((id,i) => mask & (1 << i));
        s.selected = sel;
        for(const difficulty of ['easy','normal','hard']){
          s.difficulty = g.diffKey = difficulty;
          for(let history=0; history<2; history++){
            s.events = history ? sel.flatMap((id,i) => Array.from({length:8}, () => ({note:id,first:i ? 1 : 0,kind:'s2k',mode:'skill'}))) : [];
            for(let seed=1; seed<=3; seed++){
              let state = seed * 100003 + mask;
              Math.random = function(){ state = (Math.imul(state,1664525) + 1013904223) >>> 0; return state / 4294967296; };
              const prefix = sel.join('+') + '/' + difficulty + '/history' + history + '/seed' + seed;
              for(let skill=1;skill<=d.SKILLS.length;skill++) inspect(d.buildQuestions(skill),skill,sel,prefix + '/skill' + skill);
              inspect(d.buildDailySession(),'daily',sel,prefix);
              if(mask === 12 && difficulty === 'normal' && history === 0)
                samples.push(d.buildQuestions(3).map(q => q.noteId).join(','));
              if(failures.length >= 20) break audit;
            }
          }
        }
      }
    }finally{
      Math.random = random;
      Object.assign(s, {selected:saved.selected,progress:saved.progress,events:saved.events,difficulty:saved.difficulty,lastSeen:saved.lastSeen});
      g.diffKey = saved.diffKey;
    }
    return {failures,sessions,samples};
  });
  assert.deepEqual(result.failures, [], 'generation audit: ' + result.failures.join(' | '));
  console.log(`PASS generation audit: ${result.sessions} sessions, 255 selections x 3 difficulties x 2 histories x 3 seeds x 12 modes`);
  console.log('D+E level 3: ' + result.samples.join(' | '));
}
