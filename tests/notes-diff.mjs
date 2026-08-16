import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './load.mjs';

function para(text){ return {text, boldRuns:[], fmtSpans:[], heading:false, isNumbered:false, marker:'', ilvl:0, isBold:false, align:'left', indLeftPt:0, indHangingPt:0, indFirstLinePt:0, tbl:null}; }

test('buildNoteStream orders referenced notes and tags them', async () => {
  const app = await loadApp();
  const refs = [{kind:'footnote', id:'5', dispNum:1, paraIndex:0},
                {kind:'footnote', id:'2', dispNum:2, paraIndex:1}];
  const notes = new Map([['5',{id:'5',kind:'footnote',paras:[para('Note five.')]}],
                         ['2',{id:'2',kind:'footnote',paras:[para('Note two.')]}]]);
  const stream = app.buildNoteStream('footnote', refs, notes);
  assert.equal(stream.length, 2);
  assert.equal(stream[0].text, 'Note five.');
  assert.deepEqual(JSON.parse(JSON.stringify(stream[0].note)), {kind:'footnote', dispNum:1, id:'5'});
});

test('compareNotes counts an edited footnote as one change', async () => {
  const app = await loadApp();
  const A = [Object.assign(para('The term is five years.'), {note:{kind:'footnote',dispNum:1,id:'1'}})];
  const B = [Object.assign(para('The term is seven years.'), {note:{kind:'footnote',dispNum:1,id:'1'}})];
  const {rows, summary} = app.compareNotes('footnote', A, B);
  assert.equal(summary.total, 1);
  assert.equal(rows.filter(r=>r.type==='changed').length, 1);
});
