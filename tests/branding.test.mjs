import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './load.mjs';

test('app script loads in vm and exposes engine functions', ()=>{
  const ctx=loadApp();
  for(const fn of ['unxml','lcsOps','compare','extractStructured','snippetHtml','sim','norm2'])
    assert.equal(typeof ctx[fn],'function', fn+' missing');
});

test('branding: HeckSoft + v1.1.5, no HeckNet, no v1.1.4', ()=>{
  const {__html:h}=loadApp();
  assert.match(h,/<title>SorkWhare Compare® v1\.1\.5 — HeckSoft<\/title>/);
  assert.match(h,/HeckSoft — a King of Heck Company™/);
  assert.doesNotMatch(h,/HeckNet/);
  assert.match(h,/<span class="ver">v1\.1\.5<\/span>/);
});

test('dead "Ignore whitespace" checkbox is gone (#2)', ()=>{
  const {__html:h}=loadApp();
  assert.doesNotMatch(h,/optWs/);
  assert.doesNotMatch(h,/Ignore whitespace/);
});

test('keyboard handlers guard on resultsShown, not style.display (#3)', ()=>{
  const {__html:h}=loadApp();
  assert.match(h,/let\s+resultsShown\s*=\s*false/);
  assert.doesNotMatch(h,/style\.display!=='none'/);
  assert.doesNotMatch(h,/style\.display==='none'\)return/);
});
