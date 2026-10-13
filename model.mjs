const DAY = 86400000;
export const PENDING_DM = 'DM pendiente de asignación';
export function dayNumber(iso) { return Date.parse(`${iso}T00:00:00Z`) / DAY; }
export function dayISO(number) { return new Date(number * DAY).toISOString().slice(0, 10); }
export function formatDate(iso, long = false) {
  if (!iso) return 'Sin registro';
  return new Intl.DateTimeFormat('es-MX', {day: 'numeric', month: long ? 'long' : 'short', year: long ? 'numeric' : undefined, timeZone: 'UTC'}).format(new Date(`${iso}T00:00:00Z`));
}
export function money(cents, decimals = 0) {
  if (cents == null) return '—';
  const value = cents / 100;
  const digits = value % 1 ? 2 : decimals;
  return new Intl.NumberFormat('es-MX', {style: 'currency', currency: 'MXN', minimumFractionDigits: digits, maximumFractionDigits: digits}).format(value);
}
export function number(value, digits = 1) {
  return value == null ? '—' : new Intl.NumberFormat('es-MX', {maximumFractionDigits: digits}).format(value);
}
export function percent(value) { return value == null ? '—' : `${number(value * 100, 1)}%`; }
export function fold(value) { return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
export function escapeHTML(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

export function periodWindow(data, period = 'all') {
  if (period === 'all') return {from: data.config.campaign.start, to: data.cutoff};
  const week = data.calendar.find(w => String(w.week) === String(period));
  if (!week) throw new Error('Periodo desconocido.');
  return {from: week.campaignStart, to: week.campaignEnd < data.cutoff ? week.campaignEnd : data.cutoff};
}

export function targetAtCutoff(data, target, week, cutoff) {
  if (cutoff < week.campaignStart) return 0;
  if (data.config.firstWeekFullTarget && week.week === data.calendar[0].week) return target[2];
  const elapsed = Math.max(0, Math.min(7, dayNumber(cutoff) - dayNumber(week.start) + 1));
  return Math.round(target[2] * elapsed / 7);
}

export function prepare(data) {
  if (data.schemaVersion !== 1 || !Array.isArray(data.actuals) || !Array.isArray(data.targets) || !Array.isArray(data.stores)) throw new Error('Los datos no tienen el formato de VaXCuenta.');
  const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(dayNumber(value)) && dayISO(dayNumber(value)) === value;
  if (!data.config?.campaign || !Array.isArray(data.calendar) || !data.calendar.length ||
      !validDate(data.cutoff) || !validDate(data.config.campaign.start) || !validDate(data.config.campaign.end) ||
      data.cutoff < data.config.campaign.start || data.cutoff > data.config.campaign.end ||
      !Number.isFinite(data.config.campaign.donationPesos) || data.config.campaign.donationPesos <= 0) throw new Error('El calendario o el corte no son válidos.');
  const byStore = new Map(data.stores.map(store => [store.ceco, {store, targets: new Map(), actuals: []}]));
  if (byStore.size !== data.stores.length || data.stores.some(store => !/^\d{5}$/.test(store.ceco))) throw new Error('Tiendas duplicadas o CeCo inválido.');
  const weeks = new Set(data.calendar.map(week => week.week));
  for (const row of data.targets) {
    const entry = byStore.get(row[0]);
    if (!entry || entry.targets.has(row[1])) throw new Error('Metas duplicadas o tienda no identificada.');
    if (!weeks.has(row[1]) || !Number.isSafeInteger(row[2]) || row[2] < 0 ||
        !Number.isFinite(row[3]) || row[3] < 0 || !Number.isFinite(row[4]) || row[4] < 0 ||
        Math.abs(row[3] * data.config.campaign.donationPesos * 100 - row[2]) > 1) throw new Error('Meta inválida o importe que no concilia con la proyección.');
    entry.targets.set(row[1], row);
  }
  const actualKeys = new Set();
  for (const row of data.actuals) {
    const entry = byStore.get(row[0]);
    if (!entry || !validDate(row[1]) || row[1] < data.config.campaign.start || row[1] > data.cutoff || !Number.isSafeInteger(row[2])) throw new Error('Real inválido o fuera de la campaña o del corte.');
    const key = `${row[0]}/${row[1]}`;
    if (actualKeys.has(key)) throw new Error('Real duplicado para el mismo CeCo y día.');
    actualKeys.add(key);
    entry.actuals.push(row);
  }
  for (const entry of byStore.values()) entry.actuals.sort((a, b) => a[1].localeCompare(b[1]));
  return {data, byStore, metrics: new Map()};
}

export function metricForStore(prepared, ceco, period = 'all') {
  const {data, byStore} = prepared;
  const cacheKey = `${ceco}/${period}`;
  if (prepared.metrics.has(cacheKey)) return prepared.metrics.get(cacheKey);
  const entry = byStore.get(ceco);
  if (!entry) throw new Error('Tienda desconocida.');
  const window = periodWindow(data, period);
  const selectedWeeks = data.calendar.filter(w => w.campaignStart <= window.to && w.campaignEnd >= window.from);
  const firstTarget = entry.targets.size ? Math.min(...entry.targets.keys()) : Infinity;
  const actuals = entry.actuals.filter(r => r[1] >= window.from && r[1] <= window.to);
  const eligibleWeeks = selectedWeeks.filter(w => w.week >= firstTarget || actuals.some(row => row[1] >= w.campaignStart && row[1] <= w.campaignEnd));
  const campaignTargetCents = [...entry.targets.values()].reduce((sum, row) => sum + row[2], 0);
  const campaignRealCents = entry.actuals.reduce((sum, row) => sum + row[2], 0);
  const campaignMissingTargets = data.calendar.filter(w => w.week >= firstTarget && !entry.targets.has(w.week)).length;
  const campaignRecords = entry.actuals.length;
  const active = campaignTargetCents > 0;
  let targetCents = 0, fullTargetCents = 0, missingTargets = 0;
  for (const week of eligibleWeeks) {
    const target = entry.targets.get(week.week);
    if (target) {
      targetCents += targetAtCutoff(data, target, week, window.to);
      fullTargetCents += target[2];
    } else missingTargets++;
  }
  if (actuals.length && !eligibleWeeks.length) missingTargets++;
  const latestWeek = selectedWeeks.at(-1);
  const latestTarget = latestWeek && entry.targets.get(latestWeek.week);
  const realCents = actuals.reduce((sum, row) => sum + row[2], 0);
  const completion = targetCents > 0 && !missingTargets ? realCents / targetCents : null;
  const metric = {...entry.store, active, campaignTargetCents, campaignRealCents, campaignMissingTargets, campaignRecords,
    campaignCompletion: campaignTargetCents > 0 ? campaignRealCents / campaignTargetCents : null,
    campaignGapCents: Math.max(0, campaignTargetCents - campaignRealCents), realCents, targetCents, fullTargetCents, missingTargets,
    records: actuals.length, storeCount: 1, stores: [ceco], latestDay: actuals.at(-1)?.[1] ?? null,
    dailyDonations: latestTarget?.[4] ?? null, weeklyDonations: latestTarget?.[3] ?? null,
    completion, gapCents: Math.max(0, targetCents - realCents),
    equivalents: realCents / (data.config.campaign.donationPesos * 100)};
  prepared.metrics.set(cacheKey, metric);
  return metric;
}

export function aggregate(rows, name = 'Total') {
  const result = {name, campaignTargetCents: 0, campaignRealCents: 0, campaignMissingTargets: 0, campaignRecords: 0, campaignNoRecordStores: 0, realCents: 0, targetCents: 0, fullTargetCents: 0, missingTargets: 0,
    records: 0, storeCount: rows.length, stores: [], latestDay: null,
    dailyDonations: 0, weeklyDonations: 0, noRecordStores: 0, pendingDmStores: 0};
  for (const row of rows) {
    for (const field of ['realCents', 'targetCents', 'fullTargetCents', 'missingTargets', 'records', 'campaignTargetCents', 'campaignRealCents', 'campaignMissingTargets', 'campaignRecords']) result[field] += row[field] ?? 0;
    result.stores.push(row.ceco);
    if (row.latestDay && (!result.latestDay || row.latestDay > result.latestDay)) result.latestDay = row.latestDay;
    if (row.dailyDonations == null) result.dailyDonations = null;
    else if (result.dailyDonations != null) result.dailyDonations += row.dailyDonations;
    if (row.weeklyDonations == null) result.weeklyDonations = null;
    else if (result.weeklyDonations != null) result.weeklyDonations += row.weeklyDonations;
    if (!row.records) result.noRecordStores++;
    if (!row.campaignRecords) result.campaignNoRecordStores++;
    if (row.dm === PENDING_DM) result.pendingDmStores++;
  }
  result.campaignCompletion = result.campaignTargetCents > 0 ? result.campaignRealCents / result.campaignTargetCents : null;
  result.campaignGapCents = Math.max(0, result.campaignTargetCents - result.campaignRealCents);
  result.completion = result.targetCents > 0 && !result.missingTargets ? result.realCents / result.targetCents : null;
  result.gapCents = Math.max(0, result.targetCents - result.realCents);
  result.deltaCents = result.realCents - result.targetCents;
  return result;
}

export function selectStores(prepared, state = {}) {
  const query = fold(state.query).trim();
  return prepared.data.stores.filter(store =>
    (!state.region || store.region === state.region) && (!state.dm || store.dm === state.dm) &&
    (!state.store || store.ceco === state.store) &&
    (!query || fold([store.ceco, store.name, store.region, store.dm].join(' ')).includes(query)))
    .map(store => metricForStore(prepared, store.ceco, state.period || 'all')).filter(row => row.active);
}

export function groupRows(rows, view = 'region', sort = 'completion') {
  if (view === 'store') return sortRows(rows.map(row => ({...row, id: row.ceco})), sort);
  const groups = new Map();
  for (const row of rows) {
    const key = row[view];
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return sortRows([...groups].map(([key, stores]) => ({...aggregate(stores, key), id: key,
    region: [...new Set(stores.map(row => row.region))].join(', '), dm: view === 'dm' ? key : ''})), sort);
}

export function sortRows(rows, sort) {
  return [...rows].sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name, 'es-MX');
    if (sort === 'real') return b.campaignRealCents - a.campaignRealCents || a.name.localeCompare(b.name, 'es-MX');
    const aRate = a.campaignCompletion, bRate = b.campaignCompletion;
    if (aRate == null && bRate != null) return 1;
    if (bRate == null && aRate != null) return -1;
    return (sort === 'lowest' ? 1 : -1) * ((aRate ?? -1) - (bRate ?? -1)) || b.realCents - a.realCents;
  });
}

export function weeklySeries(prepared, rows, period = 'all') {
  const window = periodWindow(prepared.data, period);
  return prepared.data.calendar.filter(week => week.campaignStart <= window.to && week.campaignEnd >= window.from)
    .map(week => ({...week, ...aggregate(rows.map(row => metricForStore(prepared, row.ceco, String(week.week))).filter(row => row.active))}));
}

export function dailySeries(prepared, ceco, period = 'all') {
  const window = periodWindow(prepared.data, period), entry = prepared.byStore.get(ceco);
  const byDay = new Map(entry.actuals.map(row => [row[1], row[2]]));
  const result = [];
  for (let day = dayNumber(window.from); day <= dayNumber(window.to); day++) {
    const iso = dayISO(day);
    result.push({date: iso, realCents: byDay.has(iso) ? byDay.get(iso) : null});
  }
  return result;
}
