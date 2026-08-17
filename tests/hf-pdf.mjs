import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './load.mjs';

const GEOM={wIn:8.5,hIn:11,mt:1,mr:1,mb:1,ml:1,fontPt:11,font:'Times New Roman'};
const SHOW={ins:true,del:true,mov:true,eq:true,fmt:true};
const barCount=pdf=>(pdf.match(/0\.15 0\.15 0\.15 RG/g)||[]).length;
const hfRow=(kind,type,html,cid,t='changed')=>({type:t,cid,meta:{marker:'',hf:{kind,type}},html});
function freezeDate(app){ app.Date=function(){return {toLocaleString(){return 'FROZEN';}};}; }

test('a header change emits a "Headers" heading + the changed text', () => {
  const app=loadApp();
  const rows=[{type:'equal',meta:{marker:''},html:'Body.'},
    hfRow('header','default','CONFIDENTIAL <del>v1</del><ins>v2</ins>',1)];
  const {pdf}=app.generateRedlinePdf({rows,summary:{total:1,headers:1},geom:GEOM,set:app.RENDER_SETS[0],show:SHOW});
  assert.match(pdf,/Headers/,'a Headers heading is drawn');
  assert.match(pdf,/CONFIDENTIAL/);
  assert.match(pdf,/v2/); assert.match(pdf,/v1/);
});

test('a changed footer line carries a v1.4.0 margin change bar', () => {
  const app=loadApp();
  const rows=[{type:'equal',meta:{marker:''},html:'Body.'},
    hfRow('footer','default','Rev <del>A</del><ins>B</ins>',1)];
  const {pdf}=app.generateRedlinePdf({rows,summary:{total:1},geom:GEOM,set:app.RENDER_SETS[0],show:SHOW});
  assert.ok(barCount(pdf)>=1,'the changed footer produces at least one change bar');
  assert.match(pdf,/Footers/);
});

test('GOLD: an hf-free PDF is byte-identical between v1.6.0 and v1.7.0', () => {
  const a16=loadApp('SorkWhare 1.6.0.html'), a17=loadApp('SorkWhare 1.7.0.html');
  freezeDate(a16); freezeDate(a17);
  const mkRows=()=>[
    {type:'equal',meta:{marker:''},html:'Unchanged clause here.'},
    {type:'changed',meta:{marker:''},html:'The <del>old</del><ins>new</ins> term applies.'},
    {type:'equal',meta:{marker:''},html:'Trailing clause.'},
  ];
  const base={summary:{total:1},geom:GEOM,show:SHOW};
  const a=a16.generateRedlinePdf({...base,rows:mkRows(),set:a16.RENDER_SETS[0]}).pdf;
  const b=a17.generateRedlinePdf({...base,rows:mkRows(),set:a17.RENDER_SETS[0]}).pdf;
  assert.equal(b,a,'v1.7.0 hf-free output must match v1.6.0 byte-for-byte');
  assert.doesNotMatch(b,/Headers|Footers/,'no header/footer scaffolding in an hf-free doc');
});
