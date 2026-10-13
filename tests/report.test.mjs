import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildReport} from '../report.mjs';
import {prepare,selectStores,aggregate,groupRows} from '../model.mjs';
const data=JSON.parse(await readFile(new URL('../data/dashboard.json',import.meta.url))),prepared=prepare(data);
function report(state={region:'Centro Norte',period:'40',view:'store'}){
  const stores=selectStores(prepared,state),total=aggregate(stores);
  return buildReport(groupRows(stores,state.view),total,data,state,{title:state.store||state.dm||state.region||'Nacional'},stores);
}
test('regional summary matches source money, dates, current directory stores and DM',()=>{
  const r=report(),ids=new Set(data.stores.filter(row=>row.region==='Centro Norte').map(row=>row.ceco));
  const goals=data.targets.filter(row=>ids.has(row[0])&&row[1]===40),actuals=data.actuals.filter(row=>ids.has(row[0])&&row[1]>='2026-10-01'&&row[1]<='2026-10-04');
  assert.equal(r.summaryRows.length,new Set(r.stores.map(row=>row.dm)).size);assert.equal(r.summaryView,'dm');
  assert.equal(r.actuals.length,actuals.length);assert.equal(r.total.realCents,actuals.reduce((sum,row)=>sum+row[2],0));assert.equal(r.total.targetCents,goals.reduce((sum,row)=>sum+row[2],0));
  assert.deepEqual(r.window,{from:'2026-10-01',to:'2026-10-04'});
  assert.equal(r.targets.length,goals.length);assert.ok(r.targets.every(row=>row.days===7));
  assert.ok(r.stores.some(row=>row.ceco==='43194'));
  const changes=r.stores.filter(row=>row.targetRegion!==row.directoryRegion&&row.directoryRegion);
  if(changes.length)assert.match(r.warnings.join(' '),/cambio de región/);
  assert.match(r.sourceNote,/Nombre, región y DM de Directorio/);
});
test('national, DM, store and search summaries conserve all scoped money',()=>{
  for(const state of [{view:'region',period:'all'},{view:'store',region:'Centro Norte',dm:'Nancy Carolina Rodriguez Medina',period:'40'},{view:'store',store:'38101',period:'all'},{view:'region',region:'Centro Norte',query:'Jinetes',period:'40'}]){
    const r=report(state);assert.equal(r.summaryRows.reduce((sum,row)=>sum+row.realCents,0),r.total.realCents);assert.equal(r.summaryRows.reduce((sum,row)=>sum+row.targetCents,0),r.total.targetCents);assert.equal(r.summaryRows.reduce((sum,row)=>sum+row.storeCount,0),r.total.storeCount);
    assert.equal(r.actuals.reduce((sum,row)=>sum+row[2],0),r.total.realCents);
  }
});
test('recorded zero remains distinct from absent records in coverage',()=>{
  const changed=structuredClone(data),state={view:'store',store:'38101',period:'40'};
  changed.actuals=changed.actuals.filter(row=>row[0]!=='38101');
  const absent=selectStores(prepare(changed),state),r=buildReport(absent,aggregate(absent),changed,state,{title:'Angel'},absent);
  assert.equal(r.actuals.length,0);assert.equal(r.total.noRecordStores,1);assert.ok(r.total.targetCents>0);assert.match(r.coverage,/0 con registro y 1 sin registro/);
  changed.actuals.push(['38101','2026-10-01',0]);
  const stores=selectStores(prepare(changed),state),zero=buildReport(stores,aggregate(stores),changed,state,{title:'Angel'},stores);
  assert.equal(zero.total.noRecordStores,0);assert.match(zero.coverage,/1 con registro y 0 sin registro/);
});
test('export stops on stale totals, duplicate CeCo or source amount mismatches',()=>{
  const state={view:'store',store:'38101',period:'40'},stores=selectStores(prepared,state),total=aggregate(stores),ctx={title:'Angel'};
  assert.throws(()=>buildReport(stores,{...total,realCents:total.realCents+100},data,state,ctx,stores),/resumen no coincide/);
  assert.throws(()=>buildReport(stores,total,data,state,ctx,[...stores,...stores]),/CeCo repetidos/);
  const changed=structuredClone(data),raw=changed.actuals.find(row=>row[0]==='38101'&&row[1]==='2026-10-01');raw[2]+=100;
  assert.throws(()=>buildReport(stores,total,changed,state,ctx,stores),/real no concilia/);
});
test('a partial later week prorates money while preserving the original daily projection',()=>{
  const changed=structuredClone(data),state={view:'store',store:'38101',period:'41'};
  changed.cutoff='2026-10-07';changed.actuals=changed.actuals.filter(row=>row[1]<=changed.cutoff);
  const stores=selectStores(prepare(changed),state),r=buildReport(stores,aggregate(stores),changed,state,{title:'Angel'},stores);
  assert.equal(r.targets[0].days,3);assert.equal(r.targets[0].targetCents,Math.round(r.targets[0].weeklyCents*3/7));
  assert.equal(r.targets[0].dailyDonations,data.targets.find(row=>row[0]==='38101'&&row[1]===41)[4]);
  assert.match(r.rules.join(' '),/proporcional/);
});
test('incomplete targets keep known totals and explicitly suppress interpretation',()=>{
  const changed=structuredClone(data),state={view:'store',store:'38101',period:'all'};
  changed.targets=changed.targets.filter(row=>!(row[0]==='38101'&&row[1]===41));
  const stores=selectStores(prepare(changed),state),total=aggregate(stores),r=buildReport(stores,total,changed,state,{title:'Angel'},stores);
  assert.equal(r.total.completion,null);assert.match(r.interpretation,/meta está incompleta/);assert.match(r.warnings.join(' '),/meta incompleta/);
});

test('exports document directory reclassification while retaining original target amounts',()=>{
  const changed=structuredClone(data),state={view:'store',store:'43194',period:'40'};
  changed.stores.find(row=>row.ceco==='43194').targetRegion='Región anterior';
  const stores=selectStores(prepare(changed),state),r=buildReport(stores,aggregate(stores),changed,state,{title:'Atana'},stores);
  assert.equal(r.stores[0].region,'Centro Norte');assert.match(r.warnings.join(' '),/43194: Región anterior a Centro Norte/);
  assert.equal(r.targets[0].weeklyCents,data.targets.find(row=>row[0]==='43194'&&row[1]===40)[2]);
});
