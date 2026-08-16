import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './load.mjs';

// The reference sentinel's PUA delimiters (U+E000 / U+E001), built via fromCharCode
// so the test file never has to embed a literal PUA glyph or an escape-sequence typo.
const PUA_OPEN = String.fromCharCode(0xE000);
const PUA_CLOSE = String.fromCharCode(0xE001);

test('endnote change renders an endnotes section with redline', async () => {
  const app = await loadApp();
  const rows = [
    {type:'equal', meta:{text:'Body.', note:null}, html:'Body.'},
    {type:'changed', cid:1, meta:{text:'', note:{kind:'endnote', dispNum:1, id:'1'}},
     html:'The term is <del>five</del><ins>seven</ins> years.'},
  ];
  const html = app.notesSectionHtml(rows, 'endnote');
  assert.match(html, /class="endnotes"/);
  assert.match(html, /<del>five<\/del><ins>seven<\/ins>/);
});

test('note-free rows render byte-identically (no note markup added)', async () => {
  const app = await loadApp();
  const rows = [{type:'equal', meta:{text:'Body only.', note:null}, html:'Body only.'}];
  // No footnote/endnote rows → sections are empty strings.
  assert.equal(app.notesSectionHtml(rows, 'footnote'), '');
  assert.equal(app.notesSectionHtml(rows, 'endnote'), '');
});

test('renderAll body HTML for note-free rows equals bodyRowsHtml (no note wrappers)', async () => {
  const app = await loadApp();
  const rows=[{type:'equal', meta:{text:'X', note:null}, html:'X'}];
  const bodyRows=rows.filter(r=>!(r.meta && r.meta.note));
  const full = app.bodyRowsHtml(bodyRows) + app.notesSectionHtml(rows,'footnote') + app.notesSectionHtml(rows,'endnote');
  assert.equal(full, app.bodyRowsHtml(bodyRows));   // sections are '' → concatenation is identity
});

test('noteSup strips the PUA delimiters and inserts the numeric display number', async () => {
  const app = await loadApp();
  const html = 'See' + PUA_OPEN + 'footnote:5' + PUA_CLOSE + ' for details.';
  const dnMap = {'footnote:5': 1};
  const out = app.noteSup(html, dnMap);
  assert.equal(out, 'See<sup class="fnref">1</sup> for details.');
  assert.ok(!out.includes(PUA_OPEN));
  assert.ok(!out.includes(PUA_CLOSE));
});

test('noteSup falls back to * when the sentinel id is not in the map (orphan-safe)', async () => {
  const app = await loadApp();
  const html = 'See' + PUA_OPEN + 'footnote:99' + PUA_CLOSE + ' here.';
  const out = app.noteSup(html, {});
  assert.equal(out, 'See<sup class="fnref">*</sup> here.');
});

test('noteSup on note-free HTML is a no-op (additive guarantee)', async () => {
  const app = await loadApp();
  const html = '<p class="para equal">Plain paragraph, no refs.</p>';
  assert.equal(app.noteSup(html, {}), html);
});

test('a body reference inside an ins/del inherits color via the surrounding element (no extra logic)', async () => {
  const app = await loadApp();
  const html = '<ins>New text' + PUA_OPEN + 'footnote:1' + PUA_CLOSE + '</ins>';
  const dnMap = {'footnote:1': 3};
  const out = app.noteSup(html, dnMap);
  assert.equal(out, '<ins>New text<sup class="fnref">3</sup></ins>');
});
