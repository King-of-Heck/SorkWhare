import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './load.mjs';
const ctx=loadApp();
const NUM={numToAbs:{},abs:{},styleToNum:{}};
const DEF={fontPt:11,font:null,spacing:null};
const cell=t=>'<w:tc><w:p><w:r><w:t>'+t+'</w:t></w:r></w:p></w:tc>';
const rowr=cells=>'<w:tr>'+cells.map(cell).join('')+'</w:tr>';
const doc=body=>'<w:document><w:body>'+body+'</w:body></w:document>';

test('A1: ragged table with no tblGrid gets one stable column count', ()=>{
  const {extractStructured}=ctx;
  // rows of 3, 2, 3 cells; NO <w:tblGrid>
  const tbl='<w:tbl>'+rowr(['a','b','c'])+rowr(['d','e'])+rowr(['f','g','h'])+'</w:tbl>';
  const out=extractStructured(doc(tbl),{},NUM,DEF);
  const cols=out.filter(r=>r.tbl).map(r=>r.tbl.cols);
  assert.ok(cols.length>0,'expected table cells');
  assert.deepEqual([...new Set(cols)],[3],'all cells share cols=3 (max over rows)');
});

test('A1 regression: gridded table keeps its tblGrid column count', ()=>{
  const {extractStructured}=ctx;
  const grid='<w:tblGrid><w:gridCol w:w="1000"/><w:gridCol w:w="1000"/></w:tblGrid>';
  const tbl='<w:tbl>'+grid+rowr(['a','b'])+rowr(['c','d'])+'</w:tbl>';
  const out=extractStructured(doc(tbl),{},NUM,DEF);
  assert.deepEqual([...new Set(out.filter(r=>r.tbl).map(r=>r.tbl.cols))],[2]);
});

test('A2: a page break inside a table cell does not leak to the next paragraph', ()=>{
  const {extractStructured}=ctx;
  // Single-cell, single-row table whose only paragraph is an empty page break.
  // Nothing after it inside the table consumes the pending break, so without
  // isolation it would leak onto the following paragraph.
  const brCell='<w:tc><w:p><w:r><w:br w:type="page"/></w:r></w:p></w:tc>';
  const tbl='<w:tbl><w:tr>'+brCell+'</w:tr></w:tbl>';
  const after='<w:p><w:r><w:t>After the table</w:t></w:r></w:p>';
  const out=extractStructured(doc(tbl+after),{},NUM,DEF);
  const afterPara=out.find(r=>!r.tbl&&r.text==='After the table');
  assert.ok(afterPara,'expected the trailing paragraph');
  assert.equal(afterPara.pageBreakBefore,false,'cell-internal break must not escape the table');
});

test('A2: a page break BEFORE a table lands on the table first row, not after it', ()=>{
  const {extractStructured}=ctx;
  const intro='<w:p><w:r><w:t>Intro</w:t></w:r><w:r><w:br w:type="page"/></w:r></w:p>';
  const tbl='<w:tbl><w:tr><w:tc><w:p><w:r><w:t>Cell</w:t></w:r></w:p></w:tc></w:tr></w:tbl>';
  const after='<w:p><w:r><w:t>After</w:t></w:r></w:p>';
  const out=extractStructured(doc(intro+tbl+after),{},NUM,DEF);
  const cell=out.find(r=>r.tbl&&r.text==='Cell');
  const afterPara=out.find(r=>!r.tbl&&r.text==='After');
  assert.ok(cell&&afterPara,'expected the table cell and trailing paragraph');
  assert.equal(cell.pageBreakBefore,true,'break must start the table on a new page');
  assert.equal(afterPara.pageBreakBefore,false,'break must not relocate past the table');
});
