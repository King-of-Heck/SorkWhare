import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './load.mjs';
import {makeDocx} from './makedocx.mjs';

const ctx=loadApp();
const {compare,inlineDiffB}=ctx;
const fileOf=buf=>({arrayBuffer:async()=>buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength)});
const doc=body=>'<w:document><w:body>'+body+'</w:body></w:document>';
const para=t=>'<w:p><w:r><w:t xml:space="preserve">'+t+'</w:t></w:r></w:p>';
// Full "feed two files" pipeline: unzip -> extractStructured -> compare.
async function dcompare(bodyA,bodyB,opts={}){
  const A=await ctx.docxToParagraphs(fileOf(makeDocx({'word/document.xml':doc(bodyA)})));
  const B=await ctx.docxToParagraphs(fileOf(makeDocx({'word/document.xml':doc(bodyB)})));
  return compare(A,B,opts);
}

/* ---- C1: substitutions ---- */
// PARITY: MATCH — intra-paragraph word substitutions collapse to one changed row
// with clean del/ins pairs and count as a single numbered change (ledger: C1).
test('C1 [PARITY M] intra-paragraph substitutions surface as one changed row', async()=>{
  const {rows,summary}=await dcompare(
    para('The Company shall deliver the goods by Friday.'),
    para('The Supplier shall deliver the goods by Monday.'));
  const chg=rows.find(r=>r.type==='changed');
  assert.ok(chg,'expected a changed row');
  assert.match(chg.html,/<del>Company<\/del><ins>Supplier<\/ins>/);
  assert.match(chg.html,/<del>Friday<\/del><ins>Monday<\/ins>/);
  assert.equal(summary.total,1,'one edited paragraph = one numbered change');
});

/* ---- C2: whitespace collapse + entity decode invariants ---- */
// PARITY: MATCH — documented invariant (NOTES.md "Engine gotchas"): extractStructured
// collapses all whitespace runs to a single space at extraction time (ledger: C2).
test('C2 [CORRECTNESS] runs of whitespace collapse to a single space at extraction', async()=>{
  const A=await ctx.docxToParagraphs(fileOf(makeDocx({'word/document.xml':doc(para('alpha    beta\tgamma'))})));
  assert.equal(A[0].text,'alpha beta gamma');
});
// PARITY: MATCH — documented invariant: &amp; is decoded last everywhere, so entity
// text yields a single literal ampersand with no double-decode artifacts (ledger: C2).
test('C2 [CORRECTNESS] &amp; decodes to one ampersand (decoded last)', async()=>{
  const A=await ctx.docxToParagraphs(fileOf(makeDocx({'word/document.xml':doc(para('R&amp;D and Q&amp;A'))})));
  assert.equal(A[0].text,'R&D and Q&A');
});
