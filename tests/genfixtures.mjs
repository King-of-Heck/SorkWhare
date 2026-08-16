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

// --- notes-A/notes-B: a COMPLETE, openable .docx pair exercising footnote +
// endnote comparison end to end (v1.6.0). Unlike the minimal fixtures above
// (document.xml only — the app's parser looks up parts by fixed zip-entry
// name and doesn't need Content_Types/rels), these carry the full part set a
// real Word package would: [Content_Types].xml overrides + a top-level and a
// word/-level rels file wiring footnotes.xml/endnotes.xml as real relationships.
const notesContentTypes=
'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
'<Default Extension="xml" ContentType="application/xml"/>'+
'<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'+
'<Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/>'+
'<Override PartName="/word/endnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml"/>'+
'</Types>';
const notesRootRels=
'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'+
'</Relationships>';
const notesDocRels=
'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes" Target="footnotes.xml"/>'+
'<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/endnotes" Target="endnotes.xml"/>'+
'</Relationships>';
// Plain paragraph, and paragraphs carrying a footnote/endnote reference run
// (real Word tags the reference run with the FootnoteReference/EndnoteReference
// character style; the app's regex only cares about the <w:footnoteReference>/
// <w:endnoteReference> element + w:id, but we include the rStyle for realism).
const notesP=t=>'<w:p><w:r><w:t>'+t+'</w:t></w:r></w:p>';
const notesPFn=(t,id)=>'<w:p><w:r><w:t>'+t+'</w:t></w:r><w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteReference w:id="'+id+'"/></w:r></w:p>';
const notesPEn=(t,id)=>'<w:p><w:r><w:t>'+t+'</w:t></w:r><w:r><w:rPr><w:rStyle w:val="EndnoteReference"/></w:rPr><w:endnoteReference w:id="'+id+'"/></w:r></w:p>';
// notes-A: footnote 1 + footnote 2 referenced (para 2/3), endnote 1 referenced
// (para 5). notes-B adds a footnote 3 reference (para 6) — an INSERTED note —
// and otherwise keeps the same paragraphs so the docs pair at the paragraph level.
const notesBodyA=[
  notesP('Agreement between the parties.'),
  notesPFn('1. The Supplier shall deliver the goods on time.',1),
  notesPFn('2. Payment is due within thirty days of invoice.',2),
  notesP('3. This clause remains unchanged between versions.'),
  notesPEn('4. Liability is limited to the fees paid in the preceding twelve months.',1),
  notesP('5. Confidentiality obligations survive termination.'),
  notesP('6. Notices shall be delivered in writing to the addresses above.'),
  notesP('7. This agreement is governed by the laws of the State.'),
  notesP('8. Either party may terminate for material breach.'),
  notesP('9. No waiver shall be implied from a delay in enforcement.'),
  notesP('10. The parties acknowledge they have read and understood this agreement.'),
  notesP('Signed and dated as of the effective date.'),
];
const notesBodyB=notesBodyA.slice();
notesBodyB[5]=notesPFn('5. Confidentiality obligations survive termination.',3); // insert footnote 3 reference
const notesDocA='<?xml version="1.0"?><w:document><w:body>'+notesBodyA.join('')+'</w:body></w:document>';
const notesDocB='<?xml version="1.0"?><w:document><w:body>'+notesBodyB.join('')+'</w:body></w:document>';
// Reserved separator/continuationSeparator entries (id -1 / 0), as real Word
// footnotes.xml/endnotes.xml always include, then the real note content.
// footnote 1: unchanged text (equal-note path). footnote 2: text EDITED in B.
// footnote 3: present ONLY in B (inserted note). endnote 1: text EDITED in B.
const fnSeparators=
  '<w:footnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:footnote>'+
  '<w:footnote w:type="continuationSeparator" w:id="0"><w:p><w:r><w:continuationSeparator/></w:r></w:p></w:footnote>';
const enSeparators=
  '<w:endnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:endnote>'+
  '<w:endnote w:type="continuationSeparator" w:id="0"><w:p><w:r><w:continuationSeparator/></w:r></w:p></w:endnote>';
const fnEntry=(id,t)=>'<w:footnote w:id="'+id+'"><w:p><w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteRef/></w:r><w:r><w:t xml:space="preserve"> '+t+'</w:t></w:r></w:p></w:footnote>';
const enEntry=(id,t)=>'<w:endnote w:id="'+id+'"><w:p><w:r><w:rPr><w:rStyle w:val="EndnoteReference"/></w:rPr><w:endnoteRef/></w:r><w:r><w:t xml:space="preserve"> '+t+'</w:t></w:r></w:p></w:endnote>';
const footnotesA='<?xml version="1.0"?><w:footnotes>'+fnSeparators+
  fnEntry(1,'See Section 2 for further details on delivery timing.')+
  fnEntry(2,'Thirty days is measured from the invoice date, not the delivery date.')+
  '</w:footnotes>';
const footnotesB='<?xml version="1.0"?><w:footnotes>'+fnSeparators+
  fnEntry(1,'See Section 2 for further details on delivery timing.')+ // unchanged
  fnEntry(2,'Forty-five days is measured from the invoice date, not the delivery date.')+ // edited
  fnEntry(3,'This obligation survives termination of the agreement.')+ // inserted
  '</w:footnotes>';
const endnotesA='<?xml version="1.0"?><w:endnotes>'+enSeparators+
  enEntry(1,'Fees means all amounts invoiced under this agreement, excluding taxes.')+
  '</w:endnotes>';
const endnotesB='<?xml version="1.0"?><w:endnotes>'+enSeparators+
  enEntry(1,'Fees means all amounts invoiced under this agreement, excluding taxes and shipping costs.')+ // edited
  '</w:endnotes>';
writeFileSync(new URL('./fixtures/notes-A.docx',import.meta.url),makeDocx({
  '[Content_Types].xml':notesContentTypes,
  '_rels/.rels':notesRootRels,
  'word/document.xml':notesDocA,
  'word/_rels/document.xml.rels':notesDocRels,
  'word/footnotes.xml':footnotesA,
  'word/endnotes.xml':endnotesA,
}));
writeFileSync(new URL('./fixtures/notes-B.docx',import.meta.url),makeDocx({
  '[Content_Types].xml':notesContentTypes,
  '_rels/.rels':notesRootRels,
  'word/document.xml':notesDocB,
  'word/_rels/document.xml.rels':notesDocRels,
  'word/footnotes.xml':footnotesB,
  'word/endnotes.xml':endnotesB,
}));

console.log('fixtures written');
