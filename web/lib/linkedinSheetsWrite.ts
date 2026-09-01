import { google } from "googleapis";

const SHEET_ID = process.env.SHEET_ID;
const SERVICE_ACCOUNT_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

// Отдельный клиент от lib/sheets.ts — тот читает Sheet с scope spreadsheets.readonly
// для рендера дашборда, этот пишет с полным scope spreadsheets. Держим их раздельно,
// чтобы не расширять права там, где они не нужны (веб-страницы остаются read-only).
let cachedWriteClient: ReturnType<typeof google.sheets> | null = null;

function getWriteSheetsClient() {
  if (!SHEET_ID || !SERVICE_ACCOUNT_JSON) {
    throw new Error("SHEET_ID / GOOGLE_SERVICE_ACCOUNT_JSON не заданы");
  }
  if (!cachedWriteClient) {
    const credentials = JSON.parse(SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    cachedWriteClient = google.sheets({ version: "v4", auth });
  }
  return cachedWriteClient;
}

/**
 * Дозаписывает дневные строки в вкладку: значения из freshRows (первая колонка —
 * дата "YYYY-MM-DD") заменяют старые строки с теми же датами, всё старше
 * maxHistoryDays — отбрасывается. Вместо точечного удаления строк по индексу
 * (возня со сдвигом индексов в Sheets API) вся вкладка перечитывается и
 * перезаписывается целиком под шапкой — объём данных тут небольшой (одна
 * рекламная площадка, до 240 дней), это надёжнее.
 *
 * Пишем с valueInputOption "RAW" — в отличие от Apps Script (`setValues()`,
 * ведёт себя как USER_ENTERED и парсит "YYYY-MM-DD" в объект Date, отсюда и был
 * баг с задвоением данных в других синках), RAW хранит строки буквально как есть.
 */
export async function upsertDailyRows(
  tabName: string,
  header: string[],
  freshRows: (string | number)[][],
  maxHistoryDays: number
) {
  const sheets = getWriteSheetsClient();

  await ensureSheetExists(tabName);
  await ensureHeaderAndTextFormat(tabName, header);

  const existing = await readExistingRows(tabName);

  const refreshedDates = new Set(freshRows.map((r) => String(r[0])));
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxHistoryDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const kept = existing.filter((r) => {
    const date = String(r[0] ?? "");
    return date && !refreshedDates.has(date) && date >= cutoffStr;
  });

  const finalRows = [...kept, ...freshRows].sort((a, b) => String(a[0]).localeCompare(String(b[0])));

  await sheets.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range: `${tabName}!A2:Z`,
  });

  if (finalRows.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${tabName}!A2`,
      valueInputOption: "RAW",
      requestBody: { values: finalRows },
    });
  }

  return { written: finalRows.length };
}

/**
 * Полная перезапись вкладки-снэпшота (не дневных рядов) — для данных вроде
 * campaign groups или таргетинга, где нет смысла в датированном дедупе, объём
 * небольшой, и на каждый синк актуален только текущий срез.
 */
export async function writeFullReplace(tabName: string, header: string[], rows: (string | number)[][]) {
  const sheets = getWriteSheetsClient();

  await ensureSheetExists(tabName);
  await ensureHeaderAndTextFormat(tabName, header);

  await sheets.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range: `${tabName}!A2:Z`,
  });

  if (rows.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${tabName}!A2`,
      valueInputOption: "RAW",
      requestBody: { values: rows },
    });
  }

  return { written: rows.length };
}

async function readExistingRows(tabName: string): Promise<(string | number)[][]> {
  const sheets = getWriteSheetsClient();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${tabName}!A2:Z`,
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    return (res.data.values ?? []) as (string | number)[][];
  } catch {
    return [];
  }
}

async function ensureSheetExists(tabName: string) {
  const sheets = getWriteSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const exists = meta.data.sheets?.some((s) => s.properties?.title === tabName);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: tabName } } }] },
    });
  }
}

async function ensureHeaderAndTextFormat(tabName: string, header: string[]) {
  const sheets = getWriteSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${tabName}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [header] },
  });
}
