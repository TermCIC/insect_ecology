const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const context = { window: {}, document: { querySelectorAll: () => [], documentElement: {} }, localStorage: { getItem: () => null, setItem() {} }, location: { search: '' }, navigator: { language: 'en-US' }, URLSearchParams };
vm.runInNewContext(fs.readFileSync('assets/climate-i18n.js','utf8'), context);
const I = context.window.ClimateI18n;
for (const [key, translations] of Object.entries(I.catalog)) for (const language of ['en','zh-Hant','th']) { assert.equal(typeof translations[language], 'string',key); assert.ok(translations[language].length,key); const placeholders = text => (text.match(/\{\d+\}/g)||[]).sort().join(','); assert.equal(placeholders(translations[language]),placeholders(key),key); }
I.setLanguage('zh-Hant'); assert.equal(I.text('Temperature'),'溫度'); assert.equal(I.text('Enter a valid latitude.'),'請輸入有效的緯度。'); assert.equal(I.text('Choose an end date on or before 2025-01-01; ERA5 has an update delay.'),'ERA5 資料有更新延遲，請選擇 2025-01-01 或更早的結束日期。');
assert.equal(I.html(['<strong>','</strong><p>Temperature</p>'],'Temperature'),'<strong>Temperature</strong><p>溫度</p>');
I.setLanguage('th'); assert.equal(I.text('Temperature'),'อุณหภูมิ'); assert.equal(new Intl.DateTimeFormat(I.locale,{year:'numeric',timeZone:'UTC'}).format(new Date('2025-01-01')),'2025');
assert.equal(I.initialLanguage(),'en'); context.location.search='?lang=th'; assert.equal(I.initialLanguage(),'th');
console.log(Object.keys(I.catalog).length+' translation entries: all 3 languages and placeholders valid. Core translation and literal-only HTML checks passed.');
