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

/* ---- C3: number / date / money tokens replace whole ---- */
// PARITY: MATCH — documented tokenization (NOTES.md: tok() groups numbers with
// internal ,.-/: as one token) — money and date figures replace as whole tokens,
// no mid-number split (ledger: C3).
test('C3 [PARITY M] money + date edits replace whole tokens, no mid-number split', ()=>{
  const out=inlineDiffB('Fee $486,000 due September 1, 2026.','Fee $528,000 due October 1, 2026.',[],[]);
  assert.equal(out,'Fee $<del>486,000</del><ins>528,000</ins> due <del>September</del><ins>October</ins> 1, 2026.');
});
// PARITY: MATCH — same token-grouping invariant applied to percentage/unit figures
// (ledger: C3).
test('C3 [PARITY M] percentage and unit values replace whole', ()=>{
  const out=inlineDiffB('uptime 99.1% at 42 MW','uptime 99.5% at 45 MW',[],[]);
  assert.equal(out,'uptime <del>99.1</del><ins>99.5</ins>% at <del>42</del><ins>45</ins> MW');
});

/* ---- C4: dense-rewrite coalescing vs over-collapse ---- */
// PARITY: DIVERGE (ledger: C4) — brief predicted full coalescing to one del + one ins
// phrase, but the shared word "of" survives unchanged at the same position in both
// strings, so the LCS anchors on it and the diff naturally splits into two separate
// replace pairs around it. _coalesce only merges RUNS separated by whitespace-only
// gaps; "of" is a real (non-whitespace) equal token, so it is not a coalescing
// candidate — this is correct behavior, not a defect. Actual output asserted verbatim.
test('C4 [PARITY M] dense clause rewrite splits into two replace pairs around the shared word "of"', ()=>{
  const o='Payment is due within thirty days of invoice receipt.';
  const n='Payment is due upon completion of the accepted milestone deliverables.';
  const out=inlineDiffB(o,n,[],[]);
  assert.equal(out,'Payment is due <del>within thirty days</del><ins>upon completion</ins> of <del>invoice receipt</del><ins>the accepted milestone deliverables</ins>.');
  assert.equal((out.match(/<del>/g)||[]).length,2,'two del phrases (split around "of"): '+out);
  assert.equal((out.match(/<ins>/g)||[]).length,2,'two ins phrases (split around "of"): '+out);
  assert.match(out,/^Payment is due /);
});
// PARITY: MATCH — v1.3.1 B3 fix: _coalesce counts maximal same-mode RUNS, not raw
// segments; a bold flip inside a one-phrase replace splits inlineDiffB's internal
// segments but must NOT spuriously collapse/fragment the del+ins pair (ledger: C4/B3).
test('C4 [CORRECTNESS B3] one-phrase replace containing a bold word is not over-collapsed', ()=>{
  // bold flip splits the phrase into 2 same-mode segments; must stay a single contiguous del+ins
  const out=inlineDiffB('the old term here','the new item here',[[4,7]],[[4,7]]);
  assert.equal((out.match(/<del>/g)||[]).length,1,out);
  assert.equal((out.match(/<ins>/g)||[]).length,1,out);
  assert.match(out,/^the <del>[\s\S]*<\/del><ins>[\s\S]*<\/ins> here$/);
});
