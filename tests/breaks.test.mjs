import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './load.mjs';
const ctx=loadApp();
const J=v=>JSON.parse(JSON.stringify(v));
const B=(lines,extra)=>Object.assign({lineHeights:lines,spaceBeforePt:0,spaceAfterPt:0,
  keepNext:false,keepLines:false,pageBreakBefore:false},extra||{});

test('planBreaks: simple fill and overflow to next page', ()=>{
  const {planBreaks}=ctx;
  const r=J(planBreaks([B([50,50]),B([30,30])],100));
  assert.deepEqual(r,[{b:1,l:0}]);
});

test('planBreaks: orphan control moves whole paragraph', ()=>{
  const {planBreaks}=ctx;
  // 35 left after first block; only 1 line of the 2-line block fits -> move it whole
  const r=J(planBreaks([B([65]),B([30,30])],100));
  assert.deepEqual(r,[{b:1,l:0}]);
});

test('planBreaks: widow control breaks one line earlier', ()=>{
  const {planBreaks}=ctx;
  // 4-line block, first 3 fit; default cut before line 3 leaves a 1-line widow -> cut at 2
  const r=J(planBreaks([B([10]),B([30,30,30,30])],100));
  assert.deepEqual(r,[{b:1,l:2}]);
});

test('planBreaks: keepLines keeps a fitting block whole', ()=>{
  const {planBreaks}=ctx;
  const r=J(planBreaks([B([30]),B([20,20,20,20],{keepLines:true})],100));
  assert.deepEqual(r,[{b:1,l:0}]);
});

test('planBreaks: keepNext pulls heading onto the next page with its body', ()=>{
  const {planBreaks}=ctx;
  // heading fits at page bottom but body's first 2 lines do not -> break BEFORE heading
  const r=J(planBreaks([B([70]),B([15],{keepNext:true}),B([30,30])],100));
  assert.deepEqual(r,[{b:1,l:0}]);
});

test('planBreaks: explicit pageBreakBefore honoured, ignored at page top', ()=>{
  const {planBreaks}=ctx;
  const r=J(planBreaks([B([10],{pageBreakBefore:true}),B([10],{pageBreakBefore:true})],100));
  assert.deepEqual(r,[{b:1,l:0}]);
});

test('planBreaks: spaceBefore ignored at page top, counted mid-page', ()=>{
  const {planBreaks}=ctx;
  // block1 40; block2 spaceBefore 30 + first-2-commit 40 = 70 > 60 free -> new page
  const r=J(planBreaks([B([40]),B([20,20],{spaceBeforePt:30})],100));
  assert.deepEqual(r,[{b:1,l:0}]);
});

test('planBreaks: line taller than a page forces progress (no infinite loop)', ()=>{
  const {planBreaks}=ctx;
  const r=J(planBreaks([B([150,30,30])],100));
  assert.deepEqual(r,[{b:0,l:1}]);
});

test('planBreaks: firstAvail (banner page) smaller than later pages', ()=>{
  const {planBreaks}=ctx;
  const r=J(planBreaks([B([30,30]),B([30,30])],120,50));
  // page1 (50pt) fits only 1 of block0's 2 lines -> orphan rule moves block0 whole to page 2;
  // block1's 60pt then fits exactly in the remaining space of page 2
  assert.deepEqual(r,[{b:0,l:0}]);
});

test('planBreaks: 2-line minimum physically impossible on any page -> splits anyway (terminates)', ()=>{
  const {planBreaks}=ctx;
  const r=J(planBreaks([B([60,60])],100));
  assert.deepEqual(r,[{b:0,l:1}]);
});
