import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './load.mjs';
const {snippetHtml}=loadApp();

function assertBalanced(html){
  const stack=[]; const re=/<\/?(\w+)[^>]*>/g; let m;
  while((m=re.exec(html))){ if(m[0][1]==='/'){assert.equal(stack.pop(),m[1],'mismatched close in: '+html);} else stack.push(m[1]); }
  assert.equal(stack.length,0,'unclosed tags in: '+html);
}

test('long snippet is truncated tag-safely', ()=>{
  const word='w'.repeat(20);
  const html='start '+`<span class="moved">${word} ${word} ${word} ${word} ${word}</span>`+' <del>tail</del>';
  const s=snippetHtml({html});
  assertBalanced(s);
  assert.ok(s.includes('…'),'expected ellipsis');
  assert.ok(s.replace(/<[^>]+>/g,'').length<=95);
});
test('short snippet passes through unchanged', ()=>{
  const html='<ins>abc</ins> def';
  assert.equal(snippetHtml({html}),html);
});
test('never slices inside a tag', ()=>{
  // 89 visible chars then a tag: naive slice at 90 would cut mid-tag
  const html='x'.repeat(89)+'<span class="moved">yyyyy</span>';
  assertBalanced(snippetHtml({html}));
});
