import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './load.mjs';
const ctx=loadApp();
const M=(extra)=>Object.assign({text:'x',heading:null,isNumbered:false,marker:'',ilvl:0,
  isBold:false,pageBreakBefore:false,align:'left',indLeftPt:0,indHangingPt:0,indFirstLinePt:0,
  boldRuns:[],styleId:null,spaceBeforePt:null,spaceAfterPt:null,lineSpacing:null,
  lineExactPt:null,lineRule:null,keepNext:false,keepLines:false,contextualSpacing:false},extra||{});

test('paraHtml: real spacing becomes inline margins and line-height', ()=>{
  const {paraHtml}=ctx;
  const h=paraHtml({type:'equal',meta:M({spaceBeforePt:12,spaceAfterPt:6,lineSpacing:2}),html:'x'},false);
  assert.match(h,/margin-top:16(\.0)?px/);      // 12pt * 4/3
  assert.match(h,/margin-bottom:8(\.0)?px/);    // 6pt * 4/3
  assert.match(h,/line-height:2\.3/);           // 1.15 * 2
});

test('paraHtml: exact line rule -> px line-height; absent spacing -> no inline overrides', ()=>{
  const {paraHtml}=ctx;
  const h1=paraHtml({type:'equal',meta:M({lineExactPt:24,lineRule:'exact'}),html:'x'},false);
  assert.match(h1,/line-height:32(\.0)?px/);
  const h2=paraHtml({type:'equal',meta:M({}),html:'x'},false);
  assert.doesNotMatch(h2,/margin-top:/); assert.doesNotMatch(h2,/margin-bottom:/);
  assert.doesNotMatch(h2,/line-height:/);
});

test('paraHtml: contextualSpacing suppresses gaps between same-style neighbours', ()=>{
  const {paraHtml}=ctx;
  const m=M({styleId:'LP',contextualSpacing:true,spaceBeforePt:12,spaceAfterPt:12});
  const same=M({styleId:'LP'}), other=M({styleId:'Q'});
  const h=paraHtml({type:'equal',meta:m,html:'x'},false,same,same);
  assert.doesNotMatch(h,/margin-top:/); assert.doesNotMatch(h,/margin-bottom:/);
  const h2=paraHtml({type:'equal',meta:m,html:'x'},false,other,other);
  assert.match(h2,/margin-top:16(\.0)?px/);
});

test('paraHtml: keepnext class on keepNext paras and headings', ()=>{
  const {paraHtml}=ctx;
  assert.match(paraHtml({type:'equal',meta:M({keepNext:true}),html:'x'},false),/class="para equal keepnext/);
  assert.match(paraHtml({type:'equal',meta:M({heading:2}),html:'x'},false),/keepnext/);
});

test('print CSS: orphans/widows + break-after:avoid present', ()=>{
  const {__html:h}=loadApp();
  assert.match(h,/\.para\{[^}]*orphans:2;widows:2/);
  assert.match(h,/keepnext[^}]*\{[^}]*break-after:avoid-page/);
});

test('renderAll passes neighbour metas (source check)', ()=>{
  const {__html:h}=loadApp();
  assert.match(h,/paraHtml\(r,brk,pm,nm\)/);
});

test('#paper is a flex column so real margins add instead of collapsing', ()=>{
  const {__html:h}=loadApp();
  assert.match(h,/#paper\{[^}]*display:flex;flex-direction:column/);
});
