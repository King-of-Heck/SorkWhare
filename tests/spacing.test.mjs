import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './load.mjs';
const ctx=loadApp();

test('_spacingFrom parses before/after/line/lineRule; null when empty', ()=>{
  const {_spacingFrom}=ctx;
  assert.deepEqual(JSON.parse(JSON.stringify(_spacingFrom(' w:before="240" w:after="120" w:line="360" w:lineRule="auto"'))),
    {before:240,after:120,line:360,lineRule:'auto'});
  assert.equal(_spacingFrom(' w:val="20"'),null);       // rPr letter-spacing shape -> not paragraph spacing
  assert.equal(_spacingFrom(''),null);
});

test('parseStyles: spacing + keep flags, basedOn attribute-wise merge, __defaultPara', ()=>{
  const {parseStyles}=ctx;
  const xml='<w:styles>'
    +'<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/>'
    +'<w:pPr><w:spacing w:after="160" w:line="276" w:lineRule="auto"/></w:pPr></w:style>'
    +'<w:style w:type="paragraph" w:styleId="Head"><w:name w:val="Head"/><w:basedOn w:val="Normal"/>'
    +'<w:pPr><w:keepNext/><w:spacing w:before="240"/></w:pPr></w:style>'
    +'<w:style w:type="paragraph" w:styleId="ListPara"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/>'
    +'<w:pPr><w:contextualSpacing/></w:pPr></w:style>'
    +'</w:styles>';
  const m=parseStyles(xml);
  assert.equal(m.__defaultPara,'Normal');
  assert.equal(m.Normal.spacing.after,160);
  assert.equal(m.Normal.spacing.line,276);
  assert.equal(m.Head.keepNext,true);
  assert.equal(m.Head.spacing.before,240);   // own
  assert.equal(m.Head.spacing.after,160);    // inherited attribute-wise from Normal
  assert.equal(m.ListPara.contextualSpacing,true);
  assert.equal(m.Normal.keepNext,false);
});

test('parseStyles: rPr letter-spacing does not pollute paragraph spacing', ()=>{
  const {parseStyles}=ctx;
  const xml='<w:styles><w:style w:type="paragraph" w:styleId="X"><w:name w:val="X"/>'
    +'<w:rPr><w:spacing w:val="20"/></w:rPr></w:style></w:styles>';
  assert.equal(parseStyles(xml).X.spacing,null);
});

test('parseNumbering: level pPr spacing captured', ()=>{
  const {parseNumbering}=ctx;
  const xml='<w:numbering><w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0">'
    +'<w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:start w:val="1"/>'
    +'<w:pPr><w:spacing w:after="60"/></w:pPr></w:lvl></w:abstractNum>'
    +'<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>';
  const n=parseNumbering(xml);
  assert.equal(n.abs[0][0].spacing.after,60);
});

test('parseDocDefaults: pPrDefault spacing captured', ()=>{
  const {parseDocDefaults}=ctx;
  const xml='<w:styles><w:docDefaults><w:pPrDefault><w:pPr>'
    +'<w:spacing w:after="200" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults></w:styles>';
  const d=parseDocDefaults(xml);
  assert.equal(d.spacing.after,200);
  assert.equal(d.spacing.lineRule,'auto');
});

const NUM_EMPTY={numToAbs:{},abs:{},styleToNum:{}};

test('extractStructured: paragraph spacing beats style beats docDefaults, per attribute', ()=>{
  const {extractStructured,parseStyles,parseDocDefaults}=ctx;
  const styles=parseStyles('<w:styles>'
    +'<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/>'
    +'<w:pPr><w:spacing w:after="160" w:line="276" w:lineRule="auto"/></w:pPr></w:style></w:styles>');
  const dd=parseDocDefaults('<w:styles><w:docDefaults><w:pPrDefault><w:pPr>'
    +'<w:spacing w:before="100"/></w:pPr></w:pPrDefault></w:docDefaults></w:styles>');
  const doc='<w:p><w:pPr><w:spacing w:after="240"/></w:pPr><w:r><w:t>x</w:t></w:r></w:p>';
  const out=extractStructured(doc,styles,NUM_EMPTY,dd);
  assert.equal(out[0].spaceAfterPt,12);        // paragraph 240tw wins
  assert.equal(out[0].lineSpacing,276/240);    // from default style (no pStyle -> Normal)
  assert.equal(out[0].spaceBeforePt,5);        // docDefaults 100tw
});

test('extractStructured: lineRule exact/atLeast -> lineExactPt; auto -> lineSpacing', ()=>{
  const {extractStructured}=ctx;
  const mk=lr=>'<w:p><w:pPr><w:spacing w:line="480" w:lineRule="'+lr+'"/></w:pPr><w:r><w:t>x</w:t></w:r></w:p>';
  let out=extractStructured(mk('exact'),{},NUM_EMPTY);
  assert.equal(out[0].lineExactPt,24); assert.equal(out[0].lineRule,'exact'); assert.equal(out[0].lineSpacing,null);
  out=extractStructured(mk('atLeast'),{},NUM_EMPTY);
  assert.equal(out[0].lineExactPt,24); assert.equal(out[0].lineRule,'atLeast');
  out=extractStructured(mk('auto'),{},NUM_EMPTY);
  assert.equal(out[0].lineSpacing,2); assert.equal(out[0].lineExactPt,null);
});

test('extractStructured: keep flags + contextualSpacing + styleId from pPr and style', ()=>{
  const {extractStructured,parseStyles}=ctx;
  const styles=parseStyles('<w:styles><w:style w:type="paragraph" w:styleId="H"><w:name w:val="H"/>'
    +'<w:pPr><w:keepNext/></w:pPr></w:style></w:styles>');
  const doc='<w:p><w:pPr><w:pStyle w:val="H"/></w:pPr><w:r><w:t>head</w:t></w:r></w:p>'
    +'<w:p><w:pPr><w:keepLines/><w:contextualSpacing/></w:pPr><w:r><w:t>body</w:t></w:r></w:p>';
  const out=extractStructured(doc,styles,NUM_EMPTY);
  assert.equal(out[0].keepNext,true); assert.equal(out[0].styleId,'H');
  assert.equal(out[1].keepLines,true); assert.equal(out[1].contextualSpacing,true);
  assert.equal(out[1].keepNext,false);
});

test('extractStructured: absent spacing stays null (v1.1.5 default preserved downstream)', ()=>{
  const {extractStructured}=ctx;
  const out=extractStructured('<w:p><w:r><w:t>x</w:t></w:r></w:p>',{},NUM_EMPTY);
  assert.equal(out[0].spaceBeforePt,null); assert.equal(out[0].spaceAfterPt,null);
  assert.equal(out[0].lineSpacing,null); assert.equal(out[0].lineExactPt,null);
});
