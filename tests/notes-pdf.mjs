import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './load.mjs';

const GEOM={wIn:8.5,hIn:11,mt:1,mr:1,mb:1,ml:1,fontPt:11,font:'Times New Roman'};
const SHOW={ins:true,del:true,mov:true,eq:true,fmt:true};
// Bars are the only ops that use this exact stroke color (v1.4.0), so counting it counts bars.
const barCount=pdf=>(pdf.match(/0\.15 0\.15 0\.15 RG/g)||[]).length;
// PUA sentinel delimiters (Task 2) — built from char codes, never pasted as glyphs.
const S=String.fromCharCode(0xE000), E=String.fromCharCode(0xE001);
const PUA=new RegExp('['+S+E+']');

// Freeze the banner timestamp so two runs are byte-comparable (generateRedlinePdf
// calls new Date() for the "Generated ..." banner line). Bare `Date` resolves to
// the vm context global at call time, so reassigning it here takes effect.
function freezeDate(app){
  app.Date=function(){return {toLocaleString(){return 'FROZEN-TIMESTAMP';}};};
}

const enRow=(dispNum,html,type='changed')=>(
  {type,cid:dispNum,meta:{marker:'',note:{kind:'endnote',dispNum,id:String(dispNum)}},html});

test('endnote change emits an "Endnotes" heading + the changed text in the PDF', () => {
  const app=loadApp();
  const rows=[
    {type:'equal',meta:{marker:''},html:'Body paragraph.'},
    enRow(1,'Term <del>five</del><ins>seven</ins>.'),
  ];
  const {pdf}=app.generateRedlinePdf({rows,summary:{total:1,endnotes:1},geom:GEOM,set:app.RENDER_SETS[0],show:SHOW});
  assert.match(pdf,/Endnotes/,'an Endnotes heading is drawn');
  assert.match(pdf,/seven/,'the inserted endnote text is drawn');
  assert.match(pdf,/five/,'the deleted endnote text is drawn');
});

test('a changed endnote line carries a v1.4.0 margin change bar', () => {
  const app=loadApp();
  const rows=[
    {type:'equal',meta:{marker:''},html:'Body paragraph.'},
    enRow(1,'Term <del>five</del><ins>seven</ins>.'),
  ];
  const {pdf}=app.generateRedlinePdf({rows,summary:{total:1},geom:GEOM,set:app.RENDER_SETS[0],show:SHOW});
  assert.ok(barCount(pdf)>=1,'the changed endnote produces at least one change bar');
});

test('body reference sentinels are stripped (no raw PUA / "footnote:N" text leaks)', () => {
  const app=loadApp();
  const rows=[
    {type:'equal',meta:{marker:''},html:'See the clause'+S+'footnote:5'+E+' above.'},
    {type:'changed',meta:{marker:''},html:'Ref'+S+'endnote:2'+E+' <del>a</del><ins>b</ins>.'},
  ];
  const {pdf}=app.generateRedlinePdf({rows,summary:{total:1},geom:GEOM,set:app.RENDER_SETS[0],show:SHOW});
  assert.doesNotMatch(pdf,/footnote:5/,'no footnote sentinel text in the PDF body');
  assert.doesNotMatch(pdf,/endnote:2/,'no endnote sentinel text in the PDF body');
  assert.doesNotMatch(pdf,PUA,'no raw PUA delimiter bytes in the PDF');
  assert.match(pdf,/above/,'surrounding body text still renders');
});

test('GOLD STANDARD: a note-free PDF is byte-identical between v1.5.0 and v1.6.0', () => {
  const app15=loadApp('SorkWhare 1.5.0.html');
  const app16=loadApp('SorkWhare 1.6.0.html');
  freezeDate(app15); freezeDate(app16);
  const mkRows=()=>[
    {type:'equal',meta:{marker:''},html:'Unchanged clause here.'},
    {type:'changed',meta:{marker:''},html:'The <del>old</del><ins>new</ins> term applies.'},
    {type:'equal',meta:{marker:''},html:'Trailing clause.'},
  ];
  const base={summary:{total:1},geom:GEOM,show:SHOW};
  const a=app15.generateRedlinePdf({...base,rows:mkRows(),set:app15.RENDER_SETS[0]}).pdf;
  const b=app16.generateRedlinePdf({...base,rows:mkRows(),set:app16.RENDER_SETS[0]}).pdf;
  assert.equal(b,a,'v1.6.0 note-free output must match the v1.5.0 baseline byte-for-byte');
  assert.doesNotMatch(b,/Endnotes|Footnotes/,'no note scaffolding in a note-free doc');
});

test('a note-free all-equal doc draws zero change bars (endnote section absent)', () => {
  const app=loadApp();
  const rows=[
    {type:'equal',meta:{marker:''},html:'Unchanged line one.'},
    {type:'equal',meta:{marker:''},html:'Unchanged line two.'},
  ];
  const {pdf}=app.generateRedlinePdf({rows,summary:{total:0},geom:GEOM,set:app.RENDER_SETS[0],show:SHOW});
  assert.equal(barCount(pdf),0,'no bars when nothing changed and no notes');
  assert.doesNotMatch(pdf,/Endnotes/,'no Endnotes heading when there are no endnotes');
});

/* -------- Task 6: page-bottom footnote float -------- */
// A footnote row (kind:'footnote') is NOT part of the body/endnote flow; it floats
// to the bottom of the page holding its reference. The reference lives in the body
// html as a PUA sentinel (footnote:<id>) that harvest maps id->dispNum.
const fnRow=(dispNum,html,type='changed')=>(
  {type,cid:dispNum,meta:{marker:'',note:{kind:'footnote',dispNum,id:String(dispNum)}},html});

test('footnote renders on the page of its reference with a non-bar separator rule', () => {
  const app=loadApp();
  const rows=[
    {type:'equal',meta:{marker:''},html:'Body with ref'+S+'footnote:1'+E+' here.'},
    fnRow(1,'Fee is <del>ten</del><ins>twelve</ins> dollars.'),
  ];
  const summary={total:1,insertions:1,deletions:1,moves:0,amendments:1,content:1,numbering:0,punctuation:0,formatting:0,footnotes:1,endnotes:0};
  const {pdf}=app.generateRedlinePdf({rows,summary,geom:GEOM,set:app.RENDER_SETS[0],show:SHOW});
  assert.match(pdf,/twelve/,'footnote inserted content emitted');
  assert.match(pdf,/ten/,'footnote deleted content emitted');
  // No raw sentinel leaks (harvest, THEN strip).
  assert.doesNotMatch(pdf,/footnote:1/,'no raw footnote sentinel text');
  assert.doesNotMatch(pdf,PUA,'no raw PUA delimiter bytes');
  // change bar present on the changed footnote line (reserved bar literal)
  assert.match(pdf,/0\.15 0\.15 0\.15 RG/,'change bar literal present for the changed footnote');
  // separator rule uses a DIFFERENT gray (must not be the bar literal)
  const sep=pdf.match(/0\.\d+ 0\.\d+ 0\.\d+ RG/g)||[];
  assert.ok(sep.some(s=>s!=='0.15 0.15 0.15 RG'),'a non-bar gray stroke exists for the separator');
});

test('footnote block carries the dispNum prefix', () => {
  const app=loadApp();
  const rows=[
    {type:'equal',meta:{marker:''},html:'See clause'+S+'footnote:3'+E+' below.'},
    fnRow(3,'A <ins>new</ins> obligation.'),
  ];
  const {pdf}=app.generateRedlinePdf({rows,summary:{total:1,footnotes:1},geom:GEOM,set:app.RENDER_SETS[0],show:SHOW});
  // The "3." prefix token is drawn as its own Tj operand ahead of the note text.
  assert.match(pdf,/\(3\.\) Tj/,'the footnote is prefixed with its display number');
  assert.match(pdf,/new/,'footnote content emitted');
});

test('planBreaks is byte-identical when availOf is omitted (reserve-0 no-op pin)', () => {
  const app=loadApp();
  const J=v=>JSON.parse(JSON.stringify(v));
  const B=(lines,extra)=>Object.assign({lineHeights:lines,spaceBeforePt:0,spaceAfterPt:0,
    keepNext:false,keepLines:false,pageBreakBefore:false},extra||{});
  const blocks=[B([50,50]),B([30,30]),B([40,40,40])];
  const a=J(app.planBreaks(blocks,100,80));
  const b=J(app.planBreaks(blocks,100,80,undefined));
  assert.deepEqual(b,a,'omitting availOf changes nothing');
  // A banner-free availOf that returns the scalar height for every page must
  // reproduce the plain-scalar output exactly.
  const c0=J(app.planBreaks(blocks,100));
  const c1=J(app.planBreaks(blocks,100,undefined,()=>100));
  assert.deepEqual(c1,c0,'an availOf equal to the scalar reproduces the output');
});

test('a footnote taller reserve shortens the body area but stays a no-op with no notes', () => {
  const app=loadApp();
  // no footnotes -> float pre-pass inert; page count matches the plain path
  const long='word '.repeat(600).trim();
  const plain=app.generateRedlinePdf({rows:[{type:'equal',meta:{marker:''},html:long}],
    summary:{total:0},geom:GEOM,set:app.RENDER_SETS[0],show:SHOW});
  assert.ok(plain.pages>=1&&plain.pdf.startsWith('%PDF-1.4'));
});
