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
  LandingPageDailyRow,
  GscQueryDailyRow,
  GscPageDailyRow,
} from "./types";

const SHEET_ID = process.env.SHEET_ID;
const SERVICE_ACCOUNT_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

export function sheetsConfigured() {
  return Boolean(SHEET_ID && SERVICE_ACCOUNT_JSON);
}

let cachedClient: ReturnType<typeof google.sheets> | null = null;

function getSheetsClient() {
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Порядок веток здесь определяет порядок значений в valueRanges ответа batchGet.
const TAB_RANGES = {
  adsDaily: "ads_daily!A:J",
  ga4Daily: "ga4_daily!A:E",
  qualifiedLeads: "qualified_leads!A:C",
  adGroupsDaily: "ad_groups_daily!A:G",
  keywordsDaily: "keywords_daily!A:I",
  adCreativesDaily: "ad_creatives_daily!A:I",
  searchTermsDaily: "search_terms_daily!A:H",
  deviceDaily: "device_daily!A:G",
  geoDaily: "geo_daily!A:G",
  ga4AdGroupDaily: "ga4_ad_group_daily!A:F",
  landingPagesDaily: "landing_pages_daily!A:G",
  gscQueryDaily: "gsc_query_daily!A:F",
  gscPageDaily: "gsc_page_daily!A:F",
} as const;

type TabKey = keyof typeof TAB_RANGES;

/**
 * Один batchGet-запрос читает все вкладки разом (1 read request вместо 10).
 * Раньше каждая вкладка читалась отдельным вызовом values.get — 10 параллельных
 * запросов на каждую загрузку страницы упирались в лимит Google Sheets API
 * (60 read requests/мин на сервис-аккаунт) уже после нескольких переключений фильтров.
 */
async function batchReadTabs(): Promise<Record<TabKey, string[][]>> {
  const sheets = getSheetsClient();
  const result = {} as Record<TabKey, string[][]>;
  let pending = Object.keys(TAB_RANGES) as TabKey[];
  const maxAttempts = 5; // хватает и на несколько отсутствующих вкладок, и на пару transient-ретраев

  for (let attempt = 1; attempt <= maxAttempts && pending.length > 0; attempt++) {
    const ranges = pending.map((k) => TAB_RANGES[k]);
    try {
      const res = await sheets.spreadsheets.values.batchGet({
        spreadsheetId: SHEET_ID,
        ranges,
      });
      const valueRanges = res.data.valueRanges ?? [];
      pending.forEach((key, i) => {
        const values = valueRanges[i]?.values ?? [];
        result[key] = (values.slice(1) ?? []) as string[][]; // drop header row
      });
      pending = [];
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // batchGet (в отличие от одиночного values.get) роняет ВЕСЬ запрос, если хотя бы
      // одна вкладка ещё не создана (например, sync-hierarchy.js ещё не запускали).
      // Вынимаем именно эту вкладку из батча и повторяем с оставшимися — без этого
      // одна недостающая вкладка обнуляла бы вообще все данные дашборда.
      const missingMatch = message.match(/Unable to parse range:\s*([^!]+)!/);
      const missingKey = missingMatch
        ? pending.find((k) => TAB_RANGES[k].startsWith(`${missingMatch[1]}!`))
        : undefined;

      if (missingKey) {
        result[missingKey] = [];
        pending = pending.filter((k) => k !== missingKey);
        continue;
      }

      if (attempt === maxAttempts) {
        console.error(`Sheets batchGet failed after ${attempt} attempts: ${message}`);
        pending.forEach((k) => {
          result[k] = [];
        });
        pending = [];
      } else {
        await sleep(400 * attempt);
      }
    }
  }
  return result;
}

const num = (v: string | undefined) => Number(v ?? 0) || 0;
const numOrNull = (v: string | undefined) => (v === undefined || v === "" ? null : Number(v) || 0);

export interface AllSheetData {
  adsDaily: AdsDailyRow[];
  ga4Daily: Ga4DailyRow[];
  qualifiedLeads: QualifiedLeadsRow[];
  adGroupsDaily: AdGroupDailyRow[];
  keywordsDaily: KeywordDailyRow[];
  adCreativesDaily: AdCreativeDailyRow[];
  searchTermsDaily: SearchTermDailyRow[];
  deviceDaily: DeviceDailyRow[];
  geoDaily: GeoDailyRow[];
  ga4AdGroupDaily: Ga4AdGroupDailyRow[];
  landingPagesDaily: LandingPageDailyRow[];
  gscQueryDaily: GscQueryDailyRow[];
  gscPageDaily: GscPageDailyRow[];
}

export async function fetchAllSheetData(): Promise<AllSheetData> {
  const tabs = await batchReadTabs();

  return {
    adsDaily: tabs.adsDaily
      .filter((r) => r[0] && r[1])
      .map((r) => ({
        date: r[0],
        campaign: r[1],
        impressions: num(r[2]),
        clicks: num(r[3]),
        cost: num(r[4]),
        conversions: num(r[5]),
        searchImpressionShare: numOrNull(r[6]),
        searchBudgetLostIS: numOrNull(r[7]),
        searchRankLostIS: numOrNull(r[8]),
        dailyBudget: numOrNull(r[9]),
      })),

    ga4Daily: tabs.ga4Daily
      .filter((r) => r[0] && r[1])
      .map((r) => ({
        date: r[0],
        campaign: r[1],
        bounceRate: num(r[2]),
        pagesPerSession: num(r[3]),
        avgSessionDurationSec: num(r[4]),
      })),

    qualifiedLeads: tabs.qualifiedLeads
      .filter((r) => r[0] && r[1])
      .map((r) => ({
        date: r[0],
        campaign: r[1],
        qualifiedLeads: num(r[2]),
      })),

    adGroupsDaily: tabs.adGroupsDaily
      .filter((r) => r[0] && r[1] && r[2])
      .map((r) => ({
        date: r[0],
        campaign: r[1],
        adGroup: r[2],
        impressions: num(r[3]),
        clicks: num(r[4]),
        cost: num(r[5]),
        conversions: num(r[6]),
      })),

    keywordsDaily: tabs.keywordsDaily
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
      })),

    adCreativesDaily: tabs.adCreativesDaily
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
      })),

    searchTermsDaily: tabs.searchTermsDaily
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
      })),

    deviceDaily: tabs.deviceDaily
      .filter((r) => r[0] && r[1] && r[2])
      .map((r) => ({
        date: r[0],
        campaign: r[1],
        device: r[2],
        impressions: num(r[3]),
        clicks: num(r[4]),
        cost: num(r[5]),
        conversions: num(r[6]),
      })),

    geoDaily: tabs.geoDaily
      .filter((r) => r[0] && r[1] && r[2])
      .map((r) => ({
        date: r[0],
        campaign: r[1],
        country: r[2],
        impressions: num(r[3]),
        clicks: num(r[4]),
        cost: num(r[5]),
        conversions: num(r[6]),
      })),

    ga4AdGroupDaily: tabs.ga4AdGroupDaily
      .filter((r) => r[0] && r[1] && r[2])
      .map((r) => ({
        date: r[0],
        campaign: r[1],
        adGroup: r[2],
        bounceRate: num(r[3]),
        pagesPerSession: num(r[4]),
        avgSessionDurationSec: num(r[5]),
      })),

    landingPagesDaily: tabs.landingPagesDaily
      .filter((r) => r[0] && r[1] && r[2])
      .map((r) => ({
        date: r[0],
        campaign: r[1],
        landingPage: r[2],
        impressions: num(r[3]),
        clicks: num(r[4]),
        cost: num(r[5]),
        conversions: num(r[6]),
      })),

    gscQueryDaily: tabs.gscQueryDaily
      .filter((r) => r[0] && r[1])
      .map((r) => ({
        date: r[0],
        query: r[1],
        clicks: num(r[2]),
        impressions: num(r[3]),
        ctr: num(r[4]),
        position: num(r[5]),
      })),

    gscPageDaily: tabs.gscPageDaily
      .filter((r) => r[0] && r[1])
      .map((r) => ({
        date: r[0],
        page: r[1],
        clicks: num(r[2]),
        impressions: num(r[3]),
        ctr: num(r[4]),
        position: num(r[5]),
      })),
  };
}
