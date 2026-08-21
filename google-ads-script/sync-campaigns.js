/**
 * Google Ads Script — вставить в Tools > Bulk Actions > Scripts внутри аккаунта Google Ads.
 * Не требует developer token/OAuth — выполняется в контексте самого аккаунта.
 *
 * Перед запуском:
 * 1) Замените SHEET_ID на ID вашей Google-таблицы (из её URL).
 * 2) Если уже настраивали раньше — просто замените код целиком, вкладка ads_daily
 *    и её заголовок обновятся сами (добавятся колонки Impression Share и бюджета).
 * 3) Настройте расписание запуска (Scripts > ... > Schedule), например ежедневно в 06:00.
 *
 * Важно: metrics.search_impression_share (и связанные с ним lost IS метрики) есть только
 * у Search-кампаний. У Performance Max/Display/Demand Gen эти поля будут пустыми — это
 * ограничение самого Google Ads, не баг.
 */

const SHEET_ID = "11VIcvXJ2BDiOod331u3RpLFMYKnMbnsDktNZ9t6OWfU";
const TAB_NAME = "ads_daily";
const LOOKBACK_DAYS = 3; // перезаписываем последние N дней (данные конверсий "дозревают")

const HEADER = [
  "date",
  "campaign",
  "impressions",
  "clicks",
  "cost",
  "conversions",
  "searchImpressionShare",
  "searchBudgetLostIS",
  "searchRankLostIS",
  "dailyBudget",
];

function main() {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  const sheet = spreadsheet.getSheetByName(TAB_NAME) || spreadsheet.insertSheet(TAB_NAME);

  ensureHeader(sheet);

  const dates = getDateRange(LOOKBACK_DAYS);
  const rows = [];

  for (const date of dates) {
    const report = AdsApp.report(
      `SELECT campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions,
              metrics.search_impression_share, metrics.search_budget_lost_impression_share,
              metrics.search_rank_lost_impression_share, campaign_budget.amount_micros
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
        parseShare(row["metrics.search_impression_share"]),
        parseShare(row["metrics.search_budget_lost_impression_share"]),
        parseShare(row["metrics.search_rank_lost_impression_share"]),
        parseBudget(row["campaign_budget.amount_micros"]),
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

// Impression Share у Google Ads иногда приходит как "--" или пустая строка
// для кампаний, где метрика неприменима (не-Search типы).
function parseShare(v) {
  const n = Number(v);
  return isNaN(n) ? "" : n;
}

function parseBudget(v) {
  const n = Number(v);
  return isNaN(n) ? "" : n / 1e6;
}

function ensureHeader(sheet) {
  // Перезаписываем заголовок каждый раз — идемпотентно и само "чинит" вкладки,
  // созданные до добавления новых колонок (Impression Share, бюджет).
  sheet.getRange(1, 1, 1, HEADER.length).setValues([HEADER]);
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
