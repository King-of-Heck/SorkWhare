import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './load.mjs';
const ctx=loadApp();
const {generateRedlinePdf}=ctx;
const GEOM={wIn:8.5,hIn:11,mt:1,mr:1,mb:1,ml:1,fontPt:11,font:'Times New Roman'};
const row=(html,extra={})=>({type:'equal',fmtChanged:true,html,meta:{marker:''},...extra});

test('PDF: fmtChanged row draws the inline note when show.fmt is on', ()=>{
  const rows=[row('Clause <span class="fmtchg" title="bold added"><b>text</b></span> here',{fmtDescs:['bold added']})];
  const r=generateRedlinePdf({rows,geom:GEOM,show:{ins:true,del:true,mov:true,eq:true,fmt:true},summary:{total:0,formatting:1}});
  assert.ok(r.pdf.startsWith('%PDF-1.4'));
  // Note text is now tokenized into word/space atoms (each its own Tj) rather than
  // one atomic run, so assert on the words rather than the exact joined literal.
  assert.ok(r.pdf.includes('[formatting:'),'inline note drawn (opening token)');
  assert.ok(r.pdf.includes('added]'),'inline note drawn (closing token)');
});

test('PDF: show.fmt off suppresses the note (clean export)', ()=>{
  const rows=[row('Clause <span class="fmtchg" title="bold added"><b>text</b></span> here',{fmtDescs:['bold added']})];
  const r=generateRedlinePdf({rows,geom:GEOM,show:{ins:true,del:true,mov:true,eq:true,fmt:false},summary:{total:0,formatting:1}});
  assert.doesNotMatch(r.pdf,/formatting: bold added/,'note omitted when formatting hidden');
});

test('PDF: a long multi-attribute formatting note wraps across lines instead of overflowing the page', ()=>{
  const fmtDescs=['font Calibri changed to Arial','size 11 changed to 14','bold added','italic removed','underline added'];
  const rows=[row('Clause <span class="fmtchg" title="'+fmtDescs.join('; ')+'"><b>text</b></span> here',{fmtDescs})];
  const r=generateRedlinePdf({rows,geom:GEOM,show:{ins:true,del:true,mov:true,eq:true,fmt:true},summary:{total:0,formatting:1}});
  assert.ok(r.pdf.startsWith('%PDF-1.4'));
  // The full joined note must NOT be emitted as one over-wide Tj literal (the pre-fix
  // bug: a single atomic atom drawn in full, running off the page's content width).
  assert.doesNotMatch(r.pdf,/\([^)]*formatting:[^)]*underline added\][^)]*\) Tj/,
    'note text must not be a single unwrapped Tj literal');
  // The individual words still make it into the PDF, just as separate wrapped atoms.
  assert.ok(r.pdf.includes('formatting:'),'note opening token present');
  assert.ok(r.pdf.includes('added'),'note closing word present');
  // Wrapping across multiple lines means more positioning (Tm) ops than a short note would need.
  const tmCount=(r.pdf.match(/Tm$/gm)||[]).length;
  assert.ok(tmCount>10,'long note produced multiple wrapped lines worth of draw ops, got '+tmCount);
});
