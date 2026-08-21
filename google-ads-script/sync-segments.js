/**
 * Google Ads Script — разбивка по устройствам и географии. Вставить как ОТДЕЛЬНЫЙ
 * скрипт (Tools > Bulk Actions > Scripts), рядом с sync-campaigns.js и
 * sync-hierarchy.js. Не требует developer token/OAuth.
 *
 * Перед запуском замените SHEET_ID. Скользящее окно — MAX_HISTORY_DAYS дней,
 * как и в остальных синк-скриптах.
 *
 * Гео определяется по geographic_view (LOCATION_OF_PRESENCE — физическое
 * местоположение пользователя). Google Ads отдаёт числовой criterion ID страны;
 * ниже — таблица соответствий для стран, которые реально встречаются в
 * кампаниях Sellvia. Если увидите "Unknown (id)" в дашборде — допишите
 * соответствующий ID в COUNTRY_NAMES (найти можно в Google Ads geotargets).
 *
 * Настройте расписание (Frequency), например ежедневно в 06:30.
 */

const SHEET_ID = "11VIcvXJ2BDiOod331u3RpLFMYKnMbnsDktNZ9t6OWfU";
const LOOKBACK_DAYS = 3;
const MAX_HISTORY_DAYS = 30;

const COUNTRY_NAMES = {
  2840: "United States",
  2124: "Canada",
  2826: "United Kingdom",
  2036: "Australia",
  2702: "Singapore",
  2276: "Germany",
  2250: "France",
  2724: "Spain",
  2380: "Italy",
  2528: "Netherlands",
  2752: "Sweden",
  2578: "Norway",
  2208: "Denmark",
  2246: "Finland",
  2616: "Poland",
  2554: "New Zealand",
  2392: "Japan",
  2410: "South Korea",
  2356: "India",
  2076: "Brazil",
  2156: "China",
  2344: "Hong Kong",
  2203: "Czechia",
  2056: "Belgium",
  2158: "Taiwan",
  2376: "Israel",
  2372: "Ireland",
  2756: "Switzerland",
  2040: "Austria",
};

function main() {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  const dates = getDateRange(LOOKBACK_DAYS);

  syncDevices(spreadsheet, dates);
  syncGeo(spreadsheet, dates);
}

function syncDevices(spreadsheet, dates) {
  const header = ["date", "campaign", "device", "impressions", "clicks", "cost", "conversions"];
  const rows = [];
  for (const date of dates) {
    const report = AdsApp.report(
      `SELECT campaign.name, segments.device, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
       FROM campaign
       WHERE segments.date = "${date}"
       AND campaign.status = "ENABLED"`
    );
    const it = report.rows();
    while (it.hasNext()) {
      const row = it.next();
      rows.push([
        date,
        row["campaign.name"],
        row["segments.device"],
        Number(row["metrics.impressions"]),
        Number(row["metrics.clicks"]),
        Number(row["metrics.cost_micros"]) / 1e6,
        Number(row["metrics.conversions"]),
      ]);
    }
  }
  writeReport(spreadsheet, "device_daily", header, rows, dates);
}

function syncGeo(spreadsheet, dates) {
  const header = ["date", "campaign", "country", "impressions", "clicks", "cost", "conversions"];
  const rows = [];
  for (const date of dates) {
    const report = AdsApp.report(
      `SELECT campaign.name, campaign.status, geographic_view.country_criterion_id,
              metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
       FROM geographic_view
       WHERE segments.date = "${date}"
       AND campaign.status = "ENABLED"
       AND geographic_view.location_type = "LOCATION_OF_PRESENCE"`
    );
    const it = report.rows();
    while (it.hasNext()) {
      const row = it.next();
      const criterionId = Number(row["geographic_view.country_criterion_id"]);
      const country = COUNTRY_NAMES[criterionId] || `Unknown (${criterionId})`;
      rows.push([
        date,
        row["campaign.name"],
        country,
        Number(row["metrics.impressions"]),
        Number(row["metrics.clicks"]),
        Number(row["metrics.cost_micros"]) / 1e6,
        Number(row["metrics.conversions"]),
      ]);
    }
  }
  writeReport(spreadsheet, "geo_daily", header, rows, dates);
}

function writeReport(spreadsheet, tabName, header, rows, refreshedDates) {
  const sheet = spreadsheet.getSheetByName(tabName) || spreadsheet.insertSheet(tabName);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(header);
  }

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

function removeRowsByDate(sheet, dateSet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = values.length - 1; i >= 0; i--) {
    if (dateSet.has(values[i][0])) {
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
    if (values[i][0] < cutoffStr) {
      sheet.deleteRow(i + 2);
    }
  }
}
