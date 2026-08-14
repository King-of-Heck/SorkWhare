// Writes rubric fixture .docx pairs into git-ignored tests/fixtures/.
// Run: node tests/gentorture.mjs
import {mkdirSync,writeFileSync} from 'node:fs';
import {makeDocx} from './makedocx.mjs';

const dir=new URL('./fixtures/',import.meta.url);
mkdirSync(dir,{recursive:true});
const doc=body=>'<w:document><w:body>'+body+'</w:body></w:document>';
const P=(runs)=>'<w:p>'+runs+'</w:p>';
const R=(t,bold)=>'<w:r>'+(bold?'<w:rPr><w:b/></w:rPr>':'')+'<w:t xml:space="preserve">'+t+'</w:t></w:r>';
const write=(name,body)=>writeFileSync(new URL(name,dir),makeDocx({'word/document.xml':doc(body)}));

// R1 formatting-only: identical text, "faith" bolded in B
write('torture-R1-A.docx',P(R('The parties act in good faith always.',false)));
write('torture-R1-B.docx',P(R('The parties act in good ',false)+R('faith',true)+R(' always.',false)));

// R3 list renumber: three numbered items; B inserts a new item 2 (numbering shifts)
const item=t=>P('<w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>'+R(t,false));
write('torture-R3-A.docx',item('First obligation.')+item('Second obligation.')+item('Third obligation.'));
write('torture-R3-B.docx',item('First obligation.')+item('New inserted obligation.')+item('Second obligation.')+item('Third obligation.'));

// R6 categorization: one doc pair exercising insert + delete + move + formatting together
const many='This clause has enough distinct words to qualify as a move under the rule.';
write('torture-R6-A.docx',P(R(many,false))+P(R('Clause to be deleted entirely.',false))+P(R('Alpha stays.',false))+P(R('Beta stays.',false))+P(R('Gamma stays.',false)));
write('torture-R6-B.docx',P(R('Alpha stays.',false))+P(R('Beta stays.',false))+P(R('Gamma stays.',false))+P(R('A brand new inserted clause here.',false))+P(R(many,false)));

console.log('wrote torture rubric fixtures to tests/fixtures/');
