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

function syncGsc() {
  const spreadsheet = SpreadsheetApp.openById(GSC_SHEET_ID);
  gscSyncByDimension(spreadsheet, "query", "gsc_query_daily", ["date", "query", "clicks", "impressions", "ctr", "position"]);
  gscSyncByDimension(spreadsheet, "page", "gsc_page_daily", ["date", "page", "clicks", "impressions", "ctr", "position"]);
}

function gscSyncByDimension(spreadsheet, dimension, tabName, header) {
  const today = new Date();
  const endDate = gscShiftDate(today, -1); // GSC не отдаёт "сегодня"
  const startDate = gscShiftDate(today, -GSC_LOOKBACK_DAYS);

  const rows = gscRunReport(startDate, endDate, ["date", dimension]);
  gscWriteReport(spreadsheet, tabName, header, rows);
}

function gscRunReport(startDate, endDate, dimensions) {
  const payload = {
    startDate: gscFormatDate(startDate),
    endDate: gscFormatDate(endDate),
    dimensions,
    rowLimit: 25000,
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
  return (data.rows || []).map((r) => [
    r.keys[0], // date, формат уже YYYY-MM-DD
    r.keys[1], // query или page
    r.clicks,
    r.impressions,
    r.ctr,
    r.position,
  ]);
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
