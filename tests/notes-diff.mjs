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

test('compareNotes threads the ignoreCase flag through to notes', async () => {
  const app = await loadApp();
  const A = [Object.assign(para('The Term is five years.'), {note:{kind:'footnote',dispNum:1,id:'1'}})];
  const B = [Object.assign(para('the term is five years.'), {note:{kind:'footnote',dispNum:1,id:'1'}})];
  // Case-only difference: with ignoreCase=true, notes must be treated as equal (0 changes).
  const withIgnore = app.compareNotes('footnote', A, B, true);
  assert.equal(withIgnore.summary.total, 0);
  // With ignoreCase=false (or omitted), the case difference must still register.
  const withoutIgnore = app.compareNotes('footnote', A, B, false);
  assert.equal(withoutIgnore.summary.total, 1);
});

function emptySummary(){
  return {insertions:0,deletions:0,moves:0,amendments:0,content:0,numbering:0,punctuation:0,total:0,formatting:0,footnotes:0,endnotes:0};
}

test('mergeNoteResults folds all sub-tallies and renumbers cids after the body max', async () => {
  const app = await loadApp();
  const bodySummary = Object.assign(emptySummary(), {total:2, insertions:1, deletions:1, content:2});
  const bodyRows = [];
  const noteResult = {
    rows: [{cid:1, type:'changed', text:'Note changed.'}],
    summary: Object.assign(emptySummary(), {total:1, insertions:1, deletions:1, amendments:1, content:1})
  };
  app.mergeNoteResults(bodySummary, bodyRows, noteResult, 'footnotes');

  // cid renumbered to continue after the body's pre-merge max (base=2 -> 2+1=3)
  assert.equal(bodyRows.length, 1);
  assert.equal(bodyRows[0].cid, 3);

  // total bumped by the note total
  assert.equal(bodySummary.total, 3);

  // sub-tallies folded
  assert.equal(bodySummary.insertions, 2);
  assert.equal(bodySummary.deletions, 2);
  assert.equal(bodySummary.amendments, 1);
  assert.equal(bodySummary.content, 3);
  assert.equal(bodySummary.punctuation, 0);
  assert.equal(bodySummary.formatting, 0);

  // sub-tally key set to the note's own total
  assert.equal(bodySummary.footnotes, 1);
});

test('mergeNoteResults with an all-zero note result is a no-op (additive guarantee)', async () => {
  const app = await loadApp();
  const bodySummary = Object.assign(emptySummary(), {total:2, insertions:1, deletions:1, content:2, punctuation:0, formatting:0, amendments:0});
  const bodySummaryBefore = Object.assign({}, bodySummary);
  const bodyRows = [{cid:1, type:'deleted'}, {cid:2, type:'inserted'}];
  const bodyRowsBefore = JSON.parse(JSON.stringify(bodyRows));
  const noteResult = { rows: [], summary: emptySummary() };

  app.mergeNoteResults(bodySummary, bodyRows, noteResult, 'endnotes');

  assert.deepEqual(bodySummary, bodySummaryBefore); // endnotes was already 0
  assert.deepEqual(bodyRows, bodyRowsBefore);
});
