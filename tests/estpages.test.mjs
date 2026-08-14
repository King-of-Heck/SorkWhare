import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './load.mjs';
const ctx=loadApp();

test('E10: a table taller than a page is split between its rows in the estimate', ()=>{
  const {_estPages}=ctx;
  // page holds 100; a 4-row table of 40pt rows = 160 total -> must span 2 pages, not 1.
  const pages=_estPages([{rows:[40,40,40,40]}],100);
  assert.ok(pages>=2,'tall table splits across pages ('+pages+')');
});

test('E10: atomic blocks and explicit breaks still count correctly', ()=>{
  const {_estPages}=ctx;
  assert.equal(_estPages([{h:60},{h:60}],100),2);          // 120 > 100 -> 2 pages
  assert.equal(_estPages([{h:10},{brk:true},{h:10}],100),2);// explicit break -> 2 pages
  assert.equal(_estPages([{h:10},{h:10}],100),1);          // fits -> 1 page
});
