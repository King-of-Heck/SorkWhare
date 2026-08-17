import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './load.mjs';

const app=loadApp();
const para=t=>({text:t,boldRuns:[],fmtSpans:[]});
const unit=(kind,type,texts)=>({kind,type,paras:texts.map(para)});

test('a changed header folds into total and continues body cid numbering', () => {
  const summary={insertions:0,deletions:0,moves:0,amendments:0,content:0,numbering:0,punctuation:0,total:2,formatting:0};
  const rows=[{type:'changed',cid:1},{type:'inserted',cid:2}]; // body already has 2 changes
  const hfA=new Map([['header:default',unit('header','default',['CONFIDENTIAL'])]]);
  const hfB=new Map([['header:default',unit('header','default',['CONFIDENTIAL DRAFT'])]]);
  app.applyHFComparison(summary,rows,hfA,hfB,false);
  assert.equal(summary.total,3,'the header change bumps total to 3');
  assert.equal(summary.headers,1,'summary.headers records the sub-tally');
  const hfRows=rows.filter(r=>r.meta&&r.meta.hf);
  assert.ok(hfRows.length>=1,'header rows are appended');
  assert.ok(hfRows.some(r=>r.cid===3),'the header change is numbered 3 (base+1)');
  assert.equal(hfRows[0].meta.hf.kind,'header');
});

test('a footer present only in B renders as all-inserted', () => {
  const summary={insertions:0,deletions:0,moves:0,amendments:0,content:0,numbering:0,punctuation:0,total:0,formatting:0};
  const rows=[];
  const hfA=new Map();
  const hfB=new Map([['footer:default',unit('footer','default',['Page footer text'])]]);
  app.applyHFComparison(summary,rows,hfA,hfB,false);
  assert.equal(summary.footers,1);
  const fr=rows.find(r=>r.meta&&r.meta.hf&&r.meta.hf.kind==='footer');
  assert.equal(fr.type,'inserted','the whole footer part is an insertion');
});
