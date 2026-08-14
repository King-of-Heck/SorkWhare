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

test('planBreaks: spaceAfter charged for unsplit blocks (deterministic positions)', ()=>{
  const {planBreaks}=ctx;
  // 6 one-line 30pt blocks with 20pt space-after on a 100pt page: each block
  // costs 50pt once its after-gap is charged -> exactly 2 per page.
  const r=J(planBreaks(Array.from({length:6},()=>B([30],{spaceAfterPt:20})),100));
  assert.deepEqual(r,[{b:2,l:0},{b:4,l:0}]);
});

// meta factory for synthetic rows fed straight to generateRedlinePdf via opts
const M=(text,extra)=>Object.assign({text,heading:null,isNumbered:false,marker:'',ilvl:0,
  isBold:false,pageBreakBefore:false,align:'left',indLeftPt:0,indHangingPt:0,indFirstLinePt:0,
  boldRuns:[],styleId:null,spaceBeforePt:null,spaceAfterPt:null,lineSpacing:null,
  lineExactPt:null,lineRule:null,keepNext:false,keepLines:false,contextualSpacing:false},extra||{});
const row=(text,extra)=>({type:'equal',meta:M(text,extra),html:text});
const GEOM={wIn:8.5,hIn:11,mt:1,mr:1,mb:1,ml:1,fontPt:11,font:'Times New Roman'};
const SHOW={ins:true,del:true,mov:true,eq:true};

test('generateRedlinePdf: double spacing halves lines-per-page (more pages)', ()=>{
  const {generateRedlinePdf}=ctx;
  const long='word '.repeat(2000).trim();
  const single=generateRedlinePdf({rows:[row(long)],geom:GEOM,show:SHOW,summary:{total:0}});
  const dbl=generateRedlinePdf({rows:[row(long,{lineSpacing:2})],geom:GEOM,show:SHOW,summary:{total:0}});
  assert.ok(dbl.pages>single.pages,'double spacing must produce more pages ('+dbl.pages+' vs '+single.pages+')');
});

test('generateRedlinePdf: exact line rule drives page count deterministically', ()=>{
  const {generateRedlinePdf}=ctx;
  const long='word '.repeat(2000).trim();
  const a=generateRedlinePdf({rows:[row(long,{lineExactPt:12,lineRule:'exact'})],geom:GEOM,show:SHOW,summary:{total:0}});
  const b=generateRedlinePdf({rows:[row(long,{lineExactPt:24,lineRule:'exact'})],geom:GEOM,show:SHOW,summary:{total:0}});
  assert.ok(b.pages>a.pages);
});

test('generateRedlinePdf: spaceAfter accumulates (many small paras -> more pages)', ()=>{
  const {generateRedlinePdf}=ctx;
  const paras=n=>Array.from({length:80},(_,i)=>row('Paragraph '+i,n?{spaceAfterPt:30}:{}));
  const tight=generateRedlinePdf({rows:paras(false),geom:GEOM,show:SHOW,summary:{total:0}});
  const loose=generateRedlinePdf({rows:paras(true),geom:GEOM,show:SHOW,summary:{total:0}});
  assert.ok(loose.pages>tight.pages);
});

test('generateRedlinePdf: contextualSpacing suppresses same-style gaps', ()=>{
  const {generateRedlinePdf}=ctx;
  const list=ctxOn=>Array.from({length:80},(_,i)=>row('Item '+i,
    {styleId:'ListParagraph',spaceAfterPt:30,contextualSpacing:ctxOn}));
  const on=generateRedlinePdf({rows:list(true),geom:GEOM,show:SHOW,summary:{total:0}});
  const off=generateRedlinePdf({rows:list(false),geom:GEOM,show:SHOW,summary:{total:0}});
  assert.ok(on.pages<off.pages);
});

test('generateRedlinePdf: absent spacing reproduces v1.1.5 defaults (regression pin)', ()=>{
  const {generateRedlinePdf}=ctx;
  const rows=Array.from({length:50},(_,i)=>row('Paragraph '+i+' with some words in it'));
  const r=generateRedlinePdf({rows,geom:GEOM,show:SHOW,summary:{total:0}});
  assert.ok(r.pages>=1&&typeof r.pdf==='string'&&r.pdf.startsWith('%PDF-1.4'));
});

test('generateRedlinePdf: first paragraph spaceBefore suppressed at top of page 1', ()=>{
  const {generateRedlinePdf}=ctx;
  // A huge spaceBefore on the very first row must not consume page-1 space
  // (planBreaks models page tops as suppressing space-before).
  const a=generateRedlinePdf({rows:[row('hello world')],geom:GEOM,show:SHOW,summary:{total:0}});
  const b=generateRedlinePdf({rows:[row('hello world',{spaceBeforePt:100000})],geom:GEOM,show:SHOW,summary:{total:0}});
  assert.equal(b.pages,a.pages);
});

test('generateRedlinePdf: Node fallback path stays base-14 Times (no document.fonts here)', ()=>{
  const {generateRedlinePdf}=ctx;
  const g=Object.assign({},GEOM,{font:'Calibri'});
  const r=generateRedlinePdf({rows:[row('hello world')],geom:g,show:SHOW,summary:{total:0}});
  assert.match(r.pdf,/\/Times-Roman/);
  assert.doesNotMatch(r.pdf,/\/Calibri/);
});

test('generateRedlinePdf: doc-font branch emits TrueType + Widths + Descriptor', ()=>{
  // Simulate a browser: stub document.fonts.check and a Canvas 2d context.
  const ctx2=loadApp();
  ctx2.document.fonts={check:()=>true};
  const fake={font:'',measureText:t=>({width:t.length*7})};
  ctx2.document.createElement=(tag)=>tag==='canvas'
    ?{getContext:()=>fake}
    :{style:{},setAttribute(){},addEventListener(){},appendChild(){},remove(){},click(){},classList:{add(){},remove(){}},dataset:{}};
  const g=Object.assign({},GEOM,{font:'Calibri'});
  const r=ctx2.generateRedlinePdf({rows:[{type:'equal',meta:M('hello world'),html:'hello world'}],
    geom:g,show:SHOW,summary:{total:0}});
  assert.match(r.pdf,/\/Subtype\/TrueType/);
  assert.match(r.pdf,/\/BaseFont\/Calibri\b/);
  assert.match(r.pdf,/\/BaseFont\/Calibri,Bold/);
  assert.match(r.pdf,/\/FontDescriptor/);
  assert.match(r.pdf,/\/Widths\[/);
  assert.match(r.pdf,/\/BaseFont\/Helvetica-Bold/); // banner untouched
});

test('generateRedlinePdf: absent-spacing page count stays close to v1.1.5 (parity pin)', ()=>{
  const ctx115=loadApp('SorkWhare 1.1.5.html');
  const mkRows=()=>Array.from({length:80},(_,i)=>row('Paragraph '+i+' with some words in it'));
  const a=ctx115.generateRedlinePdf({rows:mkRows(),geom:GEOM,show:SHOW,summary:{total:0}});
  const b=ctx.generateRedlinePdf({rows:mkRows(),geom:GEOM,show:SHOW,summary:{total:0}});
  assert.ok(Math.abs(b.pages-a.pages)<=1,'1.2.0 pages='+b.pages+' vs 1.1.5 pages='+a.pages);
});
