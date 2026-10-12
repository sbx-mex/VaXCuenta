import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {prepare,selectStores,aggregate,groupRows,weeklySeries} from '../model.mjs';
const data=JSON.parse(await readFile(new URL('../data/dashboard.json',import.meta.url)));
const audit=JSON.parse(await readFile(new URL('../docs/audit.json',import.meta.url)));
const prepared=prepare(data);
test('current publication reconciles all recorded campaign pesos and the true source cutoff',()=>{
  const rows=selectStores(prepared),total=aggregate(rows);
  assert.equal(total.realCents,audit.campaignCents);assert.equal(data.cutoff,audit.cutoff);
  assert.equal(data.cutoff,data.actuals.reduce((max,row)=>row[1]>max?row[1]:max,''));
  assert.equal(audit.rawCents,audit.campaignCents+audit.excludedCents);
});
test('all current grouping and weekly scopes retain financial totals',()=>{
  const rows=selectStores(prepared),total=aggregate(rows);
  for(const view of ['region','dm','store']){
    const groups=groupRows(rows,view);assert.equal(groups.reduce((sum,row)=>sum+row.realCents,0),total.realCents);assert.equal(groups.reduce((sum,row)=>sum+row.targetCents,0),total.targetCents);
  }
  const weeks=weeklySeries(prepared,rows);
  assert.equal(weeks.reduce((sum,row)=>sum+row.realCents,0),total.realCents);
  assert.equal(weeks.reduce((sum,row)=>sum+row.targetCents,0),total.targetCents);
});
