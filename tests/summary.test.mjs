import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './load.mjs';
const {compare}=loadApp();
const P=t=>({text:t,boldRuns:[],marker:'',ilvl:0,isBold:false,heading:null,
  pageBreakBefore:false,align:'left',indLeftPt:0,indHangingPt:0,indFirstLinePt:0,isNumbered:false});

test('total = unique changes; amendments counted once (#6)', ()=>{
  const orig=['alpha beta gamma delta','clause x stays','THE MOVED PARAGRAPH HAS MANY WORDS HERE','clause y stays','clause z stays','to be deleted entirely x y z'].map(P);
  const rev =['alpha beta gamma echo','clause x stays','clause y stays','clause z stays','THE MOVED PARAGRAPH HAS MANY WORDS HERE','a brand new inserted paragraph q r s'].map(P);
  const {rows,summary}=compare(orig,rev,{ignoreCase:false,moveMin:5});
  // 1 amendment (alpha…), 1 deletion, 1 insertion, 1 move = 4 numbered changes
  assert.equal(summary.amendments,1);
  assert.equal(summary.moves,1);
  assert.equal(summary.total,4);
  const cids=new Set(rows.filter(r=>r.cid).map(r=>r.cid));
  assert.equal(summary.total,cids.size,'Total must equal unique cid count (nav "of N")');
  // component tiles keep old meaning: amendment contributes to both ins and del
  assert.equal(summary.insertions,2); // 1 pure + 1 from amendment
  assert.equal(summary.deletions,2);  // 1 pure + 1 from amendment
});
