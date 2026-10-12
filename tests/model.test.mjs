import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {prepare,selectStores,aggregate,groupRows,weeklySeries,dailySeries,metricForStore,targetAtCutoff,formatDate,periodWindow,money,PENDING_DM} from '../model.mjs';
import {buildCSV,csvCell,printHTML} from '../export.mjs';
const data=JSON.parse(await readFile(new URL('./fixtures/baseline-2026-10-11.json',import.meta.url)));
const prepared=prepare(data);

test('regression real, objective and missing amount reconcile exactly',()=>{
  const rows=selectStores(prepared), total=aggregate(rows);
  assert.equal(rows.length,6);assert.equal(total.realCents,1194000);assert.equal(total.targetCents,2023000);
  assert.equal(total.gapCents,829000);assert.equal(total.completion,1194000/2023000);
  assert.equal(total.missingTargets,0);assert.equal(total.noRecordStores,1);
});
test('week40 retains the complete weekly objective for four real campaign days',()=>{
  const row=metricForStore(prepared,'38101','40');
  assert.equal(row.realCents,43000);assert.equal(row.targetCents,161000);assert.equal(row.dailyDonations,23);assert.equal(row.records,4);
  const national=aggregate(selectStores(prepared,{period:'40'}));assert.equal(national.realCents,297000);
});
test('week41 is complete on Sunday 11 October',()=>{
  const row=metricForStore(prepared,'38101','41');
  assert.equal(row.realCents,164000);assert.equal(row.targetCents,161000);assert.equal(row.records,7);
  assert.equal(aggregate(selectStores(prepared,{period:'41'})).realCents,897000);
});
test('single shop cumulative totals stay tied to both weekly targets',()=>{
  const row=metricForStore(prepared,'38101');assert.equal(row.realCents,207000);assert.equal(row.targetCents,322000);assert.equal(row.dailyDonations,23);
});
test('future projections never inflate the objective at the real cutoff',()=>{
  const rows=selectStores(prepared);assert.equal(weeklySeries(prepared,rows).length,2);assert.equal(metricForStore(prepared,'38101').fullTargetCents,322000);
});
test('región, DM and tienda give the same financial totals',()=>{
  const rows=selectStores(prepared), total=aggregate(rows);
  for(const view of ['region','dm','store']){
    const groups=groupRows(rows,view);assert.equal(groups.reduce((sum,r)=>sum+r.realCents,0),total.realCents);assert.equal(groups.reduce((sum,r)=>sum+r.targetCents,0),total.targetCents);
  }
});
test('regional results use the operational directorio on both real and goal',()=>{
  const row=metricForStore(prepared,'43194');assert.equal(row.region,'Centro Norte');assert.equal(row.targetRegion,'Centro Poniente');
  assert.ok(selectStores(prepared,{region:'Centro Norte'}).some(r=>r.ceco==='43194'));
  assert.ok(!selectStores(prepared,{region:'Centro Poniente'}).some(r=>r.ceco==='43194'));
});
test('missing DM shops are retained once and have an explicit group',()=>{
  const rows=selectStores(prepared), pending=groupRows(rows,'dm').find(r=>r.id===PENDING_DM);
  assert.equal(pending.storeCount,1);assert.equal(new Set(rows.map(r=>r.ceco)).size,rows.length);
});
test('weighted completion is a ratio of sums',()=>{
  const total=aggregate(selectStores(prepared,{region:'Centro Norte'}));
  assert.equal(total.completion,total.realCents/total.targetCents);
});
test('store and DM filters restrict the same universe as exports',()=>{
  const rows=selectStores(prepared,{region:'Centro Centro',dm:'Guadalupe Ibarra Martínez',store:'38101'});assert.equal(rows.length,1);assert.equal(rows[0].ceco,'38101');
});
test('accent-insensitive search includes CeCo and shop name',()=>{
  assert.equal(selectStores(prepared,{query:'38101'}).length,1);
  assert.ok(selectStores(prepared,{query:'angel'}).some(r=>r.ceco==='38101'));
  assert.equal(selectStores(prepared,{query:'this-is-no-shop'}).length,0);
});
test('missing source date is different from a zero real record',()=>{
  assert.equal(dailySeries(prepared,'38106','40')[0].realCents,null);
  const clone=structuredClone(data);clone.actuals.push(['38106','2026-10-01',0]);
  assert.equal(dailySeries(prepare(clone),'38106','40')[0].realCents,0);
});
test('dates display in Mexican Spanish without time-zone shifts',()=>{
  assert.equal(formatDate('2026-10-11',true),'11 de octubre de 2026');
  assert.equal(periodWindow(data,'40').from,'2026-10-01');assert.equal(periodWindow(data,'40').to,'2026-10-04');
});
test('the first day of the campaign also keeps a full week40 goal',()=>{
  const clone=structuredClone(data);clone.cutoff='2026-10-01';clone.actuals=clone.actuals.filter(r=>r[1]<=clone.cutoff);
  assert.equal(metricForStore(prepare(clone),'38101').targetCents,161000);
});
test('a Monday update only adds one seventh of its new weekly monetary objective',()=>{
  const clone=structuredClone(data);clone.cutoff='2026-10-12';clone.actuals.push(['38101','2026-10-12',10000]);
  const row=metricForStore(prepare(clone),'38101');assert.equal(row.targetCents,322000+Math.round(198000/7));assert.equal(row.realCents,217000);assert.equal(row.dailyDonations,198/7);
});
test('partial current monetary goal does not override the source daily donation field',()=>{
  const row=data.targets.find(r=>r[0]==='38179'&&r[1]===42),week=data.calendar.find(w=>w.week===42);
  assert.equal(targetAtCutoff(data,row,week,'2026-10-12'),Math.round(row[2]/7));assert.notEqual(row[4],row[3]/7);
});
test('November30 is week49 and missing targets suppress a misleading completion',()=>{
  const clone=structuredClone(data);clone.cutoff='2026-11-30';clone.actuals.push(['38101','2026-11-30',10000]);
  const row=metricForStore(prepare(clone),'38101','49');assert.equal(row.realCents,10000);assert.equal(row.targetCents,0);assert.equal(row.missingTargets,1);assert.equal(row.completion,null);
});
test('future shop openings are not considered active before their first goal',()=>{
  const firsts=new Map();for(const r of data.targets)firsts.set(r[0],Math.min(firsts.get(r[0])??Infinity,r[1]));
  const later=[...firsts].find(([ceco,week])=>week>41);assert.ok(later);assert.equal(metricForStore(prepared,later[0]).active,false);
});
test('actuals lacking an objective remain visible and mark comparison incomplete',()=>{
  const clone=structuredClone(data);clone.stores.push({ceco:'49999',name:'Nueva',region:'Por asignar',dm:PENDING_DM});clone.actuals.push(['49999','2026-10-11',1000]);
  const rows=selectStores(prepare(clone));assert.equal(rows.length,7);assert.equal(aggregate(rows).realCents,1195000);assert.equal(aggregate(rows).completion,null);
});
test('greater than100 percent is retained and gap is never negative',()=>{
  const row=metricForStore(prepared,'38101','41');assert.ok(row.completion>1);assert.equal(row.gapCents,0);
});
test('duplicated compiled financial targets are rejected',()=>{
  const clone=structuredClone(data);clone.targets.push(clone.targets[0]);assert.throws(()=>prepare(clone),/duplicadas/);
});
test('corrected real amounts at the same cutoff recompute totals',()=>{
  const clone=structuredClone(data);clone.actuals.find(r=>r[0]==='38101')[2]+=1000;
  assert.equal(aggregate(selectStores(prepare(clone))).realCents,1195000);
});
test('exports preserve filtered total and numeric daily objectives',()=>{
  const rows=selectStores(prepared,{region:'Centro Norte'}),groups=groupRows(rows,'dm'),total=aggregate(rows);
  const csv=buildCSV(groups,total,data,{view:'dm',period:'all'});assert.ok(csv.startsWith('\ufeff'));assert.ok(csv.includes('Objetivo donativos diarios'));assert.ok(csv.includes(`"${total.realCents/100}"`));assert.equal(csv.split('\r\n').length,groups.length+2);
});
test('CSV prevents formula injection in names without corrupting numeric negatives',()=>{
  assert.equal(csvCell('=HYPERLINK("x")'),'"\'=HYPERLINK(""x"")"');assert.equal(csvCell(-10),'"-10"');
});
test('PDF print document includes exactly the scoped rows and cutoff',()=>{
  const rows=selectStores(prepared,{store:'38101'}),groups=groupRows(rows,'store'),total=aggregate(rows);
  const html=printHTML(groups,total,data,{view:'store',period:'all'},{baseURL:'https://sbx-mex.github.io/VaXCuenta/',title:'Angel',meta:'1 tienda',periodNote:'Semana40 completa',dailyNote:'Donativos numéricos'});
  assert.ok(html.includes('11 de octubre de 2026'));assert.ok(html.includes('$2,070'));assert.ok(html.includes('$3,220'));assert.ok(html.includes('campaign-frame.png'));assert.ok(!html.includes('Aguilas'));
});
test('report escapes text and does not execute spreadsheet strings as markup',()=>{
  const html=printHTML([{...metricForStore(prepared,'38101'),name:'<script>bad()</script>'}],aggregate(selectStores(prepared,{store:'38101'})),data,{view:'store',period:'all'},{baseURL:'https://example.test/VaXCuenta/',title:'<img onerror="bad()">',meta:'',periodNote:'',dailyNote:''});
  assert.ok(html.includes('&lt;script&gt;bad()&lt;/script&gt;'));assert.ok(!html.includes('<img onerror='));
});
