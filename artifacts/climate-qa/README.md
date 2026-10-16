# Climate viewer verification

Run from the repository root:

```powershell
node tests/climate_core.cjs
node tests/climate_i18n.cjs
node tests/climate_browser_qa.mjs
```

The browser check uses headless Chrome at the standard Windows installation path and a temporary local HTTP server. Chrome renderer startup may require running outside the restricted filesystem sandbox. It closes its own browser and server when finished. Downloads are captured in memory for inspection; normal browser downloads are denied during the test.

## Results

- 7 core regression groups passed, including UTM reference coordinates independently checked with Python PROJ (pyproj), DMS signs, zero coordinates, leap years, missing values, paired-day ratios, and response validation.
- 45 browser checks passed at desktop (1440 px) and mobile (390 px) widths, including inline validation, charts, pagination, site storage, CSV/JSON/XLSX, URL restoration, geolocation period preservation, API failures, and cancellation.
- Real Open-Meteo smoke request: Chiang Mai, 2025-01-01 through 2025-01-03, all eight requested ERA5 daily variables. See `live-api.json`.
- Interactive regression tests and screenshots use deterministic synthetic annual data, not observed research data. Missing-data and error cases use explicit fixtures. The location success path is simulated; operating-system permission prompts are not exercised.
- `climate-report.pdf` is a synthetic-data print test, not a research report for reuse. English, Traditional Chinese, and Thai reports were rendered with PyMuPDF and visually reviewed; each annual fixture fits two pages: complete 12-month summary, selected monthly water-balance chart, and source notes. Chrome's print-to-PDF engine is checked; the interactive native print dialog is not automated.
- CDN Chart.js and XLSX loaded successfully during verification. If their CDN is unavailable, the data table, CSV and JSON remain usable, while chart or Excel loading reports a fallback/error.

The UI supports Traditional Chinese, English, and Thai, with an explicit language selector, English default (independent of browser locale), local preference storage, and shared-link language parameters. Language changes preserve query inputs and loaded numeric data without a new API request. Language initialization is independent of the climate controller; native keyboard selections are tested even with that controller omitted. Versioned asset URLs avoid reuse of pre-localization script and stylesheet caches. A 221-entry catalog and placeholder checks cover all three languages. Thai month labels use the Gregorian calendar. CSV/JSON machine field codes remain stable, while Excel headers and sheets, chart text, and print reports follow the selected language. The ecological palette is preserved. Shared theme files and other teaching tools are unchanged. Multi-site comparisons and degree-day modelling remain potential future features; the current research workflow adds named saved sites, date ranges, coverage, metadata, and reusable exports.
