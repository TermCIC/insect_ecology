/* DOM-free coordinate validation and climate aggregation, shared by views and exports. */
(function (root) {
  'use strict';
  const FIELDS = {
    temperature_2m_mean: ['Mean temperature', '°C'], temperature_2m_min: ['Lowest temperature', '°C'],
    temperature_2m_max: ['Highest temperature', '°C'], relative_humidity_2m_mean: ['Mean relative humidity', '%'],
    relative_humidity_2m_min: ['Lowest relative humidity', '%'], relative_humidity_2m_max: ['Highest relative humidity', '%'],
    precipitation_sum: ['Precipitation', 'mm'], et0_fao_evapotranspiration: ['Reference evapotranspiration (ET₀)', 'mm']
  };
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  function number(value, label) {
    if (String(value).trim() === '' || !Number.isFinite(Number(value))) throw Error(`Enter a valid ${label}.`);
    return Number(value);
  }
  function coordinates(lat, lon) {
    lat = number(lat, 'latitude'); lon = number(lon, 'longitude');
    if (lat < -90 || lat > 90) throw Error('Latitude must be between −90 and 90.');
    if (lon < -180 || lon > 180) throw Error('Longitude must be between −180 and 180.');
    return { lat, lon };
  }
  function decimal(text) {
    const parts = text.trim().split(/[,;\s]+/);
    if (parts.length !== 2) throw Error('Enter latitude, longitude, for example 18.7883, 98.9853.');
    return coordinates(parts[0], parts[1]);
  }
  function dms(degrees, minutes, seconds, direction) {
    const d = number(degrees, 'degrees'), m = number(minutes, 'minutes'), s = number(seconds, 'seconds');
    const limit = ['N', 'S'].includes(direction) ? 90 : 180;
    if (!['N', 'S', 'E', 'W'].includes(direction) || !Number.isInteger(d) || !Number.isInteger(m) || d < 0 || m < 0 || m >= 60 || s < 0 || s >= 60 || d + m / 60 + s / 3600 > limit) throw Error(`Use degrees 0–${limit}, minutes 0–59, and seconds below 60.`);
    return (d + m / 60 + s / 3600) * (['S', 'W'].includes(direction) ? -1 : 1);
  }
  // WGS84 inverse Transverse Mercator, through D^6 (latitude) / D^5 (longitude).
  function utm(zone, hemisphere, easting, northing) {
    zone = number(zone, 'UTM zone'); const east = number(easting, 'easting'), north = number(northing, 'northing');
    if (!Number.isInteger(zone) || zone < 1 || zone > 60 || !['N', 'S'].includes(hemisphere)) throw Error('Choose a UTM zone from 1 to 60 and a hemisphere.');
    if (east < 100000 || east > 900000 || north < 0 || north > 10000000) throw Error('UTM easting must be 100,000–900,000 m; northing 0–10,000,000 m.');
    const a = 6378137, ecc = 0.0066943799901413165, k = 0.9996, ep = ecc / (1 - ecc);
    const x = east - 500000, y = north - (hemisphere === 'S' ? 10000000 : 0);
    const mu = y / k / (a * (1 - ecc / 4 - 3 * ecc ** 2 / 64 - 5 * ecc ** 3 / 256));
    const e1 = (1 - Math.sqrt(1 - ecc)) / (1 + Math.sqrt(1 - ecc));
    const fp = mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu) + (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu) + 151 * e1 ** 3 / 96 * Math.sin(6 * mu) + 1097 * e1 ** 4 / 512 * Math.sin(8 * mu);
    const c = ep * Math.cos(fp) ** 2, t = Math.tan(fp) ** 2, n = a / Math.sqrt(1 - ecc * Math.sin(fp) ** 2);
    const r = a * (1 - ecc) / (1 - ecc * Math.sin(fp) ** 2) ** 1.5, d = x / (n * k);
    const lat = (fp - n * Math.tan(fp) / r * (d ** 2 / 2 - (5 + 3 * t + 10 * c - 4 * c ** 2 - 9 * ep) * d ** 4 / 24 + (61 + 90 * t + 298 * c + 45 * t ** 2 - 252 * ep - 3 * c ** 2) * d ** 6 / 720)) * 180 / Math.PI;
    const lon = (zone - 1) * 6 - 177 + (d - (1 + 2 * t + c) * d ** 3 / 6 + (5 - 2 * c + 28 * t - 3 * c ** 2 + 8 * ep + 24 * t ** 2) * d ** 5 / 120) / Math.cos(fp) * 180 / Math.PI;
    if (lat < -80 || lat > 84 || (hemisphere === 'N' && lat < 0) || (hemisphere === 'S' && lat > 0)) throw Error('These coordinates are outside the selected UTM hemisphere or latitude range (80°S–84°N).');
    return coordinates(lat, lon);
  }
  function validDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
  }
  const daysBetween = (start, end) => Math.round((Date.parse(end + 'T00:00:00Z') - Date.parse(start + 'T00:00:00Z')) / 86400000) + 1;
  function latestDate(now = new Date()) {
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    day.setUTCDate(day.getUTCDate() - 5); return day.toISOString().slice(0, 10);
  }
  function range(start, end, latest = latestDate()) {
    if (!validDate(start) || !validDate(end)) throw Error('Enter valid start and end dates.');
    if (start < '1940-01-01') throw Error('ERA5 dates start on 1 January 1940.');
    if (start > end) throw Error('The start date must be on or before the end date.');
    if (end > latest) throw Error(`Choose an end date on or before ${latest}; ERA5 has an update delay.`);
    if (daysBetween(start, end) > 3660) throw Error('Choose up to 10 years per request. Split longer periods into separate downloads.');
    return { start, end };
  }
  function statistic(values) {
    const v = values.filter(finite);
    return { count: v.length, mean: v.length ? v.reduce((a, b) => a + b, 0) / v.length : null, sum: v.length ? v.reduce((a, b) => a + b, 0) : null, min: v.length ? Math.min(...v) : null, max: v.length ? Math.max(...v) : null };
  }
  function summarize(rows, expected) {
    const stats = Object.fromEntries(Object.keys(FIELDS).map(key => [key, statistic(rows.map(row => row[key]))]));
    const paired = rows.filter(row => finite(row.precipitation_sum) && finite(row.et0_fao_evapotranspiration));
    const p = statistic(paired.map(row => row.precipitation_sum)), et = statistic(paired.map(row => row.et0_fao_evapotranspiration));
    return { expected, stats, pairedDays: paired.length, ratio: et.sum > 0 ? p.sum / et.sum : null };
  }
  function build(data, query) {
    range(query.start, query.end, query.end);
    const daily = data.daily;
    if (!daily || !Array.isArray(daily.time) || !daily.time.length) throw Error('The source returned no daily data. Try another period.');
    for (const key of Object.keys(FIELDS)) if (!Array.isArray(daily[key]) || daily[key].length !== daily.time.length) throw Error(`The source returned an incomplete ${key} series. Please retry.`);
    const seen = new Set();
    const received = daily.time.map((date, index) => {
      if (!validDate(date) || date < query.start || date > query.end || seen.has(date)) throw Error('The source returned duplicate or unexpected dates. Please retry.');
      seen.add(date);
      return { date, ...Object.fromEntries(Object.keys(FIELDS).map(key => [key, finite(daily[key][index]) ? daily[key][index] : null])) };
    });
    const byDate = new Map(received.map(row => [row.date, row]));
    const rows = [], day = new Date(query.start + 'T00:00:00Z');
    while (day.toISOString().slice(0, 10) <= query.end) {
      const date = day.toISOString().slice(0, 10);
      rows.push(byDate.get(date) || { date, ...Object.fromEntries(Object.keys(FIELDS).map(key => [key, null])) });
      day.setUTCDate(day.getUTCDate() + 1);
    }
    if (!rows.some(row => Object.keys(FIELDS).some(key => finite(row[key])))) throw Error('No valid observations were returned for this period. Try an earlier end date.');
    const months = [];
    for (const row of rows) {
      const key = row.date.slice(0, 7); let month = months[months.length - 1];
      if (!month || month.month !== key) { month = { month: key, rows: [] }; months.push(month); }
      month.rows.push(row);
    }
    for (const month of months) {
      const [year, m] = month.month.split('-').map(Number);
      month.calendarDays = new Date(Date.UTC(year, m, 0)).getUTCDate();
      Object.assign(month, summarize(month.rows, month.rows.length));
    }
    const any = rows.filter(row => Object.keys(FIELDS).some(key => finite(row[key])));
    const complete = rows.filter(row => Object.keys(FIELDS).every(key => finite(row[key]))).length;
    return { query: { ...query }, source: { model: 'ERA5', provider: 'Open-Meteo', gridLatitude: data.latitude, gridLongitude: data.longitude, elevation: data.elevation, timezone: data.timezone, units: data.daily_units || Object.fromEntries(Object.entries(FIELDS).map(([key, value]) => [key, value[1]])), retrievedAt: new Date().toISOString(), documentation: 'https://open-meteo.com/en/docs/historical-weather-api' }, rows, months, summary: summarize(rows, rows.length), coverage: { expected: rows.length, received: received.length, any: any.length, complete, first: any[0].date, last: any[any.length - 1].date } };
  }
  const api = { FIELDS, finite, coordinates, decimal, dms, utm, validDate, daysBetween, latestDate, range, statistic, summarize, build };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ClimateCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
