/* Page controller. All outputs use ClimateCore's validated, full-precision model. */
(() => {
  'use strict';
  const C = window.ClimateCore, $ = id => document.getElementById(id);
  const keys = Object.keys(C.FIELDS), cache = new Map(), libraries = new Map();
  let model = null, chart = null, chartKind = 'temperature', page = 0, controller = null, chartRevision = 0;
  const latest = C.latestDate(), currentYear = new Date().getUTCFullYear();
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const fmt = (value, digits = 1) => C.finite(value) ? new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value) : '—';
  const monthLabel = month => new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(month + '-01T00:00:00Z'));
  function status(message, error = false) { $('status').textContent = message; $('status').hidden = !message; $('status').classList.toggle('error', error); }
  function fieldError(id, input, message) { $(id).textContent = message; $(input).setAttribute('aria-invalid', 'true'); $(input).focus(); }
  function clearErrors() { $('coordinateError').textContent = ''; $('dateError').textContent = ''; document.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid')); }
  function switchFormat() {
    const type = $('coordFormat').value;
    $('decimalFields').hidden = type !== 'decimal'; $('dmsFields').hidden = type !== 'dms'; $('utmFields').hidden = type !== 'utm';
    if (type !== 'decimal') $('coordinateOptions').open = true;
  }
  function readCoordinates() {
    const type = $('coordFormat').value;
    if (type === 'dms') return C.coordinates(C.dms($('latD').value, $('latM').value, $('latS').value, $('latDir').value), C.dms($('lonD').value, $('lonM').value, $('lonS').value, $('lonDir').value));
    if (type === 'utm') return C.utm($('utmZone').value, $('utmHemisphere').value, $('utmE').value, $('utmN').value);
    return C.decimal($('coordinates').value);
  }
  function setSite(site) { $('coordFormat').value = 'decimal'; switchFormat(); $('coordinates').value = `${site.lat}, ${site.lon}`; $('siteName').value = site.name || ''; clearErrors(); }
  function updatePeriod() { $('yearFields').hidden = $('period').value !== 'year'; $('dateFields').hidden = $('period').value !== 'custom'; }
  function readQuery() {
    clearErrors(); let point, dates;
    try { point = readCoordinates(); } catch (error) { fieldError('coordinateError', $('coordFormat').value === 'decimal' ? 'coordinates' : $('coordFormat').value === 'dms' ? 'latD' : 'utmZone', error.message); return null; }
    try {
      const period = $('period').value;
      if (period === 'custom') dates = C.range($('startDate').value, $('endDate').value, latest);
      else if (period === 'ytd') dates = C.range(`${currentYear}-01-01`, latest, latest);
      else {
        const year = Number($('year').value);
        if (!$('year').value || !Number.isInteger(year) || year < 1940 || `${year}-12-31` > latest) throw Error('Choose a completed year from 1940 onward, or use “This year to latest available”.');
        dates = C.range(`${year}-01-01`, `${year}-12-31`, latest);
      }
    } catch (error) { fieldError('dateError', $('period').value === 'custom' ? 'startDate' : $('period').value === 'year' ? 'year' : 'period', error.message); return null; }
    return { ...point, ...dates, name: $('siteName').value.trim(), period: $('period').value };
  }
  function queryUrl(query) {
    const url = new URL(location.href); url.search = ''; url.hash = '';
    for (const key of ['lat', 'lon', 'start', 'end', 'name', 'period']) if (query[key] !== '') url.searchParams.set(key, query[key]);
    return url;
  }
  function updateUrl(query) { try { history.replaceState(null, '', queryUrl(query)); } catch { /* file URLs may restrict history */ } }
  function loadUrl() {
    const p = new URLSearchParams(location.search);
    if (!p.has('lat') && !p.has('lon')) return;
    try {
      const site = C.coordinates(p.get('lat') ?? '', p.get('lon') ?? '');
      setSite({ ...site, name: (p.get('name') || '').slice(0, 80) });
      const start = p.get('start'), end = p.get('end');
      if (start && end) {
        C.range(start, end, latest); $('startDate').value = start; $('endDate').value = end;
        const year = start.slice(0, 4), mode = p.get('period');
        $('period').value = mode === 'year' && start === `${year}-01-01` && end === `${year}-12-31` ? 'year' : mode === 'ytd' && start === `${currentYear}-01-01` && end === latest ? 'ytd' : 'custom';
        $('year').value = year; updatePeriod();
      }
      status('Shared query loaded. Review the location and period, then get climate data.');
    } catch (error) { status(`Could not restore the shared query: ${error.message}`, true); }
  }
  function library(name) {
    const config = name === 'chart' ? ['Chart', 'https://cdn.jsdelivr.net/npm/chart.js@4.4.9/dist/chart.umd.min.js'] : ['XLSX', 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'];
    if (window[config[0]]) return Promise.resolve(window[config[0]]);
    if (libraries.has(name)) return libraries.get(name);
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = config[1];
      const timer = setTimeout(() => { script.remove(); libraries.delete(name); reject(Error('The download library took too long to load. Check your connection and retry.')); }, 15000);
      script.onload = () => { clearTimeout(timer); if (window[config[0]]) resolve(window[config[0]]); else { libraries.delete(name); reject(Error('The library could not initialize. Please retry.')); } };
      script.onerror = () => { clearTimeout(timer); script.remove(); libraries.delete(name); reject(Error('The library could not load. Check your connection and retry.')); };
      document.head.append(script);
    }); libraries.set(name, promise); return promise;
  }
  function metadataHtml(m) {
    return `<strong>${esc(m.query.name || 'Study site')}</strong> · ${esc(m.query.start)} → ${esc(m.query.end)}<br>Requested: ${fmt(m.query.lat, 5)}, ${fmt(m.query.lon, 5)} · Grid: ${fmt(m.source.gridLatitude, 5)}, ${fmt(m.source.gridLongitude, 5)}<br>ERA5 / Open-Meteo · ${esc(m.source.timezone || 'Timezone unavailable')} · Elevation: ${fmt(m.source.elevation, 0)} m · Retrieved: ${esc(m.source.retrievedAt.slice(0, 10))} (UTC)`;
  }
  const validDays = (stat, expected) => `${stat.count}/${expected} valid days${stat.count < expected ? ' · partial' : ''}`;
  function cardsHtml(m) {
    const s = m.summary.stats, n = m.coverage.expected;
    const cards = [
      ['temperature', 'MEAN TEMPERATURE', s.temperature_2m_mean.mean, '°C', `${fmt(s.temperature_2m_min.min)} to ${fmt(s.temperature_2m_max.max)} °C extremes`, s.temperature_2m_mean],
      ['humidity', 'MEAN RELATIVE HUMIDITY', s.relative_humidity_2m_mean.mean, '%', `${fmt(s.relative_humidity_2m_min.min)} to ${fmt(s.relative_humidity_2m_max.max)} % extremes`, s.relative_humidity_2m_mean],
      ['precipitation', 'TOTAL PRECIPITATION', s.precipitation_sum.sum, 'mm', 'Sum over valid days', s.precipitation_sum],
      ['et', 'REFERENCE ET₀', s.et0_fao_evapotranspiration.sum, 'mm', `P/ET₀: ${fmt(m.summary.ratio, 3)} · ${m.summary.pairedDays} paired days`, s.et0_fao_evapotranspiration]
    ];
    return cards.map(([cls, label, value, unit, detail, stat]) => `<article class="stat-card ${cls}"><p class="stat-label">${label}</p><div class="stat-value">${fmt(value)} <small>${unit}</small></div><div class="stat-detail">${detail}<br>${validDays(stat, n)}</div></article>`).join('');
  }
  function coverageText(m) {
    const c = m.coverage;
    return `${c.complete}/${c.expected} days complete across all variables. Last date with any valid data: ${c.last}.${c.complete < c.expected ? ' Missing values remain blank; totals may be partial. See per-variable coverage in the table.' : ''}`;
  }
  const headers = ['Month', 'T mean (°C)', 'T lowest (°C)', 'T highest (°C)', 'RH mean (%)', 'RH lowest (%)', 'RH highest (%)', 'Precip. (mm)', 'ET₀ (mm)', 'P/ET₀'];
  function monthlyTable(m, formatted = true) {
    const rows = m.months.map(month => {
      const s = month.stats;
      return [formatted ? monthLabel(month.month) : month.month, s.temperature_2m_mean.mean, s.temperature_2m_min.min, s.temperature_2m_max.max, s.relative_humidity_2m_mean.mean, s.relative_humidity_2m_min.min, s.relative_humidity_2m_max.max, s.precipitation_sum.sum, s.et0_fao_evapotranspiration.sum, month.ratio];
    });
    if (!formatted) return rows;
    return `<table><caption>Selected-period monthly values. Coverage is valid days / requested days in that month; calendar totals are ${m.months.some(x => x.expected < x.calendarDays) ? 'partial for boundary months' : 'complete if all days are valid'}.</caption><thead><tr>${headers.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map((row, i) => `<tr><th scope="row">${esc(row[0])}${m.months[i].expected < m.months[i].calendarDays ? ' *' : ''}</th>${row.slice(1).map((value, j) => {
      const month = m.months[i], stat = month.stats[keys[j]], count = j === 8 ? month.pairedDays : stat.count;
      return `<td>${fmt(value, j === 8 ? 3 : 1)}<br><span class="cell-coverage">${count}/${month.expected} days</span></td>`;
    }).join('')}</tr>`).join('')}</tbody></table>`;
  }
  function renderTable() {
    if (!model) return;
    const daily = $('tableScale').value === 'daily'; $('pagination').hidden = !daily;
    if (!daily) { $('tableContainer').innerHTML = monthlyTable(model); return; }
    const size = 31, pages = Math.ceil(model.rows.length / size); page = Math.min(page, pages - 1);
    $('tableContainer').innerHTML = `<table><caption>Daily values · source-local dates · — means missing</caption><thead><tr><th scope="col">Date</th>${keys.map(key => `<th scope="col">${esc(C.FIELDS[key][0])} (${esc(C.FIELDS[key][1])})</th>`).join('')}</tr></thead><tbody>${model.rows.slice(page * size, (page + 1) * size).map(row => `<tr><th scope="row">${row.date}</th>${keys.map(key => `<td>${fmt(row[key])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    $('prevBtn').disabled = page === 0; $('nextBtn').disabled = page >= pages - 1;
    $('pageInfo').textContent = `Days ${page * size + 1}–${Math.min((page + 1) * size, model.rows.length)} of ${model.rows.length}`;
  }
  function chartConfig(m, kind, monthly) {
    const labels = monthly ? m.months.map(month => month.month) : m.rows.map(row => row.date);
    const values = (key, op = 'mean') => monthly ? m.months.map(month => month.stats[key][op]) : m.rows.map(row => row[key]);
    const line = (label, data, color, extra = {}) => ({ label, data, borderColor: color, backgroundColor: color, borderWidth: 2, pointRadius: 0, pointHitRadius: 10, spanGaps: false, ...extra });
    let datasets, unit;
    if (kind === 'temperature') {
      unit = '°C'; datasets = [line('Lowest temperature', values('temperature_2m_min', 'min'), '#bd977b', { borderWidth: 1 }), line('Highest temperature', values('temperature_2m_max', 'max'), '#bd977b', { fill: '-1', backgroundColor: '#c9955c25', borderWidth: 1 }), line('Mean temperature', values('temperature_2m_mean'), '#a65f3f')];
    } else if (kind === 'humidity') {
      unit = '%'; datasets = [line('Mean relative humidity', values('relative_humidity_2m_mean'), '#558693')];
    } else {
      unit = 'mm'; datasets = [{ label: 'Precipitation', data: values('precipitation_sum', 'sum'), type: 'bar', backgroundColor: '#7395ab', order: 2 }, line('Reference ET₀', values('et0_fao_evapotranspiration', 'sum'), '#9c873d', { order: 1 })];
    }
    return { type: 'line', data: { labels, datasets }, options: { responsive: true, maintainAspectRatio: false, animation: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } }, title: { display: true, text: `${m.query.name || 'Study site'} · ${m.query.start} to ${m.query.end}`, color: '#526743', font: { size: 11 } }, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${fmt(ctx.parsed.y)} ${unit}${monthly && kind === 'water' ? ' (valid-day total)' : ''}` } } }, scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: monthly ? 12 : 7, maxRotation: 0, font: { size: 10 }, callback: (_, index) => monthly ? monthLabel(labels[index]) : labels[index].slice(5) } }, y: { title: { display: true, text: unit }, ...(kind === 'humidity' ? { min: 0, max: 100 } : kind === 'water' ? { beginAtZero: true } : {}), grid: { color: '#e9ecdf' } } } } };
  }
  async function drawChart() {
    if (!model) return;
    const revision = ++chartRevision;
    $('pngBtn').disabled = true;
    const monthly = $('chartScale').value === 'monthly';
    $('chartDescription').textContent = chartKind === 'temperature' ? 'Mean temperature with the lowest-to-highest range. Monthly range shows extremes within each month.' : chartKind === 'humidity' ? 'Mean relative humidity, with a fixed 0–100% scale.' : 'Precipitation and reference ET₀ totals; monthly totals may be partial. Check the coverage table.';
    try {
      const Chart = await library('chart'); if (revision !== chartRevision) return;
      if (chart) chart.destroy();
      $('climateChart').hidden = false; $('chartFallback').hidden = true;
      chart = new Chart($('climateChart'), chartConfig(model, chartKind, monthly)); $('pngBtn').disabled = false;
    } catch { if (revision !== chartRevision) return; $('climateChart').hidden = true; $('chartFallback').hidden = false; }
  }
  function preparePrint() {
    if (!model) return;
    $('printReport').innerHTML = `<h1>Climate report</h1><div>${metadataHtml(model)}</div><p>${esc(coverageText(model))}</p><div class="print-summary"><h2>Period summary</h2>${Object.entries(model.summary.stats).map(([key, stat]) => `<p>${esc(C.FIELDS[key][0])}: ${fmt(key === 'precipitation_sum' || key === 'et0_fao_evapotranspiration' ? stat.sum : key.endsWith('_min') ? stat.min : key.endsWith('_max') ? stat.max : stat.mean)} ${esc(C.FIELDS[key][1])} · ${validDays(stat, model.coverage.expected)}</p>`).join('')}<p>P/ET₀: ${fmt(model.summary.ratio, 3)} · ${model.summary.pairedDays} paired days</p></div><h2>Monthly summary</h2>${monthlyTable(model)}${chart && !$('climateChart').hidden ? `<section class="print-chart"><h2>${chartKind === 'water' ? 'Precipitation & ET₀' : chartKind === 'humidity' ? 'Humidity' : 'Temperature'} · ${$('chartScale').value}</h2><img alt="Selected climate chart" src="${chart.toBase64Image()}"></section>` : ''}<div class="print-source"><p>ERA5 regional reanalysis (~25 km), provided by Open-Meteo. This is not an on-site observation. Means exclude missing values; totals cover valid days only. Monthly coverage is valid/requested days. * marks a partial calendar month. P/ET₀ uses paired valid days and is a period ratio, not a long-term climate classification.</p><p>Chiu, C.-I. (2025). Climate Data Viewer. Chiang Mai University. https://termcic.github.io/insect_ecology/get_climate.html</p><p>Zippenfenig, P. (2023). Open-Meteo.com Weather API. https://doi.org/10.5281/zenodo.7970649 · Dataset definitions and ERA5 attribution: https://open-meteo.com/en/docs/historical-weather-api</p></div>`;
  }
  function render() {
    $('emptyState').hidden = true; $('results').hidden = false; $('resultsHeading').textContent = model.query.name || 'Climate overview';
    $('metadata').innerHTML = metadataHtml(model); $('summaryCards').innerHTML = cardsHtml(model);
    $('coverageNote').textContent = coverageText(model); $('coverageNote').classList.toggle('partial', model.coverage.complete < model.coverage.expected);
    page = 0; renderTable(); drawChart();
  }
  async function fetchClimate(event) {
    event?.preventDefault(); if (controller) return;
    const query = readQuery(); if (!query) return;
    const key = JSON.stringify([query.lat, query.lon, query.start, query.end]);
    const active = new AbortController(); controller = active;
    $('fetchBtn').disabled = true; $('fetchBtn').textContent = 'Loading climate data…'; $('cancelBtn').hidden = false;
    $('results').setAttribute('aria-busy', 'true'); $('exportBtn').disabled = true; $('pngBtn').disabled = true; $('shareBtn').disabled = true;
    status(`Loading ${query.start} to ${query.end}…${model ? ' The previous result remains visible until this query succeeds.' : ''}`);
    const timeout = setTimeout(() => active.abort('timeout'), 45000);
    try {
      let data = cache.get(key);
      if (!data) {
        const url = new URL('https://archive-api.open-meteo.com/v1/archive');
        const params = { latitude: query.lat, longitude: query.lon, start_date: query.start, end_date: query.end, daily: keys.join(','), models: 'era5', timezone: 'auto' };
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
        const res = await fetch(url, { signal: active.signal });
        const body = await res.json().catch(() => null);
        if (!res.ok || body?.error) throw Error(body?.reason || `The climate service returned HTTP ${res.status}. Please retry.`);
        data = body;
      }
      if (active.signal.aborted) throw new DOMException('Aborted', 'AbortError');
      const next = C.build(data, query); model = next;
      if (cache.size >= 5) cache.delete(cache.keys().next().value); cache.set(key, data);
      render(); updateUrl(query); status('Data loaded. Coverage and downloads refer to the result shown below.');
      $('resultsHeading').focus({ preventScroll: true });
      if (matchMedia('(max-width: 760px)').matches) $('results').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    } catch (error) {
      const message = active.signal.aborted ? active.signal.reason === 'timeout' ? 'The request timed out. Check your connection and retry.' : 'Request cancelled.' : `${error.message || 'Could not reach the climate service.'} Check your coordinates, period, and connection, then retry.`;
      status(message + (model ? ' The previous result is still shown.' : ''), !active.signal.aborted || active.signal.reason === 'timeout');
    } finally {
      clearTimeout(timeout); controller = null; $('fetchBtn').disabled = false; $('fetchBtn').innerHTML = 'Get climate data <span aria-hidden="true">→</span>'; $('cancelBtn').hidden = true; $('results').removeAttribute('aria-busy'); $('exportBtn').disabled = false; $('shareBtn').disabled = false; $('pngBtn').disabled = !chart || $('climateChart').hidden;
    }
  }
  function filename(ext, suffix) {
    const name = (model.query.name || `site_${model.query.lat}_${model.query.lon}`).normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_|_$/g, '').slice(0, 70) || 'site';
    return `climate_${name}_${model.query.start}_${model.query.end}_${suffix}.${ext}`;
  }
  function download(blob, name) {
    const url = URL.createObjectURL(blob), anchor = document.createElement('a'); anchor.href = url; anchor.download = name; document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  function metadataRows(m) {
    return [['site_name', m.query.name], ['requested_latitude', m.query.lat], ['requested_longitude', m.query.lon], ['start_date', m.query.start], ['end_date', m.query.end], ...Object.entries(m.source).filter(([key]) => key !== 'units'), ...Object.entries(m.coverage).map(([key, value]) => ['coverage_' + key, value]), ['period_p_et0', m.summary.ratio], ['paired_valid_days', m.summary.pairedDays], ['missing_policy', 'Missing values remain blank; means exclude missing; totals cover valid days only.'], ['ratio_policy', 'P/ET0 uses only dates where both values are valid; no long-term classification.'], ['tool_citation', 'Chiu, C.-I. (2025). Climate Data Viewer. Chiang Mai University.'], ['tool_url', 'https://termcic.github.io/insect_ecology/get_climate.html'], ['api_citation', 'Zippenfenig, P. (2023). Open-Meteo.com Weather API. https://doi.org/10.5281/zenodo.7970649'], ...keys.map(key => ['unit_' + key, C.FIELDS[key][1]])];
  }
  function safeCell(value) { return typeof value === 'string' && /^[=+\-@\t\r]/.test(value) ? "'" + value : value; }
  const csvCell = value => '"' + String(safeCell(value) ?? '').replaceAll('"', '""') + '"';
  async function exportData() {
    if (!model || controller) return;
    const format = $('exportFormat').value; $('exportBtn').disabled = true;
    try {
      if (format === 'pdf') { preparePrint(); window.print(); }
      else if (format === 'json') download(new Blob([JSON.stringify(model, null, 2)], { type: 'application/json' }), filename('json', 'full'));
      else if (format === 'csv') {
        // One rectangular table: metadata columns repeat per date, so CSV remains analysis-ready.
        const meta = metadataRows(model), header = ['date', ...keys.map(key => `${key} [${C.FIELDS[key][1]}]`), ...meta.map(row => row[0])];
        const rows = [header, ...model.rows.map(row => [row.date, ...keys.map(key => row[key]), ...meta.map(row => row[1])])];
        download(new Blob(['\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }), filename('csv', 'daily'));
      } else {
        const XLSX = await library('xlsx'), wb = XLSX.utils.book_new();
        const daily = [['Date', ...keys.map(key => `${C.FIELDS[key][0]} (${C.FIELDS[key][1]})`)], ...model.rows.map(row => [row.date, ...keys.map(key => row[key])])];
        const monthlyHeaders = [...headers, 'Requested days', 'Calendar days', ...keys.map(key => `${C.FIELDS[key][0]} valid days`), 'P/ET₀ paired days'];
        const monthly = [monthlyHeaders, ...monthlyTable(model, false).map((row, i) => [...row, model.months[i].expected, model.months[i].calendarDays, ...keys.map(key => model.months[i].stats[key].count), model.months[i].pairedDays])];
        for (const [name, rows] of [['Daily', daily], ['Monthly', monthly], ['Metadata', [['Key', 'Value'], ...metadataRows(model)]]]) {
          const sheet = XLSX.utils.aoa_to_sheet(rows.map(row => row.map(safeCell))); sheet['!cols'] = rows[0].map(() => ({ wch: name === 'Metadata' ? 45 : 22 })); XLSX.utils.book_append_sheet(wb, sheet, name);
        }
        XLSX.writeFile(wb, filename('xlsx', 'full'));
      }
      status(format === 'pdf' ? 'Print dialog opened. Choose “Save as PDF” to save the report.' : 'Download prepared for the displayed result.');
    } catch (error) { status(error.message, true); } finally { $('exportBtn').disabled = false; }
  }
  function loadSaved() {
    try { const values = JSON.parse(localStorage.getItem('climate.sites.v1') || '[]'); return Array.isArray(values) ? values.filter(site => typeof site?.name === 'string' && C.finite(site.lat) && C.finite(site.lon) && Math.abs(site.lat) <= 90 && Math.abs(site.lon) <= 180).slice(0, 20) : []; } catch { return []; }
  }
  function renderSaved() {
    const saved = loadSaved(); $('savedSites').replaceChildren();
    if (!saved.length) { $('savedSites').textContent = 'No sites saved yet.'; return; }
    saved.forEach((site, index) => {
      const row = document.createElement('div'); row.className = 'saved-site';
      const load = document.createElement('button'); load.type = 'button'; load.className = 'text-button'; load.textContent = site.name || `${site.lat}, ${site.lon}`; load.addEventListener('click', () => { setSite(site); status('Saved site loaded. Your period is unchanged.'); });
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'text-button'; remove.textContent = 'Remove'; remove.setAttribute('aria-label', `Remove saved site ${site.name || index + 1}`); remove.addEventListener('click', () => { try { saved.splice(index, 1); localStorage.setItem('climate.sites.v1', JSON.stringify(saved)); renderSaved(); status('Saved site removed. You can save it again from the location fields.'); } catch { status('Browser storage is unavailable.', true); } });
      row.append(load, remove); $('savedSites').append(row);
    });
  }
  $('year').value = currentYear - 1; $('year').max = Number(latest.slice(0, 4)) - (latest.endsWith('12-31') ? 0 : 1);
  $('startDate').value = `${currentYear - 1}-01-01`; $('endDate').value = `${currentYear - 1}-12-31`;
  $('startDate').max = latest; $('endDate').max = latest; $('availability').textContent = `Conservative latest date: ${latest}. Up to 10 years per request.`;
  $('coordFormat').addEventListener('change', switchFormat); $('period').addEventListener('change', updatePeriod);
  $('climateForm').addEventListener('submit', fetchClimate); $('cancelBtn').addEventListener('click', () => controller?.abort());
  function example() { setSite({ lat: 18.7883, lon: 98.9853, name: 'Chiang Mai' }); status('Chiang Mai example loaded. Choose a period, then get climate data.'); }
  $('exampleBtn').addEventListener('click', example); $('emptyExampleBtn').addEventListener('click', () => { example(); $('coordinates').focus(); $('query').scrollIntoView({ block: 'start' }); });
  $('locationBtn').addEventListener('click', () => {
    if (!navigator.geolocation) { status('Location is unavailable in this browser. Enter coordinates instead.', true); return; }
    $('locationBtn').disabled = true; status('Waiting for location permission…');
    navigator.geolocation.getCurrentPosition(position => { setSite({ lat: Number(position.coords.latitude.toFixed(6)), lon: Number(position.coords.longitude.toFixed(6)), name: '' }); $('locationBtn').disabled = false; status('Location filled. Review the period, then get climate data.'); }, error => { $('locationBtn').disabled = false; status(error.code === 1 ? 'Location permission was denied. Enter coordinates or load the example.' : 'Could not locate you. Enter coordinates or retry from an HTTPS page.', true); }, { timeout: 15000, maximumAge: 60000, enableHighAccuracy: false });
  });
  $('saveSiteBtn').addEventListener('click', () => {
    try { const point = readCoordinates(), sites = loadSaved(), site = { ...point, name: $('siteName').value.trim().slice(0, 80) }; const old = sites.findIndex(s => s.lat === site.lat && s.lon === site.lon); if (old >= 0) sites.splice(old, 1); sites.unshift(site); localStorage.setItem('climate.sites.v1', JSON.stringify(sites.slice(0, 20))); renderSaved(); status('Site saved in this browser.'); } catch (error) { status(`Could not save this site. ${error.message}`, true); }
  });
  document.querySelectorAll('[data-chart]').forEach(button => button.addEventListener('click', () => { chartKind = button.dataset.chart; document.querySelectorAll('[data-chart]').forEach(el => el.setAttribute('aria-pressed', String(el === button))); drawChart(); }));
  $('chartScale').addEventListener('change', drawChart); $('tableScale').addEventListener('change', () => { page = 0; renderTable(); });
  $('prevBtn').addEventListener('click', () => { page--; renderTable(); }); $('nextBtn').addEventListener('click', () => { page++; renderTable(); });
  $('exportBtn').addEventListener('click', exportData);
  $('pngBtn').addEventListener('click', () => { if (!chart || controller) return; chart.canvas.toBlob(blob => { if (blob) download(blob, filename('png', chartKind + '_' + $('chartScale').value)); }, 'image/png'); });
  $('shareBtn').addEventListener('click', async () => { if (!model) return; const text = queryUrl(model.query).href; try { await navigator.clipboard.writeText(text); status('Query link copied. It restores the site and selected period.'); } catch { status('Copy this query link from the address bar.'); updateUrl(model.query); } });
  window.addEventListener('beforeprint', preparePrint);
  $('climateForm').addEventListener('input', () => { if (model && !controller) status('Query edited. Get climate data to refresh; the result and downloads still refer to the displayed query.'); });
  updatePeriod(); loadUrl(); renderSaved();
})();
