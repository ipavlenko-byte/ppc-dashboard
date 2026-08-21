/**
 * Google Ads Script — детализация ниже уровня кампании: группы объявлений,
 * ключевые слова, объявления, поисковые запросы. Вставить как ОТДЕЛЬНЫЙ скрипт
 * (Tools > Bulk Actions > Scripts) рядом с sync-campaigns.js — не требует
 * developer token/OAuth, выполняется в контексте аккаунта.
 *
 * Перед запуском замените SHEET_ID. Хранит скользящее окно в MAX_HISTORY_DAYS дней:
 * каждый запуск перезаписывает последние LOOKBACK_DAYS дней и удаляет строки старше
 * MAX_HISTORY_DAYS, чтобы таблица не росла бесконечно.
 *
 * Настройте расписание (Scripts > ... > Frequency), например ежедневно в 06:15
 * (после sync-campaigns.js).
 */

const SHEET_ID = "11VIcvXJ2BDiOod331u3RpLFMYKnMbnsDktNZ9t6OWfU";
const LOOKBACK_DAYS = 3;
const MAX_HISTORY_DAYS = 240;

function main() {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  const dates = getDateRange(LOOKBACK_DAYS);

  syncAdGroups(spreadsheet, dates);
  syncKeywords(spreadsheet, dates);
  syncAdCreatives(spreadsheet, dates);
  syncSearchTerms(spreadsheet, dates);
}

function syncAdGroups(spreadsheet, dates) {
  const header = ["date", "campaign", "adGroup", "impressions", "clicks", "cost", "conversions"];
  const rows = [];
  for (const date of dates) {
    const report = AdsApp.report(
      `SELECT campaign.name, ad_group.name, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
       FROM ad_group
       WHERE segments.date = "${date}"
       AND campaign.status = "ENABLED"
       AND ad_group.status = "ENABLED"`
    );
    const it = report.rows();
    while (it.hasNext()) {
      const row = it.next();
      rows.push([
        date,
        row["campaign.name"],
        row["ad_group.name"],
        Number(row["metrics.impressions"]),
        Number(row["metrics.clicks"]),
        Number(row["metrics.cost_micros"]) / 1e6,
        Number(row["metrics.conversions"]),
      ]);
    }
  }
  writeReport(spreadsheet, "ad_groups_daily", header, rows, dates);
}

function syncKeywords(spreadsheet, dates) {
  const header = [
    "date",
    "campaign",
    "adGroup",
    "keyword",
    "matchType",
    "impressions",
    "clicks",
    "cost",
    "conversions",
  ];
  const rows = [];
  for (const date of dates) {
    const report = AdsApp.report(
      `SELECT campaign.name, ad_group.name, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type,
              metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
       FROM keyword_view
       WHERE segments.date = "${date}"
       AND campaign.status = "ENABLED"`
    );
    const it = report.rows();
    while (it.hasNext()) {
      const row = it.next();
      rows.push([
        date,
        row["campaign.name"],
        row["ad_group.name"],
        row["ad_group_criterion.keyword.text"],
        row["ad_group_criterion.keyword.match_type"],
        Number(row["metrics.impressions"]),
        Number(row["metrics.clicks"]),
        Number(row["metrics.cost_micros"]) / 1e6,
        Number(row["metrics.conversions"]),
      ]);
    }
  }
  writeReport(spreadsheet, "keywords_daily", header, rows, dates);
}

function syncAdCreatives(spreadsheet, dates) {
  const header = [
    "date",
    "campaign",
    "adGroup",
    "adId",
    "adType",
    "impressions",
    "clicks",
    "cost",
    "conversions",
  ];
  const rows = [];
  for (const date of dates) {
    const report = AdsApp.report(
      `SELECT campaign.name, ad_group.name, ad_group_ad.ad.id, ad_group_ad.ad.type,
              metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
       FROM ad_group_ad
       WHERE segments.date = "${date}"
       AND campaign.status = "ENABLED"
       AND ad_group_ad.status = "ENABLED"`
    );
    const it = report.rows();
    while (it.hasNext()) {
      const row = it.next();
      rows.push([
        date,
        row["campaign.name"],
        row["ad_group.name"],
        row["ad_group_ad.ad.id"],
        row["ad_group_ad.ad.type"],
        Number(row["metrics.impressions"]),
        Number(row["metrics.clicks"]),
        Number(row["metrics.cost_micros"]) / 1e6,
        Number(row["metrics.conversions"]),
      ]);
    }
  }
  writeReport(spreadsheet, "ad_creatives_daily", header, rows, dates);
}

function syncSearchTerms(spreadsheet, dates) {
  const header = [
    "date",
    "campaign",
    "adGroup",
    "searchTerm",
    "impressions",
    "clicks",
    "cost",
    "conversions",
  ];
  const rows = [];
  for (const date of dates) {
    const report = AdsApp.report(
      `SELECT campaign.name, ad_group.name, search_term_view.search_term,
              metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
       FROM search_term_view
       WHERE segments.date = "${date}"
       AND campaign.status = "ENABLED"`
    );
    const it = report.rows();
    while (it.hasNext()) {
      const row = it.next();
      rows.push([
        date,
        row["campaign.name"],
        row["ad_group.name"],
        row["search_term_view.search_term"],
        Number(row["metrics.impressions"]),
        Number(row["metrics.clicks"]),
        Number(row["metrics.cost_micros"]) / 1e6,
        Number(row["metrics.conversions"]),
      ]);
    }
  }
  writeReport(spreadsheet, "search_terms_daily", header, rows, dates);
}

function writeReport(spreadsheet, tabName, header, rows, refreshedDates) {
  const sheet = spreadsheet.getSheetByName(tabName) || spreadsheet.insertSheet(tabName);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(header);
  }
  // Принудительно текстовый формат колонки A — иначе Sheets конвертирует
  // "yyyy-MM-dd" в Date, сравнение строк в removeRowsByDate/trimOldRows перестаёт
  // находить совпадения, и данные задваиваются при каждом запуске.
  sheet.getRange(1, 1, Math.max(sheet.getMaxRows(), 2), 1).setNumberFormat("@");

  removeRowsByDate(sheet, new Set(refreshedDates));
  trimOldRows(sheet, MAX_HISTORY_DAYS);

  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  }
  Logger.log(`${tabName}: записано строк ${rows.length}`);
}

function getDateRange(days) {
  const dates = [];
  for (let i = 1; i <= days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(Utilities.formatDate(d, AdsApp.currentAccount().getTimeZone(), "yyyy-MM-dd"));
  }
  return dates;
}

function normalizeDateValue(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, AdsApp.currentAccount().getTimeZone(), "yyyy-MM-dd");
  }
  return v;
}

function removeRowsByDate(sheet, dateSet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = values.length - 1; i >= 0; i--) {
    if (dateSet.has(normalizeDateValue(values[i][0]))) {
      sheet.deleteRow(i + 2);
    }
  }
}

function trimOldRows(sheet, maxHistoryDays) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxHistoryDays);
  const cutoffStr = Utilities.formatDate(cutoff, AdsApp.currentAccount().getTimeZone(), "yyyy-MM-dd");

  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = values.length - 1; i >= 0; i--) {
    if (normalizeDateValue(values[i][0]) < cutoffStr) {
      sheet.deleteRow(i + 2);
    }
  }
}
