/* Exportador OOXML de la app: valores tipados, fórmulas de resumen y ZIP estándar. */
import {formatDate} from './model.mjs';
import {buildReport} from './report.mjs';
const xml=value=>String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const encoder=new TextEncoder();
function column(index){let result='';for(index++;index;index=Math.floor((index-1)/26))result=String.fromCharCode(65+(index-1)%26)+result;return result;}
const numeric=(value,style=9)=>({value,style});
const formula=(text,value,style=typeof value==='number'?9:0)=>({formula:text,value,style});
function cell(item,row,col){
  const c=item&&typeof item==='object'?item:{value:item};
  const address=column(col)+row,s=c.style?` s="${c.style}"`:'';
  if(c.value===null||c.value===undefined)return `<c r="${address}"${s}/>`;
  if(c.formula)return `<c r="${address}"${s}${typeof c.value==='string'?' t="str"':''}><f>${xml(c.formula)}</f><v>${typeof c.value==='string'?xml(c.value):Number(c.value)}</v></c>`;
  if(typeof c.value==='number'){
    if(!Number.isFinite(c.value))throw new Error('La consulta contiene un número no válido.');
    return `<c r="${address}"${s}><v>${c.value}</v></c>`;
  }
  // Los nombres siempre son texto: =, + o @ no se convierten en fórmulas.
  return `<c r="${address}"${s} t="inlineStr"><is><t xml:space="preserve">${xml(c.value)}</t></is></c>`;
}
const CRC_TABLE=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc(bytes){let n=0xffffffff;for(const byte of bytes)n=CRC_TABLE[(n^byte)&255]^(n>>>8);return (n^0xffffffff)>>>0;}
function header(length){const bytes=new Uint8Array(length),view=new DataView(bytes.buffer);return {bytes,word:(at,n)=>view.setUint16(at,n,true),long:(at,n)=>view.setUint32(at,n,true)};}
function zip(entries){
  const parts=[],directory=[];let offset=0;
  for(const [name,content] of entries){
    const nameBytes=encoder.encode(name),bytes=encoder.encode(content),checksum=crc(bytes);
    const local=header(30);local.long(0,0x04034b50);local.word(4,20);local.word(6,0x0800);local.word(12,33);local.long(14,checksum);local.long(18,bytes.length);local.long(22,bytes.length);local.word(26,nameBytes.length);
    parts.push(local.bytes,nameBytes,bytes);
    const central=header(46);central.long(0,0x02014b50);central.word(4,20);central.word(6,20);central.word(8,0x0800);central.word(14,33);central.long(16,checksum);central.long(20,bytes.length);central.long(24,bytes.length);central.word(28,nameBytes.length);central.long(42,offset);
    directory.push(central.bytes,nameBytes);offset+=30+nameBytes.length+bytes.length;
  }
  const centralSize=directory.reduce((sum,p)=>sum+p.length,0),end=header(22);
  end.long(0,0x06054b50);end.word(8,entries.length);end.word(10,entries.length);end.long(12,centralSize);end.long(16,offset);
  const output=new Uint8Array(offset+centralSize+22);let position=0;
  for(const part of [...parts,...directory,end.bytes]){output.set(part,position);position+=part.length;}
  return output;
}
const styles=`<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="4"><numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0.00"/><numFmt numFmtId="165" formatCode="0.0%"/><numFmt numFmtId="166" formatCode="#,##0.00"/><numFmt numFmtId="167" formatCode="dd/mm/yyyy"/></numFmts><fonts count="5"><font><sz val="11"/><color rgb="FF193B32"/><name val="Arial"/></font><font><b/><sz val="18"/><color rgb="FF006241"/><name val="Arial"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font><font><b/><sz val="11"/><color rgb="FF006241"/><name val="Arial"/></font><font><b/><sz val="16"/><color rgb="FF006241"/><name val="Arial"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF006241"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEDF4E8"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="12"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"><alignment vertical="center" horizontal="left" indent="1" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0"><alignment vertical="center" horizontal="left" indent="1" wrapText="1"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"><alignment vertical="center" horizontal="right" indent="1"/></xf><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"><alignment vertical="center" horizontal="right" indent="1"/></xf><xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"><alignment vertical="center" horizontal="right" indent="1"/></xf><xf numFmtId="0" fontId="3" fillId="3" borderId="0" xfId="0"/><xf numFmtId="167" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"><alignment vertical="center" horizontal="right" indent="1"/></xf><xf numFmtId="164" fontId="3" fillId="3" borderId="0" xfId="0" applyNumberFormat="1"><alignment vertical="center" horizontal="right" indent="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"><alignment vertical="center" horizontal="right" indent="1"/></xf><xf numFmtId="164" fontId="4" fillId="3" borderId="0" xfId="0" applyNumberFormat="1"><alignment vertical="center" horizontal="right" indent="1"/></xf><xf numFmtId="165" fontId="4" fillId="3" borderId="0" xfId="0" applyNumberFormat="1"><alignment vertical="center" horizontal="right" indent="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="1"><dxf><font><b/><color rgb="FFAF4815"/></font><fill><patternFill patternType="solid"><fgColor rgb="FFFFF0E3"/><bgColor indexed="64"/></patternFill></fill></dxf></dxfs></styleSheet>`;
function worksheet(sheet){
  const rows=sheet.rows.map((items,i)=>`<row r="${i+1}" ht="${sheet.heights?.[i+1]??(i===0?30:i===sheet.header-1?36:26)}" customHeight="1">${items.map((value,col)=>cell(value,i+1,col)).join('')}</row>`).join('');
  const count=Math.max(...sheet.rows.map(row=>row.length)),last=column(count-1);
  const pane=sheet.header?`<pane ySplit="${sheet.header}" topLeftCell="A${sheet.header+1}" activePane="bottomLeft" state="frozen"/>`:'';
  const merges=sheet.merges?.length?`<mergeCells count="${sheet.merges.length}">${sheet.merges.map(ref=>`<mergeCell ref="${ref}"/>`).join('')}</mergeCells>`:'';
  return `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${last}${sheet.rows.length}"/><sheetViews><sheetView showGridLines="0" workbookViewId="0">${pane}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="26"/><cols>${sheet.widths.map((width,i)=>`<col min="${i+1}" max="${i+1}" width="${width}" customWidth="1"/>`).join('')}</cols><sheetData>${rows}</sheetData>${sheet.header?`<autoFilter ref="A${sheet.header}:${last}${sheet.dataEnd}"/>`:''}${merges}${sheet.statusRange?`<conditionalFormatting sqref="${sheet.statusRange}"><cfRule type="expression" dxfId="0" priority="1"><formula>E9=&quot;REVISAR&quot;</formula></cfRule></conditionalFormatting>`:''}<pageMargins left="0.35" right="0.35" top="0.45" bottom="0.45" header="0.2" footer="0.2"/><pageSetup paperSize="1" orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
}
export function exportFilename(data,state,context,extension){
  const scope=String(context.title||state.region||'Nacional').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,80);
  return `VaXCuenta_${scope}_${state.period==='all'?'Acumulado':'Semana_'+state.period}_corte_${data.cutoff}.${extension}`;
}
export function buildXLSX(rows,total,data,state,context,storeRows){
  const report=buildReport(rows,total,data,state,context,storeRows),stores=report.stores;
  const window=report.window,title=value=>({value,style:1}),head=value=>({value,style:2});
  const lookup=new Map(stores.map(row=>[row.ceco,row]));
  const last=5+stores.length,rawLast=Math.max(6,5+report.actuals.length),targetLast=Math.max(6,5+report.targets.length);
  const storeRange=col=>`'Tiendas'!${col}$6:${col}$${Math.max(6,last)}`;
  const rawRange=col=>`'Real diario'!${col}$6:${col}$${rawLast}`;
  const targetRange=col=>`'Metas'!${col}$6:${col}$${targetLast}`;
  const realFormula=`SUM(${storeRange('F')})`,goalFormula=`SUM(${storeRange('G')})`;
  const metadata=`${report.period} · Real: ${report.dates}`;
  const cutoff=`Información del archivo al ${formatDate(data.cutoff,true)}${report.search?' · Búsqueda: '+report.search:''}`;
  const summary={name:'Resumen',widths:[40,12,21,21,15,21],header:0,
    merges:['A1:F1','A2:F2','A3:F3','A4:F4','A5:F5','A7:B7','C7:D7','E7:F7','A8:B8','C8:D8','E8:F8','A9:B9','C9:D9','E9:F9','A11:F11'],
    heights:{1:33,2:report.scopeLine?42:26,3:28,4:28,5:36,7:29,8:38,9:30},rows:[
      [title('VaXCuenta · Resumen')],[report.title+(report.scopeLine?'\n'+report.scopeLine:'')],[metadata],[cutoff],
      ['Cómo leerlo: avance = real ÷ objetivo. Un 100% significa que se alcanzó la meta del periodo.'],[],
      [head('Real recaudado MXN'),null,head(total.missingTargets?'Objetivo conocido MXN':'Objetivo del periodo MXN'),null,head('Avance')],
      [formula(realFormula,total.realCents/100,10),null,formula(goalFormula,total.targetCents/100,10),null,total.completion==null?numeric(null,11):formula('IF(C8>0,A8/C8,0)',total.completion,11)],
      [{value:'Faltante MXN',style:6},null,total.missingTargets?numeric(null,8):formula('MAX(C8-A8,0)',total.gapCents/100,8),null,total.missingTargets?'Meta incompleta':formula('IF(E8>=1,"Meta alcanzada","Por alcanzar")',total.completion>=1?'Meta alcanzada':'Por alcanzar')],[],
      [{value:report.summaryLabel,style:6}],
      [report.summaryView==='region'?'Región':report.summaryView==='dm'?'DM':'Tienda','Tiendas','Real MXN','Objetivo MXN','Avance','Faltante MXN'].map(head)
    ]};
  const groupColumn=report.summaryView==='region'?'C':'D';
  report.summaryRows.forEach((row,i)=>{
    const line=13+i,match=report.summaryView==='store'?null:`A${line}`;
    const sum=col=>match?`SUMIF(${storeRange(groupColumn)},${match},${storeRange(col)})`:`SUM(${storeRange(col)})`;
    summary.rows.push([row.ceco?`${row.ceco} · ${row.name}`:row.name,
      formula(match?`COUNTIF(${storeRange(groupColumn)},${match})`:`COUNTA(${storeRange('A')})`,row.storeCount),
      formula(sum('F'),row.realCents/100,3),formula(sum('G'),row.targetCents/100,3),
      row.completion==null?numeric(null,4):formula(`IF(D${line}>0,C${line}/D${line},0)`,row.completion,4),
      row.missingTargets?numeric(null,3):formula(`MAX(D${line}-C${line},0)`,row.gapCents/100,3)]);
    summary.heights[line]=row.name.length>30?37:28;
  });
  const end=12+report.summaryRows.length;
  summary.rows.push([{value:'TOTAL DEL ALCANCE',style:6},formula(`SUM(B13:B${end})`,total.storeCount),formula(`SUM(C13:C${end})`,total.realCents/100,8),formula(`SUM(D13:D${end})`,total.targetCents/100,8),total.completion==null?numeric(null,4):formula(`IF(D${end+1}>0,C${end+1}/D${end+1},0)`,total.completion,4),total.missingTargets?numeric(null,8):formula(`MAX(D${end+1}-C${end+1},0)`,total.gapCents/100,8)],[]);
  for(const note of [report.coverage,...report.rules,...report.warnings,report.dailyNote,report.sourceNote,'Para validar: abre Validación; después, Tiendas, Real diario y Metas.']){
    summary.rows.push([note]);const line=summary.rows.length;summary.merges.push(`A${line}:F${line}`);summary.heights[line]=note.length>130?42:30;
  }
  const tableHead=['CeCo','Tienda','Región de metas','DM','Tiendas','Real MXN','Objetivo MXN','Avance','Faltante MXN','Donativos / día (número)','Filas reales','Estado'];
  const storeCells=(row,line)=>[row.ceco,row.name,row.region,row.dm,numeric(1),
    formula(`SUMIF(${rawRange('A')},A${line},${rawRange('D')})`,row.realCents/100,3),
    formula(`SUMIF(${targetRange('A')},A${line},${targetRange('G')})`,row.targetCents/100,3),
    row.completion==null?numeric(null,4):formula(`IF(G${line}>0,F${line}/G${line},0)`,row.completion,4),
    row.missingTargets?numeric(null,3):formula(`MAX(G${line}-F${line},0)`,row.gapCents/100,3),numeric(row.dailyDonations,5),
    formula(`COUNTIF(${rawRange('A')},A${line})`,row.records),
    row.missingTargets?'Meta incompleta':formula(`IF(K${line}=0,"Sin registro","Con registro")`,row.records?'Con registro':'Sin registro')];
  const detail={name:'Tiendas',widths:[10,35,22,36,10,18,18,14,18,20,13,19],header:5,dataEnd:last,merges:['A1:L1','A2:L2','A3:L3','A4:L4'],heights:{4:35},rows:[
    [title('VaXCuenta · Tiendas')],[report.title+' · '+metadata],[cutoff],
    ['Real y objetivo se calculan con las hojas Real diario y Metas. Sin registro conserva su objetivo.'],tableHead.map(head),...stores.map((row,i)=>storeCells(row,i+6)),
    [{value:'TOTAL',style:6},null,null,null,formula(`SUM(${storeRange('E')})`,total.storeCount),formula(realFormula,total.realCents/100,8),formula(goalFormula,total.targetCents/100,8),total.completion==null?numeric(null,4):formula(`IF(G${last+1}>0,F${last+1}/G${last+1},0)`,total.completion,4),total.missingTargets?numeric(null,8):formula(`MAX(G${last+1}-F${last+1},0)`,total.gapCents/100,8),numeric(total.dailyDonations,5),formula(`SUM(${storeRange('K')})`,total.records)]
  ]};
  const actuals={name:'Real diario',widths:[11,18,40,21],header:5,dataEnd:5+report.actuals.length,merges:['A1:D1','A2:D2','A3:D3','A4:D4'],heights:{4:34},rows:[
    [title('VaXCuenta · Real diario')],['Fuente: Va X Cuenta.csv'],[metadata],['Importes originales en pesos. No se multiplican por el donativo de $10.'],['CeCo','Fecha','Tienda','Real MXN'].map(head),
    ...report.actuals.map(row=>[row[0],numeric(Date.parse(`${row[1]}T00:00:00Z`)/86400000+25569,7),lookup.get(row[0]).name,numeric(row[2]/100,3)])
  ]};
  const targets={name:'Metas',widths:[11,35,22,11,22,17,24,22,22],header:5,dataEnd:5+report.targets.length,merges:['A1:I1','A2:I2','A3:I3','A4:I4'],heights:{4:35},rows:[
    [title('VaXCuenta · Metas del periodo')],['Fuente: VaxCuenta Objetivos 26.xlsx'],[metadata],
    ['Meta del periodo = meta semanal × días del objetivo ÷ 7. Semana 40 conserva 7 días de objetivo.'],
    ['CeCo','Tienda','Región de metas','Semana','Meta semanal MXN','Días del objetivo','Meta del periodo MXN','Donativos / día (número)','Donativos / semana (número)'].map(head),
    ...report.targets.map((row,i)=>[row.ceco,lookup.get(row.ceco).name,lookup.get(row.ceco).region,numeric(row.week),numeric(row.weeklyCents/100,3),numeric(row.days),formula(`ROUND(E${i+6}*F${i+6}/7,2)`,row.targetCents/100,3),numeric(row.dailyDonations,5),numeric(row.weeklyDonations,5)])
  ]};
  const checks=[
    ['Real diario vs. corte original',total.realCents/100,`SUM(${rawRange('D')})`,total.realCents/100,3],
    ['Real de tiendas vs. real diario',formula(`SUM(${rawRange('D')})`,total.realCents/100,3),realFormula,total.realCents/100,3],
    ['Metas vs. corte original',total.targetCents/100,`SUM(${targetRange('G')})`,total.targetCents/100,3],
    ['Objetivo de tiendas vs. metas',formula(`SUM(${targetRange('G')})`,total.targetCents/100,3),goalFormula,total.targetCents/100,3],
    ['Tiendas incluidas',stores.length,`COUNTA(${storeRange('A')})`,stores.length,0],
    ['Filas reales del periodo',report.actuals.length,`COUNTA(${rawRange('A')})`,report.actuals.length,0],
    ['Tiendas sin registro',total.noRecordStores,`COUNTIF(${storeRange('K')},0)`,total.noRecordStores,0],
    ['Tiendas con meta incompleta',stores.filter(row=>row.missingTargets).length,`COUNTIF(${storeRange('L')},"Meta incompleta")`,stores.filter(row=>row.missingTargets).length,0]
  ];
  const validation={name:'Validación',statusRange:'E9:E16',widths:[40,24,24,18,18],header:8,dataEnd:8+checks.length,merges:['A1:E1','A2:E2','A3:E3','A4:E4','A5:E5','A6:E6','A7:E7'],heights:{4:36,5:36,6:36},rows:[
    [title('VaXCuenta · Validación')],[report.title+' · '+metadata],[cutoff],
    ['1. Confirma región, periodo, número de tiendas y fecha del archivo en Resumen.'],
    ['2. Todas las diferencias de abajo deben ser 0 y el resultado OK. Si cambias el real o las metas, los controles lo señalarán.'],
    ['3. Filtra Tiendas para revisar Sin registro o Meta incompleta. Real diario y Metas permiten rastrear cada importe por CeCo.'],
    ['OK confirma la conciliación de los archivos; Sin registro o Meta incompleta requieren revisar el origen.'],
    ['Control','Referencia','Exportado','Diferencia','Resultado'].map(head),
    ...checks.map(([label,expected,current,cached,style],i)=>{const line=i+9;return [label,expected&&typeof expected==='object'?expected:numeric(expected,style),formula(current,cached,style),formula(`ROUND(C${line}-B${line},2)`,0,style),formula(`IF(D${line}=0,"OK","REVISAR")`,'OK',6)];})
  ]};
  for(const note of [...report.rules,...report.warnings,report.dailyNote,report.sourceNote,`Fuentes: Va X Cuenta.csv · VaxCuenta Objetivos 26.xlsx · Directorio.xlsx. Revisión ${data.revision}.`]){
    validation.rows.push([note]);const line=validation.rows.length;validation.merges.push(`A${line}:E${line}`);validation.heights[line]=note.length>130?42:30;
  }
  const sheets=[summary,validation,detail,actuals,targets];
  const contentTypes=`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`;
  const rootRelationships=`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const workbook=`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${sheets.map((sheet,i)=>`<sheet name="${xml(sheet.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`;
  const relations=`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  return zip([['[Content_Types].xml',contentTypes],['_rels/.rels',rootRelationships],['xl/workbook.xml',workbook],['xl/_rels/workbook.xml.rels',relations],['xl/styles.xml',styles],...sheets.map((sheet,i)=>[`xl/worksheets/sheet${i+1}.xml`,worksheet(sheet)])]);
}
export function downloadFile(bytes,type,filename){
  const url=URL.createObjectURL(new Blob([bytes],{type})),link=document.createElement('a');
  link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
}
export function downloadXLSX(rows,total,data,state,context,storeRows){
  downloadFile(buildXLSX(rows,total,data,state,context,storeRows),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',exportFilename(data,state,context,'xlsx'));
}
