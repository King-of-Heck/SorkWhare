import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './load.mjs';
const ctx=loadApp();
const html=ctx.__html;

test('screen: change bar is a single near-black color for every change class', ()=>{
  // One rule paints .changed/.inserted/.deleted/[class*="moved"]/.fmtchanged::before near-black.
  assert.match(html,/\.para\.changed::before[^{]*,[^{]*\.para\.fmtchanged::before\s*\{[^}]*background:\s*#333/,
    'unified near-black bar rule covers changed..fmtchanged');
  // Old per-category bar colors are gone from ::before.
  assert.doesNotMatch(html,/\.para\.changed::before\s*\{\s*background:#e0a72e/,'no amber category bar');
});

test('screen: bar sits in the left gutter (negative offset)', ()=>{
  assert.match(html,/\.para::before\{[^}]*left:-\d+px/,'::before offset into the gutter');
});

test('screen: formatting bar follows the Formatting toggle', ()=>{
  assert.match(html,/\.hide-fmt\s+\.para\.fmtchanged::before\s*\{[^}]*background:\s*transparent/,
    'hide-fmt removes the formatting bar');
});

test('screen: equal (non-formatting) rows still get no bar', ()=>{
  // Base ::before stays transparent; only the change-class selectors paint it.
  assert.match(html,/\.para::before\{[^}]*background:transparent/,'base bar transparent');
});
