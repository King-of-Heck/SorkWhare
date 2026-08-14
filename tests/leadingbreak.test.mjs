import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './load.mjs';
const ctx=loadApp();
const M=(extra)=>Object.assign({text:'x',heading:null,isNumbered:false,marker:'',ilvl:0,
  isBold:false,pageBreakBefore:false,align:'left',indLeftPt:0,indHangingPt:0,indFirstLinePt:0,
  boldRuns:[],styleId:null,spaceBeforePt:null,spaceAfterPt:null,lineSpacing:null,
  lineExactPt:null,lineRule:null,keepNext:false,keepLines:false,contextualSpacing:false},extra||{});

test('C7: first paragraph carries no forced break; page break lands only where authored', ()=>{
  const {bodyRowsHtml}=ctx;
  const rows=[
    {type:'equal',ni:0,meta:M({}),html:'first'},
    {type:'inserted',ni:1,meta:M({pageBreakBefore:true}),html:'second'},
  ];
  const html=bodyRowsHtml(rows);
  // The FIRST paragraph must never carry .pgbreak (that would open a blank leading page).
  const firstParaClass=(html.match(/class="para[^"]*"/)||[''])[0];
  assert.doesNotMatch(firstParaClass,/pgbreak/,'first paragraph must not force a break');
  // The authored break on paragraph 2 is still represented.
  assert.match(html,/pgbreak/,'the authored page break is present on a later paragraph');
});
