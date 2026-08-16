import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './load.mjs';
import { makeDocx } from './makedocx.mjs';

const FN_XML = `<?xml version="1.0"?>
<w:footnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:footnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:footnote>
  <w:footnote w:type="continuationSeparator" w:id="0"><w:p><w:r><w:continuationSeparator/></w:r></w:p></w:footnote>
  <w:footnote w:id="1"><w:p><w:r><w:t>First footnote body.</w:t></w:r></w:p></w:footnote>
  <w:footnote w:id="2"><w:p><w:r><w:t>Second footnote body.</w:t></w:r></w:p></w:footnote>
</w:footnotes>`;

test('parseNotes skips separator entries and parses real notes', async () => {
  const app = await loadApp();
  const map = app.parseNotes(FN_XML, 'footnote', {}, {}, app.parseDocDefaults(null));
  assert.equal(map.size, 2);                        // -1 and 0 skipped
  assert.ok(map.has('1') && map.has('2'));
  assert.equal(map.get('1').kind, 'footnote');
  assert.equal(map.get('1').paras[0].text, 'First footnote body.');
});

test('parseNotes returns empty map for absent xml', async () => {
  const app = await loadApp();
  assert.equal(app.parseNotes(null, 'footnote', {}, {}, app.parseDocDefaults(null)).size, 0);
  assert.equal(app.parseNotes('', 'endnote', {}, {}, app.parseDocDefaults(null)).size, 0);
});

test('body reference capture assigns display numbers in reading order', async () => {
  const app = await loadApp();
  const doc = `<w:body>
    <w:p><w:r><w:t>Alpha</w:t></w:r><w:r><w:footnoteReference w:id="5"/></w:r></w:p>
    <w:p><w:r><w:t>Beta</w:t></w:r><w:r><w:footnoteReference w:id="2"/></w:r></w:p>
    <w:p><w:r><w:t>Gamma</w:t></w:r><w:r><w:endnoteReference w:id="9"/></w:r></w:p>
  </w:body>`;
  const paras = app.extractStructured(doc, {}, {}, app.parseDocDefaults(null));
  assert.deepEqual(
    JSON.parse(JSON.stringify(paras.noteRefs)),
    [
      {kind:'footnote', id:'5', dispNum:1, paraIndex:0},
      {kind:'footnote', id:'2', dispNum:2, paraIndex:1},
      {kind:'endnote',  id:'9', dispNum:1, paraIndex:2},
    ]
  );
  // sentinel present in body text
  assert.ok(paras[0].text.includes('footnote:5'));
});

test('paragraph with no footnote/endnote reference has no sentinel and empty noteRefs entries', async () => {
  const app = await loadApp();
  const doc = `<w:body><w:p><w:r><w:t>Plain paragraph, no refs.</w:t></w:r></w:p></w:body>`;
  const paras = app.extractStructured(doc, {}, {}, app.parseDocDefaults(null));
  assert.equal(paras.length, 1);
  assert.equal(paras[0].text, 'Plain paragraph, no refs.');
  assert.deepEqual(JSON.parse(JSON.stringify(paras.noteRefs)), []);
});
