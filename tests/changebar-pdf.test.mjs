import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './load.mjs';
const ctx=loadApp();
const {generateRedlinePdf}=ctx;
const GEOM={wIn:8.5,hIn:11,mt:1,mr:1,mb:1,ml:1,fontPt:11,font:'Times New Roman'};
const SHOW={ins:true,del:true,mov:true,eq:true,fmt:true};
// Bars are the only ops that use this exact stroke color, so counting it counts bars.
const barCount=pdf=>(pdf.match(/0\.15 0\.15 0\.15 RG/g)||[]).length;

test('PDF: a changed row draws a margin bar', ()=>{
  const rows=[{type:'changed',html:'The <del>old</del><ins>new</ins> text',meta:{marker:''}}];
  const r=generateRedlinePdf({rows,geom:GEOM,show:SHOW,summary:{total:1}});
  assert.ok(barCount(r.pdf)>=1,'at least one bar stroke');
});

test('PDF: identical (all-equal) docs draw no bars', ()=>{
  const rows=[{type:'equal',html:'Unchanged line',meta:{marker:''}},
              {type:'equal',html:'Another line',meta:{marker:''}}];
  const r=generateRedlinePdf({rows,geom:GEOM,show:SHOW,summary:{total:0}});
  assert.equal(barCount(r.pdf),0,'no bars when nothing changed');
});

test('PDF: consecutive changed lines merge into one continuous bar', ()=>{
  const long=('word ').repeat(60).trim(); // wraps to several lines in one paragraph
  const rows=[{type:'changed',html:'<ins>'+long+'</ins>',meta:{marker:''}}];
  const r=generateRedlinePdf({rows,geom:GEOM,show:SHOW,summary:{total:1}});
  assert.equal(barCount(r.pdf),1,'one merged bar for a multi-line changed paragraph');
});

test('PDF: formatting-only bar follows show.fmt', ()=>{
  const rows=[{type:'equal',fmtChanged:true,fmtDescs:['bold added'],
    html:'Clause <span class="fmtchg" title="bold added"><b>text</b></span> here',meta:{marker:''}}];
  const on=generateRedlinePdf({rows,geom:GEOM,show:{...SHOW,fmt:true},summary:{total:0,formatting:1}});
  const off=generateRedlinePdf({rows,geom:GEOM,show:{...SHOW,fmt:false},summary:{total:0,formatting:1}});
  assert.ok(barCount(on.pdf)>=1,'formatting bar present when fmt shown');
  assert.equal(barCount(off.pdf),0,'formatting bar absent when fmt hidden');
});

test('PDF: a changed block spanning a page break draws bars on multiple pages', ()=>{
  const rows=Array.from({length:80},(_,i)=>({type:'changed',html:'Changed line '+i+' <ins>x</ins>',meta:{marker:''}}));
  const r=generateRedlinePdf({rows,geom:GEOM,show:SHOW,summary:{total:80}});
  assert.ok(r.pages>=2,'content spans multiple pages, got '+r.pages);
  assert.ok(barCount(r.pdf)>=2,'bars bucketed onto more than one page, got '+barCount(r.pdf));
});
