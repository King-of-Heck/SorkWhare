import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './load.mjs';
const ctx=loadApp();

test('E9: two long low-overlap paragraphs under the cap render as clean del-phrase + ins-phrase', ()=>{
  const {safeInline}=ctx;
  // Distinct vocabularies, no shared tokens -> no usable anchors, but well under the 4000 cap.
  const o=Array.from({length:120},(_,i)=>'alpha'+i).join(' ');
  const n=Array.from({length:120},(_,i)=>'omega'+i).join(' ');
  const html=safeInline(o,n,[],[]);
  // Readable: all deletions grouped, then all insertions — not word-by-word alternation.
  const lastDel=html.lastIndexOf('</del>'), firstIns=html.indexOf('<ins>');
  assert.ok(firstIns>lastDel,'insertions must follow deletions (one del block, one ins block)');
  const delBlocks=(html.match(/<del>/g)||[]).length, insBlocks=(html.match(/<ins>/g)||[]).length;
  assert.ok(delBlocks<=1&&insBlocks<=1,'no scattered del/ins wrappers ('+delBlocks+'/'+insBlocks+')');
});

test('E9: empty-vs-huge does not emit an empty <del></del> or <ins></ins>', ()=>{
  const {safeInline}=ctx;
  const huge=Array.from({length:120},(_,i)=>'word'+i).join(' ');
  const insOnly=safeInline('',huge,[],[]);
  assert.doesNotMatch(insOnly,/<del><\/del>/);
  const delOnly=safeInline(huge,'',[],[]);
  assert.doesNotMatch(delOnly,/<ins><\/ins>/);
});
