import {prepare,selectStores,aggregate,groupRows,periodWindow,targetAtCutoff,dayNumber,money,number,percent,formatDate,PENDING_DM} from './model.mjs';

/* Una consulta financiera compartida por Excel, PDF y la vista previa. */
export function buildReport(rows,total,data,state,context,storeRows){
  const stores=storeRows||selectStores(prepare(data),state);
  const selected=new Set(stores.map(row=>row.ceco));
  if(selected.size!==stores.length)throw new Error('Hay CeCo repetidos en la consulta.');
  const window=periodWindow(data,state.period),calculated=aggregate(stores);
  for(const field of ['realCents','targetCents','records','storeCount','missingTargets']){
    if(total[field]!==calculated[field])throw new Error('El resumen no coincide con las tiendas de la consulta.');
  }
  const actuals=data.actuals.filter(row=>selected.has(row[0])&&row[1]>=window.from&&row[1]<=window.to);
  const sourceReal=actuals.reduce((sum,row)=>sum+row[2],0);
  if(sourceReal!==total.realCents||actuals.length!==total.records)throw new Error('El real no concilia con los registros del CSV.');
  const weeks=data.calendar.filter(week=>week.campaignStart<=window.to&&week.campaignEnd>=window.from);
  const targets=data.targets.filter(row=>selected.has(row[0])&&weeks.some(week=>week.week===row[1])).map(row=>{
    const week=weeks.find(week=>week.week===row[1]);
    const days=data.config.firstWeekFullTarget&&week.week===data.calendar[0].week?7:Math.max(0,Math.min(7,dayNumber(window.to)-dayNumber(week.start)+1));
    return {ceco:row[0],week:row[1],weeklyCents:row[2],weeklyDonations:row[3],dailyDonations:row[4],days,targetCents:targetAtCutoff(data,row,week,window.to)};
  });
  if(targets.reduce((sum,row)=>sum+row.targetCents,0)!==total.targetCents)throw new Error('El objetivo no concilia con las metas del periodo.');
  const summaryView=stores.length===1?'store':state.region?'dm':'region';
  const summaryRows=groupRows(stores,summaryView,'name');
  const period=state.period==='all'?'Acumulado':`Semana ${state.period}`;
  const title=stores.length===1?`${stores[0].ceco} · ${stores[0].name}`:state.dm?[state.region,state.dm].filter(Boolean).join(' · '):state.region||context.title||'Nacional';
  const dates=`${formatDate(window.from)} al ${formatDate(window.to,true)}`;
  const interpretation=total.missingTargets?'La meta está incompleta. Revisa Validación antes de interpretar el avance.':
    total.completion==null?'No hay un objetivo monetario disponible para calcular el avance.':
    total.completion>=1?`Se alcanzó ${percent(total.completion)} del objetivo; se superó por ${money(total.realCents-total.targetCents)}.`:
    `Se recaudaron ${money(total.realCents)} de ${money(total.targetCents)}: avance ${percent(total.completion)}. Faltan ${money(total.gapCents)}.`;
  const coverage=`${number(total.storeCount,0)} ${total.storeCount===1?'tienda':'tiendas'}: ${number(total.storeCount-total.noRecordStores,0)} con registro y ${number(total.noRecordStores,0)} sin registro. ${number(actuals.length,0)} ${actuals.length===1?'fila real':'filas reales'} del periodo.`;
  const rules=[];
  if(weeks.some(week=>week.week===data.calendar[0].week)&&data.config.firstWeekFullTarget)rules.push('Semana 40: se conserva la meta semanal completa, aunque la campaña inicia el 1 de octubre.');
  if(weeks.some(week=>week.week!==data.calendar[0].week&&window.to<week.end))rules.push('La última semana en curso usa la meta proporcional a los días calendario hasta el corte.');
  const noRecord=stores.filter(row=>!row.records),incomplete=stores.filter(row=>row.missingTargets);
  const warnings=[];
  if(noRecord.length)warnings.push(`Sin registro: ${noRecord.slice(0,3).map(row=>`${row.ceco} · ${row.name}`).join('; ')}${noRecord.length>3?`; y ${noRecord.length-3} más`:''}. Se conservan sus metas.`);
  if(incomplete.length)warnings.push(`${incomplete.length} tienda(s) con meta incompleta: avance y faltante se muestran sin calcular.`);
  if(stores.some(row=>row.dm===PENDING_DM))warnings.push('Hay tiendas con DM pendiente de asignación; sus importes se conservan.');
  const regionReferences=stores.filter(row=>row.directoryRegion && row.targetRegion && row.directoryRegion!==row.targetRegion);
  if(regionReferences.length)warnings.push(`${regionReferences.length} tienda(s) con cambio de región respecto a metas. Se aplica el directorio a real y objetivo: ${regionReferences.slice(0,3).map(row=>`${row.ceco}: ${row.targetRegion} a ${row.region}`).join('; ')}${regionReferences.length>3?'; detalle en Excel':''}.`);
  const unassigned=stores.filter(row=>row.assignmentSource==='Pendiente en Directorio.xlsx');
  if(unassigned.length)warnings.push(`${unassigned.length} tienda(s) faltan en el directorio; sus importes se conservan en Por asignar.`);
  return {stores,actuals,targets,total:calculated,window,period,title,dates,summaryView,summaryRows,interpretation,coverage,rules,warnings,
    scopeLine:stores.length===1?`${stores[0].region} · ${stores[0].dm}`:'',
    summaryLabel:`Resultados por ${summaryView==='region'?'Región':summaryView==='dm'?'DM':'Tienda'}`,
    search:state.query||'',scopeLatest:actuals.reduce((latest,row)=>row[1]>latest?row[1]:latest,''),
    dailyNote:`Donativos/día es un número del Excel; el donativo es de ${money(data.config.campaign.donationPesos*100)}. El real ya está en pesos.`,
    sourceNote:'Nombre, región y DM de Directorio.xlsx. Importes de metas y real unidos por CeCo.'};
}
