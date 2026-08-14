import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './load.mjs';

test('D8: showErr escapes markup so a crafted filename cannot inject HTML', ()=>{
  const ctx=loadApp();
  const errEl={innerHTML:''};
  ctx.document.getElementById=id=>id==='err'?errEl
    :({innerHTML:'',textContent:'',value:'',checked:false,disabled:false,
       classList:{add(){},remove(){},toggle(){},contains(){return false;}},
       style:{cssText:''},setAttribute(){},removeAttribute(){},addEventListener(){}});
  ctx.showErr('Bad file <img src=x onerror=alert(1)>.docx');
  assert.doesNotMatch(errEl.innerHTML,/<img/,'raw tag must not appear');
  assert.match(errEl.innerHTML,/&lt;img/,'angle brackets must be escaped');
  assert.match(errEl.innerHTML,/class="err"/,'wrapper markup preserved');
});

test('D8: empty message clears the banner', ()=>{
  const ctx=loadApp();
  const errEl={innerHTML:'stale'};
  ctx.document.getElementById=id=>id==='err'?errEl:({innerHTML:''});
  ctx.showErr('');
  assert.equal(errEl.innerHTML,'');
});
