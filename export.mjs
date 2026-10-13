import {escapeHTML as e, money, number, percent, formatDate} from './model.mjs';
export {downloadXLSX} from './xlsx-export.mjs';
export {downloadPDF} from './pdf-export.mjs';

export function csvCell(value) {
  let text = String(value ?? '');
  if (/^[\s]*[=+@-]/.test(text) && typeof value !== 'number') text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildCSV(rows, total, data, state) {
  const header = ['Vista', 'Nombre', 'CeCo', 'Región', 'DM', 'Tiendas', 'Recaudado MXN', 'Objetivo al corte MXN', 'Avance %', 'Faltante MXN', 'Objetivo donativos diarios', 'Información al', 'Periodo'];
  const line = row => [state.view, row.name, row.ceco ?? '', row.region ?? '', row.dm ?? '', row.storeCount,
    row.realCents / 100, row.targetCents / 100, row.completion == null ? '' : +(row.completion * 100).toFixed(6), row.gapCents / 100,
    row.dailyDonations == null ? '' : +row.dailyDonations.toFixed(6), data.cutoff, state.period === 'all' ? 'Acumulado al corte' : `Semana ${state.period}`];
  return '\ufeff' + [header, ...rows.map(line), line({...total, name: 'TOTAL'})].map(row => row.map(csvCell).join(';')).join('\r\n');
}

export function downloadCSV(rows, total, data, state) {
  const blob = new Blob([buildCSV(rows, total, data, state)], {type: 'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = `VaXCuenta_${state.view}_${data.cutoff}.csv`;
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function printHTML(rows, total, data, state, context) {
  const labels = {region: 'Región', dm: 'DM', store: 'Tienda'};
  const asset = new URL('./assets/campaign-frame.png', context.baseURL).href;
  const rowHTML = row => `<tr><td><b>${e(row.name)}</b><small>${row.ceco ? e(`${row.ceco} · ${row.region} · ${row.dm}`) : e(`${number(row.storeCount, 0)} tiendas${state.view === 'dm' ? ' · ' + row.region : ''}`)}</small></td><td>${e(money(row.realCents))}${!row.records ? '<small>Sin registro</small>' : ''}</td><td>${e(money(row.targetCents))}${row.missingTargets ? '<small>Meta incompleta</small>' : ''}</td><td>${e(percent(row.completion))}</td><td>${row.missingTargets ? '—' : e(money(row.gapCents))}</td><td>${e(number(row.dailyDonations))}</td></tr>`;
  return `<!doctype html><html lang="es-MX"><head><meta charset="utf-8"><title>VaXCuenta ${e(data.cutoff)}</title><style>
  @page{size:letter landscape;margin:13mm 12mm 15mm}*{box-sizing:border-box}body{font:10px 'Segoe UI',Arial,sans-serif;color:#193b32;margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}.head{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #dc6b20;padding-bottom:14px;margin-bottom:16px}.logo{width:103px;height:69px;background:#ff6900;border-radius:9px;padding:3px}.head h1{font-size:24px;margin:0 0 7px;color:#006241}.head p{margin:0;color:#69766c;font-size:10px;line-height:1.6}.cut{text-align:right;font-size:11px}.cut b{display:block;color:#006241;font-size:13px;margin-top:5px}.cards{display:flex;gap:10px;margin-bottom:14px}.card{flex:1;border:1px solid #dee5d7;border-radius:8px;padding:13px 15px;background:#f7faf3}.card:first-child{background:#006241;color:white}.card small{display:block;font-size:9px}.card b{font-size:22px;display:block;margin-top:7px}.context{font-size:10px;margin:12px 0 15px;line-height:1.7}table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:10px}thead{display:table-header-group}th{background:#edf4e8;text-align:right;color:#5c6a60;font-size:9px;padding:10px 8px;border-bottom:1px solid #cddac6}th:first-child{text-align:left;width:34%}th:nth-child(2){width:14%}th:nth-child(3){width:15%}th:nth-child(4){width:10%}th:nth-child(5){width:13%}th:last-child{width:14%}td{padding:9px 8px;text-align:right;border-bottom:1px solid #e5eadf;vertical-align:top}td:first-child{text-align:left}tr{break-inside:avoid}td small{display:block;font-size:8px;color:#73826f;margin-top:4px;line-height:1.45}tfoot{display:table-row-group}tfoot td{background:#edf4e8;font-weight:bold;border-top:1px solid #cddac6}.notes{color:#69766c;font-size:9px;line-height:1.6;margin-top:15px}.foot{margin-top:16px;padding-top:8px;border-top:1px solid #e5eadf;font-size:8px;color:#73826f}.actions{display:flex;gap:10px;margin-bottom:18px}.actions button{background:#006241;color:white;border:0;padding:10px 15px;border-radius:7px;cursor:pointer}@media print{.actions{display:none}}
  </style></head><body><div class="actions"><button onclick="window.print()">Imprimir / Guardar como PDF</button><button onclick="window.close()">Cerrar</button></div>
  <div class="head"><div><h1>VaXCuenta</h1><p>STARBUCKS MÉXICO · Campaña del 1 de octubre al 30 de noviembre de 2026</p></div><svg class="logo" viewBox="797 870 263 176" role="img" aria-label="Va por mi cuenta"><image href="${e(asset)}" width="1080" height="1080"/></svg><div class="cut">Información real al<b>${e(formatDate(data.cutoff, true))}</b></div></div>
  <div class="cards"><div class="card"><small>Recaudado real</small><b>${e(money(total.realCents))}</b></div><div class="card"><small>${total.missingTargets ? 'Objetivo conocido (incompleto)' : 'Objetivo al corte'}</small><b>${e(money(total.targetCents))}</b></div><div class="card"><small>Avance</small><b>${e(percent(total.completion))}</b></div><div class="card"><small>Faltante</small><b>${total.missingTargets ? '—' : e(money(total.gapCents))}</b></div></div>
  <div class="context"><b>${e(context.title)}</b> · ${e(context.meta)}<br>${e(context.periodNote)}${state.query ? '<br>Búsqueda: ' + e(state.query) : ''}</div>
  <table><thead><tr><th>${labels[state.view]}</th><th>Recaudado MXN</th><th>Objetivo al corte MXN</th><th>Avance</th><th>Faltante MXN</th><th>Donativos / día</th></tr></thead><tbody>${rows.map(rowHTML).join('')}</tbody><tfoot>${rowHTML({...total, name:'TOTAL'})}</tfoot></table>
  <p class="notes">${e(context.dailyNote)} El porcentaje se calcula como real ÷ objetivo de las mismas tiendas y el mismo periodo. Un día sin fila en el CSV se identifica como sin registro. Las conversiones de pesos a donativos son equivalentes.</p><div class="foot">VaXCuenta · ${e(number(rows.length, 0))} resultados · Información real al ${e(formatDate(data.cutoff, true))} · ${e(data.revision)}</div></body></html>`;
}

export function printReport(rows, total, data, state, context) {
  const popup = window.open('', '_blank');
  if (!popup) return false;
  popup.opener = null;
  popup.document.open(); popup.document.write(printHTML(rows, total, data, state, {...context, baseURL: document.baseURI})); popup.document.close();
  // Leave the reviewable print page open; users choose their own paper/PDF destination.
  popup.addEventListener('load', () => { popup.focus(); popup.print(); }, {once:true});
  return true;
}
