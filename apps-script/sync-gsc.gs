/**
 * Standalone Google Apps Script (script.google.com/create) — тянет органические
 * метрики из Google Search Console (показы/клики/CTR/позиция) по запросам и
 * страницам, пишет их в ту же Google-таблицу, что и остальные скрипты.
 *
 * Использует встроенную авторизацию Apps Script (ваш Google-аккаунт) — как и
 * sync-ga4.gs, отдельный сервис-аккаунт не нужен, только доступ к нужному
 * свойству в Search Console под тем же аккаунтом, под которым создаёте скрипт.
 *
 * Если добавляете этот файл в тот же Apps Script проект, что и sync-ga4.gs —
 * все константы и функции здесь названы с префиксом Gsc/GSC_, чтобы не
 * пересекаться с именами из sync-ga4.gs (SHEET_ID, LOOKBACK_DAYS и т.п.) —
 * в одном проекте Apps Script все файлы делят общую область видимости, и
 * повторное объявление одинакового const бросает SyntaxError.
 *
 * Перед запуском:
 * 1) Замените GSC_SHEET_ID и GSC_SITE_URL. Точный формат GSC_SITE_URL смотрите в
 *    Search Console → Настройки → Информация о свойстве:
 *    - для свойства домена: "sc-domain:example.com"
 *    - для свойства по URL-префиксу: "https://example.com/" (со слэшем в конце)
 * 2) В appsscript.json уже добавлен нужный oauthScope (webmasters.readonly) —
 *    подключите этот файл к тому же Apps Script проекту (View > Show manifest file),
 *    либо к отдельному, если ведёте GSC-синк отдельно от GA4.
 * 3) Убедитесь, что у аккаунта, под которым создаёте скрипт, есть доступ
 *    Owner/Full user к этому свойству в Search Console — иначе API вернёт 403.
 * 4) Настройте time-driven trigger (Triggers > Add Trigger) на syncGsc, ежедневно.
 */

const GSC_SHEET_ID = "11VIcvXJ2BDiOod331u3RpLFMYKnMbnsDktNZ9t6OWfU";
const GSC_SITE_URL = "https://allcorrectgames.com/";
const GSC_LOOKBACK_DAYS = 3; // GSC данные "дозревают" 2-3 дня — перезаписываем последние дни
const GSC_MAX_HISTORY_DAYS = 240;

// GSC отдаёт страну как ISO-3166-1 alpha-3 код в нижнем регистре (не путать с
// двухбуквенными кодами в остальных частях дашборда). Органический трафик
// приходит вообще из любой страны мира (в отличие от таргетированной рекламы),
// поэтому здесь полный справочник ISO-3166-1 alpha-3, а не только рынки Ads.
const GSC_COUNTRY_NAMES = {
  afg: "Afghanistan", ala: "Åland Islands", alb: "Albania", dza: "Algeria", asm: "American Samoa",
  and: "Andorra", ago: "Angola", aia: "Anguilla", ata: "Antarctica", atg: "Antigua and Barbuda",
  arg: "Argentina", arm: "Armenia", abw: "Aruba", aus: "Australia", aut: "Austria",
  aze: "Azerbaijan", bhs: "Bahamas", bhr: "Bahrain", bgd: "Bangladesh", brb: "Barbados",
  blr: "Belarus", bel: "Belgium", blz: "Belize", ben: "Benin", bmu: "Bermuda",
  btn: "Bhutan", bol: "Bolivia", bes: "Bonaire, Sint Eustatius and Saba", bih: "Bosnia and Herzegovina", bwa: "Botswana",
  bra: "Brazil", iot: "British Indian Ocean Territory", brn: "Brunei", bgr: "Bulgaria", bfa: "Burkina Faso",
  bdi: "Burundi", cpv: "Cabo Verde", khm: "Cambodia", cmr: "Cameroon", can: "Canada",
  cym: "Cayman Islands", caf: "Central African Republic", tcd: "Chad", chl: "Chile", chn: "China",
  cxr: "Christmas Island", cck: "Cocos Islands", col: "Colombia", com: "Comoros", cog: "Congo",
  cod: "DR Congo", cok: "Cook Islands", cri: "Costa Rica", civ: "Côte d'Ivoire", hrv: "Croatia",
  cub: "Cuba", cuw: "Curaçao", cyp: "Cyprus", cze: "Czechia", dnk: "Denmark",
  dji: "Djibouti", dma: "Dominica", dom: "Dominican Republic", ecu: "Ecuador", egy: "Egypt",
  slv: "El Salvador", gnq: "Equatorial Guinea", eri: "Eritrea", est: "Estonia", swz: "Eswatini",
  eth: "Ethiopia", flk: "Falkland Islands", fro: "Faroe Islands", fji: "Fiji", fin: "Finland",
  fra: "France", guf: "French Guiana", pyf: "French Polynesia", gab: "Gabon", gmb: "Gambia",
  geo: "Georgia", deu: "Germany", gha: "Ghana", gib: "Gibraltar", grc: "Greece",
  grl: "Greenland", grd: "Grenada", glp: "Guadeloupe", gum: "Guam", gtm: "Guatemala",
  ggy: "Guernsey", gin: "Guinea", gnb: "Guinea-Bissau", guy: "Guyana", hti: "Haiti",
  hnd: "Honduras", hkg: "Hong Kong", hun: "Hungary", isl: "Iceland", ind: "India",
  idn: "Indonesia", irn: "Iran", irq: "Iraq", irl: "Ireland", imn: "Isle of Man",
  isr: "Israel", ita: "Italy", jam: "Jamaica", jpn: "Japan", jey: "Jersey",
  jor: "Jordan", kaz: "Kazakhstan", ken: "Kenya", kir: "Kiribati", prk: "North Korea",
  kor: "South Korea", kwt: "Kuwait", kgz: "Kyrgyzstan", lao: "Laos", lva: "Latvia",
  lbn: "Lebanon", lso: "Lesotho", lbr: "Liberia", lby: "Libya", lie: "Liechtenstein",
  ltu: "Lithuania", lux: "Luxembourg", mac: "Macao", mdg: "Madagascar", mwi: "Malawi",
  mys: "Malaysia", mdv: "Maldives", mli: "Mali", mlt: "Malta", mhl: "Marshall Islands",
  mtq: "Martinique", mrt: "Mauritania", mus: "Mauritius", myt: "Mayotte", mex: "Mexico",
  fsm: "Micronesia", mda: "Moldova", mco: "Monaco", mng: "Mongolia", mne: "Montenegro",
  msr: "Montserrat", mar: "Morocco", moz: "Mozambique", mmr: "Myanmar", nam: "Namibia",
  nru: "Nauru", npl: "Nepal", nld: "Netherlands", ncl: "New Caledonia", nzl: "New Zealand",
  nic: "Nicaragua", ner: "Niger", nga: "Nigeria", niu: "Niue", nfk: "Norfolk Island",
  mkd: "North Macedonia", mnp: "Northern Mariana Islands", nor: "Norway", omn: "Oman", pak: "Pakistan",
  plw: "Palau", pse: "Palestine", pan: "Panama", png: "Papua New Guinea", pry: "Paraguay",
  per: "Peru", phl: "Philippines", pcn: "Pitcairn", pol: "Poland", prt: "Portugal",
  pri: "Puerto Rico", qat: "Qatar", reu: "Réunion", rou: "Romania", rus: "Russia",
  rwa: "Rwanda", blm: "Saint Barthélemy", shn: "Saint Helena", kna: "Saint Kitts and Nevis", lca: "Saint Lucia",
  maf: "Saint Martin", spm: "Saint Pierre and Miquelon", vct: "Saint Vincent and the Grenadines", wsm: "Samoa", smr: "San Marino",
  stp: "São Tomé and Príncipe", sau: "Saudi Arabia", sen: "Senegal", srb: "Serbia", syc: "Seychelles",
  sle: "Sierra Leone", sgp: "Singapore", sxm: "Sint Maarten", svk: "Slovakia", svn: "Slovenia",
  slb: "Solomon Islands", som: "Somalia", zaf: "South Africa", ssd: "South Sudan", esp: "Spain",
  lka: "Sri Lanka", sdn: "Sudan", sur: "Suriname", swe: "Sweden", che: "Switzerland",
  syr: "Syria", twn: "Taiwan", tjk: "Tajikistan", tza: "Tanzania", tha: "Thailand",
  tls: "Timor-Leste", tgo: "Togo", tkl: "Tokelau", ton: "Tonga", tto: "Trinidad and Tobago",
  tun: "Tunisia", tur: "Turkey", tkm: "Turkmenistan", tca: "Turks and Caicos Islands", tuv: "Tuvalu",
  uga: "Uganda", ukr: "Ukraine", are: "United Arab Emirates", gbr: "United Kingdom", usa: "United States",
  ury: "Uruguay", uzb: "Uzbekistan", vut: "Vanuatu", vat: "Vatican City", ven: "Venezuela",
  vnm: "Vietnam", vgb: "British Virgin Islands", vir: "U.S. Virgin Islands", wlf: "Wallis and Futuna", esh: "Western Sahara",
  yem: "Yemen", zmb: "Zambia", zwe: "Zimbabwe",
};

function syncGsc() {
  const spreadsheet = SpreadsheetApp.openById(GSC_SHEET_ID);
  gscSyncByDimension(spreadsheet, "query", "gsc_query_daily", ["date", "query", "clicks", "impressions", "ctr", "position"]);
  gscSyncByDimension(spreadsheet, "page", "gsc_page_daily", ["date", "page", "clicks", "impressions", "ctr", "position"]);
  gscSyncByDimension(
    spreadsheet,
    "country",
    "gsc_country_daily",
    ["date", "country", "clicks", "impressions", "ctr", "position"],
    (code) => GSC_COUNTRY_NAMES[code] || `Unknown (${code})`
  );
  gscSyncByDimension(spreadsheet, "device", "gsc_device_daily", ["date", "device", "clicks", "impressions", "ctr", "position"]);
  gscSyncQueryByCountry(spreadsheet);
}

// Отдельно от gscSyncByDimension: тут 3 измерения (date+query+country), а не 2,
// и мапить код страны нужно на 3-й колонке (индекс 2), а не на 2-й (индекс 1).
function gscSyncQueryByCountry(spreadsheet) {
  const today = new Date();
  const endDate = gscShiftDate(today, -1);
  const startDate = gscShiftDate(today, -GSC_LOOKBACK_DAYS);

  const rows = gscRunReport(startDate, endDate, ["date", "query", "country"]);
  rows.forEach((r) => {
    r[2] = GSC_COUNTRY_NAMES[r[2]] || `Unknown (${r[2]})`;
  });
  gscWriteReport(
    spreadsheet,
    "gsc_query_country_daily",
    ["date", "query", "country", "clicks", "impressions", "ctr", "position"],
    rows
  );
}

function gscSyncByDimension(spreadsheet, dimension, tabName, header, mapKey) {
  const today = new Date();
  const endDate = gscShiftDate(today, -1); // GSC не отдаёт "сегодня"
  const startDate = gscShiftDate(today, -GSC_LOOKBACK_DAYS);

  const rows = gscRunReport(startDate, endDate, ["date", dimension]);
  if (mapKey) {
    rows.forEach((r) => {
      r[1] = mapKey(r[1]);
    });
  }
  gscWriteReport(spreadsheet, tabName, header, rows);
}

const GSC_ROW_LIMIT = 25000;
const GSC_MAX_PAGES = 10; // потолок на 250k строк за один синк одного отчёта — защита от таймаута Apps Script (6 минут)

// Комбинированные отчёты (например date+query+country) могут отдавать заметно
// больше строк, чем плоские — постранично тянем через startRow, пока не
// получим меньше rowLimit строк (значит, это последняя страница).
function gscRunReport(startDate, endDate, dimensions) {
  const allRows = [];
  let startRow = 0;

  for (let page = 0; page < GSC_MAX_PAGES; page++) {
    const payload = {
      startDate: gscFormatDate(startDate),
      endDate: gscFormatDate(endDate),
      dimensions,
      rowLimit: GSC_ROW_LIMIT,
      startRow,
    };

    const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE_URL)}/searchAnalytics/query`;
    const response = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}` },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });

    if (response.getResponseCode() !== 200) {
      Logger.log(response.getContentText());
      throw new Error(`GSC API error: ${response.getResponseCode()}`);
    }

    const data = JSON.parse(response.getContentText());
    const rows = data.rows || [];
    rows.forEach((r) => {
      allRows.push([...r.keys, r.clicks, r.impressions, r.ctr, r.position]);
    });

    if (rows.length < GSC_ROW_LIMIT) break; // последняя страница

    startRow += rows.length;
    if (page === GSC_MAX_PAGES - 1) {
      Logger.log(
        `ВНИМАНИЕ: достигнут потолок пагинации (${GSC_MAX_PAGES} страниц) для dimensions=${dimensions.join(",")} — часть данных могла быть обрезана.`
      );
    }
  }

  return allRows;
}

function gscWriteReport(spreadsheet, tabName, header, rows) {
  const sheet = spreadsheet.getSheetByName(tabName) || spreadsheet.insertSheet(tabName);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(header);
  }
  // Принудительно текстовый формат колонки A — иначе Sheets конвертирует
  // "yyyy-MM-dd" в Date, сравнение строк в gscRemoveRowsByDate/gscTrimOldRows
  // перестаёт находить совпадения, и данные задваиваются при каждом запуске.
  sheet.getRange(1, 1, Math.max(sheet.getMaxRows(), 2), 1).setNumberFormat("@");

  if (rows.length === 0) {
    Logger.log(`${tabName}: нет данных за выбранный период.`);
    return;
  }

  const refreshedDates = new Set(rows.map((r) => r[0]));
  gscRemoveRowsByDate(sheet, refreshedDates);
  gscTrimOldRows(sheet, GSC_MAX_HISTORY_DAYS);

  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  Logger.log(`${tabName}: записано строк ${rows.length}`);
}

function gscShiftDate(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function gscFormatDate(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function gscNormalizeDateValue(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return v;
}

function gscRemoveRowsByDate(sheet, dateSet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = values.length - 1; i >= 0; i--) {
    if (dateSet.has(gscNormalizeDateValue(values[i][0]))) {
      sheet.deleteRow(i + 2);
    }
  }
}

function gscTrimOldRows(sheet, maxHistoryDays) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxHistoryDays);
  const cutoffStr = Utilities.formatDate(cutoff, Session.getScriptTimeZone(), "yyyy-MM-dd");

  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = values.length - 1; i >= 0; i--) {
    if (gscNormalizeDateValue(values[i][0]) < cutoffStr) {
      sheet.deleteRow(i + 2);
    }
  }
}
