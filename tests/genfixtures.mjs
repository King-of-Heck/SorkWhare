import {writeFileSync,mkdirSync} from 'node:fs';
import {makeDocx} from './makedocx.mjs';
mkdirSync(new URL('./fixtures/',import.meta.url),{recursive:true});
const body=ps=>'<?xml version="1.0"?><w:document><w:body>'+ps.map(t=>'<w:p><w:r><w:t>'+t+'</w:t></w:r></w:p>').join('')+'</w:body></w:document>';
const A=body(['Agreement between the parties','1. The Supplier shall deliver the goods on time.','2. Payment is due within thirty days of invoice.','3. This clause will be deleted in the revision.','4. Liability is limited to the fees paid in the preceding twelve months.']);
const B=body(['Agreement between the parties','1. The Supplier shall deliver the goods promptly.','2. Payment is due within forty-five days of invoice.','4. Liability is limited to the fees paid in the preceding twelve months.','5. A brand new confidentiality clause is added here.']);
writeFileSync(new URL('./fixtures/fixtureA.docx',import.meta.url),makeDocx({'word/document.xml':A}));
writeFileSync(new URL('./fixtures/fixtureB.docx',import.meta.url),makeDocx({'word/document.xml':B}));
console.log('fixtures written');
