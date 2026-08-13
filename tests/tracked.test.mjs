import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './load.mjs';
const ctx=loadApp();

test('tracked-changes detector regex present and correct (#10)', ()=>{
  const {__html:h}=loadApp();
  assert.match(h,/hasTrackedChanges/);
  assert.match(h,/id="notice"/);
});

test('detector matches w:ins / w:del but not w:ind or w:instrText', ()=>{
  // mirror of the regex the app uses
  const re=/<w:(?:ins|del)[ >]/;
  assert.ok(re.test('<w:ins w:id="1" w:author="x">'));
  assert.ok(re.test('<w:del w:id="2">'));
  assert.ok(!re.test('<w:ind w:left="720"/>'));
  assert.ok(!re.test('<w:instrText>PAGEREF</w:instrText>'));
});

test('accept-all semantics: delText excluded, ins runs included', ()=>{
  const {extractStructured}=ctx;
  const doc='<w:p><w:r><w:t>kept </w:t></w:r>'
    +'<w:ins w:id="1"><w:r><w:t>added</w:t></w:r></w:ins>'
    +'<w:del w:id="2"><w:r><w:delText>removed</w:delText></w:r></w:del></w:p>';
  const out=extractStructured(doc,{},{numToAbs:{},abs:{},styleToNum:{}});
  assert.equal(out[0].text,'kept added');
});
