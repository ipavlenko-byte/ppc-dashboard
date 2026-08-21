/**
 * Google Ads Script — вставить в Tools > Bulk Actions > Scripts внутри аккаунта Google Ads.
 * Не требует developer token/OAuth — выполняется в контексте самого аккаунта.
 *
 * Перед запуском:
 * 1) Замените SHEET_ID на ID вашей Google-таблицы (из её URL).
 * 2) Убедитесь, что в таблице есть вкладка "ads_daily" с заголовком в первой строке:
 *    date | campaign | impressions | clicks | cost | conversions
 * 3) Настройте расписание запуска (Scripts > ... > Schedule), например ежедневно в 06:00.
 */

const SHEET_ID = "11VIcvXJ2BDiOod331u3RpLFMYKnMbnsDktNZ9t6OWfU";
const TAB_NAME = "ads_daily";
const LOOKBACK_DAYS = 3; // перезаписываем последние N дней (данные конверсий "дозревают")

function main() {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  const sheet = spreadsheet.getSheetByName(TAB_NAME) || spreadsheet.insertSheet(TAB_NAME);

  ensureHeader(sheet);

  const dates = getDateRange(LOOKBACK_DAYS);
  const rows = [];

  for (const date of dates) {
    const report = AdsApp.report(
      `SELECT campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
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
        Number(row["metrics.impressions"]),
        Number(row["metrics.clicks"]),
        Number(row["metrics.cost_micros"]) / 1e6,
        Number(row["metrics.conversions"]),
      ]);
    }
  }

  if (rows.length === 0) {
    Logger.log("Нет данных за выбранный период.");
    return;
  }

  removeExistingDates(sheet, dates);
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  Logger.log(`Записано строк: ${rows.length}`);
}

function ensureHeader(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["date", "campaign", "impressions", "clicks", "cost", "conversions"]);
  }
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

function removeExistingDates(sheet, dates) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  const dateSet = new Set(dates);
  // Идём снизу вверх, чтобы удаление строк не сбивало индексы
  for (let i = values.length - 1; i >= 0; i--) {
    if (dateSet.has(values[i][0])) {
      sheet.deleteRow(i + 2);
    }
  }
}
