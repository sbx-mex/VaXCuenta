import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {prepare,selectStores,aggregate,groupRows} from '../model.mjs';
import {buildXLSX,exportFilename} from '../xlsx-export.mjs';
import {buildPDF} from '../pdf-export.mjs';

const data=JSON.parse(await readFile(new URL('./fixtures/baseline-2026-10-11.json',import.meta.url)));
const current=JSON.parse(await readFile(new URL('../data/dashboard.json',import.meta.url)));
globalThis.self=globalThis;
const prepared=prepare(data),state={view:'store',period:'40',store:'38101'},rows=groupRows(selectStores(prepared,state),'store'),total=aggregate(rows);
const context={title:'Angel',meta:'1 tienda · Semana 40 · 1 oct–4 oct',periodNote:'Semana 40: real del 1 al 4 de octubre y objetivo semanal completo.',dailyNote:'Donativos diarios de la semana 40.'};
function unzip(bytes){
  const files=new Map(),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),decode=new TextDecoder();let position=0;
  while(view.getUint32(position,true)===0x04034b50){
    assert.equal(view.getUint16(position+8,true),0);
    const size=view.getUint32(position+18,true),nameSize=view.getUint16(position+26,true),extra=view.getUint16(position+28,true),start=position+30;
    files.set(decode.decode(bytes.slice(start,start+nameSize)),decode.decode(bytes.slice(start+nameSize+extra,start+nameSize+extra+size)));
    position=start+nameSize+extra+size;
  }
  assert.equal(view.getUint32(position,true),0x02014b50);return files;
}
test('Excel opens in Campaña, has eight auditable sheets and typed financial formulas',()=>{
  const zip=unzip(buildXLSX(rows,total,data,state,context,rows)),book=zip.get('xl/workbook.xml');
  for(const name of ['Campaña','Resumen','Validación','Tiendas','Real diario','Metas','Real campaña','Metas campaña'])assert.ok(book.includes(`name="${name}"`));
  const summary=zip.get('xl/worksheets/sheet2.xml');
  assert.match(summary,/<c r="A8" s="10"><f>SUM\(&apos;Tiendas&apos;!F\$6:F\$6\)<\/f><v>430<\/v>/);
  assert.match(summary,/<c r="C8" s="10"><f>SUM\(&apos;Tiendas&apos;!G\$6:G\$6\)<\/f><v>1610<\/v>/);
  assert.match(summary,/<c r="E8" s="11"><f>IF\(C8&gt;0,A8\/C8,0\)<\/f>/);
  const detail=zip.get('xl/worksheets/sheet4.xml');
  assert.match(detail,/<c r="J6" s="5"><v>23<\/v>/);assert.match(detail,/<c r="F6" s="3"><f>SUMIF/);assert.match(detail,/<c r="G6" s="3"><f>SUMIF/);
});
test('Excel scopes raw dates and preserves the full week 40 target for four campaign days',()=>{
  const zip=unzip(buildXLSX(rows,total,data,state,context,rows)),raw=zip.get('xl/worksheets/sheet5.xml'),goals=zip.get('xl/worksheets/sheet6.xml');
  assert.equal((raw.match(/<row /g)||[]).length,9);assert.ok(raw.includes('38101'));assert.ok(!raw.includes('38106'));
  assert.match(raw,/<c r="B6" s="7"><v>\d+<\/v>/);
  assert.match(goals,/<c r="F6" s="9"><v>7<\/v>/);assert.match(goals,/<c r="G6" s="3"><f>ROUND\(E6\*F6\/7,2\)<\/f><v>1610<\/v>/);
});
test('Excel validation reconciles original data and detail with explicit OK and differences',()=>{
  const zip=unzip(buildXLSX(rows,total,data,state,context,rows)),audit=zip.get('xl/worksheets/sheet3.xml');
  assert.equal((audit.match(/<v>OK<\/v>/g)||[]).length,12);
  assert.match(audit,/conditionalFormatting sqref="E9:E20"/);
  assert.match(audit,/<c r="D9" s="3"><f>ROUND\(C9-B9,2\)<\/f><v>0<\/v>/);
  assert.match(audit,/<c r="E9" s="6" t="str"><f>IF\(D9=0,&quot;OK&quot;,&quot;REVISAR&quot;\)<\/f><v>OK<\/v>/);
});
test('text names remain literal and XML-safe without injected formulas',()=>{
  const changed=[{...rows[0],name:'=HYPERLINK("bad") & <script>'}],zip=unzip(buildXLSX(changed,total,data,state,context,changed));
  const sheet=zip.get('xl/worksheets/sheet4.xml');
  assert.ok(sheet.includes('=HYPERLINK(&quot;bad&quot;) &amp; &lt;script&gt;'));assert.match(sheet,/<c r="B6" t="inlineStr">/);assert.ok(!sheet.includes('<f>=HYPERLINK'));
});
test('filename distinguishes week from latest source cutoff',()=>{
  assert.equal(exportFilename(data,{...state,region:'Centro Norte'},{title:'Centro Norte'},'xlsx'),'VaXCuenta_Centro_Norte_Semana_40_corte_2026-10-11.xlsx');
});
test('default PDF is a true PDF with a scoped title and landscape pages',async()=>{
  const bytes=await buildPDF(rows,total,data,state,context,{logoBytes:await readFile(new URL('../assets/campaign-frame.png',import.meta.url))});
  assert.equal(new TextDecoder().decode(bytes.slice(0,5)),'%PDF-');
  const loaded=await globalThis.PDFLib.PDFDocument.load(bytes);
  assert.match(loaded.getTitle(),/38101.*Angel.*Semana 40.*Resumen/);assert.equal(loaded.getPageCount(),1);assert.deepEqual(loaded.getPage(0).getSize(),{width:792,height:612});
  const {PDFName,PDFDict}=globalThis.PDFLib;
  const fonts=loaded.getPage(0).node.Resources().lookup(PDFName.of('Font'),PDFDict);
  for(const [,reference] of fonts.entries()){
    const dictionary=loaded.context.lookup(reference,PDFDict),descriptor=dictionary.lookup(PDFName.of('FontDescriptor'),PDFDict);
    assert.ok(descriptor.has(PDFName.of('FontFile3')),'La fuente debe viajar embebida en el PDF.');
    assert.ok(dictionary.has(PDFName.of('Widths')),'La fuente debe incluir las métricas de sus caracteres.');
  }
});
test('Centro Norte PDF starts with a compact DM summary independent of screen grouping',async()=>{
  const s={view:'store',region:'Centro Norte',period:'40'},stores=selectStores(prepare(current),s),t=aggregate(stores),ctx={...context,title:'Centro Norte'};
  assert.ok(stores.length>0);assert.ok(t.targetCents>0);
  const bytes=await buildPDF(groupRows(stores,'store'),t,current,s,ctx,{storeRows:stores});
  const loaded=await globalThis.PDFLib.PDFDocument.load(bytes);assert.ok(loaded.getPageCount()<=2);assert.match(loaded.getTitle(),/Resumen/);
});
test('optional detailed PDF paginates all current directory stores after its executive summary',async()=>{
  const s={view:'region',region:'Centro Norte',period:'40'},stores=selectStores(prepare(current),s),t=aggregate(stores);
  const bytes=await buildPDF(groupRows(stores,'region'),t,current,s,{...context,title:'Centro Norte'},{mode:'detail',storeRows:stores});
  const loaded=await globalThis.PDFLib.PDFDocument.load(bytes);assert.ok(loaded.getPageCount()>1);assert.match(loaded.getTitle(),/Detalle/);
});
