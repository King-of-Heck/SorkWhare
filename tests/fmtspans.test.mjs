import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './load.mjs';
const ctx=loadApp();
const {extractStructured}=ctx;
const NUM={numToAbs:{},abs:{},styleToNum:{}};
const DEF={fontPt:11,font:'Calibri',spacing:null};
const doc=b=>'<w:document><w:body>'+b+'</w:body></w:document>';
const run=(t,rpr)=>'<w:r>'+(rpr?'<w:rPr>'+rpr+'</w:rPr>':'')+'<w:t xml:space="preserve">'+t+'</w:t></w:r>';
const para=runs=>'<w:p>'+runs+'</w:p>';
const J=v=>JSON.parse(JSON.stringify(v));

test('fmtSpans: plain run inherits document default font/size, no b/i/u', ()=>{
  const out=extractStructured(doc(para(run('hello',''))),{},NUM,DEF);
  assert.equal(out[0].text,'hello');
  assert.deepEqual(J(out[0].fmtSpans),[{s:0,e:5,b:false,i:false,u:false,f:'Calibri',z:11}]);
});

test('fmtSpans: italic + underline + font + size captured per run; spans split at run boundary', ()=>{
  const rpr='<w:i/><w:u w:val="single"/><w:rFonts w:ascii="Arial"/><w:sz w:val="28"/>';
  const out=extractStructured(doc(para(run('one ','')+run('two',rpr))),{},NUM,DEF);
  assert.equal(out[0].text,'one two');
  const fs=J(out[0].fmtSpans);
  assert.deepEqual(fs[0],{s:0,e:4,b:false,i:false,u:false,f:'Calibri',z:11});
  assert.deepEqual(fs[fs.length-1],{s:4,e:7,b:false,i:true,u:true,f:'Arial',z:14});
});

test('fmtSpans: bold still captured (parity with boldRuns) and text/boldRuns unchanged', ()=>{
  const out=extractStructured(doc(para(run('x ','')+run('bold','<w:b/>'))),{},NUM,DEF);
  assert.equal(out[0].text,'x bold');
  assert.deepEqual(J(out[0].boldRuns),[[2,6]]);
  const last=J(out[0].fmtSpans).at(-1);
  assert.equal(last.b,true);
});

test('fmtSpans: underline detection is order-tolerant and bare <w:u/> means underlined', ()=>{
  const bare=extractStructured(doc(para(run('x ','')+run('u',' <w:u/>'))),{},NUM,DEF);
  assert.equal(J(bare[0].fmtSpans).at(-1).u,true);

  const none=extractStructured(doc(para(run('x ','')+run('u','<w:u w:val="none"/>'))),{},NUM,DEF);
  assert.equal(J(none[0].fmtSpans).at(-1).u,false);

  const reordered=extractStructured(doc(para(run('x ','')+run('u','<w:u w:color="FF0000" w:val="single"/>'))),{},NUM,DEF);
  assert.equal(J(reordered[0].fmtSpans).at(-1).u,true);
});
