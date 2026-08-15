import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './load.mjs';
const ctx=loadApp();
const {RENDER_SETS,renderSetVars,hexToPdfRgb}=ctx;

const VAR_NAMES=['--ins','--ins-bg','--ins-line','--ins-style',
                 '--del','--del-bg','--del-line','--del-style',
                 '--mov','--mov-bg','--mov-line','--mov-style','--mov-src-line',
                 '--fmt','--fmt-bg','--fmt-line','--fmt-style'];

test('three sets ship, default first', ()=>{
  assert.equal(RENDER_SETS.length,3);
  // VM realm arrays need JSON round-trip to normalize before deepEqual (same fix as diff.test.mjs).
  assert.deepEqual(JSON.parse(JSON.stringify(RENDER_SETS.map(s=>s.id))),['sorkwhare','litera','contrast']);
  assert.equal(RENDER_SETS[0].label,'SorkWhare (default)');
});

test('every set declares all four categories with complete fields', ()=>{
  for(const s of RENDER_SETS){
    for(const k of ['ins','del','mov','fmt']){
      const c=s.cats[k];
      assert.ok(c,s.id+'.'+k+' missing');
      assert.match(c.color,/^#[0-9a-f]{6}$/,s.id+'.'+k+' color');
      assert.ok(typeof c.bg==='string'&&c.bg,s.id+'.'+k+' bg');
      assert.ok(['underline','line-through','none'].includes(c.line),s.id+'.'+k+' line');
      assert.ok(['solid','double','dotted'].includes(c.style),s.id+'.'+k+' style');
    }
    assert.equal(s.cats.mov.srcLine,'line-through',s.id+' mov.srcLine');
  }
});

test('renderSetVars returns all 17 properties for every set', ()=>{
  for(const s of RENDER_SETS){
    const v=renderSetVars(s);
    assert.deepEqual(Object.keys(v).sort(),[...VAR_NAMES].sort(),s.id);
    for(const n of VAR_NAMES) assert.ok(v[n],s.id+' '+n+' empty');
  }
});

test('renderSetVars maps the default set to today\'s values', ()=>{
  const v=renderSetVars(RENDER_SETS[0]);
  assert.equal(v['--ins'],'#0b5cad');
  assert.equal(v['--ins-bg'],'#e7f0fb');
  assert.equal(v['--ins-line'],'underline');
  assert.equal(v['--del-line'],'line-through');
  assert.equal(v['--mov-style'],'dotted');
  assert.equal(v['--mov-src-line'],'line-through');
  assert.equal(v['--fmt'],'#7c3aed');
});

// The byte-identity guarantee: these four literals are what pdfStyle hardcoded in v1.4.1.
test('hexToPdfRgb reproduces the four v1.4.1 PDF literals exactly', ()=>{
  assert.equal(hexToPdfRgb('#0b5cad'),'0.043 0.361 0.678');
  assert.equal(hexToPdfRgb('#b3261e'),'0.702 0.149 0.118');
  assert.equal(hexToPdfRgb('#1b7f3b'),'0.106 0.498 0.231');
  assert.equal(hexToPdfRgb('#7c3aed'),'0.486 0.227 0.929');
});

test('hexToPdfRgb handles shorthand hex and the extremes', ()=>{
  assert.equal(hexToPdfRgb('#000'),'0.000 0.000 0.000');
  assert.equal(hexToPdfRgb('#fff'),'1.000 1.000 1.000');
  assert.equal(hexToPdfRgb('#0000ff'),'0.000 0.000 1.000');
});

test('Litera Classic double-underlines insertions with no background wash', ()=>{
  const litera=RENDER_SETS.find(s=>s.id==='litera');
  assert.equal(litera.cats.ins.line,'underline');
  assert.equal(litera.cats.ins.style,'double');
  assert.equal(litera.cats.ins.bg,'transparent');
  assert.equal(litera.cats.del.bg,'transparent');
});

// Hue alone must not carry meaning in the color-safe set.
test('High contrast gives every category a distinct decoration', ()=>{
  const c=RENDER_SETS.find(s=>s.id==='contrast').cats;
  const decos=[c.ins.line+'/'+c.ins.style,c.del.line+'/'+c.del.style,
               c.mov.line+'/'+c.mov.style,c.fmt.line+'/'+c.fmt.style];
  assert.equal(new Set(decos).size,4,'decorations not distinct: '+decos.join(', '));
});
