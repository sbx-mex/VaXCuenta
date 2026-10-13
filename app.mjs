import {prepare, selectStores, aggregate, groupRows, weeklySeries, dailySeries, metricForStore, targetAtCutoff,
  formatDate, money, number, percent, escapeHTML as e, periodWindow, PENDING_DM, dayNumber} from './model.mjs';
import {downloadXLSX, downloadPDF} from './export.mjs';
import {buildReport} from './report.mjs';
import {setupPWA} from './pwa.mjs';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const state = {region: params.get('region') || '', dm: params.get('dm') || '', store: params.get('store') || '',
  period: params.get('period') || 'all', view: ['region','dm','store'].includes(params.get('view')) ? params.get('view') : 'region',
  sort: ['completion','lowest','real','name'].includes(params.get('sort')) ? params.get('sort') : 'completion', query: (params.get('q') || '').slice(0,150)};
function setPage(page) {
  const about=page==='acerca';
  $('dashboard-page').hidden=about; $('about-page').hidden=!about;
  $('dashboard-nav').setAttribute('aria-pressed',String(!about)); $('about-nav').setAttribute('aria-pressed',String(about));
  const url=new URL(location.href);url.hash=about?'acerca':'';history.replaceState(null,'',url);
  if(about)$('about-title').focus?.();
}
$('dashboard-nav').addEventListener('click',()=>setPage('inicio'));
$('about-nav').addEventListener('click',()=>setPage('acerca'));
$('about-return').addEventListener('click',()=>setPage('inicio'));
setPage(new URL(location.href).hash.slice(1));

let prepared, scopeRows = [], grouped = [], total, context, busy = false, lastCheck = 0, toastTimer;

function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 4500); }
function showModal(title, body) { $('modal-title').textContent = title; $('modal-body').innerHTML = body; $('modal').showModal(); }
$('modal-close').addEventListener('click', () => $('modal').close());
$('modal').addEventListener('click', event => { if (event.target === $('modal')) { const rect = $('modal').getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('modal').close(); } });

function options(id, values, blank) {
  $(id).innerHTML = `<option value="">${e(blank)}</option>` + values.map(([value, label]) => `<option value="${e(value)}">${e(label)}</option>`).join('');
  if (state[id] && !values.some(([value]) => value === state[id])) state[id] = '';
  $(id).value = state[id];
}
function rebuildFilters() {
  const {data} = prepared;
  const periods = data.calendar.filter(w => w.campaignStart <= data.cutoff);
  if (state.period !== 'all' && !periods.some(w => String(w.week) === state.period)) state.period = 'all';
  $('period').innerHTML = '<option value="all">Todas las semanas al corte</option>' + periods.map(w => `<option value="${w.week}">Sem. ${w.week} · ${e(formatDate(w.campaignStart))}–${e(formatDate(w.campaignEnd < data.cutoff ? w.campaignEnd : data.cutoff))}</option>`).join('');
  $('period').value = state.period;
  const active = data.stores.filter(store => metricForStore(prepared, store.ceco, 'all').active);
  const unique = values => [...new Set(values)].sort((a,b) => a.localeCompare(b,'es-MX'));
  options('region', unique(active.map(s=>s.region)).map(v=>[v,v]), 'Todas las regiones');
  const inRegion = active.filter(s=>!state.region || s.region===state.region);
  options('dm', unique(inRegion.map(s=>s.dm)).map(v=>[v,v]), 'Todos los DM');
  options('store', inRegion.filter(s=>!state.dm || s.dm===state.dm).sort((a,b)=>a.name.localeCompare(b.name,'es-MX')).map(s=>[s.ceco,`${s.ceco} · ${s.name}`]), 'Todas las tiendas');
  $('sort').value = state.sort; $('search').value = state.query;
}
function syncURL() {
  const url = new URL(location.href); url.search = '';
  for (const key of ['region','dm','store','view','sort','period']) if (state[key] && !(['view','sort','period'].includes(key) && ['region','completion','all'].includes(state[key]))) url.searchParams.set(key,state[key]);
  if (state.query) url.searchParams.set('q',state.query);
  history.replaceState(null, '', url);
}
function progress(row) {
  const rate = row.campaignCompletion;
  const label = !row.campaignRecords ? 'Sin registro' : rate >= 1 ? 'Meta cargada alcanzada' : 'En avance';
  const width = Math.max(0, Math.min(100, (rate ?? 0) * 100));
  return `<div class="progress-header"><strong class="progress-number">${e(percent(rate))}</strong><span class="progress-state">${label}</span></div><div class="progress-track ${rate>=1?'reached':''}" role="img" aria-label="${e(percent(rate))} de la meta total cargada"><span style="width:${width.toFixed(2)}%"></span></div>`;
}
function rowHTML(row, rank, isTotal = false) {
  const meta = state.view === 'store' && !isTotal ? `${e(row.ceco+' · '+row.region)}<br>${e(row.dm)}` : `${number(row.storeCount,0)} tiendas${state.view==='dm'&&!isTotal?' · '+e(row.region):''}`;
  return `<tr><td><div class="row-name">${isTotal?'':`<span class="row-rank" aria-hidden="true">${rank+1}</span>`}<div>${isTotal?`<b>${e(row.name)}</b>`:`<button type="button" class="row-title" data-open="${e(row.id)}">${e(row.name)}</button>`}<span class="row-meta">${meta}</span>${row.dm===PENDING_DM?'<span class="row-missing">Asignación pendiente</span>':''}</div></div></td><td class="amount" data-label="Meta total cargada">${e(money(row.campaignTargetCents))}</td><td class="amount" data-label="Acumulado al corte">${e(money(row.campaignRealCents))}</td><td data-label="Avance campaña">${progress(row)}</td><td class="amount" data-label="Por recaudar">${e(money(row.campaignGapCents))}</td><td class="daily" data-label="Avance del periodo">${e(percent(row.completion))}<span class="row-meta">${row.missingTargets?'Meta pendiente':state.period==='all'?'vs. objetivo al corte':'Semana '+e(state.period)}</span></td><td>${isTotal?'':`<button type="button" class="row-open" data-open="${e(row.id)}" aria-label="Abrir ${e(row.name)}">›</button>`}</td></tr>`;
}
function compactMoney(cents) {
  if (Math.abs(cents)>=100000000) return '$'+number(cents/100000000,2)+' M';
  if (Math.abs(cents)>=100000) return '$'+number(cents/100000,1)+' mil';
  return money(cents);
}
function renderChart(series) {
  if (!series.length || !scopeRows.length) { $('weekly-chart').innerHTML = '<p class="chart-empty">Selecciona un alcance con información.</p>'; return; }
  const max = Math.max(1,...series.flatMap(w=>[w.realCents,w.targetCents]));
  const width = 820, height = 253, left = 75, right = 14, top = 25, baseline = 188;
  const band = (width-left-right)/series.length, bar = Math.min(58,band*.26), chartHeight = baseline-top;
  let svg = '';
  for (let i=0;i<=3;i++) {
    const y=baseline-i*chartHeight/3;
    svg += `<line x1="${left}" y1="${y}" x2="${width-right}" y2="${y}" stroke="#e6ece0" stroke-dasharray="${i===0?'0':'3 5'}"/><text x="${left-12}" y="${y+4}" text-anchor="end" font-size="11" fill="#82907a">${e(compactMoney(max*i/3))}</text>`;
  }
  series.forEach((week,i)=> {
    const center=left+band*(i+.5), realHeight=week.realCents/max*chartHeight, targetHeight=week.targetCents/max*chartHeight;
    svg += `<rect x="${center-bar-5}" y="${baseline-realHeight}" width="${bar}" height="${realHeight}" rx="5" fill="#006241"/><rect x="${center+5}" y="${baseline-targetHeight}" width="${bar}" height="${targetHeight}" rx="5" fill="#ebc79e"/><text x="${center-bar/2-5}" y="${Math.max(top-9,baseline-realHeight-10)}" text-anchor="middle" font-size="12" font-weight="650" fill="#006241">${e(compactMoney(week.realCents))}</text><text x="${center+bar/2+5}" y="${Math.max(top-9,baseline-targetHeight-10)}" text-anchor="middle" font-size="12" font-weight="600" fill="#997244">${e(compactMoney(week.targetCents))}</text><text x="${center}" y="${baseline+23}" text-anchor="middle" font-size="12" font-weight="650" fill="#193b32">Semana ${week.week}</text><text x="${center}" y="${baseline+42}" text-anchor="middle" font-size="10" fill="#82907a">${e(formatDate(week.campaignStart))} – ${e(formatDate(week.campaignEnd<prepared.data.cutoff?week.campaignEnd:prepared.data.cutoff))}</text>`;
  });
  const mobile = series.map(w=>`<div class="mobile-week"><div><b>Semana ${w.week}</b><span>${e(formatDate(w.campaignStart))}–${e(formatDate(w.campaignEnd < prepared.data.cutoff ? w.campaignEnd : prepared.data.cutoff))}</span></div><div><i class="real-dot"></i><span>Real</span><b>${e(money(w.realCents))}</b></div><div><i class="target-dot"></i><span>Objetivo</span><b>${e(money(w.targetCents))}</b></div></div>`).join('');
  $('weekly-chart').innerHTML = `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${e(series.map(w=>`Semana ${w.week}: real ${money(w.realCents)}, objetivo ${money(w.targetCents)}.`).join(' '))}" style="font-family:Inter,Segoe UI,Arial,sans-serif">${svg}</svg><div class="mobile-chart">${mobile}</div><div class="week-links">${series.map(w=>`<button type="button" data-week="${w.week}">Sem. ${w.week} <strong>${e(percent(w.completion))}</strong></button>`).join('')}</div>`;
}
function periodNote(data) {
  const window=periodWindow(data,state.period), weeks=data.calendar.filter(w=>w.campaignStart<=window.to&&w.campaignEnd>=window.from);
  const special=weeks.some(w=>w.week===40), current=weeks.at(-1);
  const partial = current && window.to < current.end && current.week !== 40;
  return `${special?'Semana 40: real del 1 al 4 de octubre y objetivo semanal completo. ':''}${partial?'Semana en curso: objetivo proporcional a los días calendario hasta el corte. ':''}${state.period==='all'?'Se acumulan sólo las semanas con fechas hasta el último dato real.':'Se muestra únicamente la semana elegida.'}${data.sourceSummary.missingDays.length?' Atención: la carga tiene días sin registros; revisa las notas del origen.':''}`;
}
function renderCalendar() {
  const selected = new Set(scopeRows.map(row=>row.ceco));
  $('campaign-calendar').innerHTML = '<div class="calendar-grid">'+prepared.data.calendar.map(week=>{
    const targets=prepared.data.targets.filter(r=>r[1]===week.week&&selected.has(r[0]));
    const amount=targets.length?targets.reduce((sum,r)=>sum+r[2],0):null;
    const future=week.campaignStart>prepared.data.cutoff;
    return `<div class="calendar-week ${amount==null?'missing':''}"><b>Semana ${week.week}</b><small>${e(formatDate(week.campaignStart))}–${e(formatDate(week.campaignEnd))}</small><strong>${e(money(amount))}</strong><span>${amount==null?'Objetivo pendiente':future?'Meta semanal · por venir':'Meta semanal completa'}</span></div>`;
  }).join('')+`</div><p class="calendar-caption">Metas de todas las tiendas con objetivo del alcance seleccionado. La semana 49 corresponde al 30 de noviembre${prepared.data.sourceSummary.missingCampaignWeeks.includes(49)?' y su meta falta en el Excel.':'; sólo ese día pertenece a la campaña.'}</p>`;
}
function render() {
  const {data}=prepared;
  scopeRows=selectStores(prepared,state); grouped=groupRows(scopeRows,state.view,state.sort); total=aggregate(scopeRows);
  const window=periodWindow(data,state.period);
  const title=state.store ? data.stores.find(s=>s.ceco===state.store)?.name : state.dm || state.region || 'Resumen nacional';
  const meta=`${number(scopeRows.length,0)} tiendas · ${state.period==='all'?'Acumulado':'Semana '+state.period} · ${formatDate(window.from)}–${formatDate(window.to)}`;
  context={title,meta,periodNote:periodNote(data),dailyNote:`Objetivo diario de la semana ${state.period==='all'?data.calendar.find(w=>w.campaignStart<=data.cutoff&&w.campaignEnd>=data.cutoff)?.week:state.period}, tomado del Excel.`};
  $('scope-title').textContent=title; $('scope-meta').textContent=meta;
  const partial = total.campaignMissingTargets > 0;
  const goalLabel = partial ? 'Meta total cargada' : 'Meta total de campaña';
  $('kpis').innerHTML = `<article class="kpi"><div class="kpi-label">${goalLabel}</div><strong>${e(money(total.campaignTargetCents))}</strong><p>Objetivos de octubre + noviembre</p></article><article class="kpi primary"><div class="kpi-label">Acumulado al corte</div><strong>${e(money(total.campaignRealCents))}</strong><p>Del ${e(formatDate(data.config.campaign.start))} al ${e(formatDate(data.cutoff))}</p></article><article class="kpi"><div class="kpi-label">Avance de campaña</div><strong>${e(percent(total.campaignCompletion))}</strong><div class="mini-track" aria-hidden="true"><span style="width:${Math.max(0,Math.min(100,(total.campaignCompletion??0)*100)).toFixed(2)}%"></span></div><p>Acumulado ÷ meta total cargada</p></article><article class="kpi"><div class="kpi-label">Por recaudar</div><strong>${e(money(total.campaignGapCents))}</strong><p>Para alcanzar la meta total cargada</p></article>`;
  $('campaign-summary').innerHTML = `<div><span class="eyebrow">CAMPAÑA · ${e(formatDate(data.config.campaign.start))} — ${e(formatDate(data.config.campaign.end))}</span><h3>${scopeRows.length?'Llevamos '+e(percent(total.campaignCompletion))+' de la meta cargada.':'Sin tiendas con objetivo para este alcance.'}</h3><p>Meta ${e(money(total.campaignTargetCents))} · Acumulado ${e(money(total.campaignRealCents))} · Por recaudar ${e(money(total.campaignGapCents))}</p></div><div class="campaign-bar" role="img" aria-label="${e(percent(total.campaignCompletion))} de avance"><span style="width:${Math.max(0,Math.min(100,(total.campaignCompletion??0)*100)).toFixed(2)}%"></span></div>`;
  $('campaign-note').hidden=!partial;
  $('campaign-note').textContent=partial?'Meta total cargada: faltan '+number(total.campaignMissingTargets,0)+' objetivos por tienda y semana. Revisa el calendario; no se estiman metas faltantes. El porcentaje se compara contra los objetivos disponibles.':'';
  $('comparison-reading').textContent=`${number(scopeRows.length,0)} tiendas con objetivo. ${number(total.storeCount-total.campaignNoRecordStores,0)} con registro y ${number(total.campaignNoRecordStores,0)} sin registro. El resumen de campaña conserva todo el acumulado; el selector de semana cambia sólo el detalle del periodo.`;
  $('period-note').textContent=context.periodNote;
  const series=weeklySeries(prepared,scopeRows,state.period);
  renderChart(series);
  $('chart-subtitle').textContent=state.period==='all'?'Recaudación registrada por semana':'Comparación de la semana seleccionada';
  $('daily-target').textContent=number(Math.max(0,dayNumber(data.config.campaign.end)-dayNumber(data.cutoff)),0);
  $('daily-week').textContent=`Cierre · ${formatDate(data.config.campaign.end,true)}`;
  $('records-info').textContent=`${number(total.storeCount-total.campaignNoRecordStores,0)} de ${number(scopeRows.length,0)} tiendas`;
  const labels={region:'región',dm:'DM',store:'tienda'};
  $('ranking-title').textContent=`Resultados por ${labels[state.view]}`;
  $('name-heading').textContent={region:'Región',dm:'DM',store:'Tienda'}[state.view];
  $('ranking-meta').textContent=state.view==='region'?'Abre una región para ver sus DM.':state.view==='dm'?'Abre un DM para ver sus tiendas.':'Abre una tienda para consultar sus días y objetivos.';
  document.querySelectorAll('[data-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===state.view)));
  $('table-body').innerHTML=grouped.map((row,index)=>rowHTML(row,index)).join('');
  $('table-total').innerHTML=scopeRows.length?rowHTML({...total,name:'TOTAL'},0,true):'';
  $('empty-state').hidden=scopeRows.length>0; $('results').hidden=!scopeRows.length;
  $('table-count').textContent=`${number(grouped.length,0)} ${state.view==='region'?'regiones':state.view==='dm'?'DM':'tiendas'} · ${number(scopeRows.length,0)} tiendas en el alcance`;
  $('export').disabled=!scopeRows.length;
  $('cutoff').textContent=formatDate(data.cutoff,true); $('footer-cutoff').textContent=`Información real al ${formatDate(data.cutoff,true)}`;
  $('source-note-count').textContent=`${data.notes.length} notas`;
  $('source-notes-content').innerHTML=`<p>Evaluación: sólo CeCo con meta total mayor a cero. Real: exportación Va X Cuenta. Objetivo proyectado: VaxCuenta Objetivos 26. Nombre, región y DM actuales: Directorio.xlsx de VaXCuenta. Los archivos se vinculan por CeCo.</p><p>${e(number(data.sourceSummary.excludedRows,0))} registros previos al inicio de la campaña (${e(money(data.sourceSummary.excludedCents))}) quedan fuera del avance. ${e(number(data.sourceSummary.noRealRecord.length,0))} tiendas activas no tienen fila de recaudación en la campaña; se muestran como sin registro.</p><p><b>Asignación vigente:</b> el directorio se aplica tanto al real como al objetivo. ${e(number((data.sourceSummary.regionChanges||[]).length,0))} cambios de región identificados.</p><div class="assignment-list">${(data.sourceSummary.regionChanges||[]).map(change=>`<p><b>${e(change.ceco)}</b> · ${e(data.stores.find(store=>store.ceco===change.ceco)?.name||change.ceco)}<br><span>Región en metas: ${e(change.targetRegion)}. Región vigente: <b>${e(change.directoryRegion)}</b>.</span></p>`).join('')}</div><p>CeCo repetidos consolidados: ${e(number((data.sourceSummary.directoryDuplicateKeysCollapsed||[]).length,0))}. Estatus por confirmar: ${e((data.sourceSummary.directoryStatusConflicts||[]).join(', ')||'ninguno')}.</p>${(data.sourceSummary.missingDirectory||[]).length?`<details><summary>Tiendas pendientes de incorporar al directorio (${data.sourceSummary.missingDirectory.length})</summary><ul>${data.sourceSummary.missingDirectory.map(key=>`<li><b>${e(key)}</b> · ${e(data.stores.find(store=>store.ceco===key)?.name||'Tienda por confirmar')}</li>`).join('')}</ul><p>Incluye tiendas con metas futuras. Sus importes se conservan en Por asignar cuando el periodo tenga meta o real.</p></details>`:''}<ul>${data.notes.map(note=>`<li>${e(note)}</li>`).join('')}</ul><p class="source-revision">Corte ${e(formatDate(data.cutoff,true))} · Revisión ${e(data.revision)}</p>`;
  renderCalendar(); syncURL();
}

function changeFilter(key,value) { state[key]=value; if(key==='region'){state.dm='';state.store='';} if(key==='dm')state.store=''; rebuildFilters();render(); }
for(const id of ['region','dm','store','period','sort'])$(id).addEventListener('change',event=>changeFilter(id,event.target.value));
$('reset').addEventListener('click',()=>{ Object.assign(state,{region:'',dm:'',store:'',period:'all',query:'',sort:'completion',view:'region'});rebuildFilters();render(); });
let searchTimer; $('search').addEventListener('input',event=>{ state.query=event.target.value.slice(0,150); clearTimeout(searchTimer);searchTimer=setTimeout(render,130); });
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{state.view=button.dataset.view;render();}));
$('weekly-chart').addEventListener('click',event=>{ const button=event.target.closest('[data-week]');if(button)changeFilter('period',button.dataset.week); });
$('table-body').addEventListener('click',event=>{
  const button=event.target.closest('[data-open]');if(!button)return;
  const row=grouped.find(r=>r.id===button.dataset.open);if(!row)return;
  if(state.view==='region'){state.region=row.name;state.dm='';state.store='';state.view='dm';rebuildFilters();render();$('scope-title').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}
  else if(state.view==='dm'){state.dm=row.name;state.store='';state.view='store';rebuildFilters();render();$('scope-title').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}
  else showStore(row);
});
function showStore(row) {
  const days=dailySeries(prepared,row.ceco,state.period), weeks=weeklySeries(prepared,[row],state.period);
  showModal(`${row.ceco} · ${row.name}`,`<div class="detail-context"><b>${e(row.region)}</b> · ${e(row.dm)}<br>Último registro de esta tienda: ${e(formatDate(row.latestDay,true))}</div><div class="detail-grid"><div class="detail-card"><small>Meta total cargada</small><strong>${e(money(row.campaignTargetCents))}</strong></div><div class="detail-card"><small>Acumulado de campaña</small><strong>${e(money(row.campaignRealCents))}</strong></div><div class="detail-card"><small>Avance campaña</small><strong>${e(percent(row.campaignCompletion))}</strong></div><div class="detail-card"><small>Por recaudar</small><strong>${e(money(row.campaignGapCents))}</strong></div></div><h3>Detalle del periodo</h3><div class="detail-grid"><div class="detail-card"><small>Recaudado</small><strong>${e(money(row.realCents))}</strong></div><div class="detail-card"><small>Objetivo al corte</small><strong>${e(money(row.targetCents))}</strong></div><div class="detail-card"><small>Avance</small><strong>${e(percent(row.completion))}</strong></div></div><h3>Objetivos por semana</h3><table class="detail-daily"><thead><tr><th>Semana</th><th>Donativos / día</th><th>Meta semanal $</th></tr></thead><tbody>${weeks.map(w=>`<tr><td>${w.week}</td><td>${e(number(w.dailyDonations))}</td><td>${e(money(w.fullTargetCents))}</td></tr>`).join('')}</tbody></table><h3>Recaudación por día</h3><table class="detail-daily"><thead><tr><th>Día</th><th>Real registrado</th></tr></thead><tbody>${days.map(day=>`<tr><td>${e(formatDate(day.date,true))}</td><td>${day.realCents==null?'Sin registro':e(money(day.realCents))}</td></tr>`).join('')}</tbody></table><p>Sin registro indica que el CSV no contiene una fila para ese día. El corte general se conserva para comparar todas las tiendas con el mismo objetivo.</p>`);
}
$('review-source').addEventListener('click',()=>{ $('source-validation').open=true; $('source-validation').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}); });
$('help').addEventListener('click',()=>showModal('Cómo leer VaXCuenta',`<p><b>Meta total cargada:</b> suma de todos los objetivos de octubre y noviembre. <b>Avance de campaña:</b> acumulado completo al corte ÷ meta total cargada. <b>Por recaudar:</b> diferencia pendiente contra esa misma meta. Sólo participan CeCo con objetivo positivo; una meta faltante se señala sin inventarla.</p><p>La consulta inicia en el acumulado de la campaña al último dato real. Elige Región, DM o Tienda para enfocar la información.</p><ol><li><b>Directorio vigente:</b> nombre, región y DM de Directorio.xlsx. Si falta una tienda, sus importes se conservan en Por asignar.</li><li><b>Recaudado real:</b> suma de los pesos registrados en el CSV, dentro del periodo elegido.</li><li><b>Objetivo al corte:</b> suma de las metas de las mismas tiendas. La semana 40 conserva su objetivo semanal completo; el real sólo considera del 1 al 4 de octubre. Las siguientes semanas en curso usan la proporción de días calendario hasta el corte.</li><li><b>Avance:</b> recaudado ÷ objetivo. Un resultado de 100% significa que se alcanzó la proyección del periodo.</li><li><b>Faltante:</b> pesos necesarios para alcanzar ese objetivo. Si se supera, verás el importe sobre el objetivo.</li></ol><h3>El objetivo diario es un número</h3><p>Se muestra el dato de donativos diarios del Excel, sin convertirlo a moneda. Algunas tiendas tienen una base diaria distinta de siete días; se conserva el dato original. La comparación monetaria usa la meta semanal.</p><h3>Sobre el 7%</h3><p>Es la participación utilizada para construir la proyección. Este CSV sólo contiene recaudación: el tablero no calcula participación real en tickets.</p><p>Región, DM y Tienda son niveles de consulta. El botón Exportar utiliza exactamente los filtros de la pantalla.</p>`));
$('export').addEventListener('click',()=>{
  clearTimeout(searchTimer);render();
  const snapshot={rows:[...grouped],stores:[...scopeRows],total:{...total},data:prepared.data,state:{...state},context:{...context}};
  let report;
  try{report=buildReport(snapshot.rows,snapshot.total,snapshot.data,snapshot.state,snapshot.context,snapshot.stores);}
  catch(error){toast(error.message);return;}
  showModal('Exportar el reporte',`<div class="export-preview"><p><b>${e(report.title)}</b><br>${e(report.period)} · Real: ${e(report.dates)}<br>Archivo actualizado al ${e(formatDate(snapshot.data.cutoff,true))}${report.search?'<br>Búsqueda: '+e(report.search):''}</p><dl><div><dt>Meta total cargada</dt><dd>${e(money(snapshot.total.campaignTargetCents))}</dd></div><div><dt>Acumulado campaña</dt><dd>${e(money(snapshot.total.campaignRealCents))}</dd></div><div><dt>Avance campaña</dt><dd>${e(percent(snapshot.total.campaignCompletion))}</dd></div><div><dt>Por recaudar</dt><dd>${e(money(snapshot.total.campaignGapCents))}</dd></div></dl><p>${e(report.campaignNote)}</p><h3>Detalle del periodo</h3><dl><div><dt>Real MXN</dt><dd>${e(money(snapshot.total.realCents))}</dd></div><div><dt>Objetivo MXN</dt><dd>${e(money(snapshot.total.targetCents))}</dd></div><div><dt>Avance</dt><dd>${e(percent(snapshot.total.completion))}</dd></div><div><dt>Tiendas</dt><dd>${number(snapshot.total.storeCount,0)}</dd></div></dl><p>${e(report.coverage)}</p><p>${e(report.interpretation)}</p><p><b>Asignaciones:</b> Directorio.xlsx · mismo alcance para real y proyección.</p></div><button type="button" id="export-pdf" class="export-choice"><span class="export-icon">PDF</span><span><strong>Descargar resumen PDF</strong><small>${e(report.summaryLabel)}, lectura del avance y datos que requieren revisión.</small></span></button><button type="button" id="export-xlsx" class="export-choice"><span class="export-icon">XLSX</span><span><strong>Descargar Excel para validar</strong><small>Ocho hojas: campaña, resumen del periodo, validación, tiendas, real y metas del periodo y de campaña. Incluye la región vigente y la región original de metas.</small></span></button><button type="button" id="export-pdf-detail" class="export-choice export-secondary"><span class="export-icon">PDF</span><span><strong>Descargar PDF con todas las tiendas</strong><small>Resumen más detalle de los ${number(snapshot.total.storeCount,0)} CeCo del alcance.</small></span></button><p class="export-hint">Los archivos conservan esta consulta. Avance = suma real ÷ suma objetivo. El objetivo diario es un número de donativos.</p>`);
  let exporting=false;
  const setExporting=value=>{exporting=value;for(const id of ['export-xlsx','export-pdf','export-pdf-detail'])$(id).disabled=value;};
  $('export-xlsx').addEventListener('click',()=>{
    if(exporting)return;
    try{downloadXLSX(snapshot.rows,snapshot.total,snapshot.data,snapshot.state,snapshot.context,snapshot.stores);$('modal').close();toast('Excel descargado con el alcance y periodo de esta consulta.');}
    catch(error){toast(error.message||'No se pudo preparar el Excel. Vuelve a intentar.');}
  });
  for(const [id,mode] of [['export-pdf','summary'],['export-pdf-detail','detail']])$(id).addEventListener('click',async()=>{
    if(exporting)return;setExporting(true);toast('Preparando el PDF de esta consulta…');
    try{await downloadPDF(snapshot.rows,snapshot.total,snapshot.data,snapshot.state,snapshot.context,snapshot.stores,mode);$('modal').close();toast(mode==='detail'?'PDF descargado con todas las tiendas.':'Resumen PDF descargado.');}
    catch(error){toast(error.message||'No se pudo preparar el PDF. Actualiza el sitio y vuelve a intentar.');}
    finally{setExporting(false);}
  });
});
$('copy-link').addEventListener('click',async()=>{ try { syncURL();await navigator.clipboard.writeText(location.href);toast('Enlace de esta consulta copiado.'); } catch { showModal('Enlace de esta consulta',`<p>Copia el enlace del campo.</p><label>Enlace<input class="copy-url" type="text" readonly value="${e(location.href)}"></label>`);$('modal-body').querySelector('input').select(); }});
$('refresh').addEventListener('click',()=>loadData(false));
window.addEventListener('popstate',()=>location.reload());

async function loadData(quiet=false) {
  if(busy || (quiet && Date.now()-lastCheck<60000))return;
  busy=true;$('refresh').disabled=true;
  try {
    const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),15000);
    let response;
    try { response=await fetch(new URL('./data/dashboard.json',import.meta.url),{cache:'no-store',signal:controller.signal}); } finally {clearTimeout(timer);}
    if(!response.ok)throw new Error('No se pudo cargar el corte.');
    const data=await response.json();
    if(!prepared||prepared.data.revision!==data.revision){prepared=prepare(data);rebuildFilters();render();if(quiet)toast(`Información actualizada al ${formatDate(data.cutoff,true)}.`);}
    else if(!quiet)toast(`Consulta al día: corte ${formatDate(data.cutoff,true)}.`);
    $('load-state').hidden=true;$('report').hidden=false;
    if(response.headers.get('X-VaXCuenta-Offline')==='true')toast('Sin conexión. Se muestra el último corte descargado.');
    lastCheck=Date.now();
  } catch(error) {
    if(prepared){if(!quiet)toast('No fue posible actualizar. Conservamos el corte visible.');}
    else {$('load-state').classList.add('error');$('load-state').innerHTML='<b>No se pudo abrir el corte de VaXCuenta.</b><br>Revisa tu conexión. Si estás abriendo archivos locales, usa el servidor indicado en LEEME_PRIMERO.md.<br><button class="button solid" id="retry-load" type="button">Volver a intentar</button>';$('retry-load').addEventListener('click',()=>loadData());}
  } finally {busy=false;$('refresh').disabled=false;}
}
setupPWA({showModal,toast,refresh:loadData});
loadData();
