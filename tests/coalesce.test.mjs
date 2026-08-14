import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './load.mjs';
const ctx=loadApp();
const J=v=>JSON.parse(JSON.stringify(v));

test('B3: single del-phrase + single ins-phrase with one bold word each is NOT collapsed', ()=>{
  const {_coalesce}=ctx;
  // inlineDiffB splits on bold flips, so one clean phrase becomes 2 same-mode segments.
  const segs=[
    {m:'del',t:'old ',b:false},{m:'del',t:'term',b:true},   // ONE deleted phrase (2 segs)
    {m:'eq', t:' ',   b:false},                              // shared whitespace
    {m:'ins',t:'new ',b:false},{m:'ins',t:'item',b:true},    // ONE inserted phrase (2 segs)
  ];
  // Fixed behaviour: 1 del-run + 1 ins-run -> below threshold -> untouched (order preserved).
  assert.deepEqual(J(_coalesce(segs)),J(segs));
});

test('B3 regression: genuine dense alternation still collapses (all dels before all ins)', ()=>{
  const {_coalesce}=ctx;
  const segs=[
    {m:'del',t:'a',b:false},{m:'eq',t:' ',b:false},{m:'ins',t:'x',b:false},
    {m:'eq',t:' ',b:false},
    {m:'del',t:'b',b:false},{m:'eq',t:' ',b:false},{m:'ins',t:'y',b:false},
  ];
  const out=_coalesce(segs);
  const lastDel=out.map(s=>s.m).lastIndexOf('del');
  const firstIns=out.map(s=>s.m).indexOf('ins');
  assert.ok(lastDel<firstIns,'dense alternation must reorder to del-phrase then ins-phrase');
});
