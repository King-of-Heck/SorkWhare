import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './load.mjs';
const {unxml}=loadApp();

test('unxml decodes &amp; LAST (no double-decode)', ()=>{
  assert.equal(unxml('&amp;lt;'),'&lt;');          // literal "&lt;" in the doc
  assert.equal(unxml('A &amp; B'),'A & B');
});
test('unxml decodes numeric entities', ()=>{
  assert.equal(unxml('&#8217;s'),'’s');
  assert.equal(unxml('&#x2019;s'),'’s');
});
test('unxml still decodes the named five', ()=>{
  assert.equal(unxml('&lt;a&gt; &quot;q&quot; &apos;s&apos;'),'<a> "q" \'s\'');
});

test('pdfParseRuns decodes &amp; last — literal &lt; survives to PDF (final review)', ()=>{
  const {pdfParseRuns}=loadApp();
  const runs=pdfParseRuns('<ins>&amp;lt; and &amp;amp;</ins>');
  assert.equal(runs.length,1);
  assert.equal(runs[0].text,'&lt; and &amp;');
  assert.equal(runs[0].kind,'ins');
});
