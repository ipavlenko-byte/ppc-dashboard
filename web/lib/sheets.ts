import { google } from "googleapis";
import {
  AdsDailyRow,
  Ga4DailyRow,
  QualifiedLeadsRow,
  AdGroupDailyRow,
  KeywordDailyRow,
  AdCreativeDailyRow,
  SearchTermDailyRow,
  DeviceDailyRow,
  GeoDailyRow,
  Ga4AdGroupDailyRow,
} from "./types";

const SHEET_ID = process.env.SHEET_ID;
const SERVICE_ACCOUNT_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

export function sheetsConfigured() {
  return Boolean(SHEET_ID && SERVICE_ACCOUNT_JSON);
}

let cachedClient: ReturnType<typeof google.sheets> | null = null;

function getSheetsClient() {
  // Один клиент/OAuth-сессия на весь процесс, а не по одному на каждую вкладку —
  // иначе каждый параллельный readTab() тянул свою собственную авторизацию,
  // и Google иногда отвечал transient-ошибкой на такой всплеск запросов.
  if (!cachedClient) {
    const credentials = JSON.parse(SERVICE_ACCOUNT_JSON as string);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    cachedClient = google.sheets({ version: "v4", auth });
  }
  return cachedClient;
}

function isTabMissingError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /Unable to parse range|Requested entity was not found/i.test(message);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function readTab(range: string): Promise<string[][]> {
  const sheets = getSheetsClient();
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range,
      });
      const values = res.data.values ?? [];
      return values.slice(1) as string[][]; // drop header row
    } catch (err) {
      if (isTabMissingError(err)) {
        // Вкладка ещё не создана (например, sync-hierarchy.js ещё не запускали) — это ожидаемо.
        return [];
      }
      if (attempt === maxAttempts) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Sheets read failed for range "${range}" after ${maxAttempts} attempts: ${message}`);
        return [];
      }
      await sleep(300 * attempt);
    }
  }
  return [];
}

const num = (v: string | undefined) => Number(v ?? 0) || 0;

export async function fetchAdsDaily(): Promise<AdsDailyRow[]> {
  const rows = await readTab("ads_daily!A:F");
  return rows
    .filter((r) => r[0] && r[1])
    .map((r) => ({
      date: r[0],
      campaign: r[1],
      impressions: num(r[2]),
      clicks: num(r[3]),
      cost: num(r[4]),
      conversions: num(r[5]),
    }));
}

export async function fetchGa4Daily(): Promise<Ga4DailyRow[]> {
  const rows = await readTab("ga4_daily!A:E");
  return rows
    .filter((r) => r[0] && r[1])
    .map((r) => ({
      date: r[0],
      campaign: r[1],
      bounceRate: num(r[2]),
      pagesPerSession: num(r[3]),
      avgSessionDurationSec: num(r[4]),
    }));
}

export async function fetchQualifiedLeads(): Promise<QualifiedLeadsRow[]> {
  const rows = await readTab("qualified_leads!A:C");
  return rows
    .filter((r) => r[0] && r[1])
    .map((r) => ({
      date: r[0],
      campaign: r[1],
      qualifiedLeads: num(r[2]),
    }));
}

export async function fetchAdGroupsDaily(): Promise<AdGroupDailyRow[]> {
  const rows = await readTab("ad_groups_daily!A:G");
  return rows
    .filter((r) => r[0] && r[1] && r[2])
    .map((r) => ({
      date: r[0],
      campaign: r[1],
      adGroup: r[2],
      impressions: num(r[3]),
      clicks: num(r[4]),
      cost: num(r[5]),
      conversions: num(r[6]),
    }));
}

export async function fetchKeywordsDaily(): Promise<KeywordDailyRow[]> {
  const rows = await readTab("keywords_daily!A:I");
  return rows
    .filter((r) => r[0] && r[1] && r[2] && r[3])
    .map((r) => ({
      date: r[0],
      campaign: r[1],
      adGroup: r[2],
      keyword: r[3],
      matchType: r[4],
      impressions: num(r[5]),
      clicks: num(r[6]),
      cost: num(r[7]),
      conversions: num(r[8]),
    }));
}

export async function fetchAdCreativesDaily(): Promise<AdCreativeDailyRow[]> {
  const rows = await readTab("ad_creatives_daily!A:I");
  return rows
    .filter((r) => r[0] && r[1] && r[2] && r[3])
    .map((r) => ({
      date: r[0],
      campaign: r[1],
      adGroup: r[2],
      adId: r[3],
      adType: r[4],
      impressions: num(r[5]),
      clicks: num(r[6]),
      cost: num(r[7]),
      conversions: num(r[8]),
    }));
}

export async function fetchSearchTermsDaily(): Promise<SearchTermDailyRow[]> {
  const rows = await readTab("search_terms_daily!A:H");
  return rows
    .filter((r) => r[0] && r[1] && r[2] && r[3])
    .map((r) => ({
      date: r[0],
      campaign: r[1],
      adGroup: r[2],
      searchTerm: r[3],
      impressions: num(r[4]),
      clicks: num(r[5]),
      cost: num(r[6]),
      conversions: num(r[7]),
    }));
}

export async function fetchDeviceDaily(): Promise<DeviceDailyRow[]> {
  const rows = await readTab("device_daily!A:G");
  return rows
    .filter((r) => r[0] && r[1] && r[2])
    .map((r) => ({
      date: r[0],
      campaign: r[1],
      device: r[2],
      impressions: num(r[3]),
      clicks: num(r[4]),
      cost: num(r[5]),
      conversions: num(r[6]),
    }));
}

export async function fetchGeoDaily(): Promise<GeoDailyRow[]> {
  const rows = await readTab("geo_daily!A:G");
  return rows
    .filter((r) => r[0] && r[1] && r[2])
    .map((r) => ({
      date: r[0],
      campaign: r[1],
      country: r[2],
      impressions: num(r[3]),
      clicks: num(r[4]),
      cost: num(r[5]),
      conversions: num(r[6]),
    }));
}

export async function fetchGa4AdGroupDaily(): Promise<Ga4AdGroupDailyRow[]> {
  const rows = await readTab("ga4_ad_group_daily!A:F");
  return rows
    .filter((r) => r[0] && r[1] && r[2])
    .map((r) => ({
      date: r[0],
      campaign: r[1],
      adGroup: r[2],
      bounceRate: num(r[3]),
      pagesPerSession: num(r[4]),
      avgSessionDurationSec: num(r[5]),
    }));
}
