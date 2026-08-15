import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './load.mjs';
const ctx=loadApp();
const {generateRedlinePdf,pdfStyle,RENDER_SETS}=ctx;
const GEOM={wIn:8.5,hIn:11,mt:1,mr:1,mb:1,ml:1,fontPt:11,font:'Times New Roman'};
const SHOW={ins:true,del:true,mov:true,eq:true,fmt:true};
const LITERA=RENDER_SETS.find(s=>s.id==='litera');
const count=(pdf,re)=>(pdf.match(re)||[]).length;

// The additive guarantee: four args behaves exactly as v1.4.1 did.
test('pdfStyle without a set reproduces the v1.4.1 literals', ()=>{
  assert.equal(pdfStyle({},'ins',11).color,'0.043 0.361 0.678');
  assert.equal(pdfStyle({},'del',11).color,'0.702 0.149 0.118');
  assert.equal(pdfStyle({},'moved',11).color,'0.106 0.498 0.231');
  assert.equal(pdfStyle({},'moved-src',11).color,'0.106 0.498 0.231');
  assert.equal(pdfStyle({},'fmt',11).color,'0.486 0.227 0.929');
});

test('pdfStyle without a set keeps the v1.4.1 decoration flags', ()=>{
  assert.deepEqual(pick(pdfStyle({},'ins',11)),{underline:true,strike:false,doubleU:false});
  assert.deepEqual(pick(pdfStyle({},'del',11)),{underline:false,strike:true,doubleU:false});
  assert.deepEqual(pick(pdfStyle({},'moved',11)),{underline:true,strike:false,doubleU:false});
  assert.deepEqual(pick(pdfStyle({},'moved-src',11)),{underline:false,strike:true,doubleU:false});
  assert.deepEqual(pick(pdfStyle({},'fmt',11)),{underline:true,strike:false,doubleU:false});
  function pick(st){return {underline:st.underline,strike:st.strike,doubleU:st.doubleU};}
});

test('an equal run is black in every set', ()=>{
  assert.equal(pdfStyle({},'eq',11).color,'0 0 0');
  assert.equal(pdfStyle({},'eq',11,false,LITERA).color,'0 0 0');
});

test('Litera Classic reaches pdfStyle: blue double-underlined insertions', ()=>{
  const st=pdfStyle({},'ins',11,false,LITERA);
  assert.equal(st.color,'0.000 0.000 1.000');
  assert.equal(st.underline,true);
  assert.equal(st.doubleU,true);
  assert.equal(st.strike,false);
});

test('Litera Classic moved-source is struck, not doubled', ()=>{
  const st=pdfStyle({},'moved-src',11,false,LITERA);
  assert.equal(st.color,'0.000 0.502 0.000');
  assert.equal(st.strike,true);
  assert.equal(st.doubleU,false);
});

test('a double-underlined run strokes two rules, a single-underlined run one', ()=>{
  const rows=[{type:'changed',html:'Text <ins>added</ins> here',meta:{marker:''}}];
  const def=generateRedlinePdf({rows,geom:GEOM,show:SHOW,summary:{total:1},set:RENDER_SETS[0]});
  const lit=generateRedlinePdf({rows,geom:GEOM,show:SHOW,summary:{total:1},set:LITERA});
  assert.equal(count(def.pdf,/0\.043 0\.361 0\.678 RG/g),1,'default: one underline rule');
  assert.equal(count(lit.pdf,/0\.000 0\.000 1\.000 RG/g),2,'litera: two rules for a double underline');
});

test('the chosen set colors the PDF text operators', ()=>{
  const rows=[{type:'changed',html:'Text <del>cut</del> here',meta:{marker:''}}];
  const lit=generateRedlinePdf({rows,geom:GEOM,show:SHOW,summary:{total:1},set:LITERA});
  assert.match(lit.pdf,/1\.000 0\.000 0\.000 rg/,'litera deletions are pure red');
  assert.doesNotMatch(lit.pdf,/0\.702 0\.149 0\.118 rg/,'no default-set red survives');
});

test('the default set exports exactly what v1.4.1 exported', ()=>{
  const rows=[{type:'changed',html:'Text <del>cut</del><ins>new</ins> here',meta:{marker:''}}];
  const a=generateRedlinePdf({rows,geom:GEOM,show:SHOW,summary:{total:1}}).pdf;
  const b=generateRedlinePdf({rows,geom:GEOM,show:SHOW,summary:{total:1},set:RENDER_SETS[0]}).pdf;
  assert.equal(a,b,'omitting set === passing the default set');
});

// The margin revision bar is single near-black in EVERY set (v1.4.0 invariant).
test('the change bar color is set-independent', ()=>{
  const rows=[{type:'changed',html:'Text <ins>added</ins> here',meta:{marker:''}}];
  for(const s of RENDER_SETS){
    const r=generateRedlinePdf({rows,geom:GEOM,show:SHOW,summary:{total:1},set:s});
    assert.equal(count(r.pdf,/0\.15 0\.15 0\.15 RG/g),1,s.id+' bar');
  }
});

// End-to-end pin for `activeSet`, which the vm harness cannot read directly:
// picking a set on screen must change what an unparameterized export produces.
// MUST run last, and restores the default so test order stays irrelevant.
test('an export with no explicit set honors the last applied set', ()=>{
  const rows=[{type:'changed',html:'Text <ins>added</ins> here',meta:{marker:''}}];
  try{
    ctx.applyRenderSet('litera',{setProperty(){}});
    const r=generateRedlinePdf({rows,geom:GEOM,show:SHOW,summary:{total:1}});
    assert.match(r.pdf,/0\.000 0\.000 1\.000 rg/,'litera blue reached the export');
  } finally {
    ctx.applyRenderSet('sorkwhare',{setProperty(){}});
  }
});
