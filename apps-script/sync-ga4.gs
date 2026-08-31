/**
 * Standalone Google Apps Script (script.google.com/create) — тянет метрики GA4
 * (на уровне кампании и группы объявлений) и пишет их в ту же Google-таблицу,
 * что и Ads Script.
 *
 * Использует встроенную авторизацию Apps Script (ваш Google-аккаунт), поэтому
 * отдельный сервис-аккаунт для этого шага не нужен — только доступ Viewer/Analyst
 * к нужному свойству GA4 под тем же аккаунтом, под которым вы создаёте скрипт.
 *
 * Перед запуском:
 * 1) Замените SHEET_ID и GA4_PROPERTY_ID (число, без "properties/").
 * 2) В appsscript.json уже прописаны нужные oauthScopes — подключите этот файл
 *    к тому же Apps Script проекту (через View > Show manifest file).
 * 3) Убедитесь, что GA4 слинкован с Google Ads (Admin > Product Links > Google Ads
 *    Links) — иначе измерения sessionCampaignName/sessionGoogleAdsAdGroupName будут пустыми.
 * 4) Настройте time-driven trigger (Triggers > Add Trigger) на syncGa4, ежедневно.
 */

const SHEET_ID = "11VIcvXJ2BDiOod331u3RpLFMYKnMbnsDktNZ9t6OWfU";
const GA4_PROPERTY_ID = "377037657";
const LOOKBACK_DAYS = 3;

// Домены источников трафика из AI-чатов/поисковиков — GA4 по умолчанию не
// выделяет их в отдельную группу, поэтому классифицируем сами по sessionSource.
// Список можно дополнять.
const GA4_AI_SOURCES = [
  "chatgpt.com",
  "chat.openai.com",
  "openai.com",
  "perplexity.ai",
  "gemini.google.com",
  "bard.google.com",
  "copilot.microsoft.com",
  "claude.ai",
  "poe.com",
  "you.com",
];

function syncGa4() {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  syncCampaignLevel(spreadsheet);
  syncAdGroupLevel(spreadsheet);
  syncTrafficByChannel(spreadsheet);
}

// Отчёт "Traffic": пользователи по каналам, помесячно, за весь сайт (не только
// Ads-кампании). Объём крошечный (~13 мес × ~9 бакетов) — вместо инкрементального
// дедупа по датам просто полностью перезаписываем обе вкладки при каждом запуске.
function syncTrafficByChannel(spreadsheet) {
  const byBucket = runGa4RawReport(
    ["yearMonth", "sessionDefaultChannelGroup", "sessionSource"],
    ["totalUsers"]
  );
  const bucketTotals = new Map();
  byBucket.forEach((r) => {
    const yearMonth = formatYearMonth(r.dims[0]);
    const bucket = classifyTrafficBucket(r.dims[1], r.dims[2]);
    const key = `${yearMonth}__${bucket}`;
    bucketTotals.set(key, (bucketTotals.get(key) || 0) + Number(r.metrics[0]));
  });
  const bucketRows = Array.from(bucketTotals.entries())
    .map(([key, users]) => {
      const [yearMonth, bucket] = key.split("__");
      return [yearMonth, bucket, users];
    })
    .sort((a, b) => a[0].localeCompare(b[0]));
  writeFullReplace(spreadsheet, "ga4_traffic_monthly", ["yearMonth", "bucket", "users"], bucketRows);

  const summary = runGa4RawReport(["yearMonth"], ["totalUsers", "bounceRate"]);
  const summaryRows = summary
    .map((r) => [formatYearMonth(r.dims[0]), Number(r.metrics[0]), Number(r.metrics[1])])
    .sort((a, b) => a[0].localeCompare(b[0]));
  writeFullReplace(
    spreadsheet,
    "ga4_traffic_summary_monthly",
    ["yearMonth", "totalUsers", "bounceRate"],
    summaryRows
  );
}

function classifyTrafficBucket(channelGroup, source) {
  const src = (source || "").toLowerCase();
  if (GA4_AI_SOURCES.indexOf(src) !== -1) return "AI";
  if (channelGroup === "Direct") return "Direct";
  if (channelGroup === "Organic Search") return src === "google" ? "Search: Google" : "Search: Other";
  if (channelGroup.indexOf("Paid") === 0) return src === "google" ? "Ads: Google" : "Ads: Other";
  if (channelGroup === "Referral") return "Websites";
  if (channelGroup.indexOf("Social") !== -1) return "Social Networks";
  return "Other";
}

// GA4 отдаёт yearMonth как "202603" — приводим к "2026-03" для единообразия с
// остальными датами в таблице.
function formatYearMonth(raw) {
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}`;
}

function writeFullReplace(spreadsheet, tabName, header, rows) {
  const sheet = spreadsheet.getSheetByName(tabName) || spreadsheet.insertSheet(tabName);
  sheet.clearContents();
  sheet.appendRow(header);
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }
  Logger.log(`${tabName}: записано строк ${rows.length}`);
}

// В отличие от runGa4Report (заточен под первую колонку "date" в формате YYYYMMDD),
// этот хелпер ничего не знает о смысле измерений — используется для помесячных
// отчётов, где первая колонка "yearMonth", а не "date".
function runGa4RawReport(dimensionNames, metricNames) {
  const payload = {
    dateRanges: [{ startDate: "400daysAgo", endDate: "today" }],
    dimensions: dimensionNames.map((name) => ({ name })),
    metrics: metricNames.map((name) => ({ name })),
    limit: 100000,
  };

  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY_ID}:runReport`;
  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}` },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() !== 200) {
    Logger.log(response.getContentText());
    throw new Error(`GA4 API error: ${response.getResponseCode()}`);
  }

  const data = JSON.parse(response.getContentText());
  return (data.rows || []).map((r) => ({
    dims: r.dimensionValues.map((d) => d.value),
    metrics: r.metricValues.map((m) => m.value),
  }));
}

function syncCampaignLevel(spreadsheet) {
  const sheet = spreadsheet.getSheetByName("ga4_daily") || spreadsheet.insertSheet("ga4_daily");
  ensureHeader(sheet, ["date", "campaign", "bounceRate", "pagesPerSession", "avgSessionDurationSec"]);

  const data = runGa4Report([{ name: "date" }, { name: "sessionCampaignName" }]);
  const rows = data.map((r) => [
    r.date,
    r.dims[0],
    Number(r.metrics[0]),
    Number(r.metrics[1]),
    Number(r.metrics[2]),
  ]);
  writeRows(sheet, rows, "ga4_daily");
}

function syncAdGroupLevel(spreadsheet) {
  const sheet =
    spreadsheet.getSheetByName("ga4_ad_group_daily") || spreadsheet.insertSheet("ga4_ad_group_daily");
  ensureHeader(sheet, [
    "date",
    "campaign",
    "adGroup",
    "bounceRate",
    "pagesPerSession",
    "avgSessionDurationSec",
  ]);

  const data = runGa4Report([
    { name: "date" },
    { name: "sessionCampaignName" },
    { name: "sessionGoogleAdsAdGroupName" },
  ]);
  const rows = data.map((r) => [
    r.date,
    r.dims[0],
    r.dims[1],
    Number(r.metrics[0]),
    Number(r.metrics[1]),
    Number(r.metrics[2]),
  ]);
  writeRows(sheet, rows, "ga4_ad_group_daily");
}

function runGa4Report(dimensions) {
  const payload = {
    dateRanges: [{ startDate: `${LOOKBACK_DAYS}daysAgo`, endDate: "yesterday" }],
    dimensions,
    metrics: [
      { name: "bounceRate" },
      { name: "screenPageViewsPerSession" },
      { name: "averageSessionDuration" },
    ],
    limit: 10000,
  };

  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY_ID}:runReport`;
  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}` },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() !== 200) {
    Logger.log(response.getContentText());
    throw new Error(`GA4 API error: ${response.getResponseCode()}`);
  }

  const data = JSON.parse(response.getContentText());
  return (data.rows || []).map((r) => {
    const rawDate = r.dimensionValues[0].value; // YYYYMMDD
    const date = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
    return {
      date,
      dims: r.dimensionValues.slice(1).map((d) => d.value),
      metrics: r.metricValues.map((m) => m.value),
    };
  });
}

function writeRows(sheet, rows, label) {
  if (rows.length === 0) {
    Logger.log(`${label}: нет данных за выбранный период.`);
    return;
  }
  const dates = Array.from(new Set(rows.map((r) => r[0])));
  removeExistingDates(sheet, new Set(dates));
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  Logger.log(`${label}: записано строк ${rows.length}`);
}

function ensureHeader(sheet, header) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(header);
  }
  // Принудительно текстовый формат колонки A — иначе Sheets конвертирует
  // "yyyy-MM-dd" в Date, сравнение строк в removeExistingDates перестаёт находить
  // совпадения, и данные задваиваются при каждом запуске.
  sheet.getRange(1, 1, Math.max(sheet.getMaxRows(), 2), 1).setNumberFormat("@");
}

function normalizeDateValue(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return v;
}

function removeExistingDates(sheet, dateSet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = values.length - 1; i >= 0; i--) {
    if (dateSet.has(normalizeDateValue(values[i][0]))) {
      sheet.deleteRow(i + 2);
    }
  }
}
