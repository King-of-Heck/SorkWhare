import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './load.mjs';

const app=loadApp();
const STYLES={}, NUM={}, DEF={fontPt:11,font:null,spacing:null};

test('parseRels maps rId → normalized part name', () => {
  const xml='<?xml version="1.0"?><Relationships>'
    +'<Relationship Id="rId1" Type="..." Target="header1.xml"/>'
    +'<Relationship Target="/word/footer2.xml" Id="rId9" Type="..."/>'
    +'</Relationships>';
  const m=app.parseRels(xml);
  assert.equal(m.get('rId1'),'header1.xml');
  assert.equal(m.get('rId9'),'footer2.xml','leading /word/ is stripped, order-independent');
});

test('parseHFRefs keys by kind:type, last section wins', () => {
  const rels=new Map([['rId1','header1.xml'],['rId2','header2.xml'],['rId3','footer1.xml']]);
  const doc='<w:body>'
    +'<w:p><w:pPr><w:sectPr><w:headerReference w:type="default" r:id="rId1"/></w:sectPr></w:pPr></w:p>'
    +'<w:sectPr>'
    +'<w:headerReference w:type="default" r:id="rId2"/>'
    +'<w:headerReference w:type="first" r:id="rId1"/>'
    +'<w:footerReference w:type="default" r:id="rId3"/>'
    +'</w:sectPr></w:body>';
  const refs=app.parseHFRefs(doc,rels);
  assert.equal(refs.get('header:default'),'header2.xml','last-section default wins');
  assert.equal(refs.get('header:first'),'header1.xml');
  assert.equal(refs.get('footer:default'),'footer1.xml');
});

test('parseHeadersFooters extracts paragraphs; skips text-less parts', () => {
  const refs=new Map([['header:default','header1.xml'],['footer:default','footer2.xml']]);
  const parts={
    'header1.xml':'<w:hdr><w:p><w:r><w:t>CONFIDENTIAL</w:t></w:r></w:p></w:hdr>',
    'footer2.xml':'<w:ftr><w:p></w:p></w:ftr>', // no text → skipped
  };
  const map=app.parseHeadersFooters(refs,parts,STYLES,NUM,DEF);
  assert.ok(map.has('header:default'));
  assert.equal(map.get('header:default').kind,'header');
  assert.equal(map.get('header:default').type,'default');
  assert.equal(map.get('header:default').paras[0].text,'CONFIDENTIAL');
  assert.ok(!map.has('footer:default'),'a text-less footer part creates no unit');
});
