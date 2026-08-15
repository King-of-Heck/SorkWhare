import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './load.mjs';
const ctx=loadApp();
const {fmtDiff}=ctx;
const J=v=>JSON.parse(JSON.stringify(v));
const span=(s,e,o={})=>({s,e,b:false,i:false,u:false,f:'Calibri',z:11,...o});

test('identical formatting → no diff', ()=>{
  assert.deepEqual(J(fmtDiff([span(0,5)],[span(0,5)])),[]);
});
test('bold added over a sub-range', ()=>{
  const a=[span(0,7)];
  const b=[span(0,4),span(4,7,{b:true})];
  assert.deepEqual(J(fmtDiff(a,b)),[{s:4,e:7,desc:'bold added'}]);
});
test('italic removed', ()=>{
  assert.deepEqual(J(fmtDiff([span(0,3,{i:true})],[span(0,3)])),[{s:0,e:3,desc:'italic removed'}]);
});
test('font and size change reported together', ()=>{
  const a=[span(0,5)];
  const b=[span(0,5,{f:'Arial',z:14})];
  assert.deepEqual(J(fmtDiff(a,b)),[{s:0,e:5,desc:'font Calibri → Arial; size 11 → 14'}]);
});
