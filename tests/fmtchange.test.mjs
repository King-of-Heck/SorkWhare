import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './load.mjs';
const ctx=loadApp();
const {compare,fmtWrap}=ctx;
// Minimal paragraph objects with explicit fmtSpans (text identical between sides).
const P=(text,fmtSpans)=>({text,boldRuns:[],fmtSpans});
const span=(s,e,o={})=>({s,e,b:false,i:false,u:false,f:'Calibri',z:11,...o});

test('fmtWrap marks the changed range with a fmtchg span carrying the description', ()=>{
  const html=fmtWrap('the term here',[span(0,4),span(4,8,{b:true}),span(8,13)],[{s:4,e:8,desc:'bold added'}]);
  assert.match(html,/<span class="fmtchg" title="bold added">/);
  assert.match(html,/<b>term<\/b>/);           // revised bold rendered
  assert.match(html,/^the /);                    // unchanged prefix outside the mark
});

test('compare: equal text with a formatting diff → uncounted fmtChanged row', ()=>{
  const orig=[P('Clause text here',[span(0,16)])];
  const rev =[P('Clause text here',[span(0,7),span(7,11,{b:true}),span(11,16)])];
  const {rows,summary}=compare(orig,rev,{});
  const row=rows.find(r=>r.fmtChanged);
  assert.ok(row,'expected a fmtChanged row');
  assert.equal(row.type,'equal');
  assert.equal(row.cid,undefined,'formatting change is not numbered');
  assert.equal(summary.formatting,1);
  assert.equal(summary.total,0,'formatting change must not touch Total');
  assert.match(row.html,/class="fmtchg"/);
  assert.deepEqual(JSON.parse(JSON.stringify(row.fmtDescs)),['bold added'],'fmtDescs carries the change descriptions for Task 6 PDF notes');
});

test('compare: equal text with identical formatting → plain equal row, no formatting count', ()=>{
  const orig=[P('Same same',[span(0,9)])];
  const rev =[P('Same same',[span(0,9)])];
  const {rows,summary}=compare(orig,rev,{});
  assert.equal(summary.formatting,0);
  assert.ok(!rows.some(r=>r.fmtChanged));
});
