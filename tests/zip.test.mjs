import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './load.mjs';
import {makeDocx,MINIMAL_DOC} from './makedocx.mjs';
const ctx=loadApp();
const fileOf=buf=>({arrayBuffer:async()=>buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength)});

test('valid stored-entry docx parses', async()=>{
  const buf=makeDocx({'word/document.xml':MINIMAL_DOC});
  const out=await ctx.docxToParagraphs(fileOf(buf));
  assert.equal(out.length,1);
  assert.equal(out[0].text,'Hello world');
});

test('garbage bytes → "not a ZIP" message (#12)', async()=>{
  const buf=Buffer.from('this is not remotely a zip file at all, sorry');
  await assert.rejects(()=>ctx.docxToParagraphs(fileOf(buf)),/not a ZIP archive/);
});

test('corrupt deflate stream → "appears to be corrupt" message (#12)', async()=>{
  const good=makeDocx({'word/document.xml':MINIMAL_DOC});
  // flip method bytes to 8 (deflate) in local+central headers without recompressing → invalid stream
  const bad=Buffer.from(good);
  const nameIdx=bad.indexOf(Buffer.from('word/document.xml'));
  bad[nameIdx-30+8]=8;                                   // local header method
  const cdIdx=bad.indexOf(Buffer.from('word/document.xml'),nameIdx+1);
  bad[cdIdx-46+10]=8;                                    // central header method
  await assert.rejects(()=>ctx.docxToParagraphs(fileOf(bad)),/appears to be corrupt/);
});

test('missing document.xml still reports it specifically', async()=>{
  const buf=makeDocx({'word/styles.xml':'<w:styles/>'});
  await assert.rejects(()=>ctx.docxToParagraphs(fileOf(buf)),/document\.xml not found/);
});
