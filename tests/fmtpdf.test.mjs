import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './load.mjs';
const ctx=loadApp();
const {generateRedlinePdf}=ctx;
const GEOM={wIn:8.5,hIn:11,mt:1,mr:1,mb:1,ml:1,fontPt:11,font:'Times New Roman'};
const row=(html,extra={})=>({type:'equal',fmtChanged:true,html,meta:{marker:''},...extra});

test('PDF: fmtChanged row draws the inline note when show.fmt is on', ()=>{
  const rows=[row('Clause <span class="fmtchg" title="bold added"><b>text</b></span> here',{fmtDescs:['bold added']})];
  const r=generateRedlinePdf({rows,geom:GEOM,show:{ins:true,del:true,mov:true,eq:true,fmt:true},summary:{total:0,formatting:1}});
  assert.ok(r.pdf.startsWith('%PDF-1.4'));
  assert.ok(r.pdf.includes('[formatting: bold added]'),'inline note drawn');
});

test('PDF: show.fmt off suppresses the note (clean export)', ()=>{
  const rows=[row('Clause <span class="fmtchg" title="bold added"><b>text</b></span> here',{fmtDescs:['bold added']})];
  const r=generateRedlinePdf({rows,geom:GEOM,show:{ins:true,del:true,mov:true,eq:true,fmt:false},summary:{total:0,formatting:1}});
  assert.doesNotMatch(r.pdf,/formatting: bold added/,'note omitted when formatting hidden');
});
