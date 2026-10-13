/* DOM event smoke tests run in Node; they do not claim visual/browser QA. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {setTimeout as pause} from 'node:timers/promises';
const data=JSON.parse(await readFile(new URL('./fixtures/baseline-2026-10-11.json',import.meta.url)));

class Element {
  constructor(id){this.id=id;this.listeners={};this.innerHTML='';this.textContent='';this.value='';this.hidden=false;this.dataset={};this.attrs={};this.classList={add(){},toggle(){}};}
  addEventListener(type,listener){this.listeners[type]=listener;}
  setAttribute(key,value){this.attrs[key]=value;}
  scrollIntoView(){}
  showModal(){this.open=true;}
  close(){this.open=false;}
  fire(type,value){if(value!==undefined)this.value=value;return this.listeners[type]?.({target:this});}
  click(){this.clicked=true;}
  remove(){this.removed=true;}
}

test('initial load, scopes, drilling, search, refresh failure and install help work',async()=>{
  const elements=new Map();const element=id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);};
  const tabs=['region','dm','store'].map(view=>{const b=new Element('tab-'+view);b.dataset.view=view;return b;});
  globalThis.location={href:'https://sbx-mex.github.io/VaXCuenta/',search:'',reload(){}};
  globalThis.history={replaceState(_a,_b,url){location.href=String(url);}};
  const links=[];
  globalThis.document={baseURI:location.href,body:{append:link=>links.push(link)},createElement:tag=>new Element(tag),getElementById:element,querySelector:selector=>element(selector.slice(1)),querySelectorAll:selector=>selector==='[data-view]'?tabs:[],addEventListener(){},visibilityState:'visible'};
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true}});
  globalThis.window={addEventListener(){},matchMedia:()=>({matches:false}),isSecureContext:true};
  let fail=false;
  globalThis.fetch=async url=>{if(fail)throw new Error('offline');return String(url).endsWith('campaign-frame.png')?{ok:true,arrayBuffer:async()=>readFile(new URL('../assets/campaign-frame.png',import.meta.url))}:{ok:true,json:async()=>structuredClone(data),headers:{get:()=>null}};};
  await import('../app.mjs');await pause(20);
  assert.equal(element('report').hidden,false);assert.equal(element('load-state').hidden,true);
  assert.match(element('kpis').innerHTML,/\$11,940/);assert.match(element('kpis').innerHTML,/\$105,120/);
  assert.match(element('weekly-chart').innerHTML,/Semana 40/);assert.match(element('cutoff').textContent,/11 de octubre/);
  assert.match(element('daily-target').textContent,/\d/);
  element('region').fire('change','Centro Poniente');assert.equal(element('scope-title').textContent,'Centro Poniente');
  assert.ok(!element('table-body').innerHTML.includes('Centro Sur'));
  tabs[1].fire('click');assert.equal(element('ranking-title').textContent,'Resultados por DM');
  element('region').fire('change','Centro Centro');element('dm').fire('change','Guadalupe Ibarra Martínez');element('store').fire('change','38101');
  assert.match(element('kpis').innerHTML,/\$2,070/);assert.match(element('kpis').innerHTML,/\$17,830/);
  const campaignBefore=element('kpis').innerHTML;element('period').fire('change','40');assert.equal(element('kpis').innerHTML,campaignBefore);
  tabs[2].fire('click');assert.equal(element('ranking-title').textContent,'Resultados por tienda');
  element('export').fire('click');assert.match(element('modal-body').innerHTML,/Descargar Excel para validar/);assert.match(element('modal-body').innerHTML,/Descargar resumen PDF/);assert.match(element('modal-body').innerHTML,/PDF con todas las tiendas/);
  assert.match(element('modal-body').innerHTML,/\$430/);assert.match(element('modal-body').innerHTML,/\$1,610/);assert.match(element('modal-body').innerHTML,/4 de octubre/);
  element('period').fire('change','41');element('export-xlsx').fire('click');
  assert.equal(links.length,1);assert.ok(links[0].clicked);assert.match(links[0].download,/Semana_40.*\.xlsx$/);
  assert.equal(element('modal').open,false);element('period').fire('change','40');
  globalThis.self=globalThis;
  element('export').fire('click');element('period').fire('change','41');await element('export-pdf').fire('click');
  assert.equal(links.length,2);assert.match(links[1].download,/Semana_40.*_Resumen\.pdf$/);assert.equal(element('modal').open,false);assert.equal(element('export-pdf').disabled,false);
  element('period').fire('change','40');
  element('table-body').listeners.click({target:{closest:()=>({dataset:{open:'38101'}})}});
  assert.match(element('modal-title').textContent,/38101/);assert.match(element('modal-body').innerHTML,/Recaudación por día/);
  element('modal-close').fire('click');assert.equal(element('modal').open,false);
  element('reset').fire('click');assert.match(element('kpis').innerHTML,/\$11,940/);
  element('search').fire('input','38101');element('export').fire('click');assert.match(element('kpis').innerHTML,/\$2,070/);assert.match(element('modal-body').innerHTML,/38101/);assert.match(element('modal-body').innerHTML,/1 tienda/);
  element('modal-close').fire('click');
  element('reset').fire('click');const before=element('kpis').innerHTML;fail=true;await element('refresh').fire('click');assert.equal(element('kpis').innerHTML,before);
  assert.match(element('toast').textContent,/Conservamos el corte/);
  element('about-nav').fire('click');assert.equal(element('about-page').hidden,false);assert.equal(element('dashboard-page').hidden,true);
  element('about-return').fire('click');assert.equal(element('dashboard-page').hidden,false);assert.equal(element('about-page').hidden,true);
  element('review-source').fire('click');assert.equal(element('source-validation').open,true);
  assert.match(element('comparison-reading').textContent,/tiendas con objetivo/);
  element('help').fire('click');assert.match(element('modal-body').innerHTML,/participación real en tickets/);
  element('install').fire('click');assert.match(element('modal-body').innerHTML,/Safari/);
  element('modal-close').fire('click');
});
