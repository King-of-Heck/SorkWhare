import {writeFileSync,mkdirSync} from 'node:fs';
import {makeDocx} from './makedocx.mjs';
mkdirSync(new URL('./fixtures/',import.meta.url),{recursive:true});
const body=ps=>'<?xml version="1.0"?><w:document><w:body>'+ps.map(t=>'<w:p><w:r><w:t>'+t+'</w:t></w:r></w:p>').join('')+'</w:body></w:document>';
const A=body(['Agreement between the parties','1. The Supplier shall deliver the goods on time.','2. Payment is due within thirty days of invoice.','3. This clause will be deleted in the revision.','4. Liability is limited to the fees paid in the preceding twelve months.']);
const B=body(['Agreement between the parties','1. The Supplier shall deliver the goods promptly.','2. Payment is due within forty-five days of invoice.','4. Liability is limited to the fees paid in the preceding twelve months.','5. A brand new confidentiality clause is added here.']);
writeFileSync(new URL('./fixtures/fixtureA.docx',import.meta.url),makeDocx({'word/document.xml':A}));
writeFileSync(new URL('./fixtures/fixtureB.docx',import.meta.url),makeDocx({'word/document.xml':B}));

// --- spacingA/spacingB: Calibri docDefaults + Head/Body styles + assorted
// w:spacing variants (before/after, line=480 auto, line=480 exact) + one
// contextualSpacing list run, ~40 paragraphs, one changed sentence between
// A and B. Exercises the v1.2.0 real-font / spacing / page-break pipeline.
const spacingStyles=
'<?xml version="1.0"?><w:styles>'+
'<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>'+
'<w:style w:type="paragraph" w:styleId="Head"><w:name w:val="Head"/>'+
'<w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/></w:pPr>'+
'<w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style>'+
'<w:style w:type="paragraph" w:styleId="Body"><w:name w:val="Body"/>'+
'<w:pPr><w:spacing w:before="0" w:after="160" w:line="276" w:lineRule="auto"/></w:pPr></w:style>'+
'</w:styles>';
const headP=t=>'<w:p><w:pPr><w:pStyle w:val="Head"/></w:pPr><w:r><w:t>'+t+'</w:t></w:r></w:p>';
const bodyP=t=>'<w:p><w:pPr><w:pStyle w:val="Body"/></w:pPr><w:r><w:t>'+t+'</w:t></w:r></w:p>';
// Explicit w:spacing variants layered on top of the Body style: paragraph-level
// before/after, line=480 lineRule="auto", and line=480 lineRule="exact".
const spacedBeforeAfterP=t=>'<w:p><w:pPr><w:pStyle w:val="Body"/><w:spacing w:before="360" w:after="360"/></w:pPr><w:r><w:t>'+t+'</w:t></w:r></w:p>';
const spacedLineAutoP=t=>'<w:p><w:pPr><w:pStyle w:val="Body"/><w:spacing w:line="480" w:lineRule="auto"/></w:pPr><w:r><w:t>'+t+'</w:t></w:r></w:p>';
const spacedLineExactP=t=>'<w:p><w:pPr><w:pStyle w:val="Body"/><w:spacing w:line="480" w:lineRule="exact"/></w:pPr><w:r><w:t>'+t+'</w:t></w:r></w:p>';
// One contextualSpacing list run: three consecutive Body paragraphs with
// contextualSpacing on, so the gap between them collapses to zero.
const listP=t=>'<w:p><w:pPr><w:pStyle w:val="Body"/><w:contextualSpacing/></w:pPr><w:r><w:t>'+t+'</w:t></w:r></w:p>';

function spacingParas(changedSentence){
  const ps=[];
  ps.push(headP('Section 1: Scope of Work'));
  for(let i=1;i<=8;i++)ps.push(bodyP('Body paragraph '+i+' describes routine contract language of no particular consequence.'));
  ps.push(spacedBeforeAfterP('This paragraph carries explicit before/after spacing of 18pt each.'));
  ps.push(spacedBeforeAfterP('A second before/after-spaced paragraph follows immediately.'));
  ps.push(headP('Section 2: Delivery Terms'));
  for(let i=1;i<=6;i++)ps.push(bodyP('Delivery clause '+i+' sets out routine shipping and acceptance terms.'));
  ps.push(spacedLineAutoP('This paragraph uses line spacing 480 with lineRule auto (double-spaced).'));
  ps.push(spacedLineAutoP('A second auto-line-spaced paragraph follows for contrast.'));
  ps.push(headP('Section 3: List of Deliverables'));
  ps.push(listP('Deliverable item one, tightly spaced via contextualSpacing.'));
  ps.push(listP('Deliverable item two, tightly spaced via contextualSpacing.'));
  ps.push(listP('Deliverable item three, tightly spaced via contextualSpacing.'));
  ps.push(headP('Section 4: Exact Line Spacing'));
  ps.push(spacedLineExactP('This paragraph uses line spacing 480 with lineRule exact.'));
  ps.push(spacedLineExactP('A second exact-line-spaced paragraph follows for contrast.'));
  ps.push(headP('Section 5: Payment'));
  for(let i=1;i<=10;i++)ps.push(bodyP('Payment clause '+i+' covers routine invoicing and remittance detail.'));
  ps.push(bodyP(changedSentence));
  for(let i=11;i<=14;i++)ps.push(bodyP('Payment clause '+i+' covers routine invoicing and remittance detail.'));
  return ps.join('');
}
const spacingDocA='<?xml version="1.0"?><w:document><w:body>'+
  spacingParas('Payment is due within thirty days of invoice, in immediately available funds.')+
  '</w:body></w:document>';
const spacingDocB='<?xml version="1.0"?><w:document><w:body>'+
  spacingParas('Payment is due within forty-five days of invoice, in immediately available funds.')+
  '</w:body></w:document>';
writeFileSync(new URL('./fixtures/spacingA.docx',import.meta.url),makeDocx({'word/document.xml':spacingDocA,'word/styles.xml':spacingStyles}));
writeFileSync(new URL('./fixtures/spacingB.docx',import.meta.url),makeDocx({'word/document.xml':spacingDocB,'word/styles.xml':spacingStyles}));

console.log('fixtures written');
