import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './load.mjs';
const ctx=loadApp();

// Regression cases from the external redline-quality review (v1.3.0):
// clean del/ins pairs, number-aware tokens, phrase coalescing for dense rewrites.

test('tok: numbers with ,./-: separators are single tokens', ()=>{
  const {tok}=ctx;
  assert.deepEqual(JSON.parse(JSON.stringify(tok('$486,000'))),['$','486,000']);
  assert.deepEqual(JSON.parse(JSON.stringify(tok('42 MW'))),['42',' ','MW']);
  assert.deepEqual(JSON.parse(JSON.stringify(tok('September 1, 2026'))),['September',' ','1',',',' ','2026']);
  assert.deepEqual(JSON.parse(JSON.stringify(tok('4:30'))),['4:30']);
  assert.deepEqual(JSON.parse(JSON.stringify(tok('B2B'))),['B2B']);
});

test('T1 fee replacement: whole number replaced, no mid-number split', ()=>{
  const {inlineDiffB}=ctx;
  const out=inlineDiffB('The fee is $486,000.','The fee is $528,000.',[],[]);
  assert.equal(out,'The fee is $<del>486,000</del><ins>528,000</ins>.');
});

test('T2 date replacement: clean September/October pair', ()=>{
  const {inlineDiffB}=ctx;
  const out=inlineDiffB('September 1, 2026','October 1, 2026',[],[]);
  assert.equal(out,'<del>September</del><ins>October</ins> 1, 2026');
});

test('T3 heading replacement: VERSION A -> VERSION B', ()=>{
  const {inlineDiffB}=ctx;
  assert.equal(inlineDiffB('VERSION A','VERSION B',[],[]),'VERSION <del>A</del><ins>B</ins>');
});

test('T6 table-cell numbers: two-digit values replaced whole', ()=>{
  const {inlineDiffB}=ctx;
  assert.equal(inlineDiffB('42 MW','45 MW',[],[]),'<del>42</del><ins>45</ins> MW');
  assert.equal(inlineDiffB('19','22',[],[]),'<del>19</del><ins>22</ins>');
});

test('T7 dense rewrite coalesces into ONE del phrase + ONE ins phrase', ()=>{
  const {inlineDiffB}=ctx;
  const o='Targets are operational objectives and do not constitute guaranteed availability.';
  const n='Targets are binding contractual commitments subject to the exclusions expressly stated.';
  const out=inlineDiffB(o,n,[],[]);
  assert.equal((out.match(/<del>/g)||[]).length,1,'one <del>: '+out);
  assert.equal((out.match(/<ins>/g)||[]).length,1,'one <ins>: '+out);
  assert.match(out,/<del>operational objectives and do not constitute guaranteed availability<\/del>/);
  assert.match(out,/<ins>binding contractual commitments subject to the exclusions expressly stated<\/ins>/);
  assert.match(out,/^Targets are /);
});

test('single word pair is NOT coalesced with neighbours across real words', ()=>{
  const {inlineDiffB}=ctx;
  assert.equal(inlineDiffB('Within 2 business days','Within 1 business day',[],[]),
    'Within <del>2</del><ins>1</ins> business <del>days</del><ins>day</ins>');
});

test('adjacent same-type fragments share one wrapper (no <ins> </ins> islands)', ()=>{
  const {inlineDiffB}=ctx;
  const out=inlineDiffB('Review Status: Draft','Review Status: Revised Draft',[],[]);
  assert.equal(out,'Review Status: <ins>Revised </ins>Draft');
  assert.doesNotMatch(out,/<ins>\s*<\/ins>/);
});

test('T9 bold formatting survives inside del/ins', ()=>{
  const {inlineDiffB}=ctx;
  const out=inlineDiffB('X old Y','X new Y',[[2,5]],[[2,5]]);
  assert.equal(out,'X <del><b>old</b></del><ins><b>new</b></ins> Y');
});

test('T8 whitespace edges: changes at start, end, before punctuation', ()=>{
  const {inlineDiffB}=ctx;
  assert.equal(inlineDiffB('Alpha beta gamma.','Zeta beta gamma.',[],[]),
    '<del>Alpha</del><ins>Zeta</ins> beta gamma.');
  assert.equal(inlineDiffB('Alpha beta gamma.','Alpha beta delta.',[],[]),
    'Alpha beta <del>gamma</del><ins>delta</ins>.');
  assert.equal(inlineDiffB('One two.','One two three.',[],[]),
    'One two<ins> three</ins>.');
});

test('T4/T5 added and deleted sentences stay whole single-type rows', ()=>{
  const {compare}=ctx;
  const P=t=>({text:t,boldRuns:[]});
  const {rows}=compare([P('Common ground.')],[P('Common ground.'),P('An entirely new sentence.')],{});
  const ins=rows.find(r=>r.type==='inserted');
  assert.equal(ins.html,'<ins>An entirely new sentence.</ins>');
  const {rows:rows2}=compare([P('Common ground.'),P('A removed sentence.')],[P('Common ground.')],{});
  const del=rows2.find(r=>r.type==='deleted');
  assert.equal(del.html,'<del>A removed sentence.</del>');
});

/* ================= tables (v1.3.0) ================= */
const NUM0={numToAbs:{},abs:{},styleToNum:{}};
const CP=t=>'<w:p><w:r><w:t>'+t+'</w:t></w:r></w:p>';
const TC=t=>'<w:tc>'+CP(t)+'</w:tc>';
const TBL=rows=>'<w:tbl><w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="6000"/></w:tblGrid>'
  +rows.map(cells=>'<w:tr>'+cells.map(TC).join('')+'</w:tr>').join('')+'</w:tbl>';

test('extractStructured: table cells carry tbl meta {ti,ri,ci,cols} in document order', ()=>{
  const {extractStructured}=ctx;
  const doc=CP('Before')+TBL([['A1','B1'],['A2','B2']])+CP('After');
  const out=extractStructured(doc,{},NUM0);
  assert.deepEqual(JSON.parse(JSON.stringify(out.map(r=>r.text))),['Before','A1','B1','A2','B2','After']);
  assert.equal(out[0].tbl,null);
  assert.deepEqual(JSON.parse(JSON.stringify(out[1].tbl)),{ti:0,ri:0,ci:0,cols:2,gw:[3000,6000]});
  assert.deepEqual(JSON.parse(JSON.stringify(out[4].tbl)),{ti:0,ri:1,ci:1,cols:2,gw:[3000,6000]});
  assert.equal(out[5].tbl,null);
});

test('extractStructured: second table gets ti=1; cell spacing/keep fields still resolve', ()=>{
  const {extractStructured}=ctx;
  const doc=TBL([['X','Y']])+TBL([['Z','W']]);
  const out=extractStructured(doc,{},NUM0);
  assert.equal(out[0].tbl.ti,0);
  assert.equal(out[2].tbl.ti,1);
  assert.equal(out[2].tbl.ri,0);
});

test('tableHtml: rows group into one table, added row becomes its own tr (T10)', ()=>{
  const {tableHtml}=ctx;
  const cell=(type,ti,ri,ci,html,cid)=>({type,cid,ni:type==='deleted'?undefined:1,oi:type==='inserted'?undefined:1,
    html,meta:{tbl:{ti,ri,ci,cols:2},marker:''}});
  const run=[
    cell('equal',0,0,0,'Metric'),cell('equal',0,0,1,'Target'),
    cell('changed',0,1,0,'<del>42</del><ins>45</ins> MW',1),cell('equal',0,1,1,'Sustained'),
    cell('inserted',0,2,0,'<ins>New metric</ins>',2),cell('inserted',0,2,1,'<ins>New target</ins>',3),
  ];
  const html=tableHtml(run,2);
  assert.equal((html.match(/<table class="ctable">/g)||[]).length,1);
  assert.equal((html.match(/<tr>/g)||[]).length,3);
  assert.equal((html.match(/<td>/g)||[]).length,6);
  assert.match(html,/<del>42<\/del><ins>45<\/ins> MW/);
  const lastTr=html.slice(html.lastIndexOf('<tr>'));
  assert.match(lastTr,/<ins>New metric<\/ins>/);
  assert.match(lastTr,/<ins>New target<\/ins>/);
});

test('tableHtml: deleted source row (orig-side meta) renders as its own tr', ()=>{
  const {tableHtml}=ctx;
  const run=[
    {type:'equal',ni:0,oi:0,html:'Keep',meta:{tbl:{ti:0,ri:0,ci:0,cols:2}}},
    {type:'equal',ni:0,oi:0,html:'Keep2',meta:{tbl:{ti:0,ri:0,ci:1,cols:2}}},
    {type:'deleted',oi:1,cid:9,html:'<del>Gone</del>',meta:{tbl:{ti:0,ri:1,ci:0,cols:2}}},
    {type:'deleted',oi:1,cid:9,html:'<del>Gone2</del>',meta:{tbl:{ti:0,ri:1,ci:1,cols:2}}},
  ];
  const html=tableHtml(run,2);
  assert.equal((html.match(/<tr>/g)||[]).length,2);
  assert.match(html,/<del>Gone<\/del>/);
});

test('bodyRowsHtml: tables embed between paragraphs; missing cells pad the grid', ()=>{
  const {bodyRowsHtml}=ctx;
  const P=(text,type)=>({type:type||'equal',ni:0,oi:0,html:text,meta:{marker:''}});
  const C=(ti,ri,ci)=>({type:'equal',ni:0,oi:0,html:'c'+ri+ci,meta:{tbl:{ti,ri,ci,cols:3},marker:''}});
  const rows=[P('Intro'),C(0,0,0),C(0,0,2),P('Outro')];
  const html=bodyRowsHtml(rows);
  assert.match(html,/Intro/);
  assert.equal((html.match(/<td>/g)||[]).length,3); // padded to 3 columns
  assert.ok(html.indexOf('Intro')<html.indexOf('<table'));
  assert.ok(html.indexOf('</table>')<html.indexOf('Outro'));
});

test('integration: compare of docs with a changed cell + added table row', ()=>{
  const {extractStructured,compare,bodyRowsHtml}=ctx;
  const A=extractStructured(CP('Agreement')+TBL([['Metric','42 MW'],['Uptime','99.1%']]),{},NUM0);
  const B=extractStructured(CP('Agreement')+TBL([['Metric','45 MW'],['Uptime','99.1%'],['Latency','200ms']]),{},NUM0);
  const {rows,summary}=compare(A,B,{});
  const html=bodyRowsHtml(rows);
  assert.equal((html.match(/<table class="ctable">/g)||[]).length,1);
  assert.match(html,/<del>42<\/del><ins>45<\/ins> MW/);
  assert.match(html,/<ins>Latency<\/ins>/);
  assert.ok(summary.total>=2);
});

/* ---- native PDF table rendering ---- */
const GEOM={wIn:8.5,hIn:11,mt:1,mr:1,mb:1,ml:1,fontPt:11,font:'Times New Roman'};
const SHOW={ins:true,del:true,mov:true,eq:true};

test('generateRedlinePdf: table rows render as grid blocks with strokes', ()=>{
  const {extractStructured,compare,generateRedlinePdf}=ctx;
  const A=extractStructured(TBL([['Metric','42 MW'],['Uptime','99.1%']]),{},NUM0);
  const B=extractStructured(TBL([['Metric','45 MW'],['Uptime','99.1%'],['Latency','200ms']]),{},NUM0);
  const {rows}=compare(A,B,{});
  const r=generateRedlinePdf({rows,geom:GEOM,show:SHOW,summary:{total:2}});
  assert.equal(r.pages,1);
  assert.match(r.pdf,/0\.72 0\.75 0\.79 RG/);        // table grid strokes present
  assert.match(r.pdf,/\(45 MW\)|\(45\b/);            // cell text drawn
  assert.ok(r.pdf.startsWith('%PDF-1.4'));
});

test('generateRedlinePdf: long tables break BETWEEN rows across pages', ()=>{
  const {extractStructured,compare,generateRedlinePdf}=ctx;
  const rowsXml=Array.from({length:60},(_,i)=>['Row '+i,'Value '+i+' with some longer wrapped text to give the row height']);
  const A=extractStructured(TBL(rowsXml),{},NUM0);
  const {rows}=compare(A,A.map(x=>x),{});
  const r=generateRedlinePdf({rows,geom:GEOM,show:SHOW,summary:{total:0}});
  assert.ok(r.pages>=2,'expected multi-page table, got '+r.pages);
});
