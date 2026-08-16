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
