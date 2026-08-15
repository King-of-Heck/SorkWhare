import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function stubEl(){
  const el={
    addEventListener(){}, appendChild(){}, insertBefore(){}, remove(){}, click(){},
    setAttribute(){}, removeAttribute(){}, scrollIntoView(){},
    classList:{add(){},remove(){},toggle(){},contains(){return false;}},
    style:{cssText:''}, dataset:{}, children:[],
    textContent:'', innerHTML:'', value:'', checked:false, disabled:false,
    querySelectorAll(){return [];},
  };
  return el;
}

export function loadApp(file='SorkWhare 1.4.1.html'){
  const html=readFileSync(new URL('../'+file, import.meta.url),'utf8');
  const m=html.match(/<script>([\s\S]*)<\/script>/);
  if(!m) throw new Error('no <script> block found in '+file);
  const document={
    getElementById:()=>stubEl(), createElement:()=>stubEl(),
    addEventListener(){}, querySelectorAll(){return [];},
    querySelector(){return null;}, body:stubEl(),
  };
  const ctx={
    document, window:{addEventListener(){}},
    TextDecoder, TextEncoder, Blob, Response, DecompressionStream, URL,
    console, setTimeout, clearTimeout, Date, Math, JSON,
    requestAnimationFrame(){}, getComputedStyle:()=>({marginTop:'0',marginBottom:'0'}),
  };
  ctx.globalThis=ctx;
  vm.createContext(ctx);
  vm.runInContext(m[1], ctx);
  ctx.__html=html;
  return ctx;
}
