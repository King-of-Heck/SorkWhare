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
