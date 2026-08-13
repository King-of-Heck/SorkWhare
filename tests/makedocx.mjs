// Minimal ZIP writer: STORED entries only (the app's reader supports method 0).
const CRC_T=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;
  for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c;}return t;})();
function crc32(buf){let c=0xFFFFFFFF;for(let i=0;i<buf.length;i++)c=CRC_T[(c^buf[i])&0xFF]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
const u16=v=>Buffer.from([v&255,(v>>8)&255]);
const u32=v=>Buffer.from([v&255,(v>>8)&255,(v>>16)&255,(v>>>24)&255]);

export function makeDocx(entries){
  const locals=[],centrals=[];let off=0;
  for(const[name,text]of Object.entries(entries)){
    const nb=Buffer.from(name,'utf8'),db=Buffer.from(text,'utf8'),crc=crc32(db);
    const local=Buffer.concat([u32(0x04034b50),u16(20),u16(0),u16(0),u16(0),u16(0),
      u32(crc),u32(db.length),u32(db.length),u16(nb.length),u16(0),nb,db]);
    centrals.push(Buffer.concat([u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),
      u32(crc),u32(db.length),u32(db.length),u16(nb.length),u16(0),u16(0),u16(0),u16(0),
      u32(0),u32(off),nb]));
    locals.push(local);off+=local.length;
  }
  const cd=Buffer.concat(centrals),n=centrals.length;
  const eocd=Buffer.concat([u32(0x06054b50),u16(0),u16(0),u16(n),u16(n),u32(cd.length),u32(off),u16(0)]);
  return Buffer.concat([...locals,cd,eocd]);
}
export const MINIMAL_DOC='<?xml version="1.0"?><w:document><w:body><w:p><w:r><w:t>Hello world</w:t></w:r></w:p></w:body></w:document>';
