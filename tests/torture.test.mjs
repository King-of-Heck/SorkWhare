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
test('C4 [PARITY D] dense clause rewrite splits into two replace pairs around the shared word "of"', ()=>{
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

/* ---- C5: move detection (needs displacement across >=3 equal paras) ---- */
// PARITY: MATCH — a word-rich paragraph (>=moveMin words) relocated across four
// unchanged paragraphs falls out of the paragraph-level LCS and registers as a
// move, per the documented displacement rule (ledger: C5).
test('C5 [PARITY M] a paragraph relocated across four equal paras registers as a move', async()=>{
  const A=['THE RELOCATED CLAUSE WITH PLENTY OF DISTINCT WORDS',
           'clause one stays put here','clause two stays put here',
           'clause three stays put here','clause four stays put here'].map(para).join('');
  const B=['clause one stays put here','clause two stays put here',
           'clause three stays put here','clause four stays put here',
           'THE RELOCATED CLAUSE WITH PLENTY OF DISTINCT WORDS'].map(para).join('');
  const {summary}=await dcompare(A,B,{moveMin:5});
  assert.equal(summary.moves,1);
});
// PARITY: MATCH — documented invariant (NOTES.md "Engine gotchas"): a lone adjacent
// swap is absorbed by the paragraph-level LCS as equal (no displacement across >=3
// unchanged paragraphs), so it must NOT register as a move (ledger: C5).
test('C5 [CORRECTNESS] a lone adjacent swap is absorbed as equal (no false move)', async()=>{
  const A=[para('alpha content one'),para('beta content two')].join('');
  const B=[para('beta content two'),para('alpha content one')].join('');
  const {summary}=await dcompare(A,B,{moveMin:5});
  assert.equal(summary.moves,0);
});

/* ---- C6: split / merged paragraphs ---- */
// PARITY: MATCH — SorkWhare has no dedicated split-paragraph detector (unlike
// Litera's distinct split flag); one paragraph becoming two is diffed at the
// paragraph-LCS level as a delete+insert pair, which still surfaces as at least
// one numbered change (ledger: C6).
test('C6 [PARITY M] one paragraph split into two produces a numbered change', async()=>{
  const A=para('The parties agree to cooperate in good faith and to share information.');
  const B=para('The parties agree to cooperate in good faith.')+para('They shall share information.');
  const {summary}=await dcompare(A,B);
  assert.ok(summary.total>=1,'a split paragraph must produce at least one numbered change');
});

/* ---- C7: tables — ragged tblGrid-less table, changed cell diffs inline ---- */
const {extractStructured,bodyRowsHtml}=ctx;
const NUM0={numToAbs:{},abs:{},styleToNum:{}};
const TC=t=>'<w:tc><w:p><w:r><w:t>'+t+'</w:t></w:r></w:p></w:tc>';
const TBL_NOGRID=rowsArr=>'<w:tbl>'+rowsArr.map(cells=>'<w:tr>'+cells.map(TC).join('')+'</w:tr>').join('')+'</w:tbl>';

// PARITY: MATCH (ledger: C7) — a tblGrid-less ragged table collapses to one table-wide cols (widest row); the changed cell diffs inline.
test('C7 [CORRECTNESS] ragged tblGrid-less table keeps one column count; changed cell diffs inline', ()=>{
  const A=extractStructured(doc(TBL_NOGRID([['Metric','Target','Notes'],['Uptime','99.1%']])),{},NUM0);
  const B=extractStructured(doc(TBL_NOGRID([['Metric','Target','Notes'],['Uptime','99.5%']])),{},NUM0);
  const {rows}=compare(A,B,{});
  const cols=[...new Set(rows.filter(r=>r.meta&&r.meta.tbl).map(r=>r.meta.tbl.cols))];
  assert.deepEqual(cols,[3],'ragged rows share one column count (max over rows)');
  assert.match(bodyRowsHtml(rows),/<del>99\.1<\/del><ins>99\.5<\/ins>/);
});
// PARITY: MATCH (ledger: C7) — an added row renders inside the same single table rather than splitting it.
test('C7 [PARITY M] an added table row renders inside the same table', ()=>{
  const A=extractStructured(doc(TBL_NOGRID([['Metric','42 MW'],['Uptime','99.1%']])),{},NUM0);
  const B=extractStructured(doc(TBL_NOGRID([['Metric','45 MW'],['Uptime','99.1%'],['Latency','200ms']])),{},NUM0);
  const {rows,summary}=compare(A,B,{});
  const html=bodyRowsHtml(rows);
  assert.equal((html.match(/<table class="ctable">/g)||[]).length,1);
  assert.match(html,/<ins>Latency<\/ins>/);
  assert.ok(summary.total>=2);
});

/* ---- C8: change counting = unique cid count (nav "of N") ---- */
// PARITY: MATCH (ledger: C8) — summary.total equals the unique cid count (nav "of N"); per-side insertion/deletion tiles may legitimately sum to more.
test('C8 [CORRECTNESS] summary.total equals unique cid count; per-side tiles may exceed it', async()=>{
  const A=[para('alpha beta gamma'),para('stays put here'),para('to be removed entirely here')].join('');
  const B=[para('alpha beta DELTA'),para('stays put here'),para('a freshly inserted line here')].join('');
  const {rows,summary}=await dcompare(A,B);
  const cids=new Set(rows.filter(r=>r.cid).map(r=>r.cid));
  assert.equal(summary.total,cids.size,'total = unique numbered changes');
  assert.ok(summary.insertions+summary.deletions>=summary.total,'per-side tiles legitimately sum to more');
});
