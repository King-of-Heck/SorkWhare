import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './load.mjs';

const app=loadApp();
const hfRow=(kind,type,html,cid,ttype='changed')=>({type:ttype,cid,html,meta:{hf:{kind,type}}});

test('hfSectionHtml emits a labeled .hfband with the redlined html', () => {
  const rows=[hfRow('header','default','CONFIDENTIAL <ins>DRAFT</ins>',1)];
  const h=app.hfSectionHtml(rows,'header');
  assert.match(h,/class="hfband"/);
  assert.match(h,/Headers/,'single-variant heading is the plural base');
  assert.match(h,/CONFIDENTIAL/);
  assert.match(h,/id="chg-1"/,'changed row is navigable');
});

test('equal header rows render as .para.equal (obey hide-unchanged)', () => {
  const rows=[hfRow('header','default','Unchanged header.','','equal')];
  const h=app.hfSectionHtml(rows,'header');
  assert.match(h,/class="para equal"/);
});

test('multiple variants get qualified labels', () => {
  const rows=[hfRow('header','default','Running head',1),hfRow('header','first','Title-page head',2)];
  const h=app.hfSectionHtml(rows,'header');
  assert.match(h,/Header — Default/);
  assert.match(h,/Header — First Page/);
});

test('a footer-free doc yields no header/footer section', () => {
  assert.equal(app.hfSectionHtml([{type:'equal',meta:{marker:''},html:'body'}],'footer'),'');
});
