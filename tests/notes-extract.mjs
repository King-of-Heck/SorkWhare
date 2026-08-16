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
