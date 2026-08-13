import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './load.mjs';
const ctx=loadApp();
const {lcsOps}=ctx;

function checkOps(a,b,ops){
  // ops must reconstruct b from a and preserve index monotonicity
  let i=0,j=0,eq=0;
  for(const[t,oi,oj]of ops){
    if(t==='equal'){assert.equal(oi,i);assert.equal(oj,j);assert.equal(a[i],b[j]);i++;j++;eq++;}
    else if(t==='delete'){assert.equal(oi,i);i++;}
    else {assert.equal(oj,j);j++;}
  }
  assert.equal(i,a.length);assert.equal(j,b.length);
  return eq;
}

test('small diffs correct (parity with DP)', ()=>{
  const cases=[
    [['a','b','c'],['a','x','c']],
    [[],['a']], [['a'],[]], [[],[]],
    [['a','b','c','d'],['c','d','a','b']],
    [['x','x','x'],['x','x','x']],
    [['1','2','3','4','5'],['9','2','4','8']],
  ];
  for(const[a,b]of cases)checkOps(a,b,lcsOps(a,b));
});

test('common prefix/suffix fully matched', ()=>{
  const a=['p','p','MID1','s','s'],b=['p','p','MID2','MID3','s','s'];
  const eq=checkOps(a,b,lcsOps(a,b));
  assert.ok(eq>=4,'prefix+suffix (4 items) must be equal ops');
});

test('5000x5000 mostly-similar diff completes fast without huge memory', ()=>{
  const a=[],b=[];
  for(let i=0;i<5000;i++){a.push('para-'+i);b.push(i%50===0?'changed-'+i:'para-'+i);}
  b.splice(2500,0,'inserted-x','inserted-y');
  const t0=Date.now();
  const ops=lcsOps(a,b);
  assert.ok(Date.now()-t0<5000,'took too long');
  const eq=checkOps(a,b,ops);
  assert.ok(eq>=4900,'should match almost everything');
});

test('5000x5000 with NO unique anchors degrades to replace, not crash', ()=>{
  const a=new Array(3000).fill('same'),b=new Array(3100).fill('other');
  checkOps(a,b,lcsOps(a,b)); // must terminate without OOM
});

test('safeInline caps huge paragraphs (#8)', ()=>{
  const {safeInline}=ctx;
  const big=Array.from({length:4500},(_,i)=>'w'+i).join(' ');
  const out=safeInline(big,big+' extra',[],[]);
  assert.match(out,/^<del>/);
  assert.match(out,/<ins>.*<\/ins>$/);
});

// Verbatim old implementation from v1.1.4, kept private to this test file so
// we can fuzz for EXACT op-sequence parity (not just LCS-length parity).
function oldLcsOps(a,b){const n=a.length,m=b.length,dp=Array.from({length:n+1},()=>new Uint32Array(m+1));for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)dp[i][j]=a[i]===b[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);const ops=[];let i=0,j=0;while(i<n&&j<m){if(a[i]===b[j]){ops.push(['equal',i,j]);i++;j++;}else if(dp[i+1][j]>=dp[i][j+1]){ops.push(['delete',i,j]);i++;}else{ops.push(['insert',i,j]);j++;}}while(i<n){ops.push(['delete',i,j]);i++;}while(j<m){ops.push(['insert',i,j]);j++;}return ops;}

test('parity with old DP on small inputs (exact op sequence)', ()=>{
  // deterministic PRNG so the test is reproducible
  let seed=42; const rnd=()=>((seed=(seed*1103515245+12345)&0x7fffffff)/0x80000000);
  const ALPHA=['a','b','c'];
  for(let t=0;t<20000;t++){
    const na=Math.floor(rnd()*6),nb=Math.floor(rnd()*6);
    const a=Array.from({length:na},()=>ALPHA[Math.floor(rnd()*3)]);
    const b=Array.from({length:nb},()=>ALPHA[Math.floor(rnd()*3)]);
    // lcsOps runs inside loadApp()'s vm context (a separate JS realm), so its
    // returned arrays carry that realm's Array.prototype; assert.deepEqual
    // treats that as unequal to same-shaped arrays built in this realm even
    // though every value matches. JSON round-trip normalizes both sides to
    // this realm's plain arrays before comparing — a test-only fix, values
    // are plain [string,number,number] tuples so this loses nothing.
    const got=JSON.parse(JSON.stringify(lcsOps(a,b)));
    const want=JSON.parse(JSON.stringify(oldLcsOps(a,b)));
    assert.deepEqual(got,want,`divergence at trial ${t}: a=${JSON.stringify(a)} b=${JSON.stringify(b)}`);
  }
});
