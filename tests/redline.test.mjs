import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './load.mjs';
const ctx=loadApp();

// Regression cases from the external redline-quality review (v1.3.0):
// clean del/ins pairs, number-aware tokens, phrase coalescing for dense rewrites.

test('tok: numbers with ,./-: separators are single tokens', ()=>{
  const {tok}=ctx;
  assert.deepEqual(JSON.parse(JSON.stringify(tok('$486,000'))),['$','486,000']);
  assert.deepEqual(JSON.parse(JSON.stringify(tok('42 MW'))),['42',' ','MW']);
  assert.deepEqual(JSON.parse(JSON.stringify(tok('September 1, 2026'))),['September',' ','1',',',' ','2026']);
  assert.deepEqual(JSON.parse(JSON.stringify(tok('4:30'))),['4:30']);
  assert.deepEqual(JSON.parse(JSON.stringify(tok('B2B'))),['B2B']);
});

test('T1 fee replacement: whole number replaced, no mid-number split', ()=>{
  const {inlineDiffB}=ctx;
  const out=inlineDiffB('The fee is $486,000.','The fee is $528,000.',[],[]);
  assert.equal(out,'The fee is $<del>486,000</del><ins>528,000</ins>.');
});

test('T2 date replacement: clean September/October pair', ()=>{
  const {inlineDiffB}=ctx;
  const out=inlineDiffB('September 1, 2026','October 1, 2026',[],[]);
  assert.equal(out,'<del>September</del><ins>October</ins> 1, 2026');
});

test('T3 heading replacement: VERSION A -> VERSION B', ()=>{
  const {inlineDiffB}=ctx;
  assert.equal(inlineDiffB('VERSION A','VERSION B',[],[]),'VERSION <del>A</del><ins>B</ins>');
});

test('T6 table-cell numbers: two-digit values replaced whole', ()=>{
  const {inlineDiffB}=ctx;
  assert.equal(inlineDiffB('42 MW','45 MW',[],[]),'<del>42</del><ins>45</ins> MW');
  assert.equal(inlineDiffB('19','22',[],[]),'<del>19</del><ins>22</ins>');
});

test('T7 dense rewrite coalesces into ONE del phrase + ONE ins phrase', ()=>{
  const {inlineDiffB}=ctx;
  const o='Targets are operational objectives and do not constitute guaranteed availability.';
  const n='Targets are binding contractual commitments subject to the exclusions expressly stated.';
  const out=inlineDiffB(o,n,[],[]);
  assert.equal((out.match(/<del>/g)||[]).length,1,'one <del>: '+out);
  assert.equal((out.match(/<ins>/g)||[]).length,1,'one <ins>: '+out);
  assert.match(out,/<del>operational objectives and do not constitute guaranteed availability<\/del>/);
  assert.match(out,/<ins>binding contractual commitments subject to the exclusions expressly stated<\/ins>/);
  assert.match(out,/^Targets are /);
});

test('single word pair is NOT coalesced with neighbours across real words', ()=>{
  const {inlineDiffB}=ctx;
  assert.equal(inlineDiffB('Within 2 business days','Within 1 business day',[],[]),
    'Within <del>2</del><ins>1</ins> business <del>days</del><ins>day</ins>');
});

test('adjacent same-type fragments share one wrapper (no <ins> </ins> islands)', ()=>{
  const {inlineDiffB}=ctx;
  const out=inlineDiffB('Review Status: Draft','Review Status: Revised Draft',[],[]);
  assert.equal(out,'Review Status: <ins>Revised </ins>Draft');
  assert.doesNotMatch(out,/<ins>\s*<\/ins>/);
});

test('T9 bold formatting survives inside del/ins', ()=>{
  const {inlineDiffB}=ctx;
  const out=inlineDiffB('X old Y','X new Y',[[2,5]],[[2,5]]);
  assert.equal(out,'X <del><b>old</b></del><ins><b>new</b></ins> Y');
});

test('T8 whitespace edges: changes at start, end, before punctuation', ()=>{
  const {inlineDiffB}=ctx;
  assert.equal(inlineDiffB('Alpha beta gamma.','Zeta beta gamma.',[],[]),
    '<del>Alpha</del><ins>Zeta</ins> beta gamma.');
  assert.equal(inlineDiffB('Alpha beta gamma.','Alpha beta delta.',[],[]),
    'Alpha beta <del>gamma</del><ins>delta</ins>.');
  assert.equal(inlineDiffB('One two.','One two three.',[],[]),
    'One two<ins> three</ins>.');
});

test('T4/T5 added and deleted sentences stay whole single-type rows', ()=>{
  const {compare}=ctx;
  const P=t=>({text:t,boldRuns:[]});
  const {rows}=compare([P('Common ground.')],[P('Common ground.'),P('An entirely new sentence.')],{});
  const ins=rows.find(r=>r.type==='inserted');
  assert.equal(ins.html,'<ins>An entirely new sentence.</ins>');
  const {rows:rows2}=compare([P('Common ground.'),P('A removed sentence.')],[P('Common ground.')],{});
  const del=rows2.find(r=>r.type==='deleted');
  assert.equal(del.html,'<del>A removed sentence.</del>');
});
