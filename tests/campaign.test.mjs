import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {prepare,selectStores,aggregate,groupRows} from '../model.mjs';import {buildReport} from '../report.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../data/dashboard.json',import.meta.url)));
test('whole campaign sums all future objectives and accumulated real, independent of weekly selector',()=>{
  const p=prepare(data),rows=selectStores(p),total=aggregate(rows);
  assert.equal(total.campaignTargetCents,data.targets.reduce((n,r)=>n+r[2],0));
  assert.equal(total.campaignRealCents,data.actuals.reduce((n,r)=>n+r[2],0));
  assert.equal(total.campaignCompletion,total.campaignRealCents/total.campaignTargetCents);
  assert.ok(total.campaignTargetCents>total.targetCents);
  const weekly=aggregate(selectStores(p,{period:'40'}));
  assert.equal(weekly.campaignTargetCents,total.campaignTargetCents);assert.equal(weekly.campaignRealCents,total.campaignRealCents);assert.notEqual(weekly.realCents,total.realCents);
  for(const view of ['region','dm','store']){const grouped=groupRows(rows,view);assert.equal(grouped.reduce((n,r)=>n+r.campaignTargetCents,0),total.campaignTargetCents);assert.equal(grouped.reduce((n,r)=>n+r.campaignRealCents,0),total.campaignRealCents);}
});
test('campaign export traces its full sources even when a week is selected',()=>{
  const state={period:'40',store:'38101',view:'store'},rows=selectStores(prepare(data),state),total=aggregate(rows);
  const r=buildReport(rows,total,data,state,{},rows);
  assert.ok(r.campaignActuals.length>r.actuals.length);assert.ok(r.campaignTargets.length>r.targets.length);
  assert.equal(r.campaignTargets.reduce((n,row)=>n+row[2],0),total.campaignTargetCents);
  assert.match(r.campaignNote,/pendientes/);assert.ok(total.campaignMissingTargets>0);
});
