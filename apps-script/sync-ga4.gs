/**
 * Standalone Google Apps Script (script.google.com/create) — тянет метрики GA4
 * и пишет их в ту же Google-таблицу, что и Ads Script.
 *
 * Использует встроенную авторизацию Apps Script (ваш Google-аккаунт), поэтому
 * отдельный сервис-аккаунт для этого шага не нужен — только доступ Viewer/Analyst
 * к нужному свойству GA4 под тем же аккаунтом, под которым вы создаёте скрипт.
 *
 * Перед запуском:
 * 1) Замените SHEET_ID и GA4_PROPERTY_ID (число, без "properties/").
 * 2) В appsscript.json уже прописаны нужные oauthScopes — подключите этот файл
 *    к тому же Apps Script проекту (через View > Show manifest file).
 * 3) Убедитесь, что в GA4 настроен UTM Campaign (utm_campaign) для трафика с Google Ads,
 *    чтобы campaign matched с названиями кампаний в ads_daily.
 * 4) Настройте time-driven trigger (Triggers > Add Trigger) на syncGa4, ежедневно.
 */

const SHEET_ID = "11VIcvXJ2BDiOod331u3RpLFMYKnMbnsDktNZ9t6OWfU";
const GA4_PROPERTY_ID = "377037657";
const TAB_NAME = "ga4_daily";
const LOOKBACK_DAYS = 3;

function syncGa4() {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  const sheet = spreadsheet.getSheetByName(TAB_NAME) || spreadsheet.insertSheet(TAB_NAME);
  ensureHeader(sheet);

  const startDate = `${LOOKBACK_DAYS}daysAgo`;
  const payload = {
    dateRanges: [{ startDate, endDate: "yesterday" }],
    dimensions: [{ name: "date" }, { name: "sessionCampaignName" }],
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
  const rows = (data.rows || []).map((r) => {
    const rawDate = r.dimensionValues[0].value; // YYYYMMDD
    const date = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
    return [
      date,
      r.dimensionValues[1].value,
      Number(r.metricValues[0].value),
      Number(r.metricValues[1].value),
      Number(r.metricValues[2].value),
    ];
  });

  if (rows.length === 0) {
    Logger.log("Нет данных GA4 за выбранный период.");
    return;
  }

  const dates = rows.map((r) => r[0]);
  removeExistingDates(sheet, new Set(dates));
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  Logger.log(`Записано строк GA4: ${rows.length}`);
}

function ensureHeader(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "date",
      "campaign",
      "bounceRate",
      "pagesPerSession",
      "avgSessionDurationSec",
    ]);
  }
}

function removeExistingDates(sheet, dateSet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = values.length - 1; i >= 0; i--) {
    if (dateSet.has(values[i][0])) {
      sheet.deleteRow(i + 2);
    }
  }
}
