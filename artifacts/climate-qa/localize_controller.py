from pathlib import Path
import re
p=Path('assets/climate.js'); s=p.read_text(encoding='utf-8-sig')
catalog=Path('assets/climate-i18n.js').read_text(encoding='utf-8-sig').split('const rows = `',1)[1].split('`;',1)[0]
phrases={line.split('|')[0] for line in catalog.strip().splitlines()}
# Explicit text translation at call sites; machine identifiers and numeric data remain unchanged.
pattern=re.compile(r"'((?:\\.|[^'\\])*)'")
def sub(m):
    value=m.group(1)
    if value not in phrases:return m.group(0)
    if s[max(0,m.start()-6):m.start()]=='Error(': return m.group(0)
    return 't('+m.group(0)+')'
s=pattern.sub(sub,s)
s=s.replace("const C = window.ClimateCore, $", "const I = window.ClimateI18n, t = I.text, html = I.html;\n  I.setLanguage(I.initialLanguage(), false);\n  const C = window.ClimateCore, $")
s=s.replace("Intl.NumberFormat('en-US'",'Intl.NumberFormat(I.locale').replace("Intl.DateTimeFormat('en-US'",'Intl.DateTimeFormat(I.locale')
s=re.sub(r'(?<![\w])`(?=<)', 'html`', s)
s=s.replace("$('status').textContent = message", "$('status').textContent = t(message)")
s=s.replace("$(id).textContent = message", "$(id).dataset.errorSource = message; $(id).textContent = t(message)")
s=s.replace("document.querySelectorAll('[aria-invalid]')", "document.querySelectorAll('[data-error-source]').forEach(el => delete el.dataset.errorSource); document.querySelectorAll('[aria-invalid]')")
s=s.replace('const headers = [', 'const headers = () => [').replace('${headers.map(', '${headers().map(').replace('[...headers,', '[...headers(),')
s=s.replace('${esc(C.FIELDS[key][0])}', '${esc(t(C.FIELDS[key][0]))}').replace('${C.FIELDS[key][0]}', '${t(C.FIELDS[key][0])}')
s=s.replace("$('fetchBtn').innerHTML = 'Get climate data <span aria-hidden=\"true\">→</span>'", "$('fetchBtn').innerHTML = html`Get climate data <span aria-hidden=\"true\">→</span>`")
s=s.replace("['Daily', daily], ['Monthly', monthly], ['Metadata',", "[I.language === 'en' ? 'Daily' : t('Daily sheet'), daily], [I.language === 'en' ? 'Monthly' : t('Monthly sheet'), monthly], [I.language === 'en' ? 'Metadata' : t('Metadata sheet'),")
# Above exact source may already wrap Daily/Monthly; handle translated variants too.
s=s.replace("[t('Daily'), daily], [t('Monthly'), monthly], ['Metadata',", "[I.language === 'en' ? 'Daily' : t('Daily sheet'), daily], [I.language === 'en' ? 'Monthly' : t('Monthly sheet'), monthly], [I.language === 'en' ? 'Metadata' : t('Metadata sheet'),")
s=s.replace("name === 'Metadata'", "name === (I.language === 'en' ? 'Metadata' : t('Metadata sheet'))")
s=s.replace("return url;\n  }", "url.searchParams.set('lang', I.language);\n    return url;\n  }")
s=s.replace("'api_citation',", "'api_citation',")
s=s.replace("return [['site_name'", "return [['export_language', I.language], ['site_name'")
s=s.replace("JSON.stringify(model, null, 2)", "JSON.stringify({ ...model, exportLanguage: I.language, fieldLabels: Object.fromEntries(keys.map(key => [key, t(C.FIELDS[key][0])])) }, null, 2)")
# Translate variable-containing messages with placeholder-based templates.
replacements={
'`${stat.count}/${expected} valid days${stat.count < expected ?': 't`${stat.count}/${expected} valid days${stat.count < expected ?',
'`${fmt(s.temperature_2m_min.min)} to ${fmt(s.temperature_2m_max.max)} °C extremes`': 't`${fmt(s.temperature_2m_min.min)} to ${fmt(s.temperature_2m_max.max)} °C extremes`',
'`${fmt(s.relative_humidity_2m_min.min)} to ${fmt(s.relative_humidity_2m_max.max)} % extremes`': 't`${fmt(s.relative_humidity_2m_min.min)} to ${fmt(s.relative_humidity_2m_max.max)} % extremes`',
'`P/ET₀: ${fmt(m.summary.ratio, 3)} · ${m.summary.pairedDays} paired days`': 't`P/ET₀: ${fmt(m.summary.ratio, 3)} · ${m.summary.pairedDays} paired days`',
'`Days ${page * size + 1}–${Math.min((page + 1) * size, model.rows.length)} of ${model.rows.length}`': 't`Days ${page * size + 1}–${Math.min((page + 1) * size, model.rows.length)} of ${model.rows.length}`',
'`Conservative latest date: ${latest}. Up to 10 years per request.`': 't`Conservative latest date: ${latest}. Up to 10 years per request.`',
'`Could not restore the shared query: ${error.message}`': 't`Could not restore the shared query: ${t(error.message)}`',
'`The climate service returned HTTP ${res.status}. Please retry.`': 't`The climate service returned HTTP ${res.status}. Please retry.`',
'`Remove saved site ${site.name || index + 1}`': 't`Remove saved site ${site.name || index + 1}`',
'`Could not save this site. ${error.message}`': 't`Could not save this site. ${t(error.message)}`',
'`${t(C.FIELDS[key][0])} valid days`': 't`${t(C.FIELDS[key][0])} valid days`',
}
for a,b in replacements.items(): s=s.replace(a,b)
s=s.replace('`${c.complete}/${c.expected} days complete across all variables. Last date with any valid data: ${c.last}.${c.complete < c.expected ?', 't`${c.complete}/${c.expected} days complete across all variables. Last date with any valid data: ${c.last}.` + (c.complete < c.expected ?')
s=s.replace("See per-variable coverage in the table.' : ''}`;", "See per-variable coverage in the table.') : '');")
# Preserve the leading-space suffixes via direct translations.
s=s.replace("' Missing values remain blank; totals may be partial. See per-variable coverage in the table.'", "t(' Missing values remain blank; totals may be partial. See per-variable coverage in the table.')") if "t(' Missing values" not in s else s
s=s.replace("status(`Loading ${query.start} to ${query.end}…${model ? ' The previous result remains visible until this query succeeds.' : ''}`)", "status(t`Loading ${query.start} to ${query.end}…${model ? ' ' + t('The previous result remains visible until this query succeeds.') : ''}`)")
s=s.replace("${error.message || t('Could not reach the climate service.')} Check your coordinates, period, and connection, then retry.", "${t(error.message || 'Could not reach the climate service.')}${t(' Check your coordinates, period, and connection, then retry.')}")
s=s.replace("${m.summary.pairedDays} paired days", "${t`${m.summary.pairedDays} paired days`}") if False else s
s=s.replace("${m.summary.pairedDays} paired days</p>", "${t`${m.summary.pairedDays} paired days`}</p>")
s=s.replace("${$('chartScale').value}</h2>", "${t($('chartScale').value === 'daily' ? 'Daily' : 'Monthly')}</h2>")
s=s.replace("${m.query.start} to ${m.query.end}", "${m.query.start} → ${m.query.end}")
s=s.replace("${fmt(m.summary.ratio, 3)} · ${m.summary.pairedDays} paired days</p>", "${fmt(m.summary.ratio, 3)} · ${t`${m.summary.pairedDays} paired days`}</p>")
# Locale change re-renders from the same model, without network work or replacing form values.
s=s.replace('updatePeriod(); loadUrl(); renderSaved();', '''$('language').value = I.language;
  $('language').addEventListener('change', () => {
    I.setLanguage($('language').value);
    $('availability').textContent = t`Conservative latest date: ${latest}. Up to 10 years per request.`;
    document.querySelectorAll('[data-error-source]').forEach(el => { el.textContent = t(el.dataset.errorSource); });
    if (model) { const oldPage = page; render(); page = oldPage; renderTable(); }
    renderSaved();
    $('fetchBtn').innerHTML = controller ? t('Loading climate data…') : html`Get climate data <span aria-hidden="true">→</span>`;
    const url = new URL(location.href); url.searchParams.set('lang', I.language); try { history.replaceState(null, '', url); } catch { /* file URLs */ }
    status(controller ? t('Loading climate data…') : t('Language changed.'));
  });
  updatePeriod(); loadUrl(); renderSaved();''')
p.write_text(s,encoding='utf-8')
