import {money,number,percent,formatDate} from './model.mjs';
import {buildReport} from './report.mjs';
import {downloadFile,exportFilename} from './xlsx-export.mjs';
import {pdfFonts} from './vendor/pdf-fonts.mjs';

async function library(){
  if(!globalThis.PDFLib)await import('./vendor/pdf-lib.min.js');
  if(!globalThis.PDFLib)throw new Error('No se pudo cargar el generador PDF.');
  return globalThis.PDFLib;
}
function wrap(value,font,size,width){
  const result=[];
  for(const paragraph of String(value??'').split('\n')){
    let line='';
    for(const word of paragraph.split(/\s+/).filter(Boolean)){
      if(font.widthOfTextAtSize(line?line+' '+word:word,size)<=width){line=line?line+' '+word:word;continue;}
      if(line)result.push(line);line='';
      if(font.widthOfTextAtSize(word,size)<=width){line=word;continue;}
      for(const char of word){if(font.widthOfTextAtSize(line+char,size)>width){result.push(line);line='';}line+=char;}
    }
    result.push(line);
  }
  return result;
}
export async function buildPDF(rows,total,data,state,context,options={}){
  const report=buildReport(rows,total,data,state,context,options.storeRows);
  const api=options.pdfLib||await library(),{PDFDocument,StandardFonts,rgb}=api;
  const pdf=await PDFDocument.create();
  pdf.setTitle(`VaXCuenta · ${report.title} · ${report.period}${options.mode==='detail'?' · Detalle':' · Resumen'}`);
  pdf.setAuthor('VaXCuenta');pdf.setSubject('Recaudación real vs. objetivo proyectado');
  const font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const W=792,H=612,M=32,available=W-2*M,bottom=H-44;
  const green=rgb(0,98/255,65/255),orange=rgb(220/255,107/255,32/255),ink=rgb(25/255,59/255,50/255),muted=rgb(104/255,119/255,110/255),light=rgb(237/255,244/255,232/255),white=rgb(1,1,1);
  let image=null;
  if(options.logoBytes)image=await pdf.embedPng(options.logoBytes);
  else if(typeof document!=='undefined'){
    const response=await fetch(new URL('./assets/campaign-frame.png',document.baseURI));
    if(!response.ok)throw new Error('No se pudo preparar el logotipo del PDF.');
    image=await pdf.embedPng(await response.arrayBuffer());
  }
  let page,y;
  function text(value,x,top,size=10,strong=false,color=ink){page.drawText(String(value),{x,y:H-top-size,font:strong?bold:font,size,color});}
  function lines(value,x,top,width,size=9,strong=false,color=ink){const list=wrap(value,strong?bold:font,size,width);list.forEach((line,i)=>text(line,x,top+i*(size+3),size,strong,color));return list.length*(size+3);}
  function newPage(){
    page=pdf.addPage([W,H]);
    text('VaXCuenta',M,19,21,true,green);
    const titleHeight=lines(report.title,M,46,available-112,10,true);
    const dateHeight=lines(`${report.period} · Real: ${report.dates}`,M,47+titleHeight,available-112,9,false,muted);
    const scopeHeight=report.scopeLine?lines(report.scopeLine,M,47+titleHeight+dateHeight,available-112,8,false,muted):0;
    if(image){
      const x=W-M-80,top=19,scale=80/263,base=H-top-54;
      page.pushOperators(api.pushGraphicsState(),api.rectangle(x,base,80,54),api.clip(),api.endPath());
      page.drawImage(image,{x:x-797*scale,y:base-(1080-1046)*scale,width:1080*scale,height:1080*scale});
      page.pushOperators(api.popGraphicsState());
    }
    y=Math.max(89,47+titleHeight+dateHeight+scopeHeight+11);
    page.drawLine({start:{x:M,y:H-y+5},end:{x:W-M,y:H-y+5},thickness:2,color:orange});
  }
  function ensure(height){if(y+height>bottom)newPage();}
  function paragraph(value,size=8.5,color=muted){const height=wrap(value,font,size,available).length*(size+3);ensure(height+4);y+=lines(value,M,y,available,size,false,color)+4;}
  function heading(value){ensure(30);text(value,M,y,10,true,green);y+=18;}
  newPage();
  const cards=[['Meta total cargada MXN',money(total.campaignTargetCents)],['Acumulado al corte MXN',money(total.campaignRealCents)],['Avance de campaña',percent(total.campaignCompletion)],['Por recaudar MXN',money(total.campaignGapCents)]];
  const cardW=(available-30)/4;
  cards.forEach(([label,value],i)=>{
    const x=M+i*(cardW+10);
    page.drawRectangle({x,y:H-y-57,width:cardW,height:57,color:i===0?green:light});
    text(label,x+11,y+9,8.5,false,i===0?white:muted);
    const size=Math.min(20,20*(cardW-22)/bold.widthOfTextAtSize(value,20));
    text(value,x+11,y+26,size,true,i===0?white:ink);
  });
  y+=68;
  paragraph(report.campaignInterpretation,10,ink);
  paragraph(report.campaignNote,8.5,orange);
  paragraph(report.campaignCoverage,8.5);
  paragraph(`Detalle del periodo: real ${money(total.realCents)} / objetivo ${money(total.targetCents)} / avance ${percent(total.completion)}.`,8.5);
  if(report.search)paragraph('Búsqueda: '+report.search,8.5);
  const summaryWidths=[292,48,115,115,65,93],detailWidths=[278,110,115,65,90,70];
  function table(entries,detail=false){
    const widths=detail?detailWidths:summaryWidths;
    const labels=detail?['Tienda / CeCo','Meta total MXN','Acumulado MXN','Avance campaña','Por recaudar','Avance periodo']:[report.summaryView==='region'?'Región':report.summaryView==='dm'?'DM':'Tienda','Tiendas','Meta total MXN','Acumulado MXN','Avance','Por recaudar'];
    function header(){
      page.drawRectangle({x:M,y:H-y-(detail?34:24),width:available,height:detail?34:24,color:green});
      let x=M;labels.forEach((label,i)=>{lines(label,x+7,y+6,widths[i]-14,8,true,white);x+=widths[i];});y+=detail?34:24;
    }
    ensure(60);header();
    function row(entry,isTotal=false){
      const name=entry.ceco&&!detail?`${entry.ceco} · ${entry.name}`:entry.name;
      const nameLines=wrap(name,bold,9,widths[0]-14);
      const meta=detail&&!isTotal?`${entry.ceco} · ${entry.region} · ${entry.dm}`:'';
      const metaLines=meta?wrap(meta,font,7.5,widths[0]-14):[];
      const height=Math.max(detail?24:22,nameLines.length*12+metaLines.length*10+10);
      if(y+height>bottom){newPage();heading(detail?'Detalle por tienda (continuación)':report.summaryLabel+' (continuación)');header();}
      if(isTotal)page.drawRectangle({x:M,y:H-y-height,width:available,height,color:light});
      nameLines.forEach((line,i)=>text(line,M+7,y+5+i*12,9,true));
      metaLines.forEach((line,i)=>text(line,M+7,y+6+nameLines.length*12+i*10,7.5,false,muted));
      const values=detail?[money(entry.campaignTargetCents),money(entry.campaignRealCents),percent(entry.campaignCompletion),money(entry.campaignGapCents),percent(entry.completion)]:[number(entry.storeCount,0),money(entry.campaignTargetCents),money(entry.campaignRealCents),percent(entry.campaignCompletion),money(entry.campaignGapCents)];
      let x=M+widths[0];
      values.forEach((value,i)=>{const f=isTotal?bold:font,size=Math.min(9,9*(widths[i+1]-14)/f.widthOfTextAtSize(value,9));text(value,x+widths[i+1]-7-f.widthOfTextAtSize(value,size),y+6,size,isTotal);x+=widths[i+1];});
      if(detail&&!isTotal&&!entry.records)text('Sin registro',M+widths[0]+7,y+21,7,false,muted);
      if(detail&&!isTotal&&entry.missingTargets)text('Meta incompleta',M+widths[0]+widths[1]+7,y+21,7,false,orange);
      page.drawLine({start:{x:M,y:H-y-height},end:{x:W-M,y:H-y-height},thickness:0.4,color:light});y+=height;
    }
    entries.forEach(entry=>row(entry));row({...total,name:'TOTAL DEL ALCANCE'},true);y+=9;
  }
  heading(report.summaryLabel);table(report.summaryRows);
  if(options.mode==='detail')for(const rule of report.rules)paragraph(rule);
  if(options.mode==='detail'&&report.warnings.length){heading('Qué revisar');for(const warning of report.warnings)paragraph(warning,8.5,ink);}
  if(options.mode==='detail')paragraph('Avance campaña = acumulado al corte ÷ meta total cargada; no es un promedio de porcentajes. Sin registro significa que no existe una fila real del periodo.');
  if(options.mode==='detail')paragraph(report.dailyNote);
  paragraph(report.sourceNote);
  if(options.mode==='detail'){
    newPage();heading(`Detalle de ${total.storeCount} tiendas`);table(report.stores,true);
    paragraph('El detalle conserva todos los CeCo del alcance. Excel permite rastrear los importes en Real diario y Metas.');
  }
  const pages=pdf.getPages();
  pages.forEach((item,index)=>{
    item.drawLine({start:{x:M,y:29},end:{x:W-M,y:29},thickness:0.5,color:light});
    item.drawText(`VaXCuenta · ${report.period} · Archivo al ${data.cutoff} · ${total.storeCount} tiendas · ${data.revision}`,{x:M,y:15,size:7.5,font,color:muted});
    const count=`Página ${index+1} de ${pages.length}`;
    item.drawText(count,{x:W-M-font.widthOfTextAtSize(count,8),y:15,size:8,font,color:muted});
  });
  // CFF embebida: mantiene las métricas Helvetica y evita sustituciones de fuente.
  for(const [index,entry] of [font,bold].entries()){
    await entry.embed();
    const source=pdfFonts[index];
    const file=pdf.context.register(pdf.context.flateStream(source.bytes,{Subtype:'Type1C'}));
    const descriptor=pdf.context.register(pdf.context.obj({Type:'FontDescriptor',FontName:source.name,Flags:32,FontBBox:source.bbox,ItalicAngle:0,Ascent:source.ascent,Descent:source.descent,CapHeight:source.capHeight,StemV:index?120:80,FontFile3:file}));
    const dictionary=pdf.context.lookup(entry.ref,api.PDFDict);
    dictionary.set(api.PDFName.of('BaseFont'),api.PDFName.of(source.name));
    dictionary.set(api.PDFName.of('FontDescriptor'),descriptor);
    dictionary.set(api.PDFName.of('FirstChar'),pdf.context.obj(32));
    dictionary.set(api.PDFName.of('LastChar'),pdf.context.obj(255));
    dictionary.set(api.PDFName.of('Widths'),pdf.context.obj(source.widths));
  }
  return pdf.save();
}
export async function downloadPDF(rows,total,data,state,context,storeRows,mode='summary'){
  const name=exportFilename(data,state,context,'pdf').replace(/\.pdf$/,`_${mode==='detail'?'Detalle':'Resumen'}.pdf`);
  downloadFile(await buildPDF(rows,total,data,state,context,{storeRows,mode}),'application/pdf',name);
}
