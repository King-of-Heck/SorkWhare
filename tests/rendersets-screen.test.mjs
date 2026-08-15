import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './load.mjs';
const ctx=loadApp();
const {RENDER_SETS,applyRenderSet,renderSetVars,renderSetCss,__html:h}=ctx;

// A recording stand-in for document.documentElement.style.
const spy=()=>{const seen={};return {seen,setProperty(k,v){seen[k]=v;}};};

test('CSS rules consume the longhand decoration variables', ()=>{
  assert.match(h,/ins\{color:var\(--ins\);background:var\(--ins-bg\);text-decoration-line:var\(--ins-line\);text-decoration-style:var\(--ins-style\)/);
  assert.match(h,/del\{color:var\(--del\);background:var\(--del-bg\);text-decoration-line:var\(--del-line\);text-decoration-style:var\(--del-style\)/);
  assert.match(h,/\.moved\{[^}]*text-decoration-line:var\(--mov-line\)/);
  assert.match(h,/\.moved-src\{[^}]*text-decoration-line:var\(--mov-src-line\)/);
});

// The formatting mark is a border-bottom, NOT a text-decoration: the v1.3.2
// hide-fmt specificity ladder is built on that rule. It stays a border.
test('.fmtchg stays a border-bottom, driven by --fmt-style and --fmt', ()=>{
  assert.match(h,/\.fmtchg\{border-bottom:2px var\(--fmt-style\) var\(--fmt\)/);
  assert.match(h,/\.hide-fmt \.fmtchg\{border-bottom:none/);
});

test('the shorthand text-decoration is gone from the four change rules', ()=>{
  assert.doesNotMatch(h,/ins\{[^}]*text-decoration:underline/);
  assert.doesNotMatch(h,/del\{[^}]*text-decoration:line-through/);
});

test(':root still declares the default set values', ()=>{
  assert.match(h,/--ins:#0b5cad/);
  assert.match(h,/--ins-line:underline/);
  assert.match(h,/--mov-src-line:line-through/);
  assert.match(h,/--fmt-style:dotted/);
});

test('the rendering-set selector exists in the options bar', ()=>{
  assert.match(h,/<select id="rsSet">/);
});

test('applyRenderSet writes every variable of the chosen set', ()=>{
  const t=spy();
  const set=applyRenderSet('litera',t);
  assert.equal(set.id,'litera');
  // t.seen is a host-realm object (built by the spy); renderSetVars(...) returns
  // a vm-realm object. node:assert's deepEqual is deepStrictEqual and rejects
  // cross-realm objects even with identical content, so normalize only the
  // vm-realm side via a JSON round-trip (same fix Task 2 applied).
  assert.deepEqual(t.seen,JSON.parse(JSON.stringify(renderSetVars(RENDER_SETS.find(s=>s.id==='litera')))));
  assert.equal(t.seen['--ins-style'],'double');
  assert.equal(t.seen['--ins-bg'],'transparent');
});

test('an unknown persisted id falls back to the default set', ()=>{
  const t=spy();
  const set=applyRenderSet('no-such-set',t);
  assert.equal(set.id,'sorkwhare');
  assert.equal(t.seen['--ins'],'#0b5cad');
});

test('a missing id falls back to the default set', ()=>{
  assert.equal(applyRenderSet(null,spy()).id,'sorkwhare');
  assert.equal(applyRenderSet(undefined,spy()).id,'sorkwhare');
});

// localStorage does not exist in the vm realm at all, so the bare reference
// throws ReferenceError — the same class of failure as a blocked file:// origin.
test('applyRenderSet survives unavailable storage', ()=>{
  const t=spy();
  assert.doesNotThrow(()=>applyRenderSet('contrast',t));
  assert.equal(t.seen['--ins'],'#0072b2');
});

test('loadRenderSetId returns null when storage is unavailable', ()=>{
  assert.equal(ctx.loadRenderSetId(),null);
});

// exportPdf (the print-export iframe) can only carry stylesheet TEXT, not the
// inline custom properties on documentElement — renderSetCss(activeSet) is
// the serialized-to-text escape hatch for that surface.
test('renderSetCss returns a :root{} block containing every variable of the set', ()=>{
  for(const set of RENDER_SETS){
    const css=renderSetCss(set);
    assert.match(css,/^:root\{.*\}$/);
    // Build the expected data from renderSetVars itself so the two stay in
    // step; JSON round-trip the vm-realm object before iterating (cross-realm
    // objects are otherwise fine to read from, just not deepEqual-safe).
    const vars=JSON.parse(JSON.stringify(renderSetVars(set)));
    for(const k of Object.keys(vars)){
      assert.match(css,new RegExp('(?:^|;|\\{)'+k.replace(/[-[\]{}()*+?.,\\^$|#\s]/g,'\\$&')+':'+vars[k].replace(/[-[\]{}()*+?.,\\^$|#\s]/g,'\\$&')+'(?:;|\\})'));
    }
  }
});

test('renderSetCss for the litera set carries --ins:#0000ff and --ins-style:double', ()=>{
  const set=RENDER_SETS.find(s=>s.id==='litera');
  const css=renderSetCss(set);
  assert.match(css,/--ins:#0000ff/);
  assert.match(css,/--ins-style:double/);
});

// Order is the whole point: both blocks use the :root selector, so equal
// specificity means source order decides. If the injected set ever moved BEFORE
// the copied stylesheet text, the defaults would win and the print export would
// silently fall back to the default set again — with a green suite.
test('exportPdf injects renderSetCss(activeSet) AFTER the copied stylesheet text', ()=>{
  assert.match(h,/renderSetCss\(activeSet\)/);
  assert.match(h,/\+'<style>'\+styles\+'<\/style>'\s*\n\s*\+'<style>'\+renderSetCss\(activeSet\)\+'<\/style>'/);
});
