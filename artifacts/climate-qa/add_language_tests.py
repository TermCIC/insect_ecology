from pathlib import Path
p=Path('assets/climate.js');s=p.read_text(encoding='utf-8');s=s.replace('${model.summary.pairedDays} paired days</p>', '${t`${model.summary.pairedDays} paired days`}</p>');s=s.replace("${t($('chartScale').value === 'daily' ? t('Daily') : t('Monthly'))}","${$('chartScale').value === 'daily' ? t('Daily') : t('Monthly')}");p.write_text(s,encoding='utf-8')
p=Path('tests/climate_browser_qa.mjs');s=p.read_text(encoding='utf-8-sig');s=s.replace('/get_climate.html`','/get_climate.html?lang=en`',1)
marker=" await ev(`document.querySelector('#tableScale').value='monthly';"
pos=s.index(marker)
tests='''
 const initialFetches=await ev('__fetchCount');
 for(const language of ['zh-Hant','th','en']){
  await ev(`document.querySelector('#language').value='${language}';document.querySelector('#language').dispatchEvent(new Event('change'));`);
  await waitFor(`!window.Chart || Chart.getChart('climateChart').data.datasets[0].label===ClimateI18n.text('Precipitation')`);
  await check(`${language}: static labels, model and chart translated`, `document.documentElement.lang==='${language}' && document.querySelector('h1').textContent===ClimateI18n.text('Climate Data Viewer') && document.querySelector('#tableContainer th').textContent===ClimateI18n.text('Date') && document.querySelector('#coverageNote').textContent.includes('365/365') && __fetchCount===${initialFetches}`);
  await check(`${language}: translated field validation`, `ClimateI18n.text('Latitude must be between −90 and 90.') !== '' && document.querySelector('#coordinates').value==='18.7883, 98.9853' && document.querySelector('#year').value==='2025'`);
  if(language!=='en'){
   await ev(`document.querySelector('#exportFormat').value='xlsx';document.querySelector('#exportBtn').click()`);
   await waitFor(`!document.querySelector('#exportBtn').disabled`);
   await check(`${language}: localized Excel with numeric values`, `__workbook.SheetNames[0]===ClimateI18n.text('Daily sheet') && __workbook.Sheets[__workbook.SheetNames[0]].B1.v===ClimateI18n.text('Mean temperature')+' (°C)' && __workbook.Sheets[__workbook.SheetNames[0]].B2.t==='n'`);
   await ev(`document.querySelector('#exportFormat').value='json';document.querySelector('#exportBtn').click()`);
   await check(`${language}: stable JSON schema and localized labels`, `(async()=>{const m=JSON.parse(await __downloads.at(-1).text());return m.exportLanguage==='${language}' && m.fieldLabels.temperature_2m_mean===ClimateI18n.text('Mean temperature') && typeof m.rows[0].temperature_2m_mean==='number'})()`);
   await ev(`document.querySelector('#tableScale').value='monthly';document.querySelector('#tableScale').dispatchEvent(new Event('change'));window.dispatchEvent(new Event('beforeprint'));window.scrollTo(0,0)`);
   await check(`${language}: monthly and print text translated`, `document.querySelector('#printReport h1').textContent===ClimateI18n.text('Climate report') && document.querySelector('#tableContainer th').textContent===ClimateI18n.text('Month') && !document.querySelector('#printReport').textContent.includes('paired days')`);
   const localizedPDF=await send('Page.printToPDF',{printBackground:true,preferCSSPageSize:true});await writeFile(join(out,'climate-report-'+language+'.pdf'),Buffer.from(localizedPDF.data,'base64'));
   await shot('desktop-'+language);
   await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
   await check(`${language}: mobile page fits viewport`,`document.documentElement.scrollWidth<=innerWidth`);await shot('mobile-'+language);
   await ev(`document.querySelector('#results').scrollIntoView()`);await shot('mobile-results-'+language);
   await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
   await ev(`document.querySelector('#tableScale').value='daily';document.querySelector('#tableScale').dispatchEvent(new Event('change'));`);
  }
 }
'''
s=s[:pos]+tests+s[pos:]
# Persistence / URL priority without auto-query, after the original shared-link test.
marker=" await check('no runtime exceptions'"
pos=s.index(marker)
s=s[:pos]+''' await ev(`document.querySelector('#language').value='th';document.querySelector('#language').dispatchEvent(new Event('change'))`);
 await send('Page.navigate',{url:`http://127.0.0.1:${port}/get_climate.html`});await waitFor(`document.querySelector('#language').value==='th'`);
 await check('language preference persists without URL parameter',`document.documentElement.lang==='th' && document.querySelector('#results').hidden`);
 await send('Page.navigate',{url:`http://127.0.0.1:${port}/get_climate.html?lang=zh-Hant`});await waitFor(`document.querySelector('#language').value==='zh-Hant'`);
 await check('explicit shared language overrides stored preference',`document.documentElement.lang==='zh-Hant' && document.querySelector('h1').textContent==='氣候資料檢視器'`);
''' +s[pos:]
p.write_text(s,encoding='utf-8')
