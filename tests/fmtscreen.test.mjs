import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './load.mjs';
const ctx=loadApp();
const html=ctx.__html;

test('screen: --fmt color, .fmtchg style, and hide-fmt rule present', ()=>{
  assert.match(html,/--fmt\s*:/,'--fmt CSS variable defined');
  assert.match(html,/\.fmtchg\{border-bottom:2px var\(--fmt-style\) var\(--fmt\)/,'.fmtchg border driven by --fmt-style/--fmt');
  assert.match(html,/--fmt-style:dotted/,'formatting mark is dotted by default');
  assert.match(html,/\.hide-fmt\s+\.fmtchg/,'hide-fmt neutralizes the mark');
});

test('screen: Formatting SHOW checkbox + listener wired', ()=>{
  assert.match(html,/id="fFmt"[^>]*checked/,'fFmt checkbox present and default-checked');
  assert.match(html,/hide-fmt/,'applyFilters toggles hide-fmt');
  assert.match(html,/'fFmt'|"fFmt"/,'fFmt in the listener list');
});

test('paraHtml: a fmtChanged equal row gets the fmtchanged class', ()=>{
  const {paraHtml}=ctx;
  const row={type:'equal',fmtChanged:true,meta:{},html:'x<span class="fmtchg" title="bold added">y</span>'};
  const out=paraHtml(row,false,null,null);
  assert.match(out,/class="para equal[^"]*fmtchanged/);
  assert.match(out,/class="fmtchg"/);
});

test('summary: Formatting count element present', ()=>{
  assert.match(html,/id="cFmtInfo"/,'formatting count element present');
});
