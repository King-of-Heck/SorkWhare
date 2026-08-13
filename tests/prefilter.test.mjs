import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './load.mjs';
const ctx=loadApp();
const {sim,simUpper,tok,compare}=ctx;
const T=s=>tok(s).filter(t=>t.trim());
const P=t=>({text:t,boldRuns:[],marker:'',ilvl:0,isBold:false,heading:null,
  pageBreakBefore:false,align:'left',indLeftPt:0,indHangingPt:0,indFirstLinePt:0,isNumbered:false});

test('simUpper is a true upper bound on sim', ()=>{
  const cases=[
    ['the quick brown fox','the quick brown dog'],
    ['a b c d e','e d c b a'],
    ['unrelated words entirely','something else altogether'],
    ['x','x'],['','a b c'],
  ];
  for(const[a,b]of cases)
    assert.ok(simUpper(T(a),T(b))>=sim(a,b)-1e-9,`bound violated for "${a}" vs "${b}"`);
});

test('pairing decisions unchanged with prefilter', ()=>{
  const orig=['clause one stays the same','the quick brown fox jumped over the fence','totally unique deleted text here'].map(P);
  const rev =['clause one stays the same','the quick brown fox leaped over the fence','fresh inserted paragraph appears now'].map(P);
  const {rows}=compare(orig,rev,{ignoreCase:false,moveMin:5});
  // rows comes from loadApp()'s vm context (a separate JS realm); its arrays
  // carry that realm's Array.prototype, so assert.deepEqual treats them as
  // unequal to same-shaped main-realm arrays even when every value matches
  // (see tests/diff.test.mjs for the same issue). JSON round-trip normalizes.
  const types=JSON.parse(JSON.stringify(rows.map(r=>r.type)));
  assert.deepEqual(types,['equal','changed','deleted','inserted']);
});
